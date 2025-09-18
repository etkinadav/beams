import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { DirectionService } from '../../direction.service';
import { DataSharingService } from '../data-shering-service/data-sharing.service';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from "src/app/auth/auth.service";

import { UsersService } from 'src/app/super-management/user/users.service';
import { DialogService } from 'src/app/dialog/dialog.service';
import { set } from 'lodash';
@Component({
  selector: 'app-choose-printing-system',
  templateUrl: './choose-printing-system.component.html',
  styleUrls: ['./choose-printing-system.component.scss'],
  host: {
    class: 'fill-screen'
  }
})

export class ChoosePrintingSystemComponent implements OnInit, OnDestroy {
  isRTL: boolean = true;
  isDarkMode: boolean = false;
  private directionSubscription: Subscription;
  public hoveredPrintingService: string = '';
  public printingService: string = '';
  continueToServiceText: string = '';
  userIsAuthenticated = false;
  userId: string;
  private authStatusSub: Subscription;
  isSystemSet: boolean = false;
  
  // משתנים למוצרים
  products: any[] = [];
  isLoading: boolean = false;
  error: string | null = null;
  selectedProduct: any = null;
  hoveredProduct: any = null;

  // משתנים לטקסטים מתחלפים
  currentTextIndex: number = 0;
  textChangeInterval: any;
  isTextChanging: boolean = false;

  constructor(
    private directionService: DirectionService,
    private dataSharingService: DataSharingService,
    private router: Router,
    private authService: AuthService,
    private dialogService: DialogService,
    private translateService: TranslateService,
    private http: HttpClient) {
    console.log('=== ChoosePrintingSystemComponent constructor התחיל ===');
    console.log('HttpClient injected:', this.http);
    this.translateService.onLangChange.subscribe(() => {
      this.updatecontinueToServiceText();
    });
  }

  ngOnInit() {
    console.log('=== ChoosePrintingSystemComponent ngOnInit התחיל ===');
    
    this.directionService.direction$.subscribe(direction => {
      this.isRTL = direction === 'rtl';
    });

    this.directionService.isDarkMode$.subscribe(isDarkMode => {
      this.isDarkMode = isDarkMode;
    });

    this.dataSharingService.getPrintingService().subscribe((value) => {
      this.printingService = value;
      this.updatecontinueToServiceText();
    });
    
    // משיכת כל המוצרים
    console.log('קורא לפונקציה loadAllProducts');
    this.loadAllProducts();

    this.userId = this.authService.getUserId();
    this.userIsAuthenticated = this.authService.getIsAuth();
    this.authStatusSub = this.authService
      .getAuthStatusListener()
      .subscribe(isAuthenticated => {
        this.userIsAuthenticated = isAuthenticated;
        this.userId = this.authService.getUserId();
      });

    // התחלת רוטציית הטקסטים
    this.startTextRotation();
  }

  ngOnDestroy() {
    // this.authStatusSub.unsubscribe();
    // עצירת רוטציית הטקסטים
    this.stopTextRotation();
  }

  onHoverPrintingService(value: string) {
    this.hoveredPrintingService = value;
  }

  onChoosePrintingService(value: string) {
    if (value === "express" || value === "plotter" || value === "ph") {
      this.printingService = value;
      this.updatecontinueToServiceText();
      this.onSetPrintingService();
    }
  }

  onSetPrintingService() {
    if (this.printingService === "express" || this.printingService === "plotter") {
      this.dataSharingService.setPrintingService(this.printingService);
      this.router.navigate(['/branch']);
    }
    if (this.printingService === "ph") {
      this.dataSharingService.setPrintingService("ph");
      this.router.navigate(['/product']);
    }
  }

  updatecontinueToServiceText() {
    this.continueToServiceText =
      this.translateService.instant('choose-system.continue-to') +
      this.translateService.instant('choose-system.title-short-' + this.printingService);
  }

  // step-item-trans-plotter


  // פונקציות למוצרים
  onChooseProduct(product: any) {
    console.log('נבחר מוצר:', product);
    this.selectedProduct = product;
    // מעבר לעמוד המוצר ב-/beams
    this.router.navigate(['/beams'], { 
      queryParams: { 
        productId: product._id,
        productName: product.name 
      } 
    });
  }

  onHoverProduct(product: any) {
    this.hoveredProduct = product;
  }

  // פונקציה למשיכת כל המוצרים
  loadAllProducts() {
    console.log('=== loadAllProducts התחיל ===');
    this.isLoading = true;
    this.error = null;
    
    console.log('שולח בקשה ל-/api/products');
    this.http.get('/api/products').subscribe({
      next: (data: any) => {
        this.products = data;
        this.isLoading = false;
        console.log('=== כל המוצרים מהבקאנד ===');
        console.log('כמות מוצרים:', data.length);
        console.log('רשימת מוצרים:', data);
        console.log('פירוט כל מוצר:');
        data.forEach((product: any, index: number) => {
          console.log(`מוצר ${index + 1}:`, {
            id: product._id,
            name: product.name,
            params: product.params?.length || 0,
            translatedName: product.translatedName || 'ללא שם'
          });
        });
        console.log('=== סיום רשימת המוצרים ===');
      },
      error: (error) => {
        this.error = 'שגיאה בטעינת המוצרים';
        this.isLoading = false;
        console.error('Error loading products:', error);
      }
    });
  }

  isSu() {
    if (localStorage.getItem("roles")?.includes("su")) {
      return true;
    }
    return false;
  }

  // פונקציה לניווט למוצר
  navigateToProduct(product: any) {
    if (product && product.name) {
      // ניווט לעמוד המוצר עם שם המוצר
      window.location.href = `/beams?product=${encodeURIComponent(product.name)}`;
    } else {
      // אם אין שם מוצר, ניווט לעמוד הכללי
      window.location.href = '/beams';
    }
  }

  // פונקציות לטקסטים מתחלפים
  startTextRotation() {
    this.textChangeInterval = setInterval(() => {
      this.changeText();
    }, 10000); // החלפה כל 10 שניות
  }

  stopTextRotation() {
    if (this.textChangeInterval) {
      clearInterval(this.textChangeInterval);
    }
  }

  changeText() {
    this.isTextChanging = true;
    setTimeout(() => {
      this.currentTextIndex = (this.currentTextIndex + 1) % 5; // 5 טקסטים
      this.isTextChanging = false;
    }, 800); // זמן ארוך יותר לאנימציה חלקה
  }

  getCurrentTitle(): string {
    const titles = [
      'choose-system.empty-title-1',
      'choose-system.empty-title-2', 
      'choose-system.empty-title-3',
      'choose-system.empty-title-4',
      'choose-system.empty-title-5'
    ];
    return titles[this.currentTextIndex];
  }

  getCurrentText(): string {
    const texts = [
      'choose-system.empty-text-1',
      'choose-system.empty-text-2',
      'choose-system.empty-text-3', 
      'choose-system.empty-text-4',
      'choose-system.empty-text-5'
    ];
    return texts[this.currentTextIndex];
  }

  getCurrentSubtitle(): string {
    const subtitles = [
      'choose-system.empty-subtitle-1',
      'choose-system.empty-subtitle-2',
      'choose-system.empty-subtitle-3',
      'choose-system.empty-subtitle-4',
      'choose-system.empty-subtitle-5'
    ];
    return subtitles[this.currentTextIndex];
  }
  // ==================
}
