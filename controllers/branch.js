const { Person, Stakeholder, Branch, Customer } = require("../models");

exports.getBranches = async (req, res) => {
    try {
        const branches = await Branch.findAll({
            where: { organizationId: req.user.organizationId },
            include: [
                {
                    model: Stakeholder,
                    include: [Person]
                }
            ]
        });
        res.json(branches);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
exports.getBranchById = async (req, res) => {
  try {
    const branch = await req.model.findOne({
      ...req.orgQuery,
      where: { ...req.orgQuery.where, id: req.params.id },
      include: [
        { model: Customer, include: [Stakeholder] }
      ]
    });

    if (!branch) return res.status(404).json({ message: "Branch not found" });

    res.status(200).json({
      status: "success",
      data: branch
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createBranch = async (req, res) => {
    const t = await Branch.sequelize.transaction();
    try {
        const {
            firstName, lastName, fatherName, nationalCode, phoneNo,
            currentAddress, maritalStatus, job, gender,
            contractType, faxNo, direct
        } = req.body;

        // 1. Create Person
        const person = await Person.create({
            firstName, lastName, fatherName, nationalCode, phoneNo, currentAddress,
            organizationId: req.user.organizationId
        }, { transaction: t });

        // 2. Create Stakeholder
        const stakeholder = await Stakeholder.create({
            gender, maritalStatus, job,
            personId: person.id,
            organizationId: req.user.organizationId
        }, { transaction: t });

        // 3. Create Branch
        const branch = await Branch.create({
            stakeholderId: stakeholder.id,
            contractType,
            faxNo,
            direct,
            organizationId: req.user.organizationId
        }, { transaction: t });

        await t.commit();
        res.status(201).json(branch);

    } catch (err) {
        await t.rollback();
        res.status(500).json({ message: err.message });
    }
};

exports.updateBranch = async (req, res) => {
    const t = await Branch.sequelize.transaction();
    try {
        const branch = await Branch.findOne({
            where: { id: req.params.id, organizationId: req.user.organizationId },
            include: [{ model: Stakeholder, include: [Person] }]
        });

        if (!branch) return res.status(404).json({ message: "Branch not found" });

        const { firstName, lastName, fatherName, nationalCode, phoneNo,
            currentAddress, maritalStatus, job, gender,
            contractType, faxNo, direct } = req.body;

        // Update person
        await branch.Stakeholder.Person.update({
            firstName, lastName, fatherName, nationalCode, phoneNo, currentAddress
        }, { transaction: t });

        // Update stakeholder
        await branch.Stakeholder.update({
            gender, maritalStatus, job
        }, { transaction: t });

        // Update branch
        await branch.update({
            contractType, faxNo, direct
        }, { transaction: t });

        await t.commit();
        res.json({ message: "Branch updated successfully" });

    } catch (err) {
        await t.rollback();
        res.status(500).json({ message: err.message });
    }
};

exports.deleteBranch = async (req, res) => {
    try {
        const deleted = await Branch.destroy({
            where: { id: req.params.id, organizationId: req.user.organizationId }
        });

        if (!deleted) return res.status(404).json({ message: "Branch not found" });

        res.json({ message: "Branch deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
