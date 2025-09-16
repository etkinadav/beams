import { Component, Input, ElementRef, ViewChild, AfterViewInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import * as THREE from 'three';

@Component({
  selector: 'app-product-mini-preview',
  template: `
    <div #miniPreviewContainer class="mini-preview-container"></div>
  `,
  styles: [`
    .mini-preview-container {
      width: 200px;
      height: 200px;
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
  private target = new THREE.Vector3(0, 0, 0);
  private spherical = new THREE.Spherical();
  private isMouseDown = false;
  private isPan = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private hasUserInteracted = false; // האם המשתמש התחיל להזיז את המודל

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
    this.camera.position.set(-50, 15, 50);
    this.target.set(0, this.dynamicParams.height/4 -35, 0);
    this.camera.lookAt(this.target);
    
    // הגדרת מיקום התחלתי עבור הזום
    const offset = this.camera.position.clone().sub(this.target);
    this.spherical.setFromVector3(offset);

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

    // הוספת אירועי עכבר לזום וסיבוב
    this.addMouseControls();
  }

  private addMouseControls() {
    const container = this.container.nativeElement;

    // גלגל עכבר לזום
    container.addEventListener('wheel', (event: WheelEvent) => {
      event.preventDefault();
      this.hasUserInteracted = true; // המשתמש התחיל להזיז
      const delta = event.deltaY;
      const zoomSpeed = 0.1;
      
      // שינוי רדיוס המצלמה
      this.spherical.radius += delta * zoomSpeed;
      this.spherical.radius = Math.max(20, Math.min(200, this.spherical.radius)); // הגבלת טווח זום
      
      // עדכון מיקום המצלמה
      this.camera.position.setFromSpherical(this.spherical).add(this.target);
    });

    // לחיצה וגרירה לסיבוב ו-pan
    container.addEventListener('mousedown', (event: MouseEvent) => {
      this.isMouseDown = true;
      this.isPan = (event.button === 1 || event.button === 2); // כפתור אמצע או ימין
      this.hasUserInteracted = true; // המשתמש התחיל להזיז
      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;
      container.style.cursor = this.isPan ? 'grabbing' : 'grabbing';
    });

    container.addEventListener('mousemove', (event: MouseEvent) => {
      if (!this.isMouseDown) return;
      
      const deltaX = event.clientX - this.lastMouseX;
      const deltaY = event.clientY - this.lastMouseY;
      
      if (this.isPan) {
        // Pan - הזזת המצלמה
        const panSpeed = 0.2;
        const panX = -deltaX * panSpeed;
        const panY = deltaY * panSpeed;
        const cam = this.camera;
        const pan = new THREE.Vector3();
        pan.addScaledVector(new THREE.Vector3().setFromMatrixColumn(cam.matrix, 0), panX);
        pan.addScaledVector(new THREE.Vector3().setFromMatrixColumn(cam.matrix, 1), panY);
        cam.position.add(pan);
        this.target.add(pan);
      } else {
        // סיבוב - כמו קודם
        const rotateSpeed = 0.01;
        this.spherical.theta -= deltaX * rotateSpeed;
        this.spherical.phi += deltaY * rotateSpeed;
        
        // הגבלת זווית אנכית
        this.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.spherical.phi));
        
        // עדכון מיקום המצלמה
        this.camera.position.setFromSpherical(this.spherical).add(this.target);
      }
      
      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;
    });

    container.addEventListener('mouseup', () => {
      this.isMouseDown = false;
      container.style.cursor = 'grab';
    });

    container.addEventListener('mouseleave', () => {
      this.isMouseDown = false;
      container.style.cursor = 'grab';
    });

    // הגדרת סגנון עכבר
    container.style.cursor = 'grab';
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
            // המרה ממ"מ לס"מ כמו בקובץ הראשי
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
      paramRanges: this.paramRanges,
      beamWidth: this.dynamicParams.beamWidth,
      beamHeight: this.dynamicParams.beamHeight
    });
  }

  private createSimpleProduct() {
    // ניקוי המודל הקודם
    this.meshes.forEach(mesh => this.scene.remove(mesh));
    this.meshes = [];

    // יצירת מדפים דינמיים
    const shelfHeight = this.dynamicParams.height / this.dynamicParams.shelfCount;
    const minGap = 2; // רווח מינימלי בין קורות
    
    for (let i = 0; i < this.dynamicParams.shelfCount; i++) {
      const y = i * shelfHeight;
      const isTopShelf = i === this.dynamicParams.shelfCount - 1; // זיהוי המדף העליון
      
      // יצירת קורות מדף (Surface Beams) - כמו בקובץ הראשי
      const surfaceBeams = this.createSurfaceBeams(
        this.dynamicParams.width,
        this.dynamicParams.length,
        this.dynamicParams.beamWidth,
        this.dynamicParams.beamHeight,
        minGap
      );
      
      for (let j = 0; j < surfaceBeams.length; j++) {
        let beam = { ...surfaceBeams[j] };
        
        // במדף העליון - כל הקורות באורך מלא ללא קיצור
        // במדפים אחרים - קיצור הקורות הראשונה והאחרונה
        if (!isTopShelf && (j === 0 || j === surfaceBeams.length - 1)) {
          beam.depth = beam.depth - 2 * this.dynamicParams.frameWidth;
        }
        
        // לוג למדף העליון
        if (isTopShelf) {
          console.log(`מדף עליון - קורה ${j}: אורך=${beam.depth}, רוחב=${beam.width}, גובה=${beam.height}, מיקום Y=${y}`);
        }
        
        const beamGeometry = new THREE.BoxGeometry(beam.width, beam.height, beam.depth);
        const beamMaterial = new THREE.MeshLambertMaterial({ 
          color: this.woodColors[this.dynamicParams.woodType]
        });
        const beamMesh = new THREE.Mesh(beamGeometry, beamMaterial);
        beamMesh.position.set(beam.x, y - this.dynamicParams.frameHeight/2 - this.dynamicParams.beamHeight/2, 0);
        beamMesh.castShadow = true;
        beamMesh.receiveShadow = true;
        this.scene.add(beamMesh);
        this.meshes.push(beamMesh);
      }
    }

    // יצירת רגליים (frame beams) - מיקום קרוב יותר למרכז
    const legPositions = [
      [-this.dynamicParams.width/2 + this.dynamicParams.frameWidth/2, 0, -this.dynamicParams.length/2 + this.dynamicParams.frameWidth/2],
      [this.dynamicParams.width/2 - this.dynamicParams.frameWidth/2, 0, -this.dynamicParams.length/2 + this.dynamicParams.frameWidth/2],
      [-this.dynamicParams.width/2 + this.dynamicParams.frameWidth/2, 0, this.dynamicParams.length/2 - this.dynamicParams.frameWidth/2],
      [this.dynamicParams.width/2 - this.dynamicParams.frameWidth/2, 0, this.dynamicParams.length/2 - this.dynamicParams.frameWidth/2]
    ];

    // חישוב גובה הרגליים - עד למפלס העליון של קורות החיזוק במדף העליון
    const topShelfY = (this.dynamicParams.shelfCount - 1) * shelfHeight;
    const legHeight = topShelfY + this.dynamicParams.frameHeight;
    
    legPositions.forEach(pos => {
      const legGeometry = new THREE.BoxGeometry(
        this.dynamicParams.frameWidth,
        legHeight,
        this.dynamicParams.frameWidth
      );
      const legMaterial = new THREE.MeshLambertMaterial({ 
        color: this.beamColors[this.dynamicParams.beamType]
      });
      const leg = new THREE.Mesh(legGeometry, legMaterial);
      leg.position.set(pos[0], legHeight/2, pos[2]);
      leg.castShadow = true;
      leg.receiveShadow = true;
      this.scene.add(leg);
      this.meshes.push(leg);
    });

    // הוספת קורות חיזוק אופקיות (Frame Beams) בכל גובה מדף
    for (let i = 0; i < this.dynamicParams.shelfCount; i++) {
      const y = i * shelfHeight;
      
      // קורות חיזוק קדמיות ואחוריות (X axis beams)
      [-this.dynamicParams.length/2 + this.dynamicParams.frameWidth/2, 
       this.dynamicParams.length/2 - this.dynamicParams.frameWidth/2].forEach(z => {
        const braceGeometry = new THREE.BoxGeometry(
          this.dynamicParams.width - 2 * this.dynamicParams.frameWidth,
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

      // קורות חיזוק שמאליות וימניות (Z axis beams)
      [-this.dynamicParams.width/2 + this.dynamicParams.frameWidth/2, 
       this.dynamicParams.width/2 - this.dynamicParams.frameWidth/2].forEach(x => {
        const braceGeometry = new THREE.BoxGeometry(
          this.dynamicParams.frameWidth,
          this.dynamicParams.frameHeight,
          this.dynamicParams.length - 2 * this.dynamicParams.frameWidth
        );
        const braceMaterial = new THREE.MeshLambertMaterial({ 
          color: this.beamColors[this.dynamicParams.beamType]
        });
        const brace = new THREE.Mesh(braceGeometry, braceMaterial);
        brace.position.set(x, y, 0);
        brace.castShadow = true;
        brace.receiveShadow = true;
        this.scene.add(brace);
        this.meshes.push(brace);
      });
    }

    // הוספת קורות חיזוק אופקיות בחלק העליון של המסגרת - בגובה הנכון
    const topBraceY = topShelfY + this.dynamicParams.frameHeight;
    [-this.dynamicParams.length/2 + this.dynamicParams.frameWidth/2, 
     this.dynamicParams.length/2 - this.dynamicParams.frameWidth/2].forEach(z => {
      const topBraceGeometry = new THREE.BoxGeometry(
        this.dynamicParams.width - 2 * this.dynamicParams.frameWidth,
        this.dynamicParams.frameHeight,
        this.dynamicParams.frameWidth
      );
      const topBraceMaterial = new THREE.MeshLambertMaterial({ 
        color: this.beamColors[this.dynamicParams.beamType]
      });
      const topBrace = new THREE.Mesh(topBraceGeometry, topBraceMaterial);
      topBrace.position.set(0, topBraceY, z);
      topBrace.castShadow = true;
      topBrace.receiveShadow = true;
      this.scene.add(topBrace);
      this.meshes.push(topBrace);
    });

    // קורות חיזוק שמאליות וימניות בחלק העליון - בגובה הנכון
    [-this.dynamicParams.width/2 + this.dynamicParams.frameWidth/2, 
     this.dynamicParams.width/2 - this.dynamicParams.frameWidth/2].forEach(x => {
      const topBraceGeometry = new THREE.BoxGeometry(
        this.dynamicParams.frameWidth,
        this.dynamicParams.frameHeight,
        this.dynamicParams.length - 2 * this.dynamicParams.frameWidth
      );
      const topBraceMaterial = new THREE.MeshLambertMaterial({ 
        color: this.beamColors[this.dynamicParams.beamType]
      });
      const topBrace = new THREE.Mesh(topBraceGeometry, topBraceMaterial);
      topBrace.position.set(x, topBraceY, 0);
      topBrace.castShadow = true;
      topBrace.receiveShadow = true;
      this.scene.add(topBrace);
      this.meshes.push(topBrace);
    });

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
    
    // עדכון נקודת המבט של המצלמה
    this.camera.lookAt(this.target);
    
    // סיבוב איטי של המודל (רק אם המשתמש לא התחיל להזיז)
    if (!this.hasUserInteracted) {
      this.scene.rotation.y += 0.005;
    }
    
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

  // קורות משטח - זהה לקובץ הראשי
  private createSurfaceBeams(
    totalWidth: number,
    totalLength: number,
    beamWidth: number,
    beamHeight: number,
    minGap: number
  ): { x: number, width: number, height: number, depth: number }[] {
    const n = Math.floor((totalWidth + minGap) / (beamWidth + minGap));
    const actualGap = n > 1 ? (totalWidth - n * beamWidth) / (n - 1) : 0;
    const beams = [];
    for (let i = 0; i < n; i++) {
      const x = -totalWidth / 2 + i * (beamWidth + actualGap) + beamWidth / 2;
      beams.push({
        x,
        width: beamWidth,
        height: beamHeight,
        depth: totalLength
      });
    }
    return beams;
  }
}
