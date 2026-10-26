import { Routes } from '@angular/router';
import { CheckoutResultComponent } from './checkout-result.component';
import { IntakeComponent } from './intake.component';
import { HomeComponent } from './home.component';
import { CatalogComponent } from './catalog.component';
import { ProductDetailComponent } from './product-detail.component';
export const routes:Routes=[{path:'',component:HomeComponent},{path:'instant-fixes',component:CatalogComponent},{path:'instant-fixes/:slug',component:ProductDetailComponent},{path:'instant-fixes/:slug/intake',component:IntakeComponent},{path:'checkout/success',component:CheckoutResultComponent,data:{success:true}},{path:'checkout/cancel',component:CheckoutResultComponent,data:{success:false}},{path:'**',redirectTo:''}];
