// controllers/till.js - Updated for multi-currency
const tillService = require('../services/tillService');
const { Till, sequelize, MoneyType } = require('../models');

// Get today's tills for all money types
exports.getTodayTills = async (req, res) => {
  try {
    const orgId = req.orgId;
    const userId = req.user.id;
    const { moneyTypeId } = req.query;

    console.log(
      "💰 Fetching today's tills for org:",
      orgId,
      'moneyType:',
      moneyTypeId
    );

    const tills = await tillService.getOrCreateTodayTill(
      orgId,
      userId,
      moneyTypeId
    );

    // Get cash flow breakdown
    const today = new Date().toISOString().split('T')[0];
    const cashFlow = await tillService.getCashFlowBreakdown(
      orgId,
      today,
      moneyTypeId
    );

    // If single till requested, return single object
    if (moneyTypeId && Array.isArray(tills) && tills.length === 1) {
      const till = tills[0];
      const moneyTypeFlow = cashFlow[till.moneyType.typeName];

      const realTimeBalance =
        till.openingBalance +
        (moneyTypeFlow?.summary?.totalIn || 0) -
        (moneyTypeFlow?.summary?.totalOut || 0);

      return res.status(200).json({
        success: true,
        data: {
          till,
          cashFlow: moneyTypeFlow,
          realTimeBalance,
        },
      });
    }

    // Return all tills
    res.status(200).json({
      success: true,
      data: {
        tills: Array.isArray(tills) ? tills : [tills],
        cashFlow,
      },
    });
  } catch (error) {
    console.error('❌ Get today tills error:', error);
    res.status(500).json({
      success: false,
      message: "Failed to get today's tills: " + error.message,
    });
  }
};

// Close specific money type till
exports.closeTill = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const orgId = req.orgId;
    const userId = req.user.id;
    const { moneyTypeId, actualCash, notes } = req.body;

    if (!moneyTypeId) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Money type ID is required',
      });
    }

    console.log('🔒 Closing till for org:', orgId, 'moneyType:', moneyTypeId);

    // Validate required fields
    if (!actualCash && actualCash !== 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Actual cash amount is required',
      });
    }

    if (isNaN(parseFloat(actualCash)) || parseFloat(actualCash) < 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Actual cash must be a valid positive number',
      });
    }

    const closedTill = await tillService.closeTill(
      orgId,
      { moneyTypeId, actualCash, notes },
      userId
    );

    await t.commit();

    console.log('✅ Till closed successfully for money type:', moneyTypeId);

    res.status(200).json({
      success: true,
      message: 'Till closed successfully',
      data: closedTill,
    });
  } catch (error) {
    await t.rollback();
    console.error('❌ Close till error:', error);

    if (error.message.includes('No open till found')) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to close till: ' + error.message,
    });
  }
};

// Close all tills for the day
exports.closeAllTills = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const orgId = req.orgId;
    const userId = req.user.id;
    const { closeData } = req.body; // Array of { moneyTypeId, actualCash, notes }

    if (!Array.isArray(closeData) || !closeData.length) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Close data array is required',
      });
    }

    console.log('🔒 Closing all tills for org:', orgId);

    const closedTills = await tillService.closeAllTills(
      orgId,
      closeData,
      userId
    );

    await t.commit();

    console.log('✅ All tills closed successfully');

    res.status(200).json({
      success: true,
      message: 'All tills closed successfully',
      data: closedTills,
    });
  } catch (error) {
    await t.rollback();
    console.error('❌ Close all tills error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to close tills: ' + error.message,
    });
  }
};

// Get available money types for organization
exports.getMoneyTypes = async (req, res) => {
  try {
    const orgId = req.orgId;

    const moneyTypes = await MoneyType.findAll({
      where: {
        organizationId: orgId,
      },
      attributes: ['id', 'typeName'],
    });

    res.status(200).json({
      success: true,
      data: moneyTypes,
    });
  } catch (error) {
    console.error('❌ Get money types error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get money types: ' + error.message,
    });
  }
};

// Keep other methods but update them to support moneyTypeId parameter
exports.getTillHistory = async (req, res) => {
  try {
    const orgId = req.orgId;
    const { startDate, endDate, moneyTypeId, page = 1, limit = 10 } = req.query;

    console.log('📊 Getting till history for org:', orgId, {
      startDate,
      endDate,
      moneyTypeId,
    });

    const tills = await tillService.getTillSummary(
      orgId,
      startDate,
      endDate,
      moneyTypeId
    );

    // Implement proper pagination
    const parsedPage = parseInt(page) || 1;
    const parsedLimit = parseInt(limit) || 10;
    const offset = (parsedPage - 1) * parsedLimit;

    const paginatedTills = tills.slice(offset, offset + parsedLimit);

    res.status(200).json({
      success: true,
      data: paginatedTills,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total: tills.length,
        totalPages: Math.ceil(tills.length / parsedLimit),
      },
    });
  } catch (error) {
    console.error('❌ Get till history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get till history: ' + error.message,
    });
  }
};

// Update routes to support moneyTypeId parameter
exports.updateTillTotals = async (req, res) => {
  try {
    const orgId = req.orgId;
    const { moneyTypeId } = req.body;

    console.log(
      '🔄 Manually updating till totals for org:',
      orgId,
      'moneyType:',
      moneyTypeId
    );

    const updatedTill = await tillService.updateTillTotals(orgId, moneyTypeId);

    res.status(200).json({
      success: true,
      message: 'Till totals updated successfully',
      data: updatedTill,
    });
  } catch (error) {
    console.error('❌ Update till totals error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update till totals: ' + error.message,
    });
  }
};

// Add this to tillController.js for testing
exports.forceUpdateTill = async (req, res) => {
  try {
    const orgId = req.orgId;
    const { moneyTypeId } = req.body;

    if (!moneyTypeId) {
      return res.status(400).json({
        success: false,
        message: 'moneyTypeId is required',
      });
    }

    console.log(`🔧 Force updating till for moneyType: ${moneyTypeId}`);

    const updatedTill = await tillService.updateMoneyTypeTillTotals(
      orgId,
      moneyTypeId,
      new Date().toISOString().split('T')[0]
    );

    res.status(200).json({
      success: true,
      message: 'Till updated successfully',
      data: updatedTill,
    });
  } catch (error) {
    console.error('❌ Force update error:', error);
    res.status(500).json({
      success: false,
      message: 'Force update failed: ' + error.message,
    });
  }
};

// Update the debugTillTransactions in tillController.js

exports.debugTillTransactions = async (req, res) => {
  try {
    const orgId = req.orgId;
    const { moneyTypeId, date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    // Validate moneyTypeId
    if (!moneyTypeId) {
      return res.status(400).json({
        success: false,
        message: 'moneyTypeId is required',
      });
    }

    console.log(
      `🔍 Debugging transactions for org: ${orgId}, moneyType: ${moneyTypeId}, date: ${targetDate}`
    );

    // Check DepositWithdraw transactions
    const [depositWithdraws] = await sequelize.query(
      `SELECT dw.*, a.moneyTypeId, a.customerId 
       FROM depositWithdraw dw
       INNER JOIN accounts a ON dw.accountNo = a.No
       WHERE dw.organizationId = :orgId 
         AND DATE(dw.DWDate) = :date
         AND a.moneyTypeId = :moneyTypeId
         AND dw.deleted = false`,
      {
        replacements: {
          orgId: parseInt(orgId),
          date: targetDate,
          moneyTypeId: parseInt(moneyTypeId),
        },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    // Check Receives
    const [receives] = await sequelize.query(
      `SELECT * FROM receives 
       WHERE organizationId = :orgId 
         AND DATE(rDate) = :date
         AND moneyTypeId = :moneyTypeId
         AND deleted = false`,
      {
        replacements: {
          orgId: parseInt(orgId),
          date: targetDate,
          moneyTypeId: parseInt(moneyTypeId),
        },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    // Check Transfers
    const [transfers] = await sequelize.query(
      `SELECT * FROM transfers 
       WHERE organizationId = :orgId 
         AND DATE(tDate) = :date
         AND moneyTypeId = :moneyTypeId
         AND deleted = false`,
      {
        replacements: {
          orgId: parseInt(orgId),
          date: targetDate,
          moneyTypeId: parseInt(moneyTypeId),
        },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    // Check Exchanges
    const [exchanges] = await sequelize.query(
      `SELECT * FROM exchanges 
       WHERE organizationId = :orgId 
         AND DATE(eDate) = :date
         AND (saleMoneyType = :moneyTypeId OR purchaseMoneyType = :moneyTypeId)
         AND deleted = false`,
      {
        replacements: {
          orgId: parseInt(orgId),
          date: targetDate,
          moneyTypeId: parseInt(moneyTypeId),
        },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    res.status(200).json({
      success: true,
      data: {
        date: targetDate,
        moneyTypeId: parseInt(moneyTypeId),
        depositWithdraws: depositWithdraws || [],
        receives: receives || [],
        transfers: transfers || [],
        exchanges: exchanges || [],
      },
    });
  } catch (error) {
    console.error('❌ Debug error:', error);
    res.status(500).json({
      success: false,
      message: 'Debug failed: ' + error.message,
    });
  }
};
