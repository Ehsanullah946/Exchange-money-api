const {
  Account,
  AccountToAccount,
  Customer,
  Stakeholder,
  Person,
} = require('../models');
exports.createAccountToAccount = async (req, res) => {
  const t = AccountToAccount.sequelize.transaction();
  try {
    const {
      fromAccount,
      toAccount,
      amount,
      description,
      employeeId,
      fingerprint,
    } = req.body;

    const orgId = req.orgId;

    const originAccount = await Account.findOne({
      where: { No: fromAccount },
      include: [
        {
          model: Customer,
          required: true,
          include: [
            {
              model: Stakeholder,
              required: true,
              include: [
                {
                  model: Person,
                  required: true,
                  where: { organizationId: orgId },
                },
              ],
            },
          ],
        },
      ],
      transaction: t,
    });

    if (!originAccount) {
      await t.rollback();
      res.status(404).json('account not found');
    }

    const desAccount = await Account.findOne({
      where: { No: toAccount },
      include: [
        {
          model: Customer,
          required: true,
          include: [
            {
              model: Stakeholder,
              required: true,
              include: [
                {
                  model: Person,
                  required: true,
                  where: { organizationId: orgId },
                },
              ],
            },
          ],
        },
      ],
      transaction: t,
    });

    if (!desAccount) {
      await t.rollback();
      res.status(404).json('account not found');
    }

    const totalDededuction = Number(amount);
    originAccount.credit = Number(originAccount.credit) - totalDededuction;
    await originAccount.save({ transaction: t });

    const totalAddition = Number(amount);
    desAccount.credit = Number(desAccount.credit) - totalAddition;
    await desAccount.save({ transaction: t });

    const lastTransaction = await AccountToAccount.findOne({
      where: { organizationId: orgId },
      order: [['No', 'DESC']],
      transaction: t,
    });
    const nextNo = lastTransaction ? lastTransaction.No + 1 : 1;

    const accountoaccount = await AccountToAccount.create({
      No: nextNo,
      fromAccount,
      toAccount,
      amount,
      tDate: new Date(),
      description,
      organizationId: orgId,
      employeeId,
      fingerprint,
    });

    await t.commit();
    res.status(200).json('the transaction created succesfuly', accountoaccount);
  } catch (error) {
    await t.rollback();
    res.status(500).json('transaction was not successful', error.message);
  }
};
