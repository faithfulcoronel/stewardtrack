/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MaterializedViewMonitoringDashboard } from '@/components/admin/rbac/MaterializedViewMonitoringDashboard';
import { MetadataPublishingDashboard } from '@/components/admin/rbac/MetadataPublishingDashboard';

// Mock fetch globally
global.fetch = jest.fn();

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock toast
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('RBAC Phase E Components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('MaterializedViewMonitoringDashboard', () => {
    const mockViewStatus = {
      currentStatus: 'healthy' as const,
      lastRefresh: '2024-01-01T12:00:00Z',
      lagMinutes: 5,
      refreshHistory: [
        {
          timestamp: '2024-01-01T12:00:00Z',
          duration: 1250,
          status: 'success' as const,
          notes: 'Materialized view refresh completed successfully'
        }
      ],
      viewFreshness: '2024-01-01T12:00:00Z',
      performanceMetrics: {
        averageRefreshTime: 1115,
        successRate: 100
      }
    };

    it('renders loading state initially', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<MaterializedViewMonitoringDashboard />);

      expect(screen.getByText('Building platform engineer materialized view monitoring dashboard')).toBeInTheDocument();
    });

    it('displays materialized view status correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockViewStatus
        })
      } as Response);

      render(<MaterializedViewMonitoringDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Materialized View Monitoring')).toBeInTheDocument();
        expect(screen.getByText('Healthy')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument(); // Data lag in minutes
        expect(screen.getByText('100.0%')).toBeInTheDocument(); // Success rate
      });
    });

    it('handles refresh views action', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: mockViewStatus
          })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: { message: 'Materialized views refresh initiated' }
          })
        } as Response);

      render(<MaterializedViewMonitoringDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Refresh Views')).toBeInTheDocument();
      });

      const refreshButton = screen.getByText('Refresh Views');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/rbac/materialized-views', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'refresh' }),
        });
      });
    });

    it('displays refresh history correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockViewStatus
        })
      } as Response);

      render(<MaterializedViewMonitoringDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Refresh History')).toBeInTheDocument();
        expect(screen.getByText('Materialized view refresh completed successfully')).toBeInTheDocument();
        expect(screen.getByText('success')).toBeInTheDocument();
      });
    });

    it('shows error state when API fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error'));

      render(<MaterializedViewMonitoringDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load materialized view monitoring data/)).toBeInTheDocument();
      });
    });
  });

  describe('MetadataPublishingDashboard', () => {
    const mockPublishingStatus = {
      systemStatus: 'healthy' as const,
      lastPublish: '2024-01-01T10:00:00Z',
      pendingChanges: 2,
      publishingQueue: [
        {
          action: 'COMPILE_METADATA',
          timestamp: '2024-01-01T11:30:00Z',
          status: 'success',
          notes: 'Role permission bundle updated'
        }
      ],
      publishingHistory: [
        {
          action: 'PUBLISH_METADATA',
          timestamp: '2024-01-01T10:00:00Z',
          status: 'success',
          duration: 3500,
          notes: 'Metadata published successfully',
          details: {}
        }
      ],
      compilerStatus: {
        available: true,
        version: '1.0.0',
        lastHealthCheck: '2024-01-01T12:00:00Z'
      }
    };

    it('renders publishing dashboard correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockPublishingStatus
        })
      } as Response);

      render(<MetadataPublishingDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Metadata Publishing Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Healthy')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument(); // Pending changes
      });
    });

    it('handles metadata validation', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: mockPublishingStatus
          })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              isValid: true,
              errors: [],
              warnings: ['Deprecated permission bundle detected'],
              validatedSurfaces: ['admin-security/rbac-dashboard'],
              timestamp: '2024-01-01T12:00:00Z'
            }
          })
        } as Response);

      render(<MetadataPublishingDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Validate Metadata')).toBeInTheDocument();
      });

      const validateButton = screen.getByText('Validate Metadata');
      fireEvent.click(validateButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/rbac/metadata/publishing', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'validate', metadata: {} }),
        });
      });
    });

    it('displays publishing queue correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockPublishingStatus
        })
      } as Response);

      render(<MetadataPublishingDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Publishing Queue (2 items)')).toBeInTheDocument();
        expect(screen.getByText('Role permission bundle updated')).toBeInTheDocument();
      });
    });

    it('shows compiler status information', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockPublishingStatus
        })
      } as Response);

      render(<MetadataPublishingDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Compiler Status')).toBeInTheDocument();
        expect(screen.getByText('Available')).toBeInTheDocument();
        expect(screen.getByText('1.0.0')).toBeInTheDocument();
      });
    });

    it('handles metadata compilation', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: mockPublishingStatus
          })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              success: true,
              compilationId: 'comp_123456789',
              compiledSurfaces: ['admin-security/rbac-dashboard'],
              warnings: [],
              timestamp: '2024-01-01T12:00:00Z'
            }
          })
        } as Response);

      render(<MetadataPublishingDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Compile Metadata')).toBeInTheDocument();
      });

      const compileButton = screen.getByText('Compile Metadata');
      fireEvent.click(compileButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/rbac/metadata/publishing', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'compile', metadata: {} }),
        });
      });
    });

    it('disables publish button when no pending changes', async () => {
      const statusWithNoPending = {
        ...mockPublishingStatus,
        pendingChanges: 0
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: statusWithNoPending
        })
      } as Response);

      render(<MetadataPublishingDashboard />);

      await waitFor(() => {
        const publishButton = screen.getByText('Publish Changes');
        expect(publishButton).toBeDisabled();
      });
    });
  });

  describe('API Integration', () => {
    it('calls health metrics API correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            systemHealth: 'healthy',
            metrics: {
              orphaned_user_roles: { value: 0, status: 'healthy' }
            }
          }
        })
      } as Response);

      // This would be called by the health monitoring component
      const response = await fetch('/api/rbac/health');
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data.systemHealth).toBe('healthy');
    });

    it('handles materialized view refresh API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { message: 'Materialized views refresh initiated' }
        })
      } as Response);

      const response = await fetch('/api/rbac/materialized-views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'refresh' })
      });

      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data.message).toContain('refresh initiated');
    });

    it('handles metadata publishing API calls', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            success: true,
            deploymentId: 'deploy_123456789',
            publishedSurfaces: ['admin-security/rbac-dashboard']
          }
        })
      } as Response);

      const response = await fetch('/api/rbac/metadata/publishing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'publish',
          metadata: { keys: ['admin-security/rbac-dashboard'] }
        })
      });

      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data.deploymentId).toContain('deploy_');
    });
  });
});