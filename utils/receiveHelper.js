/**
 * Helper: reverse the account changes that were made by createReceive for a given receive row.
 * Mirrors exactly the logic inside your createReceive.
 */
const {
  Transfer,
  Branch,
  Account,
} = require('../models');
const { Op } = require('sequelize');

 exports.reverseReceiveAccounts = async(receive, t)=> {
  const {
    receiveAmount,
    chargesAmount = 0,
    branchCharges = 0,
    fromWhere,
    passTo,
    customerId,
    moneyTypeId
  } = receive;

  // origin branch and account
  const originBranch = await Branch.findByPk(fromWhere, { transaction: t });
  if (!originBranch) throw new Error('Origin branch not found');

  const originAccount = await Account.findOne({
    where: { customerId: originBranch.customerId, moneyTypeId },
    transaction: t
  });
  if (!originAccount) throw new Error('Origin branch account not found for this currency');

  // CASES mirror createReceive:
  if (!passTo && !customerId) {
    // Case 1: No passTo, no customer -> origin lost (receiveAmount + chargesAmount)
    originAccount.credit = Number(originAccount.credit) + Number(receiveAmount) + Number(chargesAmount);
    await originAccount.save({ transaction: t });
    return;
  }

  if (passTo && !customerId) {
    // Case 2: passTo branch given (origin deducted receiveAmount + chargesAmount + branchCharges,
    // passTo added receiveAmount + branchCharges)
    // restore origin
    originAccount.credit = Number(originAccount.credit) + Number(receiveAmount) + Number(chargesAmount) + Number(branchCharges);
    await originAccount.save({ transaction: t });

    // reduce passTo branch account by (receiveAmount + branchCharges)
    const passToBranch = await Branch.findByPk(passTo, { transaction: t });
    if (!passToBranch) throw new Error('PassTo branch not found');

    const passToAccount = await Account.findOne({
      where: { customerId: passToBranch.customerId, moneyTypeId },
      transaction: t
    });
    if (!passToAccount) throw new Error('PassTo branch account not found for this currency');

    passToAccount.credit = Number(passToAccount.credit) - (Number(receiveAmount) + Number(branchCharges));
    await passToAccount.save({ transaction: t });

    return;
  }

  if (customerId) {
    // Case 3: customer selected -> origin deducted (receiveAmount + chargesAmount) and customer added receiveAmount
    originAccount.credit = Number(originAccount.credit) + Number(receiveAmount) + Number(chargesAmount);
    await originAccount.save({ transaction: t });

    const customerAccount = await Account.findOne({
      where: { customerId, moneyTypeId },
      transaction: t
    });
    if (!customerAccount) throw new Error('Customer account not found for this currency');

    customerAccount.credit = Number(customerAccount.credit) - Number(receiveAmount);
    await customerAccount.save({ transaction: t });

    return;
  }
}


 exports.applyReceiveAccounts=async(payload, t, orgId) =>{
  const {
    receiveAmount,
    chargesAmount = 0,
    branchCharges = 0,
    fromWhere,
    passTo,
    customerId,
    moneyTypeId
  } = payload;

 
  const originBranch = await Branch.findByPk(fromWhere, { transaction: t });
  if (!originBranch) throw new Error('Origin branch not found');

  const originAccount = await Account.findOne({
    where: { customerId: originBranch.customerId, moneyTypeId },
    transaction: t
  });
  if (!originAccount) throw new Error('Origin branch account not found for this currency');

  let createdTransferNo = null;

  if (!passTo && !customerId) {
    // Case 1
    originAccount.credit = Number(originAccount.credit) - (Number(receiveAmount) + Number(chargesAmount));
    await originAccount.save({ transaction: t });
    return { createdTransferNo };
  }

  if (passTo && !customerId) {
    // Case 2: passTo branch given, no customer
    originAccount.credit = Number(originAccount.credit) - (Number(receiveAmount) + Number(chargesAmount) + Number(branchCharges));
    await originAccount.save({ transaction: t });

    const passToBranch = await Branch.findByPk(passTo, { transaction: t });
    if (!passToBranch) throw new Error('PassTo branch not found');

    const passToAccount = await Account.findOne({
      where: { customerId: passToBranch.customerId, moneyTypeId },
      transaction: t
    });
    if (!passToAccount) throw new Error('PassTo branch account not found for this currency');

    passToAccount.credit = Number(passToAccount.credit) + (Number(receiveAmount) + Number(branchCharges));
    await passToAccount.save({ transaction: t });

    // Create Transfer record's nextTransferNo (consistent with your createReceive)
    const lastTransfer = await Transfer.findOne({
      where: { organizationId: orgId },
      order: [['transferNo', 'DESC']],
      transaction: t
    });
    createdTransferNo = lastTransfer ? parseInt(lastTransfer.transferNo) + 1 : 1;

    return { createdTransferNo };
  }

  if (customerId) {
    // Case 3: customer selected
    originAccount.credit = Number(originAccount.credit) - (Number(receiveAmount) + Number(chargesAmount));
    await originAccount.save({ transaction: t });

    const customerAccount = await Account.findOne({
      where: { customerId, moneyTypeId },
      transaction: t
    });
    if (!customerAccount) throw new Error('Customer account not found for this currency');

    customerAccount.credit = Number(customerAccount.credit) + Number(receiveAmount);
    await customerAccount.save({ transaction: t });

    return { createdTransferNo };
  }

  return { createdTransferNo };
}


exports.createTransferForReceive= async(receivePayload, nextTransferNo, t, orgId, senderId = null, receiverId = null)=> {
  if (!nextTransferNo) return null;

  const {
    receiveAmount,
    chargesAmount = 0,
    chargesType = 1,
    branchCharges = 0,
    branchChargesType,
    rDate,
    description,
    guarantorRelation,
    passTo,
    moneyTypeId
  } = receivePayload;

  const newTransfer = await Transfer.create({
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

  return newTransfer;
}