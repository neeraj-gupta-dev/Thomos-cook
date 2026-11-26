import { Component, OnInit, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HotelImageComponent } from '../../components/hotel-image/hotel-image.component';
import { AlternativeDateWindow, HotelSummary } from '../../models/booking.models';
import { InrCurrencyPipe } from '../../pipes/inr-currency.pipe';
import { ApiService } from '../../services/api.service';

function dateRangeValidator(today: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const checkIn = group.get('checkIn')?.value as string;
    const checkOut = group.get('checkOut')?.value as string;

    if (!checkIn && !checkOut) {
      return null;
    }
    if (!checkIn || !checkOut) {
      return { incompleteDates: 'Please select both check-in and check-out dates.' };
    }
    if (checkIn < today) {
      return { pastCheckIn: 'Check-in date cannot be in the past.' };
    }
    if (checkOut <= checkIn) {
      return { invalidRange: 'Check-out date must be after check-in date.' };
    }
    return null;
  };
}

@Component({
  selector: 'app-hotel-list',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, InrCurrencyPipe, HotelImageComponent],
  template: `
    <section class="hero">
      <h1>Available hotels</h1>

      <form [formGroup]="searchForm" (ngSubmit)="onSearch()" class="card search-bar">
        <div class="form-group">
          <label for="location">City</label>
          <input
            id="location"
            type="text"
            class="form-control"
            formControlName="location"
            placeholder="e.g. Mumbai, Goa, Delhi, Jaipur"
          />
        </div>

        <div class="form-group">
          <label for="checkIn">Check-in</label>
          <input
            id="checkIn"
            type="date"
            class="form-control"
            formControlName="checkIn"
            [min]="today"
          />
        </div>

        <div class="form-group">
          <label for="checkOut">Check-out</label>
          <input
            id="checkOut"
            type="date"
            class="form-control"
            formControlName="checkOut"
            [min]="searchForm.controls.checkIn.value || today"
          />
        </div>

        <div class="search-actions">
          <button type="submit" class="btn btn-primary" [disabled]="loading() || searchForm.invalid">
            {{ loading() ? 'Searching...' : 'Search' }}
          </button>
          <button type="button" class="btn btn-secondary" (click)="onReset()" [disabled]="loading()">
            Clear
          </button>
        </div>

        @if (dateErrorMessage(); as dateErr) {
          <div class="field-error search-error">{{ dateErr }}</div>
        }
      </form>
    </section>

    <section class="results">
      @if (loading()) {
        <div class="hotel-grid" aria-label="Loading hotels">
          @for (item of [1, 2, 3]; track item) {
            <div class="card skeleton-card">
              <div class="skeleton-photo"></div>
              <div class="skeleton-body">
                <div class="skeleton-line short"></div>
                <div class="skeleton-line title"></div>
                <div class="skeleton-line"></div>
                <div class="skeleton-line"></div>
              </div>
            </div>
          }
        </div>
      } @else if (hotels().length === 0) {
        <div class="card empty-state">
          No hotels found. Try another city or clear the filters.
        </div>
      } @else {
        <div class="hotel-grid">
          @for (hotel of hotels(); track hotel.id) {
            <article class="card hotel-card">
              <app-hotel-image
                [src]="hotel.imageUrl"
                [alt]="hotel.name + ' in ' + hotel.location"
                [fallbackLabel]="hotel.name"
              />
              <div class="hotel-card-body">
              <div class="hotel-card-header">
                <div>
                  <span class="badge badge-muted">{{ hotel.location }}</span>
                  <h2>{{ hotel.name }}</h2>
                </div>
                <div class="price-tag">
                  <strong>{{ hotel.pricePerNight | inr }}</strong>
                  <span class="muted">/ night</span>
                </div>
              </div>

              <p class="hotel-desc">{{ hotel.description }}</p>

              <div class="amenities">
                @for (amenity of hotel.amenities.slice(0, 4); track amenity) {
                  <span class="amenity-chip">{{ amenity }}</span>
                }
              </div>

              @if (hotel.availableRooms === 0 && alternativesFor(hotel.id).length > 0) {
                <div class="alt-section">
                  <span class="muted">Try nearby available dates:</span>
                  <div class="alt-chips">
                    @for (alt of alternativesFor(hotel.id); track alt.checkIn) {
                      <button
                        type="button"
                        class="alt-chip"
                        (click)="applyAlternativeDates(alt)"
                      >
                        {{ alt.checkIn }} &rarr; {{ alt.checkOut }}
                      </button>
                    }
                  </div>
                </div>
              }

              <div class="hotel-card-footer">
                <div class="availability-info">
                  @if (hotel.availableRooms !== null) {
                    @if (hotel.availableRooms > 0) {
                      <span class="badge badge-success">
                        {{ hotel.availableRooms }} {{ hotel.availableRooms === 1 ? 'room' : 'rooms' }} left
                      </span>
                    } @else {
                      <span class="badge badge-danger">Sold out for dates</span>
                    }
                    @if (hotel.totalPrice !== null && hotel.nights !== null) {
                      <span class="total-preview">
                        Total: <strong>{{ hotel.totalPrice | inr }}</strong>
                        ({{ hotel.nights }} {{ hotel.nights === 1 ? 'night' : 'nights' }})
                      </span>
                    }
                  } @else {
                    <span class="muted">{{ hotel.totalRooms }} rooms total &middot; Select dates for live availability</span>
                  }
                </div>

                <a
                  class="btn btn-primary"
                  [routerLink]="['/hotels', hotel.id]"
                  [queryParams]="dateQueryParams()"
                >
                  View &amp; Book
                </a>
              </div>
              </div>
            </article>
          }
        </div>
      }
    </section>
  `,
  styles: [`
    .hero {
      margin-bottom: 2rem;
    }

    .hero h1 {
      margin: 0 0 0.35rem;
      font-size: 1.9rem;
    }

    .hero p {
      margin: 0 0 1.25rem;
    }

    .search-bar {
      display: grid;
      grid-template-columns: 1.4fr 1fr 1fr auto;
      gap: 1rem;
      align-items: end;
    }

    .search-actions {
      display: flex;
      gap: 0.5rem;
    }

    .search-error {
      grid-column: 1 / -1;
    }

    .hotel-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1.25rem;
    }

    .hotel-card {
      display: flex;
      flex-direction: column;
      padding: 0;
      overflow: hidden;
    }

    .hotel-card-body {
      display: flex;
      flex-direction: column;
      gap: 0.9rem;
      padding: 1.25rem;
      flex: 1;
    }

    .hotel-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.75rem;
    }

    .hotel-card-header h2 {
      margin: 0.4rem 0 0;
      font-size: 1.2rem;
    }

    .price-tag {
      text-align: right;
      white-space: nowrap;
    }

    .price-tag strong {
      font-size: 1.15rem;
      color: var(--primary);
    }

    .price-tag span {
      display: block;
      font-size: 0.8rem;
    }

    .hotel-desc {
      margin: 0;
      color: var(--text-muted);
      font-size: 0.92rem;
      flex: 1;
    }

    .amenities {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }

    .amenity-chip {
      font-size: 0.76rem;
      padding: 0.2rem 0.55rem;
      border-radius: 6px;
      background: var(--surface-muted);
      color: var(--text-muted);
    }

    .hotel-card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px solid var(--border);
    }

    .availability-info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      font-size: 0.85rem;
    }

    .total-preview {
      color: var(--text);
    }

    .alt-section {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      font-size: 0.82rem;
    }

    .alt-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
    }

    .alt-chip {
      border: 1px solid var(--primary);
      background: var(--primary-soft);
      color: var(--primary-hover);
      border-radius: 999px;
      padding: 0.25rem 0.6rem;
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
    }

    .alt-chip:hover {
      background: var(--primary);
      color: #ffffff;
    }

    .skeleton-card {
      padding: 0;
      overflow: hidden;
    }

    .skeleton-photo {
      aspect-ratio: 16 / 10;
      background: var(--surface-muted);
    }

    .skeleton-body {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .skeleton-line {
      height: 14px;
      background: var(--surface-muted);
      border-radius: var(--radius-sm);
    }

    .skeleton-line.short {
      width: 35%;
    }

    .skeleton-line.title {
      width: 70%;
      height: 20px;
    }

    @media (max-width: 780px) {
      .search-bar {
        grid-template-columns: 1fr;
      }

      .search-actions {
        justify-content: flex-start;
      }
    }
  `]
})
export class HotelListComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);

  readonly today = new Date().toISOString().split('T')[0];
  readonly hotels = signal<HotelSummary[]>([]);
  readonly alternativesMap = signal<Record<number, AlternativeDateWindow[]>>({});
  readonly loading = signal(false);

  readonly searchForm = this.fb.nonNullable.group(
    {
      location: [''],
      checkIn: [''],
      checkOut: ['']
    },
    { validators: dateRangeValidator(this.today) }
  );

  ngOnInit(): void {
    this.loadHotels();
  }

  dateErrorMessage(): string | null {
    const errors = this.searchForm.errors;
    if (!errors) {
      return null;
    }
    return errors['incompleteDates'] || errors['pastCheckIn'] || errors['invalidRange'] || null;
  }

  onSearch(): void {
    if (this.searchForm.invalid) {
      this.searchForm.markAllAsTouched();
      return;
    }
    this.loadHotels();
  }

  onReset(): void {
    this.searchForm.reset({ location: '', checkIn: '', checkOut: '' });
    this.loadHotels();
  }

  dateQueryParams(): Record<string, string> {
    const { checkIn, checkOut } = this.searchForm.getRawValue();
    return checkIn && checkOut ? { checkIn, checkOut } : {};
  }

  alternativesFor(hotelId: number): AlternativeDateWindow[] {
    return this.alternativesMap()[hotelId] ?? [];
  }

  applyAlternativeDates(alt: AlternativeDateWindow): void {
    this.searchForm.patchValue({
      checkIn: alt.checkIn,
      checkOut: alt.checkOut
    });
    this.loadHotels();
  }

  private loadHotels(): void {
    const { location, checkIn, checkOut } = this.searchForm.getRawValue();
    this.loading.set(true);
    this.alternativesMap.set({});
    this.api.searchHotels(location, checkIn || undefined, checkOut || undefined).subscribe({
      next: (data) => {
        this.hotels.set(data);
        this.loading.set(false);
        if (checkIn && checkOut) {
          for (const hotel of data) {
            if (hotel.availableRooms === 0) {
              this.api.getHotelAlternatives(hotel.id, checkIn, checkOut).subscribe({
                next: (alts) => {
                  this.alternativesMap.update((prev) => ({ ...prev, [hotel.id]: alts }));
                }
              });
            }
          }
        }
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }
}

