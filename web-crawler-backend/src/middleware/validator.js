const Joi = require('joi');

const crawlSchema = Joi.object({
  url: Joi.string().uri().when('urls', {
    is: Joi.exist(),
    then: Joi.optional(),
    otherwise: Joi.required()
  }),
  urls: Joi.array().items(Joi.string().uri()).min(1).max(10),
  stream: Joi.boolean().optional(),
  crawlEntireSite: Joi.boolean().optional(),
  deepCrawl: Joi.boolean().optional(),
  maxPages: Joi.number().integer().min(1).max(200).optional(),
  maxDepth: Joi.number().integer().min(1).max(10).optional()
}).or('url', 'urls');

exports.validateCrawlRequest = (req, res, next) => {
  const { error } = crawlSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.details[0].message
      }
    });
  }
  
  next();
};
