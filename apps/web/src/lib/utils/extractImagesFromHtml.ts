/**
 * Utility to extract images from HTML content for AI processing
 *
 * Extracts images from HTML and converts them to a format
 * suitable for Claude's vision API (base64 with media type).
 */

export interface ExtractedImage {
  /** Base64-encoded image data (without data URL prefix) */
  data: string;
  /** MIME type of the image */
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
  /** Original source URL or indicator */
  source: string;
}

/**
 * Supported image MIME types for Claude vision
 */
const SUPPORTED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;

/**
 * Extract media type from data URL
 */
function extractMediaTypeFromDataUrl(dataUrl: string): ExtractedImage['mediaType'] | null {
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|gif|webp));base64,/);
  if (match) {
    return match[1] as ExtractedImage['mediaType'];
  }
  return null;
}

/**
 * Extract base64 data from data URL
 */
function extractBase64FromDataUrl(dataUrl: string): string | null {
  const match = dataUrl.match(/^data:image\/[^;]+;base64,(.+)$/);
  if (match) {
    return match[1];
  }
  return null;
}

/**
 * Get media type from URL based on extension
 */
function getMediaTypeFromUrl(url: string): ExtractedImage['mediaType'] | null {
  const extension = url.split('.').pop()?.toLowerCase().split('?')[0];
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    default:
      return null;
  }
}

/**
 * Fetch an image URL and convert to base64
 * Note: This runs on the server side
 */
async function fetchImageAsBase64(url: string): Promise<{ data: string; mediaType: ExtractedImage['mediaType'] } | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'image/*',
      },
    });

    if (!response.ok) {
      console.warn(`[extractImagesFromHtml] Failed to fetch image: ${url}, status: ${response.status}`);
      return null;
    }

    const contentType = response.headers.get('content-type');
    let mediaType: ExtractedImage['mediaType'] | null = null;

    // Try to get media type from content-type header
    if (contentType) {
      const type = contentType.split(';')[0].trim();
      if (SUPPORTED_MEDIA_TYPES.includes(type as ExtractedImage['mediaType'])) {
        mediaType = type as ExtractedImage['mediaType'];
      }
    }

    // Fall back to URL extension
    if (!mediaType) {
      mediaType = getMediaTypeFromUrl(url);
    }

    // Default to JPEG if we can't determine
    if (!mediaType) {
      mediaType = 'image/jpeg';
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    return { data: base64, mediaType };
  } catch (error) {
    console.warn(`[extractImagesFromHtml] Error fetching image: ${url}`, error);
    return null;
  }
}

/**
 * Extract all images from HTML content
 *
 * Supports:
 * - Base64 data URLs (inline images)
 * - Remote URLs (fetched and converted to base64)
 * - Blob URLs are skipped (client-side only)
 *
 * @param html - HTML content containing images
 * @param maxImages - Maximum number of images to extract (default: 5)
 * @returns Array of extracted images ready for Claude vision API
 */
export async function extractImagesFromHtml(
  html: string,
  maxImages: number = 5
): Promise<ExtractedImage[]> {
  const images: ExtractedImage[] = [];

  // Match img tags with src attribute
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  const matches = [...html.matchAll(imgRegex)];

  for (const match of matches) {
    if (images.length >= maxImages) {
      break;
    }

    const src = match[1];

    // Skip blob URLs (they don't work server-side)
    if (src.startsWith('blob:')) {
      console.warn('[extractImagesFromHtml] Skipping blob URL (not supported server-side)');
      continue;
    }

    // Handle base64 data URLs
    if (src.startsWith('data:image/')) {
      const mediaType = extractMediaTypeFromDataUrl(src);
      const data = extractBase64FromDataUrl(src);

      if (mediaType && data) {
        images.push({
          data,
          mediaType,
          source: 'inline-base64',
        });
      }
      continue;
    }

    // Handle remote URLs
    if (src.startsWith('http://') || src.startsWith('https://')) {
      const result = await fetchImageAsBase64(src);
      if (result) {
        images.push({
          data: result.data,
          mediaType: result.mediaType,
          source: src,
        });
      }
      continue;
    }

    // Handle relative URLs (would need base URL context)
    console.warn(`[extractImagesFromHtml] Skipping relative URL: ${src}`);
  }

  return images;
}

/**
 * Convert extracted images to Claude message content format
 *
 * @param images - Array of extracted images
 * @returns Array of content blocks for Claude message
 */
export function imagesToClaudeContent(images: ExtractedImage[]): Array<{
  type: 'image';
  source: {
    type: 'base64';
    media_type: string;
    data: string;
  };
}> {
  return images.map((img) => ({
    type: 'image' as const,
    source: {
      type: 'base64' as const,
      media_type: img.mediaType,
      data: img.data,
    },
  }));
}

/**
 * Create a multimodal message content array with text and images
 *
 * @param text - Text content
 * @param images - Extracted images
 * @returns Content array for Claude message
 */
export function createMultimodalContent(
  text: string,
  images: ExtractedImage[]
): Array<{ type: 'text'; text: string } | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }> {
  const content: Array<{ type: 'text'; text: string } | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }> = [];

  // Add images first (Claude processes images before text)
  for (const img of images) {
    content.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: img.mediaType,
        data: img.data,
      },
    });
  }

  // Add text content
  content.push({
    type: 'text',
    text,
  });

  return content;
}

/**
 * Strip images from HTML, leaving only text content
 *
 * @param html - HTML content
 * @returns HTML with img tags removed
 */
export function stripImagesFromHtml(html: string): string {
  return html.replace(/<img[^>]*>/gi, '');
}

/**
 * Get plain text from HTML (strips all tags)
 *
 * @param html - HTML content
 * @returns Plain text content
 */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
