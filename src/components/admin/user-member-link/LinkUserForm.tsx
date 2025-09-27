'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  AlertTriangle,
  CheckCircle,
  Link,
  Search,
  User,
  Users,
  Loader2,
  AlertCircle,
  Check,
  ChevronsUpDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserSearchResult, MemberSearchResult, LinkingConflict } from '@/models/userMemberLink.model';

interface LinkUserFormProps {
  onSuccess?: () => void;
  preselectedUser?: UserSearchResult | null;
}

interface ValidationResult {
  isValid: boolean;
  conflicts: LinkingConflict[];
  warnings: string[];
  suggestions: string[];
}

export function LinkUserForm({ onSuccess, preselectedUser }: LinkUserFormProps) {
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [selectedMember, setSelectedMember] = useState<MemberSearchResult | null>(null);
  const [userQuery, setUserQuery] = useState('');
  const [memberQuery, setMemberQuery] = useState('');
  const [userResults, setUserResults] = useState<UserSearchResult[]>([]);
  const [memberResults, setMemberResults] = useState<MemberSearchResult[]>([]);
  const [notes, setNotes] = useState('');
  const [userComboOpen, setUserComboOpen] = useState(false);
  const [memberComboOpen, setMemberComboOpen] = useState(false);

  const [searchingUsers, setSearchingUsers] = useState(false);
  const [searchingMembers, setSearchingMembers] = useState(false);
  const [validating, setValidating] = useState(false);
  const [linking, setLinking] = useState(false);

  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadAllUsers = async () => {
    setSearchingUsers(true);
    try {
      const response = await fetch('/api/user-member-link/users/unlinked');

      if (!response.ok) {
        throw new Error('Failed to load users');
      }

      const data = await response.json();
      setUserResults(data.data || []);
    } catch (err) {
      console.error('Error loading users:', err);
      setError('Failed to load users');
    } finally {
      setSearchingUsers(false);
    }
  };

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setUserResults([]);
      return;
    }

    setSearchingUsers(true);
    try {
      const response = await fetch(`/api/user-member-link/search?type=users&q=${encodeURIComponent(query)}&linked=unlinked`);

      if (!response.ok) {
        throw new Error('Failed to search users');
      }

      const data = await response.json();
      setUserResults(data.results || []);
    } catch (err) {
      console.error('Error searching users:', err);
      setError('Failed to search users');
    } finally {
      setSearchingUsers(false);
    }
  };

  const searchMembers = async (query: string) => {
    if (query.length < 2) {
      setMemberResults([]);
      return;
    }

    setSearchingMembers(true);
    try {
      const response = await fetch(`/api/user-member-link/search?type=members&q=${encodeURIComponent(query)}&linked=unlinked`);

      if (!response.ok) {
        throw new Error('Failed to search members');
      }

      const data = await response.json();
      setMemberResults(data.results || []);
    } catch (err) {
      console.error('Error searching members:', err);
      setError('Failed to search members');
    } finally {
      setSearchingMembers(false);
    }
  };

  const validateLinking = async () => {
    if (!selectedUser || !selectedMember) return;

    setValidating(true);
    try {
      const response = await fetch('/api/user-member-link/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedUser.id,
          member_id: selectedMember.id
        })
      });

      if (!response.ok) {
        throw new Error('Validation failed');
      }

      const result = await response.json();
      setValidation(result);
    } catch (err) {
      console.error('Error validating linking:', err);
      setError('Failed to validate linking operation');
    } finally {
      setValidating(false);
    }
  };

  const handleLinkUser = async () => {
    if (!selectedUser || !selectedMember) return;

    // Check validation first
    if (validation && !validation.isValid) {
      setError('Please resolve validation conflicts before proceeding');
      return;
    }

    setLinking(true);
    setError(null);

    try {
      const response = await fetch('/api/user-member-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedUser.id,
          member_id: selectedMember.id,
          notes
        })
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(`User successfully linked to member!`);
        setSelectedUser(null);
        setSelectedMember(null);
        setUserQuery('');
        setMemberQuery('');
        setNotes('');
        setValidation(null);
        onSuccess?.();
      } else {
        setError(result.error || 'Failed to link user to member');
      }
    } catch (err) {
      console.error('Error linking user:', err);
      setError('Failed to link user to member');
    } finally {
      setLinking(false);
    }
  };

  const clearForm = () => {
    setSelectedUser(null);
    setSelectedMember(null);
    setUserQuery('');
    setMemberQuery('');
    setUserResults([]);
    setMemberResults([]);
    setNotes('');
    setValidation(null);
    setError(null);
    setSuccess(null);
  };

  // Handle preselected user
  useEffect(() => {
    if (preselectedUser) {
      setSelectedUser(preselectedUser);
      setUserQuery('');
      setUserResults([]);
    }
  }, [preselectedUser]);

  // Trigger validation when both user and member are selected
  useEffect(() => {
    if (selectedUser && selectedMember) {
      validateLinking();
    } else {
      setValidation(null);
    }
  }, [selectedUser, selectedMember]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link className="h-5 w-5" />
          Link User to Member
        </CardTitle>
        <CardDescription>
          Connect an existing user account to a member profile
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Success Message */}
        {success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Error Message */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* User Selection */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <Label className="text-base font-medium">Select User Account</Label>
          </div>

          {!selectedUser ? (
            <Popover open={userComboOpen} onOpenChange={setUserComboOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={userComboOpen}
                  className="w-full justify-between"
                  onClick={() => {
                    setUserComboOpen(true);
                    if (userResults.length === 0) {
                      loadAllUsers();
                    }
                  }}
                >
                  Select user...
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput
                    placeholder="Search users by email..."
                    value={userQuery}
                    onValueChange={(value) => {
                      setUserQuery(value);
                      searchUsers(value);
                    }}
                  />
                  <CommandList>
                    <CommandEmpty>
                      {searchingUsers ? (
                        <div className="flex items-center justify-center py-6">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="ml-2">Searching...</span>
                        </div>
                      ) : (
                        "No users found."
                      )}
                    </CommandEmpty>
                    <CommandGroup>
                      {userResults.map((user) => (
                        <CommandItem
                          key={user.id}
                          value={`${user.email} ${user.first_name} ${user.last_name}`}
                          onSelect={() => {
                            setSelectedUser(user);
                            setUserQuery('');
                            setUserComboOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedUser?.id === user.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex items-center justify-between w-full">
                            <div>
                              <div className="font-medium">{user.email}</div>
                              {(user.first_name || user.last_name) && (
                                <div className="text-sm text-muted-foreground">
                                  {user.first_name} {user.last_name}
                                </div>
                              )}
                            </div>
                            <Badge variant={user.is_linked ? "destructive" : "default"}>
                              {user.is_linked ? "Linked" : "Available"}
                            </Badge>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          ) : (
            <div className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
              <div>
                <div className="font-medium">{selectedUser.email}</div>
                {(selectedUser.first_name || selectedUser.last_name) && (
                  <div className="text-sm text-muted-foreground">
                    {selectedUser.first_name} {selectedUser.last_name}
                  </div>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={() => setSelectedUser(null)}>
                Change
              </Button>
            </div>
          )}
        </div>

        <Separator />

        {/* Member Selection */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <Label className="text-base font-medium">Select Member Profile</Label>
          </div>

          {!selectedMember ? (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search members by name, email, or phone..."
                  value={memberQuery}
                  onChange={(e) => {
                    setMemberQuery(e.target.value);
                    searchMembers(e.target.value);
                  }}
                  className="pl-8"
                />
                {searchingMembers && (
                  <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin" />
                )}
              </div>

              {memberResults.length > 0 && (
                <div className="border rounded-md p-2 space-y-2 max-h-48 overflow-y-auto">
                  {memberResults.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-2 hover:bg-muted rounded cursor-pointer"
                      onClick={() => {
                        setSelectedMember(member);
                        setMemberResults([]);
                        setMemberQuery('');
                      }}
                    >
                      <div>
                        <div className="font-medium">
                          {member.first_name} {member.last_name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {member.email && `${member.email} • `}
                          {member.contact_number}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline">{member.membership_status}</Badge>
                        <Badge variant={member.is_linked ? "destructive" : "default"}>
                          {member.is_linked ? "Linked" : "Available"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
              <div>
                <div className="font-medium">
                  {selectedMember.first_name} {selectedMember.last_name}
                </div>
                <div className="text-sm text-muted-foreground">
                  {selectedMember.email && `${selectedMember.email} • `}
                  {selectedMember.contact_number}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setSelectedMember(null)}>
                Change
              </Button>
            </div>
          )}
        </div>

        {/* Validation Results */}
        {validating && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Validating linking operation...
          </div>
        )}

        {validation && (
          <div className="space-y-3">
            {validation.conflicts.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-2">Linking Conflicts Detected:</div>
                  <ul className="list-disc list-inside space-y-1">
                    {validation.conflicts.map((conflict, index) => (
                      <li key={index} className="text-sm">
                        {conflict.suggested_action}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {validation.warnings.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-2">Warnings:</div>
                  <ul className="list-disc list-inside space-y-1">
                    {validation.warnings.map((warning, index) => (
                      <li key={index} className="text-sm">{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {validation.isValid && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Ready to link user to member profile.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notes (Optional)</Label>
          <Textarea
            id="notes"
            placeholder="Add any additional notes about this linking operation..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[80px]"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={handleLinkUser}
            disabled={!selectedUser || !selectedMember || linking || (validation && !validation.isValid)}
            className="flex-1"
          >
            {linking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Linking...
              </>
            ) : (
              <>
                <Link className="mr-2 h-4 w-4" />
                Link User to Member
              </>
            )}
          </Button>

          <Button variant="outline" onClick={clearForm}>
            Clear Form
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}