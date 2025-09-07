// src/app/app.routes.ts - Simple routes without guards to avoid SSR issues
import { Routes } from '@angular/router';
import { Home } from './home/home';
import { ProductsComponent } from './products/products';
import { AboutComponent } from './about/about';
import { LoginComponent } from './auth/login/login';
import { RegisterComponent } from './auth/register/register';
import { ProfileComponent } from './profile/profile';
import { OrdersComponent } from './orders/orders';
import { AuthSuccessComponent } from './auth/success/auth-success';
import { AuthFailureComponent } from './auth/failure/auth-failure';

export const routes: Routes = [
  // Main routes
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: Home },
  { path: 'products', component: ProductsComponent },
  { path: 'about', component: AboutComponent },

  // Auth routes
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  {path: 'auth/success', component: AuthSuccessComponent, title: 'Authentication Success'},
  {path: 'auth/failure', component: AuthFailureComponent, title: 'Authentication Failed'},
  {path: 'auth/callback', component: AuthSuccessComponent, title: 'Processing Authentication'},

  // User routes
  { path: 'profile', component: ProfileComponent },
  { path: 'orders', component: OrdersComponent },

  // Admin routes
  {
    path: 'admin',
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./admin/dashboard/admin-dashboard').then(c => c.AdminDashboardComponent)
      },
      {
        path: 'products',
        loadComponent: () => import('./admin/products/admin-products').then(c => c.AdminProductsComponent)
      },
      {
        path: 'orders',
        loadComponent: () => import('./admin/orders/admin-orders').then(c => c.AdminOrdersComponent)
      },
      {
        path: 'users',
        loadComponent: () => import('./admin/users/admin-users').then(c => c.AdminUsersComponent)
      }
    ]
  },

  // Cart routes
  {
    path: 'cart',
    children: [
      {
        path: '',
        loadComponent: () => import('./cart/cart').then(c => c.CartComponent)
      },
      {
        path: 'checkout',
        loadComponent: () => import('./cart/checkout/checkout').then(c => c.CheckoutComponent)
      }
    ]
  },

  // Auth callback route (for Auth0)
  { path: 'auth/callback', component: LoginComponent },

  // Wildcard route - must be last
  { path: '**', redirectTo: 'home' }
];

// Optional: You can add guards later when you need them by creating guard files
// and applying them to specific routes. For now, handle auth checks in components.
