module.exports = (sequelize, DataTypes) => {
  const Rate = sequelize.define(
    'Rate',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      fromCurrency: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      toCurrency: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      buyRate: {
        type: DataTypes.DECIMAL(15, 6),
        allowNull: false,
        validate: {
          min: 0,
        },
      },
      sellRate: {
        type: DataTypes.DECIMAL(15, 6),
        allowNull: false,
        validate: {
          min: 0,
        },
      },
      middleRate: {
        type: DataTypes.DECIMAL(15, 6),
        allowNull: false,
        validate: {
          min: 0,
        },
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      effectiveDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      organizationId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      createdBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      tableName: 'rates',
      timestamps: false, // Enable createdAt, updatedAt
      indexes: [
        {
          unique: true,
          fields: [
            'fromCurrency',
            'toCurrency',
            'effectiveDate',
            'organizationId',
          ],
        },
        {
          fields: ['fromCurrency', 'toCurrency', 'isActive'],
        },
        {
          fields: ['effectiveDate'],
        },
      ],
    }
  );

  Rate.associate = (models) => {
    Rate.belongsTo(models.MoneyType, {
      foreignKey: 'fromCurrency',
      as: 'sourceCurrency',
    });
    Rate.belongsTo(models.MoneyType, {
      foreignKey: 'toCurrency',
      as: 'targetCurrency',
    });
    Rate.belongsTo(models.Organization, {
      foreignKey: 'organizationId',
    });
    Rate.belongsTo(models.UserAccount, {
      foreignKey: 'createdBy',
      as: 'creator',
    });
  };

  return Rate;
};
