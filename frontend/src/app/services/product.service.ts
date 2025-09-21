// src/app/services/product.service.ts
import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, of, catchError, map, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  available: boolean;
  stock: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ProductResponse {
  products: Product[];
  count: number;
  isAdmin: boolean;
}

export interface CreateProductRequest {
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl?: string;
  available?: boolean;
  stock?: number;
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {
  _id?: never; // Prevent _id from being updated
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private readonly _products = signal<Product[]>([]);
  private readonly _categories = signal<string[]>([]);
  private readonly _isLoading = signal<boolean>(false);

  readonly products = this._products.asReadonly();
  readonly categories = this._categories.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  getAllProducts(): Observable<ProductResponse> {
    this._isLoading.set(true);

    return this.http.get<ProductResponse>(`${environment.apiUrl}/products`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      tap(response => {
        this._products.set(response.products);
        this.updateCategories(response.products);
        this._isLoading.set(false);
      })
    );
  }

  // Get single product by ID
  getProduct(id: string): Observable<Product> {
    this._isLoading.set(true);

    return this.http.get<Product>(`${environment.apiUrl}/products/${id}`).pipe(
      map(product => {
        this._isLoading.set(false);
        return product;
      }),
      catchError((error) => {
        console.error('Error fetching product from API:', error);
        this._isLoading.set(false);

        // Fallback to local products if available
        const existingProducts = this._products();
        const localProduct = existingProducts.find(p => p._id === id);

        if (localProduct) {
          return of(localProduct);
        }

        // If not found locally, throw error
        throw new Error('Product not found');
      })
    );
  }


  createProduct(productData: CreateProductRequest): Observable<Product> {
    return this.http.post<Product>(`${environment.apiUrl}/products`, productData, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      tap(newProduct => {
        const currentProducts = this._products();
        this._products.set([newProduct, ...currentProducts]);
        this.updateCategories(this._products());
      })
    );
  }

  updateProduct(id: string, productData: UpdateProductRequest): Observable<Product> {
    return this.http.put<Product>(`${environment.apiUrl}/products/${id}`, productData, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      tap(updatedProduct => {
        const currentProducts = this._products();
        const index = currentProducts.findIndex(p => p._id === id);
        if (index > -1) {
          const newProducts = [...currentProducts];
          newProducts[index] = updatedProduct;
          this._products.set(newProducts);
          this.updateCategories(newProducts);
        }
      })
    );
  }

  deleteProduct(id: string): Observable<{ message: string; deletedProduct: any }> {
    return this.http.delete<{ message: string; deletedProduct: any }>(`${environment.apiUrl}/products/${id}`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      tap(() => {
        const currentProducts = this._products();
        const filteredProducts = currentProducts.filter(p => p._id !== id);
        this._products.set(filteredProducts);
        this.updateCategories(filteredProducts);
      })
    );
  }

  searchProducts(term: string): Product[] {
    if (!term.trim()) return this._products();

    const searchTerm = term.toLowerCase();
    return this._products().filter(product =>
      product.name.toLowerCase().includes(searchTerm) ||
      product.description.toLowerCase().includes(searchTerm) ||
      product.category.toLowerCase().includes(searchTerm)
    );
  }

  filterByCategory(category: string): Product[] {
    if (!category) return this._products();
    return this._products().filter(product => product.category === category);
  }

  filterProducts(searchTerm?: string, category?: string): Product[] {
    let filtered = this._products();

    if (category) {
      filtered = filtered.filter(p => p.category === category);
    }

    if (searchTerm?.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term)
      );
    }

    return filtered;
  }

  private updateCategories(products: Product[]): void {
    const categorySet = new Set(products.map(p => p.category));
    this._categories.set(Array.from(categorySet).sort());
  }
}
