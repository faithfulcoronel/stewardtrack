import { describe, it, expect } from '@jest/globals';
import {
  isPermitted,
  isPermittedWithRoles,
  evaluateMetadataActions,
  MetadataEvaluationContext,
} from '@/lib/metadata/evaluation';

describe('Enhanced Metadata RBAC Evaluation', () => {
  describe('isPermitted (backward compatibility)', () => {
    it('should allow access when no RBAC config is provided', () => {
      const result = isPermitted(undefined, 'user');
      expect(result).toBe(true);
    });

    it('should allow access when role is in allow list', () => {
      const rbac = { allow: ['admin', 'user'] };
      const result = isPermitted(rbac, 'user');
      expect(result).toBe(true);
    });

    it('should deny access when role is in deny list', () => {
      const rbac = { deny: ['guest'], allow: ['user'] };
      const result = isPermitted(rbac, 'guest');
      expect(result).toBe(false);
    });

    it('should deny access when role is not in allow list', () => {
      const rbac = { allow: ['admin'] };
      const result = isPermitted(rbac, 'user');
      expect(result).toBe(false);
    });
  });

  describe('isPermittedWithRoles (multi-role support)', () => {
    it('should allow access when no RBAC config is provided', () => {
      const result = isPermittedWithRoles(undefined, 'user', ['user', 'manager']);
      expect(result).toBe(true);
    });

    it('should allow access when any role is in allow list', () => {
      const rbac = { allow: ['admin', 'manager'] };
      const result = isPermittedWithRoles(rbac, 'user', ['user', 'manager']);
      expect(result).toBe(true);
    });

    it('should deny access when any role is in deny list', () => {
      const rbac = { deny: ['guest'], allow: ['user', 'manager'] };
      const result = isPermittedWithRoles(rbac, 'user', ['user', 'guest']);
      expect(result).toBe(false);
    });

    it('should deny access when no roles are in allow list', () => {
      const rbac = { allow: ['admin'] };
      const result = isPermittedWithRoles(rbac, 'user', ['user', 'manager']);
      expect(result).toBe(false);
    });

    it('should prioritize deny over allow', () => {
      const rbac = { allow: ['user'], deny: ['user'] };
      const result = isPermittedWithRoles(rbac, 'user', ['user']);
      expect(result).toBe(false);
    });

    it('should work with empty roles array', () => {
      const rbac = { allow: ['admin'] };
      const result = isPermittedWithRoles(rbac, 'guest', []);
      expect(result).toBe(false);
    });

    it('should work with single role in array', () => {
      const rbac = { allow: ['admin', 'user'] };
      const result = isPermittedWithRoles(rbac, 'user', ['user']);
      expect(result).toBe(true);
    });
  });

  describe('evaluateMetadataActions with multiple roles', () => {
    const mockActions = [
      {
        id: 'create-user',
        kind: 'api' as const,
        rbac: { allow: ['admin', 'manager'] },
        config: { endpoint: '/api/users' },
      },
      {
        id: 'view-users',
        kind: 'api' as const,
        rbac: { allow: ['admin', 'manager', 'user'] },
        config: { endpoint: '/api/users' },
      },
      {
        id: 'delete-user',
        kind: 'api' as const,
        rbac: { allow: ['admin'] },
        config: { endpoint: '/api/users' },
      },
      {
        id: 'public-action',
        kind: 'api' as const,
        rbac: undefined, // No restrictions
        config: { endpoint: '/api/public' },
      },
      {
        id: 'denied-action',
        kind: 'api' as const,
        rbac: { deny: ['user'] },
        config: { endpoint: '/api/admin-only' },
      },
    ];

    it('should filter actions based on primary role only (backward compatibility)', () => {
      const result = evaluateMetadataActions(mockActions, 'user');

      expect(result).toHaveProperty('view-users');
      expect(result).toHaveProperty('public-action');
      expect(result).not.toHaveProperty('create-user');
      expect(result).not.toHaveProperty('delete-user');
      expect(result).not.toHaveProperty('denied-action');
    });

    it('should filter actions based on multiple roles', () => {
      const result = evaluateMetadataActions(mockActions, 'user', ['user', 'manager']);

      expect(result).toHaveProperty('create-user'); // Available through manager role
      expect(result).toHaveProperty('view-users'); // Available through both roles
      expect(result).toHaveProperty('public-action');
      expect(result).not.toHaveProperty('delete-user'); // Only available to admin
      expect(result).not.toHaveProperty('denied-action'); // Denied to user
    });

    it('should work with admin role having access to all allowed actions', () => {
      const result = evaluateMetadataActions(mockActions, 'admin', ['admin']);

      expect(result).toHaveProperty('create-user');
      expect(result).toHaveProperty('view-users');
      expect(result).toHaveProperty('delete-user');
      expect(result).toHaveProperty('public-action');
      expect(result).toHaveProperty('denied-action'); // Admin not in deny list
    });

    it('should handle role with deny restrictions', () => {
      const result = evaluateMetadataActions(mockActions, 'user', ['user', 'admin']);

      // Even though admin role would allow everything, user role is denied
      expect(result).not.toHaveProperty('denied-action');
      expect(result).toHaveProperty('delete-user'); // Available through admin role
    });

    it('should normalize config properties', () => {
      const actionsWithCamelCase = [
        {
          id: 'test-action',
          kind: 'api' as const,
          rbac: { allow: ['user'] },
          config: {
            'api-endpoint': '/api/test',
            'max_retries': 3,
            'use_cache': true,
          },
        },
      ];

      const result = evaluateMetadataActions(actionsWithCamelCase, 'user');

      expect(result['test-action'].config).toEqual({
        apiEndpoint: '/api/test',
        maxRetries: 3,
        useCache: true,
      });
    });

    it('should return empty object when no actions are permitted', () => {
      const restrictedActions = [
        {
          id: 'admin-only',
          kind: 'api' as const,
          rbac: { allow: ['admin'] },
          config: {},
        },
      ];

      const result = evaluateMetadataActions(restrictedActions, 'user', ['user']);

      expect(Object.keys(result)).toHaveLength(0);
    });
  });

  describe('Complex RBAC scenarios', () => {
    it('should handle overlapping allow and deny rules correctly', () => {
      const rbac = {
        allow: ['user', 'manager', 'admin'],
        deny: ['manager'], // Manager is explicitly denied despite being in allow
      };

      expect(isPermittedWithRoles(rbac, 'user', ['user'])).toBe(true);
      expect(isPermittedWithRoles(rbac, 'manager', ['manager'])).toBe(false);
      expect(isPermittedWithRoles(rbac, 'user', ['user', 'manager'])).toBe(false); // Denied due to manager role
      expect(isPermittedWithRoles(rbac, 'admin', ['admin'])).toBe(true);
    });

    it('should handle bundle-style metadata keys', () => {
      const rbac = { allow: ['admin_bundle', 'user_management'] };

      const result = isPermittedWithRoles(rbac, 'user', ['user', 'admin_bundle']);
      expect(result).toBe(true);

      const result2 = isPermittedWithRoles(rbac, 'user', ['basic_user', 'viewer']);
      expect(result2).toBe(false);
    });

    it('should work with metadata evaluation context structure', () => {
      const context: MetadataEvaluationContext = {
        role: 'user',
        roles: ['user', 'manager', 'content_editor'],
        featureFlags: { advanced_features: true },
        searchParams: { filter: 'active' },
      };

      const actions = [
        {
          id: 'edit-content',
          kind: 'api' as const,
          rbac: { allow: ['content_editor', 'admin'] },
          config: {},
        },
        {
          id: 'manage-users',
          kind: 'api' as const,
          rbac: { allow: ['manager', 'admin'] },
          config: {},
        },
      ];

      const result = evaluateMetadataActions(actions, context.role!, context.roles!);

      expect(result).toHaveProperty('edit-content'); // Available through content_editor role
      expect(result).toHaveProperty('manage-users'); // Available through manager role
    });

    it('should handle case sensitivity in role names', () => {
      const rbac = { allow: ['Admin', 'Manager'] };

      // Should be case sensitive
      expect(isPermittedWithRoles(rbac, 'admin', ['admin'])).toBe(false);
      expect(isPermittedWithRoles(rbac, 'Admin', ['Admin'])).toBe(true);
    });
  });

  describe('Performance considerations', () => {
    it('should handle large role arrays efficiently', () => {
      const largeRoleArray = Array.from({ length: 100 }, (_, i) => `role_${i}`);
      const rbac = { allow: ['role_50', 'role_75'] };

      const startTime = Date.now();
      const result = isPermittedWithRoles(rbac, 'role_0', largeRoleArray);
      const endTime = Date.now();

      expect(result).toBe(true); // role_50 should be found
      expect(endTime - startTime).toBeLessThan(100); // Should complete quickly
    });

    it('should handle large action arrays efficiently', () => {
      const largeActionArray = Array.from({ length: 1000 }, (_, i) => ({
        id: `action_${i}`,
        kind: 'api' as const,
        rbac: { allow: i % 10 === 0 ? ['admin'] : ['user'] },
        config: {},
      }));

      const startTime = Date.now();
      const result = evaluateMetadataActions(largeActionArray, 'admin', ['admin']);
      const endTime = Date.now();

      expect(Object.keys(result).length).toBe(1000); // Admin should have access to all
      expect(endTime - startTime).toBeLessThan(500); // Should complete reasonably quickly
    });
  });
});