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
          attributes: ['id', 'typeName'],
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

    // Extract customer name
    const customer = accounts[0].Customer;
    const customerName = customer?.Stakeholder?.Person
      ? `${customer.Stakeholder.Person.firstName} ${customer.Stakeholder.Person.lastName}`
      : 'Unknown Customer';

    // Get unique currency IDs from accounts (excluding main currency)
    const currencyIds = [
      ...new Set(
        accounts
          .map((acc) => acc.moneyTypeId)
          .filter((id) => id !== mainCurrency.id)
      ),
    ];

    // Get latest ACTIVE rates for each currency - FIXED SEQUELIZE USAGE
    let latestRates = [];
    if (currencyIds.length > 0) {
      // First, get the latest effective date for each currency
      const latestRateDates = await Rate.findAll({
        where: {
          fromCurrency: currencyIds,
          toCurrency: mainCurrency.id,
          organizationId: orgId,
          isActive: true,
        },
        attributes: [
          'fromCurrency',
          [sequelize.fn('MAX', sequelize.col('effectiveDate')), 'latestDate'],
        ],
        group: ['fromCurrency'],
        raw: true,
        transaction: t,
      });

      // Then get the full rate data for those dates
      if (latestRateDates.length > 0) {
        const rateQueries = latestRateDates.map((dateInfo) =>
          Rate.findOne({
            where: {
              fromCurrency: dateInfo.fromCurrency,
              toCurrency: mainCurrency.id,
              organizationId: orgId,
              isActive: true,
              effectiveDate: dateInfo.latestDate,
            },
            transaction: t,
          })
        );

        latestRates = (await Promise.all(rateQueries)).filter(
          (rate) => rate !== null
        );
      }
    }

    // Create a map of currencyId to latest rate
    const rateMap = latestRates.reduce((map, rate) => {
      if (rate && !map.has(rate.fromCurrency)) {
        map.set(rate.fromCurrency, {
          rate: parseFloat(rate.middleRate),
          buyRate: parseFloat(rate.buyRate),
          sellRate: parseFloat(rate.sellRate),
          effectiveDate: rate.effectiveDate,
        });
      }
      return map;
    }, new Map());

    // Process accounts
    let totalInMainCurrency = 0;
    const accountDetails = [];

    for (const account of accounts) {
      const originalBalance = parseFloat(account.credit);
      let convertedValue = 0;
      let rateUsed = 1;
      let rateInfo = null;

      if (account.moneyTypeId === mainCurrency.id) {
        convertedValue = originalBalance;
        rateInfo = {
          rate: 1,
          buyRate: 1,
          sellRate: 1,
          effectiveDate: new Date(),
        };
      } else {
        const currencyRate = rateMap.get(account.moneyTypeId);
        if (currencyRate) {
          rateUsed = currencyRate.rate;
          rateInfo = currencyRate;
          convertedValue = originalBalance * rateUsed;
        } else {
          rateUsed = 1;
          convertedValue = originalBalance;
          rateInfo = {
            rate: 1,
            buyRate: 1,
            sellRate: 1,
            effectiveDate: null,
            missingRate: true,
          };
        }
      }

      totalInMainCurrency += convertedValue;

      accountDetails.push({
        accountId: account.id,
        currencyId: account.moneyTypeId,
        currencyName: account.MoneyType.typeName,
        originalBalance: originalBalance,
        convertedBalance: parseFloat(convertedValue.toFixed(2)),
        conversionRate: rateUsed,
        rateInfo: {
          buyRate: rateInfo.buyRate,
          sellRate: rateInfo.sellRate,
          effectiveDate: rateInfo.effectiveDate,
          missingRate: rateInfo.missingRate || false,
        },
        isMainCurrency: account.moneyTypeId === mainCurrency.id,
        accountCreationDate: account.dateOfCreation,
        accountNumber: account.accountNumber,
      });
    }

    await t.commit();

    res.status(200).json({
      success: true,
      customer: {
        id: customerId,
        name: customerName,
      },
      accounts: accountDetails,
      summary: {
        totalInMainCurrency: parseFloat(totalInMainCurrency.toFixed(2)),
        currency: mainCurrency.typeName,
        currencyId: mainCurrency.id,

        totalAccounts: accounts.length,
        accountsWithMissingRates: accountDetails.filter(
          (acc) => acc.rateInfo.missingRate
        ).length,
      },
      mainCurrency: {
        id: mainCurrency.id,
        name: mainCurrency.typeName,

        number: mainCurrency.number,
      },
      conversionDate: new Date().toISOString(),
    });
  } catch (err) {
    await t.rollback();
    console.error('Error in getCustomerAccounts:', err);
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
    const {
      search,
      moneyType,
      fromDate,
      toDate,
      TransactionType,
      limit = 10,
      page = 1,
    } = req.query;

    const parsedLimit = parseInt(limit) || 10;
    const parsedPage = parseInt(page) || 1;
    const offset = (parsedPage - 1) * parsedLimit;

    console.log('🔍 Transaction query parameters:', {
      customerId,
      orgId,
      search,
      moneyType,
      fromDate,
      toDate,
      TransactionType,
      limit: parsedLimit,
      page: parsedPage,
    });

    // Build base where clauses for each transaction type
    const baseWhere = {
      organizationId: orgId,
      deleted: false,
    };

    // Build search conditions if search parameter exists
    const buildSearchConditions = (search) => {
      if (!search) return {};
      const searchNum = parseFloat(search);
      const isNumber = !isNaN(searchNum);
      return {
        [Op.or]: [
          { description: { [Op.like]: `%${search}%` } },
          { receiveNo: { [Op.like]: `%${search}%` } },
          { transferNo: { [Op.like]: `%${search}%` } },
          ...(isNumber
            ? [
                { receiveAmount: searchNum },
                { transferAmount: searchNum },
                { deposit: searchNum },
                { withdraw: searchNum },
              ]
            : []),
        ],
      };
    };

    // Build date range conditions
    const buildDateConditions = (fromDate, toDate) => {
      const conditions = {};
      if (fromDate) {
        conditions[Op.gte] = new Date(fromDate);
      }
      if (toDate) {
        conditions[Op.lte] = new Date(toDate + 'T23:59:59.999Z');
      }
      return Object.keys(conditions).length > 0 ? conditions : null;
    };

    // Build money type conditions for receives and transfers
    const buildMainMoneyTypeConditions = (moneyType) => {
      if (!moneyType) return {};
      return { '$MainMoneyType.typeName$': moneyType };
    };

    // Build transaction type filter
    const shouldIncludeTransactionType = (transactionType, type) => {
      if (!transactionType) return true;

      const typeMap = {
        deposit: 'deposit',
        withdraw: 'withdraw',
        transfer: 'transfer',
        receive: 'receive',
        exchange_sale: 'exchange_sale',
        exchange_purchase: 'exchange_purchase',
      };

      return typeMap[transactionType] === type;
    };

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
          ...baseWhere,
          deposit: { [Op.gt]: 0 },
          ...buildSearchConditions(search),
          ...(buildDateConditions(fromDate, toDate)
            ? { DWDate: buildDateConditions(fromDate, toDate) }
            : {}),
        },
        include: [
          {
            model: Account,
            required: true,
            where: { customerId },
            include: [
              {
                model: MoneyType,
                where: moneyType ? { typeName: moneyType } : undefined,
              },
            ],
          },
        ],
      }),

      // Withdraws
      DepositWithdraw.findAll({
        where: {
          ...baseWhere,
          withdraw: { [Op.gt]: 0 },
          ...buildSearchConditions(search),
          ...(buildDateConditions(fromDate, toDate)
            ? { DWDate: buildDateConditions(fromDate, toDate) }
            : {}),
        },
        include: [
          {
            model: Account,
            required: true,
            where: { customerId },
            include: [
              {
                model: MoneyType,
                where: moneyType ? { typeName: moneyType } : undefined,
              },
            ],
          },
        ],
      }),

      // Receives
      Receive.findAll({
        where: {
          ...baseWhere,
          ...buildSearchConditions(search),
          ...(buildDateConditions(fromDate, toDate)
            ? { rDate: buildDateConditions(fromDate, toDate) }
            : {}),
          ...buildMainMoneyTypeConditions(moneyType),
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
          ...baseWhere,
          ...buildSearchConditions(search),
          ...(buildDateConditions(fromDate, toDate)
            ? { tDate: buildDateConditions(fromDate, toDate) }
            : {}),
          ...buildMainMoneyTypeConditions(moneyType),
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

      // Exchanges - FIXED: Use typeName for exchange filtering
      Exchange.findAll({
        where: {
          ...baseWhere,
          customerId,
          ...buildSearchConditions(search),
          ...(buildDateConditions(fromDate, toDate)
            ? { eDate: buildDateConditions(fromDate, toDate) }
            : {}),
        },
        include: [
          {
            model: MoneyType,
            as: 'SaleType',
            attributes: ['id', 'typeName'],
            where: moneyType ? { typeName: moneyType } : {},
          },
          {
            model: MoneyType,
            as: 'PurchaseType',
            attributes: ['id', 'typeName'],
            where: moneyType ? { typeName: moneyType } : {},
          },
        ],
      }),

      // Customer accounts for balance calculation
      Account.findAll({
        where: { customerId, deleted: false },
        include: [
          {
            model: MoneyType,
            where: moneyType ? { typeName: moneyType } : undefined,
          },
        ],
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

    // Filter receives and transfers by customer involvement
    const filteredReceives = receives.filter(
      (r) =>
        r.customerId === customerId ||
        r.FromBranch?.customerId === customerId ||
        r.PassTo?.customerId === customerId
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
            } else if (baseData.PassTo?.customerId === customerId) {
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

    const exchangeTransactions = [];

    exchanges.forEach((exchange) => {
      const baseData = exchange.toJSON();
      const saleAmount = parseFloat(baseData.saleAmount) || 0;
      const purchaseAmount = parseFloat(baseData.purchaseAmount) || 0;

      const saleAccountInfo = accountMap.get(baseData.saleMoneyType);
      const purchaseAccountInfo = accountMap.get(baseData.purchaseMoneyType);

      // Create sale transaction (debit) in sale currency
      if (
        saleAmount > 0 &&
        saleAccountInfo &&
        shouldIncludeTransactionType(TransactionType, 'exchange_sale')
      ) {
        exchangeTransactions.push({
          ...baseData,
          type: 'exchange_sale',
          date: baseData.eDate || baseData.createdAt,
          transactionAmount: saleAmount,
          isCredit: false,
          amount: -saleAmount,
          customerRole: 'exchanger',
          currencyId: baseData.saleMoneyType,
          currencyName: baseData.SaleType?.typeName,
          accountNo: saleAccountInfo.accountNo,
          exchangeDetails: {
            exchangeId: baseData.id,
            rate: baseData.rate,
            saleCurrency: baseData.SaleType?.typeName,
            purchaseCurrency: baseData.PurchaseType?.typeName,
            swap: baseData.swap,
            isSale: true,
          },
        });
      }

      // Create purchase transaction (credit) in purchase currency
      if (
        purchaseAmount > 0 &&
        purchaseAccountInfo &&
        shouldIncludeTransactionType(TransactionType, 'exchange_purchase')
      ) {
        exchangeTransactions.push({
          ...baseData,
          type: 'exchange_purchase',
          date: baseData.eDate || baseData.createdAt,
          transactionAmount: purchaseAmount,
          isCredit: true,
          amount: purchaseAmount,
          customerRole: 'exchanger',
          currencyId: baseData.purchaseMoneyType,
          currencyName: baseData.PurchaseType?.typeName,
          accountNo: purchaseAccountInfo.accountNo,
          exchangeDetails: {
            exchangeId: baseData.id,
            rate: baseData.rate,
            saleCurrency: baseData.SaleType?.typeName,
            purchaseCurrency: baseData.PurchaseType?.typeName,
            swap: baseData.swap,
            isPurchase: true,
          },
        });
      }
    });

    // Combine all transactions with transaction type filtering
    const allTransactions = [
      ...(shouldIncludeTransactionType(TransactionType, 'deposit')
        ? normalize(deposits, 'deposit')
        : []),
      ...(shouldIncludeTransactionType(TransactionType, 'withdraw')
        ? normalize(withdraws, 'withdraw')
        : []),
      ...(shouldIncludeTransactionType(TransactionType, 'receive')
        ? normalize(filteredReceives, 'receive')
        : []),
      ...(shouldIncludeTransactionType(TransactionType, 'transfer')
        ? normalize(filteredTransfers, 'transfer')
        : []),
      ...exchangeTransactions,
    ];

    // Calculate running balance PER ACCOUNT
    const accountBalanceMap = new Map();
    customerAccounts.forEach((account) => {
      accountBalanceMap.set(account.No, {
        accountNo: account.No,
        currency: account.MoneyType.typeName,
        currentBalance: parseFloat(account.credit) || 0,
      });
    });

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

    // Handle transactions without account numbers
    const transactionsWithoutAccount = allTransactions.filter(
      (t) => !t.accountNo
    );
    if (transactionsWithoutAccount.length > 0) {
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

    // Final sorting and pagination
    allTransactionsWithBalance.sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    let filteredTransactions = allTransactionsWithBalance;

    // Apply liquidation filtering
    if (liquidations.length > 0) {
      filteredTransactions = allTransactionsWithBalance.filter((tx) => {
        const txDate = new Date(tx.date);
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
      filters: {
        search,
        moneyType,
        fromDate,
        toDate,
        TransactionType,
      },
    });
  } catch (err) {
    console.error('❌ getCustomerTransactions error:', err);
    res.status(500).json({
      message: err.message,
      stack: err.stack,
    });
  }
};

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
      if (transaction.PassTo?.customerId === customerId)
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

// exports.getCustomerTransactions = async (req, res) => {
//   try {
//     const customerId = parseInt(req.params.id, 10);
//     const orgId = req.orgId;
//     const {
//       search,
//       moneyType,
//       fromDate,
//       toDate,
//       TransactionType,
//       limit = 10,
//       page = 1,
//     } = req.query;

//     const parsedLimit = parseInt(limit) || 10;
//     const parsedPage = parseInt(page) || 1;
//     const offset = (parsedPage - 1) * parsedLimit;

//     console.log('🔍 Transaction query parameters:', {
//       customerId,
//       orgId,
//       search,
//       moneyType,
//       fromDate,
//       toDate,
//       TransactionType,
//       limit: parsedLimit,
//       page: parsedPage,
//     });

//     // Build base where clauses for each transaction type
//     const baseWhere = {
//       organizationId: orgId,
//       deleted: false,
//     };

//     // Build search conditions if search parameter exists - FIXED
//     const buildSearchConditions = (search) => {
//       if (!search) return {};

//       const searchNum = parseFloat(search);
//       const isNumber = !isNaN(searchNum);

//       const searchConditions = [{ description: { [Op.like]: `%${search}%` } }];

//       if (isNumber) {
//         searchConditions.push(
//           { receiveAmount: searchNum },
//           { transferAmount: searchNum },
//           { deposit: searchNum },
//           { withdraw: searchNum }
//         );
//       }

//       return {
//         [Op.or]: searchConditions,
//       };
//     };

//     // Build date range conditions - FIXED
//     const buildDateConditions = (fromDate, toDate, dateField = 'createdAt') => {
//       const conditions = {};

//       if (fromDate) {
//         const from = new Date(fromDate);
//         from.setHours(0, 0, 0, 0);
//         conditions[Op.gte] = from;
//       }

//       if (toDate) {
//         const to = new Date(toDate);
//         to.setHours(23, 59, 59, 999);
//         conditions[Op.lte] = to;
//       }

//       return Object.keys(conditions).length > 0 ? conditions : null;
//     };

//     // Build money type conditions for accounts - FIXED
//     const buildAccountMoneyTypeConditions = (moneyType) => {
//       if (!moneyType) return {};
//       return { '$MoneyType.typeName$': moneyType };
//     };

//     // Build money type conditions for receives and transfers - FIXED
//     const buildMainMoneyTypeConditions = (moneyType) => {
//       if (!moneyType) return {};
//       return { '$MainMoneyType.typeName$': moneyType };
//     };

//     // Build transaction type filter - FIXED
//     const shouldIncludeTransactionType = (transactionType, type) => {
//       if (!transactionType || transactionType === 'all') return true;

//       const typeMap = {
//         deposit: ['deposit'],
//         withdraw: ['withdraw'],
//         transfer: ['transfer'],
//         receive: ['receive'],
//         exchange: ['exchange_sale', 'exchange_purchase'],
//         exchange_sale: ['exchange_sale'],
//         exchange_purchase: ['exchange_purchase'],
//       };

//       const allowedTypes = typeMap[transactionType] || [transactionType];
//       return allowedTypes.includes(type);
//     };

//     // Build individual queries with proper filtering
//     const queryPromises = [];

//     // Deposits query
//     if (shouldIncludeTransactionType(TransactionType, 'deposit')) {
//       const depositWhere = {
//         ...baseWhere,
//         deposit: { [Op.gt]: 0 },
//       };

//       const searchConditions = buildSearchConditions(search);
//       if (searchConditions[Op.or]) {
//         depositWhere[Op.and] = [
//           {
//             [Op.or]: searchConditions[Op.or].filter(
//               (cond) => !cond.receiveAmount && !cond.transferAmount // Remove receive/transfer specific conditions
//             ),
//           },
//         ];
//       }

//       const dateConditions = buildDateConditions(fromDate, toDate, 'DWDate');
//       if (dateConditions) {
//         depositWhere.DWDate = dateConditions;
//       }

//       queryPromises.push(
//         DepositWithdraw.findAll({
//           where: depositWhere,
//           include: [
//             {
//               model: Account,
//               required: true,
//               where: { customerId, deleted: false },
//               include: [
//                 {
//                   model: MoneyType,
//                   where: moneyType ? { typeName: moneyType } : undefined,
//                   required: !!moneyType, // Only require if moneyType filter is applied
//                 },
//               ],
//             },
//           ],
//           order: [['DWDate', 'DESC']],
//         })
//       );
//     } else {
//       queryPromises.push(Promise.resolve([]));
//     }

//     // Withdraws query
//     if (shouldIncludeTransactionType(TransactionType, 'withdraw')) {
//       const withdrawWhere = {
//         ...baseWhere,
//         withdraw: { [Op.gt]: 0 },
//       };

//       const searchConditions = buildSearchConditions(search);
//       if (searchConditions[Op.or]) {
//         withdrawWhere[Op.and] = [
//           {
//             [Op.or]: searchConditions[Op.or].filter(
//               (cond) => !cond.receiveAmount && !cond.transferAmount
//             ),
//           },
//         ];
//       }

//       const dateConditions = buildDateConditions(fromDate, toDate, 'DWDate');
//       if (dateConditions) {
//         withdrawWhere.DWDate = dateConditions;
//       }

//       queryPromises.push(
//         DepositWithdraw.findAll({
//           where: withdrawWhere,
//           include: [
//             {
//               model: Account,
//               required: true,
//               where: { customerId, deleted: false },
//               include: [
//                 {
//                   model: MoneyType,
//                   where: moneyType ? { typeName: moneyType } : undefined,
//                   required: !!moneyType,
//                 },
//               ],
//             },
//           ],
//           order: [['DWDate', 'DESC']],
//         })
//       );
//     } else {
//       queryPromises.push(Promise.resolve([]));
//     }

//     // Receives query - FIXED
//     if (shouldIncludeTransactionType(TransactionType, 'receive')) {
//       const receiveWhere = {
//         ...baseWhere,
//         deleted: false,
//       };

//       const searchConditions = buildSearchConditions(search);
//       if (searchConditions[Op.or]) {
//         receiveWhere[Op.and] = [
//           {
//             [Op.or]: searchConditions[Op.or].filter(
//               (cond) => !cond.deposit && !cond.withdraw // Remove deposit/withdraw specific conditions
//             ),
//           },
//         ];
//       }

//       const dateConditions = buildDateConditions(fromDate, toDate, 'rDate');
//       if (dateConditions) {
//         receiveWhere.rDate = dateConditions;
//       }

//       // Build customer filter for receives
//       const customerFilter = {
//         [Op.or]: [
//           { customerId: customerId },
//           { '$FromBranch.customerId$': customerId },
//           { '$PassTo.customerId$': customerId },
//         ],
//       };

//       receiveWhere[Op.and] = [...(receiveWhere[Op.and] || []), customerFilter];

//       queryPromises.push(
//         Receive.findAll({
//           where: receiveWhere,
//           include: [
//             {
//               model: MoneyType,
//               as: 'MainMoneyType',
//               attributes: ['id', 'typeName'],
//               where: moneyType ? { typeName: moneyType } : undefined,
//               required: !!moneyType,
//             },
//             {
//               model: Branch,
//               as: 'FromBranch',
//               attributes: ['id', 'customerId'],
//               required: false,
//             },
//             {
//               model: Branch,
//               as: 'PassTo',
//               attributes: ['id', 'customerId'],
//               required: false,
//             },
//           ],
//           order: [['rDate', 'DESC']],
//         })
//       );
//     } else {
//       queryPromises.push(Promise.resolve([]));
//     }

//     // Transfers query - FIXED
//     if (shouldIncludeTransactionType(TransactionType, 'transfer')) {
//       const transferWhere = {
//         ...baseWhere,
//         deleted: false,
//       };

//       const searchConditions = buildSearchConditions(search);
//       if (searchConditions[Op.or]) {
//         transferWhere[Op.and] = [
//           {
//             [Op.or]: searchConditions[Op.or].filter(
//               (cond) => !cond.deposit && !cond.withdraw
//             ),
//           },
//         ];
//       }

//       const dateConditions = buildDateConditions(fromDate, toDate, 'tDate');
//       if (dateConditions) {
//         transferWhere.tDate = dateConditions;
//       }

//       // Build customer filter for transfers
//       const customerFilter = {
//         [Op.or]: [
//           { customerId: customerId },
//           { '$ToBranch.customerId$': customerId },
//         ],
//       };

//       transferWhere[Op.and] = [
//         ...(transferWhere[Op.and] || []),
//         customerFilter,
//       ];

//       queryPromises.push(
//         Transfer.findAll({
//           where: transferWhere,
//           include: [
//             {
//               model: MoneyType,
//               as: 'MainMoneyType',
//               attributes: ['id', 'typeName'],
//               where: moneyType ? { typeName: moneyType } : undefined,
//               required: !!moneyType,
//             },
//             {
//               model: Branch,
//               as: 'ToBranch',
//               attributes: ['id', 'customerId'],
//               required: false,
//             },
//           ],
//           order: [['tDate', 'DESC']],
//         })
//       );
//     } else {
//       queryPromises.push(Promise.resolve([]));
//     }

//     // Exchanges query - FIXED
//     if (
//       shouldIncludeTransactionType(TransactionType, 'exchange_sale') ||
//       shouldIncludeTransactionType(TransactionType, 'exchange_purchase')
//     ) {
//       const exchangeWhere = {
//         ...baseWhere,
//         customerId: customerId,
//         deleted: false,
//       };

//       const searchConditions = buildSearchConditions(search);
//       if (searchConditions[Op.or]) {
//         exchangeWhere[Op.and] = [{ [Op.or]: searchConditions[Op.or] }];
//       }

//       const dateConditions = buildDateConditions(fromDate, toDate, 'eDate');
//       if (dateConditions) {
//         exchangeWhere.eDate = dateConditions;
//       }

//       // Build money type filter for exchanges
//       const moneyTypeInclude = [];

//       if (moneyType) {
//         moneyTypeInclude.push(
//           {
//             model: MoneyType,
//             as: 'SaleType',
//             attributes: ['id', 'typeName'],
//             where: { typeName: moneyType },
//             required: false,
//           },
//           {
//             model: MoneyType,
//             as: 'PurchaseType',
//             attributes: ['id', 'typeName'],
//             where: { typeName: moneyType },
//             required: false,
//           }
//         );
//       } else {
//         moneyTypeInclude.push(
//           {
//             model: MoneyType,
//             as: 'SaleType',
//             attributes: ['id', 'typeName'],
//           },
//           {
//             model: MoneyType,
//             as: 'PurchaseType',
//             attributes: ['id', 'typeName'],
//           }
//         );
//       }

//       queryPromises.push(
//         Exchange.findAll({
//           where: exchangeWhere,
//           include: moneyTypeInclude,
//           order: [['eDate', 'DESC']],
//         })
//       );
//     } else {
//       queryPromises.push(Promise.resolve([]));
//     }

//     // Customer accounts for balance calculation
//     queryPromises.push(
//       Account.findAll({
//         where: { customerId, deleted: false },
//         include: [
//           {
//             model: MoneyType,
//             where: moneyType ? { typeName: moneyType } : undefined,
//             required: !!moneyType,
//           },
//         ],
//       })
//     );

//     // Liquidations query
//     queryPromises.push(
//       Liquidation.findAll({
//         where: {
//           organizationId: orgId,
//           customerId: customerId,
//           deleted: false,
//         },
//         attributes: ['startDate', 'endDate'],
//       })
//     );

//     // Execute all queries
//     const [
//       deposits = [],
//       withdraws = [],
//       receives = [],
//       transfers = [],
//       exchanges = [],
//       customerAccounts = [],
//       liquidations = [],
//     ] = await Promise.all(queryPromises);

//     console.log('📊 Query results:', {
//       deposits: deposits.length,
//       withdraws: withdraws.length,
//       receives: receives.length,
//       transfers: transfers.length,
//       exchanges: exchanges.length,
//       accounts: customerAccounts.length,
//       liquidations: liquidations.length,
//     });

//     // Helper function to get customer role
//     const getCustomerRole = (transaction, customerId, type) => {
//       switch (type) {
//         case 'deposit':
//         case 'withdraw':
//           return 'account_holder';

//         case 'receive':
//           if (transaction.customerId === customerId) return 'receiver';
//           if (transaction.FromBranch?.customerId === customerId)
//             return 'sender_branch';
//           if (transaction.ToPass?.customerId === customerId)
//             return 'receiver_branch';
//           return 'unknown';

//         case 'transfer':
//           if (transaction.customerId === customerId) return 'sender';
//           if (transaction.ToBranch?.customerId === customerId)
//             return 'receiver_branch';
//           return 'unknown';

//         case 'exchange_sale':
//         case 'exchange_purchase':
//           return 'exchanger';

//         default:
//           return 'unknown';
//       }
//     };

//     // Normalize transactions - FIXED
//     const normalize = (records, type) =>
//       records.map((r) => {
//         const baseData = r.toJSON();
//         let amount = 0;
//         let isCredit = false;
//         let transactionAmount = 0;
//         let currencyId, currencyName, accountNo;
//         let dateField;

//         switch (type) {
//           case 'deposit':
//           case 'withdraw':
//             if (baseData.Account?.MoneyType) {
//               currencyId = baseData.Account.MoneyType.id;
//               currencyName = baseData.Account.MoneyType.typeName;
//               accountNo = baseData.Account.No;
//             }
//             dateField = baseData.DWDate;
//             break;

//           case 'receive':
//           case 'transfer':
//             if (baseData.MainMoneyType) {
//               currencyId = baseData.MainMoneyType.id;
//               currencyName = baseData.MainMoneyType.typeName;
//             }
//             dateField = type === 'receive' ? baseData.rDate : baseData.tDate;
//             break;
//         }

//         switch (type) {
//           case 'deposit':
//             amount = parseFloat(baseData.deposit) || 0;
//             transactionAmount = amount;
//             isCredit = true;
//             break;

//           case 'withdraw':
//             amount = parseFloat(baseData.withdraw) || 0;
//             transactionAmount = amount;
//             isCredit = false;
//             break;

//           case 'receive':
//             amount = parseFloat(baseData.receiveAmount) || 0;
//             transactionAmount = amount;
//             if (baseData.customerId === customerId) {
//               isCredit = true;
//             } else if (baseData.FromBranch?.customerId === customerId) {
//               isCredit = false;
//             } else if (baseData.ToPass?.customerId === customerId) {
//               isCredit = true;
//             }
//             break;

//           case 'transfer':
//             amount = parseFloat(baseData.transferAmount) || 0;
//             transactionAmount = amount;
//             if (baseData.customerId === customerId) {
//               isCredit = false;
//             } else if (baseData.ToBranch?.customerId === customerId) {
//               isCredit = true;
//             }
//             break;
//         }

//         return {
//           ...baseData,
//           type,
//           date: dateField || baseData.createdAt,
//           transactionAmount: transactionAmount,
//           isCredit: isCredit,
//           amount: isCredit ? amount : -amount,
//           customerRole: getCustomerRole(baseData, customerId, type),
//           currencyId,
//           currencyName,
//           accountNo: accountNo || baseData.Account?.No || null,
//         };
//       });

//     // Process exchange transactions - FIXED
//     const exchangeTransactions = [];

//     exchanges.forEach((exchange) => {
//       const baseData = exchange.toJSON();
//       const saleAmount = parseFloat(baseData.saleAmount) || 0;
//       const purchaseAmount = parseFloat(baseData.purchaseAmount) || 0;

//       // Create sale transaction (debit) in sale currency
//       if (
//         saleAmount > 0 &&
//         shouldIncludeTransactionType(TransactionType, 'exchange_sale')
//       ) {
//         exchangeTransactions.push({
//           ...baseData,
//           type: 'exchange_sale',
//           date: baseData.eDate || baseData.createdAt,
//           transactionAmount: saleAmount,
//           isCredit: false,
//           amount: -saleAmount,
//           customerRole: 'exchanger',
//           currencyId: baseData.saleMoneyType,
//           currencyName: baseData.SaleType?.typeName,
//           accountNo: null, // Will be linked via account mapping
//           exchangeDetails: {
//             exchangeId: baseData.id,
//             rate: baseData.rate,
//             saleCurrency: baseData.SaleType?.typeName,
//             purchaseCurrency: baseData.PurchaseType?.typeName,
//             swap: baseData.swap,
//             isSale: true,
//           },
//         });
//       }

//       // Create purchase transaction (credit) in purchase currency
//       if (
//         purchaseAmount > 0 &&
//         shouldIncludeTransactionType(TransactionType, 'exchange_purchase')
//       ) {
//         exchangeTransactions.push({
//           ...baseData,
//           type: 'exchange_purchase',
//           date: baseData.eDate || baseData.createdAt,
//           transactionAmount: purchaseAmount,
//           isCredit: true,
//           amount: purchaseAmount,
//           customerRole: 'exchanger',
//           currencyId: baseData.purchaseMoneyType,
//           currencyName: baseData.PurchaseType?.typeName,
//           accountNo: null,
//           exchangeDetails: {
//             exchangeId: baseData.id,
//             rate: baseData.rate,
//             saleCurrency: baseData.SaleType?.typeName,
//             purchaseCurrency: baseData.PurchaseType?.typeName,
//             swap: baseData.swap,
//             isPurchase: true,
//           },
//         });
//       }
//     });

//     // Combine all transactions
//     const allTransactions = [
//       ...normalize(deposits, 'deposit'),
//       ...normalize(withdraws, 'withdraw'),
//       ...normalize(receives, 'receive'),
//       ...normalize(transfers, 'transfer'),
//       ...exchangeTransactions,
//     ];

//     console.log(
//       '📈 Total transactions before filtering:',
//       allTransactions.length
//     );

//     // Apply liquidation filtering
//     let filteredTransactions = allTransactions;

//     if (liquidations.length > 0) {
//       filteredTransactions = allTransactions.filter((tx) => {
//         const txDate = new Date(tx.date);
//         return !liquidations.some((liq) => {
//           const start = new Date(liq.startDate);
//           const end = new Date(liq.endDate);
//           return txDate >= start && txDate <= end;
//         });
//       });
//     }

//     console.log(
//       '📈 Total transactions after liquidation filtering:',
//       filteredTransactions.length
//     );

//     // Sort by date (newest first) for display
//     filteredTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

//     // Apply pagination
//     const totalTransactions = filteredTransactions.length;
//     const pagedTransactions = filteredTransactions.slice(
//       offset,
//       offset + parsedLimit
//     );

//     // Calculate account summary
//     const accountSummary = customerAccounts.map((account) => ({
//       accountNo: account.No,
//       currency: account.MoneyType?.typeName || 'Unknown',
//       balance: parseFloat(account.credit) || 0,
//     }));

//     res.status(200).json({
//       status: 'success',
//       total: totalTransactions,
//       page: parsedPage,
//       limit: parsedLimit,
//       totalPages: Math.ceil(totalTransactions / parsedLimit),
//       data: pagedTransactions,
//       accountCount: customerAccounts.length,
//       accountSummary: accountSummary,
//       filters: {
//         search,
//         moneyType,
//         fromDate,
//         toDate,
//         TransactionType,
//       },
//     });
//   } catch (err) {
//     console.error('❌ getCustomerTransactions error:', err);
//     res.status(500).json({
//       status: 'error',
//       message: 'Failed to fetch customer transactions',
//       error:
//         process.env.NODE_ENV === 'development'
//           ? err.message
//           : 'Internal server error',
//     });
//   }
// };
