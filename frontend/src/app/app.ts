// src/app/app.ts
import { Component, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ReactiveFormsModule, CommonModule],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App implements OnInit {
  protected readonly title = signal('BakeHouse');
  protected readonly isMenuOpen = signal(false);

  constructor(protected authService: AuthService) {}

  ngOnInit(): void {
    // Authentication is automatically initialized in the service
  }

  toggleMenu(): void {
    this.isMenuOpen.set(!this.isMenuOpen());
  }

  closeMenu(): void {
    this.isMenuOpen.set(false);
  }

  logout(): void {
    this.authService.logout();
    this.closeMenu();
  }

  getUserInitials(): string {
    const user = this.authService.currentUser();
    if (!user) return '';
    return user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }
}
