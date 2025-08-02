'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
   async up(queryInterface, Sequelize) {
    await queryInterface.createTable('branches', {
    id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
    contractType: {
        type: Sequelize.STRING,
        allowNull: false
    },
    deleted: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
    },
    faxNo: {
        type: Sequelize.STRING(32),
        allowNull: true
    },
    direct: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
    },
    organizationId: {
        type: Sequelize.INTEGER,
        allowNull:false
    },
    customerId: {
        type: Sequelize.INTEGER,
        allowNull:false
    }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('branches');
  }
};
