const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');


const Employee = sequelize.define('Employee', {
  position: DataTypes.STRING(64),
     organizationId: {
        type: DataTypes.INTEGER,
        allowNull:false
    }
}, {
  tableName: 'employees',
  timestamps: false
});

// Employee.belongsTo(Stakeholder, { foreignKey: 'stakeholderId' });
// Stakeholder.hasOne(Employee, { foreignKey: 'stakeholderId' });

// Employee.belongsTo(Organization, { foreignKey: 'organizationId' });
// Organization.hasMany(Employee, { foreignKey: 'organizationId' });

module.exports = Employee;
