const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const organization = require("./organization");
const person = require("./preson");

const Stakeholder = sequelize.define("Stakeholder", {
    photo: DataTypes.BLOB,
    gender: DataTypes.ENUM("M", "F", "O"),
    maritalStatus: DataTypes.STRING(32),
    job: DataTypes.STRING(64),
    permanentAddress: DataTypes.TEXT
}, {
    tableName: "stakeholders",
    timestamps: false
});

Stakeholder.belongsTo(organization, { foreignKey: "organizationId" });
organization.hasMany(Stakeholder, { foreignKey: "organizationId" });

Stakeholder.belongsTo(person, { foreignKey: "personId" });
person.hasMany(Stakeholder, { foreignKey: "personId" });


module.exports = Stakeholder;