// workers/websiteWorker.js
// This just wraps your existing scraper with better process management

const { exec } = require('child_process');
const path = require('path');

class WebsiteWorker {
  constructor() {
    this.isProcessing = false;
    this.interval = null;
    this.lastRunTime = null;
    this.processStartTime = null;
  }

  async checkAndProcess() {
    const now = new Date();
    console.log(`[${now.toISOString()}] Worker check started`);
    
    // Check if we've been "processing" for too long (likely stuck)
    if (this.isProcessing && this.processStartTime) {
      const timeSinceStart = (now - this.processStartTime) / 1000;
      if (timeSinceStart > 300) { // 5 minutes
        console.log(`[Worker] Process stuck for ${Math.round(timeSinceStart)}s, resetting...`);
        this.isProcessing = false;
        this.processStartTime = null;
      }
    }
    
    // Prevent concurrent runs
    if (this.isProcessing) {
      const timeSinceStart = this.processStartTime ? (now - this.processStartTime) / 1000 : 0;
      console.log(`[Worker] Already processing for ${Math.round(timeSinceStart)}s, skipping...`);
      return;
    }

    this.isProcessing = true;
    this.processStartTime = now;
    this.lastRunTime = now;
    
    try {
      console.log(`[${now.toISOString()}] Starting scraper execution...`);
      
      // Run your existing scraper
      await new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, 'scrapeAndEmbedPendingWebsites.js');
        console.log(`[Worker] Executing: node ${scriptPath}`);
        
        exec(`node ${scriptPath}`, {
          timeout: 600000, // 10 minute timeout
          maxBuffer: 1024 * 1024 * 10 // 10MB buffer
        }, (error, stdout, stderr) => {
          if (error) {
            console.error('[Worker] Execution error:', error.message);
            if (error.code === 'TIMEOUT') {
              console.error('[Worker] Script timed out after 10 minutes');
            }
            reject(error);
          } else {
            if (stdout) {
              console.log('[Worker] Output:');
              console.log(stdout);
            }
            if (stderr) {
              console.log('[Worker] Stderr:');
              console.log(stderr);
            }
            resolve(stdout);
          }
        });
      });
      
      console.log(`[${new Date().toISOString()}] Scraper completed successfully`);
      
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Scraper failed:`, error.message);
    } finally {
      this.isProcessing = false;
      this.processStartTime = null;
      const endTime = new Date();
      const duration = (endTime - now) / 1000;
      console.log(`[${endTime.toISOString()}] Worker cycle completed in ${Math.round(duration)}s`);
    }
  }

  start(intervalMinutes = 2) {
    console.log(`[Worker] Starting website processor (runs every ${intervalMinutes} minutes)`);
    
    // Reset any stuck state
    this.isProcessing = false;
    this.processStartTime = null;
    
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
    this.isProcessing = false;
    this.processStartTime = null;
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