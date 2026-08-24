const pool = require('../config/db');
const agentModel = require('../models/agentModel');

/**
 * Finds the nearest available agent for a pickup zone.
 * "Nearest" here means: an agent whose current_zone_id matches the pickup zone
 * and whose availability_status is 'available'. This is a simple zone-based
 * proxy for physical distance — a reasonable interpretation given we don't
 * have live GPS coordinates for agents.
 * Returns the agent_profiles row, or null if none are available.
 */
async function findNearestAvailableAgent(pickupZoneId) {
  return agentModel.findAvailableInZone(pickupZoneId);
}

/**
 * Assigns the nearest available agent and marks them busy, atomically.
 * Uses SELECT ... FOR UPDATE inside a transaction so two orders created at
 * the same instant in the same zone can never be handed the same agent —
 * the second request's lock waits for the first to commit, then re-checks
 * availability and picks the next free agent (or fails with 409 if none left).
 * Throws if no agent is available so the caller can decide how to handle it
 * (leave the order unassigned, notify admin, etc).
 */
async function autoAssign(pickupZoneId) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(
      `SELECT * FROM agent_profiles
       WHERE current_zone_id = ? AND availability_status = 'available'
       LIMIT 1 FOR UPDATE`,
      [pickupZoneId]
    );
    const agent = rows[0];
    if (!agent) {
      await conn.rollback();
      const err = new Error('No available agent found in the pickup zone. Assign manually or try again later.');
      err.status = 409;
      throw err;
    }
    await conn.query(`UPDATE agent_profiles SET availability_status = 'busy' WHERE id = ?`, [agent.id]);
    await conn.commit();
    return agent;
  } catch (err) {
    if (conn) { try { await conn.rollback(); } catch (e) { /* already rolled back */ } }
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { findNearestAvailableAgent, autoAssign };
