// frontend/src/app/admin/products/admin-products.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProductService, Product, CreateProductRequest } from '../../services/product.service';

@Component({
  selector: 'app-admin-products',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, FormsModule],
  templateUrl: './admin-products.html',
  styleUrl: './admin-products.css'
})
export class AdminProductsComponent implements OnInit {
  productForm: FormGroup;
  editingProduct = signal<Product | null>(null);
  showForm = signal<boolean>(false);
  searchTerm = signal<string>('');
  selectedCategory = signal<string>('');
  selectedStatus = signal<string>('');
  errorMessage = signal<string>('');
  successMessage = signal<string>('');

  filteredProducts = signal<Product[]>([]);

  constructor(
    private fb: FormBuilder,
    public productService: ProductService
  ) {
    this.productForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: ['', [Validators.required]],
      price: ['', [Validators.required, Validators.min(0.01)]],
      category: ['', [Validators.required]],
      imageUrl: [''],
      available: [true],
      stock: ['', [Validators.required, Validators.min(0)]]
    });
  }

  ngOnInit() {
    this.loadProducts();
  }

  loadProducts() {
    this.productService.getAllProducts().subscribe({
      next: () => {
        this.filterProducts();
      },
      error: (error) => {
        console.error('Error loading products:', error);
        this.showError('Failed to load products');
      }
    });
  }

  filterProducts() {
    let filtered = this.productService.products();

    // Apply search filter
    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term)
      );
    }

    // Apply category filter
    if (this.selectedCategory()) {
      filtered = filtered.filter(p => p.category === this.selectedCategory());
    }

    // Apply status filter
    if (this.selectedStatus()) {
      if (this.selectedStatus() === 'available') {
        filtered = filtered.filter(p => p.available);
      } else if (this.selectedStatus() === 'unavailable') {
        filtered = filtered.filter(p => !p.available);
      } else if (this.selectedStatus() === 'low-stock') {
        filtered = filtered.filter(p => p.stock < 10);
      }
    }

    this.filteredProducts.set(filtered);
  }

  showAddForm() {
    this.editingProduct.set(null);
    this.productForm.reset({
      name: '',
      description: '',
      price: '',
      category: '',
      imageUrl: '',
      available: true,
      stock: ''
    });
    this.showForm.set(true);
  }

  editProduct(product: Product) {
    this.editingProduct.set(product);
    this.productForm.patchValue({
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      imageUrl: product.imageUrl,
      available: product.available,
      stock: product.stock
    });
    this.showForm.set(true);
  }

  cancelForm() {
    this.showForm.set(false);
    this.editingProduct.set(null);
    this.productForm.reset();
  }

  onSubmit() {
    if (this.productForm.valid) {
      const productData: CreateProductRequest = {
        name: this.productForm.get('name')?.value,
        description: this.productForm.get('description')?.value,
        price: parseFloat(this.productForm.get('price')?.value),
        category: this.productForm.get('category')?.value,
        imageUrl: this.productForm.get('imageUrl')?.value || '',
        available: this.productForm.get('available')?.value,
        stock: parseInt(this.productForm.get('stock')?.value)
      };

      const editing = this.editingProduct();

      if (editing) {
        // Update existing product
        this.productService.updateProduct(editing._id, productData).subscribe({
          next: (response) => {
            this.showSuccess('Product updated successfully!');
            this.cancelForm();
            this.filterProducts();
          },
          error: (error) => {
            console.error('Error updating product:', error);
            this.showError(error.error?.message || 'Failed to update product');
          }
        });
      } else {
        // Create new product
        this.productService.createProduct(productData).subscribe({
          next: (response) => {
            this.showSuccess('Product created successfully!');
            this.cancelForm();
            this.filterProducts();
          },
          error: (error) => {
            console.error('Error creating product:', error);
            this.showError(error.error?.message || 'Failed to create product');
          }
        });
      }
    } else {
      this.markFormGroupTouched();
    }
  }

  deleteProduct(product: Product) {
    if (confirm(`Are you sure you want to delete "${product.name}"? This action cannot be undone.`)) {
      this.productService.deleteProduct(product._id).subscribe({
        next: (response) => {
          this.showSuccess('Product deleted successfully!');
          this.filterProducts();
        },
        error: (error) => {
          console.error('Error deleting product:', error);
          this.showError(error.error?.message || 'Failed to delete product');
        }
      });
    }
  }

  toggleAvailability(product: Product) {
    const updateData = { available: !product.available };

    this.productService.updateProduct(product._id, updateData).subscribe({
      next: (response) => {
        this.showSuccess(`Product ${product.available ? 'disabled' : 'enabled'} successfully!`);
        this.filterProducts();
      },
      error: (error) => {
        console.error('Error updating product availability:', error);
        this.showError('Failed to update product availability');
      }
    });
  }

  onImageError(event: any) {
    event.target.src = '/assets/images/default-product.jpg';
  }

  formatCurrency(amount: number): string {
    return `${amount.toFixed(2)}`;
  }

  formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  private markFormGroupTouched() {
    Object.keys(this.productForm.controls).forEach(field => {
      const control = this.productForm.get(field);
      control?.markAsTouched({ onlySelf: true });
    });
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
