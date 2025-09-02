// src/app/services/cart.service.ts
import { Injectable, signal, computed, effect, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Product } from './product.service';
import { AuthService } from './auth.service';

export interface CartItem {
  product: Product;
  quantity: number;
  addedAt: Date;
}

export interface Cart {
  items: CartItem[];
  total: number;
  itemCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private readonly CART_STORAGE_KEY = 'bakehouse_cart';
  private isBrowser: boolean;

  // Private signals
  private readonly _items = signal<CartItem[]>([]);

  // Public readonly signals
  readonly items = this._items.asReadonly();
  readonly itemCount = computed(() =>
    this._items().reduce((count, item) => count + item.quantity, 0)
  );
  readonly total = computed(() =>
    this._items().reduce((sum, item) => sum + (item.product.price * item.quantity), 0)
  );
  readonly isEmpty = computed(() => this._items().length === 0);

  // Cart object for templates
  readonly cart = computed((): Cart => ({
    items: this._items(),
    total: this.total(),
    itemCount: this.itemCount()
  }));

  constructor(
    private authService: AuthService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);

    // Only initialize in browser
    if (this.isBrowser) {
      this.loadCartFromStorage();

      // Save to storage whenever cart changes
      effect(() => {
        this.saveCartToStorage();
      });

      // Clear cart when user logs out
      effect(() => {
        if (!this.authService.isAuthenticated()) {
          this.clearCart();
        }
      });
    }
  }

  addToCart(product: Product, quantity: number = 1): void {
    if (!product.available || quantity <= 0) {
      throw new Error('Product is not available or invalid quantity');
    }

    const currentItems = this._items();
    const existingItemIndex = currentItems.findIndex(item => item.product._id === product._id);

    if (existingItemIndex > -1) {
      // Update existing item
      const updatedItems = [...currentItems];
      const newQuantity = updatedItems[existingItemIndex].quantity + quantity;

      // Check stock limit
      if (product.stock && newQuantity > product.stock) {
        throw new Error(`Cannot add more items. Only ${product.stock} in stock.`);
      }

      updatedItems[existingItemIndex] = {
        ...updatedItems[existingItemIndex],
        quantity: newQuantity
      };
      this._items.set(updatedItems);
    } else {
      // Add new item
      if (product.stock && quantity > product.stock) {
        throw new Error(`Cannot add ${quantity} items. Only ${product.stock} in stock.`);
      }

      const newItem: CartItem = {
        product,
        quantity,
        addedAt: new Date()
      };
      this._items.set([...currentItems, newItem]);
    }
  }

  removeFromCart(productId: string): void {
    const updatedItems = this._items().filter(item => item.product._id !== productId);
    this._items.set(updatedItems);
  }

  updateQuantity(productId: string, quantity: number): void {
    if (quantity <= 0) {
      this.removeFromCart(productId);
      return;
    }

    const currentItems = this._items();
    const itemIndex = currentItems.findIndex(item => item.product._id === productId);

    if (itemIndex > -1) {
      const item = currentItems[itemIndex];

      // Check stock limit
      if (item.product.stock && quantity > item.product.stock) {
        throw new Error(`Cannot set quantity to ${quantity}. Only ${item.product.stock} in stock.`);
      }

      const updatedItems = [...currentItems];
      updatedItems[itemIndex] = {
        ...item,
        quantity
      };
      this._items.set(updatedItems);
    }
  }

  getItemQuantity(productId: string): number {
    const item = this._items().find(item => item.product._id === productId);
    return item ? item.quantity : 0;
  }

  isInCart(productId: string): boolean {
    return this._items().some(item => item.product._id === productId);
  }

  clearCart(): void {
    this._items.set([]);
  }

  getCartSummary(): {
    subtotal: number;
    tax: number;
    shipping: number;
    total: number;
    itemCount: number;
  } {
    const subtotal = this.total();
    const tax = subtotal * 0.08; // 8% tax rate
    const shipping = subtotal > 50 ? 0 : 5.99; // Free shipping over $50
    const total = subtotal + tax + shipping;

    return {
      subtotal,
      tax,
      shipping,
      total,
      itemCount: this.itemCount()
    };
  }

  validateCart(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const items = this._items();

    if (items.length === 0) {
      errors.push('Cart is empty');
      return { isValid: false, errors };
    }

    for (const item of items) {
      if (!item.product.available) {
        errors.push(`${item.product.name} is no longer available`);
      }

      if (item.product.stock && item.quantity > item.product.stock) {
        errors.push(`${item.product.name}: Only ${item.product.stock} items in stock`);
      }

      if (item.quantity <= 0) {
        errors.push(`${item.product.name}: Invalid quantity`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Merge cart from another source (useful for auth state changes)
  mergeCart(otherItems: CartItem[]): void {
    const currentItems = this._items();
    const mergedItems: CartItem[] = [...currentItems];

    for (const otherItem of otherItems) {
      const existingIndex = mergedItems.findIndex(
        item => item.product._id === otherItem.product._id
      );

      if (existingIndex > -1) {
        // Combine quantities
        const totalQuantity = mergedItems[existingIndex].quantity + otherItem.quantity;
        const maxQuantity = otherItem.product.stock || totalQuantity;

        mergedItems[existingIndex] = {
          ...mergedItems[existingIndex],
          quantity: Math.min(totalQuantity, maxQuantity)
        };
      } else {
        mergedItems.push(otherItem);
      }
    }

    this._items.set(mergedItems);
  }

  // Get cart data for order creation
  getOrderData(): {
    products: {
      product: string;
      quantity: number;
      priceAtTime: number;
    }[];
    total: number;
  } {
    const items = this._items();
    return {
      products: items.map(item => ({
        product: item.product._id,
        quantity: item.quantity,
        priceAtTime: item.product.price
      })),
      total: this.total()
    };
  }

  private loadCartFromStorage(): void {
    if (!this.isBrowser) return;

    try {
      const storedCart = localStorage.getItem(this.CART_STORAGE_KEY);
      if (storedCart) {
        const cartData: CartItem[] = JSON.parse(storedCart);
        // Validate cart data and filter out invalid items
        const validItems = cartData.filter(item =>
          item.product &&
          item.quantity > 0 &&
          typeof item.product._id === 'string'
        );
        this._items.set(validItems);
      }
    } catch (error) {
      console.error('Error loading cart from storage:', error);
      this._items.set([]);
    }
  }

  private saveCartToStorage(): void {
    if (!this.isBrowser) return;

    try {
      const cartData = this._items();
      localStorage.setItem(this.CART_STORAGE_KEY, JSON.stringify(cartData));
    } catch (error) {
      console.error('Error saving cart to storage:', error);
    }
  }
}
