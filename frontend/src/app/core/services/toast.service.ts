import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'warning' | 'error' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  message: string;
}

/** Small app-wide notification queue. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 0;
  readonly toasts = signal<Toast[]>([]);

  show(kind: ToastKind, title: string, message: string, durationMs = 6000): number {
    const id = ++this.nextId;
    this.toasts.update(list => [...list, { id, kind, title, message }].slice(-4));

    if (durationMs > 0) {
      setTimeout(() => this.dismiss(id), durationMs);
    }
    return id;
  }

  dismiss(id: number): void {
    this.toasts.update(list => list.filter(toast => toast.id !== id));
  }
}
