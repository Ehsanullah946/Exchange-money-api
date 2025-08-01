const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");


const Receive = sequelize.define("Receive", {
    receiveNo: { type: DataTypes.STRING, allowNull: false },
    receiveAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    chargesAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    rDate: { type: DataTypes.DATE, allowNull: false },
    description: { type: DataTypes.TEXT },
    photo: { type: DataTypes.BLOB },
    fingerprint: { type: DataTypes.BLOB },
    guarantorRelation: { type: DataTypes.STRING },
    deleted: { type: DataTypes.BOOLEAN, defaultValue: false },
    receivedDate: { type: DataTypes.DATE },
    rejected: { type: DataTypes.BOOLEAN, defaultValue: false },
    placeCharges: { type: DataTypes.DECIMAL(10, 2) }
}, {
    tableName: "receives",
    timestamps: false
});

// Relations
// Receive.belongsTo(Branch, { foreignKey: "fromWhere" });
// Receive.belongsTo(MoneyType, { foreignKey: "moneyTypeId" });
// Receive.belongsTo(Employee, { foreignKey: "employeeId" });
// Receive.belongsTo(Customer, { foreignKey: "customerId" });
// Receive.belongsTo(Exchange, { foreignKey: "exchangeId" });
// Receive.belongsTo(SenderReceiver, { as: "Sender", foreignKey: "senderId" });
// Receive.belongsTo(SenderReceiver, { as: "Receiver", foreignKey: "receiverId" });
// Receive.belongsTo(Organization, { foreignKey: "organizationId" });

module.exports = Receive;
