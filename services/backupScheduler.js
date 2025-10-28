// services/backupScheduler.js
const cron = require('node-cron');
const backupService = require('../utils/backupUtils');

class BackupScheduler {
  start() {
    // Daily backup at 2 AM
    cron.schedule('0 2 * * *', async () => {
      try {
        console.log('Starting automated daily backup...');
        const backup = await backupService.createMySQLDump();
        console.log('Automated backup completed:', backup.filename);

        // Cleanup old backups
        await backupService.cleanupOldBackups();
      } catch (error) {
        console.error('Automated backup failed:', error);
      }
    });

    // Weekly backup on Sunday at 3 AM
    cron.schedule('0 3 * * 0', async () => {
      try {
        console.log('Starting weekly backup...');
        const backup = await backupService.createMySQLDump();
        console.log('Weekly backup completed:', backup.filename);
      } catch (error) {
        console.error('Weekly backup failed:', error);
      }
    });

    console.log('Backup scheduler started');
  }
}

module.exports = new BackupScheduler();
