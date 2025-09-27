'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Users,
  Shield,
  Plus,
  Eye,
  UserMinus,
  Building,
  CheckCircle,
  AlertTriangle,
  Search,
  RefreshCw,
  Key,
  Calendar,
  Clock,
  Target,
  Lightbulb,
  Star,
  Globe
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { QuickTip, ProcessGuide } from './RbacHelper';

interface DelegationRecord {
  id: string;
  delegator_name: string;
  delegatee_name: string;
  scope_type: 'campus' | 'ministry' | 'department';
  scope_name: string;
  permissions: string[];
  status: 'active' | 'expired' | 'revoked';
  created_at: string;
  expires_at?: string;
  last_used?: string;
}

interface QuickDelegation {
  scope_type: 'campus' | 'ministry' | 'department';
  scope_name: string;
  template_name: string;
  description: string;
  permissions_count: number;
}

export function DelegateAccessDashboard() {
  const [delegations, setDelegations] = useState<DelegationRecord[]>([]);
  const [quickTemplates, setQuickTemplates] = useState<QuickDelegation[]>([]);
  const [selectedDelegation, setSelectedDelegation] = useState<DelegationRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stats, setStats] = useState({
    total_active: 0,
    ministry_delegations: 0,
    campus_delegations: 0,
    expiring_soon: 0
  });

  // Form states
  const [formData, setFormData] = useState({
    delegatee_name: '',
    scope_type: 'ministry' as const,
    scope_name: '',
    permissions: [] as string[],
    expires_at: '',
    notes: ''
  });

  useEffect(() => {
    loadDelegations();
    loadQuickTemplates();
  }, []);

  const loadDelegations = async () => {
    try {
      setIsLoading(true);

      // Load delegation stats and permissions in parallel
      const [statsRes, permissionsRes] = await Promise.all([
        fetch('/api/rbac/delegation/stats'),
        fetch('/api/rbac/delegation/permissions')
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.success && statsData.data) {
          setStats(statsData.data);
        }
      }

      if (permissionsRes.ok) {
        const permissionsData = await permissionsRes.json();
        if (permissionsData.success && Array.isArray(permissionsData.data)) {
          setDelegations(permissionsData.data);
        }
      }
    } catch (error) {
      console.error('Error loading delegations:', error);
      toast.error('Failed to load delegations');
    } finally {
      setIsLoading(false);
    }
  };

  const loadQuickTemplates = async () => {
    try {
      const response = await fetch('/api/rbac/delegation/templates');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setQuickTemplates(data.data);
        }
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Failed to load templates');
    }
  };

  const createDelegation = async () => {
    try {
      const response = await fetch('/api/rbac/delegation/permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          delegatee_id: formData.delegatee_name, // This should be the actual user ID
          scope_type: formData.scope_type,
          scope_id: formData.scope_name, // This should be the actual scope ID
          permissions: formData.permissions,
          expiry_date: formData.expires_at || null
        })
      });

      const data = await response.json();

      if (data.success) {
        await loadDelegations(); // Reload data
        setShowCreateDialog(false);
        toast.success('Delegation created successfully');

        // Reset form
        setFormData({
          delegatee_name: '',
          scope_type: 'ministry',
          scope_name: '',
          permissions: [],
          expires_at: '',
          notes: ''
        });
      } else {
        toast.error(data.error || 'Failed to create delegation');
      }
    } catch (error) {
      console.error('Error creating delegation:', error);
      toast.error('Failed to create delegation');
    }
  };

  const revokeDelegation = async (delegationId: string) => {
    try {
      const response = await fetch(`/api/rbac/delegation/permissions/${delegationId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        await loadDelegations(); // Reload data
        toast.success('Delegation revoked successfully');
      } else {
        toast.error(data.error || 'Failed to revoke delegation');
      }
    } catch (error) {
      console.error('Error revoking delegation:', error);
      toast.error('Failed to revoke delegation');
    }
  };

  const applyTemplate = async (template: QuickDelegation) => {
    try {
      // Pre-fill the create delegation form with template data
      setFormData(prev => ({
        ...prev,
        scope_type: template.scope_type,
        scope_name: template.scope_name,
        permissions: [] // Could be fetched from template API
      }));
      setShowCreateDialog(true);
      toast.success(`Template "${template.template_name}" applied to form`);
    } catch (error) {
      console.error('Error applying template:', error);
      toast.error('Failed to apply template');
    }
  };

  const filteredDelegations = delegations.filter(delegation => {
    const matchesSearch = delegation.delegatee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         delegation.scope_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || delegation.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'expired': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'revoked': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getScopeIcon = (scopeType: string) => {
    switch (scopeType) {
      case 'campus': return <Building className="h-4 w-4" />;
      case 'ministry': return <Users className="h-4 w-4" />;
      case 'department': return <Globe className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  const delegationSteps = [
    {
      title: 'Choose Ministry Leader',
      description: 'Select the person who will receive delegated access to manage their area',
      icon: <Users className="h-4 w-4" />
    },
    {
      title: 'Select Scope',
      description: 'Choose what area they will manage: specific ministry, campus, or department',
      icon: <Target className="h-4 w-4" />
    },
    {
      title: 'Set Permissions',
      description: 'Define what they can do within their scope - add events, manage volunteers, etc.',
      icon: <Key className="h-4 w-4" />
    },
    {
      title: 'Set Duration',
      description: 'Optionally set when this delegation expires for temporary access',
      icon: <Calendar className="h-4 w-4" />
    }
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Delegate Access</h1>
          <p className="text-gray-600 mt-1">
            Give ministry leaders control over their areas while maintaining church-wide oversight
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Delegate Access
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Delegation</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <QuickTip
                type="tip"
                title="Delegation Best Practice"
                description="Start with minimal permissions and add more as needed. You can always modify delegations later."
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="delegatee">Person Receiving Access</Label>
                  <Input
                    id="delegatee"
                    value={formData.delegatee_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, delegatee_name: e.target.value }))}
                    placeholder="e.g., Sarah Mitchell"
                  />
                </div>
                <div>
                  <Label>Scope Type</Label>
                  <Select
                    value={formData.scope_type}
                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, scope_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ministry">Ministry</SelectItem>
                      <SelectItem value="campus">Campus</SelectItem>
                      <SelectItem value="department">Department</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="scope_name">Area Name</Label>
                <Input
                  id="scope_name"
                  value={formData.scope_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, scope_name: e.target.value }))}
                  placeholder="e.g., Youth Ministry, Downtown Campus"
                />
              </div>

              <div>
                <Label>Permissions</Label>
                <div className="space-y-2 mt-2">
                  {['Manage Events', 'View Member Directory', 'Send Communications', 'Manage Volunteers', 'View Reports'].map(permission => (
                    <div key={permission} className="flex items-center space-x-2">
                      <Checkbox
                        checked={formData.permissions.includes(permission)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData(prev => ({ ...prev, permissions: [...prev.permissions, permission] }));
                          } else {
                            setFormData(prev => ({ ...prev, permissions: prev.permissions.filter(p => p !== permission) }));
                          }
                        }}
                      />
                      <Label className="text-sm">{permission}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="expires">Expiration Date (Optional)</Label>
                <Input
                  id="expires"
                  type="date"
                  value={formData.expires_at}
                  onChange={(e) => setFormData(prev => ({ ...prev, expires_at: e.target.value }))}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={createDelegation}>
                  Create Delegation
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick Info */}
      <QuickTip
        type="info"
        title="What is Delegate Access?"
        description="Allow ministry leaders to manage their own areas without giving them access to the entire church system. Perfect for youth pastors, worship leaders, and campus coordinators."
      />

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Delegations</p>
                <p className="text-3xl font-bold text-green-600">
                  {stats.total_active}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ministry Delegations</p>
                <p className="text-3xl font-bold text-blue-600">
                  {stats.ministry_delegations}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Campus Delegations</p>
                <p className="text-3xl font-bold text-purple-600">
                  {stats.campus_delegations}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Building className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
                <p className="text-3xl font-bold text-orange-600">{stats.expiring_soon}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="delegations" className="w-full">
        <TabsList>
          <TabsTrigger value="delegations">Current Delegations</TabsTrigger>
          <TabsTrigger value="templates">Quick Templates</TabsTrigger>
          <TabsTrigger value="guide">Setup Guide</TabsTrigger>
        </TabsList>

        <TabsContent value="delegations" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-6">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="search">Search Delegations</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="Search by person or area..."
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="revoked">Revoked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button variant="outline" onClick={loadDelegations}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delegations Table */}
          <Card>
            <CardHeader>
              <CardTitle>Delegation Records</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Person</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDelegations.map((delegation) => (
                    <TableRow key={delegation.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{delegation.delegatee_name}</p>
                          <p className="text-xs text-gray-500">
                            Delegated by {delegation.delegator_name}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getScopeIcon(delegation.scope_type)}
                          <div>
                            <p className="font-medium">{delegation.scope_name}</p>
                            <p className="text-xs text-gray-500 capitalize">{delegation.scope_type}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {delegation.permissions.length} permission{delegation.permissions.length !== 1 ? 's' : ''}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(delegation.status)}>
                          {delegation.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-500">
                          {delegation.last_used
                            ? new Date(delegation.last_used).toLocaleDateString()
                            : 'Never'
                          }
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedDelegation(delegation)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {delegation.status === 'active' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => revokeDelegation(delegation.id)}
                            >
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {filteredDelegations.length === 0 && (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500 mb-2">No delegations found</p>
                  <p className="text-sm text-gray-400">
                    {searchTerm || statusFilter !== 'all'
                      ? 'Try adjusting your filters'
                      : 'Create your first delegation to get started'
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <QuickTip
            type="tip"
            title="Quick Templates"
            description="Pre-configured permission sets for common ministry roles. Use these to quickly delegate access without having to configure permissions from scratch."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickTemplates.map((template, index) => (
              <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-100 rounded-full">
                      {getScopeIcon(template.scope_type)}
                    </div>
                    <div>
                      <h3 className="font-semibold">{template.template_name}</h3>
                      <p className="text-sm text-gray-600">{template.scope_name}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">{template.description}</p>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">
                      {template.permissions_count} permissions
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => applyTemplate(template)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Use Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="guide" className="space-y-6">
          <Alert className="border-green-200 bg-green-50">
            <Lightbulb className="h-4 w-4" />
            <AlertDescription>
              <strong>Delegation makes RBAC easier!</strong> Instead of giving everyone admin access,
              delegate specific areas to ministry leaders so they can manage their own teams.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                How to Set Up Delegations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ProcessGuide steps={delegationSteps} />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">✅ Best Practices</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-1" />
                  <div>
                    <p className="font-medium">Start Small</p>
                    <p className="text-sm text-gray-600">Begin with minimal permissions and add more as needed</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-1" />
                  <div>
                    <p className="font-medium">Regular Reviews</p>
                    <p className="text-sm text-gray-600">Check delegations monthly to ensure they&apos;re still needed</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-1" />
                  <div>
                    <p className="font-medium">Clear Scope</p>
                    <p className="text-sm text-gray-600">Be specific about what areas they can manage</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">⚠️ Common Mistakes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-4 w-4 text-red-600 mt-1" />
                  <div>
                    <p className="font-medium">Too Many Permissions</p>
                    <p className="text-sm text-gray-600">Don&apos;t give more access than actually needed</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-4 w-4 text-red-600 mt-1" />
                  <div>
                    <p className="font-medium">No Expiration</p>
                    <p className="text-sm text-gray-600">Set expiration dates for temporary access</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-4 w-4 text-red-600 mt-1" />
                  <div>
                    <p className="font-medium">No Monitoring</p>
                    <p className="text-sm text-gray-600">Check who&apos;s actually using their delegated access</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      {selectedDelegation && (
        <Dialog open={!!selectedDelegation} onOpenChange={() => setSelectedDelegation(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Delegation Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Delegated To</Label>
                  <p className="font-semibold">{selectedDelegation.delegatee_name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Scope</Label>
                  <div className="flex items-center gap-2">
                    {getScopeIcon(selectedDelegation.scope_type)}
                    <span className="font-semibold">{selectedDelegation.scope_name}</span>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-600">Permissions</Label>
                <div className="mt-2 space-y-2">
                  {selectedDelegation.permissions.map(permission => (
                    <Badge key={permission} variant="outline" className="mr-2">
                      {permission}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Created</Label>
                  <p>{new Date(selectedDelegation.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Last Used</Label>
                  <p>
                    {selectedDelegation.last_used
                      ? new Date(selectedDelegation.last_used).toLocaleDateString()
                      : 'Never'
                    }
                  </p>
                </div>
              </div>

              {selectedDelegation.expires_at && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Expires</Label>
                  <p>{new Date(selectedDelegation.expires_at).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}