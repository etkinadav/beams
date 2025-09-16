import { BrowserModule } from "@angular/platform-browser";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { NgModule } from "@angular/core";
import { HttpClient, HttpClientModule, HTTP_INTERCEPTORS } from "@angular/common/http";

import { AppComponent } from "./app.component";
import { AppRoutingModule } from "./app-routing.module";
import { AuthInterceptor } from "./auth/auth-interceptor";
import { ErrorInterceptor } from "./error-interceptor";
import { ErrorComponent } from "./error/error.component";
import { AngularMaterialModule } from "./angular-material.module";

import { ChoosePrintingSystemComponent } from "./main-section/choose-printing-system/choose-printing-system.component"
import { ProductMiniPreviewComponent } from "./main-section/choose-printing-system/product-mini-preview/product-mini-preview.component"
import { ChooseBranchComponent } from "./main-section/choose-branch/choose-branch.component"
import { ChooseProductComponent } from "./main-section/choose-product/choose-product.component"
import { MainNavComponent } from './main-nav/main-nav.component';
import { NavigateDropdownComponent } from "./main-section/settings-area/navigate-dropdown/navigate-dropdown.component";
import { NavigationToBranchesComponent } from "./main-section/settings-area/navigate-dropdown/navigation-to-branches/navigation-to-branches.component";
import { QrLinkComponent } from "./main-section/qr-link/qr-link.component"

import { BidiModule } from "@angular/cdk/bidi";

import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { PreloginComponent } from "./auth/prelogin/prelogin.component";
import { SocialComponent } from "./auth/social/social.component";
import { TAndCComponent } from "./main-section/legal/t-and-c/t-and-c.component";
import { PrivacyPolicyComponent } from "./main-section/legal/privacy-policy/privacy-policy.component";

import { BranchesModule } from "./super-management/branch/branches.module";
import { ProductsModule } from "./super-management/product/products.module";
import { UsersModule } from "./super-management/user/users.module";
import { PapersModule } from "./super-management/paper/papers.module";

import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";

import { RightPlaceComponent } from "./dialog/right-place/right-place.component";
import { ImagePreviewComponent } from "./dialog/image-preview/image-preview.component";
import { ApplyToAllComponent } from "./dialog/apply-to-all/apply-to-all.component";
import { ResizeComponent } from "./dialog/resize/resize.component";
import { OrderSummaryComponent } from "./dialog/order-summary/order-summary.component";
import { DeleteOrderComponent } from "./dialog/delete-order/delete-order.component";
import { DeleteUserComponent } from "./dialog/delete-user/delete-user.component";
import { AddPointsComponent } from "./dialog/add-points/add-points.component";
import { CloseBranchComponent } from "./dialog/close-branch/close-branch.component";
import { PrintingTableComponent } from "./main-section/printing-table/printing-table.component";
import { PhPrintingTableComponent } from "./main-section/ph-printing-table/ph-printing-table.component";
import { NavigationFromPrintingTableComponent } from "./main-section/settings-area/navigate-dropdown/navigation-from-printingtable/navigation-from-printingtable.component";
import { NavigationFromPrinterManigmentComponent } from "./super-management/printer/navigation-from-printer-manigment/navigation-from-printer-manigment.component";
import { MyOrdersComponent } from "./other-pages/my-orders/my-orders.component";
import { HomeComponent } from "./other-pages/home/home.component";
import { MyProfileComponent } from "./other-pages/my-profile/my-profile.component";
import { PrintingQueComponent } from "./other-pages/printing-que/printing-que.component";
import { QAndAComponent } from "./other-pages/q-and-a/q-and-a.component";
import { PhoneComponent } from "./dialog/phone/phone.component";
import { CopyScanComponent } from "./dialog/scan-copy/scan-copy.component";
import { FixProductsComponent } from "./dialog/fix-products/fix-products.component";
import { PropertyExplainComponent } from "./dialog/property-explain/property-explain.component";
import { StationScreenComponent } from "./super-management/station-screen/station-screen.component";
import { PrinterNumberComponent } from "./dialog/printer-number/printer-number.component"
import { PendingOrderComponent } from "./other-pages/pending-order/pending-order.component";
import { TooltipContentComponent } from "./main-section/printing-table/tooltips/paper-tooltip.component";
import { PrinterComponent } from "./super-management/printer/printer.component";
import { SuCloseBranchComponent } from "./dialog/su-close-branch/su-close-branch.component";
import { SuEditUserComponent } from "./dialog/su-edit-user/su-edit-user.component";


import { FileUploadModule } from 'ng2-file-upload';
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { ThreejsBoxComponent } from './threejs-box/threejs-box.component';
import { ThreejsBoxModule } from './threejs-box/threejs-box.module';

@NgModule({
  declarations: [
    AppComponent,
    ErrorComponent,
    MainNavComponent,
    ChoosePrintingSystemComponent,
    ProductMiniPreviewComponent,
    ChooseBranchComponent,
    ChooseProductComponent,
    PrintingTableComponent,
    PhPrintingTableComponent,
    NavigateDropdownComponent,
    NavigationToBranchesComponent,
    NavigationFromPrintingTableComponent,
    NavigationFromPrinterManigmentComponent,
    QrLinkComponent,
    MyOrdersComponent,
    HomeComponent,
    MyProfileComponent,
    PrintingQueComponent,
    QAndAComponent,
    PreloginComponent,
    SocialComponent,
    TAndCComponent,
    PrivacyPolicyComponent,
    RightPlaceComponent,
    PhoneComponent,
    CopyScanComponent,
    FixProductsComponent,
    SuCloseBranchComponent,
    PropertyExplainComponent,
    StationScreenComponent,
    ImagePreviewComponent,
    ApplyToAllComponent,
    ResizeComponent,
    OrderSummaryComponent,
    DeleteOrderComponent,
    DeleteUserComponent,
    AddPointsComponent,
    CloseBranchComponent,
    PrinterNumberComponent,
    PendingOrderComponent,
    TooltipContentComponent,
    PrinterComponent,
    SuEditUserComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    HttpClientModule,
    AngularMaterialModule,
    BidiModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: (http: HttpClient) =>
          new TranslateHttpLoader(http, './assets/i18n/', `.json?v=${new Date().getTime()}`),
        deps: [HttpClient],
      },
    }),
    BranchesModule,
    ProductsModule,
    UsersModule,
    PapersModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    FileUploadModule,
    MatProgressBarModule,
    // SocialLoginModule,
    // GoogleSigninButtonModule
    ThreejsBoxModule,
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
    { provide: 'Direction', useValue: 'ltr' }, // or 'rtl' depending on default direction
    // {
    //   provide: 'SocialAuthServiceConfig',
    //   useValue: {
    //     autoLogin: false,
    //     providers: [
    //       {
    //         id: GoogleLoginProvider.PROVIDER_ID,
    //         provider: new GoogleLoginProvider(
    //           '101384619367-jrfc9unrqatdfnlh5rjre0uu4sl5anc8.apps.googleusercontent.com'
    //         )
    //       },
    //       {
    //         id: FacebookLoginProvider.PROVIDER_ID,
    //         provider: new FacebookLoginProvider('415210939050964')
    //       }
    //     ],
    //     onError: (err) => {
    //       console.error(err);
    //     }
    //   } as SocialAuthServiceConfig,
    // }
  ],
  bootstrap: [AppComponent],
})
export class AppModule { }

export function HttpLoaderFactory(http: HttpClient): TranslateHttpLoader {
  return new TranslateHttpLoader(http);
}
