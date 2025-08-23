module.exports = (sequelize, DataTypes) => {
  const Person = sequelize.define(
    'Person',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      firstName: {
        type: DataTypes.STRING(32),
        allowNull: false,
      },
      lastName: DataTypes.STRING(32),
      fatherName: DataTypes.STRING(32),
      photo: DataTypes.STRING(300),
      nationalCode: {
        type: DataTypes.STRING(64),
        unique: 'person_nationalCode',
      },
      phone: {
<<<<<<< HEAD
        type: DataTypes.STRING(20),
        unique: true,
        validate: {
          is: /^\+?[\d\s-]+$/, // Basic phone format validation
=======
        type: DataTypes.STRING(15),
        unique: true,
        validate: {
          is: /^\+?[\d\s-]+$/, // Basic phone validation
>>>>>>> 65eaed8 (adding some column to person)
        },
      },
      email: {
        type: DataTypes.STRING,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      isVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
<<<<<<< HEAD
      verificationCode: DataTypes.STRING,
      codeExpiresAt: DataTypes.DATE,
=======
      verificationCode: DataTypes.STRING(6),
      codeExpiresAt: DataTypes.DATE,
      lastLogin: DataTypes.DATE,

>>>>>>> 65eaed8 (adding some column to person)
      currentAddress: DataTypes.TEXT,
      organizationId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      tableName: 'persons',
      timestamps: false,
    }
  );

  Person.associate = (models) => {
    Person.belongsTo(models.Organization, { foreignKey: 'organizationId' });
    Person.hasOne(models.Stakeholder, { foreignKey: 'personId' });
    Person.hasOne(models.Exchanger, { foreignKey: 'personId' });
  };

  return Person;
};
