// Tiny zero-dep logger. Morgan handles HTTP; this is for app-level events.
const fmt = (level, msg, meta) =>
  `[${new Date().toISOString()}] ${level} ${msg}${meta ? ' ' + JSON.stringify(meta) : ''}`;

export const logger = {
  info: (msg, meta) => console.log(fmt('INFO', msg, meta)),
  warn: (msg, meta) => console.warn(fmt('WARN', msg, meta)),
  error: (msg, meta) => console.error(fmt('ERROR', msg, meta)),
  debug: (msg, meta) => {
    if (process.env.NODE_ENV !== 'production') console.log(fmt('DEBUG', msg, meta));
  },
};
