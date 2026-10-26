import { Routes } from '@angular/router';
import { IntakeComponent } from './intake.component';
import { HomeComponent } from './home.component';
import { CatalogComponent } from './catalog.component';
import { ProductDetailComponent } from './product-detail.component';
export const routes:Routes=[{path:'',component:HomeComponent},{path:'instant-fixes',component:CatalogComponent},{path:'instant-fixes/:slug',component:ProductDetailComponent},{path:'instant-fixes/:slug/intake',component:IntakeComponent},{path:'**',redirectTo:''}];
