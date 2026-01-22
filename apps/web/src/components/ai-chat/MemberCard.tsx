/**
 * MemberCard Component
 * Displays member information in AI chat responses
 */

'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  User,
  Mail,
  Phone,
  Calendar,
  Briefcase,
  Heart,
  ExternalLink,
  Cake
} from 'lucide-react';

export interface MemberCardProps {
  member: {
    id: string;
    name: string;
    preferred_name?: string | null;
    email?: string | null;
    contact_number?: string | null;
    birthday?: string | null;
    anniversary?: string | null;
    gender?: string | null;
    marital_status?: string | null;
    occupation?: string | null;
    age?: number | null;
  };
  onViewProfile?: (memberId: string) => void;
}

export function MemberCard({ member, onViewProfile }: MemberCardProps) {
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getGenderBadgeColor = (gender: string | null | undefined) => {
    if (!gender) return 'secondary';
    switch (gender.toLowerCase()) {
      case 'male': return 'blue';
      case 'female': return 'pink';
      default: return 'secondary';
    }
  };

  const getMaritalStatusBadgeColor = (status: string | null | undefined) => {
    if (!status) return 'secondary';
    switch (status.toLowerCase()) {
      case 'married': return 'default';
      case 'single': return 'secondary';
      case 'engaged': return 'outline';
      case 'widowed': return 'secondary';
      case 'divorced': return 'secondary';
      default: return 'secondary';
    }
  };

  const handleViewProfile = () => {
    if (onViewProfile) {
      onViewProfile(member.id);
    } else {
      // Default: open in new tab
      window.open(`/admin/community/members/${member.id}`, '_blank');
    }
  };

  return (
    <Card className="max-w-2xl border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              {member.name}
            </CardTitle>
            {member.preferred_name && (
              <p className="text-sm text-muted-foreground">
                Preferred: {member.preferred_name}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleViewProfile}
            className="gap-2"
          >
            View Profile
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          {member.gender && (
            <Badge variant={getGenderBadgeColor(member.gender) as any}>
              {member.gender}
            </Badge>
          )}
          {member.marital_status && (
            <Badge variant={getMaritalStatusBadgeColor(member.marital_status) as any}>
              {member.marital_status}
            </Badge>
          )}
          {member.age && (
            <Badge variant="outline">
              {member.age} years old
            </Badge>
          )}
        </div>

        {/* Contact Information */}
        <div className="space-y-2">
          {member.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a
                href={`mailto:${member.email}`}
                className="text-primary hover:underline"
              >
                {member.email}
              </a>
            </div>
          )}
          {member.contact_number && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <a
                href={`tel:${member.contact_number}`}
                className="text-primary hover:underline"
              >
                {member.contact_number}
              </a>
            </div>
          )}
        </div>

        {/* Additional Information */}
        <div className="space-y-2 pt-2 border-t">
          {member.birthday && (
            <div className="flex items-center gap-2 text-sm">
              <Cake className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Birthday:</span>
              <span>{formatDate(member.birthday)}</span>
            </div>
          )}
          {member.anniversary && (
            <div className="flex items-center gap-2 text-sm">
              <Heart className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Anniversary:</span>
              <span>{formatDate(member.anniversary)}</span>
            </div>
          )}
          {member.occupation && (
            <div className="flex items-center gap-2 text-sm">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Occupation:</span>
              <span>{member.occupation}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
