module.exports = (sequelize, DataTypes) => {
  const Account = sequelize.define("Account", {
    No: { type: DataTypes.INTEGER, autoIncrement: true, unique:true,allowNull:false },
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
        typeId: {
        type: DataTypes.INTEGER,primaryKey:true,
        allowNull:false
    },
        customerId: {
        type: DataTypes.INTEGER, primaryKey:true,
        allowNull:false
    }
  }
  , {
    tableName: "accounts",
    timestamps: false
  });

  Account.associate = (models) => {
      Account.belongsTo(models.Customer, { foreignKey: "customerId" });
      Account.belongsTo(models.MoneyType, { foreignKey: "typeId" });
  };

  return Account;
};
