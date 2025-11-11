const { Rate, MoneyType, sequelize } = require('../models');

class RateService {
  static async getCurrentRate(organizationId, fromCurrency, toCurrency = 1) {
    return await Rate.findOne({
      where: {
        fromCurrency,
        toCurrency,
        organizationId,
        isActive: true,
      },
      include: [
        {
          model: MoneyType,
          as: 'sourceCurrency',
          where: { organizationId },
        },
        {
          model: MoneyType,
          as: 'targetCurrency',
          where: { organizationId },
        },
      ],
      order: [['effectiveDate', 'DESC']],
    });
  }

  static async convertAmount(organizationId, amount, fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    const rate = await this.getCurrentRate(
      organizationId,
      fromCurrency,
      toCurrency
    );
    if (!rate) {
      throw new Error(
        `No rate found for conversion from ${fromCurrency} to ${toCurrency}`
      );
    }

    // Use appropriate rate based on business logic (buy/sell/middle)
    return amount * rate.middleRate; // Adjust based on your business rules
  }
}

exports.getRates = async (req, res) => {
  try {
    const { page = 1, limit = 50, currency, active } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { organizationId: req.orgId };
    if (currency) whereClause.fromCurrency = currency;
    if (active !== undefined) whereClause.isActive = active === 'true';

    const rates = await Rate.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: MoneyType,
          as: 'sourceCurrency',
          where: { organizationId: req.orgId },
        },
        {
          model: MoneyType,
          as: 'targetCurrency',
          where: { organizationId: req.orgId },
        },
      ],
      order: [['effectiveDate', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.status(200).json({
      data: rates.rows,
      total: rates.count,
      page: parseInt(page),
      totalPages: Math.ceil(rates.count / limit),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getRateById = async (req, res) => {
  try {
    const { id } = req.params;
    const rate = await Rate.findOne({
      where: { id, organizationId: req.orgId },
      include: [
        {
          model: MoneyType,
          as: 'sourceCurrency',
          where: { organizationId: req.orgId },
        },
        {
          model: MoneyType,
          as: 'targetCurrency',
          where: { organizationId: req.orgId },
        },
      ],
    });

    if (!rate) {
      return res.status(404).json({ message: 'Rate not found' });
    }
    res.status(200).json(rate);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getCurrentRateByCurrency = async (req, res) => {
  try {
    const { fromCurrency, toCurrency } = req.params;
    const rate = await RateService.getCurrentRate(
      req.orgId,
      parseInt(fromCurrency),
      toCurrency ? parseInt(toCurrency) : 1
    );

    if (!rate) {
      return res.status(404).json({ message: 'Current rate not found' });
    }
    res.status(200).json(rate);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createRate = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      fromCurrency,
      toCurrency = 1,
      buyRate,
      sellRate,
      effectiveDate,
    } = req.body;

    // Validate currencies exist
    const [sourceCurrency, targetCurrency] = await Promise.all([
      MoneyType.findOne({
        where: { id: fromCurrency, organizationId: req.orgId },
      }),
      MoneyType.findOne({
        where: { id: toCurrency, organizationId: req.orgId },
      }),
    ]);

    if (!sourceCurrency || !targetCurrency) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Currency not found' });
    }

    // Deactivate previous rates for this currency pair
    await Rate.update(
      { isActive: false },
      {
        where: {
          fromCurrency,
          toCurrency,
          organizationId: req.orgId,
          isActive: true,
        },
        transaction,
      }
    );

    // Create new rate
    const middleRate = (parseFloat(buyRate) + parseFloat(sellRate)) / 2;

    const rate = await Rate.create(
      {
        fromCurrency,
        toCurrency,
        buyRate,
        sellRate,
        middleRate,
        effectiveDate: effectiveDate || new Date(),
        organizationId: req.orgId,
        createdBy: req.user.id,
        isActive: true,
      },
      { transaction }
    );

    await transaction.commit();

    const rateWithAssociations = await Rate.findByPk(rate.id, {
      include: [
        { model: MoneyType, as: 'sourceCurrency' },
        { model: MoneyType, as: 'targetCurrency' },
      ],
    });

    res.status(201).json({
      message: 'Rate created successfully',
      data: rateWithAssociations,
    });
  } catch (err) {
    await transaction.rollback();
    res.status(500).json({ message: err.message });
  }
};

exports.updateRate = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { buyRate, sellRate, effectiveDate, isActive } = req.body;

    const rate = await Rate.findOne({
      where: { id, organizationId: req.orgId },
      transaction,
    });

    if (!rate) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Rate not found' });
    }

    const updateData = {};
    if (buyRate !== undefined) updateData.buyRate = buyRate;
    if (sellRate !== undefined) updateData.sellRate = sellRate;
    if (effectiveDate !== undefined) updateData.effectiveDate = effectiveDate;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Recalculate middle rate if buy or sell rates changed
    if (buyRate !== undefined || sellRate !== undefined) {
      const finalBuyRate = buyRate !== undefined ? buyRate : rate.buyRate;
      const finalSellRate = sellRate !== undefined ? sellRate : rate.sellRate;
      updateData.middleRate =
        (parseFloat(finalBuyRate) + parseFloat(finalSellRate)) / 2;
    }

    await Rate.update(updateData, {
      where: { id, organizationId: req.orgId },
      transaction,
    });

    await transaction.commit();

    const updatedRate = await Rate.findByPk(id, {
      include: [
        { model: MoneyType, as: 'sourceCurrency' },
        { model: MoneyType, as: 'targetCurrency' },
      ],
    });

    res.status(200).json({
      message: 'Rate updated successfully',
      data: updatedRate,
    });
  } catch (err) {
    await transaction.rollback();
    res.status(500).json({ message: err.message });
  }
};

exports.deleteRate = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;

    const rate = await Rate.findOne({
      where: { id, organizationId: req.orgId },
      transaction,
    });

    if (!rate) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Rate not found' });
    }

    // Soft delete by deactivating
    await Rate.update(
      { isActive: false },
      {
        where: { id, organizationId: req.orgId },
        transaction,
      }
    );

    await transaction.commit();
    res.status(200).json({ message: 'Rate deactivated successfully' });
  } catch (err) {
    await transaction.rollback();
    res.status(500).json({ message: err.message });
  }
};

exports.getLatestRates = async (req, res) => {
  try {
    // Method 1: Using subquery to get latest rates (Recommended)
    const latestRates = await Rate.findAll({
      where: {
        organizationId: req.orgId,
        isActive: true,
      },
      include: [
        {
          model: MoneyType,
          as: 'sourceCurrency',
          where: { organizationId: req.orgId },
        },
        {
          model: MoneyType,
          as: 'targetCurrency',
          where: { organizationId: req.orgId },
        },
      ],
      attributes: {
        include: [
          [
            sequelize.literal(`
            (SELECT MAX(effectiveDate) 
             FROM rates AS latest 
             WHERE latest.fromCurrency = Rate.fromCurrency 
             AND latest.toCurrency = Rate.toCurrency 
             AND latest.organizationId = Rate.organizationId
             AND latest.isActive = true)
          `),
            'latestDate',
          ],
        ],
      },
      having: sequelize.literal('Rate.effectiveDate = latestDate'),
      order: [['fromCurrency', 'ASC']],
    });

    res.status(200).json(latestRates);
  } catch (err) {
    console.error('Error in getLatestRates:', err);
    res.status(500).json({ message: err.message });
  }
};

exports.convertCurrency = async (req, res) => {
  try {
    const { amount, fromCurrency, toCurrency, rateType = 'middle' } = req.body;

    if (!amount || !fromCurrency) {
      return res
        .status(400)
        .json({ message: 'Amount and fromCurrency are required' });
    }

    const convertedAmount = await RateService.convertAmount(
      req.orgId,
      parseFloat(amount),
      parseInt(fromCurrency),
      toCurrency ? parseInt(toCurrency) : 1
    );

    res.status(200).json({
      originalAmount: amount,
      fromCurrency,
      toCurrency: toCurrency || 1,
      convertedAmount,
      conversionDate: new Date(),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports.RateService = RateService;
