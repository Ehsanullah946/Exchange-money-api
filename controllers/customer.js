// controllers/customer.js
const { Person, Stakeholder, Customer, Branch } = require('../models');

exports.getCustomers = async (req, res) => {
  try {
    const data = await req.model.findAll({
      ...req.orgQuery,
      include: [
        {
          model: Branch,
          attributes: ["id", "name", "contractType", "faxNo"]
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
      firstName,
      lastName,
      fatherName,
      photo,
      nationalCode,
      phoneNo,
      currentAddress,
      gender,
      maritalStatus,
      job,
      whatsApp,
      emailAddress,
      typeId,
      language,
      loanLimit,
      branchId
    } = req.body;

    // 1. Create Person
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
      organizationId: req.orgId
    }, { transaction: t });

    // 3. Create Customer
    const customer = await Customer.create({
      stakeholderId: stakeholder.id,
      whatsApp,
      email: emailAddress,
      typeId,
      language,
      loanLimit,
      branchId: branchId || null,
      organizationId: req.orgId
    }, { transaction: t });

    await t.commit();
    res.status(201).json(customer);

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
    const customer = await req.model.findOne({
      ...req.orgQuery,
      where: { ...req.orgQuery.where, id: req.params.id },
      include: [
        {
          model: Branch,
          attributes: ["id", "name", "contractType", "faxNo"]
        }
      ]
    });

    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    res.status(200).json({
      status: "success",
      data: customer
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
