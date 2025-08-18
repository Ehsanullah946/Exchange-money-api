const { Rate, MoneyType, sequelize } = require('../models');

exports.getRates = async (req, res) => {
  try {
    const rates = await Rate.findAll({
      where: { organizationId: req.orgId },
      include: [{ model: MoneyType, organizationId: req.orgId }],
      order: [['rDate', 'DESC']],
    });
    res.status(200).json(rates);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getRateByCurrency = async (req, res) => {
  try {
    const { fromCurrency } = req.params;
    const rate = await Rate.findOne({
      where: { fromCurrency, organizationId: req.orgId },
      include: [{ model: MoneyType, organizationId: req.orgId }],
    });
    if (!rate) {
      return res.status(404).json({ message: 'Rate not found' });
    }
    res.status(200).json(rate);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

//  Create or update a rate
exports.createOrUpdateRate = async (req, res) => {
  try {
    const { fromCurrency, value1, value2 } = req.body;
    const orgId = req.orgId;

    const moneyType = await MoneyType.findOne({
      where: { id: fromCurrency, organizationId: orgId },
    });

    if (!moneyType) {
      return res.status(404).json({ message: 'currency not found' });
    }

    if (!fromCurrency || value1 === undefined || value2 === undefined) {
      return res.status(400).json({ message: '' });
    }

    const [rate, created] = await Rate.upsert({
      fromCurrency,
      value1,
      value2,
      rDate: new Date(),
      organizationId: orgId,
    });

    res.status(created ? 201 : 200).json({
      message: created
        ? 'Rate created successfully'
        : 'Rate updated successfully',
      data: rate,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteRate = async (req, res) => {
  try {
    const { fromCurrency } = req.params;

    const deleted = await Rate.destroy({
      where: { fromCurrency, organizationId: req.orgId },
    });
    if (!deleted) {
      return res.status(404).json({ message: 'Rate not found' });
    }

    res.status(200).json({ message: 'Rate deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getLatestRates = async (req, res) => {
  try {
    // This works if schema allows multiple rows per currency
    const latestRates = await Rate.findAll({
      where: { organizationId: req.orgId },
      attributes: [
        'fromCurrency',
        [sequelize.fn('MAX', sequelize.col('rDate')), 'latestDate'],
      ],
      group: ['fromCurrency'],
      raw: true,
    });

    // Fetch full rate rows with MoneyType joined
    const result = [];
    for (const item of latestRates) {
      const rate = await Rate.findOne({
        where: {
          organizationId: req.orgId,
          fromCurrency: item.fromCurrency,
          rDate: item.latestDate,
        },
        include: [{ model: MoneyType, where: { organizationId: req.orgId } }],
      });
      if (rate) result.push(rate);
    }

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
