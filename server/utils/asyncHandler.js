// Express 4 fängt Rejections aus async-Handlern nicht automatisch, 
// dieser Wrapper leitet sie an die zentrale Fehler-Middleware weiter.
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
