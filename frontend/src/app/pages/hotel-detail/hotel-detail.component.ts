import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HotelImageComponent } from '../../components/hotel-image/hotel-image.component';
import { AlternativeDateWindow, HotelDetail, QuoteResponse } from '../../models/booking.models';
import { InrCurrencyPipe } from '../../pipes/inr-currency.pipe';
import { ApiService } from '../../services/api.service';
import { GuestPreferencesService } from '../../services/guest-preferences.service';
import { MAX_STAY_NIGHTS, calculateNights, getLocalTodayIso } from '../../utils/date.utils';

@Component({
  selector: 'app-hotel-detail',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, InrCurrencyPipe, HotelImageComponent],
  template: `
    <div class="back-link">
      <a routerLink="/">&larr; Back to hotels</a>
    </div>

    @if (loading()) {
      <div class="card empty-state">Loading hotel details...</div>
    } @else {
      @if (hotel(); as h) {
        <div class="detail-layout">
          <section class="card hotel-info">
            <div class="detail-photo">
              <app-hotel-image
                [src]="h.imageUrl"
                [alt]="h.name + ' in ' + h.location"
                [fallbackLabel]="h.name"
                aspectRatio="16 / 9"
              />
            </div>
            <span class="badge badge-muted">{{ h.location }}</span>
            <h1>{{ h.name }}</h1>
            <p class="price-line">
              <strong>{{ h.pricePerNight | inr }}</strong>
              <span class="muted">per night &middot; {{ h.totalRooms }} rooms total</span>
            </p>
            @if (h.availableRooms !== null) {
              <p class="rooms-left-line">
                @if (h.availableRooms > 0) {
                  <span class="badge badge-success">
                    {{ h.availableRooms }} {{ h.availableRooms === 1 ? 'room' : 'rooms' }} left for selected dates
                  </span>
                } @else {
                  <span class="badge badge-danger">Sold out for selected dates</span>
                }
              </p>
            }
            <p class="description">{{ h.description }}</p>

            <h3>Amenities</h3>
            <div class="amenities">
              @for (amenity of h.amenities; track amenity) {
                <span class="amenity-chip">{{ amenity }}</span>
              }
            </div>

            @if (h.nightlyAvailability.length > 0) {
              <h3>Nightly Availability</h3>
              <div class="nightly-grid">
                @for (night of h.nightlyAvailability; track night.date) {
                  <div class="night-pill" [class.night-sold-out]="night.availableRooms === 0">
                    <span>{{ night.date }}</span>
                    <strong>{{ night.availableRooms }} left</strong>
                  </div>
                }
              </div>
            }
          </section>

          <section class="card booking-panel">
            <h2>Book your stay</h2>

            <form [formGroup]="bookingForm" (ngSubmit)="onConfirmBooking()" class="booking-form">
              <div class="date-row">
                <div class="form-group">
                  <label for="checkIn">Check-in</label>
                  <input
                    id="checkIn"
                    type="date"
                    class="form-control"
                    formControlName="checkIn"
                    [min]="today"
                    (change)="onDatesChanged()"
                  />
                  @if (bookingForm.controls.checkIn.touched && bookingForm.controls.checkIn.invalid) {
                    <span class="field-error">Check-in date is required.</span>
                  }
                </div>

                <div class="form-group">
                  <label for="checkOut">Check-out</label>
                  <input
                    id="checkOut"
                    type="date"
                    class="form-control"
                    formControlName="checkOut"
                    [min]="bookingForm.controls.checkIn.value || today"
                    (change)="onDatesChanged()"
                  />
                  @if (bookingForm.controls.checkOut.touched && bookingForm.controls.checkOut.invalid) {
                    <span class="field-error">Check-out date is required.</span>
                  }
                </div>
              </div>
              @if (dateRangeError(); as dateErr) {
                <span class="field-error">{{ dateErr }}</span>
              }

              @if (quoteLoading()) {
                <div class="quote-box muted">Calculating quote...</div>
              } @else {
                @if (quote(); as q) {
                  <div class="quote-box">
                    <div class="quote-row">
                      <span>{{ q.nights }} {{ q.nights === 1 ? 'night' : 'nights' }} &times; {{ q.pricePerNight | inr }}</span>
                      <strong>{{ q.totalAmount | inr }}</strong>
                    </div>
                    <div class="quote-status">
                      @if (q.available) {
                        <span class="badge badge-success">Available</span>
                      } @else {
                        <span class="badge badge-danger">Sold out for selected dates</span>
                      }
                    </div>
                  </div>
                }
              }

              @if (alternatives().length > 0) {
                <div class="alternatives-box">
                  <span class="muted">Flexible date suggestions:</span>
                  <div class="alt-chips">
                    @for (alt of alternatives(); track alt.checkIn) {
                      <button
                        type="button"
                        class="alt-chip"
                        (click)="applyAlternative(alt)"
                      >
                        {{ alt.checkIn }} &rarr; {{ alt.checkOut }}
                        ({{ alt.availableRooms }} left)
                      </button>
                    }
                  </div>
                </div>
              }

              <div class="form-group">
                <label for="guestName">Guest Full Name</label>
                <input
                  id="guestName"
                  type="text"
                  class="form-control"
                  formControlName="guestName"
                  placeholder="e.g. Ananya Sharma"
                />
                @if (bookingForm.controls.guestName.touched && bookingForm.controls.guestName.invalid) {
                  <span class="field-error">Guest name is required.</span>
                }
              </div>

              <div class="form-group">
                <label for="guestEmail">Guest Email</label>
                <input
                  id="guestEmail"
                  type="email"
                  class="form-control"
                  formControlName="guestEmail"
                  placeholder="you@example.com"
                />
                @if (bookingForm.controls.guestEmail.touched && bookingForm.controls.guestEmail.invalid) {
                  <span class="field-error">Please enter a valid email address.</span>
                }
              </div>

              <button
                type="submit"
                class="btn btn-primary"
                [disabled]="submitting() || bookingForm.invalid || (quote() !== null && !quote()!.available)"
              >
                {{ submitting() ? 'Confirming...' : 'Confirm Booking' }}
              </button>
            </form>
          </section>
        </div>
      }
    }
  `,
  styles: [`
    .back-link {
      margin-bottom: 1rem;
      font-size: 0.95rem;
    }

    .detail-layout {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 1.5rem;
      align-items: start;
    }

    .hotel-info h1 {
      margin: 0.5rem 0 0.4rem;
      font-size: 1.7rem;
    }

    .detail-photo {
      margin: -1.25rem -1.25rem 1rem;
      overflow: hidden;
      border-top-left-radius: var(--radius);
      border-top-right-radius: var(--radius);
    }

    .price-line {
      margin: 0 0 1rem;
      font-size: 1.05rem;
    }

    .price-line strong {
      color: var(--primary);
      font-size: 1.25rem;
      margin-right: 0.35rem;
    }

    .description {
      color: var(--text-muted);
      margin-bottom: 1.25rem;
    }

    .hotel-info h3 {
      margin: 1.25rem 0 0.6rem;
      font-size: 1rem;
    }

    .amenities {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
    }

    .amenity-chip {
      font-size: 0.82rem;
      padding: 0.25rem 0.65rem;
      border-radius: 6px;
      background: var(--surface-muted);
      color: var(--text-muted);
    }

    .nightly-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 0.5rem;
    }

    .night-pill {
      padding: 0.45rem 0.6rem;
      border: 1px solid var(--border);
      border-radius: 8px;
      font-size: 0.82rem;
      display: flex;
      justify-content: space-between;
      background: var(--bg);
    }

    .night-sold-out {
      background: var(--danger-soft);
      border-color: #fecaca;
      color: var(--danger);
    }

    .booking-panel h2 {
      margin: 0 0 1rem;
      font-size: 1.25rem;
    }

    .booking-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .date-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }

    .quote-box {
      padding: 0.85rem;
      border-radius: 8px;
      background: var(--surface-muted);
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }

    .quote-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.95rem;
    }

    .alternatives-box {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
      font-size: 0.85rem;
    }

    .alt-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
    }

    .alt-chip {
      border: 1px solid var(--primary);
      background: var(--primary-soft);
      color: var(--primary-hover);
      border-radius: 999px;
      padding: 0.35rem 0.75rem;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
    }

    .alt-chip:hover {
      background: var(--primary);
      color: #ffffff;
    }

    @media (max-width: 820px) {
      .detail-layout {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class HotelDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly guestPrefs = inject(GuestPreferencesService);

  readonly today = getLocalTodayIso();
  readonly hotel = signal<HotelDetail | null>(null);
  readonly quote = signal<QuoteResponse | null>(null);
  readonly alternatives = signal<AlternativeDateWindow[]>([]);
  readonly loading = signal(true);
  readonly quoteLoading = signal(false);
  readonly submitting = signal(false);

  private hotelId = 0;

  readonly bookingForm = this.fb.nonNullable.group({
    checkIn: ['', Validators.required],
    checkOut: ['', Validators.required],
    guestName: ['', [Validators.required, Validators.maxLength(150)]],
    guestEmail: ['', [Validators.required, Validators.email]]
  });

  ngOnInit(): void {
    this.hotelId = Number(this.route.snapshot.paramMap.get('id'));
    const checkIn = this.route.snapshot.queryParamMap.get('checkIn') ?? '';
    const checkOut = this.route.snapshot.queryParamMap.get('checkOut') ?? '';
    const saved = this.guestPrefs.profile();

    this.bookingForm.patchValue({
      ...(checkIn && checkOut ? { checkIn, checkOut } : {}),
      ...(saved.guestName ? { guestName: saved.guestName } : {}),
      ...(saved.guestEmail ? { guestEmail: saved.guestEmail } : {})
    });

    this.loadHotel(checkIn || undefined, checkOut || undefined);
    if (checkIn && checkOut) {
      this.fetchQuote(checkIn, checkOut);
    }
  }

  dateRangeError(): string | null {
    const { checkIn, checkOut } = this.bookingForm.getRawValue();
    if (!checkIn || !checkOut) {
      return null;
    }
    if (checkIn < this.today) {
      return 'Check-in date cannot be in the past.';
    }
    if (checkOut <= checkIn) {
      return 'Check-out date must be after check-in date.';
    }
    if (calculateNights(checkIn, checkOut) > MAX_STAY_NIGHTS) {
      return `Stay cannot exceed ${MAX_STAY_NIGHTS} nights.`;
    }
    return null;
  }

  onDatesChanged(): void {
    const { checkIn, checkOut } = this.bookingForm.getRawValue();
    if (checkIn && checkOut && !this.dateRangeError()) {
      this.loadHotel(checkIn, checkOut);
      this.fetchQuote(checkIn, checkOut);
    } else {
      this.quote.set(null);
    }
  }

  onConfirmBooking(): void {
    if (this.bookingForm.invalid || this.dateRangeError()) {
      this.bookingForm.markAllAsTouched();
      return;
    }

    const { checkIn, checkOut, guestName, guestEmail } = this.bookingForm.getRawValue();
    this.submitting.set(true);

    this.api.createBooking({
      hotelId: this.hotelId,
      guestName,
      guestEmail,
      checkIn,
      checkOut
    }).subscribe({
      next: (booking) => {
        this.guestPrefs.saveBooking(booking.guestName, booking.guestEmail, {
          reference: booking.reference,
          hotelName: booking.hotelName,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          email: booking.guestEmail
        });
        this.submitting.set(false);
        this.router.navigate(['/booking/confirmation', booking.reference], {
          queryParams: { email: booking.guestEmail },
          state: { booking }
        });
      },
      error: () => {
        this.submitting.set(false);
      }
    });
  }

  private loadHotel(checkIn?: string, checkOut?: string): void {
    this.api.getHotelDetails(this.hotelId, checkIn, checkOut).subscribe({
      next: (data) => {
        this.hotel.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  private fetchQuote(checkIn: string, checkOut: string): void {
    this.quoteLoading.set(true);
    this.alternatives.set([]);
    this.api.getQuote({ hotelId: this.hotelId, checkIn, checkOut }).subscribe({
      next: (q) => {
        this.quote.set(q);
        this.quoteLoading.set(false);
        if (!q.available) {
          this.api.getHotelAlternatives(this.hotelId, checkIn, checkOut).subscribe({
            next: (alts) => this.alternatives.set(alts)
          });
        }
      },
      error: () => {
        this.quote.set(null);
        this.quoteLoading.set(false);
      }
    });
  }

  applyAlternative(alt: AlternativeDateWindow): void {
    this.bookingForm.patchValue({
      checkIn: alt.checkIn,
      checkOut: alt.checkOut
    });
    this.onDatesChanged();
  }
}

