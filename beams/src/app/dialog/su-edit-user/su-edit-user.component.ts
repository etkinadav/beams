import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { Subscription } from 'rxjs';

import { DirectionService } from '../../direction.service';
import { AuthService } from 'src/app/auth/auth.service';
import { DialogService } from 'src/app/dialog/dialog.service';

import { UsersService } from 'src/app/super-management/user/users.service';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormGroup, FormControl, Validators } from "@angular/forms";
import { AbstractControl } from '@angular/forms';

@Component({
  selector: 'app-su-edit-user',
  templateUrl: './su-edit-user.component.html',
  styleUrls: ['./su-edit-user.component.css'],
  host: {
    class: 'fill-screen-modal-su-edit-user'
  }
})
export class SuEditUserComponent implements OnInit, OnDestroy {
  isRTL: boolean = true;
  private directionSubscription: Subscription;
  isDarkMode: boolean = false;
  isLoading: boolean = false;
  isLoadingUpdates = false;

  userId: string;
  user: any;
  userIsAuthenticated = false;
  private authStatusSub: Subscription;
  form: FormGroup;
  rolesList: string[] = ['guest', 'user', 'bm', 'st', 'admin', 'su'];

  constructor(
    private directionService: DirectionService,
    private authService: AuthService,
    private dialogService: DialogService,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private usersService: UsersService,
  ) {
    this.user = data.user;
  }

  async ngOnInit() {
    this.isLoading = true;
    console.log('this.user: ', this.user);
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

    this.form = new FormGroup({
      displayName: new FormControl(this.user.displayName, [Validators.required, Validators.minLength(3), Validators.maxLength(40)]),
      email: new FormControl(this.user.email, [Validators.required, Validators.minLength(3), Validators.maxLength(40)]),
      phone: new FormControl(this.formatPhoneNumber(this.user.phone), {
        validators: [Validators.required, this.phoneValidator]
      }),
      discount: new FormControl(this.user.discount ? this.user.discount : 0, [Validators.required, Validators.min(0), Validators.max(100)]),
      roles: new FormControl(this.user.roles),
    });

    console.log('this.form: ', this.form);
    this.isLoading = false;
  }

  closeSuEditUserDialog() {
    this.dialogService.onCloseSuEditUserDialog();
  }

  ngOnDestroy() {
    this.directionSubscription.unsubscribe();
    this.authStatusSub.unsubscribe();
  }

  // PHONE
  // format phone
  formatPhoneNumber(phoneNumber: number): string {
    if (!phoneNumber) {
      return '';
    }
    const str = '0' + phoneNumber.toString();
    return str.slice(0, 3) + '-' + str.slice(3, 7) + '-' + str.slice(7);
  }
  // validate phone
  phoneValidator(control: AbstractControl): { [key: string]: any } | null {
    const valid = control.value && typeof control.value === 'string' && control.value.replace(/\D/g, '').length === 10;
    return valid ? null : { invalidPhone: { valid: false, value: control.value } };
  }
  // compere phone
  comperePhoneNumbers(usersPhone: any, editedPhone: any) {
    if (typeof editedPhone !== 'string' || !usersPhone || !editedPhone) {
      return true;
    }
    const normalizedUsersPhone = usersPhone.toString();
    const normalizedEditedPhone = editedPhone.replace(/-/g, '').replace(/^0+/, '');
    if (normalizedUsersPhone === normalizedEditedPhone) {
      return false;
    }
    return true;
  }

  // --------------------- FIELDS AND SAVE ---------------------

  // toggle
  toggleField(field: string, isClose: boolean = false) {
    const fieldElement = document.getElementsByClassName("profileField-" + field)[0];
    const itemElement = document.getElementsByClassName("profileItem-" + field)[0];
    if (isClose) {
      fieldElement.classList.add('d-none');
      fieldElement.classList.remove('d-flex');
      itemElement.classList.remove('d-none');
      itemElement.classList.add('d-flex');
      return;
    }
    fieldElement.classList.toggle('d-none');
    fieldElement.classList.toggle('d-flex');
    itemElement.classList.toggle('d-none');
    itemElement.classList.toggle('d-flex');

    // Reset the form control value
    if (this.user && this.user[field]) {
      if (field === 'phone') {
        this.form.get(field).setValue(this.formatPhoneNumber(this.user[field]));
      } else {
        this.form.get(field).setValue(this.user[field]);
      }
    } else {
      this.form.get(field).reset();
    }
  }

  // save
  onSaveUser() {
    this.isLoadingUpdates = true;
    this.usersService.updateUserProfileManiger(
      this.user._id,
      this.form.value.displayName,
      this.form.value.email,
      this.form.value.phone,
      this.form.value.discount ? this.form.value.discount : 0,
      this.form.value.roles,
    ).subscribe((response: any) => {
      if (response.message === 'Update successful!') {
        // Update the user and form data here
        this.user = response.user;
        this.form.patchValue({
          displayName: this.user.displayName,
          email: this.user.email,
          phone: this.formatPhoneNumber(this.user.phone)
        });
        this.toggleField('displayName', true);
        this.toggleField('email', true);
        this.toggleField('phone', true);
        this.toggleField('discount', true);
        this.toggleField('roles', true);
        this.isLoadingUpdates = false;
      }
    });
  }

  onDeleteCCUser() {
    this.isLoadingUpdates = true;
    this.usersService.deleteUserCCManiger(this.user._id)
      .subscribe((response: any) => {
        if (response.message === 'Credit card information deleted successfully') {
          this.user = response.user;
          this.isLoadingUpdates = false;
        }
      });
  }
  // ===============
}
