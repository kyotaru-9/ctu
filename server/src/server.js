import app from './app.js'

const PORT = process.env.PORT || 5000

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  process.exit(1)
})

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`CTU Clean-Track-Update API running on port ${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
})

server.on('error', (error) => {
  console.error('Server error:', error)
})