module.exports = (sequelize, DataTypes) => {
    const ExtraReceiveNo = sequelize.define("ExtraReceiveNo", {
     id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    placeName: { type: DataTypes.STRING },
    receiveId: {
        type:DataTypes.INTEGER,
        allowNull:false
    }
    },
     {
    tableName: "extra_receive_numbers",
    timestamps: false
  });

  ExtraReceiveNo.associate = (models) => {
    ExtraReceiveNo.belongsTo(models.Receive, { foreignKey: "receiveId" });
  };

  return ExtraReceiveNo;
};
