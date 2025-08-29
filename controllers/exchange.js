const {
  sequelize,
  Exchange,
  Account,
  ExchangeRemaining,
  MoneyType,
  Customer,
  Employee,
} = require('../models');

exports.createExchange = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      rate,
      saleAmount,
      purchaseAmount,
      description,
      fingerprint,
      photo,
      swap = false,
      calculate = true,
      saleMoneyType,
      purchaseMoneyType,
      exchangerId,
      employeeId,
      customerId,
      transferId = null,
      receiveId = null,
    } = req.body;

    const orgId = req.orgId;

    // Validate required fields
    if (
      !rate ||
      !saleMoneyType ||
      !purchaseMoneyType ||
      !employeeId ||
      !customerId
    ) {
      await t.rollback();
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Validate that at least one amount is provided
    if (!saleAmount && !purchaseAmount) {
      await t.rollback();
      return res.status(400).json({
        message: 'Must provide either saleAmount or purchaseAmount',
      });
    }

    // Validate money types belong to organization
    const saleMoneyTypeValid = await MoneyType.findOne({
      where: { id: saleMoneyType, organizationId: orgId },
      transaction: t,
    });
    const purchaseMoneyTypeValid = await MoneyType.findOne({
      where: { id: purchaseMoneyType, organizationId: orgId },
      transaction: t,
    });

    if (!saleMoneyTypeValid || !purchaseMoneyTypeValid) {
      await t.rollback();
      return res.status(400).json({ message: 'Invalid currency types' });
    }

    // Calculate missing amount if calculate flag is true
    let finalSaleAmount = saleAmount;
    let finalPurchaseAmount = purchaseAmount;

    if (calculate) {
      if (saleAmount && !purchaseAmount) {
        finalPurchaseAmount = saleAmount * rate;
      } else if (purchaseAmount && !saleAmount) {
        finalSaleAmount = purchaseAmount / rate;
      }
      // If both provided, use as-is (no calculation)
    }

    // Validate amounts are positive
    if (finalSaleAmount <= 0 || finalPurchaseAmount <= 0) {
      await t.rollback();
      return res
        .status(400)
        .json({ message: 'Amounts must be greater than zero' });
    }

    // Find customer accounts
    const saleAccount = await Account.findOne({
      where: { customerId, moneyTypeId: saleMoneyType },
      transaction: t,
    });
    const purchaseAccount = await Account.findOne({
      where: { customerId, moneyTypeId: purchaseMoneyType },
      transaction: t,
    });

    if (!saleAccount || !purchaseAccount) {
      await t.rollback();
      return res.status(404).json({
        message: 'Customer accounts not found for specified currencies',
      });
    }

    // Update account balances
    if (swap) {
      await Account.update(
        { credit: sequelize.literal(`credit - ${finalPurchaseAmount}`) },
        { where: { id: purchaseAccount.id }, transaction: t }
      );
      await Account.update(
        { credit: sequelize.literal(`credit + ${finalSaleAmount}`) },
        { where: { id: saleAccount.id }, transaction: t }
      );
    } else {
      await Account.update(
        { credit: sequelize.literal(`credit - ${finalSaleAmount}`) },
        { where: { id: saleAccount.id }, transaction: t }
      );
      await Account.update(
        { credit: sequelize.literal(`credit + ${finalPurchaseAmount}`) },
        { where: { id: purchaseAccount.id }, transaction: t }
      );
    }

    // Create exchange record
    const exchange = await Exchange.create(
      {
        rate,
        saleAmount: finalSaleAmount,
        purchaseAmount: finalPurchaseAmount,
        eDate: new Date(),
        description,
        fingerprint,
        photo,
        deleted: false,
        swap,
        calculate,
        saleMoneyType,
        purchaseMoneyType,
        exchangerId,
        employeeId,
        customerId,
        organizationId: orgId,
        transferId,
        receiveId,
      },
      { transaction: t }
    );

    // Create exchange remaining record
    const exchangeRemaining = await ExchangeRemaining.create(
      {
        purchaseRemaining: finalPurchaseAmount,
        purchaseRemainingCurrency: purchaseMoneyType,
        costedAmount: finalSaleAmount,
        costedAmountCurrency: saleMoneyType,
        eDate: new Date(),
      },
      { transaction: t }
    );

    await t.commit();
    res.status(201).json({
      message: 'Exchange completed successfully',
      exchange,
      exchangeRemaining,
    });
  } catch (err) {
    await t.rollback();
    res.status(500).json({
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }
};

// Get all exchanges for organization
(exports.getExchanges = async (req, res) => {
  try {
    const exchanges = await Exchange.findAll({
      where: { organizationId: req.orgId, deleted: false },
      include: [
        { model: MoneyType, as: 'SaleType' },
        { model: MoneyType, as: 'PurchaseType' },
        { model: Customer },
        { model: Employee },
      ],
      order: [['eDate', 'DESC']],
    });
    res.json(exchanges);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}),
  // Get single exchange
  (exports.getExchange = async (req, res) => {
    try {
      const exchange = await Exchange.findOne({
        where: { id: req.params.id, organizationId: req.orgId },
        include: [
          { model: MoneyType, as: 'SaleType' },
          { model: MoneyType, as: 'PurchaseType' },
          { model: Customer },
          { model: Employee },
        ],
      });
      if (!exchange)
        return res.status(404).json({ message: 'Exchange not found' });
      res.json(exchange);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }),
  // Delete exchange (soft delete)
  (exports.deleteExchange = async (req, res) => {
    const t = await sequelize.transaction();
    try {
      const exchange = await Exchange.findOne({
        where: { id: req.params.id, organizationId: req.orgId },
        transaction: t,
      });
      if (!exchange) {
        await t.rollback();
        return res.status(404).json({ message: 'Exchange not found' });
      }

      // Reverse the exchange effects
      const saleAccount = await Account.findOne({
        where: {
          customerId: exchange.customerId,
          moneyTypeId: exchange.saleMoneyType,
        },
        transaction: t,
      });
      const purchaseAccount = await Account.findOne({
        where: {
          customerId: exchange.customerId,
          moneyTypeId: exchange.purchaseMoneyType,
        },
        transaction: t,
      });

      if (exchange.swap) {
        await Account.update(
          { credit: sequelize.literal(`credit + ${exchange.purchaseAmount}`) },
          { where: { id: purchaseAccount.id }, transaction: t }
        );
        await Account.update(
          { credit: sequelize.literal(`credit - ${exchange.saleAmount}`) },
          { where: { id: saleAccount.id }, transaction: t }
        );
      } else {
        await Account.update(
          { credit: sequelize.literal(`credit + ${exchange.saleAmount}`) },
          { where: { id: saleAccount.id }, transaction: t }
        );
        await Account.update(
          { credit: sequelize.literal(`credit - ${exchange.purchaseAmount}`) },
          { where: { id: purchaseAccount.id }, transaction: t }
        );
      }

      await exchange.update({ deleted: true }, { transaction: t });
      await t.commit();
      res.json({ message: 'Exchange deleted successfully' });
    } catch (err) {
      await t.rollback();
      res.status(500).json({ message: err.message });
    }
  });
