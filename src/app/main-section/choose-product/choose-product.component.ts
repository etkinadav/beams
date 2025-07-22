import { Component, OnInit, OnDestroy, Renderer2, ElementRef, ViewChildren, QueryList } from '@angular/core';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

import { DirectionService } from '../../direction.service';
import { DataSharingService } from '../data-shering-service/data-sharing.service';
import { DialogService } from '../../dialog/dialog.service';
import { AuthService } from "../../auth/auth.service";

import { UsersService } from 'src/app/super-management/user/users.service';
import { Subject } from 'rxjs';
import { set } from 'lodash';

import { ProductsService } from 'src/app/super-management/product/products.service';

@Component({
  selector: 'app-choose-product',
  templateUrl: './choose-product.component.html',
  styleUrls: ['./choose-product.component.scss'],
  host: {
    class: 'fill-screen'
  }
})

export class ChooseProductComponent implements OnInit, OnDestroy {
  @ViewChildren('mapBranchItem') mapBranchItems: QueryList<ElementRef>;

  isRTL: boolean = true;
  isDarkMode: boolean = false;
  isLoading: boolean = false;
  private directionSubscription: Subscription;
  userIsAuthenticated = false;
  private authListenerSubs: Subscription;
  products: any[] = [];
  selectedProduct: string = '';
  isAnimateProductBtn: boolean = false;

  constructor(
    public directionService: DirectionService,
    private dataSharingService: DataSharingService,
    private router: Router,
    private dialogService: DialogService,
    private translateService: TranslateService,
    private authService: AuthService,
    private usersService: UsersService,
    private renderer: Renderer2,
    private productsService: ProductsService
  ) { }

  async ngOnInit() {
    this.isLoading = true;
    this.userIsAuthenticated = this.authService.getIsAuth();
    this.authListenerSubs = this.authService
      .getAuthStatusListener()
      .subscribe(isAuthenticated => {
        this.userIsAuthenticated = isAuthenticated;
      });

    this.directionSubscription = this.directionService.direction$.subscribe(direction => {
      this.isRTL = direction === 'rtl';
    });
    this.directionService.isDarkMode$.subscribe(isDarkMode => {
      this.isDarkMode = isDarkMode;
    });

    try {
      this.products = await this.productsService.getAllProducts().toPromise();
      console.log('Products:', this.products);
      this.isLoading = false;
    } catch (error) {
      console.error('Error fetching and transforming products:', error);
    }
  }

  // showActionBtn() {
  //   setTimeout(() => {
  //     if (this.branch && this.branch !== '') {
  //       this.isBranchSet = true;
  //     } else {
  //       this.isBranchSet = false;
  //     }
  //   }, 120);
  // }

  ngOnDestroy() {
    this.directionSubscription.unsubscribe();
    this.authListenerSubs.unsubscribe();
  }

  onChooseProduct(value: string) {
    if (value) {
      this.isLoading = true;
      this.selectedProduct = value;
      this.onSetProduct();
    }
  }

  async onSetProduct() {
    this.dataSharingService.setProduct(this.selectedProduct);
    if (this.userIsAuthenticated) {
      this.router.navigate(['/phprint']);
    } else {
      this.isLoading = false;
      this.openLoginDialog();
    }
  }

  openLoginDialog() {
    this.dialogService.onOpenLoginDialog('ph', '');
  }

  // ================== 
}
