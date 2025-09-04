// frontend/src/app/services/order.service.ts - Updated with separate user and admin methods
import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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

export interface UserOrdersResponse {
  orders: Order[];
  count: number;
  message: string;
}

export interface AdminOrdersResponse {
  orders: Order[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalOrders: number;
    limit: number;
  };
  stats: {
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
  };
  statusBreakdown: {
    _id: string;
    count: number;
    totalValue: number;
  }[];
  message: string;
}

export interface OrderResponse {
  order: Order;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private readonly _userOrders = signal<Order[]>([]);
  private readonly _adminOrders = signal<Order[]>([]);
  private readonly _isLoading = signal<boolean>(false);
  private readonly _adminStats = signal<any>({});

  // Public readonly signals
  readonly userOrders = this._userOrders.asReadonly();
  readonly adminOrders = this._adminOrders.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly adminStats = this._adminStats.asReadonly();

  // Legacy signal for backward compatibility
  readonly orders = this.userOrders; // Default to user orders

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  // USER ORDER METHODS

  /**
   * Get current user's orders
   */
  getUserOrders(): Observable<UserOrdersResponse> {
    this._isLoading.set(true);

    return this.http.get<UserOrdersResponse>(`${environment.apiUrl}/orders/my`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      tap(response => {
        this._userOrders.set(response.orders);
        this._isLoading.set(false);
      })
    );
  }

  /**
   * Get single order for current user
   */
  getUserOrder(id: string): Observable<OrderResponse> {
    return this.http.get<OrderResponse>(`${environment.apiUrl}/orders/my/${id}`, {
      headers: this.authService.getAuthHeaders()
    });
  }

  // ADMIN ORDER METHODS

  /**
   * Get all orders (admin only)
   */
  getAllOrdersAdmin(params?: {
    status?: string;
    userId?: string;
    limit?: number;
    page?: number;
  }): Observable<AdminOrdersResponse> {
    this._isLoading.set(true);

    let httpParams = new HttpParams();
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.userId) httpParams = httpParams.set('userId', params.userId);
    if (params?.limit) httpParams = httpParams.set('limit', params.limit.toString());
    if (params?.page) httpParams = httpParams.set('page', params.page.toString());

    return this.http.get<AdminOrdersResponse>(`${environment.apiUrl}/orders/admin`, {
      headers: this.authService.getAuthHeaders(),
      params: httpParams
    }).pipe(
      tap(response => {
        this._adminOrders.set(response.orders);
        this._adminStats.set({
          ...response.stats,
          statusBreakdown: response.statusBreakdown
        });
        this._isLoading.set(false);
      })
    );
  }

  /**
   * Get any order by ID (admin only)
   */
  getOrderAdmin(id: string): Observable<OrderResponse> {
    return this.http.get<OrderResponse>(`${environment.apiUrl}/orders/admin/${id}`, {
      headers: this.authService.getAuthHeaders()
    });
  }

  // SHARED METHODS

  /**
   * Create a new order
   */
  createOrder(orderData: CreateOrderRequest): Observable<OrderResponse> {
    this._isLoading.set(true);

    return this.http.post<OrderResponse>(`${environment.apiUrl}/orders`, orderData, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      tap(response => {
        // Add to user orders
        const currentOrders = this._userOrders();
        this._userOrders.set([response.order, ...currentOrders]);

        // If admin, also add to admin orders
        if (this.authService.isAdmin()) {
          const currentAdminOrders = this._adminOrders();
          this._adminOrders.set([response.order, ...currentAdminOrders]);
        }

        this._isLoading.set(false);
      })
    );
  }

  /**
   * Update order status (admin only)
   */
  updateOrderStatus(id: string, statusData: UpdateOrderStatusRequest): Observable<OrderResponse> {
    return this.http.put<OrderResponse>(`${environment.apiUrl}/orders/${id}/status`, statusData, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      tap(response => {
        // Update in admin orders
        const currentAdminOrders = this._adminOrders();
        const index = currentAdminOrders.findIndex(o => o._id === id);
        if (index > -1) {
          const newOrders = [...currentAdminOrders];
          newOrders[index] = response.order;
          this._adminOrders.set(newOrders);
        }

        // Update in user orders if it's the current user's order
        const currentUser = this.authService.currentUser();
        if (currentUser && response.order.user._id === currentUser.id) {
          const currentUserOrders = this._userOrders();
          const userIndex = currentUserOrders.findIndex(o => o._id === id);
          if (userIndex > -1) {
            const newUserOrders = [...currentUserOrders];
            newUserOrders[userIndex] = response.order;
            this._userOrders.set(newUserOrders);
          }
        }
      })
    );
  }

  /**
   * Delete order (admin only)
   */
  deleteOrder(id: string): Observable<{ message: string; deletedOrder: any }> {
    return this.http.delete<{ message: string; deletedOrder: any }>(`${environment.apiUrl}/orders/${id}`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      tap(() => {
        // Remove from admin orders
        const currentAdminOrders = this._adminOrders();
        const filteredAdminOrders = currentAdminOrders.filter(o => o._id !== id);
        this._adminOrders.set(filteredAdminOrders);

        // Remove from user orders if it's the current user's order
        const currentUserOrders = this._userOrders();
        const filteredUserOrders = currentUserOrders.filter(o => o._id !== id);
        this._userOrders.set(filteredUserOrders);
      })
    );
  }

  // LEGACY METHODS (for backward compatibility)

  /**
   * @deprecated Use getUserOrders() or getAllOrdersAdmin() instead
   */
  getAllOrders(): Observable<UserOrdersResponse | AdminOrdersResponse> {
    if (this.authService.isAdmin()) {
      return this.getAllOrdersAdmin();
    } else {
      return this.getUserOrders();
    }
  }

  /**
   * @deprecated Use getUserOrder() or getOrderAdmin() instead
   */
  getOrder(id: string): Observable<OrderResponse> {
    if (this.authService.isAdmin()) {
      return this.getOrderAdmin(id);
    } else {
      return this.getUserOrder(id);
    }
  }

  // UTILITY METHODS

  getOrdersByStatus(status: Order['status']): Order[] {
    const orders = this.authService.isAdmin() ? this._adminOrders() : this._userOrders();
    return orders.filter(order => order.status === status);
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
