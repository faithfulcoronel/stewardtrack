import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { UserRoleService } from '@/services/UserRoleService';
import { RbacRegistryService } from '@/services/RbacRegistryService';

// Mock the dependencies
jest.mock('@/utils/tenantUtils', () => ({
  tenantUtils: {
    getTenantId: jest.fn(() => Promise.resolve('test-tenant-id')),
  },
}));

const mockSupabaseClient = {
  rpc: jest.fn(),
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    update: jest.fn().mockReturnThis(),
  })),
  auth: {
    getUser: jest.fn(() => Promise.resolve({
      data: { user: { id: 'test-user-id' } },
      error: null
    })),
  },
};

const mockUserRoleRepository = {
  adapter: {
    getSupabaseClient: jest.fn(() => Promise.resolve(mockSupabaseClient)),
    canUserFast: jest.fn(),
    canUserAny: jest.fn(),
    canUserAll: jest.fn(),
    getUserEffectivePermissions: jest.fn(),
    getUserRoleMetadataKeys: jest.fn(),
    getUserAccessibleMenuItems: jest.fn(),
    getUserAccessibleMetadataPages: jest.fn(),
    getAdminRole: jest.fn(),
  },
  getRolesWithPermissions: jest.fn(),
  isSuperAdmin: jest.fn(),
  replaceUserRoles: jest.fn(),
};

const mockRoleRepository = {
  find: jest.fn(),
};

describe('Enhanced RBAC System', () => {
  let userRoleService: UserRoleService;
  let rbacRegistryService: RbacRegistryService;

  beforeEach(() => {
    jest.clearAllMocks();

    // Initialize services with mocked dependencies
    userRoleService = new UserRoleService(
      mockUserRoleRepository as any,
      mockRoleRepository as any
    );

    rbacRegistryService = new RbacRegistryService(
      mockUserRoleRepository as any
    );
  });

  describe('UserRoleService Enhanced Features', () => {
    it('should get user permissions with metadata keys', async () => {
      const userId = 'test-user-id';
      const tenantId = 'test-tenant-id';

      // Mock the adapter responses
      mockUserRoleRepository.adapter.getAdminRole.mockResolvedValue(null);
      mockUserRoleRepository.isSuperAdmin.mockResolvedValue(false);
      mockUserRoleRepository.adapter.getUserEffectivePermissions.mockResolvedValue([
        {
          permission_code: 'user:view',
          permission_name: 'View Users',
          permission_module: 'user',
        },
        {
          permission_code: 'user:create',
          permission_name: 'Create Users',
          permission_module: 'user',
        },
      ]);
      mockUserRoleRepository.getRolesWithPermissions.mockResolvedValue([
        {
          role_name: 'Admin',
          permissions: [
            { code: 'user:view', name: 'View Users' },
            { code: 'user:create', name: 'Create Users' },
          ],
        },
      ]);
      mockUserRoleRepository.adapter.getUserRoleMetadataKeys.mockResolvedValue([
        'admin',
        'manager',
      ]);

      const result = await userRoleService.getUserPermissions(userId, tenantId);

      expect(result).toEqual({
        roles: [
          {
            role_name: 'Admin',
            permissions: [
              { code: 'user:view', name: 'View Users' },
              { code: 'user:create', name: 'Create Users' },
            ],
          },
        ],
        permissions: [
          { code: 'user:view', name: 'View Users', module: 'user' },
          { code: 'user:create', name: 'Create Users', module: 'user' },
        ],
        effectivePermissions: [
          {
            permission_code: 'user:view',
            permission_name: 'View Users',
            permission_module: 'user',
          },
          {
            permission_code: 'user:create',
            permission_name: 'Create Users',
            permission_module: 'user',
          },
        ],
        adminRole: null,
        metadataKeys: ['admin', 'manager'],
      });

      expect(mockUserRoleRepository.adapter.getUserEffectivePermissions).toHaveBeenCalledWith(userId, tenantId);
      expect(mockUserRoleRepository.adapter.getUserRoleMetadataKeys).toHaveBeenCalledWith(userId, tenantId);
    });

    it('should use fast permission checks', async () => {
      mockUserRoleRepository.adapter.canUserFast.mockResolvedValue(true);

      const result = await userRoleService.canUser('user:view');

      expect(result).toBe(true);
      expect(mockUserRoleRepository.adapter.canUserFast).toHaveBeenCalledWith('user:view', 'test-tenant-id');
    });

    it('should check multiple permissions with OR logic', async () => {
      mockUserRoleRepository.adapter.canUserAny.mockResolvedValue(true);

      const result = await userRoleService.canUserAny(['user:view', 'user:create']);

      expect(result).toBe(true);
      expect(mockUserRoleRepository.adapter.canUserAny).toHaveBeenCalledWith(['user:view', 'user:create'], 'test-tenant-id');
    });

    it('should check multiple permissions with AND logic', async () => {
      mockUserRoleRepository.adapter.canUserAll.mockResolvedValue(false);

      const result = await userRoleService.canUserAll(['user:view', 'user:delete']);

      expect(result).toBe(false);
      expect(mockUserRoleRepository.adapter.canUserAll).toHaveBeenCalledWith(['user:view', 'user:delete'], 'test-tenant-id');
    });

    it('should get user accessible menu items', async () => {
      const userId = 'test-user-id';
      const expectedMenuItems = [
        {
          menu_item_id: 'menu-1',
          menu_code: 'dashboard',
          menu_label: 'Dashboard',
          menu_path: '/dashboard',
          can_access: true,
        },
      ];

      mockUserRoleRepository.adapter.getUserAccessibleMenuItems.mockResolvedValue(expectedMenuItems);

      const result = await userRoleService.getUserAccessibleMenuItems(userId);

      expect(result).toEqual(expectedMenuItems);
      expect(mockUserRoleRepository.adapter.getUserAccessibleMenuItems).toHaveBeenCalledWith(userId, 'test-tenant-id');
    });

    it('should get user accessible metadata pages', async () => {
      const userId = 'test-user-id';
      const expectedPages = [
        {
          metadata_page_id: 'admin-members',
          binding_source: 'role',
          source_name: 'Admin',
        },
      ];

      mockUserRoleRepository.adapter.getUserAccessibleMetadataPages.mockResolvedValue(expectedPages);

      const result = await userRoleService.getUserAccessibleMetadataPages(userId);

      expect(result).toEqual(expectedPages);
      expect(mockUserRoleRepository.adapter.getUserAccessibleMetadataPages).toHaveBeenCalledWith(userId, 'test-tenant-id');
    });
  });

  describe('RbacRegistryService', () => {
    it('should get role metadata mappings with caching', async () => {
      const tenantId = 'test-tenant-id';
      const mockRoles = [
        {
          id: 'role-1',
          name: 'Admin',
          metadata_key: 'admin',
          scope: 'tenant',
        },
        {
          id: 'role-2',
          name: 'User',
          metadata_key: 'user',
          scope: 'tenant',
        },
      ];

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue({ data: mockRoles, error: null }),
      });

      const result = await rbacRegistryService.getRoleMetadataMappings(tenantId);

      expect(result).toEqual([
        {
          roleId: 'role-1',
          roleName: 'Admin',
          metadataKey: 'admin',
          scope: 'tenant',
        },
        {
          roleId: 'role-2',
          roleName: 'User',
          metadataKey: 'user',
          scope: 'tenant',
        },
      ]);

      // Test caching - second call should not hit the database
      const cachedResult = await rbacRegistryService.getRoleMetadataMappings(tenantId);
      expect(cachedResult).toEqual(result);
    });

    it('should get bundle metadata mappings', async () => {
      const tenantId = 'test-tenant-id';
      const mockBundles = [
        {
          id: 'bundle-1',
          name: 'Admin Bundle',
          metadata_key: 'admin_bundle',
          scope: 'tenant',
        },
      ];

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue({ data: mockBundles, error: null }),
      });

      const result = await rbacRegistryService.getBundleMetadataMappings(tenantId);

      expect(result).toEqual([
        {
          bundleId: 'bundle-1',
          bundleName: 'Admin Bundle',
          metadataKey: 'admin_bundle',
          scope: 'tenant',
        },
      ]);
    });

    it('should get user metadata keys', async () => {
      const userId = 'test-user-id';
      const tenantId = 'test-tenant-id';
      const expectedKeys = ['admin', 'manager'];

      mockUserRoleRepository.adapter.getUserRoleMetadataKeys.mockResolvedValue(expectedKeys);

      const result = await rbacRegistryService.getUserMetadataKeys(userId, tenantId);

      expect(result).toEqual(expectedKeys);
      expect(mockUserRoleRepository.adapter.getUserRoleMetadataKeys).toHaveBeenCalledWith(userId, tenantId);
    });

    it('should resolve metadata key to role and bundle IDs', async () => {
      const metadataKey = 'admin';
      const tenantId = 'test-tenant-id';

      // Mock role mappings
      jest.spyOn(rbacRegistryService, 'getRoleMetadataMappings').mockResolvedValue([
        {
          roleId: 'role-1',
          roleName: 'Admin',
          metadataKey: 'admin',
          scope: 'tenant',
        },
        {
          roleId: 'role-2',
          roleName: 'User',
          metadataKey: 'user',
          scope: 'tenant',
        },
      ]);

      // Mock bundle mappings
      jest.spyOn(rbacRegistryService, 'getBundleMetadataMappings').mockResolvedValue([
        {
          bundleId: 'bundle-1',
          bundleName: 'Admin Bundle',
          metadataKey: 'admin',
          scope: 'tenant',
        },
      ]);

      const result = await rbacRegistryService.resolveMetadataKeyToIds(metadataKey, tenantId);

      expect(result).toEqual({
        roleIds: ['role-1'],
        bundleIds: ['bundle-1'],
      });
    });

    it('should create role metadata binding', async () => {
      const roleId = 'role-1';
      const metadataKey = 'admin';
      const tenantId = 'test-tenant-id';

      mockSupabaseClient.from.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue({ error: null }),
      });

      await rbacRegistryService.createRoleMetadataBinding(roleId, metadataKey, tenantId);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('roles');
    });

    it('should clear cache when tenant ID is provided', () => {
      const tenantId = 'test-tenant-id';

      // This should not throw an error
      rbacRegistryService.clearCache(tenantId);

      expect(() => rbacRegistryService.clearCache(tenantId)).not.toThrow();
    });

    it('should clear all caches', () => {
      // This should not throw an error
      rbacRegistryService.clearAllCaches();

      expect(() => rbacRegistryService.clearAllCaches()).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully in getUserPermissions', async () => {
      const userId = 'test-user-id';

      mockUserRoleRepository.adapter.getUserEffectivePermissions.mockRejectedValue(new Error('Database error'));
      mockUserRoleRepository.getRolesWithPermissions.mockRejectedValue(new Error('Database error'));

      const result = await userRoleService.getUserPermissions(userId);

      expect(result).toEqual({
        roles: [],
        permissions: [],
        adminRole: null,
        metadataKeys: [],
      });
    });

    it('should handle database errors gracefully in canUser', async () => {
      mockUserRoleRepository.adapter.canUserFast.mockRejectedValue(new Error('Database error'));

      const result = await userRoleService.canUser('user:view');

      expect(result).toBe(false);
    });

    it('should handle errors in metadata mappings', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        then: jest.fn().mockRejectedValue(new Error('Database error')),
      });

      const result = await rbacRegistryService.getRoleMetadataMappings('test-tenant-id');

      expect(result).toEqual([]);
    });
  });

  describe('Integration Scenarios', () => {
    it('should work with multiple roles and bundles for a user', async () => {
      const userId = 'test-user-id';
      const tenantId = 'test-tenant-id';

      // Mock complex permission structure
      mockUserRoleRepository.adapter.getUserEffectivePermissions.mockResolvedValue([
        {
          permission_code: 'user:view',
          permission_name: 'View Users',
          permission_module: 'user',
          assignment_type: 'direct',
          role_name: 'Manager',
        },
        {
          permission_code: 'user:create',
          permission_name: 'Create Users',
          permission_module: 'user',
          assignment_type: 'bundle',
          bundle_name: 'User Management Bundle',
        },
      ]);

      mockUserRoleRepository.adapter.getUserRoleMetadataKeys.mockResolvedValue([
        'manager',
        'user_management',
      ]);

      const result = await userRoleService.getUserPermissions(userId, tenantId);

      expect(result.effectivePermissions).toHaveLength(2);
      expect(result.metadataKeys).toContain('manager');
      expect(result.metadataKeys).toContain('user_management');

      // Verify both direct and bundle-based permissions are included
      const permissionCodes = result.permissions.map(p => p.code);
      expect(permissionCodes).toContain('user:view');
      expect(permissionCodes).toContain('user:create');
    });
  });
});