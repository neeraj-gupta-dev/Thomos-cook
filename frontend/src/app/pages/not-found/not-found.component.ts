import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="card not-found">
      <span class="badge badge-muted">404</span>
      <h1>Page not found</h1>
      <p class="muted">The page you requested does not exist or may have moved.</p>
      <a routerLink="/" class="btn btn-primary">Back to hotels</a>
    </section>
  `,
  styles: [`
    .not-found {
      max-width: 480px;
      margin: 32px auto;
      text-align: left;
    }

    .not-found h1 {
      margin: 8px 0;
    }

    .not-found p {
      margin: 0 0 16px;
    }
  `]
})
export class NotFoundComponent {}
