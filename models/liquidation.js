// models/Liquidation.js
module.exports = (sequelize, DataTypes) => {
  const Liquidation = sequelize.define(
    'Liquidation',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      customerId: { type: DataTypes.INTEGER, allowNull: false },
      organizationId: { type: DataTypes.INTEGER, allowNull: false },
      startDate: { type: DataTypes.DATE, allowNull: false },
      endDate: { type: DataTypes.DATE, allowNull: false },
      description: { type: DataTypes.TEXT },
      status: {
        type: DataTypes.ENUM('pending', 'completed', 'failed'),
        defaultValue: 'completed',
      },
      closedAccounts: { type: DataTypes.BOOLEAN, defaultValue: false },
      createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    {
      tableName: 'liquidations',
      timestamps: false,
    }
  );

  Liquidation.associate = (models) => {
    Liquidation.belongsTo(models.Customer, { foreignKey: 'customerId' });
    Liquidation.belongsTo(models.Organization, {
      foreignKey: 'organizationId',
    });
  };

  return Liquidation;
};
