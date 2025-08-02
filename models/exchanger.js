module.exports = (sequelize, DataTypes) => {
    const Exchanger = sequelize.define("Exchanger", {
         id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
         personId: {
          type: DataTypes.INTEGER,
          allowNull:false
        },
        organizationId: {
          type: DataTypes.INTEGER,
          allowNull:false
        }
  });

  Exchanger.associate = (models) => {
    Exchanger.belongsTo(models.Customer, { foreignKey: "customerId" });
    Exchanger.belongsTo(models.Organization, { foreignKey: "organizationId" });
  };

  return Exchanger;
};
