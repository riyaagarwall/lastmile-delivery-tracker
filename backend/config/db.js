const mysql = require('mysql2/promise');
require('dotenv').config();
console.log('DEBUG DB_USER:',JSON.stringify(process.env.DB_USER));
console.log('DEBUG DB_HOST:',JSON.stringify(process.env.DB_HOST));

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;
