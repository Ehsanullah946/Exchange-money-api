'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('customers', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      stakeholderId:{type:Sequelize.INTEGER,allowNull:false},
      typeId: Sequelize.INTEGER,
      language: Sequelize.INTEGER,
      loanLimit: Sequelize.DECIMAL(10,2),
      active: { type: Sequelize.BOOLEAN, defaultValue: true },
      whatsApp: Sequelize.STRING(32),
      email: Sequelize.STRING(64),
      telegram: Sequelize.STRING(32),
      whatsAppEnabled: { type: Sequelize.BOOLEAN, defaultValue: false },
      telegramEnabled: { type: Sequelize.BOOLEAN, defaultValue: false },
      emailEnabled: { type: Sequelize.BOOLEAN, defaultValue: false },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('customers');
  }
};
