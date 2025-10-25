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
  Rate,
  Branch,
  sequelize,
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

// exports.getAccountTransactions = async (req, res) => {
//   try {
//     const accountId = parseInt(req.params.id, 10);
//     const orgId = req.orgId;
//     const { limit = 10, page = 1 } = req.query;

//     console.log(
//       '🔍 Querying transactions for account:',
//       accountId,
//       'org:',
//       orgId
//     );

//     const parsedLimit = parseInt(limit) || 10;
//     const parsedPage = parseInt(page) || 1;
//     const offset = (parsedPage - 1) * parsedLimit;

//     // First, get the account details to know the customerId
//     const account = await Account.findOne({
//       where: { No: accountId },
//       include: [{ model: MoneyType }],
//     });

//     if (!account) {
//       return res.status(404).json({
//         status: 'error',
//         message: 'Account not found',
//       });
//     }

//     const customerId = account.customerId;
//     console.log('👤 Account belongs to customer:', customerId);

//     // ---------------------------
//     // 1️⃣ Fetch all transaction types
//     // ---------------------------
//     const [deposits, withdraws, receives, transfers] = await Promise.all([
//       // Deposit - Direct account transactions
//       DepositWithdraw.findAll({
//         where: {
//           organizationId: orgId,
//           deleted: false,
//           deposit: { [Op.gt]: 0 },
//         },
//         include: [
//           {
//             model: Account,
//             required: true,
//             where: { No: accountId },
//             include: [{ model: MoneyType }],
//           },
//         ],
//       }),

//       // Withdraw - Direct account transactions
//       DepositWithdraw.findAll({
//         where: {
//           organizationId: orgId,
//           deleted: false,
//           withdraw: { [Op.gt]: 0 },
//         },
//         include: [
//           {
//             model: Account,
//             required: true,
//             where: { No: accountId },
//             include: [{ model: MoneyType }],
//           },
//         ],
//       }),

//       // Receive - Include customer-based filtering like customer transactions API
//       Receive.findAll({
//         where: {
//           organizationId: orgId,
//           deleted: false,
//         },
//         include: [
//           {
//             model: MoneyType,
//             as: 'MainMoneyType',
//             attributes: ['id', 'typeName'],
//           },
//           {
//             model: Branch,
//             as: 'FromBranch',
//             include: [
//               {
//                 model: Customer,
//                 include: [
//                   {
//                     model: Account,
//                     where: { No: accountId }, // Account-based filter
//                     required: false,
//                   },
//                 ],
//               },
//             ],
//           },
//           {
//             model: Branch,
//             as: 'ToPass',
//             include: [
//               {
//                 model: Customer,
//                 include: [
//                   {
//                     model: Account,
//                     where: { No: accountId }, // Account-based filter
//                     required: false,
//                   },
//                 ],
//               },
//             ],
//           },
//         ],
//       }),

//       // Transfer - Include customer-based filtering like customer transactions API
//       Transfer.findAll({
//         where: {
//           organizationId: orgId,
//           deleted: false,
//         },
//         include: [
//           {
//             model: MoneyType,
//             as: 'MainMoneyType',
//             attributes: ['id', 'typeName'],
//           },
//           {
//             model: Branch,
//             as: 'ToBranch',
//             include: [
//               {
//                 model: Customer,
//                 include: [
//                   {
//                     model: Account,
//                     where: { No: accountId }, // Account-based filter
//                     required: false,
//                   },
//                 ],
//               },
//             ],
//           },
//         ],
//       }),
//     ]);

//     // ---------------------------
//     // 2️⃣ Filter transactions that involve this account OR customer
//     // ---------------------------
//     const filteredReceives = receives.filter((r) => {
//       const fromAccounts =
//         r.FromBranch?.Customer?.Accounts?.map((a) => a.No) || [];
//       const toAccounts = r.ToPass?.Customer?.Accounts?.map((a) => a.No) || [];

//       // FIX: Also include receives where the customer is directly involved
//       const isCustomerInvolved =
//         r.customerId === customerId ||
//         r.FromBranch?.customerId === customerId ||
//         r.ToPass?.customerId === customerId;

//       return (
//         fromAccounts.includes(accountId) ||
//         toAccounts.includes(accountId) ||
//         isCustomerInvolved
//       );
//     });

//     const filteredTransfers = transfers.filter((t) => {
//       const toAccounts = t.ToBranch?.Customer?.Accounts?.map((a) => a.No) || [];

//       // FIX: Also include transfers where the customer is directly involved
//       const isCustomerInvolved =
//         t.customerId === customerId || t.ToBranch?.customerId === customerId;

//       return toAccounts.includes(accountId) || isCustomerInvolved;
//     });

//     console.log('📊 Query Results:');
//     console.log('Deposits:', deposits.length);
//     console.log('Withdraws:', withdraws.length);
//     console.log('Receives (filtered):', filteredReceives.length);
//     console.log('Transfers (filtered):', filteredTransfers.length);

//     // ---------------------------
//     // 3️⃣ Normalize all data and calculate amounts
//     // ---------------------------
//     const normalize = (records, type) =>
//       records.map((r) => {
//         const baseData = r.toJSON();

//         // Calculate transaction amount based on type
//         let amount = 0;
//         let isCredit = false;

//         switch (type) {
//           case 'deposit':
//             amount = parseFloat(baseData.deposit) || 0;
//             isCredit = true;
//             break;
//           case 'withdraw':
//             amount = parseFloat(baseData.withdraw) || 0;
//             isCredit = false;
//             break;
//           case 'receive':
//             amount = parseFloat(baseData.receiveAmount) || 0;
//             const receiveFromAccounts =
//               baseData.FromBranch?.Customer?.Accounts?.map((a) => a.No) || [];
//             const receiveToAccounts =
//               baseData.ToPass?.Customer?.Accounts?.map((a) => a.No) || [];

//             // FIX: Enhanced logic to match customer transactions API
//             if (receiveToAccounts.includes(accountId)) {
//               // Account is receiving
//               isCredit = true;
//             } else if (receiveFromAccounts.includes(accountId)) {
//               // Account is sending
//               isCredit = false;
//             } else if (baseData.customerId === customerId) {
//               // Customer is direct receiver
//               isCredit = true;
//             } else if (baseData.FromBranch?.customerId === customerId) {
//               // Customer's branch is sending
//               isCredit = false;
//             } else if (baseData.ToPass?.customerId === customerId) {
//               // Customer's branch is receiving
//               isCredit = true;
//             }
//             break;
//           case 'transfer':
//             amount = parseFloat(baseData.transferAmount) || 0;
//             const transferToAccounts =
//               baseData.ToBranch?.Customer?.Accounts?.map((a) => a.No) || [];

//             // FIX: Enhanced logic to match customer transactions API
//             if (transferToAccounts.includes(accountId)) {
//               // Account is receiving
//               isCredit = true;
//             } else if (baseData.customerId === customerId) {
//               // Customer is sender
//               isCredit = false;
//             } else if (baseData.ToBranch?.customerId === customerId) {
//               // Customer's branch is receiving
//               isCredit = true;
//             }
//             break;
//         }

//         return {
//           ...baseData,
//           type,
//           date:
//             baseData.DWDate ||
//             baseData.rDate ||
//             baseData.tDate ||
//             baseData.createdAt,
//           transactionAmount: amount,
//           isCredit: isCredit,
//           amount: isCredit ? amount : -amount,
//           // Add role information for clarity
//           accountRole: getAccountRole(baseData, accountId, customerId, type),
//         };
//       });

//     // Helper function to determine account's role in transaction
//     function getAccountRole(transaction, accountId, customerId, type) {
//       switch (type) {
//         case 'deposit':
//           return 'primary_account';
//         case 'withdraw':
//           return 'primary_account';
//         case 'receive':
//           const receiveFromAccounts =
//             transaction.FromBranch?.Customer?.Accounts?.map((a) => a.No) || [];
//           const receiveToAccounts =
//             transaction.ToPass?.Customer?.Accounts?.map((a) => a.No) || [];

//           if (receiveToAccounts.includes(accountId)) return 'receiving_account';
//           if (receiveFromAccounts.includes(accountId)) return 'sending_account';
//           if (transaction.customerId === customerId) return 'customer_receiver';
//           if (transaction.FromBranch?.customerId === customerId)
//             return 'customer_sender_branch';
//           if (transaction.ToPass?.customerId === customerId)
//             return 'customer_receiver_branch';
//           return 'unknown';
//         case 'transfer':
//           const transferToAccounts =
//             transaction.ToBranch?.Customer?.Accounts?.map((a) => a.No) || [];
//           if (transferToAccounts.includes(accountId))
//             return 'receiving_account';
//           if (transaction.customerId === customerId) return 'customer_sender';
//           if (transaction.ToBranch?.customerId === customerId)
//             return 'customer_receiver_branch';
//           return 'unknown';
//         default:
//           return 'unknown';
//       }
//     }

//     const allTransactions = [
//       ...normalize(deposits, 'deposit'),
//       ...normalize(withdraws, 'withdraw'),
//       ...normalize(filteredReceives, 'receive'),
//       ...normalize(filteredTransfers, 'transfer'),
//     ];

//     // Rest of the balance calculation code remains the same...
//     allTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));

//     let runningBalance = parseFloat(account.credit) || 0;

//     // Subtract all transaction amounts to get the starting balance
//     allTransactions.forEach((transaction) => {
//       runningBalance -= transaction.amount;
//     });

//     const transactionsWithBalance = allTransactions.map((transaction) => {
//       runningBalance += transaction.amount;
//       return {
//         ...transaction,
//         runningBalance: parseFloat(runningBalance.toFixed(2)),
//         credit: transaction.isCredit ? transaction.transactionAmount : 0,
//         debit: !transaction.isCredit ? transaction.transactionAmount : 0,
//       };
//     });

//     transactionsWithBalance.sort((a, b) => new Date(b.date) - new Date(a.date));

//     const paged = transactionsWithBalance.slice(offset, offset + parsedLimit);

//     res.status(200).json({
//       status: 'success',
//       total: transactionsWithBalance.length,
//       page: parsedPage,
//       limit: parsedLimit,
//       data: paged,
//       currentBalance: parseFloat(account.credit) || 0,
//       accountInfo: {
//         accountNo: account.No,
//         customerId: account.customerId,
//         moneyType: account.MoneyType?.typeName,
//       },
//     });
//   } catch (err) {
//     console.error('❌ getAccountTransactions error:', err);
//     res.status(500).json({
//       message: err.message,
//       stack: err.stack,
//     });
//   }
// };

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

    // First, get the account details to know the customerId and moneyTypeId
    const account = await Account.findOne({
      where: { No: accountId },
      include: [{ model: MoneyType }],
    });

    if (!account) {
      return res.status(404).json({
        status: 'error',
        message: 'Account not found',
      });
    }

    const customerId = account.customerId;
    const accountMoneyTypeId = account.moneyTypeId;
    const accountMoneyTypeName = account.MoneyType?.typeName;

    console.log('👤 Account details:', {
      accountNo: account.No,
      customerId: customerId,
      moneyTypeId: accountMoneyTypeId,
      moneyTypeName: accountMoneyTypeName,
    });

    // ---------------------------
    // 1️⃣ Fetch all transaction types INCLUDING EXCHANGES
    // ---------------------------
    const [deposits, withdraws, receives, transfers, exchanges, liquidations] =
      await Promise.all([
        // Deposit - Filter by account
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

        // Withdraw - Filter by account
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

        // Receive - Filter by money type OR customer involvement
        Receive.findAll({
          where: {
            organizationId: orgId,
            deleted: false,
            [Op.or]: [
              { moneyTypeId: accountMoneyTypeId },
              { customerId: customerId },
            ],
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
              attributes: ['id', 'customerId'],
            },
            {
              model: Branch,
              as: 'PassTo',
              attributes: ['id', 'customerId'],
            },
          ],
        }),

        // Transfer - Filter by money type OR customer involvement
        Transfer.findAll({
          where: {
            organizationId: orgId,
            deleted: false,
            [Op.or]: [
              { moneyTypeId: accountMoneyTypeId },
              { customerId: customerId },
            ],
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
              attributes: ['id', 'customerId'],
            },
          ],
        }),

        // Exchanges - Filter by customer AND relevant money types
        Exchange.findAll({
          where: {
            organizationId: orgId,
            deleted: false,
            customerId: customerId,
            [Op.or]: [
              { saleMoneyType: accountMoneyTypeId },
              { purchaseMoneyType: accountMoneyTypeId },
            ],
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

        // Liquidations for filtering
        Liquidation.findAll({
          where: {
            organizationId: orgId,
            customerId: customerId,
            deleted: false,
          },
          attributes: ['startDate', 'endDate'],
        }),
      ]);

    // ---------------------------
    // 2️⃣ Filter transactions that involve this account OR customer WITH PROPER MONEY TYPE
    // ---------------------------
    const filteredReceives = receives.filter((r) => {
      // If transaction is in account's currency OR involves the customer
      const isSameCurrency = r.moneyTypeId === accountMoneyTypeId;
      const isCustomerInvolved =
        r.customerId === customerId ||
        r.FromBranch?.customerId === customerId ||
        r.PassTo?.customerId === customerId;

      return isSameCurrency && isCustomerInvolved;
    });

    const filteredTransfers = transfers.filter((t) => {
      // If transaction is in account's currency OR involves the customer
      const isSameCurrency = t.moneyTypeId === accountMoneyTypeId;
      const isCustomerInvolved =
        t.customerId === customerId || t.ToBranch?.customerId === customerId;

      return isSameCurrency && isCustomerInvolved;
    });

    console.log('📊 Query Results:');
    console.log('Deposits:', deposits.length);
    console.log('Withdraws:', withdraws.length);
    console.log('Receives (filtered):', filteredReceives.length);
    console.log('Transfers (filtered):', filteredTransfers.length);
    console.log('Exchanges:', exchanges.length);
    console.log('💰 Money Type:', accountMoneyTypeName);

    // ---------------------------
    // 3️⃣ Normalize all data and calculate amounts
    // ---------------------------
    const normalize = (records, type) =>
      records.map((r) => {
        const baseData = r.toJSON();
        let amount = 0;
        let isCredit = false;
        let transactionAmount = 0;

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
          accountRole: getAccountRole(baseData, accountId, customerId, type),
          currencyId: accountMoneyTypeId,
          currencyName: accountMoneyTypeName,
          accountNo: account.No,
        };
      });

    // ---------------------------
    // 4️⃣ Handle exchanges as separate transactions
    // ---------------------------
    const exchangeTransactions = [];

    exchanges.forEach((exchange) => {
      const baseData = exchange.toJSON();
      const saleAmount = parseFloat(baseData.saleAmount) || 0;
      const purchaseAmount = parseFloat(baseData.purchaseAmount) || 0;

      // Create sale transaction (debit) if in account's currency
      if (baseData.saleMoneyType === accountMoneyTypeId && saleAmount > 0) {
        exchangeTransactions.push({
          ...baseData,
          type: 'exchange_sale',
          date: baseData.eDate || baseData.createdAt,
          transactionAmount: saleAmount,
          isCredit: false,
          amount: -saleAmount,
          accountRole: 'exchanger',
          currencyId: baseData.saleMoneyType,
          currencyName: baseData.SaleType?.typeName,
          accountNo: account.No,
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

      // Create purchase transaction (credit) if in account's currency
      if (
        baseData.purchaseMoneyType === accountMoneyTypeId &&
        purchaseAmount > 0
      ) {
        exchangeTransactions.push({
          ...baseData,
          type: 'exchange_purchase',
          date: baseData.eDate || baseData.createdAt,
          transactionAmount: purchaseAmount,
          isCredit: true,
          amount: purchaseAmount,
          accountRole: 'exchanger',
          currencyId: baseData.purchaseMoneyType,
          currencyName: baseData.PurchaseType?.typeName,
          accountNo: account.No,
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

    // Combine all transactions
    const allTransactions = [
      ...normalize(deposits, 'deposit'),
      ...normalize(withdraws, 'withdraw'),
      ...normalize(filteredReceives, 'receive'),
      ...normalize(filteredTransfers, 'transfer'),
      ...exchangeTransactions,
    ];

    // ---------------------------
    // 5️⃣ Calculate running balance for THIS SPECIFIC ACCOUNT
    // ---------------------------
    allTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));

    let runningBalance = parseFloat(account.credit) || 0;

    // Subtract all transaction amounts to get the starting balance
    allTransactions.forEach((transaction) => {
      runningBalance -= transaction.amount;
    });

    console.log('🏁 Starting balance for calculation:', runningBalance);

    const transactionsWithBalance = allTransactions.map((transaction) => {
      runningBalance += transaction.amount;
      return {
        ...transaction,
        runningBalance: parseFloat(runningBalance.toFixed(2)),
        credit: transaction.isCredit ? transaction.transactionAmount : 0,
        debit: !transaction.isCredit ? transaction.transactionAmount : 0,
        moneyType: accountMoneyTypeName,
      };
    });

    // ---------------------------
    // 6️⃣ Filter out liquidated transactions
    // ---------------------------
    let filteredTransactions = transactionsWithBalance;

    if (liquidations.length > 0) {
      filteredTransactions = transactionsWithBalance.filter((tx) => {
        const txDate = new Date(tx.date);
        return !liquidations.some((liq) => {
          const start = new Date(liq.startDate);
          const end = new Date(liq.endDate);
          return txDate >= start && txDate <= end;
        });
      });
    }

    // ---------------------------
    // 7️⃣ Final sorting and pagination
    // ---------------------------
    filteredTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    const paged = filteredTransactions.slice(offset, offset + parsedLimit);

    console.log('📈 Final transactions count:', filteredTransactions.length);

    // ---------------------------
    // 8️⃣ Send response
    // ---------------------------
    res.status(200).json({
      status: 'success',
      total: filteredTransactions.length,
      page: parsedPage,
      limit: parsedLimit,
      data: paged,
      currentBalance: parseFloat(account.credit) || 0,
      accountInfo: {
        accountNo: account.No,
        customerId: account.customerId,
        moneyTypeId: accountMoneyTypeId,
        moneyTypeName: accountMoneyTypeName,
      },
    });
  } catch (err) {
    console.error('❌ getAccountTransactions error:', err);
    res.status(500).json({
      message: err.message,
      stack: err.stack,
    });
  }
};

// Helper function to determine account's role in transaction
function getAccountRole(transaction, accountId, customerId, type) {
  switch (type) {
    case 'deposit':
      return 'primary_account';
    case 'withdraw':
      return 'primary_account';
    case 'receive':
      if (transaction.customerId === customerId) return 'customer_receiver';
      if (transaction.FromBranch?.customerId === customerId)
        return 'customer_sender_branch';
      if (transaction.PassTo?.customerId === customerId)
        return 'customer_receiver_branch';
      return 'unknown';
    case 'transfer':
      if (transaction.customerId === customerId) return 'customer_sender';
      if (transaction.ToBranch?.customerId === customerId)
        return 'customer_receiver_branch';
      return 'unknown';
    case 'exchange_sale':
    case 'exchange_purchase':
      return 'exchanger';
    default:
      return 'unknown';
  }
}
exports.getAccountSummary = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const orgId = req.orgId;

    // 1. Find the specific account
    const account = await Account.findOne({
      where: {
        No: id,
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

    if (!account) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Account not found',
      });
    }

    // 2. Define base currency for reporting (USA)
    const baseCurrency = await MoneyType.findOne({
      where: {
        typeName: 'USA',
        organizationId: orgId,
      },
      transaction: t,
    });

    if (!baseCurrency) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Base currency (USA) not found',
      });
    }

    // 3. Get all accounts for this customer
    const customerAccounts = await Account.findAll({
      where: {
        customerId: account.customerId,
        deleted: false,
      },
      include: [
        {
          model: MoneyType,
          attributes: ['id', 'typeName'],
        },
      ],
      transaction: t,
    });

    if (!customerAccounts || customerAccounts.length === 0) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'No accounts found for this customer',
      });
    }

    // 4. Get ALL latest rates (both directions)
    const allMoneyTypes = await MoneyType.findAll({
      where: { organizationId: orgId },
      attributes: ['id'],
      raw: true,
    });

    const moneyTypeIds = allMoneyTypes.map((mt) => mt.id);

    // Get latest dates for all currency pairs
    const latestRateDates = await Rate.findAll({
      where: {
        organizationId: orgId,
        isActive: true,
      },
      attributes: [
        'fromCurrency',
        'toCurrency',
        [sequelize.fn('MAX', sequelize.col('effectiveDate')), 'latestDate'],
      ],
      group: ['fromCurrency', 'toCurrency'],
      raw: true,
      transaction: t,
    });

    // Get full rate data for latest dates
    const rateQueries = latestRateDates.map((dateInfo) =>
      Rate.findOne({
        where: {
          fromCurrency: dateInfo.fromCurrency,
          toCurrency: dateInfo.toCurrency,
          organizationId: orgId,
          isActive: true,
          effectiveDate: dateInfo.latestDate,
        },
        include: [
          {
            model: MoneyType,
            as: 'sourceCurrency',
            where: { organizationId: orgId },
          },
          {
            model: MoneyType,
            as: 'targetCurrency',
            where: { organizationId: orgId },
          },
        ],
        transaction: t,
      })
    );

    const allLatestRates = (await Promise.all(rateQueries)).filter(
      (rate) => rate !== null
    );

    // 5. Create a comprehensive rate map that handles both directions
    const rateMap = new Map();

    allLatestRates.forEach((rate) => {
      const key = `${rate.fromCurrency}-${rate.toCurrency}`;
      const inverseKey = `${rate.toCurrency}-${rate.fromCurrency}`;
      // Store direct rate
      rateMap.set(key, {
        rate: parseFloat(rate.middleRate),
        buyRate: parseFloat(rate.buyRate),
        sellRate: parseFloat(rate.sellRate),
        effectiveDate: rate.effectiveDate,
        direction: 'direct',
      });

      // Calculate and store inverse rate
      if (parseFloat(rate.middleRate) > 0) {
        rateMap.set(inverseKey, {
          rate: 1 / parseFloat(rate.middleRate),
          buyRate: 1 / parseFloat(rate.buyRate),
          sellRate: 1 / parseFloat(rate.sellRate),
          effectiveDate: rate.effectiveDate,
          direction: 'inverse',
        });
      }
    });
    // 6. Smart conversion function
    const convertToBaseCurrency = (
      amount,
      fromCurrencyId,
      toCurrencyId = baseCurrency.id
    ) => {
      if (fromCurrencyId === toCurrencyId) {
        return { converted: amount, rate: 1, direction: 'same' };
      }

      // Try direct rate first
      const directKey = `${fromCurrencyId}-${toCurrencyId}`;
      if (rateMap.has(directKey)) {
        const rateInfo = rateMap.get(directKey);
        return {
          converted: amount * rateInfo.rate,
          rate: rateInfo.rate,
          direction: 'direct',
        };
      }

      // Try inverse rate
      const inverseKey = `${toCurrencyId}-${fromCurrencyId}`;
      if (rateMap.has(inverseKey)) {
        const rateInfo = rateMap.get(inverseKey);
        return {
          converted: amount / rateInfo.rate, // Inverse of inverse = direct
          rate: 1 / rateInfo.rate,
          direction: 'inverse',
        };
      }

      // No rate found
      return {
        converted: amount,
        rate: 1,
        direction: 'no_rate',
      };
    };

    // 7. Process accounts with smart conversion
    let totalInBaseCurrency = 0;
    const accountDetails = [];

    for (const customerAccount of customerAccounts) {
      const originalBalance = parseFloat(customerAccount.credit);

      // Convert to base currency using smart conversion
      const conversion = convertToBaseCurrency(
        originalBalance,
        customerAccount.moneyTypeId,
        baseCurrency.id
      );

      totalInBaseCurrency += conversion.converted;

      accountDetails.push({
        accountId: customerAccount.No || customerAccount.id,
        currencyId: customerAccount.moneyTypeId,
        currencyName: customerAccount.MoneyType.typeName,
        originalBalance: originalBalance,
        convertedBalance: parseFloat(conversion.converted.toFixed(2)),
        conversionRate: conversion.rate,
        conversionDirection: conversion.direction,
        isBaseCurrency: customerAccount.moneyTypeId === baseCurrency.id,
        accountCreationDate: customerAccount.dateOfCreation,
        isCurrentAccount: customerAccount.No === id,
      });
    }

    await t.commit();

    // 8. Format response
    res.status(200).json({
      success: true,
      requestedAccount: {
        id: account.No,
        number: account.No,
        currency: account.MoneyType.typeName,
        currentBalance: parseFloat(account.credit),
        isBaseCurrency: account.moneyTypeId === baseCurrency.id,
      },
      customer: {
        id: account.customerId,
        name: account.Customer?.Stakeholder?.Person
          ? `${account.Customer.Stakeholder.Person.firstName} ${account.Customer.Stakeholder.Person.lastName}`
          : 'Unknown Customer',
      },
      accounts: accountDetails,
      summary: {
        totalInBaseCurrency: parseFloat(totalInBaseCurrency.toFixed(2)),
        baseCurrency: baseCurrency.typeName,
        baseCurrencyId: baseCurrency.id,
        totalAccounts: customerAccounts.length,
        ratesUsed: accountDetails.filter(
          (acc) => acc.conversionDirection !== 'no_rate'
        ).length,
        missingRates: accountDetails.filter(
          (acc) => acc.conversionDirection === 'no_rate'
        ).length,
      },
      conversionDate: new Date().toISOString(),
    });
  } catch (err) {
    await t.rollback();
    console.error('Error in getAccountSummary:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to get account summary: ' + err.message,
    });
  }
};
