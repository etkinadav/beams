import { Component, OnInit, OnDestroy } from "@angular/core";
import { Subscription, combineLatest } from 'rxjs';
import { DirectionService } from '../../direction.service';

import { AuthService } from "src/app/auth/auth.service";
import { UsersService } from 'src/app/super-management/user/users.service';

import { Router, ActivatedRoute } from "@angular/router";
import { DialogService } from 'src/app/dialog/dialog.service';

import { OrdersService } from "../my-orders/orders-service";

@Component({
  selector: "app-pending-order",
  templateUrl: "./pending-order.component.html",
  styleUrls: ["./pending-order.component.css"],
  host: {
    class: 'fill-screen'
  }
})

export class PendingOrderComponent implements OnInit, OnDestroy {
  isRTL: boolean = true;
  private directionSubscription: Subscription;
  isDarkMode: boolean = false;
  isLoading = false;

  userId: string;
  userIsAuthenticated = false;
  private authStatusSub: Subscription;

  printingService: string;
  orderId: string;
  order: any;
  user: any;

  constructor(
    private authService: AuthService,
    private directionService: DirectionService,
    private usersService: UsersService,
    private router: Router,
    private route: ActivatedRoute,
    private dialogService: DialogService,
    private ordersService: OrdersService,
  ) { }

  ngOnInit() {
    this.isLoading = true;

    this.directionSubscription = this.directionService.direction$.subscribe(direction => {
      this.isRTL = direction === 'rtl';
    });

    this.directionService.isDarkMode$.subscribe(isDarkMode => {
      this.isDarkMode = isDarkMode;
    });

    this.route.params.subscribe(params => {
      console.log('params:', params);
      this.printingService = params['service'];
      this.orderId = params['orderId'];

      this.openOrderSummary();
    });
  }

  ngOnDestroy() {
    if (this.authStatusSub) {
      this.authStatusSub.unsubscribe();
    }
    if (this.directionSubscription) {
      this.directionSubscription.unsubscribe();
    }
  }

  // [general]
  roundDownTowDecimal(num: number): number {
    return Math.ceil(num * 100) / 100;
  }

  goToNewOrder() {
    if (localStorage.getItem('userId') &&
      this.user._id &&
      localStorage.getItem('userId') === this.user._id) {
      this.dialogService.onOpenRightPlaceDialog();
      this.router.navigate(['/']);
    } else {
      this.dialogService.onOpenLoginDialog();
    }
  }

  openOrderSummary() {
    this.isLoading = true;

    this.ordersService.getPendingOrder(this.printingService, this.orderId).subscribe(orderData => {
      console.log('orderData:', orderData);
      if (!orderData.orderData) {
        return;
      }
      this.order = orderData.orderData.order;
      this.user = orderData.orderData.user;
      // console.log(this.order);
      // console.log(this.user);

      if (this.printingService === 'p') {
        //  [plotter] ---  [plotter] ---  [plotter] --------------------------------------------------------

        const orderFilesBeforeClean = [...this.order.files];
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
              const paperSerialName = this.order.printerID.inputBins.find(paper => paper.paperType.paperPrinterCode === image.printSettings.paperType).paperType.paperType;
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
        const present = 100;
        const totalOrderPriceAfterDiscount = this.order.totalCost * (present / 100);
        this.dialogService.onOpenOrderSummaryDialog(
          'plotter',
          '',
          [],
          orderFilesData,
          this.order.branchID.serial_name,
          {
            totalOrderPriceBeforeDiscount: this.order.totalCost,
            totalOrderPrice: totalOrderPriceAfterDiscount,
            points: this.user.points ? this.user.points : 0,
          },
          this.user,
          true,
          this.order.adminOrder ? this.order.adminOrder : false,
          this.order.branchID.unique,
        );
        // // [plotter] ---  [plotter] ---  [plotter] --------------------------------------------------------
      } else if (this.printingService === 'e') {
        // [express] ---  [express] ---  [express] --------------------------------------------------------
        if (this.order.files && this.order.files.length > 0) {

          // get files and remove proccessing files
          const orderFilesBeforeClean = [...this.order.files];
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
            const paperSerialName = this.order.printerID.consumables.papers.find(paper => paper.paperName === file.printSettings.paperType).serial_name;
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
            let paperType = this.order.printerID.consumables.papers.find(paper => paper.paperName === file.printSettings.paperType).paperType;

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
                path: 'https://img-express.eazix.io/uploads/' + this.user.username + '/' + image.thumbnailPath.split('/').pop(),
              };
              // console.log('imageData ::::: ', imageData);
              fileData.images.push(imageData);
            }
            // console.log('fileData ::::: ', fileData);
            orderFilesData.push(fileData);
          }
          // open dialog
          const present = this.user.discount ? 100 - this.user.discount : 100;
          const totalOrderPriceAfterDiscount = this.order.totalCost * (present / 100);
          this.dialogService.onOpenOrderSummaryDialog(
            'express',
            '',
            [],
            orderFilesData,
            this.order.printerID.serial_name,
            {
              totalOrderPriceBeforeDiscount: this.order.totalCost,
              totalOrderPrice: totalOrderPriceAfterDiscount,
              points: this.user.points ? this.user.points : 0,
            },
            this.user,
            true,
            this.order.adminOrder ? this.order.adminOrder : false,
            this.order.printerID.unique
          );
        }
        // // [express] ---  [express] ---  [express] --------------------------------------------------------
      }

      this.isLoading = false;
    });
  }
}
