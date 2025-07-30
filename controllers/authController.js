const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sequelize, UserAccount, Organization } = require('../models');

const generateToken = (id, organizationId, role) => {
  return jwt.sign({ id, organizationId, role }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });
};

/**
 * Create new organization + its first admin user
 * Only Super Admin (role 1) can call this
 */
exports.createOrganization = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { organizationName, username, password, email, whatsApp } = req.body;

    if (!organizationName || !username || !password || !email) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if org name exists
    const orgExists = await Organization.findOne({
      where: { name: organizationName },
      transaction
    });
    if (orgExists) {
      return res.status(400).json({ message: 'Organization name already taken' });
    }

    // Step 1 — Create organization
    const organization = await Organization.create(
      { name: organizationName },
      { transaction }
    );

    // Step 2 — Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    await sequelize.query('SET @creatorRole = ?', {
        replacements: [req.user.role],
        transaction
      });

    // Step 3 — Create first admin user
    const user = await UserAccount.create(
      {
        username,
        password: hashedPassword,
        email,
        whatsApp,
        usertypeId: 2, // Admin role
        organizationId: organization.id
      },
      { transaction }
    );

    // Step 4 — Commit both
    await transaction.commit();

    res.status(201).json({
      message: 'Organization and first admin created successfully',
      token: generateToken(user.id, organization.id, 2)
    });

  } catch (err) {
    // Rollback both if any error
    await transaction.rollback();
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Add user to existing organization
 * Only Organization Admin (role 2) or Super Admin (role 1) can call this
 */
exports.addUserToOrganization = async (req, res) => {
  try {
    const { username, password, email, whatsApp, usertypeId } = req.body;

    if (!username || !password || !email) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    let roleId;

    if (req.user.role === 1) {
      // Super admin can assign any role
      roleId = usertypeId || 3;
    } else if (req.user.role === 2) {
      // Org admin can only assign Employee (3) or Viewer (4)
      if ([3, 4].includes(usertypeId)) {
        roleId = usertypeId;
      } else {
        return res
          .status(403)
          .json({ message: 'You can only create employees or viewers' });
      }
    } else {
      return res
        .status(403)
        .json({ message: 'You do not have permission to create users' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await UserAccount.create({
      username,
      password: hashedPassword,
      email,
      whatsApp,
      usertypeId: roleId,
      organizationId: req.user.organizationId
    });

    res.status(201).json({
      message: 'User added successfully',
      token: generateToken(user.id, req.user.organizationId, roleId)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Login
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: 'Please enter email and password' });
    }

    const user = await UserAccount.findOne({ where: { email } });
    if (!user) {
      return res
        .status(401)
        .json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ message: 'Invalid email or password' });
    }

    res.json({
      message: 'Login successful',
      data: {
        data:user
      },
      token: generateToken(user.id, user.organizationId, user.usertypeId)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
