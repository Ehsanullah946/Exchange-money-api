// helpers/generateNextNo.js
async function generateNextNo({
  model,
  noField,
  orgId,
  transaction,
  fromWhere = null,
  manualNo = null,
}) {
  // If a manual number is provided, just return it
  if (manualNo) return manualNo.toString();

  //   const existing = await model.findOne({
  //     where: { No: manualNo },
  //     transaction,
  //   });

  //   if (existing) {
  //     throw new Error('the  number already exists');
  //   }

  // Build the query conditions
  const whereCondition = { organizationId: orgId };
  if (fromWhere !== null) whereCondition.fromWhere = fromWhere;

  // Get the last record for that organization (and optionally fromWhere)
  const lastRecord = await model.findOne({
    where: whereCondition,
    order: [[noField, 'DESC']],
    transaction,
  });

  // Calculate next number
  const nextNo = lastRecord ? parseInt(lastRecord[noField], 10) + 1 : 1;

  return nextNo.toString();
}

module.exports = generateNextNo;
