// src/app/auth/login/login.ts
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {
  loginForm: FormGroup;
  showPassword = signal<boolean>(false);
  errorMessage = signal<string>('');
  successMessage = signal<string>('');

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });
  }

  togglePassword() {
    this.showPassword.set(!this.showPassword());
  }

  onSubmit() {
    if (this.loginForm.valid) {
      this.errorMessage.set('');
      this.successMessage.set('');

      const { email, password } = this.loginForm.value;

      this.authService.login(email, password).subscribe({
        next: (response) => {
          this.successMessage.set('Login successful! Redirecting...');
          setTimeout(() => {
            this.router.navigate(['/home']);
          }, 1500);
        },
        error: (error) => {
          console.error('Login error:', error);

          if (error.error?.useAuth0) {
            this.errorMessage.set('This account uses Auth0. Please use the "Continue with Auth0" button.');
          } else {
            this.errorMessage.set(
              error.error?.message || 'Login failed. Please check your credentials and try again.'
            );
          }
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  loginWithAuth0() {
    this.authService.loginWithAuth0();
  }

  onForgotPassword(event: Event) {
    event.preventDefault();
    alert('Forgot password functionality coming soon! Please contact support at hello@bakehouse.com');
  }

  get isLoading() {
    return this.authService.isLoading;
  }

  private markFormGroupTouched() {
    Object.keys(this.loginForm.controls).forEach(field => {
      const control = this.loginForm.get(field);
      control?.markAsTouched({ onlySelf: true });
    });
  }
}
