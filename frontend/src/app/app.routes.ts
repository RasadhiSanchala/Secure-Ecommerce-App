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
import { ProductDetailComponent } from './product-detail/product-detail';

export const routes: Routes = [
  // Main routes
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: Home, title: 'BakeHouse' },
  { path: 'products', component: ProductsComponent, title: 'Products' },
  { path: 'products/:id', component: ProductDetailComponent, title: 'Product Details' },
  { path: 'about', component: AboutComponent, title: 'About Us' },

  // Auth routes
  { path: 'login', component: LoginComponent, title: 'Login Page' },
  { path: 'register', component: RegisterComponent, title: 'Registration Page' },
  { path: 'auth/success', component: AuthSuccessComponent, title: 'Authentication Success' },
  { path: 'auth/failure', component: AuthFailureComponent, title: 'Authentication Failed' },
  { path: 'auth/callback', component: AuthSuccessComponent, title: 'Processing Authentication' },

  // User routes
  { path: 'profile', component: ProfileComponent, title: 'Profile' },
  { path: 'orders', component: OrdersComponent, title: 'Orders' },

  // Admin routes
  {
    path: 'admin',
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./admin/dashboard/admin-dashboard').then(c => c.AdminDashboardComponent),
        title: 'Admin Dashboard',
      },
      {
        path: 'products',
        loadComponent: () => import('./admin/products/admin-products').then(c => c.AdminProductsComponent),
        title: 'Manage Products',
      },
      {
        path: 'orders',
        loadComponent: () => import('./admin/orders/admin-orders').then(c => c.AdminOrdersComponent),
        title: 'Manage Orders',
      },
      {
        path: 'users',
        loadComponent: () => import('./admin/users/admin-users').then(c => c.AdminUsersComponent),
        title: 'Manage Users',
      }
    ]
  },

  // Cart routes
  {
    path: 'cart',
    children: [
      {
        path: '',
        loadComponent: () => import('./cart/cart').then(c => c.CartComponent),
        title: 'Cart',
      },
      {
        path: 'checkout',
        loadComponent: () => import('./cart/checkout/checkout').then(c => c.CheckoutComponent),
        title: 'Checkout',
      }
    ]
  },

  // Wildcard route - must be last
  { path: '**', redirectTo: 'home' }
];

// Optional: You can add guards later when you need them by creating guard files
// and applying them to specific routes. For now, handle auth checks in components.
