const { Op } = require('sequelize');
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
      maritalStatus,
      gender,
      job,
      language,
      loanLimit,
      whatsApp,
      email,
      telegram,
      faxNo,
      direct,
      whatsAppEnabled,
      telegramEnabled,
      emailEnabled,
      phoneEnabled,
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
        whatsAppEnabled,
        telegramEnabled,
        emailEnabled,
        phoneEnabled,
      },
      { transaction: t }
    );

    // 4. Branch
    const branch = await Branch.create(
      {
        customerId: customer.id,
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
    const { search, phone, limit = 10, page = 1 } = req.query;

    const wherePerson = { organizationId: req.orgId };
    const whereBranch = {};

    if (search) {
      wherePerson[Op.or] = [
        { firstName: { [Op.like]: `%${search}%` } },
        { lastName: { [Op.like]: `%${search}%` } },
      ];
    }

    if (phone) {
      wherePerson.phone = { [Op.like]: `%${phone}%` };
    }

    const offset = (page - 1) * limit;

    const { rows, count } = await Branch.findAndCountAll({
      where: whereBranch,
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
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // if (!row || row.length === 0) {
    //   return res.status(404).json({ message: 'No branches found' });
    // }

    res.status(200).json({
      data: rows,
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error('Error fetching branches:', err);
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

    res.status(200).json({
      status: 'success',
      data: branch,
    });
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
    await person.destroy({ transaction: t });
    await stakeholder.destroy({ transaction: t });
    await customer.destroy({ transaction: t });
    await branch.destroy({ transaction: t });

    await t.commit();
    res.json({ message: 'Branch deleted successfully' });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: err.message });
  }
};
