// utils/backupUtils.js
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

class BackupService {
  constructor() {
    this.backupDir = path.join(__dirname, '../backups');
    this.ensureBackupDir();
  }

  ensureBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  // Method 1: MySQL Dump (Most reliable)
  createMySQLDump() {
    return new Promise((resolve, reject) => {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `backup-${timestamp}.sql`;
      const filepath = path.join(this.backupDir, filename);

      const command = `mysqldump -u ${process.env.DB_USERNAME} -p${process.env.DB_PASSWORD} ${process.env.DB_NAME} > ${filepath}`;

      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error('Backup error:', error);
          reject(error);
          return;
        }

        // Compress the backup
        this.compressBackup(filepath)
          .then((compressedPath) => {
            // Delete original SQL file
            fs.unlinkSync(filepath);
            resolve({
              filename: path.basename(compressedPath),
              path: compressedPath,
              size: fs.statSync(compressedPath).size,
              timestamp: new Date(),
            });
          })
          .catch(reject);
      });
    });
  }

  compressBackup(filepath) {
    return new Promise((resolve, reject) => {
      const compressedPath = filepath.replace('.sql', '.gz');
      const command = `gzip -c ${filepath} > ${compressedPath}`;

      exec(command, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve(compressedPath);
        }
      });
    });
  }

  // Method 2: Programmatic Backup via Sequelize
  async createProgrammaticBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.json`;
    const filepath = path.join(this.backupDir, filename);

    try {
      const backupData = {};

      const models = require('../models'); // Your models index file

      for (const modelName in models) {
        if (models[modelName].getTableName) {
          const data = await models[modelName].findAll();
          backupData[modelName] = data.map((item) => item.toJSON());
        }
      }

      // Write to file
      fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2));

      // Compress
      const compressedPath = await this.compressJSONBackup(filepath);
      fs.unlinkSync(filepath);

      return {
        filename: path.basename(compressedPath),
        path: compressedPath,
        size: fs.statSync(compressedPath).size,
        timestamp: new Date(),
      };
    } catch (error) {
      throw error;
    }
  }

  // List available backups
  listBackups() {
    return new Promise((resolve, reject) => {
      fs.readdir(this.backupDir, (err, files) => {
        if (err) {
          reject(err);
          return;
        }

        const backups = files
          .filter((file) => file.endsWith('.gz'))
          .map((file) => {
            const filepath = path.join(this.backupDir, file);
            const stats = fs.statSync(filepath);
            return {
              filename: file,
              size: stats.size,
              created: stats.birthtime,
              path: filepath,
            };
          })
          .sort((a, b) => new Date(b.created) - new Date(a.created));

        resolve(backups);
      });
    });
  }

  // Restore from backup
  restoreFromDump(backupFilename) {
    return new Promise((resolve, reject) => {
      const backupPath = path.join(this.backupDir, backupFilename);

      // Decompress first
      const decompressedPath = backupPath.replace('.gz', '');
      const decompressCommand = `gzip -dc ${backupPath} > ${decompressedPath}`;

      exec(decompressCommand, (error) => {
        if (error) {
          reject(error);
          return;
        }

        // Restore database
        const restoreCommand = `mysql -u ${process.env.DB_USERNAME} -p${process.env.DB_PASSWORD} ${process.env.DB_NAME} < ${decompressedPath}`;

        exec(restoreCommand, (error, stdout, stderr) => {
          // Clean up decompressed file
          fs.unlinkSync(decompressedPath);

          if (error) {
            reject(error);
            return;
          }
          resolve({ message: 'Database restored successfully' });
        });
      });
    });
  }

  // Delete old backups (keep last 30 days)
  cleanupOldBackups() {
    return new Promise((resolve, reject) => {
      this.listBackups()
        .then((backups) => {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

          const oldBackups = backups.filter(
            (backup) => new Date(backup.created) < thirtyDaysAgo
          );

          oldBackups.forEach((backup) => {
            fs.unlinkSync(backup.path);
          });

          resolve({ deleted: oldBackups.length });
        })
        .catch(reject);
    });
  }
}

module.exports = new BackupService();
