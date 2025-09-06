// frontend/src/app/cart/cart.ts
import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CartService, CartItem } from '../services/cart.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './cart.html',
  styleUrl: './cart.css'
})
export class CartComponent {
  cartSummary = computed(() => this.cartService.getCartSummary());

  constructor(
    public cartService: CartService,
    public authService: AuthService
  ) {}

  updateQuantity(productId: string, newQuantity: number) {
    try {
      if (newQuantity <= 0) {
        this.removeItem(productId);
        return;
      }
      this.cartService.updateQuantity(productId, newQuantity);
    } catch (error: any) {
      alert(error.message);
    }
  }

  removeItem(productId: string) {
    this.cartService.removeFromCart(productId);
  }

  clearCart() {
    if (confirm('Are you sure you want to clear your cart?')) {
      this.cartService.clearCart();
    }
  }

  formatCurrency(amount: number): string {
    return `$${amount.toFixed(2)}`;
  }

  onImageError(event: any) {
    event.target.src = '/assets/images/default-product.jpg';
  }
}
