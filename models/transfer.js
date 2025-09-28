module.exports = (sequelize, DataTypes) => {
  const Transfer = sequelize.define(
    'Transfer',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        unique: true,
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
      toWhere: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      organizationId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      senderName: {
        type: DataTypes.STRING,
        allowNull: true, // Temporary until linked to SenderReceiver
      },
      receiverName: {
        type: DataTypes.STRING,
        allowNull: true, // Temporary until linked to SenderReceiver
      },
      receiverId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      senderId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      customerId: {
        type: DataTypes.INTEGER,
      },
      employeeId: {
        type: DataTypes.INTEGER,
      },
      exchangeId: {
        type: DataTypes.INTEGER,
      },
      moneyTypeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
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

  Transfer.associate = (models) => {
    Transfer.hasMany(models.ExtraTransferNo, { foreignKey: 'transferId' });
    Transfer.belongsTo(models.Organization, { foreignKey: 'organizationId' });

    Transfer.belongsTo(models.Customer, { foreignKey: 'customerId' });
    Transfer.belongsTo(models.Employee, { foreignKey: 'employeeId' });

    Transfer.belongsTo(models.SenderReceiver, { foreignKey: 'senderId' });
    Transfer.belongsTo(models.SenderReceiver, { foreignKey: 'receiverId' });
    Transfer.belongsTo(models.Branch, { foreignKey: 'toWhere' });
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

  return Transfer;
};
