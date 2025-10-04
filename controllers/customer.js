const {
  Person,
  Stakeholder,
  Customer,
  Rate,
  MoneyType,
  Account,
  sequelize,
  DepositWithdraw,
  Transfer,
  Branch,
  Receive,
} = require('../models');

const { Op } = require('sequelize');

exports.getCustomers = async (req, res) => {
  try {
    const { search, phone, page = 1, limit = 10 } = req.query;

    const wherePerson = { organizationId: req.orgId };

    if (search) {
      wherePerson[Op.or] = [
        { firstName: { [Op.like]: `%${search}%` } },
        { lastName: { [Op.like]: `%${search}%` } },
      ];
    }

    if (phone) {
      wherePerson.phone = { [Op.like]: `%${phone}%` };
    }

    const whereCustomer = {};

    const offset = (page - 1) * limit;

    const { rows, count } = await Customer.findAndCountAll({
      where: whereCustomer,
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
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // if (!rows || rows.length === 0) {
    //   return res.status(404).json({ message: 'No customers found' });
    // }

    res.json({
      data: rows,
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createCustomer = async (req, res) => {
  const t = await Customer.sequelize.transaction();
  try {
    const {
      firstName,
      lastName,
      fatherName,
      photo,
      nationalCode,
      phone,
      currentAddress,
      permanentAddress,
      gender,
      maritalStatus,
      job,
      whatsApp,
      telegram,
      email,
      typeId,
      language,
      loanLimit,
      whatsAppEnabled,
      telegramEnabled,
      emailEnabled,
      phoneEnabled,
    } = req.body;

    console.log('REQ BODY:', req.body);

    const person = await Person.create(
      {
        firstName,
        lastName,
        fatherName,
        photo,
        email,
        nationalCode,
        phone,
        currentAddress,
        organizationId: req.orgId,
      },
      { transaction: t }
    );

    // 2. Create Stakeholder
    const stakeholder = await Stakeholder.create(
      {
        gender,
        maritalStatus,
        job,
        personId: person.id,
        permanentAddress,
      },
      { transaction: t }
    );

    // 3. Create Customer (no organizationId here)
    const customer = await Customer.create(
      {
        stakeholderId: stakeholder.id,
        whatsApp,
        email,
        typeId,
        language,
        loanLimit,
        telegram,
        whatsAppEnabled: Boolean(whatsAppEnabled),
        telegramEnabled: Boolean(telegramEnabled),
        emailEnabled: Boolean(emailEnabled),
        phoneEnabled: Boolean(phoneEnabled),
      },
      { transaction: t, orgId: req.orgId }
    );

    await t.commit();
    res.status(201).json({
      ...customer.toJSON(),
      orgCustomerId: customer.orgCustomerId,
    });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: err.message });
  }
};

exports.updateCustomer = async (req, res) => {
  const t = await Customer.sequelize.transaction();
  try {
    const customer = await Customer.findOne({
      where: { id: req.params.id },
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
      transaction: t,
    });

    if (!customer)
      return res.status(404).json({ message: 'Customer not found not' });

    const stakeholder = customer.Stakeholder;
    const person = stakeholder.Person;

    await person.update(req.body, { transaction: t });
    await stakeholder.update(req.body, { transaction: t });
    await customer.update(req.body, { transaction: t });

    await t.commit();
    res.json({ message: 'Customer updated successfully', customer });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: err.message });
  }
};

exports.deleteCustomer = async (req, res) => {
  const t = await Customer.sequelize.transaction();
  try {
    const customer = await req.model.findOne({
      where: { id: req.params.id },
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
      transaction: t,
    });

    if (!customer)
      return res.status(404).json({ message: 'Customer not found' });

    const stakeholder = customer.Stakeholder;
    const person = stakeholder.Person;

    await person.destroy({ transaction: t });
    await stakeholder.destroy({ transaction: t });
    await customer.destroy({ transaction: t });

    await t.commit();
    res.json({ message: 'Customer deleted successfully' });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: err.message });
  }
};

exports.getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findOne({
      where: { id: req.params.id },
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
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.status(200).json({
      status: 'success',
      data: customer,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getCustomerAccounts = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { customerId } = req.params;
    const orgId = req.orgId;

    // 1. Find main currency (USA)
    const mainCurrency = await MoneyType.findOne({
      where: {
        typeName: 'USA',
        organizationId: orgId,
      },
      transaction: t,
    });

    if (!mainCurrency) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Main currency (USA) not found',
      });
    }

    // 2. Get all customer accounts with additional details
    const accounts = await Account.findAll({
      where: {
        customerId,
        deleted: false,
      },
      include: [
        {
          model: MoneyType,
          attributes: ['id', 'typeName', 'number'],
        },
        {
          model: Customer,
          attributes: ['id'],
          include: [
            {
              model: Stakeholder,
              attributes: ['id'],
              include: [
                {
                  model: Person,
                  where: { organizationId: orgId },
                  attributes: ['firstName', 'lastName'],
                  required: true,
                },
              ],
            },
          ],
        },
      ],
      transaction: t,
    });

    if (!accounts || accounts.length === 0) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'No accounts found for this customer',
      });
    }

    // 3. Extract customer name from the first account
    const customer = accounts[0].Customer;
    const customerName = customer?.Stakeholder?.Person
      ? `${customer.Stakeholder.Person.firstName} ${customer.Stakeholder.Person.lastName}`
      : 'Unknown Customer';

    // 4. Get unique currency IDs from accounts (excluding main currency)
    const currencyIds = [
      ...new Set(
        accounts
          .map((acc) => acc.moneyTypeId)
          .filter((id) => id !== mainCurrency.id)
      ),
    ];

    // 5. Get latest rates for each currency
    const latestRates = await Rate.findAll({
      where: {
        fromCurrency: currencyIds,
        organizationId: orgId,
      },
      attributes: [
        'fromCurrency',
        'value1',
        [sequelize.fn('MAX', sequelize.col('rDate')), 'latestDate'],
      ],
      group: ['fromCurrency', 'value1'],
      order: [[sequelize.literal('latestDate'), 'DESC']],
      transaction: t,
    });

    // Create a map of currencyId to latest rate
    const rateMap = latestRates.reduce((map, rate) => {
      if (!map.has(rate.fromCurrency)) {
        map.set(rate.fromCurrency, parseFloat(rate.value1));
      }
      return map;
    }, new Map());

    // 6. Process accounts with creation dates
    let totalInMainCurrency = 0;
    const accountDetails = [];

    for (const account of accounts) {
      const originalBalance = parseFloat(account.credit);
      let convertedValue = 0;
      let rateUsed = 1;

      if (account.moneyTypeId === mainCurrency.id) {
        // Already in main currency (USA)
        convertedValue = originalBalance;
      } else {
        // Get the latest rate for this currency
        rateUsed = rateMap.get(account.moneyTypeId) || 1;
        convertedValue = originalBalance / rateUsed;
      }

      totalInMainCurrency += convertedValue;

      accountDetails.push({
        currencyId: account.moneyTypeId,
        currencyName: account.MoneyType.typeName,
        currencyNumber: account.MoneyType.number,
        originalBalance: originalBalance,
        convertedBalance: parseFloat(convertedValue.toFixed(2)),
        conversionRate: rateUsed,
        isMainCurrency: account.moneyTypeId === mainCurrency.id,
        accountCreationDate: account.dateOfCreation, // Added account creation date
        rateDate:
          latestRates.find((r) => r.fromCurrency === account.moneyTypeId)
            ?.rDate || null,
      });
    }

    await t.commit();

    // 7. Format response with all required information
    res.status(200).json({
      success: true,
      customer: {
        id: customerId,
        name: customerName, // Now includes the full customer name
      },
      accounts: accountDetails,
      total: {
        value: parseFloat(totalInMainCurrency.toFixed(2)),
        currency: mainCurrency.typeName,
        currencyId: mainCurrency.id,
        currencyNumber: mainCurrency.number,
      },
      mainCurrency: {
        id: mainCurrency.id,
        name: mainCurrency.typeName,
        number: mainCurrency.number,
      },
    });
  } catch (err) {
    await t.rollback();
    res.status(500).json({
      success: false,
      message: 'Failed to get customer accounts: ' + err.message,
    });
  }
};

// controllers/customer.js
exports.getCustomerTransactions = async (req, res) => {
  try {
    const customerId = parseInt(req.params.id, 10);
    const orgId = req.orgId;
    const { limit = 10, page = 1 } = req.query;

    const parsedLimit = parseInt(limit) || 10;
    const parsedPage = parseInt(page) || 1;
    const offset = (parsedPage - 1) * parsedLimit;

    // 1️⃣ Query all transaction types
    const [deposits, withdraws, receives, transfers] = await Promise.all([
      DepositWithdraw.findAll({
        where: { organizationId: orgId, deleted: false },
        include: [
          {
            model: Account,
            required: true,
            where: { customerId }, // filter through Account
            include: [{ model: MoneyType }],
          },
        ],
      }),
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
            where: { customerId }, // filter through Account
            include: [{ model: MoneyType }],
          },
        ],
      }),

      Receive.findAll({
        where: { customerId, organizationId: orgId },
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
                    model: Stakeholder,
                    include: [
                      {
                        model: Person,
                        where: { organizationId: req.orgId },
                        attributes: ['id', 'firstName'],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            model: Branch,
            as: 'ToBranch',
            include: [
              {
                model: Customer,
                include: [
                  {
                    model: Stakeholder,
                    include: [
                      {
                        model: Person,
                        where: { organizationId: req.orgId },
                        attributes: ['id', 'firstName'],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      }),

      Transfer.findAll({
        where: { customerId, organizationId: orgId },
        include: [
          {
            model: MoneyType,
            as: 'MainMoneyType',
            attributes: ['id', 'typeName'],
          },
          {
            model: Branch,
            as: 'Branch',
            include: [
              {
                model: Customer,
                include: [
                  {
                    model: Stakeholder,
                    include: [
                      {
                        model: Person,
                        where: { organizationId: req.orgId },
                        attributes: ['id', 'firstName'],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      }),
    ]);

    // 2️⃣ Normalize & tag type
    const normalize = (records, type) =>
      records.map((r) => ({
        ...r.toJSON(),
        type,
        date: r.DWDate || r.rDate || r.tDate || r.createdAt, // unify date
      }));

    const allTransactions = [
      ...normalize(deposits, 'deposit'),
      ...normalize(withdraws, 'withdraw'),
      ...normalize(receives, 'receive'),
      ...normalize(transfers, 'transfer'),
    ];

    // 3️⃣ Sort by date (latest first)
    allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    // 4️⃣ Pagination
    const paged = allTransactions.slice(offset, offset + parsedLimit);

    res.status(200).json({
      status: 'success',
      total: allTransactions.length,
      page: parsedPage,
      limit: parsedLimit,
      data: paged,
    });
  } catch (err) {
    console.error('getCustomerTransactions error:', err);
    res.status(500).json({ message: err.message });
  }
};
