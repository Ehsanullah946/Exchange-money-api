'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
   async up(queryInterface, Sequelize) {
    await queryInterface.createTable('stakeholders', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      gender: Sequelize.ENUM("M", "F", "O"),
      maritalStatus: Sequelize.STRING(32),
      job: Sequelize.STRING(64),
      permanentAddress: Sequelize.TEXT,
      personId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      },
     password: {
      type: Sequelize.STRING(300),
      allowNull: true,
      },
      canLogin: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue:false
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('stakeholders');
  }
};
