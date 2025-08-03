module.exports = (sequelize, DataTypes) => {
    const ExtraTransferNo = sequelize.define("ExtraTransferNo", {
     id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      branchId: {
        type: DataTypes.INTEGER,
        allowNull:false
    },
    transferId: {
        type: DataTypes.INTEGER,
        allowNull:false
    }
    },
     {
    tableName: "extra_transfer_numbers",
    timestamps: false
  });

  ExtraTransferNo.associate = (models) => {
    ExtraTransferNo.belongsTo(models.Stakeholder, { foreignKey: "transferId" });
    ExtraTransferNo.belongsTo(models.Branch, { foreignKey: "branchId" });
  };

  return ExtraTransferNo;
};
