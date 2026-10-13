<<<<<<< HEAD
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {}
=======
import { Component, HostListener, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';

import { MascotComponent } from '../../shared/components/mascot/mascot';
import { AuthService } from '../../core/services/auth.service';
import { LetterAvatar } from '../../shared/components/letter-avatar/letter-avatar';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, MascotComponent, LetterAvatar],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  // Mobile menu (hamburger) state; links are always visible on wide screens.
  menuOpen = false;

  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  constructor() {
    // Close the mobile menu after navigating.
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => (this.menuOpen = false));
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  @HostListener('document:keydown.escape')
  closeMenu(): void {
    this.menuOpen = false;
  }
}
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
