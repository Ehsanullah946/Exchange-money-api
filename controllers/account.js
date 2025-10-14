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
} = require('../models');

const { sequelize } = require('sequelize');
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
    // 1️⃣ Fetch all transaction types FILTERED BY MONEY TYPE
    // ---------------------------
    const [deposits, withdraws, receives, transfers] = await Promise.all([
      // Deposit - Filter by account money type
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
            where: { No: accountId }, // Specific account
            include: [
              {
                model: MoneyType,
                where: { id: accountMoneyTypeId }, // Same money type
              },
            ],
          },
        ],
      }),

      // Withdraw - Filter by account money type
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
            where: { No: accountId }, // Specific account
            include: [
              {
                model: MoneyType,
                where: { id: accountMoneyTypeId }, // Same money type
              },
            ],
          },
        ],
      }),

      // Receive - Filter by money type
      Receive.findAll({
        where: {
          organizationId: orgId,
          deleted: false,
          moneyTypeId: accountMoneyTypeId, // ONLY same money type
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
                    where: { No: accountId }, // Account-based filter
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
                    where: { No: accountId }, // Account-based filter
                    required: false,
                  },
                ],
              },
            ],
          },
        ],
      }),

      // Transfer - Filter by money type
      Transfer.findAll({
        where: {
          organizationId: orgId,
          deleted: false,
          moneyTypeId: accountMoneyTypeId, // ONLY same money type
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
                    where: { No: accountId }, // Account-based filter
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
    // 2️⃣ Filter transactions that involve this account OR customer WITH SAME MONEY TYPE
    // ---------------------------
    const filteredReceives = receives.filter((r) => {
      const fromAccounts =
        r.FromBranch?.Customer?.Accounts?.map((a) => a.No) || [];
      const toAccounts = r.ToPass?.Customer?.Accounts?.map((a) => a.No) || [];

      // Already filtered by moneyTypeId in the query, just check account/customer involvement
      const isCustomerInvolved =
        r.customerId === customerId ||
        r.FromBranch?.customerId === customerId ||
        r.ToPass?.customerId === customerId;

      return (
        fromAccounts.includes(accountId) ||
        toAccounts.includes(accountId) ||
        isCustomerInvolved
      );
    });

    const filteredTransfers = transfers.filter((t) => {
      const toAccounts = t.ToBranch?.Customer?.Accounts?.map((a) => a.No) || [];

      // Already filtered by moneyTypeId in the query, just check account/customer involvement
      const isCustomerInvolved =
        t.customerId === customerId || t.ToBranch?.customerId === customerId;

      return toAccounts.includes(accountId) || isCustomerInvolved;
    });

    console.log('📊 Query Results (Filtered by Money Type):');
    console.log('Deposits:', deposits.length);
    console.log('Withdraws:', withdraws.length);
    console.log('Receives (filtered):', filteredReceives.length);
    console.log('Transfers (filtered):', filteredTransfers.length);
    console.log('💰 Money Type Filter:', accountMoneyTypeName);

    // ---------------------------
    // 3️⃣ Normalize all data and calculate amounts
    // ---------------------------
    const normalize = (records, type) =>
      records.map((r) => {
        const baseData = r.toJSON();

        // Calculate transaction amount based on type
        let amount = 0;
        let isCredit = false;

        switch (type) {
          case 'deposit':
            amount = parseFloat(baseData.deposit) || 0;
            isCredit = true;
            break;
          case 'withdraw':
            amount = parseFloat(baseData.withdraw) || 0;
            isCredit = false;
            break;
          case 'receive':
            amount = parseFloat(baseData.receiveAmount) || 0;
            const receiveFromAccounts =
              baseData.FromBranch?.Customer?.Accounts?.map((a) => a.No) || [];
            const receiveToAccounts =
              baseData.ToPass?.Customer?.Accounts?.map((a) => a.No) || [];

            if (receiveToAccounts.includes(accountId)) {
              isCredit = true;
            } else if (receiveFromAccounts.includes(accountId)) {
              isCredit = false;
            } else if (baseData.customerId === customerId) {
              isCredit = true;
            } else if (baseData.FromBranch?.customerId === customerId) {
              isCredit = false;
            } else if (baseData.ToPass?.customerId === customerId) {
              isCredit = true;
            }
            break;
          case 'transfer':
            amount = parseFloat(baseData.transferAmount) || 0;
            const transferToAccounts =
              baseData.ToBranch?.Customer?.Accounts?.map((a) => a.No) || [];

            if (transferToAccounts.includes(accountId)) {
              isCredit = true;
            } else if (baseData.customerId === customerId) {
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
          transactionAmount: amount,
          isCredit: isCredit,
          amount: isCredit ? amount : -amount,
          accountRole: getAccountRole(baseData, accountId, customerId, type),
        };
      });

    // Helper function to determine account's role in transaction
    function getAccountRole(transaction, accountId, customerId, type) {
      switch (type) {
        case 'deposit':
          return 'primary_account';
        case 'withdraw':
          return 'primary_account';
        case 'receive':
          const receiveFromAccounts =
            transaction.FromBranch?.Customer?.Accounts?.map((a) => a.No) || [];
          const receiveToAccounts =
            transaction.ToPass?.Customer?.Accounts?.map((a) => a.No) || [];

          if (receiveToAccounts.includes(accountId)) return 'receiving_account';
          if (receiveFromAccounts.includes(accountId)) return 'sending_account';
          if (transaction.customerId === customerId) return 'customer_receiver';
          if (transaction.FromBranch?.customerId === customerId)
            return 'customer_sender_branch';
          if (transaction.ToPass?.customerId === customerId)
            return 'customer_receiver_branch';
          return 'unknown';
        case 'transfer':
          const transferToAccounts =
            transaction.ToBranch?.Customer?.Accounts?.map((a) => a.No) || [];

          if (transferToAccounts.includes(accountId))
            return 'receiving_account';
          if (transaction.customerId === customerId) return 'customer_sender';
          if (transaction.ToBranch?.customerId === customerId)
            return 'customer_receiver_branch';
          return 'unknown';
        default:
          return 'unknown';
      }
    }

    const allTransactions = [
      ...normalize(deposits, 'deposit'),
      ...normalize(withdraws, 'withdraw'),
      ...normalize(filteredReceives, 'receive'),
      ...normalize(filteredTransfers, 'transfer'),
    ];

    // ---------------------------
    // 4️⃣ Calculate running balance for THIS SPECIFIC ACCOUNT
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
        // Ensure we show the correct money type
        moneyType: accountMoneyTypeName,
      };
    });

    transactionsWithBalance.sort((a, b) => new Date(b.date) - new Date(a.date));

    console.log(
      '📈 Total transactions with running balance:',
      transactionsWithBalance.length
    );

    // ---------------------------
    // 5️⃣ Paginate
    // ---------------------------
    const paged = transactionsWithBalance.slice(offset, offset + parsedLimit);

    // ---------------------------
    // 6️⃣ Send response
    // ---------------------------
    res.status(200).json({
      status: 'success',
      total: transactionsWithBalance.length,
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

// New API endpoint - Get account summary by account ID
exports.getAccountSummary = async (req, res) => {
  const t = await Account.sequelize.transaction();
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

    if (!account) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Account not found',
      });
    }

    // 2. Find main currency (USA)
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

    // 3. Get all accounts for this customer to show summary
    const customerAccounts = await Account.findAll({
      where: {
        customerId: account.customerId,
        deleted: false,
      },
      include: [
        {
          model: MoneyType,
          attributes: ['id', 'typeName', 'number'],
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

    // 4. Get unique currency IDs from accounts (excluding main currency)
    const currencyIds = [
      ...new Set(
        customerAccounts
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
        [
          Account.sequelize.fn('MAX', Account.sequelize.col('rDate')),
          'latestDate',
        ],
      ],
      group: ['fromCurrency', 'value1'],
      order: [[Account.sequelize.literal('latestDate'), 'DESC']],
      transaction: t,
    });

    // Create a map of currencyId to latest rate
    const rateMap = latestRates.reduce((map, rate) => {
      if (!map.has(rate.fromCurrency)) {
        map.set(rate.fromCurrency, parseFloat(rate.value1));
      }
      return map;
    }, new Map());

    // 6. Process accounts with creation dates (COPY FROM getCustomerAccounts)
    let totalInMainCurrency = 0;
    const accountDetails = [];

    for (const customerAccount of customerAccounts) {
      const originalBalance = parseFloat(customerAccount.credit);
      let convertedValue = 0;
      let rateUsed = 1;

      if (customerAccount.moneyTypeId === mainCurrency.id) {
        // Already in main currency (USA)
        convertedValue = originalBalance;
      } else {
        // Get the latest rate for this currency
        rateUsed = rateMap.get(customerAccount.moneyTypeId) || 1;
        convertedValue = originalBalance / rateUsed;
      }

      totalInMainCurrency += convertedValue;

      accountDetails.push({
        currencyId: customerAccount.moneyTypeId,
        currencyName: customerAccount.MoneyType.typeName,
        currencyNumber: customerAccount.MoneyType.number,
        originalBalance: originalBalance,
        convertedBalance: parseFloat(convertedValue.toFixed(2)),
        conversionRate: rateUsed,
        isMainCurrency: customerAccount.moneyTypeId === mainCurrency.id,
        accountCreationDate: customerAccount.dateOfCreation,
        rateDate:
          latestRates.find(
            (r) => r.fromCurrency === customerAccount.moneyTypeId
          )?.rDate || null,
      });
    }

    await t.commit();

    // 7. Format response with all required information
    res.status(200).json({
      success: true,
      account: {
        id: account.No,
        number: account.No,
        currency: account.MoneyType.typeName,
        currentBalance: account.credit,
      },
      customer: {
        id: account.customerId,
        name: account.Customer?.Stakeholder?.Person
          ? `${account.Customer.Stakeholder.Person.firstName} ${account.Customer.Stakeholder.Person.lastName}`
          : 'Unknown Customer',
      },
      accounts: accountDetails, // Now this will have data!
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
      message: 'Failed to get account summary: ' + err.message,
    });
  }
};
