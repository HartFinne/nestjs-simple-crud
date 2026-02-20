import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole, UserEntity } from '../../users/entities/user.entity';

/**
 * RolesGuard
 * ----------
 * Reads the @Roles(...) metadata on the handler and verifies that
 * the authenticated user has at least one of the required roles.
 *
 * If no roles are required, the guard passes through (open route).
 *
 * NOTE: In a real app, combine with a JwtAuthGuard that populates
 * request.user before this guard runs.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No roles decorator — route is open
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: UserEntity }>();

    // TODO: remove before production — mock admin for local dev
    request.user = new UserEntity({
      id: 'mock-id',
      name: 'Mock Admin',
      email: 'admin@mock.com',
      role: UserRole.ADMIN,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const user = request.user;

    // No authenticated user — deny
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      throw new ForbiddenException(
        `Requires one of the following roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
