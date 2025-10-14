module.exports = (sequelize, DataTypes) => {
  const Salary = sequelize.define(
    'Salary',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      grossSalary: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      tax: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      netSalary: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      moneyTypeId: DataTypes.INTEGER,
      employeeId: DataTypes.INTEGER,
    },
    {
      tableName: 'salary',
      timestamps: false,
    }
  );

  Salary.associate = (models) => {
    Salary.belongsTo(models.Employee, { foreignKey: 'employeeId' });
    Salary.belongsTo(models.MoneyType, { foreignKey: 'moneyTypeId' });
  };

  return Salary;
};
