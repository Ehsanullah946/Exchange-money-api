const { Person, Stakeholder, Customer, Branch } = require('../models');


// CREATE Branch (Person → Stakeholder → Customer → Branch)
exports.createBranch = async (req, res) => {
  const t = await Branch.sequelize.transaction();
  try {
    const {
      firstName, lastName, fatherName, nationalCode, currentAddress, phoneNo,
      gender, maritalStatus, job,
      language, loanLimit, whatsApp, emailAddress, telegram,
      contractType, faxNo, direct
    } = req.body;

    // 1. Person
    const person = await Person.create({
      firstName,
      lastName,
      fatherName,
      nationalCode,
      currentAddress,
      phoneNo,
      organizationId: req.orgId
    }, { transaction: t });

    // 2. Stakeholder
    const stakeholder = await Stakeholder.create({
      gender,
      maritalStatus,
      job,
      personId: person.id,
      organizationId: req.orgId
    }, { transaction: t });

    // 3. Customer
    const customer = await Customer.create({
      stakeholderId: stakeholder.id,
      language,
      loanLimit,
      whatsApp,
      email: emailAddress,
      telegram,
      organizationId: req.orgId
    }, { transaction: t });

    // 4. Branch
    const branch = await Branch.create({
      customerId: customer.id,
      contractType,
      faxNo,
      direct,
      organizationId: req.orgId
    }, { transaction: t });

    await t.commit();
    res.status(201).json({ message: "Branch created successfully", branch });

  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: err.message });
  }
};


// GET all branches (org-scoped)
exports.getBranches = async (req, res) => {
  try {
    const branches = await req.model.findAll(req.orgQuery);
    res.json(branches);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// GET single branch by ID
exports.getBranchById = async (req, res) => {
  try {
    const branch = await req.model.findOne({
      ...req.orgQuery,
      where: { ...req.orgQuery.where, id: req.params.id }
    });

    if (!branch) return res.status(404).json({ message: 'Branch not found' });

    res.json(branch);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// UPDATE Branch (updates Person + Stakeholder + Customer + Branch)
exports.updateBranch = async (req, res) => {
  const t = await Branch.sequelize.transaction();
  try {
    const branch = await Branch.findOne({
      where: { id: req.params.id, organizationId: req.orgId }
    });

    if (!branch) return res.status(404).json({ message: 'Branch not found' });

    const customer = await Customer.findOne({ where: { id: branch.customerId } });
    const stakeholder = await Stakeholder.findOne({ where: { id: customer.stakeholderId } });
    const person = await Person.findOne({ where: { id: stakeholder.personId } });

    // Update Person
    await person.update(req.body, { transaction: t });

    // Update Stakeholder
    await stakeholder.update(req.body, { transaction: t });

    // Update Customer
    await customer.update(req.body, { transaction: t });

    // Update Branch
    await branch.update(req.body, { transaction: t });

    await t.commit();
    res.json({ message: "Branch updated successfully" });

  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: err.message });
  }
};


// DELETE Branch (removes Branch + Customer + Stakeholder + Person)
exports.deleteBranch = async (req, res) => {
  const t = await Branch.sequelize.transaction();
  try {
    const branch = await Branch.findOne({
      where: { id: req.params.id, organizationId: req.orgId }
    });

    if (!branch) return res.status(404).json({ message: 'Branch not found' });

    const customer = await Customer.findOne({ where: { id: branch.customerId } });
    const stakeholder = await Stakeholder.findOne({ where: { id: customer.stakeholderId } });
    const person = await Person.findOne({ where: { id: stakeholder.personId } });

    await branch.destroy({ transaction: t });
    await customer.destroy({ transaction: t });
    await stakeholder.destroy({ transaction: t });
    await person.destroy({ transaction: t });

    await t.commit();
    res.json({ message: "Branch deleted successfully" });

  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: err.message });
  }
};
