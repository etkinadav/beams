import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { Subscription } from 'rxjs';

import { DirectionService } from '../../direction.service';
import { AuthService } from 'src/app/auth/auth.service';
import { DialogService } from 'src/app/dialog/dialog.service';

import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BranchesService } from 'src/app/super-management/branch/branches.service';
import { NgForm } from "@angular/forms";

@Component({
  selector: 'app-scan-copy',
  templateUrl: './scan-copy.component.html',
  styleUrls: ['./scan-copy.component.css'],
  host: {
    class: 'fill-screen-modal-scan-copy'
  }
})
export class CopyScanComponent implements OnInit, OnDestroy {
  isRTL: boolean = true;
  private directionSubscription: Subscription;
  isDarkMode: boolean = false;
  isLoading: boolean = false;
  isLoadingUpdates = false;

  userId: string;
  userIsAuthenticated = false;
  private authStatusSub: Subscription;

  currentStage: string = 'scanOrCopy';
  expressBranch: any = {};
  scanningScatusUpdated: string = 'notUpdated';
  private intervalId: any;

  isVisible: boolean = false;
  isStartedScanning: boolean = false;
  isFinishedScanning: boolean = false;
  isWaitingForOtherUser: boolean = false;

  isEmailConfirmed: boolean = false;
  email: string = '';

  constructor(
    private directionService: DirectionService,
    private authService: AuthService,
    private dialogService: DialogService,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private branchesService: BranchesService,
  ) {
    this.expressBranch = data.expressBranch;
  }

  async ngOnInit() {
    this.currentStage = 'scanOrCopy';
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

    try {
      console.log('expressBranch:', this.expressBranch);

      // Initial fetch of branches
      await this.updateScanningStatus(this.expressBranch._id, localStorage.getItem('userId'));

      // Fetch branches every 10 seconds
      this.intervalId = setInterval(async () => {
        await this.updateScanningStatus(this.expressBranch._id, localStorage.getItem('userId'));
      }, 5000);

      this.isLoading = false;
    } catch (error) {
      console.error('Error fetching and transforming branches:', error);
    }
  }

  async updateScanningStatus(printerId?: string, userId?: string) {
    try {
      const response = await this.branchesService.getBranchScanningStatus(printerId, userId).toPromise();
      this.scanningScatusUpdated = response.scanningStatus;
      // scanning now?
      if (this.currentStage === 'copy-2' ||
        this.currentStage === 'scan-2') {
        // started but not finished?
        if (this.scanningScatusUpdated === 'scanning' &&
          !this.isStartedScanning && !this.isFinishedScanning) {
          this.isStartedScanning = true;
        }
        // started and also finished?
        if (this.scanningScatusUpdated !== 'scanning' &&
          this.isStartedScanning && !this.isFinishedScanning) {
          this.isFinishedScanning = true;
        }
        // not scanning now?
      } else {
        if (this.isStartedScanning) {
          this.isStartedScanning = false;
        }
        if (this.isFinishedScanning) {
          this.isFinishedScanning = false;
        }
      }
      // Waiting for other user to finish scanning
      if (this.scanningScatusUpdated === 'occupied' &&
        (this.currentStage === 'scan-2' || this.currentStage === 'copy-2')) {
        this.isWaitingForOtherUser = true;
      }
    } catch (error) {
      console.error('Error fetching and transforming branches:', error);
    }
  }


  closeCopyScanDialog() {
    this.dialogService.onCloseScanCopyDialog();
  }

  ngOnDestroy() {
    this.directionSubscription.unsubscribe();
    this.authStatusSub.unsubscribe();
    clearInterval(this.intervalId);
  }

  toStage(stage: string) {

    if (stage === 'next') {
      // NEXT (copy-1 + scan-1)
      if (this.currentStage === 'copy-1') {
        this.currentStage = 'copy-2';
        this.isVisible = true;
      } else if (this.currentStage === 'scan-1') {
        this.currentStage = 'scan-2';
        this.isVisible = true;
      } else {
        this.currentStage = 'scanOrCopy';
      }
      this.scan();
    } else if (stage === 'previous') {
      // PREVIOUS (scan-2 + copy-2)
      if (this.currentStage === 'copy-2') {
        this.currentStage = 'copy-1';
        this.isVisible = false;
      } else if (this.currentStage === 'scan-2') {
        this.currentStage = 'scan-1';
        this.isVisible = false;
        this.isEmailConfirmed = false;
      }
      this.isWaitingForOtherUser = false;
    } else {
      // NORMAL
      this.currentStage = stage;
    }

    // CLEAR (scanOrCopy)
    if (this.currentStage === 'scanOrCopy') {
      this.isStartedScanning = false;
      this.isFinishedScanning = false;
      this.isEmailConfirmed = false;
      this.isWaitingForOtherUser = false;
    }

    // EMAIL (scan-1)
    if (this.currentStage === 'scan-1') {
      if (localStorage.getItem('email') && localStorage.getItem('email') !== '' && localStorage.getItem('email') !== 'undefined') {
        this.email = localStorage.getItem('email');
      } else {
        this.email = '';
      }
    }
  }

  scan() {
    // DOR NEW TASK!
    console.log('DOR NEW TASK! | SCAN DOCUMENT!');
    console.log('DOR (1) | plz scan in branch with serial_name:', this.expressBranch.serial_name);
    console.log('DOR (2) | and branch ID:', this.expressBranch._id);
    console.log('DOR (3) | for user with email:', this.email);
    console.log('DOR (4) | and user ID:', this.userId);
  }

  onConfirmMail(form: NgForm) {
    if (form.invalid) {
      return;
    }
    this.email = form.value.email;
    this.isEmailConfirmed = true;
  }
  // ===============
}
