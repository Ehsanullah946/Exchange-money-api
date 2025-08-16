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
      data: expence,
    });
  } catch (error) {
    await t.rollback();
    res
      .status(500)
      .json('Expence did not create please try again', error.message);
  }
};

exports.updateExpence = async (req, res) => {
  const t = await Expence.sequelize.transaction();
  try {
    const expence = await Expence.findOne(
      {
        ...req.orgQuery,
        where: { ...req.orgQuery.where, No: req.params.id },
      },
      { transaction: t }
    );

    if (!expence) {
      await t.rollback();
      res.status(404).json('expence not found please try again');
    }

    await expence.update(req.body);
    await t.commit();
    res.status(201).json('the expence updated successfuly');
  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: err.message });
  }
};
