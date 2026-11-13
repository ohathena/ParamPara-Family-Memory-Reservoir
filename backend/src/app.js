const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const env = require('./config/env');
const openapi = require('./docs/openapi');
const routes = require('./routes');
const { version } = require('../package.json');
const requestId = require('./middleware/requestId');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();

if (env.trustProxy) app.set('trust proxy', 1); // needed so rate limiting sees the real client IP behind a host's proxy

app.use(requestId);
if (!env.isTest) app.use(morgan(env.isProd ? 'combined' : 'dev'));
app.use(helmet());
app.use(compression());
app.use(cors({ origin: env.clientUrls, exposedHeaders: ['Content-Disposition', 'X-Request-Id'], maxAge: 600 }));
app.use(express.json({ limit: '100kb' }));

// Health checks: "live" = process is up, "ready" = database is connected too (used by hosting platforms)
app.get('/api/health', (req, res) => res.json({ success: true, message: 'ParamPara API running', version }));
app.get('/api/health/ready', (req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({ success: ready, database: ready ? 'connected' : 'not connected' });
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapi));

// general limit for the whole API (login/register have stricter limits of their own)
app.use('/api', rateLimit({ windowMs: 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false, skip: () => env.isTest }));
app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
