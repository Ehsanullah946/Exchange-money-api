'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
   async up(queryInterface, Sequelize) {
    await queryInterface.createTable('persons', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        firstName: {
        type: Sequelize.STRING(32),
        allowNull: false,     
        },
        lastName: Sequelize.STRING(32),
        fatherName: Sequelize.STRING(32),
        photo:Sequelize.STRING(300),
        nationalCode: {
            type: Sequelize.STRING(64),
            unique: "person_nationalCode"
        },
        phoneNo: Sequelize.STRING(15),
        currentAddress: Sequelize.TEXT,
        organizationId: {
        type: Sequelize.INTEGER,
        allowNull: false,
       },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('persons');
  }
};
