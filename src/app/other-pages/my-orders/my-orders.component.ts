import { Component, OnInit, OnDestroy, ViewChildren, ViewChild, ElementRef } from "@angular/core";
import { Subscription } from 'rxjs';
import { DirectionService } from '../../direction.service';

import { OrdersService } from "./orders-service";
import { PageEvent } from "@angular/material/paginator";
import { AuthService } from "src/app/auth/auth.service";
import { UsersService } from 'src/app/super-management/user/users.service';

import { Router, ActivatedRoute } from "@angular/router";
import { DialogService } from 'src/app/dialog/dialog.service';
import { MatExpansionPanel } from '@angular/material/expansion';
import * as _ from 'lodash';

@Component({
  selector: "app-order-list",
  templateUrl: "./my-orders.component.html",
  styleUrls: ["./my-orders.component.css"],
  host: {
    class: 'fill-screen'
  }
})

export class MyOrdersComponent implements OnInit, OnDestroy {
  isRTL: boolean = true;
  private directionSubscription: Subscription;
  isDarkMode: boolean = false;

  isLoading = false;

  orders: any[] = [];
  unSortedOrders: any[] = [];
  lastPendingOrderIndex: number = 0;

  totalOrders = 0;
  ordersPerPage = 20;
  currentPage = 1;
  pageSizeOptions = [5, 10, 20, 30, 50];
  userIsAuthenticated = false;
  userId: string;
  user: any;
  private ordersSub: Subscription;
  private authStatusSub: Subscription;
  private intervalId: any;
  isLoadOrders: boolean = true;
  isAllImagesShowen: Boolean = false;
  isManigmentView: boolean = false;

  expandedPanelId: string | number;
  @ViewChildren(MatExpansionPanel) expansionPanels;
  @ViewChild('scrollContainer') scrollContainer: ElementRef;

  plotterImageErrors: boolean[] = [];
  expressImageErrors1: boolean[] = [];
  expressImageErrors2: boolean[] = [];
  private orderDeletedSub: Subscription;

  constructor(
    public ordersService: OrdersService,
    private authService: AuthService,
    private directionService: DirectionService,
    private usersService: UsersService,
    private router: Router,
    private dialogService: DialogService,
    private route: ActivatedRoute,
  ) { }

  ngOnInit() {
    this.isLoading = true;
    this.isLoadOrders = true;

    this.directionSubscription = this.directionService.direction$.subscribe(direction => {
      this.isRTL = direction === 'rtl';
    });

    this.directionService.isDarkMode$.subscribe(isDarkMode => {
      this.isDarkMode = isDarkMode;
    });

    this.userIsAuthenticated = this.authService.getIsAuth();
    this.authStatusSub = this.authService
      .getAuthStatusListener()
      .subscribe(isAuthenticated => {
        this.userIsAuthenticated = isAuthenticated;
        this.userId = this.authService.getUserId();
      });

    this.fetchUser(localStorage.getItem('userId'));
    this.isLoadOrders = true;

    this.route.params.subscribe(params => {
      if (params['userId']) {
        console.log('FetchedFetchedFetched User ID:', params['userId'], localStorage.getItem('userId'), params['userId'] === localStorage.getItem('userId'));
        this.fetchUser(params['userId']);
        this.userId = params['userId'];
        this.fetchOrders();
        if (params['userId'] === localStorage.getItem('userId')) {
          this.isManigmentView = false;
        } else {
          this.isManigmentView = true;
        }
      }
    });
    console.log('Fetched User ID:', this.fetchUser(this.userId));
    console.log("this.orders", this.orders);

    // get orders [interval]
    this.intervalId = setInterval(() => {
      this.fetchOrders();
    }, 15000);

    this.orderDeletedSub = this.ordersService.getOrderDeletedListener().subscribe(() => {
      this.fetchOrders();
    });
  }

  fetchOrders() {
    this.ordersService.getOrders(this.ordersPerPage, this.currentPage, this.userId);
    this.ordersSub = this.ordersService
      .getOrderUpdateListener()
      .subscribe((orderData: { orders: any[], orderCount: number }) => {
        let oldOrders = this.unSortedOrders;
        let newOrders = orderData.orders;
        oldOrders = oldOrders.map(order => _.omit(order, ['userID', 'printerID', 'branchID']));
        newOrders = newOrders.map(order => _.omit(order, ['userID', 'printerID', 'branchID']));
        const isEqual = _.isEqual(oldOrders, newOrders);
        console.log('isEqual: ', isEqual);
        console.log('orderData.orders: ', orderData.orders);
        console.log('this.orders: ', this.orders);
        if (!isEqual || this.isLoadOrders) {
          this.totalOrders = orderData.orderCount;
          this.unSortedOrders = orderData.orders;
          this.sortAndSaveOrders(orderData.orders);
          this.plotterImageErrors = this.orders.map(order =>
            order.files.map(file =>
              new Array(file.images.length).fill(false)
            )
          );
          this.expressImageErrors1 = this.orders.map(order =>
            order.files.map(file =>
              new Array(file.images.length).fill(false)
            )
          );
          console.log('expressImageErrors1', this.expressImageErrors1);
          this.expressImageErrors2 = this.orders.map(order =>
            order.files.map(file =>
              new Array(file.images.length).fill(false)
            )
          );
          this.isLoadOrders = false;
          this.isAllImagesShowen = false;
          console.log('new orders updated!', this.orders);
        }
        this.isLoading = false;
      });
  }

  sortAndSaveOrders(preSortedOrders) {
    let sortedOrders = [];
    this.lastPendingOrderIndex = 0;
    if (preSortedOrders && preSortedOrders.length > 0) {
      for (let i = 0; i < preSortedOrders.length; i++) {
        if (!preSortedOrders[i].addedToQueue &&
          (preSortedOrders[i].status === 'PENDING' ||
            preSortedOrders[i].status === 'QR' ||
            preSortedOrders[i].status === 'NOT_PAID') &&
          (!preSortedOrders[i].files ||
            preSortedOrders[i].files.length > 0) &&
          !preSortedOrders[i].isDeleted) {
          sortedOrders.push(preSortedOrders[i]);
          this.lastPendingOrderIndex = this.lastPendingOrderIndex + 1;
        }
      }
      for (let i = 0; i < preSortedOrders.length; i++) {
        if (!(!preSortedOrders[i].addedToQueue &&
          (preSortedOrders[i].status === 'PENDING' ||
            preSortedOrders[i].status === 'QR' ||
            preSortedOrders[i].status === 'NOT_PAID') &&
          (!preSortedOrders[i].files ||
            preSortedOrders[i].files.length > 0) &&
          !preSortedOrders[i].isDeleted)) {
          sortedOrders.push(preSortedOrders[i]);
        }
      }
      this.orders = sortedOrders;
      this.expandedPanelId = null;
    }
  }

  async onChangedPage(pageData: PageEvent) {
    this.isLoading = true;
    this.isLoadOrders = true;
    this.currentPage = pageData.pageIndex + 1;
    this.ordersPerPage = pageData.pageSize;
    const preSortedOrders = await this.ordersService.getOrders(this.ordersPerPage, this.currentPage, this.userId);
    this.lastPendingOrderIndex = 0;
    this.sortAndSaveOrders(preSortedOrders);
  }

  // onDelete(orderId: string) {
  //   this.isLoading = true;
  //   this.ordersService.deleteOrder(orderId).subscribe(() => {
  //     this.ordersService.getOrders(this.ordersPerPage, this.currentPage);
  //   }), () => {
  //     this.isLoading = false;
  //   };
  // }

  // [general]
  roundDownTowDecimal(num: number): number {
    return Math.ceil(num * 100) / 100;
  }

  // [general]
  async fetchUser(userId: string) {
    try {
      this.user = await this.usersService.getUser(userId).toPromise();
    } catch (error) {
      console.error('Error fetching user:', error);
    }
    console.log('USER object is HERE', this.user);
    //     if (this.userId === localStorage.getItem('userId')) {
    //       this.isManigmentView = false;
    // nadav
    //     }
  }

  ngOnDestroy() {
    if (this.ordersSub) {
      this.ordersSub.unsubscribe();
    }
    if (this.authStatusSub) {
      this.authStatusSub.unsubscribe();
    }
    if (this.directionSubscription) {
      this.directionSubscription.unsubscribe();
    }
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    // this.isManigmentView = false;
  }

  // openOrderSummaryDialog ==========================  -------------------------------------------------------------------------------==========================
  openOrderSummaryDialog(event: Event, order: any): void {
    event.stopPropagation();

    if (order.branchID && !order.branchID.is_express) {
      // [plotter] ---  [plotter] ---  [plotter] --------------------------------------------------------
      if (order.files && order.files.length > 0) {

        // get files and remove proccessing files
        const orderFilesBeforeClean = [...order.files];
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
              const paperSerialName = order.printerID.inputBins.find(paper => paper.paperType.paperPrinterCode === image.printSettings.paperType).paperType.paperType;
              const resizeFactor = this.roundDownTowDecimal((image.imageHeight / image.origImageHeight) * 100);
              const iamgeData = {
                settings: image.printSettings,
                paperSerialName: paperSerialName,
                width: image.imageWidth,
                height: image.imageHeight,
                resizeFactor: resizeFactor,
                price: image.price,
                path: image.thumbnailPath,
              };
              fileData.images.push(iamgeData);
            }
            orderFilesData.push(fileData);
          }
        }
        // open dialog
        const present = this.user.discount ? 100 - this.user.discount : 100;
        const totalOrderPriceAfterDiscount = order.totalCost * (present / 100);
        this.dialogService.onOpenOrderSummaryDialog(
          'plotter',
          '',
          [],
          orderFilesData,
          order.branchID.serial_name,
          {
            totalOrderPriceBeforeDiscount: order.totalCost,
            totalOrderPrice: totalOrderPriceAfterDiscount,
            points: this.user.points ? this.user.points : 0,
          },
          this.user,
          true,
          order.adminOrder ? order.adminOrder : false,
          order.branchID.unique,
          order._id
        );
        // // [plotter] ---  [plotter] ---  [plotter] --------------------------------------------------------
      }

    } else if (order.branchID && order.branchID.is_express) {
      // [express] ---  [express] ---  [express] --------------------------------------------------------
      if (order.files && order.files.length > 0) {

        // get files and remove proccessing files
        const orderFilesBeforeClean = [...order.files];
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
          // find in this.printServicePapers a paper paper.paperName thet equil to file.printSettings.paperType and save it as paperSerialName
          const paperSerialName = order.printerID.consumables.papers.find(paper => paper.paperName === file.printSettings.paperType).serial_name;
          const fileData = {
            name: file.fileName,
            fileId: file._id,
            settings: file.printSettings,
            paperSerialName: paperSerialName,
            images: [],
            price: {
              pricePerPage: file.price,
              pages: file.images.length,
              copies: file.printSettings.numOfCopies,
            }
          };

          // Get paper width
          let paperType = order.printerID.consumables.papers.find(paper => paper.paperName === file.printSettings.paperType).paperType;

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
            let BeforeRotationImageWidth = (file.images[j].imageWidth / 300) * 2.54;
            let BeforeRotationImageHeight = (file.images[j].imageHeight / 300) * 2.54;

            if (file.printSettings.fit) {

              // Calculate biddest dims of all images
              let BeforeRotationAllImagesBiggestWidth = file.images.reduce((max, image) => {
                return Math.max(max, (image.imageWidth / 300) * 2.54);
              }, 0);
              let BeforeRotationAllImagesBiggestHeight = file.images.reduce((max, image) => {
                return Math.max(max, (image.imageHeight / 300) * 2.54);
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
        // open dialog
        const present = this.user.discount ? 100 - this.user.discount : 100;
        const totalOrderPriceAfterDiscount = order.totalCost * (present / 100);
        this.dialogService.onOpenOrderSummaryDialog(
          'express',
          'https://img-express.eazix.io',
          [],
          orderFilesData,
          order.printerID.serial_name,
          {
            totalOrderPriceBeforeDiscount: order.totalCost,
            totalOrderPrice: totalOrderPriceAfterDiscount,
            points: this.user.points ? this.user.points : 0,
          },
          this.user,
          true,
          order.adminOrder ? order.adminOrder : false,
          order.printerID.unique,
          '',
          '',
          order._id,
        );
      }
      // // [express] ---  [express] ---  [express] --------------------------------------------------------
    }
  }

  // openDeleteOrderDialog ==========================  -------------------------------------------------------------------------------==========================
  openDeleteOrderDialog(event: Event, order: any): void {
    event.stopPropagation();
    this.dialogService.onOpenDeleteOrderDialog(order);
  }
  // openDeleteOrderDialog ==========================  -------------------------------------------------------------------------------==========================

  // [general]
  getUserName() {
    return localStorage.getItem('userName');
  }

  getUserId() {
    return localStorage.getItem('userId');
  }

  addSecondsToDate(sentDate: string, numOfFiles: number): Date {
    // Convert sentDate string to Date object
    let date = new Date(sentDate);
    // Convert numOfFiles to milliseconds (since 1 second = 1000 milliseconds)
    let additionalTime = numOfFiles * 25 * 1000;
    // Create a new Date object from sentDate
    let newDate = new Date(date.getTime());
    // Add the additional time to the new date
    newDate.setTime(newDate.getTime() + additionalTime);
    return newDate;
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

  togglePanel(order: any): void {
    // Find the index of the order that is being opened
    const index = this.orders.findIndex(o => o._id === order._id);

    // Get the panel and the container
    const panel = this.expansionPanels.toArray()[index];
    const container = this.scrollContainer;

    // Ensure that both the panel and the container are defined
    if (panel && container && container.nativeElement) {
      // Expand or collapse the MatExpansionPanel
      if (this.expandedPanelId === order._id) {
        panel.close();
        this.expandedPanelId = null;
      } else {
        panel.open();
        this.expandedPanelId = order._id;

        // Listen for the afterExpand event of the MatExpansionPanel
        const subscription = panel.afterExpand.subscribe(() => {
          // Scroll the container down by 50px
          container.nativeElement.scrollBy({
            top: 5,
            behavior: 'smooth'
          });

          // Unsubscribe from the afterExpand event to avoid memory leaks
          subscription.unsubscribe();
        });
      }
    }
  }

  getPaperSerialName(paperCode: string, inputBins: any[]): string {
    if (!paperCode || !inputBins || inputBins.length === 0) {
      return null;
    }
    if (inputBins.find(paper => paper?.paperType?.paperPrinterCode === paperCode)?.paperType?.paperType) {
      const paperSerialName = inputBins.find(paper => paper.paperType.paperPrinterCode === paperCode).paperType.paperType;
      return paperSerialName;
    } else {
      return null;
    }
  }

  getPaperSerialNameExpress(paperType: string, papers: any[]): string {
    if (!paperType || !papers || papers.length === 0) {
      return null;
    }
    if (papers.find(paper => paper.paperName === paperType)) {
      const paper = papers.find(paper => paper.paperName === paperType);
      return paper.serial_name;
    } else {
      return null;
    }
  }

  isAllFilesHavePaperSet(order) {
    let isOrderAllFilesHavePaperSet = true;
    if (!order.branchID.is_express) {
      // [plotter]
      // console.log("---- plotter");
      for (let file of order.files) {
        for (let image of file.images) {
          let paperCode = image.printSettings.paperType;
          let paperExists = order.printerID.inputBins.find(paper => paper.paperType.paperPrinterCode === paperCode);
          // console.log("paperExists", paperExists)
          if (!paperExists) {
            isOrderAllFilesHavePaperSet = false;
            break;
          }
        }
        if (!isOrderAllFilesHavePaperSet) {
          break;
        }
      }
    } else {
      // [express]
      // console.log("---- express");
      for (let file of order.files) {
        let paperType = file.printSettings.paperType;
        if (order.printerID?.consumables?.papers) {
          let paperExists = order.printerID.consumables.papers.find(paper => paper.paperName === paperType);
          // console.log("paperExists", paperExists)
          if (!paperExists) {
            isOrderAllFilesHavePaperSet = false;
            break;
          }
        }
      }
    }
    // console.log("isOrderAllFilesHavePaperSet", isOrderAllFilesHavePaperSet)
    return isOrderAllFilesHavePaperSet;
  }

  getExpressDimensions(direction: string, imageWidth: number, imageHeight: number, printSettings: any, branchPapers: any[], dpi: number) {
    // console.log('getExpressDimensions:', direction, imageWidth, imageHeight, printSettings, branchPapers);
    let imageWidthInCm = imageWidth / dpi * 2.54;
    let imageHeightInCm = imageHeight / dpi * 2.54;
    let imageScaleFactor = 1;
    if (printSettings.fit) {
      let paperWidth = 0;
      let paperHeight = 0;

      // Get paper width
      if (branchPapers.find(paper => paper.paperName === printSettings.paperType)?.serial_name) {
        const paperCode = branchPapers.find(paper => paper.paperName === printSettings.paperType).serial_name;
        if (paperCode === 'A4') {
          paperWidth = 21;
          paperHeight = 29.7;
        } else if (paperCode === 'A3') {
          paperWidth = 29.7;
          paperHeight = 42;
        } else if (paperCode === 'A4160') {
          paperWidth = 21;
          paperHeight = 29.7;
        } else if (paperCode === 'A3160') {
          paperWidth = 29.7;
          paperHeight = 42;
        } else if (paperCode === 'A4Recycled') {
          paperWidth = 21;
          paperHeight = 29.7;
        } else if (paperCode === 'SM') {
          paperWidth = 10.16;
          paperHeight = 15.24;
        } else if (paperCode === 'MD') {
          paperWidth = 12.7;
          paperHeight = 17.78;
        } else if (paperCode === 'LG') {
          paperWidth = 15.24;
          paperHeight = 20.32;
        }
      }

      let factorIfNotRotater;
      let factorIfRotater;
      if (imageWidthInCm / paperWidth > imageHeightInCm / paperHeight) {
        factorIfNotRotater = imageWidthInCm / paperWidth;
        // console.log("factorIfNotRotater 01", factorIfNotRotater);
      } else {
        factorIfNotRotater = imageHeightInCm / paperHeight;
        // console.log("factorIfNotRotater 02", factorIfNotRotater);
      }
      if (imageWidthInCm / paperHeight > imageHeightInCm / paperWidth) {
        factorIfRotater = imageWidthInCm / paperHeight;
        // console.log("factorIfRotater 03", factorIfRotater);
      } else {
        factorIfRotater = imageHeightInCm / paperWidth;
        // console.log("factorIfRotater 04", factorIfRotater);
      }
      if (factorIfRotater < factorIfNotRotater) {
        imageScaleFactor = factorIfRotater;
      } else {
        imageScaleFactor = factorIfNotRotater;
      }
    }
    if (direction === 'h') {
      return this.roundDownTowDecimal(imageHeightInCm / imageScaleFactor);
    } else if (direction === 'w') {
      return this.roundDownTowDecimal(imageWidthInCm / imageScaleFactor);
    }
    return null;
  }

  openWhatsApp() {
    const phoneNumber = '97233746962';
    const message = encodeURIComponent('My-Orders-at-Eazix');
    const url = `https://wa.me/${phoneNumber}?text=${message}`;
    window.open(url, '_blank');
  }

  handleImageError(event: ErrorEvent, i: number) {
    this.expressImageErrors1[i] = true;
    console.log('Error loading image: ' + (event.target as HTMLImageElement).src);
  }

  showMoreImages() {
    this.isAllImagesShowen = true;
  }

  hideMoreImages() {
    this.isAllImagesShowen = false;
  }

  getImgExpress(order, thumbnail) {

    // === OLD & NEW ===
    const isNewThumbnail = thumbnail.startsWith("/home/ubuntu/IMG-Express");
    let newThumbnail = '';
    if (isNewThumbnail) {
      newThumbnail = thumbnail.replace('/home/ubuntu/IMG-Express', 'https://img-express.eazix.io');
    } else {
      if (order.status === 'PENDING' ||
        order.status === 'QR' ||
        order.status === 'NOT_PAID') {
        newThumbnail = 'https://' + order.branchID.serial_name + '.eazix.io/uploads/' + this.getUserName() + '/' + thumbnail.split('\\').pop();
      } else {
        newThumbnail = thumbnail;
      }
    }
    return newThumbnail;
  }

  // MANIGMENT MODE
  goToUsersManagement() {
    const service = localStorage.getItem('searchedService');
    localStorage.removeItem('searchedService');
    const branch = localStorage.getItem('searchedBranchId');
    localStorage.removeItem('searchedBranchId');
    this.router.navigate([`/printer/${service}/${branch}`], { queryParams: { q: 'users' } });
  }
  // // MANIGMENT MODE

  // -----------------
}
