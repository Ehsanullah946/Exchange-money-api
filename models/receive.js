module.exports = (sequelize, DataTypes) => {
    const Receive = sequelize.define("Receive", {
    id: { type: DataTypes.INTEGER, autoIncrement: true,unique:true},
    receiveNo: { type: DataTypes.STRING, allowNull: false, primaryKey: true  },
    receiveAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, primaryKey: true  },
    chargesAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false , defaultValue: 0.00 },
    chargesType: { type: DataTypes.INTEGER, allowNull: false ,defaultValue:1},
    rDate: { type: DataTypes.DATE, allowNull: false, primaryKey: true  },
    description: { type: DataTypes.TEXT },
    photo: { type: DataTypes.BLOB },
    fingerprint: { type: DataTypes.BLOB },
    guarantorRelation: { type: DataTypes.STRING },
    deleted: { type: DataTypes.BOOLEAN, defaultValue: false, primaryKey: true  },
    receivedDate: { type: DataTypes.DATE },
    rejected: { type: DataTypes.BOOLEAN, defaultValue: false },
    branchCharges: { type: DataTypes.DECIMAL(10, 2) },
    branchChargesType: { type: DataTypes.INTEGER },
    passTo: { type: DataTypes.INTEGER },
    passNo: { type: DataTypes.STRING },
    returnNo: { type: DataTypes.INTEGER },
    fromWhere: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true 
    },
    organizationId: {
        type: DataTypes.INTEGER,
        allowNull:false
    },
    senderId: {
        type: DataTypes.INTEGER,
        allowNull:false
    },
    receiverId: {
        type: DataTypes.INTEGER,
        allowNull:false
    },
    customerId: {
        type: DataTypes.INTEGER,
    },
    employeeId: {
        type: DataTypes.INTEGER,
    },
    moneyTypeId: {
        type: DataTypes.INTEGER,
        allowNull:false
    },
    exchangeId: {
        type: DataTypes.INTEGER,
    }
  });

  Receive.associate = (models) => {
    Receive.belongsTo(models.Customer, { foreignKey: "customerId" });
      Receive.belongsTo(models.Organization, { foreignKey: "organizationId" });

    Receive.hasMany(models.ExtraReceiveNo, { foreignKey: "receiveId" });
      
    Receive.belongsTo(models.Customer, { foreignKey: "customerId" });
    Receive.belongsTo(models.Employee, { foreignKey: "employeeId" });
      
    Receive.belongsTo(models.SenderReceiver, { foreignKey: "senderId" });
    Receive.belongsTo(models.SenderReceiver, { foreignKey: "receiverId" });
    Receive.belongsTo(models.Branch, { foreignKey: "fromWhere" });
    Receive.belongsTo(models.Branch, { foreignKey: "passTo" });
    Receive.belongsTo(models.Exchange, { foreignKey: "exchangeId" });
    Receive.belongsTo(models.MoneyType, { foreignKey: "moneyTypeId" });
    Receive.belongsTo(models.MoneyType, { foreignKey: "branchChargesType" });
    Receive.belongsTo(models.MoneyType, { foreignKey: "chargesType" });
      
  };

  return Receive;
};
