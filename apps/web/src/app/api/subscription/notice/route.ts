import { NextRequest, NextResponse } from 'next/server';
import { checkAndNotifyGracePeriod } from '@/lib/server/subscription';

/**
 * POST /api/subscription/notice
 *
 * Endpoint to trigger subscription grace period notification check.                        
 * Intended for use by cron jobs or webhooks.
 * Request body:
 * - tenantId: string
 * Returns:
 * - success: boolean
 * - result: object (checkAndNotifyGracePeriod result)
 * - error?: string
 * 
 * Example request body:
 * {
 *   "tenantId": "tenant_12345"
 * }
 */
export async function POST(request: NextRequest) {
    const payload = await request.json();

    try {
        if (!payload.tenantId) {
            return NextResponse.json(   
                { success: false, error: 'Missing tenantId in request payload' },
                { status: 400 }
            );
        }  
        
        console.log('Grace Period Notification Test');
        // Check status and send notification automatically (for cron jobs)
        const result = await checkAndNotifyGracePeriod(payload.tenantId);
        console.log('Grace Period Notification Result:', result);
        return NextResponse.json({ success: true, result });

    } catch (error) {
        console.error('Error parsing request payload:', error);
        return NextResponse.json(
            { success: false, error: 'Invalid JSON in request body' },
            { status: 400 }
        );
    }
}