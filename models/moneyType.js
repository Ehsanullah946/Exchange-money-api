const addOrgSequence = require('../utils/orgSequenceHelper');
module.exports = (sequelize, DataTypes) => {
  const MoneyType = sequelize.define(
    'MoneyType',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      number: { type: DataTypes.INTEGER },
      typeName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      organizationId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      tableName: 'types',
      timestamps: false,
    }
  );

  MoneyType.associate = (models) => {
    //   console.log("models.Transfer:", models.Transfer);
    // console.log("models.Receive:", models.Receive);
    //  console.log("models.Exchange:", models.Exchange);
    //   console.log("models.Account:", models.Account);

    MoneyType.belongsTo(models.Organization, { foreignKey: 'organizationId' });

    MoneyType.hasMany(models.Transfer, { foreignKey: 'moneyTypeId' });
    MoneyType.hasMany(models.Transfer, { foreignKey: 'chargesType' });
    MoneyType.hasMany(models.Transfer, { foreignKey: 'branchChargesType' });

    MoneyType.hasMany(models.Receive, { foreignKey: 'branchChargesType' });
    MoneyType.hasMany(models.Receive, { foreignKey: 'moneyTypeId' });
    MoneyType.hasMany(models.Expence, { foreignKey: 'moneyTypeId' });
    MoneyType.hasMany(models.Receive, { foreignKey: 'chargesType' });

    MoneyType.hasMany(models.Exchange, {
      as: 'SaleType',
      foreignKey: 'saleMoneyType',
    });
    MoneyType.hasMany(models.Exchange, {
      as: 'PurchaseType',
      foreignKey: 'purchaseMoneyType',
    });
    MoneyType.hasMany(models.Account, { foreignKey: 'moneyTypeId' });
    MoneyType.hasMany(models.Rate, { foreignKey: 'fromCurrency' });
  };

  addOrgSequence(MoneyType, 'number');

  return MoneyType;
};
