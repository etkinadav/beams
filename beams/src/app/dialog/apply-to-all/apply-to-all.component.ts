import { Component, OnInit, OnDestroy, ElementRef, Inject } from '@angular/core';
import { Subscription } from 'rxjs';

import { DirectionService } from '../../direction.service';
import { DialogService } from 'src/app/dialog/dialog.service';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-apply-to-all',
  templateUrl: './apply-to-all.component.html',
  styleUrls: ['./apply-to-all.component.css'],
  host: {
    class: 'fill-screen-modal-apply-to-all'
  }
})
export class ApplyToAllComponent implements OnInit, OnDestroy {
  isRTL: boolean = true;
  private directionSubscription: Subscription;
  isDarkMode: boolean = false;

  isLoading: boolean = false;

  printingService: string;
  isOriginalPossible: boolean;
  printSettings: any;
  paperWidth: number;
  currentFile: any;
  currentImageIndex: number;
  paperType: string;

  constructor(
    private directionService: DirectionService,
    private dialogService: DialogService,
    private elRef: ElementRef,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {
    this.printingService = data.printingService;
    this.isOriginalPossible = data.isOriginalPossible;
    this.printSettings = data.printSettings;
    this.paperWidth = data.paperWidth;
    this.currentFile = data.currentFile;
    this.currentImageIndex = data.currentImageIndex;
    this.paperType = data.paperType;
  }

  async ngOnInit() {
    this.isLoading = true;
    this.directionSubscription = this.directionService.direction$.subscribe(direction => {
      this.isRTL = direction === 'rtl';
    });

    this.directionService.isDarkMode$.subscribe(isDarkMode => {
      this.isDarkMode = isDarkMode;
    });
  }

  closeApplyToAllDialog() {
    this.dialogService.onCloseApplyToAllDialog();
  }

  ngOnDestroy() {
    this.directionSubscription.unsubscribe();
  }
}
