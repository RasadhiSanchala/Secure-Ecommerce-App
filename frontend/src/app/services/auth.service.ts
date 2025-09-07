// frontend/src/app/services/auth.service.ts
import { Injectable, signal, computed, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface User {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  lastLogin?: Date | string;
  emailVerified?: boolean;
  oauthProvider?: 'google' | 'auth0' | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'authToken';
  private readonly USER_KEY = 'user';
  private isBrowser: boolean;

  // Signals for reactive state management
  private readonly _currentUser = signal<User | null>(null);
  private readonly _isAuthenticated = signal<boolean>(false);
  private readonly _isLoading = signal<boolean>(false);

  // Public readonly signals
  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = this._isAuthenticated.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly isAdmin = computed(() => this._currentUser()?.isAdmin ?? false);
  readonly isOAuthUser = computed(() => !!this._currentUser()?.oauthProvider);

  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);

    // Only initialize auth in browser
    if (this.isBrowser) {
      this.initializeAuth();
      this.handleAuthCallback();
    }
  }

  private initializeAuth(): void {
    const token = this.getToken();
    const storedUser = this.getStoredUser();

    if (token && storedUser) {
      this._currentUser.set(storedUser);
      this._isAuthenticated.set(true);

      // Verify token validity
      this.verifyToken().subscribe({
        error: () => this.logout()
      });
    }
  }

  private handleAuthCallback(): void {
    if (!this.isBrowser) return;

    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const provider = urlParams.get('provider');

    if (token && provider) {
      this.setToken(token);

      // Get user profile with the new token
      this.verifyToken().subscribe({
        next: () => {
          // Clean URL and redirect to success page
          window.history.replaceState({}, document.title, window.location.pathname);
          this.router.navigate(['/auth/success'], {
            queryParams: { provider }
          });
        },
        error: () => {
          this.clearAuthData();
          this.router.navigate(['/auth/failure']);
        }
      });
    }
  }

  // Traditional email/password login
  login(email: string, password: string): Observable<AuthResponse> {
    this._isLoading.set(true);

    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, {
      email,
      password
    }).pipe(
      tap(response => {
        this.handleAuthSuccess(response);
      }),
      catchError(error => {
        this._isLoading.set(false);
        throw error;
      })
    );
  }

  // Traditional registration
  register(userData: {
    name: string;
    email: string;
    password: string;
    isAdmin?: boolean;
  }): Observable<AuthResponse> {
    this._isLoading.set(true);

    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/register`, userData).pipe(
      tap(response => {
        this.handleAuthSuccess(response);
      }),
      catchError(error => {
        this._isLoading.set(false);
        throw error;
      })
    );
  }

  // Google OAuth login
  loginWithGoogle(): void {
    if (this.isBrowser) {
      window.location.href = `${environment.apiUrl}/auth/google`;
    }
  }

  // Auth0 OAuth login
  loginWithAuth0(): void {
    if (this.isBrowser) {
      window.location.href = `${environment.apiUrl}/auth/auth0`;
    }
  }

  // Logout
  logout(): void {
    const token = this.getToken();
    const user = this._currentUser();

    // Call logout endpoint
    if (token) {
      this.http.post(`${environment.apiUrl}/auth/logout`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      }).subscribe();
    }

    // Clear local storage and state
    this.clearAuthData();

    // Redirect based on OAuth provider
    if (user?.oauthProvider === 'google') {
      window.location.href = `${environment.apiUrl}/auth/google/logout`;
    } else if (user?.oauthProvider === 'auth0') {
      window.location.href = `${environment.apiUrl}/auth/auth0/logout`;
    } else {
      this.router.navigate(['/home']);
    }
  }

  // Refresh JWT token
  refreshToken(): Observable<AuthResponse> {
    const token = this.getToken();
    if (!token) {
      throw new Error('No token available');
    }

    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/refresh`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    }).pipe(
      tap(response => {
        if (response.token) {
          this.setToken(response.token);
        }
        if (response.user) {
          this._currentUser.set(response.user);
          this.setStoredUser(response.user);
        }
      })
    );
  }

  // Verify token and get user profile
  verifyToken(): Observable<{ user: User }> {
    const token = this.getToken();
    if (!token) {
      throw new Error('No token available');
    }

    return this.http.get<{ user: User }>(`${environment.apiUrl}/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    }).pipe(
      tap(response => {
        if (response.user) {
          this._currentUser.set(response.user);
          this.setStoredUser(response.user);
          this._isAuthenticated.set(true);
        }
      }),
      catchError(error => {
        if (error.status === 401) {
          this.clearAuthData();
        }
        return of({ user: null as any });
      })
    );
  }

  // Update user profile
  updateProfile(userData: Partial<User>): Observable<User> {
    const token = this.getToken();
    const currentUser = this._currentUser();

    if (!token || !currentUser) {
      throw new Error('Authentication required');
    }

    return this.http.put<User>(`${environment.apiUrl}/users/${currentUser.id}`, userData, {
      headers: { Authorization: `Bearer ${token}` }
    }).pipe(
      tap(updatedUser => {
        this._currentUser.set(updatedUser);
        this.setStoredUser(updatedUser);
      })
    );
  }

  // Change password (only for non-OAuth users)
  changePassword(currentPassword: string, newPassword: string): Observable<any> {
    const token = this.getToken();
    const currentUser = this._currentUser();

    if (!token || !currentUser) {
      throw new Error('Authentication required');
    }

    if (currentUser.oauthProvider) {
      throw new Error('Cannot change password for OAuth users');
    }

    return this.http.put(`${environment.apiUrl}/users/${currentUser.id}/password`, {
      currentPassword,
      password: newPassword
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  // Delete account
  deleteAccount(): Observable<any> {
    const token = this.getToken();
    const currentUser = this._currentUser();

    if (!token || !currentUser) {
      throw new Error('Authentication required');
    }

    return this.http.delete(`${environment.apiUrl}/users/${currentUser.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).pipe(
      tap(() => {
        this.clearAuthData();
        this.router.navigate(['/home']);
      })
    );
  }

  // Get authorization headers for API calls
  getAuthHeaders(): { [header: string]: string } {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // Private helper methods
  private handleAuthSuccess(response: AuthResponse): void {
    this.setToken(response.token);
    this.setStoredUser(response.user);
    this._currentUser.set(response.user);
    this._isAuthenticated.set(true);
    this._isLoading.set(false);
  }

  private clearAuthData(): void {
    if (this.isBrowser) {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
    }
    this._currentUser.set(null);
    this._isAuthenticated.set(false);
    this._isLoading.set(false);
  }

  private getToken(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private setToken(token: string): void {
    if (this.isBrowser) {
      localStorage.setItem(this.TOKEN_KEY, token);
    }
  }

  private getStoredUser(): User | null {
    if (!this.isBrowser) return null;

    const userData = localStorage.getItem(this.USER_KEY);
    if (userData) {
      try {
        return JSON.parse(userData);
      } catch {
        return null;
      }
    }
    return null;
  }

  private setStoredUser(user: User): void {
    if (this.isBrowser) {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    }
  }
}
