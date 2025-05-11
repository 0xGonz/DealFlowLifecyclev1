/**
 * API Versioning Middleware
 * This middleware handles API version routing and backwards compatibility
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Extract version from Accept header
 * Example: Accept: application/json;version=2
 * Would return 2
 */
export function extractVersionFromHeader(req: Request): number | null {
  const acceptHeader = req.get('Accept');
  if (!acceptHeader) return null;
  
  const versionMatch = acceptHeader.match(/version=(\d+)/);
  if (versionMatch && versionMatch[1]) {
    return parseInt(versionMatch[1], 10);
  }
  
  return null;
}

/**
 * Middleware to handle API versioning
 * It extracts the version from various sources and sets it on the request object
 * Priority order: query param > header > default
 */
export function versioningMiddleware(defaultVersion: number = 1) {
  return (req: Request, res: Response, next: NextFunction) => {
    // First check query parameter
    let version: number | null = null;
    if (req.query.v) {
      version = parseInt(req.query.v as string, 10);
    }
    
    // Then check headers
    if (!version) {
      version = extractVersionFromHeader(req);
    }
    
    // Default to specified version if none found
    if (!version) {
      version = defaultVersion;
    }
    
    // Add version to request object
    (req as any).apiVersion = version;
    
    // Add versioning info to response headers
    res.set('X-API-Version', version.toString());
    res.set('X-API-Version-Available', '1'); // Update as new versions are added
    
    next();
  };
}