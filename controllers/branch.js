const { Person, Stakeholder, Customer, Branch } = require('../models');

exports.createBranch = async (req, res) => {
  const t = await Branch.sequelize.transaction();
  try {
    const {
      firstName,
      lastName,
      fatherName,
      nationalCode,
      currentAddress,
      phone,
      gender,
      maritalStatus,
      job,
      language,
      loanLimit,
      whatsApp,
      email,
      telegram,
      contractType,
      faxNo,
      direct,
    } = req.body;

    // 1. Person (Org is here only)
    const person = await Person.create(
      {
        firstName,
        lastName,
        fatherName,
        nationalCode,
        currentAddress,
        phone,
        organizationId: req.orgId,
      },
      { transaction: t }
    );

    // 2. Stakeholder
    const stakeholder = await Stakeholder.create(
      {
        gender,
        maritalStatus,
        job,
        personId: person.id,
      },
      { transaction: t }
    );

    // 3. Customer
    const customer = await Customer.create(
      {
        stakeholderId: stakeholder.id,
        language,
        loanLimit,
        whatsApp,
        email,
        telegram,
      },
      { transaction: t }
    );

    // 4. Branch
    const branch = await Branch.create(
      {
        customerId: customer.id,
        contractType,
        faxNo,
        direct,
      },
      { transaction: t }
    );

    await t.commit();
    res.status(201).json({ message: 'Branch created successfully', branch });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: err.message });
  }
};

exports.getBranches = async (req, res) => {
  try {
    const branches = await Branch.findAll({
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
                  where: { organizationId: req.orgId }, // Filter here
                },
              ],
            },
          ],
        },
      ],
    });
    if (!branches) {
      return res.status(404).json({ message: 'Branch not found' });
    }

    res.status(200).json(branches);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// UPDATE Branch (updates Person + Stakeholder + Customer + Branch)

exports.getBranchById = async (req, res) => {
  try {
    const branch = await Branch.findOne({
      where: { id: req.params.id },
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
                  attributes: [
                    'firstName',
                    'lastName',
                    'fatherName',
                    'phone',
                    'photo',
                  ],
                  where: { organizationId: req.orgId }, // Filter by org here
                },
              ],
            },
          ],
        },
      ],
    });

    if (!branch) {
      return res.status(404).json({ message: 'Branch not found' });
    }

    res.status(200).json(branch);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// exports.updateBranch = async (req, res) => {
//   const t = await Branch.sequelize.transaction();
//   try {
//     const branch = await Branch.findOne({
//       where: { id: req.params.id, organizationId: req.orgId }
//     });

//     if (!branch) return res.status(404).json({ message: 'Branch not found' });

//     const customer = await Customer.findOne({ where: { id: branch.customerId } });
//     const stakeholder = await Stakeholder.findOne({ where: { id: customer.stakeholderId } });
//     const person = await Person.findOne({ where: { id: stakeholder.personId } });

//     // Update Person
//     await person.update(req.body, { transaction: t });

//     // Update Stakeholder
//     await stakeholder.update(req.body, { transaction: t });

//     // Update Customer
//     await customer.update(req.body, { transaction: t });

//     // Update Branch
//     await branch.update(req.body, { transaction: t });

//     await t.commit();
//     res.json({ message: "Branch updated successfully" });

//   } catch (err) {
//     await t.rollback();
//     res.status(500).json({ message: err.message });
//   }
// };

// DELETE Branch (removes Branch + Customer + Stakeholder + Person)

exports.updateBranch = async (req, res) => {
  const t = await Branch.sequelize.transaction();
  try {
    // Find the branch by joining through the chain and filtering by orgId
    const branch = await Branch.findOne({
      where: { id: req.params.id },
      include: [
        {
          model: Customer,
          include: [
            {
              model: Stakeholder,
              include: [
                {
                  model: Person,
                  where: { organizationId: req.orgId },
                },
              ],
            },
          ],
        },
      ],
      transaction: t,
    });

    if (!branch) {
      await t.rollback();
      return res
        .status(404)
        .json({ message: 'Branch not found or not in your organization' });
    }

    const customer = branch.Customer;
    const stakeholder = customer.Stakeholder;
    const person = stakeholder.Person;

    // Update Person
    await person.update(req.body, { transaction: t });

    // Update Stakeholder
    await stakeholder.update(req.body, { transaction: t });

    // Update Customer
    await customer.update(req.body, { transaction: t });

    // Update Branch
    await branch.update(req.body, { transaction: t });

    await t.commit();
    res.json({ message: 'Branch updated successfully' });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: err.message });
  }
};

exports.deleteBranch = async (req, res) => {
  const t = await Branch.sequelize.transaction();
  try {
    // Find the branch by org scope
    const branch = await Branch.findOne({
      where: { id: req.params.id },
      include: [
        {
          model: Customer,
          include: [
            {
              model: Stakeholder,
              include: [
                {
                  model: Person,
                  where: { organizationId: req.orgId },
                },
              ],
            },
          ],
        },
      ],
      transaction: t,
    });

    if (!branch) {
      await t.rollback();
      return res
        .status(404)
        .json({ message: 'Branch not found or not in your organization' });
    }

    const customer = branch.Customer;
    const stakeholder = customer.Stakeholder;
    const person = stakeholder.Person;

    // Delete in correct order
    await branch.destroy({ transaction: t });
    await customer.destroy({ transaction: t });
    await stakeholder.destroy({ transaction: t });
    await person.destroy({ transaction: t });

    await t.commit();
    res.json({ message: 'Branch deleted successfully' });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: err.message });
  }
};
