'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
   async up(queryInterface, Sequelize) {
    await queryInterface.createTable('useraccounts', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      username: { type: Sequelize.STRING(64), allowNull: false },
      password: { type: Sequelize.STRING(200), allowNull: false },
      email: {
      type: Sequelize.STRING(64), allowNull: false,  unique: 'usr_email',
      set(val) {
      const email = (!val) ? this.getDataValue('username') : val;
      this.setDataValue('email', email.toLowerCase());
      },
      validate: {
      isEmail: true
      }
      },
      usertypeId: {type: Sequelize.INTEGER, allowNull:false},
      employeeId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      whatsApp: Sequelize.STRING(64),
      organizationId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('useraccounts');
  }
};
