const {
  sequelize,
  DepositWithdraw,
  Account,
  Employee,
  Customer,
  Stakeholder,
  Person,
} = require('../models');

(exports.createDepositWithdraw = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      deposit,
      withdraw,
      description,
      employeeId,
      accountNo,
      fingerprint,
      photo,
      WithdrawReturnDate,
    } = req.body;

    const orgId = req.orgId;

    // Validate that either deposit or withdraw is provided, but not both
    if ((!deposit && !withdraw) || (deposit && withdraw)) {
      await t.rollback();
      return res.status(400).json({
        message: 'Must provide either deposit or withdraw amount, not both',
      });
    }

    // Validate amounts are positive
    if ((deposit && deposit <= 0) || (withdraw && withdraw <= 0)) {
      await t.rollback();
      return res.status(400).json({
        message: 'Amount must be greater than zero',
      });
    }

    // Get the next transaction number for this organization
    const lastTransaction = await DepositWithdraw.findOne({
      where: { organizationId: orgId },
      order: [['No', 'DESC']],
      transaction: t,
    });
    const nextNo = lastTransaction ? lastTransaction.No + 1 : 1;

    // Verify account exists
    const account = await Account.findOne({
      where: { No: accountNo },
      include: [
        {
          model: Customer,
          required: true,
          include: [
            {
              model: Stakeholder,
              required: true,
              include: [
                {
                  model: Person,
                  required: true,
                  where: { organizationId: orgId },
                },
              ],
            },
          ],
        },
      ],
      transaction: t,
    });
    if (!account) {
      await t.rollback();
      return res.status(404).json({ message: 'Account not found' });
    }

    // Verify employee exists
    if (employeeId) {
      const employee = await Employee.findOne({
        where: { id: employeeId },
        include: [
          {
            model: Stakeholder,
            required: true,
            include: [
              {
                model: Person,
                required: true,
                where: { organizationId: orgId },
              },
            ],
          },
        ],

        transaction: t,
      });
      if (!employee) {
        await t.rollback();
        return res.status(404).json({ message: 'Employee not found' });
      }
    }

    // Create the transaction record
    const transaction = await DepositWithdraw.create(
      {
        No: nextNo,
        deposit: deposit || 0,
        withdraw: withdraw || 0,
        DWDate: new Date(),
        description,
        employeeId,
        accountNo,
        organizationId: orgId,
        fingerprint,
        photo,
        WithdrawReturnDate,
        deleted: false,
      },
      { transaction: t }
    );

    // Update account balance
    const amount = deposit || -withdraw;
    await Account.update(
      { credit: sequelize.literal(`credit + ${amount}`) },
      { where: { No: accountNo }, transaction: t }
    );

    await t.commit();
    res.status(201).json({
      message: 'Transaction completed successfully',
      transaction,
    });
  } catch (err) {
    await t.rollback();
    res.status(500).json({
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }
}),
  // Get all transactions for an account
  (exports.getAccountTransactions = async (req, res) => {
    try {
      const { accountNo, organizationId } = req.params;

      const transactions = await DepositWithdraw.findAll({
        where: { accountNo, organizationId, deleted: false },
        include: [
          { model: Employee, attributes: ['id', 'name'] },
          { model: Account, attributes: ['No', 'credit'] },
        ],
        order: [['DWDate', 'DESC']],
      });

      res.json(transactions);
    } catch (err) {
      res.status(500).json({
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      });
    }
  }),
  // Update a transaction (typically for marking withdrawal returns)
  (exports.updateTransaction = async (req, res) => {
    const t = await sequelize.transaction();
    try {
      const { id } = req.params;
      const { WithdrawReturnDate, description } = req.body;

      const transaction = await DepositWithdraw.findOne({
        where: { No: id, organizationId: req.orgId },
        transaction: t,
      });

      if (!transaction) {
        await t.rollback();
        return res.status(404).json({ message: 'Transaction not found' });
      }

      // Only allow updating certain fields
      const updates = {};
      if (WithdrawReturnDate) updates.WithdrawReturnDate = WithdrawReturnDate;
      if (description) updates.description = description;

      await transaction.update(updates, { transaction: t });
      await t.commit();

      res.json({
        message: 'Transaction updated successfully',
        transaction,
      });
    } catch (err) {
      await t.rollback();
      res.status(500).json({
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      });
    }
  }),
  // Soft delete a transaction
  (exports.deleteTransaction = async (req, res) => {
    const t = await sequelize.transaction();
    try {
      const { id } = req.params;

      const transaction = await DepositWithdraw.findOne({
        where: { No: id, organizationId: req.orgId },
        transaction: t,
      });

      if (!transaction) {
        await t.rollback();
        return res.status(404).json({ message: 'Transaction not found' });
      }

      // Reverse the transaction effect on account balance
      const amount = transaction.deposit || -transaction.withdraw;
      await Account.update(
        { credit: sequelize.literal(`credit - ${amount}`) },
        {
          where: { No: transaction.accountNo, organizationId: req.orgId },
          transaction: t,
        }
      );

      // Mark as deleted
      await transaction.update({ deleted: true }, { transaction: t });
      await t.commit();

      res.json({ message: 'Transaction deleted successfully' });
    } catch (err) {
      await t.rollback();
      res.status(500).json({
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      });
    }
  });
