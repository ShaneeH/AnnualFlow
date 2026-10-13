import { Component, computed, input } from '@angular/core';

/** Google-style round avatar showing the first letter of the name (or email). Neutral fill, white letter. */
@Component({
  selector: 'app-letter-avatar',
  template: `<span class="letter-avatar" [style.width.px]="size()" [style.height.px]="size()"
    [style.font-size.px]="size() * 0.45" aria-hidden="true">{{ letter() }}</span>`,
  styles: `
    :host { display: inline-flex; }
    .letter-avatar {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: #3f3f46;
      color: #ffffff;
      font-weight: 600;
      line-height: 1;
      user-select: none;
    }
  `
})
export class LetterAvatar {
  readonly name = input<string | null | undefined>(null);
  readonly size = input(32);
  readonly letter = computed(() => (this.name()?.trim().charAt(0) || '?').toUpperCase());
}
