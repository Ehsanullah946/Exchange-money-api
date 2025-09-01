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
