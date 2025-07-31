// const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Transfer = require("./transfer");
const Place = require("./places");

const ExtraTransferNumber = sequelize.define("ExtraTransferNumber", {}, {
    tableName: "extra_transfer_numbers",
    timestamps: false
});

ExtraTransferNumber.belongsTo(Place, { foreignKey: "placeId" });
ExtraTransferNumber.belongsTo(Transfer, { foreignKey: "transferId" });

Place.hasMany(ExtraTransferNumber, { foreignKey: "placeId" });
Transfer.hasMany(ExtraTransferNumber, { foreignKey: "transferId" });

module.exports = ExtraTransferNumber;
