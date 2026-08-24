const pool = require('../config/db');

async function create({ fromZoneId, toZoneId, orderType, baseRate, perKgRate, codSurcharge }) {
  const [result] = await pool.query(
    `INSERT INTO rate_cards (from_zone_id, to_zone_id, order_type, base_rate, per_kg_rate, cod_surcharge)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [fromZoneId, toZoneId, orderType, baseRate, perKgRate, codSurcharge || 0]
  );
  return result.insertId;
}

async function findAll() {
  const [rows] = await pool.query(
    `SELECT rc.*, zf.name AS from_zone_name, zt.name AS to_zone_name
     FROM rate_cards rc
     JOIN zones zf ON zf.id = rc.from_zone_id
     JOIN zones zt ON zt.id = rc.to_zone_id
     ORDER BY rc.id`
  );
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM rate_cards WHERE id = ?', [id]);
  return rows[0] || null;
}

// Core lookup used by the rate engine
async function findByZonesAndType(fromZoneId, toZoneId, orderType) {
  const [rows] = await pool.query(
    'SELECT * FROM rate_cards WHERE from_zone_id = ? AND to_zone_id = ? AND order_type = ?',
    [fromZoneId, toZoneId, orderType]
  );
  return rows[0] || null;
}

async function update(id, { baseRate, perKgRate, codSurcharge }) {
  const fields = [];
  const values = [];
  if (baseRate !== undefined) { fields.push('base_rate = ?'); values.push(baseRate); }
  if (perKgRate !== undefined) { fields.push('per_kg_rate = ?'); values.push(perKgRate); }
  if (codSurcharge !== undefined) { fields.push('cod_surcharge = ?'); values.push(codSurcharge); }
  if (fields.length === 0) return findById(id);
  values.push(id);
  await pool.query(`UPDATE rate_cards SET ${fields.join(', ')} WHERE id = ?`, values);
  return findById(id);
}

async function remove(id) {
  const [result] = await pool.query('DELETE FROM rate_cards WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { create, findAll, findById, findByZonesAndType, update, remove };
