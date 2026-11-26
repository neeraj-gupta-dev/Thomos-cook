import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  AlternativeDateWindow,
  BookingResponse,
  CreateBookingRequest,
  HotelDetail,
  HotelSummary,
  QuoteRequest,
  QuoteResponse
} from '../models/booking.models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  searchHotels(location?: string, checkIn?: string, checkOut?: string): Observable<HotelSummary[]> {
    let params = new HttpParams();
    if (location?.trim()) {
      params = params.set('location', location.trim());
    }
    if (checkIn && checkOut) {
      params = params.set('checkIn', checkIn).set('checkOut', checkOut);
    }
    return this.http.get<HotelSummary[]>(`${this.baseUrl}/hotels`, { params });
  }

  getHotelDetails(id: number, checkIn?: string, checkOut?: string): Observable<HotelDetail> {
    let params = new HttpParams();
    if (checkIn && checkOut) {
      params = params.set('checkIn', checkIn).set('checkOut', checkOut);
    }
    return this.http.get<HotelDetail>(`${this.baseUrl}/hotels/${id}`, { params });
  }

  getHotelAlternatives(id: number, checkIn: string, checkOut: string): Observable<AlternativeDateWindow[]> {
    const params = new HttpParams().set('checkIn', checkIn).set('checkOut', checkOut);
    return this.http.get<AlternativeDateWindow[]>(`${this.baseUrl}/hotels/${id}/alternatives`, { params });
  }

  getQuote(payload: QuoteRequest): Observable<QuoteResponse> {
    return this.http.post<QuoteResponse>(`${this.baseUrl}/bookings/quote`, payload);
  }

  createBooking(payload: CreateBookingRequest): Observable<BookingResponse> {
    return this.http.post<BookingResponse>(`${this.baseUrl}/bookings`, payload);
  }

  getBooking(reference: string, email: string): Observable<BookingResponse> {
    const params = new HttpParams().set('email', email.trim());
    return this.http.get<BookingResponse>(
      `${this.baseUrl}/bookings/${encodeURIComponent(reference.trim())}`,
      { params }
    );
  }

  cancelBooking(reference: string, email: string): Observable<BookingResponse> {
    return this.http.post<BookingResponse>(
      `${this.baseUrl}/bookings/${encodeURIComponent(reference.trim())}/cancel`,
      { email: email.trim() }
    );
  }
}

