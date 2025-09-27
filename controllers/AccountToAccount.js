const { Op } = require('sequelize');
const {
  sequelize,
  Account,
  AccountToAccount,
  Customer,
  Stakeholder,
  Person,
  MoneyType,
} = require('../models');

exports.createAccountToAccount = async (req, res) => {
  const {
    fromAccount,
    toAccount,
    amount,
    description,
    employeeId,
    fingerprint,
  } = req.body;

  const orgId = req.orgId;

  if (!fromAccount || !toAccount || !amount) {
    return res
      .status(400)
      .json({ message: 'fromAccount, toAccount and amount are required.' });
  }
  if (fromAccount === toAccount) {
    return res
      .status(400)
      .json({ message: 'fromAccount and toAccount must be different.' });
  }

  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) {
    return res
      .status(400)
      .json({ message: 'amount must be a positive number.' });
  }

  try {
    const result = await sequelize.transaction(async (t) => {
      const lock = t.LOCK.UPDATE;

      const originAccount = await Account.findOne({
        where: { No: fromAccount },
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
        lock,
      });

      if (!originAccount) {
        return {
          httpError: {
            code: 404,
            message: 'origin account not found (or not in your organization).',
          },
        };
      }

      const destAccount = await Account.findOne({
        where: { No: toAccount },
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
        lock,
      });

      if (!destAccount) {
        return {
          httpError: {
            code: 404,
            message:
              'Destination account not found (or not in your organization).',
          },
        };
      }

      if (originAccount.moneyTypeId !== destAccount.moneyTypeId) {
        return {
          httpError: {
            code: 400,
            message:
              'the origin account and destinition acccount should be the same type',
          },
        };
      }

      await originAccount.decrement('credit', { by: amt, transaction: t });
      await destAccount.increment('credit', { by: amt, transaction: t });

      const transfer = await AccountToAccount.create(
        {
          fromAccount,
          toAccount,
          amount: amt,
          tDate: new Date(),
          description,
          organizationId: orgId,
          employeeId,
          fingerprint,
        },
        { transaction: t }
      );

      return { transfer };
    });

    if (result?.httpError) {
      return res
        .status(result.httpError.code)
        .json({ message: result.httpError.message });
    }

    return res.status(201).json({
      message: 'Transaction created successfully.',
      data: result.transfer,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.updateAccountToAccount = async (req, res) => {
  const { id } = req.params;
  const {
    fromAccount,
    toAccount,
    amount,
    description,
    employeeId,
    fingerprint,
  } = req.body;

  const orgId = req.orgId;

  try {
    const result = await sequelize.transaction(async (t) => {
      const transfer = await AccountToAccount.findOne({
        where: { No: id, organizationId: orgId, deleted: false },
        transaction: t,
      });

      if (!transfer) {
        return { httpError: { code: 404, message: 'Transaction not found' } };
      }

      if (
        fromAccount &&
        toAccount &&
        amount &&
        (transfer.fromAccount !== fromAccount ||
          transfer.toAccount !== toAccount ||
          Number(transfer.amount) !== Number(amount))
      ) {
        // Reverse old balances
        const origin = await Account.findByPk(transfer.fromAccount, {
          transaction: t,
          lock: t.LOCK.UPDATE,
        });
        const dest = await Account.findByPk(transfer.toAccount, {
          transaction: t,
          lock: t.LOCK.UPDATE,
        });

        await origin.increment('credit', {
          by: transfer.amount,
          transaction: t,
        });
        await dest.decrement('credit', { by: transfer.amount, transaction: t });

        // Apply new balances
        const newOrigin = await Account.findByPk(fromAccount, {
          transaction: t,
          lock: t.LOCK.UPDATE,
        });
        const newDest = await Account.findByPk(toAccount, {
          transaction: t,
          lock: t.LOCK.UPDATE,
        });

        await newOrigin.decrement('credit', { by: amount, transaction: t });
        await newDest.increment('credit', { by: amount, transaction: t });

        transfer.fromAccount = fromAccount;
        transfer.toAccount = toAccount;
        transfer.amount = amount;
      }

      // Update other fields
      if (description !== undefined) transfer.description = description;
      if (employeeId !== undefined) transfer.employeeId = employeeId;
      if (fingerprint !== undefined) transfer.fingerprint = fingerprint;

      await transfer.save({ transaction: t });

      return { transfer };
    });

    if (result?.httpError) {
      return res
        .status(result.httpError.code)
        .json({ message: result.httpError.message });
    }

    return res.status(200).json({
      message: 'Transaction updated successfully.',
      data: result.transfer,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.getTransferToAccount = async (req, res) => {
  try {
    const { search = '', searchTo = '', limit = 10, page = 1 } = req.query;

    const parsedLimit = parseInt(limit) || 10;
    const parsedPage = parseInt(page) || 1;
    const offset = (parsedPage - 1) * parsedLimit;

    const whereFromPerson = {
      organizationId: req.orgId,
      ...(search && {
        [Op.or]: [
          { firstName: { [Op.like]: `%${search}%` } },
          { lastName: { [Op.like]: `%${search}%` } },
        ],
      }),
    };

    const whereToPerson = {
      organizationId: req.orgId,
      ...(searchTo && {
        [Op.or]: [
          { firstName: { [Op.like]: `%${searchTo}%` } },
          { lastName: { [Op.like]: `%${searchTo}%` } },
        ],
      }),
    };

    const whereAccountToAccount = {
      organizationId: req.orgId,
      deleted: false,
    };

    const { rows, count } = await AccountToAccount.findAndCountAll({
      where: whereAccountToAccount,
      include: [
        {
          model: Account,
          as: 'FromAccount',
          required: true,
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
                      where: whereFromPerson,
                    },
                  ],
                },
              ],
            },
            { model: MoneyType },
          ],
        },
        {
          model: Account,
          as: 'ToAccount',
          required: true,
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
                      where: whereToPerson,
                    },
                  ],
                },
              ],
            },
            { model: MoneyType },
          ],
        },
      ],
      limit: parsedLimit,
      offset,
      order: [['tDate', 'DESC']],
    });

    res.status(200).json({
      data: rows,
      total: count,
      page: parsedPage,
      limit: parsedLimit,
    });
  } catch (err) {
    console.error('getTransferToAccount error:', err);
    res.status(500).json({ message: err.message });
  }
};

exports.deleteAccountToAccount = async (req, res) => {
  const { id } = req.params;
  const orgId = req.orgId;

  try {
    const result = await sequelize.transaction(async (t) => {
      const transfer = await AccountToAccount.findOne({
        where: { No: id, organizationId: orgId, deleted: false },
        transaction: t,
      });

      if (!transfer) {
        return { httpError: { code: 404, message: 'Transaction not found' } };
      }

      const origin = await Account.findByPk(transfer.fromAccount, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      const dest = await Account.findByPk(transfer.toAccount, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      await origin.increment('credit', { by: transfer.amount, transaction: t });
      await dest.decrement('credit', { by: transfer.amount, transaction: t });

      transfer.deleted = true;
      await transfer.save({ transaction: t });

      return { transfer };
    });

    if (result?.httpError) {
      return res
        .status(result.httpError.code)
        .json({ message: result.httpError.message });
    }

    return res.status(200).json({
      message: 'Transaction deleted successfully.',
      data: result.transfer,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
