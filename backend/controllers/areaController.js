const areaModel = require('../models/areaModel');

async function create(req, res, next) {
  try {
    const { zoneId, pincodeOrLocality } = req.body;
    if (!zoneId || !pincodeOrLocality) {
      return res.status(400).json({ success: false, error: 'zoneId and pincodeOrLocality are required' });
    }
    const id = await areaModel.create({ zoneId, pincodeOrLocality });
    res.status(201).json({ success: true, data: await areaModel.findById(id) });
  } catch (err) { next(err); }
}

async function list(req, res, next) {
  try {
    res.json({ success: true, data: await areaModel.findAll() });
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const area = await areaModel.findById(req.params.id);
    if (!area) return res.status(404).json({ success: false, error: 'Area not found' });
    res.json({ success: true, data: area });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const existing = await areaModel.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Area not found' });
    res.json({ success: true, data: await areaModel.update(req.params.id, req.body) });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const deleted = await areaModel.remove(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Area not found' });
    res.json({ success: true, data: { id: req.params.id } });
  } catch (err) { next(err); }
}

module.exports = { create, list, getOne, update, remove };
