import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from '../navbar/navbar';
<<<<<<< HEAD
=======
import { Toasts } from '../toasts/toasts';
import { SiteFooter } from '../site-footer/site-footer';
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)

@Component({
  selector: 'app-shell',
  standalone: true,
<<<<<<< HEAD
  imports: [Navbar, RouterOutlet],
=======
  imports: [Navbar, RouterOutlet, Toasts, SiteFooter],
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.css'
})
export class AppShell {}