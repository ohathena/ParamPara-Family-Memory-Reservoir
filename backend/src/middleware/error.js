// Small helper to throw errors with a status code
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function notFound(req, res) {
  res.status(404).json({ success: false, message: 'Route not found' });
}

function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ success: false, message: err.message });
  }
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((e) => e.message).join(', ');
    return res.status(400).json({ success: false, message });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'Invalid ID or value' });
  }
  if (err.code === 11000) {
    return res.status(409).json({ success: false, message: 'Already exists' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Invalid JSON body' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, message: 'Request body too large' });
  }
  // Unknown error: log details on the server only, give the client a request id to quote
  console.error(`[${req.id}]`, err);
  res.status(500).json({ success: false, message: 'Something went wrong', requestId: req.id });
}

module.exports = { HttpError, notFound, errorHandler };
