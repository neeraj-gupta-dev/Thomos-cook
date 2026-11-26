import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ApiError } from '../models/booking.models';
import { ToastService } from '../services/toast.service';

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastService = inject(ToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let message = 'Something went wrong. Please try again.';

      if (error.status === 0) {
        message = 'Unable to reach the server. Please check if the backend is running.';
      } else if (error.error && typeof error.error === 'object') {
        const apiError = error.error as Partial<ApiError>;
        if (apiError.fieldErrors && apiError.fieldErrors.length > 0) {
          message = apiError.fieldErrors.map((fe) => `${fe.field}: ${fe.message}`).join(' | ');
        } else if (apiError.message) {
          message = apiError.message;
        }
      }

      toastService.showError(message);
      return throwError(() => error);
    })
  );
};

