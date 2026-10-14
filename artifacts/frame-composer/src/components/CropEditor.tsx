import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Check, Crop, RotateCcw, X } from 'lucide-react';
import {
  CROP_RATIOS,
  cropRectFor,
  type CropRatioLabel,
  type CropSettings,
  type LoadedPhoto,
} from '../lib/composition';

interface CropEditorProps {
  photo: LoadedPhoto;
  onCancel: () => void;
  onApply: (crop: CropSettings) => void;
}

interface CropDraft {
  ratio: CropRatioLabel;
  zoom: number;
  x: number;
  y: number;
}

function draftFromCrop(photo: LoadedPhoto): CropDraft {
  return photo.crop
    ? { ratio: photo.crop.ratio, zoom: photo.crop.zoom, x: photo.crop.x, y: photo.crop.y }
    : { ratio: 'Original', zoom: 1, x: 0.5, y: 0.5 };
}

export function CropEditor({ photo, onCancel, onApply }: CropEditorProps) {
  const [draft, setDraft] = useState<CropDraft>(() => draftFromCrop(photo));
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const value = CROP_RATIOS.find((item) => item.label === draft.ratio)?.value;
  const displayRatio = value ?? photo.image.naturalWidth / photo.image.naturalHeight;
  const rect = cropRectFor(photo.image, draft.ratio, draft.zoom, draft.x, draft.y);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  function beginDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
  }

  function drag(event: ReactPointerEvent<HTMLDivElement>) {
    const previous = dragRef.current;
    const frame = frameRef.current;
    if (!previous || previous.pointerId !== event.pointerId || !frame) return;
    const bounds = frame.getBoundingClientRect();
    const deltaX = event.clientX - previous.x;
    const deltaY = event.clientY - previous.y;
    setDraft((current) => {
      const currentRect = cropRectFor(photo.image, current.ratio, current.zoom, current.x, current.y);
      const minX = currentRect.width / (2 * photo.image.naturalWidth);
      const minY = currentRect.height / (2 * photo.image.naturalHeight);
      return {
        ...current,
        x: Math.max(minX, Math.min(1 - minX, current.x - (deltaX * currentRect.width) / bounds.width / photo.image.naturalWidth)),
        y: Math.max(minY, Math.min(1 - minY, current.y - (deltaY * currentRect.height) / bounds.height / photo.image.naturalHeight)),
      };
    });
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
  }

  function endDrag(event: ReactPointerEvent<HTMLDivElement>) {
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function resetCrop() {
    setDraft({ ratio: 'Original', zoom: 1, x: 0.5, y: 0.5 });
  }

  function applyCrop() {
    onApply({
      ...draft,
      rect: cropRectFor(photo.image, draft.ratio, draft.zoom, draft.x, draft.y),
    });
  }

  const availableHeight = window.innerWidth <= 767
    ? window.innerHeight * 0.5 - 24
    : window.innerHeight * 0.55 - 40;
  const frameWidth = Math.max(
    120,
    Math.min(700, window.innerWidth - (window.innerWidth <= 767 ? 64 : 100), availableHeight * displayRatio),
  );
  const frameStyle = { aspectRatio: `${displayRatio}`, width: `${frameWidth}px` };
  const imageStyle = {
    width: `${(photo.image.naturalWidth / rect.width) * 100}%`,
    height: `${(photo.image.naturalHeight / rect.height) * 100}%`,
    left: `${(-rect.x / rect.width) * 100}%`,
    top: `${(-rect.y / rect.height) * 100}%`,
  };

  return (
    <div className="crop-overlay" role="presentation" data-testid="crop-editor-overlay">
      <section
        className="crop-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="crop-editor-title"
        data-testid="crop-editor"
      >
        <header className="crop-dialog-head">
          <div>
            <p className="crop-eyebrow"><Crop size={13} aria-hidden="true" /> Photo adjustment</p>
            <h2 id="crop-editor-title">Crop <span title={photo.name}>{photo.name}</span></h2>
          </div>
          <button className="photo-action crop-close" type="button" onClick={onCancel} aria-label="Close crop editor" data-testid="button-close-crop">
            <X size={17} aria-hidden="true" />
          </button>
        </header>

        <div className="crop-preview-wrap">
          <div
            ref={frameRef}
            className="crop-frame"
            style={frameStyle}
            onPointerDown={beginDrag}
            onPointerMove={drag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            role="img"
            aria-label={`Crop preview for ${photo.name}. Drag to reposition.`}
            data-testid="crop-preview-frame"
          >
            <img className="crop-preview-image" src={photo.url} alt="" draggable={false} style={imageStyle} />
            <div className="crop-frame-outline" aria-hidden="true" />
          </div>
        </div>

        <p className="crop-hint">Drag the photo to find the right frame.</p>
        <div className="crop-controls">
          <div className="crop-control-block">
            <div className="field-heading">
              <span className="field-label">Crop ratio</span>
              <span className="field-value" data-testid="text-crop-ratio">{draft.ratio}</span>
            </div>
            <div className="ratio-grid crop-ratio-grid" role="group" aria-label="Crop ratio">
              {CROP_RATIOS.map((preset) => (
                <button
                  key={preset.label}
                  className={`choice-button${draft.ratio === preset.label ? ' selected' : ''}`}
                  type="button"
                  aria-pressed={draft.ratio === preset.label}
                  onClick={() => setDraft((current) => preset.label === 'Original'
                    ? { ratio: 'Original', zoom: 1, x: 0.5, y: 0.5 }
                    : { ...current, ratio: preset.label })}
                  data-testid={`button-crop-ratio-${preset.label.replace(':', '-')}`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
          <div className="crop-zoom-row">
            <div className="field-heading">
              <label htmlFor="crop-zoom">Zoom</label>
              <span className="field-value" data-testid="text-crop-zoom">{draft.zoom.toFixed(1)}×</span>
            </div>
            <input
              id="crop-zoom"
              className="slider-control"
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={draft.zoom}
              onChange={(event) => setDraft((current) => ({ ...current, zoom: Number(event.currentTarget.value) }))}
              aria-label="Crop zoom"
              data-testid="slider-crop-zoom"
            />
          </div>
        </div>

        <footer className="crop-dialog-foot">
          <button className="button-secondary crop-reset" type="button" onClick={resetCrop} data-testid="button-reset-crop">
            <RotateCcw size={14} aria-hidden="true" /> Reset Crop
          </button>
          <div className="crop-actions">
            <button className="button-secondary" type="button" onClick={onCancel} data-testid="button-cancel-crop">Cancel</button>
            <button className="button-primary" type="button" onClick={applyCrop} data-testid="button-apply-crop">
              <Check size={14} aria-hidden="true" /> Apply Crop
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
