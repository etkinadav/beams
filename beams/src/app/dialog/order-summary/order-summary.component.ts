import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  Inject,
  ViewChild,
  Directive,
  HostListener,
  AfterViewInit
} from '@angular/core';
import { firstValueFrom, Subscription, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';

import { DirectionService } from '../../direction.service';
import { DialogService } from 'src/app/dialog/dialog.service';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

import { NgForm, FormControl, FormGroup, Validators, AbstractControl, FormBuilder } from "@angular/forms";
import { CreditFormService } from 'src/app/other-pages/my-profile/credit-form-service';

import { Direction } from '@angular/cdk/bidi';
import { MatTooltip } from '@angular/material/tooltip';
import { getLocaleId } from '@angular/common';
import { DateAdapter } from '@angular/material/core';

import { Router } from "@angular/router";
import { UsersService } from 'src/app/super-management/user/users.service';

import lottie from 'lottie-web';
import { AuthService } from 'src/app/auth/auth.service';
import { set } from 'lodash';

import { OrdersService } from "../../main-section/printing-table/order.service";
import * as http from "node:http";

@Directive({
  selector: '[appPhoneFormatOrderSummery]'
})

export class PhoneFormatOrderSummeryDirective {
  constructor(private el: ElementRef) {
  }

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
  selector: 'app-order-summary',
  templateUrl: './order-summary.component.html',
  styleUrls: ['./order-summary.component.css'],
  host: {
    class: 'fill-screen-modal-order-summary'
  }
})
export class OrderSummaryComponent implements OnInit, OnDestroy {
  isRTL: boolean = true;
  private directionSubscription: Subscription;
  isDarkMode: boolean = false;

  isLoading: boolean = false;
  isLoadingText: string = '';

  printingService: string;
  branchPapers: string;
  files: any;
  branchName: string;
  branchID: string;
  printerID: string;
  orderID: string;
  totalPriceData: any;
  user: any;
  isPendingOrder: boolean = false;
  isAdminOrder: boolean = false;
  branchUnique: number = 0;
  printingCode: number = 0;
  fixProducts: any;
  fixProductsArray: any = [];

  isOrderAproved: boolean = false;
  isCreaditMode: boolean = false;
  isLoadingUpdates = false;

  isOrderPrinted: boolean = false;
  isOrderSaved: boolean = false;

  creditForm = this.creditFormService.createForm(null);
  isCompanyID: boolean = false;

  tooltipDirection: Direction = 'ltr';
  @ViewChild(MatTooltip) tooltip: MatTooltip;

  @ViewChild('monthInput') monthInput;
  @ViewChild('yearInput') yearInput;

  phoneForm: FormGroup;
  animation: any;
  confettiAnimation: any;

  isLottieStart: boolean = false;
  isLottieMiddle: boolean = false;
  isLottieEnd: boolean = false;

  isLogedIn: boolean = false;

  @ViewChild('expressInput') expressInput: ElementRef;

  isAfterOptionBtnAnimated: boolean = false;
  serverAddress: string;

  constructor(
    private directionService: DirectionService,
    private dialogService: DialogService,
    private elRef: ElementRef,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private creditFormService: CreditFormService,
    private dateAdapter: DateAdapter<Date>,
    private router: Router,
    private usersService: UsersService,
    private authService: AuthService,
    private OrdersService: OrdersService,
    private fb: FormBuilder,
    private httpClient: HttpClient,
  ) {
    this.printingService = data.printingService;
    this.serverAddress = data.serverAddress;
    this.branchPapers = data.branchPapers;
    this.files = data.files;
    this.branchName = data.branchName;
    this.branchID = data.branchID;
    this.printerID = data.printerID;
    this.orderID = data.orderID;
    this.totalPriceData = data.totalPriceData;
    this.user = data.user;
    this.isPendingOrder = data.isPendingOrder;
    this.isAdminOrder = data.isAdminOrder;
    this.branchUnique = data.branchUnique;
    this.creditForm = this.fb.group({
      month: ['', [Validators.required, Validators.pattern('^(0[1-9]|1[0-2])$')]],
      year: ['', [Validators.required, Validators.pattern('^[0-9]{2}$')]]
    });
    this.printingCode = data.printingCode;
    this.fixProducts = data.fixProducts;
  }

  async ngOnInit() {
    this.isLoading = true;

    console.log("totalPriceData", this.totalPriceData);

    this.directionSubscription = this.directionService.direction$.subscribe(direction => {
      this.isRTL = direction === 'rtl';
    });

    this.directionService.isDarkMode$.subscribe(isDarkMode => {
      this.isDarkMode = isDarkMode;
    });

    this.directionSubscription = this.directionService.direction$.subscribe(direction => {
      this.isRTL = direction === 'rtl';
      this.tooltipDirection = this.isRTL ? 'rtl' : 'ltr';
      let locale;
      if (this.isRTL) {
        locale = getLocaleId('he-IL');
      } else {
        locale = getLocaleId('en-US');
      }
      this.dateAdapter.setLocale(locale);
    });

    console.log("this.files from ORDERSUMMERY", this.files);
    console.log("this.fixProducts from ORDERSUMMERY", this.fixProducts);
    if (this.fixProducts) {
      for (let i = 0; i < this.fixProducts.products.length; i++) {
        if (this.fixProducts.products[i].numOfCopies > 0) {
          this.fixProductsArray.push(this.fixProducts.products[i]);
        }
      }
    }

    if (localStorage.getItem('userId') &&
      localStorage.getItem('userId') !== '' &&
      localStorage.getItem('userId') === this.user._id) {
      // ---------- user is logedin
      this.isLogedIn = true;
      if (this.user.zCreditInfo?.token && this.user.zCreditInfo.token !== '') {
        // Credit Form
        this.creditForm = this.creditFormService.createForm(this.user);
        if (this.user.zCreditInfo && this.user.zCreditInfo.customerID) {
          this.isCompanyID = true;
        }
      } else {
        // Credit Form
        this.creditForm = this.creditFormService.createForm(null);
      }
      this.phoneForm = new FormGroup({
        phone: new FormControl(null, {
          validators: [Validators.required, this.phoneValidator]
        })
      });
      // // ---------- user is logedin
    } else {
      // ---------- user is not logedin
      this.isLogedIn = false;
      if (localStorage.getItem('userId')) {
        this.authService.logout();
      }
      // // ---------- user is not logedin
    }
    this.isLoading = false;
  }

  closeOrderSummaryDialog() {
    this.dialogService.onCloseOrderSummaryDialog();
  }

  aproveOrderSummary() {
    this.isAfterOptionBtnAnimated = false;
    this.playAnimation();
    setTimeout(() => {
      this.isOrderAproved = true;
      if (this.printingService === 'plotter' && this.isPendingOrder) {
        this.onSendOrderToPrint();
      }
      if ((!this.user.zCreditInfo?.token || this.user.zCreditInfo.token === '') &&
        !(this.user.discount && this.user.discount === 100) &&
        !this.isAdminOrder) {
        this.isCreaditMode = true;
      }
    }, 1900);
  }

  disaproveOrderSummary() {
    this.isOrderAproved = false;
    this.isLottieStart = false;
    this.isLottieEnd = false;
    this.isLottieStart = false;
    if (this.animation) {
      this.animation.stop();
    }
  }

  editCCOrderSummary() {
    if (this.isLogedIn) {
      this.isCreaditMode = true;
    } else {
      this.dialogService.onOpenLoginDialog();
    }
  }

  backToOrderCCOrderSummary() {
    this.isCreaditMode = false;
  }

  // [general]
  roundDownTowDecimal(num: number): number {
    return Math.ceil(num * 100) / 100;
  }

  ngOnDestroy() {
    this.directionSubscription.unsubscribe();
  }

  onSubmitExpressCode(form: NgForm) {
    // return if invalid
    if (form.invalid) {
      return;
    }

    // calc total charges
    const totalChargeNIS = this.totalPriceData.totalOrderPrice > this.totalPriceData.points ? this.roundDownTowDecimal(
      this.totalPriceData.totalOrderPrice - this.totalPriceData.points) : 0;
    const totalChargePoints = this.totalPriceData.totalOrderPrice > this.totalPriceData.points ?
      this.roundDownTowDecimal(this.totalPriceData.points) :
      this.roundDownTowDecimal(this.totalPriceData.totalOrderPrice);
    this.isLoading = true;
    setTimeout(() => {
      this.playAnimation();
      setTimeout(() => {
        this.isLoading = false;
        this.isOrderPrinted = true;
        this.playConfettiAnimation();
      }, 1900);
    }, 1000);
  }

  onSaveOrderForAfter() {
    console.log("onSaveOrderForAfter");
    if ((this.user.zCreditInfo?.token && this.user.zCreditInfo.token !== '') || this.user.roles.includes('su') || this.isAdminOrder || this.user.discount === 100) {
      // DOR NEW TASK!
      // console.log('DOR NEW TASK! | SEND ORDER TO PENDING!');
      // console.log('DOR (1) | plz sent to QR state these files:', this.files);
      // console.log('DOR (2) | to this printing service:', this.printingService);
      // console.log('DOR (3) | to this branch:', this.branchName);
      // console.log('DOR (4) | and check that the total charge of the order is: ', this.totalPriceData.totalOrderPrice, 'NIS (or points)');
      // console.log('DOR (5) | and then set isOrderAproved to true:');

      // create array of file ids
      const filesIds = this.files.map(file => file._id);
      // create order
      this.isLoading = true;
      if (this.printingService === 'plotter') {

      } else if (this.printingService === 'express') {
        this.OrdersService.createExpressOrder(filesIds, this.branchID, this.printerID).subscribe((response: any) => {
          if (response.message === 'Order created successfully') {
            setTimeout(() => {
              this.playAnimation();
              setTimeout(() => {
                this.isLoading = false;
                this.isOrderSaved = true;
                this.playConfettiAnimation();
              }, 1900);
            }, 1000);
          }
        }, error => {
          console.log("error", error);
          this.isLoading = false;
        });
      }
    } else {
      this.isCreaditMode = true;
    }
  }

  async onSendOrderToPrint(printingCode: string = null) {
    console.log("this.user FROM onSendOrderToPrint", this.user)
    if ((this.user.zCreditInfo?.token && this.user.zCreditInfo.token !== '') || this.user.roles.includes('su') || this.isAdminOrder || this.user.discount === 100) {
      // calc total charges
      const totalChargeNIS = this.totalPriceData.totalOrderPrice > this.totalPriceData.points ? this.roundDownTowDecimal(
        this.totalPriceData.totalOrderPrice - this.totalPriceData.points) : 0;
      const totalChargePoints = this.totalPriceData.totalOrderPrice > this.totalPriceData.points ?
        this.roundDownTowDecimal(this.totalPriceData.points) :
        this.roundDownTowDecimal(this.totalPriceData.totalOrderPrice);

      if (!this.orderID && this.files && this.files.length > 0) {
        console.log("creating order");
        const filesIds = this.files.map(file => file.fileId);
        // Create order
        this.isLoading = true;
        this.isLoadingText = 'prepering-files';
        setTimeout(() => {
          if (this.isLoadingText !== '') {
            this.isLoadingText = 'prepering-order';
            setTimeout(() => {
              if (this.isLoadingText !== '') {
                this.isLoadingText = 'sending-order';
              }
            }, 6000);
          }
        }, 6000);
        if (this.printingService === 'plotter') {
          try {
            const response: any = await firstValueFrom(this.httpClient.post(this.serverAddress + '/api/orders/create', {
              files: filesIds
            }));

            console.log('Success:', response);
            this.orderID = response.order._id;
          } catch (error) {
            console.error("Error creating order:", error);
            this.isLoading = false;
            this.isLoadingText = '';
            return; // Stop execution if order creation fails
          }
        } else if (this.printingService === 'express') {
          try {
            const response: any = await firstValueFrom(this.OrdersService.createExpressOrder(filesIds, this.branchID, this.printerID));
            if (response.message === 'Order created successfully') {
              console.log("order created successfully");
              this.orderID = response.order._id;
            }
          } catch (error) {
            console.error("Error creating order:", error);
            this.isLoading = false;
            this.isLoadingText = '';
            return; // Stop execution if order creation fails
          }
        }
      } else if (this.fixProductsArray && this.fixProductsArray.length > 0) {
        // DOR NEW TASK!
        console.log('DOR NEW TASK! | SEND ORDER WITH NO FILES ONLY FIX PRODUCTS TO CHARGE!');
        console.log('DOR (1) | plz sent to charge this amount of fix products:', this.fixProducts.totalAmount);
        console.log('DOR (2) | plz sent to charge this total cost of fix products:', this.fixProducts.totalCost, 'NIS, and no points!');
        console.log('DOR (3) | in this branch:', this.branchName);
        return;
      }

      if (printingCode) {
        console.log('DOR (6) | with this ptinting code:', printingCode);
      }
      console.log('DOR (7) | and then set isOrderAproved to true:');

      this.isLoading = true;

      if (this.printingService === 'plotter') {
        this.httpClient.post(this.serverAddress + '/api/orders/print', {
          orderID: this.orderID,
        }).subscribe({
          next: (response) => {
            // Success handling
            // console.log('Success:', response);
            this.isLoadingText = '';
            setTimeout(() => {
              this.playAnimation();
              setTimeout(() => {
                this.isLoading = false;
                this.isOrderPrinted = true;
                this.playConfettiAnimation();
              }, 1900);
            }, 1000);
          },
          error: (error) => {
            // Failure handling
            this.isLoadingText = '';
            console.error('Error:', error);
          }
        });
      } else if (this.printingService === 'express') {

        this.httpClient.post(this.serverAddress + '/api/orders/print', {
          code: printingCode,
          orderID: this.orderID,
        }).subscribe({
          next: (response) => {
            // Success handling
            console.log('Success:', response);
            this.isLoadingText = '';
            setTimeout(() => {
              this.playAnimation();
              setTimeout(() => {
                this.isLoading = false;
                this.isOrderPrinted = true;
                this.playConfettiAnimation();
              }, 1900);
            }, 1000);
          },
          error: (error) => {
            // Failure handling
            if (error.error.message === 'NO_PRINTER_FOUND_WITH_THIS_CODE' ||
              error.error.message === 'QUEUE_NOT_EMPTY' ||
              error.error.message === 'MISSING_PAPER_TYPES' ||
              error.error.message === 'PAYMENT_ERROR' ||
              error.error.message === 'PAYMENT_ERRORRROR_MOVING_FILES'
            ) {
              this.isLoading = false;
              this.isLoadingText = '';
              console.error('Error:', error);
            } else {
              this.isLoadingText = '';
              this.isCreaditMode = true;
            }
          }
        });
      } else {
        this.isLoadingText = '';
        setTimeout(() => {
          this.playAnimation();
          setTimeout(() => {
            this.isLoading = false;
            this.isOrderPrinted = true;
            this.playConfettiAnimation();
          }, 1900);
        }, 1000);
      }
    } else {
      this.isLoadingText = '';
      this.isCreaditMode = true;
    }
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
        this.scrollToTop();
        setTimeout(() => {
          this.playAnimation();
          setTimeout(() => {
            this.isCreaditMode = false;
            this.user.zCreditInfo = response.user.zCreditInfo;
            this.creditForm = this.creditFormService.createForm(this.user);
            this.isLoading = false;
          }, 1600);
        }, 100);
      }
    });
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

  // Card Number
  numberOnly(event: KeyboardEvent): boolean {
    const charCode = (event.which) ? event.which : event.keyCode;
    if (charCode > 31 && (charCode < 48 || charCode > 57)) {
      event.preventDefault();
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

  clearCreditField(field: string) {
    console.log('clearCreaditFields = field', field);
    this.creditForm.get(field).setValue(this.user[field]);
  }

  toggleTooltip() {
    if (this.tooltip._isTooltipVisible()) {
      this.tooltip.hide();
    } else {
      this.tooltip.show();
    }
  }

  toggleCompanyID() {
    this.isCompanyID = !this.isCompanyID;
    // find a div with the id of
  }

  openWhatsApp() {
    const phoneNumber = '97233746962';
    const message = encodeURIComponent('After-Sending-To-Print');
    const url = `https://wa.me/${phoneNumber}?text=${message}`;
    window.open(url, '_blank');
  }

  openRightPlaceDialog() {
    if (this.isLogedIn) {
      this.dialogService.onOpenRightPlaceDialog();
    } else {
      this.dialogService.onOpenLoginDialog();
    }
    this.closeOrderSummaryDialog();
  }

  goToMyOrders() {
    this.router.navigate([`/myorders/${localStorage.getItem('userId')}`]);
    this.closeOrderSummaryDialog();
  }

  goToPrintingQueue() {
    this.router.navigate(['/queue/' + this.branchUnique]);
    this.closeOrderSummaryDialog();
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

  clearPhoneField() {
    this.phoneForm.patchValue({
      phone: ''
    });
  }

  // save user profile fields
  onSaveUserPhone() {
    if (this.phoneForm.invalid) {
      return;
    }
    this.isLoading = true;
    this.usersService.updateUserPhone(
      localStorage.getItem('userId'),
      this.phoneForm.value.phone,
    ).subscribe((response: any) => {
      if (response.message === 'Update User Phone successful!') {
        this.user.phone = response.user.phone;
        this.phoneForm.patchValue({
          phone: this.formatPhoneNumber(this.user.phone)
        });
        this.usersService.updatePhone(this.user.phone);
        this.isLoading = false;
      }
    });
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

  playConfettiAnimation() {
    console.log("playConfettiAnimation");
    setTimeout(() => {
      this.confettiAnimation = lottie.loadAnimation({
        container: document.getElementById('animationConfettiContainer'),
        renderer: 'svg',
        loop: false,
        autoplay: true,
        path: 'assets/videos/confetti.json'
      });
    }, 5);
  }

  scrollToTop() {
    const dialogElement = document.querySelector('.mat-mdc-dialog-surface');
    if (dialogElement) {
      dialogElement.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  focusInput() {
    this.isAfterOptionBtnAnimated = false;
    if (this.printingService === 'express') {
      this.expressInput.nativeElement.focus();
    }
  }

  animateAfterOptionBtn() {
    if (!this.isAfterOptionBtnAnimated) {
      this.isAfterOptionBtnAnimated = true;
      setTimeout(() => {
        this.isAfterOptionBtnAnimated = false;
      }, 5000);
    }
  }

  isIphone(): boolean {
    return /iPhone/.test(navigator.userAgent);
  }

  // ====================================
}
