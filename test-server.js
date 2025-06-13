const express = require('express');

// Catch ALL errors
process.on('uncaughtException', (error) => {
  console.error('💥 CRASH - Uncaught Exception:', error.message);
  console.error('Stack:', error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 CRASH - Unhandled Rejection:', reason);
});

process.on('exit', (code) => {
  console.log('🚪 Process exiting with code:', code);
});

const app = express();

app.get('/', (req, res) => {
  res.send('Server is working!');
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log('✅ Server should stay running now...');
});

// Keep the process alive
setInterval(() => {
  console.log('💓 Server heartbeat...');
}, 5000);