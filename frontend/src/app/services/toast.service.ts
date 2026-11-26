import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: number;
  type: 'error' | 'success' | 'info';
  text: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  readonly messages = signal<ToastMessage[]>([]);

  showError(text: string): void {
    this.add('error', text);
  }

  showSuccess(text: string): void {
    this.add('success', text);
  }

  dismiss(id: number): void {
    this.messages.update((items) => items.filter((item) => item.id !== id));
  }

  private add(type: ToastMessage['type'], text: string): void {
    const id = this.nextId++;
    this.messages.update((items) => [...items, { id, type, text }]);
    setTimeout(() => this.dismiss(id), 5000);
  }
}

