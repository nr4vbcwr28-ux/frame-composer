// MIME-only filters let Safari translate Photos assets to a supported format.
export const PHOTO_PICKER_ACCEPT = 'image/jpeg,image/png,image/webp';

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const IMAGE_EXTENSION = /\.(jpe?g|png|webp)$/i;

export function isSupportedPhoto(file: Pick<File, 'name' | 'type' | 'size'>) {
  if (file.size === 0) return false;
  // Files providers may omit MIME types; Photos may change the filename when
  // converting HEIC to JPEG. Decode the image before adding it to the frame.
  return IMAGE_TYPES.has(file.type.toLowerCase()) ||
    (file.type === '' && IMAGE_EXTENSION.test(file.name));
}
