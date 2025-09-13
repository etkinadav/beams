import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ThreejsBoxComponent } from './threejs-box.component';
import { AngularMaterialModule } from '../angular-material.module';

@NgModule({
    declarations: [ThreejsBoxComponent],
    imports: [CommonModule, FormsModule, AngularMaterialModule],
    exports: [ThreejsBoxComponent]
})
export class ThreejsBoxModule { }
