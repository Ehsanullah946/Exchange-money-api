const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");



const Person = sequelize.define("Person", {
    firstName: {
        type: DataTypes.STRING(32),
        allowNull: false,     
    },
    lastName: DataTypes.STRING(32),
    fatherName: DataTypes.STRING(32),
    photo:DataTypes.STRING(300),
    nationalCode: {
        type: DataTypes.STRING(64),
        unique: true
    },
    phoneNo: DataTypes.STRING(15),
    currentAddress: DataTypes.TEXT,
    organizationId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  }

}, {
    tableName: "persons",
    timestamps: false
});


module.exports = Person;