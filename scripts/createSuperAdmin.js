const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

(async () => {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root', // change to your DB user
    password: '946763149', // change to your DB password
    database: 'exchangesystem'
  });

  try {
    console.log('🚀 Dropping trigger temporarily...');
    await connection.query('DROP TRIGGER IF EXISTS before_user_insert');

    console.log('🚀 Creating organization...');
    const [orgResult] = await connection.execute(
      'INSERT INTO organizations (name) VALUES (?)',
      ['System Master']
    );
    const organizationId = orgResult.insertId;

    console.log('🚀 Hashing password...');
    const hashedPassword = await bcrypt.hash('super_secure_password', 10);

    console.log('🚀 Inserting super admin...');
    await connection.execute(
      'INSERT INTO useraccounts (username, password, email, usertypeId, organizationId) VALUES (?, ?, ?, ?, ?)',
      ['superadmin', hashedPassword, 'Ehsanullahakbari53@gmail.com', 1, organizationId]
    );

    console.log('🚀 Recreating trigger...');
    await connection.query(`
      CREATE TRIGGER before_user_insert
      BEFORE INSERT ON useraccounts
      FOR EACH ROW
      BEGIN
          IF NEW.usertypeId IN (1, 2) THEN
              SIGNAL SQLSTATE '45000'
              SET MESSAGE_TEXT = 'Cannot create Super Admin or Organization Admin directly';
          END IF;
      END
    `);

    console.log('✅ Super Admin created successfully');
    process.exit();
  } catch (err) {
    console.error('❌ Error creating Super Admin:', err.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
})();
