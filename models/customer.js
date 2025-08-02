module.exports = (sequelize, DataTypes) => {
  const Customer = sequelize.define("Customer", {
    whatsApp: { type: DataTypes.STRING(32) },
    emailAddress: { type: DataTypes.STRING(64) },
    typeId: { type: DataTypes.INTEGER },
    telegram: { type: DataTypes.STRING(32) },
    language: { type: DataTypes.INTEGER, allowNull: false },
    active: { type: DataTypes.INTEGER },
    loanLimit: { type: DataTypes.FLOAT },
    customerWhatsAppEnabled: { type: DataTypes.STRING(2) },
    customerTelegramEnabled: { type: DataTypes.STRING(2) },
    customerEmailEnabled: { type: DataTypes.STRING(2) }
  });

  Customer.associate = (models) => {
      Customer.belongsTo(models.Stakeholder, { foreignKey: "stakeholderId" });
      Customer.belongsTo(models.Organization, { foreignKey: "organizationId" });
      Customer.belongsTo(models.Branch, { foreignKey: "branchId" });
      Customer.hasMany(models.Account, { foreignKey: "customerId" });
  };

  return Customer;
};
