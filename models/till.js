// models/Till.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Till extends Model {
    static associate(models) {
      Till.belongsTo(models.Organization, {
        foreignKey: 'organizationId',
        as: 'organization',
      });
      Till.belongsTo(models.UserAccount, {
        foreignKey: 'createdBy',
        as: 'creator',
      });
      Till.belongsTo(models.MoneyType, {
        foreignKey: 'moneyTypeId',
        as: 'moneyType',
      });
      Till.belongsTo(models.UserAccount, {
        foreignKey: 'closedBy',
        as: 'closer',
      });
    }
  }

  Till.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      organizationId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      moneyTypeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      openingBalance: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      totalIn: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      totalOut: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      closingBalance: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      actualCash: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
      },
      difference: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      status: {
        type: DataTypes.ENUM('open', 'closed'),
        allowNull: false,
        defaultValue: 'open',
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      createdBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      closedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Till',
      tableName: 'Tills',
      hooks: {
        beforeSave: (till) => {
          till.closingBalance =
            parseFloat(till.openingBalance) +
            parseFloat(till.totalIn) -
            parseFloat(till.totalOut);

          if (till.actualCash !== null) {
            till.difference =
              parseFloat(till.actualCash) - parseFloat(till.closingBalance);
          }
        },
      },
    }
  );

  return Till;
};
