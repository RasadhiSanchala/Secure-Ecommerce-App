import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  available: boolean;
}

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './products.html',
  styleUrl: './products.css'
})
export class ProductsComponent implements OnInit {
  products = signal<Product[]>([]);
  filteredProducts = signal<Product[]>([]);
  categories = signal<string[]>([]);
  selectedCategory = signal<string>('');
  searchTerm = signal<string>('');
  loading = signal<boolean>(true);

  private apiUrl = 'http://localhost:3000/products';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadProducts();
  }

  loadProducts() {
    this.loading.set(true);
    this.http.get<{products: Product[], count: number}>(`${this.apiUrl}`)
      .subscribe({
        next: (response) => {
          this.products.set(response.products);
          this.filteredProducts.set(response.products);
          this.extractCategories();
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error loading products:', error);
          this.loading.set(false);
          // Set mock data for development
          this.setMockData();
        }
      });
  }

  private extractCategories() {
    const categorySet = new Set(this.products().map(p => p.category));
    this.categories.set(Array.from(categorySet));
  }

  filterProducts() {
    let filtered = this.products();

    // Filter by category
    if (this.selectedCategory()) {
      filtered = filtered.filter(p => p.category === this.selectedCategory());
    }

    // Filter by search term
    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(term) || 
        p.description.toLowerCase().includes(term)
      );
    }

    this.filteredProducts.set(filtered);
  }

  addToCart(product: Product) {
    if (!product.available) return;
    
    // TODO: Implement cart functionality
    alert(`Added ${product.name} to cart! (Cart functionality coming soon)`);
  }

  onImageError(event: any) {
    event.target.src = '/assets/images/default-product.jpg';
  }

  private setMockData() {
    const mockProducts: Product[] = [
      {
        _id: '1',
        name: 'Artisan Sourdough Bread',
        description: 'Handcrafted sourdough bread with a perfect crust and tangy flavor',
        price: 8.99,
        category: 'Breads',
        imageUrl: '',
        available: true
      },
      {
        _id: '2',
        name: 'Chocolate Croissant',
        description: 'Buttery, flaky croissant filled with rich dark chocolate',
        price: 4.50,
        category: 'Pastries',
        imageUrl: '',
        available: true
      },
      {
        _id: '3',
        name: 'Red Velvet Cake',
        description: 'Classic red velvet cake with cream cheese frosting',
        price: 24.99,
        category: 'Cakes',
        imageUrl: '',
        available: true
      },
      {
        _id: '4',
        name: 'Blueberry Muffins',
        description: 'Fluffy muffins bursting with fresh blueberries',
        price: 3.25,
        category: 'Muffins',
        imageUrl: '',
        available: true
      }
    ];

    this.products.set(mockProducts);
    this.filteredProducts.set(mockProducts);
    this.extractCategories();
  }
}