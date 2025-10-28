// controllers/backupController.js
const backupService = require('../utils/backupUtils');
const path = require('path');
const fs = require('fs');

const backupController = {
  // Create backup
  createBackup: async (req, res) => {
    try {
      const backup = await backupService.createMySQLDump();

      res.json({
        success: true,
        message: 'Backup created successfully',
        backup: {
          filename: backup.filename,
          size: backup.size,
          timestamp: backup.timestamp,
        },
      });
    } catch (error) {
      console.error('Backup creation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create backup',
        error: error.message,
      });
    }
  },

  // List backups
  listBackups: async (req, res) => {
    try {
      const backups = await backupService.listBackups();
      res.json({
        success: true,
        backups: backups,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to list backups',
        error: error.message,
      });
    }
  },

  // Download backup
  downloadBackup: async (req, res) => {
    try {
      const { filename } = req.params;
      const filepath = path.join(backupService.backupDir, filename);

      if (!fs.existsSync(filepath)) {
        return res.status(404).json({
          success: false,
          message: 'Backup file not found',
        });
      }

      res.download(filepath, filename, (err) => {
        if (err) {
          console.error('Download error:', err);
          res.status(500).json({
            success: false,
            message: 'Failed to download backup',
          });
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to download backup',
        error: error.message,
      });
    }
  },

  // Restore backup
  restoreBackup: async (req, res) => {
    try {
      const { filename } = req.body;

      if (!filename) {
        return res.status(400).json({
          success: false,
          message: 'Backup filename is required',
        });
      }

      const result = await backupService.restoreFromDump(filename);

      res.json({
        success: true,
        message: 'Database restored successfully',
        result: result,
      });
    } catch (error) {
      console.error('Restore error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to restore backup',
        error: error.message,
      });
    }
  },

  // Delete backup
  deleteBackup: async (req, res) => {
    try {
      const { filename } = req.params;
      const filepath = path.join(backupService.backupDir, filename);

      if (!fs.existsSync(filepath)) {
        return res.status(404).json({
          success: false,
          message: 'Backup file not found',
        });
      }

      fs.unlinkSync(filepath);

      res.json({
        success: true,
        message: 'Backup deleted successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to delete backup',
        error: error.message,
      });
    }
  },

  // Cleanup old backups
  cleanupBackups: async (req, res) => {
    try {
      const result = await backupService.cleanupOldBackups();

      res.json({
        success: true,
        message: 'Old backups cleaned up successfully',
        result: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to cleanup backups',
        error: error.message,
      });
    }
  },
};

module.exports = backupController;
