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
      rejected,
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
        rejected: Boolean(rejected),
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
    const {
      search = '',
      number,
      moneyType,
      branch,
      fromDate,
      toDate,
      limit = 10,
      page = 1,
    } = req.query;

    const whereReceive = {
      organizationId: req.orgId,
      deleted: false,
    };

    if (search || number) {
      whereReceive[Op.or] = [];

      if (search) {
        whereReceive[Op.or].push(
          { senderName: { [Op.like]: `%${search}%` } },
          { receiverName: { [Op.like]: `%${search}%` } }
        );
      }

      if (number) {
        whereReceive[Op.or].push({ receiveNo: { [Op.like]: `%${number}%` } });
      }
    }

    if (moneyType) {
      whereReceive['$MainMoneyType.typeName$'] = moneyType;
    }

    if (branch) {
      whereReceive['$FromBranch.Customer.Stakeholder.Person.firstName$'] =
        branch;
    }

    if (fromDate && toDate) {
      if (fromDate === toDate) {
        const startDate = new Date(fromDate);
        const endDate = new Date(toDate);
        endDate.setDate(endDate.getDate() + 1);
        endDate.setMilliseconds(-1);
        whereReceive.rDate = {
          [Op.between]: [startDate, endDate],
        };
      } else {
        const startDate = new Date(fromDate);
        const endDate = new Date(toDate);
        endDate.setDate(endDate.getDate() + 1);
        endDate.setMilliseconds(-1);
        whereReceive.rDate = {
          [Op.between]: [startDate, endDate],
        };
      }
    }
    const offset = (page - 1) * limit;

    const { rows, count } = await Receive.findAndCountAll({
      where: whereReceive,
      include: [
        {
          model: Branch,
          as: 'FromBranch',
          include: [
            {
              model: Customer,
              include: [
                {
                  model: Stakeholder,
                  include: [
                    {
                      model: Person,
                      attributes: ['firstName', 'lastName'],
                    },
                  ],
                },
              ],
            },
          ],
        },
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

      order: [['rDate', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.status(200).json({
      data: rows,
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
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

    // Handle sender name updates
    if (payload.senderName && payload.senderName !== receive.senderName) {
      // If sender record exists, update the person record
      if (receive.senderId) {
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

        if (sender) {
          await sender.Stakeholder.Person.update(
            {
              firstName: payload.senderName,
            },
            { transaction: t }
          );
        }
      }
      // Always update the senderName in receive record
      await receive.update(
        { senderName: payload.senderName },
        { transaction: t }
      );
    }

    // Handle receiver name updates
    if (payload.receiverName && payload.receiverName !== receive.receiverName) {
      // If receiver record exists, update the person record
      if (receive.receiverId) {
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

        if (receiver) {
          await receiver.Stakeholder.Person.update(
            {
              firstName: payload.receiverName,
            },
            { transaction: t }
          );
        }
      }
      // Always update the receiverName in receive record
      await receive.update(
        { receiverName: payload.receiverName },
        { transaction: t }
      );
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
      rejected: payload.rejected ?? receive.rejected,
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

    const receive = await Receive.findByPk(id, { transaction: t });
    if (!receive) {
      await t.rollback();
      return res.status(404).json({ message: 'Receive not found' });
    }

    if (!receive.deleted) {
      await reverseReceiveAccounts(receive, t);
    }

    await receive.update({ rejected: true }, { transaction: t });

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
        // Include Sender with full details
        {
          model: SenderReceiver,
          as: 'sender',
          include: [
            {
              model: Stakeholder,
              include: [
                {
                  model: Person,
                  attributes: [
                    'id',
                    'firstName',
                    'lastName',
                    'fatherName',
                    'nationalCode',
                    'phone',
                    'photo',
                  ],
                },
              ],
            },
          ],
        },
        // Include Receiver with full details
        {
          model: SenderReceiver,
          as: 'receiver',
          include: [
            {
              model: Stakeholder,
              include: [
                {
                  model: Person,
                  attributes: [
                    'id',
                    'firstName',
                    'lastName',
                    'fatherName',
                    'nationalCode',
                    'phone',
                    'photo',
                  ],
                },
              ],
            },
          ],
        },
        // Include PassTo branch details
        {
          model: Branch,
          as: 'PassTo',
          include: [
            {
              model: Customer,
              include: [
                {
                  model: Stakeholder,
                  include: [Person],
                },
              ],
            },
          ],
        },
      ],
    });

    if (!receive) {
      return res.status(404).json({
        status: 'fail',
        message: 'receive not found',
      });
    }

    // Transform the response to make it easier to use in frontend
    const transformedReceive = {
      ...receive.toJSON(),
      // Add simplified sender data for easy access
      senderDetails: receive.Sender
        ? {
            id: receive.Sender.id,
            firstName: receive.Sender.Stakeholder?.Person?.firstName,
            lastName: receive.Sender.Stakeholder?.Person?.lastName,
            fatherName: receive.Sender.Stakeholder?.Person?.fatherName,
            nationalCode: receive.Sender.Stakeholder?.Person?.nationalCode,
            phone: receive.Sender.Stakeholder?.Person?.phone,
            photo: receive.Sender.Stakeholder?.Person?.photo,
            personId: receive.Sender.Stakeholder?.Person?.id,
            stakeholderId: receive.Sender.Stakeholder?.id,
          }
        : null,
      // Add simplified receiver data for easy access
      receiverDetails: receive.Receiver
        ? {
            id: receive.Receiver.id,
            firstName: receive.Receiver.Stakeholder?.Person?.firstName,
            lastName: receive.Receiver.Stakeholder?.Person?.lastName,
            fatherName: receive.Receiver.Stakeholder?.Person?.fatherName,
            nationalCode: receive.Receiver.Stakeholder?.Person?.nationalCode,
            phone: receive.Receiver.Stakeholder?.Person?.phone,
            photo: receive.Receiver.Stakeholder?.Person?.photo,
            personId: receive.Receiver.Stakeholder?.Person?.id,
            stakeholderId: receive.Receiver.Stakeholder?.id,
          }
        : null,
    };

    res.status(200).json({
      status: 'success',
      data: transformedReceive,
    });
  } catch (err) {
    console.error('get single Receive error:', err);
    res.status(500).json({ message: err.message });
  }
};
