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
  Exchange,
  Liquidation,
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

exports.getCustomerTransactions = async (req, res) => {
  try {
    const customerId = parseInt(req.params.id, 10);
    const orgId = req.orgId;
    const { limit = 10, page = 1 } = req.query;

    const parsedLimit = parseInt(limit) || 10;
    const parsedPage = parseInt(page) || 1;
    const offset = (parsedPage - 1) * parsedLimit;

    const [
      deposits,
      withdraws,
      receives,
      allTransfers,
      exchanges,
      customerAccounts,
    ] = await Promise.all([
      // Deposits
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
            where: { customerId },
            include: [{ model: MoneyType }],
          },
        ],
      }),

      // Withdraws
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
            where: { customerId },
            include: [{ model: MoneyType }],
          },
        ],
      }),

      // Receives
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
          { model: Branch, as: 'FromBranch', attributes: ['id', 'customerId'] },
          { model: Branch, as: 'PassTo', attributes: ['id', 'customerId'] },
        ],
      }),

      // Transfers
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
          { model: Branch, as: 'ToBranch', attributes: ['id', 'customerId'] },
        ],
      }),

      // Exchanges
      Exchange.findAll({
        where: {
          organizationId: orgId,
          deleted: false,
          customerId: customerId,
        },
        include: [
          {
            model: MoneyType,
            as: 'SaleType',
            attributes: ['id', 'typeName'],
          },
          {
            model: MoneyType,
            as: 'PurchaseType',
            attributes: ['id', 'typeName'],
          },
        ],
      }),

      // Customer accounts for balance calculation
      Account.findAll({
        where: { customerId, deleted: false },
        include: [{ model: MoneyType }],
      }),
    ]);

    const liquidations = await Liquidation.findAll({
      where: {
        organizationId: orgId,
        customerId: customerId,
        deleted: false,
      },
      attributes: ['startDate', 'endDate'],
    });

    const filteredReceives = receives.filter(
      (r) =>
        r.customerId === customerId ||
        r.FromBranch?.customerId === customerId ||
        r.ToPass?.customerId === customerId
    );

    const filteredTransfers = allTransfers.filter(
      (t) =>
        t.customerId === customerId || t.ToBranch?.customerId === customerId
    );

    const accountMap = new Map();
    customerAccounts.forEach((account) => {
      accountMap.set(account.moneyTypeId, {
        accountNo: account.No,
        currency: account.MoneyType.typeName,
        currentBalance: parseFloat(account.credit) || 0,
      });
    });

    const normalize = (records, type) =>
      records.map((r) => {
        const baseData = r.toJSON();
        let amount = 0;
        let isCredit = false;
        let transactionAmount = 0;
        let currencyId, currencyName, accountNo;

        if (baseData.Account?.MoneyType) {
          currencyId = baseData.Account.MoneyType.id;
          currencyName = baseData.Account.MoneyType.typeName;
          accountNo = baseData.Account.No;
        } else if (baseData.MainMoneyType) {
          currencyId = baseData.MainMoneyType.id;
          currencyName = baseData.MainMoneyType.typeName;
          // Find account for this currency
          const accountInfo = accountMap.get(currencyId);
          accountNo = accountInfo?.accountNo;
        }

        switch (type) {
          case 'deposit':
            amount = parseFloat(baseData.deposit) || 0;
            transactionAmount = amount;
            isCredit = true;
            break;

          case 'withdraw':
            amount = parseFloat(baseData.withdraw) || 0;
            transactionAmount = amount;
            isCredit = false;
            break;

          case 'receive':
            amount = parseFloat(baseData.receiveAmount) || 0;
            transactionAmount = amount;
            if (baseData.customerId === customerId) {
              isCredit = true;
            } else if (baseData.FromBranch?.customerId === customerId) {
              isCredit = false;
            } else if (baseData.ToPass?.customerId === customerId) {
              isCredit = true;
            }
            break;

          case 'transfer':
            amount = parseFloat(baseData.transferAmount) || 0;
            transactionAmount = amount;
            if (baseData.customerId === customerId) {
              isCredit = false;
            } else if (baseData.ToBranch?.customerId === customerId) {
              isCredit = true;
            }
            break;
        }

        return {
          ...baseData,
          type,
          date:
            baseData.DWDate ||
            baseData.rDate ||
            baseData.tDate ||
            baseData.createdAt,
          transactionAmount: transactionAmount,
          isCredit: isCredit,
          amount: isCredit ? amount : -amount,
          customerRole: getCustomerRole(baseData, customerId, type),
          currencyId,
          currencyName,
          accountNo: accountNo || baseData.Account?.No || null,
        };
      });

    // ---------------------------
    // 5️⃣ Handle exchanges as TWO separate transactions WITH ACCOUNT NUMBERS
    // ---------------------------
    const exchangeTransactions = [];

    exchanges.forEach((exchange) => {
      const baseData = exchange.toJSON();
      const saleAmount = parseFloat(baseData.saleAmount) || 0;
      const purchaseAmount = parseFloat(baseData.purchaseAmount) || 0;

      // Find accounts for sale and purchase currencies
      const saleAccountInfo = accountMap.get(baseData.saleMoneyType);
      const purchaseAccountInfo = accountMap.get(baseData.purchaseMoneyType);

      // Create sale transaction (debit) in sale currency
      if (saleAmount > 0 && saleAccountInfo) {
        exchangeTransactions.push({
          ...baseData,
          type: 'exchange_sale',
          date: baseData.eDate || baseData.createdAt,
          transactionAmount: saleAmount,
          isCredit: false,
          amount: -saleAmount,
          customerRole: 'exchanger',
          currencyId: baseData.saleMoneyType,
          currencyName: baseData.SaleMoneyType?.typeName,
          accountNo: saleAccountInfo.accountNo,
          exchangeDetails: {
            exchangeId: baseData.id,
            rate: baseData.rate,
            saleCurrency: baseData.SaleMoneyType?.typeName,
            purchaseCurrency: baseData.PurchaseMoneyType?.typeName,
            swap: baseData.swap,
            isSale: true,
          },
        });
      }

      // Create purchase transaction (credit) in purchase currency
      if (purchaseAmount > 0 && purchaseAccountInfo) {
        exchangeTransactions.push({
          ...baseData,
          type: 'exchange_purchase',
          date: baseData.eDate || baseData.createdAt,
          transactionAmount: purchaseAmount,
          isCredit: true,
          amount: purchaseAmount,
          customerRole: 'exchanger',
          currencyId: baseData.purchaseMoneyType,
          currencyName: baseData.PurchaseMoneyType?.typeName,
          accountNo: purchaseAccountInfo.accountNo,
          exchangeDetails: {
            exchangeId: baseData.id,
            rate: baseData.rate,
            saleCurrency: baseData.SaleMoneyType?.typeName,
            purchaseCurrency: baseData.PurchaseMoneyType?.typeName,
            swap: baseData.swap,
            isPurchase: true,
          },
        });
      }
    });

    // Combine all transactions
    const allTransactions = [
      ...normalize(deposits, 'deposit'),
      ...normalize(withdraws, 'withdraw'),
      ...normalize(filteredReceives, 'receive'),
      ...normalize(filteredTransfers, 'transfer'),
      ...exchangeTransactions,
    ];

    // ---------------------------
    // 6️⃣ Calculate running balance PER ACCOUNT
    // ---------------------------

    // Create account balance map
    const accountBalanceMap = new Map();
    customerAccounts.forEach((account) => {
      accountBalanceMap.set(account.No, {
        accountNo: account.No,
        currency: account.MoneyType.typeName,
        currentBalance: parseFloat(account.credit) || 0,
      });
    });

    console.log(
      '💰 Account current balances:',
      Array.from(accountBalanceMap.values())
    );

    // Group transactions by account number
    const transactionsByAccount = {};

    allTransactions.forEach((transaction) => {
      const accountNo = transaction.accountNo;

      if (accountNo) {
        if (!transactionsByAccount[accountNo]) {
          transactionsByAccount[accountNo] = {
            accountNo,
            currency: transaction.currencyName,
            transactions: [],
          };
        }
        transactionsByAccount[accountNo].transactions.push(transaction);
      }
    });

    // Calculate running balance for each account
    const allTransactionsWithBalance = [];

    Object.values(transactionsByAccount).forEach((accountGroup) => {
      const { accountNo, currency, transactions } = accountGroup;
      const currentBalance =
        accountBalanceMap.get(accountNo)?.currentBalance || 0;

      // Sort transactions by date (oldest first)
      transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

      let runningBalance = currentBalance;

      // Subtract all transaction amounts to get starting balance
      transactions.forEach((transaction) => {
        runningBalance -= transaction.amount;
      });

      console.log(
        `🏁 Starting balance for Account ${accountNo} (${currency}):`,
        runningBalance
      );

      // Now calculate running balance for each transaction
      transactions.forEach((transaction) => {
        runningBalance += transaction.amount;

        const transactionWithBalance = {
          ...transaction,
          runningBalance: parseFloat(runningBalance.toFixed(2)),
          credit: transaction.isCredit ? transaction.transactionAmount : 0,
          debit: !transaction.isCredit ? transaction.transactionAmount : 0,
          moneyType: currency,
        };

        allTransactionsWithBalance.push(transactionWithBalance);
      });
    });

    // Handle transactions without account numbers (should be very few now)
    const transactionsWithoutAccount = allTransactions.filter(
      (t) => !t.accountNo
    );
    if (transactionsWithoutAccount.length > 0) {
      console.log(
        '⚠️ Transactions without account numbers:',
        transactionsWithoutAccount.length
      );
      transactionsWithoutAccount.forEach((transaction) => {
        allTransactionsWithBalance.push({
          ...transaction,
          runningBalance: null,
          credit: transaction.isCredit ? transaction.transactionAmount : 0,
          debit: !transaction.isCredit ? transaction.transactionAmount : 0,
          moneyType: transaction.currencyName,
        });
      });
    }

    const accountSummary = Array.from(accountBalanceMap.values()).map(
      (account) => ({
        accountNo: account.accountNo,
        currency: account.currency,
        balance: account.currentBalance,
      })
    );

    // ---------------------------
    // 8️⃣ Final sorting and pagination
    // ---------------------------
    allTransactionsWithBalance.sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    let filteredTransactions = allTransactionsWithBalance;

    if (liquidations.length > 0) {
      filteredTransactions = allTransactionsWithBalance.filter((tx) => {
        const txDate = new Date(tx.date);

        // If tx.date falls into any liquidation range → exclude it
        return !liquidations.some((liq) => {
          const start = new Date(liq.startDate);
          const end = new Date(liq.endDate);
          return txDate >= start && txDate <= end;
        });
      });
    }

    const paged = filteredTransactions.slice(offset, offset + parsedLimit);

    res.status(200).json({
      status: 'success',
      total: filteredTransactions.length,
      page: parsedPage,
      limit: parsedLimit,
      data: paged,
      accountCount: customerAccounts.length,
      accountSummary: accountSummary,
    });
  } catch (err) {
    console.error('❌ getCustomerTransactions error:', err);
    res.status(500).json({
      message: err.message,
      stack: err.stack,
    });
  }
};

// Helper function
function getCustomerRole(transaction, customerId, type) {
  switch (type) {
    case 'deposit':
      return 'account_holder';
    case 'withdraw':
      return 'account_holder';
    case 'receive':
      if (transaction.customerId === customerId) return 'receiver';
      if (transaction.FromBranch?.customerId === customerId)
        return 'sender_branch';
      if (transaction.ToPass?.customerId === customerId)
        return 'receiver_branch';
      return 'unknown';
    case 'transfer':
      if (transaction.customerId === customerId) return 'sender';
      if (transaction.ToBranch?.customerId === customerId)
        return 'receiver_branch';
      return 'unknown';
    case 'exchange_sale':
    case 'exchange_purchase':
      return 'exchanger';
    default:
      return 'unknown';
  }
}

exports.liquidateCustomer = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const customerId = parseInt(req.params.id, 10);
    const orgId = req.orgId;
    const { startDate, endDate, closeAccounts = false, description } = req.body;

    console.log(
      '💧 Liquidating customer:',
      customerId,
      'from',
      startDate,
      'to',
      endDate
    );

    // Validate dates
    if (!startDate || !endDate) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required',
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Start date cannot be after end date',
      });
    }

    // Get customer accounts
    const customerAccounts = await Account.findAll({
      where: { customerId, deleted: false },
      include: [{ model: MoneyType }],
      transaction: t,
    });

    if (!customerAccounts.length) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'No accounts found for this customer',
      });
    }

    // Get transactions within date range to calculate totals
    const [deposits, withdraws, receives, transfers, exchanges] =
      await Promise.all([
        // Deposits
        DepositWithdraw.findAll({
          where: {
            organizationId: orgId,
            deleted: false,
            DWDate: { [Op.between]: [start, end] },
          },
          include: [
            {
              model: Account,
              required: true,
              where: { customerId },
              include: [{ model: MoneyType }],
            },
          ],
          transaction: t,
        }),

        // Withdraws
        DepositWithdraw.findAll({
          where: {
            organizationId: orgId,
            deleted: false,
            DWDate: { [Op.between]: [start, end] },
          },
          include: [
            {
              model: Account,
              required: true,
              where: { customerId },
              include: [{ model: MoneyType }],
            },
          ],
          transaction: t,
        }),

        // Receives
        Receive.findAll({
          where: {
            organizationId: orgId,
            deleted: false,
            rDate: { [Op.between]: [start, end] },
          },
          include: [
            {
              model: MoneyType,
              as: 'MainMoneyType',
            },
            { model: Branch, as: 'FromBranch' },
            { model: Branch, as: 'ToPass' },
          ],
          transaction: t,
        }),

        // Transfers
        Transfer.findAll({
          where: {
            organizationId: orgId,
            deleted: false,
            tDate: { [Op.between]: [start, end] },
          },
          include: [
            {
              model: MoneyType,
              as: 'MainMoneyType',
            },
            { model: Branch, as: 'ToBranch' },
          ],
          transaction: t,
        }),

        // Exchanges
        Exchange.findAll({
          where: {
            organizationId: orgId,
            deleted: false,
            customerId: customerId,
            eDate: { [Op.between]: [start, end] },
          },
          include: [
            {
              model: MoneyType,
              as: 'SaleType',
            },
            {
              model: MoneyType,
              as: 'PurchaseType',
            },
          ],
          transaction: t,
        }),
      ]);

    // Filter receives & transfers by customer involvement
    const filteredReceives = receives.filter(
      (r) =>
        r.customerId === customerId ||
        r.FromBranch?.customerId === customerId ||
        r.ToPass?.customerId === customerId
    );

    const filteredTransfers = transfers.filter(
      (t) =>
        t.customerId === customerId || t.ToBranch?.customerId === customerId
    );

    // Combine all transactions for the period
    const allTransactions = [
      ...deposits,
      ...withdraws,
      ...filteredReceives,
      ...filteredTransfers,
      ...exchanges,
    ];

    // Create liquidation record
    const liquidation = await Liquidation.create(
      {
        customerId,
        organizationId: orgId,
        startDate: start,
        endDate: end,
        description:
          description || `Liquidation from ${startDate} to ${endDate}`,
        status: 'completed',
        closedAccounts: closeAccounts,
        transactionCount: allTransactions.length,
        createdAt: new Date(),
      },
      { transaction: t }
    );

    // Mark transactions as liquidated (archived) by linking them to liquidation
    await Promise.all([
      // Mark deposit/withdraw transactions
      DepositWithdraw.update(
        { liquidated: true, liquidationId: liquidation.id },
        {
          where: {
            organizationId: orgId,
            DWDate: { [Op.between]: [start, end] },
            '$Account.customerId$': customerId,
          },
          include: [{ model: Account, where: { customerId } }],
          transaction: t,
        }
      ),

      // Mark receive transactions
      Receive.update(
        { liquidated: true, liquidationId: liquidation.id },
        {
          where: {
            organizationId: orgId,
            rDate: { [Op.between]: [start, end] },
            [Op.or]: [
              { customerId: customerId },
              { '$FromBranch.customerId$': customerId },
              { '$ToPass.customerId$': customerId },
            ],
          },
          include: [
            { model: Branch, as: 'FromBranch' },
            { model: Branch, as: 'ToPass' },
          ],
          transaction: t,
        }
      ),

      // Mark transfer transactions
      Transfer.update(
        { liquidated: true, liquidationId: liquidation.id },
        {
          where: {
            organizationId: orgId,
            tDate: { [Op.between]: [start, end] },
            [Op.or]: [
              { customerId: customerId },
              { '$ToBranch.customerId$': customerId },
            ],
          },
          include: [{ model: Branch, as: 'ToBranch' }],
          transaction: t,
        }
      ),

      // Mark exchange transactions
      Exchange.update(
        { liquidated: true, liquidationId: liquidation.id },
        {
          where: {
            organizationId: orgId,
            customerId: customerId,
            eDate: { [Op.between]: [start, end] },
          },
          transaction: t,
        }
      ),
    ]);

    // If closeAccounts is true, deactivate accounts
    if (closeAccounts) {
      await Account.update(
        { active: false, deleted: true },
        {
          where: { customerId, organizationId: orgId },
          transaction: t,
        }
      );
    }

    await t.commit();

    // Calculate totals for response
    const totals = {};
    allTransactions.forEach((transaction) => {
      const currency =
        transaction.MainMoneyType?.typeName ||
        transaction.Account?.MoneyType?.typeName ||
        transaction.SaleMoneyType?.typeName ||
        'Unknown';

      if (!totals[currency]) {
        totals[currency] = {
          deposits: 0,
          withdraws: 0,
          transfers: 0,
          receives: 0,
          exchanges: 0,
        };
      }

      if (transaction.deposit > 0)
        totals[currency].deposits += parseFloat(transaction.deposit);
      if (transaction.withdraw > 0)
        totals[currency].withdraws += parseFloat(transaction.withdraw);
      if (transaction.transferAmount > 0)
        totals[currency].transfers += parseFloat(transaction.transferAmount);
      if (transaction.receiveAmount > 0)
        totals[currency].receives += parseFloat(transaction.receiveAmount);
      if (transaction.saleAmount > 0)
        totals[currency].exchanges += parseFloat(transaction.saleAmount);
      if (transaction.purchaseAmount > 0)
        totals[currency].exchanges += parseFloat(transaction.purchaseAmount);
    });

    res.status(200).json({
      success: true,
      message: closeAccounts
        ? 'Customer accounts liquidated and closed successfully'
        : 'Liquidation completed successfully',
      data: {
        liquidationId: liquidation.id,
        period: { startDate, endDate },
        transactionCount: allTransactions.length,
        accounts: customerAccounts.map((acc) => ({
          accountNo: acc.No,
          currency: acc.MoneyType.typeName,
          finalBalance: parseFloat(acc.credit),
          closed: closeAccounts,
        })),
        totals,
      },
    });
  } catch (err) {
    await t.rollback();
    console.error('❌ Liquidation error:', err);
    res.status(500).json({
      success: false,
      message: 'Liquidation failed: ' + err.message,
    });
  }
};

exports.deleteLiquidation = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const liquidationId = req.params.id;
    const orgId = req.orgId;

    const liquidation = await Liquidation.findOne({
      where: { id: liquidationId, organizationId: orgId },
      transaction: t,
    });

    if (!liquidation) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Liquidation record not found',
      });
    }

    await Liquidation.update(
      { deleted: true },
      {
        where: { id: liquidationId, organizationId: orgId },
        transaction: t,
      }
    );

    await t.commit();

    res.status(200).json({
      message: 'Liquidation deleted successfully.',
    });
  } catch (err) {
    await t.rollback();
    res.status(500).json({
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }
};

exports.getCustomerLiquidations = async (req, res) => {
  try {
    const customerId = parseInt(req.params.id, 10);
    const orgId = req.orgId;

    console.log('📋 Getting liquidations for customer:', customerId);

    // Get all liquidations for this specific customer
    const liquidations = await Liquidation.findAll({
      where: {
        deleted: false,
        customerId: customerId,
        organizationId: orgId,
      },
      order: [['createdAt', 'DESC']], // Show latest first
      include: [
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
                  attributes: ['firstName', 'lastName'],
                },
              ],
            },
          ],
        },
      ],
    });

    console.log(
      `📊 Found ${liquidations.length} liquidations for customer ${customerId}`
    );

    // Format the response
    const formattedLiquidations = liquidations.map((liquidation) => ({
      id: liquidation.id,
      customerId: liquidation.customerId,
      customerName: liquidation.Customer?.Stakeholder?.Person
        ? `${liquidation.Customer.Stakeholder.Person.firstName} ${liquidation.Customer.Stakeholder.Person.lastName}`
        : 'Unknown Customer',
      startDate: liquidation.startDate,
      endDate: liquidation.endDate,
      description: liquidation.description,
      status: liquidation.status,
      closedAccounts: liquidation.closedAccounts,
      transactionCount: liquidation.transactionCount,
      createdAt: liquidation.createdAt,
      period: `${new Date(
        liquidation.startDate
      ).toLocaleDateString()} - ${new Date(
        liquidation.endDate
      ).toLocaleDateString()}`,
    }));

    res.status(200).json({
      success: true,
      data: formattedLiquidations,
      count: liquidations.length,
    });
  } catch (err) {
    console.error('❌ Get customer liquidations error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to get liquidations: ' + err.message,
    });
  }
};
