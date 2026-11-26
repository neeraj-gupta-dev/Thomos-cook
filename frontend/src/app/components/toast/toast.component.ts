import { Component, inject } from '@angular/core';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  template: `
    <div class="toast-stack" aria-live="polite">
      @for (msg of toastService.messages(); track msg.id) {
        <div class="toast" [class]="'toast toast-' + msg.type" role="alert">
          <span>{{ msg.text }}</span>
          <button
            type="button"
            class="toast-close"
            aria-label="Dismiss notification"
            (click)="toastService.dismiss(msg.id)"
          >
            &times;
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-stack {
      position: fixed;
      top: 1rem;
      right: 1rem;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-width: 380px;
      width: calc(100vw - 2rem);
    }

    .toast {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.85rem 1rem;
      border-radius: 8px;
      box-shadow: 0 10px 25px rgba(15, 23, 42, 0.15);
      font-size: 0.9rem;
      font-weight: 500;
    }

    .toast-error {
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }

    .toast-success {
      background: #f0fdf4;
      color: #166534;
      border: 1px solid #bbf7d0;
    }

    .toast-info {
      background: #f0fdfa;
      color: #115e59;
      border: 1px solid #99f6e4;
    }

    .toast-close {
      background: none;
      border: none;
      color: inherit;
      font-size: 1.2rem;
      line-height: 1;
      cursor: pointer;
      padding: 0;
    }
  `]
})
export class ToastComponent {
  readonly toastService = inject(ToastService);
}

