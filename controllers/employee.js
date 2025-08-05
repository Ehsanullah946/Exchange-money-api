const { Person, Stakeholder, Employee } = require('../models');

exports.getEmployees = async (req, res) => {
  try {
    const data = await req.model.findAll({
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

exports.createEmployee = async (req, res) => {
  const t = await Employee.sequelize.transaction();
  try {
    const {
      firstName, lastName, fatherName,photo, nationalCode, phoneNo, currentAddress,
      gender, maritalStatus, job
    } = req.body;

    // 1. Create Person
    const person = await Person.create({
      firstName, lastName, fatherName, photo, nationalCode, phoneNo, currentAddress,
       organizationId: req.orgId
    }, { transaction: t });

    // 2. Create Stakeholder
    const stakeholder = await Stakeholder.create({
      gender, maritalStatus, job, personId: person.id,
    }, { transaction: t });

    // 3. Create Employee
    const employee = await Employee.create({
      stakeholderId: stakeholder.id,
    }, { transaction: t });

    await t.commit();
    res.status(201).json(employee);

  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: err.message });
  }
};

exports.updateEmployee = async (req, res) => {
  try {
    const employee = await req.model.findOne({
      ...req.orgQuery,
      where: { ...req.orgQuery.where, id: req.params.id }
    });

    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    await employee.update(req.body);
    res.json({ message: 'Employee updated successfully', employee });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteEmployee = async (req, res) => {
  try {
    const employee = await req.model.findOne({
      ...req.orgQuery,
      where: { ...req.orgQuery.where, id: req.params.id }
    });

    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    await employee.destroy();
    res.json({ message: 'Employee deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getEmployeeById =async (req, res)=>{
    try {
        const employee = await Employee.findOne({
     where: { id: req.params.id }, 
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
    })
      
      if (!employee) return res.status(404).json({ message: 'employee not found' });
        res.status(200).json({
            status: "success",
            data: {
                data:employee
            }
        })
        
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

