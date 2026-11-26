import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HotelImageComponent } from '../../components/hotel-image/hotel-image.component';
import { BookingResponse } from '../../models/booking.models';
import { InrCurrencyPipe } from '../../pipes/inr-currency.pipe';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-booking-confirmation',
  standalone: true,
  imports: [RouterLink, InrCurrencyPipe, HotelImageComponent],
  template: `
    @if (loading()) {
      <div class="card empty-state">Loading booking confirmation...</div>
    } @else {
      @if (booking(); as b) {
        <section class="card confirmation-card">
          <div class="confirmation-photo">
            <app-hotel-image
              [src]="b.hotelImageUrl"
              [alt]="b.hotelName + ' in ' + b.hotelLocation"
              [fallbackLabel]="b.hotelName"
              aspectRatio="16 / 7"
            />
          </div>
          <span class="badge" [class]="b.status === 'CONFIRMED' ? 'badge-success' : 'badge-danger'">
            {{ b.status }}
          </span>
          <h1>Booking Confirmed!</h1>
          <p class="muted">Keep your booking reference and email handy to view or cancel your reservation.</p>

          <div class="ref-box">
            <span class="muted">Booking Reference</span>
            <strong>{{ b.reference }}</strong>
          </div>

          <dl class="summary-grid">
            <div>
              <dt>Hotel</dt>
              <dd>{{ b.hotelName }} ({{ b.hotelLocation }})</dd>
            </div>
            <div>
              <dt>Guest</dt>
              <dd>{{ b.guestName }} &middot; {{ b.guestEmail }}</dd>
            </div>
            <div>
              <dt>Check-in</dt>
              <dd>{{ b.checkIn }}</dd>
            </div>
            <div>
              <dt>Check-out</dt>
              <dd>{{ b.checkOut }}</dd>
            </div>
            <div>
              <dt>Nights</dt>
              <dd>{{ b.nights }}</dd>
            </div>
            <div>
              <dt>Total Amount</dt>
              <dd><strong>{{ b.totalAmount | inr }}</strong></dd>
            </div>
          </dl>

          <div class="actions">
            <a routerLink="/" class="btn btn-secondary">Browse More Hotels</a>
            <a
              routerLink="/manage-booking"
              [queryParams]="{ reference: b.reference, email: b.guestEmail }"
              class="btn btn-primary"
            >
              Manage Booking
            </a>
          </div>
        </section>
      } @else {
        <div class="card empty-state">
          <p>Booking details not available. Look up your reservation using your reference and email.</p>
          <a routerLink="/manage-booking" class="btn btn-primary">Go to Manage Booking</a>
        </div>
      }
    }
  `,
  styles: [`
    .confirmation-card {
      max-width: 680px;
      margin: 0 auto;
    }

    .confirmation-card h1 {
      margin: 0.6rem 0 0.25rem;
    }

    .confirmation-photo {
      margin: -1.25rem -1.25rem 1rem;
      overflow: hidden;
      border-top-left-radius: var(--radius);
      border-top-right-radius: var(--radius);
    }

    .ref-box {
      margin: 1.25rem 0;
      padding: 1rem;
      border-radius: 8px;
      background: var(--surface-muted);
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .ref-box strong {
      font-size: 1.4rem;
      letter-spacing: 0.05em;
      color: var(--primary);
    }

    .summary-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin: 1.25rem 0;
    }

    .summary-grid dt {
      font-size: 0.8rem;
      color: var(--text-muted);
      font-weight: 600;
    }

    .summary-grid dd {
      margin: 0.15rem 0 0;
      font-size: 0.98rem;
    }

    .actions {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      padding-top: 1rem;
      border-top: 1px solid var(--border);
    }

    @media (max-width: 600px) {
      .summary-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class BookingConfirmationComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);

  readonly booking = signal<BookingResponse | null>(null);
  readonly loading = signal(false);

  ngOnInit(): void {
    const stateBooking = history.state?.booking as BookingResponse | undefined;
    if (stateBooking) {
      this.booking.set(stateBooking);
      return;
    }

    const reference = this.route.snapshot.paramMap.get('reference');
    const email = this.route.snapshot.queryParamMap.get('email');
    if (reference && email) {
      this.loading.set(true);
      this.api.getBooking(reference, email).subscribe({
        next: (data) => {
          this.booking.set(data);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        }
      });
    }
  }
}

