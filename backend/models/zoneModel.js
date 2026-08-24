const pool = require('../config/db');

async function create({ name }) {
  const [result] = await pool.query('INSERT INTO zones (name) VALUES (?)', [name]);
  return result.insertId;
}

async function findAll() {
  const [rows] = await pool.query('SELECT * FROM zones ORDER BY id');
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM zones WHERE id = ?', [id]);
  return rows[0] || null;
}

async function update(id, { name }) {
  await pool.query('UPDATE zones SET name = ? WHERE id = ?', [name, id]);
  return findById(id);
}

async function remove(id) {
  const [result] = await pool.query('DELETE FROM zones WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { create, findAll, findById, update, remove };
