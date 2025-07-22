import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { ChoosePrintingSystemComponent } from "./main-section/choose-printing-system/choose-printing-system.component"
import { ChooseBranchComponent } from "./main-section/choose-branch/choose-branch.component"
import { ChooseProductComponent } from "./main-section/choose-product/choose-product.component"

import { SocialComponent } from "./auth/social/social.component";

import { AuthGuard } from "./auth/auth.guard";
import { TAndCComponent } from "./main-section/legal/t-and-c/t-and-c.component"
import { PrivacyPolicyComponent } from "./main-section/legal/privacy-policy/privacy-policy.component"

import { BranchListComponent } from "./super-management/branch/branch-list/branch-list.component";
import { BranchCreateComponent } from "./super-management/branch/branch-create/branch-create.component";
import { PrintingTableComponent } from "./main-section/printing-table/printing-table.component";
import { PhPrintingTableComponent } from "./main-section/ph-printing-table/ph-printing-table.component";
import { QrLinkComponent } from "./main-section/qr-link/qr-link.component";

import { ProductListComponent } from "./super-management/product/product-list/product-list.component";
import { ProductCreateComponent } from "./super-management/product/product-create/product-create.component";

import { MyOrdersComponent } from "./other-pages/my-orders/my-orders.component";
import { HomeComponent } from "./other-pages/home/home.component";
import { MyProfileComponent } from "./other-pages/my-profile/my-profile.component";
import { PrintingQueComponent } from "./other-pages/printing-que/printing-que.component";
import { QAndAComponent } from "./other-pages/q-and-a/q-and-a.component";
import { PendingOrderComponent } from "./other-pages/pending-order/pending-order.component";

import { UserListComponent } from "./super-management/user/user-list/user-list.component";
import { UserEditComponent } from "./super-management/user/user-edit/user-edit.component";
import { PaperListComponent } from "./super-management/paper/paper-list/paper-list.component";
import { PaperCreateComponent } from "./super-management/paper/paper-create/paper-create.component";
import { StationScreenComponent } from "./super-management/station-screen/station-screen.component";

import { PrinterComponent } from "./super-management/printer/printer.component";

const routes: Routes = [
    { path: "", component: ChoosePrintingSystemComponent },

    { path: "branch", component: ChooseBranchComponent },
    { path: "product", component: ChooseProductComponent },
    { path: "print", component: PrintingTableComponent },
    { path: "phprint", component: PhPrintingTableComponent },
    { path: "home", component: HomeComponent },
    { path: "myorders/:userId", component: MyOrdersComponent },
    { path: "myprofile/:userId", component: MyProfileComponent },
    { path: "queue/:branch", component: PrintingQueComponent },
    { path: "myprofile/:userId/credit", component: MyProfileComponent },
    { path: "qanda", component: QAndAComponent },
    { path: "x/:service/:orderId", component: PendingOrderComponent },
    { path: "tandc", component: TAndCComponent },
    { path: "pp", component: PrivacyPolicyComponent },
    { path: "qr/:service/:branch", component: QrLinkComponent },

    { path: "social", component: SocialComponent },

    { path: "branchlist", component: BranchListComponent },
    { path: "branchcreate", component: BranchCreateComponent },
    { path: "branchedit/:branchId", component: BranchCreateComponent },

    { path: "productlist", component: ProductListComponent },
    { path: "productcreate", component: ProductCreateComponent },
    { path: "productedit/:productId", component: ProductCreateComponent },

    { path: "userlist", component: UserListComponent },
    { path: "useredit/:userId", component: UserEditComponent },

    { path: "paperlist", component: PaperListComponent },
    { path: "papercreate", component: PaperCreateComponent },
    { path: "paperedit/:paperId", component: PaperCreateComponent },

    { path: "screen/:service/:branch", component: StationScreenComponent },
    { path: "screen", component: StationScreenComponent },

    { path: "printer/:service/:branch", component: PrinterComponent },

    // errors:
    { path: '**', redirectTo: '/' },
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule],
    providers: [AuthGuard]
})
export class AppRoutingModule { }
