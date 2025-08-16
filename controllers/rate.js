const { Rate, MoneyType } = require('../models');

exports.getRates = async (req, res) => {
  try {
    const rates = await Rate.findAll({
      include: [{ model: MoneyType }],
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
      where: { fromCurrency },
      include: [{ model: MoneyType }],
    });
    if (!rate) {
      return res.status(404).json({ message: 'Rate not found' });
    }
    res.status(200).json(rate);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🔹 Create or update a rate
exports.createOrUpdateRate = async (req, res) => {
  try {
    const { fromCurrency, value1, value2 } = req.body;

    if (!fromCurrency || value1 === undefined || value2 === undefined) {
      return res
        .status(400)
        .json({ message: 'fromCurrency, value1 and value2 are required' });
    }

    const [rate, created] = await Rate.upsert({
      fromCurrency,
      value1,
      value2,
      rDate: new Date(),
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

// 🔹 Delete a rate
exports.deleteRate = async (req, res) => {
  try {
    const { fromCurrency } = req.params;

    const deleted = await Rate.destroy({ where: { fromCurrency } });
    if (!deleted) {
      return res.status(404).json({ message: 'Rate not found' });
    }

    res.status(200).json({ message: 'Rate deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
