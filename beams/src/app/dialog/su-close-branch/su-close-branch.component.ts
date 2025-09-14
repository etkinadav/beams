import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

import { DirectionService } from '../../direction.service';
import { AuthService } from 'src/app/auth/auth.service';
import { DialogService } from 'src/app/dialog/dialog.service';

import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BranchesService } from 'src/app/super-management/branch/branches.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-su-close-branch',
  templateUrl: './su-close-branch.component.html',
  styleUrls: ['./su-close-branch.component.css'],
  host: {
    class: 'fill-screen-modal-new-dialog'
  }
})
export class SuCloseBranchComponent implements OnInit, OnDestroy {
  isRTL: boolean = true;
  private directionSubscription: Subscription;
  isDarkMode: boolean = false;
  isLoading: boolean = false;
  isLoadingUpdates = false;

  userId: string;
  userIsAuthenticated = false;
  private authStatusSub: Subscription;

  isClose: boolean = false;
  service: string = '';
  branch: string = '';
  close_msg: string = '';

  closeBranchForm: FormGroup
  isSavedSuccessed: boolean = false;
  placeholder: string;

  constructor(
    private directionService: DirectionService,
    private authService: AuthService,
    private dialogService: DialogService,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private branchesService: BranchesService,
    private fb: FormBuilder,
    private translate: TranslateService,
  ) {
    this.isClose = data.isClose;
    this.service = data.service;
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

    if (!this.isClose) {
      this.closeBranchForm = this.fb.group({
        close_msg: ['', Validators.required]
      });
    }

    this.translate.get('su-management.branches_close-msg').subscribe((res: string) => {
      this.placeholder = res;
    });

    this.isLoading = false;
  }

  onCloseBranch(): void {
    this.isLoading = true;
    if (this.closeBranchForm.valid) {
      this.branchesService.closeBranch(
        this.service,
        this.branch,
        this.closeBranchForm.value,
      ).subscribe(
        response => {
          console.log('Response from backend:', response);
          this.isSavedSuccessed = true;
          this.isLoading = false;
          this.closeDialogDelay();
        },
        error => {
          this.isLoading = false;
          console.error('Error updating close message:', error);
        }
      );
    }
  }

  onOpenBranch(): void {
    this.isLoading = true;
    this.branchesService.openBranch(this.service, this.branch).subscribe(
      response => {
        console.log('Response from backend:', response);
        this.isSavedSuccessed = true;
        this.isLoading = false;
        this.closeDialogDelay();
      },
      error => {
        this.isLoading = false;
        console.error('Error opening branch:', error);
      }
    );
  }

  closeDialogDelay() {
    setTimeout(() => {
      this.dialogService.onCloseSuCloseBranchDialog();
    }, 1200);
  }

  closeSuCloseBranchDialog() {
    this.dialogService.onCloseSuCloseBranchDialog();
  }

  ngOnDestroy() {
    this.directionSubscription.unsubscribe();
    this.authStatusSub.unsubscribe();
  }

  // ===============
}
