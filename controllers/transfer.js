const { sequelize, Transfer, Account, Branch, Person, Stakeholder, SenderReceiver } = require("../models");

// 🔹 Helper: Reverse balances for a transfer
async function reverseTransferAccounts(transfer, t) {
  // Reverse customer account if exists
  if (transfer.customerId) {
    const customerAccount = await Account.findOne({
      where: { customerId: transfer.customerId, moneyTypeId: transfer.moneyTypeId },
      transaction: t
    });
    if (customerAccount) {
      customerAccount.credit += parseFloat(transfer.transferAmount) + parseFloat(transfer.chargesAmount);
      await customerAccount.save({ transaction: t });
   }
  }

  // Reverse branch account
  const branch = await Branch.findByPk(transfer.toWhere, { transaction: t });
  if (branch) {
    const branchAccount = await Account.findOne({
      where: { customerId: branch.customerId, moneyTypeId: transfer.moneyTypeId },
      transaction: t
    });
    if (branchAccount) {
      branchAccount.credit -= parseFloat(transfer.transferAmount) + parseFloat(transfer.branchCharges);
      await branchAccount.save({ transaction: t });
    }
  }
}

// 🔹 CREATE
// exports.createTransfer = async (req, res) => {
//   const t = await sequelize.transaction();
//   try {
//     const {
//       transferAmount,
//       chargesAmount = 0,
//       chargesType,
//       branchCharges = 0,
//       branchChargesType,
//       tDate,
//       description,
//       guarantorRelation,
//       toWhere,          // Branch ID
//       customerId,       // Optional
//       senderFirstName,
//       receiverFirstName,
//       moneyTypeId
//     } = req.body;

//     const orgId = req.orgId;

//     // 1️⃣ Generate transfer number
//     const lastTransfer = await Transfer.findOne({
//       where: { organizationId: orgId, toWhere },
//       order: [["transferNo", "DESC"]],
//       transaction: t
//     });
//     const nextTransferNo = lastTransfer ? parseInt(lastTransfer.transferNo) + 1 : 1;
//     // 2️⃣ Find or create sender/receiver
//     const findOrCreateSenderReceiver = async (firstName) => {
//       const [person] = await Person.findOrCreate({
//         where: { firstName, organizationId: orgId },
//         defaults: { firstName, organizationId: orgId },
//         transaction: t
//       });

//       const [stakeholder] = await Stakeholder.findOrCreate({
//         where: { personId: person.id },
//         defaults: { personId: person.id },
//         transaction: t
//       });

//       const [sr] = await SenderReceiver.findOrCreate({
//         where: { stakeholderId: stakeholder.id, organizationId: orgId },
//         defaults: { stakeholderId: stakeholder.id, organizationId: orgId },
//         transaction: t
//       });

//       return sr.id;
//     };

//     const senderId = await findOrCreateSenderReceiver(senderFirstName);
//     const receiverId = await findOrCreateSenderReceiver(receiverFirstName);

//     // 3️⃣ Deduct from customer account
//     if (customerId) {
//       const customerAccount = await Account.findOne({
//         where: { customerId, moneyTypeId },
//         transaction: t
//       });
//       if (!customerAccount) {
//         await t.rollback();
//         return res.status(400).json({ message: "Customer account not found for this currency" });
//       }
//       customerAccount.credit -= parseFloat(transferAmount) + parseFloat(chargesAmount);
//       await customerAccount.save({ transaction: t });
//     }

//     // 4️⃣ Add to branch account
//     const branch = await Branch.findByPk(toWhere, { transaction: t });
//     if (!branch) {
//       await t.rollback();
//       return res.status(400).json({ message: "Branch not found" });
//     }

//     const branchAccount = await Account.findOne({
//       where: { customerId: branch.customerId, moneyTypeId },
//       transaction: t
//     });
//     if (!branchAccount) {
//       await t.rollback();
//       return res.status(400).json({ message: "Branch account not found for this currency" });
//     }
//     branchAccount.credit += parseFloat(transferAmount) + parseFloat(branchCharges);
//     await branchAccount.save({ transaction: t });

//     // 5️⃣ Save transfer
//     const newTransfer = await Transfer.create({
//       transferNo: nextTransferNo,
//       transferAmount,
//       chargesAmount,
//       chargesType,
//       tDate,
//       description,
//       guarantorRelation,
//       branchCharges,
//       branchChargesType,
//       toWhere,
//       organizationId: orgId,
//       receiverId,
//       senderId,
//       customerId: customerId || null,
//       moneyTypeId
//     }, { transaction: t });

//     await t.commit();
//     res.status(201).json({ message: "Transfer created successfully", transfer: newTransfer });

//   } catch (err) {
//     await t.rollback();
//     res.status(500).json({ message: err.message });
//   }
// };



exports.createTransfer = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      transferAmount,
      chargesAmount = 0,
      chargesType,
      branchCharges = 0,
      branchChargesType,
      tDate,
      description,
      guarantorRelation,
      toWhere, // Branch ID
      customerId, // Optional
      senderFirstName,
      senderLastName,
      senderPhone,
      receiverFirstName,
      receiverLastName,
      receiverPhone,
      moneyTypeId
    } = req.body;

    const orgId = req.orgId;

    // 1️⃣ Validate required fields
    if (!transferAmount || !toWhere || !moneyTypeId) {
      await t.rollback();
      return res.status(400).json({ message: "Missing required fields" });
    }

    // 2️⃣ Generate transfer number (org-wide sequential)
    const lastTransfer = await Transfer.findOne({
      where: { organizationId: orgId },
      order: [["transferNo", "DESC"]],
      transaction: t
    });
    const nextTransferNo = lastTransfer ? lastTransfer.transferNo + 1 : 1;

    // 3️⃣ Find or create sender/receiver with full details
    const findOrCreateSenderReceiver = async (data, isSender) => {
      const [person] = await Person.findOrCreate({
        where: { 
          firstName: data.firstName,
          lastName: data.lastName,
          phoneNo: data.phone,
          organizationId: orgId 
        },
        defaults: {
          firstName: data.firstName,
          lastName: data.lastName,
          phoneNo: data.phone,
          organizationId: orgId
        },
        transaction: t
      });

      const [stakeholder] = await Stakeholder.findOrCreate({
        where: { personId: person.id },
        defaults: { personId: person.id },
        transaction: t
      });

      const [sr] = await SenderReceiver.findOrCreate({
        where: { stakeholderId: stakeholder.id },
        defaults: { 
          stakeholderId: stakeholder.id,
          organizationId: orgId,
          isSender 
        },
        transaction: t
      });

      return sr.id;
    };

    // 4️⃣ Create sender and receiver
    const senderId = await findOrCreateSenderReceiver(
      { firstName: senderFirstName, lastName: senderLastName, phone: senderPhone },
      true
    );
    const receiverId = await findOrCreateSenderReceiver(
      { firstName: receiverFirstName, lastName: receiverLastName, phone: receiverPhone },
      false
    );

    // 5️⃣ Validate and process customer account (if provided)
    if (customerId) {
      const customerAccount = await Account.findOne({
        where: { customerId, moneyTypeId},
        transaction: t
      });
      
      if (!customerAccount) {
        await t.rollback();
        return res.status(400).json({ message: "Customer account not found" });
      }
      
      const totalDeduction = Number(transferAmount) + Number(chargesAmount);
      // if (customerAccount.credit < totalDeduction) {
      //   await t.rollback();
      //   return res.status(400).json({ message: "Insufficient funds" });
      // }
      
      customerAccount.credit = Number(customerAccount.credit) - totalDeduction;
      await customerAccount.save({ transaction: t });
    }

    // 6️⃣ Validate and process branch account
    const branch = await Branch.findOne({
      where: { id: toWhere },
      transaction: t
    });
    
    if (!branch) {
      await t.rollback();
      return res.status(400).json({ message: "Invalid branch" });
    }

    const branchAccount = await Account.findOne({
      where: { customerId: branch.customerId, moneyTypeId},
      transaction: t
    });
    
    if (!branchAccount) {
      await t.rollback();
      return res.status(400).json({ message: "Branch account not found" });
    }

    const totalAddition = Number(transferAmount) + Number(branchCharges);
    branchAccount.credit = Number(branchAccount.credit) + totalAddition;
    await branchAccount.save({ transaction: t });

    // 7️⃣ Create transfer record
    const newTransfer = await Transfer.create({
      transferNo: nextTransferNo,
      transferAmount: Number(transferAmount),
      chargesAmount: Number(chargesAmount),
      chargesType,
      tDate: tDate || new Date(),
      description,
      guarantorRelation,
      branchCharges: Number(branchCharges),
      branchChargesType,
      toWhere,
      organizationId: orgId,
      receiverId,
      senderId,
      customerId: customerId || null,
      moneyTypeId
    }, { transaction: t });

    await t.commit();
    res.status(201).json({ 
      message: "Transfer created successfully",
      transfer: newTransfer
    });

  } catch (err) {
    await t.rollback();
    console.error("Transfer creation error:", err);
    res.status(500).json({ 
      message: "Failed to create transfer",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};





// 🔹 UPDATE
// exports.updateTransfer = async (req, res) => {
//   const t = await sequelize.transaction();
//   try {
//     const transferId = req.params.id;
//     const orgId = req.orgId;

//     // 1️⃣ Find existing transfer
//     const existing = await Transfer.findOne({
//       where: { id: transferId, organizationId: orgId },
//       transaction: t
//     });
//     if (!existing) {
//       await t.rollback();
//       return res.status(404).json({ message: "Transfer not found" });
//     }

//     // 2️⃣ Reverse previous balances
//     if (existing.customerId) {
//       const oldCustomerAccount = await Account.findOne({
//         where: { customerId: existing.customerId, moneyTypeId: existing.moneyTypeId },
//         transaction: t
//       });
//       if (oldCustomerAccount) {
//         oldCustomerAccount.credit += parseFloat(existing.transferAmount) + parseFloat(existing.chargesAmount);
//         await oldCustomerAccount.save({ transaction: t });
//       }
//     }

//     const oldBranch = await Branch.findByPk(existing.toWhere, { transaction: t });
//     if (oldBranch) {
//       const oldBranchAccount = await Account.findOne({
//         where: { customerId: oldBranch.customerId, moneyTypeId: existing.moneyTypeId },
//         transaction: t
//       });
//       if (oldBranchAccount) {
//         oldBranchAccount.credit -= parseFloat(existing.transferAmount) + parseFloat(existing.branchCharges);
//         await oldBranchAccount.save({ transaction: t });
//       }
//     }

//     // 3️⃣ Apply new data
//     const {
//       transferAmount,
//       chargesAmount = 0,
//       chargesType,
//       branchCharges = 0,
//       branchChargesType,
//       tDate,
//       description,
//       guarantorRelation,
//       toWhere,
//       customerId,
//       senderFirstName,
//       receiverFirstName,
//       moneyTypeId
//     } = req.body;

//     // 4️⃣ Sender & Receiver
//     const findOrCreateSenderReceiver = async ({ firstName }) => {
//       const [person] = await Person.findOrCreate({
//         where: { firstName, organizationId: orgId },
//         defaults: { firstName, organizationId: orgId },
//         transaction: t
//       });
//       const [stakeholder] = await Stakeholder.findOrCreate({
//         where: { personId: person.id },
//         defaults: { personId: person.id },
//         transaction: t
//       });
//       const [sr] = await SenderReceiver.findOrCreate({
//         where: { stakeholderId: stakeholder.id, organizationId: orgId },
//         defaults: { stakeholderId: stakeholder.id, organizationId: orgId },
//         transaction: t
//       });
//       return sr.id;
//     };

//     const senderId = await findOrCreateSenderReceiver({ firstName: senderFirstName });
//     const receiverId = await findOrCreateSenderReceiver({ firstName: receiverFirstName });

//     // 5️⃣ Apply new balances
//     if (customerId) {
//       const customerAccount = await Account.findOne({
//         where: { customerId, moneyTypeId },
//         transaction: t
//       });
//       if (!customerAccount) {
//         await t.rollback();
//         return res.status(400).json({ message: "Customer account not found for this currency" });
//       }
//       customerAccount.credit -= parseFloat(transferAmount) + parseFloat(chargesAmount);
//       await customerAccount.save({ transaction: t });
//     }

//     const branch = await Branch.findByPk(toWhere, { transaction: t });
//     if (!branch) {
//       await t.rollback();
//       return res.status(400).json({ message: "Branch not found" });
//     }
//     const branchAccount = await Account.findOne({
//       where: { customerId: branch.customerId, moneyTypeId },
//       transaction: t
//     });
//     if (!branchAccount) {
//       await t.rollback();
//       return res.status(400).json({ message: "Destination branch account not found" });
//     }
//     branchAccount.credit += parseFloat(transferAmount) + parseFloat(branchCharges);
//     await branchAccount.save({ transaction: t });

//     // 6️⃣ Update transfer record
//     await existing.update({
//       transferAmount,
//       chargesAmount,
//       chargesType,
//       tDate,
//       description,
//       guarantorRelation,
//       branchCharges,
//       branchChargesType,
//       toWhere,
//       customerId: customerId || null,
//       senderId,
//       receiverId,
//       moneyTypeId
//     }, { transaction: t });

//     await t.commit();
//     res.status(200).json({ message: "Transfer updated successfully", transfer: existing });

//   } catch (err) {
//     await t.rollback();
//     res.status(500).json({ message: err.message });
//   }
// };




exports.updateTransfer = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const transferId = req.params.id;
    const orgId = req.orgId;

    // 1️⃣ Find existing transfer with organization check
    const transfer = await Transfer.findOne({
      where: { id: transferId, organizationId: orgId },
      transaction: t
    });
    
    if (!transfer) {
      await t.rollback();
      return res.status(404).json({ message: "Transfer not found" });
    }

    const {
      transferAmount,
      chargesAmount = transfer.chargesAmount,
      chargesType = transfer.chargesType,
      branchCharges = transfer.branchCharges,
      branchChargesType = transfer.branchChargesType,
      tDate = transfer.tDate,
      description = transfer.description,
      guarantorRelation = transfer.guarantorRelation,
      toWhere = transfer.toWhere,
      customerId = transfer.customerId,
      senderFirstName,
      senderLastName,
      senderPhone,
      receiverFirstName,
      receiverLastName,
      receiverPhone,
      moneyTypeId = transfer.moneyTypeId
    } = req.body;

    // 2️⃣ Reverse original transaction amounts
    // Handle customer account reversal if exists
    if (transfer.customerId) {
      const customerAccount = await Account.findOne({
        where: { 
          customerId: transfer.customerId, 
          moneyTypeId: transfer.moneyTypeId
        },
        transaction: t
      });
      
      if (customerAccount) {
        const originalTotal = Number(transfer.transferAmount) + Number(transfer.chargesAmount);
        customerAccount.credit = Number(customerAccount.credit) + originalTotal;
        await customerAccount.save({ transaction: t });
      }
    }

    // Handle branch account reversal
    const originalBranch = await Branch.findOne({
      where: { id: transfer.toWhere },
      transaction: t
    });
    
    if (originalBranch) {
      const branchAccount = await Account.findOne({
        where: { 
          customerId: originalBranch.customerId, 
          moneyTypeId: transfer.moneyTypeId,
        },
        transaction: t
      });
      
      if (branchAccount) {
        const originalBranchTotal = Number(transfer.transferAmount) + Number(transfer.branchCharges);
        branchAccount.credit = Number(branchAccount.credit) - originalBranchTotal;
        await branchAccount.save({ transaction: t });
      }
    }

    // 3️⃣ Process new amounts
    // Handle sender/receiver updates
    const findOrCreateSenderReceiver = async (data, isSender) => {
      // ... same implementation as createTransfer ...
    };

    const senderId = await findOrCreateSenderReceiver(
      { firstName: senderFirstName, lastName: senderLastName, phone: senderPhone },
      true
    );
    
    const receiverId = await findOrCreateSenderReceiver(
      { firstName: receiverFirstName, lastName: receiverLastName, phone: receiverPhone },
      false
    );

    // Process customer account if exists
    if (customerId) {
      const customerAccount = await Account.findOne({
        where: { customerId, moneyTypeId},
        transaction: t
      });
      
      if (!customerAccount) {
        await t.rollback();
        return res.status(400).json({ message: "Customer account not found" });
      }
      
      const newTotal = Number(transferAmount) + Number(chargesAmount);
      // if (customerAccount.credit < newTotal) {
      //   await t.rollback();
      //   return res.status(400).json({ message: "Insufficient funds" });
      // }
      
      customerAccount.credit = Number(customerAccount.credit) - newTotal;
      await customerAccount.save({ transaction: t });
    }

    // Process branch account
    const newBranch = await Branch.findOne({
      where: { id: toWhere},
      transaction: t
    });
    
    if (!newBranch) {
      await t.rollback();
      return res.status(400).json({ message: "New branch not found" });
    }

    const branchAccount = await Account.findOne({
      where: { customerId: newBranch.customerId, moneyTypeId },
      transaction: t
    });
    
    if (!branchAccount) {
      await t.rollback();
      return res.status(400).json({ message: "Branch account not found" });
    }

    const newBranchTotal = Number(transferAmount) + Number(branchCharges);
    branchAccount.credit = Number(branchAccount.credit) + newBranchTotal;
    await branchAccount.save({ transaction: t });

    // 4️⃣ Update transfer record
    await transfer.update({
      transferAmount: Number(transferAmount),
      chargesAmount: Number(chargesAmount),
      chargesType,
      tDate,
      description,
      guarantorRelation,
      branchCharges: Number(branchCharges),
      branchChargesType,
      toWhere,
      customerId: customerId || null,
      senderId,
      receiverId,
      moneyTypeId
    }, { transaction: t });

    await t.commit();
    res.status(200).json({ 
      message: "Transfer updated successfully",
      transfer
    });

  } catch (err) {
    await t.rollback();
    console.error("Transfer update error:", err);
    res.status(500).json({ 
      message: "Failed to update transfer",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};




// 🔹 DELETE
exports.deleteTransfer = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const transfer = await Transfer.findByPk(id, { transaction: t });
    if (!transfer) {
      await t.rollback();
      return res.status(404).json({ message: "Transfer not found" });
    }

    await reverseTransferAccounts(transfer, t);
    await transfer.update({ deleted: true }, { transaction: t });

    await t.commit();
    res.status(200).json({ message: "Transfer deleted and balances reversed" });

  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: err.message });
  }
};

// 🔹 REJECT
exports.rejectTransfer = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { reverseFunds = false } = req.body;

    const transfer = await Transfer.findByPk(id, { transaction: t });
    if (!transfer) {
      await t.rollback();
      return res.status(404).json({ message: "Transfer not found" });
    }

    if (reverseFunds) {
      await reverseTransferAccounts(transfer, t);
    }

    await transfer.update({ rejected: true }, { transaction: t });

    await t.commit();
    res.status(200).json({ message: "Transfer rejected successfully" });

  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: err.message });
  }
};
