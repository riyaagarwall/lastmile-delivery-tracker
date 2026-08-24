const userModel = require('../models/userModel');

async function list(req, res, next) {
  try {
    res.json({ success: true, data: await userModel.findAll() });
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const user = await userModel.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const existing = await userModel.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'User not found' });
    if (req.body.role && !['customer', 'agent', 'admin'].includes(req.body.role)) {
      return res.status(400).json({ success: false, error: 'Invalid role' });
    }
    res.json({ success: true, data: await userModel.update(req.params.id, req.body) });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const deleted = await userModel.remove(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, data: { id: req.params.id } });
  } catch (err) { next(err); }
}

module.exports = { list, getOne, update, remove };
