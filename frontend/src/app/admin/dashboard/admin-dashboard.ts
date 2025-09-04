// frontend/src/app/admin/dashboard/admin-dashboard.ts
import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OrderService } from '../../services/order.service';
import { ProductService } from '../../services/product.service';
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
  private readonly _recentUsers = signal<any[]>([]);

  readonly recentOrders = this._recentOrders.asReadonly();
  readonly lowStockProducts = this._lowStockProducts.asReadonly();
  readonly recentUsers = this._recentUsers.asReadonly();

  // Dashboard stats
  readonly dashboardStats = computed(() => {
    const orderStats = this.orderService.adminStats();
    const products = this.productService.products();

    return {
      totalOrders: orderStats.totalOrders || 0,
      totalRevenue: orderStats.totalRevenue || 0,
      averageOrderValue: orderStats.averageOrderValue || 0,
      totalProducts: products.length,
      activeProducts: products.filter(p => p.available).length,
      pendingOrders: orderStats.statusBreakdown?.find((s: any) => s._id === 'pending')?.count || 0
    };
  });

  constructor(
    private orderService: OrderService,
    private productService: ProductService,
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

    // Mock recent users for now (you can implement this when you have user management)
    this._recentUsers.set([
      { name: 'John Doe', email: 'john@example.com', createdAt: new Date(), isAdmin: false },
      { name: 'Jane Smith', email: 'jane@example.com', createdAt: new Date(), isAdmin: false }
    ]);
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
}
