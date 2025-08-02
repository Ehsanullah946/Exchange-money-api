module.exports = (sequelize, DataTypes) => {
    const Employee = sequelize.define("Employee", {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
     position: DataTypes.STRING(64),
     organizationId: {
        type: DataTypes.INTEGER,
        allowNull:false
    },
     stakeholderId: {
        type: DataTypes.INTEGER,
        allowNull:false
    }
  });

  Employee.associate = (models) => {
    Employee.belongsTo(models.Stakeholder, { foreignKey: "stakeholderId" });
    Employee.belongsTo(models.Organization, { foreignKey: "organizationId" });
    Employee.hasMany(models.UserAccount, { foreignKey: "employeeId" });
  };

  return Employee;
};
