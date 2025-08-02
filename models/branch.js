module.exports = (sequelize, DataTypes) => {
  const Branch = sequelize.define("Branch", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    contractType: {
        type: DataTypes.STRING,
        allowNull: false
    },
    deleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    faxNo: {
        type: DataTypes.STRING(32),
        allowNull: true
    },
    direct: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    organizationId: {
        type: DataTypes.INTEGER,
        allowNull:false
    },
    customerId: {
        type: DataTypes.INTEGER,
        allowNull:false
    }
  });

  Branch.associate = (models) => {
      Branch.belongsTo(models.Organization, { foreignKey: "organizationId" });
      Branch.belongsTo(models.Customer, { foreignKey: "branchId" });
      Branch.hasMany(models.ExtraTransferNo, { foreignKey: "branchId"});
      Branch.hasMany(models.Receive, { foreignKey: "fromWhere" });
      Branch.hasMany(models.Tranfer, { foreignKey: "toWhere" });
      Branch.hasMany(models.Receive, { foreignKey: "passTo" });
  };

  return Branch;
};
