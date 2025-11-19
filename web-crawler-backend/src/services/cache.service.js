const redis = require('redis');
const logger = require('../utils/logger');

class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.initializeClient();
  }

  async initializeClient() {
    // Skip Redis if not configured
    if (!process.env.REDIS_HOST) {
      logger.info('ℹ️  Redis disabled - running without cache');
      this.isConnected = false;
      return;
    }

    try {
      this.client = redis.createClient({
        socket: {
          host: process.env.REDIS_HOST,
          port: process.env.REDIS_PORT || 6379
        },
        password: process.env.REDIS_PASSWORD || undefined
      });

      this.client.on('error', (err) => {
        if (!this.isConnected) {
          return;
        }
        logger.error('Redis connection lost:', err.message);
      });
      
      this.client.on('connect', () => {
        logger.info('✅ Redis connected');
        this.isConnected = true;
      });

      await this.client.connect();
    } catch (error) {
      logger.warn('⚠️  Redis connection failed - running without cache');
      this.isConnected = false;
    }
  }

  async get(key) {
    if (!this.isConnected) return null;
    
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  async set(key, value, ttl = 3600) {
    if (!this.isConnected) return false;
    
    try {
      await this.client.setEx(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error('Cache set error:', error);
      return false;
    }
  }

  async del(key) {
    if (!this.isConnected) return false;
    
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error('Cache delete error:', error);
      return false;
    }
  }
}

module.exports = new CacheService();
