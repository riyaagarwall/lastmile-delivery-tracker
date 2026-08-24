const pool = require('../config/db');

// Append-only — never update or delete a row here
async function record({ orderId, status, actorRole, actorId }) {
  const [result] = await pool.query(
    'INSERT INTO status_history (order_id, status, actor_role, actor_id) VALUES (?, ?, ?, ?)',
    [orderId, status, actorRole, actorId || null]
  );
  return result.insertId;
}

async function findByOrder(orderId) {
  const [rows] = await pool.query(
    'SELECT * FROM status_history WHERE order_id = ? ORDER BY changed_at ASC, id ASC',
    [orderId]
  );
  return rows;
}

module.exports = { record, findByOrder };
