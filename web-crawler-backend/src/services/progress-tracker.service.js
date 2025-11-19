const EventEmitter = require('events');
const logger = require('../utils/logger');

class ProgressTrackerService extends EventEmitter {
  constructor() {
    super();
    this.jobs = new Map(); // jobId -> job metadata
    this.clients = new Map(); // jobId -> SSE response objects
  }

  /**
   * Create a new crawl job
   */
  createJob(jobId, options = {}) {
    const job = {
      jobId,
      status: 'initializing',
      progress: 0,
      currentPage: '',
      totalPages: 0,
      pagesProcessed: 0,
      locationsFound: 0,
      errors: [],
      startTime: Date.now(),
      ...options
    };

    this.jobs.set(jobId, job);
    logger.info(`📋 Created job: ${jobId}`);
    return job;
  }

  /**
   * Update job progress
   */
  updateProgress(jobId, updates) {
    const job = this.jobs.get(jobId);
    if (!job) {
      logger.warn(`Job ${jobId} not found`);
      return;
    }

    Object.assign(job, updates);
    job.progress = job.totalPages > 0 
      ? Math.round((job.pagesProcessed / job.totalPages) * 100)
      : 0;

    // Emit to SSE clients
    this.sendToClients(jobId, {
      type: 'progress',
      data: job
    });

    logger.info(`📊 Job ${jobId}: ${job.pagesProcessed}/${job.totalPages} pages (${job.progress}%) - ${job.locationsFound} locations`);
  }

  /**
   * Mark job as complete
   */
  completeJob(jobId, finalData = {}) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'completed';
    job.progress = 100;
    job.endTime = Date.now();
    job.duration = job.endTime - job.startTime;
    Object.assign(job, finalData);

    this.sendToClients(jobId, {
      type: 'complete',
      data: job
    });

    logger.info(`✅ Job ${jobId} completed in ${Math.round(job.duration / 1000)}s`);
  }

  /**
   * Mark job as failed
   */
  failJob(jobId, error) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'failed';
    job.error = error.message;
    job.endTime = Date.now();

    this.sendToClients(jobId, {
      type: 'error',
      data: job
    });

    logger.error(`❌ Job ${jobId} failed: ${error.message}`);
  }

  /**
   * Register SSE client for a job
   */
  addClient(jobId, res) {
    if (!this.clients.has(jobId)) {
      this.clients.set(jobId, new Set());
    }
    this.clients.get(jobId).add(res);

    // Send current job state immediately
    const job = this.jobs.get(jobId);
    if (job) {
      this.sendToClient(res, {
        type: 'connected',
        data: job
      });
    }

    logger.info(`🔌 Client connected to job ${jobId}`);
  }

  /**
   * Remove SSE client
   */
  removeClient(jobId, res) {
    const clients = this.clients.get(jobId);
    if (clients) {
      clients.delete(res);
      if (clients.size === 0) {
        this.clients.delete(jobId);
      }
    }
    logger.info(`🔌 Client disconnected from job ${jobId}`);
  }

  /**
   * Send message to all clients of a job
   */
  sendToClients(jobId, message) {
    const clients = this.clients.get(jobId);
    if (!clients) return;

    clients.forEach(res => {
      this.sendToClient(res, message);
    });
  }

  /**
   * Send message to a specific client
   */
  sendToClient(res, message) {
    try {
      res.write(`data: ${JSON.stringify(message)}\n\n`);
    } catch (error) {
      logger.error('Error sending SSE message:', error.message);
    }
  }

  /**
   * Get job status
   */
  getJob(jobId) {
    return this.jobs.get(jobId);
  }

  /**
   * Get all jobs
   */
  getAllJobs() {
    return Array.from(this.jobs.values());
  }

  /**
   * Clean up old jobs (older than 1 hour)
   */
  cleanup() {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    let cleaned = 0;

    for (const [jobId, job] of this.jobs.entries()) {
      if (job.endTime && job.endTime < oneHourAgo) {
        this.jobs.delete(jobId);
        this.clients.delete(jobId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info(`🧹 Cleaned up ${cleaned} old jobs`);
    }
  }

  /**
   * Generate unique job ID
   */
  static generateJobId() {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Cleanup old jobs every 15 minutes
const tracker = new ProgressTrackerService();
setInterval(() => tracker.cleanup(), 15 * 60 * 1000);

module.exports = tracker;
