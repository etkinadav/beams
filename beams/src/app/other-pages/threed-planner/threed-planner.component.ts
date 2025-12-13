import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { DirectionService } from '../../direction.service';
import { ThreedPlannerService, BaseFile } from '../../services/threedplanner.service';
import { environment } from '../../../environments/environment';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

@Component({
  selector: 'app-threed-planner',
  templateUrl: './threed-planner.component.html',
  styleUrls: ['./threed-planner.component.css'],
  host: {
    class: 'fill-screen'
  }
})
export class ThreedPlannerComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('threeCanvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;
  
  isRTL: boolean = true;
  isDarkMode: boolean = false;
  isAdminMode: boolean = false;
  private directionSubscription: Subscription;

  // File upload related
  selectedFile: File | null = null;
  baseFile: BaseFile | null = null;
  isUploading: boolean = false;
  uploadProgress: number = 0;
  uploadError: string | null = null;
  uploadSuccess: boolean = false;

  // Three.js related
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private currentModel: THREE.Group | null = null;
  private gridPointsGroup: THREE.Group | null = null;
  private animationFrameId: number | null = null;
  isLoadingModel: boolean = false;
  modelLoadError: string | null = null;

  constructor(
    private directionService: DirectionService,
    private threedPlannerService: ThreedPlannerService
  ) { }

  ngOnInit() {
    console.log('🚀 [3D Planner] Component initialized');
    console.log('🚀 [3D Planner] Initial state:', {
      isAdminMode: this.isAdminMode,
      isRTL: this.isRTL,
      isDarkMode: this.isDarkMode
    });
    
    this.directionSubscription = this.directionService.direction$.subscribe(direction => {
      this.isRTL = direction === 'rtl';
      console.log('🔄 [3D Planner] Direction changed:', direction);
    });

    this.directionService.isDarkMode$.subscribe(isDarkMode => {
      this.isDarkMode = isDarkMode;
      console.log('🌓 [3D Planner] Dark mode changed:', isDarkMode);
      if (this.renderer) {
        this.updateSceneColors();
      }
    });

    // Load existing base file
    this.loadBaseFile();
  }

  ngAfterViewInit() {
    if (!this.isAdminMode) {
      this.initThreeJS();
    }
  }

  ngOnDestroy() {
    if (this.directionSubscription) {
      this.directionSubscription.unsubscribe();
    }
    this.cleanupThreeJS();
  }

  toggleMode() {
    this.isAdminMode = !this.isAdminMode;
    console.log('🔄 [3D Planner] Mode toggled:', this.isAdminMode ? 'Admin Mode' : 'User Mode');
    
    if (this.isAdminMode) {
      // Cleanup Three.js when switching to admin mode
      this.cleanupThreeJS();
    } else {
      // Initialize Three.js when switching to user mode
      setTimeout(() => {
        this.initThreeJS();
        if (this.baseFile) {
          this.loadModel();
        }
      }, 100);
    }
  }

  loadBaseFile() {
    console.log('🔵 [3D Planner] Loading base file...');
    this.threedPlannerService.getBaseFile().subscribe({
      next: (response) => {
        console.log('✅ [3D Planner] Base file response:', response);
        if (response.success) {
          this.baseFile = response.baseFile;
          if (this.baseFile) {
            console.log('📄 [3D Planner] Base file loaded:', {
              id: this.baseFile.id,
              filename: this.baseFile.originalName,
              size: this.baseFile.size,
              fileType: this.baseFile.fileType
            });
            // Load model if in user mode and Three.js is initialized
            if (!this.isAdminMode && this.renderer) {
              this.loadModel();
            }
          } else {
            console.log('ℹ️ [3D Planner] No base file found');
          }
        } else {
          console.warn('⚠️ [3D Planner] Response success is false:', response);
        }
      },
      error: (error) => {
        console.error('❌ [3D Planner] Error loading base file:', error);
        console.error('❌ [3D Planner] Error details:', {
          message: error.message,
          status: error.status,
          error: error.error
        });
      }
    });
  }

  onFileSelected(event: any) {
    console.log('🔵 [3D Planner] File selection event triggered');
    console.log('🔵 [3D Planner] Event object:', event);
    console.log('🔵 [3D Planner] Event target:', event.target);
    console.log('🔵 [3D Planner] Event target files:', event.target?.files);
    
    const file = event.target.files[0];
    
    if (file) {
      console.log('📁 [3D Planner] File selected:', {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: new Date(file.lastModified)
      });
      
      // Validate file type
      const allowedExtensions = ['.obj', '.fbx', '.gltf', '.glb', '.dae', '.3ds', '.blend', '.stl', '.ply'];
      const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
      console.log('🔍 [3D Planner] File extension:', fileExtension);
      console.log('🔍 [3D Planner] Allowed extensions:', allowedExtensions);
      
      if (!allowedExtensions.includes(fileExtension)) {
        const errorMsg = 'סוג קובץ לא נתמך. אנא העלה קובץ תלת מימד (obj, fbx, gltf, glb, dae, 3ds, blend, stl, ply)';
        console.warn('⚠️ [3D Planner] Invalid file type:', fileExtension);
        this.uploadError = errorMsg;
        this.selectedFile = null;
        return;
      }

      // Validate file size (100MB)
      const maxSize = 100 * 1024 * 1024;
      console.log('📏 [3D Planner] File size validation:', {
        fileSize: file.size,
        maxSize: maxSize,
        isValid: file.size <= maxSize
      });
      
      if (file.size > maxSize) {
        const errorMsg = 'הקובץ גדול מדי. גודל מקסימלי: 100MB';
        console.warn('⚠️ [3D Planner] File too large:', file.size, 'bytes');
        this.uploadError = errorMsg;
        this.selectedFile = null;
        return;
      }

      console.log('✅ [3D Planner] File validation passed');
      this.selectedFile = file;
      this.uploadError = null;
      this.uploadSuccess = false;
      console.log('✅ [3D Planner] File set as selectedFile:', this.selectedFile?.name);
    } else {
      console.warn('⚠️ [3D Planner] No file in event');
    }
  }

  uploadFile() {
    console.log('🔵 [3D Planner] uploadFile() called');
    console.log('🔵 [3D Planner] Current state:', {
      selectedFile: this.selectedFile ? this.selectedFile.name : null,
      isUploading: this.isUploading,
      baseFile: this.baseFile
    });
    
    if (!this.selectedFile) {
      this.uploadError = 'אנא בחר קובץ להעלאה';
      console.warn('⚠️ [3D Planner] No file selected for upload');
      return;
    }

    console.log('🔵 [3D Planner] Starting file upload...');
    console.log('📤 [3D Planner] File details:', {
      name: this.selectedFile.name,
      size: this.selectedFile.size,
      type: this.selectedFile.type,
      lastModified: new Date(this.selectedFile.lastModified)
    });

    this.isUploading = true;
    this.uploadError = null;
    this.uploadSuccess = false;
    this.uploadProgress = 0;

    const uploadStartTime = Date.now();

    this.threedPlannerService.uploadBaseFile(this.selectedFile).subscribe({
      next: (response) => {
        const uploadDuration = Date.now() - uploadStartTime;
        console.log('✅ [3D Planner] Upload response received:', response);
        console.log(`⏱️ [3D Planner] Upload took ${uploadDuration}ms`);
        
        if (response.success) {
          console.log('✅ [3D Planner] Upload successful!');
          console.log('📄 [3D Planner] Base file data:', {
            id: response.baseFile.id,
            filename: response.baseFile.originalName,
            size: response.baseFile.size,
            fileType: response.baseFile.fileType,
            downloadUrl: response.baseFile.downloadUrl
          });
          
          this.baseFile = response.baseFile;
          this.uploadSuccess = true;
          this.selectedFile = null;
          
          // Reset file input
          const fileInput = document.getElementById('baseFileInput') as HTMLInputElement;
          if (fileInput) {
            fileInput.value = '';
          }
          
          setTimeout(() => {
            this.uploadSuccess = false;
          }, 3000);
        } else {
          console.warn('⚠️ [3D Planner] Response success is false:', response);
          this.uploadError = response.message || 'שגיאה בהעלאת הקובץ';
        }
        this.isUploading = false;
      },
      error: (error) => {
        const uploadDuration = Date.now() - uploadStartTime;
        console.error('❌ [3D Planner] Upload error:', error);
        console.error('❌ [3D Planner] Error details:', {
          message: error.message,
          status: error.status,
          statusText: error.statusText,
          error: error.error,
          url: error.url
        });
        console.error('❌ [3D Planner] Full error object:', JSON.stringify(error, null, 2));
        if (error.error) {
          console.error('❌ [3D Planner] Error response body:', JSON.stringify(error.error, null, 2));
          if (typeof error.error === 'object') {
            console.error('❌ [3D Planner] Error keys:', Object.keys(error.error));
          }
        }
        console.error(`⏱️ [3D Planner] Upload failed after ${uploadDuration}ms`);
        
        // Extract error message
        let errorMessage = 'שגיאה בהעלאת הקובץ. אנא נסה שוב.';
        if (error.error) {
          if (typeof error.error === 'string') {
            errorMessage = error.error;
          } else if (error.error.error) {
            errorMessage = error.error.error;
          } else if (error.error.message) {
            errorMessage = error.error.message;
          }
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        this.uploadError = errorMessage;
        this.isUploading = false;
      }
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  // Three.js initialization
  private initThreeJS() {
    if (!this.canvasRef || !this.canvasRef.nativeElement) {
      console.warn('⚠️ [3D Planner] Canvas not available yet');
      return;
    }

    console.log('🎨 [3D Planner] Initializing Three.js...');

    const canvas = this.canvasRef.nativeElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    // Scene
    this.scene = new THREE.Scene();
    this.updateSceneColors();

    // Camera
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.set(5, 5, 5);
    this.camera.lookAt(0, 0, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ 
      canvas: canvas,
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;

    // OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enableZoom = true;
    this.controls.enablePan = true;
    this.controls.enableRotate = true;
    this.controls.minDistance = 1;
    this.controls.maxDistance = 100;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight1.position.set(5, 10, 5);
    directionalLight1.castShadow = true;
    this.scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight2.position.set(-5, 5, -5);
    this.scene.add(directionalLight2);

    // Handle window resize
    window.addEventListener('resize', () => this.onWindowResize());

    // Start animation loop
    this.animate();

    console.log('✅ [3D Planner] Three.js initialized');

    // Load model if base file exists
    if (this.baseFile) {
      this.loadModel();
    }
  }

  private updateSceneColors() {
    if (!this.scene) return;
    
    if (this.isDarkMode) {
      this.scene.background = new THREE.Color(0x1a1a1a);
    } else {
      this.scene.background = new THREE.Color(0xf5f5f5);
    }
  }

  private onWindowResize() {
    if (!this.camera || !this.renderer || !this.canvasRef) return;

    const canvas = this.canvasRef.nativeElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private animate() {
    if (!this.renderer || !this.scene || !this.camera) return;

    this.animationFrameId = requestAnimationFrame(() => this.animate());

    if (this.controls) {
      this.controls.update();
    }

    this.renderer.render(this.scene, this.camera);
  }

  private cleanupThreeJS() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Cleanup grid points
    if (this.gridPointsGroup) {
      this.scene?.remove(this.gridPointsGroup);
      this.gridPointsGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(material => material.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      this.gridPointsGroup = null;
    }

    if (this.currentModel) {
      this.scene?.remove(this.currentModel);
      this.currentModel.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(material => material.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      this.currentModel = null;
    }

    if (this.controls) {
      this.controls.dispose();
    }

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null as any;
    }

    window.removeEventListener('resize', () => this.onWindowResize());
  }

  private loadModel() {
    if (!this.baseFile || !this.renderer) {
      console.warn('⚠️ [3D Planner] Cannot load model - baseFile or renderer not available');
      return;
    }

    console.log('📦 [3D Planner] Loading 3D model...');
    this.isLoadingModel = true;
    this.modelLoadError = null;

    // Remove existing model
    if (this.currentModel) {
      this.scene.remove(this.currentModel);
      this.currentModel.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(material => material.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      this.currentModel = null;
    }

    // Ensure downloadUrl includes the full path
    let fileUrl = this.baseFile.downloadUrl;
    if (fileUrl.startsWith('/api')) {
      // Already has /api prefix, use as is
      fileUrl = fileUrl;
    } else if (fileUrl.startsWith('/')) {
      // Relative URL without /api, add it
      fileUrl = environment.apiUrl + fileUrl;
    } else {
      // Full URL or relative without leading slash
      fileUrl = environment.apiUrl + '/' + fileUrl;
    }
    
    const fileName = this.baseFile.originalName.toLowerCase();
    const fileExtension = fileName.split('.').pop();

    console.log('📦 [3D Planner] Loading file:', fileUrl, 'Extension:', fileExtension);

    // Load based on file extension
    if (fileExtension === 'obj') {
      this.loadOBJModel(fileUrl);
    } else if (fileExtension === 'gltf' || fileExtension === 'glb') {
      this.loadGLTFModel(fileUrl);
    } else if (fileExtension === 'stl') {
      this.loadSTLModel(fileUrl);
    } else {
      this.modelLoadError = `פורמט קובץ לא נתמך: ${fileExtension}. נתמכים: OBJ, GLTF, GLB, STL`;
      this.isLoadingModel = false;
      console.error('❌ [3D Planner] Unsupported file format:', fileExtension);
    }
  }

  private loadOBJModel(url: string) {
    const loader = new OBJLoader();
    loader.load(
      url,
      (object) => {
        console.log('✅ [3D Planner] OBJ model loaded');
        this.setupModel(object);
      },
      (progress) => {
        if (progress.total > 0) {
          const percent = (progress.loaded / progress.total) * 100;
          console.log('📊 [3D Planner] Loading progress:', percent.toFixed(2) + '%');
        }
      },
      (error) => {
        console.error('❌ [3D Planner] Error loading OBJ:', error);
        this.modelLoadError = 'שגיאה בטעינת המודל. אנא נסה שוב.';
        this.isLoadingModel = false;
      }
    );
  }

  private loadGLTFModel(url: string) {
    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        console.log('✅ [3D Planner] GLTF model loaded');
        this.setupModel(gltf.scene);
      },
      (progress) => {
        if (progress.total > 0) {
          const percent = (progress.loaded / progress.total) * 100;
          console.log('📊 [3D Planner] Loading progress:', percent.toFixed(2) + '%');
        }
      },
      (error) => {
        console.error('❌ [3D Planner] Error loading GLTF:', error);
        this.modelLoadError = 'שגיאה בטעינת המודל. אנא נסה שוב.';
        this.isLoadingModel = false;
      }
    );
  }

  private loadSTLModel(url: string) {
    const loader = new STLLoader();
    loader.load(
      url,
      (geometry) => {
        console.log('✅ [3D Planner] STL model loaded');
        const material = new THREE.MeshStandardMaterial({ 
          color: 0x888888,
          metalness: 0.3,
          roughness: 0.7
        });
        const mesh = new THREE.Mesh(geometry, material);
        const group = new THREE.Group();
        group.add(mesh);
        this.setupModel(group);
      },
      (progress) => {
        if (progress.total > 0) {
          const percent = (progress.loaded / progress.total) * 100;
          console.log('📊 [3D Planner] Loading progress:', percent.toFixed(2) + '%');
        }
      },
      (error) => {
        console.error('❌ [3D Planner] Error loading STL:', error);
        this.modelLoadError = 'שגיאה בטעינת המודל. אנא נסה שוב.';
        this.isLoadingModel = false;
      }
    );
  }

  private setupModel(model: THREE.Group) {
    // Center and scale model
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 5 / maxDim; // Scale to fit in a 5 unit space

    model.scale.multiplyScalar(scale);
    model.position.sub(center.multiplyScalar(scale));

    // Add material if needed
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (!child.material || (Array.isArray(child.material) && child.material.length === 0)) {
          child.material = new THREE.MeshStandardMaterial({ 
            color: 0x888888,
            metalness: 0.3,
            roughness: 0.7
          });
        }
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    this.currentModel = model;
    this.scene.add(model);

    // Create grid points on the model
    this.createGridPoints(model);

    // Reset camera position
    this.camera.position.set(5, 5, 5);
    this.camera.lookAt(0, 0, 0);
    this.controls.target.set(0, 0, 0);
    this.controls.update();

    this.isLoadingModel = false;
    console.log('✅ [3D Planner] Model setup complete');
  }

  private createGridPoints(model: THREE.Group) {
    console.log('🔵 [3D Planner] Creating grid points...');

    // Remove existing grid points if any
    if (this.gridPointsGroup) {
      this.scene.remove(this.gridPointsGroup);
      this.gridPointsGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(material => material.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      this.gridPointsGroup = null;
    }

    // Get bounding box of the model
    const box = new THREE.Box3().setFromObject(model);
    const min = box.min;
    const max = box.max;

    // Grid spacing: 10 cm (0.1 meter) - 10 times more points per direction
    const gridSpacing = 0.1;
    
    // Calculate grid bounds (rounded to nearest meter)
    const minX = Math.floor(min.x / gridSpacing) * gridSpacing;
    const maxX = Math.ceil(max.x / gridSpacing) * gridSpacing;
    const minZ = Math.floor(min.z / gridSpacing) * gridSpacing;
    const maxZ = Math.ceil(max.z / gridSpacing) * gridSpacing;

    // Collect all meshes from the model for raycasting
    const meshes: THREE.Mesh[] = [];
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        meshes.push(child);
      }
    });

    console.log(`📊 [3D Planner] Found ${meshes.length} meshes in model`);

    // Use Raycaster for accurate surface detection
    const raycaster = new THREE.Raycaster();
    raycaster.firstHitOnly = false;

    // Create grid points group
    this.gridPointsGroup = new THREE.Group();
    
    // Create point geometry and material (shared to save memory)
    // Much smaller points - radius 0.01 (was 0.05)
    const pointGeometry = new THREE.SphereGeometry(0.01, 6, 6);
    const pointMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff0000,
      transparent: true,
      opacity: 0.8
    });

    // Create points for each grid cell - only if ray hits the model
    let pointsCreated = 0;
    let raysCast = 0;
    
    for (let x = minX; x <= maxX; x += gridSpacing) {
      for (let z = minZ; z <= maxZ; z += gridSpacing) {
        raysCast++;
        
        // Cast ray from above the model downward
        const rayOrigin = new THREE.Vector3(x, max.y + 10, z);
        const rayDirection = new THREE.Vector3(0, -1, 0);
        raycaster.set(rayOrigin, rayDirection);
        
        // Intersect with all meshes
        const allIntersects: THREE.Intersection[] = [];
        meshes.forEach(mesh => {
          const intersects = raycaster.intersectObject(mesh, false);
          allIntersects.push(...intersects);
        });
        
        // Only create a point if the ray actually hits the model
        if (allIntersects.length > 0) {
          // Use the highest intersection point (closest to ray origin, which is above)
          const intersectionPoints = allIntersects.map(i => i.point.y);
          const pointY = Math.max(...intersectionPoints);

          // Create point at the highest Y position
          const point = new THREE.Mesh(pointGeometry, pointMaterial);
          point.position.set(x, pointY, z);
          this.gridPointsGroup.add(point);
          pointsCreated++;
        }
      }
    }
    
    console.log(`📊 [3D Planner] Cast ${raysCast} rays, created ${pointsCreated} points`);

    if (pointsCreated > 0) {
      this.scene.add(this.gridPointsGroup);
      console.log(`✅ [3D Planner] Created ${pointsCreated} grid points`);
    } else {
      console.warn('⚠️ [3D Planner] No grid points created');
    }
  }
}

