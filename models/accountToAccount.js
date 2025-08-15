module.exports = (sequelize, DataTypes) => {
  const AccountToAccount = sequelize.define(
    'AccountToAccount',
    {
      No: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      fromAccount: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      toAccount: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      Amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      tDate: {
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
      fingerprint: { type: DataTypes.BLOB },
    },
    {
      tableName: 'accounttoaccount',
      timestamps: false,
    }
  );
  AccountToAccount.associate = (models) => {
    AccountToAccount.belongsTo(models.Account, { foreignKey: 'fromAccount' });
    AccountToAccount.belongsTo(models.Account, { foreignKey: 'toAccount' });
    AccountToAccount.belongsTo(models.Employee, { foreignKey: 'employeeId' });
    AccountToAccount.belongsTo(models.Organization, {
      foreignKey: 'organizationId',
    });
  };
  return AccountToAccount;
};
