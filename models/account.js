module.exports = (sequelize, DataTypes) => {
  const Account = sequelize.define("Account", {
    No: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey:true},
        credit: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
        },
        dateOfCreation: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        smsEnabled: { type: DataTypes.BOOLEAN, defaultValue: false },
        whatsApp: { type: DataTypes.BOOLEAN, defaultValue: false },
        email: { type: DataTypes.BOOLEAN, defaultValue: false },
        telegramEnabled: { type: DataTypes.BOOLEAN, defaultValue: false },
        active: { type: DataTypes.BOOLEAN, defaultValue: true },
        deleted: { type: DataTypes.BOOLEAN, defaultValue: false },
        moneyTypeId: {
        type: DataTypes.INTEGER,
        primaryKey:true
    },
        customerId: {
        type: DataTypes.INTEGER,
        primaryKey:true
    }
  }
  , {
    tableName: "accounts",
    timestamps: false,
   indexes: [
    {
      unique: true,
      fields: ['customerId', 'moneyTypeId', 'No'],
      name: 'account_composite_pk'
     },
      {
      unique: true,
      fields: ['customerId', 'moneyTypeId'],
      name: 'customer_currency_unique'
    }
  ]
  });

  Account.associate = (models) => {
      Account.belongsTo(models.Customer, { foreignKey: "customerId" });
      Account.hasMany(models.DepositWithdraw, { foreignKey: "accountNo" });
      Account.belongsTo(models.MoneyType, { foreignKey: "moneyTypeId" });
  };

  return Account;
};
