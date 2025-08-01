// const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");


const ExtraTransferNumber = sequelize.define("ExtraTransferNumber", {}, {
    tableName: "extra_transfer_numbers",
    timestamps: false
});


module.exports = ExtraTransferNumber;
