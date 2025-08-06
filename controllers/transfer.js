const { Transfer, Account,Person,Stakeholder, Customer, SenderReceiver, Branch, sequelize } = require("../models");
const addOrgSequence = require("../utils/orgSequenceHelper");

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
//       senderName,
//       receiverName,
//       moneyTypeId
//     } = req.body;

//     const orgId = req.orgId;

//     // 1️⃣ Generate transfer number sequence per org
//     const lastTransfer = await Transfer.findOne({
//       where: { organizationId: orgId },
//       order: [["transferNo", "DESC"]],
//       transaction: t
//     });
//     const nextTransferNo = lastTransfer ? parseInt(lastTransfer.transferNo) + 1 : 1;

//     // 2️⃣ Prepare sender & receiver
//       const findOrCreateSenderReceiver = async (firstName) => {
//       const [person] = await Person.findOrCreate({
//         where: { firstName, organizationId: req.orgId },
//         defaults: { firstName, organizationId: req.orgId },
//         transaction: t
//       });

//       const [stakeholder] = await Stakeholder.findOrCreate({
//         where: { personId: person.id },
//         defaults: { personId: person.id },
//         transaction: t
//       });

//       const [senderReceiver] = await SenderReceiver.findOrCreate({
//         where: { stakeholderId: stakeholder.id },
//         defaults: { stakeholderId: stakeholder.id },
//         transaction: t
//       });

//       return senderReceiver.id;
//       };
//     const senderId = await findOrCreateSenderReceiver(senderName);
//     const receiverId = await findOrCreateSenderReceiver(receiverName);

//     // 3️⃣ Handle customer account deduction
//     if (customerId) {
//       const customerAccount = await Account.findOne({
//         where: { customerId, moneyTypeId },
//         transaction: t
//       });

//       if (!customerAccount) {
//         await t.rollback();
//         return res.status(400).json({ message: "Customer account not found for this currency" });
//       }

//       // Deduct main amount + charges
//       customerAccount.credit = parseFloat(customerAccount.credit) - (parseFloat(transferAmount) + parseFloat(chargesAmount));
//       await customerAccount.save({ transaction: t });
//     }

//     // 4️⃣ Handle branch account addition
//     const branchAccount = await Account.findOne({
//       where: { customerId: toWhere, moneyTypeId },
//       transaction: t
//     });

//     if (!branchAccount) {
//       await t.rollback();
//       return res.status(400).json({ message: "Destination branch account not found for this currency" });
//     }

//     // Add main amount + branch charges
//     branchAccount.credit = parseFloat(branchAccount.credit) + (parseFloat(transferAmount) + parseFloat(branchCharges));
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
//       organizationId: req.orgId,
//       receiverId:receiverId,
//       senderId:senderId,
//       customerId: customerId || null,
//       moneyTypeId
//     }, { transaction: t });

//     await t.commit();
//     res.status(201).json({
//       message: "Transfer created successfully",
//       transfer: newTransfer
//     });

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
      toWhere,          // Branch ID (customerId of branch)
      customerId,       // Optional
      senderFirstName,
      receiverFirstName,
      moneyTypeId
    } = req.body;

    const orgId = req.orgId;

    // 1️⃣ Generate transfer number per organization
    const lastTransfer = await Transfer.findOne({
      where: { organizationId: orgId },
      order: [["transferNo", "DESC"]],
      transaction: t
    });
    const nextTransferNo = lastTransfer ? parseInt(lastTransfer.transferNo) + 1 : 1;

    // 2️⃣ Function to find or create Sender/Receiver
   const findOrCreateSenderReceiver = async ({ firstName, lastName, fatherName, phoneNo }) => {
  // 1. Find or create Person (with organizationId)
  const [person] = await Person.findOrCreate({
    where: { 
      firstName, 
      organizationId: orgId 
    },
    defaults: {
      firstName,
      phoneNo: phoneNo || null,
      organizationId: orgId
    },
    transaction: t
  });

  // 2. Find or create Stakeholder
  const [stakeholder] = await Stakeholder.findOrCreate({
    where: { personId: person.id },
    defaults: { personId: person.id },
    transaction: t
  });

  // 3. Find or create SenderReceiver (now with organizationId)
  const [senderReceiver] = await SenderReceiver.findOrCreate({
    where: { 
      stakeholderId: stakeholder.id,
      organizationId: orgId 
    },
    defaults: {
      stakeholderId: stakeholder.id,
      organizationId: orgId  // Now matches the model definition
    },
    transaction: t
  });

  return senderReceiver.id;
};

    // 3️⃣ Create sender & receiver IDs
    const senderId = await findOrCreateSenderReceiver({
      firstName: senderFirstName
    });

    const receiverId = await findOrCreateSenderReceiver({
      firstName: receiverFirstName
    });

    // 4️⃣ Deduct from customer account if exists
    if (customerId) {
      const customerAccount = await Account.findOne({
        where: { customerId, moneyTypeId },
        transaction: t
      });

      if (!customerAccount) {
        await t.rollback();
        return res.status(400).json({ message: "Customer account not found for this currency" });
      }

      customerAccount.credit =
        parseFloat(customerAccount.credit) -
        (parseFloat(transferAmount) + parseFloat(chargesAmount));

      await customerAccount.save({ transaction: t });
    }

    // 5️⃣ Add to branch account
// ✅ 4️⃣ Handle branch account addition
const branch = await Branch.findByPk(toWhere, { transaction: t });
if (!branch) {
  await t.rollback();
  return res.status(400).json({ message: "Branch not found for toWhere ID" });
}

const branchAccount = await Account.findOne({
  where: { customerId: branch.customerId, moneyTypeId },
  transaction: t
});

if (!branchAccount) {
  await t.rollback();
  return res.status(400).json({ message: "Destination branch account not found for this currency" });
}

// Add main amount + branch charges
branchAccount.credit = parseFloat(branchAccount.credit) + (parseFloat(transferAmount) + parseFloat(branchCharges));
await branchAccount.save({ transaction: t });

    // 6️⃣ Create transfer record
    const newTransfer = await Transfer.create({
      transferNo: nextTransferNo,
      transferAmount,
      chargesAmount,
      chargesType,
      tDate,
      description,
      guarantorRelation,
      branchCharges,
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
    res.status(500).json({ message: err.message });
  }
};
