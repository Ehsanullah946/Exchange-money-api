// services/tillService.js
const {
  Till,
  DepositWithdraw,
  Transfer,
  Receive,
  sequelize,
} = require('../models');

class TillService {
  // Get or create today's till
  async getOrCreateTodayTill(orgId, userId) {
    const today = new Date().toISOString().split('T')[0];

    let till = await Till.findOne({
      where: {
        organizationId: orgId,
        date: today,
      },
    });

    if (!till) {
      // Get yesterday's closing balance
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const yesterdayTill = await Till.findOne({
        where: {
          organizationId: orgId,
          date: yesterdayStr,
        },
      });

      const openingBalance = yesterdayTill
        ? parseFloat(yesterdayTill.closingBalance)
        : 0.0;

      till = await Till.create({
        organizationId: orgId,
        date: today,
        openingBalance,
        createdBy: userId,
      });
    }

    return till;
  }

  // Update till totals from transactions
  // Update till totals from transactions
  async updateTillTotals(orgId) {
    const today = new Date().toISOString().split('T')[0];

    const till = await Till.findOne({
      where: {
        organizationId: orgId,
        date: today,
      },
    });

    if (!till) {
      throw new Error('No till found for today');
    }

    // Combine totals from DepositWithdraw + Transfer + Receive + Exchange
    const [results] = await sequelize.query(
      `
    SELECT
      -- 💰 Total incoming money
      (
        COALESCE(SUM(DW.deposit), 0)
        + COALESCE(SUM(R.amount), 0)
        + COALESCE(SUM(E.toAmount), 0)
      ) AS totalIn,

      -- 💸 Total outgoing money
      (
        COALESCE(SUM(DW.withdraw), 0)
        + COALESCE(SUM(E.fromAmount), 0)
      ) AS totalOut

    FROM DepositWithdraws DW
    LEFT JOIN Receives R 
      ON R.organizationId = DW.organizationId
      AND DATE(R.receiveDate) = :today
      AND R.deleted = false

    LEFT JOIN Exchanges E
      ON E.organizationId = DW.organizationId
      AND DATE(E.exchangeDate) = :today
      AND E.deleted = false

    WHERE DW.organizationId = :orgId
      AND DATE(DW.DWDate) = :today
      AND DW.deleted = false
    `,
      {
        replacements: { orgId, today },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    await till.update({
      totalIn: parseFloat(results.totalIn) || 0,
      totalOut: parseFloat(results.totalOut) || 0,
      closingBalance:
        till.openingBalance +
        parseFloat(results.totalIn || 0) -
        parseFloat(results.totalOut || 0),
    });

    return till;
  }

  // Close till for the day
  async closeTill(orgId, actualCash, notes, userId) {
    const today = new Date().toISOString().split('T')[0];

    const till = await Till.findOne({
      where: {
        organizationId: orgId,
        date: today,
        status: 'open',
      },
    });

    if (!till) {
      throw new Error('No open till found for today');
    }

    // Update totals before closing
    await this.updateTillTotals(orgId);
    await till.reload();

    return await till.update({
      actualCash: parseFloat(actualCash),
      notes,
      status: 'closed',
      closedBy: userId,
    });
  }

  // Get till summary
  async getTillSummary(orgId, startDate, endDate) {
    const whereClause = {
      organizationId: orgId,
    };

    if (startDate && endDate) {
      whereClause.date = {
        [sequelize.Op.between]: [startDate, endDate],
      };
    }

    return await Till.findAll({
      where: whereClause,
      order: [['date', 'DESC']],
      attributes: [
        'id',
        'date',
        'openingBalance',
        'totalIn',
        'totalOut',
        'closingBalance',
        'actualCash',
        'difference',
        'status',
        'notes',
      ],
    });
  }

  // Get cash flow breakdown
  // Get cash flow breakdown
  async getCashFlowBreakdown(orgId, date) {
    const [deposits] = await sequelize.query(
      `
    SELECT 
      'deposit' as type,
      COALESCE(SUM(deposit), 0) as amount,
      COUNT(*) as count
    FROM DepositWithdraws 
    WHERE organizationId = :orgId 
      AND DATE(DWDate) = :date
      AND deposit > 0
      AND deleted = false
    `,
      {
        replacements: { orgId, date },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    const [withdrawals] = await sequelize.query(
      `
    SELECT 
      'withdraw' as type,
      COALESCE(SUM(withdraw), 0) as amount,
      COUNT(*) as count
    FROM DepositWithdraws 
    WHERE organizationId = :orgId 
      AND DATE(DWDate) = :date
      AND withdraw > 0
      AND deleted = false
    `,
      {
        replacements: { orgId, date },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    const [exchangesOut] = await sequelize.query(
      `
    SELECT 
      'exchange_out' as type,
      COALESCE(SUM(fromAmount), 0) as amount,
      COUNT(*) as count
    FROM Exchanges
    WHERE organizationId = :orgId 
      AND DATE(exchangeDate) = :date
      AND deleted = false
    `,
      {
        replacements: { orgId, date },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    const [exchangesIn] = await sequelize.query(
      `
    SELECT 
      'exchange_in' as type,
      COALESCE(SUM(toAmount), 0) as amount,
      COUNT(*) as count
    FROM Exchanges
    WHERE organizationId = :orgId 
      AND DATE(exchangeDate) = :date
      AND deleted = false
    `,
      {
        replacements: { orgId, date },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    return {
      deposits,
      withdrawals,
      exchangesOut,
      exchangesIn,
    };
  }
}

module.exports = new TillService();
