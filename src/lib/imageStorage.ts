import { supabase } from './supabase';
import { useAuthStore } from '../store/authStore';

export const IMAGE_BUCKET = 'workflow-images';
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

function validateImage(file: File) {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Use a PNG, JPG, WebP, or GIF image.');
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('Images must be smaller than 10 MB.');
  }
}

function safeFileName(name: string) {
  const extension = name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'image';
  return `${crypto.randomUUID()}.${extension}`;
}

export async function uploadWorkflowImage(file: File): Promise<string> {
  validateImage(file);
  if (!supabase) throw new Error('Shared image storage is not configured.');

  const { team, user } = useAuthStore.getState();
  if (!team || !user) throw new Error('Sign in to upload a shared image.');

  const path = `${team.id}/${user.id}/${safeFileName(file.name)}`;
  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function createWorkflowImageUrl(path: string): Promise<string> {
  if (!supabase) throw new Error('Shared image storage is not configured.');
  const { data, error } = await supabase.storage.from(IMAGE_BUCKET).createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

export function isImageFile(file: File) {
  return ACCEPTED_IMAGE_TYPES.includes(file.type);
}
