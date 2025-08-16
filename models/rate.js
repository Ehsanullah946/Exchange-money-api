module.exports = (sequelize, DataTypes) => {
  const Rate = sequelize.define(
    'Rate',
    {
      fromCurrency: { type: DataTypes.INTEGER, primaryKey: true },
      value1: DataTypes.DECIMAL(10, 5),
      value2: DataTypes.DECIMAL(10, 5),
      rDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'rates',
      timestamps: false,
    }
  );

  Rate.associate = (models) => {
    Rate.belongsTo(models.MoneyType, { foreignKey: 'fromCurrency' });
  };

  return Rate;
};
