module.exports = (sequelize, DataTypes) => {
  const MoneyType = sequelize.define("MoneyType", {
           id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        typeName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    organizationId: {
        type: DataTypes.INTEGER,
        allowNull:false
    }
  });

  MoneyType.associate = (models) => {
      MoneyType.belongsTo(models.Organization, { foreignKey: "organizationId" });


      MoneyType.hasMany(models.Transfer, { foreignKey: "moneyTypeId" });
      MoneyType.hasMany(models.Transfer, { foreignKey: "chargesType" });
      MoneyType.hasMany(models.Transfer, { foreignKey: "branchChargesType" });
      MoneyType.hasMany(models.Transfer, { foreignKey: "branchChargesType" });

      MoneyType.hasMany(models.Receive, { foreignKey: "moneyTypeId" });
      MoneyType.hasMany(models.Exchange, { as: "SaleType", foreignKey: "saleMoneyType" });
      MoneyType.hasMany(models.Exchange, { as: "PurchaseType", foreignKey: "purchaseMoneyType" });
      MoneyType.belongsTo(models.Account, { foreignKey: "typeId" });
      
  };

  return MoneyType;
};
