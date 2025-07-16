// workers/websiteWorker.js
// This just wraps your existing scraper with better process management

const { exec } = require('child_process');
const path = require('path');

class WebsiteWorker {
  constructor() {
    this.isProcessing = false;
    this.interval = null;
  }

  async checkAndProcess() {
    // Prevent concurrent runs
    if (this.isProcessing) {
      console.log('[Worker] Already processing, skipping...');
      return;
    }

    this.isProcessing = true;
    
    try {
      console.log(`[${new Date().toISOString()}] Checking for pending websites...`);
      
      // Run your existing scraper
      await new Promise((resolve, reject) => {
        exec('node workers/scrapeAndEmbedPendingWebsites.js', (error, stdout, stderr) => {
          if (error) {
            console.error('[Worker] Error:', error);
            reject(error);
          } else {
            if (stdout) console.log('[Worker] Output:', stdout);
            if (stderr) console.error('[Worker] Stderr:', stderr);
            resolve(stdout);
          }
        });
      });
      
    } catch (error) {
      console.error('[Worker] Failed:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  start(intervalMinutes = 2) {
    console.log(`[Worker] Starting website processor (runs every ${intervalMinutes} minutes)`);
    
    // Run immediately
    this.checkAndProcess();
    
    // Then run on interval
    this.interval = setInterval(() => {
      this.checkAndProcess();
    }, intervalMinutes * 60 * 1000);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      console.log('[Worker] Stopped');
    }
  }
}

// Handle graceful shutdown
const worker = new WebsiteWorker();

process.on('SIGTERM', () => {
  console.log('[Worker] SIGTERM received, shutting down gracefully...');
  worker.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[Worker] SIGINT received, shutting down gracefully...');
  worker.stop();
  process.exit(0);
});

// Start the worker
worker.start(2); // Run every 2 minutes

// Keep process alive
process.stdin.resume();