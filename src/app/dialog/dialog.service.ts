import { Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Subject } from 'rxjs';

import { PreloginComponent } from '../auth/prelogin/prelogin.component';
import { RightPlaceComponent } from './right-place/right-place.component';
import { ImagePreviewComponent } from './image-preview/image-preview.component';
import { ApplyToAllComponent } from './apply-to-all/apply-to-all.component';
import { OrderSummaryComponent } from './order-summary/order-summary.component';
import { DeleteOrderComponent } from './delete-order/delete-order.component';
import { DeleteUserComponent } from './delete-user/delete-user.component';
import { AddPointsComponent } from './add-points/add-points.component';
import { CloseBranchComponent } from './close-branch/close-branch.component';
import { ResizeComponent } from './resize/resize.component';
import { PhoneComponent } from './phone/phone.component';
import { CopyScanComponent } from './scan-copy/scan-copy.component';
import { FixProductsComponent } from './fix-products/fix-products.component';
import { PropertyExplainComponent } from './property-explain/property-explain.component';
import { PrinterNumberComponent } from './printer-number/printer-number.component';
import { SuCloseBranchComponent } from './su-close-branch/su-close-branch.component';
import { SuEditUserComponent } from './su-edit-user/su-edit-user.component';

@Injectable({
  providedIn: 'root'
})
export class DialogService {
  private dialogLoginRef: MatDialogRef<PreloginComponent> | null = null;
  private dialogRightPlaceRef: MatDialogRef<RightPlaceComponent> | null = null;
  private dialogImagePreviewRef: MatDialogRef<ImagePreviewComponent> | null = null;
  private dialogApplyToAllRef: MatDialogRef<ApplyToAllComponent> | null = null;
  private dialogResizeRef: MatDialogRef<ResizeComponent> | null = null;
  private dialogOrderSummaryRef: MatDialogRef<OrderSummaryComponent> | null = null;
  private dialogDeleteOrderRef: MatDialogRef<DeleteOrderComponent> | null = null;
  private dialogDeleteUserRef: MatDialogRef<DeleteUserComponent> | null = null;
  private dialogAddPointsRef: MatDialogRef<AddPointsComponent> | null = null;
  private dialogCloseBranchRef: MatDialogRef<CloseBranchComponent> | null = null;
  private closeResizeDialogSource = new Subject<void>();
  closeResizeDialog$ = this.closeResizeDialogSource.asObservable();
  private dialogPhoneRef: MatDialogRef<PhoneComponent> | null = null;
  private dialogCopyScanRef: MatDialogRef<CopyScanComponent> | null = null;
  private dialogFixProductsRef: MatDialogRef<FixProductsComponent> | null = null;
  private dialogPropertyExplainRef: MatDialogRef<PropertyExplainComponent> | null = null;
  private dialogPrinterNumberRef: MatDialogRef<PrinterNumberComponent> | null = null;
  private dialogSuCloseBranchRef: MatDialogRef<SuCloseBranchComponent> | null = null;
  private dialogSuEditUserRef: MatDialogRef<SuEditUserComponent> | null = null;

  constructor(
    private dialog: MatDialog,
  ) { }

  // Login Dialog
  onOpenLoginDialog(printingService: string = '', branch: string = ''): void {
    if (printingService && printingService !== '' && branch && branch !== '') {
      localStorage.setItem("printingService", printingService);
      localStorage.setItem("branch", branch);
    }
    this.dialogLoginRef = this.dialog.open(PreloginComponent, {
      panelClass: 'zx-login-dialog',
    });
  }

  onCloseLoginDialog(): void {
    this.dialogLoginRef.close();
  }

  // Right Place Dialog
  onOpenRightPlaceDialog(): void {
    this.dialogRightPlaceRef = this.dialog.open(RightPlaceComponent, {
      panelClass: 'zx-rightplace-dialog',
    });
  }

  onCloseRightPlaceDialog(): void {
    this.dialogRightPlaceRef.close();
  }

  // Image Preview Dialog
  onOpenImagePreviewDialog(
    printingService: string,
    currentFile: any,
    currentImage: any,
    realBranch: any,
    selectedPaper: any,
    cropRatioValue: boolean,
  ): void {
    this.dialogImagePreviewRef = this.dialog.open(ImagePreviewComponent, {
      panelClass: 'zx-image-preview-dialog',
      data: {
        printingService: printingService,
        currentFile: currentFile,
        currentImage: currentImage,
        realBranch: realBranch,
        selectedPaper: selectedPaper,
        cropRatioValue: cropRatioValue,
      }
    });
  }

  onCloseImagePreviewDialog(): void {
    this.dialogImagePreviewRef.close();
  }

  // Apply To All Dialog
  onOpenApplyToAllDialog(
    printingService: string,
    isOriginalPossible: boolean,
    printSettings: any,
    paperWidth: number,
    currentFile: any,
    currentImageIndex: number,
    paperType: string,
  ): void {
    this.dialogApplyToAllRef = this.dialog.open(ApplyToAllComponent, {
      panelClass: 'zx-login-dialog',
      data: {
        printingService: printingService,
        isOriginalPossible: isOriginalPossible,
        printSettings: printSettings,
        paperWidth: paperWidth,
        currentFile: currentFile,
        currentImageIndex: currentImageIndex,
        paperType: paperType,
      }
    });
  }

  onCloseApplyToAllDialog(): void {
    this.dialogApplyToAllRef.close();
  }

  // Resize Dialog
  onOpenResizeDialog(
    paperWidth: number,
    currentFile: any,
    currentImageIndex: number,
    paperType: string,
    currentImage: any,
    imagePath: string,
    isMustResize: boolean,
    serverAddress: string,
  ): void {
    this.dialogResizeRef = this.dialog.open(ResizeComponent, {
      panelClass: 'zx-resize-dialog',
      data: {
        paperWidth: paperWidth,
        currentFile: currentFile,
        currentImageIndex: currentImageIndex,
        paperType: paperType,
        currentImage: currentImage,
        imagePath: imagePath,
        isMustResize: isMustResize,
        serverAddress: serverAddress,
      }
    });
  }

  onCloseResizeDialog(): void {
    this.closeResizeDialogSource.next();
    this.dialogResizeRef.close();
  }

  // Apply To All Dialog
  onOpenOrderSummaryDialog(
    printingService: string,
    serverAddress: string,
    branchPapers: any,
    files: any,
    branchName: string,
    totalPriceData: any,
    user: any,
    isPendingOrder: boolean = false,
    isAdminOrder: boolean = false,
    branchUnique: number = 0,
    branchID: string = '',
    printerID: string = '',
    orderID: string = '',
    printingCode: number = 0,
    fixProducts: any = null,
  ): void {
    const isIphone = /iPhone/.test(navigator.userAgent);
    let cdialogClass = 'zx-order-summary-dialog';
    if (isIphone) {
      cdialogClass = 'zx-order-summary-dialog-iphone';
    }
    this.dialogOrderSummaryRef = this.dialog.open(OrderSummaryComponent, {
      panelClass: cdialogClass,
      data: {
        printingService: printingService,
        serverAddress: serverAddress,
        branchPapers: branchPapers,
        files: files,
        branchName: branchName,
        totalPriceData: totalPriceData,
        user: user,
        isPendingOrder: isPendingOrder,
        isAdminOrder: isAdminOrder,
        branchUnique: branchUnique,
        branchID: branchID,
        printerID: printerID,
        orderID: orderID,
        printingCode: printingCode,
        fixProducts: fixProducts,
      }
    });
  }

  onCloseOrderSummaryDialog(): void {
    this.dialogOrderSummaryRef.close();
  }

  // delete order
  onOpenDeleteOrderDialog(
    order,
    isSu: boolean = false
  ): void {
    this.dialogDeleteOrderRef = this.dialog.open(DeleteOrderComponent, {
      panelClass: 'zx-printer-number-dialog',
      data: {
        order: order,
        isSu: isSu,
      }
    });
  }

  onCloseDeleteOrderDialog(): void {
    this.dialogDeleteOrderRef.close();
  }

  // delete user
  onOpenDeleteUserDialog(
    user,
  ): void {
    this.dialogDeleteUserRef = this.dialog.open(DeleteUserComponent, {
      panelClass: 'zx-printer-number-dialog',
      data: {
        user: user,
      }
    });
  }

  onCloseDeleteUserDialog(): void {
    this.dialogDeleteUserRef.close();
  }

  // Add Points
  onOpenAddPointsDialog(
    user,
  ): void {
    console.log("user from onOpenAddPointsDialog", user);
    this.dialogAddPointsRef = this.dialog.open(AddPointsComponent, {
      panelClass: 'zx-printer-number-dialog',
      data: {
        user: user,
      }
    });
  }

  onCloseAddPointsDialog(): void {
    this.dialogAddPointsRef.close();
  }

  // Close Branch
  onOpenCloseBranchDialog(service, branch, close_msg): void {
    this.dialogCloseBranchRef = this.dialog.open(CloseBranchComponent, {
      panelClass: 'zx-printer-number-dialog',
      data: {
        service: service,
        branch: branch,
        close_msg: close_msg,
      }
    });
  }

  onCloseCloseBranchDialog(): void {
    this.dialogCloseBranchRef.close();
  }

  // Phone Dialog
  onOpenPhoneDialog(): void {
    this.dialogPhoneRef = this.dialog.open(PhoneComponent, {
      panelClass: 'zx-phone-dialog',
    });
  }

  onClosePhoneDialog(): void {
    this.dialogPhoneRef.close();
  }

  // Scan Copy Dialog
  onOpenScanCopyDialog(expressBranch: any): void {
    this.dialogCopyScanRef = this.dialog.open(CopyScanComponent, {
      panelClass: 'zx-scan-copy-dialog',
      data: {
        expressBranch: expressBranch,
      }
    });
  }

  onCloseScanCopyDialog(): void {
    this.dialogCopyScanRef.close();
  }

  // Fix Products Dialog
  onOpenFixProductsDialog(branchName: string, products: any): void {
    this.dialogFixProductsRef = this.dialog.open(FixProductsComponent, {
      panelClass: 'zx-scan-copy-dialog',
      data: {
        branchName: branchName,
        products: products,
      }
    });
  }

  onCloseFixProductsDialog(): void {
    this.dialogFixProductsRef.close();
  }

  // Property Explain Dialog
  onOpenExplainPropertyDialog(
    property: string,
    printingService: string,
    realBranch: any,
  ): void {
    this.dialogPropertyExplainRef = this.dialog.open(PropertyExplainComponent, {
      panelClass: 'zx-property-explain-dialog',
      data: {
        property: property,
        printingService: printingService,
        realBranch: realBranch,
      }
    });
  }

  onCloseExplainPropertyDialog(): void {
    this.dialogPropertyExplainRef.close();
  }

  // Printer Number Dialog
  onOpenPrinterNumberDialog(): void {
    this.dialogPrinterNumberRef = this.dialog.open(PrinterNumberComponent, {
      panelClass: 'zx-printer-number-dialog',
    });
  }

  onClosePrinterNumberDialog(): void {
    this.dialogPrinterNumberRef.close();
  }


  // Su Close Branch Dialog
  onOpenSuCloseBranchDialog(
    isClose: boolean,
    service: string,
    branch: string,
    close_msg: string,
  ): void {
    this.dialogSuCloseBranchRef = this.dialog.open(SuCloseBranchComponent, {
      panelClass: 'zx-printer-number-dialog',
      data: {
        isClose: isClose,
        service: service,
        branch: branch,
        close_msg: close_msg,
      }
    });
  }

  onCloseSuCloseBranchDialog(): void {
    this.dialogSuCloseBranchRef.close();
  }

  // Su Edit User Dialog
  onOpenSuEditUserDialog(
    user: any,
  ): void {
    this.dialogSuEditUserRef = this.dialog.open(SuEditUserComponent, {
      panelClass: 'zx-printer-number-dialog',
      data: {
        user: user,
      }
    });
  }

  onCloseSuEditUserDialog(): void {
    this.dialogSuEditUserRef.close();
  }

  // =================
}

