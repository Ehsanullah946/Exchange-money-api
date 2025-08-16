const { Expence } = require('../models');
exports.createExpence = async (req, res) => {
  const t = await Expence.sequelize.transaction();
  try {
    const { amount, moneyTypeId, description, employeeId, expenceType } =
      req.body;
    const orgId = req.orgId;

    const expence = await Expence.create(
      {
        amount,
        moneyTypeId,
        description,
        employeeId,
        expenceType,
        organizationId: orgId,
      },
      {
        transaction: t,
      }
    );

    await t.commit();
    res.status(200).json({
      message: 'expence created succeffuly',
    });
  } catch (error) {
    await t.rollback();
    res
      .status(500)
      .json('Expence did not create please try again', error.message);
  }
};
