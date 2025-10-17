const {
  Person,
  Stakeholder,
  Customer,
  MoneyType,
  Account,
  DepositWithdraw,
  Transfer,
  Branch,
  sequelize,
  Receive,
  Exchange,
} = require('../models');

const { Op } = require('sequelize');
// exports.getDayBook = async (req, res) => {
//   try {
//     const orgId = req.orgId;
//     const { date, startDate, endDate, page = 1, limit = 20 } = req.query;

//     console.log('📖 Generating Day Book for org:', orgId);

//     // Validate date parameters
//     let start, end;

//     if (date) {
//       // Single date mode
//       start = new Date(date);
//       end = new Date(date);
//       end.setHours(23, 59, 59, 999); // End of the day
//     } else if (startDate && endDate) {
//       // Date range mode
//       start = new Date(startDate);
//       end = new Date(endDate);
//       end.setHours(23, 59, 59, 999);
//     } else {
//       // Default to today
//       start = new Date();
//       end = new Date();
//       end.setHours(23, 59, 59, 999);
//     }

//     if (start > end) {
//       return res.status(400).json({
//         success: false,
//         message: 'Start date cannot be after end date',
//       });
//     }

//     const parsedLimit = parseInt(limit) || 50;
//     const parsedPage = parseInt(page) || 1;
//     const offset = (parsedPage - 1) * parsedLimit;

//     // Fetch all transaction types for the date range
//     const [depositWithdraws, receives, transfers, exchanges] =
//       await Promise.all([
//         // Deposits

//         DepositWithdraw.findAll({
//           where: {
//             organizationId: orgId,
//             deleted: false,

//             DWDate: { [Op.between]: [start, end] },
//             [Op.or]: [
//               { deposit: { [Op.gt]: 0 } },
//               { withdraw: { [Op.gt]: 0 } },
//             ],
//           },
//           include: [
//             {
//               model: Account,
//               required: true,
//               include: [
//                 { model: MoneyType },
//                 {
//                   model: Customer,
//                   include: [
//                     {
//                       model: Stakeholder,
//                       include: [
//                         {
//                           model: Person,
//                           attributes: ['firstName', 'lastName'],
//                         },
//                       ],
//                     },
//                   ],
//                 },
//               ],
//             },
//           ],
//           limit: parsedLimit,
//           offset: offset,
//           order: [['DWDate', 'DESC']],
//         }),

//         // Receives
//         Receive.findAll({
//           where: {
//             organizationId: orgId,
//             deleted: false,
//             rDate: { [Op.between]: [start, end] },
//           },
//           include: [
//             {
//               model: Customer,
//               include: [
//                 {
//                   model: Stakeholder,
//                   include: [
//                     {
//                       model: Person,
//                       attributes: ['firstName', 'lastName'],
//                     },
//                   ],
//                 },
//               ],
//             },
//             {
//               model: MoneyType,
//               as: 'MainMoneyType',
//               attributes: ['id', 'typeName'],
//             },
//             {
//               model: Branch,
//               as: 'FromBranch',
//               include: [
//                 {
//                   model: Customer,
//                   include: [
//                     {
//                       model: Stakeholder,
//                       include: [
//                         {
//                           model: Person,
//                           attributes: ['firstName', 'lastName'],
//                         },
//                       ],
//                     },
//                   ],
//                 },
//               ],
//             },
//             {
//               model: Branch,
//               as: 'ToPass',
//               include: [
//                 {
//                   model: Customer,
//                   include: [
//                     {
//                       model: Stakeholder,
//                       include: [
//                         {
//                           model: Person,
//                           attributes: ['firstName', 'lastName'],
//                         },
//                       ],
//                     },
//                   ],
//                 },
//               ],
//             },
//           ],
//           limit: parsedLimit,
//           offset: offset,
//           order: [['rDate', 'DESC']],
//         }),

//         // Transfers
//         Transfer.findAll({
//           where: {
//             organizationId: orgId,
//             deleted: false,
//             tDate: { [Op.between]: [start, end] },
//           },
//           include: [
//             {
//               model: MoneyType,
//               as: 'MainMoneyType',
//               attributes: ['id', 'typeName'],
//             },
//             {
//               model: Customer,
//               include: [
//                 {
//                   model: Stakeholder,
//                   include: [
//                     {
//                       model: Person,
//                       attributes: ['firstName', 'lastName'],
//                     },
//                   ],
//                 },
//               ],
//             },
//             {
//               model: Branch,
//               as: 'ToBranch',
//               include: [
//                 {
//                   model: Customer,
//                   include: [
//                     {
//                       model: Stakeholder,
//                       include: [
//                         {
//                           model: Person,
//                           attributes: ['firstName', 'lastName'],
//                         },
//                       ],
//                     },
//                   ],
//                 },
//               ],
//             },
//           ],
//           limit: parsedLimit,
//           offset: offset,
//           order: [['tDate', 'DESC']],
//         }),

//         // Exchanges
//         Exchange.findAll({
//           where: {
//             organizationId: orgId,
//             deleted: false,
//             eDate: { [Op.between]: [start, end] },
//           },
//           include: [
//             {
//               model: MoneyType,
//               as: 'SaleType',
//               attributes: ['id', 'typeName'],
//             },
//             {
//               model: MoneyType,
//               as: 'PurchaseType',
//               attributes: ['id', 'typeName'],
//             },
//             {
//               model: Customer,
//               include: [
//                 {
//                   model: Stakeholder,
//                   include: [
//                     {
//                       model: Person,
//                       attributes: ['firstName', 'lastName'],
//                     },
//                   ],
//                 },
//               ],
//             },
//           ],
//           limit: parsedLimit,
//           offset: offset,
//           order: [['eDate', 'DESC']],
//         }),
//       ]);

//     // Get total counts for pagination
//     const [depositWithdrawCount, receiveCount, transferCount, exchangeCount] =
//       await Promise.all([
//         DepositWithdraw.count({
//           where: {
//             organizationId: orgId,
//             deleted: false,
//             DWDate: { [Op.between]: [start, end] },
//           },
//         }),
//         DepositWithdraw.count({
//           where: {
//             organizationId: orgId,
//             deleted: false,
//             DWDate: { [Op.between]: [start, end] },
//           },
//         }),
//         Receive.count({
//           where: {
//             organizationId: orgId,
//             deleted: false,
//             rDate: { [Op.between]: [start, end] },
//           },
//         }),
//         Transfer.count({
//           where: {
//             organizationId: orgId,
//             deleted: false,
//             tDate: { [Op.between]: [start, end] },
//           },
//         }),
//         Exchange.count({
//           where: {
//             organizationId: orgId,
//             deleted: false,
//             eDate: { [Op.between]: [start, end] },
//           },
//         }),
//       ]);

//     const totalTransactions =
//       depositWithdrawCount + receiveCount + transferCount + exchangeCount;

//     // Normalize and combine all transactions
//     const normalizeTransaction = (transaction, type) => {
//       const baseData = transaction.toJSON();

//       let customerName = 'Unknown Customer';
//       let customerId = null;
//       let amount = 0;
//       let isCredit = false;
//       let accountNo = null;
//       let currency = 'Unknown';

//       //     // Enhanced normalize function to handle deposit/withdraw correctly
//       //   const normalizeTransaction = (transaction, type) => {
//       //     const baseData = transaction.toJSON();

//       const transactions = [];

//       // Extract customer information based on transaction type
//       switch (type) {
//         case 'deposit_withdraw':
//           // Handle deposit
//           if (parseFloat(baseData.deposit) > 0) {
//             transactions.push({
//               id: baseData.No,
//               transactionId: `D-${baseData.No}`,
//               type: 'deposit',
//               date: baseData.DWDate,
//               customerId: baseData.Account?.Customer?.id,
//               customerName: baseData.Account?.Customer?.Stakeholder?.Person
//                 ? `${baseData.Account.Customer.Stakeholder.Person.firstName} ${baseData.Account.Customer.Stakeholder.Person.lastName}`
//                 : 'Unknown Customer',
//               accountNo: baseData.Account?.No,
//               amount: parseFloat(baseData.deposit) || 0,
//               isCredit: true,
//               currency: baseData.Account?.MoneyType?.typeName,
//               description: baseData.description,
//               debit: 0,
//               credit: parseFloat(baseData.deposit) || 0,
//               entityType: 'customer',
//             });
//           }

//           // Handle withdraw
//           if (parseFloat(baseData.withdraw) > 0) {
//             transactions.push({
//               id: baseData.No,
//               transactionId: `W-${baseData.No}`,
//               type: 'withdraw',
//               date: baseData.DWDate,
//               customerId: baseData.Account?.Customer?.id,
//               customerName: baseData.Account?.Customer?.Stakeholder?.Person
//                 ? `${baseData.Account.Customer.Stakeholder.Person.firstName} ${baseData.Account.Customer.Stakeholder.Person.lastName}`
//                 : 'Unknown Customer',
//               accountNo: baseData.Account?.No,
//               amount: parseFloat(baseData.withdraw) || 0,
//               isCredit: false,
//               currency: baseData.Account?.MoneyType?.typeName,
//               description: baseData.description,
//               debit: parseFloat(baseData.withdraw) || 0,
//               credit: 0,
//               entityType: 'customer',
//             });
//           }
//           break;

//         case 'receive':
//           // Determine if customer is sender or receiver
//           if (baseData.customerId) {
//             customerName = baseData.Customer?.Stakeholder?.Person
//               ? `${baseData.Customer.Stakeholder.Person.firstName} ${baseData.Customer.Stakeholder.Person.lastName}`
//               : 'Unknown customer';
//             customerId = baseData.customerId;
//             isCredit = true; // Receiver gets credit
//           } else if (baseData.FromBranch?.Customer) {
//             customerName = baseData.FromBranch.Customer.Stakeholder?.Person
//               ? `${baseData.FromBranch.Customer.Stakeholder.Person.firstName} ${baseData.FromBranch.Customer.Stakeholder.Person.lastName}`
//               : 'Unknown Customer';
//             customerId = baseData.FromBranch.Customer.id;
//             isCredit = false; // Sender gets debit
//           }
//           amount = parseFloat(baseData.receiveAmount) || 0;
//           currency = baseData.MainMoneyType?.typeName;
//           break;

//         case 'transfer':
//           if (baseData.customerId) {
//             customerName = baseData.Customer?.Stakeholder?.Person
//               ? `${baseData.Customer.Stakeholder.Person.firstName} ${baseData.Customer.Stakeholder.Person.lastName}`
//               : 'Unknown Customer';
//             customerId = baseData.customerId;
//             isCredit = false; // Sender gets debit
//           } else if (baseData.ToBranch?.Customer) {
//             customerName = baseData.ToBranch.Customer.Stakeholder?.Person
//               ? `${baseData.ToBranch.Customer.Stakeholder.Person.firstName} ${baseData.ToBranch.Customer.Stakeholder.Person.lastName}`
//               : 'Unknown Customer';
//             customerId = baseData.ToBranch.Customer.id;
//             isCredit = true; // Receiver gets credit
//           }
//           amount = parseFloat(baseData.transferAmount) || 0;
//           currency = baseData.MainMoneyType?.typeName;
//           break;

//         case 'exchange':
//           customerName = baseData.Customer?.Stakeholder?.Person
//             ? `${baseData.Customer.Stakeholder.Person.firstName} ${baseData.Customer.Stakeholder.Person.lastName}`
//             : 'Unknown Customer';
//           customerId = baseData.customerId;
//           amount =
//             parseFloat(baseData.saleAmount) ||
//             parseFloat(baseData.purchaseAmount) ||
//             0;
//           isCredit = baseData.purchaseAmount > 0; // Purchase is credit, sale is debit
//           currency = isCredit
//             ? baseData.PurchaseMoneyType?.typeName
//             : baseData.SaleMoneyType?.typeName;
//           break;
//       }

//       return {
//         id: baseData.id || baseData.No,
//         transactionId:
//           baseData.No ||
//           baseData.transferNo ||
//           baseData.receiveNo ||
//           baseData.id,
//         type,
//         date:
//           baseData.DWDate || baseData.rDate || baseData.tDate || baseData.eDate,
//         customerId,
//         customerName,
//         accountNo,
//         amount,
//         isCredit,
//         currency,
//         description: baseData.description,
//         debit: !isCredit ? amount : 0,
//         credit: isCredit ? amount : 0,
//         // Additional details based on type
//         ...(type === 'transfer' && {
//           senderName: baseData.senderName,
//           receiverName: baseData.receiverName,
//         }),
//         ...(type === 'receive' && {
//           senderName: baseData.senderName,
//           receiverName: baseData.receiverName,
//         }),
//         ...(type === 'exchange' && {
//           saleAmount: baseData.saleAmount,
//           purchaseAmount: baseData.purchaseAmount,
//           rate: baseData.rate,
//           saleCurrency: baseData.SaleMoneyType?.typeName,
//           purchaseCurrency: baseData.PurchaseMoneyType?.typeName,
//         }),
//       };
//     };

//     // Combine all transactions
//     const allTransactions = [
//       ...depositWithdraws.flatMap((t) =>
//         normalizeTransaction(t, 'deposit_withdraw')
//       ),
//       ...receives.flatMap((t) => normalizeTransaction(t, 'receive')),
//       ...transfers.flatMap((t) => normalizeTransaction(t, 'transfer')),
//       ...exchanges.flatMap((t) => normalizeTransaction(t, 'exchange')),
//     ].filter(
//       (transaction) =>
//         transaction &&
//         transaction.amount > 0 && // Only include transactions with amount > 0
//         (transaction.debit > 0 || transaction.credit > 0) // Ensure debit or credit is positive
//     );

//     // Sort by date (newest first)
//     allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

//     // Calculate totals by currency
//     const totalsByCurrency = {};
//     allTransactions.forEach((transaction) => {
//       const currency = transaction.currency;
//       if (!totalsByCurrency[currency]) {
//         totalsByCurrency[currency] = {
//           totalDebit: 0,
//           totalCredit: 0,
//           balance: 0,
//         };
//       }

//       totalsByCurrency[currency].totalDebit += transaction.debit;
//       totalsByCurrency[currency].totalCredit += transaction.credit;
//       totalsByCurrency[currency].balance =
//         totalsByCurrency[currency].totalCredit -
//         totalsByCurrency[currency].totalDebit;
//     });

//     // Calculate overall summary

//     const summary = {
//       totalTransactions: allTransactions.length,
//       totalDebit: allTransactions.reduce((sum, t) => sum + t.debit, 0),
//       totalCredit: allTransactions.reduce((sum, t) => sum + t.credit, 0),
//       netBalance: allTransactions.reduce(
//         (sum, t) => sum + (t.credit - t.debit),
//         0
//         ),

//       transactionTypes: {
//         deposit: allTransactions.filter((t) => t.type === 'deposit').length,
//         withdraw: allTransactions.filter((t) => t.type === 'withdraw').length,
//         receive: allTransactions.filter((t) => t.type === 'receive').length,
//         transfer: allTransactions.filter((t) => t.type === 'transfer').length,
//         exchange: allTransactions.filter((t) => t.type.includes('exchange'))
//           .length,
//         charge: allTransactions.filter((t) => t.type === 'charge').length,
//         branch_charge: allTransactions.filter((t) => t.type === 'branch_charge')
//           .length,
//       },
//     };

//     console.log(
//       `📊 Day Book generated: ${
//         allTransactions.length
//       } transactions for period ${start.toDateString()} to ${end.toDateString()}`
//     );

//     res.status(200).json({
//       success: true,
//       data: {
//         period: {
//           startDate: start,
//           endDate: end,
//           isSingleDay: !!date,
//         },
//         transactions: allTransactions,
//         summary,
//         totalsByCurrency,
//         pagination: {
//           page: parsedPage,
//           limit: parsedLimit,
//           total: totalTransactions,
//           totalPages: Math.ceil(totalTransactions / parsedLimit),
//         },
//       },
//     });
//   } catch (err) {
//     console.error('❌ Day Book generation error:', err);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to generate Day Book: ' + err.message,
//     });
//   }
// };

exports.getDayBook = async (req, res) => {
  try {
    const orgId = req.orgId;
    const { date, startDate, endDate, page = 1, limit = 50 } = req.query;

    console.log('📖 Generating Day Book for org:', orgId);

    // Validate date parameters
    let start, end;

    if (date) {
      start = new Date(date);
      end = new Date(date);
      end.setHours(23, 59, 59, 999);
    } else if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
    } else {
      start = new Date();
      end = new Date();
      end.setHours(23, 59, 59, 999);
    }

    if (start > end) {
      return res.status(400).json({
        success: false,
        message: 'Start date cannot be after end date',
      });
    }

    const parsedLimit = parseInt(limit) || 50;
    const parsedPage = parseInt(page) || 1;
    const offset = (parsedPage - 1) * parsedLimit;

    // Fetch all transaction types for the date range
    // FIXED: Query DepositWithdraw once and handle both deposits and withdraws
    const [depositWithdraws, receives, transfers, exchanges] =
      await Promise.all([
        // DepositWithdraw - Get all records and separate deposits/withdraws in code
        DepositWithdraw.findAll({
          where: {
            organizationId: orgId,
            deleted: false,

            DWDate: { [Op.between]: [start, end] },
            [Op.or]: [
              { deposit: { [Op.gt]: 0 } },
              { withdraw: { [Op.gt]: 0 } },
            ],
          },
          include: [
            {
              model: Account,
              required: true,
              include: [
                { model: MoneyType },
                {
                  model: Customer,
                  include: [
                    {
                      model: Stakeholder,
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
            },
          ],
          limit: parsedLimit,
          offset: offset,
          order: [['DWDate', 'DESC']],
        }),

        // Receives - Include ALL receives without filtering by customer
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
                          attributes: ['firstName', 'lastName'],
                        },
                      ],
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
                      model: Stakeholder,
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
            },
            {
              model: Customer,
              include: [
                {
                  model: Stakeholder,
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
          limit: parsedLimit,
          offset: offset,
          order: [['rDate', 'DESC']],
        }),

        // Transfers - Include ALL transfers without filtering by customer
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
                      model: Stakeholder,
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
            },
            {
              model: Customer,
              include: [
                {
                  model: Stakeholder,
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
          limit: parsedLimit,
          offset: offset,
          order: [['tDate', 'DESC']],
        }),

        // Exchanges
        Exchange.findAll({
          where: {
            organizationId: orgId,
            deleted: false,

            eDate: { [Op.between]: [start, end] },
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
            {
              model: Customer,
              include: [
                {
                  model: Stakeholder,
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
          limit: parsedLimit,
          offset: offset,
          order: [['eDate', 'DESC']],
        }),
      ]);

    // Get total counts for pagination
    const [depositWithdrawCount, receiveCount, transferCount, exchangeCount] =
      await Promise.all([
        DepositWithdraw.count({
          where: {
            organizationId: orgId,
            deleted: false,

            DWDate: { [Op.between]: [start, end] },
            [Op.or]: [
              { deposit: { [Op.gt]: 0 } },
              { withdraw: { [Op.gt]: 0 } },
            ],
          },
        }),
        Receive.count({
          where: {
            organizationId: orgId,
            deleted: false,

            rDate: { [Op.between]: [start, end] },
          },
        }),
        Transfer.count({
          where: {
            organizationId: orgId,
            deleted: false,

            tDate: { [Op.between]: [start, end] },
          },
        }),
        Exchange.count({
          where: {
            organizationId: orgId,
            deleted: false,

            eDate: { [Op.between]: [start, end] },
          },
        }),
      ]);

    const totalTransactions =
      depositWithdrawCount + receiveCount + transferCount + exchangeCount;

    // Enhanced normalize function to handle deposit/withdraw correctly
    const normalizeTransaction = (transaction, type) => {
      const baseData = transaction.toJSON();

      const transactions = [];

      switch (type) {
        case 'deposit_withdraw':
          // Handle deposit
          if (parseFloat(baseData.deposit) > 0) {
            transactions.push({
              id: baseData.No,
              transactionId: `D-${baseData.No}`,
              type: 'deposit',
              date: baseData.DWDate,
              customerId: baseData.Account?.Customer?.id,
              customerName: baseData.Account?.Customer?.Stakeholder?.Person
                ? `${baseData.Account.Customer.Stakeholder.Person.firstName} ${baseData.Account.Customer.Stakeholder.Person.lastName}`
                : 'Unknown Customer',
              accountNo: baseData.Account?.No,
              amount: parseFloat(baseData.deposit) || 0,
              isCredit: true,
              currency: baseData.Account?.MoneyType?.typeName,
              description: baseData.description,
              debit: 0,
              credit: parseFloat(baseData.deposit) || 0,
              entityType: 'customer',
            });
          }

          // Handle withdraw
          if (parseFloat(baseData.withdraw) > 0) {
            transactions.push({
              id: baseData.No,
              transactionId: `W-${baseData.No}`,
              type: 'withdraw',
              date: baseData.DWDate,
              customerId: baseData.Account?.Customer?.id,
              customerName: baseData.Account?.Customer?.Stakeholder?.Person
                ? `${baseData.Account.Customer.Stakeholder.Person.firstName} ${baseData.Account.Customer.Stakeholder.Person.lastName}`
                : 'Unknown Customer',
              accountNo: baseData.Account?.No,
              amount: parseFloat(baseData.withdraw) || 0,
              isCredit: false,
              currency: baseData.Account?.MoneyType?.typeName,
              description: baseData.description,
              debit: parseFloat(baseData.withdraw) || 0,
              credit: 0,
              entityType: 'customer',
            });
          }
          break;

        case 'receive':
          const receiveAmount = parseFloat(baseData.receiveAmount) || 0;
          const chargesAmount = parseFloat(baseData.chargesAmount) || 0;
          const branchCharges = parseFloat(baseData.branchCharges) || 0;

          // 1. FromBranch (Sender Branch) - DEBIT
          if (baseData.FromBranch && receiveAmount > 0) {
            transactions.push({
              id: baseData.id,
              transactionId: `R-${baseData.receiveNo}`,
              type: 'receive',
              date: baseData.rDate,
              customerId: baseData.FromBranch.Customer?.id,
              customerName: baseData.FromBranch.Customer?.Stakeholder?.Person
                ? `${baseData.FromBranch.Customer.Stakeholder.Person.firstName} ${baseData.FromBranch.Customer.Stakeholder.Person.lastName}`
                : 'Branch Customer',
              accountNo: null,
              amount: receiveAmount,
              isCredit: false,
              currency: baseData.MainMoneyType?.typeName,
              description: `Send to ${baseData.receiverName || 'Receiver'}`,
              debit: receiveAmount,
              credit: 0,
              entityType: 'branch',
              branchId: baseData.fromWhere,
              branchType: 'from',
              senderName: baseData.senderName,
              receiverName: baseData.receiverName,
            });
          }

          // 2. Customer (Receiver) - CREDIT
          if (baseData.customerId && receiveAmount > 0) {
            transactions.push({
              id: baseData.id,
              transactionId: `R-${baseData.receiveNo}`,
              type: 'receive',
              date: baseData.rDate,
              customerId: baseData.customerId,
              customerName: baseData.Customer?.Stakeholder?.Person
                ? `${baseData.Customer.Stakeholder.Person.firstName} ${baseData.Customer.Stakeholder.Person.lastName}`
                : 'Unknown Customer',
              accountNo: null,
              amount: receiveAmount,
              isCredit: true,
              currency: baseData.MainMoneyType?.typeName,
              description: `Receive from ${baseData.senderName || 'Sender'}`,
              debit: 0,
              credit: receiveAmount,
              entityType: 'customer',
              senderName: baseData.senderName,
              receiverName: baseData.receiverName,
            });
          }

          // 3. ToPass (Receiver Branch) - CREDIT
          if (baseData.ToPass && receiveAmount > 0) {
            transactions.push({
              id: baseData.id,
              transactionId: `R-${baseData.receiveNo}`,
              type: 'receive',
              date: baseData.rDate,
              customerId: baseData.ToPass.Customer?.id,
              customerName: baseData.ToPass.Customer?.Stakeholder?.Person
                ? `${baseData.ToPass.Customer.Stakeholder.Person.firstName} ${baseData.ToPass.Customer.Stakeholder.Person.lastName}`
                : 'Branch Customer',
              accountNo: null,
              amount: receiveAmount,
              isCredit: true,
              currency: baseData.MainMoneyType?.typeName,
              description: `Receive from ${baseData.senderName || 'Sender'}`,
              debit: 0,
              credit: receiveAmount,
              entityType: 'branch',
              branchId: baseData.passTo,
              branchType: 'to',
              senderName: baseData.senderName,
              receiverName: baseData.receiverName,
            });
          }

          // 4. Charges (if any) - DEBIT to customer
          //   if (chargesAmount > 0 && baseData.customerId) {
          //     transactions.push({
          //       id: baseData.id,
          //       transactionId: `R-${baseData.receiveNo}-CHG`,
          //       type: 'charge',
          //       date: baseData.rDate,
          //       customerId: baseData.customerId,
          //       customerName: baseData.Customer?.Stakeholder?.Person
          //         ? `${baseData.Customer.Stakeholder.Person.firstName} ${baseData.Customer.Stakeholder.Person.lastName}`
          //         : 'Unknown Customer',
          //       accountNo: null,
          //       amount: chargesAmount,
          //       isCredit: false,
          //       currency: baseData.MainMoneyType?.typeName,
          //       description: 'Service charges',
          //       debit: chargesAmount,
          //       credit: 0,
          //       entityType: 'charge',
          //       senderName: baseData.senderName,
          //       receiverName: baseData.receiverName,
          //     });
          //   }

          //   // 5. Branch Charges (if any) - CREDIT to from branch
          //   if (branchCharges > 0 && baseData.FromBranch) {
          //     transactions.push({
          //       id: baseData.id,
          //       transactionId: `R-${baseData.receiveNo}-BCHG`,
          //       type: 'branch_charge',
          //       date: baseData.rDate,
          //       customerId: baseData.FromBranch.Customer?.id,
          //       customerName: baseData.FromBranch.Customer?.Stakeholder?.Person
          //         ? `${baseData.FromBranch.Customer.Stakeholder.Person.firstName} ${baseData.FromBranch.Customer.Stakeholder.Person.lastName}`
          //         : 'Branch Customer',
          //       accountNo: null,
          //       amount: branchCharges,
          //       isCredit: true,
          //       currency: baseData.MainMoneyType?.typeName,
          //       description: 'Branch service charges',
          //       debit: 0,
          //       credit: branchCharges,
          //       entityType: 'branch_charge',
          //       branchId: baseData.fromWhere,
          //       branchType: 'from',
          //     });
          //   }
          break;

        case 'transfer':
          const transferAmount = parseFloat(baseData.transferAmount) || 0;
          const transferCharges = parseFloat(baseData.chargesAmount) || 0;

          // 1. Customer (Sender) - DEBIT
          if (baseData.customerId && transferAmount > 0) {
            transactions.push({
              id: baseData.id,
              transactionId: `T-${baseData.transferNo}`,
              type: 'transfer',
              date: baseData.tDate,
              customerId: baseData.customerId,
              customerName: baseData.Customer?.Stakeholder?.Person
                ? `${baseData.Customer.Stakeholder.Person.firstName} ${baseData.Customer.Stakeholder.Person.lastName}`
                : 'Unknown Customer',
              accountNo: null,
              amount: transferAmount,
              isCredit: false,
              currency: baseData.MainMoneyType?.typeName,
              description: `Transfer to ${baseData.receiverName || 'Receiver'}`,
              debit: transferAmount,
              credit: 0,
              entityType: 'customer',
              senderName: baseData.senderName,
              receiverName: baseData.receiverName,
            });
          }

          // 2. ToBranch (Receiver Branch) - CREDIT
          if (baseData.ToBranch && transferAmount > 0) {
            transactions.push({
              id: baseData.id,
              transactionId: `T-${baseData.transferNo}`,
              type: 'transfer',
              date: baseData.tDate,
              customerId: baseData.ToBranch.Customer?.id,
              customerName: baseData.ToBranch.Customer?.Stakeholder?.Person
                ? `${baseData.ToBranch.Customer.Stakeholder.Person.firstName} ${baseData.ToBranch.Customer.Stakeholder.Person.lastName}`
                : 'Branch Customer',
              accountNo: null,
              amount: transferAmount,
              isCredit: true,
              currency: baseData.MainMoneyType?.typeName,
              description: `Receive from ${baseData.senderName || 'Sender'}`,
              debit: 0,
              credit: transferAmount,
              entityType: 'branch',
              branchId: baseData.toWhere,
              branchType: 'to',
              senderName: baseData.senderName,
              receiverName: baseData.receiverName,
            });
          }

          // 3. Transfer Charges (if any)
          if (transferCharges > 0 && baseData.customerId) {
            transactions.push({
              id: baseData.id,
              transactionId: `T-${baseData.transferNo}-CHG`,
              type: 'charge',
              date: baseData.tDate,
              customerId: baseData.customerId,
              customerName: baseData.Customer?.Stakeholder?.Person
                ? `${baseData.Customer.Stakeholder.Person.firstName} ${baseData.Customer.Stakeholder.Person.lastName}`
                : 'Unknown Customer',
              accountNo: null,
              amount: transferCharges,
              isCredit: false,
              currency: baseData.MainMoneyType?.typeName,
              description: 'Transfer service charges',
              debit: transferCharges,
              credit: 0,
              entityType: 'charge',
            });
          }
          break;

        case 'exchange':
          const saleAmount = parseFloat(baseData.saleAmount) || 0;
          const purchaseAmount = parseFloat(baseData.purchaseAmount) || 0;

          // Sale transaction - DEBIT
          if (saleAmount > 0) {
            transactions.push({
              id: baseData.id,
              transactionId: `E-${baseData.id}`,
              type: 'exchange_sale',
              date: baseData.eDate,
              customerId: baseData.customerId,
              customerName: baseData.Customer?.Stakeholder?.Person
                ? `${baseData.Customer.Stakeholder.Person.firstName} ${baseData.Customer.Stakeholder.Person.lastName}`
                : 'Unknown Customer',
              accountNo: null,
              amount: saleAmount,
              isCredit: false,
              currency: baseData.SaleMoneyType?.typeName,
              description: `Currency sale - Rate: ${baseData.rate}`,
              debit: saleAmount,
              credit: 0,
              entityType: 'customer',
              saleCurrency: baseData.SaleMoneyType?.typeName,
              purchaseCurrency: baseData.PurchaseMoneyType?.typeName,
              rate: baseData.rate,
            });
          }

          // Purchase transaction - CREDIT
          if (purchaseAmount > 0) {
            transactions.push({
              id: baseData.id,
              transactionId: `E-${baseData.id}`,
              type: 'exchange_purchase',
              date: baseData.eDate,
              customerId: baseData.customerId,
              customerName: baseData.Customer?.Stakeholder?.Person
                ? `${baseData.Customer.Stakeholder.Person.firstName} ${baseData.Customer.Stakeholder.Person.lastName}`
                : 'Unknown Customer',
              accountNo: null,
              amount: purchaseAmount,
              isCredit: true,
              currency: baseData.PurchaseMoneyType?.typeName,
              description: `Currency purchase - Rate: ${baseData.rate}`,
              debit: 0,
              credit: purchaseAmount,
              entityType: 'customer',
              saleCurrency: baseData.SaleMoneyType?.typeName,
              purchaseCurrency: baseData.PurchaseMoneyType?.typeName,
              rate: baseData.rate,
            });
          }
          break;
      }

      return transactions;
    };

    // Combine all transactions (flattening the arrays)
    const allTransactions = [
      ...depositWithdraws.flatMap((t) =>
        normalizeTransaction(t, 'deposit_withdraw')
      ),
      ...receives.flatMap((t) => normalizeTransaction(t, 'receive')),
      ...transfers.flatMap((t) => normalizeTransaction(t, 'transfer')),
      ...exchanges.flatMap((t) => normalizeTransaction(t, 'exchange')),
    ].filter(
      (transaction) =>
        transaction &&
        transaction.amount > 0 && // Only include transactions with amount > 0
        (transaction.debit > 0 || transaction.credit > 0) // Ensure debit or credit is positive
    );

    // Sort by date (newest first)
    allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Calculate totals by currency
    const totalsByCurrency = {};
    allTransactions.forEach((transaction) => {
      const currency = transaction.currency;
      if (!totalsByCurrency[currency]) {
        totalsByCurrency[currency] = {
          totalDebit: 0,
          totalCredit: 0,
          balance: 0,
        };
      }

      totalsByCurrency[currency].totalDebit += transaction.debit;
      totalsByCurrency[currency].totalCredit += transaction.credit;
      totalsByCurrency[currency].balance =
        totalsByCurrency[currency].totalCredit -
        totalsByCurrency[currency].totalDebit;
    });

    // Calculate overall summary
    const summary = {
      totalTransactions: allTransactions.length,
      totalDebit: allTransactions.reduce((sum, t) => sum + t.debit, 0),
      totalCredit: allTransactions.reduce((sum, t) => sum + t.credit, 0),
      netBalance: allTransactions.reduce(
        (sum, t) => sum + (t.credit - t.debit),
        0
      ),
      transactionTypes: {
        deposit: allTransactions.filter((t) => t.type === 'deposit').length,
        withdraw: allTransactions.filter((t) => t.type === 'withdraw').length,
        receive: allTransactions.filter((t) => t.type === 'receive').length,
        transfer: allTransactions.filter((t) => t.type === 'transfer').length,
        exchange: allTransactions.filter((t) => t.type.includes('exchange'))
          .length,
        charge: allTransactions.filter((t) => t.type === 'charge').length,
        branch_charge: allTransactions.filter((t) => t.type === 'branch_charge')
          .length,
      },
    };

    console.log(
      `📊 Day Book generated: ${
        allTransactions.length
      } transaction entries for period ${start.toDateString()} to ${end.toDateString()}`
    );

    res.status(200).json({
      success: true,
      data: {
        period: {
          startDate: start,
          endDate: end,
          isSingleDay: !!date,
        },
        transactions: allTransactions,
        summary,
        totalsByCurrency,
        pagination: {
          page: parsedPage,
          limit: parsedLimit,
          total: totalTransactions,
          totalPages: Math.ceil(totalTransactions / parsedLimit),
        },
      },
    });
  } catch (err) {
    console.error('❌ Day Book generation error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to generate Day Book: ' + err.message,
    });
  }
};
