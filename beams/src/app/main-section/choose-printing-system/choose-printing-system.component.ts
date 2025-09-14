import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';

import { DirectionService } from '../../direction.service';
import { DataSharingService } from '../data-shering-service/data-sharing.service';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from "src/app/auth/auth.service";

import { UsersService } from 'src/app/super-management/user/users.service';
import { DialogService } from 'src/app/dialog/dialog.service';
import { set } from 'lodash';
@Component({
  selector: 'app-choose-printing-system',
  templateUrl: './choose-printing-system.component.html',
  styleUrls: ['./choose-printing-system.component.scss'],
  host: {
    class: 'fill-screen'
  }
})

export class ChoosePrintingSystemComponent implements OnInit, OnDestroy {
  isRTL: boolean = true;
  isDarkMode: boolean = false;
  private directionSubscription: Subscription;
  public hoveredPrintingService: string = '';
  public printingService: string = '';
  continueToServiceText: string = '';
  byPrinterNumberExplanation: string = '';
  userIsAuthenticated = false;
  userId: string;
  private authStatusSub: Subscription;
  isSystemSet: boolean = false;

  constructor(
    private directionService: DirectionService,
    private dataSharingService: DataSharingService,
    private router: Router,
    private authService: AuthService,
    private dialogService: DialogService,
    private translateService: TranslateService) {
    this.translateService.onLangChange.subscribe(() => {
      this.updatecontinueToServiceText();
      this.updatebyPrinterNumberExplanation();
    });
  }

  ngOnInit() {
    this.directionService.direction$.subscribe(direction => {
      this.isRTL = direction === 'rtl';
    });

    this.directionService.isDarkMode$.subscribe(isDarkMode => {
      this.isDarkMode = isDarkMode;
    });

    this.dataSharingService.getPrintingService().subscribe((value) => {
      this.printingService = value;
      this.updatecontinueToServiceText();
      setTimeout(() => {
        if (this.printingService === 'express' || this.printingService === 'plotter' || this.printingService === 'ph') {
          this.isSystemSet = true;
        } else {
          this.isSystemSet = false;
        }
      }, 120);
    });

    this.userId = this.authService.getUserId();
    this.userIsAuthenticated = this.authService.getIsAuth();
    this.authStatusSub = this.authService
      .getAuthStatusListener()
      .subscribe(isAuthenticated => {
        this.userIsAuthenticated = isAuthenticated;
        this.userId = this.authService.getUserId();
      });
  }

  ngOnDestroy() {
    // this.authStatusSub.unsubscribe();
  }

  onHoverPrintingService(value: string) {
    this.hoveredPrintingService = value;
  }

  onChoosePrintingService(value: string) {
    if (value === "express" || value === "plotter" || value === "ph") {
      this.printingService = value;
      this.updatecontinueToServiceText();
      this.onSetPrintingService();
    }
  }

  onSetPrintingService() {
    if (this.printingService === "express" || this.printingService === "plotter") {
      this.dataSharingService.setPrintingService(this.printingService);
      this.router.navigate(['/branch']);
    }
    if (this.printingService === "ph") {
      this.dataSharingService.setPrintingService("ph");
      this.router.navigate(['/product']);
    }
  }

  updatecontinueToServiceText() {
    this.continueToServiceText =
      this.translateService.instant('choose-system.continue-to') +
      this.translateService.instant('choose-system.title-short-' + this.printingService);
  }

  updatebyPrinterNumberExplanation() {
    this.byPrinterNumberExplanation = this.translateService.instant('choose-system.by-printer-number-explanation');
  }

  // step-item-trans-plotter

  onScrollContainerScroll(event: Event) {
    const target = event.target as HTMLElement;
    const scrollPosition = target.scrollTop;
    console.log("scrollPosition", scrollPosition);
    if (scrollPosition && scrollPosition > 30) {
      this.router.navigate(['/home']);
    }
  }

  openPrinterNumnerDialod() {
    this.dialogService.onOpenPrinterNumberDialog();
  }

  isSu() {
    if (localStorage.getItem("roles")?.includes("su")) {
      return true;
    }
    return false;
  }
  // ==================
}
