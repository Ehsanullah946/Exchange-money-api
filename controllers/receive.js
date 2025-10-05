const generateNextNo = require('../utils/nextNoHelper');
const {
  createTransferForReceive,
  applyReceiveAccounts,
  reverseReceiveAccounts,
} = require('../utils/receiveHelper');
const {
  Receive,
  Transfer,
  Branch,
  Person,
  Stakeholder,
  SenderReceiver,
  Account,
  sequelize,
  Customer,
  MoneyType,
} = require('../models');
const { Op } = require('sequelize');

exports.createReceive = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      receiveNo,
      receiveAmount,
      chargesAmount = 0,
      chargesType = 1,
      branchCharges = 0,
      branchChargesType,
      rDate,
      description,
      fromWhere,
      passTo,
      passNo,
      senderName,
      receiverName,
      customerId,
      moneyTypeId,
      receiveStatus,
    } = req.body;

    const orgId = req.orgId;
    let nextTransferNo;
    let transfer = null;

    // 1️⃣ Generate receiveNo per organization and fromWhere branch
    // const lastReceive = await Receive.findOne({
    //   where: { organizationId: orgId, fromWhere },
    //   order: [['receiveNo', 'DESC']],
    //   transaction: t
    // });

    // const nextReceiveNo = lastReceive ? (parseInt(lastReceive.receiveNo) + 1).toString() : '1';

    const finalReceiveNo = await generateNextNo({
      model: Receive,
      noField: 'receiveNo',
      orgId,
      fromWhere,
      manualNo: receiveNo, // If null, it will auto-generate
      transaction: t,
    });

    // 3️⃣ Find origin branch and its account
    const originBranch = await Branch.findByPk(fromWhere, { transaction: t });
    if (!originBranch) {
      await t.rollback();
      return res.status(400).json({ message: 'Origin branch not found' });
    }

    const originBranchAccount = await Account.findOne({
      where: { customerId: originBranch.customerId, moneyTypeId },
      transaction: t,
    });

    if (!originBranchAccount) {
      await t.rollback();
      return res
        .status(400)
        .json({ message: 'Origin branch account not found for this currency' });
    }

    if (!passTo && !customerId) {
      // Case 1: No passTo, no customer - deduct receiveAmount + chargesAmount from originBranch only
      const totalDededuction = Number(receiveAmount) + Number(chargesAmount);
      originBranchAccount.credit =
        Number(originBranchAccount.credit) - totalDededuction;
      await originBranchAccount.save({ transaction: t });
    } else if (passTo && !customerId) {
      // Case 2: passTo branch given, no customer
      // Deduct receiveAmount + chargesAmount + branchCharges from originBranch
      const totalDededuction =
        Number(receiveAmount) + Number(chargesAmount) + Number(branchCharges);
      originBranchAccount.credit =
        Number(originBranchAccount.credit) - totalDededuction;
      await originBranchAccount.save({ transaction: t });

      // Add receiveAmount + branchCharges to passTo branch account
      const passToBranch = await Branch.findByPk(passTo, { transaction: t });
      if (!passToBranch) {
        await t.rollback();
        return res.status(400).json({ message: 'PassTo branch not found' });
      }
      const passToBranchAccount = await Account.findOne({
        where: { customerId: passToBranch.customerId, moneyTypeId },
        transaction: t,
      });
      if (!passToBranchAccount) {
        await t.rollback();
        return res.status(400).json({
          message: 'PassTo branch account not found for this currency',
        });
      }

      const totalAddition = Number(receiveAmount) + Number(branchCharges);
      passToBranchAccount.credit =
        Number(passToBranchAccount.credit) + totalAddition;
      await passToBranchAccount.save({ transaction: t });

      // 5️⃣ Create corresponding Transfer record for passTo branch
      const lastTransfer = await Transfer.findOne({
        where: { organizationId: orgId },
        order: [['transferNo', 'DESC']],
        transaction: t,
      });

      nextTransferNo = lastTransfer ? parseInt(lastTransfer.transferNo) + 1 : 1;

      await Transfer.create(
        {
          transferNo: nextTransferNo,
          transferAmount: receiveAmount,
          chargesAmount,
          chargesType,
          tDate: rDate,
          description,
          branchCharges,
          branchChargesType,
          toWhere: passTo,
          organizationId: orgId,
          senderName, // Temporary until linked
          receiverName, // Temporary until linked
          senderId: null, // Will be updated later
          receiverId: null, // Will be updated later
          customerId: customerId || null,
          moneyTypeId,
        },
        { transaction: t }
      );
    } else if (customerId) {
      // Case 3: Customer selected (regardless of passTo, but you can clarify if passTo + customer not allowed)
      // Deduct receiveAmount + chargesAmount from originBranch account
      const totalDededuction = Number(receiveAmount) + Number(chargesAmount);
      originBranchAccount.credit =
        Number(originBranchAccount.credit) - totalDededuction;
      await originBranchAccount.save({ transaction: t });

      // Add receiveAmount to customer account
      const customerAccount = await Account.findOne({
        where: { customerId, moneyTypeId },
        transaction: t,
      });

      if (!customerAccount) {
        await t.rollback();
        return res
          .status(400)
          .json({ message: 'Customer account not found for this currency' });
      }

      customerAccount.credit =
        Number(customerAccount.credit) + Number(receiveAmount);
      await customerAccount.save({ transaction: t });
    }

    // 6️⃣ Create Receive record
    const newReceive = await Receive.create(
      {
        receiveNo: finalReceiveNo,
        receiveAmount,
        chargesAmount,
        chargesType,
        rDate,
        description,
        branchCharges: passTo ? branchCharges : null,
        branchChargesType: passTo ? branchChargesType : null,
        fromWhere,
        passTo: passTo,
        customerId: customerId || null,
        organizationId: orgId,
        senderName,
        receiverName,
        senderId: null,
        receiverId: null,
        passNo: nextTransferNo,
        moneyTypeId,
        receiveStatus: Boolean(receiveStatus),
      },
      { transaction: t }
    );

    await t.commit();
    res
      .status(201)
      .json({ message: 'Receive created successfully', receive: newReceive });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: err.message });
  }
};

exports.getAllReceive = async (req, res) => {
  try {
    const { search = '', limit = 10, page = 1 } = req.query;

    const parsedLimit = parseInt(limit) || 10;
    const parsedPage = parseInt(page) || 1;
    const offset = (parsedPage - 1) * parsedLimit;

    const whereReceive = {
      organizationId: req.orgId,
      deleted: false,
      ...(search && {
        [Op.or]: [
          { receiveNo: { [Op.like]: `%${search}%` } },
          { senderName: { [Op.like]: `%${search}%` } },
          { receiverName: { [Op.like]: `%${search}%` } },
        ],
      }),
    };

    const { rows, count } = await Receive.findAndCountAll({
      where: whereReceive,
      include: [
        { model: Branch, as: 'FromBranch' },
        {
          model: MoneyType,
          as: 'MainMoneyType',
          attributes: ['id', 'typeName'],
        },
        {
          model: MoneyType,
          as: 'ChargesMoneyType',
          attributes: ['id', 'typeName'],
        },
        {
          model: MoneyType,
          as: 'BranchChargesMoneyType',
          attributes: ['id', 'typeName'],
        },
        { model: Customer },
      ],
      limit: parsedLimit,
      offset,
      order: [['rDate', 'DESC']],
    });

    res.status(200).json({
      data: rows,
      total: count,
      page: parsedPage,
      limit: parsedLimit,
    });
  } catch (err) {
    console.error('get All Receive error:', err);
    res.status(500).json({ message: err.message });
  }
};

exports.updateReceiveSender = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { firstName, lastName, fatherName, nationalCode, phone, photo } =
      req.body;
    const orgId = req.orgId;

    const receive = await Receive.findByPk(id, { transaction: t });
    if (!receive) {
      await t.rollback();
      return res.status(404).json({ message: 'Receive not found' });
    }

    // Use nationalCode as unique identifier if provided
    const whereClause = nationalCode
      ? { nationalCode, organizationId: orgId }
      : {
          firstName: receive.senderName,
          organizationId: orgId,
        };

    const [person] = await Person.findOrCreate({
      where: whereClause,
      defaults: {
        firstName: firstName || receive.senderName,
        lastName,
        fatherName,
        nationalCode,
        phone,
        photo,
        organizationId: orgId,
      },
      transaction: t,
    });

    const [stakeholder] = await Stakeholder.findOrCreate({
      where: { personId: person.id },
      defaults: { personId: person.id },
      transaction: t,
    });

    const [sender] = await SenderReceiver.findOrCreate({
      where: { stakeholderId: stakeholder.id },
      defaults: {
        stakeholderId: stakeholder.id,
        organizationId: orgId,
        isSender: true,
      },
      transaction: t,
    });

    // Link to receive record
    await receive.update({ senderId: sender.id }, { transaction: t });

    await t.commit();
    res.json({
      success: true,
      message: 'Sender details updated',
      receive,
    });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: err.message });
  }
};

// 3. Similar endpoint for updating receiver details
exports.updateReceiveReceiver = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { firstName, lastName, fatherName, nationalCode, phone, photo } =
      req.body;
    const orgId = req.orgId;

    const receive = await Receive.findByPk(id, { transaction: t });
    if (!receive) {
      await t.rollback();
      return res.status(404).json({ message: 'Receive not found' });
    }

    // Use nationalCode as unique identifier if provided
    const whereClause = nationalCode
      ? { nationalCode, organizationId: orgId }
      : {
          firstName: receive.receiverName,
          organizationId: orgId,
        };

    const [person] = await Person.findOrCreate({
      where: whereClause,
      defaults: {
        firstName: firstName || receive.receiverName,
        lastName,
        fatherName,
        nationalCode,
        phone,
        photo,
        organizationId: orgId,
      },
      transaction: t,
    });

    const [stakeholder] = await Stakeholder.findOrCreate({
      where: { personId: person.id },
      defaults: { personId: person.id },
      transaction: t,
    });

    const [receiver] = await SenderReceiver.findOrCreate({
      where: { stakeholderId: stakeholder.id },
      defaults: {
        stakeholderId: stakeholder.id,
        organizationId: orgId,
        isSender: false,
      },
      transaction: t,
    });

    // Link to receive record
    await receive.update({ receiverId: receiver.id }, { transaction: t });

    await t.commit();
    res.json({
      success: true,
      message: 'receiver details updated',
      receive,
    });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: err.message });
  }
};

exports.updateReceive = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const payload = req.body; // fields like receiveAmount, chargesAmount, branchCharges, fromWhere, passTo, customerId, etc.
    const orgId = req.orgId;

    const receive = await Receive.findOne({
      where: { id, organizationId: orgId },
      transaction: t,
    });

    if (!receive) {
      await t.rollback();
      return res.status(404).json({ message: 'Receive not found' });
    }

    // Handle sender updates (two possible cases)
    if (payload.senderName) {
      // Case 1: No sender record exists yet - just update temporary name
      if (!receive.senderId) {
        await receive.update(
          { senderName: payload.senderName },
          { transaction: t }
        );
      }
      // Case 2: Sender record exists - update full person record
      else {
        const sender = await SenderReceiver.findOne({
          where: { id: receive.senderId },
          include: [
            {
              model: Stakeholder,
              include: [Person],
            },
          ],
          transaction: t,
        });

        if (!sender) {
          await t.rollback();
          return res.status(400).json({ message: 'Sender record not found' });
        }

        await sender.Stakeholder.Person.update(
          {
            firstName: payload.senderName,

            // Add other fields as needed
          },
          { transaction: t }
        );
      }
    }

    // Handle receiver updates (same two cases)
    if (payload.receiverName) {
      // Case 1: No receiver record exists yet
      if (!receive.receiverId) {
        await receive.update(
          { receiverName: payload.receiverName },
          { transaction: t }
        );
      }
      // Case 2: Receiver record exists
      else {
        const receiver = await SenderReceiver.findOne({
          where: { id: receive.receiverId },
          include: [
            {
              model: Stakeholder,
              include: [Person],
            },
          ],
          transaction: t,
        });

        if (!receiver) {
          await t.rollback();
          return res.status(400).json({ message: 'Receiver record not found' });
        }

        await receiver.Stakeholder.Person.update(
          {
            firstName: payload.receiverName,
            // Add other fields as needed
          },
          { transaction: t }
        );
      }
    }

    // 1) Reverse old effects
    await reverseReceiveAccounts(receive, t);

    // 2) Apply new effects and possibly get nextTransferNo for new passTo
    const { createdTransferNo } = await applyReceiveAccounts(payload, t, orgId);

    // 3) Update receive row
    // if a transfer was created previously, it is referenced by receive.passNo
    // We'll update passNo when we create new transfer.
    const updatedFields = {
      receiveAmount: payload.receiveAmount ?? receive.receiveAmount,
      chargesAmount: payload.chargesAmount ?? receive.chargesAmount,
      branchCharges: payload.passTo
        ? payload.branchCharges ?? receive.branchCharges
        : null,
      branchChargesType: payload.passTo
        ? payload.branchChargesType ?? receive.branchChargesType
        : null,
      rDate: payload.rDate ?? receive.rDate,
      description: payload.description ?? receive.description,
      guarantorRelation: payload.guarantorRelation ?? receive.guarantorRelation,
      fromWhere: payload.fromWhere ?? receive.fromWhere,
      passTo: payload.passTo ?? receive.passTo,
      customerId: payload.customerId ?? receive.customerId,
      moneyTypeId: payload.moneyTypeId ?? receive.moneyTypeId,
      receiverId: payload.receiverId ?? receive.receiverId,
      senderId: payload.senderId ?? receive.senderId,
      receiveStatus: payload.receiveStatus ?? receive.receiveStatus,
      // organizationId stays same
    };

    const oldTransfer =
      receive.passTo && receive.passNo
        ? await Transfer.findOne({
            where: {
              organizationId: receive.organizationId,
              transferNo: receive.passNo,
              toWhere: receive.passTo,
            },
            transaction: t,
          })
        : null;

    if (oldTransfer && !updatedFields.passTo) {
      // Old transfer should be marked deleted (we already reversed accounts by reverseReceiveAccounts above)
      await oldTransfer.update({ deleted: true }, { transaction: t });
      updatedFields.passNo = null;
    } else if (oldTransfer && updatedFields.passTo) {
      // Replace old transfer with a new one
      await oldTransfer.update({ deleted: true }, { transaction: t });
      if (createdTransferNo) {
        const created = await createTransferForReceive(
          payload,
          createdTransferNo,
          t,
          orgId,
          updatedFields.senderId || null,
          updatedFields.receiverId || null
        );
        updatedFields.passNo = created.transferNo;
      } else {
        updatedFields.passNo = null;
      }
    } else if (!oldTransfer && updatedFields.passTo) {
      // Create new transfer
      if (createdTransferNo) {
        const created = await createTransferForReceive(
          payload,
          createdTransferNo,
          t,
          orgId,
          updatedFields.senderId || null,
          updatedFields.receiverId || null
        );
        updatedFields.passNo = created.transferNo;
      } else {
        updatedFields.passNo = null;
      }
    }

    // Finally update receive record
    await receive.update(updatedFields, { transaction: t });

    await t.commit();
    res.status(200).json({ message: 'Receive updated successfully', receive });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: err.message });
  }
};

// delete Receive

exports.deleteReceive = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const receive = await Receive.findByPk(id, { transaction: t });
    if (!receive) {
      await t.rollback();
      return res.status(404).json({ message: 'Receive not found' });
    }

    if (receive.deleted) {
      await t.rollback();
      return res.status(400).json({ message: 'Receive already deleted' });
    }

    // Reverse what createReceive did
    await reverseReceiveAccounts(receive, t);

    // Mark this receive deleted
    await receive.update({ deleted: true }, { transaction: t });

    // Mark corresponding transfer deleted (if any)
    if (receive.passTo && receive.passNo) {
      const transf = await Transfer.findOne({
        where: {
          organizationId: receive.organizationId,
          transferNo: receive.passNo,
          toWhere: receive.passTo,
        },
        transaction: t,
      });
      if (transf) {
        await transf.update({ deleted: true }, { transaction: t });
      }
    }

    await t.commit();
    res
      .status(200)
      .json({ message: 'Receive deleted (soft) and balances reversed' });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: err.message });
  }
};

exports.rejectReceive = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { reverseFunds = false } = req.body;

    const receive = await Receive.findByPk(id, { transaction: t });
    if (!receive) {
      await t.rollback();
      return res.status(404).json({ message: 'Receive not found' });
    }

    // optionally reverse funds (if it hasn't been reversed yet and the record isn't deleted)
    if (reverseFunds && !receive.deleted) {
      await reverseReceiveAccounts(receive, t);
    }

    // mark rejected
    await receive.update({ rejected: true }, { transaction: t });

    // mark corresponding transfer rejected as well (if exists)
    if (receive.passTo && receive.passNo) {
      const transf = await Transfer.findOne({
        where: {
          organizationId: receive.organizationId,
          transferNo: receive.passNo,
          toWhere: receive.passTo,
        },
        transaction: t,
      });
      if (transf) {
        await transf.update({ rejected: true }, { transaction: t });
      }
    }

    await t.commit();
    res.status(200).json({ message: 'Receive rejected successfully' });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: err.message });
  }
};

exports.getReceiveById = async (req, res) => {
  try {
    const receive = await Receive.findOne({
      where: {
        id: req.params.id,
        organizationId: req.orgId,
        deleted: false,
      },
      include: [
        { model: Branch, as: 'Branch' },
        {
          model: MoneyType,
          as: 'MainMoneyType',
          attributes: ['id', 'typeName'],
        },
        {
          model: MoneyType,
          as: 'ChargesMoneyType',
          attributes: ['id', 'typeName'],
        },
        {
          model: MoneyType,
          as: 'BranchChargesMoneyType',
          attributes: ['id', 'typeName'],
        },
        { model: Customer },
      ],
    });

    if (!receive) {
      return res.status(404).json({
        status: 'fail',
        message: 'receive not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: receive,
    });
  } catch (err) {
    console.error('get single Receive error:', err);
    res.status(500).json({ message: err.message });
  }
};

// // ===== Helper: Adjust Balances for Create/Update =====
// async function adjustBalancesOnCreateOrUpdate(data, t) {
//   const { branchId, passNo, passTo, amount, commission, customerId } = data;

//   // Case 1: Branch-only receive
//   if (!passTo) {
//     const branch = await Branch.findByPk(branchId, { transaction: t });
//     if (!branch) throw new Error("Branch not found");

//     branch.balance += (amount - commission);
//     await branch.save({ transaction: t });
//   }
//   // Case 2: Branch → Branch
//   else if (passTo && !customerId) {
//     const originBranch = await Branch.findByPk(branchId, { transaction: t });
//     const passToBranch = await Branch.findByPk(passTo, { transaction: t });

//     if (!originBranch || !passToBranch) throw new Error("One of the branches not found");

//     originBranch.balance -= amount;
//     passToBranch.balance += (amount - commission);

//     await originBranch.save({ transaction: t });
//     await passToBranch.save({ transaction: t });
//   }
//   // Case 3: Branch → Customer
//   else if (passTo && customerId) {
//     const originBranch = await Branch.findByPk(branchId, { transaction: t });
//     const customer = await Customer.findByPk(customerId, { transaction: t });

//     if (!originBranch || !customer) throw new Error("Branch or customer not found");

//     originBranch.balance -= amount;
//     customer.balance += (amount - commission);

//     await originBranch.save({ transaction: t });
//     await customer.save({ transaction: t });
//   }
// }

// // ===== Helper: Reverse Old Balances =====
// async function reverseOldBalances(receiveRecord, t) {
//   const { branchId, passNo, passTo, amount, commission, customerId } =
//     receiveRecord;

//   // Case 1: Branch-only
//   if (!passTo) {
//     const branch = await Branch.findByPk(branchId, { transaction: t });
//     branch.balance -= amount - commission;
//     await branch.save({ transaction: t });
//   }
//   // Case 2: Branch → Branch
//   else if (passTo && !customerId) {
//     const originBranch = await Branch.findByPk(branchId, { transaction: t });
//     const passToBranch = await Branch.findByPk(passTo, { transaction: t });

//     originBranch.balance += amount;
//     passToBranch.balance -= amount - commission;

//     await originBranch.save({ transaction: t });
//     await passToBranch.save({ transaction: t });
//   }
//   // Case 3: Branch → Customer
//   else if (passTo && customerId) {
//     const originBranch = await Branch.findByPk(branchId, { transaction: t });
//     const customer = await Customer.findByPk(customerId, { transaction: t });

//     originBranch.balance += amount;
//     customer.balance -= amount - commission;

//     await originBranch.save({ transaction: t });
//     await customer.save({ transaction: t });
//   }
// }

// // ===== Helper: Sync Transfer Record =====
// async function syncTransfer(receive, t) {
//   if (receive.passTo) {
//     await Transfer.upsert({
//       receiveId: receive.id,
//       branchId: receive.branchId,
//       passTo: receive.passTo,
//       amount: receive.amount,
//       commission: receive.commission,
//     }, { transaction: t });
//   } else {
//     await Transfer.destroy({ where: { receiveId: receive.id }, transaction: t });
//   }
// }

// // ===== Controller: Update Receive =====
// exports.updateReceive = async (req, res) => {
//   const t = await sequelize.transaction();
//   try {
//     const receive = await Receive.findByPk(req.params.id, { transaction: t });
//     if (!receive) throw new Error("Receive not found");

//     // Reverse old balances
//     await reverseOldBalances(receive, t);

//     // Apply new balances
//     await adjustBalancesOnCreateOrUpdate(req.body, t);

//     // Update record
//     await receive.update(req.body, { transaction: t });

//     // Sync transfer record
//     await syncTransfer(receive, t);

//     await t.commit();
//     res.json({ message: "Receive updated successfully", receive });
//   } catch (err) {
//     await t.rollback();
//     res.status(500).json({ error: err.message });
//   }
// };

//  Delete Receive
// exports.deleteReceive = async (req, res) => {
//   const t = await sequelize.transaction();
//   try {
//     const receive = await Receive.findByPk(req.params.id, { transaction: t });
//     if (!receive) throw new Error('Receive not found');

//     // Reverse balances
//     await reverseOldBalances(receive, t);

//     // Delete linked transfer
//     await Transfer.destroy({
//       where: { receiveId: receive.id },
//       transaction: t,
//     });

//     // Delete receive
//     await receive.destroy({ transaction: t });

//     await t.commit();
//     res.json({ message: 'Receive deleted successfully' });
//   } catch (err) {
//     await t.rollback();
//     res.status(500).json({ error: err.message });
//   }
// };
