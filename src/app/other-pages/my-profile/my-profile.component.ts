import { Component, OnInit, OnDestroy, ElementRef, Directive, HostListener, ViewChild } from "@angular/core";

import { Subscription } from 'rxjs';
import { DirectionService } from '../../direction.service';

import { AuthService } from "src/app/auth/auth.service";
import { UsersService } from 'src/app/super-management/user/users.service';

import { Router, ActivatedRoute } from "@angular/router";
import { DialogService } from 'src/app/dialog/dialog.service';

import { FormGroup, FormControl, Validators } from "@angular/forms";
import { AbstractControl } from '@angular/forms';
import { OrdersService } from "../../other-pages/my-orders/orders-service";

import { DateAdapter } from '@angular/material/core';
import { getLocaleId } from '@angular/common';
import { Direction } from '@angular/cdk/bidi';
import { MatTooltip } from '@angular/material/tooltip';

import { CreditFormService } from '../my-profile/credit-form-service';

import lottie from 'lottie-web';

@Directive({
  selector: '[appPhoneFormat]'
})

export class PhoneFormatDirective {
  constructor(private el: ElementRef) { }

  @HostListener('input', ['$event']) onInputChange(event) {
    const initialValue = this.el.nativeElement.value;

    this.el.nativeElement.value = initialValue.replace(/[^0-9]/g, '')
      .replace(/(\d{2})(\d{4})(\d{3})/, '0$1-$2-$3');

    if (initialValue !== this.el.nativeElement.value) {
      event.stopPropagation();
    }
  }
}

@Component({
  selector: "app-order-list",
  templateUrl: "./my-profile.component.html",
  styleUrls: ["./my-profile.component.css"],
  host: {
    class: 'fill-screen'
  }
})

export class MyProfileComponent implements OnInit, OnDestroy {
  isRTL: boolean = true;
  private directionSubscription: Subscription;
  isDarkMode: boolean = false;
  isLoading = false;
  isLoadingUpdates = false;

  userId: string;
  userIsAuthenticated = false;
  private authStatusSub: Subscription;

  user: any = {};
  form: FormGroup;
  creditForm = this.creditFormService.createForm(null);
  private numOfOrdersSub: Subscription;
  numOfPendingOrders: number = 0;
  private authListenerSubs: Subscription;
  private intervalId: any;
  private defaultProfileUrl = "../../assets/images/profile-default.svg";

  isCreditEditMode: boolean = false;
  isCompanyID: boolean = false;
  tooltipDirection: Direction = 'ltr';
  @ViewChild(MatTooltip) tooltip: MatTooltip;

  @ViewChild('monthInput') monthInput;
  @ViewChild('yearInput') yearInput;

  animation: any;

  isLottieStart: boolean = false;
  isLottieMiddle: boolean = false;
  isLottieEnd: boolean = false;

  constructor(
    private authService: AuthService,
    private directionService: DirectionService,
    private usersService: UsersService,
    private router: Router,
    private dialogService: DialogService,
    public ordersService: OrdersService,
    private route: ActivatedRoute,
    private dateAdapter: DateAdapter<Date>,
    private creditFormService: CreditFormService,
  ) { }

  ngOnInit() {
    this.isLoading = true;

    this.directionSubscription = this.directionService.direction$.subscribe(direction => {
      this.isRTL = direction === 'rtl';
      this.tooltipDirection = this.isRTL ? 'rtl' : 'ltr';
      let locale;
      if (this.isRTL) {
        locale = getLocaleId('he-IL');;
      } else {
        locale = getLocaleId('en-US');
      }
      this.dateAdapter.setLocale(locale);
    });

    this.directionService.isDarkMode$.subscribe(isDarkMode => {
      this.isDarkMode = isDarkMode;
    });

    this.route.url.subscribe(urlSegments => {
      this.isCreditEditMode = urlSegments.some(segment => segment.path === 'credit');
    });

    this.userIsAuthenticated = this.authService.getIsAuth();
    if (this.userIsAuthenticated) {
      this.getOrders();
    }
    this.authListenerSubs = this.authService
      .getAuthStatusListener()
      .subscribe(isAuthenticated => {
        this.userIsAuthenticated = isAuthenticated;
        this.userId = this.authService.getUserId();
        if (this.userIsAuthenticated) {
          this.getOrders();
          console.log('numOfPendingOrders 1', this.numOfPendingOrders);
        } else {
          this.numOfPendingOrders = 0;
          console.log('numOfPendingOrders 2', this.numOfPendingOrders);
          if (this.intervalId) {
            clearInterval(this.intervalId);
          }
        }
      });

    // Subscribe to the authCompleted event
    this.authService.getAuthCompletedListener().subscribe(() => {
      this.getOrders();
    });

    this.userIsAuthenticated = this.authService.getIsAuth();
    this.authStatusSub = this.authService
      .getAuthStatusListener()
      .subscribe(isAuthenticated => {
        this.userIsAuthenticated = isAuthenticated;
        this.userId = this.authService.getUserId();
      });
    // ADD FORM
    // Profile Form
    this.form = new FormGroup({
      displayName: new FormControl(null, [Validators.required, Validators.minLength(3), Validators.maxLength(40)]),
      email: new FormControl(null, [Validators.required, Validators.minLength(3), Validators.maxLength(40)]),
      phone: new FormControl(this.formatPhoneNumber(this.user.phone), {
        validators: [Validators.required, Validators.pattern(/^0\d{2}-\d{7}$/)]
      })
    });

    this.usersService.getUser(localStorage.getItem('userId')).subscribe((user) => {
      if (user) {
        this.user = user;
        console.log('user from MTPROFILE!', this.user);
        // UPDATE FORM
        // Profile Form
        this.form = new FormGroup({
          displayName: new FormControl(this.user.displayName, [Validators.required, Validators.minLength(3), Validators.maxLength(40)]),
          email: new FormControl(this.user.email, [Validators.required, Validators.minLength(3), Validators.maxLength(40)]),
          phone: new FormControl(this.formatPhoneNumber(this.user.phone), {
            validators: [Validators.required, this.phoneValidator]
          })
        });
        this.form.get('phone').markAsPristine();
        this.form.get('phone').markAsUntouched();
        // Credit Form
        this.creditForm = this.creditFormService.createForm(this.user);
        if (this.user.zCreditInfo && this.user.zCreditInfo.customerID) {
          this.isCompanyID = true;
        }
      } else {
        this.user = {};
        // UPDATE FORM
        // Profile Form
        this.form = new FormGroup({
          displayName: new FormControl(null, [Validators.required, Validators.minLength(3)]),
          email: new FormControl(null, [Validators.required, Validators.minLength(3)]),
          phone: new FormControl(null, {
            validators: [Validators.required, this.phoneValidator]
          })
        });
        // Credit Form
        this.creditForm = this.creditFormService.createForm(null);
      }
      console.log('user from MTPROFILE!', this.user);
      this.isLoading = false;
    })

    this.usersService.phoneUpdated.subscribe((phone: number) => {
      this.user.phone = Number(phone);
      this.form.get('phone').setValue(this.formatPhoneNumber(this.user.phone));
    });
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

  ngOnDestroy() {
    this.authStatusSub.unsubscribe();
    this.directionSubscription.unsubscribe();
    this.authListenerSubs.unsubscribe();
  }

  // [general]
  getUserName() {
    return localStorage.getItem('userName');
  }

  getUserId() {
    return localStorage.getItem('userId');
  }

  openWhatsApp() {
    const phoneNumber = '97233746962';
    const message = encodeURIComponent('My-Profile-at-Eazix');
    const url = `https://wa.me/${phoneNumber}?text=${message}`;
    window.open(url, '_blank');
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

  goToMyOrders() {
    this.router.navigate([`/myorders/${localStorage.getItem('userId')}`]);
  }

  goToQAndA() {
    this.router.navigate(["/qanda"]);
  }

  getDisplayName() {
    if (this.user?.displayName && this.user?.displayName.length > 0) {
      return this.user.displayName;
    } else if (this.user?.email && this.user?.email.length > 0) {
      return this.user.email;
    } else {
      return null;
    }
  }

  getUserProfileImg() {
    if (this.user.provider) {
      if (this.user.provider === 'facebook') {
        return this.user.providerData?.id ? 'https://graph.facebook.com/' + this.user.providerData.id + '/picture?type=large' : this.defaultProfileUrl;
      } else if (this.user.provider === 'google') {
        return this.user.providerData?.picture ? this.user.providerData.picture : this.defaultProfileUrl;
      } else {
        return '../../assets/images/profile-default.svg';
      }
    } else {
      return '../../assets/images/profile-default.svg';
    }
  }

  getOrders() {
    // get orders [init]
    this.ordersService.getNumOfPendingOrders();
    this.numOfOrdersSub = this.ordersService
      .getNumOfPendingOrdersUpdateListener()
      .subscribe((orderData: { numOfPendingOrders: number }) => {
        this.numOfPendingOrders = orderData.numOfPendingOrders;
        console.log('numOfPendingOrders', this.numOfPendingOrders);
      });
    // get orders [interval]
    this.intervalId = setInterval(() => {
      this.ordersService.getNumOfPendingOrders();
    }, 30000);
  }

  onScrollContainerScroll(event: Event) {
    const target = event.target as HTMLElement;
    const scrollPosition = target.scrollTop;

    const upperElement = document.getElementById('upperElement');
    if (scrollPosition <= 40) {
      (upperElement as HTMLElement).style.opacity = '100%';
    } else if (scrollPosition > 40 && scrollPosition <= 53) {
      (upperElement as HTMLElement).style.opacity = 100 - scrollPosition / 53 * 100 + '%';
    } else {
      (upperElement as HTMLElement).style.opacity = '0%';
    }
  }

  logOut() {
    this.authService.logout();
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

  // save user profile fields
  onSaveUser() {
    if ((!this.user.phone || this.user.phone === '0-') && !this.form.value.phone) {
      this.dialogService.onOpenPhoneDialog();
    }
    if (this.form.invalid) {
      return;
    }
    this.isLoadingUpdates = true;
    this.usersService.updateUserProfile(
      this.getUserId(),
      this.form.value.displayName,
      this.form.value.email,
      this.form.value.phone,
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
        this.isLoadingUpdates = false;
      }
    });
  }

  toCreditEditMode() {
    this.isCreditEditMode = true;
    this.router.navigate([`/myprofile/${localStorage.getItem('userId')}/credit`]);
  }

  toProfileMode() {
    this.isCreditEditMode = false;
    this.router.navigate([`/myprofile/${localStorage.getItem('userId')}`]);
  }

  onLogout() {
    this.authService.logout();
  }

  clearCreditField(field: string) {
    console.log('clearCreaditFields = field', field);
    this.creditForm.get(field).setValue(this.user[field]);
  }

  onSaveCreditCard() {
    if (this.creditForm.get('cardNum').invalid
      || this.creditForm.get('month').invalid
      || this.creditForm.get('year').invalid
      || this.creditForm.get('cardCvv').invalid
      || this.creditForm.get('cardHolderName').invalid
      || this.creditForm.get('cardHolderID').invalid) {
      return;
    }
    let cc = {
      exp_m: this.creditForm.value.month,
      exp_y: this.creditForm.value.year,
      num: this.creditForm.value.cardNum.replace(/-/g, ''),
      cvv: this.creditForm.value.cardCvv,
      id: this.creditForm.value.cardHolderID,
      name: this.creditForm.value.cardHolderName
    }

    this.usersService.updateUserCC(
      localStorage.getItem('userId'),
      cc,
    ).subscribe((response: any) => {
      if (response.user?.zCreditInfo?.token &&
        response.user.zCreditInfo.token !== '' &&
        response.user?.zCreditInfo?.cardNum &&
        response.user.zCreditInfo.cardNum !== '' &&
        response.user?.zCreditInfo?.cardExp &&
        response.user.zCreditInfo.cardExp !== '' &&
        response.user?.zCreditInfo?.cvv &&
        response.user.zCreditInfo.cvv !== ''
      ) {
        this.user.zCreditInfo = response.user.zCreditInfo;
        this.creditForm = this.creditFormService.createForm(this.user);
        this.scrollToTop();
        setTimeout(() => {
          this.playAnimation();
          setTimeout(() => {
            this.isLoading = false;
          }, 1600);
        }, 100);
      }
    });
  }

  scrollToTop() {
    const dialogElement = document.querySelector('.zx-credit-con');
    if (dialogElement) {
      dialogElement.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // LOTTIE ANIMATION
  ngAfterViewInit() {
    this.animation = lottie.loadAnimation({
      container: document.getElementById('animationContainer'),
      renderer: 'svg',
      loop: false,
      autoplay: false,
      path: 'assets/videos/successfully.json'
    });

    this.animation.setSpeed(2.6);
  }

  playAnimation() {
    if (this.animation) {
      this.animation.play();
    }
    this.isLottieStart = false;
    this.isLottieEnd = false;
    this.isLottieMiddle = false;
    setTimeout(() => {
      this.isLottieStart = true;
      setTimeout(() => {
        this.isLottieMiddle = true;
        setTimeout(() => {
          this.isLottieEnd = true;
          this.animation.stop();
          this.isLottieStart = false;
          this.isLottieMiddle = false;
        }, 400);
      }, 1500);
    }, 0);
  }

  // Card Number
  numberOnly(event): boolean {
    const charCode = (event.which) ? event.which : event.keyCode;
    if (charCode > 31 && (charCode < 48 || charCode > 57)) {
      return false;
    }
    return true;
  }
  formatCardNumInput(event): void {
    let input = event.target.value.replace(/\D/g, '');
    if (input.length > 16) {
      input = input.slice(0, 16);
    }
    input = input.replace(/(.{4})/g, '$1-');
    if (input.endsWith('-')) {
      input = input.slice(0, -1);
    }
    this.creditForm.get('cardNum').setValue(input, { emitEvent: false });
  }

  focusMonthIfEmpty() {
    if (!this.creditForm.get('month').value || this.creditForm.get('month').value === '') {
      this.creditForm.get('month').setValue(null);
      this.monthInput.nativeElement.focus();
    }
  }

  creditCardValidator(control: FormControl): { [s: string]: boolean } | null {
    if (!control.value) {
      return null;
    }
    const pattern = /^\d{4}-\d{4}-\d{4}-\d{4}$/;
    if (!control.value.match(pattern)) {
      return { 'invalidCreditCard': true };
    }
    return null;
  }

  toggleCompanyID() {
    this.isCompanyID = !this.isCompanyID;
  }

  onDeleteCreditCard() {
    this.usersService.deleteUserCC(
      localStorage.getItem('userId'),
      this.user.zCreditInfo,
    ).subscribe((response: any) => {
      if (response.message === 'Credit card information deleted successfully') {
        this.user.zCreditInfo = null;
        this.creditForm = this.creditFormService.createForm(this.user);
        this.scrollToTop();
        setTimeout(() => {
          this.playAnimation();
          setTimeout(() => {
            this.isLoading = false;
          }, 1600);
        }, 100);
      }
    });
  }

  toggleTooltip() {
    if (this.tooltip._isTooltipVisible()) {
      this.tooltip.hide();
    } else {
      this.tooltip.show();
    }
  }
  // ===============
}
