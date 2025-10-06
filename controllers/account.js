const { Op } = require('sequelize');
const {
  Account,
  Customer,
  Stakeholder,
  Person,
  MoneyType,
  Transfer,
  DepositWithdraw,
  Receive,
  Branch,
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

exports.getAccountTransactions = async (req, res) => {
  try {
    const accountId = parseInt(req.params.id, 10);
    const orgId = req.orgId;
    const { limit = 10, page = 1 } = req.query;

    console.log(
      '🔍 Querying transactions for account:',
      accountId,
      'org:',
      orgId
    );

    const parsedLimit = parseInt(limit) || 10;
    const parsedPage = parseInt(page) || 1;
    const offset = (parsedPage - 1) * parsedLimit;

    // ---------------------------
    // 1️⃣ Fetch all transaction types
    // ---------------------------
    const [deposits, withdraws, receives, transfers] = await Promise.all([
      // Deposit
      DepositWithdraw.findAll({
        where: {
          organizationId: orgId,
          deleted: false,
          deposit: { [Op.gt]: 0 },
        },
        include: [
          {
            model: Account,
            required: true,
            where: { No: accountId },
            include: [{ model: MoneyType }],
          },
        ],
      }),

      // Withdraw
      DepositWithdraw.findAll({
        where: {
          organizationId: orgId,
          deleted: false,
          withdraw: { [Op.gt]: 0 },
        },
        include: [
          {
            model: Account,
            required: true,
            where: { No: accountId },
            include: [{ model: MoneyType }],
          },
        ],
      }),

      // Receive (through customer → stakeholder → person)
      Receive.findAll({
        where: {
          organizationId: orgId,
          deleted: false,
        },
        include: [
          {
            model: MoneyType,
            as: 'MainMoneyType',
            attributes: ['id', 'typeName'],
          },
          {
            model: Branch,
            as: 'FromBranch',
            include: [
              {
                model: Customer,
                include: [
                  {
                    model: Account,
                    where: { No: accountId },
                    required: false,
                  },
                ],
              },
            ],
          },
          {
            model: Branch,
            as: 'ToPass',
            include: [
              {
                model: Customer,
                include: [
                  {
                    model: Account,
                    where: { No: accountId },
                    required: false,
                  },
                ],
              },
            ],
          },
        ],
      }),

      // Transfer (through branch → customer → account)
      Transfer.findAll({
        where: {
          organizationId: orgId,
          deleted: false,
        },
        include: [
          {
            model: MoneyType,
            as: 'MainMoneyType',
            attributes: ['id', 'typeName'],
          },
          {
            model: Branch,
            as: 'ToBranch',
            include: [
              {
                model: Customer,
                include: [
                  {
                    model: Account,
                    where: { No: accountId },
                    required: false,
                  },
                ],
              },
            ],
          },
        ],
      }),
    ]);

    // ---------------------------
    // 2️⃣ Filter transactions that involve this account
    // ---------------------------

    const filteredReceives = receives.filter((r) => {
      const fromAccounts =
        r.FromBranch?.Customer?.Accounts?.map((a) => a.id) || [];
      const toAccounts = r.ToPass?.Customer?.Accounts?.map((a) => a.id) || [];
      return fromAccounts.includes(accountId) || toAccounts.includes(accountId);
    });

    const filteredTransfers = transfers.filter((t) => {
      const fromAccounts =
        t.FromBranch?.Customer?.Accounts?.map((a) => a.id) || [];
      const toAccounts = t.ToBranch?.Customer?.Accounts?.map((a) => a.id) || [];
      return fromAccounts.includes(accountId) || toAccounts.includes(accountId);
    });

    console.log('📊 Query Results:');
    console.log('Deposits:', deposits.length);
    console.log('Withdraws:', withdraws.length);
    console.log('Receives (filtered):', filteredReceives.length);
    console.log('Transfers (filtered):', filteredTransfers.length);

    // ---------------------------
    // 3️⃣ Normalize all data
    // ---------------------------
    const normalize = (records, type) =>
      records.map((r) => ({
        ...r.toJSON(),
        type,
        date: r.DWDate || r.rDate || r.tDate || r.createdAt,
      }));

    const allTransactions = [
      ...normalize(deposits, 'deposit'),
      ...normalize(withdraws, 'withdraw'),
      ...normalize(filteredReceives, 'receive'),
      ...normalize(filteredTransfers, 'transfer'),
    ];

    console.log(
      '📈 Total transactions before pagination:',
      allTransactions.length
    );

    // ---------------------------
    // 4️⃣ Sort & Paginate
    // ---------------------------
    allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    const paged = allTransactions.slice(offset, offset + parsedLimit);

    // ---------------------------
    // 5️⃣ Send response
    // ---------------------------
    res.status(200).json({
      status: 'success',
      total: allTransactions.length,
      page: parsedPage,
      limit: parsedLimit,
      data: paged,
    });
  } catch (err) {
    console.error('❌ getAccountTransactions error:', err);
    res.status(500).json({
      message: err.message,
      stack: err.stack,
    });
  }
};
