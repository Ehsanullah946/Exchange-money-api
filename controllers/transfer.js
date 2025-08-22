const generateNextNo = require('../utils/nextNoHelper');
const {
  sequelize,
  Transfer,
  Account,
  Branch,
  Person,
  Stakeholder,
  SenderReceiver,
  Customer,
} = require('../models');
const notificationService = require('../services/notificationService');

//  Helper: Reverse balances for a transfer
async function reverseTransferAccounts(transfer, t) {
  // Reverse customer account if exists
  if (transfer.customerId) {
    const customerAccount = await Account.findOne({
      where: {
        customerId: transfer.customerId,
        moneyTypeId: transfer.moneyTypeId,
      },
      transaction: t,
    });

    if (customerAccount) {
      customerAccount.credit +=
        Number(transfer.transferAmount) + Number(transfer.chargesAmount);
      await customerAccount.save({ transaction: t });
    }
  }
  // Reverse branch account
  const branch = await Branch.findByPk(
    transfer.toWhere,
    {
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
      transaction: t,
    },
    { transaction: t }
  );

  if (branch) {
    const branchAccount = await Account.findOne({
      where: {
        customerId: branch.customerId,
        moneyTypeId: transfer.moneyTypeId,
      },
      transaction: t,
    });
    if (branchAccount) {
      branchAccount.credit -=
        Number(transfer.transferAmount) + Number(transfer.branchCharges);
      await branchAccount.save({ transaction: t });
    }
  }
}

exports.createTransfer = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      transferNo,
      transferAmount,
      chargesAmount = 0,
      chargesType,
      branchCharges = 0,
      branchChargesType,
      tDate,
      description,
      guarantorRelation,
      toWhere, // Branch ID
      customerId, // Optional
      senderName,
      receiverName,
      moneyTypeId,
    } = req.body;

    const orgId = req.orgId;

    // 1️⃣ Validate required fields
    if (!transferAmount || !toWhere || !moneyTypeId) {
      await t.rollback();
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // 2️⃣ Generate transfer number (org-wide sequential)
    const finalTransferNo = await generateNextNo({
      model: Transfer,
      noField: 'transferNo',
      orgId,
      manualNo: transferNo, // If null, it will auto-generate
      transaction: t,
    });

    if (customerId) {
      const customerAccount = await Account.findOne({
        where: { customerId, moneyTypeId },
        transaction: t,
      });

      if (!customerAccount) {
        await t.rollback();
        return res.status(400).json({ message: 'Customer account not found' });
      }

      const totalDeduction = Number(transferAmount) + Number(chargesAmount);
      customerAccount.credit = Number(customerAccount.credit) - totalDeduction;
      await customerAccount.save({ transaction: t });
    }

    // 6️⃣ Validate and process branch account
    const branch = await Branch.findOne({
      where: { id: toWhere },
      transaction: t,
    });

    if (!branch) {
      await t.rollback();
      return res.status(400).json({ message: 'Invalid branch' });
    }

    const branchAccount = await Account.findOne({
      where: { customerId: branch.customerId, moneyTypeId },
      transaction: t,
    });

    if (!branchAccount) {
      await t.rollback();
      return res.status(400).json({ message: 'Branch account not found' });
    }

    const totalAddition = Number(transferAmount) + Number(branchCharges);
    branchAccount.credit = Number(branchAccount.credit) + totalAddition;
    await branchAccount.save({ transaction: t });

    // 7️⃣ Create transfer record
    const newTransfer = await Transfer.create(
      {
        transferNo: finalTransferNo,
        transferAmount: Number(transferAmount),
        chargesAmount: Number(chargesAmount),
        chargesType,
        tDate: tDate || new Date(),
        description,
        guarantorRelation,
        branchCharges: Number(branchCharges),
        branchChargesType,
        toWhere,
        organizationId: orgId,
        senderName,
        receiverName,
        receiverId: null,
        senderId: null,
        customerId: customerId || null,
        moneyTypeId,
      },
      { transaction: t }
    );

    const branchNotification = await notificationService.sendNotification(
      'branch',
      branch.id,
      {
        type: 'transfer',
        transferNo: transferNo,
        transferAmount: transferAmount,
        chargesAmount: chargesAmount,
        senderName: senderName,
        receiverName: receiverName,
        branchCharges: branchCharges,
        data: newTransfer,
        priority: transferAmount > 10000 ? 'high' : 'normal',
      }
    );

    // Also notify the sender customer if needed
    if (customerId) {
      await notificationService.sendNotification('customer', customerId, {
        type: 'transfer',
        transferNo: transferNo,
        transferAmount: transferAmount,
        chargesAmount: chargesAmount,
        receiverName: receiverName,
        data: newTransfer,
      });
    }

    await t.commit();
    res.status(201).json({
      message: 'Transfer created successfully',
      transfer: newTransfer,
      branchNotification,
    });
  } catch (err) {
    await t.rollback();
    console.error('Transfer creation error:', err);
    res.status(500).json({
      message: 'Failed to create transfer',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};

exports.updateTransferSender = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { firstName, lastName, fatherName, nationalCode, phone, photo } =
      req.body;
    const orgId = req.orgId;

    const transfer = await Transfer.findByPk(id, { transaction: t });
    if (!transfer) {
      await t.rollback();
      return res.status(404).json({ message: 'transfer not found' });
    }

    // Use nationalCode as unique identifier if provided
    const whereClause = nationalCode
      ? { nationalCode, organizationId: orgId }
      : {
          firstName: transfer.senderName,
          organizationId: orgId,
        };

    const [person] = await Person.findOrCreate({
      where: whereClause,
      defaults: {
        firstName: firstName || transfer.senderName,
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
    await transfer.update({ senderId: sender.id }, { transaction: t });
    await t.commit();
    res.json({
      success: true,
      message: 'Sender details updated',
      transfer,
    });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: err.message });
  }
};

// udpate reciever information of Transfer table

exports.updateTransferReceiver = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { firstName, lastName, fatherName, nationalCode, phone, photo } =
      req.body;
    const orgId = req.orgId;

    const transfer = await Transfer.findByPk(id, { transaction: t });
    if (!transfer) {
      await t.rollback();
      return res.status(404).json({ message: 'transfer not found' });
    }

    // Use nationalCode as unique identifier if provided
    const whereClause = nationalCode
      ? { nationalCode, organizationId: orgId }
      : {
          firstName: transfer.receiverName,
          organizationId: orgId,
        };

    const [person] = await Person.findOrCreate({
      where: whereClause,
      defaults: {
        firstName: firstName || transfer.receiverName,
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
    await transfer.update({ receiverId: receiver.id }, { transaction: t });

    await t.commit();
    res.json({
      success: true,
      message: 'receiver details updated',
      transfer,
    });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: err.message });
  }
};

exports.updateTransfer = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const transferId = req.params.id;
    const orgId = req.orgId;

    // 1️⃣ Find existing transfer with organization check
    const transfer = await Transfer.findOne({
      where: { id: transferId, organizationId: orgId },
      transaction: t,
    });

    if (!transfer) {
      await t.rollback();
      return res.status(404).json({ message: 'Transfer not found' });
    }

    const {
      transferAmount,
      chargesAmount = transfer.chargesAmount,
      chargesType = transfer.chargesType,
      branchCharges = transfer.branchCharges,
      branchChargesType = transfer.branchChargesType,
      tDate = transfer.tDate,
      description = transfer.description,
      guarantorRelation = transfer.guarantorRelation,
      toWhere = transfer.toWhere,
      customerId = transfer.customerId,
      senderName, // Changed from senderFirstName
      receiverName, // Changed from receiverFirstName
      moneyTypeId = transfer.moneyTypeId,
    } = req.body;

    // 2️⃣ Reverse original transaction amounts
    // Handle customer account reversal if exists
    if (transfer.customerId) {
      const customerAccount = await Account.findOne({
        where: {
          customerId: transfer.customerId,
          moneyTypeId: transfer.moneyTypeId,
          organizationId: orgId,
        },
        transaction: t,
      });

      if (customerAccount) {
        const originalTotal =
          Number(transfer.transferAmount) + Number(transfer.chargesAmount);
        customerAccount.credit = Number(customerAccount.credit) + originalTotal;
        await customerAccount.save({ transaction: t });
      }
    }

    // Handle branch account reversal
    const originalBranch = await Branch.findOne({
      where: { id: transfer.toWhere, organizationId: orgId },
      transaction: t,
    });

    if (originalBranch) {
      const branchAccount = await Account.findOne({
        where: {
          customerId: originalBranch.customerId,
          moneyTypeId: transfer.moneyTypeId,
          organizationId: orgId,
        },
        transaction: t,
      });

      if (branchAccount) {
        const originalBranchTotal =
          Number(transfer.transferAmount) + Number(transfer.branchCharges);
        branchAccount.credit =
          Number(branchAccount.credit) - originalBranchTotal;
        await branchAccount.save({ transaction: t });
      }
    }

    // 3️⃣ Process sender/receiver updates
    let senderId = transfer.senderId;
    let receiverId = transfer.receiverId;

    // Only update sender if name is provided

    if (senderName && !senderId) {
      // Just update the temporary name field
      await transfer.update({ senderName }, { transaction: t });
    }
    // Option 2: Update full sender record if exists
    else if (senderName && senderId) {
      const sender = await SenderReceiver.findOne({
        where: { id: senderId },
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
            firstName: senderName,
          },
          { transaction: t }
        );
      }
    }

    // Repeat for receiver
    if (receiverName && !receiverId) {
      await transfer.update({ receiverName }, { transaction: t });
    } else if (receiverName && receiverId) {
      const receiver = await SenderReceiver.findOne({
        where: { id: receiverId },
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
            firstName: receiverName,
          },
          { transaction: t }
        );
      }
    }

    // 4️⃣ Process new amounts
    // Process customer account if exists
    if (customerId) {
      const customerAccount = await Account.findOne({
        where: {
          customerId,
          moneyTypeId,
          organizationId: orgId,
        },
        transaction: t,
      });

      if (!customerAccount) {
        await t.rollback();
        return res.status(400).json({ message: 'Customer account not found' });
      }

      const newTotal = Number(transferAmount) + Number(chargesAmount);
      customerAccount.credit = Number(customerAccount.credit) - newTotal;
      await customerAccount.save({ transaction: t });
    }

    // Process branch account
    const newBranch = await Branch.findOne({
      where: { id: toWhere, organizationId: orgId },
      transaction: t,
    });

    if (!newBranch) {
      await t.rollback();
      return res.status(400).json({ message: 'New branch not found' });
    }

    const branchAccount = await Account.findOne({
      where: {
        customerId: newBranch.customerId,
        moneyTypeId,
        organizationId: orgId,
      },
      transaction: t,
    });

    if (!branchAccount) {
      await t.rollback();
      return res.status(400).json({ message: 'Branch account not found' });
    }

    const newBranchTotal = Number(transferAmount) + Number(branchCharges);
    branchAccount.credit = Number(branchAccount.credit) + newBranchTotal;
    await branchAccount.save({ transaction: t });

    const updateData = {
      transferAmount: Number(transferAmount),
      chargesAmount: Number(chargesAmount),
      chargesType,
      tDate,
      description,
      guarantorRelation,
      branchCharges: Number(branchCharges),
      branchChargesType,
      toWhere,
      customerId: customerId || null,
      moneyTypeId,
    };

    if (senderId) updateData.senderId = senderId;
    if (receiverId) updateData.receiverId = receiverId;

    // 5️⃣ Update transfer record
    await transfer.update(updateData, { transaction: t });

    await t.commit();
    res.status(200).json({
      message: 'Transfer updated successfully',
      transfer,
    });
  } catch (err) {
    await t.rollback();
    console.error('Transfer update error:', err);
    res.status(500).json({
      message: 'Failed to update transfer',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};

// 🔹 DELETE
exports.deleteTransfer = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const transfer = await Transfer.findByPk(id, { transaction: t });
    if (!transfer) {
      await t.rollback();
      return res.status(404).json({ message: 'Transfer not found' });
    }

    await reverseTransferAccounts(transfer, t);
    await transfer.update({ deleted: true }, { transaction: t });

    await t.commit();
    res.status(200).json({ message: 'Transfer deleted and balances reversed' });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: err.message });
  }
};

// 🔹 REJECT
exports.rejectTransfer = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { reverseFunds = false } = req.body;

    const transfer = await Transfer.findByPk(id, { transaction: t });
    if (!transfer) {
      await t.rollback();
      return res.status(404).json({ message: 'Transfer not found' });
    }

    if (reverseFunds) {
      await reverseTransferAccounts(transfer, t);
    }

    await transfer.update({ rejected: true }, { transaction: t });

    await t.commit();
    res.status(200).json({ message: 'Transfer rejected successfully' });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: err.message });
  }
};
