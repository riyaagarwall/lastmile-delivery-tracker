const pool = require('../config/db');

async function create({ zoneId, pincodeOrLocality }) {
  const [result] = await pool.query(
    'INSERT INTO areas (zone_id, pincode_or_locality) VALUES (?, ?)',
    [zoneId, pincodeOrLocality]
  );
  return result.insertId;
}

async function findAll() {
  const [rows] = await pool.query(
    `SELECT areas.*, zones.name AS zone_name FROM areas
     JOIN zones ON zones.id = areas.zone_id ORDER BY areas.id`
  );
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM areas WHERE id = ?', [id]);
  return rows[0] || null;
}

// Used by the rate engine to resolve an address string to a zone
async function findByLocality(pincodeOrLocality) {
  const [rows] = await pool.query('SELECT * FROM areas WHERE pincode_or_locality = ?', [pincodeOrLocality]);
  return rows[0] || null;
}

async function update(id, { zoneId, pincodeOrLocality }) {
  const fields = [];
  const values = [];
  if (zoneId !== undefined) { fields.push('zone_id = ?'); values.push(zoneId); }
  if (pincodeOrLocality !== undefined) { fields.push('pincode_or_locality = ?'); values.push(pincodeOrLocality); }
  if (fields.length === 0) return findById(id);
  values.push(id);
  await pool.query(`UPDATE areas SET ${fields.join(', ')} WHERE id = ?`, values);
  return findById(id);
}

async function remove(id) {
  const [result] = await pool.query('DELETE FROM areas WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { create, findAll, findById, findByLocality, update, remove };
