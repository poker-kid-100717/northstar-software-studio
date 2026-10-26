import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
@Component({standalone:true,imports:[RouterLink],template:`<section class="page detail"><p class="eyebrow">STRIPE TEST MODE</p><h1>{{success ? 'Test checkout returned' : 'Test checkout cancelled'}}</h1><p class="lead">{{success ? 'Payment is not confirmed by this page. The server must receive and verify the Stripe webhook before the order is marked paid.' : 'No payment confirmation was received. You can return to the catalog.'}}</p><a routerLink="/instant-fixes">Return to Instant Fixes</a></section>`})
export class CheckoutResultComponent { private route=inject(ActivatedRoute); success=this.route.snapshot.data['success']===true; }
