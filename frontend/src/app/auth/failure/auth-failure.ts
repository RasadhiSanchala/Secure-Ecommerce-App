// frontend/src/app/auth/auth-failure/auth-failure.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-auth-failure',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl:'auth-failure.html',
  styleUrls: ['auth-failure.css']
})
export class AuthFailureComponent implements OnInit {
  private errorType: string = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.errorType = params['error'] || 'unknown_error';
    });
  }

  getErrorMessage(): string {
    switch (this.errorType) {
      case 'oauth_error':
        return 'There was an error during the authentication process. Please try again.';
      case 'user_not_found':
        return 'Unable to retrieve user information. Please contact support if this continues.';
      case 'token_generation':
        return 'Failed to generate authentication token. Please try again.';
      case 'no_token':
        return 'Authentication was incomplete. Please try again.';
      default:
        return 'Authentication failed for an unknown reason. Please try again or contact support.';
    }
  }
}
