import { Component, OnInit, OnDestroy } from '@angular/core';
import { DataSharingService } from '../../../data-shering-service/data-sharing.service';
import { Subscription } from 'rxjs';
import { Router } from "@angular/router";
import { DirectionService } from '../../../../direction.service';

@Component({
  selector: 'app-navigation-to-branches',
  templateUrl: './navigation-to-branches.component.html',
  styleUrls: ['./navigation-to-branches.component.css']
})
export class NavigationToBranchesComponent implements OnInit, OnDestroy {
  public printingService: string = '';
  public printingServices: { name: string }[] = [];
  private dataServiceSubscription: Subscription;
  isDarkMode: boolean = false;
  isNavOpen: boolean = false;
  isRTL: boolean = true;

  constructor(
    private dataSharingService: DataSharingService,
    private router: Router,
    private directionService: DirectionService
  ) { }

  ngOnInit() {
    this.directionService.direction$.subscribe(direction => {
      this.isRTL = direction === 'rtl';
    });

    this.directionService.isDarkMode$.subscribe(isDarkMode => {
      this.isDarkMode = isDarkMode;
    });

    this.printingServices = this.dataSharingService.getPrintingServices();

    this.dataServiceSubscription = this.dataSharingService.getPrintingService().subscribe((value) => {
      this.printingService = value;
    });

    if (this.router.url === '/product' || this.router.url === '/phprint') {
      this.printingService = 'ph';
    }
  }

  ngOnDestroy() {
    this.dataServiceSubscription.unsubscribe();
  }

  chaingePrintingService(service) {
    this.dataSharingService.setPrintingService(service);
    if (service === 'express' || service === 'plotter') {
      this.router.navigate(['/branch']);
    }
    if (service === 'ph') {
      this.router.navigate(['/product']);
    }
    this.closeMainNav();
  }

  goHome() {
    this.router.navigate(['/']);
  }

  toggleMainNav() {
    this.isNavOpen = !this.isNavOpen;
  }

  closeMainNav() {
    this.isNavOpen = false;
  }

  isSu() {
    if (localStorage.getItem('roles') && localStorage.getItem('roles').includes('su')) {
      return true;
    }
    return false;
  }

}
