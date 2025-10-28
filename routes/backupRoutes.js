const express = require('express');
const { protect } = require('../middlewares/authMiddlewares');
const { allowRoles } = require('../middlewares/roleMiddleware');
const backupController = require('../controllers/backupController');

const router = express.Router();
router.use(protect);
router.post('/create', allowRoles(2, 3, 4), backupController.createBackup);
router.get('/list', allowRoles(2, 3, 4), backupController.listBackups);
router.get(
  '/download/:filename',
  allowRoles(2, 3),
  backupController.downloadBackup
);
router.post(
  '/restore',
  protect,
  allowRoles(2, 3),
  backupController.restoreBackup
);
router.delete(
  '/delete/:filename',

  allowRoles(2, 3),
  backupController.deleteBackup
);

router.post('/cleanup', backupController.cleanupBackups);
module.exports = router;
