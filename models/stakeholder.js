const { defaultValueSchemable, toDefaultValue } = require("sequelize/lib/utils");

module.exports = (sequelize, DataTypes) => {
  const Stakeholder = sequelize.define("Stakeholder", {
    gender: { type: DataTypes.STRING(2) },
    maritalStatus: { type: DataTypes.STRING(32) },
    job: { type: DataTypes.STRING(64) },
    permanentAddress: { type: DataTypes.TEXT },
    password: {
      type: DataTypes.STRING(300),
      allowNull: true,
      },
      canLogin: {
      type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue:false
      }
  },
   {
    tableName: "stakeholders",
    timestamps: false
  });

  Stakeholder.associate = (models) => {
    Stakeholder.belongsTo(models.Person, { foreignKey: "personId" });
    Stakeholder.hasOne(models.Customer, { foreignKey: "stakeholderId" });
    Stakeholder.hasOne(models.Employee, { foreignKey: "stakeholderId" });
    Stakeholder.hasOne(models.SenderReceiver, { foreignKey: "stakeholderId" });
  };

  return Stakeholder;
};
