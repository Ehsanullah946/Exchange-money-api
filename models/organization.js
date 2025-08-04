module.exports = (sequelize, DataTypes) => {
  const Organization = sequelize.define("Organization", {
    name: DataTypes.STRING,
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: "organizations",
    timestamps: false
  });

  Organization.associate = (models) => {
      Organization.hasMany(models.Exchange, { foreignKey: "organizationId" });
      Organization.hasMany(models.Exchanger, { foreignKey: "organizationId" });
      Organization.hasMany(models.MoneyType, { foreignKey: "organizationId" });
      Organization.hasMany(models.SenderReceiver, { foreignKey: "organizationId" });
      Organization.hasMany(models.Person, { foreignKey: "organizationId" });
      Organization.hasMany(models.Receive, { foreignKey: "organizationId" });
      Organization.hasMany(models.Transfer, { foreignKey: "organizationId" });
      Organization.hasMany(models.UserAccount, { foreignKey: "organizationId" });
  };

  return Organization;
};
