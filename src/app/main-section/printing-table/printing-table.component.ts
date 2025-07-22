import {
  Component,
  OnInit,
  OnDestroy,
  HostListener,
  ElementRef,
  ViewChildren,
  QueryList,
  ChangeDetectorRef,
  AfterViewChecked,
  ViewChild,
  NgZone,
  DoCheck,
} from '@angular/core';

import { DirectionService } from '../../direction.service';
import { Subscription, interval, BehaviorSubject, Observable, combineLatest, from, of } from 'rxjs';
import { startWith, switchMap, map } from 'rxjs/operators';
import { DataSharingService } from '../data-shering-service/data-sharing.service';
import { Router } from '@angular/router';
import { DialogService } from '../../dialog/dialog.service';
import { TranslateService } from '@ngx-translate/core';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { TooltipContentComponent } from './tooltips/paper-tooltip.component';
import { MatTooltip } from '@angular/material/tooltip';

import { BranchesService } from 'src/app/super-management/branch/branches.service';
import { UsersService } from 'src/app/super-management/user/users.service';
import { FilesService } from './file.service';
import { Direction } from '@angular/cdk/bidi';
import * as _ from 'lodash';

// import { ResizeComponent } from 'src/app/dialog/resize/resize.component';
import { trigger, animate, style, transition, keyframes, state } from '@angular/animations';
import { FileUploader, FileItem } from 'ng2-file-upload';
import { MatSnackBar } from '@angular/material/snack-bar';
import * as e from 'express';
import { FixProductsComponent } from 'src/app/dialog/fix-products/fix-products.component';

@Component({
  selector: 'app-printing-table',
  templateUrl: './printing-table.component.html',
  styleUrls: ['./printing-table.component.scss'],
  host: {
    class: 'fill-screen'
  },
  animations: [
    trigger('rattleAnimation', [
      transition('* <=> *', [
        animate('1.2s', keyframes([
          style({ transform: 'scale(1)', offset: 0 }),
          style({ transform: 'scale(1.02) rotate(-1deg)', offset: 0.1 }),
          style({ transform: 'scale(1.05) rotate(-2.5deg)', offset: 0.2 }),
          style({ transform: 'scale(1.063) rotate(-5deg)', offset: 0.3 }),
          style({ transform: 'scale(1.04) rotate(-4.5deg)', offset: 0.4 }),
          style({ transform: 'scale(1.01) rotate(-1.5deg)', offset: 0.5 }),
          style({ transform: 'scale(0.98) rotate(3deg)', offset: 0.6 }),
          style({ transform: 'scale(1.03) rotate(2.5deg)', offset: 0.7 }),
          style({ transform: 'scale(1.02) rotate(0.5deg)', offset: 0.8 }),
          style({ transform: 'scale(0.99) rotate(-1deg)', offset: 0.9 }),
          style({ transform: 'scale(1)', offset: 1 })
        ]))
      ]),
      transition(':leave', [
        animate('0s', style({ opacity: 0 }))
      ])
    ]),
    trigger('textAnimation', [
      transition('* <=> *', [
        animate('1.2s', keyframes([
          style({ transform: 'scale(1)', offset: 0 }),
          style({ transform: 'scale(1.005)', offset: 0.1 }),
          style({ transform: 'scale(1.035)', offset: 0.2 }),
          style({ transform: 'scale(1.03)', offset: 0.3 }),
          style({ transform: 'scale(0.995)', offset: 0.4 }),
          style({ transform: 'scale(1)', offset: 0.5 }),
          style({ transform: 'scale(1)', offset: 1 })
        ]))
      ])
    ]),
    trigger('paperAnimation', [
      state('state1', style({ transform: 'scale(1)' })),
      state('state2', style({ transform: 'scale(1)' })),
      transition('state1 => state2', [
        animate('1.3s', keyframes([
          style({ transform: 'scale(1)', offset: 0 }),
          style({ transform: 'scale(1)', offset: 0.2 }),
          style({ transform: 'scale(1.005) rotate(0.23deg)', offset: 0.3 }),
          style({ transform: 'scale(1.042) rotate(0.5deg)', offset: 0.4 }),
          style({ transform: 'scale(1.03) rotate(0.1deg)', offset: 0.5 }),
          style({ transform: 'scale(0.995) rotate(-0.1deg)', offset: 0.6 }),
          style({ transform: 'scale(1)', offset: 0.7 }),
          style({ transform: 'scale(1)', offset: 1 })
        ]))
      ]),
      transition('state2 => state1', [])
    ]),
    trigger('mainBtnAnimation', [
      state('state1', style({ transform: 'scale(1)' })),
      state('state2', style({ transform: 'scale(1)' })),
      transition('state1 => state2', [
        animate('1.3s', keyframes([
          style({ transform: 'scale(1)', offset: 0 }),
          style({ transform: 'scale(1)', offset: 0.2 }),
          style({ transform: 'scale(1.003) rotate(0.11deg)', offset: 0.3 }),
          style({ transform: 'scale(1.025) rotate(0.3deg)', offset: 0.4 }),
          style({ transform: 'scale(1.015) rotate(0.05deg)', offset: 0.5 }),
          style({ transform: 'scale(0.997) rotate(-0.06deg)', offset: 0.6 }),
          style({ transform: 'scale(1)', offset: 0.7 }),
          style({ transform: 'scale(1)', offset: 1 })
        ]))
      ]),
      transition('state2 => state1', [])
    ])
  ]
})

export class PrintingTableComponent implements OnInit, OnDestroy, AfterViewChecked {

  imagePrintSettings$: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  @ViewChildren('fileElement') fileElements: QueryList<ElementRef>;
  @ViewChildren('fileExpressElement') fileExpressElements: QueryList<ElementRef>;
  isScrollNeeded = false;

  isRTL: boolean = true;
  isDarkMode: boolean = false;
  isLoading: boolean = false;
  serverAddress: string = '';
  isLoadingPreview: boolean = false;
  private directionSubscription: Subscription;
  tooltipDirection: Direction = 'ltr';
  user: any;

  public printingService: string = '';
  public branch: string = '';
  public realBranch: any;
  public branches: any[] = [];
  public filteredBranches: { name: string, systems: string[] }[] = [];
  private printingServiceSubscription: Subscription;
  private branchSubscription: Subscription;
  private currentInterval: any;
  printServicePapers: any[] = [];
  files: any[] = [];
  proccessingFiles: any[] = [];
  paperCodes: string[] = [];
  paperNames: string[] = [];
  currentFile: any;
  currentImage: any;
  currentImageIndex: number;
  isChosen: boolean = false;
  isPaperTypeLoading: boolean = false;
  isCurrentrotated: boolean = false;
  factor: number = 0;
  // isCurrentBandW: boolean = false;
  selectedPaper: any;
  isAllFilesHavePaper: boolean = false;
  resizedInagePrintSettings: any;
  isFitRequired: boolean = false;
  scaleImageFactor: number = 1;
  isOriginalPossible: boolean = true;
  currentFileIndex: number = 0;
  sortedFilesArray: any[] = [];
  isToRefreshTable: boolean = true;
  isPaperTooltopOpen: boolean = false;
  lastFileId: string = '';
  isBranchCloseInterval: any;
  isCloseStatusInformed: boolean = false;
  maxInkLevelDubble: number = 35;

  @ViewChild('tooltipScanCopy') tooltipScanCopy: MatTooltip;
  @ViewChild('tooltipFixProducts') tooltipFixProducts: MatTooltip;

  @ViewChild(FixProductsComponent) fixProductsComponent: FixProductsComponent;
  previousTotalOrderdFixProductsPrice: number;

  // rattle animation
  rattle = 'state1';
  rattleInterval: any;

  // no paper animation
  noPaper = 'state1';
  noPaperInterval: any;
  isNoPaperAnimating: boolean = false;
  isAnimatePaperStrong: boolean = false;

  // mainBtn
  mainBtn = 'state1';
  mainBtnInterval: any;
  isOpeningCompMainBtn: boolean = true;
  lastIsAllFilesHavePaper: boolean = false;

  // total Price
  totalOrderPrice: number = 0;
  totalOrderPriceBeforeDiscount: number = 0;
  // total Price Before Updated
  totalOrderPriceToBeforeUpdate: number = 0;
  totalOrderPriceBeforeDiscountToBeforeUpdate: number = 0;

  // current image paper inputs
  currentPaperWidth: number;
  currentPaperHeight: number;
  // current image file inputs:
  currentImageWidth: number;
  currentImageHeight: number;
  // current image more inputs
  // isCurrentCenter: boolean = false;
  currentPaperMargin: number = 0;

  // preview container inputs
  previewContainerWidth: number;
  previewContainerHeight: number;
  // preview paper inputs
  previewPaperWidth: number;
  previewPaperHeight: number;
  // preview file inputs:
  previewImageContainerWidth: number;
  previewImageContainerHeight: number;
  previewImageWidth: number;
  previewImageHeight: number;
  // preview more inputs
  previewPaperMargin: number;
  branchID: string;

  constructor(
    public directionService: DirectionService,
    private dataSharingService: DataSharingService,
    private router: Router,
    private dialogService: DialogService,
    private translateService: TranslateService,
    private branchesService: BranchesService,
    private elRef: ElementRef,
    private filesService: FilesService,
    private overlay: Overlay,
    private cdr: ChangeDetectorRef,
    private usersService: UsersService,
    private cd: ChangeDetectorRef,
    private ngZone: NgZone,
    private snackBar: MatSnackBar,
    // private resizeComponent: ResizeComponent,
  ) {
    this.translateService.onLangChange.subscribe(() => {

    });

    this.trackUploadProgress();
  }

  // ngOnInit ---------------------------------------------------------------
  async ngOnInit() {
    this.isToRefreshTable = true;
    this.isLoading = true;

    this.directionSubscription = this.directionService.direction$.subscribe(direction => {
      this.isRTL = direction === 'rtl';
      this.tooltipDirection = this.isRTL ? 'rtl' : 'ltr';
    });

    this.directionService.isDarkMode$.subscribe(isDarkMode => {
      this.isDarkMode = isDarkMode;
    });

    try {
      this.branches = await this.branchesService.getAllBranches().toPromise();
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error fetching and transforming branches:', error);
    }

    this.dialogService.closeResizeDialog$.subscribe(() => {
      this.checkReturnedResizedFile();
    });

    this.previousTotalOrderdFixProductsPrice = this.totalOrderdFixProductsPrice();

    this.branchSubscription = this.dataSharingService.getBranch().subscribe(
      async (value) => {
        // clear previous interval
        if (this.currentInterval) {
          this.currentInterval.unsubscribe();
          this.currentInterval = null;
        }
        if (!value) {
          const service = localStorage.getItem('printingService');
          const branch = localStorage.getItem('branch');
          if (service && branch && service !== '' && branch !== '') {
            this.printingService = service;
            this.branch = branch;
            this.dataSharingService.setPrintingService(this.printingService);
            this.dataSharingService.setBranch(this.branch);
            this.isCloseStatusInformed = false;
          } else {
            await this.router.navigate(['/']);
          }
        }
        this.isLoading = true;

        // get printing service
        this.printingServiceSubscription = this.dataSharingService.getPrintingService().subscribe(
          (value) => {
            if (value === "express" || value === "plotter") {
              this.printingService = value;
              this.resetValues();
              this.isCloseStatusInformed = false;
            } else {
              this.router.navigate(['/']);
            }
          },
          (error) => {
            this.router.navigate(['/']);
          }
        );

        // get branch
        if (this.branches.find(branch => branch.name === value)) {
          this.branch = value;
          this.branchID = this.branches.find(branch => branch.name === value)[this.printingService].branch;
          this.realBranch = this.branches.find(branch => branch.name === value);
          // console.log('realBranch', this.realBranch);
          if (this.printingService === "plotter") {
            await this.handlePlotterPrintingService();
          } else if (this.printingService === "express") {
            await this.handleExpressPrintingService();
          }
          await this.initializeFileUploader();
          this.startOrStopAnimateNoPaper();
          this.startOrStopAnimateUploadSVG();
          this.checkBranchStatus();
        } else {
          this.isCloseStatusInformed = true;
          const service = localStorage.getItem('printingService');
          const branch = localStorage.getItem('branch');
          if (service && branch && service !== '' && branch !== '') {
            this.printingService = service;
            this.branch = branch;
            this.dataSharingService.setPrintingService(this.printingService);
            this.dataSharingService.setBranch(this.branch);
            this.isCloseStatusInformed = false;
          } else {
            await this.router.navigate(['/']);
          }
        }
      },
      (error) => {
        this.router.navigate(['/']);
      });
  }

  ngOnDestroy() {
    this.isToRefreshTable = false;
    if (this.directionSubscription) {
      this.directionSubscription.unsubscribe();
    }
    if (this.printingServiceSubscription) {
      this.printingServiceSubscription.unsubscribe();
    }
    if (this.branchSubscription) {
      this.branchSubscription.unsubscribe();
    };
    this.clearAllIntervals();
  }

  ngDoCheck(): void {
    const currentTotalOrderdFixProductsPrice = this.totalOrderdFixProductsPrice();
    if (currentTotalOrderdFixProductsPrice !== this.previousTotalOrderdFixProductsPrice) {
      this.previousTotalOrderdFixProductsPrice = currentTotalOrderdFixProductsPrice;
      this.calcTotalOrderPrice();
    }
  }

  clearAllIntervals() {
    // console.log('Clearing all intervals');
    clearInterval(this.rattleInterval);
    clearInterval(this.noPaperInterval);
    clearInterval(this.mainBtnInterval);
    clearInterval(this.isBranchCloseInterval);
    clearInterval(this.currentInterval);
  }

  handlePlotterPrintingService() {
    this.resetValues();
    this.clearPreviewDataDeep();
    this.clearPreviewData();
    // check branch and clear settings [plotter]
    if (!localStorage.getItem('printingService') || !localStorage.getItem('branch') ||
      !localStorage.getItem('lastPrintingService') || !localStorage.getItem('lastBranch') ||
      localStorage.getItem('printingService') !== localStorage.getItem('lastPrintingService') ||
      localStorage.getItem('branch') !== localStorage.getItem('lastBranch')) {
      localStorage.setItem('branch', this.realBranch.name);
      localStorage.setItem('printingService', this.printingService);
    }
    localStorage.setItem('lastPrintingService', this.printingService);
    localStorage.setItem('lastBranch', this.branch);
    // extract papers [plotter]
    this.printServicePapers = [...this.realBranch.plotter.printers[0].inputBins];
    this.isLoading = false;
    this.serverAddress = this.realBranch.plotter.printers[0].serverAddress;

    if (this.printServicePapers.length > 0) {
      // === ----------------------- === update files interval [plotter] === --------------------------------------------------------- ===
      const userId = localStorage.getItem('userId');
      this.fetchUser(userId);
      this.currentInterval = interval(4000)
        .pipe(
          startWith(0),
          switchMap(() => this.filesService.getUserFiles(userId, this.realBranch.plotter.printers[0]._id)))
        .subscribe((files) => {
          if (files && !this.isLoadingPreview && this.isToRefreshTable) {
            // console.log('-=PLOTTER=- files', files);
            // needs to update?
            if (_.isEqual(this.files, files)) {
              // console.log('DO-NOT update -=PLOTTER=- files');
              return;
            }
            // console.log('DO update -=PLOTTER=- files');
            // // needs to update?
            this.isLoading = true;
            if (files.length === 0) {
              this.resetValues();
            } else {
              this.proccessingFiles = [];
              let FirstFileIndexWithImages = 0;
              let isFileFound = false;
              files.forEach((file, idx) => {
                if (!file.images || file.images.length === 0) {
                  this.proccessingFiles.push(file);
                } else {
                  if (!isFileFound) {
                    FirstFileIndexWithImages = idx;
                    isFileFound = true;
                  }
                }
              });
              this.files = files;
              this.paperCodes = this.realBranch.plotter.printers[0].inputBins.map(bin => bin.paperType.paperPrinterCode);
              this.paperNames = this.realBranch.plotter.printers[0].inputBins.map(bin => bin.paperType.paperType);
              if (!this.isChosen && this.proccessingFiles.length !== this.files.length) {
                this.onChooseImage(this.files[FirstFileIndexWithImages], this.files[FirstFileIndexWithImages].images[0], 0);
              } else {
                // rechoose current image
                if (this.currentFile && this.currentImage) {
                  const currentFileIndex = this.files.findIndex(file => file._id === this.currentFile._id);
                  const currentImageIndex = this.currentFile.images.findIndex(image => image._id === this.currentImage._id);
                  if (currentFileIndex !== -1 && currentImageIndex !== -1) {
                    this.onChooseImage(this.files[currentFileIndex], this.files[currentFileIndex].images[currentImageIndex], currentImageIndex);
                  }
                }
              }
              if (this.proccessingFiles.length === this.files.length) {
                this.clearPreviewDataDeep();
                this.clearPreviewData();
              }
            }
            this.checkIsAllFilesHavePaper();
            this.isLoading = false;
          }
        });
    }
  }

  async handleExpressPrintingService() {
    // console.log('realBranch from P table:', this.realBranch);
    // console.log('realBranch from P table:', this.realBranch.express.properties.enable_crop);
    this.resetValues();
    this.clearPreviewDataDeep();
    this.clearPreviewData();
    if (!localStorage.getItem('printingService') || !localStorage.getItem('branch') ||
      !localStorage.getItem('lastPrintingService') || !localStorage.getItem('lastBranch') ||
      localStorage.getItem('printingService') !== localStorage.getItem('lastPrintingService') ||
      localStorage.getItem('branch') !== localStorage.getItem('lastBranch')) {
      await this.onFileSettingsChangeExpress(true);
    }
    localStorage.setItem('lastPrintingService', this.printingService);
    localStorage.setItem('lastBranch', this.branch);
    // extract papers [express]
    this.printServicePapers = this.realBranch.express?.consumables?.papers ? [...this.realBranch.express.consumables.papers] : [];
    this.isLoading = false;
    this.serverAddress = 'https://img-express.eazix.io';

    if (this.printServicePapers.length > 0) {
      // === ----------------------- === update files interval [express] === --------------------------------------------------------- ===
      const userId = localStorage.getItem('userId');
      await this.fetchUser(userId);
      this.currentInterval = interval(4000)
        .pipe(
          startWith(0),
          switchMap(() => this.filesService.getUserFilesExpress(userId)))
        .subscribe((files) => {
          if (files && !this.isLoadingPreview && this.isToRefreshTable) {
            // console.log('-=EXPRESS=- files', files);

            // iterate all file, for each one iterate images, and for each imagePath,inkPath,resizedPath,thumbnailPath,rotatedThumbnailPath,
            // replace all that is before /uploads with https://img-express.eazix.io
            files.forEach(file => {
              file.images.forEach(image => {
                if (image.imagePath) {
                  image.imagePath = image.imagePath.replace(/\/uploads/g, 'https://img-express.eazix.io');
                }
                if (image.inkPath) {
                  image.inkPath = image.inkPath.replace(/\/uploads/g, 'https://img-express.eazix.io');
                }
                if (image.resizedPath) {
                  image.resizedPath = image.resizedPath.replace(/\/uploads/g, 'https://img-express.eazix.io');
                }
                if (image.thumbnailPath) {
                  image.thumbnailPath = image.thumbnailPath.replace(/\/uploads/g, 'https://img-express.eazix.io');
                }
                if (image.rotatedThumbnailPath) {
                  image.rotatedThumbnailPath = image.rotatedThumbnailPath.replace(/\/uploads/g, 'https://img-express.eazix.io');
                }
              });
            });

            let oldFilesForCompare = this.files;
            let newFilesForCompare = files;

            oldFilesForCompare = oldFilesForCompare.map(order => {
              order = _.omit(order, ['userID', 'printerID']);
              if (order.printSettings) {
                order.printSettings = _.omit(order.printSettings, ['fit']);
              }
              return order;
            });
            newFilesForCompare = newFilesForCompare.map(order => {
              order = _.omit(order, ['userID', 'printerID']);
              if (order.printSettings) {
                order.printSettings = _.omit(order.printSettings, ['fit']);
              }
              return order;
            });

            if (_.isEqual(oldFilesForCompare, newFilesForCompare)) {
              console.log('DO NOT update -=EXPRESS=- files');
              return;
            }
            console.log('DO update -=EXPRESS=- files:', files);
            // console.log('old', JSON.stringify(oldFilesForCompare));
            // console.log('new', JSON.stringify(newFilesForCompare));
            // console.log('[DO] = newFiles', files);
            // console.log('[DO] = this.files', this.files);
            // console.log('[DO] = isLoadingPreview', this.isLoadingPreview);
            // console.log('[DO] = isLoading', this.isLoading);
            this.isLoading = true;
            if (files.length === 0) {
              this.resetValues();
            } else {
              this.proccessingFiles = [];
              let FirstFileIndexWithImages = 0;
              // is file found
              let isFileFound = false;
              files.forEach((file, idx) => {
                if (!file.images || file.images?.length === 0) {
                  this.proccessingFiles.push(file);
                } else {
                  if (!isFileFound) {
                    FirstFileIndexWithImages = idx;
                    isFileFound = true;
                  }
                }
              });
              if (!this.files.length && files.length) {
                // console.log("first time files", files);
              }
              this.files = files;
              this.paperCodes = this.realBranch.express.consumables.papers.map(paper => paper.paperPrinterCode);
              this.paperNames = this.realBranch.express.consumables.papers.map(paper => paper.paperType);
              // choose first file that has images
              if (!this.isChosen && this.proccessingFiles.length !== this.files.length) {
                // console.log("FirstFileIndexWithImages", FirstFileIndexWithImages);
                // console.log("this.files[FirstFileIndexWithImages]", this.files[FirstFileIndexWithImages]);
                this.onChooseImage(this.files[FirstFileIndexWithImages], this.files[FirstFileIndexWithImages].images[0], 0);
              } else {
                // rechoose the current image
                if (this.currentFile && this.currentImage) {
                  const currentFileIndex = this.files.findIndex(file => file._id === this.currentFile._id);
                  const currentImageIndex = this.currentFile.images.findIndex(image => image._id === this.currentImage._id);
                  if (currentFileIndex !== -1 && currentImageIndex !== -1) {
                    this.onChooseImage(this.files[currentFileIndex], this.files[currentFileIndex].images[currentImageIndex], currentImageIndex);
                  }
                }
              }
              if (this.proccessingFiles.length === this.files.length) {
                this.clearPreviewDataDeep();
                this.clearPreviewData();
              }
            }
            this.checkIsAllFilesHavePaper();
            this.isLoading = false;
          }
        });
    }
  }

  checkBranchStatus() {
    if (this.printingService === "plotter") {
      if (this.realBranch.plotter.close) {
        if (!this.isCloseStatusInformed) {
          this.dialogService.onOpenCloseBranchDialog(
            this.printingService,
            this.branch,
            this.realBranch.plotter.close_msg
          );
          this.isCloseStatusInformed = true;
        }
      }
    } else if (this.printingService === "express") {
      if (this.realBranch.express.properties.close) {
        if (!this.isCloseStatusInformed) {
          this.dialogService.onOpenCloseBranchDialog(
            this.printingService,
            this.branch,
            this.realBranch.express.properties.close_msg
          );
          this.isCloseStatusInformed = true;
        }
      }
    }
    this.isBranchCloseInterval = setInterval(async () => {
      try {
        let service = localStorage.getItem('printingService');
        let branch = localStorage.getItem('branch');
        const status = await this.branchesService.onCheckBranchStatus(service, branch).toPromise();
        if (status.status.close) {
          if (!this.isCloseStatusInformed) {
            this.dialogService.onOpenCloseBranchDialog(
              this.printingService,
              this.realBranch.name,
              status.status.close_msg
            );
            this.isCloseStatusInformed = true;
          }
        } else {
          this.isCloseStatusInformed = false;
        }
      } catch (error) {
        console.error('Error fetching branch status:', error);
      }
    }, 30000);
  }

  async initializeFileUploader() {
    this.endpoint = `${this.serverAddress}/api/files/upload`;
    this.uploader.setOptions({ url: this.endpoint });
    console.log("changed endpoint", this.endpoint);
  }

  stopUploading() {
    // DOR NEW TASK!
    console.log('DOR NEW TASK! | STOP UPLOADING FILES!');
  }

  stopEvent(event: Event): void {
    event.stopPropagation();
  }

  // [general]
  async fetchUser(userId: string) {
    try {
      this.user = await this.usersService.getUser(userId).toPromise();
    } catch (error) {
      console.error('Error fetching user:', error);
    }
    console.log('USER object is HERE', this.user);
  }

  // [plotter + express]
  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    if (this.printingService === "plotter") {
      this.updatePreview();
    } else if (this.printingService === "express") {
      this.updatePreviewExpress();
    }
  }

  // IMAGE PREVIEW

  // === ----------------------- === [plotter] IMAGE PREVIEW === --------------------------------------------------------- ===

  updatePreview(): void {
    this.isLoadingPreview = true;

    // Get paper + image containers
    const previewPaper: HTMLElement = this.elRef.nativeElement.querySelector('#preview-paper');
    const previewImageContainer: HTMLElement = this.elRef.nativeElement.querySelector('#preview-image-container');
    if (!previewPaper || !previewImageContainer) {
      return;
    }

    // Reset dimensions
    // Paper
    previewPaper.style.width = `0px`;
    previewPaper.style.height = `0px`;
    // Image
    previewImageContainer.style.width = `0px`;
    previewImageContainer.style.height = `0px`;

    // Get container dimensions
    const previewContainer: HTMLElement = this.elRef.nativeElement.querySelector('#preview-container');

    // Get upper dim
    const upperDim1: HTMLElement = this.elRef.nativeElement.querySelector('#upperDim1');
    const upperDim2: HTMLElement = this.elRef.nativeElement.querySelector('#upperDim2');
    const upperDim3: HTMLElement = this.elRef.nativeElement.querySelector('#upperDim3');

    this.previewContainerWidth = previewContainer.offsetWidth;
    this.previewContainerHeight = previewContainer.offsetHeight;

    // Get paper width
    if (this.currentImage && this.currentPrintSettings && this.printServicePapers.some(paper => paper.paperType.paperPrinterCode === this.currentPaperType)) {
      this.selectedPaper = this.printServicePapers.find(paper => paper.paperType.paperPrinterCode === this.currentPaperType);
    }

    if (this.selectedPaper) {
      // Set paper width
      this.currentPaperWidth = this.selectedPaper.paperType.paperWidth / 1000;

      // margin?
      if (this.cmFromTopValue) {
        this.currentPaperMargin = 1;
      } else {
        this.currentPaperMargin = 0;
      }

      // Calculate if needs to rotate 1
      let BeforeRotationImageWidth = 0;
      let BeforeRotationImageHeight = 0;
      if (this.currentPaperType) {
        BeforeRotationImageWidth = (this.currentImage.imageWidth / this.currentImage.origImageDPI) * 2.54;
        BeforeRotationImageHeight = (this.currentImage.imageHeight / this.currentImage.origImageDPI) * 2.54;
      }

      // boat dims are too big
      if (BeforeRotationImageWidth >= this.currentPaperWidth &&
        BeforeRotationImageHeight >= this.currentPaperWidth) {
        console.log("file is too bog for the this.paperCodes, need to resize!");
        this.resizedInagePrintSettings = this.currentPrintSettings;
        this.openResizeDialog(true);
        this.onFileSettingsChange(true);
        return;
      }

      // Calculate if needs to rotate 2
      if (BeforeRotationImageWidth >= this.currentPaperWidth ||
        BeforeRotationImageHeight >= this.currentPaperWidth) {
        // 1 dim are too big
        if (BeforeRotationImageWidth > BeforeRotationImageHeight) {
          // width is bigger
          this.isCurrentrotated = true;
          this.currentImageWidth = BeforeRotationImageHeight;
          this.currentImageHeight = BeforeRotationImageWidth;
        } else {
          // height is bigger
          this.isCurrentrotated = false;
          this.currentImageWidth = BeforeRotationImageWidth;
          this.currentImageHeight = BeforeRotationImageHeight;
        }
      } else {
        // 2 dim are NOT too big
        if (BeforeRotationImageWidth > BeforeRotationImageHeight) {
          // width is bigger
          this.isCurrentrotated = false;
          this.currentImageWidth = BeforeRotationImageWidth;
          this.currentImageHeight = BeforeRotationImageHeight;
        } else {
          // height is bigger
          this.isCurrentrotated = true;
          this.currentImageWidth = BeforeRotationImageHeight;
          this.currentImageHeight = BeforeRotationImageWidth;
        }
      }

      this.currentPaperHeight = this.currentImageHeight + this.currentPaperMargin;

      // Calc dimantion of maximal preview size
      if (this.previewContainerHeight / this.previewContainerWidth > this.currentPaperHeight / this.currentPaperWidth) {
        // fit to width
        this.factor = this.previewContainerWidth / this.currentPaperWidth;
        this.previewPaperWidth = this.previewContainerWidth;
        this.previewPaperHeight = this.currentPaperHeight * this.factor;
        this.previewImageContainerWidth = this.currentImageWidth * this.factor;
        this.previewImageContainerHeight = this.currentImageHeight * this.factor;
      } else {
        // fit to height
        this.factor = this.previewContainerHeight / this.currentPaperHeight;
        this.previewPaperHeight = this.previewContainerHeight;
        this.previewPaperWidth = this.currentPaperWidth * this.factor;
        this.previewImageContainerHeight = this.currentImageHeight * this.factor;
        this.previewImageContainerWidth = this.currentImageWidth * this.factor;
      }

      // rotated ?
      if (!this.isCurrentrotated) {
        // not rotated
        this.previewImageWidth = this.previewImageContainerWidth;
        this.previewImageHeight = this.previewImageContainerHeight;
      } else {
        // rotated
        this.previewImageWidth = this.previewImageContainerHeight;
        this.previewImageHeight = this.previewImageContainerWidth;
      }

      // centered?
      // if (this.currentPrintSettings.centered) {
      //   this.isCurrentCenter = true;
      // } else {
      //   this.isCurrentCenter = false;
      // }

      // B and W?
      // if (this.bwValue) {
      //   this.isCurrentBandW = true;
      // } else {
      //   this.isCurrentBandW = false;
      // }

    } else {
      this.clearPreviewData();
    }
    this.isLoadingPreview = false;

    // Update paper dimensions
    previewPaper.style.width = `${this.previewPaperWidth}px`;
    previewPaper.style.height = `${this.previewPaperHeight}px`;

    // Update img dimensions
    previewImageContainer.style.width = `${this.previewImageWidth}px`;
    previewImageContainer.style.height = `${this.previewImageHeight}px`;

    // Update dims preview dimensions
    if (!this.centerValue) {
      // if NOT centered
      upperDim1.style.width = `${this.previewPaperWidth - this.previewImageContainerWidth}px`;
      upperDim2.style.width = `${this.previewImageContainerWidth}px`;
      upperDim3.style.width = `0px`;
    } else {
      // if centered
      upperDim1.style.width = `${(this.previewPaperWidth - this.previewImageContainerWidth) / 2}px`;
      upperDim2.style.width = `${this.previewImageContainerWidth}px`;
      upperDim3.style.width = `${(this.previewPaperWidth - this.previewImageContainerWidth) / 2}px`;
    }

    // price calculation
    this.totalOrderPrice = 0;
    this.totalOrderPriceBeforeDiscount = 0;
    this.calcTotalOrderPrice();
  }

  // === ----------------------- === [express] IMAGE PREVIEW === --------------------------------------------------------- ===

  updatePreviewExpress(): void {
    this.isLoadingPreview = true;

    // Get paper + image containers
    const previewPaper: HTMLElement = this.elRef.nativeElement.querySelector('#preview-paper');
    const previewImageContainer: HTMLElement = this.elRef.nativeElement.querySelector('#preview-image-container');
    if (!previewPaper || !previewImageContainer) {
      return;
    }

    // Reset dimensions
    // Paper
    previewPaper.style.width = `0px`;
    previewPaper.style.height = `0px`;
    // Image
    previewImageContainer.style.width = `0px`;
    previewImageContainer.style.height = `0px`;

    // Get container dimensions
    const previewContainer: HTMLElement = this.elRef.nativeElement.querySelector('#preview-container');

    // Get upper dim
    const upperDim1: HTMLElement = this.elRef.nativeElement.querySelector('#upperDim1');
    const upperDim2: HTMLElement = this.elRef.nativeElement.querySelector('#upperDim2');
    const upperDim3: HTMLElement = this.elRef.nativeElement.querySelector('#upperDim3');
    // Get sider dim
    const siderDim1: HTMLElement = this.elRef.nativeElement.querySelector('#siderDim1');
    const siderDim2: HTMLElement = this.elRef.nativeElement.querySelector('#siderDim2');
    const siderDim3: HTMLElement = this.elRef.nativeElement.querySelector('#siderDim3');

    // console.log('updatePreviewExpress 2', previewPaper, previewImageContainer, previewContainer, upperDim1, upperDim2, upperDim3);

    this.previewContainerWidth = previewContainer.offsetWidth;
    this.previewContainerHeight = previewContainer.offsetHeight;

    // console.log('updatePreviewExpress 3', this.previewContainerWidth, this.previewContainerHeight);

    // Get paper width
    if (this.currentImage && this.currentPrintSettings && this.printServicePapers.find(paper => paper.paperName === this.currentPrintSettings.paperType)) {
      this.selectedPaper = this.printServicePapers.find(paper => paper.paperName === this.currentPrintSettings.paperType);
    }
    if (this.selectedPaper) {
      // console.log('updatePreviewExpress 4', this.selectedPaper);
      const paperType = this.selectedPaper.paperType;
      if (paperType === 'A4') {
        this.currentPaperWidth = 21;
        this.currentPaperHeight = 29.7;
      } else if (paperType === 'A3') {
        this.currentPaperWidth = 29.7;
        this.currentPaperHeight = 42;
      } else if (paperType === 'CY-SM') {
        this.currentPaperWidth = 10.16;
        this.currentPaperHeight = 15.24;
      } else if (paperType === 'CY-MD') {
        this.currentPaperWidth = 12.7;
        this.currentPaperHeight = 17.78;
      } else if (paperType === 'CY-LG') {
        this.currentPaperWidth = 15.24;
        this.currentPaperHeight = 20.32;
      }

      // Calculate if needs to rotate 1
      let BeforeRotationImageWidth = (this.currentImage.imageWidth / this.currentImage.origImageDPI) * 2.54;
      let BeforeRotationImageHeight = (this.currentImage.imageHeight / this.currentImage.origImageDPI) * 2.54;

      // Calculate bigest dims of all images
      let BeforeRotationAllImagesBiggestWidth = this.currentFile.images.reduce((max, image) => {
        return Math.max(max, (image.imageWidth / image.origImageDPI) * 2.54);
      }, 0);
      let BeforeRotationAllImagesBiggestHeight = this.currentFile.images.reduce((max, image) => {
        return Math.max(max, (image.imageHeight / image.origImageDPI) * 2.54);
      }, 0);

      const biggerPaperDimm = Math.max(this.currentPaperWidth, this.currentPaperHeight);
      const smallerPaperDimm = Math.min(this.currentPaperWidth, this.currentPaperHeight);

      // check if original size is possible
      if ((biggerPaperDimm > BeforeRotationAllImagesBiggestWidth && smallerPaperDimm > BeforeRotationAllImagesBiggestHeight) ||
        (biggerPaperDimm > BeforeRotationAllImagesBiggestHeight && smallerPaperDimm > BeforeRotationAllImagesBiggestWidth)) {
        // original size is possible
        // console.log('original size is possible !!');
        this.isFitRequired = false;
      } else {
        // original size is NOT possible
        // console.log('original size is NOT possible !!');
        this.fitValue = true;
        this.isFitRequired = true;
      }

      if (this.fitValue) {
        // do fit
        // console.log('do fit !!');
        let factorIfNotRotater;
        let factorIfRotater;
        if (BeforeRotationImageWidth / this.currentPaperWidth > BeforeRotationImageHeight / this.currentPaperHeight) {
          factorIfNotRotater = BeforeRotationImageWidth / this.currentPaperWidth;
          // console.log("factorIfNotRotater 01", factorIfNotRotater);
        } else {
          factorIfNotRotater = BeforeRotationImageHeight / this.currentPaperHeight;
          // console.log("factorIfNotRotater 02", factorIfNotRotater);
        }
        if (BeforeRotationImageWidth / this.currentPaperHeight > BeforeRotationImageHeight / this.currentPaperWidth) {
          factorIfRotater = BeforeRotationImageWidth / this.currentPaperHeight;
          // console.log("factorIfRotater 03", factorIfRotater);
        } else {
          factorIfRotater = BeforeRotationImageHeight / this.currentPaperWidth;
          // console.log("factorIfRotater 04", factorIfRotater);
        }

        if (factorIfRotater < factorIfNotRotater) {
          // do rotate
          // console.log('do rotate !!');
          this.isCurrentrotated = true;
          const AfretRotationImageWidth = BeforeRotationImageHeight;
          const AfretRotationImageHeight = BeforeRotationImageWidth;
          if (this.currentPaperWidth / AfretRotationImageWidth < this.currentPaperHeight / AfretRotationImageHeight) {
            // fit to width
            // console.log('fit to width !!');
            this.scaleImageFactor = this.currentPaperWidth / AfretRotationImageWidth;
            this.currentImageHeight = AfretRotationImageHeight * this.scaleImageFactor;
            this.currentImageWidth = AfretRotationImageWidth * this.scaleImageFactor;
          } else {
            // fit to height
            // console.log('fit to height !!');
            this.scaleImageFactor = this.currentPaperHeight / AfretRotationImageHeight;
            this.currentImageHeight = AfretRotationImageHeight * this.scaleImageFactor;
            this.currentImageWidth = AfretRotationImageWidth * this.scaleImageFactor;
          }
        } else {
          // dont rotate
          // console.log('dont rotate !!');
          this.isCurrentrotated = false;
          const AfretRotationImageWidth = BeforeRotationImageWidth;
          const AfretRotationImageHeight = BeforeRotationImageHeight;
          if (this.currentPaperWidth / AfretRotationImageWidth < this.currentPaperHeight / AfretRotationImageHeight) {
            // fit to width
            // console.log('fit to width !!');
            this.scaleImageFactor = this.currentPaperWidth / AfretRotationImageWidth;
            this.currentImageHeight = AfretRotationImageHeight * this.scaleImageFactor;
            this.currentImageWidth = AfretRotationImageWidth * this.scaleImageFactor;
          } else {
            // fit to height
            // console.log('fit to height !!');
            this.scaleImageFactor = this.currentPaperHeight / AfretRotationImageHeight;
            this.currentImageHeight = AfretRotationImageHeight * this.scaleImageFactor;
            this.currentImageWidth = AfretRotationImageWidth * this.scaleImageFactor;
          }
        }
      } else {
        // dont fit
        // console.log('dont fit !!');
        this.scaleImageFactor = 1;
        // fit in original size and orientation?
        if (this.currentPaperWidth > BeforeRotationImageWidth && this.currentPaperHeight > BeforeRotationImageHeight) {
          // do fit in original size and orientation
          // console.log('do fit in original size and orientation');
          this.isCurrentrotated = false;
          this.currentImageHeight = BeforeRotationImageHeight;
          this.currentImageWidth = BeforeRotationImageWidth;
        } else {
          // doesnt fit in original size and orientation
          // console.log('doesnt fit in original size and orientation');
          this.isCurrentrotated = true;
          this.currentImageHeight = BeforeRotationImageWidth;
          this.currentImageWidth = BeforeRotationImageHeight;
        }
      }

      // Calc dimantion of maximal preview size
      if (this.realBranch.express.properties.enable_crop && this.cropRatioValue) {
        this.currentImageHeight = this.currentPaperHeight
        this.currentImageWidth = this.currentPaperWidth
      }

      // Calc dimantion of maximal preview size
      if (this.previewContainerHeight / this.previewContainerWidth > this.currentPaperHeight / this.currentPaperWidth) {
        // fit to width
        this.factor = this.previewContainerWidth / this.currentPaperWidth;
        this.previewPaperWidth = this.previewContainerWidth;
        this.previewPaperHeight = this.currentPaperHeight * this.factor;
        this.previewImageWidth = this.currentImageWidth * this.factor;
        this.previewImageHeight = this.currentImageHeight * this.factor;
      } else {
        // fit to height
        this.factor = this.previewContainerHeight / this.currentPaperHeight;
        this.previewPaperWidth = this.currentPaperWidth * this.factor;
        this.previewPaperHeight = this.previewContainerHeight;
        this.previewImageWidth = this.currentImageWidth * this.factor;
        this.previewImageHeight = this.currentImageHeight * this.factor;
      }

      // centered?
      // this.isCurrentCenter = true;

      // B and W?
      // if (this.bwValue) {
      //   this.isCurrentBandW = true;
      // } else {
      //   this.isCurrentBandW = false;
      // }

    } else {
      this.clearPreviewData();
    }
    this.isLoadingPreview = false;

    // Update paper dimensions
    previewPaper.style.width = `${this.previewPaperWidth}px`;
    previewPaper.style.height = `${this.previewPaperHeight}px`;

    // Update img dimensions
    if (this.isCurrentrotated) {
      previewImageContainer.style.width = `${this.previewImageHeight}px`;
      previewImageContainer.style.height = `${this.previewImageWidth}px`;
    } else {
      previewImageContainer.style.width = `${this.previewImageWidth}px`;
      previewImageContainer.style.height = `${this.previewImageHeight}px`;
    }

    upperDim1.style.width = `${(this.previewPaperWidth - this.previewImageWidth) / 2}px`;
    upperDim2.style.width = `${this.previewImageWidth}px`;
    upperDim3.style.width = `${(this.previewPaperWidth - this.previewImageWidth) / 2}px`;

    if (siderDim1 !== null && siderDim2 !== null && siderDim3 !== null) {
      siderDim1.style.height = `${(this.previewPaperHeight - this.previewImageHeight) / 2}px`;
      siderDim2.style.height = `${this.previewImageHeight}px`;
      siderDim3.style.height = `${(this.previewPaperHeight - this.previewImageHeight) / 2}px`;
    }

    // price calculation
    this.sortedFilesArray = [];
    this.totalOrderPrice = 0;
    this.totalOrderPriceBeforeDiscount = 0;
    this.totalOrderPriceToBeforeUpdate = 0;
    this.totalOrderPriceBeforeDiscountToBeforeUpdate = 0;
    // this.imagePrintSettings$.next(this.currentPrintSettings);
    this.calcTotalOrderPrice();
  }

  // [general]
  getUserName() {
    return localStorage.getItem('userName');
  }

  // [plotter + express]
  onChooseImage(file: any, image: any, imageIndex: number) {
    this.isLoadingPreview = true;
    this.isChosen = true;
    this.currentFile = file;
    this.currentImage = image;
    this.currentImageIndex = imageIndex;
    console.log('onChooseImageonChooseImage', this.currentFile, this.currentImage, this.currentImageIndex);
    if (this.printingService === "plotter") {
      // [plotter]
      this.updatePreview();
    } else if (this.printingService === "express") {
      // [express]
      if (!this.currentPrintSettings) {
        this.currentPrintSettings = {};
      }
      if (!this.numOfCopies) {
        this.numOfCopies = 1;
      }
      this.updatePreviewExpress();
    }
    this.isLoadingPreview = false;

    if (!this.lastFileId || this.lastFileId === '' || file._id !== this.lastFileId) {
      let element = document.getElementById('zx-settings-area-inner');
      if (element && this.currentImage && this.currentFile) {
        setTimeout(() => {
          if (element) element.scrollTop = 0;
        }, 0);
      }
      this.lastFileId = file._id
    }

    setTimeout(() => {
      this.startOrStopAnimateNoPaper();
    }, 0);
  }

  // [plotter + express]
  getOriginalHeight(): string {
    if (this.printingService === "plotter") {
      if (this.currentImage && this.currentImage.origImageHeight) {
        return (Math.ceil((this.currentImage.origImageHeight / this.currentImage.origImageDPI) * 2.54 * 100) / 100).toFixed(2);
      }
    } else if (this.printingService === "express") {
      if (this.currentImage && this.currentImage.imageHeight) {
        return (Math.ceil((this.currentImage.imageHeight / this.currentImage.origImageDPI) * 2.54 * 100) / 100).toFixed(2);
      }
    }
    return '-';
  }

  // [plotter + express]
  getOriginalWidth(): string {
    if (this.printingService === "plotter") {
      if (this.currentImage && this.currentImage.origImageWidth) {
        return (Math.ceil((this.currentImage.origImageWidth / this.currentImage.origImageDPI) * 2.54 * 100) / 100).toFixed(2);
      }
    } else if (this.printingService === "express") {
      if (this.currentImage && this.currentImage.imageWidth) {
        return (Math.ceil((this.currentImage.imageWidth / this.currentImage.origImageDPI) * 2.54 * 100) / 100).toFixed(2);
      }
    }
    return '-';
  }

  // [plotter + express]
  getActualHeight(): string {
    if (this.currentImage && this.currentImage.imageHeight) {
      if (this.printingService === "plotter") {
        return (Math.ceil((this.currentImage.imageHeight / this.currentImage.origImageDPI) * 2.54 * 100) / 100).toFixed(2);
      } else if (this.printingService === "express") {
        return (Math.ceil((this.currentImage.imageHeight * this.scaleImageFactor / this.currentImage.origImageDPI) * 2.54 * 100) / 100).toFixed(2);
      }
    }
    return '-';
  }

  // [plotter + express]
  getActualWidth(): string {
    if (this.currentImage && this.currentImage.imageWidth) {
      if (this.printingService === "plotter") {
        return (Math.ceil((this.currentImage.imageWidth / this.currentImage.origImageDPI) * 2.54 * 100) / 100).toFixed(2);
      } else if (this.printingService === "express") {
        return (Math.ceil((this.currentImage.imageWidth * this.scaleImageFactor / this.currentImage.origImageDPI) * 2.54 * 100) / 100).toFixed(2);
      }
    }
    return '-';
  }

  // [plotter]
  onFileSettingsChange(isToClear: boolean = false) {
    this.isLoadingPreview = true;
    this.clearPreviewData();
    if (!isToClear) {
      // settings chainge [normal]
      this.filesService.updateFileSettings(
        this.currentFile._id,
        this.currentImage._id,
        this.currentPrintSettings,
      ).subscribe(
        response => {
          if (this.currentImage._id === response.image._id) {
            this.currentImage = response.image;
          }
          const fileIndex = this.files.findIndex(file => file._id === response.fileId);
          const imageIndex = this.files[fileIndex].images.findIndex(image => image._id === response.image._id);
          this.files[fileIndex].images[imageIndex] = response.image;
          this.updatePreview();
          this.checkIsAllFilesHavePaper();
          this.isLoadingPreview = false;
          this.startOrStopAnimateNoPaper();
        },
        error => {
          console.error('Error updating file settings:', error);
          this.isLoadingPreview = false;
        }
      );
    } else {
      // clear settings
      this.filesService.updateFileSettings(
        this.currentFile._id,
        this.currentImage._id,
        {},
      ).subscribe(
        response => {
          this.isLoadingPreview = false;
        },
        error => {
          console.error('Error updating file settings:', error);
          this.isLoadingPreview = false;
        }
      );
    }
  }

  // [express]
  onFileSettingsChangeExpress(isToClear: boolean = false) {

    // find paper by this.currentPaperType
    const paper = this.printServicePapers.find(paper => paper.paperName === this.currentPrintSettings.paperType);
    if (paper && paper.disable_double_anyway) {
      this.currentPrintSettings.doubleSided = false;
    }

    return new Promise((resolve, reject) => {
      console.log('---===onFileSettingsChangeExpress===---');
      this.isLoadingPreview = true;
      this.clearPreviewData();
      if (!isToClear) {
        console.log('---===NOT is ToClear===---');
        // settings chainge [normal]
        this.filesService.updateFileSettingsExpress(
          this.currentFile._id,
          this.currentPrintSettings,
          this.realBranch.express._id,
        ).subscribe(
          response => {
            if (response.file) {
              console.log('---===response.file===---', response.file);
              if (this.currentFile._id === response.fileId) {
                this.currentFile = response.file;
                // find file in this.files
                const fileIndex = this.files.findIndex(file => file._id === response.fileId);
                this.files[fileIndex] = response.file;
              }
              this.updatePreviewExpress();
              this.checkIsAllFilesHavePaper();
              this.imagePrintSettings$.next(this.currentPrintSettings);
              this.isLoadingPreview = false;
              this.startOrStopAnimateNoPaper();
            }
            resolve(true);
          },
          error => {
            console.error('Error updating file settings:', error);
            this.isLoadingPreview = false;
            reject();
          }
        );
      } else {
        // console.log('---===DO is ToClear===---');
        // clear all files settings
        this.filesService.clearFileSettingsExpress(
          localStorage.getItem('userId'),
        ).subscribe(
          response => {
            if (response && response.updatedFiles) {
              // console.log('---===response.updatedFiles===---', response.updatedFiles);
              this.files = response.updatedFiles;
              if (this.files.length === 0) {
                this.resetValues();
              } else {
                this.files.forEach((file, idx) => {
                  if (file.images.length !== 0) {
                    file.printSettings = {};
                  }
                });
                this.paperCodes = this.realBranch.express.consumables.papers.map(paper => paper.paperPrinterCode);
                this.paperNames = this.realBranch.express.consumables.papers.map(paper => paper.paperType);
                if (!this.isChosen) {
                  this.onChooseImage(this.files[0], this.files[0].images[0], 0);
                }
              }
            }
            resolve(true);
            this.isLoadingPreview = false;
          },
          error => {
            console.error('Error clear files settings:', error);
            reject();
            this.isLoadingPreview = false;
          }
        );
      }
    });
  }

  // [plotter + express]
  onFileSettingsChangeBySystem() {
    if (this.printingService === 'plotter') {
      this.onFileSettingsChange();
    } else if (this.printingService === 'express') {
      this.onFileSettingsChangeExpress();
    }
  }

  // [plotter + express]
  clearPreviewData() {
    // console.log('---===clearPreviewData===---');
    this.currentPaperHeight = 0;
    this.previewImageContainerWidth = 0;
    this.previewImageContainerHeight = 0;
    this.previewImageWidth = 0;
    this.previewImageHeight = 0;
    this.previewPaperWidth = 0;
    this.previewPaperHeight = 0;
    // this.isCurrentCenter = false;
    this.currentPaperMargin = 0;
    this.previewPaperMargin = 0;
    this.factor = 0;
    // this.isCurrentBandW = false;
    this.selectedPaper = null;
    this.isAllFilesHavePaper = false;
    this.resizedInagePrintSettings = null;
    this.isFitRequired = false;
    this.scaleImageFactor = 1;
  }

  // [plotter + express]
  clearPreviewDataDeep() {
    console.log('---===clearPreviewData **Deep** ===---');
    this.currentFile = null;
    this.currentImage = null;
    this.currentImageIndex = null;
    this.isChosen = false;
  }

  // [plotter + express]
  resetValues() {
    console.log('---===resetValues===---');
    this.files = [];
    this.proccessingFiles = [];
    this.paperCodes = [];
    this.paperNames = [];
    this.currentFile = null;
    this.currentImage = null;
    this.currentImageIndex = null;
    this.isChosen = false;
  }

  // [general]
  roundDownTowDecimal(num: number): number {
    return Math.floor(num * 100) / 100;
  }

  // [general]
  roundDownOneDecimal(num: number): number {
    return Math.ceil(num * 1000) / 10;
  }

  // paper HTML tooltips
  overlayRef: OverlayRef | null;

  // paper HTML tooltips - in printing settings
  showPaperTooltip(trigger: HTMLElement) {
    const positionStrategy = this.overlay.position()
      .flexibleConnectedTo(trigger)
      .withPositions([
        {
          originX: this.isRTL ? 'end' : 'start',
          originY: 'center',
          overlayX: this.isRTL ? 'start' : 'end',
          overlayY: 'center',
        }
      ]);
    this.overlayRef = this.overlay.create({ positionStrategy });
    const tooltipPortal = new ComponentPortal(TooltipContentComponent);
    const tooltipRef = this.overlayRef.attach(tooltipPortal);
    tooltipRef.instance.printingService = this.printingService;
    tooltipRef.instance.inputBins = this.realBranch.plotter?.printers[0].inputBins ? this.realBranch.plotter.printers[0].inputBins : [];
    tooltipRef.instance.printServicePapers = this.printServicePapers;
  }

  hidePaperTooltip() {
    this.overlayRef?.detach();
    this.overlayRef = null;
  }

  // paper HTML tooltips - in desktop choose paper
  showPaperTooltipDesktop(trigger: HTMLElement) {
    const positionStrategy = this.overlay.position()
      .flexibleConnectedTo(trigger)
      .withPositions([
        {
          originX: this.isRTL ? 'start' : 'end',
          originY: 'center',
          overlayX: this.isRTL ? 'end' : 'start',
          overlayY: 'center',
        }
      ]);
    this.overlayRef = this.overlay.create({ positionStrategy });
    const tooltipPortal = new ComponentPortal(TooltipContentComponent);
    const tooltipRef = this.overlayRef.attach(tooltipPortal);
    tooltipRef.instance.printingService = this.printingService;
    tooltipRef.instance.inputBins = this.realBranch.plotter?.printers[0].inputBins ? this.realBranch.plotter.printers[0].inputBins : [];
    tooltipRef.instance.printServicePapers = this.printServicePapers;
  }

  hidePaperTooltipDesktop() {
    this.overlayRef?.detach();
    this.overlayRef = null;
  }

  // Sided Not Avaible Tooltip
  getSidedNotAvaibleTooltipText() {
    if (this.currentPaperType && this.selectedPaper) {
      if (this.currentFile?.images.length === 1) {
        return 'printing-table.explain-sided-not-avaible-one-page';
      } else if (this.isDubbleDisabledByInkLevel(this.currentFile)) {
        return 'printing-table.explain-sided-not-avaible-ink-level';
      } else if (this.isDubbleDisabledByPaper(this.selectedPaper)) {
        return 'printing-table.explain-sided-not-avaible-paper-with-no-dubble';
      } else {
        return '';
      }
    }
    return '';
  }

  isDubbleDisabledByInkLevel(file: any) {
    if (this.printingService === 'express' && file && file.images && file.images.length > 0) {
      let maxInkLevel = 0;
      for (let image of file.images) {
        if (image.inkLevel && image.inkLevel > maxInkLevel) {
          maxInkLevel = image.inkLevel;
        }
      }
      if (maxInkLevel > this.maxInkLevelDubble) {
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }

  isDubbleDisabledByPaper(paper: any) {
    if (paper && paper.disable_double_anyway) {
      return true;
    } else {
      return false;
    }
  }

  // Maximal Not Avaible Tooltip
  getMaximalNotAvaibleTooltipText() {
    if (this.currentPaperType && this.selectedPaper && this.isFitRequired) {
      return 'printing-table.explain-original-not-avaible';
    }
    return '';
  }

  // [plotter + express]
  openPreviewDialog() {
    if (this.currentPrintSettings && this.currentPaperType && this.realBranch && this.currentFile && this.printingService) {
      if (!this.isLoadingPreview) {
        this.openPreviewDialogInner();
      } else {
        setTimeout(() => {
          if (this.currentPrintSettings && this.currentPaperType && this.realBranch && this.currentFile && this.printingService && !this.isLoadingPreview) {
            this.openPreviewDialogInner();
          } else {
            this.animatePaperStrong();
          }
        }, 500);
      }
    } else {
      this.animatePaperStrong();
    }
  }

  openPreviewDialogInner() {
    this.dialogService.onOpenImagePreviewDialog(
      this.printingService,
      this.currentFile,
      this.currentImage,
      this.realBranch,
      this.selectedPaper,
      this.cropRatioValue,
    );
  }

  // [plotter + express]
  async onDeleteFileOrImage(
    currentFile: any,
    currentFileIndex: number,
    currentImage: any,
    imageIndex: number,
    forceDeleteFile: boolean = false,
    proccessingFile: boolean = false,
  ) {
    this.isLoading = true;
    if (!proccessingFile) {
      this.onChooseImage(currentFile, currentImage, imageIndex);
    }
    try {
      // check if delete file or image
      if (this.printingService === "plotter") {
        // [plotter]
        if (currentFile.images.length === 1 || forceDeleteFile) {
          // delete file [plotter]
          await this.filesService.deleteFile(currentFile, this.serverAddress).toPromise()
          const userId = localStorage.getItem('userId');
          // remove file from files
          this.files = this.files.filter(file => file._id !== currentFile._id);
          // remove file from proccessingFiles
          this.proccessingFiles = this.proccessingFiles.filter(file => file._id !== currentFile._id);
          // // update [plotter]
        } else {
          // delete image [plotter]
          await this.filesService.deleteImage(currentFile, currentImage, this.serverAddress).toPromise()
          // remove image from this.files
          this.files[currentFileIndex].images = this.files[currentFileIndex].images.filter(image => image._id !== currentImage._id);
          // remove image from this.currentFile
          this.currentFile.images = this.currentFile.images.filter(image => image._id !== currentImage._id);
          // // update [plotter]
        }
      } else if (this.printingService === "express") {
        // [express]
        if (currentFile.images?.length === 1 || forceDeleteFile || proccessingFile) {
          // delete file [express] *******************************
          await this.filesService.deleteFileExpress(currentFile, this.serverAddress).toPromise()
          // remove file from files
          this.files = this.files.filter(file => file._id !== currentFile._id);
          // remove file from proccessingFiles
          this.proccessingFiles = this.proccessingFiles.filter(file => file._id !== currentFile._id);
          // // update [express]totalOrderPrice && totalOrderPriceBeforeDiscount
        } else {
          // delete image [express] *******************************
          await this.filesService.deleteImageExpress(currentFile, currentImage, this.serverAddress).toPromise()
          // remove image from this.files
          this.files[currentFileIndex].images = this.files[currentFileIndex].images.filter(image => image._id !== currentImage._id);
          // remove image from this.currentFile
          this.currentFile.images = this.currentFile.images.filter(image => image._id !== currentImage._id);
        }
      }
      // handle plotter/express changes
      if (this.files.length === 0) {
        this.resetValues();
      } else {
        this.proccessingFiles = [];
        let FirstFileIndexWithImages = 0;
        let isFileFound = false;
        this.files.forEach((file, idx) => {
          if (!file.images || file.images?.length === 0) {
            this.proccessingFiles.push(file);
          }
          let chechedFileIndex = currentFileIndex + idx;
          if (chechedFileIndex > this.files.length - 1) {
            chechedFileIndex = this.files.length - chechedFileIndex;
          }
          if (!isFileFound && this.files[chechedFileIndex].images && this.files[chechedFileIndex].images.length > 0) {
            FirstFileIndexWithImages = chechedFileIndex;
            isFileFound = true;
          }
        });
        // // is file found
        if (this.proccessingFiles.length !== this.files.length && isFileFound) {
          this.onChooseImage(this.files[FirstFileIndexWithImages], this.files[FirstFileIndexWithImages].images[0], 0);
        }
        if (this.proccessingFiles.length === this.files.length) {
          this.clearPreviewData();
          this.clearPreviewDataDeep();
        }
      }
      this.checkIsAllFilesHavePaper();
      this.isLoading = false;
    } catch (error) {
      console.error('Error deleting file or image:', error);
      this.isLoading = false;
    }
  }

  async onDeleteAllFiles() {
    this.isLoading = true;
    try {
      if (this.printingService === "plotter") {
        // [plotter]
        await this.filesService.deleteAllFiles(this.user._id, this.serverAddress).toPromise();
        this.files = [];
        this.resetValues();
      } else if (this.printingService === "express") {
        // [express]
        await this.filesService.deleteAllFilesExpress(this.user._id, this.serverAddress).toPromise();
        this.files = [];
        this.resetValues();
      }
      this.isLoading = false;
    } catch (error) {
      console.error('Error deleting all files:', error);
      this.isLoading = false;
    }
  }

  // [plotter + express]
  onApplyToAll(currentPaperWidth: number, printSettings: any, paper: any) {
    if (this.printingService === "plotter") {
      // [plotter]
      let biggestDimPx = 0;
      let dpi = 0;
      if (this.files.length > 0) {
        for (let file of this.files) {
          for (let image of file.images) {
            let smallestDim = Math.min(image.imageHeight, image.imageWidth);
            dpi = image.origImageDPI;
            biggestDimPx = Math.max(biggestDimPx, smallestDim);
          }
        }
      }
      let biggestDim = (biggestDimPx / dpi) * 2.54;
      if (biggestDim <= currentPaperWidth) {
        console.log('can apply properties to all files!');
        this.filesService.applyToAll(
          this.realBranch.plotter.printers[0]._id,
          this.currentPrintSettings
        ).subscribe(
          response => {
            this.files = response.updatedFiles;
            this.updatePreview();
            this.checkIsAllFilesHavePaper()
            this.isLoadingPreview = false;
            this.dialogService.onOpenApplyToAllDialog(
              this.printingService,
              true,
              this.currentPrintSettings,
              this.currentPaperWidth,
              this.currentFile,
              this.currentImageIndex,
              this.selectedPaper.paperType.paperType,
            );
          },
          error => {
            console.error('Error updating file settings:', error);
            this.isLoadingPreview = false;
          }
        );
      } else {
        console.log('can NOT apply properties to all files!');
        this.dialogService.onOpenApplyToAllDialog(
          this.printingService,
          false,
          this.currentPrintSettings,
          this.currentPaperWidth,
          this.currentFile,
          this.currentImageIndex,
          this.selectedPaper.paperType.paperType,
        );
      }
    } else if (this.printingService === "express") {
      // [express]
      // is Max Ink Level Disableing choosing paper?
      for (let file of this.files) {
        if (file.images && file.images.length > 0 && this.isMaxInkLevelDisableingFile(this.selectedPaper, file)) {
          this.maxInkLevelDisableSnackBar(true);
          return;
        }
      };

      // Calculate biddest dims of all images
      if (!this.fitValue) {
        this.isOriginalPossible = true

        // not fit
        // console.log('not fit !!');
        let maxImageWidth = 0;
        let maxImageHeight = 0;

        this.files.forEach(file => {
          file.images.forEach(image => {
            maxImageWidth = Math.max(maxImageWidth, (image.imageWidth / image.origImageDPI) * 2.54);
            maxImageHeight = Math.max(maxImageHeight, (image.imageHeight / image.origImageDPI) * 2.54);
          });
        });

        const biggerPaperDimm = Math.max(this.currentPaperWidth, this.currentPaperHeight);
        const smallerPaperDimm = Math.min(this.currentPaperWidth, this.currentPaperHeight);

        // check if original size is possible
        if ((biggerPaperDimm > maxImageWidth && smallerPaperDimm > maxImageHeight) ||
          (biggerPaperDimm > maxImageHeight && smallerPaperDimm > maxImageWidth)) {
          // original size is possible
          // console.log('original size is possible !!');
        } else {
          // original size is NOT possible
          // console.log('original size is NOT possible !!');
          if (!this.fitValue) {
            this.isOriginalPossible = false
          }
          this.fitValue = true;
        }
      } else {
        // do fit
        // console.log('do fit !!');
      }

      if (!this.realBranch.express?.properties?.enable_crop) {
        this.currentPrintSettings.cropRatio = false;
      }

      this.filesService.applyToAllExpress(
        this.currentPrintSettings,
        this.realBranch.express._id,
      ).subscribe(
        response => {
          if (response && response.updatedFiles) {
            const updatedFiles = response.updatedFiles;
            this.files = updatedFiles;
            this.updatePreviewExpress();
            this.checkIsAllFilesHavePaper()
            this.isLoadingPreview = false;
            this.dialogService.onOpenApplyToAllDialog(
              this.printingService,
              this.isOriginalPossible,
              this.currentPrintSettings,
              this.currentPaperWidth,
              this.currentFile,
              this.currentImageIndex,
              this.selectedPaper.serial_name,
            );
          }
        },
        error => {
          console.error('Error updating file settings:', error);
          this.isLoadingPreview = false;
        }
      );
    }
  }

  // next image with no paper + auto scroller -------------------------------------------------

  ngAfterViewChecked() {
    if (this.isScrollNeeded) {
      this.scrollToNextImage();
      this.isScrollNeeded = false;
    }
    if (this.totalOrderPrice !== this.totalOrderPriceToBeforeUpdate && this.printingService === "express") {
      this.totalOrderPrice = this.totalOrderPriceToBeforeUpdate;
      this.cdr.detectChanges();
    }
    if (this.totalOrderPriceBeforeDiscount !== this.totalOrderPriceBeforeDiscountToBeforeUpdate && this.printingService === "express") {
      this.totalOrderPriceBeforeDiscount = this.totalOrderPriceBeforeDiscountToBeforeUpdate;
      this.cdr.detectChanges();
    }
  }

  // [plotter + express]
  nextImageToSetPaper(): void {
    this.isAllFilesHavePaper = true;
    if (this.printingService === "plotter") {
      // [plotter]
      for (let i = 0; i < this.files.length; i++) {
        const file = this.files[i];
        for (let j = 0; j < file.images.length; j++) {
          const image = file.images[j];
          if (!image.printSettings || !image.printSettings.paperType) {
            this.onChooseImage(file, image, j);
            this.isAllFilesHavePaper = false;
            this.cdr.detectChanges();
            this.isScrollNeeded = true;
            return;
          }
        }
      }
    } else if (this.printingService === "express") {
      // [express]
      for (let i = 0; i < this.files.length; i++) {
        const file = this.files[i];
        if ((!file.printSettings || !file.printSettings?.paperType) &&
          file.images?.length > 0) {
          this.isAllFilesHavePaper = false;
          this.onChooseImage(file, file.images[0], 0);
          this.isScrollNeeded = true;
          return;
        }
      }
    }
  }

  scrollToNextImage() {
    setTimeout(() => {
      let elements: QueryList<ElementRef>;
      if (this.printingService === 'plotter') {
        elements = this.fileElements;
      } else if (this.printingService === 'express') {
        elements = this.fileExpressElements;
      }
      if (elements && elements.length > 0) {
        const targetFileIndex = this.files.findIndex(file => file._id === this.currentFile._id);
        if (targetFileIndex !== -1) {
          this.currentFileIndex = targetFileIndex;
        }
        elements.toArray()[this.currentFileIndex].nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const images = this.files[this.currentFileIndex].images;
      }

      // Scroll the page to the top after a delay
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 1000); // adjust the delay as needed
    }, 0);
  }

  // [plotter + express]
  checkIsAllFilesHavePaper() {
    let FinishedFiles = this.files.filter(file => file.images.length > 0);
    if (this.printingService === "plotter") {
      this.isAllFilesHavePaper = FinishedFiles.every(file =>
        file.images.every(image =>
          image.printSettings?.paperType ?? false
        )
      );
    } else if (this.printingService === "express") {
      this.isAllFilesHavePaper = FinishedFiles.every(file =>
        file.printSettings?.paperType ?? false
      );
    }

    setTimeout(() => {
      if (!this.isOpeningCompMainBtn &&
        ((this.isAllFilesHavePaper && !this.lastIsAllFilesHavePaper) ||
          (!this.isAllFilesHavePaper && this.lastIsAllFilesHavePaper && !this.currentPaperType))) {
        if (this.isAllFilesHavePaper) {
          this.lastIsAllFilesHavePaper = true;
        } else {
          this.lastIsAllFilesHavePaper = false;
        }
        this.stopAnimateMainBtn();
        setTimeout(() => {
          this.animateMainBtn();
        }, 0);
      }

      if (this.isOpeningCompMainBtn && this.currentPaperType) {
        this.isOpeningCompMainBtn = false;
        setTimeout(() => {
          this.animateMainBtn();
        }, 0);
      }
    }, 0);
  }

  // more properties -------------------------------------------------


  // [express + plotter] - printSettings

  get currentPrintSettings() {
    if (this.printingService === "plotter") {
      return this.currentImage?.printSettings ? this.currentImage.printSettings : {};
    } else if (this.printingService === "express") {
      return this.currentFile?.printSettings ? this.currentFile.printSettings : {};
    }
  }

  set currentPrintSettings(value) {
    if (this.printingService === "plotter") {
      this.currentImage.printSettings = value;
    } else if (this.printingService === "express") {
      this.currentFile.printSettings = value;
    }
  }

  // [express] - doubleSidedValue
  get doubleSidedValue() {
    return this.currentPrintSettings?.doubleSided;
  }

  set doubleSidedValue(value) {
    this.currentPrintSettings.doubleSided = value;
  }

  // [express + plotter] - paperType
  get currentPaperType() {
    return this.currentPrintSettings?.paperType;
  }

  set currentPaperType(value) {
    this.currentPrintSettings.paperType = value;
  }

  // [express] - fitValue
  get fitValue() {
    return this.currentPrintSettings?.fit;
  }

  set fitValue(value) {
    this.currentPrintSettings.fit = value;
  }

  // [express] - cropRatioValue ("fully cover")
  get cropRatioValue() {
    return this.currentPrintSettings?.cropRatio;
  }

  set cropRatioValue(value) {
    this.currentPrintSettings.cropRatio = value;
  }

  // [plotter + express] - bwValue
  get bwValue() {
    return this.currentPrintSettings?.bw;
  }

  set bwValue(value) {
    this.currentPrintSettings.bw = value;
  }

  // [plotter + express] - numOfCopies
  get numOfCopies() {
    return this.currentPrintSettings?.numOfCopies;
  }

  set numOfCopies(value) {
    this.currentPrintSettings.numOfCopies = value;
  }

  changeNumberOfCopies(type: string) {
    const originalNumOfCopies = this.numOfCopies;
    if (type === 'add') {
      this.numOfCopies++;
    } else if (type === 'remove' && this.numOfCopies > 1) {
      this.numOfCopies--;
    }
    if (originalNumOfCopies !== this.numOfCopies) {
      this.onFileSettingsChangeBySystem()
    }
  }

  // [plotter] - centerValue
  get centerValue() {
    return this.currentPrintSettings?.centered;
  }

  set centerValue(value) {
    this.currentPrintSettings.centered = value;
  }

  // [plotter] - cmFromTopValue
  get cmFromTopValue() {
    return this.currentPrintSettings?.cmFromTop;
  }

  set cmFromTopValue(value) {
    this.currentPrintSettings.cmFromTop = value;
  }

  // [plotter + express]
  sendToPrint(): void {
    console.log('sendToPrint > open dialog to to aprove these files: ', this.files);
    this.openOrderSummaryDialog();
  }

  // [plotter + express]
  openOrderSummaryDialog() {
    console.log('BRANCH: ', this.realBranch);
    this.stopAnimateMainBtn();

    if (this.printingService === "plotter") {
      // Order Summary - [plotter]
      if (this.files && this.files.length > 0) {

        // get files and remove proccessing files
        const orderFilesBeforeClean = [...this.files];
        let orderFiles = [];

        orderFilesBeforeClean.forEach(file => {
          if (file.images.length > 0) {
            orderFiles.push(file);
          }
        });

        let orderFilesData = [];

        for (let i = 0; i < orderFiles.length; i++) {
          const file = orderFiles[i];
          if (file.images.length > 0) {
            const fileData = {
              name: file.fileName,
              fileId: file._id,
              images: [],
            };
            for (let j = 0; j < file.images.length; j++) {
              const image = file.images[j];
              const paperSerialName = this.printServicePapers.find(paper => paper.paperType.paperPrinterCode === image.printSettings.paperType).paperType.paperType;
              const resizeFactor = this.roundDownTowDecimal((image.imageHeight / image.origImageHeight) * 100);
              const iamgeData = {
                settings: image.printSettings,
                paperSerialName: paperSerialName,
                width: image.imageWidth,
                height: image.imageHeight,
                resizeFactor: resizeFactor,
                price: image.price,
                path: this.serverAddress + '/uploads/' + this.getUserName() + '/' + image.thumbnailPath.split('/').pop(),
              };
              fileData.images.push(iamgeData);
            }
            orderFilesData.push(fileData);
          }
        }
        // open dialog
        const present = this.user.discount ? 100 - this.user.discount : 100;
        console.log('totalOrderPriceBeforeDiscount: ', this.totalOrderPrice, this.totalOrderPrice * (present / 100));
        const totalOrderPriceAfterDiscount = this.totalOrderPrice * (present / 100);
        this.dialogService.onOpenOrderSummaryDialog(
          this.printingService,
          this.serverAddress,
          this.printServicePapers,
          orderFilesData,
          this.branch,
          {
            totalOrderPriceBeforeDiscount: this.totalOrderPriceBeforeDiscount,
            totalOrderPrice: totalOrderPriceAfterDiscount,
            points: this.user.points ? this.user.points : 0,
          },
          this.user,
          false,
          this.isManiger(),
          this.realBranch.plotter.unique,
        );
      }

    } else if (this.printingService === "express") {
      // Order Summary - [express]
      if (this.files && this.files.length > 0) {

        // get files and remove proccessing files
        const orderFilesBeforeClean = [...this.files];
        let orderFiles = [];

        orderFilesBeforeClean.forEach(file => {
          if (file.images.length > 0) {
            orderFiles.push(file);
          }
        });

        let orderFilesData = [];
        // console.log('orderFiles $$$: ', orderFiles);
        // file
        for (let i = 0; i < orderFiles.length; i++) {
          const file = orderFiles[i];
          // remove proccessing files
          if (file.images.length === 0) {
            return;
          }

          if (this.realBranch.express.properties.enable_crop) {
            if (!file.printSettings.cropRatio) {
              file.printSettings.fit = true;
            }
          } else {
            file.printSettings.cropRatio = false;
          }

          const paperSerialName = this.printServicePapers.find(paper => paper.paperName === file.printSettings.paperType).serial_name;
          const fileData = {
            _id: file._id,
            name: file.fileName,
            fileId: file._id,
            settings: file.printSettings,
            paperSerialName: paperSerialName,
            images: [],
            price: {
              pricePerPage: this.getImagePrice(file.printSettings, this.realBranch.express.pricing.prices_x),
              pages: file.images.length,
              copies: file.printSettings.numOfCopies,
            }
          };

          // Get paper width
          let paperType = this.printServicePapers.find(paper => paper.paperName === file.printSettings.paperType).paperType;

          let paperWidth = 0;
          let paperHeight = 0;
          if (paperType === 'A4') {
            paperWidth = 21;
            paperHeight = 29.7;
          } else if (paperType === 'A3') {
            paperWidth = 29.7;
            paperHeight = 42;
          } else if (paperType === 'CY-SM') {
            paperWidth = 10.16;
            paperHeight = 15.24;
          } else if (paperType === 'CY-MD') {
            paperWidth = 12.7;
            paperHeight = 17.78;
          } else if (paperType === 'CY-LG') {
            paperWidth = 15.24;
            paperHeight = 20.32;
          }

          // image
          for (let j = 0; j < file.images.length; j++) {
            // if DO fit
            let scaleImageFactor = 1;
            let imageHeight;
            let imageWidth;

            // Calculate if needs to rotate 1
            let BeforeRotationImageWidth = (file.images[j].imageWidth / file.images[j].origImageDPI) * 2.54;
            let BeforeRotationImageHeight = (file.images[j].imageHeight / file.images[j].origImageDPI) * 2.54;

            if (file.printSettings.fit) {

              // Calculate biddest dims of all images
              let BeforeRotationAllImagesBiggestWidth = file.images.reduce((max, image) => {
                return Math.max(max, (image.imageWidth / image.origImageDPI) * 2.54);
              }, 0);
              let BeforeRotationAllImagesBiggestHeight = file.images.reduce((max, image) => {
                return Math.max(max, (image.imageHeight / image.origImageDPI) * 2.54);
              }, 0);

              const biggerPaperDimm = Math.max(paperWidth, paperHeight);
              const smallerPaperDimm = Math.min(paperWidth, paperHeight);

              let isFitRequired = false;

              // check if original size is possible
              if ((biggerPaperDimm > BeforeRotationAllImagesBiggestWidth && smallerPaperDimm > BeforeRotationAllImagesBiggestHeight) ||
                (biggerPaperDimm > BeforeRotationAllImagesBiggestHeight && smallerPaperDimm > BeforeRotationAllImagesBiggestWidth)) {
                // original size is possible
                // console.log('original size is possible !!');
                isFitRequired = false;
              } else {
                // original size is NOT possible
                // console.log('original size is NOT possible !!');
                file.printSettings.fit = true;
                file.printSettings.fit = true;
                isFitRequired = true;
              }

              // fit in original size and orientation?
              if (file.printSettings.fit) {
                // do fit
                // console.log('do fit !!');
                let factorIfNotRotater;
                let factorIfRotater;
                // check if original size is possible
                if (BeforeRotationImageWidth / paperWidth > BeforeRotationImageHeight / paperHeight) {
                  factorIfNotRotater = BeforeRotationImageWidth / paperWidth;
                  // console.log("factorIfNotRotater 01", factorIfNotRotater);
                } else {
                  factorIfNotRotater = BeforeRotationImageHeight / paperHeight;
                  // console.log("factorIfNotRotater 02", factorIfNotRotater);
                }
                if (BeforeRotationImageWidth / paperHeight > BeforeRotationImageHeight / paperWidth) {
                  factorIfRotater = BeforeRotationImageWidth / paperHeight;
                  // console.log("factorIfRotater 03", factorIfRotater);
                } else {
                  factorIfRotater = BeforeRotationImageHeight / paperWidth;
                  // console.log("factorIfRotater 04", factorIfRotater);
                }

                if (factorIfRotater < factorIfNotRotater) {
                  // do rotate
                  // console.log('do rotate !!');
                  // --- this.isCurrentrotated = true;
                  const AfretRotationImageWidth = BeforeRotationImageHeight;
                  const AfretRotationImageHeight = BeforeRotationImageWidth;
                  if (paperWidth / AfretRotationImageWidth < paperHeight / AfretRotationImageHeight) {
                    // fit to width
                    // console.log('fit to width !!');
                    scaleImageFactor = paperWidth / AfretRotationImageWidth;
                    imageHeight = AfretRotationImageHeight * scaleImageFactor;
                    imageWidth = AfretRotationImageWidth * scaleImageFactor;
                  } else {
                    // fit to height
                    // console.log('fit to height !!');
                    scaleImageFactor = paperHeight / AfretRotationImageHeight;
                    imageHeight = AfretRotationImageHeight * scaleImageFactor;
                    imageWidth = AfretRotationImageWidth * scaleImageFactor;
                  }
                } else {
                  // dont rotate
                  // console.log('dont rotate !!');
                  // --- this.isCurrentrotated = false;
                  const AfretRotationImageWidth = BeforeRotationImageWidth;
                  const AfretRotationImageHeight = BeforeRotationImageHeight;
                  if (paperWidth / AfretRotationImageWidth < paperHeight / AfretRotationImageHeight) {
                    // fit to width
                    // console.log('fit to width !!');
                    scaleImageFactor = paperWidth / AfretRotationImageWidth;
                    imageHeight = AfretRotationImageHeight * scaleImageFactor;
                    imageWidth = AfretRotationImageWidth * scaleImageFactor;
                  } else {
                    // fit to height
                    // console.log('fit to height !!');
                    scaleImageFactor = paperHeight / AfretRotationImageHeight;
                    imageHeight = AfretRotationImageHeight * scaleImageFactor;
                    imageWidth = AfretRotationImageWidth * scaleImageFactor;
                  }
                }
              }
            } else {
              // dont fit
              console.log('dont fit !!');
              if (paperWidth > BeforeRotationImageWidth && paperHeight > BeforeRotationImageHeight) {
                // do fit in original size and orientation
                // console.log('do fit in original size and orientation');
                // this.isCurrentrotated = false;
                imageHeight = BeforeRotationImageHeight;
                imageWidth = BeforeRotationImageWidth;
              } else {
                // doesnt fit in original size and orientation
                // console.log('doesnt fit in original size and orientation');
                // this.isCurrentrotated = true;
                imageHeight = BeforeRotationImageWidth;
                imageWidth = BeforeRotationImageHeight;
              }
            }

            const image = file.images[j];
            const imageData = {
              index: j,
              width: this.roundDownTowDecimal(imageWidth),
              height: this.roundDownTowDecimal(imageHeight),
              scaleFactor: this.roundDownTowDecimal(scaleImageFactor * 100),
              path: 'https://img-express.eazix.io/uploads/' + this.getUserName() + '/' + image.thumbnailPath.split('/').pop(),
            };
            // console.log('imageData ::::: ', imageData);
            fileData.images.push(imageData);
          }
          // console.log('fileData ::::: ', fileData);
          orderFilesData.push(fileData);
        }
        let code = 0;
        if (this.realBranch.express?.unique && this.realBranch.express?.properties?.code) {
          code = this.printingCode(
            this.realBranch.express.unique,
            this.realBranch.express.properties.code
          )
        }
        // open dialog
        const present = this.user.discount ? 100 - this.user.discount : 100;
        const totalOrderPriceAfterDiscount = this.totalOrderPrice * (present / 100);
        // fix products
        let fixProducts = null;
        let fixProductsData = {};
        if (this.branchHasFixProducts() && this.totalOrderdFixProducts() > 0) {
          fixProducts = this.realBranch.express.fix_products;
          fixProductsData = {
            products: fixProducts,
            totalAmount: this.totalOrderdFixProducts(),
            totalCost: this.totalOrderdFixProductsPrice(),
          };
        }
        this.dialogService.onOpenOrderSummaryDialog(
          this.printingService,
          this.serverAddress,
          this.printServicePapers,
          orderFilesData,
          this.branch,
          {
            totalOrderPriceBeforeDiscount: this.totalOrderPriceBeforeDiscount,
            totalOrderPrice: totalOrderPriceAfterDiscount,
            points: this.user.points ? this.user.points : 0,
          },
          this.user,
          false,
          this.isManiger(),
          this.realBranch.express.unique,
          this.branchID,
          this.realBranch.express._id,
          null,
          code,
          fixProducts ? fixProductsData : null,
        );
      } else if (this.branchHasFixProducts() && this.totalOrderdFixProducts() > 0) {
        // fix products
        let code = 0;
        if (this.realBranch.express?.unique && this.realBranch.express?.properties?.code) {
          code = this.printingCode(
            this.realBranch.express.unique,
            this.realBranch.express.properties.code
          )
        }
        let fixProducts = null;
        let fixProductsData = {};
        if (this.branchHasFixProducts() && this.totalOrderdFixProducts() > 0) {
          fixProducts = this.realBranch.express.fix_products;
          fixProductsData = {
            products: fixProducts,
            totalAmount: this.totalOrderdFixProducts(),
            totalCost: this.totalOrderdFixProductsPrice(),
          };
        }
        this.dialogService.onOpenOrderSummaryDialog(
          this.printingService,
          this.serverAddress,
          this.printServicePapers,
          null,
          this.branch,
          {
            totalOrderPriceBeforeDiscount: this.totalOrderPriceBeforeDiscount,
            totalOrderPrice: this.totalOrderdFixProductsPrice(),
            points: this.user.points ? this.user.points : 0,
          },
          this.user,
          false,
          this.isManiger(),
          this.realBranch.express.unique,
          this.branchID,
          this.realBranch.express._id,
          null,
          code,
          fixProducts ? fixProductsData : null,
        );
      }
    }
  }

  private printingCode(printerNum: number, randomDigits: number) {
    let code = "00000";
    if (printerNum && randomDigits) {
      code =
        printerNum.toString().charAt(0) +
        randomDigits.toString().charAt(0) +
        printerNum.toString().charAt(1) +
        randomDigits.toString().charAt(1) +
        printerNum.toString().charAt(2);
    }
    return parseInt(code);
  }

  // [plotter]
  openResizeDialog(isMustResize: boolean) {
    const imagePath = 'https://' + this.branch + '.eazix.io/uploads/' + this.getUserName() + '/' + this.currentImage.thumbnailPath.split('\\').pop();
    this.dialogService.onOpenResizeDialog(
      this.currentPaperWidth,
      this.currentFile,
      this.currentImageIndex,
      this.selectedPaper.paperType.paperType,
      this.currentImage,
      imagePath,
      isMustResize,
      this.serverAddress,
    );
  }

  // [express]
  getPaperSerialName(file) {
    const paper = this.printServicePapers.find(paper => paper.paperName === file.printSettings.paperType);
    if (!paper) {
      this.clearPreviewData();
      this.clearPreviewDataDeep();
      return '';
    }
    return paper ? paper.serial_name : '';
  }

  // [plotter]
  checkReturnedResizedFile() {
    console.log("NADAV: refresh after resize the file: ", this.currentFile);
  }

  get prices$() {
    if (!this.realBranch) {
      return of([]);
    }

    const prices = this.realBranch.express.pricing.prices_x;
    return of(prices);
  }

  getImagePrice$(imagePrintSettings: any): Observable<number> {
    return this.prices$.pipe(
      map(prices => {
        const imagePrice = this.getImagePrice(imagePrintSettings, prices);
        return imagePrice;
      })
    );
  }

  imagePrice$ = combineLatest([
    this.imagePrintSettings$,
    this.prices$
  ]).pipe(
    map(([imagePrintSettings, prices]) => this.getImagePrice(imagePrintSettings, prices))
  );

  getImagePrice(imagePrintSettings: any, prices: any): number {
    if (!imagePrintSettings || !imagePrintSettings?.paperType || !prices) {
      this.totalOrderPrice = 0;
      this.totalOrderPriceBeforeDiscount = 0;
      this.totalOrderPriceToBeforeUpdate = 0;
      this.totalOrderPriceBeforeDiscountToBeforeUpdate = 0;
      return 0;
    }
    const imagePaperType = imagePrintSettings.paperType.replace("'", "\\'").replace("\\", "").toLowerCase();
    const imagePrices = prices;
    const lowerCaseImagePrices = Object.keys(imagePrices).reduce((result, key) => {
      result[key.toLowerCase()] = imagePrices[key];
      return result;
    }, {});
    const imagePaperPrices = lowerCaseImagePrices[imagePaperType];
    if (imagePaperPrices && imagePaperPrices.single) {
      if (!imagePrintSettings.doubleSided) {
        if (!imagePrintSettings.bw) {
          return this.roundDownTowDecimal(imagePaperPrices.single.color);
        } else {
          return this.roundDownTowDecimal(imagePaperPrices.single.bw);
        }
      } else {
        if (!imagePrintSettings.bw) {
          return this.roundDownTowDecimal(imagePaperPrices.double.color);
        } else {
          return this.roundDownTowDecimal(imagePaperPrices.double.bw);
        }
      }
    } else {
      return 0;
    }
  }

  calcTotalOrderPrice() {
    if (this.printingService === "plotter") {
      console.log('plotter >> calcTotalOrderPrice >>', this.files);
      // [plotter]
      let totalPrice = 0;
      if (this.files.length > 0) {
        for (let file of this.files) {
          if (file.images.length > 0) {
            for (let image of file.images) {
              if (image.printSettings && image.printSettings.paperType) {
                const copies = image.printSettings.numOfCopies ? image.printSettings.numOfCopies : 1;
                totalPrice = totalPrice + (image.price * copies);
              }
            }
          }
        }
      }
      this.totalOrderPrice = totalPrice;
      this.totalOrderPriceBeforeDiscount = totalPrice;
      this.totalOrderPriceToBeforeUpdate = totalPrice;
      this.totalOrderPriceBeforeDiscountToBeforeUpdate = totalPrice;
      console.log('calcTotalOrderPrice >> totalPrice >> ', totalPrice);
    } else if (this.printingService === "express") {
      this.totalOrderPrice = 0;
      this.totalOrderPriceBeforeDiscount = 0;
      this.totalOrderPriceToBeforeUpdate = 0;
      this.totalOrderPriceBeforeDiscountToBeforeUpdate = 0;
      // [express]
      for (let file of this.files) {
        if (file.printSettings && file.printSettings.paperType) {
          const filePrintSettings = file.printSettings;
          const imagePaperType = filePrintSettings.paperType.replace("'", "\\'").replace("\\", "").toLowerCase();
          const imagePrices = this.realBranch.express.pricing.prices_x;
          const imagePricesX = this.realBranch.express.pricing.prices;
          const imageX = this.realBranch.express.pricing.x;
          const lowerCaseImagePrices = Object.keys(imagePrices).reduce((result, key) => {
            result[key.toLowerCase()] = imagePrices[key];
            return result;
          }, {});
          const lowerCaseImagePricesX = Object.keys(imagePricesX).reduce((result, key) => {
            result[key.toLowerCase()] = imagePricesX[key];
            return result;
          }, {});
          const imagePaperPrices = lowerCaseImagePrices[imagePaperType];
          const imagePaperPricesX = lowerCaseImagePricesX[imagePaperType];
          if (imagePaperPrices && imagePaperPrices.single) {
            if (!filePrintSettings.doubleSided) {
              // single sided
              // console.log('single sided');
              if (!filePrintSettings.bw) {
                // color
                // console.log('color');
                this.sortedFilesArray.push({
                  type: imagePaperType + '-single-color',
                  price: this.roundDownTowDecimal(imagePaperPrices.single.color),
                  priceX: this.roundDownTowDecimal(imagePaperPricesX.single.color),
                  x: imageX,
                  copies: filePrintSettings.numOfCopies * file.images.length,
                });
              } else {
                // black and white
                // console.log('black and white');
                this.sortedFilesArray.push({
                  type: imagePaperType + '-single-bw',
                  price: this.roundDownTowDecimal(imagePaperPrices.single.bw),
                  priceX: this.roundDownTowDecimal(imagePaperPricesX.single.bw),
                  x: imageX,
                  copies: filePrintSettings.numOfCopies * file.images.length,
                });
              }
            } else {
              // double sided
              // console.log('double sided');
              if (!filePrintSettings.bw) {
                // color
                // console.log('color');
                this.sortedFilesArray.push({
                  type: imagePaperType + '-double-color',
                  price: this.roundDownTowDecimal(imagePaperPrices.double.color),
                  priceX: this.roundDownTowDecimal(imagePaperPricesX.double.color),
                  x: imageX,
                  copies: filePrintSettings.numOfCopies * file.images.length,
                });
              } else {
                // black and white
                // console.log('black and white');
                this.sortedFilesArray.push({
                  type: imagePaperType + '-double-bw',
                  price: this.roundDownTowDecimal(imagePaperPrices.double.bw),
                  priceX: this.roundDownTowDecimal(imagePaperPricesX.double.bw),
                  x: imageX,
                  copies: filePrintSettings.numOfCopies * file.images.length,
                });
              }
            }
          }
        }
      }

      // normal price (before discount)
      let sortedFilesByTypeArray = [];
      this.sortedFilesArray.forEach(sortedFile => {
        if (sortedFilesByTypeArray.some(sortedFileByType => sortedFileByType.type === sortedFile.type)) {
          // existing sort
          sortedFilesByTypeArray.forEach((sortedFileByType, index) => {
            if (sortedFileByType.type === sortedFile.type) {
              sortedFilesByTypeArray[index].copies += sortedFile.copies;
            }
          });
        } else {
          // new sort
          sortedFilesByTypeArray.push(sortedFile);
        }
      });

      let totalNonDiscountPrice = 0;
      sortedFilesByTypeArray.forEach(sortedFileByType => {
        totalNonDiscountPrice += sortedFileByType.copies * sortedFileByType.price;
      });

      // console.log('totalNonDiscountPrice =========:', totalNonDiscountPrice);

      let totalDiscountPrice = 0;
      sortedFilesByTypeArray.forEach(sortedFileByType => {
        if (sortedFileByType.copies <= sortedFileByType.x) {
          // less then x
          totalDiscountPrice += sortedFileByType.copies * sortedFileByType.price;
        } else {
          // more then x
          totalDiscountPrice += sortedFileByType.x * sortedFileByType.price;
          totalDiscountPrice += (sortedFileByType.copies - sortedFileByType.x) * sortedFileByType.priceX;
        }
      });

      let fixProductsTotalPrice = 0
      if (this.totalOrderdFixProductsPrice()) {
        fixProductsTotalPrice = this.totalOrderdFixProductsPrice();
      }

      this.totalOrderPriceToBeforeUpdate = (this.roundDownOneDecimal(totalDiscountPrice) / 100) + fixProductsTotalPrice;
      this.totalOrderPriceBeforeDiscountToBeforeUpdate = (this.roundDownOneDecimal(totalNonDiscountPrice) / 100) + fixProductsTotalPrice;
      this.sortedFilesArray = [];
    }
  }

  isMaxInkLevelDisableingFile(paper: any, file: any) {
    if (this.printingService === 'express') {
      let maxInkLevelOfAllImages = 100;
      if (this.files.length > 0 && this.files.length !== this.proccessingFiles.length) {
        for (let image of file.images) {
          if (image.inkLevel < maxInkLevelOfAllImages) {
            maxInkLevelOfAllImages = image.inkLevel;
          }
        }
      }
      let paperMaxInkLevel = 100;
      if (paper?.maxInkLevel) {
        paperMaxInkLevel = paper.maxInkLevel;
      }
      return maxInkLevelOfAllImages >= paperMaxInkLevel;
    } else {
      return false;
    }
  }

  maxInkLevelDisableSnackBar(isApplyToAll: boolean = false) {
    if (!this.currentFile || !this.files || this.files.length === 0) {
      return;
    }
    let message = 'printing-table.max-ink-level';
    if (isApplyToAll) {
      message = 'printing-table.max-ink-level.apply-to-all';
    }
    this.snackBar.open(this.translateService.instant(message), '', {
      duration: 5000,
      verticalPosition: 'top',
      panelClass: 'zx-top-snackbar'
    });
  }

  // normal tooltips
  toggleTooltip(value: string) {
    if (value === 'ScanCopy') {
      if (this.tooltipScanCopy._isTooltipVisible()) {
        this.tooltipScanCopy.hide();
      } else {
        this.tooltipScanCopy.show();
      }
    }
    if (value === 'FixProducts') {
      if (this.tooltipFixProducts._isTooltipVisible()) {
        this.tooltipFixProducts.hide();
      } else {
        this.tooltipFixProducts.show();
      }
    }
  }

  // [express]
  // scan and copy
  openScanCopyDialog(event: MouseEvent) {
    // Check if the click event was inside the tooltip element
    const isClickInsideTooltip = (event.target as Element).classList.contains('i-explain-icon');

    // Check if the device is a mobile device
    const isMobileDevice = window.innerWidth <= 768;

    // Only open the dialog if the device is not a mobile device, or if the click was not inside the tooltip element

    if (!isMobileDevice || !isClickInsideTooltip) {
      this.dialogService.onOpenScanCopyDialog(this.realBranch.express);
    }
  }

  // explain property dialog
  openExplainPropertyDialog(property: string) {
    this.dialogService.onOpenExplainPropertyDialog(property, this.printingService, this.realBranch);
  }

  isManiger() {
    if (this.user?.roles && this.user.roles.includes('su') ||
      (this.user?.roles && this.user.roles.includes('bm') &&
        (this.printingService === 'plotter' && this.realBranch?.plotter?.bm?._id === this.user?._id) ||
        (this.printingService === 'express' && this.realBranch?.express?.bm?._id === this.user?._id))) {
      return true;
    }
    return false;
  }

  isSu() {
    if (this.user?.roles && this.user.roles.includes('su')) {
      return true;
    }
    return false;
  }

  isSt() {
    if (this.user?.roles && this.user.roles.includes('st') && (
      (this.printingService === 'plotter' && this.realBranch?.plotter?.st?.some(st => st._id === this.user?._id) ||
        (this.printingService === 'express' && this.realBranch?.express?.st?.some(st => st._id === this.user?._id)
        )))) {
      return true;
    }
    return false;
  }

  // ------ animation ------

  // rattle Upload SVG

  // rattle effect animation
  animateUploadSVG() {
    this.ngZone.runOutsideAngular(() => {
      this.rattleInterval = setInterval(() => {
        this.ngZone.run(() => {
          this.rattle = this.rattle === 'state1' ? 'state2' : 'state1';
        });
      }, 15000);
    });
  }

  // stop the rattle effect
  stopAnimateUploadSVG() {
    clearInterval(this.rattleInterval);
    this.rattle = 'state1';
  }

  startOrStopAnimateUploadSVG() {
    if (this.files.length === 0) {
      this.animateUploadSVG();
    } else {
      this.stopAnimateUploadSVG();
    }
  }

  // No Paper

  // No Paper effect animation
  animateNoPaper() {
    // console.log("animate-No-Paper START!");
    this.noPaper = 'state2';
    this.ngZone.runOutsideAngular(() => {
      this.noPaperInterval = setInterval(() => {
        this.ngZone.run(() => {
          this.noPaper = this.noPaper === 'state1' ? 'state2' : 'state1';
        });
      }, 2800);
    });
  }

  // stop the No Paper effect
  stopAnimateNoPaper(paper: any = null) {
    // console.log("animate-No-Paper END!");
    clearInterval(this.noPaperInterval);
    this.noPaper = 'state1';
  }

  // start Or stop the No Paper effect
  startOrStopAnimateNoPaper() {
    if ((this.printingService === "plotter" && this.currentImage && !this.currentImage.printSettings?.paperType) ||
      (this.printingService === "express" && this.currentFile && !this.currentFile.printSettings?.paperType)) {
      if (!this.isNoPaperAnimating) {
        this.isNoPaperAnimating = true;
        this.animateNoPaper();
        this.stopAnimateMainBtn();
      }
    } else {
      if (this.isNoPaperAnimating) {
        this.isNoPaperAnimating = false;
        this.stopAnimateNoPaper();
        this.animateMainBtn();
      }
    }
  }

  // main Btn

  // main Btn effect animation
  animateMainBtn() {
    // console.log("animate-Main-Btn START!");
    this.mainBtn = 'state2';
    this.ngZone.runOutsideAngular(() => {
      this.mainBtnInterval = setInterval(() => {
        this.ngZone.run(() => {
          this.mainBtn = this.mainBtn === 'state1' ? 'state2' : 'state1';
        });
      }, 9000);
    });
  }
  // stop the main Btn effect
  stopAnimateMainBtn() {
    // console.log("animate-Main-Btn END!");
    clearInterval(this.mainBtnInterval);
    this.mainBtn = 'state1';
  }

  goToManagementPage(page: string) {
    let branchID;
    if (this.printingService === 'plotter') {
      branchID = this.realBranch.plotter._id;
    } else if (this.printingService === 'express') {
      branchID = this.realBranch.express._id;
    }
    this.stopAnimateMainBtn();
    this.stopAnimateNoPaper();
    this.stopAnimateUploadSVG();
    this.clearAllIntervals();
    // console.log('goToManagementPage >> branchID: ', this.printingService, branchID);
    this.router.navigate(['/printer/' + this.printingService + "/" + branchID], { queryParams: { q: page } });
  }

  animatePaperStrong() {
    if (!this.isAnimatePaperStrong) {
      this.isAnimatePaperStrong = true;
      setTimeout(() => {
        this.isAnimatePaperStrong = false;
      }, 1500);
      this.snackBar.open(this.translateService.instant('printing-table.preview.not-avalble'), '', {
        duration: 3200,
        verticalPosition: 'top',
        panelClass: 'zx-top-snackbar'
      });
    }
  }

  animatePaperStrongIfNeeded() {
    if (!this.currentPaperType && this.files.length > 0) {
      this.animatePaperStrong();
    }
  }

  //  ------------------------------------------------- mainBtn              mainBtnInterval

  // express upload //

  endpoint = '';
  public uploader: FileUploader = new FileUploader({ url: this.endpoint, headers: [{ name: 'Authorization', value: 'Bearer ' + localStorage.getItem('token') }] });
  hasBaseDropZoneOver: boolean = false;
  uploadProgress: number = 0;
  uploadingFiles: FileItem[] = [];
  currentlyUploading: boolean = false;

  public fileOverBase(e: any): void {
    console.log('fileOverBase:', e);
    this.hasBaseDropZoneOver = e;
  }

  public onFileDrop(e: any): void {
    console.log('Files dropped:', e);
  }

  // Method to track upload progress for individual files
  public trackUploadProgress(): void {
    this.uploader.onProgressItem = (fileItem: FileItem, progress: any) => {
      // console.log(`File: ${fileItem.file.name} is ${progress}% uploaded.`);
      this.uploadProgress = progress;
    };

    this.uploader.onAfterAddingFile = (fileItem: FileItem) => {
      this.uploadingFiles.push(fileItem);
      // console.log(`Added file: ${fileItem.file.name}`);
      fileItem.upload(); // Automatically start uploading the file
      this.currentlyUploading = true;
    };

    this.uploader.onCompleteItem = (fileItem: FileItem, response: any, status: number, headers: any) => {
      // console.log(`File: ${fileItem.file.name} uploaded successfully!`);
      // Remove the file from the uploadingFiles array after completion
      this.uploadingFiles = this.uploadingFiles.filter(item => item !== fileItem);
      if (this.uploadingFiles.length === 0) {
        this.currentlyUploading = false;
      }
    };
  }

  branchHasFixProducts() {
    if (this.realBranch?.express?.fix_products && this.realBranch.express.fix_products.length > 0) {
      return true;
    }
    return false;
  }

  openFixProductsDialog(event: MouseEvent) {
    // Check if the click event was inside the tooltip element
    const isClickInsideTooltip = (event.target as Element).classList.contains('i-explain-icon');

    // Check if the device is a mobile device
    const isMobileDevice = window.innerWidth <= 768;

    // Only open the dialog if the device is not a mobile device, or if the click was not inside the tooltip element

    if (!isMobileDevice || !isClickInsideTooltip) {
      if (this.realBranch?.express?.fix_products && this.realBranch.express.fix_products.length > 0) {
        this.dialogService.onOpenFixProductsDialog(this.realBranch.name, this.realBranch.express.fix_products);
      }
    }
  }

  totalOrderdFixProducts() {
    let totalCopies = 0;
    if (this.branchHasFixProducts()) {
      for (let product of this.realBranch.express.fix_products) {
        if (product?.numOfCopies && product.numOfCopies > 0) {
          totalCopies += product.numOfCopies;
        }
      }
    }
    return totalCopies;
  }

  totalOrderdFixProductsPrice() {
    let totalPrice = 0;
    if (this.branchHasFixProducts()) {
      for (let product of this.realBranch.express.fix_products) {
        if (product.price && product.numOfCopies > 0) {
          totalPrice += product.numOfCopies * product.price;
        } else {
          totalPrice += product.numOfCopies * product.productId.defaultPrice;
        }
      }
    }
    return totalPrice;
  }

  isImagesPrinter() {
    let isImagesPrinter = false;
    this.printServicePapers.forEach(paper => {
      if (paper.serial_name === 'SM' || paper.serial_name === 'LG') {
        isImagesPrinter = true;
      }
    });
    return isImagesPrinter;
  }
  // ===============
}
