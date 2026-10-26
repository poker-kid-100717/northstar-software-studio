import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
@Component({
  selector:'ns-root',
  standalone:true,
  imports:[RouterLink,RouterOutlet],
  template:`<header class="header"><a class="brand" routerLink="/" aria-label="Northstar Software Studio home"><span class="star" aria-hidden="true">✳</span> NORTHSTAR <span class="brand-light">SOFTWARE STUDIO</span></a><nav aria-label="Main navigation"><a routerLink="/">Home</a><a routerLink="/instant-fixes">Instant Fixes</a><a routerLink="/consultation">Consulting</a><a class="nav-cta" routerLink="/consultation">Start a project</a></nav></header><main><router-outlet/></main><footer>© Northstar Software Studio · Practical software engineering, clearly scoped. <span>Instant Fix purchases are not yet enabled.</span></footer>`
})
export class AppComponent {}
