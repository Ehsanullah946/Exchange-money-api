// utils/backupUtils.js
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const { promisify } = require('util');
const { exec } = require('child_process');

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

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

  // MySQL Dump with Node.js compression
  createMySQLDump() {
    return new Promise((resolve, reject) => {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const sqlFilename = `backup-${timestamp}.sql`;
      const sqlFilepath = path.join(this.backupDir, sqlFilename);
      const gzFilename = `backup-${timestamp}.gz`;
      const gzFilepath = path.join(this.backupDir, gzFilename);

      const mysqldumpPath =
        '"C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysqldump.exe"';
      const command = `${mysqldumpPath} -u ${process.env.DB_USER} -p${process.env.DB_PASSWORD} ${process.env.DB_NAME} > "${sqlFilepath}"`;

      exec(command, async (error, stdout, stderr) => {
        if (error) {
          console.error('MySQL dump error:', error);
          reject(error);
          return;
        }

        try {
          // Compress using Node.js zlib
          await this.compressWithZlib(sqlFilepath, gzFilepath);

          // Delete original SQL file
          fs.unlinkSync(sqlFilepath);

          resolve({
            filename: gzFilename,
            path: gzFilepath,
            size: fs.statSync(gzFilepath).size,
            timestamp: new Date(),
          });
        } catch (compressionError) {
          console.error('Compression error:', compressionError);
          reject(compressionError);
        }
      });
    });
  }

  // Node.js zlib compression
  async compressWithZlib(inputPath, outputPath) {
    try {
      const data = fs.readFileSync(inputPath);
      const compressed = await gzip(data);
      fs.writeFileSync(outputPath, compressed);
      console.log('File compressed successfully with zlib');
    } catch (error) {
      throw new Error(`Zlib compression failed: ${error.message}`);
    }
  }

  // Node.js zlib decompression
  async decompressWithZlib(inputPath, outputPath) {
    try {
      const compressed = fs.readFileSync(inputPath);
      const decompressed = await gunzip(compressed);
      fs.writeFileSync(outputPath, decompressed);
      console.log('File decompressed successfully with zlib');
    } catch (error) {
      throw new Error(`Zlib decompression failed: ${error.message}`);
    }
  }

  // Restore from backup with Node.js decompression
  async restoreFromDump(backupFilename) {
    const backupPath = path.join(this.backupDir, backupFilename);
    const decompressedPath = backupPath.replace('.gz', '.sql');

    try {
      // Decompress using Node.js
      await this.decompressWithZlib(backupPath, decompressedPath);

      // Restore database
      const mysqlPath =
        '"C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysql.exe"';
      const command = `${mysqlPath} -u ${process.env.DB_USER} -p${process.env.DB_PASSWORD} ${process.env.DB_NAME} < "${decompressedPath}"`;

      await new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
          // Clean up decompressed file
          if (fs.existsSync(decompressedPath)) {
            fs.unlinkSync(decompressedPath);
          }

          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });

      return { message: 'Database restored successfully' };
    } catch (error) {
      // Clean up decompressed file on error
      if (fs.existsSync(decompressedPath)) {
        fs.unlinkSync(decompressedPath);
      }
      throw error;
    }
  }

  // List backups (same as before)
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

  // Delete backup (same as before)
  deleteBackup(filename) {
    const filepath = path.join(this.backupDir, filename);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      return { message: 'Backup deleted successfully' };
    } else {
      throw new Error('Backup file not found');
    }
  }

  // Cleanup old backups (same as before)
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
