import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { SettingService } from '@/services/SettingService';
import { FacebookChannelService } from '@/services/communication/FacebookChannelService';
import { authUtils } from '@/utils/authUtils';
import { tenantUtils } from '@/utils/tenantUtils';

/**
 * Facebook OAuth Configuration
 * Set these in your environment variables:
 * - FACEBOOK_APP_ID: Your Facebook App ID
 * - FACEBOOK_APP_SECRET: Your Facebook App Secret
 * - NEXT_PUBLIC_APP_URL: Your application base URL
 */

/**
 * GET /api/settings/integrations/facebook/callback
 * Handle Facebook OAuth callback after user authorization
 *
 * Facebook OAuth Flow:
 * 1. User clicks "Connect with Facebook" which redirects to Facebook
 * 2. User authorizes the app and selects pages
 * 3. Facebook redirects back to this endpoint with authorization code
 * 4. We exchange the code for an access token
 * 5. We get the list of pages and their tokens
 * 6. We store the selected page's access token
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    const state = searchParams.get('state'); // Contains pageId if specified

    // Check for errors from Facebook
    if (error) {
      console.error('[Facebook OAuth] Error from Facebook:', error, errorDescription);
      const redirectUrl = new URL('/admin/settings', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
      redirectUrl.searchParams.set('facebook_error', errorDescription || error);
      return NextResponse.redirect(redirectUrl);
    }

    // Verify authorization code
    if (!code) {
      const redirectUrl = new URL('/admin/settings', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
      redirectUrl.searchParams.set('facebook_error', 'No authorization code received');
      return NextResponse.redirect(redirectUrl);
    }

    // Verify user is authenticated
    const user = await authUtils.getUser();
    if (!user) {
      const redirectUrl = new URL('/login', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
      redirectUrl.searchParams.set('redirect', '/admin/settings');
      return NextResponse.redirect(redirectUrl);
    }

    // Verify tenant context
    const tenantId = await tenantUtils.getTenantId();
    if (!tenantId) {
      const redirectUrl = new URL('/admin/settings', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
      redirectUrl.searchParams.set('facebook_error', 'No tenant context');
      return NextResponse.redirect(redirectUrl);
    }

    // Get Facebook App credentials from environment
    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    if (!appId || !appSecret) {
      console.error('[Facebook OAuth] Missing FACEBOOK_APP_ID or FACEBOOK_APP_SECRET');
      const redirectUrl = new URL('/admin/settings', appUrl);
      redirectUrl.searchParams.set('facebook_error', 'Facebook integration not configured on server');
      return NextResponse.redirect(redirectUrl);
    }

    const redirectUri = `${appUrl}/api/settings/integrations/facebook/callback`;

    // Exchange authorization code for access token
    const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?` +
      `client_id=${encodeURIComponent(appId)}&` +
      `client_secret=${encodeURIComponent(appSecret)}&` +
      `code=${encodeURIComponent(code)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}`;

    const tokenResponse = await fetch(tokenUrl);
    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('[Facebook OAuth] Token exchange error:', tokenData.error);
      const redirectUrl = new URL('/admin/settings', appUrl);
      redirectUrl.searchParams.set('facebook_error', tokenData.error.message || 'Failed to get access token');
      return NextResponse.redirect(redirectUrl);
    }

    const userAccessToken = tokenData.access_token;
    console.log('[Facebook OAuth] User access token obtained successfully');

    // Get the user's pages
    const facebookService = container.get<FacebookChannelService>(TYPES.FacebookChannelService);
    console.log('[Facebook OAuth] Fetching user pages...');
    const pages = await facebookService.getUserPages(userAccessToken);
    console.log('[Facebook OAuth] Pages found:', pages.length, pages.map(p => ({ id: p.id, name: p.name })));

    if (pages.length === 0) {
      console.error('[Facebook OAuth] No pages returned. This usually means:');
      console.error('  1. User did not grant pages_show_list permission');
      console.error('  2. User has no Pages they manage');
      console.error('  3. Facebook App permissions are not approved');
      const redirectUrl = new URL('/admin/settings', appUrl);
      redirectUrl.searchParams.set('facebook_error', 'No Facebook Pages found. Make sure you selected a Page during authorization and have admin access to it.');
      return NextResponse.redirect(redirectUrl);
    }

    // If state contains a page ID, use that page; otherwise use the first page
    let selectedPage = pages[0];
    if (state) {
      const matchingPage = pages.find(p => p.id === state);
      if (matchingPage) {
        selectedPage = matchingPage;
      }
    }

    // Exchange for long-lived token if possible
    let pageAccessToken = selectedPage.access_token || '';
    if (pageAccessToken) {
      const longLivedToken = await facebookService.exchangeForLongLivedToken(
        pageAccessToken,
        appId,
        appSecret
      );
      if (longLivedToken) {
        pageAccessToken = longLivedToken;
      }
    }

    // Save the page configuration
    const settingService = container.get<SettingService>(TYPES.SettingService);
    await settingService.saveFacebookConfig({
      pageId: selectedPage.id,
      pageName: selectedPage.name || '',
      accessToken: pageAccessToken,
    });

    // Redirect back to integrations page with success
    const redirectUrl = new URL('/admin/settings', appUrl);
    redirectUrl.searchParams.set('facebook_success', 'true');
    redirectUrl.searchParams.set('facebook_page', selectedPage.name || selectedPage.id);

    // If there are multiple pages, include count so UI can prompt for page selection
    if (pages.length > 1) {
      redirectUrl.searchParams.set('facebook_pages_count', pages.length.toString());
    }

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('[GET /api/settings/integrations/facebook/callback] Error:', error);
    const redirectUrl = new URL('/admin/settings', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
    redirectUrl.searchParams.set('facebook_error', 'An unexpected error occurred');
    return NextResponse.redirect(redirectUrl);
  }
}
