import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

interface User {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  lastLogin?: Date | string;
  emailVerified?: boolean;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class ProfileComponent implements OnInit {
  user = signal<User | null>(null);
  profileForm: FormGroup;
  passwordForm: FormGroup;
  isUpdatingProfile = signal<boolean>(false);
  isChangingPassword = signal<boolean>(false);
  isRefreshing = signal<boolean>(false);
  successMessage = signal<string>('');
  errorMessage = signal<string>('');

  private apiUrl = 'http://localhost:3000';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) {
    this.profileForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]]
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmNewPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit() {
    this.loadUserProfile();
  }

  loadUserProfile() {
    // Try to get user from localStorage first
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        // Ensure the user data has required properties
        if (userData && userData.id && userData.name && userData.email) {
          this.user.set(userData);
          this.profileForm.patchValue({
            name: userData.name,
            email: userData.email
          });
        }
      } catch (error) {
        console.error('Error parsing stored user data:', error);
      }
    }

    // Also fetch fresh data from API
    const token = localStorage.getItem('authToken');
    if (token) {
      this.http.get<any>(`${this.apiUrl}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      }).subscribe({
        next: (response) => {
          if (response.user && response.user.id) {
            this.user.set(response.user);
            localStorage.setItem('user', JSON.stringify(response.user));
            this.profileForm.patchValue({
              name: response.user.name,
              email: response.user.email
            });
          }
        },
        error: (error) => {
          console.error('Error loading profile:', error);
          if (error.status === 401) {
            this.logout();
          }
        }
      });
    } else {
      this.router.navigate(['/login']);
    }
  }

  passwordMatchValidator(control: any): {[key: string]: boolean} | null {
    const newPassword = control.get('newPassword');
    const confirmNewPassword = control.get('confirmNewPassword');
    
    if (!newPassword || !confirmNewPassword) {
      return null;
    }

    if (newPassword.value !== confirmNewPassword.value) {
      confirmNewPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    } else {
      const errors = confirmNewPassword.errors;
      if (errors) {
        delete errors['passwordMismatch'];
        if (Object.keys(errors).length === 0) {
          confirmNewPassword.setErrors(null);
        }
      }
      return null;
    }
  }

  updateProfile() {
    if (this.profileForm.valid && this.user()) {
      this.isUpdatingProfile.set(true);
      this.clearMessages();

      const token = localStorage.getItem('authToken');
      const currentUser = this.user();
      const updateData = {
        name: this.profileForm.get('name')?.value,
        email: this.profileForm.get('email')?.value
      };

      this.http.put<any>(`${this.apiUrl}/users/${currentUser?.id}`, updateData, {
        headers: { Authorization: `Bearer ${token}` }
      }).subscribe({
        next: (response) => {
          this.isUpdatingProfile.set(false);
          if (currentUser) {
            const updatedUser: User = {
              ...currentUser,
              ...updateData
            };
            this.user.set(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
          }
          this.showSuccess('Profile updated successfully!');
        },
        error: (error) => {
          this.isUpdatingProfile.set(false);
          console.error('Error updating profile:', error);
          this.showError(error.error?.message || 'Failed to update profile');
        }
      });
    }
  }

  changePassword() {
    if (this.passwordForm.valid) {
      this.isChangingPassword.set(true);
      this.clearMessages();

      const token = localStorage.getItem('authToken');
      const passwordData = {
        currentPassword: this.passwordForm.get('currentPassword')?.value,
        password: this.passwordForm.get('newPassword')?.value
      };

      // Note: This would need to be implemented in your backend
      this.http.put<any>(`${this.apiUrl}/users/${this.user()?.id}/password`, passwordData, {
        headers: { Authorization: `Bearer ${token}` }
      }).subscribe({
        next: (response) => {
          this.isChangingPassword.set(false);
          this.passwordForm.reset();
          this.showSuccess('Password changed successfully!');
        },
        error: (error) => {
          this.isChangingPassword.set(false);
          console.error('Error changing password:', error);
          this.showError(error.error?.message || 'Failed to change password');
        }
      });
    }
  }

  refreshToken() {
    this.isRefreshing.set(true);
    this.clearMessages();

    const token = localStorage.getItem('authToken');
    this.http.post<any>(`${this.apiUrl}/auth/refresh`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (response) => {
        this.isRefreshing.set(false);
        if (response.token) {
          localStorage.setItem('authToken', response.token);
        }
        if (response.user && response.user.id) {
          localStorage.setItem('user', JSON.stringify(response.user));
          this.user.set(response.user);
        }
        this.showSuccess('Session refreshed successfully!');
      },
      error: (error) => {
        this.isRefreshing.set(false);
        console.error('Error refreshing token:', error);
        this.showError('Failed to refresh session');
        if (error.status === 401) {
          this.logout();
        }
      }
    });
  }

  logout() {
    const token = localStorage.getItem('authToken');
    
    // Call logout endpoint
    this.http.post(`${this.apiUrl}/auth/logout`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      complete: () => {
        // Clear local storage and redirect
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        this.router.navigate(['/home']);
      }
    });

    // Clear immediately in case of API failure
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    this.router.navigate(['/home']);
  }

  confirmDeleteAccount() {
    const confirmation = confirm(
      'Are you sure you want to delete your account? This action cannot be undone.'
    );
    
    if (confirmation) {
      const secondConfirmation = confirm(
        'This will permanently delete all your data. Are you absolutely sure?'
      );
      
      if (secondConfirmation) {
        this.deleteAccount();
      }
    }
  }

  deleteAccount() {
    const token = localStorage.getItem('authToken');
    
    this.http.delete(`${this.apiUrl}/users/${this.user()?.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        alert('Your account has been deleted successfully.');
        this.router.navigate(['/home']);
      },
      error: (error) => {
        console.error('Error deleting account:', error);
        this.showError(error.error?.message || 'Failed to delete account');
      }
    });
  }

  getInitials(): string {
    const name = this.user()?.name || 'User';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  private showSuccess(message: string) {
    this.successMessage.set(message);
    setTimeout(() => this.successMessage.set(''), 3000);
  }

  private showError(message: string) {
    this.errorMessage.set(message);
    setTimeout(() => this.errorMessage.set(''), 5000);
  }

  private clearMessages() {
    this.successMessage.set('');
    this.errorMessage.set('');
  }
}