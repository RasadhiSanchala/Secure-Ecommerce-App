// frontend/src/app/cart/checkout/checkout.ts
import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { OrderService, CreateOrderRequest } from '../../services/order.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css'
})
export class CheckoutComponent implements OnInit {
  checkoutForm: FormGroup;
  isProcessing = signal<boolean>(false);
  errorMessage = signal<string>('');
  successMessage = signal<string>('');

  cartSummary = computed(() => this.cartService.getCartSummary());
  cartValidation = computed(() => this.cartService.validateCart());

  constructor(
    private fb: FormBuilder,
    public cartService: CartService,
    private orderService: OrderService,
    private authService: AuthService,
    private router: Router
  ) {
    this.checkoutForm = this.fb.group({
      // Shipping Address
      street: ['', [Validators.required, Validators.minLength(5)]],
      city: ['', [Validators.required]],
      state: ['', [Validators.required]],
      zipCode: ['', [Validators.required, Validators.pattern(/^\d{5}(-\d{4})?$/)]],
      country: ['Sri Lanka', [Validators.required]],

      // Payment
      paymentMethod: ['credit_card', [Validators.required]],

      // Optional notes
      notes: ['']
    });
  }

  ngOnInit() {
    // Check if user is authenticated
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    // Check if cart is empty
    if (this.cartService.isEmpty()) {
      this.router.navigate(['/cart']);
      return;
    }

    // Validate cart
    const validation = this.cartValidation();
    if (!validation.isValid) {
      this.errorMessage.set(`Cart validation failed: ${validation.errors.join(', ')}`);
    }
  }

  onSubmit() {
    if (this.checkoutForm.valid && this.cartValidation().isValid) {
      this.processOrder();
    } else {
      this.markFormGroupTouched();
      if (!this.cartValidation().isValid) {
        this.errorMessage.set('Please fix cart issues before proceeding');
      }
    }
  }

  private processOrder() {
    this.isProcessing.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const formData = this.checkoutForm.value;
    const orderData = this.cartService.getOrderData();

    const createOrderRequest: CreateOrderRequest = {
      products: orderData.products,
      shippingAddress: {
        street: formData.street,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        country: formData.country
      },
      paymentMethod: formData.paymentMethod,
      notes: formData.notes || ''
    };

    this.orderService.createOrder(createOrderRequest).subscribe({
      next: (response) => {
        this.successMessage.set('Order placed successfully!');
        this.cartService.clearCart();

        // Redirect to order confirmation or orders page
        setTimeout(() => {
          this.router.navigate(['/orders'], {
            queryParams: { orderId: response.order._id }
          });
        }, 2000);
      },
      error: (error) => {
        console.error('Error creating order:', error);
        this.errorMessage.set(
          error.error?.message || 'Failed to process order. Please try again.'
        );
        this.isProcessing.set(false);
      }
    });
  }

  formatCurrency(amount: number): string {
    return `$${amount.toFixed(2)}`;
  }

  onImageError(event: any) {
    event.target.src = '/assets/images/default-product.jpg';
  }

  private markFormGroupTouched() {
    Object.keys(this.checkoutForm.controls).forEach(field => {
      const control = this.checkoutForm.get(field);
      control?.markAsTouched({ onlySelf: true });
    });
  }
}
