import type { GlobalRole } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      /** Set by requireAuth / loadUser — distinct from Passport's `user` */
      userId?: string;
      nebulaUser?: {
        id: string;
        email: string;
        name: string;
        globalRole: GlobalRole;
      };
    }
  }
}

export {};
