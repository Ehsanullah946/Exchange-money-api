module.exports = (sequelize, DataTypes) => {
  const Exchanger = sequelize.define(
    'Exchanger',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      personId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      tableName: 'exchangers',
      timestamps: false,
    }
  );

  Exchanger.associate = (models) => {
    Exchanger.belongsTo(models.Person, { foreignKey: 'personId' });
    Exchanger.hasMany(models.Exchange, { foreignKey: 'exchangerId' });
  };

  return Exchanger;
};
