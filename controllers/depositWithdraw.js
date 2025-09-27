const {
  sequelize,
  DepositWithdraw,
  Account,
  Employee,
  Customer,
  Stakeholder,
  Person,
  MoneyType,
} = require('../models');

const { Op } = require('sequelize');

const notificationService = require('../services/notificationService');

exports.createDepositWithdraw = async (req, res) => {
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

    // ✅ validation
    if (!deposit && !withdraw) {
      await t.rollback();
      return res.status(400).json({
        message: 'Must provide either deposit or withdraw amount, not both',
      });
    }

    if ((deposit && deposit <= 0) || (withdraw && withdraw <= 0)) {
      await t.rollback();
      return res.status(400).json({
        message: 'Amount must be greater than zero',
      });
    }

    // ✅ get next No
    const lastTransaction = await DepositWithdraw.findOne({
      where: { organizationId: orgId },
      order: [['No', 'DESC']],
      transaction: t,
    });
    const nextNo = lastTransaction ? lastTransaction.No + 1 : 1;

    // ✅ verify account
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
        {
          model: MoneyType,
          required: true,
        },
      ],
      transaction: t,
    });
    if (!account) {
      await t.rollback();
      return res.status(404).json({ message: 'Account not found' });
    }

    // ✅ verify employee
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

    // ✅ create transaction
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

    // ✅ update balance
    const amount = deposit || -withdraw;
    await Account.update(
      { credit: sequelize.literal(`credit + ${amount}`) },
      { where: { No: accountNo }, transaction: t }
    );

    const allowedChannels = ['whatsapp', 'telegram', 'websocket'];
    const channels = (req.body.channels || []).filter((ch) =>
      allowedChannels.includes(ch)
    );

    const notifOptions = {
      channels: Array.isArray(req.body.channels)
        ? req.body.channels
        : undefined,
      includeWebsocket: false,
      failSoft: true,
      save: true,
    };

    await notificationService.sendNotification(
      'customer',
      account.customerId,
      {
        type: deposit ? 'deposit' : 'withdrawal',
        amount: deposit || withdraw,
        accountNo: account.No,
        balance: account.credit,
        moneyType: account.MoneyType.TypeName,
        data: transaction,
      },
      {
        channels,
        failSoft: true,
      },
      notifOptions
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
};

// Get all transactions for an account
// (exports.getDepositWithdraws = async (req, res) => {
//   try {
//     const { accountNo } = req.params;

//     const transactions = await DepositWithdraw.findAll({
//       where: { accountNo, organizationId: req.orgId, deleted: false },
//       include: [
//         { model: Employee, attributes: ['id', 'name'] },
//         { model: Account, attributes: ['No', 'credit'] },
//       ],
//       order: [['DWDate', 'DESC']],
//     });

//     if (!transactions) {
//       res.status(404).json('not found ');
//     }

//     res.json(transactions);
//   } catch (err) {
//     res.status(500).json({
//       message: err.message,
//       stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
//     });
//   }
// }),

(exports.getDeposits = async (req, res) => {
  try {
    const { search, limit = 10, page = 1 } = req.query;

    const wherePerson = {
      [Op.and]: [
        { organizationId: req.orgId },
        search
          ? {
              [Op.or]: [
                { firstName: { [Op.like]: `%${search}%` } },
                { lastName: { [Op.like]: `%${search}%` } },
              ],
            }
          : {},
      ],
    };

    const offset = (page - 1) * limit;

    const { rows, count } = await DepositWithdraw.findAndCountAll({
      where: { organizationId: req.orgId, deposit: { [Op.gt]: 0 } },
      include: [
        {
          model: Account,
          required: true,
          attributes: ['No', 'credit'],
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
                      where: wherePerson,
                    },
                  ],
                },
              ],
            },
            { model: MoneyType },
          ],
        },
      ],
      order: [['DWDate', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    if (!rows) {
      return res.status(404).json('not found ');
    }

    res.json({
      data: rows,
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }
}),
  (exports.getWithdraws = async (req, res) => {
    try {
      const { search, limit = 10, page = 1 } = req.query;

      const wherePerson = {
        [Op.and]: [
          { organizationId: req.orgId },
          search
            ? {
                [Op.or]: [
                  { firstName: { [Op.like]: `%${search}%` } },
                  { lastName: { [Op.like]: `%${search}%` } },
                ],
              }
            : {},
        ],
      };

      const offset = (page - 1) * limit;

      const { rows, count } = await DepositWithdraw.findAndCountAll({
        where: { organizationId: req.orgId, withdraw: { [Op.gt]: 0 } },
        include: [
          {
            model: Account,
            required: true,
            attributes: ['No', 'credit'],
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
                        where: wherePerson,
                      },
                    ],
                  },
                ],
              },
              { model: MoneyType },
            ],
          },
        ],
        order: [['DWDate', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset),
      });

      if (!rows) {
        return res.status(404).json('not found ');
      }

      res.json({
        data: rows,
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
      });
    } catch (err) {
      res.status(500).json({
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      });
    }
  }),
  (exports.updateDepositWithdraw = async (req, res) => {
    const t = await sequelize.transaction();
    try {
      const { id } = req.params;
      const orgId = req.orgId;

      const {
        deposit,
        withdraw,
        description,
        employeeId,
        accountNo,
        fingerprint,
        photo,
        deleted = false,
        WithdrawReturnDate,
      } = req.body;

      // ---- helpers ----
      const toNum = (v) => (v === undefined || v === null ? 0 : Number(v));
      const round3 = (v) =>
        Math.round((Number(v) + Number.EPSILON) * 1000) / 1000;

      const hasDeposit = deposit !== undefined && deposit !== null;
      const hasWithdraw = withdraw !== undefined && withdraw !== null;

      // Validate amount intent (allow metadata-only updates: neither deposit nor withdraw provided)
      if (hasDeposit && hasWithdraw) {
        await t.rollback();
        return res
          .status(400)
          .json({ message: 'Provide either deposit OR withdraw, not both.' });
      }
      if (hasDeposit && Number(deposit) <= 0) {
        await t.rollback();
        return res
          .status(400)
          .json({ message: 'Deposit must be greater than zero.' });
      }
      if (hasWithdraw && Number(withdraw) <= 0) {
        await t.rollback();
        return res
          .status(400)
          .json({ message: 'Withdraw must be greater than zero.' });
      }

      // Lock the existing row to prevent race conditions
      const existing = await DepositWithdraw.findOne({
        where: { No: id, organizationId: orgId },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!existing) {
        await t.rollback();
        return res.status(404).json({ message: 'Transaction not found.' });
      }

      // Old values/effect
      const oldDeposit = toNum(existing.deposit);
      const oldWithdraw = toNum(existing.withdraw);
      const oldEffect = round3(oldDeposit - oldWithdraw); // + increases credit, - decreases credit
      const oldAccountNo = existing.accountNo;

      // New values/effect (if amount not provided, keep old)
      const newDeposit = hasDeposit ? toNum(deposit) : oldDeposit;
      const newWithdraw = hasWithdraw ? toNum(withdraw) : oldWithdraw;
      const newEffect = round3(newDeposit - newWithdraw);
      const newAccountNo = accountNo ?? oldAccountNo;

      // Persist the transaction changes first
      const [updateCount] = await DepositWithdraw.update(
        {
          // Keep only one of deposit/withdraw; if one is > 0, null the other.
          deposit: newDeposit > 0 ? newDeposit : 0,
          withdraw: newWithdraw > 0 ? newWithdraw : 0,

          description: description ?? existing.description,
          employeeId: employeeId ?? existing.employeeId,
          accountNo: newAccountNo,
          fingerprint: fingerprint ?? existing.fingerprint,
          photo: photo ?? existing.photo,
          deleted: deleted ?? existing.deleted,
          WithdrawReturnDate: WithdrawReturnDate ?? existing.WithdrawReturnDate,
        },
        {
          where: { No: id, organizationId: orgId },
          transaction: t,
        }
      );

      if (updateCount === 0) {
        await t.rollback();
        return res.status(404).json({ message: 'Transaction not updated.' });
      }

      // Helper to apply a delta to an account's credit, formatting SQL cleanly (no "+ -33")
      const applyDelta = async (accNo, delta) => {
        const d = round3(delta);
        if (!d) return;
        const op = d >= 0 ? '+' : '-';
        const abs = Math.abs(d);
        await Account.update(
          { credit: sequelize.literal(`credit ${op} ${abs}`) },
          {
            where: {
              No: accNo,
            },
            transaction: t,
          }
        );
      };

      // Update account balances
      if (newAccountNo === oldAccountNo) {
        const delta = round3(newEffect - oldEffect);
        await applyDelta(newAccountNo, delta);
      } else {
        await applyDelta(oldAccountNo, -oldEffect);
        await applyDelta(newAccountNo, +newEffect);
      }

      await t.commit();

      const updatedTransaction = await DepositWithdraw.findOne({
        where: { No: id, organizationId: orgId },
      });

      return res.status(200).json({
        message: 'Transaction updated successfully.',
        transaction: updatedTransaction,
      });
    } catch (err) {
      try {
        await t.rollback();
      } catch (_) {}
      return res.status(500).json({
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      });
    }
  });

exports.deleteDepositWithdraw = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const orgId = req.orgId;

    // Lock the transaction row for safe update
    const existing = await DepositWithdraw.findOne({
      where: { No: id, organizationId: orgId, deleted: false },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!existing) {
      await t.rollback();
      return res
        .status(404)
        .json({ message: 'Transaction not found or already deleted.' });
    }

    // Get amounts
    const oldDeposit = Number(existing.deposit || 0);
    const oldWithdraw = Number(existing.withdraw || 0);
    const oldEffect = oldDeposit - oldWithdraw; // Positive = credit increase, negative = decrease
    const accountNo = existing.accountNo;

    // Reverse effect from account
    const delta = -oldEffect; // Reverse means negate the original effect
    const op = delta >= 0 ? '+' : '-';
    const absDelta = Math.abs(delta);

    await Account.update(
      { credit: sequelize.literal(`credit ${op} ${absDelta}`) },
      {
        where: {
          No: accountNo,
        },
        transaction: t,
      }
    );

    // Mark the transaction as deleted (soft delete)
    await DepositWithdraw.update(
      { deleted: true },
      {
        where: { No: id, organizationId: orgId },
        transaction: t,
      }
    );

    await t.commit();

    res.status(200).json({
      message: 'Transaction deleted and account reversed successfully.',
    });
  } catch (err) {
    try {
      await t.rollback();
    } catch (_) {}
    res.status(500).json({
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }
};
