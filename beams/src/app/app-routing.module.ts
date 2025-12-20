import { ModifyProductComponent } from './main-section/modify-product/modify-product.component';
import { NgModule } from "@angular/core";
import { RouterModule, Routes, UrlMatchResult, UrlSegment } from "@angular/router";
import { ChooseProductComponent } from "./main-section/choose-product/choose-product.component"

import { SocialComponent } from "./auth/social/social.component";

import { AuthGuard } from "./auth/auth.guard";
import { TAndCComponent } from "./main-section/legal/t-and-c/t-and-c.component"
import { PrivacyPolicyComponent } from "./main-section/legal/privacy-policy/privacy-policy.component"



import { MyOrdersComponent } from "./other-pages/my-orders/my-orders.component";
import { MyProfileComponent } from "./other-pages/my-profile/my-profile.component";
import { QAndAComponent } from "./other-pages/q-and-a/q-and-a.component";
import { ShoppingCartComponent } from "./main-nav/shopping-cart/shopping-cart.component";
import { ThreedPlannerComponent } from "./other-pages/threed-planner/threed-planner.component";
import { LandbotComponent } from "./other-pages/landbot/landbot.component";



// Temporary: redirect everything to /threedplanner while keeping the route available.
const redirectAllButThreedplanner = (segments: UrlSegment[]): UrlMatchResult | null => {
    if (segments.length === 0) {
        return { consumed: [] };
    }

    if (segments[0].path === 'threedplanner' || segments[0].path === 'landbot') {
        return null;
    }

    return { consumed: segments };
};

const routes: Routes = [
    { path: "threedplanner", component: ThreedPlannerComponent },
    { path: "landbot", component: LandbotComponent },
    { matcher: redirectAllButThreedplanner, redirectTo: '/threedplanner' },

    // Existing routes remain below for when the temporary redirect is removed
    { path: "", component: ChooseProductComponent },

    { path: "beams", component: ModifyProductComponent },
    { path: "shopping-cart", component: ShoppingCartComponent },

    { path: "myorders/:userId", component: MyOrdersComponent },
    { path: "myprofile/:userId", component: MyProfileComponent },
    { path: "myprofile/:userId/credit", component: MyProfileComponent },
    { path: "qanda", component: QAndAComponent },
    { path: "tandc", component: TAndCComponent },
    { path: "pp", component: PrivacyPolicyComponent },

    { path: "social", component: SocialComponent },

    // errors:
    { path: '**', redirectTo: '/threedplanner' },
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule],
    providers: [AuthGuard]
})
export class AppRoutingModule { }
