import { Injectable, signal } from '@angular/core';

export interface SavedBookingRef {
  reference: string;
  hotelName: string;
  checkIn: string;
  checkOut: string;
  email: string;
}

export interface GuestProfile {
  guestName: string;
  guestEmail: string;
  bookings: SavedBookingRef[];
}

const STORAGE_KEY = 'stayease_guest_profile';

@Injectable({ providedIn: 'root' })
export class GuestPreferencesService {
  readonly profile = signal<GuestProfile>(this.loadFromStorage());

  saveBooking(guestName: string, guestEmail: string, entry: SavedBookingRef): void {
    const current = this.profile();
    const filtered = current.bookings.filter(
      (b) => b.reference.toUpperCase() !== entry.reference.toUpperCase()
    );
    const updated: GuestProfile = {
      guestName: guestName.trim(),
      guestEmail: guestEmail.trim(),
      bookings: [entry, ...filtered].slice(0, 10)
    };
    this.persist(updated);
  }

  forgetAll(): void {
    const empty: GuestProfile = { guestName: '', guestEmail: '', bookings: [] };
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage access errors in restricted environments.
    }
    this.profile.set(empty);
  }

  private persist(profile: GuestProfile): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // Ignore storage quota/access errors.
    }
    this.profile.set(profile);
  }

  private loadFromStorage(): GuestProfile {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return { guestName: '', guestEmail: '', bookings: [] };
      }
      const parsed = JSON.parse(raw) as Partial<GuestProfile>;
      return {
        guestName: typeof parsed.guestName === 'string' ? parsed.guestName : '',
        guestEmail: typeof parsed.guestEmail === 'string' ? parsed.guestEmail : '',
        bookings: Array.isArray(parsed.bookings) ? parsed.bookings : []
      };
    } catch {
      return { guestName: '', guestEmail: '', bookings: [] };
    }
  }
}
