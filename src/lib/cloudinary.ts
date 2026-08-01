const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string;

export interface CloudinaryUploadResult {
  secureUrl: string;
  originalFilename: string;
  bytes: number;
}

export async function uploadToCloudinary(
  file: File,
  options: { folder?: string; resourceType?: 'image' | 'auto' } = {}
): Promise<CloudinaryUploadResult> {
  const { folder, resourceType = 'image' } = options;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  if (folder) formData.append('folder', folder);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`, {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || 'Upload failed. Please try again.');
  }

  return {
    secureUrl: data.secure_url,
    originalFilename: data.original_filename,
    bytes: data.bytes,
  };
}
