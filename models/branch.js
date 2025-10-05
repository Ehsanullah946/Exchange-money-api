module.exports = (sequelize, DataTypes) => {
  const Branch = sequelize.define(
    'Branch',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      deleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      faxNo: {
        type: DataTypes.STRING(32),
        allowNull: true,
      },
      direct: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      customerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      tableName: 'branches',
      timestamps: false,
    }
  );

  Branch.associate = (models) => {
    Branch.belongsTo(models.Customer, { foreignKey: 'customerId' });
    Branch.hasMany(models.ExtraTransferNo, { foreignKey: 'branchId' });
    Branch.hasMany(models.Receive, {
      foreignKey: 'fromWhere',
      as: 'FromBranch',
    });
    Branch.hasMany(models.Transfer, { as: 'ToBranch', foreignKey: 'toWhere' });
    Branch.hasMany(models.Receive, { as: 'ToPass', foreignKey: 'passTo' });
    Branch.hasMany(models.Notification, { foreignKey: 'recipientBranchId' });
  };

  return Branch;
};
