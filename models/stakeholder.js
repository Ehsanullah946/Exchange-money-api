const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");


const Stakeholder = sequelize.define("Stakeholder", {
    gender: DataTypes.ENUM("M", "F", "O"),
    maritalStatus: DataTypes.STRING(32),
    job: DataTypes.STRING(64),
    permanentAddress: DataTypes.TEXT,
    organizationId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    },
    personId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    }
    
}, {
    tableName: "stakeholders",
    timestamps: false
});



module.exports = Stakeholder;