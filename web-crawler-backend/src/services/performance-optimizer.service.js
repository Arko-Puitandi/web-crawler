const logger = require('../utils/logger');

class PerformanceOptimizer {
  constructor() {
    this.cache = new Map();
    this.cacheMaxSize = 1000;
    this.cacheTTL = 3600000; // 1 hour
  }

  /**
   * Memoize function results
   */
  memoize(fn, keyGenerator) {
    return (...args) => {
      const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
      
      if (this.cache.has(key)) {
        const cached = this.cache.get(key);
        if (Date.now() - cached.timestamp < this.cacheTTL) {
          logger.debug(`Cache hit: ${key}`);
          return cached.value;
        } else {
          this.cache.delete(key);
        }
      }

      const result = fn(...args);
      
      // Prevent cache from growing too large
      if (this.cache.size >= this.cacheMaxSize) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }

      this.cache.set(key, {
        value: result,
        timestamp: Date.now()
      });

      return result;
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    logger.info('Cache cleared');
  }

  /**
   * Batch process array in chunks
   */
  async batchProcess(items, processor, batchSize = 10) {
    const results = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(item => processor(item))
      );
      results.push(...batchResults);
      
      // Small delay to prevent overwhelming resources
      if (i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  }

  /**
   * Throttle function execution
   */
  throttle(fn, delay) {
    let lastCall = 0;
    return (...args) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        return fn(...args);
      }
    };
  }

  /**
   * Debounce function execution
   */
  debounce(fn, delay) {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
    };
  }

  /**
   * Measure execution time
   */
  async measurePerformance(name, fn) {
    const start = Date.now();
    const result = await fn();
    const duration = Date.now() - start;
    
    logger.info(`⏱️  ${name}: ${duration}ms`);
    return result;
  }

  /**
   * Optimize memory usage by processing in streams
   */
  createChunkedArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Get memory usage stats
   */
  getMemoryStats() {
    const usage = process.memoryUsage();
    return {
      rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(usage.external / 1024 / 1024)}MB`
    };
  }

  /**
   * Log memory usage
   */
  logMemoryUsage() {
    const stats = this.getMemoryStats();
    logger.info(`💾 Memory: ${stats.heapUsed} / ${stats.heapTotal} (RSS: ${stats.rss})`);
  }

  /**
   * Force garbage collection if available
   */
  forceGC() {
    if (global.gc) {
      global.gc();
      logger.info('🗑️  Garbage collection triggered');
    }
  }

  /**
   * Limit concurrent operations
   */
  async limitConcurrency(tasks, limit) {
    const results = [];
    const executing = [];

    for (const task of tasks) {
      const promise = Promise.resolve().then(() => task());
      results.push(promise);

      if (limit <= tasks.length) {
        const e = promise.then(() => executing.splice(executing.indexOf(e), 1));
        executing.push(e);
        if (executing.length >= limit) {
          await Promise.race(executing);
        }
      }
    }

    return Promise.all(results);
  }
}

module.exports = new PerformanceOptimizer();
