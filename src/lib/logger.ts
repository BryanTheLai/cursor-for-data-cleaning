type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  prefix: string;
  message: string;
  data?: unknown;
}

const formatLog = (entry: LogEntry): string => {
  const time = entry.timestamp.split('T')[1]?.split('.')[0] || entry.timestamp;
  return `[${time}] [${entry.prefix}] ${entry.message}`;
};

const createLogger = (prefix: string) => {
  const logWithLevel = (level: LogLevel, message: string, data?: unknown) => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      prefix,
      message,
      data,
    };

    const formatted = formatLog(entry);
    
    switch (level) {
      case 'error':
        console.error(formatted, data !== undefined ? data : '');
        break;
      case 'warn':
        console.warn(formatted, data !== undefined ? data : '');
        break;
      case 'debug':
        console.debug(formatted, data !== undefined ? data : '');
        break;
      default:
        console.log(formatted, data !== undefined ? data : '');
    }

    return entry;
  };

  return {
    info: (message: string, data?: unknown) => logWithLevel('info', message, data),
    warn: (message: string, data?: unknown) => logWithLevel('warn', message, data),
    error: (message: string, data?: unknown) => logWithLevel('error', message, data),
    debug: (message: string, data?: unknown) => logWithLevel('debug', message, data),
  };
};

export const log = {
  import: createLogger('IMPORT'),
  groq: createLogger('GROQ'),
  mapping: createLogger('MAPPING'),
  supabase: createLogger('SUPABASE'),
  whatsapp: createLogger('WHATSAPP'),
  validation: createLogger('VALIDATION'),
  api: createLogger('API'),
  store: createLogger('STORE'),
};

export const measureTime = async <T>(
  label: string,
  logger: ReturnType<typeof createLogger>,
  fn: () => Promise<T>
): Promise<T> => {
  const start = performance.now();
  logger.info(`${label} - started`);
  
  try {
    const result = await fn();
    const duration = Math.round(performance.now() - start);
    logger.info(`${label} - completed`, { durationMs: duration });
    return result;
  } catch (error) {
    const duration = Math.round(performance.now() - start);
    logger.error(`${label} - failed`, { durationMs: duration, error });
    throw error;
  }
};

