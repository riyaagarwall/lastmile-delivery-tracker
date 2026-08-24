const zoneModel = require('../models/zoneModel');

async function create(req, res, next) {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'name is required' });
    const id = await zoneModel.create({ name });
    res.status(201).json({ success: true, data: await zoneModel.findById(id) });
  } catch (err) { next(err); }
}

async function list(req, res, next) {
  try {
    res.json({ success: true, data: await zoneModel.findAll() });
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const zone = await zoneModel.findById(req.params.id);
    if (!zone) return res.status(404).json({ success: false, error: 'Zone not found' });
    res.json({ success: true, data: zone });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const existing = await zoneModel.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Zone not found' });
    if (!req.body.name) return res.status(400).json({ success: false, error: 'name is required' });
    res.json({ success: true, data: await zoneModel.update(req.params.id, req.body) });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const deleted = await zoneModel.remove(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Zone not found' });
    res.json({ success: true, data: { id: req.params.id } });
  } catch (err) { next(err); }
}

module.exports = { create, list, getOne, update, remove };
