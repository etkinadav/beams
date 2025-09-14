import { Injectable } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';

@Injectable({
    providedIn: 'root'
})
export class CreditFormService {
    createForm(user: any): FormGroup {
        return new FormGroup({
            cardNum: new FormControl(null, [Validators.required, this.creditCardValidator]),
            month: new FormControl(null, [Validators.required]),
            year: new FormControl(null, [Validators.required]),
            cardCvv: new FormControl(null, [Validators.required, Validators.minLength(3), Validators.maxLength(4)]),
            cardHolderName: new FormControl(null, [Validators.required, Validators.minLength(3), Validators.maxLength(40)]),
            cardHolderID: new FormControl(null, [Validators.required, Validators.minLength(7), Validators.maxLength(20)]),
            billingEmail: new FormControl(user && user.zCreditInfo && user.zCreditInfo.customerEmail ? user.zCreditInfo.customerEmail : user && user.email, [Validators.minLength(3), Validators.maxLength(40)]),
            cardCustomerName: new FormControl(user && user.zCreditInfo && user.zCreditInfo.customerName ? user.zCreditInfo.customerName : user && user.displayName, [Validators.minLength(3), Validators.maxLength(40)]),
            cardCompanyID: new FormControl(user && user.zCreditInfo && user.zCreditInfo.customerBusinessID ? user.zCreditInfo.customerBusinessID : null, [Validators.minLength(3), Validators.maxLength(12)]),
        });
    }

    creditCardValidator(control: FormControl): { [s: string]: boolean } | null {
        if (!control.value) {
            return null;
        }
        const pattern = /^\d{4}-\d{4}-\d{4}-\d{4}$/;
        if (!control.value.match(pattern)) {
            return { 'invalidCreditCard': true };
        }
        return null;
    }
}
