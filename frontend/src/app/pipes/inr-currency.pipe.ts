import { Pipe, PipeTransform } from '@angular/core';

const INR_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
});

@Pipe({
  name: 'inr',
  standalone: true
})
export class InrCurrencyPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return '';
    }
    return INR_FORMATTER.format(value);
  }
}
