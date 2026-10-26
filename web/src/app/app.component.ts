import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
@Component({selector:'ns-root',standalone:true,imports:[RouterLink,RouterOutlet],template:`<header class="header"><a class="brand" routerLink="/"><span class="star">✳</span> NORTHSTAR <span class="brand-light">SOFTWARE STUDIO</span></a><nav aria-label="Main navigation"><a routerLink="/">Home</a><a routerLink="/instant-fixes">Instant Fixes</a><a routerLink="/consultation">Consultation inquiry</a></nav></header><main><router-outlet/></main><footer>© Northstar Software Studio · Focused technical help, clearly scoped. <span>Purchases not yet enabled.</span></footer>`})
export class AppComponent {}
