function notFound(_req, res) {
  res.status(404).json({ error: 'not_found' });
}
// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: err.message || 'server_error', ...(err.extra || {}) });
}
module.exports = { notFound, errorHandler };
