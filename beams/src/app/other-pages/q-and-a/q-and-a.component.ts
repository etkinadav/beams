import { Component, OnInit, OnDestroy } from "@angular/core";
import { Subscription } from 'rxjs';
import { DirectionService } from '../../direction.service';

import { AuthService } from "src/app/auth/auth.service";

import { Router } from "@angular/router";
import { DialogService } from 'src/app/dialog/dialog.service';
import { DataSharingService } from '../../main-section/data-shering-service/data-sharing.service';

@Component({
  selector: "app-q-and-a-list",
  templateUrl: "./q-and-a.component.html",
  styleUrls: ["./q-and-a.component.css"],
  host: {
    class: 'fill-screen'
  }
})

export class QAndAComponent implements OnInit, OnDestroy {
  isRTL: boolean = true;
  private directionSubscription: Subscription;
  isDarkMode: boolean = false;
  isLoading = false;

  userId: string;
  userIsAuthenticated = false;
  private authStatusSub: Subscription;

  qAndAs = [
    {
      name: "how-to-print",
      type: "general"
    },
    {
      name: "how-to-print-express",
      type: "express"
    },
    {
      name: "how-to-print-plotter",
      type: "plotter"
    }
  ];

  constructor(
    private authService: AuthService,
    private directionService: DirectionService,
    private router: Router,
    private dialogService: DialogService,
    private dataSharingService: DataSharingService,
  ) { }

  ngOnInit() {
    this.isLoading = true;

    this.directionSubscription = this.directionService.direction$.subscribe(direction => {
      this.isRTL = direction === 'rtl';
    });

    this.directionService.isDarkMode$.subscribe(isDarkMode => {
      this.isDarkMode = isDarkMode;
    });

    this.userIsAuthenticated = this.authService.getIsAuth();
    this.authStatusSub = this.authService
      .getAuthStatusListener()
      .subscribe(isAuthenticated => {
        this.userIsAuthenticated = isAuthenticated;
        this.userId = this.authService.getUserId();
      });

    this.isLoading = false;
  }

  ngOnDestroy() {
    this.authStatusSub.unsubscribe();
    this.directionSubscription.unsubscribe();
  }

  goToNewOrder() {
    const printingService = localStorage.getItem('printingService');
    const branch = localStorage.getItem('branch');
    if (printingService && printingService !== 'null' && printingService !== '' &&
      branch && branch !== 'null' && branch !== '') {
      this.dialogService.onOpenRightPlaceDialog();
    } else if (branch && branch !== 'null' && branch !== '') {
      this.router.navigate(["/branch"]);
    } else {
      this.router.navigate(["/"]);
    }
  }

  goToChooseBranch(service: string) {
    this.dataSharingService.setPrintingService(service);
    this.router.navigate(['/branch']);
  }

  openWhatsAppEditMode(msg: string) {
    const phoneNumber = '97233746962';
    const message = encodeURIComponent(msg);
    const url = `https://wa.me/${phoneNumber}?text=${message}`;
    window.open(url, '_blank');
  }

  // ===============
}
