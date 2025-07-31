const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Receive = require("./receive");

const ExtraReceiveNumber = sequelize.define("ExtraReceiveNumber", {
    placeName: { type: DataTypes.STRING }
}, {
    tableName: "extra_receive_numbers",
    timestamps: false
});

ExtraReceiveNumber.belongsTo(Receive, { foreignKey: "receiveId" });
Receive.hasMany(ExtraReceiveNumber, { foreignKey: "receiveId" });

module.exports = ExtraReceiveNumber;
