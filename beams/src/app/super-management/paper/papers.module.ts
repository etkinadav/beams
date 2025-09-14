import { NgModule } from "@angular/core";
import { ReactiveFormsModule } from "@angular/forms";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";

import { PaperCreateComponent } from "./paper-create/paper-create.component";
import { PaperListComponent } from "./paper-list/paper-list.component";
import { AngularMaterialModule } from "../../angular-material.module";

@NgModule({
    declarations: [PaperCreateComponent, PaperListComponent],
    imports: [
        CommonModule,
        ReactiveFormsModule,
        AngularMaterialModule,
        RouterModule
    ]
})
export class PapersModule { }
