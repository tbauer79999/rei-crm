module.exports = {
  apps: [
    {
      name: 'website-worker',
      script: './workers/websiteWorker.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/website-worker-error.log',
      out_file: './logs/website-worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};