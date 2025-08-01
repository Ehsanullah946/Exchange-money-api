const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");


const ExtraReceiveNumber = sequelize.define("ExtraReceiveNumber", {
    placeName: { type: DataTypes.STRING }
}, {
    tableName: "extra_receive_numbers",
    timestamps: false
});

module.exports = ExtraReceiveNumber;
