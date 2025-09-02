// src/app/profile/profile.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, User } from '../services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class ProfileComponent implements OnInit {
  profileForm: FormGroup;
  passwordForm: FormGroup;
  isUpdatingProfile = signal<boolean>(false);
  isChangingPassword = signal<boolean>(false);
  isRefreshing = signal<boolean>(false);
  successMessage = signal<string>('');
  errorMessage = signal<string>('');

  constructor(
    private fb: FormBuilder,
    public authService: AuthService,
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
    const user = this.authService.currentUser();
    if (user) {
      this.profileForm.patchValue({
        name: user.name,
        email: user.email
      });
    } else {
      // If no user in memory, try to verify token and get fresh data
      this.authService.verifyToken().subscribe({
        next: (response) => {
          if (response.user) {
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
    if (this.profileForm.valid) {
      this.isUpdatingProfile.set(true);
      this.clearMessages();

      const updateData = {
        name: this.profileForm.get('name')?.value,
        email: this.profileForm.get('email')?.value
      };

      this.authService.updateProfile(updateData).subscribe({
        next: (updatedUser) => {
          this.isUpdatingProfile.set(false);
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

      const currentPassword = this.passwordForm.get('currentPassword')?.value;
      const newPassword = this.passwordForm.get('newPassword')?.value;

      this.authService.changePassword(currentPassword, newPassword).subscribe({
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

    this.authService.refreshToken().subscribe({
      next: (response) => {
        this.isRefreshing.set(false);
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
    this.authService.logout();
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
    this.authService.deleteAccount().subscribe({
      next: () => {
        alert('Your account has been deleted successfully.');
      },
      error: (error) => {
        console.error('Error deleting account:', error);
        this.showError(error.error?.message || 'Failed to delete account');
      }
    });
  }

  getInitials(): string {
    const user = this.authService.currentUser();
    if (!user) return 'U';
    return user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
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
