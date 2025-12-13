import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { DirectionService } from '../../direction.service';
import { ThreedPlannerService, BaseFile, Machine } from '../../services/threedplanner.service';
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

  // Machine upload related
  machines: Machine[] = [];
  selectedMachineFile: File | null = null;
  machineName: string = '';
  isUploadingMachine: boolean = false;
  machineUploadError: string | null = null;
  machineUploadSuccess: boolean = false;

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
  private raycaster!: THREE.Raycaster;
  private mouse: THREE.Vector2 = new THREE.Vector2();
  private hoveredPoint: THREE.Mesh | null = null;
  private mouseMoveHandler: ((event: MouseEvent) => void) | null = null;
  private mouseClickHandler: ((event: MouseEvent) => void) | null = null;
  
  // Point selection and machine selection
  selectedPoint: THREE.Mesh | null = null;
  showMachineSelection: boolean = false;
  availableMachines: Machine[] = [];
  selectedMachine: Machine | null = null;
  selectedCorner: number | null = null; // 1, 2, 3, or 4 for the 4 corners

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
      // Load machines when entering admin mode
      this.loadMachines();
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

  // Machine management
  loadMachines() {
    console.log('🔵 [3D Planner] Loading machines...');
    this.threedPlannerService.getMachines().subscribe({
      next: (response) => {
        console.log('✅ [3D Planner] Machines response:', response);
        if (response.success) {
          this.machines = response.machines;
          console.log('📄 [3D Planner] Machines loaded:', this.machines.length);
        }
      },
      error: (error) => {
        console.error('❌ [3D Planner] Error loading machines:', error);
      }
    });
  }

  onMachineFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      console.log('📁 [3D Planner] Machine file selected:', file.name);
      
      // Validate file type
      const allowedExtensions = ['.obj', '.fbx', '.gltf', '.glb', '.dae', '.3ds', '.blend', '.stl', '.ply'];
      const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
      
      if (!allowedExtensions.includes(fileExtension)) {
        this.machineUploadError = 'סוג קובץ לא נתמך. אנא העלה קובץ תלת מימד (obj, fbx, gltf, glb, dae, 3ds, blend, stl, ply)';
        this.selectedMachineFile = null;
        return;
      }

      // Validate file size (100MB)
      const maxSize = 100 * 1024 * 1024;
      if (file.size > maxSize) {
        this.machineUploadError = 'הקובץ גדול מדי. גודל מקסימלי: 100MB';
        this.selectedMachineFile = null;
        return;
      }

      this.selectedMachineFile = file;
      this.machineUploadError = null;
      this.machineUploadSuccess = false;
      
      // Set default name if empty
      if (!this.machineName) {
        this.machineName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
      }
    }
  }

  uploadMachine() {
    if (!this.selectedMachineFile) {
      this.machineUploadError = 'אנא בחר קובץ להעלאה';
      return;
    }

    if (!this.machineName || this.machineName.trim() === '') {
      this.machineUploadError = 'אנא הזן שם למכונה';
      return;
    }

    console.log('🔵 [3D Planner] Uploading machine...');
    this.isUploadingMachine = true;
    this.machineUploadError = null;
    this.machineUploadSuccess = false;

    this.threedPlannerService.uploadMachine(this.selectedMachineFile, this.machineName.trim()).subscribe({
      next: (response) => {
        console.log('✅ [3D Planner] Machine upload response:', response);
        if (response.success) {
          this.machineUploadSuccess = true;
          this.selectedMachineFile = null;
          this.machineName = '';
          
          // Reset file input
          const fileInput = document.getElementById('machineFileInput') as HTMLInputElement;
          if (fileInput) {
            fileInput.value = '';
          }
          
          // Reload machines list
          this.loadMachines();
          
          setTimeout(() => {
            this.machineUploadSuccess = false;
          }, 3000);
        } else {
          this.machineUploadError = response.message || 'שגיאה בהעלאת הקובץ';
        }
        this.isUploadingMachine = false;
      },
      error: (error) => {
        console.error('❌ [3D Planner] Machine upload error:', error);
        let errorMessage = 'שגיאה בהעלאת הקובץ. אנא נסה שוב.';
        if (error.error) {
          if (typeof error.error === 'string') {
            errorMessage = error.error;
          } else if (error.error.error) {
            errorMessage = error.error.error;
          } else if (error.error.message) {
            errorMessage = error.error.message;
          }
        }
        this.machineUploadError = errorMessage;
        this.isUploadingMachine = false;
      }
    });
  }

  deleteMachine(machineId: string) {
    if (!confirm('האם אתה בטוח שברצונך למחוק את המכונה?')) {
      return;
    }

    console.log('🔵 [3D Planner] Deleting machine:', machineId);
    this.threedPlannerService.deleteMachine(machineId).subscribe({
      next: (response) => {
        console.log('✅ [3D Planner] Machine deleted:', response);
        if (response.success) {
          // Reload machines list
          this.loadMachines();
        }
      },
      error: (error) => {
        console.error('❌ [3D Planner] Error deleting machine:', error);
        alert('שגיאה במחיקת המכונה. אנא נסה שוב.');
      }
    });
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

    // Raycaster for point selection
    this.raycaster = new THREE.Raycaster();

    // Add event listeners for mouse interaction
    this.mouseMoveHandler = (event: MouseEvent) => this.onMouseMove(event);
    this.mouseClickHandler = (event: MouseEvent) => this.onMouseClick(event);
    canvas.addEventListener('mousemove', this.mouseMoveHandler);
    canvas.addEventListener('click', this.mouseClickHandler);

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

    // Update raycaster with mouse position for hover detection
    if (this.raycaster && this.camera) {
      this.raycaster.setFromCamera(this.mouse, this.camera);
    }

    this.renderer.render(this.scene, this.camera);
  }

  private onMouseMove(event: MouseEvent) {
    if (!this.canvasRef || !this.renderer || !this.gridPointsGroup) return;

    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    
    // Calculate mouse position in normalized device coordinates (-1 to +1)
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Update raycaster
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Check for intersections with grid points (including hitboxes)
    const intersects = this.raycaster.intersectObjects(this.gridPointsGroup.children, false);
    
    if (intersects.length > 0) {
      // Change cursor to pointer
      canvas.style.cursor = 'pointer';
    } else {
      // Reset cursor
      canvas.style.cursor = 'default';
    }
  }

  private onMouseClick(event: MouseEvent) {
    if (!this.gridPointsGroup) return;

    // Update raycaster
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Check for intersections with grid points (including hitboxes)
    const intersects = this.raycaster.intersectObjects(this.gridPointsGroup.children, false);
    
    if (intersects.length > 0) {
      let clickedObject = intersects[0].object as THREE.Mesh;
      
      // If we clicked on a hitbox, get the actual point mesh
      if ((clickedObject as any).pointMesh) {
        clickedObject = (clickedObject as any).pointMesh;
      }
      
      // Make sure it's actually a point (has originalColor property)
      if (!(clickedObject as any).originalColor) {
        return; // Not a point, ignore
      }
      
      // Reset previous selected point
      if (this.selectedPoint && this.selectedPoint !== clickedObject) {
        this.resetPointToOriginal(this.selectedPoint);
      }
      
      // Select new point
      this.selectedPoint = clickedObject;
      this.highlightSelectedPoint(clickedObject);
      
      // Load machines and show selection dialog
      this.loadMachinesForSelection();
      this.showMachineSelection = true;
      
      console.log('✅ [3D Planner] Point selected at:', clickedObject.position);
    }
  }

  private resetPointToOriginal(point: THREE.Mesh) {
    point.scale.set(1, 1, 1);
    if (point.material instanceof THREE.MeshBasicMaterial) {
      point.material.opacity = 0.8;
      // Restore original color
      const originalColor = (point as any).originalColor;
      if (originalColor !== undefined) {
        point.material.color.setHex(originalColor);
      }
    }
  }

  private highlightSelectedPoint(point: THREE.Mesh) {
    point.scale.set(2, 2, 2);
    if (point.material instanceof THREE.MeshBasicMaterial) {
      point.material.opacity = 1.0;
      // Change color to yellow for selected point
      point.material.color.setHex(0xffff00);
    }
  }

  private loadMachinesForSelection() {
    console.log('🔵 [3D Planner] Loading machines for selection...');
    this.threedPlannerService.getMachines().subscribe({
      next: (response) => {
        console.log('✅ [3D Planner] Machines loaded for selection:', response);
        if (response.success) {
          this.availableMachines = response.machines;
        }
      },
      error: (error) => {
        console.error('❌ [3D Planner] Error loading machines for selection:', error);
        this.availableMachines = [];
      }
    });
  }

  onMachineSelected(machine: Machine) {
    console.log('✅ [3D Planner] Machine selected:', machine);
    this.selectedMachine = machine;
  }

  onCornerSelected(corner: number) {
    console.log('✅ [3D Planner] Corner selected:', corner);
    this.selectedCorner = corner;
  }

  addMachine() {
    if (!this.selectedMachine || !this.selectedCorner || !this.selectedPoint) {
      console.warn('⚠️ [3D Planner] Cannot add machine - machine, corner, or point not selected');
      return;
    }
    
    const pointPosition = this.selectedPoint.position;
    console.log('✅ [3D Planner] Adding machine:', {
      machine: this.selectedMachine,
      corner: this.selectedCorner,
      point: pointPosition
    });
    
    // Send configuration to backend
    this.threedPlannerService.addMachineConfig(
      this.selectedMachine.id,
      pointPosition.x,
      pointPosition.y,
      pointPosition.z,
      this.selectedCorner
    ).subscribe({
      next: (response) => {
        console.log('✅ [3D Planner] Machine configuration saved:', response);
        if (response.success) {
          // Close dialog and reset
          this.closeMachineSelection();
        }
      },
      error: (error) => {
        console.error('❌ [3D Planner] Error saving machine configuration:', error);
        alert('שגיאה בשמירת קונפיגורציית המכונה. אנא נסה שוב.');
      }
    });
  }

  closeMachineSelection() {
    this.showMachineSelection = false;
    this.selectedMachine = null;
    this.selectedCorner = null;
    // Reset selected point
    if (this.selectedPoint) {
      this.resetPointToOriginal(this.selectedPoint);
      this.selectedPoint = null;
    }
  }

  private cleanupThreeJS() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Remove event listeners
    if (this.canvasRef && this.canvasRef.nativeElement && this.mouseMoveHandler && this.mouseClickHandler) {
      const canvas = this.canvasRef.nativeElement;
      canvas.removeEventListener('mousemove', this.mouseMoveHandler);
      canvas.removeEventListener('click', this.mouseClickHandler);
      this.mouseMoveHandler = null;
      this.mouseClickHandler = null;
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
    
    // Create point geometry and material for large points (blue)
    // Large points - radius 0.006
    const largePointGeometry = new THREE.SphereGeometry(0.006, 6, 6);
    const largePointMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x0000ff, // Blue
      transparent: true,
      opacity: 0.8
    });

    // Create point geometry and material for small points (purple)
    // Small points - same size as large points
    const smallPointGeometry = new THREE.SphereGeometry(0.006, 6, 6);
    const smallPointMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x800080, // Purple
      transparent: true,
      opacity: 0.8
    });

    // Create large points for each grid cell - only if ray hits the model
    let largePointsCreated = 0;
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

          // Create large point at the highest Y position
          const point = new THREE.Mesh(largePointGeometry, largePointMaterial.clone());
          point.position.set(x, pointY, z);
          // Store original color for this point
          (point as any).originalColor = 0x0000ff; // Blue
          
          // Create invisible larger hitbox for easier selection
          const hitboxGeometry = new THREE.SphereGeometry(0.02, 8, 8); // 3x larger than point
          const hitboxMaterial = new THREE.MeshBasicMaterial({ 
            visible: false, // Invisible
            transparent: true,
            opacity: 0
          });
          const hitbox = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
          hitbox.position.set(x, pointY, z);
          // Store reference to the actual point in the hitbox
          (hitbox as any).pointMesh = point;
          this.gridPointsGroup.add(hitbox);
          this.gridPointsGroup.add(point);
          largePointsCreated++;
        }
      }
    }
    
    console.log(`📊 [3D Planner] Cast ${raysCast} rays, created ${largePointsCreated} large points`);

    // Create fine grid points - small points between large points
    const fineGridSpacing = gridSpacing / 2; // 0.05 (50 cm) - one point between each two large points
    let smallPointsCreated = 0;
    let fineRaysCast = 0;
    
    // Create fine grid between the large grid points
    for (let x = minX; x <= maxX; x += fineGridSpacing) {
      for (let z = minZ; z <= maxZ; z += fineGridSpacing) {
        // Skip positions that already have large points (at gridSpacing intervals)
        // Check if this position aligns with the large grid
        const xOffset = Math.abs((x - minX) % gridSpacing);
        const zOffset = Math.abs((z - minZ) % gridSpacing);
        const isLargePointPosition = 
          (xOffset < 0.0001 || xOffset > gridSpacing - 0.0001) && 
          (zOffset < 0.0001 || zOffset > gridSpacing - 0.0001);
        
        if (isLargePointPosition) {
          continue; // Skip this position, it already has a large point
        }
        
        fineRaysCast++;
        
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
          // Use the highest intersection point
          const intersectionPoints = allIntersects.map(i => i.point.y);
          const pointY = Math.max(...intersectionPoints);

          // Create small point at the highest Y position
          const smallPoint = new THREE.Mesh(smallPointGeometry, smallPointMaterial.clone());
          smallPoint.position.set(x, pointY, z);
          // Store original color for this point
          (smallPoint as any).originalColor = 0x800080; // Purple
          
          // Create invisible larger hitbox for easier selection
          const hitboxGeometry = new THREE.SphereGeometry(0.02, 8, 8); // 3x larger than point
          const hitboxMaterial = new THREE.MeshBasicMaterial({ 
            visible: false, // Invisible
            transparent: true,
            opacity: 0
          });
          const hitbox = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
          hitbox.position.set(x, pointY, z);
          // Store reference to the actual point in the hitbox
          (hitbox as any).pointMesh = smallPoint;
          this.gridPointsGroup.add(hitbox);
          this.gridPointsGroup.add(smallPoint);
          smallPointsCreated++;
        }
      }
    }
    
    console.log(`📊 [3D Planner] Cast ${fineRaysCast} fine rays, created ${smallPointsCreated} small points`);

    if (largePointsCreated > 0 || smallPointsCreated > 0) {
      this.scene.add(this.gridPointsGroup);
      console.log(`✅ [3D Planner] Created ${largePointsCreated} large points and ${smallPointsCreated} small points`);
    } else {
      console.warn('⚠️ [3D Planner] No grid points created');
    }
  }
}

