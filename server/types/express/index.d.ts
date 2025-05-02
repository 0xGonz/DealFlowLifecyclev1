import { User } from '@shared/schema';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
    
    interface Session {
      userId?: number;
    }
  }
}
