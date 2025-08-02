'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
   async up(queryInterface, Sequelize) {
    await queryInterface.createTable('persons', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        typeName: {
        type: Sequelize.STRING,
        allowNull: false
    },
    organizationId: {
        type: Sequelize.INTEGER,
        allowNull:false
    }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('persons');
  }
};
