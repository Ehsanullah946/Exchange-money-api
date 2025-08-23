module.exports = (sequelize, DataTypes) => {
  const Customer = sequelize.define(
    'Customer',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      stakeholderId: { type: DataTypes.INTEGER, allowNull: false },
      typeId: DataTypes.INTEGER,
      language: DataTypes.INTEGER,
      loanLimit: DataTypes.DECIMAL(10, 2),
      active: { type: DataTypes.BOOLEAN, defaultValue: true },
      whatsApp: DataTypes.STRING(32),
      email: DataTypes.STRING(64),
      telegram: DataTypes.STRING(32),
      whatsAppEnabled: { type: DataTypes.BOOLEAN, defaultValue: false },
      telegramEnabled: { type: DataTypes.BOOLEAN, defaultValue: false },
      emailEnabled: { type: DataTypes.BOOLEAN, defaultValue: false },
      notificationPreferences: {
        type: DataTypes.JSON,
        defaultValue: {
          transfers: true,
          withdrawals: true,
          deposits: true,
          balanceAlerts: false,
        },
      },
    },
    {
      tableName: 'customers',
      timestamps: false,
    }
  );

  Customer.associate = (models) => {
    Customer.belongsTo(models.Stakeholder, { foreignKey: 'stakeholderId' });
    Customer.hasMany(models.Branch, { foreignKey: 'customerId' });
    Customer.hasMany(models.Account, { foreignKey: 'customerId' });
    Customer.hasMany(models.Notification, {
      foreignKey: 'recipientCustomerId',
    });
  };

  return Customer;
};
