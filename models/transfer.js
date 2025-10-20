// In your Transfer model
const setupTransferHooks = (Transfer) => {
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

  Transfer.addHook('afterCreate', async (record) => {
    console.log(
      `🎯 Transfer afterCreate - Org: ${record.organizationId}, Amount: ${record.transferAmount}`
    );
    await updateOrganizationTill(record.organizationId);
  });

  Transfer.addHook('afterUpdate', async (record) => {
    if (
      record.changed('transferAmount') ||
      record.changed('deleted') ||
      record.changed('rejected')
    ) {
      console.log(
        `🎯 Transfer afterUpdate - Org: ${record.organizationId}, Changes:`,
        record.changed()
      );
      await updateOrganizationTill(record.organizationId);
    }
  });

  Transfer.addHook('afterDestroy', async (record) => {
    console.log(`🎯 Transfer afterDestroy - Org: ${record.organizationId}`);
    await updateOrganizationTill(record.organizationId);
  });
};

module.exports = (sequelize, DataTypes) => {
  const Transfer = sequelize.define(
    'Transfer',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      transferNo: { type: DataTypes.STRING, allowNull: false },
      transferAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      chargesAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      chargesType: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      tDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      description: { type: DataTypes.TEXT },
      fingerprint: { type: DataTypes.BLOB },
      photo: { type: DataTypes.BLOB },
      guarantorRelation: { type: DataTypes.STRING },
      deleted: { type: DataTypes.BOOLEAN, defaultValue: false },
      rejected: { type: DataTypes.BOOLEAN, defaultValue: false },
      branchCharges: { type: DataTypes.DECIMAL(10, 2) },
      branchChargesType: { type: DataTypes.INTEGER },
      toWhere: { type: DataTypes.INTEGER, allowNull: false },
      organizationId: { type: DataTypes.INTEGER, allowNull: false },
      senderName: { type: DataTypes.STRING },
      receiverName: { type: DataTypes.STRING },
      receiverId: { type: DataTypes.INTEGER },
      senderId: { type: DataTypes.INTEGER },
      customerId: { type: DataTypes.INTEGER },
      employeeId: { type: DataTypes.INTEGER },
      exchangeId: { type: DataTypes.INTEGER },
      moneyTypeId: { type: DataTypes.INTEGER, allowNull: false },
    },
    {
      tableName: 'transfers',
      timestamps: false,
      indexes: [
        {
          unique: true,
          fields: ['transferNo', 'transferAmount', 'tDate', 'deleted'],
        },
      ],
    }
  );

  // ✅ Associations
  Transfer.associate = (models) => {
    Transfer.hasMany(models.ExtraTransferNo, { foreignKey: 'transferId' });
    Transfer.belongsTo(models.Organization, { foreignKey: 'organizationId' });
    Transfer.belongsTo(models.Customer, { foreignKey: 'customerId' });
    Transfer.belongsTo(models.Employee, { foreignKey: 'employeeId' });
    Transfer.belongsTo(models.SenderReceiver, {
      as: 'Sender',
      foreignKey: 'senderId',
    });
    Transfer.belongsTo(models.SenderReceiver, {
      as: 'Receiver',
      foreignKey: 'receiverId',
    });
    Transfer.belongsTo(models.Branch, {
      as: 'ToBranch',
      foreignKey: 'toWhere',
    });
    Transfer.belongsTo(models.Exchange, { foreignKey: 'exchangeId' });
    Transfer.belongsTo(models.MoneyType, {
      foreignKey: 'moneyTypeId',
      as: 'MainMoneyType',
    });
    Transfer.belongsTo(models.MoneyType, {
      foreignKey: 'branchChargesType',
      as: 'BranchChargesMoneyType',
    });
    Transfer.belongsTo(models.MoneyType, {
      foreignKey: 'chargesType',
      as: 'ChargesMoneyType',
    });
  };

  setupTransferHooks(Transfer);

  return Transfer;
};
