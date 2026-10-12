import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from '../navbar/navbar';
import { Toasts } from '../toasts/toasts';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [Navbar, RouterOutlet, Toasts],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.css'
})
export class AppShell {}