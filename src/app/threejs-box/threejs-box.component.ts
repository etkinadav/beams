
import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
        this.getProductById('68a186bb0717136a1a9245de');
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

    // Initialize other params if needed
    initParamsFromProduct() {
        // Example: set frameWidth/frameHeight if present in params
        // You can extend this to other params as needed
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
        this.scene.background = new THREE.Color(0xf0f0f0);
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
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(width, height);
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
        this.woodTexture = loader.load('assets/textures/light-wood.jpg');
        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(50, 100, 75);
        this.scene.add(light);
        const ambient = new THREE.AmbientLight(0x888888);
        this.scene.add(ambient);
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
        // Always convert beam width/height from mm to cm
        let beamWidth = shelfBeam ? shelfBeam.width / 10 : this.beamWidth;
        let beamHeight = shelfBeam ? shelfBeam.height / 10 : this.beamHeight;

        // For each shelf, render its beams at its calculated height
        let currentY = 0;
        for (const shelf of this.shelves) {
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
                // Shorten first and last beam in the length (depth) direction by 2*frameWidth, keep centered
                if (i === 0 || i === surfaceBeams.length - 1) {
                    beam.depth = beam.depth - 2 * this.frameWidth;
                }
                const geometry = new THREE.BoxGeometry(beam.width, beam.height, beam.depth);
                const material = new THREE.MeshStandardMaterial({ map: this.woodTexture });
                const mesh = new THREE.Mesh(geometry, material);
                mesh.position.set(beam.x, currentY + this.frameHeight + beam.height / 2, 0);
                this.scene.add(mesh);
                this.beamMeshes.push(mesh);
            }
            // Frame beams (קורת חיזוק)
            const frameBeams = this.createFrameBeams(
                this.surfaceWidth,
                this.surfaceLength,
                this.frameWidth,
                this.frameHeight
            );
            for (const beam of frameBeams) {
                const geometry = new THREE.BoxGeometry(beam.width, beam.height, beam.depth);
                const material = new THREE.MeshStandardMaterial({ map: this.woodTexture });
                const mesh = new THREE.Mesh(geometry, material);
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
                const material = new THREE.MeshStandardMaterial({ map: this.woodTexture });
                const mesh = new THREE.Mesh(geometry, material);
                mesh.position.set(leg.x, leg.height / 2, leg.z);
                this.scene.add(mesh);
                this.beamMeshes.push(mesh);
            }
            // Focus camera at the vertical center of the structure
            this.target.set(0, totalY / 2, 0);
        }
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
        frameHeight: number
    ): { x: number, y: number, z: number, width: number, height: number, depth: number }[] {
        const beams = [];
        // X axis beams (front/back)
        for (const z of [
            -totalLength / 2 + frameWidth / 2,
            totalLength / 2 - frameWidth / 2
        ]) {
            beams.push({
                x: 0,
                y: 0,
                z,
                width: totalWidth - 2 * frameWidth,
                height: frameHeight,
                depth: frameWidth
            });
        }
        // Z axis beams (left/right)
        for (const x of [
            -totalWidth / 2 + frameWidth / 2,
            totalWidth / 2 - frameWidth / 2
        ]) {
            beams.push({
                x,
                y: 0,
                z: 0,
                width: frameWidth,
                height: frameHeight,
                depth: totalLength - 2 * frameWidth
            });
        }
        return beams;
    }

    // רגליים
    private createLegBeams(
        totalWidth: number,
        totalLength: number,
        frameWidth: number,
        frameHeight: number,
        topHeight: number
    ): { x: number, y: number, z: number, width: number, height: number, depth: number }[] {
        // 4 corners
        const xVals = [
            -totalWidth / 2 + frameWidth / 2,
            totalWidth / 2 - frameWidth / 2
        ];
        const zVals = [
            -totalLength / 2 + frameWidth / 2,
            totalLength / 2 - frameWidth / 2
        ];
        const legs = [];
        for (const x of xVals) {
            for (const z of zVals) {
                legs.push({
                    x,
                    y: 0,
                    z,
                    width: frameWidth,
                    height: topHeight,
                    depth: frameWidth
                });
            }
        }
        return legs;
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
}
