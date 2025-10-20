const setupReceiveHooks = (Receive) => {
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

  Receive.addHook('afterCreate', async (record) => {
    console.log(
      `🎯 Receive afterCreate - Org: ${record.organizationId}, Amount: ${record.receiveAmount}`
    );
    await updateOrganizationTill(record.organizationId);
  });

  Receive.addHook('afterUpdate', async (record) => {
    if (
      record.changed('receiveAmount') ||
      record.changed('deleted') ||
      record.changed('rejected')
    ) {
      console.log(
        `🎯 Receive afterUpdate - Org: ${record.organizationId}, Changes:`,
        record.changed()
      );
      await updateOrganizationTill(record.organizationId);
    }
  });

  Receive.addHook('afterDestroy', async (record) => {
    console.log(`🎯 Receive afterDestroy - Org: ${record.organizationId}`);
    await updateOrganizationTill(record.organizationId);
  });
};

module.exports = (sequelize, DataTypes) => {
  const Receive = sequelize.define(
    'Receive',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      receiveNo: { type: DataTypes.STRING, allowNull: false, unique: true },
      receiveAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
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
      rDate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      description: { type: DataTypes.TEXT },
      photo: { type: DataTypes.BLOB },
      fingerprint: { type: DataTypes.BLOB },
      guarantorRelation: { type: DataTypes.STRING },
      deleted: { type: DataTypes.BOOLEAN, defaultValue: false },
      rejected: { type: DataTypes.BOOLEAN, defaultValue: false },
      branchCharges: { type: DataTypes.DECIMAL(10, 2) },
      branchChargesType: { type: DataTypes.INTEGER },
      passTo: { type: DataTypes.INTEGER },
      passNo: { type: DataTypes.STRING },
      returnNo: { type: DataTypes.INTEGER },
      fromWhere: { type: DataTypes.INTEGER, allowNull: false },
      senderName: { type: DataTypes.STRING },
      receiverName: { type: DataTypes.STRING },
      organizationId: { type: DataTypes.INTEGER, allowNull: false },
      senderId: { type: DataTypes.INTEGER },
      receiverId: { type: DataTypes.INTEGER },
      customerId: { type: DataTypes.INTEGER },
      employeeId: { type: DataTypes.INTEGER },
      moneyTypeId: { type: DataTypes.INTEGER, allowNull: false },
      receiveStatus: { type: DataTypes.BOOLEAN, defaultValue: false },
      exchangeId: { type: DataTypes.INTEGER },
    },
    {
      tableName: 'receives',
      timestamps: false,
      indexes: [
        {
          unique: true,
          fields: ['receiveNo', 'receiveAmount', 'rDate', 'deleted'],
        },
      ],
    }
  );

  Receive.associate = (models) => {
    Receive.belongsTo(models.Customer, { foreignKey: 'customerId' });
    Receive.belongsTo(models.Organization, { foreignKey: 'organizationId' });
    Receive.belongsTo(models.Employee, { foreignKey: 'employeeId' });
    Receive.belongsTo(models.SenderReceiver, {
      as: 'sender',
      foreignKey: 'senderId',
    });
    Receive.belongsTo(models.SenderReceiver, {
      as: 'receiver',
      foreignKey: 'receiverId',
    });
    Receive.belongsTo(models.Branch, {
      foreignKey: 'fromWhere',
      as: 'FromBranch',
    });
    Receive.belongsTo(models.Branch, { foreignKey: 'passTo', as: 'PassTo' });

    Receive.belongsTo(models.Exchange, { foreignKey: 'exchangeId' });
    Receive.belongsTo(models.MoneyType, {
      foreignKey: 'moneyTypeId',
      as: 'MainMoneyType',
    });
    Receive.belongsTo(models.MoneyType, {
      foreignKey: 'branchChargesType',
      as: 'BranchChargesMoneyType',
    });
    Receive.belongsTo(models.MoneyType, {
      foreignKey: 'chargesType',
      as: 'ChargesMoneyType',
    });
  };

  setupReceiveHooks(Receive);
  return Receive;
};
