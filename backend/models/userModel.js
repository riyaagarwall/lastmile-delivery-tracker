const pool = require('../config/db');

// Never select password_hash except in findByEmail (used only for login verification)
const PUBLIC_FIELDS = 'id, name, email, role, phone, created_at';

async function create({ name, email, passwordHash, role, phone }) {
  const [result] = await pool.query(
    'INSERT INTO users (name, email, password_hash, role, phone) VALUES (?, ?, ?, ?, ?)',
    [name, email, passwordHash, role, phone || null]
  );
  return result.insertId;
}

async function findByEmail(email) {
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  return rows[0] || null;
}

async function findById(id) {
  const [rows] = await pool.query(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = ?`, [id]);
  return rows[0] || null;
}

async function findAll() {
  const [rows] = await pool.query(`SELECT ${PUBLIC_FIELDS} FROM users ORDER BY id DESC`);
  return rows;
}

async function update(id, { name, phone, role }) {
  const fields = [];
  const values = [];
  if (name !== undefined) { fields.push('name = ?'); values.push(name); }
  if (phone !== undefined) { fields.push('phone = ?'); values.push(phone); }
  if (role !== undefined) { fields.push('role = ?'); values.push(role); }
  if (fields.length === 0) return findById(id);
  values.push(id);
  await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
  return findById(id);
}

async function remove(id) {
  const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { create, findByEmail, findById, findAll, update, remove };
