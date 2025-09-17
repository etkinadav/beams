import { Component, Input, ElementRef, ViewChild, AfterViewInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import * as THREE from 'three';

@Component({
  selector: 'app-product-mini-preview',
  template: `
    <div class="preview-wrapper">
      <div #miniPreviewContainer class="mini-preview-container"></div>
      <div class="width-control">
        <button (click)="decreaseWidth()" class="control-btn">-</button>
        <span class="width-value">{{dynamicParams.width}} ס"מ</span>
        <button (click)="increaseWidth()" class="control-btn">+</button>
      </div>
      <div class="length-control">
        <button (click)="decreaseLength()" class="control-btn">-</button>
        <span class="length-value">{{dynamicParams.length}} ס"מ</span>
        <button (click)="increaseLength()" class="control-btn">+</button>
      </div>
    </div>
  `,
  styles: [`
    .preview-wrapper {
      position: relative;
      width: 200px;
      height: 200px;
    }
    .mini-preview-container {
      width: 100%;
      height: 100%;
      border-radius: 8px;
      overflow: hidden;
    }
    .width-control {
      position: absolute;
      top: 100px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1000;
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 255, 255, 0.9);
      padding: 6px 12px;
      border-radius: 20px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      border: 1px solid #e0e0e0;
    }
    .length-control {
      position: absolute;
      top: 140px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1000;
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 255, 255, 0.9);
      padding: 6px 12px;
      border-radius: 20px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      border: 1px solid #e0e0e0;
    }
    .control-btn {
      width: 24px;
      height: 24px;
      border: none;
      border-radius: 50%;
      background: #2196f3;
      color: white;
      font-weight: bold;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      transition: background-color 0.2s;
    }
    .control-btn:hover {
      background: #1976d2;
    }
    .width-value, .length-value {
      font-size: 12px;
      font-weight: 500;
      color: #333;
      min-width: 50px;
      text-align: center;
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
  private textureLoader = new THREE.TextureLoader();

  // פרמטרים דינמיים - ערכי ברירת מחדל זהה לקובץ הראשי
  public dynamicParams = {
    width: 100, // זהה לקובץ הראשי
    length: 100, // זהה לקובץ הראשי
    height: 100, // זהה לקובץ הראשי
    beamWidth: 10, // זהה לקובץ הראשי
    beamHeight: 2, // זהה לקובץ הראשי
    frameWidth: 5, // זהה לקובץ הראשי
    frameHeight: 5, // זהה לקובץ הראשי
    shelfCount: 3,
    woodType: 0, // אינדקס סוג עץ
    beamType: 0  // אינדקס סוג קורה
  };

  
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

  // Get wood texture based on beam type - זהה לקובץ הראשי
  private getWoodTexture(beamType: string): THREE.Texture {
    let texturePath = 'assets/textures/pine.jpg'; // default
    
    if (beamType && beamType.toLowerCase().includes('oak')) {
      texturePath = 'assets/textures/oak.jpg';
    } else if (beamType && beamType.toLowerCase().includes('pine')) {
      texturePath = 'assets/textures/pine.jpg';
    }
    
    return this.textureLoader.load(texturePath);
  }

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

  // פונקציות לשליטה ברוחב
  increaseWidth() {
    // שמירת המצב הנוכחי של המצלמה
    const currentCameraState = this.saveCurrentCameraState();
    
    this.dynamicParams.width += 5; // הוספת 5 ס"מ
    this.createSimpleProductWithoutCameraUpdate(); // יצירת המודל מחדש ללא עדכון מצלמה
    
    // שחזור המצב של המצלמה
    this.restoreCameraState(currentCameraState);
    
    console.log('רוחב הוגדל ל:', this.dynamicParams.width);
  }

  decreaseWidth() {
    if (this.dynamicParams.width > 20) { // הגבלה מינימלית של 20 ס"מ
      // שמירת המצב הנוכחי של המצלמה
      const currentCameraState = this.saveCurrentCameraState();
      
      this.dynamicParams.width -= 5; // הפחתת 5 ס"מ
      this.createSimpleProductWithoutCameraUpdate(); // יצירת המודל מחדש ללא עדכון מצלמה
      
      // שחזור המצב של המצלמה
      this.restoreCameraState(currentCameraState);
      
      console.log('רוחב הוקטן ל:', this.dynamicParams.width);
    }
  }

  // פונקציות לשליטה באורך
  increaseLength() {
    // שמירת המצב הנוכחי של המצלמה
    const currentCameraState = this.saveCurrentCameraState();
    
    this.dynamicParams.length += 5; // הוספת 5 ס"מ
    this.createSimpleProductWithoutCameraUpdate(); // יצירת המודל מחדש ללא עדכון מצלמה
    
    // שחזור המצב של המצלמה
    this.restoreCameraState(currentCameraState);
    
    console.log('אורך הוגדל ל:', this.dynamicParams.length);
  }

  decreaseLength() {
    if (this.dynamicParams.length > 20) { // הגבלה מינימלית של 20 ס"מ
      // שמירת המצב הנוכחי של המצלמה
      const currentCameraState = this.saveCurrentCameraState();
      
      this.dynamicParams.length -= 5; // הפחתת 5 ס"מ
      this.createSimpleProductWithoutCameraUpdate(); // יצירת המודל מחדש ללא עדכון מצלמה
      
      // שחזור המצב של המצלמה
      this.restoreCameraState(currentCameraState);
      
      console.log('אורך הוקטן ל:', this.dynamicParams.length);
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
    // מיקום המצלמה יתאים למידות האוביקט אחרי יצירת המודל
    this.target.set(0, 0, 0); // מרכז המודל
    this.camera.lookAt(this.target);
    
    // הגדרת מיקום התחלתי עבור הזום - יוגדר אחרי updateCameraPosition

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
    console.log('פרמטרים מהמוצר:', this.product.params);
    this.product.params.forEach((param: any) => {
      console.log(`פרמטר ${param.name || param.type}:`, param);
      
      // בדיקה לפי שם הפרמטר עבור מידות
      if (param.name === 'width') {
        this.dynamicParams.width = param.default || 100;
        console.log('רוחב:', this.dynamicParams.width);
      } else if (param.name === 'depth') {
        this.dynamicParams.length = param.default || 100;
        console.log('אורך (depth):', this.dynamicParams.length);
      } else if (param.name === 'height') {
        this.dynamicParams.height = param.default || 100;
        console.log('גובה:', this.dynamicParams.height);
      }
      
      // בדיקה לפי סוג הפרמטר עבור קורות
      if (param.type === 'beamSingle') {
        if (param.beams && param.beams.length > 0) {
          const beam = param.beams[param.selectedBeamIndex || 0];
          console.log('beamSingle beam:', beam);
          // החלפה: width של הפרמטר הופך ל-height של הקורה, height של הפרמטר הופך ל-width של הקורה
          this.dynamicParams.frameWidth = (beam.height / 10) || 5; // height הופך ל-width
          this.dynamicParams.frameHeight = (beam.width / 10) || 5; // width הופך ל-height
          console.log('frameWidth:', this.dynamicParams.frameWidth, 'frameHeight:', this.dynamicParams.frameHeight);
        }
      } else if (param.type === 'beamArray' && param.name === 'shelfs') {
        if (param.beams && param.beams.length > 0) {
          const beam = param.beams[param.selectedBeamIndex || 0];
          console.log('shelfs beam:', beam);
          // המרה ממ"מ לס"מ כמו בקובץ הראשי
          this.dynamicParams.beamWidth = (beam.width / 10) || 10; // ברירת מחדל 10 כמו בקובץ הראשי
          this.dynamicParams.beamHeight = (beam.height / 10) || 2; // ברירת מחדל 2 כמו בקובץ הראשי
          console.log('beamWidth:', this.dynamicParams.beamWidth, 'beamHeight:', this.dynamicParams.beamHeight);
        }
        // מספר מדפים
        this.dynamicParams.shelfCount = param.default || 3;
      }
    });

    console.log('פרמטרים מאותחלים מהמוצר:', this.dynamicParams);
  }

  private createSimpleProduct() {
    // ניקוי המודל הקודם
    this.meshes.forEach(mesh => this.scene.remove(mesh));
    this.meshes = [];

    // יצירת מדפים דינמיים - זהה לקובץ הראשי
    const minGap = 2; // רווח מינימלי בין קורות
    let currentY = 0;
    
    // קבלת רשימת gaps מהמוצר
    const shelfsParam = this.product?.params?.find((p: any) => p.type === 'shelfs');
    const shelfGaps = shelfsParam?.default || [10, 50, 50]; // ברירת מחדל
    const totalShelves = shelfGaps.length;

    // קבלת סוג הקורה והעץ מהפרמטרים - זהה לקובץ הראשי
    let shelfBeam = null;
    let shelfType = null;
    if (shelfsParam && Array.isArray(shelfsParam.beams) && shelfsParam.beams.length) {
      shelfBeam = shelfsParam.beams[shelfsParam.selectedBeamIndex || 0];
      shelfType = shelfBeam.types && shelfBeam.types.length ? shelfBeam.types[shelfsParam.selectedTypeIndex || 0] : null;
    }
    
    // קבלת טקסטורת עץ לקורות המדפים - זהה לקובץ הראשי
    const shelfWoodTexture = this.getWoodTexture(shelfType ? shelfType.name : '');
    
    for (let shelfIndex = 0; shelfIndex < totalShelves; shelfIndex++) {
      const isTopShelf = shelfIndex === totalShelves - 1;
      const shelfGap = shelfGaps[shelfIndex];
      // הוספת gap לכל מדף - זהה לקובץ הראשי
      currentY += shelfGap;
      
      // Surface beams (קורת משטח) - זהה לקובץ הראשי
      const surfaceBeams = this.createSurfaceBeams(
        this.dynamicParams.width,
        this.dynamicParams.length,
        this.dynamicParams.beamWidth,
        this.dynamicParams.beamHeight,
        minGap
      );
      
      for (let i = 0; i < surfaceBeams.length; i++) {
        let beam = { ...surfaceBeams[i] };
        // Only shorten first and last beam in the length (depth) direction for non-top shelves
        // Top shelf (last shelf) gets full-length beams
        if (!isTopShelf && (i === 0 || i === surfaceBeams.length - 1)) {
          beam.depth = beam.depth - 2 * this.dynamicParams.frameWidth;
        }
        
        const beamGeometry = new THREE.BoxGeometry(beam.width, beam.height, beam.depth);
        this.setCorrectTextureMapping(beamGeometry, beam.width, beam.height, beam.depth);
        const beamMaterial = new THREE.MeshStandardMaterial({ map: shelfWoodTexture });
        const beamMesh = new THREE.Mesh(beamGeometry, beamMaterial);
        beamMesh.position.set(beam.x, currentY + this.dynamicParams.frameHeight + beam.height / 2, 0);
        beamMesh.castShadow = true;
        beamMesh.receiveShadow = true;
        this.scene.add(beamMesh);
        this.meshes.push(beamMesh);
      }
      
      // Frame beams (קורת חיזוק) - זהה לקובץ הראשי
      const frameBeams = this.createFrameBeams(
        this.dynamicParams.width,
        this.dynamicParams.length,
        this.dynamicParams.frameWidth,
        this.dynamicParams.frameHeight,
        this.dynamicParams.frameWidth, // legWidth
        this.dynamicParams.frameWidth  // legDepth
      );
      
      for (const beam of frameBeams) {
        const frameGeometry = new THREE.BoxGeometry(beam.width, beam.height, beam.depth);
        this.setCorrectTextureMapping(frameGeometry, beam.width, beam.height, beam.depth);
        const frameMaterial = new THREE.MeshStandardMaterial({ map: shelfWoodTexture });
        const frameMesh = new THREE.Mesh(frameGeometry, frameMaterial);
        frameMesh.position.set(beam.x, currentY + beam.height / 2, beam.z);
        frameMesh.castShadow = true;
        frameMesh.receiveShadow = true;
        this.scene.add(frameMesh);
        this.meshes.push(frameMesh);
      }
      
      // Add the height of the shelf itself for the next shelf
      currentY += this.dynamicParams.frameHeight + this.dynamicParams.beamHeight;
    }

    // יצירת רגליים (legs) - זהה לקובץ הראשי
    // קבלת סוג הקורה של הרגליים מהפרמטרים
    const legParam = this.product?.params?.find((p: any) => p.type === 'leg');
    let legBeam = null;
    let legType = null;
    if (legParam && Array.isArray(legParam.beams) && legParam.beams.length) {
      legBeam = legParam.beams[legParam.selectedBeamIndex || 0];
      legType = legBeam.types && legBeam.types.length ? legBeam.types[legParam.selectedTypeIndex || 0] : null;
    }
    
    // קבלת טקסטורת עץ לרגליים - זהה לקובץ הראשי
    const legWoodTexture = this.getWoodTexture(legType ? legType.name : '');

    // חישוב גובה הרגליים - זהה לקובץ הראשי
    let totalY = 0;
    for (let i = 0; i < totalShelves; i++) {
      totalY += shelfGaps[i] + this.dynamicParams.frameHeight + this.dynamicParams.beamHeight;
    }
    const legHeight = totalY;
    
    // מיקום הרגליים - זהה לקובץ הראשי
    const legPositions = [
      [-this.dynamicParams.width/2 + this.dynamicParams.frameWidth/2, 0, -this.dynamicParams.length/2 + this.dynamicParams.frameWidth/2],
      [this.dynamicParams.width/2 - this.dynamicParams.frameWidth/2, 0, -this.dynamicParams.length/2 + this.dynamicParams.frameWidth/2],
      [-this.dynamicParams.width/2 + this.dynamicParams.frameWidth/2, 0, this.dynamicParams.length/2 - this.dynamicParams.frameWidth/2],
      [this.dynamicParams.width/2 - this.dynamicParams.frameWidth/2, 0, this.dynamicParams.length/2 - this.dynamicParams.frameWidth/2]
    ];
    
    legPositions.forEach(pos => {
      const legGeometry = new THREE.BoxGeometry(
        this.dynamicParams.frameWidth,
        legHeight,
        this.dynamicParams.frameWidth
      );
      this.setCorrectTextureMapping(legGeometry, this.dynamicParams.frameWidth, legHeight, this.dynamicParams.frameWidth);
      const legMaterial = new THREE.MeshStandardMaterial({ map: legWoodTexture });
      const leg = new THREE.Mesh(legGeometry, legMaterial);
      leg.position.set(pos[0], legHeight/2, pos[2]);
      leg.castShadow = true;
      leg.receiveShadow = true;
      this.scene.add(leg);
      this.meshes.push(leg);
    });



    // סיבוב המודל - זהה לקובץ הראשי
    this.scene.rotation.y = Math.PI / 6; // 30 מעלות סיבוב
    
    // התאמת מיקום המצלמה למידות האוביקט - זהה לקובץ הראשי
    this.updateCameraPosition();
  }

  // יצירת מוצר פשוט ללא עדכון מצלמה (לשימוש בכפתורי שליטה)
  private createSimpleProductWithoutCameraUpdate() {
    // ניקוי המודל הקודם
    this.meshes.forEach(mesh => this.scene.remove(mesh));
    this.meshes = [];

    // יצירת מדפים דינמיים - זהה לקובץ הראשי
    const minGap = 2; // רווח מינימלי בין קורות
    let currentY = 0;
    
    // קבלת רשימת gaps מהמוצר
    const shelfsParam = this.product?.params?.find((p: any) => p.type === 'shelfs');
    const shelfGaps = shelfsParam?.default || [10, 50, 50]; // ברירת מחדל
    const totalShelves = shelfGaps.length;

    // קבלת סוג הקורה והעץ מהפרמטרים - זהה לקובץ הראשי
    let shelfBeam = null;
    let shelfType = null;
    if (shelfsParam && Array.isArray(shelfsParam.beams) && shelfsParam.beams.length) {
      shelfBeam = shelfsParam.beams[shelfsParam.selectedBeamIndex || 0];
      shelfType = shelfBeam.types && shelfBeam.types.length ? shelfBeam.types[shelfsParam.selectedTypeIndex || 0] : null;
    }
    
    // קבלת טקסטורת עץ לקורות המדפים - זהה לקובץ הראשי
    const shelfWoodTexture = this.getWoodTexture(shelfType ? shelfType.name : '');
    
    for (let shelfIndex = 0; shelfIndex < totalShelves; shelfIndex++) {
      const isTopShelf = shelfIndex === totalShelves - 1;
      const shelfGap = shelfGaps[shelfIndex];
      // הוספת gap לכל מדף - זהה לקובץ הראשי
      currentY += shelfGap;
      
      // Surface beams (קורת משטח) - זהה לקובץ הראשי
      const surfaceBeams = this.createSurfaceBeams(
        this.dynamicParams.width,
        this.dynamicParams.length,
        this.dynamicParams.beamWidth,
        this.dynamicParams.beamHeight,
        minGap
      );
      
      for (let i = 0; i < surfaceBeams.length; i++) {
        let beam = { ...surfaceBeams[i] };
        // Only shorten first and last beam in the length (depth) direction for non-top shelves
        // Top shelf (last shelf) gets full-length beams
        if (!isTopShelf && (i === 0 || i === surfaceBeams.length - 1)) {
          beam.depth = beam.depth - 2 * this.dynamicParams.frameWidth;
        }
        
        const beamGeometry = new THREE.BoxGeometry(beam.width, beam.height, beam.depth);
        this.setCorrectTextureMapping(beamGeometry, beam.width, beam.height, beam.depth);
        const beamMaterial = new THREE.MeshStandardMaterial({ map: shelfWoodTexture });
        const beamMesh = new THREE.Mesh(beamGeometry, beamMaterial);
        beamMesh.position.set(beam.x, currentY + this.dynamicParams.frameHeight + beam.height / 2, 0);
        beamMesh.castShadow = true;
        beamMesh.receiveShadow = true;
        this.scene.add(beamMesh);
        this.meshes.push(beamMesh);
      }
      
      // Frame beams (קורת חיזוק) - זהה לקובץ הראשי
      const frameBeams = this.createFrameBeams(
        this.dynamicParams.width,
        this.dynamicParams.length,
        this.dynamicParams.frameWidth,
        this.dynamicParams.frameHeight,
        this.dynamicParams.frameWidth, // legWidth
        this.dynamicParams.frameWidth  // legDepth
      );
      
      for (const beam of frameBeams) {
        const frameGeometry = new THREE.BoxGeometry(beam.width, beam.height, beam.depth);
        this.setCorrectTextureMapping(frameGeometry, beam.width, beam.height, beam.depth);
        const frameMaterial = new THREE.MeshStandardMaterial({ map: shelfWoodTexture });
        const frameMesh = new THREE.Mesh(frameGeometry, frameMaterial);
        frameMesh.position.set(beam.x, currentY + beam.height / 2, beam.z);
        frameMesh.castShadow = true;
        frameMesh.receiveShadow = true;
        this.scene.add(frameMesh);
        this.meshes.push(frameMesh);
      }
      
      // Add the height of the shelf itself for the next shelf
      currentY += this.dynamicParams.frameHeight + this.dynamicParams.beamHeight;
    }

    // יצירת רגליים (legs) - זהה לקובץ הראשי
    // קבלת סוג הקורה של הרגליים מהפרמטרים
    const legParam = this.product?.params?.find((p: any) => p.type === 'leg');
    let legBeam = null;
    let legType = null;
    if (legParam && Array.isArray(legParam.beams) && legParam.beams.length) {
      legBeam = legParam.beams[legParam.selectedBeamIndex || 0];
      legType = legBeam.types && legBeam.types.length ? legBeam.types[legParam.selectedTypeIndex || 0] : null;
    }
    
    // קבלת טקסטורת עץ לרגליים - זהה לקובץ הראשי
    const legWoodTexture = this.getWoodTexture(legType ? legType.name : '');

    // חישוב גובה הרגליים - זהה לקובץ הראשי
    let totalY = 0;
    for (let i = 0; i < totalShelves; i++) {
      totalY += shelfGaps[i] + this.dynamicParams.frameHeight + this.dynamicParams.beamHeight;
    }
    const legHeight = totalY;
    
    // מיקום הרגליים - זהה לקובץ הראשי
    const legPositions = [
      [-this.dynamicParams.width/2 + this.dynamicParams.frameWidth/2, 0, -this.dynamicParams.length/2 + this.dynamicParams.frameWidth/2],
      [this.dynamicParams.width/2 - this.dynamicParams.frameWidth/2, 0, -this.dynamicParams.length/2 + this.dynamicParams.frameWidth/2],
      [-this.dynamicParams.width/2 + this.dynamicParams.frameWidth/2, 0, this.dynamicParams.length/2 - this.dynamicParams.frameWidth/2],
      [this.dynamicParams.width/2 - this.dynamicParams.frameWidth/2, 0, this.dynamicParams.length/2 - this.dynamicParams.frameWidth/2]
    ];
    
    legPositions.forEach(pos => {
      const legGeometry = new THREE.BoxGeometry(
        this.dynamicParams.frameWidth,
        legHeight,
        this.dynamicParams.frameWidth
      );
      this.setCorrectTextureMapping(legGeometry, this.dynamicParams.frameWidth, legHeight, this.dynamicParams.frameWidth);
      const legMaterial = new THREE.MeshStandardMaterial({ map: legWoodTexture });
      const leg = new THREE.Mesh(legGeometry, legMaterial);
      leg.position.set(pos[0], legHeight/2, pos[2]);
      leg.castShadow = true;
      leg.receiveShadow = true;
      this.scene.add(leg);
      this.meshes.push(leg);
    });

    // סיבוב המודל - זהה לקובץ הראשי
    this.scene.rotation.y = Math.PI / 6; // 30 מעלות סיבוב
    
    // לא מעדכנים את מיקום המצלמה - שומרים על הזווית והסיבוב הנוכחיים
  }

  // שמירת המצב הנוכחי של המצלמה
  private saveCurrentCameraState() {
    return {
      cameraPosition: this.camera.position.clone(),
      target: this.target.clone(),
      spherical: {
        radius: this.spherical.radius,
        theta: this.spherical.theta,
        phi: this.spherical.phi
      },
      sceneRotation: {
        x: this.scene.rotation.x,
        y: this.scene.rotation.y,
        z: this.scene.rotation.z
      }
    };
  }

  // שחזור המצב של המצלמה
  private restoreCameraState(cameraState: any) {
    // שחזור מיקום המצלמה
    this.camera.position.copy(cameraState.cameraPosition);
    this.target.copy(cameraState.target);
    
    // שחזור מצב spherical
    this.spherical.radius = cameraState.spherical.radius;
    this.spherical.theta = cameraState.spherical.theta;
    this.spherical.phi = cameraState.spherical.phi;
    
    // שחזור סיבוב המודל
    this.scene.rotation.x = cameraState.sceneRotation.x;
    this.scene.rotation.y = cameraState.sceneRotation.y;
    this.scene.rotation.z = cameraState.sceneRotation.z;
    
    // עדכון נקודת המבט
    this.camera.lookAt(this.target);
  }

  // התאמת מיקום המצלמה למידות האוביקט - זהה לקובץ הראשי
  private updateCameraPosition() {
    // חישוב מידות האוביקט
    const width = this.dynamicParams.width;
    const height = this.dynamicParams.height;
    const depth = this.dynamicParams.length;
    
    // מרכז האוביקט
    const centerY = height / 2;
    this.target.set(0, centerY, 0);
    
    // חישוב המרחק האופטימלי של המצלמה
    const fov = this.camera.fov * Math.PI / 180;
    const fitHeight = height * 1.15;
    const fitWidth = width * 1.15;
    const fitDepth = depth * 1.15;
    const distanceY = fitHeight / (2 * Math.tan(fov / 2));
    const distanceX = fitWidth / (2 * Math.tan(fov / 2) * this.camera.aspect);
    const distance = Math.max(distanceY, distanceX, fitDepth * 1.2) * 2; // זום אאוט פי 2
    
    // מיקום המצלמה - זהה לקובץ הראשי
    this.camera.position.set(0.7 * width, distance, 1.2 * depth);
    this.camera.lookAt(this.target);
    
    // סיבוב המצלמה 30 מעלות כלפי מטה
    const offset = this.camera.position.clone().sub(this.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    spherical.phi += 30 * Math.PI / 180; // 30 מעלות כלפי מטה
    this.camera.position.setFromSpherical(spherical).add(this.target);
    this.camera.lookAt(this.target);
    
    // פאן של 30 פיקסלים למטה (כאילו גררנו עם גלגל העכבר)
    this.target.y += 30;
    this.camera.lookAt(this.target);
    
    // הגדרת מיקום התחלתי עבור הזום - אחרי מיקום המצלמה
    const offset2 = this.camera.position.clone().sub(this.target);
    this.spherical.setFromVector3(offset2);
  }


  private animate() {
    this.animationId = requestAnimationFrame(() => this.animate());
    
    // עדכון נקודת המבט של המצלמה
    this.camera.lookAt(this.target);
    
    // סיבוב איטי של המודל (רק אם המשתמש לא התחיל להזיז)
    if (!this.hasUserInteracted) {
      this.scene.rotation.y += 0.005;
    }
    
    this.renderer.render(this.scene, this.camera);
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

  // קורות חיזוק - זהה לקובץ הראשי
  private createFrameBeams(
    totalWidth: number,
    totalLength: number,
    frameWidth: number,
    frameHeight: number,
    legWidth: number,
    legDepth: number
  ): { x: number, y: number, z: number, width: number, height: number, depth: number }[] {
    const beams = [];
    // X axis beams (front/back) - קורות אופקיות קדמיות ואחוריות
    for (const z of [
      -totalLength / 2 + legDepth / 2,    // קדמית - צמודה לקצה לפי מידות הרגליים
      totalLength / 2 - legDepth / 2      // אחורית - צמודה לקצה לפי מידות הרגליים
    ]) {
      beams.push({
        x: 0,
        y: 0,
        z,
        width: totalWidth - 2 * legWidth,  // רוחב מותאם לעובי הרגליים
        height: frameHeight,               // גובה מקורות החיזוק
        depth: frameWidth                  // עומק מקורות החיזוק
      });
    }
    // Z axis beams (left/right) - קורות אופקיות שמאליות וימניות
    for (const x of [
      -totalWidth / 2 + legWidth / 2,     // שמאלית - צמודה לקצה לפי מידות הרגליים
      totalWidth / 2 - legWidth / 2       // ימנית - צמודה לקצה לפי מידות הרגליים
    ]) {
      beams.push({
        x,
        y: 0,
        z: 0,
        width: frameWidth,                  // רוחב מקורות החיזוק
        height: frameHeight,               // גובה מקורות החיזוק
        depth: totalLength - 2 * legDepth  // עומק מותאם לעובי הרגליים
      });
    }
    return beams;
  }

  // פונקציה להגדרת UV mapping נכון לטקסטורה - זהה לקובץ הראשי
  private setCorrectTextureMapping(geometry: THREE.BoxGeometry, width: number, height: number, depth: number) {
    const uvAttribute = geometry.attributes.uv;
    const uvArray = uvAttribute.array as Float32Array;
    
    // מצא את הצלע הארוכה ביותר
    const maxDimension = Math.max(width, height, depth);
    const isWidthLongest = width === maxDimension;
    const isHeightLongest = height === maxDimension;
    const isDepthLongest = depth === maxDimension;
    
    // התאם את ה-UV mapping כך שהכיוון הרחב של הטקסטורה יהיה על הצלע הארוכה ביותר
    for (let i = 0; i < uvArray.length; i += 2) {
      const u = uvArray[i];
      const v = uvArray[i + 1];
      
      if (isWidthLongest) {
        // אם הרוחב הוא הארוך ביותר, השאר את הטקסטורה כפי שהיא
        uvArray[i] = u;
        uvArray[i + 1] = v;
      } else if (isHeightLongest) {
        // אם הגובה הוא הארוך ביותר, סובב את הטקסטורה 90 מעלות
        uvArray[i] = 1 - v;
        uvArray[i + 1] = u;
      } else if (isDepthLongest) {
        // אם העומק הוא הארוך ביותר, סובב את הטקסטורה 90 מעלות בכיוון אחר
        uvArray[i] = v;
        uvArray[i + 1] = 1 - u;
      }
    }
    
    uvAttribute.needsUpdate = true;
  }
}
