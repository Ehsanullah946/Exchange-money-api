const {
  sequelize,
  Exchange,
  Account,
  ExchangeRemaining,
  MoneyType,
  Customer,
  Employee,
  Stakeholder,
  Person,
  Exchanger,
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

    console.log(req.body);

    // Validate required fields
    if (!rate || !saleMoneyType || !purchaseMoneyType || !customerId) {
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

    let finalSaleAmount = saleAmount;
    let finalPurchaseAmount = purchaseAmount;

    if (calculate) {
      if (saleAmount && !purchaseAmount) {
        finalPurchaseAmount = saleAmount * rate;
      } else if (purchaseAmount && !saleAmount) {
        finalSaleAmount = purchaseAmount * rate;
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

    if (swap) {
      await Account.update(
        { credit: sequelize.literal(`credit - ${finalPurchaseAmount}`) },
        { where: { No: purchaseAccount.No }, transaction: t }
      );
      await Account.update(
        { credit: sequelize.literal(`credit + ${finalSaleAmount}`) },
        { where: { No: saleAccount.No }, transaction: t }
      );
    } else {
      await Account.update(
        { credit: sequelize.literal(`credit - ${finalSaleAmount}`) },
        { where: { No: saleAccount.No }, transaction: t }
      );
      await Account.update(
        { credit: sequelize.literal(`credit + ${finalPurchaseAmount}`) },
        { where: { No: purchaseAccount.No }, transaction: t }
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
        {
          model: Customer,
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
        },
        { model: Exchanger },
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
  (exports.getExchangeById = async (req, res) => {
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
          { where: { No: purchaseAccount.No }, transaction: t }
        );
        await Account.update(
          { credit: sequelize.literal(`credit - ${exchange.saleAmount}`) },
          { where: { No: saleAccount.No }, transaction: t }
        );
      } else {
        await Account.update(
          { credit: sequelize.literal(`credit + ${exchange.saleAmount}`) },
          { where: { No: saleAccount.No }, transaction: t }
        );
        await Account.update(
          { credit: sequelize.literal(`credit - ${exchange.purchaseAmount}`) },
          { where: { No: purchaseAccount.No }, transaction: t }
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

// Update exchange transaction
exports.updateExchange = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const {
      rate,
      saleAmount,
      purchaseAmount,
      description,
      fingerprint,
      photo,
      swap,
      calculate,
      saleMoneyType,
      purchaseMoneyType,
      exchangerId,
      employeeId,
      customerId,
      transferId,
      receiveId,
    } = req.body;

    const orgId = req.orgId;

    // Find the existing exchange
    const exchange = await Exchange.findOne({
      where: { id, organizationId: orgId, deleted: false },
      transaction: t,
    });

    if (!exchange) {
      await t.rollback();
      return res.status(404).json({ message: 'Exchange not found' });
    }

    // Reverse the original transaction effects first
    const originalSaleAccount = await Account.findOne({
      where: {
        customerId: exchange.customerId,
        moneyTypeId: exchange.saleMoneyType,
      },
      transaction: t,
    });
    const originalPurchaseAccount = await Account.findOne({
      where: {
        customerId: exchange.customerId,
        moneyTypeId: exchange.purchaseMoneyType,
      },
      transaction: t,
    });

    if (!originalSaleAccount || !originalPurchaseAccount) {
      await t.rollback();
      return res.status(404).json({ message: 'Original accounts not found' });
    }

    // Reverse original transaction
    if (exchange.swap) {
      await Account.update(
        { credit: sequelize.literal(`credit + ${exchange.purchaseAmount}`) },
        { where: { No: originalPurchaseAccount.No }, transaction: t }
      );
      await Account.update(
        { credit: sequelize.literal(`credit - ${exchange.saleAmount}`) },
        { where: { No: originalSaleAccount.No }, transaction: t }
      );
    } else {
      await Account.update(
        { credit: sequelize.literal(`credit + ${exchange.saleAmount}`) },
        { where: { No: originalSaleAccount.No }, transaction: t }
      );
      await Account.update(
        { credit: sequelize.literal(`credit - ${exchange.purchaseAmount}`) },
        { where: { No: originalPurchaseAccount.No }, transaction: t }
      );
    }

    // Prepare update data
    const updateData = {};
    const fieldsToUpdate = [
      'rate',
      'description',
      'fingerprint',
      'photo',
      'swap',
      'calculate',
      'saleMoneyType',
      'purchaseMoneyType',
      'exchangerId',
      'employeeId',
      'customerId',
      'transferId',
      'receiveId',
    ];

    fieldsToUpdate.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    // Handle amount calculations if needed
    let finalSaleAmount =
      saleAmount !== undefined ? saleAmount : exchange.saleAmount;
    let finalPurchaseAmount =
      purchaseAmount !== undefined ? purchaseAmount : exchange.purchaseAmount;
    const finalRate = rate !== undefined ? rate : exchange.rate;

    // Recalculate amounts if calculate flag is true or amounts changed
    const shouldRecalculate =
      calculate !== false &&
      (saleAmount !== undefined ||
        purchaseAmount !== undefined ||
        rate !== undefined);

    if (shouldRecalculate) {
      if (saleAmount !== undefined && purchaseAmount === undefined) {
        finalPurchaseAmount = saleAmount * finalRate;
      } else if (purchaseAmount !== undefined && saleAmount === undefined) {
        finalSaleAmount = purchaseAmount / finalRate;
      } else if (rate !== undefined) {
        // If rate changed but amounts didn't, recalculate based on original direction
        if (saleAmount === undefined && purchaseAmount === undefined) {
          finalPurchaseAmount = exchange.saleAmount * finalRate;
          finalSaleAmount = exchange.saleAmount; // Keep original sale amount
        }
      }
    }

    // Add amounts to update data
    updateData.saleAmount = finalSaleAmount;
    updateData.purchaseAmount = finalPurchaseAmount;
    if (rate !== undefined) updateData.rate = finalRate;

    // Validate money types if changed
    if (saleMoneyType !== undefined || purchaseMoneyType !== undefined) {
      const finalSaleMoneyType =
        saleMoneyType !== undefined ? saleMoneyType : exchange.saleMoneyType;
      const finalPurchaseMoneyType =
        purchaseMoneyType !== undefined
          ? purchaseMoneyType
          : exchange.purchaseMoneyType;

      const saleMoneyTypeValid = await MoneyType.findOne({
        where: { id: finalSaleMoneyType, organizationId: orgId },
        transaction: t,
      });
      const purchaseMoneyTypeValid = await MoneyType.findOne({
        where: { id: finalPurchaseMoneyType, organizationId: orgId },
        transaction: t,
      });

      if (!saleMoneyTypeValid || !purchaseMoneyTypeValid) {
        await t.rollback();
        return res.status(400).json({ message: 'Invalid currency types' });
      }
    }

    // Find new accounts if customer or money types changed
    const finalCustomerId =
      customerId !== undefined ? customerId : exchange.customerId;
    const finalSaleMoneyType =
      saleMoneyType !== undefined ? saleMoneyType : exchange.saleMoneyType;
    const finalPurchaseMoneyType =
      purchaseMoneyType !== undefined
        ? purchaseMoneyType
        : exchange.purchaseMoneyType;
    const finalSwap = swap !== undefined ? swap : exchange.swap;

    const newSaleAccount = await Account.findOne({
      where: { customerId: finalCustomerId, moneyTypeId: finalSaleMoneyType },
      transaction: t,
    });
    const newPurchaseAccount = await Account.findOne({
      where: {
        customerId: finalCustomerId,
        moneyTypeId: finalPurchaseMoneyType,
      },
      transaction: t,
    });

    if (!newSaleAccount || !newPurchaseAccount) {
      await t.rollback();
      return res.status(404).json({
        message: 'Customer accounts not found for specified currencies',
      });
    }

    // Apply new transaction effects
    if (finalSwap) {
      await Account.update(
        { credit: sequelize.literal(`credit - ${finalPurchaseAmount}`) },
        { where: { No: newPurchaseAccount.No }, transaction: t }
      );
      await Account.update(
        { credit: sequelize.literal(`credit + ${finalSaleAmount}`) },
        { where: { No: newSaleAccount.No }, transaction: t }
      );
    } else {
      await Account.update(
        { credit: sequelize.literal(`credit - ${finalSaleAmount}`) },
        { where: { No: newSaleAccount.No }, transaction: t }
      );
      await Account.update(
        { credit: sequelize.literal(`credit + ${finalPurchaseAmount}`) },
        { where: { No: newPurchaseAccount.No }, transaction: t }
      );
    }

    // Update exchange record
    await exchange.update(updateData, { transaction: t });

    // Update exchange remaining record if it exists
    const exchangeRemaining = await ExchangeRemaining.findOne({
      where: {
        /* You might want to add exchangeId field to link them */
      },
      transaction: t,
    });

    if (exchangeRemaining) {
      await exchangeRemaining.update(
        {
          purchaseRemaining: finalPurchaseAmount,
          purchaseRemainingCurrency: finalPurchaseMoneyType,
          costedAmount: finalSaleAmount,
          costedAmountCurrency: finalSaleMoneyType,
          eDate: new Date(),
        },
        { transaction: t }
      );
    }

    await t.commit();
    res.status(200).json({
      message: 'Exchange updated successfully',
      exchange: await Exchange.findByPk(id, {
        include: [
          { model: MoneyType, as: 'SaleType' },
          { model: MoneyType, as: 'PurchaseType' },
        ],
      }),
    });
  } catch (err) {
    await t.rollback();
    res.status(500).json({
      message: err.message,
    });
  }
};
