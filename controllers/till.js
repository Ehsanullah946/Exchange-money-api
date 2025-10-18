// controllers/tillController.js
const tillService = require('../services/tillService');
const { sequelize } = require('../models');
exports.getTodayTill = async (req, res) => {
  try {
    const orgId = req.orgId;
    const userId = req.user.id;

    const till = await tillService.getOrCreateTodayTill(orgId, userId);

    // Get cash flow breakdown
    const cashFlow = await tillService.getCashFlowBreakdown(orgId, till.date);

    res.json({
      success: true,
      data: {
        till,
        cashFlow,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.closeTill = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const orgId = req.orgId;
    const userId = req.user.id;
    const { actualCash, notes } = req.body;

    if (!actualCash || actualCash < 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Valid actual cash amount is required',
      });
    }

    const closedTill = await tillService.closeTill(
      orgId,
      actualCash,
      notes,
      userId
    );

    await t.commit();

    res.json({
      success: true,
      message: 'Till closed successfully',
      data: closedTill,
    });
  } catch (error) {
    await t.rollback();
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getTillHistory = async (req, res) => {
  try {
    const orgId = req.orgId;
    const { startDate, endDate, page = 1, limit = 10 } = req.query;

    const tills = await tillService.getTillSummary(orgId, startDate, endDate);

    res.json({
      success: true,
      data: tills,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: tills.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateTillTotals = async (req, res) => {
  try {
    const orgId = req.orgId;

    const updatedTill = await tillService.updateTillTotals(orgId);

    res.json({
      success: true,
      message: 'Till totals updated successfully',
      data: updatedTill,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
