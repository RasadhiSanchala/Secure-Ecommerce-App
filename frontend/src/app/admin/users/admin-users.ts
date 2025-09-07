// frontend/src/app/admin/users/admin-users.ts
import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService, User } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

export interface AdminUser extends User {
  createdAt: Date | string;
  updatedAt: Date | string;
  lastLogin?: Date | string;
  emailVerified: boolean;
  googleId?: string;
  auth0Id?: string;
  oauthProvider?: 'google' | 'auth0' | null;
}

export interface UsersResponse {
  users: AdminUser[];
  pagination: {
    current: number;
    total: number;
    count: number;
    totalUsers: number;
  };
}

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './admin-users.html',
  styleUrl: './admin-users.css'
})
export class AdminUsersComponent implements OnInit {
  users = signal<AdminUser[]>([]);
  filteredUsers = signal<AdminUser[]>([]);
  searchTerm = signal<string>('');
  selectedRole = signal<string>('');
  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');
  successMessage = signal<string>('');
  pagination = signal<any>({});

  // Computed stats using the new response format
  totalUsers = computed(() => this.users().length);
  adminUsers = computed(() => this.users().filter(user => user.isAdmin).length);
  verifiedUsers = computed(() => this.users().filter(user => user.emailVerified).length);
  oauthUsers = computed(() => this.users().filter(user => user.oauthProvider).length);

  constructor(
    private http: HttpClient,
    public authService: AuthService
  ) {}

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.http.get<UsersResponse>(`${environment.apiUrl}/users`, {
      headers: this.authService.getAuthHeaders()
    }).subscribe({
      next: (response) => {
        this.users.set(response.users);
        this.pagination.set(response.pagination);
        this.filterUsers();
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.handleError(error, 'Failed to load users');
        this.isLoading.set(false);
      }
    });
  }

  filterUsers() {
    let filtered = this.users();

    // Apply search filter
    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term)
      );
    }

    // Apply role filter
    if (this.selectedRole()) {
      if (this.selectedRole() === 'admin') {
        filtered = filtered.filter(user => user.isAdmin);
      } else if (this.selectedRole() === 'user') {
        filtered = filtered.filter(user => !user.isAdmin);
      } else if (this.selectedRole() === 'verified') {
        filtered = filtered.filter(user => user.emailVerified);
      } else if (this.selectedRole() === 'unverified') {
        filtered = filtered.filter(user => !user.emailVerified);
      } else if (this.selectedRole() === 'oauth') {
        filtered = filtered.filter(user => user.oauthProvider);
      } else if (this.selectedRole() === 'local') {
        filtered = filtered.filter(user => !user.oauthProvider);
      }
    }

    this.filteredUsers.set(filtered);
  }

  toggleUserRole(user: AdminUser) {
    const newRole = !user.isAdmin;
    const confirmMessage = `Are you sure you want to ${newRole ? 'promote' : 'demote'} "${user.name}" ${newRole ? 'to admin' : 'to regular user'}?`;

    if (confirm(confirmMessage)) {
      this.updateUser(user.id, { isAdmin: newRole }).subscribe({
        next: (updatedUser) => {
          this.showSuccess(`User ${newRole ? 'promoted to admin' : 'demoted to user'} successfully!`);
          this.updateUserInList(updatedUser);
        },
        error: (error) => {
          console.error('Error updating user role:', error);
          this.showError('Failed to update user role');
        }
      });
    }
  }

  toggleEmailVerification(user: AdminUser) {
    const newStatus = !user.emailVerified;
    const confirmMessage = `Mark "${user.name}" as ${newStatus ? 'verified' : 'unverified'}?`;

    if (confirm(confirmMessage)) {
      this.updateUser(user.id, { emailVerified: newStatus }).subscribe({
        next: (updatedUser) => {
          this.showSuccess(`User email marked as ${newStatus ? 'verified' : 'unverified'} successfully!`);
          this.updateUserInList(updatedUser);
        },
        error: (error) => {
          console.error('Error updating email verification:', error);
          this.showError('Failed to update email verification');
        }
      });
    }
  }

  deleteUser(user: AdminUser) {
    if (user.id === this.authService.currentUser()?.id) {
      alert('You cannot delete your own account!');
      return;
    }

    const confirmMessage = `Are you sure you want to delete user "${user.name}"? This action cannot be undone.`;
    const firstConfirmation = confirm(confirmMessage);

    if (firstConfirmation) {
      const secondConfirmation = confirm('⚠️ WARNING: This will permanently delete the user and all their data. Are you absolutely sure?');

      if (secondConfirmation) {
        this.http.delete(`${environment.apiUrl}/users/${user.id}`, {
          headers: this.authService.getAuthHeaders()
        }).subscribe({
          next: () => {
            this.showSuccess('User deleted successfully!');
            const updatedUsers = this.users().filter(u => u.id !== user.id);
            this.users.set(updatedUsers);
            this.filterUsers();
          },
          error: (error) => {
            console.error('Error deleting user:', error);
            this.showError('Failed to delete user');
          }
        });
      }
    }
  }

  private updateUser(userId: string, updateData: Partial<AdminUser>) {
    return this.http.put<AdminUser>(`${environment.apiUrl}/users/${userId}`, updateData, {
      headers: this.authService.getAuthHeaders()
    });
  }

  private updateUserInList(updatedUser: AdminUser) {
    const users = this.users();
    const index = users.findIndex(u => u.id === updatedUser.id);
    if (index > -1) {
      const newUsers = [...users];
      newUsers[index] = updatedUser;
      this.users.set(newUsers);
      this.filterUsers();
    }
  }

  private handleError(error: any, defaultMessage: string) {
    const message = error.error?.message || defaultMessage;
    this.errorMessage.set(message);
    setTimeout(() => this.errorMessage.set(''), 5000);
  }

  private showSuccess(message: string) {
    this.successMessage.set(message);
    setTimeout(() => this.successMessage.set(''), 3000);
  }

  private showError(message: string) {
    this.errorMessage.set(message);
    setTimeout(() => this.errorMessage.set(''), 5000);
  }

  formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  getOauthProviderDisplay(user: AdminUser): string {
    if (user.oauthProvider === 'google') return '🌐 Google';
    if (user.oauthProvider === 'auth0') return '🔐 Auth0';
    return '🔑 Local';
  }

  getOauthProviderClass(user: AdminUser): string {
    if (user.oauthProvider === 'google') return 'google';
    if (user.oauthProvider === 'auth0') return 'auth0';
    return 'local';
  }

  exportUsers() {
    const users = this.filteredUsers();
    if (users.length === 0) {
      alert('No users to export');
      return;
    }

    const headers = ['ID', 'Name', 'Email', 'Role', 'Email Verified', 'OAuth Provider', 'Created Date', 'Last Login'];
    const csvContent = [
      headers.join(','),
      ...users.map(user => [
        user.id,
        `"${user.name}"`,
        user.email,
        user.isAdmin ? 'Admin' : 'User',
        user.emailVerified ? 'Yes' : 'No',
        user.oauthProvider || 'Local',
        this.formatDate(user.createdAt),
        user.lastLogin ? this.formatDate(user.lastLogin) : 'Never'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }
}
