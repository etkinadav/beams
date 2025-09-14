import { Component, OnInit, OnDestroy } from "@angular/core";
import { Subscription } from 'rxjs';
import { Router } from "@angular/router";

import { ProductsService } from "../products.service";
import { PageEvent } from "@angular/material/paginator";
import { AuthService } from "src/app/auth/auth.service";
import { DirectionService } from "../../../direction.service";

import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: "app-product-list",
  templateUrl: "./product-list.component.html",
  styleUrls: ["./product-list.component.css"],
  host: {
    class: 'fill-screen'
  }
})
export class ProductListComponent implements OnInit, OnDestroy {
  isDarkMode: boolean = false;
  isRTL: boolean = true;
  private directionSubscription: Subscription;
  private authStatusSub: Subscription;
  products: any[] = [];
  isLoading = false;
  totalProducts = 0;
  productsPerPage = 25;
  currentPage = 1;
  pageSizeOptions = [1, 5, 10, 25];
  userIsAuthenticated = false;
  userId: string;
  private productsSub: Subscription;
  nimlengthUnit: number = 15;

  constructor(
    public productsService: ProductsService,
    private authService: AuthService,
    private router: Router,
    private directionService: DirectionService,
    private _snackBar: MatSnackBar,
    private translate: TranslateService
  ) { }

  ngOnInit() {
    this.isLoading = true;

    this.directionSubscription = this.directionService.direction$.subscribe(direction => {
      this.isRTL = direction === 'rtl';
    });

    this.directionService.isDarkMode$.subscribe(isDarkMode => {
      this.isDarkMode = isDarkMode;
    });

    this.productsService.getProducts(this.productsPerPage, this.currentPage);
    this.userId = this.authService.getUserId();
    this.productsSub = this.productsService
      .getProductUpdateListener()
      .subscribe((productData: { products: any[], productCount: number }) => {
        this.totalProducts = productData.productCount;
        this.products = productData.products;
        this.isLoading = false;
      });
  }

  onChangedPage(pageData: PageEvent) {
    this.isLoading = true;
    this.currentPage = pageData.pageIndex + 1;
    this.productsPerPage = pageData.pageSize;
    this.productsService.getProducts(this.productsPerPage, this.currentPage);
  }

  onDeleteConfirm(productId: string) {
    this.isLoading = true;
    this.productsService.deleteProduct(productId).subscribe(() => {
      this.productsService.getProducts(this.productsPerPage, this.currentPage);
    }, () => {
      this.isLoading = false;
    });
  }

  ngOnDestroy() {
    this.productsSub.unsubscribe();
    this.directionSubscription.unsubscribe();
  }

  toProductsCreate() {
    this.router.navigate(["/productcreate"]);
  }

  copyToClipboard(value: string, valueType: string) {
    if (valueType === 'phone') {
      navigator.clipboard.writeText(value).then(() => {
        this.translate.get('su-management.products_copy-success-phone').subscribe((res: string) => {
          this._snackBar.open(res, '', {
            duration: 1500,
            panelClass: ['auto-width', 'center-text'].filter(Boolean)
          });
        });
      });
    } else if (valueType === 'email') {
      navigator.clipboard.writeText(value).then(() => {
        this.translate.get('su-management.products_copy-success-email').subscribe((res: string) => {
          this._snackBar.open(res, '', {
            duration: 1500,
            panelClass: ['auto-width', 'center-text'].filter(Boolean)
          });
        });
      });
    }
  }
}
