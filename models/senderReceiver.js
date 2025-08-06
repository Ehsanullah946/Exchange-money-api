module.exports = (sequelize, DataTypes) => {
    const SenderReceiver = sequelize.define("SenderReceiver", {
       id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        stakeholderId: {
            type: DataTypes.INTEGER,
            allowNull:false
      },
        organizationId: {
        type: DataTypes.INTEGER,
          allowNull:false
        }
    },
     {
    tableName: "senderreceivers",
    timestamps: false
  });

  SenderReceiver.associate = (models) => {
    SenderReceiver.belongsTo(models.Stakeholder, { foreignKey: "stakeholderId" });
    SenderReceiver.belongsTo(models.Organization, { foreignKey: "organizationId" });
      
      SenderReceiver.hasMany(models.Transfer, { as: "Sender", foreignKey: "senderId" });
    
      SenderReceiver.hasMany(models.Transfer, { as: "Receiver", foreignKey: "receiverId" });

      SenderReceiver.hasMany(models.Receive, { foreignKey: "senderId" });
      SenderReceiver.hasMany(models.Receive, {  foreignKey: "receiverId" });
  };

  return SenderReceiver;
};
