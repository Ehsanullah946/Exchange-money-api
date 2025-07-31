// middlewares/orgScope.js
module.exports = (Model) => {
  return (req, res, next) => {
    if (!req.user || !req.user.organizationId) {
      return res.status(403).json({ message: 'No organization found for user' });
    }

    // Scope for reading queries
    req.orgQuery = {
      where: { organizationId: req.user.organizationId },
      include: []
    };

    // ID for inserting new records
    req.orgId = req.user.organizationId;

    // Reference to model
    req.model = Model;

    next();
  };
};











// module.exports = (Model) => {
//   return {
//     findAll: async (req, res) => {
//       try {
//         const data = await Model.findAll({
//           where: { organizationId: req.user.organizationId }
//         });
//         res.json(data);
//       } catch (err) {
//         res.status(500).json({ message: err.message });
//       }
//     },

//     findOne: async (req, res) => {
//       try {
//         const record = await Model.findOne({
//           where: {
//             id: req.params.id,
//             organizationId: req.user.organizationId
//           }
//         });
//         if (!record) return res.status(404).json({ message: 'Not found' });
//         res.json(record);
//       } catch (err) {
//         res.status(500).json({ message: err.message });
//       }
//     },

//     create: async (req, res) => {
//       try {
//         req.body.organizationId = req.user.organizationId;
//         const record = await Model.create(req.body);
//         res.status(201).json(record);
//       } catch (err) {
//         res.status(500).json({ message: err.message });
//       }
//     },

//     update: async (req, res) => {
//       try {
//         const record = await Model.findOne({
//           where: {
//             id: req.params.id,
//             organizationId: req.user.organizationId
//           }
//         });
//         if (!record) return res.status(404).json({ message: 'Not found' });

//         await record.update(req.body);
//         res.json(record);
//       } catch (err) {
//         res.status(500).json({ message: err.message });
//       }
//     },

//     delete: async (req, res) => {
//       try {
//         const deletedCount = await Model.destroy({
//           where: {
//             id: req.params.id,
//             organizationId: req.user.organizationId
//           }
//         });
//         if (!deletedCount) return res.status(404).json({ message: 'Not found' });

//         res.json({ message: 'Deleted successfully' });
//       } catch (err) {
//         res.status(500).json({ message: err.message });
//       }
//     }
//   };
// };
