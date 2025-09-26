/**
 * Tests for Phase E RBAC API endpoints
 */

import { NextRequest } from 'next/server';

// Mock the container and services
jest.mock('@/lib/container', () => ({
  container: {
    get: jest.fn()
  }
}));

jest.mock('@/services/rbac.service', () => ({
  RbacService: jest.fn()
}));

import { container } from '@/lib/container';
import { RbacService } from '@/services/rbac.service';

// Import the route handlers
import { GET as healthGet } from '@/app/api/rbac/health/route';
import { GET as materializedViewGet, POST as materializedViewPost } from '@/app/api/rbac/materialized-views/route';
import { GET as publishingGet, POST as publishingPost } from '@/app/api/rbac/metadata/publishing/route';

describe('RBAC Phase E API Endpoints', () => {
  let mockRbacService: jest.Mocked<RbacService>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRbacService = {
      getRbacHealthMetrics: jest.fn(),
      getMaterializedViewStatus: jest.fn(),
      refreshMaterializedViews: jest.fn(),
      getMetadataPublishingStatus: jest.fn(),
      compileMetadata: jest.fn(),
      validateMetadata: jest.fn(),
      publishMetadata: jest.fn(),
    } as any;

    (container.get as jest.Mock).mockReturnValue(mockRbacService);
  });

  describe('/api/rbac/health', () => {
    it('returns health metrics successfully', async () => {
      const mockHealthData = {
        systemHealth: 'healthy',
        metrics: {
          orphaned_user_roles: { value: 0, status: 'healthy', details: { count: 0 } },
          users_without_roles: { value: 2, status: 'info', details: { count: 2 } },
          materialized_view_lag_minutes: { value: 5, status: 'healthy', details: { lag_seconds: 300 } }
        },
        lastUpdated: new Date().toISOString()
      };

      mockRbacService.getRbacHealthMetrics.mockResolvedValue(mockHealthData);

      const request = new NextRequest('http://localhost:3000/api/rbac/health');
      const response = await healthGet(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.systemHealth).toBe('healthy');
      expect(mockRbacService.getRbacHealthMetrics).toHaveBeenCalledWith(undefined);
    });

    it('handles health metrics errors gracefully', async () => {
      mockRbacService.getRbacHealthMetrics.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/rbac/health');
      const response = await healthGet(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Failed to fetch RBAC health metrics');
    });

    it('accepts tenant ID parameter', async () => {
      const mockHealthData = { systemHealth: 'healthy', metrics: {} };
      mockRbacService.getRbacHealthMetrics.mockResolvedValue(mockHealthData);

      const request = new NextRequest('http://localhost:3000/api/rbac/health?tenantId=test-tenant');
      await healthGet(request);

      expect(mockRbacService.getRbacHealthMetrics).toHaveBeenCalledWith('test-tenant');
    });
  });

  describe('/api/rbac/materialized-views', () => {
    describe('GET', () => {
      it('returns materialized view status', async () => {
        const mockStatus = {
          currentStatus: 'healthy',
          lastRefresh: '2024-01-01T12:00:00Z',
          lagMinutes: 5,
          refreshHistory: [],
          viewFreshness: '2024-01-01T12:00:00Z',
          performanceMetrics: {
            averageRefreshTime: 1115,
            successRate: 100
          }
        };

        mockRbacService.getMaterializedViewStatus.mockResolvedValue(mockStatus);

        const request = new NextRequest('http://localhost:3000/api/rbac/materialized-views');
        const response = await materializedViewGet(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.currentStatus).toBe('healthy');
        expect(mockRbacService.getMaterializedViewStatus).toHaveBeenCalledWith(undefined);
      });

      it('handles materialized view status errors', async () => {
        mockRbacService.getMaterializedViewStatus.mockRejectedValue(new Error('View not found'));

        const request = new NextRequest('http://localhost:3000/api/rbac/materialized-views');
        const response = await materializedViewGet(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.success).toBe(false);
        expect(data.error).toContain('Failed to fetch materialized view status');
      });
    });

    describe('POST', () => {
      it('refreshes materialized views successfully', async () => {
        const mockRefreshResult = {
          success: true,
          message: 'Materialized views refreshed successfully',
          timestamp: new Date().toISOString()
        };

        mockRbacService.refreshMaterializedViews.mockResolvedValue(mockRefreshResult);

        const request = new NextRequest('http://localhost:3000/api/rbac/materialized-views', {
          method: 'POST',
          body: JSON.stringify({ action: 'refresh' }),
          headers: { 'Content-Type': 'application/json' }
        });

        const response = await materializedViewPost(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.message).toContain('refresh initiated');
        expect(mockRbacService.refreshMaterializedViews).toHaveBeenCalledWith(undefined);
      });

      it('handles invalid action parameter', async () => {
        const request = new NextRequest('http://localhost:3000/api/rbac/materialized-views', {
          method: 'POST',
          body: JSON.stringify({ action: 'invalid' }),
          headers: { 'Content-Type': 'application/json' }
        });

        const response = await materializedViewPost(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Invalid action specified');
      });

      it('handles refresh errors', async () => {
        mockRbacService.refreshMaterializedViews.mockRejectedValue(new Error('Refresh failed'));

        const request = new NextRequest('http://localhost:3000/api/rbac/materialized-views', {
          method: 'POST',
          body: JSON.stringify({ action: 'refresh' }),
          headers: { 'Content-Type': 'application/json' }
        });

        const response = await materializedViewPost(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.success).toBe(false);
        expect(data.error).toContain('Failed to manage materialized views');
      });
    });
  });

  describe('/api/rbac/metadata/publishing', () => {
    describe('GET', () => {
      it('returns publishing status successfully', async () => {
        const mockStatus = {
          systemStatus: 'healthy',
          lastPublish: '2024-01-01T10:00:00Z',
          pendingChanges: 2,
          publishingQueue: [],
          publishingHistory: [],
          compilerStatus: {
            available: true,
            version: '1.0.0',
            lastHealthCheck: '2024-01-01T12:00:00Z'
          }
        };

        mockRbacService.getMetadataPublishingStatus.mockResolvedValue(mockStatus);

        const request = new NextRequest('http://localhost:3000/api/rbac/metadata/publishing');
        const response = await publishingGet(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.systemStatus).toBe('healthy');
        expect(mockRbacService.getMetadataPublishingStatus).toHaveBeenCalledWith(undefined);
      });

      it('handles publishing status errors', async () => {
        mockRbacService.getMetadataPublishingStatus.mockRejectedValue(new Error('Publishing service unavailable'));

        const request = new NextRequest('http://localhost:3000/api/rbac/metadata/publishing');
        const response = await publishingGet(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.success).toBe(false);
        expect(data.error).toContain('Failed to fetch metadata publishing status');
      });
    });

    describe('POST', () => {
      it('compiles metadata successfully', async () => {
        const mockResult = {
          success: true,
          compilationId: 'comp_123456789',
          compiledSurfaces: ['admin-security/rbac-dashboard'],
          warnings: [],
          timestamp: '2024-01-01T12:00:00Z'
        };

        mockRbacService.compileMetadata.mockResolvedValue(mockResult);

        const request = new NextRequest('http://localhost:3000/api/rbac/metadata/publishing', {
          method: 'POST',
          body: JSON.stringify({
            action: 'compile',
            metadata: { keys: ['admin-security/rbac-dashboard'] }
          }),
          headers: { 'Content-Type': 'application/json' }
        });

        const response = await publishingPost(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.compilationId).toContain('comp_');
        expect(mockRbacService.compileMetadata).toHaveBeenCalledWith(
          undefined,
          { keys: ['admin-security/rbac-dashboard'] }
        );
      });

      it('validates metadata successfully', async () => {
        const mockResult = {
          isValid: true,
          errors: [],
          warnings: ['Deprecated permission bundle detected'],
          validatedSurfaces: ['admin-security/rbac-dashboard'],
          timestamp: '2024-01-01T12:00:00Z'
        };

        mockRbacService.validateMetadata.mockResolvedValue(mockResult);

        const request = new NextRequest('http://localhost:3000/api/rbac/metadata/publishing', {
          method: 'POST',
          body: JSON.stringify({
            action: 'validate',
            metadata: { keys: ['admin-security/rbac-dashboard'] }
          }),
          headers: { 'Content-Type': 'application/json' }
        });

        const response = await publishingPost(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.isValid).toBe(true);
        expect(mockRbacService.validateMetadata).toHaveBeenCalledWith(
          undefined,
          { keys: ['admin-security/rbac-dashboard'] }
        );
      });

      it('publishes metadata successfully', async () => {
        const mockResult = {
          success: true,
          deploymentId: 'deploy_123456789',
          publishedSurfaces: ['admin-security/rbac-dashboard'],
          rollbackId: 'rollback_123456788',
          timestamp: '2024-01-01T12:00:00Z'
        };

        mockRbacService.publishMetadata.mockResolvedValue(mockResult);

        const request = new NextRequest('http://localhost:3000/api/rbac/metadata/publishing', {
          method: 'POST',
          body: JSON.stringify({
            action: 'publish',
            metadata: { keys: ['admin-security/rbac-dashboard'] }
          }),
          headers: { 'Content-Type': 'application/json' }
        });

        const response = await publishingPost(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.deploymentId).toContain('deploy_');
        expect(mockRbacService.publishMetadata).toHaveBeenCalledWith(
          undefined,
          { keys: ['admin-security/rbac-dashboard'] }
        );
      });

      it('handles invalid action parameter', async () => {
        const request = new NextRequest('http://localhost:3000/api/rbac/metadata/publishing', {
          method: 'POST',
          body: JSON.stringify({ action: 'invalid' }),
          headers: { 'Content-Type': 'application/json' }
        });

        const response = await publishingPost(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Invalid action specified');
      });

      it('handles metadata operation errors', async () => {
        mockRbacService.publishMetadata.mockRejectedValue(new Error('Publishing failed'));

        const request = new NextRequest('http://localhost:3000/api/rbac/metadata/publishing', {
          method: 'POST',
          body: JSON.stringify({
            action: 'publish',
            metadata: { keys: ['admin-security/rbac-dashboard'] }
          }),
          headers: { 'Content-Type': 'application/json' }
        });

        const response = await publishingPost(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.success).toBe(false);
        expect(data.error).toContain('Failed to manage metadata publishing');
      });
    });
  });

  describe('Query Parameter Handling', () => {
    it('processes tenant ID from query parameters', async () => {
      mockRbacService.getRbacHealthMetrics.mockResolvedValue({ systemHealth: 'healthy', metrics: {} });

      const request = new NextRequest('http://localhost:3000/api/rbac/health?tenantId=specific-tenant-123');
      await healthGet(request);

      expect(mockRbacService.getRbacHealthMetrics).toHaveBeenCalledWith('specific-tenant-123');
    });

    it('handles missing tenant ID gracefully', async () => {
      mockRbacService.getMaterializedViewStatus.mockResolvedValue({
        currentStatus: 'healthy',
        lagMinutes: 5,
        refreshHistory: [],
        performanceMetrics: { averageRefreshTime: 1000, successRate: 100 }
      });

      const request = new NextRequest('http://localhost:3000/api/rbac/materialized-views');
      await materializedViewGet(request);

      expect(mockRbacService.getMaterializedViewStatus).toHaveBeenCalledWith(undefined);
    });
  });

  describe('Error Handling', () => {
    it('handles service instantiation errors', async () => {
      (container.get as jest.Mock).mockImplementation(() => {
        throw new Error('Service not found');
      });

      const request = new NextRequest('http://localhost:3000/api/rbac/health');
      const response = await healthGet(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('handles malformed JSON in POST requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/rbac/metadata/publishing', {
        method: 'POST',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await publishingPost(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });
});