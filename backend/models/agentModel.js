const pool = require('../config/db');

async function create({ userId, currentZoneId }) {
  const [result] = await pool.query(
    'INSERT INTO agent_profiles (user_id, current_zone_id, availability_status) VALUES (?, ?, "offline")',
    [userId, currentZoneId || null]
  );
  return result.insertId;
}

async function findAll() {
  const [rows] = await pool.query(
    `SELECT ap.*, u.name AS agent_name, u.email AS agent_email, z.name AS zone_name
     FROM agent_profiles ap
     JOIN users u ON u.id = ap.user_id
     LEFT JOIN zones z ON z.id = ap.current_zone_id
     ORDER BY ap.id`
  );
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM agent_profiles WHERE id = ?', [id]);
  return rows[0] || null;
}

async function findByUserId(userId) {
  const [rows] = await pool.query('SELECT * FROM agent_profiles WHERE user_id = ?', [userId]);
  return rows[0] || null;
}

// Used by the auto-assignment engine: find an available agent in a given zone
async function findAvailableInZone(zoneId) {
  const [rows] = await pool.query(
    `SELECT * FROM agent_profiles WHERE current_zone_id = ? AND availability_status = 'available' LIMIT 1`,
    [zoneId]
  );
  return rows[0] || null;
}

async function update(id, { currentZoneId, availabilityStatus }) {
  const fields = [];
  const values = [];
  if (currentZoneId !== undefined) { fields.push('current_zone_id = ?'); values.push(currentZoneId); }
  if (availabilityStatus !== undefined) { fields.push('availability_status = ?'); values.push(availabilityStatus); }
  if (fields.length === 0) return findById(id);
  values.push(id);
  await pool.query(`UPDATE agent_profiles SET ${fields.join(', ')} WHERE id = ?`, values);
  return findById(id);
}

async function remove(id) {
  const [result] = await pool.query('DELETE FROM agent_profiles WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { create, findAll, findById, findByUserId, findAvailableInZone, update, remove };
