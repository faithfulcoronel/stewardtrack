'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  User,
  Mail,
  Phone,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ScheduleInfo {
  scheduleId: string;
  title: string;
  description?: string | null;
  location?: string | null;
  capacity?: number | null;
  coverPhotoUrl?: string | null;
  ministryName: string;
  tenantName: string;
  formSchema?: FormField[] | null;
  timezone: string;
  registrationCount: number;
  waitlistCount: number;
  expiresAt: string;
  upcomingOccurrences: Array<{
    id: string;
    event_date: string;
    start_time: string;
    end_time: string | null;
    status: string;
  }>;
}

interface FormField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  helpText?: string;
}

interface RegistrationResult {
  success: boolean;
  status: 'registered' | 'waitlisted';
  waitlistPosition?: number;
  confirmationCode?: string;
}

type PageState = 'loading' | 'form' | 'success' | 'expired' | 'error';

const formatDate = (dateString: string, timezone?: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: timezone,
  });
};

const formatTime = (timeString: string | null | undefined, timezone?: string): string => {
  if (!timeString) return '';
  // Handle both ISO date strings and time-only strings
  const date = timeString.includes('T') ? new Date(timeString) : new Date(`1970-01-01T${timeString}`);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: timezone,
  });
};

export default function PublicRegistrationPage() {
  const params = useParams();
  const token = params.token as string;
  const { toast } = useToast();

  const [state, setState] = useState<PageState>('loading');
  const [scheduleInfo, setScheduleInfo] = useState<ScheduleInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationResult, setRegistrationResult] = useState<RegistrationResult | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [partySize, setPartySize] = useState('1');
  const [specialRequests, setSpecialRequests] = useState('');
  const [customFields, setCustomFields] = useState<Record<string, string | boolean>>({});
  const [selectedOccurrence, setSelectedOccurrence] = useState<string>('');

  // Fetch schedule info
  const fetchScheduleInfo = useCallback(async () => {
    try {
      const response = await fetch(`/api/register/${token}`);
      const result = await response.json();

      if (!response.ok) {
        if (response.status === 400 && result.error?.includes('expired')) {
          setState('expired');
        } else {
          setError(result.error || 'Failed to load event');
          setState('error');
        }
        return;
      }

      setScheduleInfo(result.data);

      // Initialize custom fields
      if (result.data.formSchema) {
        const initial: Record<string, string | boolean> = {};
        result.data.formSchema.forEach((field: FormField) => {
          initial[field.id] = field.type === 'checkbox' ? false : '';
        });
        setCustomFields(initial);
      }

      // Select first occurrence by default
      if (result.data.upcomingOccurrences?.length > 0) {
        setSelectedOccurrence(result.data.upcomingOccurrences[0].id);
      }

      setState('form');
    } catch (err) {
      console.error('Error fetching schedule:', err);
      setError('Failed to load event details');
      setState('error');
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchScheduleInfo();
    }
  }, [token, fetchScheduleInfo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim()) {
      toast({
        title: 'Error',
        description: 'Name and email are required.',
        variant: 'destructive',
      });
      return;
    }

    // Validate required custom fields
    if (scheduleInfo?.formSchema) {
      for (const field of scheduleInfo.formSchema) {
        if (field.required) {
          const value = customFields[field.id];
          if (field.type === 'checkbox') {
            if (value !== true) {
              toast({
                title: 'Error',
                description: `${field.label} is required.`,
                variant: 'destructive',
              });
              return;
            }
          } else if (!value || (typeof value === 'string' && !value.trim())) {
            toast({
              title: 'Error',
              description: `${field.label} is required.`,
              variant: 'destructive',
            });
            return;
          }
        }
      }
    }

    try {
      setIsSubmitting(true);

      const response = await fetch(`/api/register/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_name: name.trim(),
          guest_email: email.trim(),
          guest_phone: phone.trim() || null,
          party_size: parseInt(partySize),
          special_requests: specialRequests.trim() || null,
          form_responses: Object.keys(customFields).length > 0 ? customFields : null,
          occurrence_id: selectedOccurrence || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Registration failed');
      }

      setRegistrationResult({
        success: true,
        status: result.data.status,
        waitlistPosition: result.data.waitlist_position,
        confirmationCode: result.data.confirmation_code,
      });

      setState('success');
    } catch (err) {
      console.error('Registration error:', err);
      toast({
        title: 'Registration Failed',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCustomField = (field: FormField) => {
    const value = customFields[field.id];
    const onChange = (newValue: string | boolean) => {
      setCustomFields((prev) => ({ ...prev, [field.id]: newValue }));
    };

    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            value={value as string || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
          />
        );

      case 'select':
        return (
          <Select value={value as string || ''} onValueChange={(v) => onChange(v)}>
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || 'Select...'} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={field.id}
              checked={value as boolean || false}
              onCheckedChange={(checked) => onChange(checked === true)}
            />
            <Label htmlFor={field.id} className="text-sm font-normal cursor-pointer">
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
          </div>
        );

      default:
        return (
          <Input
            type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
            value={value as string || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
          />
        );
    }
  };

  // Loading state
  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading event details...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Expired state
  if (state === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="w-8 h-8 text-amber-600" />
              </div>
            </div>
            <CardTitle>Link Expired</CardTitle>
            <CardDescription>
              This registration link has expired. Please request a new link from the event organizer.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Error state
  if (state === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
            </div>
            <CardTitle>Unable to Load Event</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (state === 'success' && registrationResult && scheduleInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div
                className={cn(
                  'w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center',
                  'animate-in zoom-in-50 duration-300',
                  registrationResult.status === 'registered'
                    ? 'bg-green-100 dark:bg-green-900/30'
                    : 'bg-amber-100 dark:bg-amber-900/30'
                )}
              >
                {registrationResult.status === 'registered' ? (
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                ) : (
                  <Clock className="w-10 h-10 text-amber-600" />
                )}
              </div>

              <h2 className="text-2xl font-bold mb-2">
                {registrationResult.status === 'registered'
                  ? 'Registration Confirmed!'
                  : 'Added to Waitlist'}
              </h2>

              <p className="text-muted-foreground mb-4">
                {registrationResult.status === 'registered'
                  ? "You're all set! We look forward to seeing you."
                  : registrationResult.waitlistPosition
                    ? `You're #${registrationResult.waitlistPosition} on the waitlist. We'll notify you if a spot opens up.`
                    : "You've been added to the waitlist. We'll notify you if a spot opens up."}
              </p>

              {registrationResult.confirmationCode && (
                <div className="p-4 bg-muted rounded-lg mb-4">
                  <p className="text-sm text-muted-foreground mb-1">Confirmation Code</p>
                  <p className="text-2xl font-mono font-bold tracking-wider">
                    {registrationResult.confirmationCode}
                  </p>
                </div>
              )}

              <Separator className="my-6" />

              <div className="text-left space-y-3">
                <h3 className="font-semibold">{scheduleInfo.title}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building2 className="w-4 h-4" />
                  {scheduleInfo.tenantName}
                </div>
                {scheduleInfo.location && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    {scheduleInfo.location}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Form state
  if (!scheduleInfo) return null;

  const isFull = scheduleInfo.capacity && scheduleInfo.registrationCount >= scheduleInfo.capacity;
  const spotsLeft = scheduleInfo.capacity
    ? scheduleInfo.capacity - scheduleInfo.registrationCount
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Cover Photo */}
        {scheduleInfo.coverPhotoUrl && (
          <div className="relative w-full aspect-video rounded-xl overflow-hidden mb-6 shadow-lg">
            <Image
              src={scheduleInfo.coverPhotoUrl}
              alt={scheduleInfo.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        {/* Event Details */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">{scheduleInfo.title}</CardTitle>
                <CardDescription className="flex items-center gap-2 text-base">
                  <Building2 className="w-4 h-4" />
                  {scheduleInfo.ministryName} • {scheduleInfo.tenantName}
                </CardDescription>
              </div>
              {scheduleInfo.capacity && (
                <Badge variant={isFull ? 'destructive' : 'outline'} className="text-sm shrink-0">
                  {isFull ? 'Full' : `${spotsLeft} spots left`}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {scheduleInfo.location && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Location</p>
                  <p className="text-sm text-muted-foreground">{scheduleInfo.location}</p>
                </div>
              </div>
            )}

            {scheduleInfo.description && (
              <p className="text-muted-foreground">{scheduleInfo.description}</p>
            )}

            {scheduleInfo.capacity && (
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {scheduleInfo.registrationCount} / {scheduleInfo.capacity} registered
                  {scheduleInfo.waitlistCount > 0 && (
                    <span className="ml-2">({scheduleInfo.waitlistCount} on waitlist)</span>
                  )}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* No upcoming events */}
        {scheduleInfo.upcomingOccurrences.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No Upcoming Events</AlertTitle>
            <AlertDescription>
              There are currently no upcoming events scheduled. Please check back later.
            </AlertDescription>
          </Alert>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Register for this Event</CardTitle>
              <CardDescription>
                {isFull
                  ? "The event is full, but you can join the waitlist."
                  : 'Fill out the form below to register.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Select Event Date */}
                {scheduleInfo.upcomingOccurrences.length > 1 && (
                  <div className="space-y-2">
                    <Label>Select Date <span className="text-destructive">*</span></Label>
                    <Select value={selectedOccurrence} onValueChange={setSelectedOccurrence}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an event date" />
                      </SelectTrigger>
                      <SelectContent>
                        {scheduleInfo.upcomingOccurrences.map((occ) => (
                          <SelectItem key={occ.id} value={occ.id}>
                            <span className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              {formatDate(occ.event_date, scheduleInfo.timezone)} at {formatTime(occ.start_time, scheduleInfo.timezone)}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Single event date display */}
                {scheduleInfo.upcomingOccurrences.length === 1 && (
                  <div className="p-3 bg-muted rounded-lg flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {formatDate(scheduleInfo.upcomingOccurrences[0].event_date, scheduleInfo.timezone)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatTime(scheduleInfo.upcomingOccurrences[0].start_time, scheduleInfo.timezone)}
                        {scheduleInfo.upcomingOccurrences[0].end_time && ` - ${formatTime(scheduleInfo.upcomingOccurrences[0].end_time, scheduleInfo.timezone)}`}
                      </p>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Contact Info */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      Full Name <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        className="pl-9"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">
                      Email <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="john@example.com"
                        className="pl-9"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone (optional)</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="(555) 123-4567"
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="partySize">Party Size</Label>
                    <Select value={partySize} onValueChange={setPartySize}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                          <SelectItem key={num} value={num.toString()}>
                            {num} {num === 1 ? 'person' : 'people'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Custom Fields */}
                {scheduleInfo.formSchema && scheduleInfo.formSchema.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      {scheduleInfo.formSchema.map((field) => (
                        <div key={field.id} className="space-y-2">
                          {field.type !== 'checkbox' && (
                            <Label htmlFor={field.id}>
                              {field.label}
                              {field.required && <span className="text-destructive ml-1">*</span>}
                            </Label>
                          )}
                          {renderCustomField(field)}
                          {field.helpText && (
                            <p className="text-xs text-muted-foreground">{field.helpText}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="specialRequests">Special Requests (optional)</Label>
                  <Textarea
                    id="specialRequests"
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    placeholder="Any dietary restrictions, accessibility needs, etc."
                    rows={3}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : isFull ? (
                    'Join Waitlist'
                  ) : (
                    'Register Now'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
