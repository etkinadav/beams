import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-privacy-policy',
  templateUrl: './privacy-policy.component.html',
  styleUrls: ['./privacy-policy.component.css'],
  host: {
    class: 'fill-screen'
  }
})
export class PrivacyPolicyComponent {
  constructor(
    private router: Router
  ) { }

  navigateHome() {
    this.router.navigate(['/']);
  }

  openWhatsApp() {
    const phoneNumber = '97233746962';
    const message = encodeURIComponent('Privacy-Policy-At-Eazix');
    const url = `https://wa.me/${phoneNumber}?text=${message}`;
    window.open(url, '_blank');
  }
}
