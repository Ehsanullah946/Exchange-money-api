const {
  Person,
  Stakeholder,
  Customer,
  Rate,
  MoneyType,
  Account,
} = require('../models');
const bcrypt = require('bcryptjs');
exports.getCustomers = async (req, res) => {
  try {
    const data = await Customer.findAll({
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
    res.json(data);
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
      phoneNo,
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
      password,
    } = req.body;

    let hashedPassword = null;
    let canLogin = false;

    if (req.body.password) {
      hashedPassword = await bcrypt.hash(password, 12);
      canLogin = true;
    }

    // 1. Create Person (only place where organizationId is stored)
    const person = await Person.create(
      {
        firstName,
        lastName,
        fatherName,
        photo,
        nationalCode,
        phoneNo,
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
        password: hashedPassword,
        canLogin,
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

    await customer.destroy({ transaction: t });
    await stakeholder.destroy({ transaction: t });
    await person.destroy({ transaction: t });

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
      where: { id: req.params.id }, // make sure we only look for the requested ID
      include: [
        {
          model: Stakeholder,
          required: true, // must have a Stakeholder
          include: [
            {
              model: Person,
              required: true, // must have a Person
              where: { organizationId: req.orgId }, // scope to logged-in org
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

// Endpoint to get all accounts for a customer with total in main currency
exports.getCustomerAccounts = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { customerId } = req.params;
    const orgId = req.orgId;

    // 1. First find the main currency (Dollar) for this organization
    const mainCurrency = await MoneyType.findOne({
      where: {
        typeName: 'Dollar', // or whatever identifies your main currency
        organizationId: orgId,
      },
      transaction: t,
    });

    if (!mainCurrency) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Main currency (Dollar) not found for organization',
      });
    }

    // 2. Get all accounts for the customer with currency info
    const accounts = await Account.findAll({
      where: {
        customerId,
        organizationId: orgId,
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
                  attributes: ['firstName', 'lastName'],
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

    // 3. Get all conversion rates for this organization
    const rates = await Rate.findAll({
      where: {
        organizationId: orgId,
      },
      include: [
        {
          model: MoneyType,
          as: 'MoneyType',
          attributes: ['id', 'typeName'],
        },
      ],
      transaction: t,
    });

    // 4. Process each account and convert to main currency
    let totalInMainCurrency = 0;
    const accountDetails = [];

    for (const account of accounts) {
      // Skip if moneyType not found (shouldn't happen)
      if (!account.MoneyType) continue;

      // Find conversion rate (from this currency to main currency)
      const rate = rates.find(
        (r) =>
          r.fromCurrency === account.moneyTypeId &&
          r.MoneyType.id === account.moneyTypeId
      );

      let convertedValue = 0;
      let rateUsed = 1;

      if (account.moneyTypeId === mainCurrency.id) {
        // Already in main currency
        convertedValue = account.credit;
        rateUsed = 1;
      } else if (rate) {
        // Convert using rate (value1 is our buy rate)
        convertedValue = account.credit / rate.value1;
        rateUsed = rate.value1;
      } else {
        // No rate found - can't convert
        convertedValue = 0;
      }

      totalInMainCurrency += convertedValue;

      accountDetails.push({
        currencyId: account.moneyTypeId,
        currencyName: account.MoneyType.typeName,
        currencyNumber: account.MoneyType.number,
        originalBalance: account.credit,
        convertedBalance: convertedValue,
        conversionRate: rateUsed,
        isMainCurrency: account.moneyTypeId === mainCurrency.id,
      });
    }

    // 5. Get customer name
    const customer = accounts[0].Customer;
    const customerName = customer?.Stakeholder?.Person
      ? `${customer.Stakeholder.Person.firstName} ${customer.Stakeholder.Person.lastName}`
      : 'Unknown Customer';

    await t.commit();

    // 6. Format the response
    res.status(200).json({
      success: true,
      customer: {
        id: customerId,
        name: customerName,
      },
      accounts: accountDetails,
      total: {
        value: totalInMainCurrency,
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
      message: 'Failed to get customer accounts',
      error:
        process.env.NODE_ENV === 'development'
          ? {
              message: err.message,
              stack: err.stack,
            }
          : undefined,
    });
  }
};
