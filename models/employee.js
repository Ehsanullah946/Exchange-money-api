const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Stakeholder = require('./stakeholder');
const Organization = require('./organization');

const Employee = sequelize.define('Employee', {
  position: DataTypes.STRING(64)
}, {
  tableName: 'employees',
  timestamps: false
});

Employee.belongsTo(Stakeholder, { foreignKey: 'stakeholderId' });
Stakeholder.hasOne(Employee, { foreignKey: 'stakeholderId' });

Employee.belongsTo(Organization, { foreignKey: 'organizationId' });
Organization.hasMany(Employee, { foreignKey: 'organizationId' });

module.exports = Employee;
