// src/app/orders/orders.component.ts
import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OrderService, Order } from '../services/order.service';
import { AuthService } from '../services/auth.service';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './orders.html',
  styleUrls: ['./orders.css']
})
export class OrdersComponent implements OnInit {
  selectedStatus = signal<string>('');

  // Computed properties
  filteredOrders = signal<Order[]>([]);
  orderStats = computed(() => {
    const orders = this.orderService.orders();
    return {
      total: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      delivered: orders.filter(o => o.status === 'delivered').length,
      totalRevenue: orders.reduce((sum, o) => sum + o.total, 0)
    };
  });

  isAdmin = computed(() => this.authService.isAdmin());

  constructor(
    public orderService: OrderService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadOrders();
  }

  loadOrders() {
    this.orderService.getAllOrders().subscribe({
      next: () => {
        this.filteredOrders.set(this.orderService.orders());
      },
      error: (error) => {
        console.error('Error loading orders:', error);
      }
    });
  }

  filterOrders() {
    const status = this.selectedStatus();
    if (status) {
      this.filteredOrders.set(this.orderService.getOrdersByStatus(status as any));
    } else {
      this.filteredOrders.set(this.orderService.orders());
    }
  }

  updateOrderStatus(orderId: string, event: any) {
    const newStatus = event.target.value;
    this.orderService.updateOrderStatus(orderId, { status: newStatus }).subscribe({
      next: () => {
        console.log('Order status updated successfully');
      },
      error: (error) => {
        console.error('Error updating order status:', error);
        alert('Failed to update order status');
      }
    });
  }

  deleteOrder(orderId: string) {
    if (confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
      this.orderService.deleteOrder(orderId).subscribe({
        next: () => {
          console.log('Order deleted successfully');
        },
        error: (error) => {
          console.error('Error deleting order:', error);
          alert('Failed to delete order');
        }
      });
    }
  }

  viewOrder(orderId: string) {
    // TODO: Implement order details view
    alert(`Viewing order details for ${orderId} (Details view coming soon)`);
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
}
