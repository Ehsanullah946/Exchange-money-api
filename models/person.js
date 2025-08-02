module.exports = (sequelize, DataTypes) => {
  const Person = sequelize.define("Person", {
    firstName: { type: DataTypes.STRING(32), allowNull: false },
    lastName: { type: DataTypes.STRING(32) },
    fatherName: { type: DataTypes.STRING(32) },
    nationalCode: { type: DataTypes.STRING(64), unique: true },
    phoneNo: { type: DataTypes.STRING(15) },
    currentAddress: { type: DataTypes.TEXT }
  });

  Person.associate = (models) => {
    Person.belongsTo(models.Organization, { foreignKey: "organizationId" });
      Person.hasOne(models.Stakeholder, { foreignKey: "personId" });
      Person.hasOne(models.Exchanger, { foreignKey: 'personId' });
  };

  return Person;
};