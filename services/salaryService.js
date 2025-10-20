const {
  Salary,
  Employee,
  MoneyType,
  Stakeholder,
  Person,
} = require('../models');

class SalaryService {
  async createSalary(employeeId, salaryData, orgId) {
    const transaction = await Salary.sequelize.transaction();

    try {
      const employee = await Employee.findOne({
        where: { id: employeeId },
        include: [
          {
            model: Stakeholder,
            include: [Person],
          },
        ],
      });

      if (!employee) {
        throw new Error('Employee not found');
      }

      // Create salary record
      const salary = await Salary.create(
        {
          ...salaryData,
          employeeId,
          organizationId: orgId,
          netSalary:
            parseFloat(salaryData.grossSalary) +
            parseFloat(salaryData.bonus || 0) -
            parseFloat(salaryData.tax || 0) -
            parseFloat(salaryData.deductions || 0),
        },
        { transaction }
      );

      await transaction.commit();

      return await Salary.findByPk(salary.id, {
        include: [
          {
            model: Employee,
            as: 'employee',
            include: [
              {
                model: Stakeholder,
                include: [Person],
              },
            ],
          },
          { model: MoneyType, as: 'moneyType' },
        ],
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // Get all salaries with filtering
  async getSalaries(orgId, filters = {}) {
    const whereClause = { organizationId: orgId };

    // Apply filters
    if (filters.employeeId) whereClause.employeeId = filters.employeeId;
    if (filters.moneyTypeId) whereClause.moneyTypeId = filters.moneyTypeId;
    if (filters.paymentStatus)
      whereClause.paymentStatus = filters.paymentStatus;

    if (filters.startDate && filters.endDate) {
      whereClause.salaryDate = {
        [Salary.sequelize.Op.between]: [filters.startDate, filters.endDate],
      };
    }

    return await Salary.findAll({
      where: whereClause,
      include: [
        {
          model: Employee,
          as: 'employee',
          include: [
            {
              model: Stakeholder,
              include: [Person],
            },
          ],
        },
        { model: MoneyType, as: 'moneyType' },
      ],
      order: [['salaryDate', 'DESC']],
    });
  }

  // Update salary record
  async updateSalary(salaryId, updateData, orgId) {
    const transaction = await Salary.sequelize.transaction();

    try {
      const salary = await Salary.findOne({
        where: { id: salaryId, organizationId: orgId },
      });

      if (!salary) {
        throw new Error('Salary record not found');
      }

      const updatedSalary = await salary.update(updateData, { transaction });
      await transaction.commit();

      return await Salary.findByPk(updatedSalary.id, {
        include: [
          {
            model: Employee,
            as: 'employee',
            include: [
              {
                model: Stakeholder,
                include: [Person],
              },
            ],
          },
          { model: MoneyType, as: 'moneyType' },
        ],
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // Mark salary as paid
  async markAsPaid(salaryId, orgId, paymentDate = new Date()) {
    return await this.updateSalary(
      salaryId,
      {
        paymentStatus: 'paid',
        paymentDate: paymentDate,
      },
      orgId
    );
  }

  // Get salary summary for organization
  async getSalarySummary(orgId, period = 'month') {
    try {
      console.log(
        `📊 Getting salary summary for org: ${orgId}, period: ${period}`
      );

      const currentDate = new Date();
      let startDate, endDate;

      if (period === 'month') {
        startDate = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          1
        );
        endDate = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() + 1,
          0
        );
      } else if (period === 'year') {
        startDate = new Date(currentDate.getFullYear(), 0, 1);
        endDate = new Date(currentDate.getFullYear(), 11, 31);
      } else {
        // Default to current month if period is invalid
        startDate = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          1
        );
        endDate = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() + 1,
          0
        );
      }

      // Format dates for SQL query
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      console.log(`📅 Date range: ${startDateStr} to ${endDateStr}`);

      const salaries = await Salary.findAll({
        where: {
          organizationId: orgId,
          salaryDate: {
            [Op.between]: [startDateStr, endDateStr],
          },
        },
        include: [
          {
            model: MoneyType,
            as: 'moneyType',
            attributes: ['id', 'typeName'],
          },
        ],
        attributes: [
          'id',
          'grossSalary',
          'netSalary',
          'tax',
          'bonus',
          'deductions',
          'paymentStatus',
          'salaryDate',
          'moneyTypeId',
        ],
      });

      console.log(`💰 Found ${salaries.length} salary records`);

      // Initialize summary object
      const summary = {
        totalSalaries: salaries.length,
        totalGross: 0,
        totalNet: 0,
        totalTax: 0,
        totalBonus: 0,
        totalDeductions: 0,
        byMoneyType: {},
        byStatus: {
          pending: 0,
          paid: 0,
          cancelled: 0,
        },
        period: {
          start: startDateStr,
          end: endDateStr,
          type: period,
        },
      };

      // Calculate totals
      salaries.forEach((salary) => {
        const gross = parseFloat(salary.grossSalary) || 0;
        const net = parseFloat(salary.netSalary) || 0;
        const tax = parseFloat(salary.tax) || 0;
        const bonus = parseFloat(salary.bonus) || 0;
        const deductions = parseFloat(salary.deductions) || 0;

        summary.totalGross += gross;
        summary.totalNet += net;
        summary.totalTax += tax;
        summary.totalBonus += bonus;
        summary.totalDeductions += deductions;

        // Group by money type
        const moneyTypeName = salary.moneyType?.typeName || 'Unknown';
        if (!summary.byMoneyType[moneyTypeName]) {
          summary.byMoneyType[moneyTypeName] = {
            count: 0,
            totalNet: 0,
            totalGross: 0,
          };
        }
        summary.byMoneyType[moneyTypeName].count++;
        summary.byMoneyType[moneyTypeName].totalNet += net;
        summary.byMoneyType[moneyTypeName].totalGross += gross;

        // Count by status
        const status = salary.paymentStatus || 'pending';
        if (summary.byStatus[status] !== undefined) {
          summary.byStatus[status]++;
        }
      });

      // Format numbers to 2 decimal places
      summary.totalGross = parseFloat(summary.totalGross.toFixed(2));
      summary.totalNet = parseFloat(summary.totalNet.toFixed(2));
      summary.totalTax = parseFloat(summary.totalTax.toFixed(2));
      summary.totalBonus = parseFloat(summary.totalBonus.toFixed(2));
      summary.totalDeductions = parseFloat(summary.totalDeductions.toFixed(2));

      // Format money type totals
      Object.keys(summary.byMoneyType).forEach((key) => {
        summary.byMoneyType[key].totalNet = parseFloat(
          summary.byMoneyType[key].totalNet.toFixed(2)
        );
        summary.byMoneyType[key].totalGross = parseFloat(
          summary.byMoneyType[key].totalGross.toFixed(2)
        );
      });

      console.log('📈 Salary summary calculated:', {
        totalSalaries: summary.totalSalaries,
        totalNet: summary.totalNet,
        byStatus: summary.byStatus,
      });

      return summary;
    } catch (error) {
      console.error('❌ Error in getSalarySummary:', error);

      // Return empty summary on error
      return {
        totalSalaries: 0,
        totalGross: 0,
        totalNet: 0,
        totalTax: 0,
        totalBonus: 0,
        totalDeductions: 0,
        byMoneyType: {},
        byStatus: {
          pending: 0,
          paid: 0,
          cancelled: 0,
        },
        period: {
          start: '',
          end: '',
          type: period,
        },
        error: error.message,
      };
    }
  }
}

module.exports = new SalaryService();
