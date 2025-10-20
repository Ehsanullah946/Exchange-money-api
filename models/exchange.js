const setupExchangeHooks = (Exchange) => {
  const updateOrganizationTill = async (organizationId) => {
    if (organizationId) {
      setTimeout(async () => {
        try {
          const tillService = require('../services/tillService');
          await tillService.updateTillTotals(organizationId);
          console.log(
            `✅ Till totals updated for organization: ${organizationId}`
          );
        } catch (error) {
          console.error(
            `❌ Failed to update till totals for org ${organizationId}:`,
            error
          );
        }
      }, 100);
    }
  };

  Exchange.addHook('afterCreate', async (record) => {
    console.log(
      `🎯 Exchange afterCreate - Org: ${record.organizationId}, Sale: ${record.saleAmount}, Purchase: ${record.purchaseAmount}`
    );
    await updateOrganizationTill(record.organizationId);
  });

  Exchange.addHook('afterUpdate', async (record) => {
    if (
      (record.changed('saleAmount') || record.changed('purchaseAmount')) &&
      record.organizationId
    ) {
      console.log(
        `🎯 Exchange afterUpdate - Org: ${record.organizationId}, Changes:`,
        record.changed()
      );
      await updateOrganizationTill(record.organizationId);
    }
  });

  Exchange.addHook('afterDestroy', async (record) => {
    console.log(`🎯 Exchange afterDestroy - Org: ${record.organizationId}`);
    await updateOrganizationTill(record.organizationId);
  });
};

module.exports = (sequelize, DataTypes) => {
  const Exchange = sequelize.define(
    'Exchange',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      rate: { type: DataTypes.DECIMAL(10, 4), allowNull: false },
      saleAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      purchaseAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      eDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      description: { type: DataTypes.TEXT },
      fingerprint: { type: DataTypes.BLOB },
      photo: { type: DataTypes.BLOB },
      deleted: { type: DataTypes.BOOLEAN, defaultValue: false },
      swap: { type: DataTypes.BOOLEAN, defaultValue: false },
      calculate: { type: DataTypes.BOOLEAN, defaultValue: false },
      saleMoneyType: { type: DataTypes.INTEGER, allowNull: false },
      purchaseMoneyType: { type: DataTypes.INTEGER, allowNull: false },
      exchangerId: { type: DataTypes.INTEGER },
      employeeId: { type: DataTypes.INTEGER },
      customerId: { type: DataTypes.INTEGER },
      organizationId: { type: DataTypes.INTEGER, allowNull: false },
      transferId: { type: DataTypes.INTEGER },
      receiveId: { type: DataTypes.INTEGER },
    },
    {
      tableName: 'exchanges',
      timestamps: false,
    }
  );

  // ✅ Associations
  Exchange.associate = (models) => {
    Exchange.hasMany(models.Receive, { foreignKey: 'exchangeId' });
    Exchange.hasMany(models.Transfer, { foreignKey: 'exchangeId' });
    Exchange.belongsTo(models.Organization, { foreignKey: 'organizationId' });
    Exchange.belongsTo(models.Customer, { foreignKey: 'customerId' });
    Exchange.belongsTo(models.Receive, { foreignKey: 'receiveId' });
    Exchange.belongsTo(models.Transfer, { foreignKey: 'transferId' });
    Exchange.belongsTo(models.Employee, { foreignKey: 'employeeId' });
    Exchange.belongsTo(models.Exchanger, { foreignKey: 'exchangerId' });
    Exchange.belongsTo(models.MoneyType, {
      as: 'PurchaseType',
      foreignKey: 'purchaseMoneyType',
    });
    Exchange.belongsTo(models.MoneyType, {
      as: 'SaleType',
      foreignKey: 'saleMoneyType',
    });
  };

  setupExchangeHooks(Exchange);

  return Exchange;
};
