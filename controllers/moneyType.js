const { MoneyType } = require('../models');

exports.getMoneyTypes = async (req, res) => {
  try {
    const data = await req.model.findAll(req.orgQuery);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createMoneyType = async (req, res) => {
  try {
    const record = await MoneyType.create({
      typeName: req.body.typeName,
      organizationId: req.orgId
    });
    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateMoneyType = async (req, res) => {
  try {
    const record = await req.model.findOne({
      ...req.orgQuery,
      where: { ...req.orgQuery.where, id: req.params.id }
    });
    if (!record) return res.status(404).json({ message: 'Money type not found' });

    await record.update(req.body);
    res.json({ message: 'Money type updated', record });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteMoneyType = async (req, res) => {
  try {
    const deletedCount = await req.model.destroy({
      where: { ...req.orgQuery.where, id: req.params.id }
    });
    if (!deletedCount) return res.status(404).json({ message: 'Money type not found' });

    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};