const { Person, Stakeholder, Customer, Place } = require('../models');

exports.getBranches = async (req, res) => {
  try {
    const data = await req.model.findAll(req.orgQuery);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getBranchById = async (req, res) => {
  try {
    const branch = await req.model.findOne({
      ...req.orgQuery,
      where: { ...req.orgQuery.where, id: req.params.id }
    });

    if (!branch) return res.status(404).json({ message: 'Branch not found' });

    res.status(200).json({ status: 'success', data: branch });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createBranch = async (req, res) => {
  const t = await Place.sequelize.transaction();
  try {
    const {
      firstName, lastName, fatherName, nationalCode, phoneNo,
      currentAddress, permenentAddress,
      maritalStatus, job,
      loanLimit, language,
      whatsApp, emailAddress, telegram,
      contractType, faxNo, direct
    } = req.body;

    // 1. Create Person
    const person = await Person.create({
      firstName,
      lastName,
      fatherName,
      nationalCode,
      phoneNo,
      currentAddress,
      organizationId: req.orgId
    }, { transaction: t });

    // 2. Create Stakeholder
    const stakeholder = await Stakeholder.create({
      maritalStatus,
      job,
      personId: person.id,
      permenentAddress,
      organizationId: req.orgId
    }, { transaction: t });

    // 3. Create Customer (Branch acts like a customer in financial tracking)
    const customer = await Customer.create({
      stakeholderId: stakeholder.id,
      loanLimit,
      language,
      whatsApp,
      email: emailAddress,
      telegram,
      organizationId: req.orgId
    }, { transaction: t });

    // 4. Create Place (Branch info)
    const place = await Place.create({
      id: customer.id, // Place ID = Customer ID (1:1 relation)
      contractType,
      faxNo,
      chargesCustomerId: customer.id,
      direct,
      organizationId: req.orgId
    }, { transaction: t });

    await t.commit();
    res.status(201).json({ message: 'Branch created successfully', place });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: err.message });
  }
};


exports.updateBranch = async (req, res) => {
  const t = await Place.sequelize.transaction();
  try {
    const branchId = req.params.id;

    // 1. Find Place + Customer + Stakeholder + Person
    const branch = await Place.findOne({
      where: { id: branchId, organizationId: req.orgId },
      include: [{
        model: Customer,
        include: [{
          model: Stakeholder,
          include: [Person]
        }]
      }]
    });

    if (!branch) {
      await t.rollback();
      return res.status(404).json({ message: "Branch not found" });
    }

    // 2. Update Person
    const person = branch.Customer?.Stakeholder?.Person;
    if (person) {
      await person.update({
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        fatherName: req.body.fatherName,
        nationalCode: req.body.nationalCode,
        phoneNo: req.body.phoneNo,
        currentAddress: req.body.currentAddress,
        permenentAddress: req.body.permenentAddress
      }, { transaction: t });
    }

    // 3. Update Stakeholder
    const stakeholder = branch.Customer?.Stakeholder;
    if (stakeholder) {
      await stakeholder.update({
        gender: req.body.gender,
        maritalStatus: req.body.maritalStatus,
        job: req.body.job
      }, { transaction: t });
    }

    // 4. Update Customer
    const customer = branch.Customer;
    if (customer) {
      await customer.update({
        language: req.body.language,
        loanLimit: req.body.loanLimit,
        whatsApp: req.body.whatsApp,
        email: req.body.emailAddress,
        telegram: req.body.telegram,
        whatsAppEnabled: req.body.whatsAppEnabled,
        emailEnabled: req.body.emailEnabled,
        telegramEnabled: req.body.telegramEnabled
      }, { transaction: t });
    }

    // 5. Update Place (branch)
    await branch.update({
      contractType: req.body.contractType,
      faxNo: req.body.faxNo,
      chargesCustomerId: req.body.chargesCustomerId,
      direct: req.body.direct
    }, { transaction: t });

    await t.commit();
    res.json({ message: "Branch updated successfully" });

  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: err.message });
  }
};


exports.deleteBranch = async (req, res) => {
  const t = await Place.sequelize.transaction();
  try {
    const branch = await Place.findOne({
      where: { id: req.params.id, organizationId: req.orgId },
      transaction: t
    });

    if (!branch) {
      await t.rollback();
      return res.status(404).json({ message: 'Branch not found' });
    }

    // Get linked customer
    const customer = await Customer.findOne({
      where: { id: branch.id, organizationId: req.orgId },
      transaction: t
    });

    if (!customer) {
      await branch.destroy({ transaction: t });
      await t.commit();
      return res.json({ message: 'Branch deleted (no customer found)' });
    }

    // Get linked stakeholder
    const stakeholder = await Stakeholder.findOne({
      where: { id: customer.stakeholderId, organizationId: req.orgId },
      transaction: t
    });

    // Get linked person
    const person = stakeholder
      ? await Person.findOne({
          where: { id: stakeholder.personId, organizationId: req.orgId },
          transaction: t
        })
      : null;

    // Delete Place (branch)
    await branch.destroy({ transaction: t });

    // Delete Customer
    await customer.destroy({ transaction: t });

    // Delete Stakeholder
    if (stakeholder) {
      await stakeholder.destroy({ transaction: t });
    }

    // Delete Person
    if (person) {
      await person.destroy({ transaction: t });
    }

    await t.commit();
    res.json({ message: 'Branch and all related records deleted successfully' });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: err.message });
  }
};
