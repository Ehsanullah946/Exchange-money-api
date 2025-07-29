const sequelize = require('../config/database');
const Stakeholder = require('./stakeholder');
const Organization = require('./organization');

const SenderReceiver = sequelize.define('SenderReceiver', {}, {
  tableName: 'senderReceivers',
  timestamps: false
});

// Relationships
SenderReceiver.belongsTo(Stakeholder, { foreignKey: 'stakeholderId' });
Stakeholder.hasOne(SenderReceiver, { foreignKey: 'stakeholderId' });

SenderReceiver.belongsTo(Organization, { foreignKey: 'organizationId' });
Organization.hasMany(SenderReceiver, { foreignKey: 'organizationId' });

module.exports = SenderReceiver;
