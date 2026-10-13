import { Pipe, PipeTransform } from '@angular/core';

<<<<<<< HEAD
=======
import { formatMoney } from '../utils/number-format';

/** Template wrapper around the shared money formatter (e.g. €248.6m). */
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
@Pipe({
  name: 'currencyFormat',
  standalone: true
})
export class CurrencyFormatPipe implements PipeTransform {
<<<<<<< HEAD

  // Keeps large financial values compact and easier to scan.
  transform(value: number | null | undefined): string {
    if (value == null) return '—';

    const absoluteValue = Math.abs(value);

    if (absoluteValue >= 1_000_000_000) {
      return `€${(value / 1_000_000_000).toFixed(2)}B`;
    }

    if (absoluteValue >= 1_000_000) {
      return `€${(value / 1_000_000).toFixed(2)}M`;
    }

    if (absoluteValue >= 1_000) {
      return `€${(value / 1_000).toFixed(1)}K`;
    }

    return `€${value.toLocaleString()}`;
  }
}
=======
  transform(value: number | null | undefined): string {
    return formatMoney(value);
  }
}
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
