const { Receive, Person, Stakeholder, SenderReceiver, Account,
    Branch
 } = require("../models");

exports.createReceive = async(req,res) => {
    const t = await Receive.sequelize.transaction();

    try {
        const {
            receiveAmount,
            chargesAmount = 0,
            chargesType,
            branchCharges = 0,
            branchChargesType,
            tDate,
            description,
            guarantorRelation,
            fromWhere,          // Branch ID
            customerId,       // Optional
            senderFirstName,
            receiverFirstName,
            moneyTypeId,
            passTo,
        } = req.body;
        const orgId = req.orgId;

     const lastReceive = await Receive.findOne({
      where: { organizationId: orgId, fromWhere },
      order: [["receiveNo", "DESC"]],
      transaction: t
    });
    const nextReceiveNo = lastReceive ? parseInt(lastReceive.receiveNo) + 1 : 1;
        
        const findOrCreateSenderReceiver = async (firstName) => {
            const [person] = await Person.findOrCreate({
                where: { firstName, organizationId: orgId },
                default: { firstName, organizationId: orgId },
                transaction: t
            });


            const [stakeholder] = await Stakeholder.findOrCreate({
                where: { personId: person.id },
                default: { personId: person.id },
                transaction: t
            });

            const [sr] = await SenderReceiver.findOrCreate({
                where: { stakeholderId: stakeholder.id, organizationId: orgId },
                default: { stakeholderId: stakeholder.id, organizationId: orgId },
                transaction: t
            });
            return sr.id;
        }

        const senderId = await findOrCreateSenderReceiver(senderFirstName);
        const receiverId = await findOrCreateSenderReceiver(receiverFirstName);


        if (customerId) {
            const customerAccount = await Account.findOne({
                where: { customerId, moneyTypeId },
                transaction: t
            });

            if (!customerAccount) {
                await t.rollback();
                res.status(400).json("this cusotmer not found please try again");
            }
        
            customerAccount.credit += parseFloat(receiveAmount) + parseFloat(chargesAmount);
            await customerAccount.save({ transaction: t });
        }


        const branch = await Branch.findOne({ fromWhere, transaction: t });

        if (!branch) {
            await t.rollback();
            res.status(400).json("the selected branch not found please try again");
        }   
        const branchAccount = await Account.findOne({
            where: { customerId: branch.customerId, moneyTypeId },
            transaction: t
        });

        if (!branchAccount) {
            await t.rollback();
            res.status(400).json("the branch account is not found please try again");
        }

        branchAccount.credit -= parseFloat(receiveAmount) + parseFloat(branchCharges);
        await branchAccount.save({ transaction: t });


        const newReceive = await Receive.create({
            transferNo: nextReceiveNo,
            receiveAmount,
            chargesAmount,
            chargesType,
            tDate,
            description,
            guarantorRelation,
            branchCharges,
            branchChargesType,
            fromWhere,
            passTo,
            organizationId: orgId,
            receiverId,
            senderId,
            customerId: customerId || null,
            moneyTypeId
        }, { transaction: t });
        
        await t.commit();
        res.status(201).json({message: "Receive created successfully", receive: newReceive})

    
    } catch (error) {
        await t.rollback();
        res.status(500).json({ message: error.message });
    }
}