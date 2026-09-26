export function errorHandler(err, req, res, next) {
  console.error('Error:', err)
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: err.message
    })
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized',
      error: 'Invalid credentials'
    })
  }
  
  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      message: 'Duplicate entry',
      error: 'Record already exists'
    })
  }
  
  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      message: 'Invalid reference',
      error: 'Referenced record does not exist'
    })
  }
  
  const status = err.status || 500
  const message = err.message || 'Internal server error'
  
  res.status(status).json({
    success: false,
    message: 'Unable to complete operation',
    error: process.env.NODE_ENV === 'development' ? message : 'Internal server error'
  })
}

export class AppError extends Error {
  constructor(message, status = 500) {
    super(message)
    this.status = status
    this.name = 'AppError'
  }
}