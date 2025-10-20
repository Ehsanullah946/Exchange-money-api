'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('salary', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      grossSalary: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      tax: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      netSalary: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      bonus: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0 },
      deductions: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0 },
      salaryDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      paymentStatus: {
        type: Sequelize.ENUM('pending', 'paid', 'cancelled'),
        defaultValue: 'pending',
      },
      paymentDate: Sequelize.DATE,
      notes: Sequelize.TEXT,
      moneyTypeId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      employeeId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      organizationId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('salary');
  },
};
