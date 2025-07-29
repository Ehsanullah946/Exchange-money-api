const { Sequelize } = require("sequelize");
require("dotenv").config();

// eslint-disable-next-line no-undef
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    // eslint-disable-next-line no-undef
    host: process.env.DB_HOST,
    dialect: "mysql"
});

console.log("connection is created");

module.exports = sequelize;
