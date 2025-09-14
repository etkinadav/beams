import { Component, OnInit, OnDestroy, ElementRef, Inject } from '@angular/core';

import { Subscription } from 'rxjs';
import { DirectionService } from '../../direction.service';
import { DialogService } from 'src/app/dialog/dialog.service';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-image-preview',
  templateUrl: './image-preview.component.html',
  styleUrls: ['./image-preview.component.scss'],
  host: {
    class: 'fill-screen-modal-image-preview'
  }
})
export class ImagePreviewComponent implements OnInit, OnDestroy {
  isRTL: boolean = true;
  private directionSubscription: Subscription;
  isDarkMode: boolean = false;

  isLoading: boolean = false;
  isLoadingPreview: boolean = false;

  public printingService: string = '';
  public branch: string = '';
  public realBranch: any;
  public branches: any[] = [];
  public filteredBranches: { name: string, systems: string[] }[] = [];
  private printingServiceSubscription: Subscription;
  private branchSubscription: Subscription;
  printServicePapers: any[] = [];
  files: any[] = [];
  paperCodes: string[] = [];
  paperNames: string[] = [];
  currentFile: any;
  currentImage: any;
  currentImageIndex: number;
  isChosen: boolean = false;
  isPaperTypeLoading: boolean = false;
  isCurrentrotated: boolean = false;
  factor: number = 0;
  isCurrentBandW: boolean = false;
  selectedPaper: any;
  cropRatioValue: boolean = false;
  isAllFilesHavePaper: boolean = false;
  resizedInagePrintSettings: any;
  isFitRequired: boolean = false;
  scaleImageFactor: number = 1;
  serverAddress: string = '';

  // current image paper inputs
  currentPaperWidth: number;
  currentPaperHeight: number;
  // current image file inputs:
  currentImageWidth: number;
  currentImageHeight: number;
  // current image more inputs
  isCurrentCenter: boolean = false;
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

  constructor(
    private directionService: DirectionService,
    private dialogService: DialogService,
    private elRef: ElementRef,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.printingService = data.printingService;
    this.currentFile = data.currentFile;
    this.currentImage = data.currentImage;
    this.realBranch = data.realBranch;
    this.selectedPaper = data.selectedPaper;
    this.branch = data.realBranch.name;
    this.cropRatioValue = data.cropRatioValue;
  }

  async ngOnInit() {
    this.isLoading = true;

    this.directionSubscription = this.directionService.direction$.subscribe(direction => {
      this.isRTL = direction === 'rtl';
    });

    this.directionService.isDarkMode$.subscribe(isDarkMode => {
      this.isDarkMode = isDarkMode;
    });

    if (this.printingService === 'plotter') {
      // console.log('plotter $$$');
      this.updatePreview();
      this.serverAddress = this.realBranch.plotter.printers[0].serverAddress;
    } else if (this.printingService === 'express') {
      // console.log('express $$$');
      this.updatePreviewExpress();
      this.serverAddress = 'https://img-express.eazix.io';
    }

    // console.log('## this.printingService', this.printingService);
    // console.log('## this.currentFile', this.currentFile);
    // console.log('## this.currentImage', this.currentImage);
    // console.log('## this.realBranch', this.realBranch);
    // console.log('## this.selectedPaper', this.selectedPaper);
    // console.log('## this.branch', this.branch);

    this.isLoading = false;
  }

  closeImagePreviewDialog() {
    this.dialogService.onCloseImagePreviewDialog();
  }

  // IMAGE PREVIEW
  // [plotter] IMAGE PREVIEW -------------------------------------
  updatePreview(): void {
    this.isLoadingPreview = true;

    // Get paper + image containers
    const previewPaperFS: HTMLElement = this.elRef.nativeElement.querySelector('#preview-paper-fullscreen');
    const previewImageContainerFS: HTMLElement = this.elRef.nativeElement.querySelector('#preview-image-container-fullscreen');

    // Reset dimensions
    previewPaperFS.style.width = `0px`;
    previewPaperFS.style.height = `0px`;
    // Reset img dimensions
    previewImageContainerFS.style.width = `0px`;
    previewImageContainerFS.style.height = `0px`;

    // Get container dimensions
    const previewContainerFS: HTMLElement = this.elRef.nativeElement.querySelector('#preview-container-fullscreen');

    // Get upper dim
    const upperDim1FS: HTMLElement = this.elRef.nativeElement.querySelector('#upperDim1-fullscreen');
    const upperDim2FS: HTMLElement = this.elRef.nativeElement.querySelector('#upperDim2-fullscreen');
    const upperDim3FS: HTMLElement = this.elRef.nativeElement.querySelector('#upperDim3-fullscreen');

    this.previewContainerWidth = previewContainerFS.offsetWidth;
    this.previewContainerHeight = previewContainerFS.offsetHeight;
    // Set paper width
    this.currentPaperWidth = this.selectedPaper.paperType.paperWidth / 1000;

    // margin?
    if (this.currentImage.printSettings.cmFromTop) {
      this.currentPaperMargin = 1;
    } else {
      this.currentPaperMargin = 0;
    }

    // Calculate if needs to rotate
    let BeforeRotationImageWidth = (this.currentImage.imageWidth / this.currentImage.origImageDPI) * 2.54;
    let BeforeRotationImageHeight = (this.currentImage.imageHeight / this.currentImage.origImageDPI) * 2.54;

    if (BeforeRotationImageWidth >= this.currentPaperWidth &&
      BeforeRotationImageHeight >= this.currentPaperWidth) {
      return;
    }

    if (BeforeRotationImageWidth >= this.currentPaperWidth ||
      BeforeRotationImageHeight >= this.currentPaperWidth) {
      // 1 dim are too big
      if (BeforeRotationImageWidth > BeforeRotationImageHeight) {
        // width is bigger
        this.currentImageWidth = BeforeRotationImageHeight;
        this.currentImageHeight = BeforeRotationImageWidth;
        this.isCurrentrotated = true;
      } else {
        // height is bigger
        this.currentImageWidth = BeforeRotationImageWidth;
        this.currentImageHeight = BeforeRotationImageHeight;
        this.isCurrentrotated = false;
      }
    } else {
      // 2 dim are NOT too big
      if (BeforeRotationImageWidth > BeforeRotationImageHeight) {
        // width is bigger
        this.currentImageWidth = BeforeRotationImageWidth;
        this.currentImageHeight = BeforeRotationImageHeight;
        this.isCurrentrotated = false;
      } else {
        // height is bigger
        this.currentImageWidth = BeforeRotationImageHeight;
        this.currentImageHeight = BeforeRotationImageWidth;
        this.isCurrentrotated = true;
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
    if (this.currentImage.printSettings.centered) {
      this.isCurrentCenter = true;
    } else {
      this.isCurrentCenter = false;
    }
    // B and W?
    if (this.currentImage.printSettings.bw) {
      this.isCurrentBandW = true;
    } else {
      this.isCurrentBandW = false;
    }
    this.isLoadingPreview = false;

    // Update paper dimensions
    previewPaperFS.style.width = `${this.previewPaperWidth}px`;
    previewPaperFS.style.height = `${this.previewPaperHeight}px`;

    // Update img dimensions
    previewImageContainerFS.style.width = `${this.previewImageWidth}px`;
    previewImageContainerFS.style.height = `${this.previewImageHeight}px`;

    // Update dims preview dimensions
    if (!this.isCurrentCenter) {
      // if NOT centered
      upperDim1FS.style.width = `${this.previewPaperWidth - this.previewImageContainerWidth}px`;
      upperDim2FS.style.width = `${this.previewImageContainerWidth}px`;
      upperDim3FS.style.width = `0px`;
    } else {
      // if centered
      upperDim1FS.style.width = `${(this.previewPaperWidth - this.previewImageContainerWidth) / 2}px`;
      upperDim2FS.style.width = `${this.previewImageContainerWidth}px`;
      upperDim3FS.style.width = `${(this.previewPaperWidth - this.previewImageContainerWidth) / 2}px`;
    }
  }

  //[express] IMAGE PREVIEW -------------------------------------
  updatePreviewExpress(): void {
    // console.log('updatePreviewExpress');
    this.isLoadingPreview = true;
    console.log('this.currentImage', this.currentImage);
    console.log('this.currentFile', this.currentFile);

    // Get paper + image containers
    const previewPaperFS: HTMLElement = this.elRef.nativeElement.querySelector('#preview-paper-fullscreen');
    const previewImageContainerFS: HTMLElement = this.elRef.nativeElement.querySelector('#preview-image-container-fullscreen');
    if (!previewPaperFS || !previewImageContainerFS) {
      console.log('return !! !!');
      return;
    }

    // console.log('previewPaperFS', previewPaperFS);
    // console.log('previewImageContainerFS', previewImageContainerFS);

    // Reset dimensions
    // Paper
    previewPaperFS.style.width = `0px`;
    previewPaperFS.style.height = `0px`;
    // Image
    previewImageContainerFS.style.width = `0px`;
    previewImageContainerFS.style.height = `0px`;

    // Get container dimensions
    const previewContainerFS: HTMLElement = this.elRef.nativeElement.querySelector('#preview-container-fullscreen');

    // Get upper dim
    const upperDim1FS: HTMLElement = this.elRef.nativeElement.querySelector('#upperDim1-fullscreen');
    const upperDim2FS: HTMLElement = this.elRef.nativeElement.querySelector('#upperDim2-fullscreen');
    const upperDim3FS: HTMLElement = this.elRef.nativeElement.querySelector('#upperDim3-fullscreen');
    // Get sider dim
    const siderDim1FS: HTMLElement = this.elRef.nativeElement.querySelector('#siderDim1-fullscreen');
    const siderDim2FS: HTMLElement = this.elRef.nativeElement.querySelector('#siderDim2-fullscreen');
    const siderDim3FS: HTMLElement = this.elRef.nativeElement.querySelector('#siderDim3-fullscreen');

    this.previewContainerWidth = previewContainerFS.offsetWidth;
    this.previewContainerHeight = previewContainerFS.offsetHeight;

    // console.log('this.previewContainerWidth', this.previewContainerWidth);
    // console.log('this.previewContainerHeight', this.previewContainerHeight);

    // Get paper width
    if (this.currentFile && this.currentFile.printSettings && this.printServicePapers.find(paper => paper.paperName === this.currentFile.printSettings.paperType)) {
      this.selectedPaper = this.printServicePapers.find(paper => paper.paperName === this.currentFile.printSettings.paperType);
    }

    if (this.selectedPaper) {
      const paperCode = this.selectedPaper.serial_name;
      if (paperCode === 'A4') {
        this.currentPaperWidth = 21;
        this.currentPaperHeight = 29.7;
      } else if (paperCode === 'A3') {
        this.currentPaperWidth = 29.7;
        this.currentPaperHeight = 42;
      } else if (paperCode === 'A4160') {
        this.currentPaperWidth = 21;
        this.currentPaperHeight = 29.7;
      } else if (paperCode === 'A3160') {
        this.currentPaperWidth = 29.7;
        this.currentPaperHeight = 42;
      } else if (paperCode === 'A4Recycled') {
        this.currentPaperWidth = 21;
        this.currentPaperHeight = 29.7;
      } else if (paperCode === 'SM') {
        this.currentPaperWidth = 10.16;
        this.currentPaperHeight = 15.24;
      } else if (paperCode === 'MD') {
        this.currentPaperWidth = 12.7;
        this.currentPaperHeight = 17.78;
      } else if (paperCode === 'LG') {
        this.currentPaperWidth = 15.24;
        this.currentPaperHeight = 20.32;
      }

      // Calculate if needs to rotate 1
      let BeforeRotationImageWidth = (this.currentImage.imageWidth / this.currentImage.origImageDPI) * 2.54;
      let BeforeRotationImageHeight = (this.currentImage.imageHeight / this.currentImage.origImageDPI) * 2.54;

      const biggerPaperDimm = Math.max(this.currentPaperWidth, this.currentPaperHeight);
      const smallerPaperDimm = Math.min(this.currentPaperWidth, this.currentPaperHeight);

      // check if original size is possible
      if ((biggerPaperDimm > BeforeRotationImageWidth && smallerPaperDimm > BeforeRotationImageHeight) ||
        (biggerPaperDimm > BeforeRotationImageHeight && smallerPaperDimm > BeforeRotationImageWidth)) {
        // original size is possible
        // console.log('original size is possible !!');
        this.isFitRequired = false;
      } else {
        // original size is NOT possible
        // console.log('original size is NOT possible !!');
        this.currentFile.printSettings.fit = true;
        this.isFitRequired = true;
      }

      if (this.currentFile?.printSettings?.fit) {
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
      this.isCurrentCenter = true;

      // B and W?
      if (this.currentImage?.printSettings?.bw) {
        this.isCurrentBandW = true;
      } else {
        this.isCurrentBandW = false;
      }

    }
    this.isLoadingPreview = false;

    // Update paper dimensions
    previewPaperFS.style.width = `${this.previewPaperWidth}px`;
    previewPaperFS.style.height = `${this.previewPaperHeight}px`;

    // Update img dimensions
    if (this.isCurrentrotated) {
      previewImageContainerFS.style.width = `${this.previewImageHeight}px`;
      previewImageContainerFS.style.height = `${this.previewImageWidth}px`;
    } else {
      previewImageContainerFS.style.width = `${this.previewImageWidth}px`;
      previewImageContainerFS.style.height = `${this.previewImageHeight}px`;
    }

    upperDim1FS.style.width = `${(this.previewPaperWidth - this.previewImageWidth) / 2}px`;
    upperDim2FS.style.width = `${this.previewImageWidth}px`;
    upperDim3FS.style.width = `${(this.previewPaperWidth - this.previewImageWidth) / 2}px`;

    siderDim1FS.style.height = `${(this.previewPaperHeight - this.previewImageHeight) / 2}px`;
    siderDim2FS.style.height = `${this.previewImageHeight}px`;
    siderDim3FS.style.height = `${(this.previewPaperHeight - this.previewImageHeight) / 2}px`;
  }

  roundDown(num: number): number {
    return Math.ceil(num * 100) / 100;
  }

  getUserName() {
    return localStorage.getItem('userName');
  }

  roundDownTowDecimal(num: number): number {
    return Math.ceil(num * 100) / 100;
  }

  ngOnDestroy() {
    this.directionSubscription.unsubscribe();
  }

  isBw() {
    if (this.printingService === 'plotter') {
      return this.currentImage.printSettings.bw;
    } else if (this.printingService === 'express') {
      return this.currentFile.printSettings.bw;
    }
  }
}
