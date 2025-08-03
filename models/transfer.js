module.exports = (sequelize, DataTypes) => {
  const Transfer = sequelize.define("Transfer", {
    id: { type: DataTypes.INTEGER, autoIncrement: true,unique:true},
    transferNo: { type: DataTypes.STRING, allowNull: false, primaryKey: true  },
    transferAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, primaryKey: true  },
    chargesAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },
    chargesType: { type: DataTypes.INTEGER, allowNull: false,defaultValue: 1 },
    tDate: { type: DataTypes.DATE, allowNull: false, primaryKey: true  },
    description: { type: DataTypes.TEXT },
    fingerprint: { type: DataTypes.BLOB },
    photo: { type: DataTypes.BLOB },
    guarantorRelation: { type: DataTypes.STRING },
    deleted: { type: DataTypes.BOOLEAN, defaultValue: false },
    rejected: { type: DataTypes.BOOLEAN, defaultValue: false },
    branchCharges: { type: DataTypes.DECIMAL(10, 2) },
    branchChargesType: { type: DataTypes.INTEGER},
    toWhere: {
        type: DataTypes.INTEGER,
        allowNull: false,
         primaryKey: true 
    },
    organizationId: {
        type: DataTypes.INTEGER,
        allowNull:false
    },
    receiverId: {
        type: DataTypes.INTEGER,
        allowNull:false
    },
    senderId: {
        type: DataTypes.INTEGER,
        allowNull:false
    },
    customer: {
        type: DataTypes.INTEGER,
    },
    employeeId: {
        type: DataTypes.INTEGER,
    },
    exchangeId: {
        type: DataTypes.INTEGER,
    },
    moneyTypeId: {
        type: DataTypes.INTEGER,
        allowNull:false
    }
  },
   {
    tableName: "transfers",
    timestamps: false
  });

  Transfer.associate = (models) => {
    Transfer.hasMany(models.ExtraTransferNo, { foreignKey: "transferId" });
      Transfer.belongsTo(models.Organization, { foreignKey: "organizationId" });
      
    Transfer.belongsTo(models.Customer, { foreignKey: "customerId" });
    Transfer.belongsTo(models.Employee, { foreignKey: "employeeId" });
      
    Transfer.belongsTo(models.SenderReceiver, { foreignKey: "senderId" });
    Transfer.belongsTo(models.SenderReceiver, { foreignKey: "receiverId" });
    Transfer.belongsTo(models.Branch, { foreignKey: "toWhere" });
    Transfer.belongsTo(models.Exchange, { foreignKey: "exchangeId" });
    Transfer.belongsTo(models.MoneyType, { foreignKey: "moneyTypeId" });
    Transfer.belongsTo(models.MoneyType, { foreignKey: "branchChargesType" });
    Transfer.belongsTo(models.MoneyType, { foreignKey: "chargesType" });
  };

  return Transfer;
};