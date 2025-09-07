// frontend/src/app/services/user.service.ts
import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export interface User {
  _id: string;
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  emailVerified: boolean;
  googleId?: string;
  auth0Id?: string;
  oauthProvider?: 'google' | 'auth0' | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  lastLogin?: Date | string;
}

export interface UsersResponse {
  users: User[];
  pagination: {
    current: number;
    total: number;
    count: number;
    totalUsers: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly _users = signal<User[]>([]);
  private readonly _isLoading = signal<boolean>(false);
  private readonly _pagination = signal<any>({});

  // Public readonly signals
  readonly users = this._users.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly pagination = this._pagination.asReadonly();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  /**
   * Get all users (Admin only) - Updated for new response format
   */
  getAllUsers(): Observable<User[]> {
    this._isLoading.set(true);

    return new Observable<User[]>(observer => {
      this.http.get<UsersResponse>(`${environment.apiUrl}/users`, {
        headers: this.authService.getAuthHeaders()
      }).subscribe({
        next: (response) => {
          // Map _id to id for consistency and handle new response format
          const mappedUsers = response.users.map(user => ({
            ...user,
            id: user._id || user.id
          }));

          this._users.set(mappedUsers);
          this._pagination.set(response.pagination);
          this._isLoading.set(false);

          observer.next(mappedUsers);
          observer.complete();
        },
        error: (error) => {
          console.error('Error fetching users:', error);
          this._isLoading.set(false);
          observer.error(error);
        }
      });
    });
  }

  /**
   * Get recent users (sorted by creation date, limited)
   */
  getRecentUsers(limit: number = 3): Observable<User[]> {
    return new Observable<User[]>(observer => {
      this.getAllUsers().subscribe({
        next: (users) => {
          // Sort by creation date (newest first) and limit
          const recentUsers = users
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, limit);

          observer.next(recentUsers);
          observer.complete();
        },
        error: (error) => observer.error(error)
      });
    });
  }

  /**
   * Get user by ID
   */
  getUserById(id: string): Observable<User> {
    return this.http.get<User>(`${environment.apiUrl}/users/${id}`, {
      headers: this.authService.getAuthHeaders()
    });
  }

  /**
   * Update user (Admin only)
   */
  updateUser(id: string, updateData: Partial<User>): Observable<User> {
    return new Observable<User>(observer => {
      this.http.put<User>(`${environment.apiUrl}/users/${id}`, updateData, {
        headers: this.authService.getAuthHeaders()
      }).subscribe({
        next: (updatedUser) => {
          // Update the user in the local cache
          const users = this._users();
          const index = users.findIndex(u => u.id === id || u._id === id);
          if (index > -1) {
            const newUsers = [...users];
            newUsers[index] = { ...updatedUser, id: updatedUser._id || updatedUser.id };
            this._users.set(newUsers);
          }

          observer.next(updatedUser);
          observer.complete();
        },
        error: (error) => observer.error(error)
      });
    });
  }

  /**
   * Delete user (Admin only)
   */
  deleteUser(id: string): Observable<any> {
    return new Observable<any>(observer => {
      this.http.delete(`${environment.apiUrl}/users/${id}`, {
        headers: this.authService.getAuthHeaders()
      }).subscribe({
        next: (response) => {
          // Remove user from local cache
          const users = this._users();
          const filteredUsers = users.filter(u => u.id !== id && u._id !== id);
          this._users.set(filteredUsers);

          observer.next(response);
          observer.complete();
        },
        error: (error) => observer.error(error)
      });
    });
  }

  /**
   * Get user statistics
   */
  getUserStats(): {
    total: number;
    admins: number;
    verified: number;
    oauthUsers: number;
    recentUsers: number;
  } {
    const users = this._users();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    return {
      total: users.length,
      admins: users.filter(u => u.isAdmin).length,
      verified: users.filter(u => u.emailVerified).length,
      oauthUsers: users.filter(u => u.oauthProvider).length,
      recentUsers: users.filter(u => new Date(u.createdAt) > oneWeekAgo).length
    };
  }

  /**
   * Refresh users data
   */
  refreshUsers(): Observable<User[]> {
    return this.getAllUsers();
  }

  /**
   * Clear cached users
   */
  clearCache(): void {
    this._users.set([]);
    this._pagination.set({});
  }
}
