import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { Subscription } from 'rxjs';

import { DirectionService } from '../../direction.service';
import { AuthService } from 'src/app/auth/auth.service';
import { DialogService } from 'src/app/dialog/dialog.service';

import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-close-branch',
  templateUrl: './close-branch.component.html',
  styleUrls: ['./close-branch.component.css'],
  host: {
    class: 'fill-screen-modal-phone'
  }
})
export class CloseBranchComponent implements OnInit, OnDestroy {
  isRTL: boolean = true;
  private directionSubscription: Subscription;
  isDarkMode: boolean = false;
  isLoading: boolean = false;
  isLoadingUpdates = false;

  userId: string;
  userIsAuthenticated = false;
  private authStatusSub: Subscription;

  printingService: string;
  branch: string;
  close_msg: string;

  constructor(
    private directionService: DirectionService,
    private authService: AuthService,
    private dialogService: DialogService,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {
    this.printingService = data.service;
    this.branch = data.branch;
    this.close_msg = data.close_msg;
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

  closeCloseBranchDialog() {
    this.dialogService.onCloseCloseBranchDialog();
  }

  ngOnDestroy() {
    this.directionSubscription.unsubscribe();
    this.authStatusSub.unsubscribe();
  }

  // ===============
}
