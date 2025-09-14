import {
  Component,
  OnInit,
  OnDestroy,
  HostListener,
  ElementRef,
  ViewChildren,
  QueryList,
  ChangeDetectorRef,
  AfterViewChecked,
  ViewChild,
  NgZone,
} from '@angular/core';

import { DirectionService } from '../../direction.service';
import { Subscription, interval, BehaviorSubject, Observable, combineLatest, from, of } from 'rxjs';
import { startWith, switchMap, map } from 'rxjs/operators';
import { DataSharingService } from '../data-shering-service/data-sharing.service';
import { Router } from '@angular/router';
import { DialogService } from '../../dialog/dialog.service';
import { TranslateService } from '@ngx-translate/core';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { MatTooltip } from '@angular/material/tooltip';

import { BranchesService } from 'src/app/super-management/branch/branches.service';
import { UsersService } from 'src/app/super-management/user/users.service';
import { FilesService } from './file.service';
import { Direction } from '@angular/cdk/bidi';
import * as _ from 'lodash';

// import { ResizeComponent } from 'src/app/dialog/resize/resize.component';
import { trigger, animate, style, transition, keyframes, state } from '@angular/animations';
import { FileUploader, FileItem } from 'ng2-file-upload';
import { MatSnackBar } from '@angular/material/snack-bar';

import { ProductsService } from 'src/app/super-management/product/products.service';
// 3D
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { Subject } from 'rxjs';
// // 3D

@Component({
  selector: 'app-ph-printing-table',
  templateUrl: './ph-printing-table.component.html',
  styleUrls: ['./ph-printing-table.component.scss'],
  host: {
    class: 'fill-screen'
  },
  animations: [
    trigger('rattleAnimation', [
      transition('* <=> *', [
        animate('1.2s', keyframes([
          style({ transform: 'scale(1)', offset: 0 }),
          style({ transform: 'scale(1.02) rotate(-1deg)', offset: 0.1 }),
          style({ transform: 'scale(1.05) rotate(-2.5deg)', offset: 0.2 }),
          style({ transform: 'scale(1.063) rotate(-5deg)', offset: 0.3 }),
          style({ transform: 'scale(1.04) rotate(-4.5deg)', offset: 0.4 }),
          style({ transform: 'scale(1.01) rotate(-1.5deg)', offset: 0.5 }),
          style({ transform: 'scale(0.98) rotate(3deg)', offset: 0.6 }),
          style({ transform: 'scale(1.03) rotate(2.5deg)', offset: 0.7 }),
          style({ transform: 'scale(1.02) rotate(0.5deg)', offset: 0.8 }),
          style({ transform: 'scale(0.99) rotate(-1deg)', offset: 0.9 }),
          style({ transform: 'scale(1)', offset: 1 })
        ]))
      ]),
      transition(':leave', [
        animate('0s', style({ opacity: 0 }))
      ])
    ]),
    trigger('textAnimation', [
      transition('* <=> *', [
        animate('1.2s', keyframes([
          style({ transform: 'scale(1)', offset: 0 }),
          style({ transform: 'scale(1.005)', offset: 0.1 }),
          style({ transform: 'scale(1.035)', offset: 0.2 }),
          style({ transform: 'scale(1.03)', offset: 0.3 }),
          style({ transform: 'scale(0.995)', offset: 0.4 }),
          style({ transform: 'scale(1)', offset: 0.5 }),
          style({ transform: 'scale(1)', offset: 1 })
        ]))
      ])
    ]),
    trigger('paperAnimation', [
      state('state1', style({ transform: 'scale(1)' })),
      state('state2', style({ transform: 'scale(1)' })),
      transition('state1 => state2', [
        animate('1.3s', keyframes([
          style({ transform: 'scale(1)', offset: 0 }),
          style({ transform: 'scale(1)', offset: 0.2 }),
          style({ transform: 'scale(1.005) rotate(0.23deg)', offset: 0.3 }),
          style({ transform: 'scale(1.042) rotate(0.5deg)', offset: 0.4 }),
          style({ transform: 'scale(1.03) rotate(0.1deg)', offset: 0.5 }),
          style({ transform: 'scale(0.995) rotate(-0.1deg)', offset: 0.6 }),
          style({ transform: 'scale(1)', offset: 0.7 }),
          style({ transform: 'scale(1)', offset: 1 })
        ]))
      ]),
      transition('state2 => state1', [])
    ]),
    trigger('mainBtnAnimation', [
      state('state1', style({ transform: 'scale(1)' })),
      state('state2', style({ transform: 'scale(1)' })),
      transition('state1 => state2', [
        animate('1.3s', keyframes([
          style({ transform: 'scale(1)', offset: 0 }),
          style({ transform: 'scale(1)', offset: 0.2 }),
          style({ transform: 'scale(1.003) rotate(0.11deg)', offset: 0.3 }),
          style({ transform: 'scale(1.025) rotate(0.3deg)', offset: 0.4 }),
          style({ transform: 'scale(1.015) rotate(0.05deg)', offset: 0.5 }),
          style({ transform: 'scale(0.997) rotate(-0.06deg)', offset: 0.6 }),
          style({ transform: 'scale(1)', offset: 0.7 }),
          style({ transform: 'scale(1)', offset: 1 })
        ]))
      ]),
      transition('state2 => state1', [])
    ])
  ]
})

export class PhPrintingTableComponent implements OnInit, OnDestroy, AfterViewChecked {

  imagePrintSettings$: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  @ViewChildren('fileElement') fileElements: QueryList<ElementRef>;
  @ViewChildren('fileExpressElement') fileExpressElements: QueryList<ElementRef>;
  isScrollNeeded = false;

  isRTL: boolean = true;
  isDarkMode: boolean = false;
  isLoading: boolean = false;
  isLoadingPreview: boolean = false;
  private directionSubscription: Subscription;
  tooltipDirection: Direction = 'ltr';
  user: any;

  productName: string = '';
  product: any;
  private productSubscription: Subscription;
  private productSubject = new Subject<void>();

  private currentInterval: any;
  productTypes: any[] = [];
  files: any[] = [];
  proccessingFiles: any[] = [];
  paperCodes: string[] = [];
  paperNames: string[] = [];
  currentFile: any;
  currentImage: any;
  currentImageIndex: number;
  isChosen: boolean = false;
  isPaperTypeLoading: boolean = false;
  isCurrentrotated: boolean = false;
  factor: number = 0;
  // isCurrentBandW: boolean = false;
  selectedPaper: any;
  isAllFilesHavePaper: boolean = false;
  resizedInagePrintSettings: any;
  isFitRequired: boolean = false;
  scaleImageFactor: number = 1;
  isOriginalPossible: boolean = true;
  currentFileIndex: number = 0;
  sortedFilesArray: any[] = [];
  isToRefreshTable: boolean = true;
  isPaperTooltopOpen: boolean = false;
  lastFileId: string = '';
  isBranchCloseInterval: any;
  isCloseStatusInformed: boolean = false;
  currentProductTypeObject: any;

  @ViewChild(MatTooltip) tooltipScanCopy: MatTooltip;

  // rattle animation
  rattle = 'state1';
  rattleInterval: any;

  // no paper animation
  noPaper = 'state1';
  noPaperInterval: any;
  isNoPaperAnimating: boolean = false;
  isAnimatePaperStrong: boolean = false;

  // mainBtn
  mainBtn = 'state1';
  mainBtnInterval: any;
  isOpeningCompMainBtn: boolean = true;
  lastIsAllFilesHavePaper: boolean = false;

  // total Price
  totalOrderPrice: number = 0;
  totalOrderPriceBeforeDiscount: number = 0;
  // total Price Before Updated
  totalOrderPriceToBeforeUpdate: number = 0;
  totalOrderPriceBeforeDiscountToBeforeUpdate: number = 0;

  // current image paper inputs
  currentPaperWidth: number;
  currentPaperHeight: number;
  // current image file inputs:
  currentImageWidth: number;
  currentImageHeight: number;
  // current image more inputs
  // isCurrentCenter: boolean = false;
  currentPaperMargin: number = 0;

  // preview container inputs
  previewContainerWidth: number;
  previewContainerHeight: number;
  // preview paper inputs
  previewPaperWidth: number;
  previewPaperHeight: number;
  // preview file inputs:
  previewImageContainerWidth: number;
  previewImageContainerHeight: number;
  previewImageWidth: number;
  previewImageHeight: number;
  // preview more inputs
  previewPaperMargin: number;
  branchID: string;

  // 3D!
  @ViewChild('cubeContainer') cubeContainer: ElementRef;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private model1: THREE.Group;
  private model2: THREE.Group;
  private modelImg: THREE.Group;
  private startX: number = 0;
  private startY: number = 0;
  private initialRotationX: number = 0;
  private initialRotationY: number = 0;
  private isLeftMouseDown: boolean = false;
  private isMouseDownInCubeContainer: boolean = false;
  // // 3D!

  serverAddress = 'https://img-express.eazix.io';

  constructor(
    public directionService: DirectionService,
    private dataSharingService: DataSharingService,
    private router: Router,
    private dialogService: DialogService,
    private translateService: TranslateService,
    private branchesService: BranchesService,
    private elRef: ElementRef,
    private filesService: FilesService,
    private overlay: Overlay,
    private cdr: ChangeDetectorRef,
    private usersService: UsersService,
    private cd: ChangeDetectorRef,
    private ngZone: NgZone,
    private snackBar: MatSnackBar,
    private productsService: ProductsService
    // private resizeComponent: ResizeComponent,
  ) {
    this.translateService.onLangChange.subscribe(() => {

    });

    this.trackUploadProgress();
  }

  // ngOnInit ---------------------------------------------------------------
  async ngOnInit() {
    this.isToRefreshTable = true;
    this.isLoading = true;

    this.directionSubscription = this.directionService.direction$.subscribe(direction => {
      this.isRTL = direction === 'rtl';
      this.tooltipDirection = this.isRTL ? 'rtl' : 'ltr';
    });

    this.directionService.isDarkMode$.subscribe(isDarkMode => {
      this.isDarkMode = isDarkMode;
    });

    this.dialogService.closeResizeDialog$.subscribe(() => {
      this.checkReturnedResizedFile();
    });

    this.productSubscription = this.dataSharingService.getProduct().subscribe(
      async (value) => {
        console.log('Product:', value);
        if (!value) {
          await this.router.navigate(['/product']);
        } else {
          this.productName = value;
          this.product = await this.productsService.getProductByName(value).toPromise();
          await this.handlePhPrintingService();
          await this.initializeFileUploader();
          console.log('Product:', this.product);
          this.isLoading = false;
          this.productSubject.next();
        }
      },
      (error) => {
        this.router.navigate(['/product']);
      });
  }

  ngAfterViewInit(): void {
    console.log('ngAfterViewInit', this.product);
    this.productSubject.subscribe(() => {
      this.initThreeJS();
    });
  }

  ngOnDestroy() {
    this.isToRefreshTable = false;
    if (this.directionSubscription) {
      this.directionSubscription.unsubscribe();
    }
    this.clearAllIntervals();
  }

  // 3D
  private initThreeJS(): void {
    console.log('initThreeJS', this.product);
    this.scene = new THREE.Scene();
    this.scene.background = null;

    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = 100;
    this.camera = new THREE.OrthographicCamera(
      frustumSize * aspect / -2,
      frustumSize * aspect / 2,
      frustumSize / 2,
      frustumSize / -2,
      0.1,
      1000
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(this.cubeContainer.nativeElement.clientWidth, this.cubeContainer.nativeElement.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.cubeContainer.nativeElement.appendChild(this.renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 1.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.2);
    directionalLight.position.set(5, 5, 5).normalize();
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);

    const hemisphereLight = new THREE.HemisphereLight(0xFFFFFF, 0x404040, 1.0);
    this.scene.add(hemisphereLight);

    this.camera.position.z = 50;
  }

  private loadModel(settings: any = {}): void {
    if (!this.scene) {
      return;
    }

    // remove all existing models from view
    if (this.scene.children && this.scene.children.length > 0) {
      for (let i = this.scene.children.length - 1; i >= 0; i--) {
        const child = this.scene.children[i];
        if (child instanceof THREE.Group) {
          this.scene.remove(child);
        }
      }
    }

    if (this.currentProductType && this.currentProductType !== '') {

      const loader = new OBJLoader();

      const loadModelPromise = (url: string): Promise<THREE.Group> => {
        return new Promise((resolve, reject) => {
          loader.load(url, (obj) => {
            obj.castShadow = true;
            obj.receiveShadow = true;
            this.scene.add(obj);
            resolve(obj);
          }, undefined, (error) => {
            reject(error);
          });
        });
      };

      const promises: Promise<THREE.Group>[] = [];

      // Load model img
      promises.push(loadModelPromise('assets/models/' + this.productName + '-' + this.currentProductType + '-img.obj').then((obj) => {
        this.modelImg = obj;
      }));

      // Load model-1 material
      if (this.product.textures.texture1) {
        promises.push(loadModelPromise('assets/models/' + this.productName + '-' + this.currentProductType + '-1.obj').then((obj) => {
          this.model1 = obj;
        }));
      }

      // Load model-2 material
      if (this.product.textures.texture2) {
        promises.push(loadModelPromise('assets/models/' + this.productName + '-' + this.currentProductType + '-2.obj').then((obj) => {
          this.model2 = obj;
        }));
      }

      Promise.all(promises).then(() => {
        this.applyTextureToFrontFace(this.modelImg, 'img', settings);
        if (this.product.textures.texture1) {
          this.applyTextureToFrontFace(this.model1, this.product.textures.texture1, settings);
        }
        if (this.product.textures.texture2) {
          this.applyTextureToFrontFace(this.model2, this.product.textures.texture2, settings);
        }
        this.animate();
      }).catch((error) => {
        console.error('Error loading models', error);
      });
    }
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());
    this.renderer.render(this.scene, this.camera);
    this.onResizeTreeInner();
  }

  private applyTextureToFrontFace(model: any, img: string, settings: any = {}): void {
    if (!this.currentImage || !this.currentImage.thumbnailPath || !this.currentProductType || this.currentProductType == '') {
      return;
    }

    const textureLoader = new THREE.TextureLoader();
    let textureImg;

    if (img === "img") {
      textureImg = this.serverAddress + '/uploads/' + this.getUserName() + '/' + this.currentImage.thumbnailPath.split('/').pop();
      // textureImg = "https://www.simplilearn.com/ice9/free_resources_article_thumb/what_is_image_Processing.jpg";
    } else {
      textureImg = "assets/models/textures/" + img + ".jpg";
    }

    const texture = textureLoader.load(textureImg, (texture) => {
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;

      if (settings && settings.bw && img === "img") {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        const img = texture.image;
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          data[i] = gray;       // Red
          data[i + 1] = gray;   // Green
          data[i + 2] = gray;   // Blue
        }
        ctx.putImageData(imageData, 0, 0);
        texture.image = canvas;
        texture.needsUpdate = true;
      }

      model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          let material = new THREE.MeshStandardMaterial({ map: texture, opacity: 0.01 });

          const textureAspect = texture.image.width / texture.image.height;
          let faceAspect = 1;
          if (this.product.aspect && img === "img") {
            faceAspect = this.product.aspect;
          }
          if (this.currentProductType && img === "img") {
            this.currentProductTypeObject = this.product.types.find((type) => type.name === this.currentProductType);
            if (this.currentProductTypeObject) {
              faceAspect = this.currentProductTypeObject.width / this.currentProductTypeObject.height;
            }
          }

          if (textureAspect > faceAspect) {
            material.map.repeat.set(faceAspect / textureAspect, 1);
            material.map.offset.set((1 - faceAspect / textureAspect) / 2, 0);
          } else {
            material.map.repeat.set(1, textureAspect / faceAspect);
            material.map.offset.set(0, (1 - textureAspect / faceAspect) / 2);
          }

          if (Array.isArray(child.material)) {
            child.material.forEach((mat, index) => {
              child.material[index] = material;
            });
          } else {
            child.material = material;
          }
          child.material.needsUpdate = true;
        }
      });
    }, undefined, (error) => {
      console.error('Error loading texture', error);
    });
  }

  @HostListener('document:mousedown', ['$event'])
  onMouseDown(event: MouseEvent): void {
    if (event.button === 0) {
      const rect = this.cubeContainer.nativeElement.getBoundingClientRect();
      if (
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
      ) {
        this.isLeftMouseDown = true;
        this.isMouseDownInCubeContainer = true;
        this.startX = event.clientX;
        this.startY = event.clientY;
        if (this.modelImg) {
          this.initialRotationX = this.modelImg.rotation.x;
          this.initialRotationY = this.modelImg.rotation.y;
        }
      }
    }
  }

  @HostListener('document:mouseup', ['$event'])
  onMouseUp(event: MouseEvent): void {
    if (event.button === 0) {
      this.isLeftMouseDown = false;
      this.isMouseDownInCubeContainer = false;
    }
    console.log('mouse up', event.button);
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (this.isLeftMouseDown && this.isMouseDownInCubeContainer) {
      const deltaX = event.clientX - this.startX;
      const deltaY = event.clientY - this.startY;

      const rotationX = this.initialRotationX + (deltaY / window.innerHeight) * Math.PI * 3;
      const rotationY = this.initialRotationY + (deltaX / window.innerWidth) * Math.PI * 3;

      if (this.modelImg) {
        this.modelImg.rotation.x = rotationX;
        this.modelImg.rotation.y = rotationY;
      }
      if (this.model1) {
        this.model1.rotation.x = rotationX;
        this.model1.rotation.y = rotationY;
      }
      if (this.model2) {
        this.model2.rotation.x = rotationX;
        this.model2.rotation.y = rotationY;
      }
    }
  }

  @HostListener('window:resize', ['$event'])
  onResizeTree(event: Event): void {
    this.onResizeTreeInner();
  }

  onResizeTreeInner() {
    const aspect = this.cubeContainer.nativeElement.clientWidth / this.cubeContainer.nativeElement.clientHeight;
    const frustumSize = 100;
    this.camera.left = frustumSize * aspect / -2;
    this.camera.right = frustumSize * aspect / 2;
    this.camera.top = frustumSize / 2;
    this.camera.bottom = frustumSize / -2;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.cubeContainer.nativeElement.clientWidth, this.cubeContainer.nativeElement.clientHeight);
  }

  // // 3D

  clearAllIntervals() {
    console.log('Clearing all intervals');
    clearInterval(this.rattleInterval);
    clearInterval(this.noPaperInterval);
    clearInterval(this.mainBtnInterval);
    clearInterval(this.isBranchCloseInterval);
  }

  async handlePhPrintingService() {
    this.resetValues();
    this.clearPreviewDataDeep();
    this.clearPreviewData();
    await this.onFileSettingsChange(true);
    this.isLoading = false;
    console.log("@@@", this.product)
    if (this.product?.types) {
      this.productTypes = [...this.product.types];
    }
    // if (this.productTypes.length > 0) {
    // === ----------------------- === update files interval [express] === --------------------------------------------------------- ===
    const userId = localStorage.getItem('userId');
    await this.fetchUser(userId);
    this.currentInterval = interval(5000)
      .pipe(
        startWith(0),
        switchMap(() => this.filesService.getUserFilesExpress(userId)))
      .subscribe((files) => {
        if (files && files.length > 0 && !this.isLoadingPreview && this.isToRefreshTable) {
          console.log('-=EXPRESS=- files', files);

          // iterate all file, for each one iterate images, and for each imagePath,inkPath,resizedPath,thumbnailPath,rotatedThumbnailPath,
          // replace all that is before /uploads with https://img-express.eazix.io
          files.forEach(file => {
            file.images.forEach(image => {
              if (image.imagePath) {
                image.imagePath = image.imagePath.replace(/\/uploads/g, 'https://img-express.eazix.io');
              }
              if (image.inkPath) {
                image.inkPath = image.inkPath.replace(/\/uploads/g, 'https://img-express.eazix.io');
              }
              if (image.resizedPath) {
                image.resizedPath = image.resizedPath.replace(/\/uploads/g, 'https://img-express.eazix.io');
              }
              if (image.thumbnailPath) {
                image.thumbnailPath = image.thumbnailPath.replace(/\/uploads/g, 'https://img-express.eazix.io');
              }
              if (image.rotatedThumbnailPath) {
                image.rotatedThumbnailPath = image.rotatedThumbnailPath.replace(/\/uploads/g, 'https://img-express.eazix.io');
              }
            });
          });

          let oldFilesForCompare = this.files;
          let newFilesForCompare = files;
          // remove userID, printerID from each file in a single line
          oldFilesForCompare = oldFilesForCompare.map(order => _.omit(order, ['userID', 'printerID']));
          newFilesForCompare = newFilesForCompare.map(order => _.omit(order, ['userID', 'printerID']));
          console.log('oldFilesForCompare', oldFilesForCompare);
          console.log('newFilesForCompare', newFilesForCompare);
          if (_.isEqual(oldFilesForCompare, newFilesForCompare)) {
            // console.log('DO NOT update -=EXPRESS=- files');
            return;
          }
          console.log('DO update -=EXPRESS=- files');
          // console.log('[DO] = newFiles', files);
          // console.log('[DO] = this.files', this.files);
          // console.log('[DO] = isLoadingPreview', this.isLoadingPreview);
          // console.log('[DO] = isLoading', this.isLoading);
          this.isLoading = true;
          if (files.length === 0) {
            this.resetValues();
          } else {
            this.proccessingFiles = [];
            let FirstFileIndexWithImages = 0;
            // is file found
            let isFileFound = false;
            files.forEach((file, idx) => {
              if (!file.images || file.images?.length === 0) {
                this.proccessingFiles.push(file);
              } else {
                if (!isFileFound) {
                  FirstFileIndexWithImages = idx;
                  isFileFound = true;
                }
              }
            });
            if (!this.files.length && files.length) {
              console.log("first time files", files);
            }
            this.files = files;
            // this.paperCodes = this.realBranch.express.consumables.papers.map(paper => paper.paperPrinterCode);
            // this.paperNames = this.realBranch.express.consumables.papers.map(paper => paper.paperType);
            // choose first file that has images
            if (!this.isChosen && this.proccessingFiles.length !== this.files.length) {
              console.log("FirstFileIndexWithImages", FirstFileIndexWithImages);
              console.log("this.files[FirstFileIndexWithImages]", this.files[FirstFileIndexWithImages]);
              this.onChooseImage(this.files[FirstFileIndexWithImages], this.files[FirstFileIndexWithImages].images[0], 0);
            } else {
              // rechoose the current image
              if (this.currentFile && this.currentImage) {
                const currentFileIndex = this.files.findIndex(file => file._id === this.currentFile._id);
                const currentImageIndex = this.currentFile.images.findIndex(image => image._id === this.currentImage._id);
                if (currentFileIndex !== -1 && currentImageIndex !== -1) {
                  this.onChooseImage(this.files[currentFileIndex], this.files[currentFileIndex].images[currentImageIndex], currentImageIndex);
                }
              }
            }
            if (this.proccessingFiles.length === this.files.length) {
              this.clearPreviewDataDeep();
              this.clearPreviewData();
            }
          }
          this.isLoading = false;
        }
      });
    // }
  }

  async initializeFileUploader() {
    this.endpoint = `${this.serverAddress}/api/files/upload`;
    this.uploader.setOptions({ url: this.endpoint });
    console.log("changed endpoint", this.endpoint);
  }

  // [general]
  async fetchUser(userId: string) {
    try {
      this.user = await this.usersService.getUser(userId).toPromise();
    } catch (error) {
      console.error('Error fetching user:', error);
    }
    console.log('USER object is HERE', this.user);
  }

  // [general]
  getUserName() {
    return localStorage.getItem('userName');
  }

  // [plotter + express]
  onChooseImage(file: any, image: any, imageIndex: number) {
    this.isLoadingPreview = true;
    this.isChosen = true;
    let isToLoadModel = false;
    if (!this.currentFile || this.currentFile._id !== file._id || this.currentImageIndex !== imageIndex) {
      isToLoadModel = true;
    }
    this.currentFile = file;
    this.currentImage = image;
    this.currentImageIndex = imageIndex;
    console.log('onChooseImageonChooseImage', this.currentFile, this.currentImage, this.currentImageIndex);

    // [express]
    if (!this.currentPrintSettings) {
      this.currentPrintSettings = {};
    }
    if (!this.numOfCopies) {
      this.numOfCopies = 1;
    }
    // console.log('loadModel&& 1');
    if (isToLoadModel) {
      this.loadModel();
    }
    // this.applyTextureToFrontFace(this.modelImg, "img");
    this.isLoadingPreview = false;

    if (!this.lastFileId || this.lastFileId === '' || file._id !== this.lastFileId) {
      let element = document.getElementById('zx-settings-area-inner');
      if (element && this.currentImage && this.currentFile) {
        setTimeout(() => {
          if (element) element.scrollTop = 0;
        }, 0);
      }
      this.lastFileId = file._id
    }
    setTimeout(() => {
      this.startOrStopAnimateNoPaper();
    }, 0);
  }

  getOriginalHeight(): string {
    if (this.currentImage && this.currentImage.imageHeight) {
      return (Math.ceil((this.currentImage.imageHeight / this.currentImage.origImageDPI) * 2.54 * 100) / 100).toFixed(2);
    }
    return '-';
  }

  getOriginalWidth(): string {
    if (this.currentImage && this.currentImage.imageWidth) {
      return (Math.ceil((this.currentImage.imageWidth / this.currentImage.origImageDPI) * 2.54 * 100) / 100).toFixed(2);
    }
    return '-';
  }

  getActualHeight(): string {
    if (this.currentImage && this.currentImage.imageHeight) {
      return (Math.ceil((this.currentImage.imageHeight * this.scaleImageFactor / this.currentImage.origImageDPI) * 2.54 * 100) / 100).toFixed(2);
    }
    return '-';
  }

  getActualWidth(): string {
    if (this.currentImage && this.currentImage.imageWidth) {
      return (Math.ceil((this.currentImage.imageWidth * this.scaleImageFactor / this.currentImage.origImageDPI) * 2.54 * 100) / 100).toFixed(2);
    }
    return '-';
  }

  onFileSettingsChange(isToClear: boolean = false) {
    return new Promise((resolve, reject) => {
      console.log('---===onFileSettingsChange===---');
      this.isLoadingPreview = true;
      this.clearPreviewData();
      if (!isToClear) {
        console.log('---===NOT is ToClear===---');
        // settings chainge [normal]
        this.filesService.updateFileSettingsPh(
          this.currentFile._id,
          this.currentPrintSettings,
          this.product._id,
        ).subscribe(
          response => {
            if (response.file) {
              console.log('---===response.file===---', response.file);
              if (this.currentFile._id === response.fileId) {
                this.currentFile = response.file;
                // find file in this.files
                const fileIndex = this.files.findIndex(file => file._id === response.fileId);
                this.files[fileIndex] = response.file;
              }
              this.imagePrintSettings$.next(this.currentPrintSettings);
              this.isLoadingPreview = false;
              this.startOrStopAnimateNoPaper();
              console.log('bandw?', this.currentPrintSettings);
              this.loadModel(this.currentPrintSettings);
            }
            resolve(true);
          },
          error => {
            console.error('Error updating file settings:', error);
            this.isLoadingPreview = false;
            reject();
          }
        );
      } else {
        // console.log('---===DO is ToClear===---');
        // clear all files settings
        this.filesService.clearFileSettingsExpress(
          localStorage.getItem('userId'),
        ).subscribe(
          response => {
            if (response && response.updatedFiles) {
              // console.log('---===response.updatedFiles===---', response.updatedFiles);
              this.files = response.updatedFiles;
              if (this.files.length === 0) {
                this.resetValues();
              } else {
                this.files.forEach((file, idx) => {
                  if (file.images.length !== 0) {
                    file.printSettings = {};
                  }
                });
                // this.paperCodes = this.realBranch.express.consumables.papers.map(paper => paper.paperPrinterCode);
                // this.paperNames = this.realBranch.express.consumables.papers.map(paper => paper.paperType);
                if (!this.isChosen) {
                  this.onChooseImage(this.files[0], this.files[0].images[0], 0);
                }
              }
            }
            resolve(true);
            this.isLoadingPreview = false;
          },
          error => {
            console.error('Error clear files settings:', error);
            reject();
            this.isLoadingPreview = false;
          }
        );
      }
    });
  }

  // [plotter + express]
  clearPreviewData() {
    // console.log('---===clearPreviewData===---');
    this.currentPaperHeight = 0;
    this.previewImageContainerWidth = 0;
    this.previewImageContainerHeight = 0;
    this.previewImageWidth = 0;
    this.previewImageHeight = 0;
    this.previewPaperWidth = 0;
    this.previewPaperHeight = 0;
    // this.isCurrentCenter = false;
    this.currentPaperMargin = 0;
    this.previewPaperMargin = 0;
    this.factor = 0;
    // this.isCurrentBandW = false;
    this.selectedPaper = null;
    this.isAllFilesHavePaper = false;
    this.resizedInagePrintSettings = null;
    this.isFitRequired = false;
    this.scaleImageFactor = 1;
  }

  // [plotter + express]
  clearPreviewDataDeep() {
    console.log('---===clearPreviewData **Deep** ===---');
    this.currentFile = null;
    this.currentImage = null;
    this.currentImageIndex = null;
    this.isChosen = false;
  }

  // [plotter + express]
  resetValues() {
    console.log('---===resetValues===---');
    this.files = [];
    this.proccessingFiles = [];
    this.paperCodes = [];
    this.paperNames = [];
    this.currentFile = null;
    this.currentImage = null;
    this.currentImageIndex = null;
    this.isChosen = false;
  }

  // [general]
  roundDownTowDecimal(num: number): number {
    return Math.floor(num * 100) / 100;
  }

  // [general]
  roundDownOneDecimal(num: number): number {
    return Math.ceil(num * 1000) / 10;
  }

  // Sided Not Avaible Tooltip
  getSidedNotAvaibleTooltipText() {
    if (this.currentProductType && this.selectedPaper && this.currentFile?.images.length === 1) {
      return 'printing-table.explain-sided-not-avaible';
    }
    return '';
  }

  // Maximal Not Avaible Tooltip
  getMaximalNotAvaibleTooltipText() {
    if (this.currentProductType && this.selectedPaper && this.isFitRequired) {
      return 'printing-table.explain-original-not-avaible';
    }
    return '';
  }

  // [plotter + express]
  async onDeleteFileOrImage(
    currentFile: any,
    currentFileIndex: number,
    currentImage: any,
    imageIndex: number,
    forceDeleteFile: boolean = false,
    proccessingFile: boolean = false,
  ) {
    this.isLoading = true;
    if (!proccessingFile) {
      this.onChooseImage(currentFile, currentImage, imageIndex);
    }
    try {
      // [express]
      if (currentFile.images?.length === 1 || forceDeleteFile || proccessingFile) {
        // delete file [express] *******************************
        await this.filesService.deleteFileExpress(currentFile).toPromise()
        // remove file from files
        this.files = this.files.filter(file => file._id !== currentFile._id);
        // remove file from proccessingFiles
        this.proccessingFiles = this.proccessingFiles.filter(file => file._id !== currentFile._id);
        // // update [express]totalOrderPrice && totalOrderPriceBeforeDiscount
      } else {
        // delete image [express] *******************************
        await this.filesService.deleteImageExpress(currentFile, currentImage).toPromise()
        // remove image from this.files
        this.files[currentFileIndex].images = this.files[currentFileIndex].images.filter(image => image._id !== currentImage._id);
        // remove image from this.currentFile
        this.currentFile.images = this.currentFile.images.filter(image => image._id !== currentImage._id);
      }
      // handle plotter/express changes
      if (this.files.length === 0) {
        this.resetValues();
      } else {
        this.proccessingFiles = [];
        let FirstFileIndexWithImages = 0;
        let isFileFound = false;
        this.files.forEach((file, idx) => {
          if (!file.images || file.images?.length === 0) {
            this.proccessingFiles.push(file);
          }
          let chechedFileIndex = currentFileIndex + idx;
          if (chechedFileIndex > this.files.length - 1) {
            chechedFileIndex = this.files.length - chechedFileIndex;
          }
          if (!isFileFound && this.files[chechedFileIndex].images && this.files[chechedFileIndex].images.length > 0) {
            FirstFileIndexWithImages = chechedFileIndex;
            isFileFound = true;
          }
        });
        // // is file found
        if (this.proccessingFiles.length !== this.files.length && isFileFound) {
          this.onChooseImage(this.files[FirstFileIndexWithImages], this.files[FirstFileIndexWithImages].images[0], 0);
        }
        if (this.proccessingFiles.length === this.files.length) {
          this.clearPreviewData();
          this.clearPreviewDataDeep();
        }
      }
      this.isLoading = false;
    } catch (error) {
      console.error('Error deleting file or image:', error);
      this.isLoading = false;
    }
  }

  // next image with no paper + auto scroller -------------------------------------------------

  ngAfterViewChecked() {
    // console.log('---===ngAfterViewChecked===---');

    if (this.isScrollNeeded) {
      this.scrollToNextImage();
      this.isScrollNeeded = false;
    }

    if (this.totalOrderPrice !== this.totalOrderPriceToBeforeUpdate) {
      this.totalOrderPrice = this.totalOrderPriceToBeforeUpdate;
      this.cdr.detectChanges();  // Manually trigger change detection
    }
    if (this.totalOrderPriceBeforeDiscount !== this.totalOrderPriceBeforeDiscountToBeforeUpdate) {
      this.totalOrderPriceBeforeDiscount = this.totalOrderPriceBeforeDiscountToBeforeUpdate;
      this.cdr.detectChanges();  // Manually trigger change detection
    }

  }

  scrollToNextImage() {
    console.log("scrollToNextImage !*!*!*!");
    setTimeout(() => {
      let elements: QueryList<ElementRef>;
      elements = this.fileExpressElements;
      if (elements && elements.length > 0) {
        const targetFileIndex = this.files.findIndex(file => file._id === this.currentFile._id);
        if (targetFileIndex !== -1) {
          this.currentFileIndex = targetFileIndex;
        }
        elements.toArray()[this.currentFileIndex].nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const images = this.files[this.currentFileIndex].images;
      }

      // Scroll the page to the top after a delay
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 1000); // adjust the delay as needed
    }, 0);
  }

  // more properties -------------------------------------------------


  // [express + plotter] - printSettings

  get currentPrintSettings() {
    return this.currentFile?.printSettings ? this.currentFile.printSettings : {};
  }

  set currentPrintSettings(value) {
    this.currentFile.printSettings = value;
  }

  // [express] - doubleSidedValue
  get doubleSidedValue() {
    return this.currentPrintSettings?.doubleSided;
  }

  set doubleSidedValue(value) {
    this.currentPrintSettings.doubleSided = value;
  }

  // [express + plotter] - paperType
  get currentProductType() {
    return this.currentPrintSettings?.paperType;
  }

  set currentProductType(value) {
    this.currentPrintSettings.paperType = value;
  }

  // [express] - fitValue
  get fitValue() {
    return this.currentPrintSettings?.fit;
  }

  set fitValue(value) {
    this.currentPrintSettings.fit = value;
  }

  // [express] - cropRatioValue ("fully cover")
  get cropRatioValue() {
    return this.currentPrintSettings?.cropRatio;
  }

  set cropRatioValue(value) {
    this.currentPrintSettings.cropRatio = value;
  }

  // [plotter + express] - bwValue
  get bwValue() {
    return this.currentPrintSettings?.bw;
  }

  set bwValue(value) {
    this.currentPrintSettings.bw = value;
  }

  // [plotter + express] - numOfCopies
  get numOfCopies() {
    return this.currentPrintSettings?.numOfCopies;
  }

  set numOfCopies(value) {
    this.currentPrintSettings.numOfCopies = value;
  }

  changeNumberOfCopies(type: string) {
    const originalNumOfCopies = this.numOfCopies;
    if (type === 'add') {
      this.numOfCopies++;
    } else if (type === 'remove' && this.numOfCopies > 1) {
      this.numOfCopies--;
    }
    if (originalNumOfCopies !== this.numOfCopies) {
      this.onFileSettingsChange()
    }
  }

  // [plotter] - centerValue
  get centerValue() {
    return this.currentPrintSettings?.centered;
  }

  set centerValue(value) {
    this.currentPrintSettings.centered = value;
  }

  // [plotter] - cmFromTopValue
  get cmFromTopValue() {
    return this.currentPrintSettings?.cmFromTop;
  }

  set cmFromTopValue(value) {
    this.currentPrintSettings.cmFromTop = value;
  }

  // [express]
  getPaperSerialName(file) {
    // console.log('getPaperSerialName >> file >>');
    // console.log(file);
    // console.log(this.productTypes);
    const paper = this.productTypes.find(paper => paper.paperName === file.printSettings.paperType);
    if (!paper) {
      this.clearPreviewData();
      this.clearPreviewDataDeep();
      return '';
    }
    return paper ? paper.serial_name : '';
  }

  // [plotter]
  checkReturnedResizedFile() {
    console.log("NADAV: refresh after resize the file: ", this.currentFile);
  }

  get prices$() {
    if (!this.product) {
      return of([]);
    }
    const prices = [];
    for (let i = 0; i < this.product.types.length; i++) {
      prices.push(this.product.types[i].price);
    }
    return of(prices);
  }

  getImagePrice$(imagePrintSettings: any): Observable<number> {
    return this.prices$.pipe(
      map(prices => {
        const imagePrice = this.getImagePrice(imagePrintSettings, prices);
        return imagePrice;
      })
    );
  }

  imagePrice$ = combineLatest([
    this.imagePrintSettings$,
    this.prices$
  ]).pipe(
    map(([imagePrintSettings, prices]) => this.getImagePrice(imagePrintSettings, prices))
  );

  getImagePrice(imagePrintSettings: any, prices: any): number {
    if (!imagePrintSettings || !prices || !this.product.types || this.product.types.length === 0) {
      return 0;
    }
    if (imagePrintSettings.paperType) {
      const productType = this.product.types.find(type => type.name === imagePrintSettings.paperType);
      return this.roundDownTowDecimal(productType.price);
    }
    return 0;
  }

  calcTotalOrderPrice() {
    let totalOrderPrice = 0;
    this.files.forEach(file => {
      if (file.printSettings?.paperType && file.printSettings?.numOfCopies && file.images?.length > 0) {
        const productType = this.product.types.find(type => type.name === file.printSettings.paperType);
        const price = productType.price;
        const copies = file.printSettings.numOfCopies;
        const pages = file.images.length;
        totalOrderPrice += price * copies * pages;
      }
    });
    return totalOrderPrice;
  }

  isManiger() {
    return false;
  }

  // ------ animation ------

  // rattle Upload SVG

  // rattle effect animation
  animateUploadSVG() {
    this.ngZone.runOutsideAngular(() => {
      this.rattleInterval = setInterval(() => {
        this.ngZone.run(() => {
          this.rattle = this.rattle === 'state1' ? 'state2' : 'state1';
          console.log('rattle: ', this.rattle);
        });
      }, 15000);
    });
  }

  // stop the rattle effect
  stopAnimateUploadSVG() {
    clearInterval(this.rattleInterval);
    this.rattle = 'state1';
  }

  startOrStopAnimateUploadSVG() {
    if (this.files.length === 0) {
      this.animateUploadSVG();
    } else {
      this.stopAnimateUploadSVG();
    }
  }

  // No Paper

  // No Paper effect animation
  animateNoPaper() {
    // console.log("animate-No-Paper START!");
    this.noPaper = 'state2';
    this.ngZone.runOutsideAngular(() => {
      this.noPaperInterval = setInterval(() => {
        this.ngZone.run(() => {
          this.noPaper = this.noPaper === 'state1' ? 'state2' : 'state1';
        });
      }, 2800);
    });
  }

  // stop the No Paper effect
  stopAnimateNoPaper(paper: any = null) {
    // console.log("animate-No-Paper END!");
    clearInterval(this.noPaperInterval);
    this.noPaper = 'state1';
  }

  // start Or stop the No Paper effect
  startOrStopAnimateNoPaper() {
    if (this.currentFile && !this.currentFile.printSettings?.paperType) {
      if (!this.isNoPaperAnimating) {
        this.isNoPaperAnimating = true;
        this.animateNoPaper();
        this.stopAnimateMainBtn();
      }
    } else {
      if (this.isNoPaperAnimating) {
        this.isNoPaperAnimating = false;
        this.stopAnimateNoPaper();
        this.animateMainBtn();
      }
    }
  }

  // main Btn

  // main Btn effect animation
  animateMainBtn() {
    // console.log("animate-Main-Btn START!");
    this.mainBtn = 'state2';
    this.ngZone.runOutsideAngular(() => {
      this.mainBtnInterval = setInterval(() => {
        this.ngZone.run(() => {
          this.mainBtn = this.mainBtn === 'state1' ? 'state2' : 'state1';
        });
      }, 9000);
    });
  }
  // stop the main Btn effect
  stopAnimateMainBtn() {
    // console.log("animate-Main-Btn END!");
    clearInterval(this.mainBtnInterval);
    this.mainBtn = 'state1';
  }

  goToManagementPage(page: string) {
    let branchID;
    // branchID = this.realBranch.express._id;
    this.stopAnimateMainBtn();
    this.stopAnimateNoPaper();
    this.stopAnimateUploadSVG();
    this.clearAllIntervals();
    this.router.navigate(['/']);
  }

  animatePaperStrong() {
    if (!this.isAnimatePaperStrong) {
      this.isAnimatePaperStrong = true;
      setTimeout(() => {
        this.isAnimatePaperStrong = false;
      }, 1500);
      this.snackBar.open(this.translateService.instant('printing-table.preview.not-avalble'), '', {
        duration: 3200,
        verticalPosition: 'top',
        panelClass: 'zx-top-snackbar'
      });
    }
  }

  animatePaperStrongIfNeeded() {
    if (!this.currentProductType && this.files.length > 0) {
      this.animatePaperStrong();
    }
  }

  //  ------------------------------------------------- mainBtn              mainBtnInterval

  // express upload //

  endpoint = '';
  public uploader: FileUploader = new FileUploader({ url: this.endpoint, headers: [{ name: 'Authorization', value: 'Bearer ' + localStorage.getItem('token') }] });
  hasBaseDropZoneOver: boolean = false;
  uploadProgress: number = 0;
  uploadingFiles: FileItem[] = [];
  currentlyUploading: boolean = false;

  public fileOverBase(e: any): void {
    console.log('fileOverBase:', e);
    this.hasBaseDropZoneOver = e;
  }

  public onFileDrop(e: any): void {
    console.log('Files dropped:', e);
  }

  // Method to track upload progress for individual files
  public trackUploadProgress(): void {
    this.uploader.onProgressItem = (fileItem: FileItem, progress: any) => {
      console.log(`File: ${fileItem.file.name} is ${progress}% uploaded.`);
      this.uploadProgress = progress;
    };

    this.uploader.onAfterAddingFile = (fileItem: FileItem) => {
      this.uploadingFiles.push(fileItem);
      console.log(`Added file: ${fileItem.file.name}`);
      fileItem.upload(); // Automatically start uploading the file
      this.currentlyUploading = true;
    };

    this.uploader.onCompleteItem = (fileItem: FileItem, response: any, status: number, headers: any) => {
      console.log(`File: ${fileItem.file.name} uploaded successfully!`);
      // Remove the file from the uploadingFiles array after completion
      this.uploadingFiles = this.uploadingFiles.filter(item => item !== fileItem);
      if (this.uploadingFiles.length === 0) {
        this.currentlyUploading = false;
      }
    };
  }

}
