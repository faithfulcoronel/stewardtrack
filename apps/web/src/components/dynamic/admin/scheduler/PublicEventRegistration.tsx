'use client';

import { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

interface EventDetails {
  id: string;
  title: string;
  description?: string | null;
  ministryName: string;
  startTime: string;
  endTime: string;
  location?: string | null;
  capacity?: number | null;
  registrationCount: number;
  waitlistCount: number;
  registrationRequired: boolean;
  registrationOpen: boolean;
  formSchema?: FormField[] | null;
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
  status: 'confirmed' | 'waitlisted';
  waitlistPosition?: number;
  confirmationCode?: string;
}

export interface PublicEventRegistrationProps {
  occurrenceId: string;
  className?: string;
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatTime = (dateString: string): string => {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

export function PublicEventRegistration({
  occurrenceId,
  className,
}: PublicEventRegistrationProps) {
  const [eventDetails, setEventDetails] = useState<EventDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationResult, setRegistrationResult] = useState<RegistrationResult | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [partySize, setPartySize] = useState('1');
  const [specialRequests, setSpecialRequests] = useState('');
  const [customFields, setCustomFields] = useState<Record<string, string>>({});

  const { toast } = useToast();

  const fetchEventDetails = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/community/scheduler/occurrences/${occurrenceId}/public`
      );

      if (!response.ok) {
        throw new Error('Event not found');
      }

      const result = await response.json();
      setEventDetails(result.data);

      // Initialize custom fields
      if (result.data.formSchema) {
        const initial: Record<string, string> = {};
        result.data.formSchema.forEach((field: FormField) => {
          initial[field.id] = '';
        });
        setCustomFields(initial);
      }
    } catch (error) {
      console.error('Error fetching event:', error);
      toast({
        title: 'Error',
        description: 'Failed to load event details.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [occurrenceId, toast]);

  useEffect(() => {
    fetchEventDetails();
  }, [fetchEventDetails]);

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
    if (eventDetails?.formSchema) {
      for (const field of eventDetails.formSchema) {
        if (field.required && !customFields[field.id]?.trim()) {
          toast({
            title: 'Error',
            description: `${field.label} is required.`,
            variant: 'destructive',
          });
          return;
        }
      }
    }

    try {
      setIsSubmitting(true);

      const response = await fetch(
        `/api/community/scheduler/occurrences/${occurrenceId}/registrations`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            guest_name: name.trim(),
            guest_email: email.trim(),
            guest_phone: phone.trim() || null,
            party_size: parseInt(partySize),
            special_requests: specialRequests.trim() || null,
            form_responses: Object.keys(customFields).length > 0 ? customFields : null,
          }),
        }
      );

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

      toast({
        title: 'Registration Successful!',
        description:
          result.data.status === 'waitlisted'
            ? `You've been added to the waitlist at position ${result.data.waitlist_position}.`
            : 'Your registration has been confirmed.',
      });
    } catch (error) {
      console.error('Error submitting registration:', error);
      toast({
        title: 'Registration Failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCustomField = (field: FormField) => {
    const value = customFields[field.id] || '';
    const onChange = (newValue: string) => {
      setCustomFields((prev) => ({ ...prev, [field.id]: newValue }));
    };

    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
          />
        );

      case 'select':
        return (
          <Select value={value} onValueChange={onChange}>
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

      default:
        return (
          <Input
            type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
          />
        );
    }
  };

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center min-h-[400px]', className)}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
          <p className="text-muted-foreground">Loading event details...</p>
        </div>
      </div>
    );
  }

  if (!eventDetails) {
    return (
      <div className={cn('max-w-lg mx-auto', className)}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Event Not Found</AlertTitle>
          <AlertDescription>
            The event you&apos;re looking for doesn&apos;t exist or is no longer available.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (registrationResult) {
    return (
      <div className={cn('max-w-lg mx-auto', className)}>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div
                className={cn(
                  'w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center',
                  registrationResult.status === 'confirmed'
                    ? 'bg-green-100 dark:bg-green-950'
                    : 'bg-yellow-100 dark:bg-yellow-950'
                )}
              >
                {registrationResult.status === 'confirmed' ? (
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                ) : (
                  <Clock className="w-8 h-8 text-yellow-600" />
                )}
              </div>

              <h2 className="text-2xl font-bold mb-2">
                {registrationResult.status === 'confirmed'
                  ? 'Registration Confirmed!'
                  : 'Added to Waitlist'}
              </h2>

              <p className="text-muted-foreground mb-4">
                {registrationResult.status === 'confirmed'
                  ? "You're all set! We look forward to seeing you."
                  : `You're #${registrationResult.waitlistPosition} on the waitlist. We'll notify you if a spot opens up.`}
              </p>

              {registrationResult.confirmationCode && (
                <div className="p-4 bg-muted rounded-lg mb-4">
                  <p className="text-sm text-muted-foreground mb-1">Confirmation Code</p>
                  <p className="text-lg font-mono font-bold">
                    {registrationResult.confirmationCode}
                  </p>
                </div>
              )}

              <Separator className="my-6" />

              <div className="text-left space-y-3">
                <h3 className="font-semibold">{eventDetails.title}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  {formatDate(eventDetails.startTime)}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  {formatTime(eventDetails.startTime)} - {formatTime(eventDetails.endTime)}
                </div>
                {eventDetails.location && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    {eventDetails.location}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isFull =
    eventDetails.capacity &&
    eventDetails.registrationCount >= eventDetails.capacity;
  const spotsLeft = eventDetails.capacity
    ? eventDetails.capacity - eventDetails.registrationCount
    : null;

  return (
    <div className={cn('max-w-2xl mx-auto', className)}>
      {/* Event Details */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{eventDetails.title}</CardTitle>
              <CardDescription className="text-base">
                {eventDetails.ministryName}
              </CardDescription>
            </div>
            {eventDetails.capacity && (
              <Badge variant={isFull ? 'destructive' : 'outline'} className="text-sm">
                {isFull ? 'Full' : `${spotsLeft} spots left`}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{formatDate(eventDetails.startTime)}</p>
                <p className="text-sm text-muted-foreground">
                  {formatTime(eventDetails.startTime)} - {formatTime(eventDetails.endTime)}
                </p>
              </div>
            </div>

            {eventDetails.location && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Location</p>
                  <p className="text-sm text-muted-foreground">{eventDetails.location}</p>
                </div>
              </div>
            )}
          </div>

          {eventDetails.description && (
            <p className="text-muted-foreground">{eventDetails.description}</p>
          )}

          {eventDetails.capacity && (
            <div className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {eventDetails.registrationCount} / {eventDetails.capacity} registered
                {eventDetails.waitlistCount > 0 && (
                  <span className="ml-2">({eventDetails.waitlistCount} on waitlist)</span>
                )}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Registration Form */}
      {!eventDetails.registrationOpen ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Registration Closed</AlertTitle>
          <AlertDescription>
            Registration for this event is currently closed.
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
              {eventDetails.formSchema && eventDetails.formSchema.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    {eventDetails.formSchema.map((field) => (
                      <div key={field.id} className="space-y-2">
                        <Label htmlFor={field.id}>
                          {field.label}
                          {field.required && (
                            <span className="text-destructive ml-1">*</span>
                          )}
                        </Label>
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
  );
}
