const pool = require('../config/db');

async function create(order) {
  const {
    customerId, createdById, pickupAddress, dropAddress, pickupZoneId, dropZoneId,
    orderType, paymentType, lengthCm, breadthCm, heightCm, actualWeightKg,
    volumetricWeightKg, billedWeightKg, chargeAmount,
  } = order;

  const [result] = await pool.query(
    `INSERT INTO orders
      (customer_id, created_by_id, pickup_address, drop_address, pickup_zone_id, drop_zone_id,
       order_type, payment_type, length_cm, breadth_cm, height_cm, actual_weight_kg,
       volumetric_weight_kg, billed_weight_kg, charge_amount, current_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Created')`,
    [customerId, createdById, pickupAddress, dropAddress, pickupZoneId, dropZoneId,
     orderType, paymentType, lengthCm, breadthCm, heightCm, actualWeightKg,
     volumetricWeightKg, billedWeightKg, chargeAmount]
  );
  return result.insertId;
}

async function findById(id) {
  const [rows] = await pool.query(
    `SELECT o.*, zf.name AS pickup_zone_name, zt.name AS drop_zone_name,
            c.name AS customer_name, c.email AS customer_email
     FROM orders o
     JOIN zones zf ON zf.id = o.pickup_zone_id
     JOIN zones zt ON zt.id = o.drop_zone_id
     JOIN users c ON c.id = o.customer_id
     WHERE o.id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function findAll({ status, zoneId, agentId } = {}) {
  let query = `
    SELECT o.*, zf.name AS pickup_zone_name, zt.name AS drop_zone_name,
           c.name AS customer_name
    FROM orders o
    JOIN zones zf ON zf.id = o.pickup_zone_id
    JOIN zones zt ON zt.id = o.drop_zone_id
    JOIN users c ON c.id = o.customer_id
    WHERE 1=1`;
  const params = [];
  if (status) { query += ' AND o.current_status = ?'; params.push(status); }
  if (zoneId) { query += ' AND (o.pickup_zone_id = ? OR o.drop_zone_id = ?)'; params.push(zoneId, zoneId); }
  if (agentId) { query += ' AND o.agent_id = ?'; params.push(agentId); }
  query += ' ORDER BY o.id DESC';
  const [rows] = await pool.query(query, params);
  return rows;
}

async function findByCustomer(customerId) {
  const [rows] = await pool.query(
    `SELECT o.*, zf.name AS pickup_zone_name, zt.name AS drop_zone_name
     FROM orders o
     JOIN zones zf ON zf.id = o.pickup_zone_id
     JOIN zones zt ON zt.id = o.drop_zone_id
     WHERE o.customer_id = ? ORDER BY o.id DESC`,
    [customerId]
  );
  return rows;
}

async function findByAgent(agentId) {
  const [rows] = await pool.query(
    `SELECT o.*, zf.name AS pickup_zone_name, zt.name AS drop_zone_name
     FROM orders o
     JOIN zones zf ON zf.id = o.pickup_zone_id
     JOIN zones zt ON zt.id = o.drop_zone_id
     WHERE o.agent_id = ? ORDER BY o.id DESC`,
    [agentId]
  );
  return rows;
}

async function assignAgent(orderId, agentId) {
  await pool.query('UPDATE orders SET agent_id = ? WHERE id = ?', [agentId, orderId]);
  return findById(orderId);
}

// Only current_status is ever mutated post-creation — everything else on an order is immutable
async function setStatus(orderId, status) {
  await pool.query('UPDATE orders SET current_status = ? WHERE id = ?', [status, orderId]);
  return findById(orderId);
}

module.exports = { create, findById, findAll, findByCustomer, findByAgent, assignAgent, setStatus };
