const {
  Receive,
  Transfer,
  Branch,
  Person,
  Stakeholder,
  SenderReceiver,
  Account,
  sequelize
} = require('../models');
const { Op } = require('sequelize');

exports.createReceive = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      receiveAmount,
      chargesAmount = 0,
      chargesType = 1,
      branchCharges = 0,
      branchChargesType,
      rDate,
      description,
      guarantorRelation,
      fromWhere,      // Origin branch ID
      passTo,
      passNo,         // Optional passTo branch ID
      customerId,     // Optional customer ID
      senderFirstName,
      receiverFirstName,
      moneyTypeId
    } = req.body;

    const orgId = req.orgId;

    // 1️⃣ Generate receiveNo per organization and fromWhere branch
    const lastReceive = await Receive.findOne({
      where: { organizationId: orgId, fromWhere },
      order: [['receiveNo', 'DESC']],
      transaction: t
    });
      
    const nextReceiveNo = lastReceive ? (parseInt(lastReceive.receiveNo) + 1).toString() : '1';

    // 2️⃣ Find or create sender and receiver IDs
    const findOrCreateSenderReceiver = async (firstName) => {
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

    const senderId = await findOrCreateSenderReceiver(senderFirstName);
    const receiverId = await findOrCreateSenderReceiver(receiverFirstName);

    // 3️⃣ Find origin branch and its account
    const originBranch = await Branch.findByPk(fromWhere, { transaction: t });
    if (!originBranch) {
      await t.rollback();
      return res.status(400).json({ message: "Origin branch not found" });
    }

    const originBranchAccount = await Account.findOne({
      where: { customerId: originBranch.customerId, moneyTypeId },
      transaction: t
    });

    if (!originBranchAccount) {
      await t.rollback();
      return res.status(400).json({ message: "Origin branch account not found for this currency" });
    }

    // 4️⃣ Deduct from origin branch account
    // Charges logic based on passTo and customerId:
     
    let nextTransferNo;

    if (!passTo && !customerId) {
      // Case 1: No passTo, no customer - deduct receiveAmount + chargesAmount from originBranch only
      originBranchAccount.credit -= (Number(receiveAmount) + Number(chargesAmount));
      await originBranchAccount.save({ transaction: t });

    } else if (passTo && !customerId) {
      // Case 2: passTo branch given, no customer
      // Deduct receiveAmount + chargesAmount + branchCharges from originBranch
      originBranchAccount.credit -= (Number(receiveAmount) + Number(chargesAmount) + Number(branchCharges));
      await originBranchAccount.save({ transaction: t });

      // Add receiveAmount + branchCharges to passTo branch account
      const passToBranch = await Branch.findByPk(passTo, { transaction: t });
      if (!passToBranch) {
        await t.rollback();
        return res.status(400).json({ message: "PassTo branch not found" });
      }

      const passToBranchAccount = await Account.findOne({
        where: { customerId: passToBranch.customerId, moneyTypeId },
        transaction: t
      });

      if (!passToBranchAccount) {
        await t.rollback();
        return res.status(400).json({ message: "PassTo branch account not found for this currency" });
      }

      passToBranchAccount.credit += (Number(receiveAmount) + Number(branchCharges));
      await passToBranchAccount.save({ transaction: t });

      // 5️⃣ Create corresponding Transfer record for passTo branch
      const lastTransfer = await Transfer.findOne({
        where: { organizationId: orgId, toWhere: passTo },
        order: [['transferNo', 'DESC']],
        transaction: t
      });
          nextTransferNo= lastTransfer ? parseInt(lastTransfer.transferNo) + 1 : 1;

      await Transfer.create({
        transferNo: nextTransferNo,
        transferAmount: receiveAmount,
        chargesAmount,
        chargesType,
        tDate: rDate,
        description,
        guarantorRelation,
        branchCharges,
        branchChargesType,
        toWhere: passTo,
        organizationId: orgId,
        receiverId,
        senderId,
        customerId: null,
        moneyTypeId
      }, { transaction: t });
    } else if (customerId) {
      // Case 3: Customer selected (regardless of passTo, but you can clarify if passTo + customer not allowed)
      // Deduct receiveAmount + chargesAmount from originBranch account
      originBranchAccount.credit -= (Number(receiveAmount) + Number(chargesAmount));
      await originBranchAccount.save({ transaction: t });

      // Add receiveAmount to customer account
      const customerAccount = await Account.findOne({
        where: { customerId, moneyTypeId },
        transaction: t
      });

      if (!customerAccount) {
        await t.rollback();
        return res.status(400).json({ message: "Customer account not found for this currency" });
      }

      customerAccount.credit += Number(receiveAmount);
      await customerAccount.save({ transaction: t });
    }

    // 6️⃣ Create Receive record
    const newReceive = await Receive.create({
      receiveNo: nextReceiveNo,
      receiveAmount,
      chargesAmount,
      chargesType,
      rDate,
      description,
      guarantorRelation,
      branchCharges: passTo ? branchCharges : null,
      branchChargesType: passTo ? branchChargesType : null,
      fromWhere,
      passTo: passTo || null,
      customerId: customerId || null,
      organizationId: orgId,
      senderId,
      receiverId,
      passNo: nextTransferNo,
      moneyTypeId
    }, { transaction: t });

    await t.commit();
    res.status(201).json({ message: "Receive created successfully", receive: newReceive });

  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: err.message });
  }
};
