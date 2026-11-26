export interface HotelSummary {
  id: number;
  name: string;
  location: string;
  description: string;
  amenities: string[];
  imageUrl: string | null;
  pricePerNight: number;
  totalRooms: number;
  availableRooms: number | null;
  nights: number | null;
  totalPrice: number | null;
}

export interface NightlyAvailability {
  date: string;
  availableRooms: number;
}

export interface HotelDetail extends HotelSummary {
  nightlyAvailability: NightlyAvailability[];
}

export interface AlternativeDateWindow {
  checkIn: string;
  checkOut: string;
  nights: number;
  availableRooms: number;
  totalPrice: number;
}

export interface CityDateSuggestion {
  hotelId: number;
  hotelName: string;
  location: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  availableRooms: number;
  totalPrice: number;
}

export interface SearchSuggestionsResponse {
  sameCityAlternatives: CityDateSuggestion[];
  otherCityHotels: HotelSummary[];
}

export interface QuoteRequest {
  hotelId: number;
  checkIn: string;
  checkOut: string;
}

export interface QuoteResponse {
  hotelId: number;
  hotelName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  pricePerNight: number;
  totalAmount: number;
  available: boolean;
}

export interface CreateBookingRequest {
  hotelId: number;
  guestName: string;
  guestEmail: string;
  checkIn: string;
  checkOut: string;
}

export type BookingStatus = 'CONFIRMED' | 'CANCELLED';

export interface BookingResponse {
  reference: string;
  hotelId: number;
  hotelName: string;
  hotelLocation: string;
  hotelImageUrl: string | null;
  guestName: string;
  guestEmail: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  pricePerNight: number;
  totalAmount: number;
  status: BookingStatus;
  createdAt: string;
  cancelledAt: string | null;
}

export interface FieldErrorDetail {
  field: string;
  message: string;
}

export interface ApiError {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  fieldErrors: FieldErrorDetail[];
}

