const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Organization = require("./organization");
const Customer = require("./customer");

const Place = sequelize.define("Place", {
    contractType: {
        type: DataTypes.STRING,
        allowNull: false
    },
    deleted: { type: DataTypes.BOOLEAN, defaultValue: false },
    faxNo: { type: DataTypes.INTEGER, allowNull: true },
    chargesCustomerId: { type: DataTypes.INTEGER, allowNull: true },
    direct: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
    tableName: "places",
    timestamps: false
});

// Relations
Place.belongsTo(Customer, { foreignKey: "id" });
Customer.hasOne(Place, { foreignKey: "id" });

Place.belongsTo(Organization, { foreignKey: "organizationId" });
Organization.hasMany(Place, { foreignKey: "organizationId" });

module.exports = Place;

