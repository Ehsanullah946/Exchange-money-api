const { sequelize, MoneyType, Account } = require('../models');
let Till;
try {
  Till = require('../models').Till;
} catch (error) {
  console.error('❌ Till model not found');
}

class TillService {
  async getOrCreateTodayTills(orgId, userId) {
    try {
      console.log('🔧 Getting or creating tills for org:', orgId);

      const today = new Date().toISOString().split('T')[0];

      if (!Till) {
        throw new Error('Till model is not available');
      }

      // Get all money types for this organization
      const moneyTypes = await MoneyType.findAll({
        where: { organizationId: orgId },
      });

      if (!moneyTypes.length) {
        throw new Error('No money types found for organization');
      }

      const tills = [];

      for (const moneyType of moneyTypes) {
        let till = await Till.findOne({
          where: {
            organizationId: orgId,
            date: today,
            moneyTypeId: moneyType.id,
          },
          include: [{ model: MoneyType, as: 'moneyType' }],
        });

        if (!till) {
          console.log(
            `📝 Creating new till for ${moneyType.typeName} on ${today}`
          );

          // Get yesterday's closing balance for this money type
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];

          const yesterdayTill = await Till.findOne({
            where: {
              organizationId: orgId,
              date: yesterdayStr,
              moneyTypeId: moneyType.id,
            },
          });

          const openingBalance = yesterdayTill
            ? parseFloat(yesterdayTill.closingBalance)
            : 0.0;

          till = await Till.create({
            organizationId: orgId,
            date: today,
            moneyTypeId: moneyType.id,
            openingBalance,
            createdBy: userId,
            status: 'open',
          });

          // Reload with moneyType association
          till = await Till.findByPk(till.id, {
            include: [{ model: MoneyType, as: 'moneyType' }],
          });
        }

        tills.push(till);
      }

      return tills;
    } catch (error) {
      console.error('❌ Error in getOrCreateTodayTills:', error);
      throw error;
    }
  }

  // Get today's till for a specific money type
  async getOrCreateTodayTill(orgId, userId, moneyTypeId = null) {
    try {
      const today = new Date().toISOString().split('T')[0];

      if (moneyTypeId) {
        // Get specific money type till
        return await this.getOrCreateMoneyTypeTill(
          orgId,
          userId,
          moneyTypeId,
          today
        );
      } else {
        // Get all money type tills
        return await this.getOrCreateTodayTills(orgId, userId);
      }
    } catch (error) {
      console.error('❌ Error in getOrCreateTodayTill:', error);
      throw error;
    }
  }

  // Helper method for single money type till
  async getOrCreateMoneyTypeTill(orgId, userId, moneyTypeId, date) {
    let till = await Till.findOne({
      where: {
        organizationId: orgId,
        date: date,
        moneyTypeId: moneyTypeId,
      },
      include: [{ model: MoneyType, as: 'moneyType' }],
    });

    if (!till) {
      // Get yesterday's closing balance
      const yesterday = new Date(date);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const yesterdayTill = await Till.findOne({
        where: {
          organizationId: orgId,
          date: yesterdayStr,
          moneyTypeId: moneyTypeId,
        },
      });

      const openingBalance = yesterdayTill
        ? parseFloat(yesterdayTill.closingBalance)
        : 0.0;

      till = await Till.create({
        organizationId: orgId,
        date: date,
        moneyTypeId: moneyTypeId,
        openingBalance,
        createdBy: userId,
        status: 'open',
      });

      // Reload with moneyType association
      till = await Till.findByPk(till.id, {
        include: [{ model: MoneyType, as: 'moneyType' }],
      });
    }

    return till;
  }

  // CORRECTED: Update till totals from transactions - Multi-currency version
  async updateTillTotals(orgId, moneyTypeId = null) {
    try {
      const today = new Date().toISOString().split('T')[0];

      if (moneyTypeId) {
        // Update specific money type till
        return await this.updateMoneyTypeTillTotals(orgId, moneyTypeId, today);
      } else {
        // Update all money type tills
        const moneyTypes = await MoneyType.findAll({
          where: { organizationId: orgId },
        });

        const updatedTills = [];
        for (const moneyType of moneyTypes) {
          const updatedTill = await this.updateMoneyTypeTillTotals(
            orgId,
            moneyType.id,
            today
          );
          updatedTills.push(updatedTill);
        }
        return updatedTills;
      }
    } catch (error) {
      console.error('❌ Error in updateTillTotals:', error);
      throw error;
    }
  }

  async updateMoneyTypeTillTotals(orgId, moneyTypeId, date) {
    try {
      console.log(
        `🔄 Starting updateMoneyTypeTillTotals for org: ${orgId}, moneyType: ${moneyTypeId}, date: ${date}`
      );

      const till = await Till.findOne({
        where: {
          organizationId: orgId,
          date: date,
          moneyTypeId: moneyTypeId,
        },
        include: [{ model: MoneyType, as: 'moneyType' }],
      });

      if (!till) {
        console.error(
          `❌ No till found for moneyType: ${moneyTypeId} on date: ${date}`
        );
        throw new Error(
          `No till found for money type ${moneyTypeId} on ${date}`
        );
      }

      console.log(`📊 Found till: ${till.id} for ${till.moneyType.typeName}`);

      // Get totals from each transaction type
      const queries = [
        // Deposits
        `SELECT COALESCE(SUM(dw.deposit), 0) as totalDeposits
       FROM depositWithdraw dw
       INNER JOIN accounts a ON dw.accountNo = a.No AND a.moneyTypeId = :moneyTypeId
       WHERE dw.organizationId = :orgId 
         AND DATE(dw.DWDate) = :date
         AND dw.deleted = false
         AND dw.deposit > 0`,

        // Withdrawals
        `SELECT COALESCE(SUM(dw.withdraw), 0) as totalWithdrawals
       FROM depositWithdraw dw
       INNER JOIN accounts a ON dw.accountNo = a.No AND a.moneyTypeId = :moneyTypeId
       WHERE dw.organizationId = :orgId 
         AND DATE(dw.DWDate) = :date
         AND dw.deleted = false
         AND dw.withdraw > 0`,

        // Receives
        `SELECT COALESCE(SUM(receiveAmount), 0) as totalReceives
       FROM receives 
       WHERE organizationId = :orgId 
         AND DATE(rDate) = :date
         AND moneyTypeId = :moneyTypeId
         AND deleted = false
         AND receiveAmount > 0`,

        // Transfers
        `SELECT COALESCE(SUM(transferAmount), 0) as totalTransfers
       FROM transfers 
       WHERE organizationId = :orgId 
         AND DATE(tDate) = :date
         AND moneyTypeId = :moneyTypeId
         AND deleted = false
         AND transferAmount > 0`,

        // Exchange Sales
        `SELECT COALESCE(SUM(saleAmount), 0) as totalSales
       FROM exchanges 
       WHERE organizationId = :orgId 
         AND DATE(eDate) = :date
         AND saleMoneyType = :moneyTypeId
         AND deleted = false
         AND saleAmount > 0`,

        // Exchange Purchases
        `SELECT COALESCE(SUM(purchaseAmount), 0) as totalPurchases
       FROM exchanges 
       WHERE organizationId = :orgId 
         AND DATE(eDate) = :date
         AND purchaseMoneyType = :moneyTypeId
         AND deleted = false
         AND purchaseAmount > 0`,
      ];

      const replacements = {
        orgId: parseInt(orgId),
        date: date,
        moneyTypeId: parseInt(moneyTypeId),
      };

      // Execute all queries
      const [
        depositResults,
        withdrawResults,
        receiveResults,
        transferResults,
        exchangeSaleResults,
        exchangePurchaseResults,
      ] = await Promise.all(
        queries.map((query) =>
          sequelize.query(query, {
            replacements,
            type: sequelize.QueryTypes.SELECT,
          })
        )
      );

      // Extract values safely
      const totalDeposits = parseFloat(depositResults[0]?.totalDeposits || 0);
      const totalWithdrawals = parseFloat(
        withdrawResults[0]?.totalWithdrawals || 0
      );
      const totalReceives = parseFloat(receiveResults[0]?.totalReceives || 0);
      const totalTransfers = parseFloat(
        transferResults[0]?.totalTransfers || 0
      );
      const totalSales = parseFloat(exchangeSaleResults[0]?.totalSales || 0);
      const totalPurchases = parseFloat(
        exchangePurchaseResults[0]?.totalPurchases || 0
      );

      console.log(`📈 ${till.moneyType.typeName} Raw Results:`, {
        deposits: totalDeposits,
        withdrawals: totalWithdrawals,
        receives: totalReceives,
        transfers: totalTransfers,
        exchangeSales: totalSales,
        exchangePurchases: totalPurchases,
      });

      // Calculate totals
      const totalIn = totalDeposits + totalReceives + totalSales;
      const totalOut = totalWithdrawals + totalTransfers + totalPurchases;
      const openingBalance = parseFloat(till.openingBalance);
      const closingBalance = openingBalance + totalIn - totalOut;

      console.log(`💰 ${till.moneyType.typeName} Calculated Totals:`, {
        openingBalance,
        totalIn,
        totalOut,
        closingBalance,
      });

      // Update the till
      console.log(`💾 Updating till ${till.id} with new totals...`);
      const updateResult = await till.update({
        totalIn,
        totalOut,
        closingBalance,
      });

      console.log(`✅ ${till.moneyType.typeName} till updated successfully:`, {
        id: till.id,
        totalIn: updateResult.totalIn,
        totalOut: updateResult.totalOut,
        closingBalance: updateResult.closingBalance,
      });

      return updateResult;
    } catch (error) {
      console.error(
        `❌ Error in updateMoneyTypeTillTotals for moneyType ${moneyTypeId}:`,
        error
      );
      throw error;
    }
  }

  // CORRECTED: Close till for specific money type
  async closeTill(orgId, closeData, userId) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { moneyTypeId, actualCash, notes } = closeData;

      console.log(
        `🔒 Closing till for money type: ${moneyTypeId}, org: ${orgId}`
      );

      const till = await Till.findOne({
        where: {
          organizationId: orgId,
          date: today,
          moneyTypeId: moneyTypeId,
          status: 'open',
        },
        include: [{ model: MoneyType, as: 'moneyType' }],
      });

      if (!till) {
        throw new Error(`No open till found for money type ${moneyTypeId}`);
      }

      // Update totals before closing
      await this.updateMoneyTypeTillTotals(orgId, moneyTypeId, today);
      await till.reload();

      const difference = parseFloat(actualCash) - till.closingBalance;

      console.log(`📊 Closing details for ${till.moneyType.typeName}:`, {
        actualCash,
        closingBalance: till.closingBalance,
        difference,
      });

      const closedTill = await till.update({
        actualCash: parseFloat(actualCash),
        difference,
        notes,
        status: 'closed',
        closedBy: userId,
        closedAt: new Date(),
      });

      return closedTill;
    } catch (error) {
      console.error('❌ Error in closeTill:', error);
      throw error;
    }
  }

  // Get till summary with money type filtering
  async getTillSummary(orgId, startDate, endDate, moneyTypeId = null) {
    try {
      const whereClause = {
        organizationId: orgId,
      };

      if (startDate && endDate) {
        whereClause.date = {
          [sequelize.Op.between]: [startDate, endDate],
        };
      }

      if (moneyTypeId) {
        whereClause.moneyTypeId = moneyTypeId;
      }

      return await Till.findAll({
        where: whereClause,
        include: [{ model: MoneyType, as: 'moneyType' }],
        order: [
          ['date', 'DESC'],
          ['moneyTypeId', 'ASC'],
        ],
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
          'createdAt',
          'updatedAt',
        ],
      });
    } catch (error) {
      console.error('❌ Error in getTillSummary:', error);
      throw error;
    }
  }

  // CORRECTED: Get detailed cash flow breakdown by money type - FIXED FIELD NAMES
  async getCashFlowBreakdown(orgId, date, moneyTypeId = null) {
    try {
      console.log(
        '💵 Getting cash flow for org:',
        orgId,
        'date:',
        date,
        'moneyType:',
        moneyTypeId
      );

      let moneyTypes;
      if (moneyTypeId) {
        moneyTypes = await MoneyType.findAll({
          where: { id: moneyTypeId, organizationId: orgId },
        });
      } else {
        moneyTypes = await MoneyType.findAll({
          where: { organizationId: orgId },
        });
      }

      const results = {};

      for (const moneyType of moneyTypes) {
        // CORRECTED: All queries with proper table and field names
        const [deposits] = await sequelize.query(
          `SELECT 
            'deposit' as type,
            COALESCE(SUM(dw.deposit), 0) as amount,
            COUNT(*) as count
           FROM depositWithdraw dw
           INNER JOIN accounts a ON dw.accountNo = a.No AND a.moneyTypeId = :moneyTypeId
           WHERE dw.organizationId = :orgId 
             AND DATE(dw.DWDate) = :date
             AND dw.deposit > 0
             AND dw.deleted = false`,
          {
            replacements: { orgId, date, moneyTypeId: moneyType.id },
            type: sequelize.QueryTypes.SELECT,
          }
        );

        const [withdrawals] = await sequelize.query(
          `SELECT 
            'withdraw' as type,
            COALESCE(SUM(dw.withdraw), 0) as amount,
            COUNT(*) as count
           FROM depositWithdraw dw
           INNER JOIN accounts a ON dw.accountNo = a.No AND a.moneyTypeId = :moneyTypeId
           WHERE dw.organizationId = :orgId 
             AND DATE(dw.DWDate) = :date
             AND dw.withdraw > 0
             AND dw.deleted = false`,
          {
            replacements: { orgId, date, moneyTypeId: moneyType.id },
            type: sequelize.QueryTypes.SELECT,
          }
        );

        const [receives] = await sequelize.query(
          `SELECT 
            'receive' as type,
            COALESCE(SUM(receiveAmount), 0) as amount,
            COUNT(*) as count
           FROM receives 
           WHERE organizationId = :orgId 
             AND DATE(rDate) = :date
             AND moneyTypeId = :moneyTypeId
             AND deleted = false
             AND receiveAmount > 0`,
          {
            replacements: { orgId, date, moneyTypeId: moneyType.id },
            type: sequelize.QueryTypes.SELECT,
          }
        );

        const [transfers] = await sequelize.query(
          `SELECT 
            'transfer' as type,
            COALESCE(SUM(transferAmount), 0) as amount,
            COUNT(*) as count
           FROM transfers 
           WHERE organizationId = :orgId 
             AND DATE(tDate) = :date
             AND moneyTypeId = :moneyTypeId
             AND deleted = false
             AND transferAmount > 0`,
          {
            replacements: { orgId, date, moneyTypeId: moneyType.id },
            type: sequelize.QueryTypes.SELECT,
          }
        );

        const [exchangeSales] = await sequelize.query(
          `SELECT 
            'exchange_sale' as type,
            COALESCE(SUM(saleAmount), 0) as amount,
            COUNT(*) as count
           FROM exchanges 
           WHERE organizationId = :orgId 
             AND DATE(eDate) = :date
             AND saleMoneyType = :moneyTypeId
             AND deleted = false
             AND saleAmount > 0`,
          {
            replacements: { orgId, date, moneyTypeId: moneyType.id },
            type: sequelize.QueryTypes.SELECT,
          }
        );

        const [exchangePurchases] = await sequelize.query(
          `SELECT 
            'exchange_purchase' as type,
            COALESCE(SUM(purchaseAmount), 0) as amount,
            COUNT(*) as count
           FROM exchanges 
           WHERE organizationId = :orgId 
             AND DATE(eDate) = :date
             AND purchaseMoneyType = :moneyTypeId
             AND deleted = false
             AND purchaseAmount > 0`,
          {
            replacements: { orgId, date, moneyTypeId: moneyType.id },
            type: sequelize.QueryTypes.SELECT,
          }
        );

        results[moneyType.typeName] = {
          deposits: deposits || { type: 'deposit', amount: 0, count: 0 },
          withdrawals: withdrawals || { type: 'withdraw', amount: 0, count: 0 },
          receives: receives || { type: 'receive', amount: 0, count: 0 },
          transfers: transfers || { type: 'transfer', amount: 0, count: 0 },
          exchangeSales: exchangeSales || {
            type: 'exchange_sale',
            amount: 0,
            count: 0,
          },
          exchangePurchases: exchangePurchases || {
            type: 'exchange_purchase',
            amount: 0,
            count: 0,
          },
          summary: {
            totalIn:
              parseFloat(deposits?.amount || 0) +
              parseFloat(receives?.amount || 0) +
              parseFloat(exchangeSales?.amount || 0),
            totalOut:
              parseFloat(withdrawals?.amount || 0) +
              parseFloat(transfers?.amount || 0) +
              parseFloat(exchangePurchases?.amount || 0),
          },
        };

        console.log(
          `📈 ${moneyType.typeName} cash flow:`,
          results[moneyType.typeName].summary
        );
      }

      return results;
    } catch (error) {
      console.error('❌ Error in getCashFlowBreakdown:', error);
      throw error;
    }
  }

  // NEW: Get real-time till status for all money types
  async getCurrentTillStatus(orgId, moneyTypeId = null) {
    try {
      const today = new Date().toISOString().split('T')[0];

      let tills;
      if (moneyTypeId) {
        tills = [
          await Till.findOne({
            where: {
              organizationId: orgId,
              date: today,
              moneyTypeId: moneyTypeId,
            },
            include: [{ model: MoneyType, as: 'moneyType' }],
          }),
        ];
      } else {
        tills = await Till.findAll({
          where: {
            organizationId: orgId,
            date: today,
          },
          include: [{ model: MoneyType, as: 'moneyType' }],
        });
      }

      if (!tills.length || tills.every((till) => !till)) {
        return { status: 'no_till', message: 'No tills created for today' };
      }

      const tillStatuses = [];

      for (const till of tills) {
        if (!till) continue;

        const cashFlow = await this.getCashFlowBreakdown(
          orgId,
          today,
          till.moneyTypeId
        );
        const moneyTypeFlow = cashFlow[till.moneyType.typeName];

        tillStatuses.push({
          till,
          cashFlow: moneyTypeFlow,
          realTimeBalance:
            till.openingBalance +
            (moneyTypeFlow?.summary?.totalIn || 0) -
            (moneyTypeFlow?.summary?.totalOut || 0),
        });
      }

      return tillStatuses.length === 1 ? tillStatuses[0] : tillStatuses;
    } catch (error) {
      console.error('❌ Error in getCurrentTillStatus:', error);
      throw error;
    }
  }
}

module.exports = new TillService();
