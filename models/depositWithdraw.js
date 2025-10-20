const setupDepositWithdrawHooks = (DepositWithdraw) => {
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

  DepositWithdraw.addHook('afterCreate', async (record) => {
    console.log(
      `🎯 DepositWithdraw afterCreate - Org: ${record.organizationId}, Deposit: ${record.deposit}, Withdraw: ${record.withdraw}`
    );
    await updateOrganizationTill(record.organizationId);
  });

  DepositWithdraw.addHook('afterUpdate', async (record) => {
    if (
      record.changed('deposit') ||
      record.changed('withdraw') ||
      record.changed('deleted')
    ) {
      console.log(
        `🎯 DepositWithdraw afterUpdate - Org: ${record.organizationId}, Changes:`,
        record.changed()
      );
      await updateOrganizationTill(record.organizationId);
    }
  });

  DepositWithdraw.addHook('afterDestroy', async (record) => {
    console.log(
      `🎯 DepositWithdraw afterDestroy - Org: ${record.organizationId}`
    );
    await updateOrganizationTill(record.organizationId);
  });
};

module.exports = (sequelize, DataTypes) => {
  const DepositWithdraw = sequelize.define(
    'DepositWithdraw',
    {
      No: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      deposit: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      withdraw: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      DWDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      description: { type: DataTypes.TEXT },
      deleted: { type: DataTypes.BOOLEAN, defaultValue: false },

      employeeId: { type: DataTypes.INTEGER },
      organizationId: { type: DataTypes.INTEGER },
      accountNo: { type: DataTypes.INTEGER, allowNull: false },
      fingerprint: { type: DataTypes.BLOB },
      photo: { type: DataTypes.BLOB },
      WithdrawReturnDate: { type: DataTypes.DATE },
    },
    {
      tableName: 'depositWithdraw',
      timestamps: false,
      indexes: [
        {
          unique: true,
          fields: ['deposit', 'withdraw', 'deleted', 'accountNo', 'DWDate'],
          name: 'depositWithdraw_composite_pk',
        },
      ],
    }
  );

  DepositWithdraw.associate = (models) => {
    DepositWithdraw.belongsTo(models.Account, { foreignKey: 'accountNo' });
    DepositWithdraw.belongsTo(models.Employee, { foreignKey: 'employeeId' });
    DepositWithdraw.belongsTo(models.Organization, {
      foreignKey: 'organizationId',
    });
  };

  setupDepositWithdrawHooks(DepositWithdraw);

  return DepositWithdraw;
};
