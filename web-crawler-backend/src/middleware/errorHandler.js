const logger = require('../utils/logger');

module.exports = (err, req, res, next) => {
  logger.error('Error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }
  });
};
