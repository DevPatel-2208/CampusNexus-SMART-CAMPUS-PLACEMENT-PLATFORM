// Minimal structured (JSON-line) logger. No dependency.
// Levels: error < warn < info < debug. Set LOG_LEVEL env (default: info,
// debug when NODE_ENV !== 'production').
const ORDER = { error: 0, warn: 1, info: 2, debug: 3 };
const current = ORDER[process.env.LOG_LEVEL] ?? (process.env.NODE_ENV === 'production' ? 1 : 3);

function emit(level, msg, meta) {
  if (ORDER[level] > current) return;
  const line = { ts: new Date().toISOString(), level, msg, ...meta };
  if (level === 'error' || level === 'warn') console.error(JSON.stringify(line));
  else console.log(JSON.stringify(line));
}

module.exports = {
  error: (msg, meta) => emit('error', msg instanceof Error ? msg.message : msg, msg instanceof Error ? { stack: msg.stack, ...meta } : meta),
  warn: (msg, meta) => emit('warn', msg, meta),
  info: (msg, meta) => emit('info', msg, meta),
  debug: (msg, meta) => emit('debug', msg, meta),
};
