import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import {
  Check,
  Download,
  FileImage,
  ImagePlus,
  LockKeyhole,
  MoveHorizontal,
  MoveVertical,
  PanelTop,
  Rows3,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { PhotoList } from './components/PhotoList';
import {
  createCanvasDimensions,
  downloadCanvas,
  drawComposition,
  LAYOUTS,
  loadLocalPhoto,
  RATIO_PRESETS,
  type CompositionOptions,
  type FitMode,
  type Layout,
  type LoadedPhoto,
} from './lib/composition';

const ACCEPTED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);
const ACCEPTED_EXTENSIONS = /\.(jpe?g|png|webp)$/i;

function App() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const photosRef = useRef<LoadedPhoto[]>([]);
  const [photos, setPhotos] = useState<LoadedPhoto[]>([]);
  const [ratio, setRatio] = useState(1);
  const [layout, setLayout] = useState<Layout>('Single');
  const [fit, setFit] = useState<FitMode>('fit');
  const [margin, setMargin] = useState(5);
  const [gap, setGap] = useState(2);
  const [whiteBackground, setWhiteBackground] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [exporting, setExporting] = useState(false);

  const options: CompositionOptions = {
    ratio,
    layout,
    fit,
    margin,
    gap,
    whiteBackground,
  };
  const selectedRatio =
    RATIO_PRESETS.find((preset) => preset.value === ratio)?.label ?? '1:1';
  const dimensions = createCanvasDimensions(ratio, 4000);
  const longEdge = Math.max(dimensions.width, dimensions.height);

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    if (!previewCanvasRef.current || photos.length === 0) return;
    try {
      drawComposition(previewCanvasRef.current, photos, options, 1400);
    } catch {
      setError('Preview could not be drawn. Try removing the most recent image.');
    }
  }, [photos, ratio, layout, fit, margin, gap, whiteBackground]);

  useEffect(() => {
    return () => {
      photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.url));
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(''), 3200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  function openPicker() {
    fileInputRef.current?.click();
  }

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = '';
    if (!selectedFiles.length) return;

    const validFiles = selectedFiles.filter((file) => {
      const hasImageType = ACCEPTED_TYPES.has(file.type);
      const hasImageExtension = ACCEPTED_EXTENSIONS.test(file.name);
      return hasImageType && hasImageExtension;
    });
    const rejectedFiles = selectedFiles.filter((file) => !validFiles.includes(file));

    if (rejectedFiles.length) {
      const names = rejectedFiles
        .slice(0, 2)
        .map((file) => file.name)
        .join(', ');
      const extra = rejectedFiles.length > 2 ? ` and ${rejectedFiles.length - 2} more` : '';
      setError(
        `${names}${extra} ${rejectedFiles.length === 1 ? 'is' : 'are'} not a supported image. Choose JPG, PNG, or WebP files.`,
      );
    } else {
      setError('');
    }
    if (!validFiles.length) return;

    try {
      const loadResults = await Promise.allSettled(
        validFiles.map((file) =>
          loadLocalPhoto(
            `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`,
            file,
          ),
        ),
      );
      const loaded = loadResults.flatMap((result) =>
        result.status === 'fulfilled' ? [result.value] : [],
      );
      const failedLoads = loadResults.filter(
        (result) => result.status === 'rejected',
      );
      setPhotos((current) => [...current, ...loaded]);
      if (!rejectedFiles.length && failedLoads.length === 0) {
        setError('');
      } else if (failedLoads.length > 0) {
        const firstFailure = failedLoads[0];
        setError(
          firstFailure.status === 'rejected' && firstFailure.reason instanceof Error
            ? firstFailure.reason.message
            : 'One or more images could not be opened.',
        );
      }
      if (loaded.length > 0) {
        setNotice(
          `${loaded.length} ${loaded.length === 1 ? 'photo added' : 'photos added'} to your frame.`,
        );
      }
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : 'An image could not be opened.';
      setError(message);
    }
  }

  function removePhoto(id: string) {
    setPhotos((current) => {
      const removed = current.find((photo) => photo.id === id);
      if (removed) URL.revokeObjectURL(removed.url);
      return current.filter((photo) => photo.id !== id);
    });
  }

  function movePhoto(id: string, direction: -1 | 1) {
    setPhotos((current) => {
      const index = current.findIndex((photo) => photo.id === id);
      const destination = index + direction;
      if (index < 0 || destination < 0 || destination >= current.length) {
        return current;
      }
      const reordered = [...current];
      [reordered[index], reordered[destination]] = [
        reordered[destination],
        reordered[index],
      ];
      return reordered;
    });
  }

  async function exportImage(format: 'jpg' | 'png') {
    if (!photos.length || exporting) return;
    setError('');
    setExporting(true);
    try {
      const exportCanvas = document.createElement('canvas');
      const exportOptions = {
        ...options,
        whiteBackground: format === 'jpg' ? true : whiteBackground,
      };
      drawComposition(exportCanvas, photos, exportOptions, 4000);
      await downloadCanvas(exportCanvas, format);
      setNotice(
        `${format.toUpperCase()} exported at ${dimensions.width.toLocaleString()} × ${dimensions.height.toLocaleString()} px.`,
      );
    } catch (exportError) {
      const message =
        exportError instanceof Error
          ? exportError.message
          : 'Export failed. Please try again.';
      setError(message);
    } finally {
      setExporting(false);
    }
  }

  function getLayoutIcon(item: Layout) {
    if (item === 'Single') {
      return <PanelTop size={14} aria-hidden="true" />;
    }
    if (item === 'Double Horizontal') {
      return <Rows3 size={14} aria-hidden="true" />;
    }
    if (item === 'Double Vertical' || item === 'Triple Vertical') {
      return <MoveVertical size={14} aria-hidden="true" />;
    }
    return <MoveHorizontal size={14} aria-hidden="true" />;
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand" aria-label="Frame Composer">
          <span className="brand-mark">
            <PanelTop size={19} strokeWidth={1.8} aria-hidden="true" />
          </span>
          <span className="brand-name">frame composer</span>
        </div>
        <div className="privacy-note" data-testid="text-privacy-note">
          <LockKeyhole size={14} aria-hidden="true" />
          <span>Private by design</span>
        </div>
      </header>

      <section className="intro">
        <p className="eyebrow">A little room for your photos</p>
        <h1>Make a frame worth keeping.</h1>
        <p>
          Arrange a few favorites into a print-ready composition. Your photos stay
          right here on your device.
        </p>
      </section>

      <section className="workspace" aria-label="Photo frame editor">
        <div className="preview-column">
          <div className="preview-head">
            <h2 className="section-label">Your composition</h2>
            <span className="preview-meta" data-testid="text-preview-ratio">
              <Check size={13} aria-hidden="true" />
              {selectedRatio} ratio
            </span>
          </div>
          <div className="preview-stage" data-testid="preview-stage">
            {photos.length > 0 ? (
              <canvas
                ref={previewCanvasRef}
                className="canvas-frame"
                aria-label={`Live ${selectedRatio} photo composition preview`}
                data-testid="canvas-preview"
              />
            ) : (
              <div className="empty-state" data-testid="empty-photo-state">
                <div className="empty-art">
                  <ImagePlus size={31} strokeWidth={1.5} aria-hidden="true" />
                </div>
                <h2>Start with a photo you love.</h2>
                <p>
                  Add a few images, then make a layout that feels like yours.
                  Nothing leaves this browser.
                </p>
                <button
                  className="button-primary"
                  type="button"
                  onClick={openPicker}
                  data-testid="button-add-photos-empty"
                >
                  <ImagePlus size={15} aria-hidden="true" />
                  Add Photos
                </button>
              </div>
            )}
          </div>
          <div className="preview-foot">
            <span>
              Preview <strong>{selectedRatio}</strong>
            </span>
            <span data-testid="text-export-dimensions">
              Export size&nbsp;
              <strong>
                {dimensions.width.toLocaleString()} × {dimensions.height.toLocaleString()} px
              </strong>
            </span>
          </div>
        </div>

        <aside className="settings-panel" aria-label="Composition settings">
          <div className="settings-top">
            <h2>Fine-tune your frame</h2>
            <span className="settings-step">01 — 04</span>
          </div>

          <div className="field-block">
            <div className="field-heading">
              <span className="field-label">Canvas Ratio</span>
              <span className="field-value">{selectedRatio}</span>
            </div>
              <div className="ratio-grid" role="group" aria-label="Canvas Ratio">
              {RATIO_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  className={`choice-button${ratio === preset.value ? ' selected' : ''}`}
                  type="button"
                  aria-pressed={ratio === preset.value}
                  onClick={() => setRatio(preset.value)}
                  data-testid={`button-ratio-${preset.label.replace(':', '-')}`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="field-block">
            <div className="field-heading">
              <span className="field-label">Layout</span>
            </div>
            <div className="layout-list" role="group" aria-label="Photo layout">
              {LAYOUTS.map((item) => (
                <button
                  key={item}
                  className={`layout-option${layout === item ? ' selected' : ''}`}
                  type="button"
                  aria-pressed={layout === item}
                  onClick={() => setLayout(item)}
                  data-testid={`button-layout-${item.toLowerCase().replaceAll(' ', '-')}`}
                >
                  <span className="layout-icon" aria-hidden="true">
                    {getLayoutIcon(item)}
                  </span>
                  <span>{item}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="field-block">
            <div className="field-heading">
              <span className="field-label">Image fit</span>
            </div>
            <div className="segmented" role="group" aria-label="Image fit">
              <button
                className={fit === 'fit' ? 'selected' : ''}
                type="button"
                aria-pressed={fit === 'fit'}
                onClick={() => setFit('fit')}
                data-testid="button-fit-no-crop"
              >
                Fit / No Crop
              </button>
              <button
                className={fit === 'fill' ? 'selected' : ''}
                type="button"
                aria-pressed={fit === 'fill'}
                onClick={() => setFit('fill')}
                data-testid="button-fill-crop"
              >
                Fill / Crop
              </button>
            </div>
          </div>

          <div className="field-block">
            <div className="field-heading">
              <label htmlFor="outer-margin">Outer Margin</label>
              <span className="field-value" data-testid="text-margin-value">
                {margin}%
              </span>
            </div>
            <input
              id="outer-margin"
              className="slider-control"
              type="range"
              min="0"
              max="14"
              step="1"
              value={margin}
              onChange={(event) => setMargin(Number(event.currentTarget.value))}
              aria-label="Outer margin"
              data-testid="slider-outer-margin"
            />
          </div>

          <div className="field-block">
            <div className="field-heading">
              <label htmlFor="photo-gap">Gap</label>
              <span className="field-value" data-testid="text-gap-value">
                {gap}%
              </span>
            </div>
            <input
              id="photo-gap"
              className="slider-control"
              type="range"
              min="0"
              max="8"
              step="1"
              value={gap}
              onChange={(event) => setGap(Number(event.currentTarget.value))}
                aria-label="Gap"
              data-testid="slider-photo-gap"
            />
          </div>

          <div className="field-block toggle-row">
            <div className="toggle-copy">
              <strong>White background</strong>
              <span>
                {whiteBackground ? 'A clean white canvas' : 'Transparent canvas'}
              </span>
            </div>
            <button
              className="switch"
              type="button"
              role="switch"
              aria-checked={whiteBackground}
              aria-label="White background"
              onClick={() => setWhiteBackground((current) => !current)}
              data-testid="toggle-white-background"
            />
          </div>

          <PhotoList
            photos={photos}
            onAdd={openPicker}
            onMove={movePhoto}
            onRemove={removePhoto}
          />

          <input
            ref={fileInputRef}
            className="visually-hidden"
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            multiple
            onChange={handleFiles}
            data-testid="input-photo-files"
          />

          {error && (
            <p className="error-message" role="alert" data-testid="status-error">
              {error}
            </p>
          )}

          <div className="export-row">
            <button
              className="button-primary"
              type="button"
              disabled={!photos.length || exporting}
              onClick={() => void exportImage('jpg')}
              data-testid="button-export-jpg"
            >
              <Download size={14} aria-hidden="true" />
              {exporting ? 'Preparing…' : 'Export JPG'}
            </button>
            <button
              className="button-secondary"
              type="button"
              disabled={!photos.length || exporting}
              onClick={() => void exportImage('png')}
              data-testid="button-export-png"
            >
              <FileImage size={14} aria-hidden="true" />
              Export PNG
            </button>
          </div>
          <div className="preview-foot" style={{ paddingTop: 5 }}>
            <span className="preview-meta">
              <ShieldCheck size={13} aria-hidden="true" />
              Stays on your device
            </span>
            <span className="preview-meta">
              <Sparkles size={13} aria-hidden="true" />
              {longEdge.toLocaleString()} px
            </span>
          </div>
        </aside>
      </section>

      {notice && (
        <div className="toast-message" role="status" data-testid="status-notice">
          {notice}
        </div>
      )}
    </main>
  );
}

export default App;
