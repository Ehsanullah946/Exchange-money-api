const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const organization = require("./organization");


const Person = sequelize.define("Person", {
    firstName: {
        type: DataTypes.STRING(32),
        allowNull: false,
        
    },
    lastName: DataTypes.STRING(32),
    fatherName: DataTypes.STRING(32),
    nationalCode: {
        type: DataTypes.STRING(64),
        unique: true
    },
    phoenNo: DataTypes.STRING(15),
    currentAddress: DataTypes.TEXT

}, {
    tableName: "persons",
    timestamps: false
});

Person.belongsTo(organization, { foreignKey: "organizationId" });
organization.hasMany(Person, { foreignKey: "organizationId" })

module.exports = Person;