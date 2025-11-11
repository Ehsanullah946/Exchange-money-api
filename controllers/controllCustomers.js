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
// controllers/customerController.js - Updated to match management system
exports.getCustomerAccounts = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const customerId = req.customer.id;
    const orgId = req.orgId; // Now we have organizationId!

    // 1. Find main currency (USA) - WITH ORGANIZATION
    const mainCurrency = await MoneyType.findOne({
      where: {
        typeName: 'USA',
        organizationId: orgId, // Added organizationId
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

    console.log('💰 Main currency found:', {
      id: mainCurrency.id,
      name: mainCurrency.typeName,
      orgId: mainCurrency.organizationId,
    });

    // Get accounts - EXACTLY like management system
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
                  where: { organizationId: orgId }, // Added organization filter
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

    console.log('📊 Accounts found:', accounts.length);
    accounts.forEach((account) => {
      console.log('Account details:', {
        id: account.id,
        accountNumber: account.accountNumber,
        balance: account.credit,
        currency: account.MoneyType?.typeName,
        hasCustomer: !!account.Customer,
        hasStakeholder: !!account.Customer?.Stakeholder,
        hasPerson: !!account.Customer?.Stakeholder?.Person,
        personName: account.Customer?.Stakeholder?.Person
          ? `${account.Customer.Stakeholder.Person.firstName} ${account.Customer.Stakeholder.Person.lastName}`
          : 'No person',
      });
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

    console.log('👤 Customer name extracted:', customerName);

    // Get unique currency IDs from accounts (excluding main currency)
    const currencyIds = [
      ...new Set(
        accounts
          .map((acc) => acc.moneyTypeId)
          .filter((id) => id !== mainCurrency.id)
      ),
    ];

    console.log('🪙 Currency IDs for rate lookup:', currencyIds);

    // Get latest ACTIVE rates for each currency - WITH ORGANIZATION
    let latestRates = [];
    if (currencyIds.length > 0) {
      // First, get the latest effective date for each currency
      const latestRateDates = await Rate.findAll({
        where: {
          fromCurrency: currencyIds,
          toCurrency: mainCurrency.id,
          organizationId: orgId, // Added organizationId
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

      console.log('📈 Latest rate dates found:', latestRateDates);

      // Then get the full rate data for those dates
      if (latestRateDates.length > 0) {
        const rateQueries = latestRateDates.map((dateInfo) =>
          Rate.findOne({
            where: {
              fromCurrency: dateInfo.fromCurrency,
              toCurrency: mainCurrency.id,
              organizationId: orgId, // Added organizationId
              isActive: true,
              effectiveDate: dateInfo.latestDate,
            },
            transaction: t,
          })
        );

        latestRates = (await Promise.all(rateQueries)).filter(
          (rate) => rate !== null
        );

        console.log('💹 Rates found:', latestRates.length);
        latestRates.forEach((rate) => {
          console.log('Rate details:', {
            fromCurrency: rate.fromCurrency,
            toCurrency: rate.toCurrency,
            middleRate: rate.middleRate,
            organizationId: rate.organizationId,
          });
        });
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

    const response = {
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
    };

    console.log('✅ Final API response ready:', {
      customerName: response.customer.name,
      totalAccounts: response.accounts.length,
      totalBalance: response.summary.totalInMainCurrency,
    });

    res.status(200).json(response);
  } catch (err) {
    await t.rollback();
    console.error('❌ Error in getCustomerAccounts:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to get customer accounts: ' + err.message,
    });
  }
};

exports.getCustomerDetails = async (req, res) => {
  try {
    const customerId = req.customer.id;
    const customer = await Customer.findOne({
      where: { customerId },
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

exports.getCustomerTransactions = async (req, res) => {
  try {
    const customerId = req.customer.id;
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

    // Build date range conditions - FIXED: Return conditions object directly
    const buildDateConditions = (fromDate, toDate) => {
      if (!fromDate && !toDate) return null;

      const conditions = {};
      if (fromDate) {
        conditions[Op.gte] = new Date(fromDate);
      }
      if (toDate) {
        // Set to end of day for the toDate
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);
        conditions[Op.lte] = endDate;
      }
      return conditions;
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

    // Get date conditions
    const dateConditions = buildDateConditions(fromDate, toDate);

    const [
      deposits,
      withdraws,
      receives,
      allTransfers,
      exchanges,
      customerAccounts,
    ] = await Promise.all([
      // Deposits - FIXED: Apply date conditions directly
      DepositWithdraw.findAll({
        where: {
          ...baseWhere,
          deposit: { [Op.gt]: 0 },
          ...buildSearchConditions(search),
          ...(dateConditions ? { DWDate: dateConditions } : {}),
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

      // Withdraws - FIXED: Apply date conditions directly
      DepositWithdraw.findAll({
        where: {
          ...baseWhere,
          withdraw: { [Op.gt]: 0 },
          ...buildSearchConditions(search),
          ...(dateConditions ? { DWDate: dateConditions } : {}),
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

      // Receives - FIXED: Apply date conditions directly
      Receive.findAll({
        where: {
          ...baseWhere,
          ...buildSearchConditions(search),
          ...(dateConditions ? { rDate: dateConditions } : {}),
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

      // Transfers - FIXED: Apply date conditions directly
      Transfer.findAll({
        where: {
          ...baseWhere,
          ...buildSearchConditions(search),
          ...(dateConditions ? { tDate: dateConditions } : {}),
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

      // Exchanges - FIXED: Apply date conditions directly
      Exchange.findAll({
        where: {
          ...baseWhere,
          customerId,
          ...buildSearchConditions(search),
          ...(dateConditions ? { eDate: dateConditions } : {}),
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
