import { Routes } from '@angular/router';
import { BookingConfirmationComponent } from './pages/booking-confirmation/booking-confirmation.component';
import { HotelDetailComponent } from './pages/hotel-detail/hotel-detail.component';
import { HotelListComponent } from './pages/hotel-list/hotel-list.component';
import { ManageBookingComponent } from './pages/manage-booking/manage-booking.component';
import { NotFoundComponent } from './pages/not-found/not-found.component';

export const routes: Routes = [
  { path: '', component: HotelListComponent, title: 'Hotels — StayEase' },
  { path: 'hotels/:id', component: HotelDetailComponent, title: 'Hotel Details — StayEase' },
  {
    path: 'booking/confirmation/:reference',
    component: BookingConfirmationComponent,
    title: 'Booking Confirmation — StayEase'
  },
  { path: 'manage-booking', component: ManageBookingComponent, title: 'Manage Booking — StayEase' },
  { path: '**', component: NotFoundComponent, title: 'Page Not Found — StayEase' }
];
