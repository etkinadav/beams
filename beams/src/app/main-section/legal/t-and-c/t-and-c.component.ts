import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-t-and-c',
  templateUrl: './t-and-c.component.html',
  styleUrls: ['./t-and-c.component.css'],
  host: {
    class: 'fill-screen'
  }
})

export class TAndCComponent {
  constructor(
    private router: Router
  ) { }

  navigateHome() {
    this.router.navigate(['/']);
  }

  openWhatsApp() {
    const phoneNumber = '97233746962';
    const message = encodeURIComponent('T_And_C-At-Eazix');
    const url = `https://wa.me/${phoneNumber}?text=${message}`;
    window.open(url, '_blank');
  }
}
