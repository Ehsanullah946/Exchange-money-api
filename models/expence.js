module.exports = (sequelize, DataTypes) => {
  const Expence = sequelize.define(
    'Expence',
    {
      No: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      moneyTypeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      eDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      description: { type: DataTypes.TEXT },
      deleted: { type: DataTypes.BOOLEAN, defaultValue: false },
      employeeId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      organizationId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      expenceType: {
        type: DataTypes.INTEGER,
      },
    },
    {
      tableName: 'expences',
      timestamps: false,
      indexes: [
        {
          unique: true,
          fields: [`amount`, `moneyTypeId`, `eDate`, `deleted`, `expenceType`],
          name: 'expence_composite_pk',
        },
      ],
    }
  );
  Expence.associate = (models) => {
    Expence.belongsTo(models.Employee, { foreignKey: 'employeeId' });
    Expence.belongsTo(models.MoneyType, { foreignKey: 'moneyTypeId' });
    Expence.belongsTo(models.Organization, {
      foreignKey: 'organizationId',
    });
  };
  return Expence;
};
