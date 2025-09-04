// frontend/src/app/orders/orders.ts - Fixed version with proper error handling
import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrderService, Order } from '../services/order.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './orders.html',
  styleUrls: ['./orders.css']
})
export class OrdersComponent implements OnInit {
  selectedStatus = signal<string>('');
  currentPage = signal<number>(1);
  pageSize = signal<number>(20);
  errorMessage = signal<string>('');

  // Computed properties
  filteredOrders = signal<Order[]>([]);
  isAdmin = computed(() => this.authService.isAdmin());
  isAuthenticated = computed(() => this.authService.isAuthenticated());

  // User order stats
  userOrderStats = computed(() => {
    const orders = this.orderService.userOrders();
    return {
      total: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      delivered: orders.filter(o => o.status === 'delivered').length,
      totalSpent: orders.reduce((sum, o) => sum + o.total, 0)
    };
  });

  // Admin order stats (from service)
  adminStats = computed(() => this.orderService.adminStats());

  // Helper method for template
  getPendingOrdersCount = computed(() => {
    const stats = this.adminStats();
    if (!stats.statusBreakdown) return 0;
    const pendingStatus = stats.statusBreakdown.find((s: { _id: string; }) => s._id === 'pending');
    return pendingStatus?.count || 0;
  });

  constructor(
    public orderService: OrderService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    // Check if user is authenticated
    if (!this.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadOrders();
  }

  loadOrders() {
    this.errorMessage.set('');

    if (this.isAdmin()) {
      // Load all orders for admin with pagination and filtering
      const params = {
        page: this.currentPage(),
        limit: this.pageSize(),
        ...(this.selectedStatus() && { status: this.selectedStatus() })
      };

      this.orderService.getAllOrdersAdmin(params).subscribe({
        next: (response) => {
          this.filteredOrders.set(response.orders);
        },
        error: (error) => {
          console.error('Error loading admin orders:', error);
          this.handleError(error, 'Failed to load orders');
        }
      });
    } else {
      // Load user's orders only
      this.orderService.getUserOrders().subscribe({
        next: (response) => {
          let orders = response.orders;

          // Apply status filter if selected
          if (this.selectedStatus()) {
            orders = orders.filter(order => order.status === this.selectedStatus());
          }

          this.filteredOrders.set(orders);
        },
        error: (error) => {
          console.error('Error loading user orders:', error);
          this.handleError(error, 'Failed to load your orders');
        }
      });
    }
  }

  filterOrders() {
    this.currentPage.set(1); // Reset to first page when filtering
    this.loadOrders();
  }

  changePage(page: number) {
    this.currentPage.set(page);
    this.loadOrders();
  }

  updateOrderStatus(orderId: string, event: any) {
    const newStatus = event.target.value;
    this.orderService.updateOrderStatus(orderId, { status: newStatus }).subscribe({
      next: (response) => {
        console.log('Order status updated successfully');
        this.showSuccess(`Order status updated to ${newStatus}`);
      },
      error: (error) => {
        console.error('Error updating order status:', error);
        this.showError('Failed to update order status');
        // Revert the select value
        event.target.value = this.getOrderStatus(orderId);
      }
    });
  }

  deleteOrder(orderId: string) {
    if (confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
      this.orderService.deleteOrder(orderId).subscribe({
        next: () => {
          console.log('Order deleted successfully');
          this.showSuccess('Order deleted successfully');
        },
        error: (error) => {
          console.error('Error deleting order:', error);
          this.showError('Failed to delete order');
        }
      });
    }
  }

  viewOrderDetails(orderId: string) {
    // Use appropriate method based on user role
    const orderObservable = this.isAdmin()
      ? this.orderService.getOrderAdmin(orderId)
      : this.orderService.getUserOrder(orderId);

    orderObservable.subscribe({
      next: (response) => {
        // For now, just show an alert. Later you can implement a modal or separate page
        const order = response.order;
        alert(`
Order Details:
- ID: ${order._id}
- Customer: ${order.user.name} (${order.user.email})
- Total: $${order.total.toFixed(2)}
- Status: ${order.status}
- Created: ${this.formatDate(order.createdAt)}
- Items: ${order.products.length}

(Detailed order view coming soon!)
        `);
      },
      error: (error) => {
        console.error('Error loading order details:', error);
        this.showError('Failed to load order details');
      }
    });
  }

  // Helper methods
  getOrderStatus(orderId: string): string {
    const order = this.filteredOrders().find(o => o._id === orderId);
    return order?.status || '';
  }

  getStatusColor(status: string): string {
    return this.orderService.getOrderStatusColor(status as any);
  }

  getStatusText(status: string): string {
    return this.orderService.getOrderStatusText(status as any);
  }

  formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatCurrency(amount: number): string {
    return `$${amount.toFixed(2)}`;
  }

  // Error and success handling
  private handleError(error: any, defaultMessage: string) {
    if (error.status === 401) {
      // Token expired or invalid, redirect to login
      this.authService.logout();
      this.router.navigate(['/login']);
      return;
    }

    const message = error.error?.message || defaultMessage;
    this.errorMessage.set(message);
    setTimeout(() => this.errorMessage.set(''), 5000);
  }

  private showSuccess(message: string) {
    // Implement your success message display logic
    console.log('SUCCESS:', message);
    // You could also set a success signal similar to errorMessage
  }

  private showError(message: string) {
    this.errorMessage.set(message);
    setTimeout(() => this.errorMessage.set(''), 5000);
  }

  // Pagination helpers for admin view
  get totalPages(): number {
    const stats = this.adminStats();
    return Math.ceil((stats.totalOrders || 0) / this.pageSize());
  }

  get paginationArray(): number[] {
    const total = this.totalPages;
    return Array.from({ length: total }, (_, i) => i + 1);
  }
}
