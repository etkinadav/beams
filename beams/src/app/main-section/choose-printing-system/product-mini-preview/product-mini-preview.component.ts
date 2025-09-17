import { Component, Input, ElementRef, ViewChild, AfterViewInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import * as THREE from 'three';

@Component({
  selector: 'app-product-mini-preview',
  templateUrl: './product-mini-preview.component.html',
  styleUrls: ['./product-mini-preview.component.scss']
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

  // גבהי המדפים הנוכחיים
  public shelfGaps: number[] = [10, 50, 50];
  
  // פרמטרים נוכחיים של הקורה
  public currentBeamIndex: number = 0;
  public currentBeamTypeIndex: number = 0;
  
  // מרחק ברירת מחדל של המצלמה
  private defaultDistance: number = 0;
  
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
    console.log('getWoodTexture נקרא עם beamType:', beamType);
    const texturePath = beamType ? `assets/textures/${beamType}.jpg` : 'assets/textures/pine.jpg';
    console.log('טוען טקסטורה מהנתיב:', texturePath);
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
  private inactivityTimer: any = null; // טיימר לחוסר פעילות

  ngAfterViewInit() {
    this.initThreeJS();
    this.initializeParamsFromProduct();
    this.createSimpleProduct();
    this.animate();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['product'] && this.scene) {
      console.log('מוצר השתנה, מעדכן פרמטרים...');
      // השתמש ב-setTimeout כדי למנוע את השגיאה
      setTimeout(() => {
        this.initializeParamsFromProduct();
        this.createSimpleProduct();
      }, 0);
    }
  }

  ngOnDestroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }
  }

  // פונקציה לאפס את טיימר חוסר הפעילות
  private resetInactivityTimer() {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }
    this.inactivityTimer = setTimeout(() => {
      this.hasUserInteracted = false; // החזרת הסיבוב האוטומטי
      console.log('החזרת סיבוב אוטומטי אחרי 5 שניות של חוסר פעילות');
    }, 5000); // 5 שניות
  }

  // פונקציה לקבלת שם התצוגה של קורת החיזוק הנוכחית
  getCurrentFrameBeamDisplayName(): string {
    if (!this.product || !this.product.params) {
      return 'קורת חיזוק לא זמינה';
    }
    
    // חיפוש קורות החיזוק
    let currentBeam: any = null;
    let currentBeamType: any = null;
    
    this.product.params.forEach((param: any) => {
      if (param.type === 'beamSingle' && param.beams && param.beams.length > 0) {
        const beamIndex = param.selectedBeamIndex || 0;
        if (param.beams[beamIndex]) {
          currentBeam = param.beams[beamIndex];
          const typeIndex = param.selectedBeamTypeIndex || 0;
          if (currentBeam.types && currentBeam.types[typeIndex]) {
            currentBeamType = currentBeam.types[typeIndex];
          }
        }
      }
    });
    
    if (!currentBeam) {
      return 'קורת חיזוק לא זמינה';
    }
    
    if (currentBeamType) {
      return `${currentBeam.translatedName || currentBeam.name} (${currentBeamType.translatedName || currentBeamType.name})`;
    }
    
    return currentBeam.translatedName || currentBeam.name || 'קורת חיזוק לא זמינה';
  }

  // פונקציה לקבלת שם התצוגה של קורת המדפים הנוכחית
  getCurrentShelfBeamDisplayName(): string {
    if (!this.product || !this.product.params) {
      return 'קורת מדפים לא זמינה';
    }
    
    // חיפוש קורות המדפים
    let currentBeam: any = null;
    let currentBeamType: any = null;
    
    this.product.params.forEach((param: any) => {
      if (param.type === 'beamArray' && param.name === 'shelfs' && param.beams && param.beams.length > 0) {
        const beamIndex = param.selectedBeamIndex || 0;
        if (param.beams[beamIndex]) {
          currentBeam = param.beams[beamIndex];
          const typeIndex = param.selectedBeamTypeIndex || 0;
          if (currentBeam.types && currentBeam.types[typeIndex]) {
            currentBeamType = currentBeam.types[typeIndex];
          }
        }
      }
    });
    
    if (!currentBeam) {
      return 'קורת מדפים לא זמינה';
    }
    
    if (currentBeamType) {
      return `${currentBeam.translatedName || currentBeam.name} (${currentBeamType.translatedName || currentBeamType.name})`;
    }
    
    return currentBeam.translatedName || currentBeam.name || 'קורת מדפים לא זמינה';
  }

  // פונקציה להחלפת סוג קורת החיזוק
  changeFrameBeamType() {
    if (!this.product || !this.product.params) {
      return;
    }

    // חיפוש קורות החיזוק
    let frameBeams: any[] = [];
    let frameParam: any = null;
    this.product.params.forEach((param: any) => {
      if (param.type === 'beamSingle' && param.beams && param.beams.length > 0) {
        frameBeams = param.beams;
        frameParam = param;
      }
    });

    if (frameBeams.length === 0 || !frameParam) {
      return;
    }

    // בחירת קורה רנדומלית
    const randomBeamIndex = Math.floor(Math.random() * frameBeams.length);
    const beam = frameBeams[randomBeamIndex];
    
    // בחירת סוג קורה רנדומלי אם יש סוגים זמינים
    let randomTypeIndex = 0;
    if (beam.types && beam.types.length > 0) {
      randomTypeIndex = Math.floor(Math.random() * beam.types.length);
    }

    // עדכון האינדקסים בפרמטר
    frameParam.selectedBeamIndex = randomBeamIndex;
    frameParam.selectedBeamTypeIndex = randomTypeIndex;

    // עדכון הפרמטרים הדינמיים
    if (beam.types && beam.types[randomTypeIndex]) {
      const beamType = beam.types[randomTypeIndex];
      // בדיקות בטיחות למידות הקורה
      const beamWidth = beamType.width || beam.width || 50; // ברירת מחדל 50 מ"מ
      const beamHeight = beamType.height || beam.height || 50; // ברירת מחדל 50 מ"מ
      this.dynamicParams.frameWidth = beamHeight / 10; // height הופך ל-width
      this.dynamicParams.frameHeight = beamWidth / 10; // width הופך ל-height
      console.log('עדכון מידות קורת חיזוק:', { beamWidth, beamHeight, frameWidthCm: this.dynamicParams.frameWidth, frameHeightCm: this.dynamicParams.frameHeight });
    } else {
      // אם אין types, נשתמש במידות הקורה עצמה
      const beamWidth = beam.width || 50; // ברירת מחדל 50 מ"מ
      const beamHeight = beam.height || 50; // ברירת מחדל 50 מ"מ
      this.dynamicParams.frameWidth = beamHeight / 10;
      this.dynamicParams.frameHeight = beamWidth / 10;
      console.log('עדכון מידות קורת חיזוק (ללא types):', { beamWidth, beamHeight, frameWidthCm: this.dynamicParams.frameWidth, frameHeightCm: this.dynamicParams.frameHeight });
    }

    console.log(`החלפתי קורת חיזוק לקורה ${randomBeamIndex}, סוג ${randomTypeIndex}:`, beam);

    // יצירת המודל מחדש עם הקורה החדשה
    this.createSimpleProduct();
  }

  // פונקציה להחלפת סוג קורת המדפים
  changeShelfBeamType() {
    if (!this.product || !this.product.params) {
      return;
    }

    // חיפוש קורות המדפים
    let shelfBeams: any[] = [];
    let shelfParam: any = null;
    this.product.params.forEach((param: any) => {
      if (param.type === 'beamArray' && param.name === 'shelfs' && param.beams && param.beams.length > 0) {
        shelfBeams = param.beams;
        shelfParam = param;
      }
    });

    if (shelfBeams.length === 0 || !shelfParam) {
      return;
    }

    // בחירת קורה רנדומלית
    const randomBeamIndex = Math.floor(Math.random() * shelfBeams.length);
    const beam = shelfBeams[randomBeamIndex];
    
    // בחירת סוג קורה רנדומלי אם יש סוגים זמינים
    let randomTypeIndex = 0;
    if (beam.types && beam.types.length > 0) {
      randomTypeIndex = Math.floor(Math.random() * beam.types.length);
    }

    // עדכון האינדקסים בפרמטר
    shelfParam.selectedBeamIndex = randomBeamIndex;
    shelfParam.selectedBeamTypeIndex = randomTypeIndex;

    // עדכון הפרמטרים הדינמיים
    if (beam.types && beam.types[randomTypeIndex]) {
      const beamType = beam.types[randomTypeIndex];
      // בדיקות בטיחות למידות הקורה
      const beamWidth = beamType.width || beam.width || 100; // ברירת מחדל 100 מ"מ
      const beamHeight = beamType.height || beam.height || 25; // ברירת מחדל 25 מ"מ
      this.dynamicParams.beamWidth = beamWidth / 10; // המרה ממ"מ לס"מ
      this.dynamicParams.beamHeight = beamHeight / 10; // המרה ממ"מ לס"מ
      console.log('עדכון מידות קורת מדפים:', { beamWidth, beamHeight, beamWidthCm: this.dynamicParams.beamWidth, beamHeightCm: this.dynamicParams.beamHeight });
    } else {
      // אם אין types, נשתמש במידות הקורה עצמה
      const beamWidth = beam.width || 100; // ברירת מחדל 100 מ"מ
      const beamHeight = beam.height || 25; // ברירת מחדל 25 מ"מ
      this.dynamicParams.beamWidth = beamWidth / 10;
      this.dynamicParams.beamHeight = beamHeight / 10;
      console.log('עדכון מידות קורת מדפים (ללא types):', { beamWidth, beamHeight, beamWidthCm: this.dynamicParams.beamWidth, beamHeightCm: this.dynamicParams.beamHeight });
    }

    console.log(`החלפתי קורת מדפים לקורה ${randomBeamIndex}, סוג ${randomTypeIndex}:`, beam);

    // יצירת המודל מחדש עם הקורה החדשה
    this.createSimpleProduct();
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

  // פונקציות לשליטה בגובה המדף השלישי
  increaseShelfHeight() {
    // שמירת המצב הנוכחי של המצלמה
    const currentCameraState = this.saveCurrentCameraState();
    
    this.shelfGaps[2] += 5; // הוספת 5 ס"מ למדף השלישי
    this.createSimpleProductWithoutCameraUpdate(); // יצירת המודל מחדש ללא עדכון מצלמה
    
    // עדכון הזום בהתאם לגובה הכולל
    this.restoreCameraState(currentCameraState, true);
    
    console.log('גובה המדף השלישי הוגדל ל:', this.shelfGaps[2]);
  }

  decreaseShelfHeight() {
    if (this.shelfGaps[2] > 10) { // הגבלה מינימלית של 10 ס"מ
      // שמירת המצב הנוכחי של המצלמה
      const currentCameraState = this.saveCurrentCameraState();
      
      this.shelfGaps[2] -= 5; // הפחתת 5 ס"מ למדף השלישי
      this.createSimpleProductWithoutCameraUpdate(); // יצירת המודל מחדש ללא עדכון מצלמה
      
      // עדכון הזום בהתאם לגובה הכולל
      this.restoreCameraState(currentCameraState, true);
      
      console.log('גובה המדף השלישי הוקטן ל:', this.shelfGaps[2]);
    }
  }

  private initThreeJS() {
    const container = this.container.nativeElement;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    this.scene = new THREE.Scene();
    
    // Enhanced background with gradient like threejs-box
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d')!;
    const gradient = context.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#F8F8F8'); // Light gray
    gradient.addColorStop(1, '#E0E0E0'); // Slightly darker gray
    context.fillStyle = gradient;
    context.fillRect(0, 0, 256, 256);
    const texture = new THREE.CanvasTexture(canvas);
    this.scene.background = texture;
    
    // Add infinite floor plane with subtle grid like threejs-box
    const floorGeometry = new THREE.PlaneGeometry(2000, 2000);
    const floorMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xF0F0F0, // Much whiter floor
        transparent: true,
        opacity: 0.5,  // 50% שקיפות
        roughness: 0.1,  // חלקות נמוכה לרפלקציה
        metalness: 0.0,  // לא מתכתי
        reflectivity: 0.25,  // 25% רפלקציה
        clearcoat: 0.1,  // שכבה שקופה דקה
        clearcoatRoughness: 0.1
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    floor.position.y = -0.1; // Slightly below ground level
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Camera
    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    // מיקום המצלמה יתאים למידות האוביקט אחרי יצירת המודל
    this.target.set(0, 0, 0); // מרכז המודל
    this.camera.lookAt(this.target);
    
    // הגדרת מיקום התחלתי עבור הזום - יוגדר אחרי updateCameraPosition

    // Renderer with enhanced settings like threejs-box
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.8; // Increased for higher contrast
    container.appendChild(this.renderer.domElement);

    // Enhanced lighting setup like threejs-box
    // Main directional light (45 degrees from right side) - increased intensity for contrast
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.6);
    const rightAngle = Math.PI / 4; // 45 degrees
    const rightDistance = 200;
    mainLight.position.set(
        Math.cos(rightAngle) * rightDistance, 
        150, 
        Math.sin(rightAngle) * rightDistance
    );
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 500;
    mainLight.shadow.camera.left = -200;
    mainLight.shadow.camera.right = 200;
    mainLight.shadow.camera.top = 200;
    mainLight.shadow.camera.bottom = -200;
    this.scene.add(mainLight);
    
    // Secondary directional light (30 degrees from left side, very weak)
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.1);
    const leftAngle = Math.PI / 6; // 30 degrees
    const leftDistance = 200;
    fillLight.position.set(
        -Math.cos(leftAngle) * leftDistance, 
        100, 
        Math.sin(leftAngle) * leftDistance
    );
    this.scene.add(fillLight);
    
    // Ambient light for overall brightness - reduced for more contrast
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambient);
    
    // Hemisphere light for atmospheric gradient
    const hemisphereLight = new THREE.HemisphereLight(0xF8F8F8, 0xD0D0D0, 0.6);
    this.scene.add(hemisphereLight);
    
    // Point light for accent
    const pointLight = new THREE.PointLight(0xffffff, 0.5, 200);
    pointLight.position.set(0, 100, 0);
    this.scene.add(pointLight);

    // הוספת אירועי עכבר לזום וסיבוב
    this.addMouseControls();
  }

  private addMouseControls() {
    const container = this.container.nativeElement;

    // גלגל עכבר לזום
    container.addEventListener('wheel', (event: WheelEvent) => {
      event.preventDefault();
      this.hasUserInteracted = true; // המשתמש התחיל להזיז
      this.resetInactivityTimer(); // אפס את טיימר חוסר הפעילות
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
      this.resetInactivityTimer(); // אפס את טיימר חוסר הפעילות
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

    // אתחול אינדקס הקורה הנוכחית - תמיד הקורה הראשונה וה-type הראשון שלה
    this.currentBeamIndex = 0;
    this.currentBeamTypeIndex = 0;
    
    // אתחול הקורה הראשונה של המדפים אם יש קורות זמינות
    let shelfBeams: any[] = [];
    
    // חיפוש קורות המדפים
    this.product.params.forEach((param: any) => {
      if (param.type === 'beamArray' && param.name === 'shelfs' && param.beams && param.beams.length > 0) {
        shelfBeams = param.beams;
      }
    });
    
    if (shelfBeams.length > 0) {
      const firstBeam = shelfBeams[0];
      
      // אם יש types לקורה הראשונה, נשתמש ב-type הראשון
      if (firstBeam.types && firstBeam.types.length > 0) {
        const firstBeamType = firstBeam.types[0];
        
        // עדכון פרמטרים דינמיים מה-type הראשון
        const beamWidth = firstBeamType.width || firstBeam.width || 100; // ברירת מחדל 100 מ"מ
        const beamHeight = firstBeamType.height || firstBeam.height || 25; // ברירת מחדל 25 מ"מ
        this.dynamicParams.beamWidth = beamWidth / 10; // המרה ממ"מ לס"מ
        this.dynamicParams.beamHeight = beamHeight / 10; // המרה ממ"מ לס"מ
        console.log('אתחול מידות קורת מדפים:', { beamWidth, beamHeight, beamWidthCm: this.dynamicParams.beamWidth, beamHeightCm: this.dynamicParams.beamHeight });
      }
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
          const beamWidth = beam.width || 50; // ברירת מחדל 50 מ"מ
          const beamHeight = beam.height || 50; // ברירת מחדל 50 מ"מ
          this.dynamicParams.frameWidth = beamHeight / 10; // height הופך ל-width
          this.dynamicParams.frameHeight = beamWidth / 10; // width הופך ל-height
          console.log('אתחול מידות קורת חיזוק:', { beamWidth, beamHeight, frameWidthCm: this.dynamicParams.frameWidth, frameHeightCm: this.dynamicParams.frameHeight });
        }
      } else if (param.type === 'beamArray' && param.name === 'shelfs') {
        if (param.beams && param.beams.length > 0) {
          const beam = param.beams[param.selectedBeamIndex || 0];
          console.log('shelfs beam:', beam);
          // המרה ממ"מ לס"מ כמו בקובץ הראשי
          const beamWidth = beam.width || 100; // ברירת מחדל 100 מ"מ
          const beamHeight = beam.height || 25; // ברירת מחדל 25 מ"מ
          this.dynamicParams.beamWidth = beamWidth / 10; // המרה ממ"מ לס"מ
          this.dynamicParams.beamHeight = beamHeight / 10; // המרה ממ"מ לס"מ
          console.log('אתחול מידות קורת מדפים:', { beamWidth, beamHeight, beamWidthCm: this.dynamicParams.beamWidth, beamHeightCm: this.dynamicParams.beamHeight });
        }
        // מספר מדפים
        this.dynamicParams.shelfCount = param.default || 3;
        
        // טעינת גבהי המדפים
        if (Array.isArray(param.default)) {
          this.shelfGaps = [...param.default]; // העתקת הגבהים מהמוצר
          console.log('גבהי מדפים נטענו:', this.shelfGaps);
        }
      }
    });

    console.log('פרמטרים מאותחלים מהמוצר:', this.dynamicParams);
  }

  private createSimpleProduct() {
    // בדיקות בטיחות למידות לפני יצירת המודל
    this.validateDynamicParams();
    
    // ניקוי המודל הקודם
    this.meshes.forEach(mesh => this.scene.remove(mesh));
    this.meshes = [];

    // יצירת מדפים דינמיים - זהה לקובץ הראשי
    const minGap = 2; // רווח מינימלי בין קורות
    let currentY = 0;
    
    // קבלת רשימת gaps מהמוצר
    const shelfsParam = this.product?.params?.find((p: any) => p.type === 'shelfs');
    const shelfGaps = this.shelfGaps; // שימוש בגבהי המדפים הנוכחיים
    const totalShelves = shelfGaps.length;

    // קבלת סוג הקורה והעץ מהפרמטרים - זהה לקובץ הראשי
    let shelfBeam = null;
    let shelfType = null;
    if (shelfsParam && Array.isArray(shelfsParam.beams) && shelfsParam.beams.length) {
      shelfBeam = shelfsParam.beams[shelfsParam.selectedBeamIndex || 0];
      shelfType = shelfBeam.types && shelfBeam.types.length ? shelfBeam.types[shelfsParam.selectedTypeIndex || 0] : null;
    }
    
    // קבלת טקסטורת עץ לקורות המדפים - זהה לקובץ הראשי
    console.log('shelfType:', shelfType);
    console.log('shelfType.name:', shelfType ? shelfType.name : 'null');
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
    console.log('legType:', legType);
    console.log('legType.name:', legType ? legType.name : 'null');
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
    // בדיקות בטיחות למידות לפני יצירת המודל
    this.validateDynamicParams();
    
    // ניקוי המודל הקודם
    this.meshes.forEach(mesh => this.scene.remove(mesh));
    this.meshes = [];

    // יצירת מדפים דינמיים - זהה לקובץ הראשי
    const minGap = 2; // רווח מינימלי בין קורות
    let currentY = 0;
    
    // קבלת רשימת gaps מהמוצר
    const shelfsParam = this.product?.params?.find((p: any) => p.type === 'shelfs');
    const shelfGaps = this.shelfGaps; // שימוש בגבהי המדפים הנוכחיים
    const totalShelves = shelfGaps.length;

    // קבלת סוג הקורה והעץ מהפרמטרים - זהה לקובץ הראשי
    let shelfBeam = null;
    let shelfType = null;
    if (shelfsParam && Array.isArray(shelfsParam.beams) && shelfsParam.beams.length) {
      shelfBeam = shelfsParam.beams[shelfsParam.selectedBeamIndex || 0];
      shelfType = shelfBeam.types && shelfBeam.types.length ? shelfBeam.types[shelfsParam.selectedTypeIndex || 0] : null;
    }
    
    // קבלת טקסטורת עץ לקורות המדפים - זהה לקובץ הראשי
    console.log('shelfType:', shelfType);
    console.log('shelfType.name:', shelfType ? shelfType.name : 'null');
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
    console.log('legType:', legType);
    console.log('legType.name:', legType ? legType.name : 'null');
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

  // שחזור המצב של המצלמה - לא משנה את המבט הנוכחי
  private restoreCameraState(cameraState: any, isCamera: boolean = false) {
    // לא משנים את מיקום המצלמה או את המבט - שומרים על המצב הנוכחי
    // רק מעדכנים את סיבוב המודל אם צריך
    if (cameraState.sceneRotation) {
      this.scene.rotation.x = cameraState.sceneRotation.x;
      this.scene.rotation.y = cameraState.sceneRotation.y;
      this.scene.rotation.z = cameraState.sceneRotation.z;
    }
    
    // עדכון נקודת המבט הנוכחית
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
    this.defaultDistance = distance;

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

  // פונקציה שמחזירה את גובה המדפים הכולל ברגע נתון
  getTotalShelfHeight(): number {
    let totalHeight = 0;
    for (let i = 0; i < this.shelfGaps.length; i++) {
      totalHeight += this.shelfGaps[i] + this.dynamicParams.frameHeight + this.dynamicParams.beamHeight;
    }
    return totalHeight;
  }

  // פונקציה שמחזירה את גובה המדפים הכולל של ברירת המחדל מהמוצר
  getTotalShelfHeightDefault(): number {
    const shelfsParam = this.product?.params?.find((p: any) => p.type === 'shelfs');
    const defaultShelfGaps = shelfsParam?.default || [10, 50, 50];
    let defaultTotalHeight = 0;
    for (let i = 0; i < defaultShelfGaps.length; i++) {
      defaultTotalHeight += defaultShelfGaps[i] + this.dynamicParams.frameHeight + this.dynamicParams.beamHeight;
    }
    return defaultTotalHeight;
  }

  // עדכון הזום בהתאם לגובה הכולל של המדפים
  private updateZoomBasedOnTotalHeight(cameraState: any) {
    // חישוב הגובה הכולל הנוכחי של המדפים
    const currentTotalHeight = this.getTotalShelfHeight();
    
    // חישוב הגובה הכולל של ברירת המחדל מהמוצר
    const defaultTotalHeight = this.getTotalShelfHeightDefault();
    
    console.log('גובה כולל נוכחי:', currentTotalHeight);
    console.log('גובה כולל ברירת מחדל:', defaultTotalHeight);
    
    // חישוב יחס הזום (ברירת מחדל = זום רגיל)
    const zoomRatio = currentTotalHeight / defaultTotalHeight;
    
    // רדיוס בסיסי לזום רגיל (הרדיוס הנוכחי של המצלמה)
    const baseRadius = cameraState.spherical.radius;
    
    // חישוב הרדיוס החדש בהתאם ליחס הזום
    const newRadius = baseRadius * zoomRatio;
    
    // הגבלת טווח הזום
    const minRadius = 30;
    const maxRadius = 250;
    const clampedRadius = Math.max(minRadius, Math.min(maxRadius, newRadius));
    
    console.log(`זום: יחס=${zoomRatio.toFixed(2)}, רדיוס בסיס=${baseRadius.toFixed(2)}, רדיוס חדש=${clampedRadius.toFixed(2)}`);
    
    // עדכון המצב של המצלמה עם הרדיוס החדש
    cameraState.spherical.radius = clampedRadius;
    
    // עדכון ישיר של המצלמה עם הרדיוס החדש
    this.spherical.radius = clampedRadius;
    this.camera.position.setFromSpherical(this.spherical).add(this.target);
    this.camera.lookAt(this.target);
    
    console.log('זום עודכן ישירות למצלמה:', this.spherical.radius);
  }

  // פונקציה לבדיקת תקינות הפרמטרים הדינמיים
  private validateDynamicParams() {
    // בדיקת מידות בסיסיות
    if (!this.dynamicParams.width || this.dynamicParams.width <= 0 || isNaN(this.dynamicParams.width)) {
      console.warn('רוחב לא תקין, מגדיר לברירת מחדל:', this.dynamicParams.width);
      this.dynamicParams.width = 100;
    }
    if (!this.dynamicParams.length || this.dynamicParams.length <= 0 || isNaN(this.dynamicParams.length)) {
      console.warn('אורך לא תקין, מגדיר לברירת מחדל:', this.dynamicParams.length);
      this.dynamicParams.length = 100;
    }
    if (!this.dynamicParams.height || this.dynamicParams.height <= 0 || isNaN(this.dynamicParams.height)) {
      console.warn('גובה לא תקין, מגדיר לברירת מחדל:', this.dynamicParams.height);
      this.dynamicParams.height = 100;
    }

    // בדיקת מידות קורות מדפים
    if (!this.dynamicParams.beamWidth || this.dynamicParams.beamWidth <= 0 || isNaN(this.dynamicParams.beamWidth)) {
      console.warn('רוחב קורת מדפים לא תקין, מגדיר לברירת מחדל:', this.dynamicParams.beamWidth);
      this.dynamicParams.beamWidth = 10;
    }
    if (!this.dynamicParams.beamHeight || this.dynamicParams.beamHeight <= 0 || isNaN(this.dynamicParams.beamHeight)) {
      console.warn('גובה קורת מדפים לא תקין, מגדיר לברירת מחדל:', this.dynamicParams.beamHeight);
      this.dynamicParams.beamHeight = 2.5;
    }

    // בדיקת מידות קורות חיזוק
    if (!this.dynamicParams.frameWidth || this.dynamicParams.frameWidth <= 0 || isNaN(this.dynamicParams.frameWidth)) {
      console.warn('רוחב קורת חיזוק לא תקין, מגדיר לברירת מחדל:', this.dynamicParams.frameWidth);
      this.dynamicParams.frameWidth = 5;
    }
    if (!this.dynamicParams.frameHeight || this.dynamicParams.frameHeight <= 0 || isNaN(this.dynamicParams.frameHeight)) {
      console.warn('גובה קורת חיזוק לא תקין, מגדיר לברירת מחדל:', this.dynamicParams.frameHeight);
      this.dynamicParams.frameHeight = 5;
    }

    console.log('פרמטרים דינמיים לאחר בדיקת תקינות:', this.dynamicParams);
  }
}
