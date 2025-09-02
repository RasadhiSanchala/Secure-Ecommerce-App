// src/app/services/order.service.ts
import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { Product } from './product.service';

export interface Order {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
  };
  products: OrderProduct[];
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  shippingAddress: ShippingAddress;
  paymentMethod: 'credit_card' | 'debit_card' | 'paypal' | 'cash_on_delivery';
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  notes?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface OrderProduct {
  product: Product;
  quantity: number;
  priceAtTime: number;
}

export interface ShippingAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface CreateOrderRequest {
  products: {
    product: string; // Product ID
    quantity: number;
    priceAtTime: number;
  }[];
  shippingAddress: ShippingAddress;
  paymentMethod: 'credit_card' | 'debit_card' | 'paypal' | 'cash_on_delivery';
  notes?: string;
}

export interface UpdateOrderStatusRequest {
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
}

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private readonly _orders = signal<Order[]>([]);
  private readonly _isLoading = signal<boolean>(false);

  readonly orders = this._orders.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getAllOrders(): Observable<Order[]> {
    this._isLoading.set(true);

    return this.http.get<Order[]>(`${environment.apiUrl}/orders`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      tap(orders => {
        this._orders.set(orders);
        this._isLoading.set(false);
      })
    );
  }

  getOrder(id: string): Observable<Order> {
    return this.http.get<Order>(`${environment.apiUrl}/orders/${id}`, {
      headers: this.authService.getAuthHeaders()
    });
  }

  createOrder(orderData: CreateOrderRequest): Observable<Order> {
    this._isLoading.set(true);

    return this.http.post<Order>(`${environment.apiUrl}/orders`, orderData, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      tap(newOrder => {
        const currentOrders = this._orders();
        this._orders.set([newOrder, ...currentOrders]);
        this._isLoading.set(false);
      })
    );
  }

  updateOrderStatus(id: string, statusData: UpdateOrderStatusRequest): Observable<Order> {
    return this.http.put<Order>(`${environment.apiUrl}/orders/${id}/status`, statusData, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      tap(updatedOrder => {
        const currentOrders = this._orders();
        const index = currentOrders.findIndex(o => o._id === id);
        if (index > -1) {
          const newOrders = [...currentOrders];
          newOrders[index] = updatedOrder;
          this._orders.set(newOrders);
        }
      })
    );
  }

  deleteOrder(id: string): Observable<{ message: string; deletedOrder: any }> {
    return this.http.delete<{ message: string; deletedOrder: any }>(`${environment.apiUrl}/orders/${id}`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      tap(() => {
        const currentOrders = this._orders();
        const filteredOrders = currentOrders.filter(o => o._id !== id);
        this._orders.set(filteredOrders);
      })
    );
  }

  getOrdersByStatus(status: Order['status']): Order[] {
    return this._orders().filter(order => order.status === status);
  }

  getUserOrders(): Order[] {
    const currentUser = this.authService.currentUser();
    if (!currentUser) return [];

    return this._orders().filter(order => order.user._id === currentUser.id);
  }

  calculateOrderTotal(products: { product: Product; quantity: number }[]): number {
    return products.reduce((total, item) => {
      return total + (item.product.price * item.quantity);
    }, 0);
  }

  getOrderStatusColor(status: Order['status']): string {
    const statusColors = {
      'pending': '#f39c12',
      'processing': '#3498db',
      'shipped': '#9b59b6',
      'delivered': '#27ae60',
      'cancelled': '#e74c3c'
    };
    return statusColors[status] || '#95a5a6';
  }

  getOrderStatusText(status: Order['status']): string {
    const statusTexts = {
      'pending': 'Pending',
      'processing': 'Processing',
      'shipped': 'Shipped',
      'delivered': 'Delivered',
      'cancelled': 'Cancelled'
    };
    return statusTexts[status] || 'Unknown';
  }
}
