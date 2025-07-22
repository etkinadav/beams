import { NgModule } from "@angular/core";
import { ReactiveFormsModule } from "@angular/forms";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";

import { BranchCreateComponent } from "./branch-create/branch-create.component";
import { BranchListComponent } from "./branch-list/branch-list.component";
import { AngularMaterialModule } from "../../angular-material.module";

@NgModule({
    declarations: [BranchCreateComponent, BranchListComponent],
    imports: [
        CommonModule,
        ReactiveFormsModule,
        AngularMaterialModule,
        RouterModule
    ]
})
export class BranchesModule { }
