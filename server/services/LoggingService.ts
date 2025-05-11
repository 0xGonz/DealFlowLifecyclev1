/**
 * LoggingService provides enhanced logging capabilities
 * with structured log formats and multiple log levels
 */

// Log levels with numeric values for comparison
enum LogLevel {
  DEBUG = 10,
  INFO = 20,
  WARN = 30,
  ERROR = 40,
  FATAL = 50
}

// Type for log context data
type LogContext = Record<string, any>;

// Configuration for the logger
interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  context?: LogContext;
}

export class LoggingService {
  private static instance: LoggingService;
  private config: LoggerConfig;
  
  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      minLevel: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
      enableConsole: true,
      context: {},
      ...config
    };
    
    console.log(`Logging service initialized with min level: ${LogLevel[this.config.minLevel]}`);
  }
  
  /**
   * Get the singleton instance of the logging service
   */
  public static getInstance(config?: Partial<LoggerConfig>): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService(config);
    }
    return LoggingService.instance;
  }
  
  /**
   * Log a debug message
   */
  public debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }
  
  /**
   * Log an info message
   */
  public info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }
  
  /**
   * Log a warning message
   */
  public warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }
  
  /**
   * Log an error message
   */
  public error(message: string, error?: Error, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, {
      ...context,
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : undefined
    });
  }
  
  /**
   * Log a fatal message
   */
  public fatal(message: string, error?: Error, context?: LogContext): void {
    this.log(LogLevel.FATAL, message, {
      ...context,
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : undefined
    });
  }
  
  /**
   * Set the minimum log level
   */
  public setMinLevel(level: LogLevel): void {
    this.config.minLevel = level;
  }
  
  /**
   * Add context data to be included in all logs
   */
  public setGlobalContext(context: LogContext): void {
    this.config.context = {
      ...this.config.context,
      ...context
    };
  }
  
  /**
   * Internal method to log a message at a specific level
   */
  private log(level: LogLevel, message: string, context?: LogContext): void {
    // Skip if below minimum level
    if (level < this.config.minLevel) {
      return;
    }
    
    // Build log entry
    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];
    
    // Build structured log object
    const logEntry = {
      timestamp,
      level: levelName,
      message,
      ...this.config.context,
      ...context
    };
    
    // Output to console if enabled
    if (this.config.enableConsole) {
      const consoleMethod = this.getConsoleMethod(level);
      
      // Format for human readability in console
      consoleMethod(`[${timestamp}] [${levelName}] ${message}`);
      
      // If there's context, log it as well
      if (context && Object.keys(context).length > 0) {
        consoleMethod('Context:', context);
      }
    }
    
    // In a production environment, you would typically send logs to a 
    // centralized logging service like Elasticsearch, Logstash, etc.
    // For example:
    // this.sendToLogstash(logEntry);
  }
  
  /**
   * Get the appropriate console method based on log level
   */
  private getConsoleMethod(level: LogLevel): (message?: any, ...optionalParams: any[]) => void {
    switch (level) {
      case LogLevel.DEBUG:
        return console.debug;
      case LogLevel.INFO:
        return console.info;
      case LogLevel.WARN:
        return console.warn;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        return console.error;
      default:
        return console.log;
    }
  }
  
  /**
   * Example method to send logs to an external service
   * In production, you would implement this to send to your logging infrastructure
   */
  private sendToLogstash(logEntry: any): void {
    // Placeholder for sending logs to a centralized logging service
    // This would be implemented with actual integration in production
  }
}