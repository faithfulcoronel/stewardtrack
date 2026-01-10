'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  QrCode,
  Camera,
  CameraOff,
  CheckCircle2,
  XCircle,
  AlertCircle,
  User,
  Users,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Occurrence {
  id: string;
  title: string;
  ministryName: string;
  startTime: string;
  endTime: string;
  status: string;
}

interface CheckInResult {
  success: boolean;
  message: string;
  attendee?: {
    name: string;
    type: 'member' | 'guest';
  };
}

export interface QRScannerViewProps {
  className?: string;
}

const formatTime = (dateString: string): string => {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

export function QRScannerView({ className }: QRScannerViewProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [selectedOccurrence, setSelectedOccurrence] = useState<string>('');
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [lastCheckIn, setLastCheckIn] = useState<CheckInResult | null>(null);
  const [checkedInCount, setCheckedInCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  const fetchOccurrences = useCallback(async () => {
    try {
      setIsLoading(true);
      const today = new Date();
      const endDate = new Date();
      endDate.setDate(today.getDate() + 1);

      const response = await fetch(
        `/api/community/scheduler/occurrences?startDate=${today.toISOString()}&endDate=${endDate.toISOString()}&status=scheduled,in_progress`
      );

      if (response.ok) {
        const result = await response.json();
        setOccurrences(result.data || []);

        // Auto-select if only one occurrence
        if (result.data?.length === 1) {
          setSelectedOccurrence(result.data[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching occurrences:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOccurrences();
  }, [fetchOccurrences]);

  useEffect(() => {
    // Cleanup camera stream on unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsScanning(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: 'Camera Error',
        description: 'Could not access camera. Please check permissions.',
        variant: 'destructive',
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  };

  const processCheckIn = async (qrToken: string) => {
    if (!selectedOccurrence) {
      toast({
        title: 'Error',
        description: 'Please select an event first.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsProcessing(true);

      const response = await fetch(
        `/api/community/scheduler/occurrences/${selectedOccurrence}/attendance`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            qr_token: qrToken,
            checkin_method: 'staff_scan',
          }),
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        setLastCheckIn({
          success: true,
          message: 'Check-in successful!',
          attendee: result.data?.attendee,
        });
        setCheckedInCount((prev) => prev + 1);

        // Play success sound (optional)
        const audio = new Audio('/sounds/success.mp3');
        audio.play().catch(() => {});
      } else {
        setLastCheckIn({
          success: false,
          message: result.error || 'Check-in failed',
        });
      }
    } catch (error) {
      console.error('Error processing check-in:', error);
      setLastCheckIn({
        success: false,
        message: 'Network error. Please try again.',
      });
    } finally {
      setIsProcessing(false);
      setManualCode('');
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      processCheckIn(manualCode.trim());
    }
  };

  const selectedOccurrenceData = occurrences.find((o) => o.id === selectedOccurrence);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <QrCode className="w-6 h-6" />
            Check-In Station
          </h1>
          <p className="text-muted-foreground">
            Scan QR codes or enter codes manually to check in attendees
          </p>
        </div>
        <Button variant="outline" onClick={fetchOccurrences} disabled={isLoading}>
          <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Event Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Event</CardTitle>
          <CardDescription>
            Choose the event you&apos;re checking people into
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-10 bg-muted animate-pulse rounded" />
          ) : occurrences.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No Events Available</AlertTitle>
              <AlertDescription>
                There are no scheduled or in-progress events today.
              </AlertDescription>
            </Alert>
          ) : (
            <Select value={selectedOccurrence} onValueChange={setSelectedOccurrence}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an event..." />
              </SelectTrigger>
              <SelectContent>
                {occurrences.map((occ) => (
                  <SelectItem key={occ.id} value={occ.id}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{occ.title}</span>
                      <span className="text-muted-foreground">-</span>
                      <span className="text-muted-foreground">{occ.ministryName}</span>
                      <span className="text-muted-foreground">
                        ({formatTime(occ.startTime)})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {selectedOccurrenceData && (
            <div className="mt-4 p-3 bg-muted rounded-lg flex items-center gap-4">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium">{selectedOccurrenceData.title}</p>
                <p className="text-sm text-muted-foreground">
                  {formatTime(selectedOccurrenceData.startTime)} -{' '}
                  {formatTime(selectedOccurrenceData.endTime)}
                </p>
              </div>
              <Badge variant="outline" className="ml-auto capitalize">
                {selectedOccurrenceData.status.replace('_', ' ')}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* QR Scanner */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Camera className="w-5 h-5" />
              QR Scanner
            </CardTitle>
            <CardDescription>
              Point the camera at a QR code to scan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="aspect-video bg-muted rounded-lg overflow-hidden relative">
                {isScanning ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <CameraOff className="w-12 h-12 mx-auto mb-2 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground">Camera not active</p>
                    </div>
                  </div>
                )}
                {isScanning && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-0 border-2 border-primary/50 rounded-lg" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-primary rounded-lg" />
                  </div>
                )}
              </div>

              <Button
                className="w-full"
                variant={isScanning ? 'destructive' : 'default'}
                onClick={isScanning ? stopCamera : startCamera}
                disabled={!selectedOccurrence}
              >
                {isScanning ? (
                  <>
                    <CameraOff className="w-4 h-4 mr-2" />
                    Stop Scanner
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4 mr-2" />
                    Start Scanner
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Manual Entry */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Manual Entry</CardTitle>
            <CardDescription>
              Enter a check-in code manually if scanning doesn&apos;t work
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="manualCode">Check-in Code</Label>
                <Input
                  id="manualCode"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Enter code..."
                  disabled={!selectedOccurrence || isProcessing}
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={!selectedOccurrence || !manualCode.trim() || isProcessing}
              >
                {isProcessing ? 'Processing...' : 'Check In'}
              </Button>
            </form>

            {/* Last Check-in Result */}
            {lastCheckIn && (
              <div
                className={cn(
                  'mt-4 p-4 rounded-lg flex items-start gap-3',
                  lastCheckIn.success
                    ? 'bg-green-50 dark:bg-green-950/30'
                    : 'bg-red-50 dark:bg-red-950/30'
                )}
              >
                {lastCheckIn.success ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                )}
                <div>
                  <p
                    className={cn(
                      'font-medium',
                      lastCheckIn.success
                        ? 'text-green-700 dark:text-green-400'
                        : 'text-red-700 dark:text-red-400'
                    )}
                  >
                    {lastCheckIn.message}
                  </p>
                  {lastCheckIn.attendee && (
                    <p className="text-sm mt-1 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {lastCheckIn.attendee.name}
                      <Badge variant="outline" className="text-xs">
                        {lastCheckIn.attendee.type}
                      </Badge>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Session Stats */}
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Session Check-ins</span>
                <Badge variant="default" className="text-lg px-3 py-1">
                  <Users className="w-4 h-4 mr-2" />
                  {checkedInCount}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
