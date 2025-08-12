module.exports = (sequelize, DataTypes) => {
    const Employee = sequelize.define("Employee", {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
         position: DataTypes.STRING(64),
         stakeholderId: {
        type: DataTypes.INTEGER,
        allowNull:false
    }
    },
     {
    tableName: "employees",
    timestamps: false
  });

  Employee.associate = (models) => {
    Employee.belongsTo(models.Stakeholder, { foreignKey: "stakeholderId" });
    Employee.hasMany(models.UserAccount, { foreignKey: "employeeId" });
    Employee.hasMany(models.DepositWithdraw, { foreignKey: "employeeId" });
  };

  return Employee;
};
