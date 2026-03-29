import { Config } from '../constants/config';

export type CloudinaryFolder = 'profiles' | 'documents' | 'certificates';

export interface CloudinaryResult {
  url:      string;   // secure_url — store this in DB
  publicId: string;   // public_id  — Cloudinary identifier
}

/**
 * Upload an image directly to Cloudinary using an unsigned upload preset.
 * No backend involvement — the result URL is then passed to the backend profile/document endpoints.
 *
 * @param uri      Local file URI from ImagePicker / DocumentPicker
 * @param folder   Cloudinary folder: 'profiles' | 'documents' | 'certificates'
 * @param mimeType File MIME type (default: 'image/jpeg')
 */
export async function uploadToCloudinary(
  uri:       string,
  folder:    CloudinaryFolder,
  mimeType:  string = 'image/jpeg',
): Promise<CloudinaryResult> {
  const cloudName = Config.CLOUDINARY_CLOUD_NAME;
  const preset    = Config.CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || cloudName === 'YOUR_CLOUD_NAME') {
    throw new Error('Cloudinary not configured. Set CLOUDINARY_CLOUD_NAME in config.ts');
  }
  if (!preset || preset === 'YOUR_UPLOAD_PRESET') {
    throw new Error('Cloudinary not configured. Set CLOUDINARY_UPLOAD_PRESET in config.ts');
  }

  // Determine resource type for Cloudinary (image vs raw for PDFs)
  const resourceType = mimeType === 'application/pdf' ? 'raw' : 'image';

  const formData = new FormData();
  formData.append('file', {
    uri,
    type: mimeType,
    name: `upload_${Date.now()}.${mimeType.split('/')[1] || 'jpg'}`,
  } as any);
  formData.append('upload_preset', preset);
  formData.append('folder', `kaamwala/${folder}`);

  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

  const response = await fetch(endpoint, {
    method:  'POST',
    body:    formData,
    headers: { 'Accept': 'application/json' },
  });

  const json = await response.json();

  if (!response.ok) {
    const message = json?.error?.message || 'Upload failed. Check your Cloudinary config.';
    throw new Error(message);
  }

  return {
    url:      json.secure_url,
    publicId: json.public_id,
  };
}
