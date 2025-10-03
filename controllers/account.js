const { Op } = require('sequelize');
const {
  Account,
  Customer,
  Stakeholder,
  Person,
  MoneyType,
} = require('../models');

// CREATE Account
exports.createAccount = async (req, res) => {
  const t = await Account.sequelize.transaction();
  try {
    const {
      credit,
      smsEnabled,
      whatsApp,
      email,
      telegramEnabled,
      active,
      deleted,
      moneyTypeId,
      customerId,
    } = req.body;

    // 1. Verify Customer belongs to this org
    const customer = await Customer.findOne({
      where: { id: customerId },
      include: {
        model: Stakeholder,
        include: {
          model: Person,
          attributes: ['organizationId'],
        },
      },
      transaction: t,
    });

    if (!customer) {
      await t.rollback();
      return res.status(400).json({ message: 'Customer does not exist' });
    }

    if (customer.Stakeholder.Person.organizationId !== req.orgId) {
      await t.rollback();
      return res
        .status(403)
        .json({ message: 'Customer belongs to another organization' });
    }

    // 2. Create Account
    const account = await Account.create(
      {
        credit,
        smsEnabled,
        whatsApp,
        email,
        telegramEnabled,
        active,
        deleted,
        moneyTypeId,
        customerId,
      },
      { transaction: t }
    );

    await t.commit();
    res.status(201).json(account);
  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: err.message });
  }
};

exports.getAccounts = async (req, res) => {
  try {
    const { search, limit = 10, page = 1 } = req.query;

    const wherePerson = {
      [Op.and]: [
        { organizationId: req.orgId },
        search
          ? {
              [Op.or]: [
                { firstName: { [Op.like]: `%${search}%` } },
                { lastName: { [Op.like]: `%${search}%` } },
              ],
            }
          : {},
      ],
    };

    const offset = (page - 1) * limit;

    const { rows, count } = await Account.findAndCountAll({
      where: { deleted: false },
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
                  where: wherePerson,
                },
              ],
            },
          ],
        },
        { model: MoneyType },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.status(200).json({
      data: rows,
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET account by ID (filtered by org)
exports.getAccountById = async (req, res) => {
  try {
    const { id } = req.params;
    const account = await Account.findOne({
      where: { No: id },
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
                  where: { organizationId: req.orgId },
                },
              ],
            },
          ],
        },
        { model: MoneyType },
      ],
    });
    if (!account) return res.status(404).json({ message: 'Account not found' });
    res.json({ status: 'success', data: account });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// UPDATE Account
exports.updateAccount = async (req, res) => {
  const t = await Account.sequelize.transaction();
  try {
    const { id } = req.params;
    const account = await Account.findOne({
      where: { No: id },
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
                  where: { organizationId: req.orgId },
                },
              ],
            },
          ],
        },
      ],
    });
    if (!account) {
      await t.rollback();
      return res.status(404).json({ message: 'Account not found' });
    }

    await account.update(req.body, { transaction: t });
    await t.commit();
    res.json(account);
  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: err.message });
  }
};

// DELETE Account
exports.deleteAccount = async (req, res) => {
  const t = await Account.sequelize.transaction();
  try {
    const account = await Account.findOne({
      where: { no: req.params.id },
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
                  where: { organizationId: req.orgId },
                },
              ],
            },
          ],
        },
      ],
    });

    if (!account) {
      await t.rollback();
      return res.status(404).json({ message: 'Account not found' });
    }
    // Soft delete the account
    await Account.update(
      { deleted: true },
      { where: { No: req.params.id }, transaction: t }
    );
    await t.commit();
    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: err.message });
  }
};
