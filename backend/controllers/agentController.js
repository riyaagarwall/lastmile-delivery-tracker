const agentModel = require('../models/agentModel');
const userModel = require('../models/userModel');

async function create(req, res, next) {
  try {
    const { userId, currentZoneId } = req.body;
    if (!userId) return res.status(400).json({ success: false, error: 'userId is required' });
    const user = await userModel.findById(userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    if (user.role !== 'agent') {
      return res.status(400).json({ success: false, error: 'User must have role "agent" to get an agent profile' });
    }
    const id = await agentModel.create({ userId, currentZoneId });
    res.status(201).json({ success: true, data: await agentModel.findById(id) });
  } catch (err) { next(err); }
}

async function list(req, res, next) {
  try {
    res.json({ success: true, data: await agentModel.findAll() });
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const agent = await agentModel.findById(req.params.id);
    if (!agent) return res.status(404).json({ success: false, error: 'Agent profile not found' });
    res.json({ success: true, data: agent });
  } catch (err) { next(err); }
}

// Admin can update any agent; an agent can only update their own profile (zone/availability)
async function update(req, res, next) {
  try {
    const existing = await agentModel.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Agent profile not found' });

    if (req.user.role === 'agent' && existing.user_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'You can only update your own agent profile' });
    }

    const { currentZoneId, availabilityStatus } = req.body;
    if (availabilityStatus && !['available', 'busy', 'offline'].includes(availabilityStatus)) {
      return res.status(400).json({ success: false, error: 'Invalid availabilityStatus' });
    }
    res.json({ success: true, data: await agentModel.update(req.params.id, { currentZoneId, availabilityStatus }) });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const deleted = await agentModel.remove(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Agent profile not found' });
    res.json({ success: true, data: { id: req.params.id } });
  } catch (err) { next(err); }
}

module.exports = { create, list, getOne, update, remove };
