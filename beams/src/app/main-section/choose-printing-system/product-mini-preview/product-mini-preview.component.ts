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

  // פרמטרים דינמיים - ערכי ברירת מחדל זהה לקובץ הראשי
  private dynamicParams = {
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
      console.log(`פרמטר ${param.type}:`, param);
      switch (param.type) {
        case 'width':
          this.dynamicParams.width = param.default || 100; // זהה לקובץ הראשי
          console.log('רוחב:', this.dynamicParams.width);
          break;
        case 'length':
          this.dynamicParams.length = param.default || 100; // זהה לקובץ הראשי
          console.log('אורך:', this.dynamicParams.length);
          break;
        case 'height':
          this.dynamicParams.height = param.default || 100; // זהה לקובץ הראשי
          console.log('גובה:', this.dynamicParams.height);
          break;
        case 'beamSingle':
          if (param.beams && param.beams.length > 0) {
            const beam = param.beams[param.selectedBeamIndex || 0];
            console.log('beamSingle beam:', beam);
            // החלפה: width של הפרמטר הופך ל-height של הקורה, height של הפרמטר הופך ל-width של הקורה
            this.dynamicParams.frameWidth = (beam.height / 10) || 5; // height הופך ל-width
            this.dynamicParams.frameHeight = (beam.width / 10) || 5; // width הופך ל-height
            console.log('frameWidth:', this.dynamicParams.frameWidth, 'frameHeight:', this.dynamicParams.frameHeight);
          }
          break;
        case 'shelfs':
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
          break;
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
        const beamMaterial = new THREE.MeshLambertMaterial({ 
          color: this.woodColors[this.dynamicParams.woodType]
        });
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
        const frameMaterial = new THREE.MeshLambertMaterial({ 
          color: this.beamColors[this.dynamicParams.beamType]
        });
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

    // יצירת רגליים (frame beams) - מיקום קרוב יותר למרכז
    const legPositions = [
      [-this.dynamicParams.width/2 + this.dynamicParams.frameWidth/2, 0, -this.dynamicParams.length/2 + this.dynamicParams.frameWidth/2],
      [this.dynamicParams.width/2 - this.dynamicParams.frameWidth/2, 0, -this.dynamicParams.length/2 + this.dynamicParams.frameWidth/2],
      [-this.dynamicParams.width/2 + this.dynamicParams.frameWidth/2, 0, this.dynamicParams.length/2 - this.dynamicParams.frameWidth/2],
      [this.dynamicParams.width/2 - this.dynamicParams.frameWidth/2, 0, this.dynamicParams.length/2 - this.dynamicParams.frameWidth/2]
    ];

    // חישוב גובה הרגליים - זהה לקובץ הראשי
    let totalY = 0;
    for (let i = 0; i < totalShelves; i++) {
      totalY += shelfGaps[i] + this.dynamicParams.frameHeight + this.dynamicParams.beamHeight;
    }
    const legHeight = totalY;
    
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



    // סיבוב המודל - זהה לקובץ הראשי
    this.scene.rotation.y = Math.PI / 6; // 30 מעלות סיבוב
    
    // התאמת מיקום המצלמה למידות האוביקט - זהה לקובץ הראשי
    this.updateCameraPosition();
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
    
    // סיבוב המצלמה 20 מעלות כלפי מטה
    const offset = this.camera.position.clone().sub(this.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    spherical.phi += 20 * Math.PI / 180; // 20 מעלות כלפי מטה
    this.camera.position.setFromSpherical(spherical).add(this.target);
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
}
