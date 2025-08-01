const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');


const UserAccount = sequelize.define('UserAccount', {
  username: { type: DataTypes.STRING(64), allowNull: false },
  password: { type: DataTypes.STRING(200), allowNull: false },
  email: { type: DataTypes.STRING(64), unique: true },
  usertypeId: {type: DataTypes.INTEGER, allowNull:false},
  whatsApp: DataTypes.STRING(64),
  organizationId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  }
}, {
  tableName: 'userAccounts',
  timestamps: false
});


// UserAccount.belongsTo(Employee, { foreignKey: 'employeeId' });
// Employee.hasOne(UserAccount, { foreignKey: 'employeeId' });

// UserAccount.belongsTo(Organization, { foreignKey: 'organizationId' });
// Organization.hasMany(UserAccount, { foreignKey: 'organizationId' });

module.exports = UserAccount;
