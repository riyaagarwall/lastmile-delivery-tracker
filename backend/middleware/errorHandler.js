function errorHandler(err, req, res, next) {
  console.error(err);
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ success: false, error: 'Duplicate entry — this record already exists' });
  }
  res.status(err.status || 500).json({ success: false, error: err.message || 'Internal server error' });
}

module.exports = errorHandler;
