const pool = require('../config/db');

async function create({ orderId, newDeliveryDate, reassignedAgentId }) {
  const [result] = await pool.query(
    'INSERT INTO reschedules (order_id, new_delivery_date, reassigned_agent_id) VALUES (?, ?, ?)',
    [orderId, newDeliveryDate, reassignedAgentId || null]
  );
  return result.insertId;
}

async function findByOrder(orderId) {
  const [rows] = await pool.query(
    'SELECT * FROM reschedules WHERE order_id = ? ORDER BY requested_at DESC',
    [orderId]
  );
  return rows;
}

module.exports = { create, findByOrder };
