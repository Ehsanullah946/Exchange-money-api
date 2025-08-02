'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
   async up(queryInterface, Sequelize) {
    await queryInterface.createTable('employees', {
     id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
     position: Sequelize.STRING(64),
     organizationId: {
        type: Sequelize.INTEGER,
        allowNull:false
    },
     stakeholderId: {
        type: Sequelize.INTEGER,
        allowNull:false
    }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('employees');
  }
};
