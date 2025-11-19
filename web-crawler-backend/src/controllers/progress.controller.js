const progressTracker = require('../services/progress-tracker.service');
const logger = require('../utils/logger');

class ProgressController {
  /**
   * Server-Sent Events endpoint for real-time progress
   */
  async streamProgress(req, res) {
    const { jobId } = req.params;

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    logger.info(`📡 SSE connection established for job: ${jobId}`);

    // Register client
    progressTracker.addClient(jobId, res);

    // Send heartbeat every 30 seconds
    const heartbeat = setInterval(() => {
      res.write(':heartbeat\n\n');
    }, 30000);

    // Clean up on disconnect
    req.on('close', () => {
      clearInterval(heartbeat);
      progressTracker.removeClient(jobId, res);
      logger.info(`📡 SSE connection closed for job: ${jobId}`);
    });
  }

  /**
   * Get job status (REST endpoint)
   */
  getJobStatus(req, res) {
    const { jobId } = req.params;
    const job = progressTracker.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    res.json({
      success: true,
      job
    });
  }

  /**
   * Get all jobs
   */
  getAllJobs(req, res) {
    const jobs = progressTracker.getAllJobs();
    res.json({
      success: true,
      jobs
    });
  }
}

module.exports = new ProgressController();
