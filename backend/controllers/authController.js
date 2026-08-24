const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');

async function register(req, res, next) {
  try {
    const { name, email, password, phone, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'name, email, and password are required' });
    }

    const existing = await userModel.findByEmail(email);
    if (existing) {
      return res.status(409).json({ success: false, error: 'Email already registered' });
    }

    // Only an authenticated admin may create an admin or agent account.
    // Anyone registering without being logged in as admin becomes a "customer".
    let finalRole = 'customer';
    if (role === 'admin' || role === 'agent') {
      const isCallerAdmin = req.user && req.user.role === 'admin';
      if (!isCallerAdmin) {
        return res.status(403).json({ success: false, error: 'Only an admin can create admin or agent accounts' });
      }
      finalRole = role;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = await userModel.create({ name, email, passwordHash, role: finalRole, phone });
    const user = await userModel.findById(userId);

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });

    res.status(201).json({ success: true, data: { user, token } });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'email and password are required' });
    }

    const user = await userModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });

    delete user.password_hash;
    res.json({ success: true, data: { user, token } });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login };
