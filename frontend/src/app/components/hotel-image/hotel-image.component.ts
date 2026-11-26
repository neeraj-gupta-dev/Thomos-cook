import { Component, Input, signal } from '@angular/core';

@Component({
  selector: 'app-hotel-image',
  standalone: true,
  template: `
    <div class="hotel-photo-frame" [style.aspect-ratio]="aspectRatio">
      @if (src && !failed()) {
        <img
          [src]="src"
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
export class HotelImageComponent {
  @Input() src: string | null = null;
  @Input() alt = 'Hotel exterior view';
  @Input() fallbackLabel = 'Photo unavailable';
  @Input() aspectRatio = '16 / 10';

  readonly failed = signal(false);

  onError(): void {
    this.failed.set(true);
  }
}

