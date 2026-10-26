import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ServiceProduct } from './product';
@Injectable({providedIn:'root'}) export class CatalogService {
  private http = inject(HttpClient);
  list(): Observable<ServiceProduct[]> { return this.http.get<ServiceProduct[]>('/api/instant-fixes'); }
  get(slug:string): Observable<ServiceProduct> { return this.http.get<ServiceProduct>('/api/instant-fixes/'+encodeURIComponent(slug)); }
}
