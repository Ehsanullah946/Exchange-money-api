const salaryService = require('../services/salaryService');
const { Employee, MoneyType, Stakeholder, Person } = require('../models');

class SalaryController {
  async createSalary(req, res) {
    try {
      const { employeeId } = req.params;
      const salaryData = req.body;
      const orgId = req.orgId;

      const salary = await salaryService.createSalary(
        employeeId,
        salaryData,
        orgId
      );

      res.status(201).json({
        success: true,
        message: 'Salary record created successfully',
        data: salary,
      });
    } catch (error) {
      console.error('Create salary error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Get all salaries with filtering
  async getSalaries(req, res) {
    try {
      const orgId = req.orgId;
      const filters = req.query;
      const salaries = await salaryService.getSalaries(orgId, filters);
      res.json({
        success: true,
        data: salaries,
      });
    } catch (error) {
      console.error('Get salaries error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Update salary
  async updateSalary(req, res) {
    try {
      const { salaryId } = req.params;
      const updateData = req.body;
      const orgId = req.orgId;

      const updatedSalary = await salaryService.updateSalary(
        salaryId,
        updateData,
        orgId
      );

      res.json({
        success: true,
        message: 'Salary updated successfully',
        data: updatedSalary,
      });
    } catch (error) {
      console.error('Update salary error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Mark salary as paid
  async markAsPaid(req, res) {
    try {
      const { salaryId } = req.params;
      const orgId = req.orgId;
      const { paymentDate } = req.body;

      const salary = await salaryService.markAsPaid(
        salaryId,
        orgId,
        paymentDate
      );

      res.json({
        success: true,
        message: 'Salary marked as paid',
        data: salary,
      });
    } catch (error) {
      console.error('Mark as paid error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Get salary summary
  async getSalarySummary(req, res) {
    try {
      const orgId = req.orgId;
      const { period = 'month' } = req.query;

      const summary = await salaryService.getSalarySummary(orgId, period);

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      console.error('Get salary summary error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Get employees for salary management
  async getEmployeesForSalary(req, res) {
    try {
      const orgId = req.orgId;

      const employees = await Employee.findAll({
        include: [
          {
            model: Stakeholder,
            include: [
              {
                model: Person,
                where: { organizationId: orgId },
              },
            ],
          },
        ],
        where: { isActive: true },
      });

      const moneyTypes = await MoneyType.findAll({
        where: { organizationId: orgId },
      });

      res.json({
        success: true,
        data: {
          employees,
          moneyTypes,
        },
      });
    } catch (error) {
      console.error('Get employees for salary error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}

module.exports = new SalaryController();
