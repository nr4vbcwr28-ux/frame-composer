import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from 'lucide-react';
import type { LoadedPhoto } from '../lib/composition';

interface PhotoListProps {
  photos: LoadedPhoto[];
  onAdd: () => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onRemove: (id: string) => void;
}

export function PhotoList({
  photos,
  onAdd,
  onMove,
  onRemove,
}: PhotoListProps) {
  return (
    <section className="photo-section" aria-label="Added photos">
      <div className="photo-section-head">
        <h3>Your photos</h3>
        <span className="photo-count" data-testid="text-photo-count">
          {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
        </span>
      </div>
      {photos.length > 0 && (
        <div className="photo-list" data-testid="photo-list">
          {photos.map((photo, index) => (
            <div
              className="photo-row"
              key={photo.id}
              data-testid={`photo-item-${index}`}
            >
              <img
                className="photo-thumb"
                src={photo.url}
                alt=""
                data-testid={`img-photo-${index}`}
              />
              <span className="photo-name" title={photo.name}>
                {photo.name}
              </span>
              <button
                className="photo-action"
                type="button"
                aria-label={`Move ${photo.name} up`}
                disabled={index === 0}
                onClick={() => onMove(photo.id, -1)}
                data-testid={`button-move-photo-up-${index}`}
              >
                <ArrowUp size={14} aria-hidden="true" />
              </button>
              <button
                className="photo-action remove"
                type="button"
                aria-label={`Remove ${photo.name}`}
                onClick={() => onRemove(photo.id)}
                data-testid={`button-remove-photo-${index}`}
              >
                <Trash2 size={14} aria-hidden="true" />
              </button>
              <button
                className="photo-action"
                type="button"
                aria-label={`Move ${photo.name} down`}
                disabled={index === photos.length - 1}
                onClick={() => onMove(photo.id, 1)}
                data-testid={`button-move-photo-down-${index}`}
              >
                <ArrowDown size={14} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        className="button-secondary upload-button"
        type="button"
        onClick={onAdd}
        data-testid="button-add-photos"
      >
        <ImagePlus size={15} aria-hidden="true" />
        Add photos
      </button>
    </section>
  );
}
