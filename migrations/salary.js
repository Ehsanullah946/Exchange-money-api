'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('salary', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      grossSalary: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      tax: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      netSalary: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      moneyTypeId: Sequelize.INTEGER,
      employeeId: Sequelize.INTEGER,
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('salary');
  },
};
