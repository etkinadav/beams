import { Component, Input, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
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
export class ProductMiniPreviewComponent implements AfterViewInit, OnDestroy {
  @Input() product: any;
  @ViewChild('miniPreviewContainer', { static: true }) container!: ElementRef;

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private animationId!: number;

  // ערכי ברירת מחדל פשוטים - הקטנתי עוד יותר כדי שיתאים לפריים
  private defaultWidth = 25; // ס"מ - הקטנתי עוד יותר
  private defaultLength = 15; // ס"מ - הקטנתי עוד יותר
  private defaultHeight = 50; // ס"מ - הקטנתי עוד יותר
  private defaultShelfCount = 3;
  private defaultBeamWidth = 1; // ס"מ - הקטנתי עוד יותר
  private defaultBeamHeight = 0.5; // ס"מ - הקטנתי עוד יותר
  private defaultFrameWidth = 1; // ס"מ - הקטנתי עוד יותר
  private defaultFrameHeight = 1; // ס"מ - הקטנתי עוד יותר

  ngAfterViewInit() {
    this.initThreeJS();
    this.createSimpleProduct();
    this.animate();
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
    this.camera.lookAt(0, this.defaultHeight/-2, 0); // חזרתי למצב הקודם

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

  private createSimpleProduct() {
    // יצירת מדפים פשוטים
    const shelfHeight = this.defaultHeight / this.defaultShelfCount;
    
    for (let i = 0; i < this.defaultShelfCount; i++) {
      const y = i * shelfHeight;
      
      // יצירת מדף (משטח)
      const shelfGeometry = new THREE.BoxGeometry(
        this.defaultWidth, 
        this.defaultBeamHeight, 
        this.defaultLength
      );
      const shelfMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x8B4513 // חום עץ
      });
      const shelf = new THREE.Mesh(shelfGeometry, shelfMaterial);
      shelf.position.set(0, y, 0);
      shelf.castShadow = true;
      shelf.receiveShadow = true;
      this.scene.add(shelf);

      // יצירת קורות מדף
      const beamCount = Math.floor(this.defaultWidth / (this.defaultBeamWidth + 2));
      for (let j = 0; j < beamCount; j++) {
        const x = (j - beamCount/2) * (this.defaultBeamWidth + 2);
        const beamGeometry = new THREE.BoxGeometry(
          this.defaultBeamWidth,
          this.defaultBeamHeight,
          this.defaultLength
        );
        const beamMaterial = new THREE.MeshLambertMaterial({ 
          color: 0x654321 // חום כהה יותר
        });
        const beam = new THREE.Mesh(beamGeometry, beamMaterial);
        beam.position.set(x, y, 0);
        beam.castShadow = true;
        beam.receiveShadow = true;
        this.scene.add(beam);
      }
    }

    // יצירת רגליים (frame beams)
    const legPositions = [
      [-this.defaultWidth/2, 0, -this.defaultLength/2],
      [this.defaultWidth/2, 0, -this.defaultLength/2],
      [-this.defaultWidth/2, 0, this.defaultLength/2],
      [this.defaultWidth/2, 0, this.defaultLength/2]
    ];

    legPositions.forEach(pos => {
      const legGeometry = new THREE.BoxGeometry(
        this.defaultFrameWidth,
        this.defaultHeight,
        this.defaultFrameWidth
      );
      const legMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x4a4a4a // אפור כהה
      });
      const leg = new THREE.Mesh(legGeometry, legMaterial);
      leg.position.set(pos[0], this.defaultHeight/2, pos[2]);
      leg.castShadow = true;
      leg.receiveShadow = true;
      this.scene.add(leg);
    });

    // הוספת קורות חיזוק אופקיות
    for (let i = 1; i < this.defaultShelfCount; i++) {
      const y = i * shelfHeight;
      
      // קורות חיזוק קדמיות ואחוריות
      [-this.defaultLength/2, this.defaultLength/2].forEach(z => {
        const braceGeometry = new THREE.BoxGeometry(
          this.defaultWidth,
          this.defaultFrameHeight,
          this.defaultFrameWidth
        );
        const braceMaterial = new THREE.MeshLambertMaterial({ 
          color: 0x4a4a4a
        });
        const brace = new THREE.Mesh(braceGeometry, braceMaterial);
        brace.position.set(0, y, z);
        brace.castShadow = true;
        brace.receiveShadow = true;
        this.scene.add(brace);
      });
    }

    // סיבוב כל המודל ב-180 מעלות סביב ציר X (להפוך למעלה-מטה)
    this.scene.rotation.x = Math.PI;
  }

  private animate() {
    this.animationId = requestAnimationFrame(() => this.animate());
    
    // סיבוב איטי של המודל
    this.scene.rotation.y += 0.005;
    
    this.renderer.render(this.scene, this.camera);
  }
}
