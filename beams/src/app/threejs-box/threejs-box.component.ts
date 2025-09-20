
import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { PricingService } from '../../../../src/app/services/pricing.service';
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
    
    // Validation messages (הוסרו - משתמשים ב-SnackBar)
    
    // Helper for numeric step
    getStep(type: number): number {
        return 1 / Math.pow(10, type);
    }
    // ...existing code...
    toggleDrawer() {
        this.drawerOpen = !this.drawerOpen;
        setTimeout(() => this.onResize(), 310); // Wait for transition to finish
    }
    
    toggleWireframe() {
        this.showWireframe = !this.showWireframe;
        if (this.showWireframe) {
            this.addWireframeCube();
        } else {
            this.removeWireframeCube();
        }
    }

    private removeWireframeCube() {
        const existingWireframe = this.scene.getObjectByName('productWireframe');
        if (existingWireframe) {
            this.scene.remove(existingWireframe);
        }
    }
    
    // פונקציה לפתיחת/סגירת תפריט המחיר
    togglePriceMenu() {
        this.isPriceManuOpen = !this.isPriceManuOpen;
    }
    drawerOpen: boolean = true;
    showWireframe: boolean = false; // מצב ברירת מחדל: wireframe מוסתר
    product: any = null;
    params: any[] = [];
    selectedProductName: string = ''; // שם המוצר שנבחר מה-URL
    isTable: boolean = false; // האם זה שולחן או ארון
    isPriceManuOpen: boolean = true; // האם תפריט המחיר פתוח

    // נתונים לחישוב מחיר
    BeamsDataForPricing: any[] = []; // מערך של נתוני קורות לחישוב מחיר
    ForgingDataForPricing: any[] = []; // מערך של נתוני ברגים לחישוב מחיר
    calculatedPrice: number = 0; // מחיר מחושב
    cuttingPlan: any[] = []; // תוכנית חיתוך מפורטת

    constructor(private http: HttpClient, private snackBar: MatSnackBar, private route: ActivatedRoute, private pricingService: PricingService) { } 

    ngOnInit() {
        this.checkUserAuthentication();
        
        // קבלת פרמטר המוצר מה-URL
        this.route.queryParams.subscribe(params => {
            if (params['product']) {
                this.selectedProductName = params['product'];
                this.isTable = this.selectedProductName === 'table';
                console.log('מוצר נבחר:', this.selectedProductName, 'שולחן:', this.isTable);
                
                // בדיקה אם זה מוצר שונה מהמוצר האחרון
                const lastProduct = localStorage.getItem('lastSelectedProduct');
                console.log('Last product from localStorage:', lastProduct, 'Current product:', this.selectedProductName);
                
                if (lastProduct && lastProduct !== this.selectedProductName) {
                    console.log('מוצר שונה נבחר, מנקה ערכים:', lastProduct, '->', this.selectedProductName);
                    this.clearUserConfiguration();
                } else {
                    console.log('Same product or first time, no need to clear configuration');
                }
                
                // שמירת המוצר הנוכחי כברמוצר האחרון
                localStorage.setItem('lastSelectedProduct', this.selectedProductName);
                console.log('Saved current product to localStorage:', this.selectedProductName);
                
                // טעינת המוצר הנכון לפי השם
                this.getProductByName(this.selectedProductName);
            } else {
                // אם אין פרמטר מוצר, נטען את המוצר האחרון או ברירת מחדל
                const lastProduct = localStorage.getItem('lastSelectedProduct');
                if (lastProduct) {
                    console.log('טעינת מוצר אחרון:', lastProduct);
                    this.selectedProductName = lastProduct;
                    this.isTable = this.selectedProductName === 'table';
                    this.getProductByName(this.selectedProductName);
                } else {
        this.getProductById('68a186bb0717136a1a9245de');
                }
            }
        });
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

    // Clear user configuration when switching products
    private clearUserConfiguration() {
        // ניקוי כל ההגדרות הקשורות למוצר הקודם
        console.log('Current localStorage keys:', Object.keys(localStorage));
        
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('beamConfig_') || key.startsWith('userConfig_') || key.startsWith('beam_'))) {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            console.log('Removed configuration:', key);
        });
        
        console.log('User configuration cleared for new product. Removed keys:', keysToRemove);
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
                console.log('פרמטרים נטענו:', this.params);
                console.log('זה שולחן?', this.isTable);
                
                // בדיקת פרמטרים ספציפיים
                const heightParam = this.params.find(p => p.name === 'height');
                const plataParam = this.params.find(p => p.name === 'plata');
                console.log('פרמטר height:', heightParam);
                console.log('פרמטר plata:', plataParam);
                // Load saved configuration after product is loaded
                this.loadConfiguration();
                this.updateBeams();
            },
            error: (err) => {
                console.error('Failed to load product:', err);
            }
        });
    }

    // טעינת מוצר לפי שם
    getProductByName(name: string) {
        this.http.get(`/api/products/name/${name}`).subscribe({
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
                console.log('Product loaded by name:', data);
                console.log('פרמטרים נטענו:', this.params);
                console.log('זה שולחן?', this.isTable);
                
                // בדיקת פרמטרים ספציפיים
                const heightParam = this.params.find(p => p.name === 'height');
                const plataParam = this.params.find(p => p.name === 'plata');
                console.log('פרמטר height:', heightParam);
                console.log('פרמטר plata:', plataParam);
                // Load saved configuration after product is loaded
                this.loadConfiguration();
                this.updateBeams();
            },
            error: (err) => {
                console.error('Failed to load product by name:', err);
                // אם לא נמצא מוצר לפי שם, ננסה לטעון מוצר ברירת מחדל
                this.getProductById('68a186bb0717136a1a9245de');
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
            // הצגת הודעה ב-SnackBar
            this.snackBar.open(message, 'סגור', {
                duration: 3000,
                horizontalPosition: 'center',
                verticalPosition: 'top',
                panelClass: ['custom-snackbar']
            });
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
        if (this.isTable) {
            // עבור שולחן, נחזיר מדף אחד עם גובה 0 (הגובה נקבע בפרמטר height)
            return [{ gap: 0 }];
        } else {
            // עבור ארון, נשתמש בפרמטר shelfs
        const shelfsParam = this.getParam('shelfs');
        if (shelfsParam && Array.isArray(shelfsParam.default)) {
            // Model: bottom shelf is first (no reverse)
            return shelfsParam.default.map((gap: number) => ({ gap }));
        }
        return [];
        }
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
    private target: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
    beamWidth: number = 10;
    frameHeight: number = 5;
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
        
        // וידוא שהערכים מתאפסים לברירת המחדל כשעוברים למוצר חדש
        this.resetParamsToDefaults();
    }
    
    // Reset all parameters to their default values
    private resetParamsToDefaults() {
        console.log('Resetting parameters to defaults. Current params:', this.params);
        
        this.params.forEach(param => {
            console.log('Resetting param:', param.name, 'current default:', param.default);
            
            // איפוס ערכי ברירת מחדל
            if (param.default !== undefined) {
                param.default = param.default; // שמירה על הערך המקורי
            }
            
            // איפוס בחירות קורות
            if (param.type === 'beamSingle' || param.name === 'shelfs') {
                if (Array.isArray(param.beams) && param.beams.length) {
                    param.selectedBeamIndex = 0;
                    param.selectedTypeIndex = Array.isArray(param.beams[0].types) && param.beams[0].types.length ? 0 : null;
                    console.log('Reset beam selection for:', param.name, 'to beam 0, type 0');
                }
            }
        });
        
        console.log('Parameters reset to defaults for new product');
    }

    // Get wood texture based on beam type
    private getWoodTexture(beamType: string): THREE.Texture {
        let texturePath = 'assets/textures/pine.jpg'; // default
        
        if (beamType) {
            texturePath = 'assets/textures/' + beamType +'.jpg';
        } else {
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
        this.rendererContainer.nativeElement.addEventListener('wheel', (event: WheelEvent) => {
            event.preventDefault();
            // סגירת חלונית חישוב המחיר בזום
            this.isPriceManuOpen = false;
            
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
            // סגירת חלונית חישוב המחיר בלחיצת עכבר
            this.isPriceManuOpen = false;
            
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
            // סגירת חלונית חישוב המחיר במגע
            this.isPriceManuOpen = false;
            
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
        
        // Start animation loop
        this.animate();
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
        
        // חישוב מחיר אחרי עדכון המודל
        this.calculatePricing();
        
        this.beamMeshes.forEach(mesh => {
            this.scene.remove(mesh);
            
            // אם זה Group (ברגים), צריך לטפל בכל הילדים
            if (mesh instanceof THREE.Group) {
                mesh.children.forEach(child => {
                    if (child instanceof THREE.Mesh) {
                        child.geometry.dispose();
                        (child.material as THREE.Material).dispose();
                    }
                });
            } else {
                // אם זה Mesh רגיל (קורות)
            mesh.geometry.dispose();
            (mesh.material as THREE.Material).dispose();
            }
        });
        this.beamMeshes = [];

        // Defensive checks
        if (!this.isTable && (!this.shelves || !this.shelves.length)) {
            console.warn('No shelves found, cannot render model.');
            return;
        }
        if (this.isTable && !this.getParam('height')) {
            console.warn('No height parameter found for table, cannot render model.');
            return;
        }
        if (!this.surfaceWidth || !this.surfaceLength) {
            console.warn('surfaceWidth or surfaceLength missing, cannot render model.');
            return;
        }

        // Get shelf beam and type from params (for cabinet) or plata beam (for table)
        let shelfsParam = null;
        if (this.isTable) {
            // עבור שולחן, נשתמש בפרמטר plata במקום shelfs
            shelfsParam = this.product?.params?.find((p: any) => p.type === 'beamSingle' && p.name === 'plata');
        } else {
            // עבור ארון, נשתמש בפרמטר shelfs
            shelfsParam = this.product?.params?.find((p: any) => p.type === 'beamArray' && p.name === 'shelfs');
        }
        
        let shelfBeam = null;
        let shelfType = null;
        if (shelfsParam && Array.isArray(shelfsParam.beams) && shelfsParam.beams.length) {
            shelfBeam = shelfsParam.beams[shelfsParam.selectedBeamIndex || 0];
            shelfType = shelfBeam.types && shelfBeam.types.length ? shelfBeam.types[shelfsParam.selectedTypeIndex || 0] : null;
        }
        
        // Get wood texture for shelf beams
        const shelfWoodTexture = this.getWoodTexture(shelfType ? shelfType.name : '');
        
        // Get wood texture for frame beams (קורות חיזוק)
        let frameParam = null;
        if (this.isTable) {
            // עבור שולחן, קורות החיזוק הן קורות הרגליים
            frameParam = this.params.find(p => p.type === 'beamSingle' && p.name === 'leg');
        } else {
            // עבור ארון, קורות החיזוק הן פרמטר beamSingle שאינו shelfs
            frameParam = this.params.find(p => p.type === 'beamSingle' && p.name !== 'shelfs');
        }
        
        let frameType = null;
        if (frameParam && Array.isArray(frameParam.beams) && frameParam.beams.length) {
            const frameBeam = frameParam.beams[frameParam.selectedBeamIndex || 0];
            frameType = frameBeam.types && frameBeam.types.length ? frameBeam.types[frameParam.selectedTypeIndex || 0] : null;
        }
        const frameWoodTexture = this.getWoodTexture(frameType ? frameType.name : '');
        
        // Always convert beam width/height from mm to cm
        let beamWidth = shelfBeam ? shelfBeam.width / 10 : this.beamWidth;
        let beamHeight = shelfBeam ? shelfBeam.height / 10 : this.beamHeight;
        
        // עדכון הערכים הגלובליים של הקומפוננטה
        this.beamWidth = beamWidth;
        this.beamHeight = beamHeight;
        

        // For each shelf, render its beams at its calculated height
        let currentY = 0;
        const totalShelves = this.isTable ? 1 : this.shelves.length;
        
        // Get frame beam dimensions for shelf beam shortening
        let frameParamForShortening = null;
        if (this.isTable) {
            // עבור שולחן, קורות החיזוק הן קורות הרגליים
            frameParamForShortening = this.params.find(p => p.type === 'beamSingle' && p.name === 'leg');
        } else {
            // עבור ארון, קורות החיזוק הן פרמטר beamSingle שאינו shelfs
            frameParamForShortening = this.params.find(p => p.type === 'beamSingle' && p.name !== 'shelfs');
        }
        
        let frameBeamWidth = this.frameWidth;
        let frameBeamHeight = this.frameHeight;
        if (frameParamForShortening && Array.isArray(frameParamForShortening.beams) && frameParamForShortening.beams.length) {
            const frameBeam = frameParamForShortening.beams[frameParamForShortening.selectedBeamIndex || 0];
            if (frameBeam) {
                // החלפה: height של הפרמטר הופך ל-width של הקורה (לשימוש בקיצור)
                frameBeamWidth = frameBeam.height / 10;  // המרה ממ"מ לס"מ
                frameBeamHeight = frameBeam.width / 10;  // width של הפרמטר הופך ל-height של הקורה
            }
        }
        
        // עדכון הערכים הגלובליים של הקומפוננטה
        this.frameWidth = frameBeamWidth;
        this.frameHeight = frameBeamHeight;
        
        
        // עבור שולחן, נציג מדף אחד בלבד בגובה שנקבע בפרמטר height
        if (this.isTable) {
            const heightParam = this.getParam('height');
            const baseTableHeight = heightParam ? heightParam.default : 80; // גובה ברירת מחדל
            
            // הפחתת גובה קורות הפלטה כדי שהפרמטר "גובה משטח" ייצג את הגובה הסופי של החלק העליון
            const plataParam = this.getParam('plata');
            let plataBeamHeight = this.beamHeight; // ברירת מחדל
            if (plataParam && Array.isArray(plataParam.beams) && plataParam.beams.length) {
                const plataBeam = plataParam.beams[plataParam.selectedBeamIndex || 0];
                if (plataBeam) {
                    plataBeamHeight = plataBeam.height / 10; // המרה ממ"מ לס"מ
                }
            }
            
            const tableHeight = baseTableHeight - plataBeamHeight; // הפחתת גובה קורות הפלטה
            
            // Surface beams (קורת משטח) - מדף אחד בלבד
            const surfaceBeams = this.createSurfaceBeams(
                this.surfaceWidth,
                this.surfaceLength,
                beamWidth,
                beamHeight,
                this.minGap
            );
            for (let i = 0; i < surfaceBeams.length; i++) {
                const beam = { ...surfaceBeams[i] };
                const geometry = new THREE.BoxGeometry(beam.width, beam.height, beam.depth);
                const material = new THREE.MeshStandardMaterial({ map: shelfWoodTexture });
                const mesh = new THREE.Mesh(geometry, material);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                mesh.position.set(beam.x, tableHeight + beam.height / 2, 0);
                this.scene.add(mesh);
                this.beamMeshes.push(mesh);
                
                // הוספת ברגים לקורת המדף
                this.addScrewsToShelfBeam(beam, tableHeight, beamHeight, frameBeamWidth, "top");
            }
            
            // Get leg beam dimensions for frame beams positioning
            const tableLegParam = this.getParam('leg');
            let legWidth = frameBeamWidth;
            let legDepth = frameBeamWidth;
            if (tableLegParam && Array.isArray(tableLegParam.beams) && tableLegParam.beams.length) {
                const legBeam = tableLegParam.beams[tableLegParam.selectedBeamIndex || 0];
                if (legBeam) {
                    legWidth = legBeam.width / 10;   // המרה ממ"מ לס"מ
                    legDepth = (legBeam.depth || legBeam.height) / 10; // המרה ממ"מ לס"מ - fallback ל-height אם depth לא קיים
                }
            }
            
            // בדיקת תקינות הערכים
            if (isNaN(legWidth) || legWidth <= 0) {
                console.warn('Invalid legWidth, using frameBeamWidth:', legWidth);
                legWidth = frameBeamWidth;
            }
            if (isNaN(legDepth) || legDepth <= 0) {
                console.warn('Invalid legDepth, using frameBeamWidth:', legDepth);
                legDepth = frameBeamWidth;
            }
            
            // Frame beams (קורת חיזוק) - מדף אחד בלבד
            const frameBeams = this.createFrameBeams(
                this.surfaceWidth,
                this.surfaceLength,
                frameBeamWidth,
                frameBeamHeight,
                legWidth,  // רוחב הרגל האמיתי - חזרה למצב התקין
                legDepth   // עומק הרגל האמיתי - חזרה למצב התקין
            );
            for (const beam of frameBeams) {
                const geometry = new THREE.BoxGeometry(beam.width, beam.height, beam.depth);
                const material = new THREE.MeshStandardMaterial({ map: frameWoodTexture });
                const mesh = new THREE.Mesh(geometry, material);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                mesh.position.set(beam.x, tableHeight - beam.height / 2, beam.z);
                this.scene.add(mesh);
                this.beamMeshes.push(mesh);
            }
            
            // קורות חיזוק נוספות (extraBeam) - עבור שולחן בלבד
            const extraBeamParam = this.getParam('extraBeam');
            if (extraBeamParam && extraBeamParam.default > 0) {
                const extraBeamDistance = extraBeamParam.default;
                
                // יצירת קורות חיזוק נוספות באותו מיקום אבל יותר נמוך
                const extraFrameBeams = this.createFrameBeams(
                    this.surfaceWidth,
                    this.surfaceLength,
                    frameBeamWidth,
                    frameBeamHeight,
                    legWidth, // legWidth - כמו בקורות המקוריות התקינות
                    legDepth  // legDepth - כמו בקורות המקוריות התקינות
                );
                // המרחק הכולל = הנתון החדש + רוחב קורות החיזוק
                const totalDistance = extraBeamDistance + frameBeamHeight;
                
                for (const beam of extraFrameBeams) {
                    const geometry = new THREE.BoxGeometry(beam.width, beam.height, beam.depth);
                    const material = new THREE.MeshStandardMaterial({ map: frameWoodTexture });
                    const mesh = new THREE.Mesh(geometry, material);
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
                    // מיקום יותר נמוך במידת totalDistance (הנתון החדש + רוחב קורות החיזוק)
                    mesh.position.set(beam.x, tableHeight - beam.height / 2 - totalDistance, beam.z);
                    this.scene.add(mesh);
                    this.beamMeshes.push(mesh);
                }
            }
            
            // רגליים (legs) - עבור שולחן
            const legParam = this.getParam('leg');
            let legBeam = null;
            let legType = null;
            if (legParam && Array.isArray(legParam.beams) && legParam.beams.length) {
                legBeam = legParam.beams[legParam.selectedBeamIndex || 0];
                legType = legBeam.types && legBeam.types.length ? legBeam.types[legParam.selectedTypeIndex || 0] : null;
            }
            
            const legWoodTexture = this.getWoodTexture(legType ? legType.name : '');
            // עבור שולחן, נוסיף את גובה קורות המדפים לגובה הרגליים
            const shelfBeamHeight = beamHeight; // זה כבר מחושב למעלה
            const legs = this.createLegBeams(
                this.surfaceWidth,
                this.surfaceLength,
                frameBeamWidth,
                frameBeamHeight,
                tableHeight + shelfBeamHeight // גובה הרגליים = גובה השולחן + גובה קורות המדפים
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
            
            // הוספת ברגים לרגליים עבור שולחן
            this.addScrewsToLegs(1, legs, frameBeamHeight, 0);
            
            // הוספת ברגים נוספים לקורות החיזוק המשוכפלות (extraBeam) - עבור שולחן בלבד
            if (extraBeamParam && extraBeamParam.default > 0) {
                const extraBeamDistance = extraBeamParam.default;
                const totalDistance = extraBeamDistance + frameBeamHeight;
                
                // יצירת ברגים נוספים באותם מיקומים X ו-Z אבל בגובה של קורות החיזוק המשוכפלות
                legs.forEach((leg, legIndex) => {
                    const isEven = legIndex % 2 === 0;
                    const extraScrewY = tableHeight - frameBeamHeight / 2 - totalDistance; // גובה מרכז קורות החיזוק המשוכפלות
                    
                    // 2 ברגים לכל רגל (אחד לכל קורת חיזוק - קדמית ואחורית)
                    const extraScrewPositions = [
                        // בורג לקורת חיזוק קדמית
                        {
                            x: leg.x, // מרכז רוחב הרגל
                            y: extraScrewY, // מרכז קורות החיזוק המשוכפלות
                            z: isEven ? (leg.z - (leg.depth / 2 + this.headHeight)) : (leg.z + (leg.depth / 2 + this.headHeight)) // צד חיצוני של הרגל (קדמי)
                        },
                        {
                            x: leg.x + ((leg.width / 2 + this.headHeight) * (legIndex > 1 ? 1 : -1)), // מרכז רוחב הרגל
                            y: extraScrewY, // מרכז קורות החיזוק המשוכפלות
                            z: (isEven ? (leg.z - (leg.depth / 2 + this.headHeight)) : (leg.z + (leg.depth / 2 + this.headHeight))) +
                            ((isEven ? 1 : -1) * (leg.depth / 2 + this.headHeight)) // צד חיצוני של הרגל (קדמי)
                        }
                    ];
                    
                    extraScrewPositions.forEach((pos, screwIndex) => {
                        const screwGroup = this.createHorizontalScrewGeometry();
                        
                        // הברגים אופקיים ומיושרים ל-X (מאונכים לדופן Z)
                        screwGroup.position.set(pos.x, pos.y, pos.z);
                        if (screwIndex === 0) {
                            screwGroup.rotation.y =  Math.PI / 2 * (isEven ? 1 : -1);
                        } else {
                            screwGroup.rotation.y =  legIndex > 1 ? 0 : Math.PI;
                        }
                        
                        this.scene.add(screwGroup);
                        this.beamMeshes.push(screwGroup);
                    });
                });
            }
            
            // Focus camera at the vertical center of the table
            this.target.set(0, tableHeight / 2, 0);
        } else {
            // עבור ארון - הקוד המקורי
        for (let shelfIndex = 0; shelfIndex < this.shelves.length; shelfIndex++) {
            const shelf = this.shelves[shelfIndex];
            currentY += shelf.gap;
            
            // בדיקה ספציפית למדף התחתון במודל התלת-ממדי
            if (shelfIndex === 0) {
                console.log(`&&& 3D MODEL BOTTOM SHELF - Shelf 0: currentY after gap=${currentY}, gap=${shelf.gap} &&&`);
            } else {
                console.log(`&&& 3D MODEL OTHER SHELF - Shelf ${shelfIndex}: currentY after gap=${currentY}, gap=${shelf.gap} &&&`);
            }
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
                mesh.position.set(beam.x, currentY + frameBeamHeight + beam.height / 2, 0);
                this.scene.add(mesh);
                this.beamMeshes.push(mesh);
                
                // הוספת ברגים לקורת המדף
                let isShortenedBeam = (!isTopShelf && (i === 0 || i === surfaceBeams.length - 1)) ? "not-top" : "top";
                if (isShortenedBeam !== "top") {
                    if (i === 0) {
                        isShortenedBeam = "start";
                    } else {
                        isShortenedBeam = "end";
                    }
                }
                this.addScrewsToShelfBeam(beam, currentY + frameBeamHeight, beamHeight, frameBeamWidth, isShortenedBeam);
            }
            
            // Get leg beam dimensions for frame beams positioning
            const legParam = this.getParam('leg');
            let legWidth = frameBeamWidth;
            let legDepth = frameBeamWidth;
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
                frameBeamWidth,
                frameBeamHeight,
                legWidth,
                legDepth
            );
            for (const beam of frameBeams) {
                const geometry = new THREE.BoxGeometry(beam.width, beam.height, beam.depth);
                const material = new THREE.MeshStandardMaterial({ map: frameWoodTexture });
                const mesh = new THREE.Mesh(geometry, material);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                const frameY = currentY + beam.height / 2;
                
                // בדיקה ספציפית למדף התחתון במודל התלת-ממדי
                if (shelfIndex === 0) {
                    console.log(`&&& 3D MODEL BOTTOM SHELF - Frame beam Y: ${frameY} (currentY: ${currentY} + beam.height/2: ${beam.height / 2}) &&&`);
                } else {
                    console.log(`&&& 3D MODEL OTHER SHELF - Shelf ${shelfIndex} Frame beam Y: ${frameY} (currentY: ${currentY} + beam.height/2: ${beam.height / 2}) &&&`);
                }
                
                mesh.position.set(beam.x, frameY, beam.z);
                this.scene.add(mesh);
                this.beamMeshes.push(mesh);
            }
            // Add the height of the shelf itself for the next shelf
            currentY += frameBeamHeight + beamHeight;
        }
        // לא מעדכן מיקום מצלמה/zoom אחרי עדכון אלמנטים
        // רגליים (legs)
        if (this.isTable || this.shelves.length) {
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
            if (this.isTable) {
                // עבור שולחן, הגובה הכולל הוא גובה השולחן
                const heightParam = this.getParam('height');
                totalY = heightParam ? heightParam.default : 80;
            } else {
                // עבור ארון, הגובה הכולל הוא סכום כל המדפים
            for (const shelf of this.shelves) {
                    totalY += shelf.gap + frameBeamHeight + beamHeight;
                }
            }
            const legs = this.createLegBeams(
                this.surfaceWidth,
                this.surfaceLength,
                frameBeamWidth,
                frameBeamHeight,
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
            
            // הוספת ברגים לרגליים
            this.addScrewsToLegs(this.isTable ? 1 : totalShelves, legs, frameBeamHeight, 0);
            
            // Focus camera at the vertical center of the structure
            this.target.set(0, totalY / 2, 0);
        }
        }
        
        // Ensure scene rotation is maintained after updates
        this.scene.rotation.y = Math.PI / 6; // 30 degrees rotation
        
        // Add wireframe cube showing product dimensions (only if enabled)
        if (this.showWireframe) {
        this.addWireframeCube();
        }
    }

    // Add wireframe cube showing product dimensions with shortened lines and corner spheres
    private addWireframeCube() {
        // Remove existing wireframe cube if it exists
        const existingWireframe = this.scene.getObjectByName('productWireframe');
        if (existingWireframe) {
            this.scene.remove(existingWireframe);
        }

        // Get product dimensions
        const dimensions = this.getProductDimensionsRaw();
        const { length, width, height } = dimensions;

        // Create custom wireframe group
        const wireframeGroup = new THREE.Group();
        const wireframeMaterial = new THREE.LineBasicMaterial({
            color: 0x0066cc, // Blue color
            linewidth: 2
        });

        // Create cube material for corner cubes
        const cubeMaterial = new THREE.MeshStandardMaterial({
            color:0x0066cc // Same blue color
        });

        // Shortening distance from corners (1.2 cm)
        const shortenDistance = 1.2;

        // Calculate half dimensions
        const halfWidth = width / 2;
        const halfHeight = height / 2;
        const halfLength = length / 2;

        // Define all 8 corner positions
        const corners = [
            // Bottom corners
            new THREE.Vector3(-halfWidth, -halfHeight, halfLength),   // front-left-bottom
            new THREE.Vector3(halfWidth, -halfHeight, halfLength),    // front-right-bottom
            new THREE.Vector3(-halfWidth, -halfHeight, -halfLength),  // back-left-bottom
            new THREE.Vector3(halfWidth, -halfHeight, -halfLength),   // back-right-bottom
            // Top corners
            new THREE.Vector3(-halfWidth, halfHeight, halfLength),    // front-left-top
            new THREE.Vector3(halfWidth, halfHeight, halfLength),     // front-right-top
            new THREE.Vector3(-halfWidth, halfHeight, -halfLength),   // back-left-top
            new THREE.Vector3(halfWidth, halfHeight, -halfLength)     // back-right-top
        ];

        // Add corner cubes
        corners.forEach(corner => {
            const cubeGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8); // 0.8x0.8x0.8 cube - larger
            const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
            cube.position.copy(corner);
            wireframeGroup.add(cube);
        });

        // Helper function to shorten line from both ends
        const createShortenedLine = (start: THREE.Vector3, end: THREE.Vector3) => {
            const direction = new THREE.Vector3().subVectors(end, start).normalize();
            const shortenedStart = start.clone().add(direction.clone().multiplyScalar(shortenDistance));
            const shortenedEnd = end.clone().sub(direction.clone().multiplyScalar(shortenDistance));
            
            const geometry = new THREE.BufferGeometry().setFromPoints([shortenedStart, shortenedEnd]);
            const line = new THREE.Line(geometry, wireframeMaterial);
            return line;
        };

        // Bottom face edges (4 edges)
        const bottomEdges = [
            [corners[0], corners[1]], // front edge
            [corners[2], corners[3]], // back edge
            [corners[2], corners[0]], // left edge
            [corners[1], corners[3]]  // right edge
        ];

        // Top face edges (4 edges)
        const topEdges = [
            [corners[4], corners[5]], // front edge
            [corners[6], corners[7]], // back edge
            [corners[6], corners[4]], // left edge
            [corners[5], corners[7]]  // right edge
        ];

        // Vertical edges (4 edges)
        const verticalEdges = [
            [corners[0], corners[4]], // front-left
            [corners[1], corners[5]], // front-right
            [corners[2], corners[6]], // back-left
            [corners[3], corners[7]]  // back-right
        ];

        // Create shortened line segments
        const allEdges = [...bottomEdges, ...topEdges, ...verticalEdges];
        
        allEdges.forEach(([start, end]) => {
            const line = createShortenedLine(start, end);
            wireframeGroup.add(line);
        });

        // Add dimension text labels
        this.addDimensionTexts(wireframeGroup, length, width, height);

        // Position the wireframe at the center of the product
        wireframeGroup.position.set(0, height / 2, 0);
        wireframeGroup.name = 'productWireframe';
        
        // Add to scene
        this.scene.add(wireframeGroup);
    }

    // Add dimension text labels to wireframe
    private addDimensionTexts(wireframeGroup: THREE.Group, length: number, width: number, height: number) {
        // Calculate positions for dimension labels
        const halfWidth = width / 2;
        const halfHeight = height / 2;
        const halfLength = length / 2;

        // Define all 8 corner positions
        const corners = [
            // Bottom corners
            new THREE.Vector3(-halfWidth, -halfHeight, halfLength),   // front-left-bottom
            new THREE.Vector3(halfWidth, -halfHeight, halfLength),    // front-right-bottom
            new THREE.Vector3(-halfWidth, -halfHeight, -halfLength),  // back-left-bottom
            new THREE.Vector3(halfWidth, -halfHeight, -halfLength),   // back-right-bottom
            // Top corners
            new THREE.Vector3(-halfWidth, halfHeight, halfLength),    // front-left-top
            new THREE.Vector3(halfWidth, halfHeight, halfLength),     // front-right-top
            new THREE.Vector3(-halfWidth, halfHeight, -halfLength),   // back-left-top
            new THREE.Vector3(halfWidth, halfHeight, -halfLength)     // back-right-top
        ];

        // Helper function to create text sprite
        const createTextSprite = (number: number, position: THREE.Vector3) => {
            // Create canvas for text rendering
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d')!;
            canvas.width = 512;
            canvas.height = 128;

            // Clear canvas with transparent background
            context.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw number in large font
            context.font = '48px Arial';
            context.fillStyle = '#002266'; // Even darker blue
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            
            const numberText = number % 1 === 0 ? number.toString() : number.toFixed(1); // מספרים עגולים בלי .0, לא עגולים עם נקודה עשרונית
            
            // Draw only the number
            context.fillText(numberText, canvas.width / 2, canvas.height / 2);
            
            // Create texture from canvas
            const texture = new THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            
            // Create sprite material with billboard behavior
            const spriteMaterial = new THREE.SpriteMaterial({ 
                map: texture,
                transparent: true,
                alphaTest: 0.1,
                color: 0xffffff // White color to preserve original texture colors
            });
            
            // Create sprite with billboard behavior (always faces camera)
            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.position.copy(position);
            sprite.scale.set(50, 12, 1); // Much larger scale
            
            // Make sprite always face the camera
            sprite.material.rotation = 0;
            
            return sprite;
        };

        // Helper function to get middle point of two corners
        const getMiddlePoint = (corner1: THREE.Vector3, corner2: THREE.Vector3) => {
            return new THREE.Vector3().addVectors(corner1, corner2).multiplyScalar(0.5);
        };

        // Helper function to get outward direction for text positioning
        const getOutwardDirection = (corner1: THREE.Vector3, corner2: THREE.Vector3) => {
            const direction = new THREE.Vector3().subVectors(corner2, corner1).normalize();
            const middle = getMiddlePoint(corner1, corner2);
            
            // Determine outward direction based on edge position
            if (Math.abs(direction.x) > 0.9) { // Vertical edges (width)
                return new THREE.Vector3(0, 0, middle.z > 0 ? 1 : -1);
            } else if (Math.abs(direction.z) > 0.9) { // Horizontal edges (length)
                return new THREE.Vector3(0, middle.y > 0 ? 1 : -1, 0);
            } else { // Height edges
                return new THREE.Vector3(middle.x > 0 ? 1 : -1, 0, 0);
            }
        };

        // Add dimension labels for all 12 edges
        const edges = [
            // Bottom face (4 edges)
            { start: corners[0], end: corners[1], value: width }, // front (X direction = width)
            { start: corners[2], end: corners[3], value: width }, // back (X direction = width)
            { start: corners[2], end: corners[0], value: length }, // left (Z direction = length)
            { start: corners[1], end: corners[3], value: length }, // right (Z direction = length)
            
            // Top face (4 edges)
            { start: corners[4], end: corners[5], value: width }, // front (X direction = width)
            { start: corners[6], end: corners[7], value: width }, // back (X direction = width)
            { start: corners[6], end: corners[4], value: length }, // left (Z direction = length)
            { start: corners[5], end: corners[7], value: length }, // right (Z direction = length)
            
            // Vertical edges (4 edges)
            { start: corners[0], end: corners[4], value: height }, // front-left
            { start: corners[1], end: corners[5], value: height }, // front-right
            { start: corners[2], end: corners[6], value: height }, // back-left
            { start: corners[3], end: corners[7], value: height }  // back-right
        ];

        edges.forEach(edge => {
            const middle = getMiddlePoint(edge.start, edge.end);
            
            // Calculate rotation to align text with edge direction
            const direction = new THREE.Vector3().subVectors(edge.end, edge.start).normalize();
            
            // Adjust position - raise by 2cm for length and width edges, keep height edges as is
            let textPosition = middle.clone();
            if (Math.abs(direction.z) > 0.9) { // Front/back edges (length)
                textPosition.y += 2; // Raise by 2cm
                textPosition = createTextSprite(edge.value, textPosition);
                textPosition.rotation.z = 0;
            } else if (Math.abs(direction.x) > 0.9) { // Left/right edges (width)
                textPosition.y += 2; // Raise by 2cm
                textPosition = createTextSprite(edge.value, textPosition);
                textPosition.rotation.z = Math.PI / 2;
            } else { // Vertical edges (height) - move outward by 3cm
                // Move outward in X and Y directions by 3cm
                if (textPosition.x > 0) {
                    textPosition.x += 3; // Move right
                } else {
                    textPosition.x -= 3; // Move left
                }
                if (textPosition.z > 0) {
                    textPosition.z += 3; // Move forward
                } else {
                    textPosition.z -= 3; // Move backward
                }
                textPosition = createTextSprite(edge.value, textPosition);
                textPosition.rotation.z = 0;
            }
            
            wireframeGroup.add(textPosition);
        });

        console.log('Added dimension texts for all 12 edges');
    }

    // Update model when any parameter changes (alias for updateBeams)
    updateModel() {
        
        // Validate all parameters before updating
        this.params.forEach(param => {
            if (param.type !== 'beamSingle' && param.type !== 'beamArray') {
                // For numeric parameters, validate the value
                if (typeof param.default === 'number') {
                    const validatedValue = this.validateParameterValue(param, param.default);
                    if (validatedValue !== param.default) {
                        param.default = validatedValue;
                    }
                }
            }
        });
        
        this.updateBeams();
        this.calculatePricing(); // הוספת חישוב מחיר בכל עדכון
    }
    
    // פונקציה לחישוב חומרים (קורות) לחישוב מחיר
    calculatePricing() {
        this.calculateBeamsData();
    }
    
    // חישוב נתוני הקורות לחישוב מחיר
    calculateBeamsData() {
        this.BeamsDataForPricing = [];
        
        // איסוף כל הקורות מהמודל התלת מימדי
        const allBeams: any[] = [];
        
        
        // קבלת נתוני הקורות מהפרמטרים
        const shelfParam = this.isTable 
            ? this.product?.params?.find((p: any) => p.type === 'beamSingle' && p.name === 'plata')
            : this.product?.params?.find((p: any) => p.type === 'beamArray' && p.name === 'shelfs');
        
        const frameParam = this.product?.params?.find((p: any) => p.type === 'beamSingle' && p.name === 'frame');
        const legParam = this.product?.params?.find((p: any) => p.type === 'beamSingle' && p.name === 'leg');
        const extraParam = this.product?.params?.find((p: any) => p.type === 'beamSingle' && p.name === 'extraBeam');
        
        
        if (this.surfaceWidth && this.surfaceLength && shelfParam) {
            const selectedBeam = shelfParam.beams?.[shelfParam.selectedBeamIndex || 0];
            const selectedType = selectedBeam?.types?.[shelfParam.selectedTypeIndex || 0];
            
            if (selectedBeam && selectedType) {
                const beamWidth = selectedType.width / 10 || this.beamWidth; // המרה ממ"מ לס"מ
                const beamHeight = selectedType.height / 10 || this.beamHeight;
                
                // חישוב קורות המשטח
                const surfaceBeams = this.createSurfaceBeams(
                    this.surfaceWidth,
                    this.surfaceLength,
                    beamWidth,
                    beamHeight,
                    this.minGap
                );
                
                if (this.isTable) {
                    // עבור שולחן - מדף אחד בלבד
                    surfaceBeams.forEach(beam => {
                        allBeams.push({
                            type: selectedType,
                            length: beam.depth, // אורך הקורה
                            width: beam.width,
                            height: beam.height,
                            name: 'Table Surface Beam',
                            beamName: selectedBeam.name,
                            beamTranslatedName: selectedBeam.translatedName
                        });
                    });
                } else {
                    // עבור ארון - קורות לכל מדף עם קיצור
                    
                    // חישוב קיצור קורות המדפים
                    const totalShelves = this.shelves.length;
                    const shelvesWithoutTop = totalShelves - 1; // מדפים ללא המדף העליון
                    const shortenedBeamsCount = shelvesWithoutTop * 2; // 2 קורות מקוצרות לכל מדף שאיננו עליון
                    
                    // מציאת קורת הרגל/החיזוק לחישוב הקיצור
                    const legParam = this.product?.params?.find((p: any) => p.type === 'beamSingle' && p.name === 'leg');
                    const legBeamSelected = legParam?.beams?.[legParam.selectedBeamIndex || 0];
                    const legBeamHeight = legBeamSelected?.height / 10 || 0;
                    
                    // קיצור קורות המדפים - פעם אחת גובה קורת הרגל/החיזוק
                    const shorteningPerBeam = legBeamHeight * 2;
                    
                    
                    this.shelves.forEach((shelf, index) => {
                        const isTopShelf = index === totalShelves - 1; // המדף העליון
                        surfaceBeams.forEach((beam, beamIndex) => {
                            let beamLength = beam.depth;
                            
                            // קיצור רק 2 קורות ספציפיות מכל מדף שאיננו עליון
                            // נניח שהקורות הראשונות הן אלה שצריכות להיות מקוצרות
                            if (!isTopShelf && beamIndex < 2) {
                                beamLength = beamLength - shorteningPerBeam;
                            }
                            
                            allBeams.push({
                                type: selectedType,
                                length: beamLength,
                                width: beam.width,
                                height: beam.height,
                                name: `Shelf ${index + 1} Beam`,
                                beamName: selectedBeam.name,
                            beamTranslatedName: selectedBeam.translatedName
                            });
                        });
                    });
                }
            }
        }
        
        // קורות חיזוק (frame beams)
        if (this.surfaceWidth && this.surfaceLength) {
            let frameParamForCalculation = null;
            
            if (this.isTable) {
                // עבור שולחן, קורות החיזוק הן קורות הרגליים
                frameParamForCalculation = this.params.find(p => p.type === 'beamSingle' && p.name === 'leg');
            } else {
                // עבור ארון, קורות החיזוק הן פרמטר beamSingle שאינו shelfs
                frameParamForCalculation = this.params.find(p => p.type === 'beamSingle' && p.name !== 'shelfs');
            }
            
            if (frameParamForCalculation && Array.isArray(frameParamForCalculation.beams) && frameParamForCalculation.beams.length) {
                const selectedBeam = frameParamForCalculation.beams[frameParamForCalculation.selectedBeamIndex || 0];
                const selectedType = selectedBeam?.types?.[frameParamForCalculation.selectedTypeIndex || 0];
                
                if (selectedBeam && selectedType) {
                    console.log('DEBUG - selectedType:', selectedType);
                    console.log('DEBUG - selectedType.height:', selectedType.height);
                    console.log('DEBUG - selectedType.width:', selectedType.width);
                    console.log('DEBUG - this.frameWidth:', this.frameWidth);
                    console.log('DEBUG - this.frameHeight:', this.frameHeight);
                    
                    const frameWidth = selectedType.height / 10 || this.frameWidth; // המרה ממ"מ לס"מ
                    const frameHeight = selectedType.width / 10 || this.frameHeight;
                    
                    console.log('DEBUG - frameWidth calculation:', selectedType.height, '/ 10 =', frameWidth);
                    console.log('DEBUG - frameHeight calculation:', selectedType.width, '/ 10 =', frameHeight);
                    console.log('DEBUG - frameWidth (height):', frameWidth);
                    console.log('DEBUG - frameHeight (width):', frameHeight);
                    
                    // חישוב קיצור קורות החיזוק - פעמיים גובה קורות הרגל
                    // מציאת קורת הרגל לחישוב הקיצור
                    const legParam = this.product?.params?.find((p: any) => p.type === 'beamSingle' && p.name === 'leg');
                    const legBeamSelected = legParam?.beams?.[legParam.selectedBeamIndex || 0];
                    const legBeamHeight = legBeamSelected?.height / 10 || 0;
                    const legBeamWidth = legBeamSelected?.width / 10 || 0;
                    
                    const shorteningAmount = legBeamHeight * 2; // פעמיים גובה קורת הרגל
                    const shorteningAmountEx = legBeamWidth * 2; // פעמיים גובה קורת הרגל
                    
                    if (this.isTable) {
                        // עבור שולחן - 4 קורות חיזוק מקוצרות
                        // קורות רוחב מקוצרות
                        allBeams.push({
                            type: selectedType,
                            length: this.surfaceWidth - shorteningAmountEx,
                            width: frameWidth,
                            height: frameHeight,
                            name: 'Table Frame Beam Width 1',
                            beamName: selectedBeam.name,
                            beamTranslatedName: selectedBeam.translatedName
                        });
                        allBeams.push({
                            type: selectedType,
                            length: this.surfaceWidth - shorteningAmountEx,
                            width: frameWidth,
                            height: frameHeight,
                            name: 'Table Frame Beam Width 2',
                            beamName: selectedBeam.name,
                            beamTranslatedName: selectedBeam.translatedName
                        });
                        
                        // קורות אורך מקוצרות (מקבילות לקורות המדפים)
                        // אורך כולל פחות פעמיים גובה קורות הרגליים
                        const lengthBeamLength = this.surfaceLength - shorteningAmount;
                        console.log('DEBUG - lengthBeamLength:', this.surfaceLength, '-', shorteningAmount, '=', lengthBeamLength);
                        
                        allBeams.push({
                            type: selectedType,
                            length: lengthBeamLength,
                            width: frameWidth,
                            height: frameHeight,
                            name: 'Table Frame Beam Length 1',
                            beamName: selectedBeam.name,
                            beamTranslatedName: selectedBeam.translatedName
                        });
                        allBeams.push({
                            type: selectedType,
                            length: lengthBeamLength,
                            width: frameWidth,
                            height: frameHeight,
                            name: 'Table Frame Beam Length 2',
                            beamName: selectedBeam.name,
                            beamTranslatedName: selectedBeam.translatedName
                        });
                        
                        // שכפול קורות החיזוק לשולחן - עוד 4 קורות זהות
                        allBeams.push({
                            type: selectedType,
                            length: this.surfaceWidth - shorteningAmountEx,
                            width: frameWidth,
                            height: frameHeight,
                            name: 'Table Frame Beam Width 3',
                            beamName: selectedBeam.name,
                            beamTranslatedName: selectedBeam.translatedName
                        });
                        allBeams.push({
                            type: selectedType,
                            length: this.surfaceWidth - shorteningAmountEx,
                            width: frameWidth,
                            height: frameHeight,
                            name: 'Table Frame Beam Width 4',
                            beamName: selectedBeam.name,
                            beamTranslatedName: selectedBeam.translatedName
                        });
                        allBeams.push({
                            type: selectedType,
                            length: lengthBeamLength,
                            width: frameWidth,
                            height: frameHeight,
                            name: 'Table Frame Beam Length 3',
                            beamName: selectedBeam.name,
                            beamTranslatedName: selectedBeam.translatedName
                        });
                        allBeams.push({
                            type: selectedType,
                            length: lengthBeamLength,
                            width: frameWidth,
                            height: frameHeight,
                            name: 'Table Frame Beam Length 4',
                            beamName: selectedBeam.name,
                            beamTranslatedName: selectedBeam.translatedName
                        });
                        
                    } else {
                        console.log('DEBUG - shorteningAmount:', shorteningAmount);
                        // עבור ארון - קורות חיזוק מקוצרות לכל מדף
                        this.shelves.forEach((shelf, shelfIndex) => {
                            // 4 קורות חיזוק מקוצרות לכל מדף (2 לרוחב, 2 לאורך)
                            // קורות רוחב מקוצרות
                            allBeams.push({
                                type: selectedType,
                                length: this.surfaceWidth - shorteningAmountEx,
                                width: frameWidth,
                                height: frameHeight,
                                name: `Frame Beam Width 1 - Shelf ${shelfIndex + 1}`,
                                beamName: selectedBeam.name,
                            beamTranslatedName: selectedBeam.translatedName
                            });
                            allBeams.push({
                                type: selectedType,
                                length: this.surfaceWidth - shorteningAmountEx,
                                width: frameWidth,
                                height: frameHeight,
                                name: `Frame Beam Width 2 - Shelf ${shelfIndex + 1}`,
                                beamName: selectedBeam.name,
                            beamTranslatedName: selectedBeam.translatedName
                            });
                            
                            // קורות אורך מקוצרות (מקבילות לקורות המדפים)
                            allBeams.push({
                                type: selectedType,
                                length: this.surfaceLength - shorteningAmount,
                                width: frameWidth,
                                height: frameHeight,
                                name: `Frame Beam Length 1 - Shelf ${shelfIndex + 1}`,
                                beamName: selectedBeam.name,
                            beamTranslatedName: selectedBeam.translatedName
                            });
                            allBeams.push({
                                type: selectedType,
                                length: this.surfaceLength - shorteningAmount,
                                width: frameWidth,
                                height: frameHeight,
                                name: `Frame Beam Length 2 - Shelf ${shelfIndex + 1}`,
                                beamName: selectedBeam.name,
                            beamTranslatedName: selectedBeam.translatedName
                            });
                        });
                        
                    }
                }
            }
        }
        
        // קורות רגליים (leg beams) - לשולחן ולארון
        if (legParam) {
            const selectedBeam = legParam.beams?.[legParam.selectedBeamIndex || 0];
            const selectedType = selectedBeam?.types?.[legParam.selectedTypeIndex || 0];
            
            // חיפוש פרמטר גובה - נסה כמה אפשרויות
            let heightParam = this.getParam('height');
            if (!heightParam) {
                heightParam = this.params.find(p => p.type === 'height' || p.name?.toLowerCase().includes('height') || p.name?.toLowerCase().includes('גובה'));
            }
            
            // חישוב גובה הרגליים - פשוט וברור
            const dimensions = this.getProductDimensionsRaw();
            const totalHeight = dimensions.height; // הגובה הכולל של המוצר
            
            // חישוב גובה קורות הפלטה/המדפים
            let shelfBeamHeight = 0;
            if (this.isTable) {
                // עבור שולחן - גובה קורות הפלטה
                const shelfParam = this.product?.params?.find((p: any) => p.type === 'beamSingle' && p.name === 'plata');
                const shelfBeamSelected = shelfParam?.beams?.[shelfParam.selectedBeamIndex || 0];
                shelfBeamHeight = shelfBeamSelected?.height / 10 || 0;
            } else {
                // עבור ארון - רק גובה קורת המדף עצמה
                const shelfParam = this.product?.params?.find((p: any) => p.type === 'beamArray' && p.name === 'shelfs');
                const shelfBeamSelected = shelfParam?.beams?.[shelfParam.selectedBeamIndex || 0];
                shelfBeamHeight = shelfBeamSelected?.height / 10 || 0;
            }
            
            // גובה הרגל = גובה כולל פחות גובה קורות הפלטה/המדפים
            const legHeight = totalHeight - shelfBeamHeight;
            console.log('DEBUG - legHeight calculation:', totalHeight, '-', shelfBeamHeight, '=', legHeight);
            console.log('DEBUG - legHeight type:', typeof legHeight, 'value:', legHeight);
            
            if (selectedBeam && selectedType) {
                const legWidth = selectedType.width / 10 || 5; // המרה ממ"מ לס"מ
                const legHeightDimension = selectedType.height / 10 || 5;
                
                // 4 רגליים לשולחן או לארון
                const numLegs = 4;
                for (let i = 0; i < numLegs; i++) {
                    console.log('DEBUG - Adding leg', i + 1, 'with length:', legHeight);
                    allBeams.push({
                        type: selectedType,
                        length: legHeight, // גובה הרגל המחושב (totalHeight - shelfBeamHeight)
                        width: legWidth,
                        height: legHeightDimension, // גובה הקורה עצמה
                        name: this.isTable ? `Table Leg ${i + 1}` : `Cabinet Leg ${i + 1}`,
                        beamName: selectedBeam.name
                    });
                }
            }
        } else {
            console.log('Leg beams not processed - no legParam found');
        }
        
        
        // קיבוץ קורות לפי סוג עץ ושם קורה - איחוד קורות זהות
        console.log('=== STARTING beamTypesMap PROCESSING ===');
        console.log('Total beams in allBeams:', allBeams.length);
        allBeams.forEach((beam, index) => {
            console.log(`Beam ${index + 1}:`, {
                name: beam.name,
                beamName: beam.beamName,
                length: beam.length,
                type: beam.type?.name
            });
        });
        
        const beamTypesMap = new Map();
        
        allBeams.forEach(beam => {
            // שימוש בשם העץ + beamName כמפתח מורכב לאיחוד קורות זהות
            const typeName = beam.type?.name || 'unknown';
            const beamName = beam.beamName || 'undefined';
            const typeKey = `${typeName}_${beamName}`;
            
            console.log(`Processing beam for beamTypesMap: typeKey=${typeKey}, beamName=${beam.beamName}, name=${beam.name}`);
            
            if (!beamTypesMap.has(typeKey)) {
                console.log(`Creating new entry in beamTypesMap for ${typeKey} with beamName=${beam.beamName}`);
                beamTypesMap.set(typeKey, {
                    type: beam.type,
                    beamName: beam.beamName, // שמירת beamName
                    beamTranslatedName: beam.beamTranslatedName, // שמירת השם המתורגם של הקורה
                    sizes: []
                });
            }
            
            beamTypesMap.get(typeKey).sizes.push(beam.length);
        });
        
        // המרה למערך הסופי
        beamTypesMap.forEach((beamData, typeKey) => {
            this.BeamsDataForPricing.push({
                type: beamData.type,
                beamName: beamData.beamName, // הוספת beamName
                beamTranslatedName: beamData.beamTranslatedName, // הוספת השם המתורגם של הקורה
                sizes: beamData.sizes
            });
        });
        
        // חישוב totalSizes לכל קורה - ספירת כמות מכל אורך
        this.BeamsDataForPricing.forEach((beamData, index) => {
            const sizeCounts = new Map<number, number>();
            
            // ספירת כל האורכים (ללא עיגול)
            beamData.sizes.forEach(size => {
                sizeCounts.set(size, (sizeCounts.get(size) || 0) + 1);
            });
            
            // המרה למערך של אובייקטים עם אורך וכמות
            const totalSizes = Array.from(sizeCounts.entries()).map(([length, count]) => ({
                length: length,
                count: count
            })).sort((a, b) => a.length - b.length); // מיון לפי אורך
            
            // הוספת השדה החדש
            beamData.totalSizes = totalSizes;
            
            console.log(`Beam ${index + 1} (${beamData.beamName}) totalSizes:`, totalSizes);
        });
        
        // הצגת התוצאה הסופית של כל הקורות
        console.log('=== FINAL BEAMS DATA FOR PRICING ===');
        console.log('Total beam types:', this.BeamsDataForPricing.length);
        this.BeamsDataForPricing.forEach((beamData, index) => {
            console.log(`Beam Type ${index + 1}:`, {
                typeId: beamData.type?._id || beamData.type?.id,
                typeName: beamData.type?.name || 'Unknown',
                beamName: beamData.beamName || 'Unknown',
                width: beamData.type?.width || 0,
                height: beamData.type?.height || 0,
                material: beamData.type?.material || 'Unknown',
                sizes: beamData.sizes,
                totalSizes: beamData.totalSizes, // הוספת totalSizes לפלט
                totalLength: beamData.sizes.reduce((sum, size) => sum + size, 0),
                count: beamData.sizes.length
            });
        });
        // הצגת התוצאה הסופית של הקורות
        console.log('=== FINAL BEAMS DATA FOR PRICING ===');
        console.log('Total beam types:', this.BeamsDataForPricing.length);
        this.BeamsDataForPricing.forEach((beamData, index) => {
            console.log(`Beam Type ${index + 1}:`, {
                type: beamData.type,
                beamName: beamData.beamName,
                beamTranslatedName: beamData.beamTranslatedName,
                material: beamData.material,
                totalSizes: beamData.totalSizes,
                totalLength: beamData.totalLength,
                count: beamData.count
            });
        });
        console.log('*** === END BEAMS DATA ===', this.BeamsDataForPricing);
        
        // חישוב ברגים
        this.calculateForgingData();
    }

    // פונקציה לעגול אורך בורג לחצי הקרוב למעלה
    private roundScrewLength(length: number): number {
        return Math.ceil(length * 2) / 2; // עיגול לחצי הקרוב למעלה
    }

    // פונקציה לחישוב ברגי המדפים/פלטה
    private calculateShelfForgingData(): any[] {
        console.log('=== CALCULATING SHELF FORGING DATA ===');
        
        const shelfForgingData: any[] = [];
        
        // חישוב ברגי מדפים/פלטה
        if (this.isTable) {
            // עבור שולחן - ברגי פלטה
            const plataParam = this.params.find(p => p.name === 'plata');
            if (plataParam && plataParam.selectedBeamIndex !== undefined) {
                const selectedBeam = plataParam.beams[plataParam.selectedBeamIndex];
                const selectedType = selectedBeam?.types?.[plataParam.selectedTypeIndex || 0];
                
                if (selectedBeam && selectedType) {
                    // חישוב כמות ברגים לפי כמות הקורות בפועל
                    // כל קורה צריכה 4 ברגים
                    const beamWidth = selectedBeam.width / 10;
                    const beamHeight = selectedBeam.height / 10;
                    const minGap = 1; // רווח מינימלי
                    const surfaceBeams = this.createSurfaceBeams(this.surfaceWidth, this.surfaceLength, beamWidth, beamHeight, minGap);
                    const totalBeams = surfaceBeams.length; // כמות הקורות בפועל
                    const totalScrews = totalBeams * 4; // 4 ברגים לכל קורה
                    
                    shelfForgingData.push({
                        type: 'Shelf Screws',
                        beamName: selectedBeam.name,
                        beamTranslatedName: selectedBeam.translatedName,
                        material: selectedType.translatedName,
                        count: totalScrews,
                        length: this.roundScrewLength(beamHeight + 2), // גובה הקורה + 2, מעוגל לחצי הקרוב
                        description: 'ברגי פלטה'
                    });
                    
                    console.log(`Table shelf screws: ${totalScrews} screws for ${totalBeams} beams`);
                }
            }
        } else {
            // עבור ארון - ברגי מדפים
            const shelfParam = this.params.find(p => p.name === 'shelfs');
            if (shelfParam && shelfParam.selectedBeamIndex !== undefined) {
                const selectedBeam = shelfParam.beams[shelfParam.selectedBeamIndex];
                const selectedType = selectedBeam?.types?.[shelfParam.selectedTypeIndex || 0];
                
                if (selectedBeam && selectedType) {
                    // חישוב כמות ברגים לפי כמות הקורות בפועל
                    // כל קורה צריכה 4 ברגים
                    const beamWidth = selectedBeam.width / 10;
                    const beamHeight = selectedBeam.height / 10;
                    const minGap = 1; // רווח מינימלי
                    const surfaceBeams = this.createSurfaceBeams(this.surfaceWidth, this.surfaceLength, beamWidth, beamHeight, minGap);
                    const totalShelves = this.shelves.length;
                    const totalBeams = surfaceBeams.length * totalShelves; // כמות הקורות בפועל
                    const totalScrews = totalBeams * 4; // 4 ברגים לכל קורה
                    
                    shelfForgingData.push({
                        type: 'Shelf Screws',
                        beamName: selectedBeam.name,
                        beamTranslatedName: selectedBeam.translatedName,
                        material: selectedType.translatedName,
                        count: totalScrews,
                        length: this.roundScrewLength(beamHeight + 2), // גובה הקורה + 2, מעוגל לחצי הקרוב
                        description: 'ברגי מדפים'
                    });
                    
                    console.log(`Cabinet shelf screws: ${totalScrews} screws for ${totalShelves} shelves`);
                }
            }
        }
        
        return shelfForgingData;
    }

    // פונקציה לחישוב ברגי הרגליים
    private calculateLegForgingData(): any[] {
        console.log('=== CALCULATING LEG FORGING DATA ===');
        
        const legForgingData: any[] = [];
        
        // חישוב ברגי רגליים
        const legParam = this.params.find(p => p.name === 'leg');
        if (legParam && legParam.selectedBeamIndex !== undefined) {
            const selectedBeam = legParam.beams[legParam.selectedBeamIndex];
            const selectedType = selectedBeam?.types?.[legParam.selectedTypeIndex || 0];
            
            if (selectedBeam && selectedType) {
                const beamWidth = selectedBeam.width / 10;
                const beamHeight = selectedBeam.height / 10;
                
                // חישוב כמות ברגים לפי סוג המוצר
                let totalScrews = 0;
                if (this.isTable) {
                    // שולחן: תמיד 4 רגליים עם 4 ברגים כל אחת
                    totalScrews = 4 * 4; // 16 ברגים
                } else {
                    // ארון: כמות המדפים כפול 8 ברגים לכל קומה
                    const totalShelves = this.shelves.length;
                    totalScrews = totalShelves * 8; // 8 ברגים לכל מדף
                }
                
                // חלוקה לשתי קבוצות שוות - חצי לכל קבוצה
                const halfScrews = Math.floor(totalScrews / 2);
                const remainingScrews = totalScrews - halfScrews; // לטפל במקרה של מספר אי-זוגי
                
                // קבוצה ראשונה: ברגים לפי רוחב קורת הרגל
                const widthScrewLength = this.roundScrewLength(beamWidth + 3.5);
                legForgingData.push({
                    type: 'Leg Screws (Width)',
                    beamName: selectedBeam.name,
                    beamTranslatedName: selectedBeam.translatedName,
                    material: selectedType.translatedName,
                    count: halfScrews,
                    length: widthScrewLength,
                    description: 'ברגי רגליים (לפי רוחב)'
                });
                
                // קבוצה שנייה: ברגים לפי גובה קורת הרגל
                const heightScrewLength = this.roundScrewLength(beamHeight + 3.5);
                legForgingData.push({
                    type: 'Leg Screws (Height)',
                    beamName: selectedBeam.name,
                    beamTranslatedName: selectedBeam.translatedName,
                    material: selectedType.translatedName,
                    count: remainingScrews,
                    length: heightScrewLength,
                    description: 'ברגי רגליים (לפי גובה)'
                });
                
                console.log(`Leg screws: ${halfScrews} width-based (${widthScrewLength}cm) + ${remainingScrews} height-based (${heightScrewLength}cm)`);
            }
        }
        
        return legForgingData;
    }

    // פונקציה ראשית לחישוב כל הברגים
    private calculateForgingData(): void {
        console.log('=== CALCULATING FORGING DATA ===');
        
        // איפוס המערך
        this.ForgingDataForPricing = [];
        
        // חישוב ברגי מדפים/פלטה
        const shelfForgingData = this.calculateShelfForgingData();
        this.ForgingDataForPricing.push(...shelfForgingData);
        
        // חישוב ברגי רגליים
        const legForgingData = this.calculateLegForgingData();
        this.ForgingDataForPricing.push(...legForgingData);
        
        // הצגת התוצאה הסופית
        console.log('=== FINAL FORGING DATA FOR PRICING ===');
        console.log('Total forging types:', this.ForgingDataForPricing.length);
        this.ForgingDataForPricing.forEach((forgingData, index) => {
            console.log(`Forging Type ${index + 1}:`, {
                type: forgingData.type,
                beamName: forgingData.beamName,
                beamTranslatedName: forgingData.beamTranslatedName,
                material: forgingData.material,
                count: forgingData.count,
                length: forgingData.length,
                description: forgingData.description
            });
        });
        console.log('*** === END FORGING DATA ===', this.ForgingDataForPricing);
        
        // חישוב מחיר כולל ותוכנית חיתוך
        this.calculatedPrice = this.pricingService.calculatePrice(this.BeamsDataForPricing, this.ForgingDataForPricing);
        this.cuttingPlan = this.pricingService.getCuttingPlan(this.BeamsDataForPricing, this.ForgingDataForPricing);
        console.log('=== FINAL CALCULATED PRICE ===', this.calculatedPrice);
        console.log('=== CUTTING PLAN ===', this.cuttingPlan);
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
        // השתמש במידות שמועברות כפרמטרים (כבר מחושבות נכון)
        let frameBeamWidth = frameWidth;
        let frameBeamHeight = frameHeight;
        
        // בדיקת תקינות כל הפרמטרים
        if (isNaN(totalWidth) || totalWidth <= 0) {
            console.error('Invalid totalWidth:', totalWidth);
            return [];
        }
        if (isNaN(totalLength) || totalLength <= 0) {
            console.error('Invalid totalLength:', totalLength);
            return [];
        }
        if (isNaN(frameBeamWidth) || frameBeamWidth <= 0) {
            console.error('Invalid frameBeamWidth:', frameBeamWidth);
            return [];
        }
        if (isNaN(frameBeamHeight) || frameBeamHeight <= 0) {
            console.error('Invalid frameBeamHeight:', frameBeamHeight);
            return [];
        }
        if (isNaN(legWidth) || legWidth <= 0) {
            console.error('Invalid legWidth:', legWidth);
            return [];
        }
        if (isNaN(legDepth) || legDepth <= 0) {
            console.error('Invalid legDepth:', legDepth);
            return [];
        }
        
        const beams = [];
        // X axis beams (front/back) - קורות אופקיות קדמיות ואחוריות
        for (const z of [
            -totalLength / 2 + legDepth / 2,    // קדמית - צמודה לקצה לפי מידות הרגליים
            totalLength / 2 - legDepth / 2      // אחורית - צמודה לקצה לפי מידות הרגליים
        ]) {
            // עבור שולחן: קיצור לפי גובה קורות החיזוק
            // עבור ארון: קיצור לפי רוחב הרגליים (legWidth)
            const beamWidth = this.isTable ? totalWidth - 2 * frameBeamHeight : totalWidth - 2 * legWidth;
            beams.push({
                x: 0,  // ממורכזות במרכז
                y: 0,
                z: z,  // מיקום זהה לארון
                width: beamWidth,  // עבור שולחן: קיצור לפי גובה קורות החיזוק, עבור ארון: קיצור לפי רוחב הרגליים
                height: frameBeamHeight,           // גובה מקורות החיזוק
                depth: frameBeamWidth              // עומק מקורות החיזוק
            });
        }
        // Z axis beams (left/right) - קורות אופקיות שמאליות וימניות
        for (const x of [
            -totalWidth / 2 + legWidth / 2,     // שמאלית - צמודה לקצה לפי מידות הרגליים
            totalWidth / 2 - legWidth / 2       // ימנית - צמודה לקצה לפי מידות הרגליים
        ]) {
            const originalX = x;
            const adjustedX = x;  // עבור שולחן וארון - מיקום זהה
            beams.push({
                x: adjustedX,  // עבור שולחן, שתי הקורות ממורכזות למרכז הרגל
                y: 0,
                z: 0,
                width: frameBeamWidth,              // רוחב מקורות החיזוק
                height: frameBeamHeight,           // גובה מקורות החיזוק
                depth: totalLength - 2 * legDepth  // עומק זהה לארון
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
        let shelfsParam = null;
        if (this.isTable) {
            // עבור שולחן, נשתמש בפרמטר plata במקום shelfs
            shelfsParam = this.product?.params?.find((p: any) => p.type === 'beamSingle' && p.name === 'plata');
        } else {
            // עבור ארון, נשתמש בפרמטר shelfs
            shelfsParam = this.getParam('shelfs');
        }
        
        let shelfBeamHeight = this.beamHeight;
        if (shelfsParam && Array.isArray(shelfsParam.beams) && shelfsParam.beams.length) {
            const shelfBeam = shelfsParam.beams[shelfsParam.selectedBeamIndex || 0];
            if (shelfBeam) {
                console.log('DEBUG - shelfBeam.height (raw):', shelfBeam.height);
                console.log('DEBUG - shelfBeam.height / 10:', shelfBeam.height / 10);
                shelfBeamHeight = shelfBeam.height / 10; // המרה ממ"מ לס"מ
                console.log('DEBUG - shelfBeamHeight (final):', shelfBeamHeight);
            }
        }
        
        // קיצור הרגליים בעובי קורות המדפים - הרגליים צריכות להגיע רק עד לתחתית המדף העליון
        console.log('DEBUG - topHeight:', topHeight);
        console.log('DEBUG - shelfBeamHeight:', shelfBeamHeight);
        legHeight = topHeight - shelfBeamHeight;
        console.log('DEBUG - legHeight calculation:', topHeight, '-', shelfBeamHeight, '=', legHeight);
        
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

    // הוספת ברגים לרגליים
    private addScrewsToLegs(totalShelves: number, legPositions: any[], frameBeamHeight: number, shelfY: number) {
        console.log('Adding screws to legs:', this.isTable ? 'table' : this.shelves);
        
        // לכל מדף, נוסיף ברגים לרגליים
        for (let shelfIndex = 0; shelfIndex < totalShelves; shelfIndex++) {
            let currentShelfY;
            if (this.isTable) {
                // עבור שולחן, הברגים צריכים להיות בגובה הרגליים פחות חצי ממידת הרוחב של קורת החיזוק
                const legParam = this.getParam('leg');
                let legWidth = frameBeamHeight; // ברירת מחדל
                if (legParam && Array.isArray(legParam.beams) && legParam.beams.length) {
                    const legBeam = legParam.beams[legParam.selectedBeamIndex || 0];
                    if (legBeam) {
                        legWidth = legBeam.width / 10; // המרה ממ"מ לס"מ
                    }
                }
                const plataParam = this.getParam('plata');
                let plataBeamHeight = this.beamHeight; // ברירת מחדל
                if (plataParam && Array.isArray(plataParam.beams) && plataParam.beams.length) {
                    const plataBeam = plataParam.beams[plataParam.selectedBeamIndex || 0];
                    if (plataBeam) {
                        plataBeamHeight = plataBeam.height / 10; // המרה ממ"מ לס"מ
                    }
                }
                // חישוב tableHeight כמו בפונקציה הראשית
                const heightParam = this.getParam('height');
                const baseTableHeight = heightParam ? heightParam.default : 80; // גובה ברירת מחדל
                const tableHeight = baseTableHeight - plataBeamHeight; // הפחתת גובה קורות הפלטה
                
                // חישוב frameBeamHeight כמו בפונקציה הראשית
                const frameParam = this.getParam('leg'); // עבור שולחן, frameParam הוא leg
                let calculatedFrameBeamHeight = this.frameHeight; // ברירת מחדל
                if (frameParam && Array.isArray(frameParam.beams) && frameParam.beams.length) {
                    const frameBeam = frameParam.beams[frameParam.selectedBeamIndex || 0];
                    if (frameBeam) {
                        calculatedFrameBeamHeight = frameBeam.width / 10; // המרה ממ"מ לס"מ
                    }
                }
                
                // גובה הרגליים בפועל (לא גובה השולחן)
                const actualLegHeight = legPositions[0] ? legPositions[0].height : 0;
                // אותו חישוב כמו הברגים התחתונים, רק בלי totalDistance
                currentShelfY = tableHeight - calculatedFrameBeamHeight / 2; // גובה מרכז קורות החיזוק העליונות
                console.log('=====================', actualLegHeight, legWidth, plataBeamHeight);
                console.log('Table screw calculation:', { actualLegHeight, legWidth, currentShelfY });
                console.log('Previous calculation would be:', actualLegHeight - (legWidth / 2), 'New calculation:', currentShelfY);
                console.log('Leg positions for calculation:', legPositions[0]);
                
                // הוספת גובה קורות הפלטה
               
            } else {
                // עבור ארון, השתמש באותו חישוב כמו הברגים של המדפים
                // הברגים של המדפים מוצבים ב: currentY + frameBeamHeight
                // אז הברגים של הרגליים צריכים להיות באותו גובה
                
                const shelfHeight = this.getShelfHeight(shelfIndex);
                const beamHeight = this.beamHeight;
                const frameHeight = this.frameHeight;
                
            
            // חישוב ידני של הגובה כמו ב-3D model
            let manualCurrentY = 0;
            for (let i = 0; i <= shelfIndex; i++) {
                manualCurrentY += this.shelves[i].gap;
                if (i < shelfIndex) {
                    manualCurrentY += this.frameHeight + this.beamHeight;
                }
            }
            
            const shelfHeightFromFunction = this.getShelfHeight(shelfIndex);
            const expectedManualY = manualCurrentY + this.frameHeight / 2;
            
            
                
                // עכשיו נציב את הברגים במרכז קורת החיזוק
                // getShelfHeight מחזיר כעת את המרכז של קורת החיזוק
                // אז אנחנו יכולים להשתמש בו ישירות
                currentShelfY = shelfHeightFromFunction;
            }
                    
            legPositions.forEach((leg, legIndex) => {
                const isEven = legIndex % 2 === 0;
                // 2 ברגים לכל רגל (אחד לכל קורת חיזוק - קדמית ואחורית)
                const screwPositions = [
                    // בורג לקורת חיזוק קדמית
                    {
                        x: leg.x, // מרכז רוחב הרגל
                        y: currentShelfY, // מרכז קורת החיזוק
                        z: isEven ? (leg.z - (leg.depth / 2 + this.headHeight)) : (leg.z + (leg.depth / 2 + this.headHeight)) // צד חיצוני של הרגל (קדמי)
                    },
                    {
                        x: leg.x + ((leg.width / 2 + this.headHeight) * (legIndex > 1 ? 1 : -1)), // מרכז רוחב הרגל
                        y: currentShelfY, // מרכז קורת החיזוק
                        z: (isEven ? (leg.z - (leg.depth / 2 + this.headHeight)) : (leg.z + (leg.depth / 2 + this.headHeight))) +
                        ((isEven ? 1 : -1) * (leg.depth / 2 + this.headHeight)) // צד חיצוני של הרגל (קדמי)
                    }
                ];
                
                screwPositions.forEach((pos, screwIndex) => {
                    const screwGroup = this.createHorizontalScrewGeometry();
                    
                    // הברגים אופקיים ומיושרים ל-X (מאונכים לדופן Z)
                    screwGroup.position.set(pos.x, pos.y, pos.z);
                    if (screwIndex === 0) {
                        screwGroup.rotation.y =  Math.PI / 2 * (isEven ? 1 : -1);
                    } else {
                        screwGroup.rotation.y =  legIndex > 1 ? 0 : Math.PI;
                    }
                    
                    this.scene.add(screwGroup);
                    this.beamMeshes.push(screwGroup);
                    
                    console.log(`Leg ${legIndex + 1}, Shelf ${shelfIndex + 1}, Screw ${screwIndex + 1}: x=${pos.x.toFixed(1)}, y=${pos.y.toFixed(1)}, z=${pos.z.toFixed(1)}`);
                });
            });
        }
    }

    private getShelfHeight(shelfIndex: number): number {
        if (this.isTable) {
            // עבור שולחן, הגובה הוא גובה השולחן
            const heightParam = this.getParam('height');
            return heightParam ? heightParam.default : 80;
        } else {
            // עבור ארון, הגובה הוא סכום כל המדפים עד המדף הנוכחי (כמו בקוד יצירת המודל התלת-ממדי)
        let currentY = 0;
            
            for (let i = 0; i <= shelfIndex; i++) {
                currentY += this.shelves[i].gap;

                if (i < shelfIndex) { // לא המדף הנוכחי - מוסיפים את הגובה של המדף הקודם
                    currentY += this.frameHeight + this.beamHeight;
                }
            }
            
            // עבור המדף הנוכחי, הברגים צריכים להיות במרכז קורת החיזוק
            // קורת החיזוק נמצאת בגובה: currentY + frameHeight/2
            return currentY + this.frameHeight / 2;
        }
    }

    // פרמטרים של הבורג (מידות אמיתיות)
    screwLength: number = 4.0; // 40 מ"מ = 4 ס"מ
    screwRadius: number = 0.1; // 1 מ"מ = 0.1 ס"מ (רדיוס הבורג)
    headHeight: number = 0.2; // 2 מ"מ = 0.2 ס"מ (גובה הראש)
    headRadius: number = 0.3; // 3 מ"מ = 0.3 ס"מ (רדיוס הראש)

    // חישוב מידות המוצר הגולמיות (ללא פורמטינג)
    getProductDimensionsRaw(): { length: number, width: number, height: number, beamCount: number, gapBetweenBeams: number, shelfCount: number, shelfHeights: number[], totalScrews: number } {
        // רוחב כולל
        const totalWidth = this.surfaceWidth;
        
        // אורך כולל
        const totalLength = this.surfaceLength;
        
        // גובה כולל
        let totalHeight = 0;
        
        if (this.isTable) {
            // עבור שולחן - הגובה הוא פשוט הפרמטר "גובה משטח" (כי כבר הורדנו את גובה קורות הפלטה)
            const heightParam = this.getParam('height');
            totalHeight = heightParam ? heightParam.default : 80; // ברירת מחדל 80 ס"מ
        } else {
            // עבור ארון - חישוב זהה לחישוב הרגליים בפונקציה updateBeams
            // חישוב frameBeamHeight - זהה לחישוב בפונקציה updateBeams
            let frameBeamHeight = this.frameHeight;
            const frameParam = this.params.find(p => p.type === 'beamSingle' && p.name !== 'shelfs');
            if (frameParam && Array.isArray(frameParam.beams) && frameParam.beams.length) {
                const frameBeam = frameParam.beams[frameParam.selectedBeamIndex || 0];
                if (frameBeam) {
                    // החלפה: width של הפרמטר הופך ל-height של הקורה - זהה לחישוב בפונקציה updateBeams
                    frameBeamHeight = frameBeam.width / 10;  // המרה ממ"מ לס"מ
                }
            }
            
            // חישוב beamHeight האמיתי מקורת המדף שנבחרה
            let beamHeight = this.beamHeight; // ברירת מחדל
            const shelfsParam = this.getParam('shelfs');
            if (shelfsParam && Array.isArray(shelfsParam.beams) && shelfsParam.beams.length) {
                const shelfBeam = shelfsParam.beams[shelfsParam.selectedBeamIndex || 0];
                if (shelfBeam) {
                    beamHeight = shelfBeam.height / 10; // המרה ממ"מ לס"מ
                }
            }
            
            // חישוב totalY - זהה לחישוב בפונקציה updateBeams
            let totalY = 0;
            for (const shelf of this.shelves) {
                totalY += shelf.gap + frameBeamHeight + beamHeight;
            }
            
            // חישוב shelfBeamHeight - זהה לחישוב בפונקציה createLegBeams
            let shelfBeamHeight = this.beamHeight;
            if (shelfsParam && Array.isArray(shelfsParam.beams) && shelfsParam.beams.length) {
                const shelfBeam = shelfsParam.beams[shelfsParam.selectedBeamIndex || 0];
                if (shelfBeam) {
                    shelfBeamHeight = shelfBeam.height / 10; // המרה ממ"מ לס"מ
                }
            }
            
            // הגובה הכולל = גובה הרגל המחושב (totalY - shelfBeamHeight) - זהה לחישוב בפונקציה createLegBeams
            totalHeight = totalY;
        }
        
        // חישוב כמות קורות המדף
        const beamWidth = this.beamWidth;
        const minGap = this.minGap;
        const beamCount = Math.floor((totalWidth + minGap) / (beamWidth + minGap));
        
        // חישוב רווח בין קורות המדף
        let gapBetweenBeams = 0;
        if (beamCount > 1) {
            // (רוחב כולל - כמות קורות × רוחב קורה) / (כמות קורות - 1)
            gapBetweenBeams = (totalWidth - (beamCount * beamWidth)) / (beamCount - 1);
        }
        
        // כמות המדפים
        const shelfCount = this.shelves.length;
        
        // גבהי המדפים (רשימה של מספרים)
        const shelfHeights: number[] = [];
        for (let i = 0; i < this.shelves.length; i++) {
            const shelfHeight = this.getShelfHeight(i);
            shelfHeights.push(shelfHeight);
        }
        
        // חישוב כמות ברגים כוללת
        let totalScrews = 0;
        
        // ברגים לקורות המדפים
        for (let i = 0; i < this.shelves.length; i++) {
            const isShortenedBeam = (i === 0 || i === this.shelves.length - 1) && this.shelves.length > 1;
            const screwsPerBeam = isShortenedBeam ? 2 : 4; // 2 ברגים לקורות מקוצרות, 4 לקורות רגילות
            totalScrews += beamCount * screwsPerBeam;
        }
        
        // ברגים לרגליים (2 ברגים לכל רגל לכל מדף)
        const legScrews = this.shelves.length * 4 * 2; // 4 רגליים × 2 ברגים לכל מדף
        totalScrews += legScrews;
        
        return {
            length: totalLength,
            width: totalWidth,
            height: totalHeight,
            beamCount: beamCount,
            gapBetweenBeams: gapBetweenBeams,
            shelfCount: shelfCount,
            shelfHeights: shelfHeights,
            totalScrews: totalScrews
        };
    }

    // חישוב מידות המוצר הסופי (עם פורמטינג טקסטואלי)
    getProductDimensions(): { length: string, width: string, height: string, beamCount: string, gapBetweenBeams: string, shelfCount: string, shelfHeights: string, totalScrews: string } {
        const rawDimensions = this.getProductDimensionsRaw();
        
        // גבהי המדפים (רשימה מופרדת בפסיקים, מלמעלה למטה)
        const shelfHeightsList: string[] = [];
        for (let i = 0; i < rawDimensions.shelfHeights.length; i++) {
            shelfHeightsList.push(`${this.formatNumber(rawDimensions.shelfHeights[i])} <small>ס"מ</small>`);
        }
        const shelfHeights = shelfHeightsList.join('<br>');
        
        return {
            length: `${this.formatNumber(rawDimensions.length)} <small>ס"מ</small>`,
            width: `${this.formatNumber(rawDimensions.width)} <small>ס"מ</small>`,
            height: `${this.formatNumber(rawDimensions.height)} <small>ס"מ</small>`,
            beamCount: `${rawDimensions.beamCount} <small>קורות</small>`,
            gapBetweenBeams: `${this.formatNumber(rawDimensions.gapBetweenBeams)} <small>ס"מ</small>`,
            shelfCount: `${rawDimensions.shelfCount} <small>מדפים</small>`,
            shelfHeights: shelfHeights,
            totalScrews: `${rawDimensions.totalScrews} <small>ברגים</small>`
        };
    }
    
    // פונקציה עזר להצגת מספרים ללא .0 אם הם שלמים
    private formatNumber(value: number): string {
        return value % 1 === 0 ? value.toString() : value.toFixed(1);
    }
    
    // פונקציה לקביעת יחידות לפי סוג הפרמטר
    getUnitForParameter(param: any): string {
        if (param.type === 'length' || param.type === 'width' || param.type === 'height') {
            return 'ס"מ';
        } else if (param.type === 'gap' || param.type === 'shelfHeight') {
            return 'ס"מ';
        } else if (param.type === 'beamCount') {
            return 'יח\'';
        } else if (param.type === 'shelfCount') {
            return 'יח\'';
        } else {
            return 'ס"מ';
        }
    }
    
    // יצירת גיאומטריית בורג אופקי (להרגליים)
    private createHorizontalScrewGeometry(): THREE.Group {
        const screwGroup = new THREE.Group();
        
        // פרמטרים של הבורג (מידות אמיתיות)

        // יצירת גוף הבורג (צינור צר) - אופקי
        const screwGeometry = new THREE.CylinderGeometry(this.screwRadius, this.screwRadius, this.screwLength, 8);
        const screwMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 }); // אפור מתכתי
        const screwMesh = new THREE.Mesh(screwGeometry, screwMaterial);
        screwMesh.rotation.z = Math.PI / 2; // סיבוב לרוחב
        screwMesh.position.x = -this.screwLength / 2; // מרכז את הבורג
        screwGroup.add(screwMesh);
        
        // יצירת ראש הבורג (גליל נפרד) - בחלק הקדמי של הבורג
        const headGeometry = new THREE.CylinderGeometry(this.headRadius, this.headRadius, this.headHeight, 8);
        const headMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 }); // כהה יותר
        const headMesh = new THREE.Mesh(headGeometry, headMaterial);
        headMesh.rotation.z = Math.PI / 2; // סיבוב לרוחב
        headMesh.position.x = - this.headHeight / 2; // ראש בחלק הקדמי של הבורג
        screwGroup.add(headMesh);
        
        return screwGroup;
    }

    // יצירת גיאומטריית בורג
    private createScrewGeometry(): THREE.Group {
        const screwGroup = new THREE.Group();

        
        // יצירת גוף הבורג (צינור צר)
        const screwGeometry = new THREE.CylinderGeometry(this.screwRadius, this.screwRadius, this.screwLength, 8);
        const screwMaterial = new THREE.MeshStandardMaterial({ color: 0x444444  }); // כמעט שחור
        const screwMesh = new THREE.Mesh(screwGeometry, screwMaterial);
        screwMesh.position.y = -this.screwLength / 2; // מרכז את הבורג
        screwGroup.add(screwMesh);
        
        // יצירת ראש הבורג (גליל נפרד) - בחלק העליון של הבורג
        const headGeometry = new THREE.CylinderGeometry(this.headRadius, this.headRadius, this.headHeight, 8);
        const headMaterial = new THREE.MeshStandardMaterial({ color: 0x444444  }); // צבע בהיר יותר לראש
        const headMesh = new THREE.Mesh(headGeometry, headMaterial);
        headMesh.position.y = this.headHeight / 2; // ראש בחלק העליון של הבורג
        screwGroup.add(headMesh);
        
        // ביטול החריצים - אין צורך בהם
        
        return screwGroup;
    }

    // הוספת ברגים לקורת מדף
    private addScrewsToShelfBeam(beam: any, shelfY: number, beamHeight: number, frameBeamWidth: number, isShortenedBeam: string = "top") {
        // חישוב מיקומי הברגים
        // הזחה מהקצוות: מחצית ממידת ה-height של קורת החיזוק
        const edgeOffset = frameBeamWidth / 2;
        // הזחה כלפי פנים: רבע ממידת ה-width של קורת המדף
        const inwardOffset = beam.width / 4 > this.frameWidth / 2 ? beam.width / 4 : this.frameWidth / 2;
        
        // קורות המדפים נטענות ב-z=0 (במרכז)
        const beamZ = 0;
        let screwPositions = [
            // פינה שמאלית קדמית
            {
                x: beam.x - beam.width / 2 + inwardOffset,
                z: beamZ - beam.depth / 2 + edgeOffset
            },
            // פינה ימנית קדמית
            {
                x: beam.x + beam.width / 2 - inwardOffset,
                z: beamZ - beam.depth / 2 + edgeOffset
            },
            // פינה שמאלית אחורית
            {
                x: beam.x - beam.width / 2 + inwardOffset,
                z: beamZ + beam.depth / 2 - edgeOffset
            },
            // פינה ימנית אחורית
            {
                x: beam.x + beam.width / 2 - inwardOffset,
                z: beamZ + beam.depth / 2 - edgeOffset
            }
        ];
        
        // אם הקורה מקוצרת, הסר את הברגים הראשון והשלישי מהרשימה
        if (isShortenedBeam !== "top") {
            // הסר את הברגים הראשון והשלישי (אינדקסים 0 ו-2)
            if (isShortenedBeam === "start") {
                screwPositions = screwPositions.filter((pos, index) => index !== 1 && index !== 3); 
            } else {
                screwPositions = screwPositions.filter((pos, index) => index !== 0 && index !== 2);
            }
            const startPositions = screwPositions[0];
            const endPositions = screwPositions[1];
            // create 2 new positions between start and end - 1/3 from start and 2/3 from end and the opposite
           const newPosition = [
                {
                    x: startPositions.x + (endPositions.x - startPositions.x) / 3,
                    z: startPositions.z + (endPositions.z - startPositions.z) / 3
                },
                {
                    x: startPositions.x + (2 * (endPositions.x - startPositions.x) / 3),
                    z: startPositions.z + (2 * (endPositions.z - startPositions.z) / 3)
                }
           ];
           screwPositions = [...newPosition, ...screwPositions];
        }
        
        // יצירת ברגים
        screwPositions.forEach((pos, index) => {
            const screwGroup = this.createScrewGeometry();
            // הבורג צריך להיות כך שהראש שלו נוגע בקורה
            // הבורג לא מסובב, אז הראש נמצא ב-(screwLength/2 + headHeight/2) מהמרכז
            // כדי שהראש יהיה על הקורה, המרכז צריך להיות מתחת לקורה ב-(screwLength/2 + headHeight/2)
            // הורדה נוספת של 20 מ"מ כלפי מטה
            const headHeight = 0.2; // 2 מ"מ
            const screwLength = 4.0; // 40 מ"מ
            const screwY = shelfY + beamHeight; // הורדה של 20 מ"מ + 100 לראות את הברגים
            // מיקום הבורג: החלק התחתון של הראש על הקורה, מופנה כלפי מטה
            screwGroup.position.set(pos.x, screwY, pos.z);
            // הבורג כבר מופנה כלפי מטה - אין צורך בסיבוב
            // screwGroup.rotation.x = Math.PI;
            
            this.scene.add(screwGroup);
            this.beamMeshes.push(screwGroup);
        });
    }
}
