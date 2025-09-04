// frontend/src/app/orders/orders.ts - Final fixed version
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
  errorMessage = signal<string>('');

  // Computed properties
  filteredOrders = signal<Order[]>([]);
  isAuthenticated = computed(() => this.authService.isAuthenticated());
  isAdmin = computed(() => this.authService.isAdmin());

  // Personal order stats (not admin stats)
  userOrderStats = computed(() => {
    const orders = this.orderService.userOrders();
    return {
      total: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      delivered: orders.filter(o => o.status === 'delivered').length,
      totalSpent: orders.reduce((sum, o) => sum + o.total, 0)
    };
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

    this.loadUserOrders();
  }

  loadUserOrders() {
    this.errorMessage.set('');

    // ALWAYS load user's personal orders, even for admins
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

  filterOrders() {
    this.loadUserOrders();
  }

  viewOrderDetails(orderId: string) {
    // Use user-specific order endpoint
    this.orderService.getUserOrder(orderId).subscribe({
      next: (response) => {
        const order = response.order;
        const itemsList = order.products.map(p =>
          `• ${p.product.name} (Qty: ${p.quantity}) - $${(p.priceAtTime * p.quantity).toFixed(2)}`
        ).join('\n');

        alert(`
YOUR ORDER DETAILS

Order ID: ${order._id.slice(-8).toUpperCase()}
Status: ${this.getStatusText(order.status)}
Date: ${this.formatDate(order.createdAt)}

ITEMS:
${itemsList}

SHIPPING ADDRESS:
${order.shippingAddress.street}
${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zipCode}
${order.shippingAddress.country}

PAYMENT:
Method: ${order.paymentMethod.replace('_', ' ')}
Status: ${order.paymentStatus}

${order.notes ? `NOTES:\n${order.notes}` : ''}

TOTAL: $${order.total.toFixed(2)}
        `);
      },
      error: (error) => {
        console.error('Error loading order details:', error);
        this.showError('Failed to load order details');
      }
    });
  }

  // Helper methods
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

  // Error handling
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

  private showError(message: string) {
    this.errorMessage.set(message);
    setTimeout(() => this.errorMessage.set(''), 5000);
  }
}
