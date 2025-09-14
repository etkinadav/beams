import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

import { DirectionService } from '../../direction.service';
import { AuthService } from 'src/app/auth/auth.service';
import { DialogService } from 'src/app/dialog/dialog.service';

import { OrdersService } from 'src/app/other-pages/my-orders/orders-service';
import { set } from 'lodash';


@Component({
  selector: 'app-delete-order',
  templateUrl: './delete-order.component.html',
  styleUrls: ['./delete-order.component.css'],
  host: {
    class: 'fill-screen-modal-phone'
  }
})
export class DeleteOrderComponent implements OnInit, OnDestroy {
  isRTL: boolean = true;
  private directionSubscription: Subscription;
  isDarkMode: boolean = false;
  isLoading: boolean = false;
  isLoadingUpdates = false;

  userId: string;
  userIsAuthenticated = false;
  private authStatusSub: Subscription;

  order: any;
  isSu: boolean = false;

  constructor(
    private directionService: DirectionService,
    private authService: AuthService,
    private dialogService: DialogService,
    private ordersService: OrdersService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.order = data.order;
    this.isSu = data.isSu;
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

  closeDeleteOrderDialog() {
    this.dialogService.onCloseDeleteOrderDialog();
  }

  onDeleteOrder(
    order: any,
  ) {
    const userId = order.userId;
    const orderId = order._id;
    let service;
    if (order.branchID.is_express) {
      service = 'e';
    } else {
      service = 'p';
    }
    this.isLoadingUpdates = true;
    this.ordersService.deleteOrder(service, userId, orderId, this.isSu).subscribe(() => {
      this.ordersService.notifyOrderUpdated();
      setTimeout(() => {
        this.dialogService.onCloseDeleteOrderDialog();
      }, 500);
    }, () => {
    });
  }

  ngOnDestroy() {
    this.directionSubscription.unsubscribe();
    this.authStatusSub.unsubscribe();
  }

  // ===============
}
