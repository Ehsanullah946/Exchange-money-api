const { Person, Exchanger } = require('../models');

exports.getExchangers = async (req, res) => {
  try {
    const data = await req.model.findAll({
          include: [
            {
              model: Person,
              required: true,
              where: { organizationId: req.orgId }
           }
      ]
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createExchanger = async (req, res) => {
  const t = await Exchanger.sequelize.transaction();
  try {
    const {
      firstName, lastName, fatherName, photo, nationalCode, phoneNo, currentAddress
    } = req.body;

    // 1. Create Person
    const person = await Person.create({
      firstName, lastName, fatherName,photo, nationalCode, phoneNo, currentAddress,
      organizationId: req.orgId     
    }, { transaction: t });

    // 2. Create Exchanger
    const exchanger = await Exchanger.create({
      personId: person.id,
    }, { transaction: t });

    await t.commit();
    res.status(201).json(exchanger);

  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: err.message });
  }
};


exports.updateExchanger = async (req, res) => {
  const t = await Exchanger.sequelize.transaction();
  try {
    const exchanger = await req.model.findOne({
      where: { id: req.params.id },
      include: [
        {
          model: Person,
          required: true,
         where:{organizationId:req.orgId}
       }
      ],
      transaction:t
    });

    if (!exchanger) return res.status(404).json({ message: 'Exchanger not found' });

    const person = exchanger.Person;
    
    await exchanger.update(req.body,{transaction:t});
    await person.update(req.body, { transaction: t });

    res.json({ message: 'Exchanger updated successfully', exchanger });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteExchanger = async (req, res) => {
  const t = await Exchanger.sequelize.transaction();
  try {
    const exchanger = await req.model.findOne({
      where: { id: req.params.id },
      include: [
        {
          model: Person,
          required: true,
          where: { organizationId: req.orgId }
      }
      ],
      transaction:t
    });

    if (!exchanger) return res.status(404).json({ message: 'Exchanger not found' });

    const person = exchanger.Person;

    await exchanger.destroy({ transaction: t });
    await person.destroy({ transaction: t });
  
    await t.commit();
    res.json({ message: 'Exchanger deleted successfully' });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: err.message });
  }
};

exports.getExchangerById =async (req, res)=>{
    
    try {
        const exchanger = await req.model.findOne({
           where: { id: req.params.id },
          include: [
            {
              model: Person,
              required: true, 
              where: { organizationId: req.orgId }
            }
          ]
        })
        
          if (!exchanger) return res.status(404).json({ message: 'exchanger not found' });

        res.status(200).json({
            status: "success",
            data: {
                data:exchanger
            }
        })
        
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}
