import { Component, Input, ElementRef, ViewChild, AfterViewInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import * as THREE from 'three';

@Component({
  selector: 'app-product-mini-preview',
  template: `
    <div #miniPreviewContainer class="mini-preview-container"></div>
  `,
  styles: [`
    .mini-preview-container {
      width: 100%;
      height: 100%;
      border-radius: 8px;
      overflow: hidden;
    }
  `]
})
export class ProductMiniPreviewComponent implements AfterViewInit, OnDestroy, OnChanges {
  @Input() product: any;
  @ViewChild('miniPreviewContainer', { static: true }) container!: ElementRef;

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private animationId!: number;

  // פרמטרים דינמיים עם ערכי ברירת מחדל
  private dynamicParams = {
    width: 25,
    length: 15,
    height: 50,
    beamWidth: 1,
    beamHeight: 0.5,
    frameWidth: 1,
    frameHeight: 1,
    shelfCount: 3,
    woodType: 0, // אינדקס סוג עץ
    beamType: 0  // אינדקס סוג קורה
  };

  // טווחי ערכים מינימליים ומקסימליים
  private paramRanges = {
    width: { min: 15, max: 40 },
    length: { min: 10, max: 25 },
    height: { min: 30, max: 80 },
    beamWidth: { min: 0.5, max: 2 },
    beamHeight: { min: 0.3, max: 1 },
    frameWidth: { min: 0.5, max: 2 },
    frameHeight: { min: 0.5, max: 2 },
    shelfCount: { min: 2, max: 5 },
    woodType: { min: 0, max: 2 }, // 3 סוגי עץ
    beamType: { min: 0, max: 2 }  // 3 סוגי קורות
  };

  // מצב נוכחי ומצב יעד
  private currentState = { ...this.dynamicParams };
  private targetState = { ...this.dynamicParams };
  
  // זמנים לאנימציה
  private transitionStartTime = 0;
  private transitionDuration = 5000; // 5 שניות
  private isTransitioning = false;
  
  // צבעי עץ שונים
  private woodColors = [
    0x8B4513, // חום עץ רגיל
    0xCD853F, // חום בהיר יותר
    0x654321  // חום כהה
  ];
  
  // צבעי קורות שונים
  private beamColors = [
    0x4a4a4a, // אפור כהה
    0x696969, // אפור בינוני
    0x2F4F4F  // אפור כהה יותר
  ];

  private meshes: THREE.Mesh[] = [];

  ngAfterViewInit() {
    this.initThreeJS();
    this.initializeParamsFromProduct();
    this.createSimpleProduct();
    this.startTransitionCycle();
    this.animate();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['product'] && this.scene) {
      console.log('מוצר השתנה, מעדכן פרמטרים...');
      this.initializeParamsFromProduct();
    }
  }

  ngOnDestroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
  }

  private initThreeJS() {
    const container = this.container.nativeElement;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf8f9fa);

    // Camera
    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    this.camera.position.set(-50, 15, 50); // חזרתי למצב הקודם
    this.camera.lookAt(0, this.dynamicParams.height/4, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    this.scene.add(directionalLight);
  }

  private initializeParamsFromProduct() {
    if (!this.product || !this.product.params) {
      // אם אין product או params, נשתמש בערכי ברירת מחדל
      return;
    }

    // אתחול הפרמטרים הדינמיים מהמוצר
    this.product.params.forEach((param: any) => {
      switch (param.type) {
        case 'width':
          this.dynamicParams.width = param.default || 25;
          this.paramRanges.width = { 
            min: param.min || 15, 
            max: param.max || 40 
          };
          break;
        case 'length':
          this.dynamicParams.length = param.default || 15;
          this.paramRanges.length = { 
            min: param.min || 10, 
            max: param.max || 25 
          };
          break;
        case 'height':
          this.dynamicParams.height = param.default || 50;
          this.paramRanges.height = { 
            min: param.min || 30, 
            max: param.max || 80 
          };
          break;
        case 'beamSingle':
          if (param.beams && param.beams.length > 0) {
            const beam = param.beams[param.selectedBeamIndex || 0];
            this.dynamicParams.frameWidth = (beam.width / 10) || 1;
            this.dynamicParams.frameHeight = (beam.height / 10) || 1;
            this.paramRanges.frameWidth = { 
              min: (beam.width / 10) * 0.5 || 0.5, 
              max: (beam.width / 10) * 2 || 2 
            };
            this.paramRanges.frameHeight = { 
              min: (beam.height / 10) * 0.5 || 0.5, 
              max: (beam.height / 10) * 2 || 2 
            };
          }
          break;
        case 'shelfs':
          if (param.beams && param.beams.length > 0) {
            const beam = param.beams[param.selectedBeamIndex || 0];
            this.dynamicParams.beamWidth = (beam.width / 10) || 1;
            this.dynamicParams.beamHeight = (beam.height / 10) || 0.5;
            this.paramRanges.beamWidth = { 
              min: (beam.width / 10) * 0.5 || 0.5, 
              max: (beam.width / 10) * 2 || 2 
            };
            this.paramRanges.beamHeight = { 
              min: (beam.height / 10) * 0.5 || 0.3, 
              max: (beam.height / 10) * 2 || 1 
            };
          }
          // מספר מדפים
          this.dynamicParams.shelfCount = param.default || 3;
          this.paramRanges.shelfCount = { 
            min: param.min || 2, 
            max: param.max || 5 
          };
          break;
      }
    });

    // עדכון המצב הנוכחי והיעד
    this.currentState = { ...this.dynamicParams };
    this.targetState = { ...this.dynamicParams };

    console.log('פרמטרים מאותחלים מהמוצר:', {
      dynamicParams: this.dynamicParams,
      paramRanges: this.paramRanges
    });
  }

  private createSimpleProduct() {
    // ניקוי המודל הקודם
    this.meshes.forEach(mesh => this.scene.remove(mesh));
    this.meshes = [];

    // יצירת מדפים דינמיים
    const shelfHeight = this.dynamicParams.height / this.dynamicParams.shelfCount;
    
    for (let i = 0; i < this.dynamicParams.shelfCount; i++) {
      const y = i * shelfHeight;
      
      // יצירת מדף (משטח)
      const shelfGeometry = new THREE.BoxGeometry(
        this.dynamicParams.width, 
        this.dynamicParams.beamHeight, 
        this.dynamicParams.length
      );
      const shelfMaterial = new THREE.MeshLambertMaterial({ 
        color: this.woodColors[this.dynamicParams.woodType]
      });
      const shelf = new THREE.Mesh(shelfGeometry, shelfMaterial);
      shelf.position.set(0, y, 0);
      shelf.castShadow = true;
      shelf.receiveShadow = true;
      this.scene.add(shelf);
      this.meshes.push(shelf);

      // יצירת קורות מדף
      const beamCount = Math.floor(this.dynamicParams.width / (this.dynamicParams.beamWidth + 2));
      for (let j = 0; j < beamCount; j++) {
        const x = (j - beamCount/2) * (this.dynamicParams.beamWidth + 2);
        const beamGeometry = new THREE.BoxGeometry(
          this.dynamicParams.beamWidth,
          this.dynamicParams.beamHeight,
          this.dynamicParams.length
        );
        const beamMaterial = new THREE.MeshLambertMaterial({ 
          color: this.beamColors[this.dynamicParams.beamType]
        });
        const beam = new THREE.Mesh(beamGeometry, beamMaterial);
        beam.position.set(x, y, 0);
        beam.castShadow = true;
        beam.receiveShadow = true;
        this.scene.add(beam);
        this.meshes.push(beam);
      }
    }

    // יצירת רגליים (frame beams)
    const legPositions = [
      [-this.dynamicParams.width/2, 0, -this.dynamicParams.length/2],
      [this.dynamicParams.width/2, 0, -this.dynamicParams.length/2],
      [-this.dynamicParams.width/2, 0, this.dynamicParams.length/2],
      [this.dynamicParams.width/2, 0, this.dynamicParams.length/2]
    ];

    legPositions.forEach(pos => {
      const legGeometry = new THREE.BoxGeometry(
        this.dynamicParams.frameWidth,
        this.dynamicParams.height,
        this.dynamicParams.frameWidth
      );
      const legMaterial = new THREE.MeshLambertMaterial({ 
        color: this.beamColors[this.dynamicParams.beamType]
      });
      const leg = new THREE.Mesh(legGeometry, legMaterial);
      leg.position.set(pos[0], this.dynamicParams.height/2, pos[2]);
      leg.castShadow = true;
      leg.receiveShadow = true;
      this.scene.add(leg);
      this.meshes.push(leg);
    });

    // הוספת קורות חיזוק אופקיות
    for (let i = 1; i < this.dynamicParams.shelfCount; i++) {
      const y = i * shelfHeight;
      
      // קורות חיזוק קדמיות ואחוריות
      [-this.dynamicParams.length/2, this.dynamicParams.length/2].forEach(z => {
        const braceGeometry = new THREE.BoxGeometry(
          this.dynamicParams.width,
          this.dynamicParams.frameHeight,
          this.dynamicParams.frameWidth
        );
        const braceMaterial = new THREE.MeshLambertMaterial({ 
          color: this.beamColors[this.dynamicParams.beamType]
        });
        const brace = new THREE.Mesh(braceGeometry, braceMaterial);
        brace.position.set(0, y, z);
        brace.castShadow = true;
        brace.receiveShadow = true;
        this.scene.add(brace);
        this.meshes.push(brace);
      });
    }

    // סיבוב כל המודל ב-180 מעלות סביב ציר X (להפוך למעלה-מטה)
    this.scene.rotation.x = Math.PI;
  }

  private startTransitionCycle() {
    // התחלת מחזור המעברים
    setTimeout(() => {
      this.generateNewTargetState();
    }, 5000); // התחלה אחרי 5 שניות
  }

  private generateNewTargetState() {
    // יצירת מצב יעד חדש
    Object.keys(this.paramRanges).forEach(key => {
      const param = key as keyof typeof this.paramRanges;
      const range = this.paramRanges[param];
      
      if (param === 'woodType' || param === 'beamType') {
        // פרמטרים בדידים - בחירה אקראית
        this.targetState[param] = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
      } else {
        // פרמטרים רציפים - ערך אקראי בטווח
        this.targetState[param] = Math.random() * (range.max - range.min) + range.min;
      }
    });

    // התחלת מעבר
    this.currentState = { ...this.dynamicParams };
    this.transitionStartTime = Date.now();
    this.isTransitioning = true;

    console.log('מצב יעד חדש:', this.targetState);

    // תזמון המעבר הבא
    setTimeout(() => {
      this.generateNewTargetState();
    }, this.transitionDuration);
  }

  private animate() {
    this.animationId = requestAnimationFrame(() => this.animate());
    
    // עדכון פרמטרים אם במעבר
    if (this.isTransitioning) {
      this.updateTransition();
    }
    
    // יצירת המודל מחדש עם הפרמטרים החדשים
    this.createSimpleProduct();
    
    // סיבוב איטי של המודל
    this.scene.rotation.y += 0.005;
    
    this.renderer.render(this.scene, this.camera);
  }

  private updateTransition() {
    const currentTime = Date.now();
    const elapsed = currentTime - this.transitionStartTime;
    const progress = Math.min(elapsed / this.transitionDuration, 1);

    // פונקציית easing חלקה
    const easeProgress = this.easeInOutCubic(progress);

    // עדכון כל פרמטר
    Object.keys(this.dynamicParams).forEach(key => {
      const param = key as keyof typeof this.dynamicParams;
      const current = this.currentState[param];
      const target = this.targetState[param];

      if (param === 'shelfCount') {
        // טיפול מיוחד במספר מדפים - מעבר הדרגתי
        const shelfProgress = this.getShelfTransitionProgress(progress);
        this.dynamicParams[param] = Math.round(current + (target - current) * shelfProgress);
      } else if (param === 'woodType' || param === 'beamType') {
        // שינוי חומרים באמצע התהליך
        if (progress >= 0.5 && this.dynamicParams[param] !== target) {
          this.dynamicParams[param] = target;
        }
      } else {
        // פרמטרים רציפים - מעבר חלק
        this.dynamicParams[param] = current + (target - current) * easeProgress;
      }
    });

    // סיום המעבר
    if (progress >= 1) {
      this.isTransitioning = false;
      this.currentState = { ...this.dynamicParams };
    }
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private getShelfTransitionProgress(progress: number): number {
    // מעבר הדרגתי למספר מדפים: רבע, חצי, שלושה רבעים
    if (progress <= 0.25) return 0;
    if (progress <= 0.5) return 0.25;
    if (progress <= 0.75) return 0.5;
    if (progress <= 0.9) return 0.75;
    return 1;
  }
}
