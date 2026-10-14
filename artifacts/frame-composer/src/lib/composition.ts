export type Layout =
  | 'Single'
  | 'Double Vertical'
  | 'Double Horizontal'
  | 'Triple Vertical'
  | 'Grid 2x2';

export type FitMode = 'fit' | 'fill';
export type CropRatioLabel = 'Original' | '1:1' | '4:5' | '5:4' | '3:2' | '2:3' | '16:9' | '9:16' | '65:24' | '4:3' | '3:4';

export interface CropSettings {
  ratio: CropRatioLabel;
  zoom: number;
  /** Center of the crop window in normalized source coordinates. */
  x: number;
  y: number;
  /** Source rectangle in natural image pixels. */
  rect: { x: number; y: number; width: number; height: number };
}

export interface CompositionOptions {
  ratio: number;
  layout: Layout;
  fit: FitMode;
  margin: number;
  gap: number;
  whiteBackground: boolean;
}

export interface LoadedPhoto {
  id: string;
  name: string;
  url: string;
  image: HTMLImageElement;
  crop?: CropSettings;
}

export const CROP_RATIOS: { label: CropRatioLabel; value: number | null }[] = [
  { label: 'Original', value: null },
  { label: '1:1', value: 1 },
  { label: '4:5', value: 4 / 5 },
  { label: '5:4', value: 5 / 4 },
  { label: '3:2', value: 3 / 2 },
  { label: '2:3', value: 2 / 3 },
  { label: '16:9', value: 16 / 9 },
  { label: '9:16', value: 9 / 16 },
  { label: '65:24', value: 65 / 24 },
  { label: '4:3', value: 4 / 3 },
  { label: '3:4', value: 3 / 4 },
];

export function cropRectFor(
  image: HTMLImageElement,
  ratio: CropRatioLabel,
  zoom = 1,
  x = 0.5,
  y = 0.5,
) {
  const sourceWidth = image.naturalWidth;
  const sourceHeight = image.naturalHeight;
  const value = CROP_RATIOS.find((item) => item.label === ratio)?.value;
  let width = sourceWidth;
  let height = sourceHeight;
  if (value !== null && value !== undefined) {
    if (sourceWidth / sourceHeight > value) width = sourceHeight * value;
    else height = sourceWidth / value;
  }
  width = Math.min(sourceWidth, width / Math.max(1, zoom));
  height = Math.min(sourceHeight, height / Math.max(1, zoom));
  const left = Math.max(0, Math.min(sourceWidth - width, x * sourceWidth - width / 2));
  const top = Math.max(0, Math.min(sourceHeight - height, y * sourceHeight - height / 2));
  return { x: left, y: top, width, height };
}

export const RATIO_PRESETS = [
  { label: '1:1', value: 1 },
  { label: '4:5', value: 4 / 5 },
  { label: '5:4', value: 5 / 4 },
  { label: '3:2', value: 3 / 2 },
  { label: '2:3', value: 2 / 3 },
  { label: '16:9', value: 16 / 9 },
  { label: '9:16', value: 9 / 16 },
  { label: '65:24', value: 65 / 24 },
  { label: '4:3', value: 4 / 3 },
  { label: '3:4', value: 3 / 4 },
] as const;

export const LAYOUTS: Layout[] = [
  'Single',
  'Double Vertical',
  'Double Horizontal',
  'Triple Vertical',
  'Grid 2x2',
];

export function createCanvasDimensions(ratio: number, longEdge: number) {
  if (ratio >= 1) {
    return { width: longEdge, height: Math.round(longEdge / ratio) };
  }
  return { width: Math.round(longEdge * ratio), height: longEdge };
}

function getSlotCount(layout: Layout) {
  if (layout === 'Single') return 1;
  if (layout === 'Double Vertical' || layout === 'Double Horizontal') return 2;
  if (layout === 'Triple Vertical') return 3;
  return 4;
}

export function drawComposition(
  canvas: HTMLCanvasElement,
  photos: LoadedPhoto[],
  options: CompositionOptions,
  longEdge: number,
) {
  const { width, height } = createCanvasDimensions(options.ratio, longEdge);
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Your browser could not create a canvas for this composition.');
  }

  context.clearRect(0, 0, width, height);
  if (options.whiteBackground) {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
  }

  const scale = Math.min(width, height);
  const margin = (options.margin / 100) * scale;
  const gap = (options.gap / 100) * scale;
  const usableWidth = Math.max(1, width - margin * 2);
  const usableHeight = Math.max(1, height - margin * 2);
  const count = getSlotCount(options.layout);
  const columns =
    options.layout === 'Double Horizontal' || options.layout === 'Grid 2x2'
      ? 2
      : 1;
  const rows =
    options.layout === 'Double Vertical'
      ? 2
      : options.layout === 'Triple Vertical'
        ? 3
        : options.layout === 'Grid 2x2'
          ? 2
          : 1;
  const slotWidth = Math.max(1, (usableWidth - gap * (columns - 1)) / columns);
  const slotHeight = Math.max(1, (usableHeight - gap * (rows - 1)) / rows);

  for (let index = 0; index < count; index += 1) {
    const photo = photos[index];
    if (!photo) continue;
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = margin + column * (slotWidth + gap);
    const y = margin + row * (slotHeight + gap);
    const image = photo.image;
    const sourceRect = photo.crop?.rect ?? {
      x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight,
    };
    const sourceRatio = sourceRect.width / sourceRect.height;
    const targetRatio = slotWidth / slotHeight;

    context.save();
    context.beginPath();
    context.rect(x, y, slotWidth, slotHeight);
    context.clip();

    if (options.fit === 'fit') {
      const drawWidth =
        sourceRatio > targetRatio ? slotWidth : slotHeight * sourceRatio;
      const drawHeight =
        sourceRatio > targetRatio ? slotWidth / sourceRatio : slotHeight;
      context.drawImage(
        image,
        sourceRect.x, sourceRect.y, sourceRect.width, sourceRect.height,
        x + (slotWidth - drawWidth) / 2,
        y + (slotHeight - drawHeight) / 2,
        drawWidth,
        drawHeight,
      );
    } else {
      const drawWidth =
        sourceRatio > targetRatio ? slotHeight * sourceRatio : slotWidth;
      const drawHeight =
        sourceRatio > targetRatio ? slotHeight : slotWidth / sourceRatio;
      context.drawImage(
        image,
        sourceRect.x, sourceRect.y, sourceRect.width, sourceRect.height,
        x + (slotWidth - drawWidth) / 2,
        y + (slotHeight - drawHeight) / 2,
        drawWidth,
        drawHeight,
      );
    }
    context.restore();
  }
}

export function loadLocalPhoto(id: string, file: File): Promise<LoadedPhoto> {
  const url = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ id, name: file.name, url, image });
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`“${file.name}” could not be opened as an image.`));
    };
    image.src = url;
  });
}

export function downloadCanvas(canvas: HTMLCanvasElement, format: 'jpg' | 'png') {
  return new Promise<void>((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('The image could not be exported. Please try again.'));
            return;
          }
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `frame-composer.${format}`;
          link.click();
          window.setTimeout(() => URL.revokeObjectURL(url), 1000);
          resolve();
        },
        format === 'jpg' ? 'image/jpeg' : 'image/png',
        format === 'jpg' ? 0.94 : undefined,
      );
    } catch {
      reject(new Error('Export failed. Try using smaller source images.'));
    }
  });
}
