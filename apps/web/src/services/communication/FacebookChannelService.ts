import 'server-only';
import { injectable } from 'inversify';

/**
 * Facebook Page information returned from Graph API
 */
export interface FacebookPageInfo {
  id: string;
  name: string;
  access_token?: string;
  category?: string;
  followers_count?: number;
}

/**
 * Result of posting to a Facebook Page
 */
export interface FacebookPostResult {
  success: boolean;
  postId?: string;
  error?: string;
}

/**
 * Result of validating a Facebook access token
 */
export interface FacebookTokenValidationResult {
  valid: boolean;
  pageName?: string;
  pageId?: string;
  error?: string;
}

/**
 * Facebook Graph API response for page posts
 */
interface FacebookPostResponse {
  id: string;
}

/**
 * Facebook Graph API error response
 */
interface FacebookErrorResponse {
  error: {
    message: string;
    type: string;
    code: number;
    fbtrace_id?: string;
  };
}

/**
 * Facebook Channel Service
 *
 * Handles Facebook Graph API interactions for posting to Facebook Pages.
 * This service uses Facebook's Graph API v18.0 to:
 * - Post content to Facebook Pages
 * - Validate access tokens
 * - Get page information
 *
 * Required Facebook App permissions:
 * - pages_manage_posts: To publish posts
 * - pages_read_engagement: To read post metrics
 * - pages_show_list: To list managed pages
 */
@injectable()
export class FacebookChannelService {
  private readonly graphApiBaseUrl = 'https://graph.facebook.com/v18.0';

  /**
   * Post content to a Facebook Page
   *
   * @param pageId - The Facebook Page ID
   * @param accessToken - The Page Access Token
   * @param content - The text content to post
   * @param linkUrl - Optional URL to include in the post
   * @returns Result containing success status and post ID or error
   */
  async postToPage(
    pageId: string,
    accessToken: string,
    content: string,
    linkUrl?: string
  ): Promise<FacebookPostResult> {
    try {
      const url = `${this.graphApiBaseUrl}/${pageId}/feed`;

      const body: Record<string, string> = {
        message: content,
        access_token: accessToken,
      };

      // Add link if provided
      if (linkUrl) {
        body.link = linkUrl;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(body).toString(),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorData = data as FacebookErrorResponse;
        console.error('[FacebookChannelService] Post to page failed:', errorData);
        return {
          success: false,
          error: errorData.error?.message || `Facebook API error: ${response.status}`,
        };
      }

      const successData = data as FacebookPostResponse;
      console.log('[FacebookChannelService] Post successful:', successData.id);

      return {
        success: true,
        postId: successData.id,
      };
    } catch (error) {
      console.error('[FacebookChannelService] Post to page exception:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error posting to Facebook',
      };
    }
  }

  /**
   * Validate a Facebook Page access token and get page info
   *
   * @param accessToken - The Page Access Token to validate
   * @returns Validation result with page info if valid
   */
  async validateToken(accessToken: string): Promise<FacebookTokenValidationResult> {
    try {
      // Use the /me endpoint with the page token to get page info
      const url = `${this.graphApiBaseUrl}/me?fields=id,name&access_token=${encodeURIComponent(accessToken)}`;

      const response = await fetch(url, {
        method: 'GET',
      });

      const data = await response.json();

      if (!response.ok) {
        const errorData = data as FacebookErrorResponse;
        console.error('[FacebookChannelService] Token validation failed:', errorData);
        return {
          valid: false,
          error: errorData.error?.message || `Token validation failed: ${response.status}`,
        };
      }

      const pageInfo = data as FacebookPageInfo;
      console.log('[FacebookChannelService] Token valid for page:', pageInfo.name);

      return {
        valid: true,
        pageId: pageInfo.id,
        pageName: pageInfo.name,
      };
    } catch (error) {
      console.error('[FacebookChannelService] Token validation exception:', error);
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error validating token',
      };
    }
  }

  /**
   * Get detailed information about a Facebook Page
   *
   * @param pageId - The Facebook Page ID
   * @param accessToken - The Page Access Token
   * @returns Page information or null if not found
   */
  async getPageInfo(pageId: string, accessToken: string): Promise<FacebookPageInfo | null> {
    try {
      const fields = 'id,name,category,followers_count';
      const url = `${this.graphApiBaseUrl}/${pageId}?fields=${fields}&access_token=${encodeURIComponent(accessToken)}`;

      const response = await fetch(url, {
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json() as FacebookErrorResponse;
        console.error('[FacebookChannelService] Get page info failed:', errorData);
        return null;
      }

      const pageInfo = await response.json() as FacebookPageInfo;
      console.log('[FacebookChannelService] Page info retrieved:', pageInfo.name);

      return pageInfo;
    } catch (error) {
      console.error('[FacebookChannelService] Get page info exception:', error);
      return null;
    }
  }

  /**
   * Exchange a short-lived user access token for a long-lived token
   * Note: This is typically done during OAuth callback
   *
   * @param shortLivedToken - The short-lived token from OAuth
   * @param appId - The Facebook App ID
   * @param appSecret - The Facebook App Secret
   * @returns Long-lived access token or null
   */
  async exchangeForLongLivedToken(
    shortLivedToken: string,
    appId: string,
    appSecret: string
  ): Promise<string | null> {
    try {
      const url = `${this.graphApiBaseUrl}/oauth/access_token?` +
        `grant_type=fb_exchange_token&` +
        `client_id=${encodeURIComponent(appId)}&` +
        `client_secret=${encodeURIComponent(appSecret)}&` +
        `fb_exchange_token=${encodeURIComponent(shortLivedToken)}`;

      const response = await fetch(url, {
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json() as FacebookErrorResponse;
        console.error('[FacebookChannelService] Token exchange failed:', errorData);
        return null;
      }

      const data = await response.json() as { access_token: string; token_type: string; expires_in?: number };
      console.log('[FacebookChannelService] Long-lived token obtained');

      return data.access_token;
    } catch (error) {
      console.error('[FacebookChannelService] Token exchange exception:', error);
      return null;
    }
  }

  /**
   * Get a list of pages the user manages
   *
   * @param userAccessToken - The user's access token
   * @returns Array of pages with their access tokens
   */
  async getUserPages(userAccessToken: string): Promise<FacebookPageInfo[]> {
    try {
      const url = `${this.graphApiBaseUrl}/me/accounts?fields=id,name,access_token,category&access_token=${encodeURIComponent(userAccessToken)}`;

      const response = await fetch(url, {
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json() as FacebookErrorResponse;
        console.error('[FacebookChannelService] Get user pages failed:', errorData);
        return [];
      }

      const data = await response.json() as { data: FacebookPageInfo[] };
      console.log(`[FacebookChannelService] Found ${data.data.length} pages`);

      return data.data;
    } catch (error) {
      console.error('[FacebookChannelService] Get user pages exception:', error);
      return [];
    }
  }

  /**
   * Delete a post from a Facebook Page
   *
   * @param postId - The post ID to delete
   * @param accessToken - The Page Access Token
   * @returns Success status
   */
  async deletePost(postId: string, accessToken: string): Promise<boolean> {
    try {
      const url = `${this.graphApiBaseUrl}/${postId}?access_token=${encodeURIComponent(accessToken)}`;

      const response = await fetch(url, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json() as FacebookErrorResponse;
        console.error('[FacebookChannelService] Delete post failed:', errorData);
        return false;
      }

      console.log('[FacebookChannelService] Post deleted:', postId);
      return true;
    } catch (error) {
      console.error('[FacebookChannelService] Delete post exception:', error);
      return false;
    }
  }
}
