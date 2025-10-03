const { Op } = require('sequelize');
const { Expence, MoneyType } = require('../models');

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
        eDate: new Date(),
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
exports.deleteExpence = async (req, res) => {
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
      res.status(404).json('expence not found');
    }

    await Expence.update(
      { deleted: true },
      { where: { ...req.orgQuery.where, No: req.params.id }, transaction: t }
    );

    await t.commit();

    res.status(200).json({ message: 'expence soft deleted' });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: err.message });
  }
};

exports.getAllExpence = async (req, res) => {
  try {
    const { search, limit = 10, page = 1 } = req.query;

    // Build WHERE condition
    const where = { deleted: false, organizationId: req.orgId };
    if (search) {
      where.expenceType = { [Op.like]: `%${search}%` };
    }

    const offset = (page - 1) * limit;

    const { rows, count } = await Expence.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['eDate', 'DESC']],
      include: [{ model: MoneyType }],
    });

    if (rows.length === 0) {
      return res.status(404).json({ message: 'No expenses found' });
    }

    res.status(200).json({
      data: rows,
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

exports.getExpenceById = async (req, res) => {
  try {
    const { id } = req.params;

    const expence = await Expence.findOne({
      where: { No: id, organizationId: req.orgId },
    });
    if (!expence) {
      res.status(404).json('expence not found');
    }
    res.status(200).json({ stutus: 'success', data: expence });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
