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

import { ChooseProductComponent } from "./main-section/choose-product/choose-product.component"
import { ProductMiniPreviewComponent } from "./main-section/choose-product/product-mini-preview/product-mini-preview.component"
import { MainNavComponent } from './main-nav/main-nav.component';

import { BidiModule } from "@angular/cdk/bidi";

import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { PreloginComponent } from "./auth/prelogin/prelogin.component";
import { SocialComponent } from "./auth/social/social.component";
import { TAndCComponent } from "./main-section/legal/t-and-c/t-and-c.component";
import { PrivacyPolicyComponent } from "./main-section/legal/privacy-policy/privacy-policy.component";


import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";

import { DeleteOrderComponent } from "./dialog/delete-order/delete-order.component";
import { DeleteUserComponent } from "./dialog/delete-user/delete-user.component";
import { MyOrdersComponent } from "./other-pages/my-orders/my-orders.component";
import { MyProfileComponent } from "./other-pages/my-profile/my-profile.component";
import { QAndAComponent } from "./other-pages/q-and-a/q-and-a.component";
import { ThreedPlannerComponent } from "./other-pages/threed-planner/threed-planner.component";
import { LandbotComponent } from "./other-pages/landbot/landbot.component";
import { LaundryComponent } from "./other-pages/laundry/laundry.component";
import { RushHourComponent } from "./other-pages/rush-hour/rush-hour.component";
import { AgronomistWizardComponent } from "./agronomist/agronomist-wizard/agronomist-wizard.component";
import { AiPlaceDiscoveryComponent } from "./other-pages/ai-place-discovery/ai-place-discovery.component";
import { GeminiPlanDebugDialogComponent } from "./dialog/gemini-plan-debug-dialog/gemini-plan-debug-dialog.component";
import { PhoneComponent } from "./dialog/phone/phone.component";
import { CopyScanComponent } from "./dialog/scan-copy/scan-copy.component";
import { PropertyExplainComponent } from "./dialog/property-explain/property-explain.component";
import { SuEditUserComponent } from "./dialog/su-edit-user/su-edit-user.component";
import { DeleteCartConfirmationComponent } from "./dialog/delete-cart-confirmation/delete-cart-confirmation.component";
import { ProductEditInfoComponent } from "./dialog/product-edit-info/product-edit-info.component";


import { FileUploadModule } from 'ng2-file-upload';
import { ModifyProductModule } from './main-section/modify-product/modify-product.module';
import { ShoppingCartComponent } from './main-nav/shopping-cart/shopping-cart.component';

@NgModule({
  declarations: [
    AppComponent,
    ErrorComponent,
    MainNavComponent,
    ChooseProductComponent,
    ProductMiniPreviewComponent,
    MyOrdersComponent,
    MyProfileComponent,
    QAndAComponent,
    ThreedPlannerComponent,
    LandbotComponent,
    LaundryComponent,
    RushHourComponent,
    AgronomistWizardComponent,
    AiPlaceDiscoveryComponent,
    GeminiPlanDebugDialogComponent,
    PreloginComponent,
    SocialComponent,
    TAndCComponent,
    PrivacyPolicyComponent,
    PhoneComponent,
    CopyScanComponent,
    PropertyExplainComponent,
    DeleteOrderComponent,
    DeleteUserComponent,
    SuEditUserComponent,
    DeleteCartConfirmationComponent,
    ProductEditInfoComponent,
    ShoppingCartComponent,
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
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    FileUploadModule,
    // SocialLoginModule,
    // GoogleSigninButtonModule
    ModifyProductModule,
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
