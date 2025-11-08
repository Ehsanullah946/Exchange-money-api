const {
  Person,
  Stakeholder,
  Customer,
  Rate,
  MoneyType,
  Account,
  sequelize,
} = require('../models');

// exports.customerAccount = async (req, res) => {
//   const t = await sequelize.transaction();
//   try {
//     const customerId = req.customer.id;
//     const orgId = req.orgId;

//     const mainCurrency = await MoneyType.findOne({
//       where: {
//         typeName: 'USA',
//         // organizationId: orgId,
//       },
//       transaction: t,
//     });

//     if (!mainCurrency) {
//       await t.rollback();
//       return res.status(400).json({
//         success: false,
//         message: 'Main currency (USA) not found',
//       });
//     }

//     // 2. Get all customer accounts with additional details
//     const accounts = await Account.findAll({
//       where: {
//         customerId,
//         deleted: false,
//       },
//       include: [
//         {
//           model: MoneyType,
//           attributes: ['id', 'typeName', 'number'],
//         },
//         {
//           model: Customer,
//           attributes: ['id'],
//           include: [
//             {
//               model: Stakeholder,
//               attributes: ['id'],
//               include: [
//                 {
//                   model: Person,
//                   // where: { organizationId: orgId },
//                   attributes: ['firstName', 'lastName'],
//                   required: true,
//                 },
//               ],
//             },
//           ],
//         },
//       ],
//       transaction: t,
//     });

//     if (!accounts || accounts.length === 0) {
//       await t.rollback();
//       return res.status(404).json({
//         success: false,
//         message: 'No accounts found for this customer',
//       });
//     }

//     // 3. Extract customer name from the first account
//     const customer = accounts[0].Customer;
//     const customerName = customer?.Stakeholder?.Person
//       ? `${customer.Stakeholder.Person.firstName} ${customer.Stakeholder.Person.lastName}`
//       : 'Unknown Customer';

//     // 4. Get unique currency IDs from accounts (excluding main currency)
//     const currencyIds = [
//       ...new Set(
//         accounts
//           .map((acc) => acc.moneyTypeId)
//           .filter((id) => id !== mainCurrency.id)
//       ),
//     ];

//     // 5. Get latest rates for each currency
//     // Get latest ACTIVE rates for each currency - FIXED SEQUELIZE USAGE
//     let latestRates = [];
//     if (currencyIds.length > 0) {
//       // First, get the latest effective date for each currency
//       const latestRateDates = await Rate.findAll({
//         where: {
//           fromCurrency: currencyIds,
//           toCurrency: mainCurrency.id,
//           organizationId: orgId,
//           isActive: true,
//         },
//         attributes: [
//           'fromCurrency',
//           [sequelize.fn('MAX', sequelize.col('effectiveDate')), 'latestDate'],
//         ],
//         group: ['fromCurrency'],
//         raw: true,
//         transaction: t,
//       });

//       // Then get the full rate data for those dates
//       if (latestRateDates.length > 0) {
//         const rateQueries = latestRateDates.map((dateInfo) =>
//           Rate.findOne({
//             where: {
//               fromCurrency: dateInfo.fromCurrency,
//               toCurrency: mainCurrency.id,
//               organizationId: orgId,
//               isActive: true,
//               effectiveDate: dateInfo.latestDate,
//             },
//             transaction: t,
//           })
//         );

//         latestRates = (await Promise.all(rateQueries)).filter(
//           (rate) => rate !== null
//         );
//       }
//     }

//     // Create a map of currencyId to latest rate
//     const rateMap = latestRates.reduce((map, rate) => {
//       if (rate && !map.has(rate.fromCurrency)) {
//         map.set(rate.fromCurrency, {
//           rate: parseFloat(rate.middleRate),
//           buyRate: parseFloat(rate.buyRate),
//           sellRate: parseFloat(rate.sellRate),
//           effectiveDate: rate.effectiveDate,
//         });
//       }
//       return map;
//     }, new Map());

//     // 6. Process accounts with creation dates
//     let totalInMainCurrency = 0;
//     const accountDetails = [];

//     for (const account of accounts) {
//       const originalBalance = parseFloat(account.credit);
//       let convertedValue = 0;
//       let rateUsed = 1;

//       if (account.moneyTypeId === mainCurrency.id) {
//         // Already in main currency (USA)
//         convertedValue = originalBalance;
//       } else {
//         // Get the latest rate for this currency
//         rateUsed = rateMap.get(account.moneyTypeId) || 1;
//         convertedValue = originalBalance / rateUsed;
//       }

//       totalInMainCurrency += convertedValue;

//       accountDetails.push({
//         currencyId: account.moneyTypeId,
//         currencyName: account.MoneyType.typeName,
//         currencyNumber: account.MoneyType.number,
//         originalBalance: originalBalance,
//         convertedBalance: parseFloat(convertedValue.toFixed(2)),
//         conversionRate: rateUsed,
//         isMainCurrency: account.moneyTypeId === mainCurrency.id,
//         accountCreationDate: account.dateOfCreation, // Added account creation date
//         rateDate:
//           latestRates.find((r) => r.fromCurrency === account.moneyTypeId)
//             ?.rDate || null,
//       });
//     }

//     await t.commit();

//     // 7. Format response with all required information
//     res.status(200).json({
//       success: true,
//       customer: {
//         id: customerId,
//         name: customerName, // Now includes the full customer name
//       },
//       accounts: accountDetails,
//       total: {
//         value: parseFloat(totalInMainCurrency.toFixed(2)),
//         currency: mainCurrency.typeName,
//         currencyId: mainCurrency.id,
//         currencyNumber: mainCurrency.number,
//       },
//       mainCurrency: {
//         id: mainCurrency.id,
//         name: mainCurrency.typeName,
//         number: mainCurrency.number,
//       },
//     });
//   } catch (err) {
//     await t.rollback();
//     res.status(500).json({
//       success: false,
//       message: 'Failed to get customer accounts: ' + err.message,
//     });
//   }
// };

// controllers/customerController.js - Updated to match management system
exports.getCustomerAccounts = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const customerId = req.customer.id;
    const orgId = req.orgId; // Now we have organizationId!

    console.log('🔍 Customer Accounts - Request data:', {
      customerId,
      orgId,
      customerFromReq: {
        id: req.customer.id,
        email: req.customer.email,
      },
    });

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
