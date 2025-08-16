const { Expence } = require('../models');
exports.createExpence = async (req, res) => {
  const t = await Expence.sequelize.transaction();
  try {
    const { amount, moneyTypeId, description, employeeId, expenceType } =
      req.body;
    const orgId = req.orgId;
  } catch (error) {
    await t.rollback();
    res
      .status(500)
      .json('Expence did not create please try again', error.message);
  }
};
