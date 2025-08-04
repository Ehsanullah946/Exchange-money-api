'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
   async up(queryInterface, Sequelize) {
    await queryInterface.createTable('employees', {
     id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
     position: Sequelize.STRING(64),
     stakeholderId: {
        type: Sequelize.INTEGER,
        allowNull:false
    }
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('employees');
  }
};
