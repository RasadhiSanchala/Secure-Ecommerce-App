import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

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
  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');
  successMessage = signal<string>('');

  private apiUrl = 'http://localhost:3005';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
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
      this.isLoading.set(true);
      this.errorMessage.set('');
      this.successMessage.set('');

      const loginData = {
        email: this.loginForm.get('email')?.value,
        password: this.loginForm.get('password')?.value
      };

      this.http.post<any>(`${this.apiUrl}/users/login`, loginData)
        .subscribe({
          next: (response) => {
            this.isLoading.set(false);
            this.successMessage.set('Login successful! Redirecting...');
            
            // Store token in localStorage (in a real app, consider using a more secure method)
            if (response.token) {
              localStorage.setItem('authToken', response.token);
              localStorage.setItem('user', JSON.stringify(response.user));
            }

            // Redirect after short delay
            setTimeout(() => {
              this.router.navigate(['/home']);
            }, 1500);
          },
          error: (error) => {
            this.isLoading.set(false);
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
    // Redirect to Auth0 login
    window.location.href = `${this.apiUrl}/auth/auth0`;
  }

  onForgotPassword(event: Event) {
    event.preventDefault();
    // TODO: Implement forgot password functionality
    alert('Forgot password functionality coming soon! Please contact support at hello@bakehouse.com');
  }

  private markFormGroupTouched() {
    Object.keys(this.loginForm.controls).forEach(field => {
      const control = this.loginForm.get(field);
      control?.markAsTouched({ onlySelf: true });
    });
  }
}