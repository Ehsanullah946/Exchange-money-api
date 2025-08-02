module.exports = (sequelize, DataTypes) => {
  const UserAccount = sequelize.define("UserAccount", {
    username: { type: DataTypes.STRING(64), allowNull: false },
    password: { type: DataTypes.STRING(200), allowNull: false },
    email: {
      type: DataTypes.STRING(64), allowNull: false,  unique: 'usr_email',
      set(val) {
      const email = (!val) ? this.getDataValue('username') : val;
      this.setDataValue('email', email.toLowerCase());
      },
      validate: {
      isEmail: true
      }
      },
    usertypeId: { type: DataTypes.INTEGER, allowNull: false },
    whatsApp: { type: DataTypes.STRING(64) }
  });

  UserAccount.associate = (models) => {
    UserAccount.belongsTo(models.Organization, { foreignKey: "organizationId" });
    UserAccount.belongsTo(models.Employee, { foreignKey: "employeeId" });
  };

  return UserAccount;
};