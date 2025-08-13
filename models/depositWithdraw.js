module.exports = (sequelize, DataTypes) => {
  const DepositWithdraw = sequelize.define("DepositWithdraw", {
       No: { type: DataTypes.INTEGER, autoIncrement: true,primaryKey:true },
        deposit: {
        type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0.00
        },
        withdraw: {
        type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0.00
        },
        DWDate: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        description: { type: DataTypes.TEXT },
        deleted: { type: DataTypes.BOOLEAN, defaultValue: false },

        employeeId: {
        type: DataTypes.INTEGER,
        allowNull:true
    },
        organizationId: {
        type: DataTypes.INTEGER,
        allowNull:true
    },
        accountNo: {
        type: DataTypes.INTEGER,
        allowNull:false
    },
    fingerprint: { type: DataTypes.BLOB },
    photo: { type: DataTypes.BLOB},
    WithdrawReturnDate: { type: DataTypes.DATE },
  },
  {
    tableName: "depositWithdraw",
     timestamps: false,
}
  );
      DepositWithdraw.associate = (models) => {
       
        DepositWithdraw.belongsTo(models.Account, { foreignKey: "accountNo" });
        
      DepositWithdraw.belongsTo(models.Employee, { foreignKey: "employeeId" });
      DepositWithdraw.belongsTo(models.Organization, { foreignKey: "organizationId" });
  };
  return DepositWithdraw;
};
