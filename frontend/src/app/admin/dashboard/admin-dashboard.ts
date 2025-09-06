// frontend/src/app/admin/dashboard/admin-dashboard.ts
import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OrderService } from '../../services/order.service';
import { ProductService } from '../../services/product.service';
import { UserService, User } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css'
})
export class AdminDashboardComponent implements OnInit {
  private readonly _recentOrders = signal<any[]>([]);
  private readonly _lowStockProducts = signal<any[]>([]);
  private readonly _recentUsers = signal<User[]>([]);
  private readonly _isLoadingUsers = signal<boolean>(false);

  readonly recentOrders = this._recentOrders.asReadonly();
  readonly lowStockProducts = this._lowStockProducts.asReadonly();
  readonly recentUsers = this._recentUsers.asReadonly();
  readonly isLoadingUsers = this._isLoadingUsers.asReadonly();

  // Dashboard stats
  readonly dashboardStats = computed(() => {
    const orderStats = this.orderService.adminStats();
    const products = this.productService.products();
    const userStats = this.userService.getUserStats();

    return {
      totalOrders: orderStats.totalOrders || 0,
      totalRevenue: orderStats.totalRevenue || 0,
      averageOrderValue: orderStats.averageOrderValue || 0,
      totalProducts: products.length,
      activeProducts: products.filter(p => p.available).length,
      pendingOrders: orderStats.statusBreakdown?.find((s: any) => s._id === 'pending')?.count || 0,
      totalUsers: userStats.total,
      recentUsersCount: userStats.recentUsers
    };
  });

  constructor(
    private orderService: OrderService,
    private productService: ProductService,
    private userService: UserService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadDashboardData();
  }

  loadDashboardData() {
    // Load recent orders (limited)
    this.orderService.getAllOrdersAdmin({ limit: 5, page: 1 }).subscribe({
      next: (response) => {
        this._recentOrders.set(response.orders);
      },
      error: (error) => console.error('Error loading recent orders:', error)
    });

    // Load products to check for low stock
    this.productService.getAllProducts().subscribe({
      next: (response) => {
        const lowStock = response.products.filter(p => p.stock < 10 && p.available);
        this._lowStockProducts.set(lowStock);
      },
      error: (error) => console.error('Error loading products:', error)
    });

    // Load recent users (real data instead of dummy data)
    this.loadRecentUsers();
  }

  loadRecentUsers() {
    this._isLoadingUsers.set(true);

    this.userService.getRecentUsers(3).subscribe({
      next: (users) => {
        this._recentUsers.set(users);
        this._isLoadingUsers.set(false);
      },
      error: (error) => {
        console.error('Error loading recent users:', error);
        this._isLoadingUsers.set(false);
        // Fallback to empty array instead of dummy data
        this._recentUsers.set([]);
      }
    });
  }

  formatCurrency(amount: number): string {
    return `$${amount.toFixed(2)}`;
  }

  formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getStatusColor(status: string): string {
    return this.orderService.getOrderStatusColor(status as any);
  }

  getStatusText(status: string): string {
    return this.orderService.getOrderStatusText(status as any);
  }

  refreshData() {
    this.loadDashboardData();
  }

  // Helper method for getting user initials for avatar
  getUserInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  // Helper method to format join date with relative time
  getJoinDateText(date: string | Date): string {
    const joinDate = new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - joinDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Joined today';
    } else if (diffDays === 1) {
      return 'Joined yesterday';
    } else if (diffDays < 7) {
      return `Joined ${diffDays} days ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `Joined ${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } else {
      return `Joined ${this.formatDate(date)}`;
    }
  }
}
