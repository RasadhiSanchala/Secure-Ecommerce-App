// frontend/src/app/product-detail/product-detail.ts - Fixed version
import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProductService, Product } from '../services/product.service';
import { CartService } from '../services/cart.service';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css'
})
export class ProductDetailComponent implements OnInit {
  product = signal<Product | null>(null);
  isLoading = signal<boolean>(true);
  error = signal<string>('');
  quantity = signal<number>(1);

  // Computed properties with proper null handling
  totalPrice = computed(() => {
    const product = this.product();
    const price = product?.price || 0;
    return price * this.quantity();
  });

  canAddToCart = computed(() => {
    const product = this.product();
    if (!product) return false;

    const stock = product.stock || 0;
    return product.available &&
      (!product.stock || stock > 0) &&
      this.quantity() > 0 &&
      (!product.stock || this.quantity() <= stock);
  });

  maxQuantity = computed(() => {
    const product = this.product();
    return product?.stock || 99;
  });

  relatedProducts = signal<Product[]>([]);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public productService: ProductService,
    public cartService: CartService
  ) { }

  ngOnInit() {
    this.route.params.subscribe(params => {
      const productId = params['id'];
      if (productId) {
        this.loadProduct(productId);
      }
    });
  }

  loadProduct(productId: string) {
    this.isLoading.set(true);
    this.error.set('');

    this.productService.getProduct(productId).subscribe({
      next: (product) => {
        this.product.set(product);
        this.isLoading.set(false);
        this.loadRelatedProducts();
      },
      error: (error) => {
        console.error('Error loading product:', error);
        this.error.set('Product not found');
        this.isLoading.set(false);
      }
    });
  }

  loadRelatedProducts() {
    const currentProduct = this.product();
    if (!currentProduct) return;

    // Get products from the same category
    const allProducts = this.productService.products();
    const related = allProducts
      .filter(p =>
        p.category === currentProduct.category &&
        p._id !== currentProduct._id &&
        p.available
      )
      .slice(0, 4); // Show max 4 related products

    this.relatedProducts.set(related);
  }

  increaseQuantity() {
    const current = this.quantity();
    const max = this.maxQuantity();
    if (current < max) {
      this.quantity.set(current + 1);
    }
  }

  decreaseQuantity() {
    const current = this.quantity();
    if (current > 1) {
      this.quantity.set(current - 1);
    }
  }

  setQuantity(value: number) {
    const max = this.maxQuantity();
    if (value >= 1 && value <= max) {
      this.quantity.set(value);
    }
  }

  addToCart() {
    const product = this.product();
    const qty = this.quantity();

    if (!product || !this.canAddToCart()) {
      return;
    }

    try {
      this.cartService.addToCart(product, qty);

      // Show success message
      this.showSuccessMessage();

    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Error adding product to cart. Please try again.');
    }
  }

  private showSuccessMessage() {
    // Create a temporary success message
    const message = document.createElement('div');
    message.className = 'success-toast';
    message.textContent = `Added ${this.quantity()} item(s) to cart!`;
    document.body.appendChild(message);

    // Remove after 3 seconds
    setTimeout(() => {
      if (message.parentNode) {
        message.parentNode.removeChild(message);
      }
    }, 3000);
  }

  goToCart() {
    this.router.navigate(['/cart']);
  }

  goBack() {
    this.router.navigate(['/products']);
  }

  onImageError(event: any) {
    event.target.src = '/assets/images/default-product.jpg';
  }

  isInCart(): boolean {
    const product = this.product();
    return product ? this.cartService.isInCart(product._id) : false;
  }

  getCartQuantity(): number {
    const product = this.product();
    return product ? this.cartService.getItemQuantity(product._id) : 0;
  }
}