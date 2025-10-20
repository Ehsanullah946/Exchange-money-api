'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Tills', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      moneyTypeId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      organizationId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Organizations',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      openingBalance: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      totalIn: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      totalOut: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      closingBalance: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      actualCash: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
      },
      difference: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      status: {
        type: Sequelize.ENUM('open', 'closed'),
        allowNull: false,
        defaultValue: 'open',
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'UserAccount',
          key: 'id',
        },
      },
      closedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'UserAccount',
          key: 'id',
        },
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex(
      'Tills',
      ['organizationId', 'date', 'moneyTypeId'],
      {
        unique: true,
        name: 'unique_org_date_moneyType',
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Tills');
  },
};
