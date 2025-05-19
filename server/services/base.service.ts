import { sql as drizzleSql } from 'drizzle-orm';

/**
 * Base service class with shared functionality for all services
 */
export class BaseService {
  /**
   * SQL builder for use in Drizzle queries
   */
  protected sql = drizzleSql;
}