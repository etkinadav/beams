import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';

import { DirectionService } from '../../../direction.service';
import { DataSharingService } from '../../data-shering-service/data-sharing.service';
import { BranchesService } from 'src/app/super-management/branch/branches.service';

@Component({
  selector: 'app-navigate-dropdown',
  templateUrl: './navigate-dropdown.component.html',
  styleUrls: ['./navigate-dropdown.component.css']
})
export class NavigateDropdownComponent implements OnInit, OnDestroy {
  isRTL: boolean = true;
  isDarkMode: boolean = false;
  public printingService: string = '';
  private printingServiceSubscription: Subscription;
  isNavOpen: boolean = false;
  isPrintRoute: boolean = false;

  constructor(
    private directionService: DirectionService,
    private dataSharingService: DataSharingService,
    private router: Router,
  ) { }

  ngOnInit() {
    this.directionService.isDarkMode$.subscribe(isDarkMode => {
      this.isDarkMode = isDarkMode;
    });

    this.printingServiceSubscription = this.dataSharingService.getPrintingService().subscribe((value) => {
      this.printingService = value;
      if (this.isNavOpen) {
        this.closeMainNav();
      }
    });

    console.log(this.router.url);
    if (this.router.url === '/print') {
      this.isPrintRoute = true;
    }
  }

  ngOnDestroy() {
    this.printingServiceSubscription.unsubscribe();
  }

  toggleMainNav() {
    this.isNavOpen = !this.isNavOpen;
  }

  closeMainNav() {
    this.isNavOpen = false;
  }
}



