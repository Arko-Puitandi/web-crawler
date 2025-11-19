const express = require('express');
const router = express.Router();
const progressController = require('../controllers/progress.controller');

// SSE endpoint for real-time progress
router.get('/:jobId/stream', progressController.streamProgress.bind(progressController));

// REST endpoint for job status
router.get('/:jobId', progressController.getJobStatus.bind(progressController));

// Get all jobs
router.get('/', progressController.getAllJobs.bind(progressController));

module.exports = router;
