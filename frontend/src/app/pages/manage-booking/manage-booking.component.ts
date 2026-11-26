import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { BookingResponse } from '../../models/booking.models';
import { InrCurrencyPipe } from '../../pipes/inr-currency.pipe';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-manage-booking',
  standalone: true,
  imports: [ReactiveFormsModule, InrCurrencyPipe],
  template: `
    <section class="manage-wrapper">
      <h1>Manage Booking</h1>
      <p class="muted">Enter your booking reference and guest email to view or cancel your reservation.</p>

      <form [formGroup]="lookupForm" (ngSubmit)="onLookup()" class="card lookup-form">
        <div class="form-group">
          <label for="reference">Booking Reference</label>
          <input
            id="reference"
            type="text"
            class="form-control"
            formControlName="reference"
            placeholder="e.g. HB-A1B2C3D4"
          />
          @if (lookupForm.controls.reference.touched && lookupForm.controls.reference.invalid) {
            <span class="field-error">Booking reference is required.</span>
          }
        </div>

        <div class="form-group">
          <label for="email">Guest Email</label>
          <input
            id="email"
            type="email"
            class="form-control"
            formControlName="email"
            placeholder="you@example.com"
          />
          @if (lookupForm.controls.email.touched && lookupForm.controls.email.invalid) {
            <span class="field-error">Please enter a valid email address.</span>
          }
        </div>

        <button type="submit" class="btn btn-primary" [disabled]="loading() || lookupForm.invalid">
          {{ loading() ? 'Searching...' : 'Find Booking' }}
        </button>
      </form>

      @if (cancelSuccessMessage(); as successMsg) {
        <div class="card success-banner" role="status">{{ successMsg }}</div>
      }

      @if (booking(); as b) {
        <article class="card booking-card">
          <div class="booking-header">
            <div>
              <span class="badge" [class]="b.status === 'CONFIRMED' ? 'badge-success' : 'badge-danger'">
                {{ b.status }}
              </span>
              <h2>{{ b.hotelName }}</h2>
              <p class="muted">{{ b.hotelLocation }} &middot; Ref: <strong>{{ b.reference }}</strong></p>
            </div>

            <div class="total-box">
              <span class="muted">Total</span>
              <strong>{{ b.totalAmount | inr }}</strong>
            </div>
          </div>

          <dl class="details-grid">
            <div>
              <dt>Guest</dt>
              <dd>{{ b.guestName }} ({{ b.guestEmail }})</dd>
            </div>
            <div>
              <dt>Stay Dates</dt>
              <dd>{{ b.checkIn }} to {{ b.checkOut }} ({{ b.nights }} {{ b.nights === 1 ? 'night' : 'nights' }})</dd>
            </div>
          </dl>

          @if (b.status === 'CONFIRMED') {
            <div class="cancel-row">
              <button
                type="button"
                class="btn btn-danger"
                [disabled]="cancelling()"
                (click)="openCancelModal()"
              >
                {{ cancelling() ? 'Cancelling...' : 'Cancel Booking' }}
              </button>
            </div>
          }
        </article>
      }

      @if (showCancelModal() && booking(); as b) {
        <div class="modal-backdrop" (click)="closeCancelModal()">
          <div
            class="card modal-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-modal-title"
            (click)="$event.stopPropagation()"
          >
            <h2 id="cancel-modal-title">Cancel booking {{ b.reference }}?</h2>
            <p class="muted">
              This will cancel your stay at <strong>{{ b.hotelName }}</strong> ({{ b.checkIn }} to {{ b.checkOut }})
              and release the room back to inventory.
            </p>
            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" (click)="closeCancelModal()" [disabled]="cancelling()">
                Keep Booking
              </button>
              <button type="button" class="btn btn-danger" (click)="confirmCancel(b)" [disabled]="cancelling()">
                {{ cancelling() ? 'Cancelling...' : 'Confirm Cancel' }}
              </button>
            </div>
          </div>
        </div>
      }
    </section>
  `,
  styles: [`
    .manage-wrapper {
      max-width: 700px;
      margin: 0 auto;
    }

    .manage-wrapper h1 {
      margin: 0 0 0.35rem;
    }

    .lookup-form {
      display: grid;
      grid-template-columns: 1fr 1fr auto;
      gap: 1rem;
      align-items: end;
      margin: 1.25rem 0;
    }

    .booking-card {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .booking-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
    }

    .booking-header h2 {
      margin: 0.45rem 0 0.2rem;
      font-size: 1.3rem;
    }

    .booking-header p {
      margin: 0;
    }

    .total-box {
      text-align: right;
    }

    .total-box strong {
      display: block;
      font-size: 1.25rem;
      color: var(--primary);
    }

    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin: 0;
      padding-top: 0.75rem;
      border-top: 1px solid var(--border);
    }

    .details-grid dt {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-muted);
    }

    .details-grid dd {
      margin: 0.15rem 0 0;
    }

    .cancel-row {
      padding-top: 0.75rem;
      border-top: 1px solid var(--border);
    }

    .success-banner {
      margin-bottom: 16px;
      background: var(--success-soft);
      border-color: #bbf7d0;
      color: var(--success);
      font-weight: 600;
    }

    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(28, 25, 23, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      z-index: 1100;
    }

    .modal-dialog {
      max-width: 440px;
      width: 100%;
    }

    .modal-dialog h2 {
      margin: 0 0 8px;
      font-size: 1.25rem;
    }

    .modal-dialog p {
      margin: 0 0 20px;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }

    @media (max-width: 700px) {
      .lookup-form,
      .details-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ManageBookingComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  readonly booking = signal<BookingResponse | null>(null);
  readonly loading = signal(false);
  readonly cancelling = signal(false);
  readonly showCancelModal = signal(false);
  readonly cancelSuccessMessage = signal<string | null>(null);

  readonly lookupForm = this.fb.nonNullable.group({
    reference: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]]
  });

  ngOnInit(): void {
    const reference = this.route.snapshot.queryParamMap.get('reference');
    const email = this.route.snapshot.queryParamMap.get('email');
    if (reference && email) {
      this.lookupForm.setValue({ reference, email });
      this.onLookup();
    }
  }

  onLookup(): void {
    if (this.lookupForm.invalid) {
      this.lookupForm.markAllAsTouched();
      return;
    }

    const { reference, email } = this.lookupForm.getRawValue();
    this.loading.set(true);
    this.cancelSuccessMessage.set(null);
    this.api.getBooking(reference, email).subscribe({
      next: (data) => {
        this.booking.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.booking.set(null);
        this.loading.set(false);
      }
    });
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.showCancelModal() && !this.cancelling()) {
      this.closeCancelModal();
    }
  }

  openCancelModal(): void {
    this.showCancelModal.set(true);
  }

  closeCancelModal(): void {
    this.showCancelModal.set(false);
  }

  confirmCancel(current: BookingResponse): void {
    this.cancelling.set(true);
    this.api.cancelBooking(current.reference, current.guestEmail).subscribe({
      next: (updated) => {
        this.booking.set(updated);
        this.cancelling.set(false);
        this.showCancelModal.set(false);
        this.cancelSuccessMessage.set(
          `Booking ${updated.reference} has been cancelled and room availability has been released.`
        );
        this.toast.showSuccess('Your booking has been cancelled.');
      },
      error: () => {
        this.cancelling.set(false);
      }
    });
  }
}

