const { Person, Stakeholder, SenderReceiver } = require('../models');

exports.getSenderReceivers = async (req, res) => {
  try {
    const data = await req.model.findAll(req.orgQuery);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createSenderReceiver = async (req, res) => {
  const t = await SenderReceiver.sequelize.transaction();
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
      organizationId: req.orgId
    }, { transaction: t });

    // 3. Create SenderReceiver
    const sr = await SenderReceiver.create({
      stakeholderId: stakeholder.id,
      organizationId: req.orgId
    }, { transaction: t });

    await t.commit();
    res.status(201).json(sr);

  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: err.message });
  }
};


exports.updateSenderReceiver = async (req, res) => {
  try {
    const sr = await req.model.findOne({
      ...req.orgQuery,
      where: { ...req.orgQuery.where, id: req.params.id }
    });

    if (!sr) return res.status(404).json({ message: 'SenderReceiver not found' });

    await sr.update(req.body);
    res.json({ message: 'SenderReceiver updated successfully', sr });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



exports.getSenderReceiverByid = async (req, res) => {
  try {
    const sr = await req.model.findOne({
      ...req.orgQuery,
      where: { ...req.orgQuery.where, id: req.params.id }
    });

    if (!sr) return res.status(404).json({ message: 'senderRceiver not found' });
    res.json(sr);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteSenderReceiver = async (req, res) => {
  try {
    const sr = await req.model.findOne({
      ...req.orgQuery,
      where: { ...req.orgQuery.where, id: req.params.id }
    });

    if (!sr) return res.status(404).json({ message: 'SenderReceiver not found' });

    await sr.destroy();
    res.json({ message: 'SenderReceiver deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
