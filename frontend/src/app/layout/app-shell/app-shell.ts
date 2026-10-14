import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from '../navbar/navbar';
import { Toasts } from '../toasts/toasts';
import { SiteFooter } from '../site-footer/site-footer';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [Navbar, RouterOutlet, Toasts, SiteFooter],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.css'
})
export class AppShell {}