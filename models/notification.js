// models/Notification.js
module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define(
    'Notification',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      type: {
        type: DataTypes.ENUM(
          'transfer',
          'withdrawal',
          'deposit',
          'account_activity',
          'balance_alert',
          'system'
        ),
        allowNull: false,
      },
      recipientType: {
        type: DataTypes.ENUM('branch', 'customer'),
        allowNull: false,
      },
      recipientBranchId: { type: DataTypes.INTEGER, allowNull: true },
      recipientCustomerId: { type: DataTypes.INTEGER, allowNull: true },
      title: { type: DataTypes.STRING, allowNull: false },
      message: { type: DataTypes.TEXT, allowNull: false },
      data: { type: DataTypes.JSON, allowNull: true },
      status: {
        type: DataTypes.ENUM('pending', 'sent', 'delivered', 'read', 'failed'),
        defaultValue: 'pending',
      },
      priority: {
        type: DataTypes.ENUM('low', 'normal', 'high'),
        defaultValue: 'normal',
      },
      channels: { type: DataTypes.JSON, defaultValue: ['internal'] },
    },
    {
      tableName: 'notifications',
      indexes: [
        { fields: ['recipientBranchId', 'status'] },
        { fields: ['recipientCustomerId', 'status'] },
        { fields: ['createdAt'] },
      ],
    }
  );

  Notification.associate = (models) => {
    Notification.belongsTo(models.Branch, { foreignKey: 'recipientBranchId' });
    Notification.belongsTo(models.Customer, {
      foreignKey: 'recipientCustomerId',
    });
  };

  return Notification;
};
