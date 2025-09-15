
import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import * as THREE from 'three';

interface Shelf {
    gap: number; // רווח מהמדף שמתחתיו (או מהרצפה)
}

@Component({
    selector: 'app-threejs-box',
    templateUrl: './threejs-box.component.html',
    styleUrls: ['./threejs-box.component.scss']
})
export class ThreejsBoxComponent implements AfterViewInit, OnDestroy, OnInit {
    private isUserAuthenticated = false;
    private authToken: string | null = null;
    
    // Validation messages
    validationMessage: string = '';
    showValidationMessage: boolean = false;
    
    // Helper for numeric step
    getStep(type: number): number {
        return 1 / Math.pow(10, type);
    }
    // ...existing code...
    toggleDrawer() {
        this.drawerOpen = !this.drawerOpen;
        setTimeout(() => this.onResize(), 310); // Wait for transition to finish
    }
    drawerOpen: boolean = true;
    product: any = null;
    params: any[] = [];

    constructor(private http: HttpClient) { } ת

    ngOnInit() {
        this.checkUserAuthentication();
        this.getProductById('68a186bb0717136a1a9245de');
    }

    // Check if user is authenticated
    private checkUserAuthentication() {
        const token = localStorage.getItem('token');
        if (token) {
            this.authToken = token;
            this.isUserAuthenticated = true;
            console.log('User is authenticated');
        } else {
            this.isUserAuthenticated = false;
            console.log('User is not authenticated, using localStorage');
        }
    }

    getProductById(id: string) {
        this.http.get(`/api/products/${id}`).subscribe({
            next: (data) => {
                this.product = data;
                const prod: any = data;
                this.params = (prod.params || []).map(param => {
                    // Set default selected beam and type for shelfs and beamSingle
                    if (param.name === 'shelfs' && Array.isArray(param.beams) && param.beams.length) {
                        param.selectedBeamIndex = 0;
                        param.selectedTypeIndex = Array.isArray(param.beams[0].types) && param.beams[0].types.length ? 0 : null;
                    }
                    if (param.type === 'beamSingle' && Array.isArray(param.beams) && param.beams.length) {
                        param.selectedBeamIndex = 0;
                        param.selectedTypeIndex = Array.isArray(param.beams[0].types) && param.beams[0].types.length ? 0 : null;
                    }
                    return param;
                });
                this.initParamsFromProduct();
                console.log('Product loaded:', data);
                // Load saved configuration after product is loaded
                this.loadConfiguration();
                this.updateBeams();
            },
            error: (err) => {
                console.error('Failed to load product:', err);
            }
        });
    }

    // Helper: get param by name
    getParam(name: string) {
        return this.params.find(p => p.name === name);
    }

    // Validate parameter value and show message if needed
    validateParameterValue(param: any, value: number): number {
        let validatedValue = value;
        let message = '';

        if (value < param.min) {
            validatedValue = param.min;
            message = `מידה מינימלית - ${param.min} ס"מ`;
        } else if (value > param.max) {
            validatedValue = param.max;
            message = `מידה מקסימלית - ${param.max} ס"מ`;
        }

        if (message) {
            this.showValidationMessage = true;
            this.validationMessage = message;
            // Hide message after 3 seconds
            setTimeout(() => {
                this.showValidationMessage = false;
                this.validationMessage = '';
            }, 3000);
        }

        return validatedValue;
    }

    // Update parameter value with validation
    updateParameterValue(param: any, value: number) {
        const validatedValue = this.validateParameterValue(param, value);
        param.default = validatedValue;
        this.updateBeams();
    }

    // Update shelf parameter value with validation (for array values)
    updateShelfParameterValue(param: any, value: number, index: number) {
        const validatedValue = this.validateParameterValue(param, value);
        param.default[index] = validatedValue;
        this.updateBeams();
    }

    // Shelves logic based on params
    get shelves(): Shelf[] {
        const shelfsParam = this.getParam('shelfs');
        if (shelfsParam && Array.isArray(shelfsParam.default)) {
            // Model: bottom shelf is first (no reverse)
            return shelfsParam.default.map((gap: number) => ({ gap }));
        }
        return [];
    }

    addShelf() {
        const shelfsParam = this.getParam('shelfs');
        if (shelfsParam && Array.isArray(shelfsParam.default)) {
            shelfsParam.default.push(50);
            this.updateBeams();
        }
    }

    removeShelf(idx: number) {
        const shelfsParam = this.getParam('shelfs');
        if (shelfsParam && Array.isArray(shelfsParam.default) && idx !== 0) {
            shelfsParam.default.splice(idx, 1);
            this.updateBeams();
        }
    }

    updateShelfGap(idx: number, value: number) {
        const shelfsParam = this.getParam('shelfs');
        if (shelfsParam && Array.isArray(shelfsParam.default)) {
            if (idx === 0) {
                const minGap = this.frameHeight + this.beamHeight;
                shelfsParam.default[0] = Math.max(value, minGap);
            } else {
                shelfsParam.default[idx] = value;
            }
            this.updateBeams();
        }
    }

    // Numeric params
    get surfaceWidth(): number {
        const p = this.getParam('width');
        return p ? p.default : 100;
    }
    set surfaceWidth(val: number) {
        const p = this.getParam('width');
        if (p) { p.default = val; this.updateBeams(); }
    }

    get surfaceLength(): number {
        const p = this.getParam('depth');
        return p ? p.default : 100;
    }
    set surfaceLength(val: number) {
        const p = this.getParam('depth');
        if (p) { p.default = val; this.updateBeams(); }
    }

    get minGap(): number {
        const p = this.getParam('gap');
        return p ? p.default : 1;
    }
    set minGap(val: number) {
        const p = this.getParam('gap');
        if (p) { p.default = val; this.updateBeams(); }
    }

    // Beams for shelf/leg
    get shelfBeams() {
        const p = this.getParam('shelfs');
        return p && p.beams ? p.beams : [];
    }
    get legBeams() {
        const p = this.getParam('leg');
        return p && p.beams ? p.beams : [];
    }

    // Frame beams (example: can be set in params if needed)
    frameWidth: number = 5;
    frameHeight: number = 5;
    private target: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
    beamWidth: number = 10;
    beamHeight: number = 2;
    private beamMeshes: THREE.Mesh[] = [];
    @ViewChild('rendererContainer', { static: true }) rendererContainer!: ElementRef;
    width = 2;
    height = 2;
    depth = 2;
    private scene!: THREE.Scene;
    private camera!: THREE.PerspectiveCamera;
    private renderer!: THREE.WebGLRenderer;
    private boxMesh!: THREE.Mesh;
    private onResizeBound = this.onResize.bind(this);
    private woodTexture!: THREE.Texture;
    private textureLoader = new THREE.TextureLoader();

    // Initialize other params if needed
    initParamsFromProduct() {
        // Set default selected beam and type for leg parameter
        const legParam = this.getParam('leg');
        if (legParam && Array.isArray(legParam.beams) && legParam.beams.length) {
            legParam.selectedBeamIndex = legParam.selectedBeamIndex || 0;
            legParam.selectedTypeIndex = legParam.selectedTypeIndex || 
                (Array.isArray(legParam.beams[0].types) && legParam.beams[0].types.length ? 0 : null);
        }
        
        // Example: set frameWidth/frameHeight if present in params
        // You can extend this to other params as needed
    }

    // Get wood texture based on beam type
    private getWoodTexture(beamType: string): THREE.Texture {
        let texturePath = 'assets/textures/pine.jpg'; // default
        
        if (beamType && beamType.toLowerCase().includes('oak')) {
            texturePath = 'assets/textures/oak.jpg';
        } else if (beamType && beamType.toLowerCase().includes('pine')) {
            texturePath = 'assets/textures/pine.jpg';
        }
        
        return this.textureLoader.load(texturePath);
    }

    // Save current configuration (user-specific or localStorage)
    private saveConfiguration() {
        const config = {
            params: this.params.map(param => ({
                name: param.name,
                default: param.default,
                selectedBeamIndex: param.selectedBeamIndex,
                selectedTypeIndex: param.selectedTypeIndex
            })),
            timestamp: new Date().toISOString()
        };

        if (this.isUserAuthenticated && this.authToken) {
            this.saveConfigurationToServer(config);
        } else {
            this.saveConfigurationToLocalStorage(config);
        }
    }

    // Save configuration to server (for authenticated users)
    private saveConfigurationToServer(config: any) {
        const headers = new HttpHeaders({
            'Authorization': `Bearer ${this.authToken}`,
            'Content-Type': 'application/json'
        });

        this.http.post('/api/user/beam-configuration', { configuration: config }, { headers })
            .subscribe({
                next: (response) => {
                    console.log('Configuration saved to server:', response);
                },
                error: (error) => {
                    console.error('Error saving to server, falling back to localStorage:', error);
                    this.saveConfigurationToLocalStorage(config);
                }
            });
    }

    // Save configuration to localStorage (fallback)
    private saveConfigurationToLocalStorage(config: any) {
        localStorage.setItem('beam-configuration', JSON.stringify(config));
        console.log('Configuration saved to localStorage');
    }

    // Load saved configuration (user-specific or localStorage)
    private loadConfiguration() {
        if (this.isUserAuthenticated && this.authToken) {
            this.loadConfigurationFromServer();
        } else {
            this.loadConfigurationFromLocalStorage();
        }
    }

    // Load configuration from server (for authenticated users)
    private loadConfigurationFromServer() {
        const headers = new HttpHeaders({
            'Authorization': `Bearer ${this.authToken}`
        });

        this.http.get('/api/user/beam-configuration', { headers })
            .subscribe({
                next: (response: any) => {
                    if (response.configuration && Object.keys(response.configuration).length > 0) {
                        this.applyConfiguration(response.configuration);
                        console.log('Configuration loaded from server');
                    } else {
                        // No server config, try localStorage
                        this.loadConfigurationFromLocalStorage();
                    }
                },
                error: (error) => {
                    console.error('Error loading from server, falling back to localStorage:', error);
                    this.loadConfigurationFromLocalStorage();
                }
            });
    }

    // Load configuration from localStorage (fallback)
    private loadConfigurationFromLocalStorage() {
        const savedConfig = localStorage.getItem('beam-configuration');
        if (savedConfig) {
            try {
                const config = JSON.parse(savedConfig);
                this.applyConfiguration(config);
                console.log('Configuration loaded from localStorage');
            } catch (error) {
                console.error('Error loading configuration from localStorage:', error);
            }
        }
    }

    // Apply configuration to params
    private applyConfiguration(config: any) {
        if (config.params) {
            config.params.forEach(savedParam => {
                const param = this.params.find(p => p.name === savedParam.name);
                if (param) {
                    param.default = savedParam.default;
                    param.selectedBeamIndex = savedParam.selectedBeamIndex;
                    param.selectedTypeIndex = savedParam.selectedTypeIndex;
                }
            });
        }
    }

    ngAfterViewInit() {
        this.initThree();
        this.onResize();
        window.addEventListener('resize', this.onResizeBound);
        this.animate();
        this.rendererContainer.nativeElement.addEventListener('wheel', (event: WheelEvent) => {
            event.preventDefault();
            const delta = event.deltaY;
            const direction = new THREE.Vector3().subVectors(this.camera.position, this.target).normalize();
            const distance = this.camera.position.distanceTo(this.target);
            const zoomAmount = delta * 0.05 * (distance / 100);
            let newDistance = distance + zoomAmount;
            if (newDistance < 1) newDistance = 1;
            this.camera.position.copy(direction.multiplyScalar(newDistance).add(this.target));
        }, { passive: false });

        let isDragging = false;
        let isPan = false;
        let lastX = 0;
        let lastY = 0;
        this.rendererContainer.nativeElement.addEventListener('mousedown', (event: MouseEvent) => {
            isDragging = true;
            isPan = (event.button === 1 || event.button === 2);
            lastX = event.clientX;
            lastY = event.clientY;
        });
        window.addEventListener('mousemove', (event: MouseEvent) => {
            if (!isDragging) return;
            const dx = event.clientX - lastX;
            const dy = event.clientY - lastY;
            lastX = event.clientX;
            lastY = event.clientY;
            if (isPan) {
                const panSpeed = 0.2;
                const panX = -dx * panSpeed;
                const panY = dy * panSpeed;
                const cam = this.camera;
                const pan = new THREE.Vector3();
                pan.addScaledVector(new THREE.Vector3().setFromMatrixColumn(cam.matrix, 0), panX);
                pan.addScaledVector(new THREE.Vector3().setFromMatrixColumn(cam.matrix, 1), panY);
                cam.position.add(pan);
                this.target.add(pan);
            } else {
                const angleY = dx * 0.01;
                const angleX = dy * 0.01;
                const offset = this.camera.position.clone().sub(this.target);
                const spherical = new THREE.Spherical().setFromVector3(offset);
                spherical.theta -= angleY;
                spherical.phi -= angleX;
                spherical.phi = Math.max(0.01, Math.min(Math.PI - 0.01, spherical.phi));
                this.camera.position.setFromSpherical(spherical).add(this.target);
            }
        });
        window.addEventListener('mouseup', () => {
            isDragging = false;
        });

        // Mobile touch support
        let lastTouchDist = 0;
        let lastTouchAngle = 0;
        let lastTouchX = 0;
        let lastTouchY = 0;
        let isTouchRotating = false;
        let isTouchZooming = false;
        let isTouchPanning = false;
        this.rendererContainer.nativeElement.addEventListener('touchstart', (event: TouchEvent) => {
            if (event.touches.length === 1) {
                isTouchRotating = true;
                lastTouchX = event.touches[0].clientX;
                lastTouchY = event.touches[0].clientY;
            } else if (event.touches.length === 2) {
                isTouchZooming = true;
                const dx = event.touches[0].clientX - event.touches[1].clientX;
                const dy = event.touches[0].clientY - event.touches[1].clientY;
                lastTouchDist = Math.sqrt(dx * dx + dy * dy);
                lastTouchAngle = Math.atan2(dy, dx);
            }
        }, { passive: false });

        this.rendererContainer.nativeElement.addEventListener('touchmove', (event: TouchEvent) => {
            event.preventDefault();
            if (isTouchRotating && event.touches.length === 1) {
                const touch = event.touches[0];
                const dx = touch.clientX - lastTouchX;
                const dy = touch.clientY - lastTouchY;
                lastTouchX = touch.clientX;
                lastTouchY = touch.clientY;
                const angleY = dx * 0.01;
                const angleX = dy * 0.01;
                const offset = this.camera.position.clone().sub(this.target);
                const spherical = new THREE.Spherical().setFromVector3(offset);
                spherical.theta -= angleY;
                spherical.phi -= angleX;
                spherical.phi = Math.max(0.01, Math.min(Math.PI - 0.01, spherical.phi));
                this.camera.position.setFromSpherical(spherical).add(this.target);
            } else if (isTouchZooming && event.touches.length === 2) {
                const dx = event.touches[0].clientX - event.touches[1].clientX;
                const dy = event.touches[0].clientY - event.touches[1].clientY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx);
                // Pinch zoom
                const deltaDist = dist - lastTouchDist;
                const direction = new THREE.Vector3().subVectors(this.camera.position, this.target).normalize();
                const distance = this.camera.position.distanceTo(this.target);
                const zoomAmount = -deltaDist * 0.02 * (distance / 100);
                let newDistance = distance + zoomAmount;
                if (newDistance < 1) newDistance = 1;
                this.camera.position.copy(direction.multiplyScalar(newDistance).add(this.target));
                lastTouchDist = dist;
                // Two-finger rotate (optional)
                const deltaAngle = angle - lastTouchAngle;
                if (Math.abs(deltaAngle) > 0.01) {
                    const offset = this.camera.position.clone().sub(this.target);
                    const spherical = new THREE.Spherical().setFromVector3(offset);
                    spherical.theta -= deltaAngle;
                    this.camera.position.setFromSpherical(spherical).add(this.target);
                    lastTouchAngle = angle;
                }
            }
        }, { passive: false });

        this.rendererContainer.nativeElement.addEventListener('touchend', (event: TouchEvent) => {
            isTouchRotating = false;
            isTouchZooming = false;
            isTouchPanning = false;
        });
    }

    ngOnDestroy() {
        window.removeEventListener('resize', this.onResizeBound);
    }

    initThree() {
        this.scene = new THREE.Scene();
        // Create a subtle gray gradient background
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const context = canvas.getContext('2d')!;
        const gradient = context.createLinearGradient(0, 0, 0, 256);
        gradient.addColorStop(0, '#F5F5F5'); // Light gray
        gradient.addColorStop(1, '#E0E0E0'); // Slightly darker gray
        context.fillStyle = gradient;
        context.fillRect(0, 0, 256, 256);
        const texture = new THREE.CanvasTexture(canvas);
        this.scene.background = texture;
        
        // Add infinite floor plane with subtle grid
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
        
        // Floor without grid lines for clean look
        const container = this.rendererContainer.nativeElement as HTMLElement;
        const width = container.clientWidth;
        const height = container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 30000);
        // Set camera at 45 degrees and lower height for initial view
        const radius = 400;
        const angle = Math.PI / 4;
        const camX = Math.sin(angle) * radius;
        const camZ = Math.cos(angle) * radius;
        this.camera.position.set(camX, 200, camZ);
        this.target.set(0, 0, 0);
        this.camera.lookAt(this.target);
        
        // Rotate the entire scene by 30 degrees for better default view
        this.scene.rotation.y = Math.PI / 6; // 30 degrees rotation
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.8; // Increased for higher contrast
        this.renderer.domElement.style.width = '100%';
        this.renderer.domElement.style.height = '100%';
        this.renderer.domElement.style.display = 'block';
        this.renderer.domElement.style.position = 'absolute';
        this.renderer.domElement.style.left = '0';
        this.renderer.domElement.style.top = '0';
        container.style.position = 'relative';
        container.appendChild(this.renderer.domElement);
        // Load wood texture
        const loader = new THREE.TextureLoader();
        this.woodTexture = loader.load('assets/textures/pine.jpg');
        
        // Enhanced lighting setup for better visibility and atmosphere
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
        this.beamMeshes = [];
    }

    private onResize() {
        const container = this.rendererContainer?.nativeElement as HTMLElement;
        if (!container || !this.camera || !this.renderer) return;
        const width = container.clientWidth;
        const height = container.clientHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    updateBeams() {
        // Save current configuration to localStorage
        this.saveConfiguration();
        
        this.beamMeshes.forEach(mesh => {
            this.scene.remove(mesh);
            mesh.geometry.dispose();
            (mesh.material as THREE.Material).dispose();
        });
        this.beamMeshes = [];

        // Defensive checks
        if (!this.shelves || !this.shelves.length) {
            console.warn('No shelves found, cannot render model.');
            return;
        }
        if (!this.surfaceWidth || !this.surfaceLength) {
            console.warn('surfaceWidth or surfaceLength missing, cannot render model.');
            return;
        }

        // Get shelf beam and type from params
        const shelfsParam = this.getParam('shelfs');
        let shelfBeam = null;
        let shelfType = null;
        if (shelfsParam && Array.isArray(shelfsParam.beams) && shelfsParam.beams.length) {
            shelfBeam = shelfsParam.beams[shelfsParam.selectedBeamIndex || 0];
            shelfType = shelfBeam.types && shelfBeam.types.length ? shelfBeam.types[shelfsParam.selectedTypeIndex || 0] : null;
        }
        
        // Get wood texture for shelf beams
        const shelfWoodTexture = this.getWoodTexture(shelfType ? shelfType.name : '');
        
        // Get wood texture for frame beams (קורות חיזוק)
        const frameParam = this.params.find(p => p.type === 'beamSingle');
        let frameType = null;
        if (frameParam && Array.isArray(frameParam.beams) && frameParam.beams.length) {
            const frameBeam = frameParam.beams[frameParam.selectedBeamIndex || 0];
            frameType = frameBeam.types && frameBeam.types.length ? frameBeam.types[frameParam.selectedTypeIndex || 0] : null;
        }
        const frameWoodTexture = this.getWoodTexture(frameType ? frameType.name : '');
        
        // Always convert beam width/height from mm to cm
        let beamWidth = shelfBeam ? shelfBeam.width / 10 : this.beamWidth;
        let beamHeight = shelfBeam ? shelfBeam.height / 10 : this.beamHeight;

        // For each shelf, render its beams at its calculated height
        let currentY = 0;
        const totalShelves = this.shelves.length;
        
        // Get frame beam dimensions for shelf beam shortening
        const frameParamForShortening = this.params.find(p => p.type === 'beamSingle');
        let frameBeamWidth = this.frameWidth;
        if (frameParamForShortening && Array.isArray(frameParamForShortening.beams) && frameParamForShortening.beams.length) {
            const frameBeam = frameParamForShortening.beams[frameParamForShortening.selectedBeamIndex || 0];
            if (frameBeam) {
                // החלפה: height של הפרמטר הופך ל-width של הקורה (לשימוש בקיצור)
                frameBeamWidth = frameBeam.height / 10;  // המרה ממ"מ לס"מ
            }
        }
        
        for (let shelfIndex = 0; shelfIndex < this.shelves.length; shelfIndex++) {
            const shelf = this.shelves[shelfIndex];
            currentY += shelf.gap;
            // Surface beams (קורת משטח)
            const surfaceBeams = this.createSurfaceBeams(
                this.surfaceWidth,
                this.surfaceLength,
                beamWidth,
                beamHeight,
                this.minGap
            );
            for (let i = 0; i < surfaceBeams.length; i++) {
                let beam = { ...surfaceBeams[i] };
                // Only shorten first and last beam in the length (depth) direction for non-top shelves
                // Top shelf (last shelf) gets full-length beams
                const isTopShelf = shelfIndex === totalShelves - 1;
                if (!isTopShelf && (i === 0 || i === surfaceBeams.length - 1)) {
                    beam.depth = beam.depth - 2 * frameBeamWidth;
                }
                const geometry = new THREE.BoxGeometry(beam.width, beam.height, beam.depth);
                const material = new THREE.MeshStandardMaterial({ map: shelfWoodTexture });
                const mesh = new THREE.Mesh(geometry, material);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                mesh.position.set(beam.x, currentY + this.frameHeight + beam.height / 2, 0);
                this.scene.add(mesh);
                this.beamMeshes.push(mesh);
            }
            
            // Get leg beam dimensions for frame beams positioning
            const legParam = this.getParam('leg');
            let legWidth = this.frameWidth;
            let legDepth = this.frameWidth;
            if (legParam && Array.isArray(legParam.beams) && legParam.beams.length) {
                const legBeam = legParam.beams[legParam.selectedBeamIndex || 0];
                if (legBeam) {
                    legWidth = legBeam.width / 10;   // המרה ממ"מ לס"מ
                    legDepth = legBeam.height / 10; // המרה ממ"מ לס"מ
                }
            }
            
            // Frame beams (קורת חיזוק)
            const frameBeams = this.createFrameBeams(
                this.surfaceWidth,
                this.surfaceLength,
                this.frameWidth,
                this.frameHeight,
                legWidth,
                legDepth
            );
            for (const beam of frameBeams) {
                const geometry = new THREE.BoxGeometry(beam.width, beam.height, beam.depth);
                const material = new THREE.MeshStandardMaterial({ map: frameWoodTexture });
                const mesh = new THREE.Mesh(geometry, material);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                mesh.position.set(beam.x, currentY + beam.height / 2, beam.z);
                this.scene.add(mesh);
                this.beamMeshes.push(mesh);
            }
            // Add the height of the shelf itself for the next shelf
            currentY += this.frameHeight + beamHeight;
        }
        // לא מעדכן מיקום מצלמה/zoom אחרי עדכון אלמנטים
        // רגליים (legs)
        if (this.shelves.length) {
            // Get leg beam and type from params
            const legParam = this.getParam('leg');
            let legBeam = null;
            let legType = null;
            if (legParam && Array.isArray(legParam.beams) && legParam.beams.length) {
                legBeam = legParam.beams[legParam.selectedBeamIndex || 0];
                legType = legBeam.types && legBeam.types.length ? legBeam.types[legParam.selectedTypeIndex || 0] : null;
            }
            
            // Get wood texture for leg beams
            const legWoodTexture = this.getWoodTexture(legType ? legType.name : '');
            
            // Compute total height for legs and camera
            let totalY = 0;
            for (const shelf of this.shelves) {
                totalY += shelf.gap + this.frameHeight + beamHeight;
            }
            const legs = this.createLegBeams(
                this.surfaceWidth,
                this.surfaceLength,
                this.frameWidth,
                this.frameHeight,
                totalY
            );
            for (const leg of legs) {
                const geometry = new THREE.BoxGeometry(leg.width, leg.height, leg.depth);
                const material = new THREE.MeshStandardMaterial({ map: legWoodTexture });
                const mesh = new THREE.Mesh(geometry, material);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                mesh.position.set(leg.x, leg.height / 2, leg.z);
                this.scene.add(mesh);
                this.beamMeshes.push(mesh);
            }
            // Focus camera at the vertical center of the structure
            this.target.set(0, totalY / 2, 0);
        }
        
        // Ensure scene rotation is maintained after updates
        this.scene.rotation.y = Math.PI / 6; // 30 degrees rotation
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.camera.lookAt(this.target);
        this.renderer.render(this.scene, this.camera);
    }

    // קורות משטח
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

    // קורות חיזוק
    private createFrameBeams(
        totalWidth: number,
        totalLength: number,
        frameWidth: number,
        frameHeight: number,
        legWidth: number,
        legDepth: number
    ): { x: number, y: number, z: number, width: number, height: number, depth: number }[] {
        // קבלת מידות קורות החיזוק מהפרמטרים (מפרמטר beamSingle)
        const frameParam = this.params.find(p => p.type === 'beamSingle');
        let frameBeamWidth = frameWidth;
        let frameBeamHeight = frameHeight;
        
        if (frameParam && Array.isArray(frameParam.beams) && frameParam.beams.length) {
            const frameBeam = frameParam.beams[frameParam.selectedBeamIndex || 0];
            if (frameBeam) {
                // החלפה: width של הפרמטר הופך ל-height של הקורה, height של הפרמטר הופך ל-width של הקורה
                frameBeamWidth = frameBeam.height / 10;  // המרה ממ"מ לס"מ - height הופך ל-width
                frameBeamHeight = frameBeam.width / 10;  // המרה ממ"מ לס"מ - width הופך ל-height
            }
        }
        
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
                height: frameBeamHeight,           // גובה מקורות החיזוק
                depth: frameBeamWidth              // עומק מקורות החיזוק
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
                width: frameBeamWidth,              // רוחב מקורות החיזוק
                height: frameBeamHeight,           // גובה מקורות החיזוק
                depth: totalLength - 2 * legDepth  // עומק מותאם לעובי הרגליים
            });
        }
        return beams;
    }


    // ממקם את המצלמה כך שכל המדפים והרגליים ייכנסו בפריים
    private frameAllShelves() {
        let totalY = 0;
        for (const shelf of this.shelves) {
            totalY += shelf.gap + this.frameHeight + this.beamHeight;
        }
        const height = totalY;
        const width = this.surfaceWidth;
        const depth = this.surfaceLength;
        const centerY = height / 2;
        this.target.set(0, centerY, 0);
        const fov = this.camera.fov * Math.PI / 180;
        const fitHeight = height * 1.15;
        const fitWidth = width * 1.15;
        const fitDepth = depth * 1.15;
        const distanceY = fitHeight / (2 * Math.tan(fov / 2));
        const distanceX = fitWidth / (2 * Math.tan(fov / 2) * this.camera.aspect);
        const distance = Math.max(distanceY, distanceX, fitDepth * 1.2);
        this.camera.position.set(0.7 * width, distance, 1.2 * depth);
        this.camera.lookAt(this.target);
    }

    // יצירת קורות רגליים
    private createLegBeams(
        totalWidth: number,
        totalLength: number,
        frameWidth: number,
        frameHeight: number,
        topHeight: number
    ): { x: number, y: number, z: number, width: number, height: number, depth: number }[] {
        // קבלת מידות קורות הרגליים מהפרמטרים
        const legParam = this.getParam('leg');
        let legWidth = frameWidth;
        let legHeight = topHeight;
        let legDepth = frameWidth;
        
        if (legParam && Array.isArray(legParam.beams) && legParam.beams.length) {
            const legBeam = legParam.beams[legParam.selectedBeamIndex || 0];
            if (legBeam) {
                legWidth = legBeam.width / 10;  // המרה ממ"מ לס"מ
                legDepth = legBeam.height / 10; // המרה ממ"מ לס"מ
            }
        }
        
        // קבלת עובי קורות המדפים כדי לקצר את הרגליים
        const shelfsParam = this.getParam('shelfs');
        let shelfBeamHeight = this.beamHeight;
        if (shelfsParam && Array.isArray(shelfsParam.beams) && shelfsParam.beams.length) {
            const shelfBeam = shelfsParam.beams[shelfsParam.selectedBeamIndex || 0];
            if (shelfBeam) {
                shelfBeamHeight = shelfBeam.height / 10; // המרה ממ"מ לס"מ
            }
        }
        
        // קיצור הרגליים בעובי קורות המדפים - הרגליים צריכות להגיע רק עד לתחתית המדף העליון
        legHeight = topHeight - shelfBeamHeight;
        
        // 4 פינות - מיקום צמוד לקצה בהתאם לעובי הרגל בפועל
        const xVals = [
            -totalWidth / 2 + legWidth / 2,    // פינה שמאלית - צמודה לקצה
            totalWidth / 2 - legWidth / 2      // פינה ימנית - צמודה לקצה
        ];
        const zVals = [
            -totalLength / 2 + legDepth / 2,   // פינה אחורית - צמודה לקצה
            totalLength / 2 - legDepth / 2     // פינה קדמית - צמודה לקצה
        ];
        const legs = [];
        
        for (const x of xVals) {
            for (const z of zVals) {
                legs.push({
                    x,
                    y: 0,
                    z,
                    width: legWidth,
                    height: legHeight,
                    depth: legDepth
                });
            }
        }
        
        return legs;
    }
}
