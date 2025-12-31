'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Calendar, User, FileText, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import type { LicenseHistoryEntry } from '@/models/licenseAssignment.model';

interface LicenseHistoryPanelProps {
  tenantId: string;
  tenantName: string;
}

export function LicenseHistoryPanel({ tenantId, tenantName }: LicenseHistoryPanelProps) {
  const [history, setHistory] = useState<LicenseHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [tenantId]);

  async function loadHistory() {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/licensing/tenants/${tenantId}/history`);
      const result = await response.json();

      if (result.success) {
        setHistory(result.data || []);
      } else {
        toast.error(result.error || 'Failed to load license history');
      }
    } catch (error) {
      console.error('Error loading license history:', error);
      toast.error('Failed to load license history');
    } finally {
      setIsLoading(false);
    }
  }

  function getTierColor(tier: string) {
    switch (tier?.toLowerCase()) {
      case 'starter':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'professional':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'enterprise':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          <p>No license assignment history for {tenantName}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y divide-gray-200">
          {history.map((entry, index) => (
            <div key={entry.assignment_id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  {/* Timeline indicator */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100">
                      <div className="w-3 h-3 rounded-full bg-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {entry.previous_offering_name ? (
                          <>
                            <span className="text-sm text-gray-600">
                              {entry.previous_offering_name}
                            </span>
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">{entry.offering_name}</span>
                            <Badge variant="outline" className={getTierColor(entry.offering_tier)}>
                              {entry.offering_tier}
                            </Badge>
                          </>
                        ) : (
                          <>
                            <span className="font-medium">Initial Assignment: {entry.offering_name}</span>
                            <Badge variant="outline" className={getTierColor(entry.offering_tier)}>
                              {entry.offering_tier}
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="ml-11 space-y-1">
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(entry.assigned_at)}</span>
                      </div>
                      {entry.assigned_by_email && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{entry.assigned_by_email}</span>
                        </div>
                      )}
                    </div>

                    {entry.notes && (
                      <div className="flex items-start gap-1 text-sm text-gray-600">
                        <FileText className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span className="italic">{entry.notes}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Position indicator */}
                <div className="text-xs text-gray-400">
                  {index === 0 && <Badge variant="outline">Current</Badge>}
                </div>
              </div>

              {/* Vertical line connector (except for last item) */}
              {index < history.length - 1 && (
                <div className="ml-[15px] mt-2 mb-0 h-4 w-0.5 bg-gray-200" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
