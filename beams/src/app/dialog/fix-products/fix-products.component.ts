import { Component, OnInit, OnDestroy, EventEmitter, Output, ViewChildren, QueryList } from '@angular/core';
import { Subscription } from 'rxjs';

import { DirectionService } from '../../direction.service';
import { AuthService } from 'src/app/auth/auth.service';
import { DialogService } from 'src/app/dialog/dialog.service';

import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Inject } from '@angular/core';

import { MatTooltip } from '@angular/material/tooltip';

@Component({
  selector: 'app-fix-products',
  templateUrl: './fix-products.component.html',
  styleUrls: ['./fix-products.component.css'],
  host: {
    class: 'fill-screen-modal-fix-products'
  }
})
export class FixProductsComponent implements OnInit, OnDestroy {
  isRTL: boolean = true;
  private directionSubscription: Subscription;
  isDarkMode: boolean = false;
  isLoading: boolean = false;
  isLoadingUpdates = false;

  userId: string;
  userIsAuthenticated = false;
  private authStatusSub: Subscription;

  branchName: string;
  @Output() productsUpdated = new EventEmitter<any[]>();
  products: any[] = [];

  @ViewChildren(MatTooltip) tooltips: QueryList<MatTooltip>;

  constructor(
    private directionService: DirectionService,
    private authService: AuthService,
    private dialogService: DialogService,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {
    this.branchName = data.branchName;
    this.products = data.products;
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

    for (let product of this.products) {
      product.numOfCopies = product.numOfCopies || 0;
    }

    console.log("this.products!!!", this.products);

    this.isLoading = false;
  }

  closeFixProductsDialog() {
    this.dialogService.onCloseFixProductsDialog();
  }

  saveProductsAndcloseFixProductsDialog() {
    this.productsUpdated.emit(this.products);
    console.log("this.products!!@@!", this.products);
    this.dialogService.onCloseFixProductsDialog();
  }

  ngOnDestroy() {
    this.directionSubscription.unsubscribe();
    this.authStatusSub.unsubscribe();
  }

  // normal tooltips
  toggleTooltip(index: number) {
    const tooltipArray = this.tooltips.toArray();
    if (tooltipArray[index]._isTooltipVisible()) {
      tooltipArray[index].hide();
    } else {
      tooltipArray[index].show();
    }
  }

  changeNumberOfItems(type: string, itemIndex: number) {
    if (type === 'add') {
      this.products[itemIndex].numOfCopies++;
    } else if (type === 'remove' && this.products[itemIndex].numOfCopies >= 1) {
      this.products[itemIndex].numOfCopies--;
    }
  }

  totalOrderdFixProducts() {
    let totalCopies = 0;
    for (let product of this.products) {
      totalCopies += product.numOfCopies;
    }
    if (totalCopies > 0) {
      return totalCopies;
    } else {
      return totalCopies;
    }
  }

  totalOrderdFixProductsPrice() {
    let totalPrice = 0;
    for (let product of this.products) {
      if (product.price && product.numOfCopies > 0) {
        totalPrice += product.numOfCopies * product.price;
      } else {
        totalPrice += product.numOfCopies * product.productId.defaultPrice;
      }
    }
    return totalPrice;
  }

  // ===============
}
