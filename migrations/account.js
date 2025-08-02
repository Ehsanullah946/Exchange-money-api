'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
   async up(queryInterface, Sequelize) {
    await queryInterface.createTable('accounts', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        credit: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
        },
        dateOfCreation: {
            type: Sequelize.DATE,
            defaultValue: Sequelize.NOW
        },
        smsEnabled: { type: Sequelize.BOOLEAN, defaultValue: false },
        whatsApp: { type: Sequelize.BOOLEAN, defaultValue: false },
        email: { type: Sequelize.BOOLEAN, defaultValue: false },
        telegramEnabled: { type: Sequelize.BOOLEAN, defaultValue: false },
        active: { type: Sequelize.BOOLEAN, defaultValue: true },
        deleted: { type: Sequelize.BOOLEAN, defaultValue: false },
        organizationId: {
        type: Sequelize.INTEGER,
        allowNull:false
    }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('accounts');
  }
};
