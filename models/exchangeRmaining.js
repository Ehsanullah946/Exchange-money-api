module.exports = (sequelize, DataTypes) => {
  const ExchangeRemaining = sequelize.define(
    'ExchangeRemaining',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      purchaseRemaining: {
        type: DataTypes.DECIMAL(10, 4),
        allowNull: false,
      },
      purchaseRemainingCurrency: {
        type: DataTypes.INTEGER,
      },
      costedAmount: {
        type: DataTypes.DECIMAL(10, 4),
        allowNull: false,
      },
      costedAmountCurrency: {
        type: DataTypes.INTEGER,
      },
      eDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'exchangeremaining',
      timestamps: false,
    }
  );

  ExchangeRemaining.associate = (models) => {};

  return ExchangeRemaining;
};
