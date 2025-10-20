module.exports = (sequelize, DataTypes) => {
  const Salary = sequelize.define(
    'Salary',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      grossSalary: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      tax: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      netSalary: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      bonus: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
      deductions: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
      salaryDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      paymentStatus: {
        type: DataTypes.ENUM('pending', 'paid', 'cancelled'),
        defaultValue: 'pending',
      },
      paymentDate: DataTypes.DATE,
      notes: DataTypes.TEXT,
      moneyTypeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      employeeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      organizationId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      tableName: 'salary',
      timestamps: false, // Enable timestamps for created/updated dates
    }
  );

  Salary.associate = (models) => {
    Salary.belongsTo(models.Employee, {
      foreignKey: 'employeeId',
      as: 'employee',
    });
    Salary.belongsTo(models.MoneyType, {
      foreignKey: 'moneyTypeId',
      as: 'moneyType',
    });
    Salary.belongsTo(models.Organization, {
      foreignKey: 'organizationId',
      as: 'organization',
    });
  };

  Salary.beforeSave((salary) => {
    if (
      salary.changed('grossSalary') ||
      salary.changed('tax') ||
      salary.changed('bonus') ||
      salary.changed('deductions')
    ) {
      salary.netSalary =
        parseFloat(salary.grossSalary) +
        parseFloat(salary.bonus) -
        parseFloat(salary.tax) -
        parseFloat(salary.deductions);
    }
  });

  return Salary;
};
