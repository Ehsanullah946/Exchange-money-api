module.exports = (sequelize, DataTypes) => {
  const Stakeholder = sequelize.define("Stakeholder", {
    photo: { type: DataTypes.BLOB },
    gender: { type: DataTypes.STRING(2) },
    maritalStatus: { type: DataTypes.STRING(32) },
    job: { type: DataTypes.STRING(64) },
    permenentAdress: { type: DataTypes.TEXT }
  });

  Stakeholder.associate = (models) => {
    Stakeholder.belongsTo(models.Person, { foreignKey: "personId" });
    Stakeholder.belongsTo(models.Organization, { foreignKey: "organizationId" });
    Stakeholder.hasOne(models.Customer, { foreignKey: "stakeholderId" });
    Stakeholder.hasOne(models.Employee, { foreignKey: "stakeholderId" });
    Stakeholder.hasOne(models.SenderReceiver, { foreignKey: "stakeholderId" });
  };

  return Stakeholder;
};
