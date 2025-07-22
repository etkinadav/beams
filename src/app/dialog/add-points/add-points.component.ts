import { Component, OnInit, OnDestroy, Inject, ViewChild, ElementRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

import { DirectionService } from '../../direction.service';
import { AuthService } from 'src/app/auth/auth.service';
import { DialogService } from 'src/app/dialog/dialog.service';

import { UsersService } from 'src/app/super-management/user/users.service';
import { set } from 'lodash';
import { NgForm } from '@angular/forms';

@Component({
  selector: 'app-add-points',
  templateUrl: './add-points.component.html',
  styleUrls: ['./add-points.component.css'],
  host: {
    class: 'fill-screen-modal-phone'
  }
})
export class AddPointsComponent implements OnInit, OnDestroy {
  isRTL: boolean = true;
  private directionSubscription: Subscription;
  isDarkMode: boolean = false;
  isLoading: boolean = false;
  isLoadingUpdates = false;

  userId: string;
  userIsAuthenticated = false;
  private authStatusSub: Subscription;

  user: any;
  newPoints: number = 0;
  action: string = 'add';
  isSuccessfullyUpdated: boolean = false;

  @ViewChild('myForm') myForm: NgForm;
  @ViewChild('pointsInput') pointsInput: ElementRef;

  constructor(
    private directionService: DirectionService,
    private authService: AuthService,
    private dialogService: DialogService,
    private usersService: UsersService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.user = data.user;
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

  closeAddPointsDialog() {
    this.dialogService.onCloseAddPointsDialog();
  }

  onSubmit() {
    if (this.action === 'add') {
      this.addUserPoints('add');
    } else if (this.action === 'remove') {
      this.addUserPoints('remove');
    }
  }

  triggerFormSubmit() {
    if (this.myForm) {
      this.myForm.ngSubmit.emit();
    }
  }

  addUserPoints(action: string = 'add') {
    this.isLoadingUpdates = true;
    this.usersService.onAddUserPoints(this.user._id, action, this.newPoints).subscribe(response => {
      this.isSuccessfullyUpdated = true;
      this.isLoadingUpdates = false;
      this.usersService.emitusersUpdated();
      setTimeout(() => {
        this.dialogService.onCloseAddPointsDialog();
      }, 1300);
    });
  }

  ngOnDestroy() {
    this.directionSubscription.unsubscribe();
    this.authStatusSub.unsubscribe();
  }
  // ===============
}
