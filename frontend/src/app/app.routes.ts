import { Routes } from '@angular/router';
import { BookingConfirmationComponent } from './pages/booking-confirmation/booking-confirmation.component';
import { HotelDetailComponent } from './pages/hotel-detail/hotel-detail.component';
import { HotelListComponent } from './pages/hotel-list/hotel-list.component';
import { ManageBookingComponent } from './pages/manage-booking/manage-booking.component';

export const routes: Routes = [
  { path: '', component: HotelListComponent },
  { path: 'hotels/:id', component: HotelDetailComponent },
  { path: 'booking/confirmation/:reference', component: BookingConfirmationComponent },
  { path: 'manage-booking', component: ManageBookingComponent },
  { path: '**', redirectTo: '' }
];

