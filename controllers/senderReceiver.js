const { Op } = require('sequelize');
const { Person, Stakeholder, SenderReceiver } = require('../models');

exports.getSenderReceivers = async (req, res) => {
  try {
    const { search, phone, limit = 10, page = 1 } = req.query;

    const wherePerson = { organizationId: req.orgId };

    if (search) {
      wherePerson[Op.or] = [
        { firstName: { [Op.like]: `%${search}%` } },
        { lastName: { [Op.like]: `%${search}%` } },
      ];
    }

    if (phone) {
      wherePerson.phone = { [Op.like]: `%${phone}%` };
    }

    const whereSenderReceiver = {};

    const offset = (page - 1) * limit;

    const { rows, count } = await SenderReceiver.findAndCountAll({
      where: whereSenderReceiver,
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
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // if (!rows || rows.length === 0) {
    //   return res.status(404).json({ message: 'No employee found' });
    // }

    res.json({
      data: rows,
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createSenderReceiver = async (req, res) => {
  const t = await SenderReceiver.sequelize.transaction();
  try {
    const {
      firstName,
      lastName,
      fatherName,
      photo,
      nationalCode,
      phone,
      currentAddress,
      permanentAddress,
      gender,
      maritalStatus,
      job,
    } = req.body;

    // 1. Create Person
    const person = await Person.create(
      {
        firstName,
        lastName,
        fatherName,
        photo,
        nationalCode,
        phone,
        currentAddress,
        organizationId: req.orgId,
      },
      { transaction: t }
    );

    // 2. Create Stakeholder
    const stakeholder = await Stakeholder.create(
      {
        gender,
        maritalStatus,
        job,
        permanentAddress,
        personId: person.id,
      },
      { transaction: t }
    );

    // 3. Create SenderReceiver
    const sr = await SenderReceiver.create(
      {
        stakeholderId: stakeholder.id,
        organizationId: req.orgId,
      },
      { transaction: t }
    );

    await t.commit();
    res.status(201).json(sr);
  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: err.message });
  }
};

exports.updateSenderReceiver = async (req, res) => {
  const t = await SenderReceiver.sequelize.transaction();
  try {
    const sr = await SenderReceiver.findOne({
      where: { id: req.params.id },
      include: [
        {
          model: Stakeholder,
          required: true,
          include: [
            {
              model: Person,
              required: true,
              where: { organizationId: req.orgId },
            },
          ],
        },
      ],
      transaction: t,
    });

    if (!sr)
      return res.status(404).json({ message: 'SenderReceiver not found' });

    const stakeholder = sr.Stakeholder;
    const person = stakeholder.Person;

    await person.update(req.body, { transaction: t });
    await stakeholder.update(req.body, { transaction: t });
    await sr.update(req.body, { transaction: t });

    await t.commit();
    res.json({ message: 'SenderReceiver updated successfully', sr });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: err.message });
  }
};

exports.getSenderReceiverByid = async (req, res) => {
  try {
    const sr = await SenderReceiver.findOne({
      where: { id: req.params.id },
      include: [
        {
          model: Stakeholder,
          required: true,
          include: [
            {
              model: Person,
              required: true,
              where: { organizationId: req.orgId },
            },
          ],
        },
      ],
    });

    if (!sr) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.status(200).json({
      status: 'success',
      data: sr,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteSenderReceiver = async (req, res) => {
  const t = await SenderReceiver.sequelize.transaction();
  try {
    const sr = await req.model.findOne({
      where: { id: req.params.id },
      include: [
        {
          model: Stakeholder,
          required: true,
          include: [
            {
              model: Person,
              required: true,
              where: { organizationId: req.orgId },
            },
          ],
        },
      ],
      transaction: t,
    });

    if (!sr)
      return res.status(404).json({ message: 'SenderReceiver not found' });

    const stakeholder = sr.Stakeholder;
    const person = stakeholder.Person;

    await person.destroy({ transaction: t });
    await stakeholder.destroy({ transaction: t });
    await sr.destroy({ transaction: t });

    await t.commit();
    res.json({ message: 'SenderReceiver deleted successfully' });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: err.message });
  }
};
