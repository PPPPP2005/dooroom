class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}
const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]));
module.exports = { HttpError, ah, pick };
