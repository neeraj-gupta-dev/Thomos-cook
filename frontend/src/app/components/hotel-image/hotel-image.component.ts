import { Component, Input, OnChanges, signal } from '@angular/core';

@Component({
  selector: 'app-hotel-image',
  standalone: true,
  template: `
    <div class="hotel-photo-frame" [style.aspect-ratio]="aspectRatio">
      @if (resolvedSrc() && !failed()) {
        <img
          [src]="resolvedSrc()"
          [alt]="alt"
          loading="lazy"
          (error)="onError()"
        />
      } @else {
        <div class="photo-fallback" role="img" [attr.aria-label]="alt">
          <span>{{ fallbackLabel }}</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .hotel-photo-frame {
      width: 100%;
      overflow: hidden;
      background: var(--surface-muted);
      border-bottom: 1px solid var(--border);
    }

    .hotel-photo-frame img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .photo-fallback {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      background: #eceae4;
      color: #6b665e;
      font-size: 0.85rem;
      font-weight: 500;
      text-align: center;
    }
  `]
})
export class HotelImageComponent implements OnChanges {
  @Input() src: string | null = null;
  @Input() hotelId?: number;
  @Input() alt = 'Hotel exterior view';
  @Input() fallbackLabel = 'Photo unavailable';
  @Input() aspectRatio = '16 / 10';

  readonly failed = signal(false);

  ngOnChanges(): void {
    this.failed.set(false);
  }

  resolvedSrc(): string | null {
    if (this.src && this.src.trim().length > 0) {
      return this.src;
    }
    if (this.hotelId && this.hotelId > 0) {
      const index = ((this.hotelId - 1) % 6) + 1;
      return `/assets/hotels/hotel-${index}.jpg`;
    }
    return null;
  }

  onError(): void {
    this.failed.set(true);
  }
}
