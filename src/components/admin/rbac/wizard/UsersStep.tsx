'use client';

import React, { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Search, AlertCircle, Users as UsersIcon, Info } from 'lucide-react';
import type { RoleFormData } from '../RoleCreationWizard';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface UsersStepProps {
  formData: RoleFormData;
  updateFormData: (data: Partial<RoleFormData>) => void;
}

export function UsersStep({ formData, updateFormData }: UsersStepProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/rbac/users');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      const { data } = await response.json();
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter users based on search
  const filteredUsers = users.filter((user) => {
    if (searchQuery === '') return true;
    const query = searchQuery.toLowerCase();
    return (
      user.email.toLowerCase().includes(query) ||
      user.full_name?.toLowerCase().includes(query)
    );
  });

  const toggleUser = (userId: string) => {
    const newSelectedUsers = formData.selectedUsers.includes(userId)
      ? formData.selectedUsers.filter((id) => id !== userId)
      : [...formData.selectedUsers, userId];
    updateFormData({ selectedUsers: newSelectedUsers });
  };

  const selectAll = () => {
    const allUserIds = filteredUsers.map((u) => u.id);
    const allSelected = allUserIds.every((id) => formData.selectedUsers.includes(id));

    if (allSelected) {
      // Deselect all
      updateFormData({
        selectedUsers: formData.selectedUsers.filter(
          (id) => !allUserIds.includes(id)
        ),
      });
    } else {
      // Select all
      const newSelectedUsers = [
        ...formData.selectedUsers,
        ...allUserIds.filter((id) => !formData.selectedUsers.includes(id)),
      ];
      updateFormData({ selectedUsers: newSelectedUsers });
    }
  };

  const getInitials = (name: string | null, email: string): string => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-900 font-medium">{error}</p>
              <Button onClick={fetchUsers} variant="outline" className="mt-3">
                Retry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Link Users (Optional)</CardTitle>
          <CardDescription>
            Select users to assign this role. You can also assign users later.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Bar */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {filteredUsers.length > 0 && (
              <Button variant="outline" onClick={selectAll}>
                {filteredUsers.every((u) => formData.selectedUsers.includes(u.id))
                  ? 'Deselect'
                  : 'Select'}{' '}
                All ({filteredUsers.length})
              </Button>
            )}
          </div>

          {/* Selection Summary */}
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-md">
            <UsersIcon className="h-5 w-5 text-blue-600" />
            <span className="font-medium text-blue-900">
              {formData.selectedUsers.length} user{formData.selectedUsers.length !== 1 ? 's' : ''} selected
            </span>
            {formData.selectedUsers.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => updateFormData({ selectedUsers: [] })}
                className="ml-auto"
              >
                Clear All
              </Button>
            )}
          </div>

          {/* Users List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No users found matching your search.</p>
              </div>
            ) : (
              filteredUsers.map((user) => (
                <UserItem
                  key={user.id}
                  user={user}
                  isSelected={formData.selectedUsers.includes(user.id)}
                  onToggle={() => toggleUser(user.id)}
                  getInitials={getInitials}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Help Tip */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm text-blue-900">
              <p className="font-medium">User Assignment:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>This step is optional - you can skip and assign users later</li>
                <li>Selected users will receive this role upon creation</li>
                <li>You can add or remove users from roles at any time</li>
                <li>Users can have multiple roles simultaneously</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface UserItemProps {
  user: User;
  isSelected: boolean;
  onToggle: () => void;
  getInitials: (name: string | null, email: string) => string;
}

function UserItem({ user, isSelected, onToggle, getInitials }: UserItemProps) {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer hover:bg-gray-50 transition-colors ${
        isSelected ? 'bg-blue-50 border-blue-300' : 'border-gray-200'
      }`}
      onClick={onToggle}
    >
      <Checkbox checked={isSelected} onCheckedChange={onToggle} />
      <Avatar className="h-10 w-10">
        <AvatarFallback className="bg-blue-600 text-white">
          {getInitials(user.full_name, user.email)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">
          {user.full_name || 'No name'}
        </p>
        <p className="text-sm text-gray-600 truncate">{user.email}</p>
      </div>
    </div>
  );
}
