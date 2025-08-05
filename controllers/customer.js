const { Person, Stakeholder, Customer } = require('../models');

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
              where: { organizationId: req.orgId }
            }
          ]
        }
      ]
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
      firstName, lastName, fatherName, photo, nationalCode, phoneNo,
      currentAddress, permanentAddress, gender, maritalStatus, job,
      whatsApp, telegram, email, typeId, language, loanLimit,
      whatsAppEnabled, telegramEnabled, emailEnabled
    } = req.body;

    // 1. Create Person (only place where organizationId is stored)
    const person = await Person.create({
      firstName,
      lastName,
      fatherName,
      photo,
      nationalCode,
      phoneNo,
      currentAddress,
      organizationId: req.orgId
    }, { transaction: t });

    // 2. Create Stakeholder
    const stakeholder = await Stakeholder.create({
      gender,
      maritalStatus,
      job,
      personId: person.id,
      permanentAddress
    }, { transaction: t });

    // 3. Create Customer (no organizationId here)
    const customer = await Customer.create({
      stakeholderId: stakeholder.id,
      whatsApp,
      email,
      typeId,
      language,
      loanLimit,
      telegram,
      whatsAppEnabled: Boolean(whatsAppEnabled),
      telegramEnabled: Boolean(telegramEnabled),
      emailEnabled: Boolean(emailEnabled)
    }, { transaction: t, orgId: req.orgId  });

    await t.commit();
    res.status(201).json({
      ...customer.toJSON(),
      orgCustomerId: customer.orgCustomerId});
  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: err.message });
  }
};

exports.updateCustomer = async (req, res) => {
  try {
    const customer = await req.model.findOne({
      ...req.orgQuery,
      where: { ...req.orgQuery.where, id: req.params.id }
    });

    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    await customer.update(req.body);
    res.json({ message: 'Customer updated successfully', customer });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await req.model.findOne({
      ...req.orgQuery,
      where: { ...req.orgQuery.where, id: req.params.id }
    });

    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    await customer.destroy();
    res.json({ message: 'Customer deleted successfully' });
  } catch (err) {
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
              where: { organizationId: req.orgId } // scope to logged-in org
            }
          ]
        }
      ]
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.status(200).json({
      status: "success",
      data: customer
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
