import { Request } from 'express';
import { User } from '@shared/schema';

/**
 * Enterprise Authorization Service
 * Implements fine-grained access control for investment platform
 */

export interface Permission {
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

export interface Role {
  name: string;
  permissions: Permission[];
  hierarchy: number; // Higher number = more permissions
}

export class AuthorizationService {
  private static instance: AuthorizationService;
  private roles: Map<string, Role> = new Map();

  private constructor() {
    this.initializeRoles();
  }

  static getInstance(): AuthorizationService {
    if (!AuthorizationService.instance) {
      AuthorizationService.instance = new AuthorizationService();
    }
    return AuthorizationService.instance;
  }

  private initializeRoles(): void {
    // Define investment platform role hierarchy
    const roles: Role[] = [
      {
        name: 'intern',
        hierarchy: 1,
        permissions: [
          { resource: 'deals', action: 'read' },
          { resource: 'documents', action: 'read' },
          { resource: 'funds', action: 'read' }
        ]
      },
      {
        name: 'analyst',
        hierarchy: 2,
        permissions: [
          { resource: 'deals', action: 'read' },
          { resource: 'deals', action: 'create' },
          { resource: 'deals', action: 'update' },
          { resource: 'documents', action: 'read' },
          { resource: 'documents', action: 'upload' },
          { resource: 'memos', action: 'create' },
          { resource: 'memos', action: 'update', conditions: { owner: 'self' } },
          { resource: 'funds', action: 'read' }
        ]
      },
      {
        name: 'observer',
        hierarchy: 2,
        permissions: [
          { resource: 'deals', action: 'read' },
          { resource: 'documents', action: 'read' },
          { resource: 'funds', action: 'read' },
          { resource: 'reports', action: 'read' }
        ]
      },
      {
        name: 'partner',
        hierarchy: 3,
        permissions: [
          { resource: 'deals', action: '*' },
          { resource: 'documents', action: '*' },
          { resource: 'memos', action: '*' },
          { resource: 'funds', action: '*' },
          { resource: 'capital-calls', action: '*' },
          { resource: 'users', action: 'read' }
        ]
      },
      {
        name: 'admin',
        hierarchy: 4,
        permissions: [
          { resource: '*', action: '*' }
        ]
      }
    ];

    roles.forEach(role => this.roles.set(role.name, role));
  }

  /**
   * Check if user has permission for specific resource and action
   */
  hasPermission(
    userRole: string,
    resource: string,
    action: string,
    context?: { userId?: number; resourceOwner?: number }
  ): boolean {
    const role = this.roles.get(userRole);
    if (!role) return false;

    // Check explicit permissions
    for (const permission of role.permissions) {
      if (this.matchesPermission(permission, resource, action, context)) {
        return true;
      }
    }

    return false;
  }

  private matchesPermission(
    permission: Permission,
    resource: string,
    action: string,
    context?: { userId?: number; resourceOwner?: number }
  ): boolean {
    // Check resource match
    const resourceMatch = permission.resource === '*' || permission.resource === resource;
    if (!resourceMatch) return false;

    // Check action match
    const actionMatch = permission.action === '*' || permission.action === action;
    if (!actionMatch) return false;

    // Check conditions
    if (permission.conditions) {
      if (permission.conditions.owner === 'self' && context) {
        return context.userId === context.resourceOwner;
      }
    }

    return true;
  }

  /**
   * Get user's effective permissions
   */
  getUserPermissions(userRole: string): Permission[] {
    const role = this.roles.get(userRole);
    return role ? role.permissions : [];
  }

  /**
   * Check if role can access specific deal stage
   */
  canAccessDealStage(userRole: string, stage: string): boolean {
    const role = this.roles.get(userRole);
    if (!role) return false;

    // Admins and partners can access all stages
    if (role.hierarchy >= 3) return true;

    // Analysts can access most stages except final closing
    if (role.hierarchy >= 2 && stage !== 'closing') return true;

    // Interns can only access early stages
    if (role.hierarchy >= 1 && ['initial_review', 'screening'].includes(stage)) return true;

    return false;
  }

  /**
   * Middleware factory for route protection
   */
  requirePermission(resource: string, action: string) {
    return (req: Request, res: any, next: any) => {
      const userRole = req.session?.role;
      if (!userRole) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const hasAccess = this.hasPermission(userRole, resource, action, {
        userId: req.session?.userId,
        resourceOwner: req.body?.userId || req.params?.userId
      });

      if (!hasAccess) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required: { resource, action },
          userRole
        });
      }

      next();
    };
  }
}