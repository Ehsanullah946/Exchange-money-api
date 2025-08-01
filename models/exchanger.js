
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Exchanger = sequelize.define('Exchanger', {
  personId: {
    type: DataTypes.INTEGER,
    allowNull:false
  },
  organizationId: {
    type: DataTypes.INTEGER,
    allowNull:false
  }
}, {
  tableName: 'exchangers',
  timestamps: false
});


module.exports = Exchanger;
