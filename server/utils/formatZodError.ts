import { ZodError } from 'zod';

/**
 * Format ZodError into a more user-friendly format
 */
export function formatZodError(error: ZodError): string {
  return error.errors.map(err => {
    const path = err.path.join('.');
    return `${path ? path + ': ' : ''}${err.message}`;
  }).join(', ');
}