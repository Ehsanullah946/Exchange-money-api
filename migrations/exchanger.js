'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
   async up(queryInterface, Sequelize) {
    await queryInterface.createTable('exchangers', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
         personId: {
          type: Sequelize.INTEGER,
          allowNull:false
        },
        organizationId: {
          type: Sequelize.INTEGER,
          allowNull:false
        }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('exchangers');
  }
};
