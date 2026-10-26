import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CatalogService } from './catalog.service';
import { ServiceProduct } from './product';
@Component({standalone:true,imports:[CommonModule,RouterLink],template:`<section class="page detail"><a routerLink="/instant-fixes" class="back">← All Instant Fixes</a><p *ngIf="loading">Loading service…</p><p *ngIf="error" role="alert">Service unavailable or not found.</p><article *ngIf="product as p"><p class="eyebrow">{{p.category}}</p><h1>{{p.name}}</h1><p class="lead">{{p.description}}</p><div class="detail-grid"><div><h2>What's included</h2><p>{{p.scope}}</p><h2>What's excluded</h2><p>{{p.exclusions}}</p><h2>What we need</h2><p>{{p.requiredInputs}}</p><h2>Deliverables</h2><p>{{p.deliverables}}</p><p>Includes {{p.revisionAllowance}} reasonable revision.</p></div><aside class="card checkout"><div class="price">${{p.priceCents/100}}</div><p>Fixed price · Estimated {{p.turnaroundBusinessDays}} business days after acceptance</p><button class="button primary" disabled>Buy Now — Coming Soon</button><p class="fineprint">Secure checkout is being implemented. No payment is collected at this stage.</p></aside></div></article></section>`}) export class ProductDetailComponent implements OnInit {
 private api=inject(CatalogService);private route=inject(ActivatedRoute);product?:ServiceProduct;loading=true;error=false;
 ngOnInit(){const slug=this.route.snapshot.paramMap.get('slug')??'';this.api.get(slug).subscribe({next:p=>{this.product=p;this.loading=false},error:()=>{this.error=true;this.loading=false}})}
}
