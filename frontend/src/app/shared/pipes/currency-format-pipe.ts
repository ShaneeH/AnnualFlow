import { Pipe, PipeTransform } from '@angular/core';

import { formatMoney } from '../utils/number-format';

/** Template wrapper around the shared money formatter (e.g. €248.6m). */
@Pipe({
  name: 'currencyFormat',
  standalone: true
})
export class CurrencyFormatPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return formatMoney(value);
  }
}
