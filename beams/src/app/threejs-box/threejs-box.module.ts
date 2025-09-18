import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ThreejsBoxComponent } from './threejs-box.component';
import { AngularMaterialModule } from '../angular-material.module';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
    declarations: [ThreejsBoxComponent],
    imports: [CommonModule, FormsModule, AngularMaterialModule, TranslateModule],
    exports: [ThreejsBoxComponent]
})
export class ThreejsBoxModule { }
