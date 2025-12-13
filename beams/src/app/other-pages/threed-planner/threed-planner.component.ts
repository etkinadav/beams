import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
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
  isAdminMode: boolean = false; // Start in User Mode
  isAddingMachine: boolean = false; // Toggle for showing/hiding grid points and allowing machine placement
  isRemovingMachine: boolean = false; // Toggle for removing machines mode
  isEditingMachine: boolean = false; // Toggle for editing machines mode
  selectedMachineForRemoval: THREE.Group | null = null; // Selected machine to remove
  selectedMachineForEdit: THREE.Group | null = null; // Selected machine to edit
  selectedConfigForEdit: any = null; // Configuration of machine being edited
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
  machineColor: string = '#888888'; // Default color for new machines
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
  private placedMachines: Map<string, THREE.Group> = new Map(); // Map of config ID to machine model
  hasPlacedMachines: boolean = false; // Track if there are any placed machines
  private baseModelScale: number = 1; // Store the scale applied to the base model
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
  showDirectionSelection: boolean = false; // Show direction arrows for corner selection
  directionArrowsGroup: THREE.Group | null = null; // Group containing direction arrows
  availableMachines: Machine[] = [];
  selectedMachine: Machine | null = null;
  selectedCorner: number | null = null; // 1, 2, 3, or 4 for the 4 corners
  selectedRotation: number = 0; // 0, 90, 180, or 270 degrees

  constructor(
    private directionService: DirectionService,
    private threedPlannerService: ThreedPlannerService,
    private snackBar: MatSnackBar
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
          // loadMachineConfigs will be called after model is loaded in setupModel
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
              // Load machine configurations
              this.loadMachineConfigs();
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
      
      // Generate random color if not set
      if (!this.machineColor || this.machineColor === '#888888') {
        this.machineColor = this.generateRandomColor();
      }
    }
  }

  generateRandomColor(): string {
    // Generate a random color that's not too dark or too light
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
      '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52BE80',
      '#EC7063', '#5DADE2', '#58D68D', '#F4D03F', '#AF7AC5'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
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

    this.threedPlannerService.uploadMachine(this.selectedMachineFile, this.machineName.trim(), this.machineColor).subscribe({
      next: (response) => {
        console.log('✅ [3D Planner] Machine upload response:', response);
        if (response.success) {
          this.machineUploadSuccess = true;
          this.selectedMachineFile = null;
          this.machineName = '';
          this.machineColor = this.generateRandomColor(); // Generate new color for next machine
          
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

  updateMachineColor(machineId: string, color: string) {
    console.log('🔵 [3D Planner] Updating machine color:', { machineId, color });
    this.threedPlannerService.updateMachineColor(machineId, color).subscribe({
      next: (response) => {
        console.log('✅ [3D Planner] Machine color updated:', response);
        if (response.success) {
          // Update the machine in the local array
          const machine = this.machines.find(m => m.id === machineId);
          if (machine) {
            machine.color = color;
          }
          
          // If the machine is placed in the scene, update its color
          this.placedMachines.forEach((placedMachine, configId) => {
            const machineConfig = (placedMachine as any).machineConfig;
            if (machineConfig && machineConfig.machine && machineConfig.machine.id === machineId) {
              // Update the color of the placed machine
              placedMachine.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                  const colorHex = parseInt(color.replace('#', '0x'));
                  if (child.material) {
                    if (Array.isArray(child.material)) {
                      child.material.forEach(mat => {
                        if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshBasicMaterial || mat instanceof THREE.MeshPhongMaterial) {
                          mat.color.setHex(colorHex);
                        }
                      });
                    } else if (child.material instanceof THREE.MeshStandardMaterial || child.material instanceof THREE.MeshBasicMaterial || child.material instanceof THREE.MeshPhongMaterial) {
                      child.material.color.setHex(colorHex);
                    }
                  }
                }
              });
            }
          });
        }
      },
      error: (error) => {
        console.error('❌ [3D Planner] Error updating machine color:', error);
        alert('שגיאה בעדכון צבע המכונה. אנא נסה שוב.');
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
    // Limit pixel ratio to prevent jitter on high DPI displays
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;

    // OrbitControls with mobile support
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = false; // Disable damping to prevent jitter
    this.controls.enableZoom = true;
    this.controls.enablePan = true;
    this.controls.enableRotate = true;
    this.controls.minDistance = 1;
    this.controls.maxDistance = 100;
    this.controls.screenSpacePanning = false; // Prevent unwanted panning
    
    // Mobile touch support - OrbitControls supports touch by default
    // Single touch = rotate, Two finger pinch = zoom, Two finger drag = pan
    // These are the default behaviors, but we can configure them if needed

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

    // Update controls only if damping is enabled (for smooth transitions)
    // When damping is disabled, controls update automatically on interaction
    if (this.controls && this.controls.enableDamping) {
      this.controls.update();
    }

    // Render the scene
    this.renderer.render(this.scene, this.camera);
  }

  private onMouseMove(event: MouseEvent) {
    if (!this.canvasRef || !this.renderer) return;

    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    
    // Calculate mouse position in normalized device coordinates (-1 to +1)
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Update raycaster
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Check for intersections with direction arrows first (if they exist)
    if (this.showDirectionSelection && this.directionArrowsGroup) {
      const arrowIntersects = this.raycaster.intersectObjects(this.directionArrowsGroup.children, false);
      if (arrowIntersects.length > 0) {
        canvas.style.cursor = 'pointer';
        return;
      }
    }

    // Check for intersections with grid points (including hitboxes) if in adding machine mode
    if (this.isAddingMachine && this.gridPointsGroup) {
      const intersects = this.raycaster.intersectObjects(this.gridPointsGroup.children, false);
      if (intersects.length > 0) {
        canvas.style.cursor = 'pointer';
        return;
      }
    }

    // Check for intersections with placed machines if in removal or edit mode
    if ((this.isRemovingMachine || this.isEditingMachine) && this.placedMachines.size > 0) {
      const machineMeshes: THREE.Mesh[] = [];
      this.placedMachines.forEach((machineGroup) => {
        machineGroup.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            machineMeshes.push(child);
          }
        });
      });
      
      const intersects = this.raycaster.intersectObjects(machineMeshes, false);
      if (intersects.length > 0) {
        canvas.style.cursor = 'pointer';
        return;
      }
    }

    // Reset cursor
    canvas.style.cursor = 'default';
  }

  private onMouseClick(event: MouseEvent) {
    // Handle machine removal mode
    if (this.isRemovingMachine) {
      this.handleMachineRemovalClick();
      return;
    }
    
    // Handle machine edit mode
    if (this.isEditingMachine) {
      this.handleMachineEditClick();
      return;
    }
    
    // Only allow point selection if in "adding machine" mode
    if (!this.isAddingMachine) return;
    
    // If direction selection is active, check for arrow clicks first
    if (this.showDirectionSelection && this.directionArrowsGroup) {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const arrowIntersects = this.raycaster.intersectObjects(this.directionArrowsGroup.children, false);
      
      if (arrowIntersects.length > 0) {
        let clickedObject = arrowIntersects[0].object;
        
        // If clicked on hitbox, get the arrow helper
        if ((clickedObject as any).arrowHelper) {
          clickedObject = (clickedObject as any).arrowHelper;
        }
        
        const corner = (clickedObject as any).corner;
        
        if (corner && (clickedObject as any).isDirectionArrow) {
          // Corner selected, remove arrows and show machine selection
          this.selectedCorner = corner;
          this.removeDirectionArrows();
          
          // Load machines and show selection dialog
          this.loadMachinesForSelection();
          this.showMachineSelection = true;
          
          console.log('✅ [3D Planner] Corner selected:', corner);
          return;
        }
      }
    }
    
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
      
      // Reset previous selected point and arrows
      if (this.selectedPoint && this.selectedPoint !== clickedObject) {
        this.resetPointToOriginal(this.selectedPoint);
        this.removeDirectionArrows();
      }
      
      // Select new point
      this.selectedPoint = clickedObject;
      this.highlightSelectedPoint(clickedObject);
      
      // Reset corner and rotation selections
      this.selectedCorner = null;
      this.selectedRotation = 0;
      
      // Show direction arrows for corner selection
      this.showDirectionArrows(clickedObject.position);
      
      console.log('✅ [3D Planner] Point selected at:', clickedObject.position);
    }
  }

  private showDirectionArrows(pointPosition: THREE.Vector3) {
    // Remove existing arrows if any
    this.removeDirectionArrows();
    
    // Create arrows group
    this.directionArrowsGroup = new THREE.Group();
    
    // Arrow parameters - reduced by factor of 4
    const arrowLength = 0.125; // 0.5 / 4
    const arrowHeight = pointPosition.y + 0.15; // Slightly above the point
    
    // Create 4 arrows at 45-degree angles
    // The arrow points in the direction where the machine will extend
    // The corner at the point is OPPOSITE to the arrow direction
    //
    // Arrow directions and corresponding corners:
    // - Arrow southeast (45°): machine extends southeast → top-left corner (northwest) at point = Corner 1
    // - Arrow southwest (135°): machine extends southwest → top-right corner (northeast) at point = Corner 2
    // - Arrow northeast (-45°): machine extends northeast → bottom-left corner (southwest) at point = Corner 3
    // - Arrow northwest (-135°): machine extends northwest → bottom-right corner (southeast) at point = Corner 4
    
    // Arrow directions and corner mapping:
    // In Three.js: Z increases forward (away from camera), so max Z = forward/up, min Z = back/down
    // Arrow southeast (45°): right and down → bottom-right corner at point → Corner 4
    // Arrow southwest (135°): left and down → bottom-left corner at point → Corner 3
    // Arrow northeast (-45°): right and up → top-right corner at point → Corner 2
    // Arrow northwest (-135°): left and up → top-left corner at point → Corner 1
    //
    // But if Z is inverted (max Z = down, min Z = up), we need to swap:
    // Arrow southeast (45°): right and down → top-right corner at point → Corner 2
    // Arrow southwest (135°): left and down → top-left corner at point → Corner 1
    // Arrow northeast (-45°): right and up → bottom-right corner at point → Corner 4
    // Arrow northwest (-135°): left and up → bottom-left corner at point → Corner 3
    
    const directions = [
      { corner: 3, angle: 45, label: '1', color: 0xff0000 },    // Arrow southeast (45°) → bottom-left corner at point - Red
      { corner: 4, angle: 135, label: '2', color: 0x008800 },   // Arrow southwest (135°) → bottom-right corner at point - Dark Green
      { corner: 1, angle: -45, label: '3', color: 0x0000ff },   // Arrow northeast (-45°) → top-left corner at point - Blue
      { corner: 2, angle: -135, label: '4', color: 0xccaa00 }   // Arrow northwest (-135°) → top-right corner at point - Dark Yellow
    ];
    
    directions.forEach(dir => {
      // Convert angle to radians
      const angleRad = (dir.angle * Math.PI) / 180;
      
      // Calculate arrow direction (pointing away from the point)
      const direction = new THREE.Vector3(
        Math.cos(angleRad),
        0,
        Math.sin(angleRad)
      );
      
      // Arrow starts from the point and extends outward
      const origin = new THREE.Vector3(
        pointPosition.x,
        arrowHeight,
        pointPosition.z
      );
      
      const arrowHelper = new THREE.ArrowHelper(
        direction,
        origin,
        arrowLength,
        dir.color, // Different color for each arrow
        arrowLength * 0.4, // Head length
        arrowLength * 0.2 // Head width
      );
      
      // Store corner number in userData for click detection
      (arrowHelper as any).corner = dir.corner;
      (arrowHelper as any).isDirectionArrow = true;
      
      // Create a larger hitbox sphere for easier clicking
      const hitboxGeometry = new THREE.SphereGeometry(arrowLength * 0.5, 8, 8); // Larger hitbox for easier interaction
      const hitboxMaterial = new THREE.MeshBasicMaterial({ 
        transparent: true, 
        opacity: 0,
        color: dir.color
      });
      const hitbox = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
      hitbox.position.copy(origin);
      hitbox.position.add(direction.multiplyScalar(arrowLength * 0.5));
      (hitbox as any).corner = dir.corner;
      (hitbox as any).isDirectionArrow = true;
      (hitbox as any).arrowHelper = arrowHelper;
      
      // Remove label spheres - no longer needed
      
      this.directionArrowsGroup.add(arrowHelper);
      this.directionArrowsGroup.add(hitbox);
    });
    
    this.scene.add(this.directionArrowsGroup);
    this.showDirectionSelection = true;
  }

  private removeDirectionArrows() {
    if (this.directionArrowsGroup) {
      this.scene.remove(this.directionArrowsGroup);
      this.directionArrowsGroup.traverse((child) => {
        if (child instanceof THREE.ArrowHelper || child instanceof THREE.Mesh) {
          if (child instanceof THREE.Mesh && child.geometry) {
            child.geometry.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach(material => material.dispose());
              } else {
                child.material.dispose();
              }
            }
          }
        }
      });
      this.directionArrowsGroup = null;
    }
    this.showDirectionSelection = false;
  }

  private handleMachineRemovalClick() {
    if (!this.raycaster) return;

    // Update raycaster
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Check for intersections with placed machines
    const machineMeshes: THREE.Mesh[] = [];
    this.placedMachines.forEach((machineGroup) => {
      machineGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          machineMeshes.push(child);
        }
      });
    });

    const intersects = this.raycaster.intersectObjects(machineMeshes, false);
    
    if (intersects.length > 0) {
      // Find which machine group this mesh belongs to
      const clickedMesh = intersects[0].object as THREE.Mesh;
      let clickedMachine: THREE.Group | null = null;
      
      this.placedMachines.forEach((machineGroup) => {
        machineGroup.traverse((child) => {
          if (child === clickedMesh) {
            clickedMachine = machineGroup;
          }
        });
      });

      if (clickedMachine) {
        // Reset previous selection
        if (this.selectedMachineForRemoval && this.selectedMachineForRemoval !== clickedMachine) {
          this.resetMachineSelectionForRemoval(this.selectedMachineForRemoval);
        }
        
        // Select new machine
        this.selectedMachineForRemoval = clickedMachine;
        this.highlightMachineForRemoval(clickedMachine);
        
        console.log('✅ [3D Planner] Machine selected for removal:', (clickedMachine as any).configId);
      }
    }
  }

  private highlightMachineForRemoval(machine: THREE.Group) {
    machine.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.material instanceof THREE.MeshStandardMaterial || 
            (Array.isArray(child.material) && child.material[0] instanceof THREE.MeshStandardMaterial)) {
          const material = Array.isArray(child.material) ? child.material[0] : child.material;
          (material as THREE.MeshStandardMaterial).emissive.setHex(0xff0000); // Red emissive
          (material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5;
        }
      }
    });
  }

  private resetMachineSelectionForRemoval(machine: THREE.Group) {
    machine.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.material instanceof THREE.MeshStandardMaterial || 
            (Array.isArray(child.material) && child.material[0] instanceof THREE.MeshStandardMaterial)) {
          const material = Array.isArray(child.material) ? child.material[0] : child.material;
          (material as THREE.MeshStandardMaterial).emissive.setHex(0x000000); // Reset emissive
          (material as THREE.MeshStandardMaterial).emissiveIntensity = 0;
        }
      }
    });
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

  getCornerArrowColor(corner: number): string {
    // Map corner number to arrow color
    // Corner 1 → Blue arrow (-45°)
    // Corner 2 → Yellow arrow (-135°)
    // Corner 3 → Red arrow (45°)
    // Corner 4 → Green arrow (135°)
    switch (corner) {
      case 1: return 'כחול';
      case 2: return 'צהוב';
      case 3: return 'אדום';
      case 4: return 'ירוק';
      default: return '';
    }
  }

  getCornerArrowColorHex(corner: number): string {
    // Map corner number to arrow color hex code (matching the 3D arrows)
    // Corner 1 → Blue arrow (0x0000ff)
    // Corner 2 → Dark Yellow arrow (0xccaa00)
    // Corner 3 → Red arrow (0xff0000)
    // Corner 4 → Dark Green arrow (0x008800)
    switch (corner) {
      case 1: return '#0000FF'; // Blue (matches 0x0000ff)
      case 2: return '#CCAA00'; // Dark Yellow (matches 0xccaa00)
      case 3: return '#FF0000'; // Red (matches 0xff0000)
      case 4: return '#008800'; // Dark Green (matches 0x008800)
      default: return '#000000'; // Black
    }
  }

  addMachine() {
    if (!this.selectedMachine || !this.selectedCorner) {
      console.warn('⚠️ [3D Planner] Cannot add/edit machine - machine or corner not selected');
      return;
    }
    
    // If editing, use the existing config ID and point position
    if (this.isEditingMachine && this.selectedConfigForEdit) {
      const config = this.selectedConfigForEdit;
      console.log('✅ [3D Planner] Updating machine:', {
        configId: config.id,
        machine: this.selectedMachine,
        corner: this.selectedCorner,
        rotation: this.selectedRotation
      });
      
      // Update configuration in backend
      this.threedPlannerService.updateMachineConfig(
        config.id,
        this.selectedMachine.id,
        config.pointX,
        config.pointY,
        config.pointZ,
        this.selectedCorner,
        this.selectedRotation
      ).subscribe({
        next: (response) => {
          console.log('✅ [3D Planner] Machine configuration updated:', response);
          if (response.success) {
            // Remove old machine from scene
            if (this.selectedMachineForEdit) {
              this.scene.remove(this.selectedMachineForEdit);
              this.placedMachines.delete(config.id);
              
              // Clean up old machine
              this.selectedMachineForEdit.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                  child.geometry.dispose();
                  if (Array.isArray(child.material)) {
                    child.material.forEach(material => material.dispose());
                  } else {
                    child.material.dispose();
                  }
                }
              });
            }
            
            // Load and place the updated machine in 3D scene
            const machineColor = this.selectedMachine!.color || '#888888';
            this.loadAndPlaceMachine(
              this.selectedMachine!,
              config.pointX,
              config.pointY,
              config.pointZ,
              this.selectedCorner!,
              config.id,
              machineColor,
              this.selectedRotation
            );
            
            // Close dialog and reset
            this.closeMachineSelection();
            this.isEditingMachine = false;
            this.selectedMachineForEdit = null;
            this.selectedConfigForEdit = null;
            
            // Normalize all machines scale after editing
            setTimeout(() => {
              this.normalizeAllMachinesScale();
            }, 100);
          }
        },
        error: (error) => {
          console.error('❌ [3D Planner] Error updating machine configuration:', error);
          alert('שגיאה בעדכון קונפיגורציית המכונה. אנא נסה שוב.');
        }
      });
    } else {
      // Adding new machine
      if (!this.selectedPoint) {
        console.warn('⚠️ [3D Planner] Cannot add machine - point not selected');
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
        this.selectedCorner,
        this.selectedRotation
      ).subscribe({
        next: (response) => {
          console.log('✅ [3D Planner] Machine configuration saved:', response);
          if (response.success) {
            // Load and place the machine in 3D scene
            const machineColor = this.selectedMachine!.color || '#888888';
            this.loadAndPlaceMachine(
              this.selectedMachine!,
              pointPosition.x,
              pointPosition.y,
              pointPosition.z,
              this.selectedCorner!,
              response.config.id,
              machineColor,
              this.selectedRotation
            );
            
            // Close dialog and reset
            this.closeMachineSelection();
            
            // Exit add machine mode and hide grid points
            this.isAddingMachine = false;
            this.updateGridPointsVisibility();
            
            // Normalize all machines scale after adding
            setTimeout(() => {
              this.normalizeAllMachinesScale();
            }, 100);
          }
        },
        error: (error) => {
          console.error('❌ [3D Planner] Error saving machine configuration:', error);
          alert('שגיאה בשמירת קונפיגורציית המכונה. אנא נסה שוב.');
        }
      });
    }
  }

  closeMachineSelection() {
    this.showMachineSelection = false;
    this.selectedMachine = null;
    // Don't reset selectedCorner - keep it so user can change it in the dialog
    this.selectedRotation = 0; // Reset rotation
    // Remove direction arrows and reset selected point
    if (this.selectedPoint) {
      this.resetPointToOriginal(this.selectedPoint);
      this.selectedPoint = null;
      this.removeDirectionArrows();
    }
  }

  toggleAddMachineMode() {
    // If already in add mode, toggle it off
    if (this.isAddingMachine) {
      this.isAddingMachine = false;
      this.closeMachineSelection();
      this.updateGridPointsVisibility();
    } else {
      // Turn off other modes if active
      if (this.isRemovingMachine) {
        this.isRemovingMachine = false;
        this.selectedMachineForRemoval = null;
        this.updateMachinesSelectionMode();
      }
      if (this.isEditingMachine) {
        this.isEditingMachine = false;
        this.selectedMachineForEdit = null;
        this.selectedConfigForEdit = null;
        this.updateMachinesEditMode();
      }
      // Turn on add mode
      this.isAddingMachine = true;
      this.updateGridPointsVisibility();
      
      // Show snackbar message
      this.snackBar.open('בחר נקודת פינה למיקום המכונה', '', {
        duration: 5000, // 5 seconds
        horizontalPosition: 'center',
        verticalPosition: 'bottom'
      });
    }
    console.log('🔄 [3D Planner] Add machine mode toggled:', this.isAddingMachine);
  }

  toggleRemoveMachineMode() {
    // If already in remove mode, toggle it off
    if (this.isRemovingMachine) {
      this.isRemovingMachine = false;
      this.selectedMachineForRemoval = null;
      this.updateMachinesSelectionMode();
    } else {
      // Turn off other modes if active
      if (this.isAddingMachine) {
        this.isAddingMachine = false;
        this.closeMachineSelection();
        this.updateGridPointsVisibility();
      }
      if (this.isEditingMachine) {
        this.isEditingMachine = false;
        this.selectedMachineForEdit = null;
        this.selectedConfigForEdit = null;
        this.updateMachinesEditMode();
      }
      // Turn on remove mode
      this.isRemovingMachine = true;
      this.updateMachinesSelectionMode();
      
      // Show snackbar message
      this.snackBar.open('בחר מכונה להסרה', '', {
        duration: 5000, // 5 seconds
        horizontalPosition: 'center',
        verticalPosition: 'bottom'
      });
    }
    console.log('🔄 [3D Planner] Remove machine mode toggled:', this.isRemovingMachine);
  }

  toggleEditMachineMode() {
    // If already in edit mode, toggle it off
    if (this.isEditingMachine) {
      this.isEditingMachine = false;
      this.selectedMachineForEdit = null;
      this.selectedConfigForEdit = null;
      this.closeMachineSelection();
      this.updateMachinesEditMode();
    } else {
      // Turn off other modes if active
      if (this.isAddingMachine) {
        this.isAddingMachine = false;
        this.closeMachineSelection();
        this.updateGridPointsVisibility();
      }
      if (this.isRemovingMachine) {
        this.isRemovingMachine = false;
        this.selectedMachineForRemoval = null;
        this.updateMachinesSelectionMode();
      }
      // Turn on edit mode
      this.isEditingMachine = true;
      this.updateMachinesEditMode();
      
      // Show snackbar message
      this.snackBar.open('בחר מכונה לעריכה', '', {
        duration: 5000, // 5 seconds
        horizontalPosition: 'center',
        verticalPosition: 'bottom'
      });
    }
    console.log('🔄 [3D Planner] Edit machine mode toggled:', this.isEditingMachine);
  }

  private updateMachinesSelectionMode() {
    // Reset all machine selections
    if (this.selectedMachineForRemoval) {
      this.resetMachineSelectionForRemoval(this.selectedMachineForRemoval);
      this.selectedMachineForRemoval = null;
    }
  }

  private updateMachinesEditMode() {
    // Reset all machine edit selections
    if (this.selectedMachineForEdit) {
      this.resetMachineSelectionForEdit(this.selectedMachineForEdit);
      this.selectedMachineForEdit = null;
      this.selectedConfigForEdit = null;
    }
  }

  private handleMachineEditClick() {
    if (!this.raycaster) return;

    // Update raycaster
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Check for intersections with placed machines
    const machineMeshes: THREE.Mesh[] = [];
    this.placedMachines.forEach((machineGroup) => {
      machineGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          machineMeshes.push(child);
        }
      });
    });

    const intersects = this.raycaster.intersectObjects(machineMeshes, false);
    
    if (intersects.length > 0) {
      // Find which machine group this mesh belongs to
      const clickedMesh = intersects[0].object as THREE.Mesh;
      let clickedMachine: THREE.Group | null = null;
      
      this.placedMachines.forEach((machineGroup) => {
        machineGroup.traverse((child) => {
          if (child === clickedMesh) {
            clickedMachine = machineGroup;
          }
        });
      });

      if (clickedMachine) {
        const configId = (clickedMachine as any).configId;
        console.log('🔵 [3D Planner] Machine clicked for editing, configId:', configId);
        
        // Get the configuration for this machine
        this.threedPlannerService.getMachineConfigs().subscribe({
          next: (response) => {
            console.log('🔵 [3D Planner] Machine configs response:', response);
            if (response.success) {
              const config = response.configs.find((c: any) => c.id === configId);
              console.log('🔵 [3D Planner] Found config:', config);
              if (config) {
                // Reset previous selection
                if (this.selectedMachineForEdit && this.selectedMachineForEdit !== clickedMachine) {
                  this.resetMachineSelectionForEdit(this.selectedMachineForEdit);
                }
                
                // Select new machine for editing
                this.selectedMachineForEdit = clickedMachine;
                this.selectedConfigForEdit = config;
                this.highlightMachineForEdit(clickedMachine);
                
                // Load machines and show selection dialog with current values
                this.threedPlannerService.getMachines().subscribe({
                  next: (machinesResponse) => {
                    if (machinesResponse.success) {
                      this.availableMachines = machinesResponse.machines;
                      
                      // Set current values in the dialog
                      this.selectedMachine = this.availableMachines.find(m => m.id === config.machine.id) || null;
                      this.selectedCorner = config.corner;
                      this.selectedRotation = config.rotation || 0;
                      
                      console.log('🔵 [3D Planner] Setting dialog values:', {
                        selectedMachine: this.selectedMachine,
                        selectedCorner: this.selectedCorner,
                        selectedRotation: this.selectedRotation
                      });
                      
                      this.showMachineSelection = true;
                      
                      console.log('✅ [3D Planner] Machine selected for editing:', configId);
                    }
                  },
                  error: (error) => {
                    console.error('❌ [3D Planner] Error loading machines for editing:', error);
                  }
                });
              } else {
                console.error('❌ [3D Planner] Config not found for configId:', configId);
              }
            }
          },
          error: (error) => {
            console.error('❌ [3D Planner] Error loading machine configs for editing:', error);
          }
        });
      }
    }
  }

  private highlightMachineForEdit(machine: THREE.Group) {
    machine.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.material instanceof THREE.MeshStandardMaterial || 
            (Array.isArray(child.material) && child.material[0] instanceof THREE.MeshStandardMaterial)) {
          const material = Array.isArray(child.material) ? child.material[0] : child.material;
          (material as THREE.MeshStandardMaterial).emissive.setHex(0x00ff00); // Green emissive
          (material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5;
        }
      }
    });
  }

  private resetMachineSelectionForEdit(machine: THREE.Group) {
    machine.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.material instanceof THREE.MeshStandardMaterial || 
            (Array.isArray(child.material) && child.material[0] instanceof THREE.MeshStandardMaterial)) {
          const material = Array.isArray(child.material) ? child.material[0] : child.material;
          (material as THREE.MeshStandardMaterial).emissive.setHex(0x000000); // Reset emissive
          (material as THREE.MeshStandardMaterial).emissiveIntensity = 0;
        }
      }
    });
  }

  private updateGridPointsVisibility() {
    if (!this.gridPointsGroup) return;
    
    // Show/hide grid points based on isAddingMachine mode
    this.gridPointsGroup.visible = this.isAddingMachine;
  }

  private loadAndPlaceMachine(machine: Machine | any, pointX: number, pointY: number, pointZ: number, corner: number, configId: string, machineColor?: string, rotation: number = 0) {
    if (!this.renderer || !this.scene) {
      console.warn('⚠️ [3D Planner] Cannot place machine - renderer or scene not available');
      return;
    }

    // Check if machine is already placed
    if (this.placedMachines.has(configId)) {
      console.log('ℹ️ [3D Planner] Machine already placed, skipping:', configId);
      return;
    }

    console.log('🔵 [3D Planner] Loading machine model:', machine.originalName || machine.name);

    // Ensure downloadUrl includes the full path
    let fileUrl = machine.downloadUrl;
    if (fileUrl.startsWith('/api')) {
      fileUrl = fileUrl;
    } else if (fileUrl.startsWith('/')) {
      fileUrl = environment.apiUrl + fileUrl;
    } else {
      fileUrl = environment.apiUrl + '/' + fileUrl;
    }

    const fileName = machine.originalName.toLowerCase();
    const fileExtension = fileName.split('.').pop();

    // Get machine color from parameter, machine object, or use default
    const color = machineColor || (machine && machine.color) || '#888888';
    
    // Load based on file extension
    if (fileExtension === 'obj') {
      this.loadMachineOBJ(fileUrl, pointX, pointY, pointZ, corner, configId, color, rotation);
    } else if (fileExtension === 'gltf' || fileExtension === 'glb') {
      this.loadMachineGLTF(fileUrl, pointX, pointY, pointZ, corner, configId, color, rotation);
    } else if (fileExtension === 'stl') {
      this.loadMachineSTL(fileUrl, pointX, pointY, pointZ, corner, configId, color, rotation);
    } else {
      console.error('❌ [3D Planner] Unsupported file format for machine:', fileExtension);
    }
  }

  private loadMachineOBJ(url: string, pointX: number, pointY: number, pointZ: number, corner: number, configId: string, color: string, rotation: number = 0) {
    const loader = new OBJLoader();
    loader.load(
      url,
      (object) => {
        console.log('✅ [3D Planner] Machine OBJ model loaded');
        this.placeMachineModel(object, pointX, pointY, pointZ, corner, configId, color, rotation);
      },
      undefined,
      (error) => {
        console.error('❌ [3D Planner] Error loading machine OBJ:', error);
      }
    );
  }

  private loadMachineGLTF(url: string, pointX: number, pointY: number, pointZ: number, corner: number, configId: string, color: string, rotation: number = 0) {
    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        console.log('✅ [3D Planner] Machine GLTF model loaded');
        this.placeMachineModel(gltf.scene, pointX, pointY, pointZ, corner, configId, color, rotation);
      },
      undefined,
      (error) => {
        console.error('❌ [3D Planner] Error loading machine GLTF:', error);
      }
    );
  }

  private loadMachineSTL(url: string, pointX: number, pointY: number, pointZ: number, corner: number, configId: string, color: string, rotation: number = 0) {
    const loader = new STLLoader();
    loader.load(
      url,
      (geometry) => {
        console.log('✅ [3D Planner] Machine STL model loaded');
        const colorHex = parseInt(color.replace('#', '0x'));
        const material = new THREE.MeshStandardMaterial({ 
          color: colorHex,
          metalness: 0.3,
          roughness: 0.7
        });
        const mesh = new THREE.Mesh(geometry, material);
        const group = new THREE.Group();
        group.add(mesh);
        this.placeMachineModel(group, pointX, pointY, pointZ, corner, configId, color, rotation);
      },
      undefined,
      (error) => {
        console.error('❌ [3D Planner] Error loading machine STL:', error);
      }
    );
  }

  private placeMachineModel(model: THREE.Group, pointX: number, pointY: number, pointZ: number, corner: number, configId: string, color: string = '#888888', rotation: number = 0) {
    // First, set model to origin and reset scale to 1 to calculate bounding box correctly
    model.position.set(0, 0, 0);
    model.rotation.set(0, 0, 0); // Reset rotation
    model.scale.set(1, 1, 1); // Reset scale to 1 first
    model.updateMatrixWorld(true);
    
    // Apply rotation (in radians, clockwise around Y axis)
    if (rotation !== 0) {
      const rotationRad = (rotation * Math.PI) / 180; // Convert degrees to radians
      model.rotateY(rotationRad); // Rotate around Y axis (vertical)
    }
    
    // Apply the same scale as the base model (ensure baseModelScale is defined)
    if (!this.baseModelScale || this.baseModelScale === 1) {
      console.warn('⚠️ [3D Planner] baseModelScale not set, using default scale of 1. This may cause incorrect machine size!');
    }
    const scaleToApply = this.baseModelScale || 1;
    
    // Reset scale to 1 first to ensure clean scaling
    model.scale.set(1, 1, 1);
    model.updateMatrixWorld(true);
    
    // Apply the scale
    model.scale.multiplyScalar(scaleToApply);
    model.updateMatrixWorld(true);
    
    console.log('📏 [3D Planner] Applying scale to machine:', scaleToApply, 'baseModelScale:', this.baseModelScale);
    
    // Calculate bounding box of the machine after scaling
    const box = new THREE.Box3().setFromObject(model);
    const min = box.min;
    const max = box.max;

    console.log('📊 [3D Planner] Machine bounding box:', { min, max });

    // Calculate position based on corner
    // The bounding box corners relative to model origin (0,0,0):
    // Corner 1 = top-left (min X, max Z)
    // Corner 2 = top-right (max X, max Z)
    // Corner 3 = bottom-left (min X, min Z)
    // Corner 4 = bottom-right (max X, min Z)
    let machineX = pointX;
    let machineZ = pointZ;

    switch (corner) {
      case 1: // Top-left: machine's top-left corner (min X, max Z) at point
        machineX = pointX - min.x; // Shift so min.x aligns with pointX
        machineZ = pointZ - max.z; // Shift so max.z aligns with pointZ
        break;
      case 2: // Top-right: machine's top-right corner (max X, max Z) at point
        machineX = pointX - max.x; // Shift so max.x aligns with pointX
        machineZ = pointZ - max.z; // Shift so max.z aligns with pointZ
        break;
      case 3: // Bottom-left: machine's bottom-left corner (min X, min Z) at point
        machineX = pointX - min.x; // Shift so min.x aligns with pointX
        machineZ = pointZ - min.z; // Shift so min.z aligns with pointZ
        break;
      case 4: // Bottom-right: machine's bottom-right corner (max X, min Z) at point
        machineX = pointX - max.x; // Shift so max.x aligns with pointX
        machineZ = pointZ - min.z; // Shift so min.z aligns with pointZ
        break;
    }

    // For Y: the lowest point of the machine should be at the point's Y (height)
    // The model's min.y is the lowest point, so we need to position it so min.y = pointY
    const machineY = pointY - min.y;

    // Set position
    model.position.set(machineX, machineY, machineZ);

    // Apply color to all meshes
    const colorHex = parseInt(color.replace('#', '0x'));
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Update or create material with the specified color
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => {
              if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshBasicMaterial || mat instanceof THREE.MeshPhongMaterial) {
                mat.color.setHex(colorHex);
              }
            });
          } else if (child.material instanceof THREE.MeshStandardMaterial || child.material instanceof THREE.MeshBasicMaterial || child.material instanceof THREE.MeshPhongMaterial) {
            child.material.color.setHex(colorHex);
          } else {
            child.material = new THREE.MeshStandardMaterial({ 
              color: colorHex,
              metalness: 0.3,
              roughness: 0.7
            });
          }
        } else {
          child.material = new THREE.MeshStandardMaterial({ 
            color: colorHex,
            metalness: 0.3,
            roughness: 0.7
          });
        }
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Store reference to config ID
    (model as any).configId = configId;

    // Add to scene
    this.scene.add(model);
    this.placedMachines.set(configId, model);
    this.hasPlacedMachines = this.placedMachines.size > 0;

    console.log('✅ [3D Planner] Machine placed at:', { x: machineX, y: machineY, z: machineZ, corner });
  }

  deleteSelectedMachine() {
    if (!this.selectedMachineForRemoval) return;

    const configId = (this.selectedMachineForRemoval as any).configId;
    if (!configId) {
      console.error('❌ [3D Planner] Cannot delete machine: no config ID');
      return;
    }

    console.log('🔵 [3D Planner] Deleting machine configuration:', configId);

    // Call backend API to delete machine configuration
    this.threedPlannerService.deleteMachineConfig(configId).subscribe({
      next: (response) => {
        console.log('✅ [3D Planner] Machine configuration deleted:', response);
        if (response.success) {
          // Remove from scene
          this.scene.remove(this.selectedMachineForRemoval!);
          this.placedMachines.delete(configId);
          this.hasPlacedMachines = this.placedMachines.size > 0;
          
          // Clean up
          this.selectedMachineForRemoval!.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.geometry.dispose();
              if (Array.isArray(child.material)) {
                child.material.forEach(material => material.dispose());
              } else {
                child.material.dispose();
              }
            }
          });
          
          this.selectedMachineForRemoval = null;
          this.isRemovingMachine = false;
          this.updateMachinesSelectionMode();
          
          // Normalize all machines scale after deletion
          setTimeout(() => {
            this.normalizeAllMachinesScale();
          }, 100);
        }
      },
      error: (error) => {
        console.error('❌ [3D Planner] Error deleting machine configuration:', error);
        alert('שגיאה במחיקת קונפיגורציית המכונה. אנא נסה שוב.');
      }
    });
  }

  private loadMachineConfigs() {
    if (!this.renderer || !this.scene) {
      console.warn('⚠️ [3D Planner] Cannot load machine configs - renderer or scene not available');
      return;
    }

    // Ensure baseModelScale is set before loading machines
    if (!this.baseModelScale || this.baseModelScale === 1) {
      console.warn('⚠️ [3D Planner] baseModelScale not set, waiting for model setup...');
      // Wait a bit for model setup to complete
      setTimeout(() => {
        this.loadMachineConfigs();
      }, 100);
      return;
    }

    console.log('🔵 [3D Planner] Loading machine configurations...');
    this.threedPlannerService.getMachineConfigs().subscribe({
      next: (response) => {
        console.log('✅ [3D Planner] Machine configs response:', response);
        if (response.success) {
          // Load and place each machine
          response.configs.forEach(config => {
            const machineColor = config.machine?.color || '#888888';
            const rotation = config.rotation || 0;
            this.loadAndPlaceMachine(
              config.machine,
              config.pointX,
              config.pointY,
              config.pointZ,
              config.corner,
              config.id,
              machineColor,
              rotation
            );
          });
          this.hasPlacedMachines = this.placedMachines.size > 0;
          
          // Normalize all machines scale after loading
          setTimeout(() => {
            this.normalizeAllMachinesScale();
          }, 500);
        }
      },
      error: (error) => {
        console.error('❌ [3D Planner] Error loading machine configs:', error);
      }
    });
  }

  private normalizeAllMachinesScale() {
    if (!this.baseModelScale || this.baseModelScale === 1) {
      console.warn('⚠️ [3D Planner] Cannot normalize machines - baseModelScale not set');
      return;
    }

    console.log('🔧 [3D Planner] Normalizing all machines scale, baseModelScale:', this.baseModelScale);
    
    this.placedMachines.forEach((machine, configId) => {
      // Get current scale
      const currentScale = machine.scale.x; // Assuming uniform scaling
      
      // Calculate expected scale (should be baseModelScale)
      const expectedScale = this.baseModelScale;
      
      // Check if scale is wrong (more than 10% difference)
      const scaleDifference = Math.abs(currentScale - expectedScale) / expectedScale;
      
      if (scaleDifference > 0.1) {
        console.log(`🔧 [3D Planner] Fixing machine ${configId} scale: ${currentScale} -> ${expectedScale}`);
        
        // Reset scale to 1 first
        machine.scale.set(1, 1, 1);
        machine.updateMatrixWorld(true);
        
        // Apply correct scale
        machine.scale.multiplyScalar(expectedScale);
        machine.updateMatrixWorld(true);
      }
    });
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

    // Store the scale for use with machines
    this.baseModelScale = scale;

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
    
    // Load machine configurations after model is set up
    this.loadMachineConfigs();
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
      // Initially hide grid points
      this.gridPointsGroup.visible = this.isAddingMachine;
      console.log(`✅ [3D Planner] Created ${largePointsCreated} large points and ${smallPointsCreated} small points`);
    } else {
      console.warn('⚠️ [3D Planner] No grid points created');
    }
  }
}

