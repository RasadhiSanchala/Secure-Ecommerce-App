// src/app/products/products.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService, Product } from '../services/product.service';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './products.html',
  styleUrl: './products.css'
})
export class ProductsComponent implements OnInit {
  filteredProducts = signal<Product[]>([]);
  selectedCategory = signal<string>('');
  searchTerm = signal<string>('');

  constructor(public productService: ProductService) {}

  ngOnInit() {
    this.loadProducts();
  }

  loadProducts() {
    this.productService.getAllProducts().subscribe({
      next: () => {
        this.filteredProducts.set(this.productService.products());
      },
      error: (error) => {
        console.error('Error loading products:', error);
        // Set mock data for development
        this.setMockData();
      }
    });
  }

  filterProducts() {
    const filtered = this.productService.filterProducts(
      this.searchTerm(),
      this.selectedCategory()
    );
    this.filteredProducts.set(filtered);
  }

  addToCart(product: Product) {
    if (!product.available) return;
    alert(`Added ${product.name} to cart! (Cart functionality coming soon)`);
  }

  onImageError(event: any) {
    event.target.src = '/assets/images/default-product.jpg';
  }

  private setMockData() {
    // Mock data implementation stays the same
    const mockProducts: Product[] = [
      {
        _id: '1',
        name: 'Artisan Sourdough Bread',
        description: 'Handcrafted sourdough bread with a perfect crust and tangy flavor',
        price: 8.99,
        category: 'Breads',
        imageUrl: '',
        available: true,
        stock: 20,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: '2',
        name: 'Chocolate Croissant',
        description: 'Buttery, flaky croissant filled with rich dark chocolate',
        price: 4.50,
        category: 'Pastries',
        imageUrl: '',
        available: true,
        stock: 15,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: '3',
        name: 'Red Velvet Cake',
        description: 'Classic red velvet cake with cream cheese frosting',
        price: 24.99,
        category: 'Cakes',
        imageUrl: '',
        available: true,
        stock: 5,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: '4',
        name: 'Blueberry Muffins',
        description: 'Fluffy muffins bursting with fresh blueberries',
        price: 3.25,
        category: 'Muffins',
        imageUrl: '',
        available: true,
        stock: 25,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Simulate the service behavior
    this.productService['_products'].set(mockProducts);
    this.productService['_categories'].set(['Breads', 'Pastries', 'Cakes', 'Muffins']);
    this.filteredProducts.set(mockProducts);
  }
}
