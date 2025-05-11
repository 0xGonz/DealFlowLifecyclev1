// Extend the Error interface to include common error code properties
interface Error {
  code?: string;
  errno?: number;
  syscall?: string;
  address?: string;
  port?: number;
}