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

      employeeId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      organizationId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      accountNo: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
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

  DepositWithdraw.addHook('afterCreate', async (depositWithdraw, options) => {
    const tillService = require('../services/tillService');
    await tillService.updateTillTotals(depositWithdraw.organizationId);
  });

  DepositWithdraw.addHook('afterUpdate', async (depositWithdraw, options) => {
    if (depositWithdraw.changed('amount') || depositWithdraw.changed('type')) {
      const tillService = require('../services/tillService');
      await tillService.updateTillTotals(depositWithdraw.organizationId);
    }
  });

  DepositWithdraw.addHook('afterDestroy', async (depositWithdraw, options) => {
    const tillService = require('../services/tillService');
    await tillService.updateTillTotals(depositWithdraw.organizationId);
  });

  return DepositWithdraw;
};
