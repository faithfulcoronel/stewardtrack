'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle2, AlertCircle, Loader2, Users, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ScheduleInfo {
  scheduleName: string;
  scheduleDescription: string | null;
  ministryName: string;
  tenantName: string;
  expiresAt: string;
}

interface AttendanceResult {
  attendanceId?: string;
  message: string;
  memberName: string;
  scheduleName: string;
  eventDate: string;
  checkedInAt?: string;
}

type PageState = 'loading' | 'validating' | 'authenticating' | 'recording' | 'success' | 'already_checked_in' | 'error';

export default function AttendancePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [state, setState] = useState<PageState>('loading');
  const [scheduleInfo, setScheduleInfo] = useState<ScheduleInfo | null>(null);
  const [attendanceResult, setAttendanceResult] = useState<AttendanceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const hasAttemptedRecording = useRef(false);

  // Play success sound using Web Audio API (generates a pleasant chime)
  const playSuccessSound = () => {
    try {
      // Create or reuse AudioContext
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;

      // Resume context if suspended (required for some browsers)
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;

      // Create a pleasant two-tone chime
      const frequencies = [523.25, 659.25]; // C5 and E5 notes

      frequencies.forEach((freq, index) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.type = 'sine';
        oscillator.frequency.value = freq;

        // Envelope for the sound
        const startTime = now + (index * 0.1);
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5);

        oscillator.start(startTime);
        oscillator.stop(startTime + 0.5);
      });
    } catch (err) {
      console.log('Could not play success sound:', err);
    }
  };

  // Validate token and check authentication on mount
  useEffect(() => {
    if (!token || hasAttemptedRecording.current) return;

    const processAttendance = async () => {
      try {
        // Step 1: Validate token and get schedule info
        setState('validating');
        const validateResponse = await fetch(`/api/attend?token=${encodeURIComponent(token)}`);
        const validateResult = await validateResponse.json();

        if (!validateResult.success) {
          setError(validateResult.error || 'Invalid attendance link');
          setState('error');
          return;
        }

        setScheduleInfo(validateResult.data);

        // Step 2: Try to record attendance (this will check auth)
        setState('recording');
        hasAttemptedRecording.current = true;

        const attendResponse = await fetch('/api/attend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const attendResult = await attendResponse.json();

        if (!attendResponse.ok) {
          if (attendResult.code === 'AUTH_REQUIRED') {
            // Need to authenticate - redirect to login with return URL
            setState('authenticating');
            const returnUrl = encodeURIComponent(`/attend/${token}`);
            router.push(`/login?returnUrl=${returnUrl}&message=${encodeURIComponent('Please sign in to record your attendance')}`);
            return;
          }

          setError(attendResult.error || 'Failed to record attendance');
          setState('error');
          return;
        }

        // Success!
        setAttendanceResult(attendResult.data);

        if (attendResult.alreadyCheckedIn) {
          setState('already_checked_in');
        } else {
          setState('success');
          playSuccessSound();
        }
      } catch (err) {
        console.error('Attendance error:', err);
        setError('An unexpected error occurred. Please try again.');
        setState('error');
      }
    };

    processAttendance();
  }, [token, router]);

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Format time for display
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Loading state
  if (state === 'loading' || state === 'validating') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Validating attendance link...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Recording state
  if (state === 'recording') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <div>
                <p className="font-medium">Recording your attendance...</p>
                {scheduleInfo && (
                  <p className="text-sm text-muted-foreground mt-1">{scheduleInfo.scheduleName}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Authenticating state
  if (state === 'authenticating') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Redirecting to sign in...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (state === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
            </div>
            <CardTitle>Unable to Record Attendance</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              className="w-full"
              onClick={() => {
                hasAttemptedRecording.current = false;
                setState('loading');
              }}
            >
              Try Again
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push('/')}
            >
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (state === 'success' && attendanceResult) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className={cn(
                "w-20 h-20 rounded-full flex items-center justify-center",
                "bg-green-100 dark:bg-green-900/30",
                "animate-in zoom-in-50 duration-300"
              )}>
                <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <CardTitle className="text-2xl">Attendance Recorded!</CardTitle>
            <CardDescription className="text-base">
              Thank you for checking in, {attendanceResult.memberName}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Event</p>
                  <p className="font-medium">{attendanceResult.scheduleName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{formatDate(attendanceResult.eventDate)}</p>
                </div>
              </div>
              {attendanceResult.checkedInAt && (
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">Checked in at</p>
                    <p className="font-medium">{formatTime(attendanceResult.checkedInAt)}</p>
                  </div>
                </div>
              )}
            </div>

            {scheduleInfo && (
              <p className="text-center text-sm text-muted-foreground">
                {scheduleInfo.tenantName}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Already checked in state
  if (state === 'already_checked_in' && attendanceResult) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <CardTitle className="text-2xl">Already Checked In</CardTitle>
            <CardDescription className="text-base">
              {attendanceResult.memberName}, you have already recorded attendance for this event.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Event</p>
                  <p className="font-medium">{attendanceResult.scheduleName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{formatDate(attendanceResult.eventDate)}</p>
                </div>
              </div>
            </div>

            {scheduleInfo && (
              <p className="text-center text-sm text-muted-foreground">
                {scheduleInfo.tenantName}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fallback
  return null;
}
