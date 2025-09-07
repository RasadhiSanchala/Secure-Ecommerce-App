// frontend/src/app/auth/auth-success/auth-success.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-auth-success',
  standalone: true,
  imports: [CommonModule],
  templateUrl:'auth-success.html',
  styleUrls: ['./auth-success.css'],
})
export class AuthSuccessComponent implements OnInit {

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // Check if we have a token in the URL (from OAuth callback)
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      const provider = params['provider'];

      if (token) {
        // Token is handled by AuthService automatically
        console.log(`Authentication successful with ${provider}`);
      }
    });

    // Redirect to home page after 2 seconds
    setTimeout(() => {
      this.router.navigate(['/home']);
    }, 3000);
  }
}
