// frontend/src/app/admin/orders/admin-orders.ts
import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrderService, Order } from '../../services/order.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './admin-orders.html',
  styleUrl: './admin-orders.css'
})
export class AdminOrdersComponent implements OnInit {
  selectedStatus = signal<string>('');
  selectedUserId = signal<string>('');
  currentPage = signal<number>(1);
  pageSize = signal<number>(20);
  errorMessage = signal<string>('');
  successMessage = signal<string>('');

  // Computed properties
  filteredOrders = signal<Order[]>([]);
  totalPages = signal<number>(1);

  // Admin stats from service
  adminStats = computed(() => this.orderService.adminStats());

  // Add this computed property after adminStats
  pendingOrdersCount = computed(() => {
    const stats = this.adminStats();
    if (!stats.statusBreakdown) return 0;
    const pendingStatus = stats.statusBreakdown.find((s: any) => s._id === 'pending');
    return pendingStatus?.count || 0;
  });

  constructor(
    public orderService: OrderService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadOrders();
  }

  loadOrders() {
    this.errorMessage.set('');

    const params = {
      page: this.currentPage(),
      limit: this.pageSize(),
      ...(this.selectedStatus() && { status: this.selectedStatus() }),
      ...(this.selectedUserId() && { userId: this.selectedUserId() })
    };

    this.orderService.getAllOrdersAdmin(params).subscribe({
      next: (response) => {
        this.filteredOrders.set(response.orders);
        this.totalPages.set(response.pagination.totalPages);
      },
      error: (error) => {
        console.error('Error loading orders:', error);
        this.handleError(error, 'Failed to load orders');
      }
    });
  }

  filterOrders() {
    this.currentPage.set(1);
    this.loadOrders();
  }

  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadOrders();
    }
  }

  updateOrderStatus(orderId: string, event: any) {
    const newStatus = event.target.value;
    const originalStatus = this.getOrderStatus(orderId);

    this.orderService.updateOrderStatus(orderId, { status: newStatus }).subscribe({
      next: (response) => {
        this.showSuccess(`Order status updated to ${newStatus}`);
        this.loadOrders(); // Refresh the list
      },
      error: (error) => {
        console.error('Error updating order status:', error);
        this.showError('Failed to update order status');
        // Revert the select value
        event.target.value = originalStatus;
      }
    });
  }

  deleteOrder(orderId: string) {
    const order = this.filteredOrders().find(o => o._id === orderId);
    if (!order) return;

    const confirmMessage = `Are you sure you want to delete order #${orderId.slice(-8).toUpperCase()}?\n\nCustomer: ${order.user.name}\nTotal: ${order.total.toFixed(2)}\n\nThis action cannot be undone.`;

    if (confirm(confirmMessage)) {
      this.orderService.deleteOrder(orderId).subscribe({
        next: () => {
          this.showSuccess('Order deleted successfully');
          this.loadOrders();
        },
        error: (error) => {
          console.error('Error deleting order:', error);
          this.showError('Failed to delete order');
        }
      });
    }
  }

  viewOrderDetails(orderId: string) {
    this.orderService.getOrderAdmin(orderId).subscribe({
      next: (response) => {
        const order = response.order;
        const itemsList = order.products.map(p =>
          `• ${p.product.name} (Qty: ${p.quantity}) - ${(p.priceAtTime * p.quantity).toFixed(2)}`
        ).join('\n');

        alert(`
ORDER DETAILS

Order ID: ${order._id}
Status: ${this.getStatusText(order.status)}
Date: ${this.formatDate(order.createdAt)}

CUSTOMER:
${order.user.name}
${order.user.email}

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

TOTAL: ${order.total.toFixed(2)}
        `);
      },
      error: (error) => {
        console.error('Error loading order details:', error);
        this.showError('Failed to load order details');
      }
    });
  }

  exportOrders() {
    // Simple CSV export
    const orders = this.filteredOrders();
    if (orders.length === 0) {
      alert('No orders to export');
      return;
    }

    const headers = ['Order ID', 'Customer', 'Email', 'Status', 'Total', 'Date', 'Items Count'];
    const csvContent = [
      headers.join(','),
      ...orders.map(order => [
        order._id.slice(-8).toUpperCase(),
        `"${order.user.name}"`,
        order.user.email,
        order.status,
        order.total.toFixed(2),
        this.formatDate(order.createdAt),
        order.products.length
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `orders_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  // Helper methods for pagination to avoid template complexity
  isPageNumber(page: number | string): page is number {
    return typeof page === 'number';
  }

  isPageDisabled(page: number | string): boolean {
    return page === '...';
  }

  onPageClick(page: number | string): void {
    if (page !== '...' && typeof page === 'number') {
      this.changePage(page);
    }
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
    return `${amount.toFixed(2)}`;
  }

  getPaginationArray(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const delta = 2;
    const range = [];

    for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
      range.push(i);
    }

    if (current - delta > 2) {
      range.unshift('...' as any);
    }
    if (current + delta < total - 1) {
      range.push('...' as any);
    }

    range.unshift(1);
    if (total > 1) {
      range.push(total);
    }

    return range.filter((v, i, arr) => arr.indexOf(v) === i);
  }

  // Error and success handling
  private handleError(error: any, defaultMessage: string) {
    if (error.status === 401) {
      this.authService.logout();
      return;
    }

    const message = error.error?.message || defaultMessage;
    this.errorMessage.set(message);
    setTimeout(() => this.errorMessage.set(''), 5000);
  }

  private showSuccess(message: string) {
    this.successMessage.set(message);
    this.errorMessage.set('');
    setTimeout(() => this.successMessage.set(''), 3000);
  }

  private showError(message: string) {
    this.errorMessage.set(message);
    this.successMessage.set('');
    setTimeout(() => this.errorMessage.set(''), 5000);
  }
}
