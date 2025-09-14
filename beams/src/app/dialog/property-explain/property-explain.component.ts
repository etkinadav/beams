import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { Subscription } from 'rxjs';

import { DirectionService } from '../../direction.service';
import { AuthService } from 'src/app/auth/auth.service';
import { DialogService } from 'src/app/dialog/dialog.service';

import { UsersService } from 'src/app/super-management/user/users.service';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-property-explain',
  templateUrl: './property-explain.component.html',
  styleUrls: ['./property-explain.component.css'],
})

export class PropertyExplainComponent implements OnInit, OnDestroy {
  isRTL: boolean = true;
  private directionSubscription: Subscription;
  isDarkMode: boolean = false;
  isLoading: boolean = false;
  isLoadingUpdates = false;

  userId: string;
  userIsAuthenticated = false;
  private authStatusSub: Subscription;

  property: string = '';
  printingService: string = '';
  realBranch: any = {};

  inputBins: any[];
  printServicePapers: any[];

  constructor(
    private directionService: DirectionService,
    private authService: AuthService,
    private dialogService: DialogService,
    private usersService: UsersService,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {
    this.property = data.property;
    this.printingService = data.printingService;
    this.realBranch = data.realBranch;

    if (this.printingService === 'plotter') {
      this.printServicePapers = this.realBranch.plotter.printers[0].inputBins;
    } else if (this.printingService === 'express') {
      this.printServicePapers = this.realBranch.express.consumables.papers;
    }
    this.inputBins = this.realBranch.plotter?.printers[0].inputBins
  }

  async ngOnInit() {
    this.isLoading = true;
    this.directionSubscription = this.directionService.direction$.subscribe(direction => {
      this.isRTL = direction === 'rtl';
    });

    this.directionService.isDarkMode$.subscribe(isDarkMode => {
      this.isDarkMode = isDarkMode;
    });

    this.userId = this.authService.getUserId();
    this.userIsAuthenticated = this.authService.getIsAuth();
    this.authStatusSub = this.authService
      .getAuthStatusListener()
      .subscribe(isAuthenticated => {
        this.userIsAuthenticated = isAuthenticated;
        this.userId = this.authService.getUserId();
      });

    this.isLoading = false;
  }

  closePropertyExplainDialog() {
    this.dialogService.onCloseExplainPropertyDialog();
  }

  ngOnDestroy() {
    this.directionSubscription.unsubscribe();
    this.authStatusSub.unsubscribe();
  }

  // ===============
}
