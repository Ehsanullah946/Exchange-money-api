// helpers/generateNextNo.js
async function generateNextNo({
  model,
  noField,
  orgId,
  transaction,
  fromWhere = null,
  manualNo = null,
}) {
  const whereCondition = { organizationId: orgId };
  if (fromWhere !== null) whereCondition.fromWhere = fromWhere;

  // 1. Manual number mode with duplicate check
  if (manualNo) {
    whereCondition[noField] = manualNo.toString();

    const exists = await model.findOne({
      where: whereCondition,
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (exists) {
      throw new Error(
        `${noField} '${manualNo}' already exists for this organization`
      );
    }

    return manualNo.toString();
  }

  // 2. Auto-generate mode — always find the MAX number
  const maxRecord = await model.findOne({
    attributes: [
      [model.sequelize.fn('MAX', model.sequelize.col(noField)), 'maxNo'],
    ],
    where: whereCondition,
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  const maxNo = maxRecord?.get('maxNo');
  const nextNo = maxNo ? parseInt(maxNo, 10) + 1 : 1;

  return nextNo.toString();
}

module.exports = generateNextNo;
