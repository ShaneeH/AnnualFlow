import { Component, computed, input } from '@angular/core';

import { EMPTY_VALUE, formatPercent, formatValue, ValueFormat } from '../../utils/number-format';

@Component({
    selector: 'app-kpi-card',
    standalone: true,
    templateUrl: './kpi-card.html',
    styleUrl: './kpi-card.css'
})
export class KpiCardComponent {

    title = input.required<string>();

    value = input.required<number | null>();

    change = input<number | null>(null);

    format = input<ValueFormat>('count');

    // All values go through the shared formatter used by the charts too.
    readonly displayValue = computed(() => formatValue(this.value(), this.format()));

    readonly displayChange = computed(() => {
        const change = this.change();
        return change === null ? null : formatPercent(Math.abs(change));
    });

    readonly empty = EMPTY_VALUE;
}
