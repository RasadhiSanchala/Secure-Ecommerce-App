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
  auth0Id?: string;
}

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule], // FormsModule is properly imported
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

  // Computed stats to avoid template filtering
  totalUsers = computed(() => this.users().length);
  adminUsers = computed(() => this.users().filter(user => user.isAdmin).length);
  verifiedUsers = computed(() => this.users().filter(user => user.emailVerified).length);
  auth0Users = computed(() => this.users().filter(user => user.auth0Id).length);

  constructor(
    private http: HttpClient,
    public authService: AuthService  // Changed to public so template can access it
  ) {}

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.http.get<AdminUser[]>(`${environment.apiUrl}/users`, {
      headers: this.authService.getAuthHeaders()
    }).subscribe({
      next: (users) => {
        this.users.set(users);
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

    this.updateUser(user.id, { emailVerified: newStatus }).subscribe({
      next: (updatedUser) => {
        this.showSuccess(`User email ${newStatus ? 'verified' : 'unverified'} successfully!`);
        this.updateUserInList(updatedUser);
      },
      error: (error) => {
        console.error('Error updating email verification:', error);
        this.showError('Failed to update email verification');
      }
    });
  }

  deleteUser(user: AdminUser) {
    if (user.id === this.authService.currentUser()?.id) {
      alert('You cannot delete your own account from this interface.');
      return;
    }

    const confirmMessage = `Are you sure you want to delete "${user.name}"?\n\nEmail: ${user.email}\n\nThis action cannot be undone and will remove all user data including orders.`;

    if (confirm(confirmMessage)) {
      const secondConfirmation = confirm('This will permanently delete all user data. Are you absolutely sure?');

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

  exportUsers() {
    const users = this.filteredUsers();
    if (users.length === 0) {
      alert('No users to export');
      return;
    }

    const headers = ['ID', 'Name', 'Email', 'Role', 'Email Verified', 'Auth0 User', 'Created Date', 'Last Login'];
    const csvContent = [
      headers.join(','),
      ...users.map(user => [
        user.id,
        `"${user.name}"`,
        user.email,
        user.isAdmin ? 'Admin' : 'User',
        user.emailVerified ? 'Yes' : 'No',
        user.auth0Id ? 'Yes' : 'No',
        this.formatDate(user.createdAt),
        user.lastLogin ? this.formatDate(user.lastLogin) : 'Never'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  // Error and success handling
  private handleError(error: any, defaultMessage: string) {
    if (error.status === 401) {
      this.authService.logout();
      return;
    }

    const message = error.error?.message || defaultMessage;
    this.errorMessage.set(message);
    setTimeout(() => this.errorMessage.set(''), 5000);
  }

  private showSuccess(message: string) {
    this.successMessage.set(message);
    this.errorMessage.set('');
    setTimeout(() => this.successMessage.set(''), 3000);
  }

  private showError(message: string) {
    this.errorMessage.set(message);
    this.successMessage.set('');
    setTimeout(() => this.errorMessage.set(''), 5000);
  }
}
