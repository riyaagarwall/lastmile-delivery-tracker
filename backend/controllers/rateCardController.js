const rateCardModel = require('../models/rateCardModel');

async function create(req, res, next) {
  try {
    const { fromZoneId, toZoneId, orderType, baseRate, perKgRate, codSurcharge } = req.body;
    if (!fromZoneId || !toZoneId || !orderType || baseRate === undefined || perKgRate === undefined) {
      return res.status(400).json({
        success: false,
        error: 'fromZoneId, toZoneId, orderType, baseRate, and perKgRate are required',
      });
    }
    if (!['B2B', 'B2C'].includes(orderType)) {
      return res.status(400).json({ success: false, error: 'orderType must be B2B or B2C' });
    }
    const id = await rateCardModel.create({ fromZoneId, toZoneId, orderType, baseRate, perKgRate, codSurcharge });
    res.status(201).json({ success: true, data: await rateCardModel.findById(id) });
  } catch (err) { next(err); }
}

async function list(req, res, next) {
  try {
    res.json({ success: true, data: await rateCardModel.findAll() });
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const rc = await rateCardModel.findById(req.params.id);
    if (!rc) return res.status(404).json({ success: false, error: 'Rate card not found' });
    res.json({ success: true, data: rc });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const existing = await rateCardModel.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Rate card not found' });
    res.json({ success: true, data: await rateCardModel.update(req.params.id, req.body) });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const deleted = await rateCardModel.remove(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Rate card not found' });
    res.json({ success: true, data: { id: req.params.id } });
  } catch (err) { next(err); }
}

module.exports = { create, list, getOne, update, remove };
