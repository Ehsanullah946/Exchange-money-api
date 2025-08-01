const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');


const SenderReceiver = sequelize.define('SenderReceiver', {
  stakeholderId: {
    type: DataTypes.INTEGER,
    allowNull:false
  },
  organizationId: {
    type: DataTypes.INTEGER,
    allowNull:false
  }
}, {
  tableName: 'senderReceivers',
  timestamps: false
});

// Relationships



module.exports = SenderReceiver;
