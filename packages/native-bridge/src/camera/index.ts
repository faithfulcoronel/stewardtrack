/**
 * Camera Bridge
 *
 * Unified API for camera access across web and native platforms.
 * - Native (iOS/Android): Uses Capacitor Camera plugin
 * - Web: Uses MediaDevices API with fallback to file input
 */

import { isNative, isBrowser } from '../platform';

export interface Photo {
  /** Base64 encoded image data */
  base64String?: string;
  /** File path on device (native only) */
  path?: string;
  /** Web URL for the image (web only) */
  webPath?: string;
  /** EXIF data (native only) */
  exif?: Record<string, unknown>;
  /** Image format */
  format: 'jpeg' | 'png' | 'gif' | 'webp';
}

export interface CameraOptions {
  /** Image quality (0-100) */
  quality?: number;
  /** Allow editing after capture */
  allowEditing?: boolean;
  /** Result type: base64, uri, or dataUrl */
  resultType?: 'base64' | 'uri' | 'dataUrl';
  /** Save to photo gallery */
  saveToGallery?: boolean;
  /** Width of the output image */
  width?: number;
  /** Height of the output image */
  height?: number;
  /** Correct the orientation */
  correctOrientation?: boolean;
  /** Source: camera, photos, or prompt */
  source?: 'camera' | 'photos' | 'prompt';
  /** Camera direction */
  direction?: 'front' | 'rear';
  /** Presentation style (iOS only) */
  presentationStyle?: 'fullscreen' | 'popover';
}

export interface CameraPermissionStatus {
  camera: 'granted' | 'denied' | 'prompt';
  photos: 'granted' | 'denied' | 'prompt';
}

/**
 * Check camera permissions
 */
export async function checkPermissions(): Promise<CameraPermissionStatus> {
  if (isNative()) {
    const { Camera } = await import('@capacitor/camera');
    const result = await Camera.checkPermissions();
    return {
      camera: result.camera as 'granted' | 'denied' | 'prompt',
      photos: result.photos as 'granted' | 'denied' | 'prompt',
    };
  } else if (isBrowser()) {
    // Web doesn't have a way to check camera permissions synchronously
    try {
      const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
      return {
        camera: result.state as 'granted' | 'denied' | 'prompt',
        photos: 'granted', // Web doesn't require permission for photo selection
      };
    } catch {
      return { camera: 'prompt', photos: 'granted' };
    }
  }
  return { camera: 'denied', photos: 'denied' };
}

/**
 * Request camera permissions
 */
export async function requestPermissions(): Promise<CameraPermissionStatus> {
  if (isNative()) {
    const { Camera } = await import('@capacitor/camera');
    const result = await Camera.requestPermissions();
    return {
      camera: result.camera as 'granted' | 'denied' | 'prompt',
      photos: result.photos as 'granted' | 'denied' | 'prompt',
    };
  } else if (isBrowser()) {
    // Request via getUserMedia to trigger permission prompt
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((track) => track.stop());
      return { camera: 'granted', photos: 'granted' };
    } catch {
      return { camera: 'denied', photos: 'granted' };
    }
  }
  return { camera: 'denied', photos: 'denied' };
}

/**
 * Take a photo using the camera
 */
export async function takePhoto(options: CameraOptions = {}): Promise<Photo> {
  const {
    quality = 90,
    allowEditing = false,
    resultType = 'base64',
    saveToGallery = false,
    width,
    height,
    correctOrientation = true,
    direction = 'rear',
  } = options;

  if (isNative()) {
    const { Camera, CameraResultType, CameraSource, CameraDirection } = await import('@capacitor/camera');

    const image = await Camera.getPhoto({
      quality,
      allowEditing,
      resultType: resultType === 'base64'
        ? CameraResultType.Base64
        : resultType === 'uri'
        ? CameraResultType.Uri
        : CameraResultType.DataUrl,
      saveToGallery,
      width,
      height,
      correctOrientation,
      source: CameraSource.Camera,
      direction: direction === 'front' ? CameraDirection.Front : CameraDirection.Rear,
    });

    return {
      base64String: image.base64String,
      path: image.path,
      webPath: image.webPath,
      exif: image.exif,
      format: image.format as 'jpeg' | 'png' | 'gif' | 'webp',
    };
  } else if (isBrowser()) {
    // Web fallback using file input
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';

      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) {
          reject(new Error('No file selected'));
          return;
        }

        if (resultType === 'base64' || resultType === 'dataUrl') {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve({
              base64String: resultType === 'base64' ? result.split(',')[1] : undefined,
              webPath: resultType === 'dataUrl' ? result : undefined,
              format: getFormatFromFile(file),
            });
          };
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        } else {
          resolve({
            webPath: URL.createObjectURL(file),
            format: getFormatFromFile(file),
          });
        }
      };

      input.click();
    });
  }

  throw new Error('Camera not available on this platform');
}

/**
 * Pick a photo from the gallery
 */
export async function pickPhoto(options: CameraOptions = {}): Promise<Photo> {
  const {
    quality = 90,
    allowEditing = false,
    resultType = 'base64',
    width,
    height,
  } = options;

  if (isNative()) {
    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');

    const image = await Camera.getPhoto({
      quality,
      allowEditing,
      resultType: resultType === 'base64'
        ? CameraResultType.Base64
        : resultType === 'uri'
        ? CameraResultType.Uri
        : CameraResultType.DataUrl,
      width,
      height,
      source: CameraSource.Photos,
    });

    return {
      base64String: image.base64String,
      path: image.path,
      webPath: image.webPath,
      exif: image.exif,
      format: image.format as 'jpeg' | 'png' | 'gif' | 'webp',
    };
  } else if (isBrowser()) {
    // Web fallback using file input
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';

      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) {
          reject(new Error('No file selected'));
          return;
        }

        if (resultType === 'base64' || resultType === 'dataUrl') {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve({
              base64String: resultType === 'base64' ? result.split(',')[1] : undefined,
              webPath: resultType === 'dataUrl' ? result : undefined,
              format: getFormatFromFile(file),
            });
          };
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        } else {
          resolve({
            webPath: URL.createObjectURL(file),
            format: getFormatFromFile(file),
          });
        }
      };

      input.click();
    });
  }

  throw new Error('Photo picker not available on this platform');
}

/**
 * Pick multiple photos from the gallery
 */
export async function pickPhotos(options: CameraOptions = {}): Promise<Photo[]> {
  const { quality = 90, resultType = 'base64' } = options;

  if (isNative()) {
    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');

    const result = await Camera.pickImages({
      quality,
    });

    return result.photos.map((image) => ({
      webPath: image.webPath,
      format: image.format as 'jpeg' | 'png' | 'gif' | 'webp',
    }));
  } else if (isBrowser()) {
    // Web fallback using file input with multiple
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.multiple = true;

      input.onchange = async () => {
        const files = input.files;
        if (!files || files.length === 0) {
          reject(new Error('No files selected'));
          return;
        }

        const photos: Photo[] = [];
        for (const file of Array.from(files)) {
          if (resultType === 'base64' || resultType === 'dataUrl') {
            const reader = new FileReader();
            const result = await new Promise<string>((res, rej) => {
              reader.onload = () => res(reader.result as string);
              reader.onerror = () => rej(reader.error);
              reader.readAsDataURL(file);
            });
            photos.push({
              base64String: resultType === 'base64' ? result.split(',')[1] : undefined,
              webPath: resultType === 'dataUrl' ? result : undefined,
              format: getFormatFromFile(file),
            });
          } else {
            photos.push({
              webPath: URL.createObjectURL(file),
              format: getFormatFromFile(file),
            });
          }
        }
        resolve(photos);
      };

      input.click();
    });
  }

  throw new Error('Photo picker not available on this platform');
}

function getFormatFromFile(file: File): 'jpeg' | 'png' | 'gif' | 'webp' {
  const type = file.type.toLowerCase();
  if (type.includes('png')) return 'png';
  if (type.includes('gif')) return 'gif';
  if (type.includes('webp')) return 'webp';
  return 'jpeg';
}
