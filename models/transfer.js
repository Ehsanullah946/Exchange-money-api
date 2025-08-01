const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");


const Transfer = sequelize.define("Transfer", {
    transferNo: { type: DataTypes.STRING, allowNull: false },
    transferAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    chargesAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    tDate: { type: DataTypes.DATE, allowNull: false },
    description: { type: DataTypes.TEXT },
    fingerprint: { type: DataTypes.BLOB },
    photo: { type: DataTypes.BLOB },
    guarantorRelation: { type: DataTypes.STRING },
    deleted: { type: DataTypes.BOOLEAN, defaultValue: false },
    rejected: { type: DataTypes.BOOLEAN, defaultValue: false },
    placeCharges: { type: DataTypes.DECIMAL(10, 2) }
}, {
    tableName: "transfers",
    timestamps: false
});

// // Relations
// Transfer.belongsTo(Branch, { foreignKey: "toWhere" });
// Transfer.belongsTo(MoneyType, { foreignKey: "moneyTypeId" });
// Transfer.belongsTo(SenderReceiver, { as: "Sender", foreignKey: "senderId" });
// Transfer.belongsTo(SenderReceiver, { as: "Receiver", foreignKey: "receiverId" });
// Transfer.belongsTo(Employee, { foreignKey: "employeeId" });
// Transfer.belongsTo(Customer, { foreignKey: "customerId" });
// Transfer.belongsTo(Exchange, { foreignKey: "exchangeId" });
// Transfer.belongsTo(Organization, { foreignKey: "organizationId" });

module.exports = Transfer;
