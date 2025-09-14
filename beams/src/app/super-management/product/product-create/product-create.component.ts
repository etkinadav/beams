import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from "@angular/core";
import { FormGroup, FormControl, Validators } from "@angular/forms";
import { ActivatedRoute, ParamMap } from "@angular/router";
import { Router } from "@angular/router";

import { ProductsService } from "../products.service";
import { Product } from "../product.model";
import { mimeType } from "./mime-type.validator";
import { Subscription } from "rxjs";
import { AuthService } from "src/app/auth/auth.service";

import { PapersService } from "../../paper/papers.service";

@Component({
  selector: "app-product-create",
  templateUrl: "./product-create.component.html",
  styleUrls: ["./product-create.component.css"],
  host: {
    class: 'fill-screen'
  }
})

export class ProductCreateComponent implements OnInit, OnDestroy {
  @ViewChild('hiddenSubmitBtn') hiddenSubmitBtn: ElementRef;
  enteredTitle = "";
  enteredContent = "";
  product: any;
  isLoading = false;
  form: FormGroup;
  imagePreview: string;
  private mode = "create";
  isModeEdit = false;
  private productId: string;
  private authStatusSub: Subscription;
  availablePaperTypes: any[];

  constructor(
    public productsService: ProductsService,
    public route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private papersService: PapersService,
  ) { }

  ngOnInit() {
    this.authStatusSub = this.authService
      .getAuthStatusListener()
      .subscribe(
        authStatus => {
          this.isLoading = false;
        }
      );
    this.papersService.getAllPapers()
      .subscribe((papers: any[]) => {
        this.availablePaperTypes = papers;
      });
    this.form = new FormGroup({
      name: new FormControl(null, {
        validators: [Validators.required]
      }),
    });
    this.route.paramMap.subscribe((paramMap: ParamMap) => {
      if (paramMap.has("productId")) {
        this.mode = "edit";
        this.isModeEdit = true;
        this.productId = paramMap.get("productId");
        this.isLoading = true;
        this.productsService.getProduct(this.productId).subscribe(productData => {
          this.isLoading = false;
          this.product = {
            id: productData._id,
            name: productData.name,
          };
          this.form.setValue({
            name: this.product.name,
          });
          // this.imagePreview = this.product.productLogo;
        });
      } else {
        this.mode = "create";
        this.isModeEdit = false;
        this.productId = null;
      }
    });
  }

  // onImagePicked(event: Event) {
  //   const file = (event.target as HTMLInputElement).files[0];
  //   this.form.patchValue({ image: file });
  //   this.form.get("image").updateValueAndValidity();
  //   const reader = new FileReader();
  //   reader.onload = () => {
  //     this.imagePreview = reader.result as string;
  //   };
  //   reader.readAsDataURL(file);
  // }

  onSaveProduct() {
    if (this.form.invalid) {
      console.log("form is invalid!");
      return;
    }
    this.isLoading = true;
    const selectedPapers = this.form.value.papers;
    console.log("selectedPapers");
    console.log(selectedPapers);
    if (this.mode === "create") {
      this.productsService.addProduct(
        this.form.value.name,
      );
    } else {
      this.productsService.updateProduct(
        this.productId,
        this.form.value.name,
      );
    }
    this.form.reset();
  }

  backToProducts() {
    this.router.navigate(['/productlist']);
  }

  ngOnDestroy() {
    this.authStatusSub.unsubscribe();
  }

  toProductsList() {
    this.router.navigate(["/productlist"]);
  }

  // Trigger click on the hidden submit button
  submitForm() {
    if (this.hiddenSubmitBtn) {
      (this.hiddenSubmitBtn.nativeElement as HTMLButtonElement).click();
    }
  }
}
