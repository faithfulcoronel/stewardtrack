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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/use-toast';
import {
  Users,
  UserPlus,
  Mail,
  Link2,
  Unlink,
  Search,
  Filter,
  Plus,
  Send,
  Eye,
  EyeOff,
  CheckCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  UserCheck,
  UserX,
  ExternalLink
} from 'lucide-react';
import { LinkUserForm } from '../user-member-link/LinkUserForm';
import { AuditTrail } from '../user-member-link/AuditTrail';

interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  created_at: string;
  last_sign_in_at?: string;
  is_linked: boolean;
  member_id?: string;
  member_name?: string;
}

interface Member {
  id: string;
  email?: string;
  first_name: string;
  last_name: string;
  phone?: string;
  is_linked: boolean;
  user_id?: string;
  user_email?: string;
}

interface Invitation {
  id: string;
  member_id: string;
  member_name: string;
  member_email: string;
  status: 'pending' | 'sent' | 'delivered' | 'opened' | 'accepted' | 'expired';
  invited_by: string;
  invited_at: string;
  expires_at: string;
  accepted_at?: string;
  token: string;
}

interface LinkingStats {
  total_users: number;
  linked_users: number;
  total_members: number;
  linked_members: number;
  pending_invitations: number;
  accepted_invitations: number;
  linking_progress: number;
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [stats, setStats] = useState<LinkingStats>({
    total_users: 0,
    linked_users: 0,
    total_members: 0,
    linked_members: 0,
    pending_invitations: 0,
    accepted_invitations: 0,
    linking_progress: 0
  });

  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [preselectedUserForLinking, setPreselectedUserForLinking] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [usersRes, membersRes, invitationsRes, statsRes] = await Promise.all([
        fetch('/api/user-member-link/users/unlinked'),
        fetch('/api/user-member-link/members/unlinked'),
        fetch('/api/user-member-link/invitations'),
        fetch('/api/user-member-link/stats')
      ]);

      const [usersData, membersData, invitationsData, statsData] = await Promise.all([
        usersRes.json(),
        membersRes.json(),
        invitationsRes.json(),
        statsRes.json()
      ]);

      if (usersData.success) setUsers(usersData.data);
      if (membersData.success) setMembers(membersData.data);
      if (invitationsData.success) setInvitations(invitationsData.data);
      if (statsData.success) setStats(statsData.data);
    } catch (error) {
      console.error('Error loading user management data:', error);
      toast.error('Failed to load user management data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkUser = async (userId: string, memberId: string) => {
    try {
      const response = await fetch('/api/user-member-link/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, member_id: memberId })
      });

      const result = await response.json();
      if (result.success) {
        toast.success('User linked to member successfully');
        setShowLinkDialog(false);
        loadData();
      } else {
        toast.error(result.error || 'Failed to link user to member');
      }
    } catch (error) {
      console.error('Error linking user:', error);
      toast.error('Failed to link user to member');
    }
  };

  const handleUnlinkUser = async (userId: string) => {
    if (!confirm('Are you sure you want to unlink this user from their member profile?')) return;

    try {
      const response = await fetch('/api/user-member-link/unlink', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
      });

      const result = await response.json();
      if (result.success) {
        toast.success('User unlinked successfully');
        loadData();
      } else {
        toast.error(result.error || 'Failed to unlink user');
      }
    } catch (error) {
      console.error('Error unlinking user:', error);
      toast.error('Failed to unlink user');
    }
  };

  const handleSendInvitations = async () => {
    if (selectedMembers.length === 0) {
      toast.error('Please select at least one member to invite');
      return;
    }

    try {
      const response = await fetch('/api/user-member-link/invitations/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_ids: selectedMembers,
          expires_in_days: 7
        })
      });

      const result = await response.json();
      if (result.success) {
        toast.success(`Invitations sent to ${selectedMembers.length} members`);
        setShowInviteDialog(false);
        setSelectedMembers([]);
        loadData();
      } else {
        toast.error(result.error || 'Failed to send invitations');
      }
    } catch (error) {
      console.error('Error sending invitations:', error);
      toast.error('Failed to send invitations');
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    try {
      const response = await fetch(`/api/user-member-link/invitations/${invitationId}/resend`, {
        method: 'POST'
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Invitation resent successfully');
        loadData();
      } else {
        toast.error(result.error || 'Failed to resend invitation');
      }
    } catch (error) {
      console.error('Error resending invitation:', error);
      toast.error('Failed to resend invitation');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'sent': return <Send className="h-4 w-4" />;
      case 'delivered': return <CheckCircle className="h-4 w-4" />;
      case 'opened': return <Eye className="h-4 w-4" />;
      case 'accepted': return <UserCheck className="h-4 w-4" />;
      case 'expired': return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400';
      case 'sent': return 'bg-primary/10 text-primary border-primary/20';
      case 'delivered': return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400';
      case 'opened': return 'bg-violet-500/10 text-violet-700 border-violet-500/20 dark:text-violet-400';
      case 'accepted': return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400';
      case 'expired': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const filteredUsers = users.filter(user => {
    if (searchTerm &&
        !user.email?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !user.last_name?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (filterType === 'linked' && !user.is_linked) return false;
    if (filterType === 'unlinked' && user.is_linked) return false;
    return true;
  });

  const filteredMembers = members.filter(member => {
    if (searchTerm &&
        !member.email?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !member.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !member.last_name?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return !member.is_linked; // Only show unlinked members for invitations
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" className="text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">User Management</h2>
          <p className="text-muted-foreground">
            Link user accounts to member profiles and manage access invitations
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Linking Progress</p>
                <p className="text-3xl font-bold text-primary">{stats.linking_progress}%</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-full">
                <UserCheck className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-sm text-muted-foreground">
                {stats.linked_users} of {stats.total_users} users linked
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Linked Members</p>
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stats.linked_members}</p>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-full">
                <Users className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-sm text-muted-foreground">of {stats.total_members} total members</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Invitations</p>
                <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{stats.pending_invitations}</p>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-full">
                <Mail className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-sm text-muted-foreground">awaiting response</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Accepted Invitations</p>
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stats.accepted_invitations}</p>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-full">
                <CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-sm text-muted-foreground">successful invitations</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="users" className="w-full">
        <div className="flex items-center justify-between mb-6">
          <TabsList>
            <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
            <TabsTrigger value="members">Members ({members.length})</TabsTrigger>
            <TabsTrigger value="invitations">Invitations ({invitations.length})</TabsTrigger>
            <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>User Accounts</CardTitle>
                <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Link2 className="h-4 w-4 mr-2" />
                      Link User
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Link User to Member Profile</DialogTitle>
                    </DialogHeader>

                    <LinkUserForm
                      onSuccess={() => {
                        setShowLinkDialog(false);
                        setPreselectedUserForLinking(null);
                        loadData();
                        toast.success('User linked successfully');
                      }}
                      preselectedUser={preselectedUserForLinking}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search and Filter */}
              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="linked">Linked Users</SelectItem>
                    <SelectItem value="unlinked">Unlinked Users</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Member Profile</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {user.first_name} {user.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Joined {new Date(user.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {user.is_linked ? (
                          <div className="flex items-center gap-2">
                            <Link2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-sm">{user.member_name}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Not linked</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={user.is_linked
                          ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400'
                          : 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400'
                        }>
                          {user.is_linked ? 'Linked' : 'Unlinked'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {user.is_linked ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUnlinkUser(user.id)}
                            >
                              <Unlink className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setPreselectedUserForLinking({
                                  id: user.id,
                                  email: user.email,
                                  first_name: user.first_name,
                                  last_name: user.last_name,
                                  is_linked: user.is_linked
                                });
                                setShowLinkDialog(true);
                              }}
                            >
                              <Link2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {filteredUsers.length === 0 && (
                <div className="text-center py-8">
                  <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No users found matching your criteria</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Member Profiles</CardTitle>
                <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Invitations
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl" widthMode='content'>
                    <DialogHeader>
                      <DialogTitle>Send Access Invitations</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                      <Alert>
                        <Mail className="h-4 w-4" />
                        <AlertDescription>
                          Select members to receive email invitations to create user accounts and access the system.
                        </AlertDescription>
                      </Alert>

                      <div className="max-h-96 overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">
                                <Checkbox
                                  checked={selectedMembers.length === filteredMembers.length && filteredMembers.length > 0}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedMembers(filteredMembers.map(m => m.id));
                                    } else {
                                      setSelectedMembers([]);
                                    }
                                  }}
                                />
                              </TableHead>
                              <TableHead>Member</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Phone</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredMembers.map((member) => (
                              <TableRow key={member.id}>
                                <TableCell>
                                  <Checkbox
                                    checked={selectedMembers.includes(member.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSelectedMembers([...selectedMembers, member.id]);
                                      } else {
                                        setSelectedMembers(selectedMembers.filter(id => id !== member.id));
                                      }
                                    }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <div className="font-medium">
                                    {member.first_name} {member.last_name}
                                  </div>
                                </TableCell>
                                <TableCell>{member.email || 'No email'}</TableCell>
                                <TableCell>{member.phone || 'No phone'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {selectedMembers.length > 0 && (
                        <Alert className="border-primary/20 bg-primary/5">
                          <CheckCircle className="h-4 w-4" />
                          <AlertDescription>
                            {selectedMembers.length} member(s) selected for invitation.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>

                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSendInvitations} disabled={selectedMembers.length === 0}>
                        <Send className="h-4 w-4 mr-2" />
                        Send {selectedMembers.length} Invitation{selectedMembers.length !== 1 ? 's' : ''}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {members.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No unlinked members available</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {members.slice(0, 12).map((member) => (
                      <Card key={member.id} className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium">
                            {member.first_name} {member.last_name}
                          </div>
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400">
                            No Account
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div>{member.email || 'No email'}</div>
                          <div>{member.phone || 'No phone'}</div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                {members.length > 12 && (
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      And {members.length - 12} more unlinked members...
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invitations">
          <Card>
            <CardHeader>
              <CardTitle>Invitation Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Invited</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((invitation) => (
                    <TableRow key={invitation.id}>
                      <TableCell>
                        <div className="font-medium">{invitation.member_name}</div>
                      </TableCell>
                      <TableCell>{invitation.member_email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(invitation.status)}>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(invitation.status)}
                            {invitation.status}
                          </div>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(invitation.invited_at).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          by {invitation.invited_by}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(invitation.expires_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {(invitation.status === 'pending' || invitation.status === 'sent') && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResendInvitation(invitation.id)}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(`/invite/${invitation.token}`, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {invitations.length === 0 && (
                <div className="text-center py-8">
                  <Mail className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No invitations sent yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <AuditTrail />
        </TabsContent>
      </Tabs>
    </div>
  );
}