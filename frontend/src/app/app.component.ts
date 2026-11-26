import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ToastComponent } from './components/toast/toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ToastComponent],
  template: `
    <app-toast />

    <header class="site-header">
      <div class="container header-inner">
        <a routerLink="/" class="brand">StayEase</a>
        <nav class="nav-links">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
            Hotels
          </a>
          <a routerLink="/manage-booking" routerLinkActive="active">
            Manage Booking
          </a>
        </nav>
      </div>
    </header>

    <main class="container main-content">
      <router-outlet />
    </main>

    <footer class="site-footer">
      <div class="container">
        <span class="muted">StayEase Hotel Booking Portal</span>
      </div>
    </footer>
  `,
  styles: [`
    :host {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .site-header {
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .header-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 60px;
    }

    .brand {
      font-size: 1.25rem;
      font-weight: 800;
      color: var(--primary);
      letter-spacing: -0.02em;
    }

    .brand:hover {
      text-decoration: none;
    }

    .nav-links {
      display: flex;
      gap: 1.25rem;
    }

    .nav-links a {
      color: var(--text-muted);
      font-weight: 600;
      font-size: 0.95rem;
    }

    .nav-links a.active,
    .nav-links a:hover {
      color: var(--primary);
      text-decoration: none;
    }

    .main-content {
      flex: 1;
      padding-top: 2rem;
      padding-bottom: 3rem;
    }

    .site-footer {
      border-top: 1px solid var(--border);
      background: var(--surface);
      padding: 1rem 0;
      font-size: 0.85rem;
    }
  `]
})
export class AppComponent {}

