import { Component, inject } from '@angular/core';

import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-toasts',
  standalone: true,
  template: `
    <div class="toast-stack" aria-live="polite" aria-atomic="false">
      @for (toast of toasts.toasts(); track toast.id) {
        <div class="toast" [class]="'toast toast-' + toast.kind" role="status">
          <div class="toast-text">
            <strong>{{ toast.title }}</strong>
            <span>{{ toast.message }}</span>
          </div>
          <button type="button" class="toast-close" aria-label="Dismiss notification" (click)="toasts.dismiss(toast.id)">×</button>
        </div>
      }
    </div>
  `,
  styles: `
    .toast-stack {
      position: fixed;
      right: 1rem;
      bottom: 1rem;
      z-index: 1100;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      width: min(380px, calc(100vw - 2rem));
    }
    .toast {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.75rem 0.9rem;
      border-radius: var(--radius-medium, 12px);
      border: 1px solid var(--border, #2a2a2e);
      border-left-width: 4px;
      background: var(--surface, #17171a);
      color: var(--primary, #fff);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
      animation: toast-in 0.2s ease;
    }
    .toast-success { border-left-color: var(--success, #22c55e); }
    .toast-warning { border-left-color: var(--warning, #facc15); }
    .toast-error { border-left-color: var(--danger, #ef4444); }
    .toast-info { border-left-color: var(--accent, #00a6ff); }
    .toast-text { display: flex; flex-direction: column; gap: 0.2rem; flex: 1; font-size: 0.88rem; }
    .toast-text span { color: var(--secondary, #b3b3b3); line-height: 1.4; }
    .toast-close { background: none; border: none; color: var(--secondary, #b3b3b3); font-size: 1.2rem; cursor: pointer; }
    @keyframes toast-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
    @media (prefers-reduced-motion: reduce) { .toast { animation: none; } }
  `
})
export class Toasts {
  readonly toasts = inject(ToastService);
}
