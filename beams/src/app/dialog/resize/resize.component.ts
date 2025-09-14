import { Component, OnInit, OnDestroy, ElementRef, Inject, Output, EventEmitter } from '@angular/core';
import { Subscription } from 'rxjs';

import { DirectionService } from '../../direction.service';
import { DialogService } from 'src/app/dialog/dialog.service';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-resize',
  templateUrl: './resize.component.html',
  styleUrls: ['./resize.component.css'],
  host: {
    class: 'fill-screen-modal-resize'
  }
})
export class ResizeComponent implements OnInit, OnDestroy {
  isRTL: boolean = true;
  private directionSubscription: Subscription;
  isDarkMode: boolean = false;

  isLoading: boolean = false;

  paperWidth: number;
  currentFile: any;
  currentImageIndex: number;
  paperType: string;
  currentImage: any;
  imagePath: string;
  isMustResize: boolean;

  asumedDPI: number = 300;
  isDPIKnown: boolean = false;
  format: string;
  isVectoric: boolean = false;

  resizeNewFactor: number = 100;
  maxNewFactor: number = 400;

  maxWidthLength: number = 0;
  maxHeightLength: number = 0;

  serverAddress: string = '';

  // @Output() onCloseResizeDialogEvent = new EventEmitter<void>();

  constructor(
    private directionService: DirectionService,
    private dialogService: DialogService,
    private elRef: ElementRef,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {
    this.paperWidth = data.paperWidth;
    this.currentFile = data.currentFile;
    this.currentImageIndex = data.currentImageIndex;
    this.paperType = data.paperType;
    this.currentImage = data.currentImage;
    this.imagePath = data.imagePath;
    this.isMustResize = data.isMustResize;
    this.serverAddress = data.serverAddress;
  }

  ngOnInit() {
    this.isLoading = true;
    this.directionSubscription = this.directionService.direction$.subscribe(direction => {
      this.isRTL = direction === 'rtl';
    });

    this.directionService.isDarkMode$.subscribe(isDarkMode => {
      this.isDarkMode = isDarkMode;
    });

    // set DPI if undefined
    if (this.currentImage.origImageDPI && this.currentImage.origImageDPI > 0) {
      this.asumedDPI = this.currentImage.origImageDPI;
      this.isDPIKnown = true;
    }

    // find format
    this.format = this.currentFile.fileName.split('.').pop();
    this.isVectoric = false;
    if ((this.currentImage.origImageDPI === 0 || !this.currentImage.origImageDPI) && !(this.format === 'jpeg' || this.format === 'jpg' || this.format === 'png')) {
      this.isVectoric = true;
    }

    // calc maximum factor
    if (this.currentImage.origImageHeight < this.currentImage.origImageWidth) {
      // height is smaller
      const maxNewFactorSuggested = 100 * this.paperWidth / (this.currentImage.origImageHeight / 300 * 2.54);
      if (maxNewFactorSuggested < 400) {
        if (!this.isMustResize) {
          this.resizeNewFactor = this.roundDownOneDecimal((this.currentImage.imageWidth / this.currentImage.origImageWidth) * 100);
          this.maxNewFactor = this.roundDownOneDecimal(maxNewFactorSuggested);
        } else {
          this.resizeNewFactor = this.roundDownOneDecimal(((this.paperWidth * 300 / 2.54) / this.currentImage.imageComHeight) * 100);
          this.maxNewFactor = this.roundDownOneDecimal(100 * this.paperWidth / (this.currentImage.origImageHeight / 300 * 2.54));
        }
      } else {
        if (!this.isMustResize) {
          this.resizeNewFactor = this.roundDownOneDecimal((this.currentImage.imageWidth / this.currentImage.origImageWidth) * 100);
          this.maxNewFactor = 400;
        } else {
          this.resizeNewFactor = this.roundDownOneDecimal(((this.paperWidth * 300 / 2.54) / this.currentImage.imageComWidth) * 100);
          this.maxNewFactor = this.roundDownOneDecimal(100 * this.paperWidth / (this.currentImage.origImageHeight / 300 * 2.54));
        }
      }
    } else {
      // width is smaller
      const maxNewFactorSuggested = 100 * this.paperWidth / (this.currentImage.origImageWidth / 300 * 2.54);
      if (maxNewFactorSuggested < 400) {
        if (!this.isMustResize) {
          this.maxNewFactor = this.roundDownOneDecimal(maxNewFactorSuggested);
        } else {
          this.maxNewFactor = this.roundDownOneDecimal(100 * this.paperWidth / (this.currentImage.origImageWidth / 300 * 2.54));
        }
      } else {
        if (!this.isMustResize) {
          this.maxNewFactor = 400;
        } else {
          this.maxNewFactor = this.roundDownOneDecimal(100 * this.paperWidth / (this.currentImage.origImageWidth / 300 * 2.54));
        }
      }
    }

    this.setResizePreview();

    this.maxWidthLength = (this.maxNewFactor / 100) * (this.currentImage.origImageWidth / 300 * 2.54);
    this.maxHeightLength = (this.maxNewFactor / 100) * (this.currentImage.origImageHeight / 300 * 2.54);
  }

  resizeImage() {
    // DOR NEW TASK!
    console.log('DOR NEW TASK! | RESIZE PLOTTER FILE!');
    console.log('DOR (1) | plz sent to RESIZE this file: ', this.currentImage);
    console.log('DOR (2) | of index: ', this.currentImageIndex);
    console.log('DOR (3) | in file', this.currentFile);
    console.log('DOR (4) | with scale factor of', this.roundDownOneDecimal(this.resizeNewFactor), '%');

    this.closeResizeDialog()
  }

  closeResizeDialog() {
    this.dialogService.onCloseResizeDialog();
    // this.onCloseResizeDialogEvent.emit();
  }

  roundDown(num: number): number {
    return Math.ceil(num);
  }

  roundDownOneDecimal(num: number): number {
    return Math.ceil(num * 10) / 10;
  }

  jumpPercent(percent: number) {
    this.resizeNewFactor = percent;
  }

  getUserName() {
    return localStorage.getItem('userName');
  }

  setResizePreview() {
    //  gradient
    const resizeSlider: HTMLElement = this.elRef.nativeElement.querySelector('.mdc-slider__track--active');
    const dpi = this.asumedDPI;
    resizeSlider.style.background = `linear-gradient(-90deg, var(--zx-green) 0%, var(--zx-green) ${(400 / this.maxNewFactor) * (120 / 400 * 100) * dpi / 300}%, var(--zx-orange) ${(400 / this.maxNewFactor) * (135 / 400 * 100) * dpi / 300}%, var(--zx-orange) ${(400 / this.maxNewFactor) * (220 / 400 * 100) * dpi / 300}%, var(--zx-red) ${(400 / this.maxNewFactor) * (235 / 400 * 100) * dpi / 300}%, var(--zx-red) 100%)`;

    // image
    const imageCom = this.elRef.nativeElement.querySelector('#zx-resize-image-com');
    const imageComWidth = imageCom.offsetWidth;
    const imageComHeight = imageCom.offsetHeight - 50;
    const realImageWidth = this.currentImage.origImageWidth;
    const realImageHeight = this.currentImage.origImageHeight;
    const image = this.elRef.nativeElement.querySelector('#zx-resize-image');
    const resizeInputConSide = this.elRef.nativeElement.querySelector('#zx-resize-input-con-side');
    const resizeInputConTop = this.elRef.nativeElement.querySelector('#zx-resize-input-con-top');
    if (imageComWidth / imageComHeight < realImageWidth / realImageHeight) {
      // height is bigger
      image.style.height = `${imageComHeight * (realImageHeight / realImageWidth) * (imageComWidth / imageComHeight)}px`;
      image.style.width = `${imageComWidth}px`;
      resizeInputConSide.style.height = `${imageComHeight * (realImageHeight / realImageWidth) * (imageComWidth / imageComHeight)}px`;
      resizeInputConTop.style.width = `${imageComWidth}px`;
    } else {
      // width is bigger
      image.style.height = `${imageComHeight}px`;
      image.style.width = `${imageComWidth * (realImageWidth / realImageHeight) * (imageComHeight / imageComWidth)}px`;
      resizeInputConSide.style.height = `${imageComHeight}px`;
      resizeInputConTop.style.width = `${imageComWidth * (realImageWidth / realImageHeight) * (imageComHeight / imageComWidth)}px`;
    }

    // move the nums
    const numbersCon = this.elRef.nativeElement.querySelector('#zx-numbers-con');
    const numbersConWidth = numbersCon.offsetWidth;

    const num1 = this.elRef.nativeElement.querySelector('#num-50');
    const num50 = this.elRef.nativeElement.querySelector('#num-50');
    const num100 = this.elRef.nativeElement.querySelector('#num-100');
    const num150 = this.elRef.nativeElement.querySelector('#num-150');
    const num200 = this.elRef.nativeElement.querySelector('#num-200');
    const num250 = this.elRef.nativeElement.querySelector('#num-250');
    const num300 = this.elRef.nativeElement.querySelector('#num-300');
    const num350 = this.elRef.nativeElement.querySelector('#num-350');
    const num400 = this.elRef.nativeElement.querySelector('#num-400');

    const moveValue = (numbersConWidth / 8) * ((400 / this.maxNewFactor) - 1);

    const num1Width = num1.offsetWidth;
    const num50Width = num50.offsetWidth;
    const num100Width = num100.offsetWidth;
    const num150Width = num150.offsetWidth;
    const num200Width = num200.offsetWidth;
    const num250Width = num250.offsetWidth;
    const num300Width = num300.offsetWidth;
    const num350Width = num350.offsetWidth;
    const num400Width = num400.offsetWidth;

    num1.style.transform = `translateX(-${0 - (num1Width / 2)}px)`;
    num50.style.transform = `translateX(-${moveValue - (num50Width / 2)}px)`;
    num100.style.transform = `translateX(-${(moveValue * 2) - (num100Width / 2)}px)`;
    num150.style.transform = `translateX(-${(moveValue * 3) - (num150Width / 2)}px)`;
    num200.style.transform = `translateX(-${(moveValue * 4) - (num200Width / 2)}px)`;
    num250.style.transform = `translateX(-${(moveValue * 5) - (num250Width / 2)}px)`;
    num300.style.transform = `translateX(-${(moveValue * 6) - (num300Width / 2)}px)`;
    num350.style.transform = `translateX(-${(moveValue * 7) - (num350Width / 2)}px`;
    num400.style.transform = `translateX(-${(moveValue * 8) - (num400Width / 2)}px`;
  }

  // roundResizeNewFactor
  // get
  get roundResizeNewFactor() {
    if (this.resizeNewFactor < this.maxNewFactor) {
      return this.roundDownOneDecimal(this.resizeNewFactor);
    } else {
      return this.roundDownOneDecimal(this.maxNewFactor);
    }
  }
  // set
  set roundResizeNewFactor(value: number) {
    const newValue = this.roundDownOneDecimal(value);
    this.resizeNewFactor = newValue > this.maxNewFactor ? this.maxNewFactor : newValue;
  }

  // calculatedHeightValue
  // get
  get calculatedHeightValue() {
    if (this.resizeNewFactor < this.maxNewFactor) {
      return this.roundDownOneDecimal(this.resizeNewFactor * this.currentImage.origImageHeight / 300 * 2.54 / 100);
    } else {
      return this.roundDownOneDecimal(this.maxNewFactor * this.currentImage.origImageHeight / 300 * 2.54 / 100);
    }
  }
  // set
  set calculatedHeightValue(value: number) {
    const newValue = this.roundDownOneDecimal(value / this.currentImage.origImageHeight * 300 / 2.54 * 100);
    this.resizeNewFactor = newValue > this.maxNewFactor ? this.maxNewFactor : newValue;
  }

  // calculatedWidthValue
  // get
  get calculatedWidthValue() {
    if (this.resizeNewFactor < this.maxNewFactor) {
      return this.roundDownOneDecimal(this.resizeNewFactor * this.currentImage.origImageWidth / 300 * 2.54 / 100);
    } else {
      return this.roundDownOneDecimal(this.maxNewFactor * this.currentImage.origImageWidth / 300 * 2.54 / 100);
    }
  }
  // set
  set calculatedWidthValue(value: number) {
    const newValue = this.roundDownOneDecimal(value / this.currentImage.origImageWidth * 300 / 2.54 * 100);
    this.resizeNewFactor = newValue > this.maxNewFactor ? this.maxNewFactor : newValue;
  }

  scaleByMax(value: number) {
    return this.roundDown(value * (this.maxNewFactor / 400));
  }

  onWidthBlur(event: any) {
    this.calculatedWidthValue = parseFloat((event.target as HTMLInputElement).value);
  }

  onHeightBlur(event: any) {
    this.calculatedHeightValue = parseFloat((event.target as HTMLInputElement).value);
  }

  ngOnDestroy() {
    this.directionSubscription.unsubscribe();
  }
}
