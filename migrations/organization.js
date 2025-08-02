'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
   async up(queryInterface, Sequelize) {
    await queryInterface.createTable('organiztions', {
    id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
    name: {
        type:Sequelize.STRING,
        allowNull: false,
    },
    createdAt: {
        type:Sequelize.DATE,
        defaultValue:Sequelize.NOW
    }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('organiztions');
  }
};
