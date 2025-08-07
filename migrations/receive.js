'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
   async up(queryInterface, Sequelize) {
    await queryInterface.createTable('receives', {
    id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey:true},
    receiveNo: { type: Sequelize.STRING, allowNull: false  },
    receiveAmount: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
    chargesAmount: { type: Sequelize.DECIMAL(10, 2), allowNull: false , defaultValue: 0.00 },
    chargesType: { type: Sequelize.INTEGER, allowNull: false ,defaultValue:1},
    rDate: { type: Sequelize.DATE, allowNull: false },
    description: { type: Sequelize.TEXT },
    photo: { type: Sequelize.BLOB },
    fingerprint: { type: Sequelize.BLOB },
    guarantorRelation: { type: Sequelize.STRING },
    deleted: { type: Sequelize.BOOLEAN, defaultValue: false  },
    rejected: { type: Sequelize.BOOLEAN, defaultValue: false },
    branchCharges: { type: Sequelize.DECIMAL(10, 2) },
    branchChargesType: { type: Sequelize.INTEGER },
    passTo: { type: Sequelize.INTEGER },
    passNo: { type: Sequelize.STRING },
    returnNo: { type: Sequelize.INTEGER },
    fromWhere: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    organizationId: {
        type: Sequelize.INTEGER,
        allowNull:false
    },
    senderId: {
        type: Sequelize.INTEGER,
        allowNull:false
    },
    receiverId: {
        type: Sequelize.INTEGER,
        allowNull:false
    },
    customerId: {
        type: Sequelize.INTEGER,
    },
    employeeId: {
        type: Sequelize.INTEGER,
    },
    moneyTypeId: {
        type: Sequelize.INTEGER,
        allowNull:false
    },
    exchangeId: {
        type: Sequelize.INTEGER,
    }
    },
        {
    tableName: "receives",
     timestamps: false,
         indexes: [
      {
        unique: true,
        fields: ["receiveNo", "receiveAmount", "rDate", "deleted"]
      }
    ]
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('receives');
  }
};
