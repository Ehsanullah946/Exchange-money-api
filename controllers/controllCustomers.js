const {
  Person,
  Stakeholder,
  Customer,
  Rate,
  MoneyType,
  Account,
  sequelize,
} = require('../models');

exports.customerAccount = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const customerId = req.customer.id;
    const orgId = req.orgId;

    const mainCurrency = await MoneyType.findOne({
      where: {
        typeName: 'USA',
        // organizationId: orgId,
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
                  // where: { organizationId: orgId },
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
        // organizationId: orgId,
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



