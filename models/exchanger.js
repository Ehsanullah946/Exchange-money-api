
const sequelize = require('../config/database');
const Person = require('./person');
const Organization = require('./organization');

const Exchanger = sequelize.define('Exchanger', {}, {
  tableName: 'exchangers',
  timestamps: false
});

// Relationships
Exchanger.belongsTo(Person, { foreignKey: 'personId' });
Person.hasOne(Exchanger, { foreignKey: 'personId' });

Exchanger.belongsTo(Organization, { foreignKey: 'organizationId' });
Organization.hasMany(Exchanger, { foreignKey: 'organizationId' });

module.exports = Exchanger;
