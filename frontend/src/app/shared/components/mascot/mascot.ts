import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Name shown wherever the mascot is introduced. */
export const MASCOT_NAME = 'Ledger';

/**
 * "Ledger", the Annualflow mascot: a softly tilted page with a folded corner,
 * two round eyes and tiny pill brows. Flat fills, no outlines. Inline SVG, reads at 24-28px.
 */
@Component({
  selector: 'app-mascot',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'mascot', '[class.animated]': 'animated()', '[style.--mascot-size.px]': 'size()' },
  template: `
    <svg viewBox="0 0 100 100" [attr.width]="size()" [attr.height]="size()"
         [attr.role]="label() ? 'img' : null" [attr.aria-label]="label() || null"
         [attr.aria-hidden]="label() ? null : 'true'" focusable="false">
      <g class="bob">
        <g transform="rotate(-7 50 50)">
          <path class="page" d="M38 8H58L80 30V74C80 84 74 92 62 92H38C28 92 20 84 20 74V26C20 16 28 8 38 8Z" />
          <path class="fold" d="M58 8L80 30H66C61 30 58 27 58 22Z" />
          <g class="eyes">
            <circle class="eye" cx="41" cy="52" r="5" />
            <circle class="eye" cx="60" cy="52" r="5" />
          </g>
          <g class="brows">
            <path class="brow" d="M38.5 42.5L43.5 41" />
            <path class="brow" d="M57.5 41L62.5 42.5" />
          </g>
        </g>
      </g>
    </svg>
  `,
  styles: `
    :host { display: inline-flex; width: var(--mascot-size); height: var(--mascot-size); flex-shrink: 0; line-height: 0; }
    svg { display: block; overflow: visible; }
    .page { fill: #8a8f98; }
    .fold { fill: #b4b9c2; }
    .eye { fill: #ffffff; }
    .brow { fill: none; stroke: #d8dce2; stroke-width: 2.6; stroke-linecap: round; }
    @media (prefers-reduced-motion: no-preference) {
      :host(.animated) .bob { animation: bob 3.6s ease-in-out infinite; }
      :host(.animated) .eyes { animation: blink 5.5s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
    }
    @keyframes bob { 50% { transform: translateY(-2.5px); } }
    @keyframes blink { 0%, 93%, 100% { transform: scaleY(1); } 96% { transform: scaleY(.1); } }
  `
})
export class MascotComponent {
  readonly size = input(28);
  readonly animated = input(false);
  /** Accessible name; empty = decorative. */
  readonly label = input('');
}
