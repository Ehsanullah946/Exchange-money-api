const { Transfer, Account, Person, Stakeholder, SenderReceiver, Branch, sequelize } = require("../models");

exports.createTransfer = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      transferAmount,
      chargesAmount = 0,
      chargesType,
      branchCharges = 0,
      branchChargesType,
      tDate,
      description,
      guarantorRelation,
      toWhere,          // Branch ID (customerId of branch)
      customerId,       // Optional
      senderFirstName,
      receiverFirstName,
      moneyTypeId
    } = req.body;

    const orgId = req.orgId;

    // 1️⃣ Generate transfer number per organization
    const lastTransfer = await Transfer.findOne({
      where: { organizationId: orgId },
      order: [["transferNo", "DESC"]],
      transaction: t
    });
    const nextTransferNo = lastTransfer ? parseInt(lastTransfer.transferNo) + 1 : 1;

    // 2️⃣ Function to find or create Sender/Receiver
   const findOrCreateSenderReceiver = async ({ firstName }) => {
  // 1. Find or create Person (with organizationId)
  const [person] = await Person.findOrCreate({
    where: { 
      firstName, 
      organizationId: orgId 
    },
    defaults: {
      firstName,
      organizationId: orgId
    },
    transaction: t
  });

  // 2. Find or create Stakeholder
  const [stakeholder] = await Stakeholder.findOrCreate({
    where: { personId: person.id },
    defaults: { personId: person.id },
    transaction: t
  });

  // 3. Find or create SenderReceiver (now with organizationId)
  const [senderReceiver] = await SenderReceiver.findOrCreate({
    where: { 
      stakeholderId: stakeholder.id,
      organizationId: orgId 
    },
    defaults: {
      stakeholderId: stakeholder.id,
      organizationId: orgId  // Now matches the model definition
    },
    transaction: t
  });

  return senderReceiver.id;
};

    // 3️⃣ Create sender & receiver IDs
    const senderId = await findOrCreateSenderReceiver({
      firstName: senderFirstName
    });

    const receiverId = await findOrCreateSenderReceiver({
      firstName: receiverFirstName
    });

    // 4️⃣ Deduct from customer account if exists
    if (customerId) {
      const customerAccount = await Account.findOne({
        where: { customerId, moneyTypeId },
        transaction: t
      });

      if (!customerAccount) {
        await t.rollback();
        return res.status(400).json({ message: "Customer account not found for this currency" });
      }

      customerAccount.credit =
        parseFloat(customerAccount.credit) -
        (parseFloat(transferAmount) + parseFloat(chargesAmount));

      await customerAccount.save({ transaction: t });
    }

// ✅ 4️⃣ Handle branch account addition
const branch = await Branch.findByPk(toWhere, { transaction: t });
if (!branch) {
  await t.rollback();
  return res.status(400).json({ message: "Branch not found for toWhere ID" });
}

const branchAccount = await Account.findOne({
  where: { customerId: branch.customerId, moneyTypeId },
  transaction: t
});

if (!branchAccount) {
  await t.rollback();
  return res.status(400).json({ message: "Destination branch account not found for this currency" });
}

// Add main amount + branch charges
    branchAccount.credit = parseFloat(branchAccount.credit) + (parseFloat(transferAmount) + parseFloat(branchCharges));
    await branchAccount.save({ transaction: t });

    // 6️⃣ Create transfer record
      const newTransfer = await Transfer.create({
      transferNo: nextTransferNo,
      transferAmount,
      chargesAmount,
      chargesType,
      tDate,
      description,
      guarantorRelation,
      branchCharges,
      branchChargesType,
      toWhere,
      organizationId: orgId,
      receiverId,
      senderId,
      customerId: customerId || null,
      moneyTypeId
    }, { transaction: t });

    await t.commit();
    res.status(201).json({
      message: "Transfer created successfully",
      transfer: newTransfer
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

    // 1️⃣ Find existing transfer
    const existing = await Transfer.findOne({
      where: { id: transferId, organizationId: orgId },
      transaction: t
    });
    if (!existing) {
      await t.rollback();
      return res.status(404).json({ message: "Transfer not found" });
    }

    // 2️⃣ Reverse previous balances
    if (existing.customerId) {
      const oldCustomerAccount = await Account.findOne({
        where: { customerId: existing.customerId, moneyTypeId: existing.moneyTypeId },
        transaction: t
      });
      if (oldCustomerAccount) {
        oldCustomerAccount.credit += parseFloat(existing.transferAmount) + parseFloat(existing.chargesAmount);
        await oldCustomerAccount.save({ transaction: t });
      }
    }

    const oldBranch = await Branch.findByPk(existing.toWhere, { transaction: t });
    if (oldBranch) {
      const oldBranchAccount = await Account.findOne({
        where: { customerId: oldBranch.customerId, moneyTypeId: existing.moneyTypeId },
        transaction: t
      });
      if (oldBranchAccount) {
        oldBranchAccount.credit -= parseFloat(existing.transferAmount) + parseFloat(existing.branchCharges);
        await oldBranchAccount.save({ transaction: t });
      }
    }

    // 3️⃣ Apply new data
    const {
      transferAmount,
      chargesAmount = 0,
      chargesType,
      branchCharges = 0,
      branchChargesType,
      tDate,
      description,
      guarantorRelation,
      toWhere,
      customerId,
      senderFirstName,
      receiverFirstName,
      moneyTypeId
    } = req.body;

    // 4️⃣ Sender & Receiver
    const findOrCreateSenderReceiver = async ({ firstName }) => {
      const [person] = await Person.findOrCreate({
        where: { firstName, organizationId: orgId },
        defaults: { firstName, organizationId: orgId },
        transaction: t
      });
      const [stakeholder] = await Stakeholder.findOrCreate({
        where: { personId: person.id },
        defaults: { personId: person.id },
        transaction: t
      });
      const [sr] = await SenderReceiver.findOrCreate({
        where: { stakeholderId: stakeholder.id, organizationId: orgId },
        defaults: { stakeholderId: stakeholder.id, organizationId: orgId },
        transaction: t
      });
      return sr.id;
    };

    const senderId = await findOrCreateSenderReceiver({ firstName: senderFirstName });
    const receiverId = await findOrCreateSenderReceiver({ firstName: receiverFirstName });

    // 5️⃣ Apply new balances
    if (customerId) {
      const customerAccount = await Account.findOne({
        where: { customerId, moneyTypeId },
        transaction: t
      });
      if (!customerAccount) {
        await t.rollback();
        return res.status(400).json({ message: "Customer account not found for this currency" });
      }
      customerAccount.credit -= parseFloat(transferAmount) + parseFloat(chargesAmount);
      await customerAccount.save({ transaction: t });
    }

    const branch = await Branch.findByPk(toWhere, { transaction: t });
    if (!branch) {
      await t.rollback();
      return res.status(400).json({ message: "Branch not found" });
    }
    const branchAccount = await Account.findOne({
      where: { customerId: branch.customerId, moneyTypeId },
      transaction: t
    });
    if (!branchAccount) {
      await t.rollback();
      return res.status(400).json({ message: "Destination branch account not found" });
    }
    branchAccount.credit += parseFloat(transferAmount) + parseFloat(branchCharges);
    await branchAccount.save({ transaction: t });

    // 6️⃣ Update transfer record
    await existing.update({
      transferAmount,
      chargesAmount,
      chargesType,
      tDate,
      description,
      guarantorRelation,
      branchCharges,
      branchChargesType,
      toWhere,
      customerId: customerId || null,
      senderId,
      receiverId,
      moneyTypeId
    }, { transaction: t });

    await t.commit();
    res.status(200).json({ message: "Transfer updated successfully", transfer: existing });

  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: err.message });
  }
};

