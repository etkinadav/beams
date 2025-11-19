import {
    Component,
    ElementRef,
    ViewChild,
    AfterViewInit,
    OnDestroy,
    OnInit,
    ChangeDetectorRef,
    HostListener,
} from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { PricingService } from '../../services/pricing.service';
import { DialogService } from '../../dialog/dialog.service';
import { ProductBasketService, ProductConfiguration, CutList, OrganizedArrangement, PricingInfo } from '../../services/product-basket.service';
import { MatMenuTrigger } from '@angular/material/menu';
import * as THREE from 'three';
import { trigger, state, style, transition, animate, keyframes } from '@angular/animations';
interface Shelf {
    gap: number; // רווח מהמדף שמתחתיו (או מהרצפה)
}

type UpdateBeamsOptions = {
    skipPricing?: boolean;
};

@Component({
    selector: 'app-modify-product',
    templateUrl: './modify-product.component.html',
    styleUrls: ['./modify-product.component.scss'],
    animations: [
        trigger('fadeInScale', [
            transition(':enter', [
                style({ opacity: 0, transform: 'scale(0.8)' }),
                animate('600ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
            ])
        ]),
        trigger('fadeInOut', [
            transition(':enter', [
                style({ opacity: 0 }),
                animate('150ms ease-in', style({ opacity: 1 }))
            ]),
            transition(':leave', [
                animate('150ms ease-out', style({ opacity: 0 }))
            ])
        ]),
        trigger('slideUpDown', [
            state('expanded', style({
                maxHeight: '5000px',
                opacity: 1,
                overflow: 'visible',
                transform: 'translateY(0)',
                visibility: 'visible'
            })),
            state('collapsed', style({
                maxHeight: '0',
                opacity: 0,
                overflow: 'hidden',
                transform: 'translateY(-20px)',
                marginTop: '0',
                marginBottom: '0',
                paddingTop: '0',
                paddingBottom: '0',
                visibility: 'hidden'
            })),
            transition('expanded => collapsed', [
                animate('400ms ease-in-out')
            ]),
            transition('collapsed => expanded', [
                animate('400ms ease-in-out')
            ])
        ])
    ]
})
export class ModifyProductComponent implements AfterViewInit, OnDestroy, OnInit {
    @ViewChild('inputsContainer', { static: false })
    set controlsContainer(element: ElementRef<HTMLElement> | undefined) {
        this.controlsContainerRef = element ?? null;
        if (this.controlsContainerRef) {
            if (typeof requestAnimationFrame === 'function') {
                requestAnimationFrame(() => this.updateOverlayMetrics());
            } else {
                setTimeout(() => this.updateOverlayMetrics());
            }
        }
    }

    private controlsContainerRef: ElementRef<HTMLElement> | null = null;
    overlayMetrics: { left: number; width: number } = { left: 0, width: 0 };

    @HostListener('window:resize')
    @HostListener('window:scroll')
    handleViewportChangesForOverlay(): void {
        this.updateOverlayMetrics();
    }

    private updateOverlayMetrics(): void {
        if (!this.controlsContainerRef) {
            this.overlayMetrics = { left: 0, width: 0 };
            return;
        }

        const rect = this.controlsContainerRef.nativeElement.getBoundingClientRect();
        const nextLeft = Math.round(rect.left);
        const nextWidth = Math.round(rect.width);

        if (nextLeft !== this.overlayMetrics.left || nextWidth !== this.overlayMetrics.width) {
            this.overlayMetrics = { left: nextLeft, width: nextWidth };
        }
    }

    // Debug mode - set to true to enable console logs
    private enableDebugLogs = false;
    private lastReinforcementSummarySignature: string | null = null;
    private reinforcementCandidateLogSignatures: Set<string> = new Set();
    private reinforcementSizeLogSignatures: Set<string> = new Set();
    private reinforcementEntryLogSignatures: Set<string> = new Set();
    private reinforcementDecisionLogSignatures: Set<string> = new Set();
    private reinforcementRenderLogSignatures: Set<string> = new Set();
    private reinforcementRenderSkipLogSignatures: Set<string> = new Set();
    
    // מניעת לוגים אינסופיים עבור CHACK_is-reinforcement-beams-outside
    private reinforcementLogPrinted = false;
    
    // משתנה למניעת לוגים חוזרים של animate
    private animationLogged = false;
    
    // משתנה למניעת לוג חוזר של קורת רגל מיטה
    private futonLegBeamLogged = false;
    
    // דגל פנימי המורה לדלג על חישובי מחיר בסבב הנוכחי
    private shouldSkipPricing = false;
    
    // Performance tracking
    private performanceTimers: Map<string, number> = new Map();
    
    // מצב עריכה - האם זה מוצר בעריכה או מוצר חדש
    isEditMode = false;
    
    // משתנה למניעת לוגים חוזרים של getDisplayProductName
    private displayNameLogged = false;
    
    // משתנה למניעת לוגים חוזרים של hasProductParametersChanged
    private paramChangedLogged = false;
    
    // משתנה למעקב אחרי הפעם הראשונה שעוברים להוראות הרכבה
    private isFirstTimeEnteringInstructions = true;
    
    // משתנה לזיהוי אם צריך להפעיל מצב שקוף בסיום האנימציה של איפוס מבט
    private shouldEnableTransparentModeAfterCameraReset = false;

    // שמירת מצב השקיפות לפני כניסה להוראות הרכבה
    private wasTransparentBeforeInstructions: boolean | null = null;
    
    // צילום מצב מחיר לפני מעבר למצב שמדלג על חישוב
    private priceSnapshotBeforeSkip: number | null = null;
    
    // שמירת מרכז וגודל ה-bounding box הראשוני של המודל המלא
    private baseBoundingCenter: THREE.Vector3 | null = null;
    private baseBoundingSize: THREE.Vector3 | null = null;
    
    
    // קריאה ראשונית לבדיקת isEditMode
    checkIsEditModeInitialValue() {
    }
    
    // Debug helper function - only logs when enableDebugLogs is true
    private debugLog(...args: any[]): void {
        if (this.enableDebugLogs) {
        }
    }
    
    // פונקציה לקבלת שם המוצר להצגה (מקורי או מותאם אישית)
    // שימוש ב-getter כדי ש-Angular יעדכן אותו אוטומטית
    get getDisplayProductName(): string {
        // לוג חד פעמי בלבד כדי למנוע לוגים אינסופיים
        if (!this.displayNameLogged) {
            console.log('CHECK_IS_MODIFIED - getDisplayProductName called (first time only)');
            console.log('CHECK_IS_MODIFIED - product exists:', !!this.product);
            console.log('CHECK_IS_MODIFIED - selectedProductName:', this.selectedProductName);
            console.log('CHECK_IS_MODIFIED - originalProductParams length:', this.originalProductParams?.length || 0);
            console.log('CHECK_IS_MODIFIED - params length:', this.params?.length || 0);
            this.displayNameLogged = true;
        }
        
        if (!this.product) {
            return this.selectedProductName || '';
        }
        
        // בדיקה אם יש שינויים בפרמטרים מהמקור
        const hasChanges = this.hasProductParametersChanged();
        
        if (!hasChanges) {
            // מציגים את שם הקונפיגורציה (לדוגמה: "שולחן קפה קטן")
            const configIndex = this.product.configurationIndex || 0;
            const configs = this.product.configurations || [];
            const configName = configs[configIndex]?.translatedName;
            return configName || this.product.translatedName || this.selectedProductName || '';
        }

        // מותאם אישית: קובעים טיפוס יחיד מתוך singleNames לפי המפתח product בקונפיגורציה הנוכחית
        const configIndex = this.product.configurationIndex || 0;
        const configs = this.product.configurations || [];
        const singleNames = this.product.singleNames || {};
        const productKey = configs[configIndex]?.product;
        const single = (productKey && singleNames[productKey]) ? singleNames[productKey] : (this.product.translatedName || this.selectedProductName || '');
        return single ? `${single} בהתאמה אישית` : 'בהתאמה אישית';
    }
    
    // Performance timing helper - disabled for cleaner logs
    private startTimer(label: string): void {
        this.performanceTimers.set(label, performance.now());
    }
    
    private endTimer(label: string): void {
        const startTime = this.performanceTimers.get(label);
        if (startTime) {
            const duration = performance.now() - startTime;
            this.performanceTimers.delete(label);
        }
    }
    
    private isUserAuthenticated = false;
    private authToken: string | null = null;
    
    // Validation messages (הוסרו - משתמשים ב-SnackBar)
    // Helper for numeric step
    getStep(type: number): number {
        return 1 / Math.pow(10, type);
    }

    // פונקציה לבדיקת קיום ברגים פעילים (count > 0)
    hasActiveScrews(): boolean {
        if (!this.ForgingDataForPricing || this.ForgingDataForPricing.length === 0) {
            return false;
        }
        
        return this.ForgingDataForPricing.some(screw => screw.count > 0);
    }

    // פונקציה לקבלת ברגים פעילים בלבד (count > 0) עם איחוד כפילויות
    getActiveScrews(): any[] {
        if (!this.ForgingDataForPricing || this.ForgingDataForPricing.length === 0) {
            return [];
        }
        
        const activeScrews = this.ForgingDataForPricing.filter(screw => screw.count > 0);
        
        // איחוד כפילויות - ברגים עם אותו אורך
        const mergedScrews = new Map<number, any>();
        
        activeScrews.forEach(screw => {
            const length = screw.length;
            if (mergedScrews.has(length)) {
                // איחוד עם בורג קיים
                const existing = mergedScrews.get(length)!;
                existing.count += screw.count;
            } else {
                // בורג חדש
                mergedScrews.set(length, { ...screw });
            }
        });
        
        return Array.from(mergedScrews.values());
    }
    // ...existing code...
    toggleDrawer() {
        this.drawerOpen = !this.drawerOpen;
        
        // כששוסגרים את התפריט - לצמצם את המחיר
        if (!this.drawerOpen) {
            this.isPriceMinimized = true;
            // סגירת תפריט המחיר כשסוגרים את תפריט המידות
            this.isPriceManuOpen = false;
        }
        
        // איפוס מבט המצלמה בפתיחה וסגירה של תפריט האינפוטים
        setTimeout(() => {
            this.resetCameraView();
        }, 100);
        
        // קריאה ל-onResize ללא איפוס isPriceMinimized
        setTimeout(() => {
            this.onResizeWithoutReset();
        }, 310); // Wait for transition to finish
    }
    toggleWireframe() {
        
        // במובייל (sm ומטה, רוחב <= 576px) לא לאפשר הפעלת הקוביה בכלל
        const isMobile = window.innerWidth <= 576;
        
        if (isMobile) {
            // במובייל - לא לעשות כלום, הקוביה לא תופיע
            return;
        }
        
        this.showWireframe = !this.showWireframe;
        
        if (this.showWireframe) {
            this.addWireframeCube();
        } else {
            this.removeWireframeCube();
        }
    }
    
    // פונקציה להפעלת מצב שקוף
    toggleTransparentMode() {
        // במוצר קורות - לא לאפשר מצב שקוף
        if (this.isBelams) {
            return;
        }
        
        this.isTransparentMode = !this.isTransparentMode;
        // עדכון המודל כדי להחיל את השקיפות
        this.updateBeams(); // עם אנימציה רגילה
    }
    
    // ניווט לעמוד הבית (בחירת מוצר)
    navigateToHome() {
        this.router.navigate(['/main-section/choose-printing-system']);
    }
    
    
    // פתיחה/סגירה של תפריט אפשרויות נוספות
    toggleOptionsMenu() {
        this.isOptionsMenuOpen = !this.isOptionsMenuOpen;
        // סגירת תפריט ניהול המערכת אם הוא פתוח
        if (this.isOptionsMenuOpen) {
            this.isSystemMenuOpen = false;
            // סגירת תפריט התחשיבים (fullscreen) כשפותחים את תפריט שלוש הנקודות
            this.isPriceManuOpen = false;
        }
    }
    
    
    // פתיחה/סגירה של הוראות הרכבה
    toggleAssemblyInstructions() {
        this.isInstructionMode = !this.isInstructionMode;
        
        console.log('TOGGLE_ASSEMBLY_INSTRUCTIONS', JSON.stringify({
            isInstructionMode: this.isInstructionMode,
            currentInstructionStageBefore: this.currentInstructionStage
        }, null, 2));
        
        // איפוס מבט המצלמה במעבר למצב הוראות או יציאה ממנו
        setTimeout(() => {
            this.resetCameraView();
        }, 100);
        
        // לוג כשעוברים למצב הוראות הרכבה
        if (this.isInstructionMode) {
            // פתיחה אוטומטית של ההוראה הראשונה (index 1 כי 0 הוא מצב רגיל)
            this.currentInstructionStage = 1;
            this.wasTransparentBeforeInstructions = this.isTransparentMode;
            
            if (!this.isBelams) {
                const needsTransparentUpdate = !this.isTransparentMode;
                this.isTransparentMode = true;
                
                setTimeout(() => {
                    if (needsTransparentUpdate) {
                        this.updateBeams(false, { skipPricing: true });
                    } else {
                        // עדיין מרעננים את המודל כדי להציג מצב הוראות
                        this.updateBeams(false, { skipPricing: true });
                    }
                }, 100);
            }
            
            // קבלת מידות קורת הרגל
            const legParam = this.getParam('leg');
            let legWidth = null;
            let legLength = null;
            
            if (legParam && legParam.beams && legParam.beams.length > 0) {
                const legBeam = legParam.beams[legParam.selectedBeamIndex || 0];
                if (legBeam) {
                    legWidth = legBeam.width / 10; // המרה ממ"מ לס"מ
                    legLength = legBeam.height / 10; // המרה ממ"מ לס"מ
                }
            }
            
            console.log('INSTRUCTIONS_START', JSON.stringify({
                legBeamWidth: legWidth,
                legBeamLength: legLength,
                instructions: this.product?.instructions || [],
                currentInstructionStage: this.currentInstructionStage
            }, null, 2));
            
            // איפוס מבט בפעם הראשונה בלבד
            if (this.isFirstTimeEnteringInstructions) {
                this.isFirstTimeEnteringInstructions = false;
            }
            
            // לא צריך לפתוח אוטומטית - הצ'קבוקס הראשון שלא מסומן תמיד פתוח
            // (זה מתבצע ב-getInstructionTextState)
            
        } else {
            // חזרה למצב רגיל - איפוס currentInstructionStage וסימוני הקדחים
            this.currentInstructionStage = 0;
            this.completedPreliminaryDrills.clear();
            this.expandedDrillItems.clear();
            
            // ביטול מצב שקוף בהתאם למצב המקורי
            const shouldRestoreTransparent =
                this.wasTransparentBeforeInstructions ?? false;
            this.wasTransparentBeforeInstructions = null;
            
            setTimeout(() => {
                if (!this.isBelams) {
                    const needsUpdate = this.isTransparentMode !== shouldRestoreTransparent;
                    this.isTransparentMode = shouldRestoreTransparent;
                    if (needsUpdate) {
                        this.updateBeams(false, { skipPricing: true });
                        return;
                    }
                }
                this.updateBeams(false, { skipPricing: true });
            }, 100);
        }
        
        // גלילה למעלה אחרי פתיחה/סגירה של מצב הוראות
        setTimeout(() => {
            if (this.inputsContainerRef && this.inputsContainerRef.nativeElement) {
                this.inputsContainerRef.nativeElement.scrollTop = 0;
            }
        }, 100);
    }
    
    // פתיחה/סגירה של סעיף הוראה ספציפי
    toggleInstructionStage(stageIndex: number) {
        const startTime = performance.now();
        // stageIndex הוא האינדקס של ההוראה (0-based)
        // currentInstructionStage הוא האינדקס + 1 (1-based)
        const stageNumber = stageIndex + 1;
        const previousStage = this.currentInstructionStage;
        
        if (this.currentInstructionStage === stageNumber) {
            // אם כבר פתוח - סגירה
            this.currentInstructionStage = 0;
        } else {
            // פתיחה של הסעיף הנבחר
            this.currentInstructionStage = stageNumber;
        }
        
        console.log('CHACH_3D_DELAY TOGGLE_INSTRUCTION_STAGE', JSON.stringify({
            stageIndex: stageIndex,
            stageNumber: stageNumber,
            previousStage: previousStage,
            currentInstructionStage: this.currentInstructionStage,
            instructionName: this.product?.instructions?.[stageIndex]?.name,
            timestamp: performance.now()
        }, null, 2));
        
        // עדכון המודל התלת מימדי כדי להציג/להסתיר קורות בהתאם למצב
        setTimeout(() => {
            const beforeUpdateTime = performance.now();
            console.log('CHACH_3D_DELAY TOGGLE_INSTRUCTION_STAGE_CALLING_UPDATE', JSON.stringify({
                stageIndex: stageIndex,
                currentInstructionStage: this.currentInstructionStage,
                timeSinceToggle: beforeUpdateTime - startTime,
                timestamp: beforeUpdateTime
            }, null, 2));
            this.updateBeams(false, { skipPricing: true });
        }, 100);
    }
    
    // בדיקה אם סעיף הוראה פתוח
    isInstructionStageOpen(stageIndex: number): boolean {
        return this.currentInstructionStage === (stageIndex + 1);
    }
    
    // משתנה למעקב אחרי מצב פתיחה/סגירה של כל שורת צ'קבוקס (לשימוש עתידי - כרגע לא בשימוש)
    expandedDrillItems: Set<string> = new Set();
    
    // פונקציה לפתיחה/סגירה של תוכן שורת צ'קבוקס
    // שימו לב: הצ'קבוקס הראשון שלא מסומן תמיד פתוח ולא ניתן לקפל אותו
    // אבל צ'קבוקס שמסומן עם V ניתן לפתוח/לסגור דרך החץ
    toggleDrillItemExpanded(drillInfo: any) {
        if (!drillInfo || !drillInfo.compositeKey) {
            return;
        }
        
        const compositeKey = drillInfo.compositeKey;
        
        // אם זה הצ'קבוקס הראשון שלא מסומן - לא ניתן לקפל אותו
        if (this.isFirstUncheckedBeam(compositeKey)) {
            return;
        }
        
        const newSet = new Set(this.expandedDrillItems);
        
        if (newSet.has(compositeKey)) {
            newSet.delete(compositeKey);
        } else {
            newSet.add(compositeKey);
        }
        
        this.expandedDrillItems = newSet;
        
        // אילוץ Angular לעדכן את התצוגה
        this.cdr.detectChanges();
    }
    
    // בדיקה אם שורת צ'קבוקס פתוחה
    isDrillItemExpanded(drillInfo: any): boolean {
        if (!drillInfo || !drillInfo.compositeKey) {
            return false;
        }
        
        const compositeKey = drillInfo.compositeKey;
        
        // אם זה הצ'קבוקס הראשון שלא מסומן - תמיד פתוח
        if (this.isFirstUncheckedBeam(compositeKey)) {
            return true;
        }
        
        // אחרת - בדיקה לפי expandedDrillItems
        return this.expandedDrillItems.has(compositeKey);
    }
    
    // Getter ל-preliminaryDrillsInfo - יוצר רשומה לכל אורך קורה ייחודי שדורש קידוח
    get preliminaryDrillsInfo(): any[] {
        const result: any[] = [];
        
        // רשימת paramNames שצריך לבדוק (shelfs, leg)
        const paramNamesToCheck = ['shelfs', 'leg'];
        
        for (const paramName of paramNamesToCheck) {
            const param = this.getParam(paramName);
            if (!param || !param.beams || param.beams.length === 0) {
                continue;
            }
            
            const selectedBeam = param.beams[param.selectedBeamIndex || 0];
            const selectedType = selectedBeam?.types?.[param.selectedTypeIndex || 0];
            
            if (!selectedBeam || !selectedType) {
                continue;
            }
            
            // מידות הקורה
            const beamWidth = selectedBeam.width / 10; // המרה ממ"מ לס"מ
            const beamHeight = selectedBeam.height / 10; // המרה ממ"מ לס"מ
            const woodType = selectedType.translatedName || selectedType.name || '';
            
            // חישוב כל האורכים הייחודיים של קורות מסוג זה (כמו ב-getPreliminaryDrillsInstructionText)
            const allSizes = new Map<number, number>();
            
            if (paramName === 'shelfs') {
                if (!this.isTable && !this.isFuton && !this.isPlanter && !this.isBox) {
                    // עבור ארון
                    const shelfBeamWidth = beamWidth;
                    const beamsInShelf = Math.floor((this.surfaceWidth + this.minGap) / (shelfBeamWidth + this.minGap));
                    
                    const legParamForShortening = this.getParam('leg');
                    const legBeamSelected = legParamForShortening?.beams?.[legParamForShortening.selectedBeamIndex || 0];
                    const legBeamHeight = legBeamSelected?.height / 10 || 0;
                    
                    const totalShelves = this.shelves.length;
                    
                    for (let shelfIndex = 0; shelfIndex < totalShelves; shelfIndex++) {
                        const isTopShelf = shelfIndex === totalShelves - 1;
                        
                        for (let beamIndex = 0; beamIndex < beamsInShelf; beamIndex++) {
                            let beamLength = this.surfaceLength;
                            
                            if (!isTopShelf) {
                                if (beamIndex === 0 || beamIndex === beamsInShelf - 1) {
                                    const outsideParamCabForShortening = this.getParam('is-reinforcement-beams-outside');
                                    const isOutsideCabForShortening = !!(outsideParamCabForShortening && outsideParamCabForShortening.default === true);
                                    const defaultShorten = (legBeamHeight * 2);
                                    const extraShorten = isOutsideCabForShortening ? (2 * (this.frameWidth || 0)) : 0;
                                    beamLength = Math.max(0.1, beamLength - (defaultShorten + extraShorten));
                                }
                            }
                            
                            allSizes.set(beamLength, (allSizes.get(beamLength) || 0) + this.quantity);
                        }
                    }
                } else if (this.isTable) {
                    const surfaceBeams = this.createSurfaceBeams(
                        this.surfaceWidth,
                        this.surfaceLength,
                        beamWidth,
                        beamHeight,
                        this.minGap
                    );
                    
                    surfaceBeams.forEach(beam => {
                        allSizes.set(beam.depth, (allSizes.get(beam.depth) || 0) + this.quantity);
                    });
                }
            } else if (paramName === 'leg') {
                if (!this.isTable && !this.isFuton && !this.isPlanter && !this.isBox) {
                    // קורות רגל רגילות
                    const dimensions = this.getProductDimensionsRaw();
                    const totalHeight = dimensions.height;
                    const shelfBeamHeight = selectedBeam?.height / 10 || 0;
                    const legHeight = totalHeight - shelfBeamHeight;
                    
                    // קורות חיזוק
                    const outsideParam = this.getParam('is-reinforcement-beams-outside');
                    const rawOutsideValue = outsideParam?.default;
                    const isExternalReinforcementEnabled =
                        typeof rawOutsideValue === 'number'
                            ? rawOutsideValue > 0
                            : rawOutsideValue === true;
                    const isExternalReinforcementDisabled =
                        typeof rawOutsideValue === 'number'
                            ? rawOutsideValue <= 0
                            : rawOutsideValue !== true;
                    
                    const requiresPreliminaryScrewsForLegs = this.checkIfBeamRequiresPreliminaryScrews('leg', selectedBeam, selectedType);
                    
                    if (isExternalReinforcementDisabled) {
                        if (requiresPreliminaryScrewsForLegs) {
                            allSizes.set(legHeight, (allSizes.get(legHeight) || 0) + (4 * this.quantity));
                        }
                    }
                    
                    if (isExternalReinforcementEnabled) {
                        if (requiresPreliminaryScrewsForLegs) {
                            allSizes.set(legHeight, (allSizes.get(legHeight) || 0) + (4 * this.quantity));
                        }
                        
                        const totalShelves = this.shelves.length;
                        if (totalShelves > 0) {
                            let reinforcementLegWidth = selectedBeam?.width / 10 || 0;
                            
                            const frameParam = this.getParam('frame');
                            const frameBeamCandidate = frameParam?.beams?.[frameParam.selectedBeamIndex || 0];
                            if (frameBeamCandidate && typeof frameBeamCandidate.width === 'number') {
                                reinforcementLegWidth = frameBeamCandidate.width / 10;
                            }
                            
                            const xSpanningLength = this.surfaceWidth + (2 * reinforcementLegWidth); // X-spanning עם התאמות
                            
                            for (let shelfIndex = 0; shelfIndex < totalShelves; shelfIndex++) {
                                for (let i = 0; i < 2; i++) { // 2 קורות X-spanning לכל מדף
                                    allSizes.set(xSpanningLength, (allSizes.get(xSpanningLength) || 0) + this.quantity);
                                }
                            }

                            const sizeLogSignature = [
                                xSpanningLength.toFixed(2),
                                totalShelves,
                                this.quantity
                            ].join('|');

                            if (!this.reinforcementSizeLogSignatures.has(sizeLogSignature)) {
                                this.reinforcementSizeLogSignatures.add(sizeLogSignature);
                                console.log(
                                    'CHACH_EXTRA_STEP reinforcement size entry',
                                    JSON.stringify({
                                        stage: 'collect-leg-sizes',
                                        isExternalReinforcementEnabled,
                                        xSpanningLength,
                                        totalShelves,
                                        quantityPerEntry: this.quantity
                                    })
                                );
                            }
                        }
                    }
                } else if (this.isTable) {
                    const dimensions = this.getProductDimensionsRaw();
                    const totalHeight = dimensions.height;
                    const plataParam = this.getParam('plata');
                    const plataBeam = plataParam?.beams?.[plataParam.selectedBeamIndex || 0];
                    const plataBeamHeight = plataBeam?.height / 10 || 0;
                    const legHeight = totalHeight - plataBeamHeight;
                    
                    // בדיקה אם צריך קדחים מקדימים לקורות רגל
                    const requiresPreliminaryScrewsForLegs = this.checkIfBeamRequiresPreliminaryScrews('leg', selectedBeam, selectedType);
                    
                    if (requiresPreliminaryScrewsForLegs) {
                        for (let i = 0; i < 4; i++) {
                            allSizes.set(legHeight, (allSizes.get(legHeight) || 0) + this.quantity);
                        }
                    }
                }
            }
            
            // המרה למערך ממוין
            const totalSizes = Array.from(allSizes.entries())
                .map(([length, count]) => ({ length, count }))
                .sort((a, b) => a.length - b.length);
            
            // חישוב drillDiameter (כמו ב-getPreliminaryDrillsInstructionText)
            let drillDiameter = 0;
            
            if (this.screwsPackagingPlan && this.screwsPackagingPlan.length > 0) {
                const targetType = paramName === 'shelfs' ? 'shelf' : paramName === 'leg' ? 'leg' : null;
                
                if (targetType) {
                    const matchingScrewPackage = this.screwsPackagingPlan.find(pkg => {
                        if (pkg.originalRequirements && Array.isArray(pkg.originalRequirements) && pkg.originalRequirements.length > 0) {
                            const hasMatchingType = pkg.originalRequirements.some((req: any) => 
                                req && req.type && req.type.toLowerCase().includes(targetType)
                            );
                            if (hasMatchingType) {
                                return true;
                            }
                        }
                        
                        const translatedName = (pkg.screwTranslatedName || '').toLowerCase();
                        const typeName = (pkg.screwTypeName || '').toLowerCase();
                        const searchTerms = paramName === 'shelfs' 
                            ? ['מדף', 'shelf']
                            : ['רגל', 'leg'];
                        
                        return searchTerms.some(term => 
                            translatedName.includes(term) || typeName.includes(term)
                        );
                    });
                    
                    if (matchingScrewPackage && matchingScrewPackage.screwWidth) {
                        drillDiameter = matchingScrewPackage.screwWidth;
                    }
                }
            }
            
            if (drillDiameter === 0 && this.ForgingDataForPricing && this.ForgingDataForPricing.length > 0) {
                let matchingScrew = null;
                
                if (paramName === 'shelfs') {
                    matchingScrew = this.ForgingDataForPricing.find(screw => 
                        screw.type && (screw.type.includes('shelf') || screw.type.includes('מדף'))
                    );
                } else if (paramName === 'leg') {
                    matchingScrew = this.ForgingDataForPricing.find(screw => 
                        screw.type && (screw.type.includes('leg') || screw.type.includes('רגל'))
                    );
                }
                
                if (matchingScrew && matchingScrew.width) {
                    drillDiameter = matchingScrew.width;
                } else if (matchingScrew && matchingScrew.diameter) {
                    drillDiameter = matchingScrew.diameter;
                }
            }
            
            // בדיקה אם צריך קדחים מקדימים (בדיקה לפי threshold וסוג העץ)
            const requiresPreliminaryScrews = this.checkIfBeamRequiresPreliminaryScrews(paramName, selectedBeam, selectedType);
            
            // יצירת רשומה לכל אורך ייחודי
            for (const lengthInfo of totalSizes) {
                const beamLength = Math.round(lengthInfo.length * 10) / 10;
                const count = lengthInfo.count;
                
                // יצירת מפתח מורכב: paramName-beamLength (יועדכן מאוחר יותר אם זה קורת חיזוק)
                let compositeKey = `${paramName}-${beamLength}`;
                
            // שם הקורה להצגה
            let beamTypeName = '';
            let beamDisplayName = '';
            let reinforcementDirection: string | null = null;
            let isExternalReinforcementEnabled = false;
                
                if (paramName === 'shelfs') {
                    // בדיקה אם זה קורת מדף מקוצרת או לא
                    const dimensions = this.getProductDimensionsRaw();
                    const totalHeight = dimensions.height;
                    const shelfBeamHeight = (this.getParam('shelfs')?.beams?.[this.getParam('shelfs')?.selectedBeamIndex || 0]?.height || 0) / 10;
                    const legParamForShortening = this.getParam('leg');
                    const legBeamSelected = legParamForShortening?.beams?.[legParamForShortening.selectedBeamIndex || 0];
                    const legBeamHeight = legBeamSelected?.height / 10 || 0;
                    const outsideParamCabForShortening = this.getParam('is-reinforcement-beams-outside');
                    const isOutsideCabForShortening = !!(outsideParamCabForShortening && outsideParamCabForShortening.default === true);
                    const defaultShorten = (legBeamHeight * 2);
                    const extraShorten = isOutsideCabForShortening ? (2 * (this.frameWidth || 0)) : 0;
                    const shortenedLength = Math.max(0.1, this.surfaceLength - (defaultShorten + extraShorten));
                    const fullLength = this.surfaceLength;
                    
                    const isShortenedBeam = Math.abs(beamLength - shortenedLength) < 0.1;
                    const isFullLengthBeam = Math.abs(beamLength - fullLength) < 0.1;
                    
                    if (isShortenedBeam) {
                        beamTypeName = 'קורות מדף מקוצרות';
                        beamDisplayName = 'קורות מדף מקוצרות';
                    } else if (isFullLengthBeam) {
                        beamTypeName = 'קורת מדף';
                        beamDisplayName = 'קורת מדף';
                    } else {
                        beamTypeName = 'קורת מדף';
                        beamDisplayName = 'קורת מדף';
                    }
                } else if (paramName === 'leg') {
                    // בדיקה אם זה קורת חיזוק או קורת רגל רגילה
                    const outsideParam = this.getParam('is-reinforcement-beams-outside');
                    const rawOutsideValue = outsideParam?.default;
                    isExternalReinforcementEnabled =
                        typeof rawOutsideValue === 'number'
                            ? rawOutsideValue > 0
                            : rawOutsideValue === true;
                    
                    const dimensions = this.getProductDimensionsRaw();
                    const totalHeight = dimensions.height;
                    const shelfBeamHeight = (this.getParam('shelfs')?.beams?.[this.getParam('shelfs')?.selectedBeamIndex || 0]?.height || 0) / 10;
                    const legHeight = totalHeight - shelfBeamHeight;
                    
                    // חישוב אורכי קורות החיזוק לפי כיוון
                    let xSpanningLength = 0;
                    if (isExternalReinforcementEnabled) {
                        // קורות חיזוק חיצוניות
                        const legParam = this.getParam('leg');
                        const legBeam = legParam?.beams?.[legParam.selectedBeamIndex || 0];
                        const legWidth = legBeam?.width / 10 || 0;
                        xSpanningLength = this.surfaceWidth + (2 * legWidth);
                    } else {
                        // קורות חיזוק פנימיות
                        const legWidth = selectedBeam?.width / 10 || 0;
                        xSpanningLength = Math.max(0.1, this.surfaceWidth - (2 * legWidth));
                    }
                    
                    const isLegBeamLength = Math.abs(beamLength - legHeight) < 0.1;
                    const isXSpanningLength = Math.abs(beamLength - xSpanningLength) < 0.1;
                    
                    const candidateSignature = [
                        paramName,
                        beamLength.toFixed(2),
                        xSpanningLength.toFixed(2),
                        isExternalReinforcementEnabled ? '1' : '0'
                    ].join('|');

                    if (!this.reinforcementCandidateLogSignatures.has(candidateSignature)) {
                        this.reinforcementCandidateLogSignatures.add(candidateSignature);
                        console.log(
                            'CHACH_EXTRA_STEP reinforcement candidate',
                            JSON.stringify({
                                beamLength,
                                legHeight,
                                xSpanningLength,
                                isLegBeamLength,
                                isXSpanningLength,
                                isExternalReinforcementEnabled
                            })
                        );
                    }
                    
                    if (isExternalReinforcementEnabled && isXSpanningLength) {
                        beamTypeName = 'קורות חיזוק לרוחב';
                        beamDisplayName = 'קורות חיזוק לרוחב';
                        reinforcementDirection = 'x-spanning';
                    } else if (isLegBeamLength) {
                        beamTypeName = 'קורת רגל';
                        beamDisplayName = 'קורת רגל';
                    } else {
                        beamTypeName = 'קורת רגל';
                        beamDisplayName = 'קורת רגל';
                    }
                    
                    // עדכון compositeKey אם זה קורת חיזוק
                if (reinforcementDirection) {
                        compositeKey = `${paramName}-${reinforcementDirection}-${beamLength}`;
                    }
                }
                
                let requiresPreliminaryScrewsForEntry = requiresPreliminaryScrews;
            if (reinforcementDirection === 'x-spanning' && isExternalReinforcementEnabled) {
                    requiresPreliminaryScrewsForEntry = true;
                }

                result.push({
                    paramName: paramName,
                    beamLength: beamLength,
                    beamWidth: beamWidth,
                    beamHeight: beamHeight,
                    woodType: woodType,
                    count: count,
                    drillDiameter: drillDiameter,
                    beamTypeName: beamTypeName,
                    beamDisplayName: beamDisplayName,
                    requiresPreliminaryScrews: requiresPreliminaryScrewsForEntry,
                    compositeKey: compositeKey, // מפתח מורכב לזיהוי ייחודי
                    reinforcementDirection: reinforcementDirection || null
                });

                if (reinforcementDirection === 'x-spanning') {
                    if (!this.reinforcementEntryLogSignatures.has(compositeKey)) {
                        this.reinforcementEntryLogSignatures.add(compositeKey);
                        console.log(
                            'CHACH_EXTRA_STEP reinforcement entry',
                            JSON.stringify({
                                paramName,
                                beamLength,
                                beamWidth,
                                count,
                                requiresPreliminaryScrewsForEntry,
                                compositeKey
                            })
                        );
                    }
                }
            }
        }
        
        const reinforcementEntries = result.filter(info =>
            info.paramName === 'leg' && info.reinforcementDirection === 'x-spanning'
        );
        const summaryPayload = {
            reinforcementCount: reinforcementEntries.length,
            entries: reinforcementEntries.map(entry => ({
                compositeKey: entry.compositeKey,
                beamLength: entry.beamLength,
                requiresPreliminaryScrews: entry.requiresPreliminaryScrews
            })),
            totalEntries: result.length
        };
        const summarySignature = JSON.stringify(summaryPayload);
        if (this.lastReinforcementSummarySignature !== summarySignature) {
            this.lastReinforcementSummarySignature = summarySignature;
            console.log('CHACH_EXTRA_STEP reinforcement summary', summarySignature);
            this.reinforcementCandidateLogSignatures.clear();
            this.reinforcementSizeLogSignatures.clear();
            this.reinforcementEntryLogSignatures.clear();
        }

        return result;
    }
    
    // פונקציה עזר לבדיקה אם קורה דורשת קדחים מקדימים
    private checkIfBeamRequiresPreliminaryScrews(paramName: string, selectedBeam: any, selectedType?: any): boolean {
        if (!this.product || !this.product.instructions) {
            return false;
        }
        
        const preliminaryDrillsInstruction = this.product.instructions.find(
            (inst: any) => inst.name === 'preliminary-drills'
        );
        
        if (!preliminaryDrillsInstruction) {
            return false;
        }
        
        // בדיקה לפי סוג העץ (hardness) - קודם כל
        if (selectedType && selectedType.name && this.woods.length > 0) {
            const wood = this.woods.find(w => w.name === selectedType.name);
            if (wood && wood.hardness > this.maxHardnessForPerlimenaryScrews) {
                // העץ קשה מדי - צריך קדחים מקדימים
                return true;
            }
        }
        
        // בדיקה לפי threshold אם קיים (רק אם לא נמצא צורך לפי סוג העץ)
        const legWidthThreshold = preliminaryDrillsInstruction['leg-width-threshold'];
        const legHeightThreshold = preliminaryDrillsInstruction['leg-height-threshold'];
        
        if (paramName === 'leg' && legWidthThreshold && legHeightThreshold) {
            const beamWidth = selectedBeam.width / 10; // המרה ממ"מ לס"מ
            const beamHeight = selectedBeam.height / 10; // המרה ממ"מ לס"מ
            
            // בדיקה אם מידות הקורה עוברות את ה-threshold
            if (beamWidth >= legWidthThreshold || beamHeight >= legHeightThreshold) {
                return true;
            }
        }
        
        // אם זה לא קורת רגל או אין threshold - נבדוק לפי סוג העץ בלבד
        // אם כבר בדקנו את סוג העץ למעלה והחזרנו false, נחזיר false
        // אבל אם יש צורך לפי סוג העץ, כבר החזרנו true למעלה
        
        // אם אין threshold ולא מצאנו צורך לפי סוג העץ - נחזיר false
        // (לא true כמו שהיה קודם, כי צריך לבדוק גם לפי סוג העץ)
        return false;
    }
    
    // בדיקה אם כל הקורות לא דורשות קדחים מקדימים (כל הקורות הן V)
    areAllBeamsNoPreliminaryDrilling(): boolean {
        if (this.preliminaryDrillsInfo.length === 0) {
            return false;
        }
        // בודק אם כל הקורות לא דורשות קדחים מקדימים
        return this.preliminaryDrillsInfo.every(info => !info.requiresPreliminaryScrews);
    }
    
    // trackBy function למניעת רינדור מיותר - משתמש ב-compositeKey
    trackByParamName(index: number, item: any): string {
        return item.compositeKey || index;
    }
    
    // בדיקה אם קורה מסומנת - משתמש ב-compositeKey
    isBeamMarkedAsCompleted(compositeKey: string): boolean {
        return this.completedPreliminaryDrills.has(compositeKey);
    }
    
    // סמן/בטל סימון קורה (רק אם הקורה דורשת קדחים)
    toggleBeamCompleted(drillInfo: any) {
        console.log('CHACH_3D_DELAY TOGGLE_START', JSON.stringify({ 
            drillInfo: drillInfo ? { compositeKey: drillInfo.compositeKey, requiresPreliminaryScrews: drillInfo.requiresPreliminaryScrews } : null 
        }, null, 2));
        
        // רק אם הקורה דורשת קדחים - אפשר לסמן
        if (!drillInfo || !drillInfo.requiresPreliminaryScrews) {
            console.log('CHACH_3D_DELAY TOGGLE_EARLY_EXIT', JSON.stringify({ reason: 'no drillInfo or requiresPreliminaryScrews is false' }, null, 2));
            return;
        }
        
        const compositeKey = drillInfo.compositeKey;
        if (!compositeKey) {
            console.log('CHACH_3D_DELAY TOGGLE_EARLY_EXIT', JSON.stringify({ reason: 'no compositeKey' }, null, 2));
            return;
        }
        
        const wasChecked = this.completedPreliminaryDrills.has(compositeKey);
        console.log('CHACH_3D_DELAY TOGGLE_STATE', JSON.stringify({ compositeKey, wasChecked }, null, 2));

        const currentIndex = this.preliminaryDrillsInfo.findIndex(info =>
            info.requiresPreliminaryScrews && info.compositeKey === compositeKey
        );

        if (currentIndex === -1) {
            return;
        }

        if (!wasChecked) {
            const newSet = new Set(this.completedPreliminaryDrills);

            for (let i = 0; i <= currentIndex; i++) {
                const info = this.preliminaryDrillsInfo[i];
                if (info && info.requiresPreliminaryScrews && info.compositeKey) {
                    newSet.add(info.compositeKey);
                }
            }

            this.completedPreliminaryDrills = newSet;

            const newExpandedSet = new Set<string>();
            const nextInfo = this.preliminaryDrillsInfo.find((info, idx) =>
                idx > currentIndex && info?.requiresPreliminaryScrews && info.compositeKey
            );
            if (nextInfo?.compositeKey) {
                newExpandedSet.add(nextInfo.compositeKey);
            }
            this.expandedDrillItems = newExpandedSet;

            const beforeScheduleTime = performance.now();
            console.log('CHACH_3D_DELAY TOGGLE_CALLING_SCHEDULE', JSON.stringify({ 
                compositeKey, 
                wasChecked, 
                action: 'marking',
                timestamp: beforeScheduleTime
            }, null, 2));
            this.scheduleUpdateBeams(true, 50);
            const afterScheduleTime = performance.now();
            console.log('CHACH_3D_DELAY TOGGLE_AFTER_SCHEDULE', JSON.stringify({
                compositeKey,
                scheduleDuration: afterScheduleTime - beforeScheduleTime,
                timestamp: afterScheduleTime
            }, null, 2));

            const beforeDetectChangesTime = performance.now();
            this.cdr.detectChanges();
            const afterDetectChangesTime = performance.now();
            console.log('CHACH_3D_DELAY TOGGLE_AFTER_DETECT_CHANGES', JSON.stringify({
                compositeKey,
                detectChangesDuration: afterDetectChangesTime - beforeDetectChangesTime,
                timestamp: afterDetectChangesTime
            }, null, 2));
            return;
        }

        const newSet = new Set(this.completedPreliminaryDrills);

        for (let i = currentIndex; i < this.preliminaryDrillsInfo.length; i++) {
            const info = this.preliminaryDrillsInfo[i];
            if (info && info.requiresPreliminaryScrews && info.compositeKey) {
                newSet.delete(info.compositeKey);
            }
        }

        this.completedPreliminaryDrills = newSet;

        const newExpandedSet = new Set<string>();
        this.preliminaryDrillsInfo.forEach((info, idx) => {
            if (!info?.requiresPreliminaryScrews || !info.compositeKey) {
                return;
            }
            if (idx < currentIndex && this.expandedDrillItems.has(info.compositeKey)) {
                newExpandedSet.add(info.compositeKey);
            }
        });
        newExpandedSet.add(compositeKey);
        this.expandedDrillItems = newExpandedSet;

        const beforeScheduleTime = performance.now();
        console.log('CHACH_3D_DELAY TOGGLE_CALLING_SCHEDULE', JSON.stringify({ 
            compositeKey, 
            wasChecked, 
            action: 'unmarking',
            timestamp: beforeScheduleTime
        }, null, 2));
        this.scheduleUpdateBeams(true, 50);
        const afterScheduleTime = performance.now();
        console.log('CHACH_3D_DELAY TOGGLE_AFTER_SCHEDULE', JSON.stringify({
            compositeKey,
            scheduleDuration: afterScheduleTime - beforeScheduleTime,
            timestamp: afterScheduleTime
        }, null, 2));

        const beforeDetectChangesTime = performance.now();
        this.cdr.detectChanges();
        const afterDetectChangesTime = performance.now();
        console.log('CHACH_3D_DELAY TOGGLE_AFTER_DETECT_CHANGES', JSON.stringify({
            compositeKey,
            detectChangesDuration: afterDetectChangesTime - beforeDetectChangesTime,
            timestamp: afterDetectChangesTime
        }, null, 2));
        
        return;
        
        // עדכון המודל התלת-ממדי כדי להציג את הקורות והברגים המתאימים
        if (this.areAllRequiredBeamsCompleted() && !this.areAllBeamsNoPreliminaryDrilling()) {
            // מעבר אוטומטי מיידי לשלב הבא (ללא delay)
            this.goToNextInstructionStage();
        }
    }
    
    // תזמון מרוכך של updateBeams למניעת קריאות כפולות ומהירות
    private _updateBeamsTimer: any = null;
    private scheduleUpdateBeams(skipPricing: boolean = true, delayMs: number = 50) {
        const scheduleTime = performance.now();
        console.log('CHACH_3D_DELAY SCHEDULE_ENTER', JSON.stringify({ 
            skipPricing, 
            delayMs, 
            hasExistingTimer: !!this._updateBeamsTimer,
            timestamp: scheduleTime
        }, null, 2));
        if (this._updateBeamsTimer) {
            console.log('CHACH_3D_DELAY SCHEDULE_COALESCE', JSON.stringify({ 
                skipPricing, 
                delayMs,
                timestamp: performance.now()
            }, null, 2));
            clearTimeout(this._updateBeamsTimer);
        }
        console.log('CHACH_3D_DELAY SCHEDULE_SET_TIMEOUT', JSON.stringify({ 
            skipPricing, 
            delayMs,
            scheduledFor: scheduleTime + delayMs,
            timestamp: performance.now()
        }, null, 2));
        this._updateBeamsTimer = setTimeout(() => {
            const fireTime = performance.now();
            console.log('CHACH_3D_DELAY SCHEDULE_TIMEOUT_FIRED', JSON.stringify({ 
                skipPricing,
                actualDelay: fireTime - scheduleTime,
                expectedDelay: delayMs,
                timestamp: fireTime
            }, null, 2));
            this._updateBeamsTimer = null;
            this.updateBeams(false, { skipPricing });
        }, delayMs);
    }
    
    // פונקציה לקביעת מצב האנימציה של טקסט ההוראות
    getInstructionTextState(drillInfo: any): string {
        if (!drillInfo || !drillInfo.requiresPreliminaryScrews) {
            return 'collapsed';
        }
        
        // אם זה הצ'קבוקס הראשון שלא מסומן - תמיד expanded
        if (this.isFirstUncheckedBeam(drillInfo.compositeKey)) {
            return 'expanded';
        }
        
        // אחרת - בדיקה לפי expandedDrillItems (גם אם מסומן עם V)
        return this.expandedDrillItems.has(drillInfo.compositeKey) ? 'expanded' : 'collapsed';
    }
    
    // פונקציה לקביעת מצב האנימציה של כפתור "הקידוחים בוצעו"
    getCompletedButtonState(drillInfo: any): string {
        if (!drillInfo || !drillInfo.requiresPreliminaryScrews) {
            return 'collapsed';
        }
        
        // אם הקורה מסומנת או זו לא הקורה הראשונה שלא מסומנה - collapsed
        if (this.isBeamMarkedAsCompleted(drillInfo.compositeKey) || !this.isFirstUncheckedBeam(drillInfo.compositeKey)) {
            return 'collapsed';
        }
        
        // אחרת - expanded (רק אם זה הצ'קבוקס הראשון שלא מסומן)
        return 'expanded';
    }
    
    // סימון קורה כהושלמה (מהכפתור "הקידוחים בוצעו")
    markBeamAsCompleted(drillInfo: any) {
        if (!drillInfo || !drillInfo.requiresPreliminaryScrews) {
            return;
        }
        
        const compositeKey = drillInfo.compositeKey;
        if (!compositeKey) {
            return;
        }
        
        // בדיקה שזה הצ'קבוקס הראשון שלא מסומן (רק הוא יכול להיסמן)
        if (!this.isFirstUncheckedBeam(compositeKey)) {
            return;
        }
        
        // יצירת Set חדש כדי לעורר change detection
        const newSet = new Set(this.completedPreliminaryDrills);
        newSet.add(compositeKey);
        
        // עדכון המשתנה הישיר כדי לעורר change detection
        this.completedPreliminaryDrills = newSet;
        
        // עדכון המודל התלת-ממדי כדי להציג את הקורות והברגים המתאימים (עם דיבאונס)
        this.scheduleUpdateBeams(true, 50);
        
        // אם כל הקורות שדורשות קדחים סומנו - מעבר אוטומטי מיידי לשלב הבא
        if (this.areAllRequiredBeamsCompleted() && !this.areAllBeamsNoPreliminaryDrilling()) {
            // מעבר אוטומטי מיידי לשלב הבא (ללא delay)
            this.goToNextInstructionStage();
        }
    }
    
    // בדיקה אם זה הצ'קבוקס הראשון שלא סומן
    isFirstUncheckedBeam(compositeKey: string): boolean {
        if (!this.preliminaryDrillsInfo || this.preliminaryDrillsInfo.length === 0) {
            return false;
        }
        
        // מציאת הצ'קבוקס הראשון שלא סומן
        const firstUncheckedBeam = this.preliminaryDrillsInfo.find(info => 
            info.requiresPreliminaryScrews && !this.completedPreliminaryDrills.has(info.compositeKey)
        );
        
        return firstUncheckedBeam?.compositeKey === compositeKey;
    }
    
    // בדיקה אם זה הצ'קבוקס האחרון שמסומן (ברצף מההתחלה)
    isLastCheckedBeam(compositeKey: string): boolean {
        if (!this.preliminaryDrillsInfo || this.preliminaryDrillsInfo.length === 0) {
            return false;
        }
        
        // מציאת כל הצ'קבוקסים המסומנים לפי הסדר
        const checkedBeams = this.preliminaryDrillsInfo
            .filter(info => info.requiresPreliminaryScrews && this.completedPreliminaryDrills.has(info.compositeKey))
            .map(info => info.compositeKey);
        
        // אם אין צ'קבוקסים מסומנים, זה לא האחרון
        if (checkedBeams.length === 0) {
            return false;
        }
        
        // בדיקה שהצ'קבוקסים המסומנים הם רצופים מההתחלה (אין "חורים")
        // כלומר: כל הצ'קבוקסים מההתחלה עד הצ'קבוקס האחרון שמסומן חייבים להיות מסומנים
        const lastCheckedIndex = checkedBeams.length - 1;
        const lastCheckedKey = checkedBeams[lastCheckedIndex];
        
        // מציאת האינדקס של הצ'קבוקס האחרון ברשימה המקורית
        const lastCheckedBeamIndex = this.preliminaryDrillsInfo.findIndex(info => 
            info.requiresPreliminaryScrews && info.compositeKey === lastCheckedKey
        );
        
        // בדיקה שכל הצ'קבוקסים לפני זה גם מסומנים
        for (let i = 0; i < lastCheckedBeamIndex; i++) {
            const info = this.preliminaryDrillsInfo[i];
            if (info && info.requiresPreliminaryScrews && !this.completedPreliminaryDrills.has(info.compositeKey)) {
                // יש צ'קבוקס שלא מסומן לפני הצ'קבוקס האחרון - זה לא האחרון
                return false;
            }
        }
        
        // החזרת האחרון ברשימה רק אם הוא באמת האחרון ברצף
        return lastCheckedKey === compositeKey;
    }
    
    // קבלת הקורה הראשונה ללא V (compositeKey)
    getFirstUncheckedBeamParamName(): string | null {
        if (!this.preliminaryDrillsInfo || this.preliminaryDrillsInfo.length === 0) {
            console.log('FIRST_UNCHECKED_BEAM', JSON.stringify({
                result: null,
                reason: 'preliminaryDrillsInfo is empty'
            }, null, 2));
            return null;
        }
        
        const firstUncheckedBeam = this.preliminaryDrillsInfo.find(info => 
            info.requiresPreliminaryScrews && !this.completedPreliminaryDrills.has(info.compositeKey)
        );
        
        if (firstUncheckedBeam) {
            // לוג הוסר - היה יוצר לוגים חוזרים
            return firstUncheckedBeam.compositeKey;
        }
        
        // לוג הוסר - היה יוצר לוגים חוזרים
        return null;
    }
    
    // קבלת הקורה הראשונה שצריכה להיות מוצגת (pending) - אם יש אחת שמוצגת כרגע
    getFirstPendingPreliminaryDrill(): any | null {
        if (!this.preliminaryDrillsInfo || this.preliminaryDrillsInfo.length === 0) {
            return null;
        }
        
        // מחזיר את הקורה הראשונה שלא מסומנת (pending)
        const firstPending = this.preliminaryDrillsInfo.find(info => 
            info.requiresPreliminaryScrews && !this.completedPreliminaryDrills.has(info.compositeKey)
        );
        
        return firstPending || null;
    }
    
    // בדיקה אם אנחנו במצב preliminary-drills עם משימות לא בוצעו
    // עם אפשרות לדחות את הלוג כדי למנוע לוגים חוזרים
    isPreliminaryDrillsMode(skipLog: boolean = false): boolean {
        if (!this.isInstructionMode || !this.product?.instructions) {
            return false;
        }
        
        const currentStage = this.product.instructions[this.currentInstructionStage - 1];
        if (!currentStage || currentStage.name !== 'preliminary-drills') {
            return false;
        }
        
        // בדיקה אם יש משימות שעדיין לא בוצעו
        const hasUncompletedTasks = this.preliminaryDrillsInfo.some(info => 
            info.requiresPreliminaryScrews && !this.completedPreliminaryDrills.has(info.compositeKey)
        );
        
        if (!skipLog) {
            const result = hasUncompletedTasks;
            console.log('PRELIMINARY_DRILLS_MODE_CHECK', JSON.stringify({
                isInstructionMode: this.isInstructionMode,
                currentStageName: currentStage?.name,
                isPreliminaryDrillsStage: currentStage?.name === 'preliminary-drills',
                preliminaryDrillsInfoLength: this.preliminaryDrillsInfo.length,
                hasUncompletedTasks: hasUncompletedTasks,
                result: result
            }, null, 2));
        }
        
        return hasUncompletedTasks;
    }
    
    // בדיקה אם כל הקורות שדורשות קדחים סומנו
    areAllRequiredBeamsCompleted(): boolean {
        const requiringBeams = this.preliminaryDrillsInfo.filter(info => info.requiresPreliminaryScrews);
        if (requiringBeams.length === 0) {
            return false;
        }
        return requiringBeams.every(info => this.completedPreliminaryDrills.has(info.compositeKey));
    }
    
    // מעבר לשלב הבא בהוראות (פתיחת ההוראה הבאה)
    goToNextInstructionStage() {
        const currentIndex = this.currentInstructionStage - 1; // המרה מ-1-based ל-0-based
        const nextIndex = currentIndex + 1;
        
        // סגירת כל התוכן הפתוח של הצ'קבוקסים לפני המעבר לשלב הבא
        this.expandedDrillItems.clear();
        
        if (this.product?.instructions && nextIndex < this.product.instructions.length) {
            // פתיחת ההוראה הבאה
            this.currentInstructionStage = nextIndex + 1; // המרה חזרה ל-1-based
        }
    }
    
    // בדיקה אם זה הצ'קבוקס הבא שצריך לסמן
    isNextCheckboxToComplete(compositeKey: string): boolean {
        if (!this.isInstructionMode || !this.preliminaryDrillsInfo || this.preliminaryDrillsInfo.length === 0) {
            return false;
        }
        
        // בדיקה אם יש צ'קבוקס שלא סומן
        const firstUncheckedBeam = this.preliminaryDrillsInfo.find(info => 
            info.requiresPreliminaryScrews && !this.completedPreliminaryDrills.has(info.compositeKey)
        );
        
        // אם יש צ'קבוקס שלא סומן - רק הראשון צריך חץ
        return firstUncheckedBeam?.compositeKey === compositeKey;
    }
    
    // בדיקה אם זה הכפתור הבא שצריך ללחוץ עליו
    isNextButtonToClick(): boolean {
        if (!this.isInstructionMode || !this.preliminaryDrillsInfo || this.preliminaryDrillsInfo.length === 0) {
            return false;
        }
        
        // אם כל הקורות הן V (לא דורשות קדחים) - הכפתור צריך חץ
        if (this.areAllBeamsNoPreliminaryDrilling()) {
            return true;
        }
        
        // אם יש קורות שדורשות קדחים וכולן סומנו - הכפתור צריך חץ
        if (this.areAllRequiredBeamsCompleted()) {
            return true;
        }
        
        return false;
    }
    
    // פונקציה לחישוב טקסט ההוראות לקדחים מקדימים - מחזירה מחרוזת יחידה (כי כל drillInfo מייצג אורך ספציפי)
    getPreliminaryDrillsInstructionText(drillInfo: any): string {
        if (!drillInfo || !drillInfo.requiresPreliminaryScrews) {
            return '';
        }
        
        const compositeKey = drillInfo.compositeKey;
        
        // הטקסט יופיע אם זה הצ'קבוקס הראשון שלא מסומן או אם הוא פתוח עם החץ (ב-expandedDrillItems)
        const firstUncheckedKey = this.getFirstUncheckedBeamParamName();
        const isExpanded = this.expandedDrillItems.has(compositeKey);
        
        // אם זה לא השלב הנוכחי ולא פתוח עם החץ - לא להציג טקסט
        if (firstUncheckedKey !== compositeKey && !isExpanded) {
            return '';
        }
        
        // מידות הקורה (כבר מחושבות ב-preliminaryDrillsInfo)
        const beamWidth = drillInfo.beamWidth;
        const beamHeight = drillInfo.beamHeight;
        const woodType = drillInfo.woodType;
        const beamLength = drillInfo.beamLength;
        const count = drillInfo.count;
        const drillDiameter = drillInfo.drillDiameter;
        
        // אם drillDiameter הוא 0, לא נציג את חלק הקוטר
        const drillDiameterText = drillDiameter > 0 ? ` בקוטר ~<span class="drill-number">${drillDiameter}</span> מ"מ` : '';
        
        // פורמט: "מצא X חתיכות באורך Y ס"מ של קורת [סוג] X על Y ס"מ, וקדח בהן קדחים עוברים בקוטר ~Z מ"מ, באופן הבא:"
        const text = `מצא <span class="drill-number">${count}</span> חתיכות באורך <span class="drill-number">${beamLength}</span> ס"מ של קורת ${woodType} <span class="drill-number">${beamWidth}</span> על <span class="drill-number">${beamHeight}</span> ס"מ, וקדח בהן קדחים עוברים${drillDiameterText}, באופן הבא:`;
        
        return text;
    }
    
    
    // פתיחה/סגירה של תפריט ניהול המערכת
    toggleSystemMenu() {
        this.isSystemMenuOpen = !this.isSystemMenuOpen;
        // סגירת תפריט האפשרויות אם הוא פתוח
        if (this.isSystemMenuOpen) {
            this.isOptionsMenuOpen = false;
        }
    }
    
    // הפעלת קוביית ניווט במובייל
    toggleNavigationCube() {
        this.showNavigationCube = !this.showNavigationCube;
        // סגירת תפריט האפשרויות
        this.isOptionsMenuOpen = false;
    }
    
    // צמצום/הרחבת תפריט המחיר
    togglePriceMinimize() {
        this.isPriceMinimized = !this.isPriceMinimized;
        
        // סגירת תפריט המחיר כשמצמצמים
        if (this.isPriceMinimized) {
            this.isPriceManuOpen = false;
        }
        // סגירת תפריט שלוש הנקודות
        this.isOptionsMenuOpen = false;
    }
    
    // הרחבת תפריט המחיר ופתיחת תפריט האופציות
    expandAndOpenPricingOptions() {
        // שלב 1: הרחבת התפריט (אם הוא מצומצם)
        if (this.isPriceMinimized) {
            this.isPriceMinimized = false;
            
            // שלב 2: פתיחת תפריט 3 האופציות אחרי 100ms
            setTimeout(() => {
                if (this.pricingMenuTrigger) {
                    this.pricingMenuTrigger.openMenu();
                }
            }, 100);
        } else {
            // אם התפריט כבר מורחב, פשוט פותחים/סוגרים את תפריט האופציות
            if (this.pricingMenuTrigger) {
                this.pricingMenuTrigger.toggleMenu();
            }
        }
    }
    
    
    // פונקציה לטיפול בהוספה לסל או עדכון לפי מצב עריכה
    handleAddToCart() {
        // בדיקה אם יש אזהרות - אם כן, פתיחת תפריט האזהרה
        if (this.checkIfHasDimensionsAlert() || this.hasHiddenBeams || this.hasNoMiddleBeams) {
            this.showWarningMenu = true;
            return;
        }
        
        // אם אין אזהרות, ישר לביצוע הפעולה
        this.confirmAddToCart();
    }
    
    // פונקציה לביצוע הוספה לסל או עדכון
    confirmAddToCart() {
        // סגירת תפריט האזהרה אם פתוח
        this.showWarningMenu = false;
        
        try {
            // בדיקה אם זה מצב עריכה - עדכון מוצר קיים
            const editingItemId = localStorage.getItem('editingItemId');
            
            if (this.isEditMode && editingItemId) {
                // מצב עריכה - עדכון מוצר קיים
                this.updateProductInBasket(editingItemId);
            } else {
                // מצב רגיל - הוספת מוצר חדש
                this.addProductToBasket();
            }
        } catch (error) {
            console.error('❌ Error in confirmAddToCart:', error);
        }
    }
    
    // פונקציה להוספת המוצר לסל
    addProductToBasket() {
        try {
            
            // יצירת קונפיגורציה של המוצר (פורמט 1)
            
            const productConfiguration: ProductConfiguration = {
                productName: this.selectedProductName || 'Unknown Product',
                translatedProductName: this.selectedProductName || 'Unknown Product',
                inputConfigurations: this.params.map(param => ({
                    inputName: param.name,
                    // שולחים את הערך האמיתי שהמשתמש עובד איתו (default הוא הערך המעודכן אצלנו)
                    value: param?.default,
                    selectedBeamIndex: param.selectedBeamIndex,
                    selectedTypeIndex: param.selectedTypeIndex
                })),
                selectedCorners: this.params.map(param => ({
                    cornerType: param.name,
                    cornerData: param.selectedBeamIndex !== undefined ? param.beams[param.selectedBeamIndex] : null
                })),
                originalProductData: this.product
            };

            // יצירת רשימת חיתוך (פורמט 2)
            const cutList: CutList = {
                corners: this.BeamsDataForPricing?.map(beamData => ({
                    cornerType: beamData.beamName,
                    length: beamData.type.length,
                    quantity: beamData.totalSizes.reduce((sum, size) => sum + size.count, 0)
                })) || [],
                screws: this.ForgingDataForPricing?.map(forgingData => ({
                    screwType: forgingData.type,
                    length: forgingData.length,
                    quantity: forgingData.count
                })) || []
            };

            // יצירת הסידור המאורגן (פורמט 3)
            const organizedArrangement: OrganizedArrangement = {
                corners: this.cuttingPlan?.map(beam => ({
                    cornerType: beam.beamType,
                    length: beam.beamLength,
                    quantity: beam.cuts.length,
                    arrangement: beam
                })) || [],
                screwBoxes: this.screwsPackagingPlan?.map(pkg => ({
                    screwType: pkg.screwTranslatedName,
                    length: pkg.optimalPackage.length,
                    quantity: pkg.numPackages,
                    boxPrice: pkg.optimalPackage.price,
                    arrangement: pkg
                })) || []
            };

            // יצירת מידע המחירים
            const pricingInfo: PricingInfo = {
                totalPrice: this.calculatedPrice || 0,
                cutCornersPrice: {
                    cornerPrice: this.cuttingPlan?.reduce((sum, beam) => sum + beam.beamPrice, 0) || 0,
                    cuttingPrice: this.drawingPrice || 0,
                    cornerUnitPrice: this.cuttingPlan?.[0]?.beamPrice || 0,
                    units: this.cuttingPlan?.reduce((sum, beam) => sum + beam.cuts.length, 0) || 0,
                    total: (this.cuttingPlan?.reduce((sum, beam) => sum + beam.beamPrice, 0) || 0) + (this.drawingPrice || 0)
                },
                screwsPrice: {
                    boxPrice: this.screwsPackagingPlan?.reduce((sum, pkg) => sum + pkg.totalPrice, 0) || 0,
                    unitsPerType: this.ForgingDataForPricing?.map(forgingData => ({
                        screwType: forgingData.type,
                        quantity: forgingData.count
                    })) || [],
                    boxPricePerType: this.screwsPackagingPlan?.map(pkg => ({
                        screwType: pkg.screwTranslatedName,
                        price: pkg.optimalPackage.price
                    })) || []
                },
                // מידע נוסף על עריכת המוצר
                editingInfo: {
                    // האם המשתמש ערך את הכמויות או הפרמטרים
                    wasEdited: (() => {
                        const hasBeamsChanged = this.hasBeamsChanged;
                        const hasScrewsChanged = this.hasScrewsChanged;
                        const hasParamsChanged = this.hasProductParametersChanged();
                        const wasEdited = hasBeamsChanged || hasScrewsChanged || hasParamsChanged;
                        
                        
                        return wasEdited;
                    })(),
                    // אופציות שנבחרו (V) וכמה כל אחת עולה
                    selectedOptions: {
                        drawing: { 
                            enabled: true, // תמיד מופעל
                            price: this.drawingPrice || 0 
                        },
                        beams: { 
                            enabled: this.isBeamsEnabled, 
                            price: this.isBeamsEnabled ? this.getBeamsOnlyPrice() : 0 
                        },
                        cutting: { 
                            enabled: this.isCuttingEnabled, 
                            price: this.isCuttingEnabled ? this.getCuttingPrice() : 0 
                        },
                        screws: { 
                            enabled: this.isScrewsEnabled, 
                            price: this.isScrewsEnabled ? this.getScrewsPrice() : 0 
                        }
                    },
                    // מחירים לפני ואחרי עריכה
                    pricesComparison: {
                        originalTotal: this.originalBeamsPrice + this.originalCuttingPrice + this.originalScrewsPrice + (this.drawingPrice || 0),
                        editedTotal: this.getFinalPrice(),
                        originalBeams: this.originalBeamsPrice,
                        editedBeams: this.getBeamsOnlyPrice(),
                        originalCutting: this.originalCuttingPrice,
                        editedCutting: this.getCuttingPrice(),
                        originalScrews: this.originalScrewsPrice,
                        editedScrews: this.getScrewsPrice()
                    },
                    // כמויות מעודכנות של קורות וברגים אחרי עריכה
                    updatedQuantities: {
                        beams: this.BeamsDataForPricing?.map((beam, index) => ({
                            beamType: beam.beamTranslatedName,
                            originalQuantity: this.originalBeamQuantities[index] || 0,
                            editedQuantity: this.getFullBeamsCount(beam)
                        })) || [],
                        screws: this.screwsPackagingPlan?.map((screw, index) => ({
                            screwType: screw.screwTranslatedName,
                            originalQuantity: this.originalScrewsData?.[index]?.numPackages || 0,
                            editedQuantity: screw.numPackages
                        })) || []
                    },
                    // האם הקורות מספיקות לבניית הרהיט
                    isCuttingPossible: this.isCuttingPossible
                }
            };

            // חישוב מידות המוצר לפני הוספה לסל
            const dimensions = this.getProductDimensionsRaw();
            
            
            // הוספה לסל
            this.productBasketService.addToBasket(
                productConfiguration,
                cutList,
                organizedArrangement,
                pricingInfo,
                dimensions
            );

            
            // ניווט לסל הקניות
            this.router.navigate(['/shopping-cart']);
            
        } catch (error) {
            console.error('❌ Error adding product to basket:', error);
        }
    }
    
    // פונקציה לעדכון מוצר קיים בסל
    updateProductInBasket(itemId: string) {
        try {
            
            // יצירת קונפיגורציה של המוצר (פורמט 1)
            const productConfiguration: ProductConfiguration = {
                productName: this.selectedProductName || 'Unknown Product',
                translatedProductName: this.selectedProductName || 'Unknown Product',
                inputConfigurations: this.params.map(param => ({
                    inputName: param.name,
                    value: param?.default,
                    selectedBeamIndex: param.selectedBeamIndex,
                    selectedTypeIndex: param.selectedTypeIndex
                })),
                selectedCorners: this.params.map(param => ({
                    cornerType: param.name,
                    cornerData: param.selectedBeamIndex !== undefined ? param.beams[param.selectedBeamIndex] : null
                })),
                originalProductData: this.product
            };

            // יצירת רשימת חיתוך (פורמט 2)
            const cutList: CutList = {
                corners: this.BeamsDataForPricing?.map(beamData => ({
                    cornerType: beamData.beamName,
                    length: beamData.type.length,
                    quantity: beamData.totalSizes.reduce((sum, size) => sum + size.count, 0)
                })) || [],
                screws: this.ForgingDataForPricing?.map(forgingData => ({
                    screwType: forgingData.type,
                    length: forgingData.length,
                    quantity: forgingData.count
                })) || []
            };

            // יצירת הסידור המאורגן (פורמט 3)
            const organizedArrangement: OrganizedArrangement = {
                corners: this.cuttingPlan?.map(beam => ({
                    cornerType: beam.beamType,
                    length: beam.beamLength,
                    quantity: beam.cuts.length,
                    arrangement: beam
                })) || [],
                screwBoxes: this.screwsPackagingPlan?.map(pkg => ({
                    screwType: pkg.screwTranslatedName,
                    length: pkg.optimalPackage.length,
                    quantity: pkg.numPackages,
                    boxPrice: pkg.optimalPackage.price,
                    arrangement: pkg
                })) || []
            };

            // יצירת מידע המחירים
            const pricingInfo: PricingInfo = {
                totalPrice: this.calculatedPrice || 0,
                cutCornersPrice: {
                    cornerPrice: this.cuttingPlan?.reduce((sum, beam) => sum + beam.beamPrice, 0) || 0,
                    cuttingPrice: this.drawingPrice || 0,
                    cornerUnitPrice: this.cuttingPlan?.[0]?.beamPrice || 0,
                    units: this.cuttingPlan?.reduce((sum, beam) => sum + beam.cuts.length, 0) || 0,
                    total: (this.cuttingPlan?.reduce((sum, beam) => sum + beam.beamPrice, 0) || 0) + (this.drawingPrice || 0)
                },
                screwsPrice: {
                    boxPrice: this.screwsPackagingPlan?.reduce((sum, pkg) => sum + pkg.totalPrice, 0) || 0,
                    unitsPerType: this.ForgingDataForPricing?.map(forgingData => ({
                        screwType: forgingData.type,
                        quantity: forgingData.count
                    })) || [],
                    boxPricePerType: this.screwsPackagingPlan?.map(pkg => ({
                        screwType: pkg.screwTranslatedName,
                        price: pkg.optimalPackage.price
                    })) || []
                },
                // מידע נוסף על עריכת המוצר
                editingInfo: {
                    wasEdited: (() => {
                        const hasBeamsChanged = this.hasBeamsChanged;
                        const hasScrewsChanged = this.hasScrewsChanged;
                        const hasParamsChanged = this.hasProductParametersChanged();
                        const wasEdited = hasBeamsChanged || hasScrewsChanged || hasParamsChanged;
                        
                        return wasEdited;
                    })(),
                    selectedOptions: {
                        drawing: { 
                            enabled: true,
                            price: this.drawingPrice || 0 
                        },
                        beams: { 
                            enabled: this.isBeamsEnabled, 
                            price: this.isBeamsEnabled ? this.getBeamsOnlyPrice() : 0 
                        },
                        cutting: { 
                            enabled: this.isCuttingEnabled, 
                            price: this.isCuttingEnabled ? this.getCuttingPrice() : 0 
                        },
                        screws: { 
                            enabled: this.isScrewsEnabled, 
                            price: this.isScrewsEnabled ? this.getScrewsPrice() : 0 
                        }
                    },
                    pricesComparison: {
                        originalTotal: this.originalBeamsPrice + this.originalCuttingPrice + this.originalScrewsPrice + (this.drawingPrice || 0),
                        editedTotal: this.getFinalPrice(),
                        originalBeams: this.originalBeamsPrice,
                        editedBeams: this.getBeamsOnlyPrice(),
                        originalCutting: this.originalCuttingPrice,
                        editedCutting: this.getCuttingPrice(),
                        originalScrews: this.originalScrewsPrice,
                        editedScrews: this.getScrewsPrice()
                    },
                    updatedQuantities: {
                        beams: this.BeamsDataForPricing?.map((beam, index) => ({
                            beamType: beam.beamTranslatedName,
                            originalQuantity: this.originalBeamQuantities[index] || 0,
                            editedQuantity: this.getFullBeamsCount(beam)
                        })) || [],
                        screws: this.screwsPackagingPlan?.map((screw, index) => ({
                            screwType: screw.screwTranslatedName,
                            originalQuantity: this.originalScrewsData?.[index]?.numPackages || 0,
                            editedQuantity: screw.numPackages
                        })) || []
                    },
                    isCuttingPossible: this.isCuttingPossible
                }
            };

            // חישוב מידות המוצר
            const dimensions = this.getProductDimensionsRaw();
            
            
            // עדכון המוצר בסל
            this.productBasketService.updateBasketItem(
                itemId,
                productConfiguration,
                cutList,
                organizedArrangement,
                pricingInfo,
                dimensions
            );

            
            // הסרת ה-editingItemId מ-localStorage
            localStorage.removeItem('editingItemId');
            
            // ניווט לסל הקניות
            this.router.navigate(['/shopping-cart']);
            
        } catch (error) {
            console.error('❌ Error updating product in basket:', error);
        }
    }

    // =====================
    // Input editing handlers
    // =====================

    onNumberFocus(param: any) {
        // שמירת ערך התחלה לעריכה כדי לזהות שינוי אמיתי
        if (param._editStartValue === undefined) {
            param._editStartValue = param.default;
        } else {
            param._editStartValue = param.default;
        }
        if (param.editingValue === undefined) {
            param.editingValue = param.default;
        }
    }

    onNumberCommit(param: any) {
        
        const raw = param.editingValue;
        const start = param._editStartValue;
        
        // בדיקה אם הערך תקין
        if (!this.isValidValue(raw, param)) {
            
            // איפוס הערך הזמני לערך הקודם
            param.editingValue = start;
            // איפוס ערכי עזר
            param._editStartValue = undefined;
            return;
        }
        
        const parsed = this.parseNumberWithinBounds(raw, param.min, param.max, param.default);
        const changed = parsed !== start;
        
        
        if (changed) {
            
            // עדכון הערך במודל
            param.default = parsed;
            // עדכון הערך הזמני גם כן
            param.editingValue = parsed;
            
            this.updateModel();
        }
        // איפוס ערכי עזר
        param._editStartValue = undefined;
    }

    onGenericNumberCommit(param: any) {
        
        const raw = param.editingValue;
        const start = param._editStartValue;
        
        // בדיקה אם הערך תקין
        if (!this.isValidValue(raw, param)) {
            
            // איפוס הערך הזמני לערך הקודם
            param.editingValue = start;
            // איפוס ערכי עזר
            param._editStartValue = undefined;
            return;
        }
        
        const parsed = this.parseNumberWithinBounds(raw, param.min, param.max, param.default);
        const changed = parsed !== start;
        
        
        if (changed) {
            
            // עדכון הערך במודל
            param.default = parsed;
            // עדכון הערך הזמני גם כן
            param.editingValue = parsed;
            
            // עדכון דרך הפונקציה הכללית כדי לשמר לוגיקת צד-שרת/אימות קיימת
            this.updateParameterValue(param, parsed);
        }
        param._editStartValue = undefined;
    }

    onShelfNumberFocus(param: any, index: number) {
        param._editStartArray = param._editStartArray || {};
        const logicalIndex = index;
        param._editStartArray[logicalIndex] = param.default[logicalIndex];
        if (!param._editingValues) param._editingValues = [];
        if (param._editingValues[logicalIndex] === undefined) {
            param._editingValues[logicalIndex] = param.default[logicalIndex];
        }
    }

    onShelfNumberCommit(param: any, index: number) {
        
        const logicalIndex = index;
        const start = param._editStartArray ? param._editStartArray[logicalIndex] : param.default[logicalIndex];
        const raw = param._editingValues ? param._editingValues[logicalIndex] : param.default[logicalIndex];
        
        // בדיקה אם הערך תקין
        if (!this.isValidValue(raw, param)) {
            
            // איפוס הערך הזמני לערך הקודם
            if (!param._editingValues) param._editingValues = [];
            param._editingValues[logicalIndex] = start;
            // איפוס ערכי עזר
            if (param._editStartArray) delete param._editStartArray[logicalIndex];
            return;
        }
        
        const parsed = this.parseNumberWithinBounds(raw, param.min, param.max, param.default[logicalIndex]);
        const changed = parsed !== start;
        
        
        if (changed) {
            
            // עדכון הערך במודל
            param.default[logicalIndex] = parsed;
            // עדכון הערך הזמני גם כן
            if (!param._editingValues) param._editingValues = [];
            param._editingValues[logicalIndex] = parsed;
            
            this.updateBeams();
        }
        if (param._editStartArray) delete param._editStartArray[logicalIndex];
    }

    private parseNumberWithinBounds(value: any, min: number, max: number, fallback: number): number {
        let num = typeof value === 'number' ? value : parseFloat(value);
        if (isNaN(num)) num = fallback;
        if (typeof min === 'number') num = Math.max(min, num);
        if (typeof max === 'number') num = Math.min(max, num);
        return num;
    }
    
    // בדיקה אם הערך תקין לפי ה-type (כמות הספרות אחרי הנקודה)
    private isValidDecimalPlaces(value: any, type: number): boolean {
        if (value === null || value === undefined || value === '') return false;
        
        const num = parseFloat(value);
        if (isNaN(num)) return false;
        
        // בדיקה אם יש יותר ספרות אחרי הנקודה מה-type המותר
        const decimalPart = value.toString().split('.')[1];
        if (decimalPart && decimalPart.length > type) {
            return false;
        }
        
        return true;
    }
    
    // פונקציה לבדיקת תקינות ערך כוללת
    private isValidValue(value: any, param: any): boolean {
        // בדיקה אם זה מספר תקין
        const num = parseFloat(value);
        if (isNaN(num)) return false;
        
        // בדיקה אם זה תקין לפי ה-type
        if (!this.isValidDecimalPlaces(value, param.type)) return false;
        
        return true;
    }

    // האם יש שינוי בערך העריכה לעומת ערך קיים
    shouldShowCommit(param: any): boolean {
        if (param && param.editingValue !== undefined) {
            // בדיקה אם הערך הגולמי שונה מהערך הנוכחי (ללא הגבלה)
            return param.editingValue !== param.default;
        }
        return false;
    }

    // טיפול ב-input event - רק מאחסן ערך זמני, ללא קלמפינג בזמן הקלדה
    onNumberInput(param: any, event: any) {
        const value = parseFloat(event.target.value);
        if (!isNaN(value)) {
            param.editingValue = value;
        }
    }
    
    // טיפול ב-input event למדפים - רק מאחסן ערך זמני למיקום המתאים
    onShelfNumberInput(param: any, event: any, index: number) {
        const value = parseFloat(event.target.value);
        if (!isNaN(value)) {
            const logicalIndex = index;
            if (!param._editingValues) param._editingValues = [];
            param._editingValues[logicalIndex] = value;
        }
    }

    // לחצן עדכון מהיר לאינפוט בודד
    onNumberQuickCommit(param: any, inputEl?: HTMLInputElement) {
        this.onNumberCommit(param);
        try { inputEl && inputEl.blur && inputEl.blur(); } catch {}
    }

    // לחצן עדכון מהיר לערך במערך (מדפים וכו')
    shouldShowShelfCommit(param: any, index: number): boolean {
        const logicalIndex = index;
        const hasEditing = param && param._editingValues && param._editingValues[logicalIndex] !== undefined;
        if (!hasEditing) return false;
        // בדיקה אם הערך הגולמי שונה מהערך הנוכחי (ללא הגבלה)
        return param._editingValues[logicalIndex] !== param.default[logicalIndex];
    }

    onShelfQuickCommit(param: any, index: number, inputEl?: HTMLInputElement) {
        this.onShelfNumberCommit(param, index);
        try { inputEl && inputEl.blur && inputEl.blur(); } catch {}
    }
    
    /**
     * פתיחת דיאלוג סל המוצרים
     */
    openShoppingCart() {
        this.router.navigate(['/shopping-cart']);
    }
    
    // משתנה לשליטה בתצוגת תפריט האזהרה
    showWarningMenu = false;
    
    // משתנה לשליטה בהצגת הוראות הרכבה
    showAssemblyInstructions = false;
    
    // משתנים לשליטה בהצגת התרעות
    showHiddenBeamsWarning = true;
    showNoMiddleBeamsWarning = true;
    
    // פונקציות לסגירת התרעות
    dismissHiddenBeamsWarning() {
        this.showHiddenBeamsWarning = false;
    }
    
    dismissNoMiddleBeamsWarning() {
        this.showNoMiddleBeamsWarning = false;
    }
    
    
    // בדיקה אם יש צורך בהצגת אזהרה
    shouldShowWarning(): boolean {
        // בדיקה ישירה של dimensions-alert
        const hasDimensionsAlertNow = this.checkIfHasDimensionsAlert();
        const result = hasDimensionsAlertNow || this.hasHiddenBeams || this.hasNoMiddleBeams;
        return result;
    }
    
    // בדיקה ישירה אם יש dimensions-alert במוצר וגם יש הבדל בין הגובה שהוזן לגובה האמיתי
    checkIfHasDimensionsAlert(): boolean {
        // שלב 1: בדיקה אם יש restriction של dimensions-alert
        if (!this.product || !this.product.restrictions) {
            return false;
        }
        
        const dimensionsAlert = this.product.restrictions.find((r: any) => r.name === 'dimensions-allert' || r.name === 'dimensions-alert');
        
        if (!dimensionsAlert || dimensionsAlert.val !== true) {
            return false;
        }
        
        // שלב 2: בדיקה אם יש הפרש בין הגובה שהוזן לגובה האמיתי
        // 🎯 צריך לבדוק את הערכים הנוכחיים (הכי מעודכנים) של שניהם
        const actualHeight = this.getActualHeight();
        const userHeight = this.getUserDefinedHeight();
        
        // 🔍 השוואה מדויקת (עם סובלנות קטנה לשגיאות עיגול)
        const difference = Math.abs(actualHeight - userHeight);
        const hasDifference = difference > 0.01; // אם ההפרש גדול מ-0.01 ס"מ
        
        return hasDifference;
    }
    
    // קבלת הגובה האמיתי של המוצר
    getActualHeight(): number {
        const dimensions = this.getProductDimensionsRaw();
        const height = dimensions.height;
        return height;
    }
    
    // קבלת הגובה שהמשתמש הגדיר (הערך הנוכחי מהאינפוט)
    getUserDefinedHeight(): number {
        // 🎯 משתמשים ב-this.params (המערך הנוכחי והמעודכן) ולא ב-this.product.params
        const heightParam = this.params?.find((p: any) => p.name === 'height');
        if (heightParam && heightParam.default !== undefined && heightParam.default !== null) {
            // המרה למספר אם צריך
            const heightValue = typeof heightParam.default === 'number' ? heightParam.default : Number(heightParam.default);
            return isNaN(heightValue) ? 0 : heightValue;
        }
        return 0;
    }
    
    // חישוב ההפרש בין הגובה שהוגדר לגובה האמיתי
    getHeightDifference(): number {
        const actualHeight = this.getActualHeight();
        const userHeight = this.getUserDefinedHeight();
        const difference = actualHeight - userHeight;
        return difference;
    }
    
    // קבלת הטקסט המתאים להפרש הגובה
    getHeightDifferenceText(): string {
        const difference = this.getHeightDifference();
        if (difference > 0) {
            return 'יותר';
        } else if (difference < 0) {
            return 'פחות';
        } else {
            return 'בדיוק כמו';
        }
    }
    
    // קבלת ההפרש המוחלט בין הגובה שהוגדר לגובה האמיתי
    getAbsoluteHeightDifference(): number {
        const difference = this.getHeightDifference();
        const absoluteDifference = Math.abs(difference);
        return absoluteDifference;
    }
    
    // קבלת כמות הקורות החסרות
    getHiddenBeamsCount(): number {
        // החישוב מבוסס על הלוגיקה הקיימת של hasHiddenBeams
        // נצטרך למצוא את המספר המדויק של קורות חסרות
        return 2; // ברירת מחדל - ניתן לעדכן לפי הלוגיקה המדויקת
    }
    
    // קבלת שם סוג הקורה
    getBeamTypeName(): string {
        return 'מדף'; // ברירת מחדל - ניתן לעדכן לפי הלוגיקה המדויקת
    }
    
    // סגירת תפריט האזהרה
    closeWarningMenu() {
        this.showWarningMenu = false;
    }
    
    // משתנים לניהול dropdowns
    openDropdowns: { [key: string]: boolean } = {};

    // פונקציות לניהול dropdowns
    toggleDropdown(type: string, param: any) {
        const key = `${type}_${param.name}`;
        this.openDropdowns[key] = !this.openDropdowns[key];
        
    }

    isDropdownOpen(type: string, param: any): boolean {
        const key = `${type}_${param.name}`;
        return this.openDropdowns[key] || false;
    }

    selectBeam(index: number, param: any) {
        
        // CHACK_TEXTURE - Log when selectBeam is called
        if (param.name === 'shelfs' || param.type === 'beamSingle') {
        }
        
        // Update the parameter object directly in this.product.params by name to ensure we modify the right object
        const beamParamIndex = this.product?.params?.findIndex((p: any) => 
            p.name === param.name && p.type === param.type
        );
        
        if (beamParamIndex !== undefined && beamParamIndex >= 0) {
            this.product.params[beamParamIndex].selectedBeamIndex = index;
            this.product.params[beamParamIndex].selectedTypeIndex = 0; // איפוס בחירת סוג העץ לסוג הראשון
        } else {
            console.error('CRITICAL - Could not find param in product.params!', {
                paramName: param.name,
                paramType: param.type
            });
        }
        
        param.selectedBeamIndex = index;
        param.selectedTypeIndex = 0; // איפוס בחירת סוג העץ לסוג הראשון
        
        // Save the selection to localStorage so it persists across page refreshes
        const storageKey = `selectedBeamIndex_${this.product?.name}_${param.name}`;
        localStorage.setItem(storageKey, index.toString());
        
        this.updateBeams();
        // הרצת כל הבדיקות לאחר שינוי קורה (כי סוג העץ יכול להשתנות)
        if (this.woods.length > 0) {
            this.runAllChecks();
        }
        this.closeDropdown('beam', param);
    }

    selectType(index: number, param: any) {
          
          // CHACK_TEXTURE - Log when selectType is called
          if (param.name === 'shelfs' || param.type === 'beamSingle') {
          }
        
        // Update the parameter object directly in this.product.params by name to ensure we modify the right object
        const typeParamIndex = this.product?.params?.findIndex((p: any) => 
            p.name === param.name && p.type === param.type
        );
        
        if (typeParamIndex !== undefined && typeParamIndex >= 0) {
            this.product.params[typeParamIndex].selectedTypeIndex = index;
        } else {
            console.error('CRITICAL - Could not find param in product.params!', {
                paramName: param.name,
                paramType: param.type
            });
        }
        
        param.selectedTypeIndex = index;
        
        this.updateBeams();
        // הרצת כל הבדיקות לאחר שינוי סוג עץ
        if (this.woods.length > 0) {
            this.runAllChecks();
        }
        this.closeDropdown('type', param);
    }

    closeDropdown(type: string, param: any) {
        const key = `${type}_${param.name}`;
        this.openDropdowns[key] = false;
    }

    closeAllDropdowns() {
        this.openDropdowns = {};
    }

    // פונקציות לטיפול בבחירת קורות וסוגי עץ
    onBeamSelectionChange(event: any, param: any) {
        this.debugLog('=== onBeamSelectionChange נקרא ===');
        this.debugLog('event:', event);
        this.debugLog('param:', param);

        if (!param) {
            console.error('param is null or undefined!');
            return;
        }

        if (!param.beams || param.beams.length === 0) {
            console.error('param.beams is empty or undefined!', param.beams);
            return;
        }

        // קבלת הערך החדש מה-event
        const newValue = parseInt(event.target.value);
        this.debugLog('param.name:', param.name);
        this.debugLog('param.beams length:', param.beams.length);
        this.debugLog('newIndex:', newValue);
        this.debugLog('param.selectedBeamIndex לפני:', param.selectedBeamIndex);

        // עדכון הערך
        param.selectedBeamIndex = newValue;
        this.debugLog('param.selectedBeamIndex אחרי:', param.selectedBeamIndex);

        // איפוס בחירת סוג העץ לסוג הראשון ברשימה
        param.selectedTypeIndex = 0;
        this.debugLog('param.selectedTypeIndex אופס ל-0 (סוג העץ הראשון)');

        // קריאה לעדכון
        this.updateBeams();
        // הרצת כל הבדיקות לאחר שינוי קורה (כי סוג העץ יכול להשתנות)
        if (this.woods.length > 0) {
            this.runAllChecks();
        }
    }
    
    onTypeSelectionChange(event: any, param: any) {
        this.debugLog('=== onTypeSelectionChange נקרא ===');
        this.debugLog('event:', event);
        this.debugLog('param:', param);

        if (!param) {
            console.error('param is null or undefined!');
            return;
        }

        // קבלת הערך החדש מה-event
        const newValue = parseInt(event.target.value);
        this.debugLog('param.name:', param.name);
        this.debugLog('newIndex:', newValue);
        this.debugLog('param.selectedTypeIndex לפני:', param.selectedTypeIndex);

        // עדכון הערך
        param.selectedTypeIndex = newValue;
        this.debugLog('param.selectedTypeIndex אחרי:', param.selectedTypeIndex);

        // קריאה לעדכון
        this.updateBeams();
        // הרצת כל הבדיקות לאחר שינוי סוג עץ
        if (this.woods.length > 0) {
            this.runAllChecks();
        }
    }
    
    // בדיקת מגבלות המוצר
    private checkProductRestrictions(product: any) {
        // איפוס המשתנה
        this.hasDimensionsAlert = false;
        
        // בדיקה אם יש restrictions
        if (!product.restrictions || !Array.isArray(product.restrictions)) {
            return;
        }
        
        // חיפוש מגבלת dimensions-alert
        const dimensionsAlertRestriction = product.restrictions.find(
            (r: any) => r.name === 'dimensions-alert' || r.name === 'dimensions-allert'
        );
        
        if (dimensionsAlertRestriction && dimensionsAlertRestriction.val === true) {
            this.hasDimensionsAlert = true;
        }
    }
    private removeWireframeCube() {
        const existingWireframe =
            this.scene.getObjectByName('productWireframe');
        if (existingWireframe) {
            this.scene.remove(existingWireframe);
        }
    }
    // פונקציית ניווט
    onNavigationClick(direction: string) {
        this.setCameraView(direction);
    }
    
    // פונקציה להגדרת תצוגת המצלמה עם אנימציה
    setCameraView(view: string) {
        if (!this.camera || !this.scene) return;
        
        const duration = 500; // 0.5 שניות
        const startTime = Date.now();
        
        // מיקום התחלתי
        const startPosition = this.camera.position.clone();
        const startRotation = this.scene.rotation.clone();
        
        // מיקום סופי
        let targetPosition: THREE.Vector3;
        let targetRotation: THREE.Euler;
        
        switch (view) {
            case 'top':
                targetPosition = new THREE.Vector3(0, 400, 0);
                targetRotation = new THREE.Euler(0, 0, 0);
                break;
            case 'bottom':
                targetPosition = new THREE.Vector3(0, -400, 0);
                targetRotation = new THREE.Euler(0, 0, 0);
                break;
            case 'left':
                targetPosition = new THREE.Vector3(-400, 0, 0);
                targetRotation = new THREE.Euler(0, 0, 0);
                break;
            case 'right':
                targetPosition = new THREE.Vector3(400, 0, 0);
                targetRotation = new THREE.Euler(0, 0, 0);
                break;
            case 'front':
                targetPosition = new THREE.Vector3(0, 0, 400);
                targetRotation = new THREE.Euler(0, 0, 0);
                break;
            default:
                // מצב ברירת מחדל - תצוגה איזומטרית
                targetPosition = new THREE.Vector3(280, 320, 480);
                targetRotation = new THREE.Euler(0, Math.PI / 6, 0);
        }
        
        // פונקציית אנימציה
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease-in-out)
            const easeProgress = progress < 0.5 
                ? 2 * progress * progress 
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            
            // אינטרפולציה של מיקום
            this.camera.position.lerpVectors(startPosition, targetPosition, easeProgress);
            
            // אינטרפולציה של סיבוב
            this.scene.rotation.x = THREE.MathUtils.lerp(startRotation.x, targetRotation.x, easeProgress);
            this.scene.rotation.y = THREE.MathUtils.lerp(startRotation.y, targetRotation.y, easeProgress);
            this.scene.rotation.z = THREE.MathUtils.lerp(startRotation.z, targetRotation.z, easeProgress);
            
            // המשך האנימציה
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }

    
    // פונקציה לפתיחת/סגירת תפריט המחיר
    togglePriceMenu() {
        this.isPriceManuOpen = !this.isPriceManuOpen;
        // סגירת תפריט שלוש הנקודות
        this.isOptionsMenuOpen = false;
    }
    
    // פונקציה לטיפול בשינויי אינפוט מספרי (עדכון מיידי לחצים)
    onNumberInputChange(event: any, updateFunction: string, param?: any) {
        const value = parseFloat(event.target.value);
        if (!isNaN(value)) {
            // בדיקה אם זה שינוי על ידי חצים (לא הקלדה ידנית)
            const isArrowKey = event.inputType === undefined || event.inputType === 'insertReplacementText';
            if (isArrowKey) {
                // עדכון מיידי לחצים
                setTimeout(() => {
                    if (updateFunction === 'updateModel') {
                        this.updateModel();
                    }
                }, 0);
            } else if (param) {
                // עבור הקלדה ידנית - validation בזמן אמת אם יש פרמטר
                const validatedValue = this.validateParameterValue(param, value);
                if (validatedValue !== value) {
                    // אם הערך לא תקין, נחזיר אותו לערך המאומת
                    event.target.value = validatedValue;
                    param.default = validatedValue;
                }
            }
        }
    }
    
    // פונקציה לטיפול בשינויי אינפוט של פרמטרים
    onParameterInputChange(event: any, param: any) {
        const value = parseFloat(event.target.value);
        
        // Debug log for futon parameters
        if (this.isFuton && (param.name === 'width' || param.name === 'depth')) {
            this.debugLog(`DEBUG FUTON INPUT CHANGE - ${param.name}:`, {
                value: value,
                min: param.min,
                max: param.max,
                inputType: event.inputType,
                param: param
            });
        }
        
        if (!isNaN(value)) {
            // בדיקה אם זה שינוי על ידי חצים (לא הקלדה ידנית)
            const isArrowKey = event.inputType === undefined || event.inputType === 'insertReplacementText';
            if (isArrowKey) {
                // עדכון מיידי לחצים עם validation
                setTimeout(() => {
                    this.updateParameterValue(param, value);
                }, 0);
            } else {
                // עבור הקלדה ידנית - רק עדכון הערך ללא validation מיידי
                param.default = value;
            }
        }
    }
    
    // פונקציה לטיפול בשינויי אינפוט של מדפים
    onShelfInputChange(event: any, param: any, idx: number) {
        const value = parseFloat(event.target.value);
        if (!isNaN(value)) {
            // בדיקה אם זה שינוי על ידי חצים (לא הקלדה ידנית)
            const isArrowKey = event.inputType === undefined || event.inputType === 'insertReplacementText';
            if (isArrowKey) {
                // עדכון מיידי לחצים
                setTimeout(() => {
                    this.updateShelfParameterValue(param, value, param.default.length - 1 - idx);
                }, 0);
            }
        }
    }
    drawerOpen: boolean = true;
    showWireframe: boolean = false; // מצב ברירת מחדל: wireframe מוסתר
    isTransparentMode: boolean = false; // מצב שקוף
    isOptionsMenuOpen: boolean = false; // האם תפריט האפשרויות פתוח
    isSystemMenuOpen: boolean = false; // האם תפריט ניהול המערכת פתוח
    showNavigationCube: boolean = false; // קוביית ניווט במובייל
    isPriceMinimized: boolean = true; // האם תפריט המחיר מצומצם
    isInstructionMode: boolean = false; // מצב הוראות הרכבה (false = מצב עריכה רגיל, true = מצב הוראות)
    currentInstructionStage: number = 0; // סעיף ההוראה הפתוח כרגע (0 = מצב רגיל, 1+ = מצב הוראות עם סעיף פתוח)
    completedPreliminaryDrills: Set<string> = new Set(); // קורות שסומנו כבוצעו קדחים מקדימים
    preliminaryDrillsInfoCache: any[] = []; // cache לתוצאות getPreliminaryDrillsInfo (לא בשימוש יותר - נשמר ל-compatibility)
    @ViewChild('inputsContainer', { static: false }) inputsContainerRef!: ElementRef; // Reference לקונטיינר של האינפוטים
    product: any = null;
    params: any[] = [];
    selectedProductName: string = ''; // שם המוצר שנבחר מה-URL
    woods: any[] = []; // רשימת סוגי עצים מהמסד
    mustPerlimenaryScrewsByWoodTypeArray: { 
        paramName: string; 
        requiresPreliminaryScrews: boolean;
        woodName?: string;
        woodHardness?: number | null;
        translatedName?: string | null;
        testResult?: string;
    }[] = []; // מערך של תוצאות בדיקת hardness לכל פרמטר קורה בנפרד
    mustPerlimenaryScrewsByDimensionArray: {
        paramName: string;
        requiresPreliminaryScrews: boolean;
        beamWidth?: number | null; // רוחב הקורה בס"מ
        beamHeight?: number | null; // גובה הקורה בס"מ
        isLegBeam?: boolean;
        legHeightThreshold?: number | null;
        legWidthThreshold?: number | null;
        testResult?: string;
    }[] = []; // מערך של תוצאות בדיקת מידות לכל פרמטר קורה בנפרד
    maxHardnessForPerlimenaryScrews: number = 6; // ערך קבוע למקסימום hardness שבו לא דורשים ברגי הקדמה
    isTable: boolean = false; // האם זה שולחן או ארון
    isPlanter: boolean = false; // האם זה עדנית עץ
    isBox: boolean = false; // האם זה קופסת עץ (זהה לעדנית)
    isBelams: boolean = false; // האם זה קורות לפי מידה
    isFuton: boolean = false; // האם זה בסיס מיטה
    isPriceManuOpen: boolean = false; // האם תפריט המחיר פתוח
    hasHiddenBeams: boolean = false; // האם יש קורות מוסתרות בגלל חסימת רגליים
    hiddenBeamsCount: number = 0; // כמות הקורות המוסתרות
    hasNoMiddleBeams: boolean = false; // האם נשארות רק שתי הקורות המקוצרות (אין קורות באמצע)
    hasShortenedBeamsRemoved: boolean = false; // האם הקורות המקוצרות הוסרו בגלל צרות מדי
    
    // האם יש התרעה כלשהי (לשימוש ב-CSS)
    get hasAnyAlert(): boolean {
        return this.hasHiddenBeams || this.hasNoMiddleBeams || this.hasShortenedBeamsRemoved;
    }

    getBeamTypeText(): string {
        if (this.isTable) {
            return 'פלטה';
        } else if (this.isFuton) {
            return 'פלטת מיטה';
        } else {
            return 'מדף';
        }
    }
    isLoading: boolean = true; // האם התצוגה נטענת - מתחיל ב-true כדי למנוע הבהוב
    isModelLoading: boolean = true; // האם המודל התלת-מימדי נטען - מתחיל ב-true כדי למנוע הבהוב
    hasDimensionsAlert: boolean = false; // האם למוצר יש מגבלה של התרעת אי התאמה במידות
    // נתונים לחישוב מחיר
    BeamsDataForPricing: any[] = []; // מערך של נתוני קורות לחישוב מחיר
    ForgingDataForPricing: any[] = []; // מערך של נתוני ברגים לחישוב מחיר
    calculatedPrice: number = 0; // מחיר מחושב
    cuttingPlan: any[] = []; // תוכנית חיתוך מפורטת
    screwsPackagingPlan: any[] = []; // תוכנית קופסאות ברגים מפורטת
    quantity: number = 1; // כמות יחידות להזמנה
    selectedPricingOption: 'cut' | 'full' | 'plan' = 'cut'; // אופציית תמחור: cut=חתוכות, full=שלמות+הוראות, plan=הוראות בלבד
    drawingPrice: number = 20; // עלות שרטוט/הוראות חיתוך
    
    // משתנים חדשים לתפריט הגמיש
    isBeamsEnabled: boolean = true; // האם קורות מופעלות
    isCuttingEnabled: boolean = true; // האם חיתוך מופעל
    isScrewsEnabled: boolean = true; // האם ברגים מופעלים
    isCuttingPossible: boolean = true; // האם הכמויות מספיקות לחיתוך
    
    // משתנים לכפתורי עריכה
    showBeamsEditOptions: boolean = false; // האם להציג אופציות עריכה לקורות
    showScrewsEditOptions: boolean = false; // האם להציג אופציות עריכה לברגים
    
    // משתנים לשמירת מצב לפני עריכה
    private originalBeamsData: any = null;
    private originalScrewsData: any = null;
    private originalBeamQuantities: number[] = []; // שמירת הכמויות המקוריות של הקורות
    
    // משתנים למחירים ספציפיים (מתעדכנים בזמן אמת)
    private dynamicBeamsPrice: number = 0;
    private dynamicCuttingPrice: number = 0;
    private dynamicScrewsPrice: number = 0;
    
    // משתנים למחירים המקוריים (להצגה כמחוקים)
    private originalBeamsPrice: number = 0;
    private originalCuttingPrice: number = 0;
    private originalScrewsPrice: number = 0;
    
    // משתנים לבדיקה אם יש שינויים
    private hasBeamsChanged: boolean = false;
    private hasScrewsChanged: boolean = false;
    @ViewChild(MatMenuTrigger) pricingMenuTrigger!: MatMenuTrigger;
    constructor(
        private http: HttpClient,
        private snackBar: MatSnackBar,
        private route: ActivatedRoute,
        private router: Router,
        private pricingService: PricingService,
        private dialogService: DialogService,
        private productBasketService: ProductBasketService,
        private cdr: ChangeDetectorRef
    ) {}
    ngOnInit() {
        // מחיקת הגדרות מוצר מ-localStorage כשנכנסים לעמוד
        this.clearProductSettingsFromStorage();
        
        // isLoading כבר מוגדר ל-true בברירת המחדל
        this.checkUserAuthentication();
        
        // הוספת listener לסגירת dropdowns כשלוחצים מחוץ להם
        document.addEventListener('click', (event) => {
            const target = event.target as HTMLElement;
            if (!target.closest('.custom-dropdown')) {
                this.closeAllDropdowns();
            }
        });
        
        // קבלת פרמטר המוצר מה-URL
        this.route.queryParams.subscribe((params) => {
            
            if (params['product']) {
                this.selectedProductName = params['product'];
                this.isTable = this.selectedProductName === 'table';
                this.isPlanter = this.selectedProductName === 'planter';
                this.isBox = this.selectedProductName === 'box';
                this.isBelams = this.selectedProductName === 'beams';
                this.isFuton = this.selectedProductName === 'futon';
                
                
                // איפוס מצב שקוף במוצר קורות
                if (this.isBelams) {
                    this.isTransparentMode = false;
                }
                this.debugLog(
                    'מוצר נבחר:',
                    this.selectedProductName,
                    'שולחן:',
                    this.isTable,
                    'עדנית:',
                    this.isPlanter
                );
                // בדיקה אם זה מוצר שונה מהמוצר האחרון (כולל תת-מוצר)
                const lastProductId = localStorage.getItem('lastSelectedProductId');
                const lastConfigIndex = localStorage.getItem('lastConfigIndex');
                const currentProductId = params['productId'] || this.selectedProductName;
                const currentConfigIndex = params['configIndex'] !== undefined ? params['configIndex'] : undefined;
                
                
                // בדיקת מצב עריכה
                
                this.isEditMode = params['isEditMode'] === 'true' || params['isEditMode'] === true || params['isEditMode'] === 'True';
                
                
                
                // הגרלת change detection
                this.cdr.detectChanges();
                
                // יצירת מזהה ייחודי שכולל גם את ה-configIndex
                const lastFullId = lastConfigIndex !== null ? `${lastProductId}_config${lastConfigIndex}` : lastProductId;
                const currentFullId = currentConfigIndex !== undefined ? `${currentProductId}_config${currentConfigIndex}` : currentProductId;
                
                
                if (lastFullId && lastFullId !== currentFullId) {
                    this.clearUserConfiguration();
                }
                
                // שמירת המוצר והתת-מוצר הנוכחיים
                localStorage.setItem('lastSelectedProductId', currentProductId);
                if (currentConfigIndex !== undefined) {
                    localStorage.setItem('lastConfigIndex', currentConfigIndex.toString());
                } else {
                    localStorage.removeItem('lastConfigIndex');
                }
                
                
                // טעינת המוצר הנכון לפי ID או שם
                if (params['productId']) {
                    // בדיקה אם יש configIndex ב-URL
                    const configIndex = params['configIndex'] !== undefined ? parseInt(params['configIndex']) : undefined;
                    this.getProductById(params['productId'], configIndex);
                } else {
                this.getProductByName(this.selectedProductName);
                }
                
                // לוג אחרון לבדיקת isEditMode לאחר הטעינה
                setTimeout(() => {
                    // הגרלת change detection שוב
                    this.cdr.detectChanges();
                }, 1000);
            } else {
                // אם אין פרמטר מוצר, נטען את המוצר האחרון או ברירת מחדל
                const lastProduct = localStorage.getItem('lastSelectedProduct');
                if (lastProduct) {
                    this.debugLog('טעינת מוצר אחרון:', lastProduct);
                    this.selectedProductName = lastProduct;
                    this.isTable = this.selectedProductName === 'table';
                    this.isPlanter = this.selectedProductName === 'planter';
                    this.isBox = this.selectedProductName === 'box';
                    this.getProductByName(this.selectedProductName);
                } else {
        this.getProductById('68a186bb0717136a1a9245de', 0); // טעינה עם configIndex=0 לקבלת קונפיגורציות שמורות
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
        } else {
            this.isUserAuthenticated = false;
        }
    }
    
    
    // משתנה לשמירת הפרמטרים המקוריים של הדגם (ללא הגדרות שמורות)
    private originalProductParams: any[] = [];
    // Clear user configuration when switching products
    private clearUserConfiguration() {
        
        // ניקוי כל ההגדרות הקשורות למוצר הקודם
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (
                key &&
                (key.startsWith('beamConfig_') ||
                    key.startsWith('userConfig_') ||
                    key.startsWith('beam_'))
            ) {
                keysToRemove.push(key);
            }
        }
        
        
        keysToRemove.forEach((key) => {
            localStorage.removeItem(key);
        });
        
        // מחיקת קונפיגורציה כללית
        localStorage.removeItem('beam-configuration');
        
        
        // איפוס הפרמטרים לערכי ברירת המחדל
        this.resetParamsToDefaults();
    }
    
    getProductById(id: string, configIndex?: number) {
        
        this.http.get(`/api/products/${id}`).subscribe({
            next: (data) => {
                this.product = data;
                const prod: any = data;
                
                // 🎯 לוג חיפוש פרמטר leg בנתונים שהתקבלו מהבקאנד
                const legParam = prod.params?.find((p: any) => p.name === 'leg');
                if (legParam) {
                    console.log(`CHECK_LEG - getProductById: Found leg param in backend data`);
                    console.log(`CHECK_LEG - leg param from backend:`, JSON.stringify(legParam, null, 2));
                    console.log(`CHECK_LEG - leg beamsConfigurations:`, JSON.stringify(legParam.beamsConfigurations));
                    console.log(`CHECK_LEG - configIndex used:`, configIndex);
                    if (legParam.beamsConfigurations && configIndex !== undefined) {
                        console.log(`CHECK_LEG - leg beamsConfiguration at index ${configIndex}:`, legParam.beamsConfigurations[configIndex]);
                    }
                } else {
                    console.log(`CHECK_LEG - getProductById: NO leg param found in backend data!`);
                }
                
                // 🎯 CRITICAL: שמירת הפרמטרים המקוריים לפני עדכון הקונפיגורציות
                console.log('SAVE_PRO - Saving ORIGINAL params BEFORE applying configurations');
                this.originalProductParams = this.deepCopyParams(prod.params || []);
                console.log('SAVE_PRO - Original params saved:', JSON.stringify(this.originalProductParams.map(p => ({
                    name: p.name,
                    default: p.default,
                    isArray: Array.isArray(p.default)
                })), null, 2));

                // איפוס משתני הלוגים כדי לראות נתונים מעודכנים
                this.displayNameLogged = false;
                this.paramChangedLogged = false;
                
                // אם זה תת-מוצר (יש configIndex), נעדכן את הפרמטרים לפי ה-configuration
                if (configIndex !== undefined && prod.configurations && prod.configurations[configIndex]) {
                    console.log(`SAVE_PRO - Applying configuration #${configIndex}: ${prod.configurations[configIndex].translatedName}`);
                    prod.params = this.updateParamsWithConfiguration(prod.params, configIndex, prod);
                    prod.translatedName = prod.configurations[configIndex].translatedName;
                    prod.configurationName = prod.configurations[configIndex].name;
                    prod.configurationIndex = configIndex;
                }
                
                    // יצירת deep copy של הפרמטרים כדי למנוע שינוי של המקור
                    const paramsCopy = this.deepCopyParams(prod.params || []);
                    console.log('SAVE_PRO - Created paramsCopy with loaded configurations:', JSON.stringify(paramsCopy.map(p => ({
                        name: p.name,
                        default: p.default,
                        isArray: Array.isArray(p.default),
                        selectedBeamIndex: p.selectedBeamIndex,
                        pendingBeamConfig: p._pendingBeamConfig
                    })), null, 2));
                    
                    // CHECK_SHELF_BEAM: לוג מפורט על shelfs אחרי updateParamsWithConfiguration
                    const shelfsAfterUpdate = paramsCopy.find(p => p.name === 'shelfs');
                    if (shelfsAfterUpdate) {
                        console.log(`CHECK_SHELF_BEAM - After updateParamsWithConfiguration, shelfs state:`, JSON.stringify({
                            selectedBeamIndex: shelfsAfterUpdate.selectedBeamIndex,
                            selectedTypeIndex: shelfsAfterUpdate.selectedTypeIndex,
                            _pendingBeamConfig: shelfsAfterUpdate._pendingBeamConfig,
                            hasBeams: !!shelfsAfterUpdate.beams,
                            beamsLength: shelfsAfterUpdate.beams?.length || 0
                        }, null, 2));
                    }
                
                this.params = paramsCopy.map((param) => {
                    console.log(`SAVE_PRO - Processing param in paramsCopy.map: ${param.name}, type: ${param.type}, selectedBeamIndex: ${param.selectedBeamIndex}, hasPendingBeamConfig: ${!!param._pendingBeamConfig}`);
                    
                    // Set default selected beam and type for shelfs and beamSingle
                    if (
                        param.name === 'shelfs' &&
                        Array.isArray(param.beams) &&
                        param.beams.length
                    ) {
                        console.log(`CHECK_SHELF_BEAM - paramsCopy.map: Processing shelfs param`);
                        console.log(`CHECK_SHELF_BEAM - paramsCopy.map: Shelfs param check START:`, JSON.stringify({
                            selectedBeamIndex: param.selectedBeamIndex,
                            selectedTypeIndex: param.selectedTypeIndex,
                            hasPendingBeamConfig: !!param._pendingBeamConfig,
                            pendingBeamConfig: param._pendingBeamConfig || 'NONE',
                            beamsLength: param.beams?.length || 0,
                            configIndex: configIndex
                        }, null, 2));
                        
                        // 🎯 תמיד לבדוק _pendingBeamConfig אם הוא קיים, אפילו אם יש selectedBeamIndex
                        // כי הוא מכיל את הערך הנכון מהקונפיגורציה
                        if (param._pendingBeamConfig) {
                            console.log(`CHECK_SHELF_BEAM - paramsCopy.map: Processing _pendingBeamConfig for shelfs: ${param._pendingBeamConfig}`);
                            const [width, height] = param._pendingBeamConfig.split('-').map(Number);
                            
                            // חיפוש הקורה המתאימה ברשימה
                            let foundBeamIndex = -1;
                            let foundTypeIndex = -1;
                            
                            console.log(`CHECK_SHELF_BEAM - paramsCopy.map: Searching for shelfs beam: ${width}-${height} in ${param.beams?.length || 0} beams`);
                            
                            for (let beamIdx = 0; beamIdx < param.beams.length; beamIdx++) {
                                const beam = param.beams[beamIdx];
                                if (!beam) continue;
                                
                                // לוג רק אם זה התאמה או בקשות אחרונות כדי לא להציף
                                const matches = beam.width === width && beam.height === height;
                                if (matches || beamIdx === param.beams.length - 1) {
                                    console.log(`CHECK_SHELF_BEAM - paramsCopy.map: Checking shelfs beam ${beamIdx}:`, JSON.stringify({
                                        width: beam.width,
                                        height: beam.height,
                                        name: beam.name,
                                        translatedName: beam.translatedName,
                                        matches: matches,
                                        lookingFor: `${width}-${height}`
                                    }, null, 2));
                                }
                                
                                if (matches) {
                                    foundBeamIndex = beamIdx;
                                    foundTypeIndex = 0; // ברירת מחדל לסוג העץ הראשון
                                    console.log(`CHECK_SHELF_BEAM - paramsCopy.map: ✅ Found matching shelfs beam: beam=${beamIdx}, type=${foundTypeIndex} (${width}-${height})`);
                                    break;
                                }
                            }
                            
                            if (foundBeamIndex !== -1) {
                                // גם אם יש selectedBeamIndex קיים, עדכן אותו עם הערך הנכון
                                const oldIndex = param.selectedBeamIndex;
                                param.selectedBeamIndex = foundBeamIndex;
                                param.selectedTypeIndex = foundTypeIndex;
                                console.log(`CHECK_SHELF_BEAM - paramsCopy.map: ✅ Override: Set shelfs from index ${oldIndex} to beam index ${foundBeamIndex}, type index ${foundTypeIndex}`);
                                console.log(`CHECK_SHELF_BEAM - paramsCopy.map: Final state after override:`, JSON.stringify({
                                    selectedBeamIndex: param.selectedBeamIndex,
                                    selectedTypeIndex: param.selectedTypeIndex,
                                    beamConfig: `${width}-${height}`
                                }, null, 2));
                                // ניקוי _pendingBeamConfig כי מצאנו את הקורה
                                delete param._pendingBeamConfig;
                            } else {
                                console.log(`CHECK_SHELF_BEAM - paramsCopy.map: ❌ Could not find shelfs beam ${param._pendingBeamConfig} (looking for ${width}-${height}), will use ${param.selectedBeamIndex !== undefined && param.selectedBeamIndex !== null ? `existing index ${param.selectedBeamIndex}` : 'default'}`);
                                // אם לא מצאנו את הקורה, נשאיר את _pendingBeamConfig למקרה שיש עוד ניסיון
                            }
                        }
                        
                        // 🎯 רק אם לא כבר נקבע מהקונפיגורציה או מ-_pendingBeamConfig!
                        // חשוב: 0 הוא ערך תקין, אז צריך לבדוק רק undefined ו-null
                        console.log(`CHECK_SHELF_BEAM - paramsCopy.map: Final check for shelfs:`, JSON.stringify({
                            selectedBeamIndex: param.selectedBeamIndex,
                            selectedBeamIndexType: typeof param.selectedBeamIndex,
                            isUndefined: param.selectedBeamIndex === undefined,
                            isNull: param.selectedBeamIndex === null,
                            selectedTypeIndex: param.selectedTypeIndex
                        }, null, 2));
                        if (param.selectedBeamIndex === undefined || param.selectedBeamIndex === null) {
                            this.debugLog('Setting default beam for shelfs parameter');
                            const defaultBeamIndex = this.findDefaultBeamIndex(param.beams, param.defaultType);
                            param.selectedBeamIndex = defaultBeamIndex;
                        param.selectedTypeIndex =
                            Array.isArray(param.beams[defaultBeamIndex].types) &&
                            param.beams[defaultBeamIndex].types.length
                                ? 0
                                    : null;
                            console.log(`CHECK_SHELF_BEAM - paramsCopy.map: Set default beam index ${defaultBeamIndex} for shelfs`);
                            this.debugLog('Shelfs parameter set to beam index:', defaultBeamIndex, 'type index:', param.selectedTypeIndex);
                        } else {
                            console.log(`CHECK_SHELF_BEAM - paramsCopy.map: Shelfs parameter already has selectedBeamIndex: ${param.selectedBeamIndex}, selectedTypeIndex: ${param.selectedTypeIndex}`);
                            this.debugLog('Shelfs parameter already has selectedBeamIndex from configuration:', param.selectedBeamIndex, 'selectedTypeIndex:', param.selectedTypeIndex);
                        }
                        // CHACK_TEXTURE - Log texture loading information
                    }
                    if (
                        param.type === 'beamSingle' &&
                        Array.isArray(param.beams) &&
                        param.beams.length
                    ) {
                        this.debugLog('Setting default beam for beamSingle parameter:', param.name);
                        // 🎯 אם יש _pendingBeamConfig, נטפל בו כדי למצוא את האינדקס הנכון
                        if (param._pendingBeamConfig) {
                            console.log(`SAVE_PRO - Processing _pendingBeamConfig for ${param.name}: ${param._pendingBeamConfig}`);
                            const [width, height] = param._pendingBeamConfig.split('-').map(Number);
                            
                            // 🎯 לוג מיוחד עבור leg parameter
                            if (param.name === 'leg') {
                                console.log(`CHECK_LEG - Searching for beam: width=${width}, height=${height}`);
                            }
                            
                            // חיפוש הקורה המתאימה ברשימה
                            let foundBeamIndex = -1;
                            let foundTypeIndex = -1;
                            
                            for (let beamIdx = 0; beamIdx < param.beams.length; beamIdx++) {
                                const beam = param.beams[beamIdx];
                                console.log(`SAVE_PRO - Checking beam ${beamIdx}:`, JSON.stringify({
                                    width: beam.width,
                                    height: beam.height,
                                    name: beam.name,
                                    translatedName: beam.translatedName
                                }, null, 2));
                                
                                // 🎯 לוג מיוחד עבור leg parameter
                                if (param.name === 'leg') {
                                    console.log(`CHECK_LEG - Beam ${beamIdx} details:`, JSON.stringify({
                                        width: beam.width,
                                        height: beam.height,
                                        name: beam.name,
                                        translatedName: beam.translatedName,
                                        matchesWidth: beam.width === width,
                                        matchesHeight: beam.height === height,
                                        fullMatch: beam.width === width && beam.height === height
                                    }));
                                }
                                
                                // 🎯 תיקון: גובה הקורה נמצא ב-beam.height, לא ב-beam.types[].height
                                if (beam.width === width && beam.height === height) {
                                    foundBeamIndex = beamIdx;
                                    foundTypeIndex = 0; // ברירת מחדל לסוג העץ הראשון
                                    console.log(`SAVE_PRO - Found matching beam for ${param.name}: beam=${beamIdx}, type=${foundTypeIndex} (${width}-${height})`);
                                    
                                    // 🎯 לוג מיוחד עבור leg parameter
                                    if (param.name === 'leg') {
                                        console.log(`CHECK_LEG - FOUND MATCH! beam=${beamIdx}, type=${foundTypeIndex}`);
                                        console.log(`CHECK_LEG - Found beam details:`, JSON.stringify({
                                            beamIndex: beamIdx,
                                            typeIndex: foundTypeIndex,
                                            beamWidth: beam.width,
                                            beamHeight: beam.height,
                                            beamTranslatedName: beam.translatedName,
                                            expectedWidth: width,
                                            expectedHeight: height,
                                            matches: `${beam.width}-${beam.height}` === `${width}-${height}`
                                        }));
                                    }
                                    break;
                                }
                                if (foundBeamIndex !== -1) break;
                            }
                            
                            if (foundBeamIndex !== -1) {
                                param.selectedBeamIndex = foundBeamIndex;
                                param.selectedTypeIndex = foundTypeIndex;
                                console.log(`SAVE_PRO - Set ${param.name} to beam index ${foundBeamIndex}, type index ${foundTypeIndex}`);
                            } else {
                                console.log(`SAVE_PRO - Could not find beam ${param._pendingBeamConfig} for ${param.name}, using default`);
                                const defaultBeamIndex = this.findDefaultBeamIndex(param.beams, param.defaultType);
                                param.selectedBeamIndex = defaultBeamIndex;
                                param.selectedTypeIndex = 0;
                            }
                            
                            // 🎯 לוג מיוחד עבור leg parameter - תוצאות סופיות
                            if (param.name === 'leg') {
                                console.log(`CHECK_LEG - FINAL RESULT for leg: foundBeamIndex=${foundBeamIndex}, foundTypeIndex=${foundTypeIndex}`);
                                console.log(`CHECK_LEG - leg final selectedBeamIndex:`, param.selectedBeamIndex);
                                console.log(`CHECK_LEG - leg final selectedTypeIndex:`, param.selectedTypeIndex);
                                if (foundBeamIndex !== -1) {
                                    console.log(`CHECK_LEG - Selected beam details:`, JSON.stringify({
                                        beamIndex: foundBeamIndex,
                                        typeIndex: foundTypeIndex,
                                        beam: param.beams[foundBeamIndex],
                                        selectedType: param.beams[foundBeamIndex]?.types?.[foundTypeIndex]
                                    }));
                                }
                            }
                            
                            // ניקוי ה-_pendingBeamConfig
                            delete param._pendingBeamConfig;
                        }
                        // Only set default if selectedBeamIndex is not already set (same as shelfs)
                        else if (param.selectedBeamIndex === undefined || param.selectedBeamIndex === null) {
                            const defaultBeamIndex = this.findDefaultBeamIndex(param.beams, param.defaultType);
                            
                            // 🎯 לוג מיוחד עבור leg parameter - זה הקוד שדורס!
                            if (param.name === 'leg') {
                                console.log(`CHECK_LEG - PROBLEM! Overriding selectedBeamIndex from ${param.selectedBeamIndex} to ${defaultBeamIndex}`);
                            }
                            
                            param.selectedBeamIndex = defaultBeamIndex;
                            param.selectedTypeIndex =
                                Array.isArray(param.beams[defaultBeamIndex].types) &&
                                param.beams[defaultBeamIndex].types.length
                                    ? 0
                                    : null;
                            this.debugLog('BeamSingle parameter', param.name, 'set to beam index:', defaultBeamIndex, 'type index:', param.selectedTypeIndex);
                        } else {
                            // 🎯 לוג מיוחד עבור leg parameter
                            if (param.name === 'leg') {
                                console.log(`CHECK_LEG - Good! NOT overriding. selectedBeamIndex is:`, param.selectedBeamIndex);
                            }
                            this.debugLog('BeamSingle parameter', param.name, 'already has selectedBeamIndex:', param.selectedBeamIndex);
                        }
                    }
                    // טיפול בפרמטר beamArray עם setAmount עבור מוצר קורות
                    if (
                        param.name === 'beams' &&
                        param.setAmount === true &&
                        Array.isArray(param.beams) &&
                        param.beams.length
                    ) {
                        this.debugLog('Setting default beam for beams parameter with setAmount');
                        const defaultBeamIndex = this.findDefaultBeamIndex(param.beams, param.defaultType);
                        param.selectedBeamIndex = defaultBeamIndex;
                        param.selectedTypeIndex =
                            Array.isArray(param.beams[defaultBeamIndex].types) &&
                            param.beams[defaultBeamIndex].types.length
                                ? this.findDefaultTypeIndex(param.beams[defaultBeamIndex].types, param.defaultType)
                                : 0;
                        this.debugLog('Beams parameter with setAmount set to beam index:', defaultBeamIndex, 'type index:', param.selectedTypeIndex);
                
                        // המרה של ברירת המחדל למבנה עם setAmount
                        if (Array.isArray(param.default)) {
                            param.default = param.default.map((value: any) => {
                                if (typeof value === 'object' && value.length !== undefined) {
                                    // כבר במבנה הנכון
                                    return value;
                                } else {
                                    // המרה ממספר לאובייקט עם כמות 1
                                    return { length: value, amount: 1 };
                                }
                            });
                        }
                        this.debugLog('Beams parameter default array converted for setAmount:', param.default);
                    }
                    return param;
                });
                
                // 🎯 תיקון כללי: שמירת והשחזור של כל פרמטרים עם beamsConfigurations לפני ואחרי initParamsFromProduct
                // פרמטרים שעלולים להיפגע: shelfs (cabinet), plata (table/futon), beam (planter/box), leg (כל הרהיטים)
                const beamParamsToFix = ['shelfs', 'plata', 'beam', 'leg'];
                const savedBeamParams: Map<string, { savedSelectedBeamIndex: number | undefined, savedSelectedTypeIndex: number | null | undefined }> = new Map();
                
                // שמירת הערכים הנכונים לפני initParamsFromProduct
                beamParamsToFix.forEach(paramName => {
                    const paramBeforeInit = this.params.find(p => p.name === paramName);
                    if (!paramBeforeInit || !paramBeforeInit.beams || paramBeforeInit.beams.length === 0) {
                        return; // דילוג אם הפרמטר לא קיים או אין לו קורות
                    }
                    
                    let savedSelectedBeamIndex: number | undefined = undefined;
                    let savedSelectedTypeIndex: number | null | undefined = undefined;
                    
                    // שמירת הערך הנכון מהקונפיגורציה לפני initParamsFromProduct
                    if (configIndex !== undefined && prod.configurations && prod.configurations[configIndex]) {
                        if (paramBeforeInit.beamsConfigurations && paramBeforeInit.beamsConfigurations[configIndex]) {
                            const correctBeamConfig = paramBeforeInit.beamsConfigurations[configIndex]; // e.g., "50-50"
                            const [width, height] = correctBeamConfig.split('-').map(num => parseInt(num, 10));
                            const correctBeamIndex = paramBeforeInit.beams?.findIndex((beam: any) => 
                                beam && beam.width === width && beam.height === height
                            );
                            if (correctBeamIndex !== -1) {
                                savedSelectedBeamIndex = correctBeamIndex;
                                savedSelectedTypeIndex = 0;
                            }
                        }
                    }
                    
                    // אם לא מצאנו מהקונפיגורציה, נשמור את הערך הנוכחי (אם הוא קיים)
                    if (savedSelectedBeamIndex === undefined && paramBeforeInit.selectedBeamIndex !== undefined && paramBeforeInit.selectedBeamIndex !== null) {
                        savedSelectedBeamIndex = paramBeforeInit.selectedBeamIndex;
                        savedSelectedTypeIndex = paramBeforeInit.selectedTypeIndex;
                    }
                    
                    if (savedSelectedBeamIndex !== undefined) {
                        savedBeamParams.set(paramName, { savedSelectedBeamIndex, savedSelectedTypeIndex });
                        console.log(`CHECK_SHELF_BEAM - Before initParamsFromProduct [${paramName}]:`, JSON.stringify({
                            selectedBeamIndex: paramBeforeInit.selectedBeamIndex,
                            selectedTypeIndex: paramBeforeInit.selectedTypeIndex,
                            savedSelectedBeamIndex: savedSelectedBeamIndex,
                            savedSelectedTypeIndex: savedSelectedTypeIndex,
                            configIndex: configIndex
                        }, null, 2));
                    }
                });
                
                this.initParamsFromProduct();
                
                // 🎯 שחזור הערכים הנכונים אחרי initParamsFromProduct
                savedBeamParams.forEach((savedValues, paramName) => {
                    const paramAfterInit = this.params.find(p => p.name === paramName);
                    if (!paramAfterInit) {
                        return;
                    }
                    
                    console.log(`CHECK_SHELF_BEAM - After initParamsFromProduct (before restore) [${paramName}]:`, JSON.stringify({
                        selectedBeamIndex: paramAfterInit.selectedBeamIndex,
                        selectedTypeIndex: paramAfterInit.selectedTypeIndex,
                        savedSelectedBeamIndex: savedValues.savedSelectedBeamIndex,
                        configIndex: configIndex
                    }, null, 2));
                    
                    // שחזור הערך הנכון אם הוא נדרס
                    if (savedValues.savedSelectedBeamIndex !== undefined) {
                        if (paramAfterInit.selectedBeamIndex !== savedValues.savedSelectedBeamIndex) {
                            console.log(`CHECK_SHELF_BEAM - ✅ FIX: Restoring ${paramName} selectedBeamIndex from ${paramAfterInit.selectedBeamIndex} to ${savedValues.savedSelectedBeamIndex}`);
                            console.log(`CHECK_SHELF_BEAM - Restore fix details [${paramName}]:`, JSON.stringify({
                                oldIndex: paramAfterInit.selectedBeamIndex,
                                newIndex: savedValues.savedSelectedBeamIndex,
                                configIndex: configIndex
                            }, null, 2));
                            paramAfterInit.selectedBeamIndex = savedValues.savedSelectedBeamIndex;
                            paramAfterInit.selectedTypeIndex = savedValues.savedSelectedTypeIndex !== undefined ? savedValues.savedSelectedTypeIndex : 0;
                        } else {
                            console.log(`CHECK_SHELF_BEAM - ✅ No fix needed: ${paramName} selectedBeamIndex already correct (${savedValues.savedSelectedBeamIndex})`);
                        }
                    }
                    
                    // בדיקה סופית אחרי השחזור
                    const paramFinal = this.params.find(p => p.name === paramName);
                    console.log(`CHECK_SHELF_BEAM - After restore fix [${paramName}]:`, JSON.stringify({
                        selectedBeamIndex: paramFinal?.selectedBeamIndex,
                        selectedTypeIndex: paramFinal?.selectedTypeIndex,
                        configIndex: configIndex
                    }, null, 2));
                });
                
                // איפוס משתני הלוגים כדי לראות נתונים מעודכנים
                this.displayNameLogged = false;
                this.paramChangedLogged = false;
                
                // שמירת הפרמטרים המקוריים של הדגם (אחרי init) עם כל הערכים
                this.originalProductParams = this.deepCopyParams(this.params || []);
                
                // בדיקת מגבלות המוצר
                this.checkProductRestrictions(prod);
                
                this.debugLog('Product loaded:', data);
                this.debugLog('פרמטרים נטענו:', this.params);
                this.debugLog('זה שולחן?', this.isTable);
                this.debugLog('זה עדנית?', this.isPlanter);
                this.debugLog('האם יש התרעת מידות?', this.hasDimensionsAlert);
                // בדיקת פרמטרים ספציפיים
                const heightParam = this.params.find(
                    (p) => p.name === 'height'
                );
                const plataParam = this.params.find((p) => p.name === 'plata');
                this.debugLog('פרמטר height:', heightParam);
                this.debugLog('פרמטר plata:', plataParam);
                // Load saved configuration after product is loaded (only if same sub-product)
                const lastProductId = localStorage.getItem('lastSelectedProductId');
                const lastConfigIndex = localStorage.getItem('lastConfigIndex');
                const currentProductId = this.product?._id || this.selectedProductName;
                const currentConfigIndex = configIndex !== undefined ? configIndex.toString() : null;
                
                
                // יצירת מזהה ייחודי שכולל גם את ה-configIndex
                const lastFullId = lastConfigIndex !== null ? `${lastProductId}_config${lastConfigIndex}` : lastProductId;
                const currentFullId = currentConfigIndex !== null ? `${currentProductId}_config${currentConfigIndex}` : currentProductId;
                
                this.debugLog('CHACK-BEAM-MINI: [threejs-box] Checking if same sub-product:', { lastFullId, currentFullId });
                
                // Clear potentially incorrect localStorage values before loading configuration
                this.clearIncorrectLocalStorageValues();
                
                // Load saved configuration BEFORE updateBeams to ensure correct values are used for texture loading
                if (lastFullId === currentFullId) {
                    this.debugLog('CHACK-BEAM-MINI: [threejs-box] Same sub-product, loading saved configuration');
                this.loadConfiguration();
                } else {
                    this.debugLog('CHACK-BEAM-MINI: [threejs-box] Different sub-product, not loading configuration');
                }
                
                // 🎯 תיקון זמני לleg parameter לפני עדכון הbeams
                this.fixLegParameterIfNeeded();
                
                // טעינת woods לפני בדיקת hardness (אם עדיין לא נטענו)
                if (this.woods.length === 0) {
                    this.loadWoods();
                } else {
                    // אם woods כבר נטענו, רק בדוק hardness אחרי שה-params מוגדרים
                    setTimeout(() => {
                        this.checkWoodHardness();
                    }, 0);
                }
                
                this.updateBeams(true); // טעינת מוצר - עם אנימציה
            },
            error: (err) => {
                console.error('Failed to load product:', err);
            },
        });
    }
    // טעינת סוגי עצים מהמסד
    loadWoods() {
        this.http.get(`/api/woods`).subscribe({
            next: (data: any) => {
                this.woods = data;
                console.log('Loaded woods from DB:', JSON.stringify(this.woods, null, 2));
                // ביצוע בדיקות לאחר טעינת ה-woods (אם ה-params כבר מוגדרים)
                if (this.params && this.params.length > 0) {
                    this.runAllChecks();
                }
            },
            error: (err) => {
                console.error('Failed to load woods:', err);
                this.woods = []; // איפוס לרשימה ריקה במקרה של שגיאה
            }
        });
    }
    
    // פונקציה כללית להרצת כל הבדיקות
    runAllChecks() {
        // ניקוי cache לפני הרצת בדיקות חדשות
        this.clearPreliminaryDrillsInfoCache();
        
        // הרצת כל הבדיקות הנדרשות
        this.checkWoodHardness();
        this.checkDimensionRequirements();
        
        // עדכון preliminaryDrillsInfo לאחר הבדיקות
        this.getPreliminaryDrillsInfo();
        
        // לוג סיכום כל הבדיקות
        console.log(`INSTRUCTIONS_END - All checks summary:`, JSON.stringify({
            woodHardnessCheck: {
                totalParametersChecked: this.mustPerlimenaryScrewsByWoodTypeArray.length,
                parametersRequiringScrews: this.mustPerlimenaryScrewsByWoodTypeArray.filter(p => p.requiresPreliminaryScrews).length,
                resultsPerParameter: this.mustPerlimenaryScrewsByWoodTypeArray
            },
            dimensionCheck: {
                totalParametersChecked: this.mustPerlimenaryScrewsByDimensionArray.length,
                parametersRequiringScrews: this.mustPerlimenaryScrewsByDimensionArray.filter(p => p.requiresPreliminaryScrews).length,
                resultsPerParameter: this.mustPerlimenaryScrewsByDimensionArray
            },
            combinedResults: this.mustPerlimenaryScrewsByWoodTypeArray.map(woodResult => {
                const dimensionResult = this.mustPerlimenaryScrewsByDimensionArray.find(d => d.paramName === woodResult.paramName);
                return {
                    paramName: woodResult.paramName,
                    requiresPreliminaryScrewsByWoodType: woodResult.requiresPreliminaryScrews,
                    requiresPreliminaryScrewsByDimension: dimensionResult ? dimensionResult.requiresPreliminaryScrews : null,
                    requiresPreliminaryScrewsOverall: woodResult.requiresPreliminaryScrews || (dimensionResult ? dimensionResult.requiresPreliminaryScrews : false),
                    woodHardness: woodResult.woodHardness,
                    beamWidth: dimensionResult?.beamWidth,
                    beamHeight: dimensionResult?.beamHeight,
                    isLegBeam: dimensionResult?.isLegBeam
                };
            })
        }, null, 2));
    }
    
    // בדיקת hardness של סוגי העץ בשימוש - לכל פרמטר קורה בנפרד
    private checkWoodHardness() {
        // איפוס המערך
        this.mustPerlimenaryScrewsByWoodTypeArray = [];
        
        // מעבר על כל הפרמטרים של סוגי קורות - בדיקה נפרדת לכל פרמטר
        this.params.forEach(param => {
            // בדיקה אם זה פרמטר קורות (beamArray או beamSingle)
            if ((param.type === 'beamArray' || param.type === 'beamSingle') && 
                param.beams && Array.isArray(param.beams) &&
                param.selectedBeamIndex !== undefined && param.selectedBeamIndex !== null) {
                
                const selectedBeam = param.beams[param.selectedBeamIndex];
                if (selectedBeam && selectedBeam.types && Array.isArray(selectedBeam.types)) {
                    // בדיקה אם יש selectedTypeIndex נבחר
                    const selectedTypeIndex = param.selectedTypeIndex !== undefined && param.selectedTypeIndex !== null 
                        ? param.selectedTypeIndex 
                        : 0; // ברירת מחדל לסוג הראשון
                    
                    const selectedType = selectedBeam.types[selectedTypeIndex];
                    if (selectedType) {
                        // קבלת שם סוג העץ מ-type.name או type.woodType
                        const woodName = selectedType.name || selectedType.woodType || selectedType.wood;
                        if (woodName) {
                            // מציאת העץ ב-woods לפי name
                            const wood = this.woods.find(w => w.name === woodName);
                            let requiresPreliminaryScrews = false;
                            let woodHardness = null;
                            let translatedName = null;
                            let testResult = '';
                            
                            if (wood) {
                                woodHardness = wood.hardness;
                                translatedName = wood.translatedName;
                                const exceedsThreshold = wood.hardness > this.maxHardnessForPerlimenaryScrews;
                                requiresPreliminaryScrews = exceedsThreshold;
                                testResult = exceedsThreshold 
                                    ? `FAILED - hardness (${wood.hardness}) > maxHardness (${this.maxHardnessForPerlimenaryScrews})`
                                    : `PASSED - hardness (${wood.hardness}) <= maxHardness (${this.maxHardnessForPerlimenaryScrews})`;
                            } else {
                                // עץ לא נמצא ב-woods
                                requiresPreliminaryScrews = false;
                                testResult = `WOOD NOT FOUND IN DB - could not check hardness`;
                            }
                            
                            // הוספה למערך
                            this.mustPerlimenaryScrewsByWoodTypeArray.push({
                                paramName: param.name,
                                requiresPreliminaryScrews: requiresPreliminaryScrews,
                                woodName: woodName,
                                woodHardness: woodHardness,
                                translatedName: translatedName,
                                testResult: testResult
                            });
                        }
                    }
                }
            }
        });
        
        // לוג מפורט עם כל התוצאות
        const totalChecked = this.mustPerlimenaryScrewsByWoodTypeArray.length;
        const requiresScrews = this.mustPerlimenaryScrewsByWoodTypeArray.filter(p => p.requiresPreliminaryScrews).length;
        const passedTest = this.mustPerlimenaryScrewsByWoodTypeArray.filter(p => !p.requiresPreliminaryScrews && p.woodHardness !== null).length;
        
        console.log(`INSTRUCTIONS_START - Wood hardness check results (per parameter):`, JSON.stringify({
            maxHardnessForPerlimenaryScrews: this.maxHardnessForPerlimenaryScrews,
            totalParametersChecked: totalChecked,
            parametersRequiringScrews: requiresScrews,
            parametersPassedTest: passedTest,
            resultsPerParameter: this.mustPerlimenaryScrewsByWoodTypeArray,
            summary: requiresScrews > 0
                ? `REQUIRES PRELIMINARY SCREWS - ${requiresScrews} parameter(s) exceed hardness threshold`
                : `NO PRELIMINARY SCREWS REQUIRED - All parameters are within hardness threshold`
        }, null, 2));
    }
    
    // בדיקת מידות קורה - האם נדרשים קדחים מקדימים לפי מידות
    private checkDimensionRequirements() {
        // איפוס המערך
        this.mustPerlimenaryScrewsByDimensionArray = [];
        
        // מציאת ה-instruction של preliminary-drills
        const preliminaryDrillsInstruction = this.product?.instructions?.find((inst: any) => inst.name === 'preliminary-drills');
        
        if (!preliminaryDrillsInstruction) {
            // אין instruction של preliminary-drills - אין מה לבדוק
            return;
        }
        
        const legHeightThreshold = preliminaryDrillsInstruction['leg-height-threshold'];
        const legWidthThreshold = preliminaryDrillsInstruction['leg-width-threshold'];
        
        // מעבר על כל הפרמטרים של סוגי קורות - בדיקה נפרדת לכל פרמטר
        this.params.forEach(param => {
            // בדיקה אם זה פרמטר קורות (beamArray או beamSingle)
            if ((param.type === 'beamArray' || param.type === 'beamSingle') && 
                param.beams && Array.isArray(param.beams) &&
                param.selectedBeamIndex !== undefined && param.selectedBeamIndex !== null) {
                
                const selectedBeam = param.beams[param.selectedBeamIndex];
                if (selectedBeam) {
                    // המרת מידות ממ"מ לס"מ
                    const beamWidth = selectedBeam.width / 10; // רוחב הקורה בס"מ
                    const beamHeight = selectedBeam.height / 10; // גובה הקורה בס"מ
                    const isLegBeam = param.name === 'leg';
                    
                    let requiresPreliminaryScrews = false;
                    let testResult = '';
                    
                    // שלב 1: בדיקה אם height > leg-height-threshold
                    if (legHeightThreshold !== undefined && legHeightThreshold !== null) {
                        if (beamHeight > legHeightThreshold) {
                            requiresPreliminaryScrews = true;
                            testResult = `FAILED - beamHeight (${beamHeight}) > legHeightThreshold (${legHeightThreshold})`;
                        } else {
                            // שלב 2: אם height עבר, בדיקה אם זה leg
                            if (!isLegBeam) {
                                // שלב 3: לא leg - לא צריך קדחים מבחינת מידות
                                requiresPreliminaryScrews = false;
                                testResult = `PASSED - beamHeight (${beamHeight}) <= legHeightThreshold (${legHeightThreshold}) AND not a leg beam`;
                            } else {
                                // שלב 4: זה leg - בדיקת width (או height*2 אם is-reinforcement-beams-outside הוא true)
                                if (legWidthThreshold !== undefined && legWidthThreshold !== null) {
                                    // בדיקה אם יש פרמטר is-reinforcement-beams-outside ושווה ל-true
                                    const reinforcementBeamsOutsideParam = this.params.find(p => p.name === 'is-reinforcement-beams-outside');
                                    const isReinforcementBeamsOutside = reinforcementBeamsOutsideParam && 
                                                                       (reinforcementBeamsOutsideParam.editingValue !== undefined 
                                                                        ? reinforcementBeamsOutsideParam.editingValue 
                                                                        : reinforcementBeamsOutsideParam.default) === true;
                                    
                                    // אם is-reinforcement-beams-outside הוא true, נבדוק height*2 במקום width
                                    const valueToCheck = isReinforcementBeamsOutside ? (beamHeight * 2) : beamWidth;
                                    const valueName = isReinforcementBeamsOutside ? 'beamHeight*2' : 'beamWidth';
                                    
                                    if (valueToCheck > legWidthThreshold) {
                                        requiresPreliminaryScrews = true;
                                        testResult = `FAILED - isLegBeam=true AND ${valueName} (${valueToCheck}) > legWidthThreshold (${legWidthThreshold})${isReinforcementBeamsOutside ? ' (is-reinforcement-beams-outside=true)' : ''}`;
                                    } else {
                                        requiresPreliminaryScrews = false;
                                        testResult = `PASSED - isLegBeam=true AND ${valueName} (${valueToCheck}) <= legWidthThreshold (${legWidthThreshold}) AND beamHeight (${beamHeight}) <= legHeightThreshold (${legHeightThreshold})${isReinforcementBeamsOutside ? ' (is-reinforcement-beams-outside=true)' : ''}`;
                                    }
                                } else {
                                    // אין leg-width-threshold - רק height נבדק
                                    requiresPreliminaryScrews = false;
                                    testResult = `PASSED - isLegBeam=true BUT no legWidthThreshold defined, beamHeight (${beamHeight}) <= legHeightThreshold (${legHeightThreshold})`;
                                }
                            }
                        }
                    } else {
                        // אין leg-height-threshold - לא ניתן לבדוק
                        requiresPreliminaryScrews = false;
                        testResult = `SKIPPED - no legHeightThreshold defined in instructions`;
                    }
                    
                    // הוספה למערך
                    this.mustPerlimenaryScrewsByDimensionArray.push({
                        paramName: param.name,
                        requiresPreliminaryScrews: requiresPreliminaryScrews,
                        beamWidth: beamWidth,
                        beamHeight: beamHeight,
                        isLegBeam: isLegBeam,
                        legHeightThreshold: legHeightThreshold,
                        legWidthThreshold: legWidthThreshold,
                        testResult: testResult
                    });
                }
            }
        });
    }
    
    // קבלת מידע על קדחים מקדימים לכל קורה לתצוגה
    getPreliminaryDrillsInfo(): any[] {
        const results: any[] = [];
        
        // מעבר על כל הפרמטרים שיש להם תוצאות
        this.mustPerlimenaryScrewsByWoodTypeArray.forEach(woodResult => {
            const dimensionResult = this.mustPerlimenaryScrewsByDimensionArray.find(d => d.paramName === woodResult.paramName);
            const param = this.params.find(p => p.name === woodResult.paramName);
            
            if (!param || !param.beams || param.selectedBeamIndex === undefined) {
                return;
            }
            
            const selectedBeam = param.beams[param.selectedBeamIndex];
            if (!selectedBeam) {
                return;
            }
            
            const selectedTypeIndex = param.selectedTypeIndex !== undefined && param.selectedTypeIndex !== null 
                ? param.selectedTypeIndex 
                : 0;
            const selectedType = selectedBeam.types?.[selectedTypeIndex];
            
            // בניית שם הקורה
            const beamWidth = selectedBeam.width / 10;
            const beamHeight = selectedBeam.height / 10;
            
            // מציאת שם הקורה - נשתמש בשם הפרמטר בלבד (לא בשם הקורה שכולל כבר מידות)
            const beamTypeName = param.translatedName || woodResult.paramName;
            
            // שם סוג העץ - נשתמש רק ב-translatedName מהעץ, לא מ-woodResult (שיכול לכלול מידות)
            const woodTranslatedName = selectedType?.translatedName || '';
            
            // שם הקורה בפורמט: "קורת רגל, 5 על 2.5 ס"מ, אלון" (בלי כפילות)
            const beamDisplayName = `${beamTypeName}, ${beamWidth} על ${beamHeight} ס"מ${woodTranslatedName ? `, ${woodTranslatedName}` : ''}`;
            
            // קביעת המצב לפי שתי הבדיקות
            const requiresByWoodType = woodResult.requiresPreliminaryScrews;
            const requiresByDimension = dimensionResult ? dimensionResult.requiresPreliminaryScrews : false;
            
            // קביעת מפתח התרגום לפי המצב - עם שם הקורה
            let translationKey: string;
            let requiresPreliminaryScrews: boolean;
            
            if (!requiresByWoodType && !requiresByDimension) {
                // מצב 1: אין צורך בקדחים מקדימים
                translationKey = 'modify-product.preliminary-drills-not-required';
                requiresPreliminaryScrews = false;
            } else {
                // מצב 2-4: יש צורך בקדחים מקדימים (לא משנה הסיבה)
                translationKey = 'modify-product.preliminary-drills-required';
                requiresPreliminaryScrews = true;
            }
            
            results.push({
                paramName: woodResult.paramName,
                beamDisplayName: beamDisplayName,
                beamTypeName: beamTypeName, // שם הקורה ללא מידות (לצורך התרגום)
                requiresByWoodType: requiresByWoodType,
                requiresByDimension: requiresByDimension,
                requiresPreliminaryScrews: requiresPreliminaryScrews,
                translationKey: translationKey,
                woodTypeResult: woodResult.testResult || '',
                dimensionResult: dimensionResult ? dimensionResult.testResult : ''
            });
        });
        
        // שמירה ב-cache (לא בשימוש יותר - נשמר ל-compatibility)
        this.preliminaryDrillsInfoCache = results;
        return results;
    }
    
    // איפוס cache של preliminary drills info (כשצריך לעדכן)
    clearPreliminaryDrillsInfoCache() {
        this.preliminaryDrillsInfoCache = [];
    }
    
    // טעינת מוצר לפי שם
    getProductByName(name: string) {
        // טעינת woods לפני טעינת המוצר
        if (this.woods.length === 0) {
            this.loadWoods();
        }
        
        this.http.get(`/api/products/name/${name}`).subscribe({
            next: (data) => {
                this.product = data;
                const prod: any = data;
                
                // שמירת הפרמטרים המקוריים של הדגם (לפני כל שינוי)
                this.originalProductParams = this.deepCopyParams(prod.params || []);
                
                // איפוס משתני הלוגים כדי לראות נתונים מעודכנים
                this.displayNameLogged = false;
                this.paramChangedLogged = false;
                
                // יצירת deep copy של הפרמטרים כדי למנוע שינוי של המקור
                const paramsCopy = this.deepCopyParams(prod.params || []);
                
                this.params = paramsCopy.map((param) => {
                    // Set default selected beam and type for shelfs and beamSingle
                    if (
                        param.name === 'shelfs' &&
                        Array.isArray(param.beams) &&
                        param.beams.length
                    ) {
                        // 🎯 FIX: רק אם לא כבר נקבע מהקונפיגורציה!
                        if (param.selectedBeamIndex === undefined || param.selectedBeamIndex === null) {
                            this.debugLog('Setting default beam for shelfs parameter');
                            const defaultBeamIndex = this.findDefaultBeamIndex(param.beams, param.defaultType);
                            param.selectedBeamIndex = defaultBeamIndex;
                        param.selectedTypeIndex =
                            Array.isArray(param.beams[defaultBeamIndex].types) &&
                            param.beams[defaultBeamIndex].types.length
                                ? 0
                                    : null;
                            this.debugLog('Shelfs parameter set to beam index:', defaultBeamIndex, 'type index:', param.selectedTypeIndex);
                        } else {
                            this.debugLog('Shelfs parameter already has selectedBeamIndex from configuration:', param.selectedBeamIndex, 'selectedTypeIndex:', param.selectedTypeIndex);
                        }
                        // CHACK_TEXTURE - Log texture loading information
                    }
                    if (
                        param.type === 'beamSingle' &&
                        Array.isArray(param.beams) &&
                        param.beams.length
                    ) {
                        this.debugLog('Setting default beam for beamSingle parameter:', param.name);
                        // 🎯 אם יש _pendingBeamConfig, נטפל בו כדי למצוא את האינדקס הנכון
                        if (param._pendingBeamConfig) {
                            console.log(`SAVE_PRO - Processing _pendingBeamConfig for ${param.name}: ${param._pendingBeamConfig}`);
                            const [width, height] = param._pendingBeamConfig.split('-').map(Number);
                            
                            // 🎯 לוג מיוחד עבור leg parameter
                            if (param.name === 'leg') {
                                console.log(`CHECK_LEG - Searching for beam: width=${width}, height=${height}`);
                            }
                            
                            // חיפוש הקורה המתאימה ברשימה
                            let foundBeamIndex = -1;
                            let foundTypeIndex = -1;
                            
                            for (let beamIdx = 0; beamIdx < param.beams.length; beamIdx++) {
                                const beam = param.beams[beamIdx];
                                console.log(`SAVE_PRO - Checking beam ${beamIdx}:`, JSON.stringify({
                                    width: beam.width,
                                    height: beam.height,
                                    name: beam.name,
                                    translatedName: beam.translatedName
                                }, null, 2));
                                
                                // 🎯 לוג מיוחד עבור leg parameter
                                if (param.name === 'leg') {
                                    console.log(`CHECK_LEG - Beam ${beamIdx} details:`, JSON.stringify({
                                        width: beam.width,
                                        height: beam.height,
                                        name: beam.name,
                                        translatedName: beam.translatedName,
                                        matchesWidth: beam.width === width,
                                        matchesHeight: beam.height === height,
                                        fullMatch: beam.width === width && beam.height === height
                                    }));
                                }
                                
                                // 🎯 תיקון: גובה הקורה נמצא ב-beam.height, לא ב-beam.types[].height
                                if (beam.width === width && beam.height === height) {
                                    foundBeamIndex = beamIdx;
                                    foundTypeIndex = 0; // ברירת מחדל לסוג העץ הראשון
                                    console.log(`SAVE_PRO - Found matching beam for ${param.name}: beam=${beamIdx}, type=${foundTypeIndex} (${width}-${height})`);
                                    
                                    // 🎯 לוג מיוחד עבור leg parameter
                                    if (param.name === 'leg') {
                                        console.log(`CHECK_LEG - FOUND MATCH! beam=${beamIdx}, type=${foundTypeIndex}`);
                                        console.log(`CHECK_LEG - Found beam details:`, JSON.stringify({
                                            beamIndex: beamIdx,
                                            typeIndex: foundTypeIndex,
                                            beamWidth: beam.width,
                                            beamHeight: beam.height,
                                            beamTranslatedName: beam.translatedName,
                                            expectedWidth: width,
                                            expectedHeight: height,
                                            matches: `${beam.width}-${beam.height}` === `${width}-${height}`
                                        }));
                                    }
                                    break;
                                }
                                if (foundBeamIndex !== -1) break;
                            }
                            
                            if (foundBeamIndex !== -1) {
                                param.selectedBeamIndex = foundBeamIndex;
                                param.selectedTypeIndex = foundTypeIndex;
                                console.log(`SAVE_PRO - Set ${param.name} to beam index ${foundBeamIndex}, type index ${foundTypeIndex}`);
                            } else {
                                console.log(`SAVE_PRO - Could not find beam ${param._pendingBeamConfig} for ${param.name}, using default`);
                                const defaultBeamIndex = this.findDefaultBeamIndex(param.beams, param.defaultType);
                                param.selectedBeamIndex = defaultBeamIndex;
                                param.selectedTypeIndex = 0;
                            }
                            
                            // 🎯 לוג מיוחד עבור leg parameter - תוצאות סופיות
                            if (param.name === 'leg') {
                                console.log(`CHECK_LEG - FINAL RESULT for leg: foundBeamIndex=${foundBeamIndex}, foundTypeIndex=${foundTypeIndex}`);
                                console.log(`CHECK_LEG - leg final selectedBeamIndex:`, param.selectedBeamIndex);
                                console.log(`CHECK_LEG - leg final selectedTypeIndex:`, param.selectedTypeIndex);
                                if (foundBeamIndex !== -1) {
                                    console.log(`CHECK_LEG - Selected beam details:`, JSON.stringify({
                                        beamIndex: foundBeamIndex,
                                        typeIndex: foundTypeIndex,
                                        beam: param.beams[foundBeamIndex],
                                        selectedType: param.beams[foundBeamIndex]?.types?.[foundTypeIndex]
                                    }));
                                }
                            }
                            
                            // ניקוי ה-_pendingBeamConfig
                            delete param._pendingBeamConfig;
                        }
                        // Only set default if selectedBeamIndex is not already set (same as shelfs)
                        else if (param.selectedBeamIndex === undefined || param.selectedBeamIndex === null) {
                            const defaultBeamIndex = this.findDefaultBeamIndex(param.beams, param.defaultType);
                            
                            // 🎯 לוג מיוחד עבור leg parameter - זה הקוד שדורס!
                            if (param.name === 'leg') {
                                console.log(`CHECK_LEG - PROBLEM! Overriding selectedBeamIndex from ${param.selectedBeamIndex} to ${defaultBeamIndex}`);
                            }
                            
                            param.selectedBeamIndex = defaultBeamIndex;
                            param.selectedTypeIndex =
                                Array.isArray(param.beams[defaultBeamIndex].types) &&
                                param.beams[defaultBeamIndex].types.length
                                    ? 0
                                    : null;
                            this.debugLog('BeamSingle parameter', param.name, 'set to beam index:', defaultBeamIndex, 'type index:', param.selectedTypeIndex);
                        } else {
                            // 🎯 לוג מיוחד עבור leg parameter
                            if (param.name === 'leg') {
                                console.log(`CHECK_LEG - Good! NOT overriding. selectedBeamIndex is:`, param.selectedBeamIndex);
                            }
                            this.debugLog('BeamSingle parameter', param.name, 'already has selectedBeamIndex:', param.selectedBeamIndex);
                        }
                    }
                    // טיפול בפרמטר beamArray עם setAmount עבור מוצר קורות
                    if (
                        param.name === 'beams' &&
                        param.setAmount === true &&
                        Array.isArray(param.beams) &&
                        param.beams.length
                    ) {
                        this.debugLog('Setting default beam for beams parameter with setAmount');
                        const defaultBeamIndex = this.findDefaultBeamIndex(param.beams, param.defaultType);
                        param.selectedBeamIndex = defaultBeamIndex;
                        param.selectedTypeIndex =
                            Array.isArray(param.beams[defaultBeamIndex].types) &&
                            param.beams[defaultBeamIndex].types.length
                                ? this.findDefaultTypeIndex(param.beams[defaultBeamIndex].types, param.defaultType)
                                : 0;
                        this.debugLog('Beams parameter with setAmount set to beam index:', defaultBeamIndex, 'type index:', param.selectedTypeIndex);
                
                        // המרה של ברירת המחדל למבנה עם setAmount
                        if (Array.isArray(param.default)) {
                            param.default = param.default.map((value: any) => {
                                if (typeof value === 'object' && value.length !== undefined) {
                                    // כבר במבנה הנכון
                                    return value;
                                } else {
                                    // המרה ממספר לאובייקט עם כמות 1
                                    return { length: value, amount: 1 };
                                }
                            });
                        }
                        this.debugLog('Beams parameter default array converted for setAmount:', param.default);
                    }
                    return param;
                });
                this.initParamsFromProduct();
                
                // איפוס משתני הלוגים כדי לראות נתונים מעודכנים
                this.displayNameLogged = false;
                this.paramChangedLogged = false;
                
                // שמירת הפרמטרים המקוריים של הדגם (אחרי init) עם כל הערכים
                this.originalProductParams = this.deepCopyParams(this.params || []);
                
                // בדיקת מגבלות המוצר
                this.checkProductRestrictions(prod);
                
                this.debugLog('Product loaded by name:', data);
                this.debugLog('פרמטרים נטענו:', this.params);
                this.debugLog('זה שולחן?', this.isTable);
                this.debugLog('זה עדנית?', this.isPlanter);
                this.debugLog('האם יש התרעת מידות?', this.hasDimensionsAlert);
                // בדיקת פרמטרים ספציפיים
                const heightParam = this.params.find(
                    (p) => p.name === 'height'
                );
                const plataParam = this.params.find((p) => p.name === 'plata');
                this.debugLog('פרמטר height:', heightParam);
                this.debugLog('פרמטר plata:', plataParam);
                // Clear potentially incorrect localStorage values before loading configuration
                this.clearIncorrectLocalStorageValues();
                
                // Load saved configuration BEFORE updateBeams to ensure correct values are used for texture loading
                const lastProductId = localStorage.getItem('lastSelectedProductId');
                const currentProductId = this.product?._id || this.selectedProductName;
                if (lastProductId === currentProductId) {
                this.loadConfiguration();
                }
                
                // 🎯 תיקון זמני לleg parameter לפני עדכון הbeams
                this.fixLegParameterIfNeeded();
                
                // ביצוע כל הבדיקות לאחר שה-params מוגדרים
                if (this.woods.length > 0) {
                    this.runAllChecks();
                }
                
                this.updateBeams(true); // טעינת מוצר - עם אנימציה
            },
            error: (err) => {
                console.error('Failed to load product by name:', err);
                // אם לא נמצא מוצר לפי שם, ננסה לטעון מוצר ברירת מחדל
                this.getProductById('68a186bb0717136a1a9245de');
            },
        });
    }
    // Helper: get param by name
    getParam(name: string) {
        return this.params.find((p) => p.name === name);
    }
    // Validate parameter value and show message if needed
    validateParameterValue(param: any, value: number): number {
        let validatedValue = value;
        let message = '';
        
        // Debug log for futon parameters
        if (this.isFuton && (param.name === 'width' || param.name === 'depth')) {
            this.debugLog(`DEBUG FUTON VALIDATION - ${param.name}:`, {
                value: value,
                min: param.min,
                max: param.max,
                param: param
            });
        }
        
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
                verticalPosition: 'bottom',
                panelClass: ['custom-snackbar'],
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
    
    // פונקציה להוספת קורה עם אורך וכמות עבור setAmount
    addBeamWithAmount(param: any) {
        if (param && param.setAmount && Array.isArray(param.default)) {
            param.default.push({
                length: param.min,
                amount: 1
            });
            this.updateBeams();
        }
    }
    
    // פונקציה להמרת מבנה נתונים לזהה עם setAmount
    convertDefaultArrayForSetAmount(param: any) {
        if (param && param.setAmount && Array.isArray(param.default)) {
            param.default = param.default.map((value: any) => {
                if (typeof value === 'object' && value.length !== undefined) {
                    return value; // כבר במבנה הנכון
                } else {
                    return { length: value, amount: 1 }; // המרה ממספר לאובייקט
                }
            });
        }
    }
    
    // פונקציה להקטנת כמות
    decreaseAmount(param: any, index: number) {
        const idx = param.default.length - 1 - index;
        if (param.default[idx].amount > 1) {
            param.default[idx].amount--;
            this.updateBeams();
        }
    }
    
    // פונקציה להגדלת כמות
    increaseAmount(param: any, index: number) {
        const idx = param.default.length - 1 - index;
        param.default[idx].amount++;
        this.updateBeams();
    }
    // Numeric params
    get surfaceWidth(): number {
        const p = this.getParam('width');
        return p ? p.default : 100;
    }
    set surfaceWidth(val: number) {
        const p = this.getParam('width');
        if (p) {
            p.default = val;
            this.updateBeams();
    }
    }
    get surfaceLength(): number {
        const p = this.getParam('depth');
        return p ? p.default : 100;
    }
    set surfaceLength(val: number) {
        const p = this.getParam('depth');
        if (p) {
            p.default = val;
            this.updateBeams();
    }
    }
    get minGap(): number {
        const p = this.getParam('gap');
        return p ? p.default : 1;
    }
    set minGap(val: number) {
        const p = this.getParam('gap');
        if (p) {
            p.default = val;
            this.updateBeams();
    }
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
    beamWidth: number = 10;
    frameHeight: number = 5;
    beamHeight: number = 2;
    private beamMeshes: THREE.Mesh[] = [];
    private screwGroups: THREE.Group[] = []; // מערך לשמירת הברגים
    private coordinateAxes: THREE.Group[] = []; // מערך לשמירת החצים
    public showCoordinateAxes: boolean = false; // משתנה לשליטה בהצגת החצים
    @ViewChild('rendererContainer', { static: true })
    rendererContainer!: ElementRef;
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
        if (
            legParam &&
            Array.isArray(legParam.beams) &&
            legParam.beams.length
        ) {
            this.debugLog('Setting default beam for leg parameter');
            const defaultBeamIndex = this.findDefaultBeamIndex(legParam.beams, legParam.defaultType);
            legParam.selectedBeamIndex = legParam.selectedBeamIndex || defaultBeamIndex;
            legParam.selectedTypeIndex =
                legParam.selectedTypeIndex ||
                (Array.isArray(legParam.beams[defaultBeamIndex].types) &&
                legParam.beams[defaultBeamIndex].types.length
                    ? 0
                    : null);
            this.debugLog('Leg parameter set to beam index:', legParam.selectedBeamIndex, 'type index:', legParam.selectedTypeIndex);
        }
        // Example: set frameWidth/frameHeight if present in params
        // You can extend this to other params as needed
        // וידוא שהערכים מתאפסים לברירת המחדל כשעוברים למוצר חדש
        this.resetParamsToDefaults();
    }
    // Reset all parameters to their default values
    private resetParamsToDefaults() {
        this.debugLog(
            'Resetting parameters to defaults. Current params:',
            this.params
        );
        this.params.forEach((param) => {
            this.debugLog(
                'Resetting param:',
                param.name,
                'current default:',
                param.default
            );
            // איפוס ערכי ברירת מחדל
            if (param.default !== undefined) {
                param.default = param.default; // שמירה על הערך המקורי
            }
            // איפוס בחירות קורות
            if (param.type === 'beamSingle' || param.name === 'shelfs') {
                if (Array.isArray(param.beams) && param.beams.length) {
                    this.debugLog('Resetting beam selection for parameter:', param.name);
                    const defaultBeamIndex = this.findDefaultBeamIndex(param.beams, param.defaultType);
                    param.selectedBeamIndex = defaultBeamIndex;
                    param.selectedTypeIndex =
                        Array.isArray(param.beams[defaultBeamIndex].types) &&
                        param.beams[defaultBeamIndex].types.length
                            ? 0
                            : null;
                    this.debugLog(
                        'Reset beam selection for:',
                        param.name,
                        'to beam', defaultBeamIndex, ', type 0'
                    );
                }
            }
        });
        this.debugLog('Parameters reset to defaults for new product');
    }
    // Get wood texture based on beam type
    private getWoodTexture(beamType: string): THREE.Texture {
        let texturePath = 'assets/textures/pine.jpg'; // default
        if (beamType) {
            texturePath = 'assets/textures/' + beamType + '.jpg';
        } else {
            texturePath = 'assets/textures/pine.jpg';
        }
        return this.textureLoader.load(texturePath);
    }
    
    // Get wood material with optional transparency
    private getWoodMaterial(beamType: string): THREE.MeshStandardMaterial {
        const texture = this.getWoodTexture(beamType);
        const material = new THREE.MeshStandardMaterial({
            map: texture,
        });
        
        // אם במצב שקוף, הפוך את הקורות לשקופות כמעט לחלוטין (לא במוצר קורות)
        if (this.isTransparentMode && !this.isBelams) {
            material.transparent = true;
            material.opacity = 0.1; // 10% שקיפות
        }
        
        return material;
    }
    
    // Add wireframe edges to a mesh (for transparent mode)
    private addWireframeToBeam(mesh: THREE.Mesh) {
        if (this.isTransparentMode && !this.isBelams) {
            const edges = new THREE.EdgesGeometry(mesh.geometry);
            const lineMaterial = new THREE.LineBasicMaterial({ 
                color: 0x4a3520, // חום כהה
                linewidth: 1,
                transparent: true,
                opacity: 0.3 // 50% שקיפות
            });
            const wireframe = new THREE.LineSegments(edges, lineMaterial);
            mesh.add(wireframe);
        }
    }
    // Save current configuration (user-specific or localStorage)
    private saveConfiguration() {
        const config = {
            params: this.params.map((param) => ({
                name: param.name,
                default: param.default,
                selectedBeamIndex: param.selectedBeamIndex,
                selectedTypeIndex: param.selectedTypeIndex,
            })),
            timestamp: new Date().toISOString(),
        };
        // Always save to localStorage to avoid server issues
            this.saveConfigurationToLocalStorage(config);
        
        // Server saving disabled to avoid CORS and authentication errors
        // TODO: Re-enable when backend is properly configured
    }
    // Save configuration to server (for authenticated users)
    private saveConfigurationToServer(config: any) {
        const headers = new HttpHeaders({
            Authorization: `Bearer ${this.authToken}`,
            'Content-Type': 'application/json',
        });
        this.http
            .post(
                '/api/user/beam-configuration',
                { configuration: config },
                { headers }
            )
            .subscribe({
                next: (response) => {
                    this.debugLog('Configuration saved to server:', response);
                },
                error: (error) => {
                    console.error(
                        'Error saving to server, falling back to localStorage:',
                        error
                    );
                    this.saveConfigurationToLocalStorage(config);
                },
            });
    }
    // Save configuration to localStorage (fallback)
    private saveConfigurationToLocalStorage(config: any) {
        localStorage.setItem('beam-configuration', JSON.stringify(config));
    }
    // Load saved configuration (always use localStorage for now)
    private loadConfiguration() {
        
        // Always use localStorage to avoid authentication issues
            this.loadConfigurationFromLocalStorage();
        
        // Server configuration loading disabled to avoid CORS and authentication errors
        // TODO: Re-enable when backend is properly configured
    }
    
    // Load configuration from server (for authenticated users)
    private loadConfigurationFromServer() {
        const headers = new HttpHeaders({
            Authorization: `Bearer ${this.authToken}`,
        });
        this.http.get('/api/user/beam-configuration', { headers }).subscribe({
                next: (response: any) => {
                if (
                    response.configuration &&
                    Object.keys(response.configuration).length > 0
                ) {
                        this.applyConfiguration(response.configuration);
                    } else {
                        // No server config, try localStorage
                        this.loadConfigurationFromLocalStorage();
                    }
                },
                error: (error) => {
                console.error(
                    'Error loading from server, falling back to localStorage:',
                    error
                );
                    this.loadConfigurationFromLocalStorage();
            },
            });
    }
    
    // Load configuration from server silently (background, non-blocking)
    private loadConfigurationFromServerSilently() {
        const headers = new HttpHeaders({
            Authorization: `Bearer ${this.authToken}`,
        });
        this.http.get('/api/user/beam-configuration', { headers }).subscribe({
                next: (response: any) => {
                if (
                    response.configuration &&
                    Object.keys(response.configuration).length > 0
                ) {
                        // Only apply server config if it's different from localStorage
                        const localConfig = localStorage.getItem('beam-configuration');
                        if (!localConfig || JSON.stringify(response.configuration) !== localConfig) {
                            this.applyConfiguration(response.configuration);
                        }
                    }
                },
                error: (error) => {
                    // Silently ignore server errors - localStorage is already loaded
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
            } catch (error) {
                console.error('EDIT_PRODUCT - Error loading configuration from localStorage:', error);
            }
        } else {
        }
    }
    
    // Clear potentially incorrect localStorage values
    private clearIncorrectLocalStorageValues() {
        // Clear selectedTypeIndex for shelfs parameter to prevent incorrect texture loading
        const shelfsTypeKey = `selectedTypeIndex_${this.product?.name}_shelfs`;
        const savedShelfsType = localStorage.getItem(shelfsTypeKey);
        
        
        // If the saved value is 0 (pine) but we want oak, clear it to force fresh selection
        if (savedShelfsType === '0') {
            localStorage.removeItem(shelfsTypeKey);
        }
    }

    // Apply configuration to params
    private applyConfiguration(config: any) {
        
        if (config.params) {
            
            config.params.forEach((savedParam) => {
                
                const param = this.params.find(
                    (p) => p.name === savedParam.name
                );
                if (param) {
                    
                    param.default = savedParam.default;
                    param.selectedBeamIndex = savedParam.selectedBeamIndex;
                    param.selectedTypeIndex = savedParam.selectedTypeIndex;
                    
                    
                    // CHACK_TEXTURE - Log when localStorage data is applied to inputs
                    if (param.name === 'shelfs' || param.type === 'beamSingle') {
                    }
                }
            });
            
            // CHACK_TEXTURE - Log after applyConfiguration to see what happens after localStorage
            const shelfsParamAfter = this.params.find(p => p.name === 'shelfs');
            if (shelfsParamAfter) {
            }
    }

        // כיבוי loading אחרי הטעינה הראשונית
        this.isLoading = false;
    }
    ngAfterViewInit() {
        this.initThree();
        this.onResize();
        window.addEventListener('resize', this.onResizeBound);
        this.rendererContainer.nativeElement.addEventListener(
            'wheel',
            (event: WheelEvent) => {
            event.preventDefault();
            // סגירת חלונית חישוב המחיר בזום
            this.isPriceManuOpen = false;
            // סגירת תפריט שלוש הנקודות בזום
            this.isOptionsMenuOpen = false;
            const delta = event.deltaY;
            const zoomAmount = delta * 0.1; // פי 2 יותר מהיר (0.05 -> 0.1)
            const currentDistance = this.camera.position.distanceTo(new THREE.Vector3(0, 0, 0));
            let newDistance = currentDistance + zoomAmount;
            if (newDistance < 1) newDistance = 1;
            const direction = this.camera.position.clone().normalize();
            this.camera.position.copy(direction.multiplyScalar(newDistance));
            },
            { passive: false }
        );
        let isDragging = false;
        let lastX = 0;
        let lastY = 0;
        this.rendererContainer.nativeElement.addEventListener(
            'mousedown',
            (event: MouseEvent) => {
            // סגירת חלונית חישוב המחיר בלחיצת עכבר
            this.isPriceManuOpen = false;
            // סגירת תפריט שלוש הנקודות בלחיצת עכבר
            this.isOptionsMenuOpen = false;
            isDragging = true;
            lastX = event.clientX;
            lastY = event.clientY;
            }
        );
        window.addEventListener('mousemove', (event: MouseEvent) => {
            if (!isDragging) return;
            // סגירת תפריט שלוש הנקודות בתנועת עכבר
            this.isOptionsMenuOpen = false;
            // בדיקה אם זה pan (גלגל עכבר או כפתור ימני)
            const isCurrentlyPanning = event.buttons === 4 || event.buttons === 2; // גלגל עכבר = 4, כפתור ימני = 2
            const dx = event.clientX - lastX;
            const dy = event.clientY - lastY;
            lastX = event.clientX;
            lastY = event.clientY;
            if (isCurrentlyPanning) {
                // Pan - הזזת המצלמה כמו בקובץ ה-mini
                const panSpeed = 0.2;
                const panX = dx * panSpeed;
                const panY = -dy * panSpeed;
                const cam = this.camera;
                const pan = new THREE.Vector3();
                pan.addScaledVector(new THREE.Vector3().setFromMatrixColumn(cam.matrix, 0), panX);
                pan.addScaledVector(new THREE.Vector3().setFromMatrixColumn(cam.matrix, 1), panY);
                cam.position.add(pan);
                // הזזת הסצנה במקום המצלמה
                this.scene.position.add(pan);
            } else {
                const angleY = dx * 0.01; // תיקון כיוון הסיבוב
                const angleX = dy * 0.01; // תיקון כיוון הסיבוב
                
                // חישוב מרכז קוביית ה-wireframe
                const dimensions = this.getProductDimensionsRaw();
                const wireframeCenter = new THREE.Vector3(0, dimensions.height / 2, 0);
                
                // סיבוב סביב מרכז ה-wireframe במקום (0,0,0)
                const offset = this.camera.position.clone().sub(wireframeCenter);
                const spherical = new THREE.Spherical().setFromVector3(offset);
                spherical.theta -= angleY;
                spherical.phi -= angleX;
                spherical.phi = Math.max(
                    0.01,
                    Math.min(Math.PI - 0.01, spherical.phi)
                );
                this.camera.position.copy(wireframeCenter.clone().add(new THREE.Vector3().setFromSpherical(spherical)));
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
        let lastTouchCenterX = 0; // מרכז 2 אצבעות - X
        let lastTouchCenterY = 0; // מרכז 2 אצבעות - Y
        let isTouchRotating = false;
        let isTouchZooming = false;
        let isTouchPanning = false;
        this.rendererContainer.nativeElement.addEventListener(
            'touchstart',
            (event: TouchEvent) => {
            // סגירת חלונית חישוב המחיר במגע
            this.isPriceManuOpen = false;
            // סגירת תפריט שלוש הנקודות במגע
            this.isOptionsMenuOpen = false;
            if (event.touches.length === 1) {
                isTouchRotating = true;
                lastTouchX = event.touches[0].clientX;
                lastTouchY = event.touches[0].clientY;
            } else if (event.touches.length === 2) {
                isTouchZooming = true;
                isTouchPanning = true; // הפעלת pan עם 2 אצבעות
                    const dx =
                        event.touches[0].clientX - event.touches[1].clientX;
                    const dy =
                        event.touches[0].clientY - event.touches[1].clientY;
                lastTouchDist = Math.sqrt(dx * dx + dy * dy);
                lastTouchAngle = Math.atan2(dy, dx);
                // שמירת מרכז 2 האצבעות
                lastTouchCenterX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
                lastTouchCenterY = (event.touches[0].clientY + event.touches[1].clientY) / 2;
            }
            },
            { passive: false }
        );
        this.rendererContainer.nativeElement.addEventListener(
            'touchmove',
            (event: TouchEvent) => {
            event.preventDefault();
            // סגירת תפריט שלוש הנקודות בתנועת מגע
            this.isOptionsMenuOpen = false;
            if (isTouchRotating && event.touches.length === 1) {
                const touch = event.touches[0];
                const dx = touch.clientX - lastTouchX;
                const dy = touch.clientY - lastTouchY;
                lastTouchX = touch.clientX;
                lastTouchY = touch.clientY;
                const angleY = dx * 0.01;
                const angleX = dy * 0.01;
                const offset = this.camera.position.clone();
                const spherical = new THREE.Spherical().setFromVector3(offset);
                spherical.theta -= angleY;
                spherical.phi -= angleX;
                    spherical.phi = Math.max(
                        0.01,
                        Math.min(Math.PI - 0.01, spherical.phi)
                    );
                this.camera.position.setFromSpherical(spherical);
            } else if (isTouchZooming && event.touches.length === 2) {
                    const dx =
                        event.touches[0].clientX - event.touches[1].clientX;
                    const dy =
                        event.touches[0].clientY - event.touches[1].clientY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx);
                
                // Pan עם 2 אצבעות (כמו במובייל רגיל)
                if (isTouchPanning) {
                    const centerX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
                    const centerY = (event.touches[0].clientY + event.touches[1].clientY) / 2;
                    const deltaCenterX = centerX - lastTouchCenterX;
                    const deltaCenterY = centerY - lastTouchCenterY;
                    
                    // Pan התמונה (הזזת הסצנה)
                    const cam = this.camera;
                    const pan = new THREE.Vector3();
                    pan.addScaledVector(new THREE.Vector3().setFromMatrixColumn(cam.matrix, 0), -deltaCenterX * 0.2);
                    pan.addScaledVector(new THREE.Vector3().setFromMatrixColumn(cam.matrix, 1), deltaCenterY * 0.2);
                    this.scene.position.add(pan);
                    
                    lastTouchCenterX = centerX;
                    lastTouchCenterY = centerY;
                }
                
                // Pinch zoom
                const deltaDist = dist - lastTouchDist;
                const direction = this.camera.position.clone().normalize();
                const distance = this.camera.position.distanceTo(new THREE.Vector3(0, 0, 0));
                const zoomAmount = -deltaDist * 0.02 * (distance / 100);
                let newDistance = distance + zoomAmount;
                if (newDistance < 1) newDistance = 1;
                this.camera.position.copy(direction.multiplyScalar(newDistance));
                lastTouchDist = dist;
                // Two-finger rotate (optional)
                const deltaAngle = angle - lastTouchAngle;
                if (Math.abs(deltaAngle) > 0.01) {
                    const offset = this.camera.position.clone();
                    const spherical = new THREE.Spherical().setFromVector3(offset);
                    spherical.theta -= deltaAngle;
                    this.camera.position.setFromSpherical(spherical);
                    lastTouchAngle = angle;
                }
            }
            },
            { passive: false }
        );
        this.rendererContainer.nativeElement.addEventListener(
            'touchend',
            (event: TouchEvent) => {
            isTouchRotating = false;
            isTouchZooming = false;
            isTouchPanning = false;
            }
        );
        // Start animation loop
        this.animate();
    }
    ngOnDestroy() {
        // מחיקת הגדרות מוצר מ-localStorage כשעוזבים את העמוד
        this.clearProductSettingsFromStorage();
        
        window.removeEventListener('resize', this.onResizeBound);
    }
    
    /**
     * מחיקת כל ההגדרות של המוצר מ-localStorage
     */
    private clearProductSettingsFromStorage(): void {
        try {
            // מחיקת כל המפתחות הקשורים למוצרים
            const keysToRemove: string[] = [];
            
            // חיפוש כל המפתחות ב-localStorage שמתחילים ב-selectedBeamIndex_
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('selectedBeamIndex_')) {
                    keysToRemove.push(key);
                }
            }
            
            // מחיקת כל המפתחות שנמצאו
            keysToRemove.forEach(key => {
                localStorage.removeItem(key);
            });
            
        } catch (error) {
            console.error('❌ Error clearing product settings from localStorage:', error);
        }
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
            color: 0xf0f0f0, // Much whiter floor
            transparent: true,
            opacity: 0.5, // 50% שקיפות
            roughness: 0.1, // חלקות נמוכה לרפלקציה
            metalness: 0.0, // לא מתכתי
            reflectivity: 0.25, // 25% רפלקציה
            clearcoat: 0.1, // שכבה שקופה דקה
            clearcoatRoughness: 0.1,
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
        this.camera = new THREE.PerspectiveCamera(
            40,
            width / height,
            0.1,
            30000
        );
        // Set camera at default position
        this.camera.position.set(0, 200, 400);
        this.camera.lookAt(0, 0, 0);
        // PAN למטה של 200 פיקסלים - הזזת הסצנה
        // get total model height
        const dimensions = this.getProductDimensionsRaw();
        // this.scene.position.y = -120; // הוסר מכאן - יוגדר רק עבור beams
        
        // מרכוז המצלמה על קוביית ה-wireframe - רק אחרי שהמוצר נטען
        // this.centerCameraOnWireframe(); // הוסר מכאן
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
        const hemisphereLight = new THREE.HemisphereLight(
            0xf8f8f8,
            0xd0d0d0,
            0.6
        );
        this.scene.add(hemisphereLight);
        // Point light for accent
        const pointLight = new THREE.PointLight(0xffffff, 0.5, 200);
        pointLight.position.set(0, 100, 0);
        this.scene.add(pointLight);
        
        // החצים יוצגו רק לפי בקשה מהמשתמש
        // this.addCoordinateAxes();
        
        this.beamMeshes = [];
    }
    private onResize() {
        this.onResizeWithoutReset();
        
        // איפוס קוביית הניווט במובייל בשינוי גודל
        this.showNavigationCube = false;
    }
    
    private onResizeWithoutReset() {
        const container = this.rendererContainer?.nativeElement as HTMLElement;
        if (!container || !this.camera || !this.renderer) return;
        const width = container.clientWidth;
        const height = container.clientHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        
        // במובייל, להסיר את הקוביה אם היא מוצגת
        const isMobile = window.innerWidth <= 576;
        if (isMobile && this.showWireframe) {
            this.removeWireframeCube();
        } else if (!isMobile && this.showWireframe) {
            this.addWireframeCube();
        }
        
        // הפעלת resetCameraView אחרי שניה משינוי גודל המסך
        setTimeout(() => {
            this.resetCameraView();
        }, 1000);
    }
    private _updateBeamsInFlight: boolean = false;
    private _pendingUpdateBeams: UpdateBeamsOptions | null = null;
    private _prelimLogPrintedThisCycle: boolean = false;
    private _updateBeamsStartTs: number = 0;
    // Cache for last visibility state to optimize updates
    private _lastVisibilityState: { shouldShowLegBeams: boolean; shouldShowShelfBeams: boolean; shouldShowReinforcementBeams: boolean; activeCompositeKey: string | null } | null = null;
    // Track mesh categories for efficient visibility toggling
    private _meshCategories: Map<string, THREE.Object3D[]> = new Map();
    async updateBeams(isInitialLoad: boolean = false, options: UpdateBeamsOptions = {}) {
        // מניעת ריצות חופפות - אם יש ריצה, נשמור בקשה אחת לעדכון נוסף ונצא
        if (this._updateBeamsInFlight) {
            this._pendingUpdateBeams = options || { skipPricing: true };
            console.log('CHACH_3D_DELAY UPDATE_ALREADY_IN_FLIGHT', JSON.stringify({ isInitialLoad, options, pending: this._pendingUpdateBeams }, null, 2));
            return;
        }
        this._updateBeamsInFlight = true;
        this._prelimLogPrintedThisCycle = false;
        this._updateBeamsStartTs = (typeof performance !== 'undefined' && (performance as any).now) ? (performance as any).now() : Date.now();
        console.log('CHACH_3D_DELAY UPDATE_START', JSON.stringify({ isInitialLoad, options }, null, 2));
        const skipPricing = options?.skipPricing === true;
        this.shouldSkipPricing = skipPricing;
        if (skipPricing) {
            this.priceSnapshotBeforeSkip = this.calculatedPrice;
        } else {
            this.priceSnapshotBeforeSkip = null;
        }
        try {
        // 🎯 איפוס משתני לוגים חד פעמיים
        this.futonLegBeamLogged = false;
        this.reinforcementDecisionLogSignatures.clear();
        this.reinforcementRenderLogSignatures.clear();
        this.reinforcementRenderSkipLogSignatures.clear();
        
        // CHACH_ALLERT - Log when updateBeams is called
        
        // CHACK_TEXTURE - Log parameter state at start of updateBeams
        const shelfsParamStart = this.params.find(p => p.name === 'shelfs');
        if (shelfsParamStart) {
        }
        
        if (!skipPricing) {
            // איפוס מחיר להצגת "מחשב מחיר..."
            this.calculatedPrice = 0;

            // הפעלת loading
            this.isLoading = true;
            this.isModelLoading = true;
        }
        
        // Save current configuration to localStorage
        this.saveConfiguration();
        
        // איפוס המשתנים הבוליאניים לבדיקת קורות מוסתרות
        this.hasHiddenBeams = false;
        this.hiddenBeamsCount = 0;
        this.hasNoMiddleBeams = false;
        this.hasShortenedBeamsRemoved = false;
        
        // חישוב מחיר יבוצע ברקע אחרי הרינדור
        
        // 🎯 חישוב פעם אחת של מצב preliminary-drills ו-activeCompositeKey כדי למנוע קריאות חוזרות
        const isPreliminaryDrills = this.isPreliminaryDrillsMode(true); // skipLog = true
        const firstPendingDrillInfo = isPreliminaryDrills ? this.getFirstPendingPreliminaryDrill() : null;
        const rawFirstUncheckedCompositeKey = isPreliminaryDrills ? this.getFirstUncheckedBeamParamName() : null;
        const activeCompositeKeyGlobal = firstPendingDrillInfo?.compositeKey || rawFirstUncheckedCompositeKey || null;
        console.log('CHACH_3D_DELAY PRELIM_STATE', JSON.stringify({ isPreliminaryDrills, activeCompositeKey: activeCompositeKeyGlobal }, null, 2));
        
        // ניקוי קורות
        const clearStartTime = performance.now();
        console.log('CHACH_3D_DELAY CLEAR_START', JSON.stringify({ 
            beamMeshes: this.beamMeshes?.length || 0, 
            screwGroups: this.screwGroups?.length || 0,
            timestamp: clearStartTime
        }, null, 2));
        // Clear mesh categories
        this._meshCategories.clear();
        
        // Optimize disposal: batch disposal operations
        const meshesToDispose: THREE.Mesh[] = [];
        const groupsToDispose: THREE.Group[] = [];
        const removeStartTime = performance.now();
        
        this.beamMeshes.forEach((mesh) => {
            this.scene.remove(mesh);
            if (mesh instanceof THREE.Group) {
                groupsToDispose.push(mesh);
            } else {
                meshesToDispose.push(mesh as THREE.Mesh);
            }
        });
        const removeEndTime = performance.now();
        console.log('CHACH_3D_DELAY CLEAR_REMOVE_FROM_SCENE', JSON.stringify({
            meshCount: this.beamMeshes.length,
            meshesToDispose: meshesToDispose.length,
            groupsToDispose: groupsToDispose.length,
            removeDuration: removeEndTime - removeStartTime,
            timestamp: removeEndTime
        }, null, 2));
        
        // Batch dispose geometries and materials asynchronously to avoid blocking
        if (meshesToDispose.length > 0 || groupsToDispose.length > 0) {
            // Dispose synchronously for small numbers, asynchronously for large
            const totalMeshes = meshesToDispose.length + groupsToDispose.reduce((sum, g) => sum + g.children.length, 0);
            const disposeStartTime = performance.now();
            console.log('CHACH_3D_DELAY CLEAR_DISPOSE_START', JSON.stringify({
                totalMeshes,
                meshesToDispose: meshesToDispose.length,
                groupsToDispose: groupsToDispose.length,
                willDisposeAsync: totalMeshes > 50,
                timestamp: disposeStartTime
            }, null, 2));
            
            if (totalMeshes > 50) {
                // Large number - dispose asynchronously in batches using requestAnimationFrame to avoid blocking
                const asyncDisposeStart = performance.now();
                const BATCH_SIZE = 20; // Dispose 20 meshes per frame to avoid blocking
                let meshIndex = 0;
                let groupIndex = 0;
                
                const disposeBatch = () => {
                    const batchStart = performance.now();
                    let processed = 0;
                    
                    // Process meshes in batch
                    while (meshIndex < meshesToDispose.length && processed < BATCH_SIZE) {
                        const mesh = meshesToDispose[meshIndex];
                        mesh.geometry.dispose();
                        (mesh.material as THREE.Material).dispose();
                        meshIndex++;
                        processed++;
                    }
                    
                    // Process groups in batch
                    while (groupIndex < groupsToDispose.length && processed < BATCH_SIZE) {
                        const group = groupsToDispose[groupIndex];
                        group.children.forEach((child) => {
                            if (child instanceof THREE.Mesh) {
                                child.geometry.dispose();
                                (child.material as THREE.Material).dispose();
                            }
                        });
                        groupIndex++;
                        processed++;
                    }
                    
                    const batchEnd = performance.now();
                    const batchDuration = batchEnd - batchStart;
                    
                    // If there's more to process and batch was fast enough, continue
                    if ((meshIndex < meshesToDispose.length || groupIndex < groupsToDispose.length) && batchDuration < 16) {
                        // Use requestAnimationFrame for next batch to avoid blocking
                        requestAnimationFrame(disposeBatch);
                    } else if (meshIndex < meshesToDispose.length || groupIndex < groupsToDispose.length) {
                        // Batch took too long, yield to browser with setTimeout
                        setTimeout(disposeBatch, 0);
                    } else {
                        // All done
                        const asyncDisposeEnd = performance.now();
                        console.log('CHACH_3D_DELAY CLEAR_DISPOSE_ASYNC_DONE', JSON.stringify({
                            totalMeshes,
                            disposeDuration: asyncDisposeEnd - asyncDisposeStart,
                            timestamp: asyncDisposeEnd
                        }, null, 2));
                    }
                };
                
                // Start disposal on next frame
                requestAnimationFrame(disposeBatch);
            } else {
                // Small number - dispose synchronously
                meshesToDispose.forEach(mesh => {
                    mesh.geometry.dispose();
                    (mesh.material as THREE.Material).dispose();
                });
                groupsToDispose.forEach(group => {
                    group.children.forEach((child) => {
                        if (child instanceof THREE.Mesh) {
                            child.geometry.dispose();
                            (child.material as THREE.Material).dispose();
                        }
                    });
                });
                const syncDisposeEnd = performance.now();
                console.log('CHACH_3D_DELAY CLEAR_DISPOSE_SYNC_DONE', JSON.stringify({
                    totalMeshes,
                    disposeDuration: syncDisposeEnd - disposeStartTime,
                    timestamp: syncDisposeEnd
                }, null, 2));
            }
        }
        this.beamMeshes = [];
        
        // ניקוי ברגים
        const screwsDisposeStartTime = performance.now();
        const screwsToDispose: THREE.Group[] = [];
        this.screwGroups.forEach((screwGroup) => {
            this.scene.remove(screwGroup);
            screwsToDispose.push(screwGroup);
        });
        
        // Dispose screws (usually fewer, so synchronous is fine)
        screwsToDispose.forEach((screwGroup) => {
            screwGroup.children.forEach((child) => {
                if (child instanceof THREE.Mesh) {
                    child.geometry.dispose();
                    (child.material as THREE.Material).dispose();
                }
            });
        });
        this.screwGroups = [];
        const clearEndTime = performance.now();
        console.log('CHACH_3D_DELAY CLEAR_DONE', JSON.stringify({
            totalClearDuration: clearEndTime - clearStartTime,
            screwsCount: screwsToDispose.length,
            screwsDisposeDuration: clearEndTime - screwsDisposeStartTime,
            timestamp: clearEndTime
        }, null, 2));
        
        // Defensive checks
        if (!this.isTable && !this.isPlanter && !this.isBox && !this.isBelams && !this.isFuton && (!this.shelves || !this.shelves.length)) {
            console.warn('No shelves found, cannot render model.');
            return;
        }
        
        // טיפול במוצר קורות לפי מידה (beams)
        if (this.isBelams) {
            this.updateBeamsModel();
            // הגדרת מיקום הסצנה כמו בשאר המוצרים
            this.scene.position.y = -120;
            // אתחול המצלמה עם אנימציה - רק בטעינה ראשונית
            if (isInitialLoad) {
                this.centerCameraOnBeams();
            }
            return;
        }
        if (this.isTable && !this.getParam('height')) {
            console.warn(
                'No height parameter found for table, cannot render model.'
            );
            return;
        }
        if ((this.isPlanter || this.isBox) && !this.getParam('height')) {
            console.warn(
                'No height parameter found for planter/box, cannot render model.'
            );
            return;
        }
        if (!this.isPlanter && !this.isBox && (!this.surfaceWidth || !this.surfaceLength)) {
            console.warn(
                'surfaceWidth or surfaceLength missing, cannot render model.'
            );
            return;
        }
        // Get shelf beam and type from params (for cabinet) or plata beam (for table) or beam for planter
        let shelfsParam = null;
        if (this.isTable) {
            // עבור שולחן, נשתמש בפרמטר plata במקום shelfs - אבל מ-this.params (המעודכנים)
            shelfsParam = this.params?.find(
                (p: any) => p.type === 'beamSingle' && p.name === 'plata'
            );
        } else if (this.isFuton) {
            // עבור בסיס מיטה, נשתמש בפרמטר plata (דומה לשולחן) - אבל מ-this.params (המעודכנים)
            shelfsParam = this.params?.find(
                (p: any) => p.type === 'beamSingle' && p.name === 'plata'
            );
        } else if (this.isPlanter || this.isBox) {
            // עבור עדנית/קופסא, נשתמש בפרמטר beam
            this.debugLog('מחפש פרמטר beam לעדנית...');
            this.debugLog('פרמטרים זמינים:', this.product?.params?.map(p => ({name: p.name, type: p.type})));
            
            // Find the parameter by reference, not by creating a new object - אבל מ-this.params (המעודכנים)
            const beamParamIndex = this.params?.findIndex(
                (p: any) => p.type === 'beamSingle' && p.name === 'beam'
            );
            shelfsParam = beamParamIndex !== undefined && beamParamIndex >= 0 ? 
                this.params[beamParamIndex] : null;
            
            this.debugLog('shelfsParam נמצא:', shelfsParam);
            
            
            // Add detailed log to check if this is the same parameter object - מ-this.params (המעודכנים)
            
            // CRITICAL FIX: Force refresh the parameter object to get the latest selectedBeamIndex
            if (shelfsParam && beamParamIndex !== undefined && beamParamIndex >= 0) {
                // Get the latest parameter object from the array - מ-this.params (המעודכנים)
                const latestParam = this.params[beamParamIndex];
                if (latestParam && latestParam.selectedBeamIndex !== undefined) {
                    shelfsParam.selectedBeamIndex = latestParam.selectedBeamIndex;
                    shelfsParam.selectedTypeIndex = latestParam.selectedTypeIndex;
                }
            }
        } else {
            // עבור ארון, נשתמש בפרמטר shelfs - אבל מ-this.params (המעודכנים) ולא מ-this.product.params
            const shelfsParamIndex = this.params?.findIndex(
                (p: any) => p.type === 'beamArray' && p.name === 'shelfs'
            );
            shelfsParam = shelfsParamIndex !== undefined && shelfsParamIndex >= 0 ? 
                this.params[shelfsParamIndex] : null;
        }
        
        // Only initialize selectedBeamIndex if it's truly undefined (not just 0)
        
        if (shelfsParam && shelfsParam.selectedBeamIndex === undefined) {
            // Try to load from localStorage first
            const storageKey = `selectedBeamIndex_${this.product?.name}_${shelfsParam.name}`;
            const savedIndex = localStorage.getItem(storageKey);
            if (savedIndex !== null) {
                shelfsParam.selectedBeamIndex = parseInt(savedIndex, 10);
            } else {
                shelfsParam.selectedBeamIndex = 0;
            }
        } else if (shelfsParam && shelfsParam.selectedBeamIndex !== undefined) {
        } else {
        }
        
        // CHACK_TEXTURE - Debug: Check if shelfsParam is the same object as in this.params
        const paramsShelfsParam = this.params.find(p => p.name === 'shelfs');
        
        // FIX: Use the correct object from this.params instead of shelfsParam
        const correctShelfsParam = paramsShelfsParam || shelfsParam;
        
        // Check for saved type index in localStorage ONLY if not already set
        if (correctShelfsParam && (correctShelfsParam.selectedTypeIndex === undefined || correctShelfsParam.selectedTypeIndex === null)) {
            const typeStorageKey = `selectedTypeIndex_${this.product?.name}_${shelfsParam.name}`;
            const savedTypeIndex = localStorage.getItem(typeStorageKey);
            
            // CHACK_TEXTURE - Log when selectedTypeIndex is set from localStorage in updateBeams
            
            if (savedTypeIndex !== null) {
                correctShelfsParam.selectedTypeIndex = parseInt(savedTypeIndex, 10);
            } else if (correctShelfsParam.selectedTypeIndex === undefined || correctShelfsParam.selectedTypeIndex === null) {
                // Only set default if it's truly undefined/null, don't override existing values
                correctShelfsParam.selectedTypeIndex = 0;
            } else {
            }
        } else if (correctShelfsParam) {
            // CHACK_TEXTURE - Log when selectedTypeIndex is already set correctly
        }
        
        let shelfBeam = null;
        let shelfType = null;
        if (
            correctShelfsParam &&
            Array.isArray(correctShelfsParam.beams) &&
            correctShelfsParam.beams.length
        ) {
            shelfBeam = correctShelfsParam.beams[correctShelfsParam.selectedBeamIndex];
            shelfType =
                shelfBeam.types && shelfBeam.types.length
                    ? shelfBeam.types[correctShelfsParam.selectedTypeIndex]
                    : null;
            
            // CHACK_TEXTURE - Log actual texture loading for shelfs
        }
        // Get wood texture for shelf beams
        const shelfWoodTexture = this.getWoodTexture(
            shelfType ? shelfType.name : ''
        );
        // Get wood texture for frame beams (קורות חיזוק)
        let frameParam = null;
        if (this.isTable) {
            // עבור שולחן, קורות החיזוק הן קורות הרגליים
            frameParam = this.params.find(
                (p) => p.type === 'beamSingle' && p.name === 'leg'
            );
        } else if (this.isFuton) {
            // עבור בסיס מיטה, קורות החיזוק הן קורות הרגליים (דומה לשולחן)
            frameParam = this.params.find(
                (p) => p.type === 'beamSingle' && p.name === 'leg'
            );
        } else {
            // עבור ארון, קורות החיזוק הן פרמטר beamSingle שאינו shelfs
            frameParam = this.params.find(
                (p) => p.type === 'beamSingle' && p.name !== 'shelfs'
            );
        }
        let frameType = null;
        if (
            frameParam &&
            Array.isArray(frameParam.beams) &&
            frameParam.beams.length
        ) {
            const frameBeam =
                frameParam.beams[frameParam.selectedBeamIndex || 0];
            frameType =
                frameBeam.types && frameBeam.types.length
                    ? frameBeam.types[frameParam.selectedTypeIndex || 0]
                    : null;
        }
        const frameWoodTexture = this.getWoodTexture(
            frameType ? frameType.name : ''
        );
        // Always convert beam width/height from mm to cm
        let beamWidth = shelfBeam ? shelfBeam.width / 10 : this.beamWidth;
        let beamHeight = shelfBeam ? shelfBeam.height / 10 : this.beamHeight;
        // עדכון הערכים הגלובליים של הקומפוננטה
        this.beamWidth = beamWidth;
        this.beamHeight = beamHeight;
        // For each shelf, render its beams at its calculated height
        let currentY = 0;
        const totalShelves = this.isTable ? 1 : this.isPlanter ? 1 : this.shelves.length;
        // Get frame beam dimensions for shelf beam shortening
        let frameParamForShortening = null;
        if (this.isTable) {
            // עבור שולחן, קורות החיזוק הן קורות הרגליים
            frameParamForShortening = this.params.find(
                (p) => p.type === 'beamSingle' && p.name === 'leg'
            );
        } else if (this.isFuton) {
            // עבור בסיס מיטה, קורות החיזוק הן קורות הרגליים (דומה לשולחן)
            frameParamForShortening = this.params.find(
                (p) => p.type === 'beamSingle' && p.name === 'leg'
            );
        } else if (this.isPlanter || this.isBox) {
            // עבור עדנית, אין קורות חיזוק - נשתמש באותו פרמטר beam
            frameParamForShortening = this.params.find(
                (p) => p.type === 'beamSingle' && p.name === 'beam'
            );
        } else {
            // עבור ארון, קורות החיזוק הן פרמטר beamSingle שאינו shelfs
            frameParamForShortening = this.params.find(
                (p) => p.type === 'beamSingle' && p.name !== 'shelfs'
            );
        }
        let frameBeamWidth = this.frameWidth;
        let frameBeamHeight = this.frameHeight;
        if (
            frameParamForShortening &&
            Array.isArray(frameParamForShortening.beams) &&
            frameParamForShortening.beams.length
        ) {
            const frameBeam =
                frameParamForShortening.beams[
                    frameParamForShortening.selectedBeamIndex || 0
                ];
            if (frameBeam) {
                // החלפה: height של הפרמטר הופך ל-width של הקורה (לשימוש בקיצור)
                frameBeamWidth = frameBeam.height / 10; // המרה ממ"מ לס"מ
                frameBeamHeight = frameBeam.width / 10; // width של הפרמטר הופך ל-height של הקורה
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
            if (
                plataParam &&
                Array.isArray(plataParam.beams) &&
                plataParam.beams.length
            ) {
                const plataBeam =
                    plataParam.beams[plataParam.selectedBeamIndex || 0];
                if (plataBeam) {
                    plataBeamHeight = plataBeam.height / 10; // המרה ממ"מ לס"מ
                }
            }
            const tableHeight = baseTableHeight - plataBeamHeight; // הפחתת גובה קורות הפלטה
            
            // לוגים לבדיקת מיקומי השולחן
            
            // Surface beams (קורת משטח) - מדף אחד בלבד
            // שימוש במידות הנכונות של הפלטה שנבחרה
            // רוחב הפלטה = width של הקורה, עובי הפלטה = height של הקורה
            const plataBeam = plataParam && plataParam.beams && plataParam.beams.length ? 
                plataParam.beams[plataParam.selectedBeamIndex || 0] : null;
            const plataBeamWidth = plataBeam ? plataBeam.width / 10 : beamWidth;
            const plataBeamDepth = plataBeam ? plataBeam.height / 10 : beamHeight;
            
            const surfaceBeams = this.createSurfaceBeams(
                this.surfaceWidth,
                this.surfaceLength,
                plataBeamWidth,
                plataBeamDepth,
                this.minGap
            );
            for (let i = 0; i < surfaceBeams.length; i++) {
                const beam = { ...surfaceBeams[i] };
                const geometry = new THREE.BoxGeometry(
                    beam.width,
                    beam.height,
                    beam.depth
                );
                const material = this.getWoodMaterial(shelfType ? shelfType.name : '');
                const mesh = new THREE.Mesh(geometry, material);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                this.addWireframeToBeam(mesh); // הוספת wireframe במצב שקוף
                mesh.position.set(beam.x, tableHeight + beam.height / 2, 0);
                
                // לוגים לבדיקת מיקום הפלטה
                this.scene.add(mesh);
                this.beamMeshes.push(mesh);
                // הוספת ברגים לפלטה של השולחן
                this.addScrewsToShelfBeam(
                    beam,
                    tableHeight,
                    beam.height,
                    frameBeamWidth,
                    'top',
                    false // לא במצב preliminary-drills עבור שולחן
                );
            }
            // Get leg beam dimensions for frame beams positioning
            const tableLegParam = this.getParam('leg');
            let legWidth = frameBeamWidth;
            let legDepth = frameBeamWidth;
            if (
                tableLegParam &&
                Array.isArray(tableLegParam.beams) &&
                tableLegParam.beams.length
            ) {
                const legBeam =
                    tableLegParam.beams[tableLegParam.selectedBeamIndex || 0];
                if (legBeam) {
                    legWidth = legBeam.width / 10; // המרה ממ"מ לס"מ
                    legDepth = (legBeam.depth || legBeam.height) / 10; // המרה ממ"מ לס"מ - fallback ל-height אם depth לא קיים
                }
            }
            // בדיקת תקינות הערכים
            if (isNaN(legWidth) || legWidth <= 0) {
                console.warn(
                    'Invalid legWidth, using frameBeamWidth:',
                    legWidth
                );
                legWidth = frameBeamWidth;
            }
            // CHACK_is-reinforcement-beams-outside - A (VALUES USED)
            try {
                console.log('CHACK_is-reinforcement-beams-outside - A_USED', JSON.stringify({
                    product: this.product?.translatedName || this.product?.name,
                    stage: 'A_USED_TABLE',
                    a_legProfileWidthCm_used: legWidth,
                    b_legProfileHeightCm_used: (tableLegParam?.beams?.[tableLegParam.selectedBeamIndex || 0]?.height || 0) / 10,
                    fallbackDepthUsedAsHeight: !tableLegParam?.beams?.[tableLegParam.selectedBeamIndex || 0]?.height && !!tableLegParam?.beams?.[tableLegParam.selectedBeamIndex || 0]?.depth
                }, null, 2));
            } catch {}
            if (isNaN(legDepth) || legDepth <= 0) {
                console.warn(
                    'Invalid legDepth, using frameBeamWidth:',
                    legDepth
                );
                legDepth = frameBeamWidth;
            }
            // Frame beams (קורת חיזוק) - מדף אחד בלבד
            const frameBeams = this.createFrameBeams(
                this.surfaceWidth,
                this.surfaceLength,
                frameBeamWidth,
                frameBeamHeight,
                legWidth, // רוחב הרגל האמיתי - חזרה למצב התקין
                legDepth // עומק הרגל האמיתי - חזרה למצב התקין
            );
            for (const beam of frameBeams) {
                // Adjust frame beams when reinforcement beams are outside (table):
                // - X-spanning beams (depth == frameBeamWidth) extend by 2a (leg width)
                // - Z-spanning beams (width == frameBeamWidth) shorten by 2b (leg height)
                const outsideParamTable = this.getParam('is-reinforcement-beams-outside');
                const isOutsideTable = !!(outsideParamTable && outsideParamTable.default === true);
                let widthToUse = beam.width;
                let depthToUse = beam.depth;
                if (isOutsideTable) {
                    // Determine a,b from selected leg beam
                    const legParamForA = this.getParam('leg');
                    const legBeamForA = legParamForA?.beams?.[legParamForA.selectedBeamIndex || 0];
                    const a_legWidthCm = (legBeamForA?.width || 0) / 10;
                    const b_legHeightCm = (legBeamForA?.height || legBeamForA?.depth || 0) / 10;
                    const isXSpanning = Math.abs(beam.depth - frameBeamWidth) < 0.001; // front/back
                    const isZSpanning = Math.abs(beam.width - frameBeamWidth) < 0.001; // left/right
                    if (isXSpanning) {
                        widthToUse = beam.width + (2 * a_legWidthCm);
                    }
                    if (isZSpanning) {
                        depthToUse = Math.max(0.1, beam.depth - (2 * b_legHeightCm));
                    }
                }
                const geometry = new THREE.BoxGeometry(
                    widthToUse,
                    beam.height,
                    depthToUse
                );
                const material = this.getWoodMaterial(frameType ? frameType.name : '');
                const mesh = new THREE.Mesh(geometry, material);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                this.addWireframeToBeam(mesh); // הוספת wireframe במצב שקוף
                mesh.position.set(
                    beam.x,
                    tableHeight - beam.height / 2,
                    beam.z
                );
                
                this.scene.add(mesh);
                this.beamMeshes.push(mesh);
            }
            // קורות חיזוק נוספות (extraBeam) - עבור שולחן בלבד
            const extraBeamParam = this.getParam('extraBeam');
            if (extraBeamParam && extraBeamParam.default > 0) {
                let extraBeamDistance = extraBeamParam.default;
                
                // בדיקה שהמידה לא תהיה גדולה מ-C פחות (A + B + B) - מגבלה קפדנית יותר
                const productDimensions = this.getProductDimensionsRaw();
                const maxAllowedDistance = productDimensions.height - (plataBeamHeight + legWidth + legWidth);
                
                if (extraBeamDistance > maxAllowedDistance) {
                    extraBeamDistance = maxAllowedDistance;
                }
                
                // CHACK_TABLE_GAP - לוג לבדיקת נתונים לקורות חיזוק נוספות
                
                // יצירת קורות חיזוק נוספות באותו מיקום אבל יותר נמוך
                const extraFrameBeams = this.createFrameBeams(
                    this.surfaceWidth,
                    this.surfaceLength,
                    frameBeamWidth,
                    frameBeamHeight,
                    legWidth, // legWidth - כמו בקורות המקוריות התקינות
                    legDepth // legDepth - כמו בקורות המקוריות התקינות
                );
                // המרחק הכולל = הנתון החדש + רוחב קורות החיזוק
                const totalDistance = extraBeamDistance + frameBeamHeight;
                for (const beam of extraFrameBeams) {
                    // Apply the same outside adjustments to duplicated lower frame beams
                    const outsideParamTable = this.getParam('is-reinforcement-beams-outside');
                    const isOutsideTable = !!(outsideParamTable && outsideParamTable.default === true);
                    let widthToUse = beam.width;
                    let depthToUse = beam.depth;
                    if (isOutsideTable) {
                        const legParamForA = this.getParam('leg');
                        const legBeamForA = legParamForA?.beams?.[legParamForA.selectedBeamIndex || 0];
                        const a_legWidthCm = (legBeamForA?.width || 0) / 10;
                        const b_legHeightCm = (legBeamForA?.height || legBeamForA?.depth || 0) / 10;
                        const isXSpanning = Math.abs(beam.depth - frameBeamWidth) < 0.001;
                        const isZSpanning = Math.abs(beam.width - frameBeamWidth) < 0.001;
                        if (isXSpanning) {
                            widthToUse = beam.width + (2 * a_legWidthCm);
                        }
                        if (isZSpanning) {
                            depthToUse = Math.max(0.1, beam.depth - (2 * b_legHeightCm));
                        }
                    }
                    const geometry = new THREE.BoxGeometry(
                        widthToUse,
                        beam.height,
                        depthToUse
                    );
                    const material = this.getWoodMaterial(frameType ? frameType.name : '');
                    const mesh = new THREE.Mesh(geometry, material);
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
                    this.addWireframeToBeam(mesh); // הוספת wireframe במצב שקוף
                    // מיקום יותר נמוך במידת totalDistance (הנתון החדש + רוחב קורות החיזוק)
                    mesh.position.set(
                        beam.x,
                        tableHeight - beam.height / 2 - totalDistance,
                        beam.z
                    );
                    this.scene.add(mesh);
                    this.beamMeshes.push(mesh);
                }
            }
            
            // רגליים (legs) - עבור שולחן
            // Get leg beam and type from params
            const legParam = this.getParam('leg');
            let legBeam = null;
            let legType = null;
            if (
                legParam &&
                Array.isArray(legParam.beams) &&
                legParam.beams.length
            ) {
                legBeam = legParam.beams[legParam.selectedBeamIndex || 0];
                legType =
                    legBeam.types && legBeam.types.length
                        ? legBeam.types[legParam.selectedTypeIndex || 0]
                        : null;
            }
            // Get wood texture for leg beams
            const legWoodTexture = this.getWoodTexture(
                legType ? legType.name : ''
            );
            // עבור שולחן, הגובה הכולל הוא גובה השולחן
            const tableHeightParam = this.getParam('height');
            const totalY = tableHeightParam ? tableHeightParam.default : 80;
            
            // קבלת עובי קורת הפלטה כדי לחשב את המיקום הנכון של הרגליים
            let shelfBeamHeight = this.beamHeight;
            const shelfsParam = this.product?.params?.find(
                (p: any) => p.type === 'beamSingle' && p.name === 'plata'
            );
            if (
                shelfsParam &&
                Array.isArray(shelfsParam.beams) &&
                shelfsParam.beams.length
            ) {
                const shelfBeam = shelfsParam.beams[shelfsParam.selectedBeamIndex || 0];
                if (shelfBeam) {
                    shelfBeamHeight = shelfBeam.height / 10; // המרה ממ"מ לס"מ
                }
            }
            
            const legs = this.createLegBeams(
                this.surfaceWidth,
                this.surfaceLength,
                frameBeamWidth,
                frameBeamHeight,
                totalY,
                plataBeamHeight
            );
            for (const leg of legs) {
                const geometry = new THREE.BoxGeometry(
                    leg.width,
                    leg.height,
                    leg.depth
                );
                const material = this.getWoodMaterial(legType ? legType.name : '');
                const mesh = new THREE.Mesh(geometry, material);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                this.addWireframeToBeam(mesh); // הוספת wireframe במצב שקוף
                // הרגליים צריכות להיות ממוקמות כך שהחלק התחתון שלהן יהיה בריצפה (Y=0)
                // והחלק העליון שלהן יהיה בגובה tableHeight
                // התחתון של הרגליים: legY - leg.height / 2 = 0
                // לכן: legY = leg.height / 2
                const legY = leg.height / 2;
                
                mesh.position.set(leg.x, legY, leg.z);
                // If outside reinforcement flag is true, move table legs toward Z=0 by b (leg profile height in cm)
                const outsideParamTableLegs = this.getParam('is-reinforcement-beams-outside');
                if (outsideParamTableLegs && outsideParamTableLegs.default === true) {
                    const legProfileHeightCm = (legBeam && typeof legBeam.height === 'number') ? (legBeam.height / 10) : 0;
                    if (legProfileHeightCm > 0) {
                        const dirZ = mesh.position.z >= 0 ? 1 : -1;
                        mesh.position.z = mesh.position.z - dirZ * legProfileHeightCm;
                    }
                }
                this.scene.add(mesh);
                this.beamMeshes.push(mesh);
            }
            // הוספת ברגים לרגליים (קורות חיזוק עליונות)
            // DUBBLE_LEG_SCREWS - Log for table leg screws
            const legParamTable = this.getParam('leg');
            const legWidthTable = legParamTable?.beams?.[legParamTable.selectedBeamIndex || 0]?.width || 0;
            const dubbleThreshold = this.product?.restrictions?.find((r: any) => r.name === 'dubble-leg-screws-threshold')?.val;
            
            // When outside=true: skip Y-facing screws (screwIndex=1), keep Z-facing screws (screwIndex=0)
            const outsideForTableScrews = this.getParam('is-reinforcement-beams-outside');
            const isOutsideEnabledTable = !!(outsideForTableScrews && outsideForTableScrews.default === true);
            this.addScrewsToLegs(
                1, // שולחן = 1 מדף
                legs,
                frameBeamHeight,
                0,
                isOutsideEnabledTable // skipYFacingScrews for table
            );
            
            // הוספת ברגים לקורות החיזוק התחתונות
            // קורות החיזוק התחתונות (extraBeam) ממוקמות ב:
            // y = tableHeight - beam.height/2 - totalDistance (שורה 1360)
            // totalDistance = extraBeamDistance + frameBeamHeight (שורה 1344)
            const frameParamForLowerScrews = this.getParam('leg');
            let calculatedFrameBeamHeightForLower = frameBeamHeight;
            if (frameParamForLowerScrews && frameParamForLowerScrews.beams && frameParamForLowerScrews.beams.length > 0) {
                const frameBeam = frameParamForLowerScrews.beams[frameParamForLowerScrews.selectedBeamIndex || 0];
                if (frameBeam) {
                    calculatedFrameBeamHeightForLower = frameBeam.width / 10;
                }
            }
            
            // חישוב מיקום קורת החיזוק התחתונה בדיוק כמו בשורה 1360
            // משתמש ב-tableHeight שכבר מוגדר למעלה (שורה 1236)
            let extraBeamDistance = extraBeamParam && extraBeamParam.default > 0 ? extraBeamParam.default : 0;
            
            // בדיקה שהמידה לא תהיה גדולה מ-C פחות (A + B + B) - מגבלה קפדנית יותר עבור הברגים
            const productDimensionsForScrews = this.getProductDimensionsRaw();
            const maxAllowedDistanceForScrews = productDimensionsForScrews.height - (plataBeamHeight + legWidth + legWidth);
            
            if (extraBeamDistance > maxAllowedDistanceForScrews) {
                extraBeamDistance = maxAllowedDistanceForScrews;
            }
            
            const totalDistanceForLower = extraBeamDistance + calculatedFrameBeamHeightForLower;
            const lowerFrameY = tableHeight - calculatedFrameBeamHeightForLower / 2 - totalDistanceForLower;
            
            // CHACK_TABLE_GAP - לוג לבדיקת נתונים לברגים של קורות חיזוק נוספות
            
            this.debugLog('Adding lower frame screws - tableHeight:', tableHeight, 'extraBeamDistance:', extraBeamDistance, 'totalDistance:', totalDistanceForLower, 'lowerFrameY:', lowerFrameY, 'frameBeamHeight:', calculatedFrameBeamHeightForLower);
            // Pass skipYFacingScrews flag to lower frame beams screws as well
            this.addScrewsToLowerFrameBeams(legs, lowerFrameY, frameBeamHeight, isOutsideEnabledTable);
            
            // לא לחזור כאן - לתת לפונקציה להמשיך לסיום הרגיל
        }
        
        if (this.isFuton) {
            // עבור בסיס מיטה - דומה לשולחן אבל עם גובה שונה
            console.log('CHECK_FUTON_LEG - updateBeams: isFuton=true, קורא ל-createFutonBeams');
            this.createFutonBeams();
            
        } else {
            console.log('CHECK_FUTON_LEG - updateBeams: isFuton=false, לא יוצר מיטה', JSON.stringify({
                isTable: this.isTable,
                isPlanter: this.isPlanter,
                isBox: this.isBox,
                isBelams: this.isBelams,
                isFuton: this.isFuton,
                productName: this.product?.name
            }, null, 2));
        }
        
        if (this.isPlanter || this.isBox) {
            
            // עבור עדנית, נציג רצפה של קורות
            const heightParam = this.getParam('height');
            const depthParam = this.getParam('depth');
            const widthParam = this.getParam('width');
            
            const planterHeight = heightParam ? heightParam.default : 50;
            const planterDepth = widthParam ? widthParam.default : 50;  // depth input -> planterDepth
            const planterWidth = depthParam ? depthParam.default : 40;  // width input -> planterWidth
            
            
            this.debugLog('יצירת עדנית - גובה:', planterHeight, 'עומק:', planterDepth, 'רוחב:', planterWidth);
            this.debugLog('מידות קורה - רוחב:', beamWidth, 'עומק:', beamHeight);
            
            // חישוב כמות הקורות בעומק (41/5 = 8 קורות)
            const beamsInDepth = Math.floor(planterWidth / beamWidth);
            this.debugLog('כמות קורות בעומק:', beamsInDepth);
            
            // חישוב רווחים ויזואליים
            const visualGap = 0.1; // רווח של 0.1 ס"מ בין קורות
            const totalGaps = beamsInDepth - 1; // כמות הרווחים
            const totalGapWidth = totalGaps * visualGap; // רוחב כולל של כל הרווחים
            const availableWidth = planterWidth - totalGapWidth; // רוחב זמין לקורות
            const adjustedBeamWidth = availableWidth / beamsInDepth; // רוחב קורה מותאם
            
            this.debugLog('רווח ויזואלי:', visualGap, 'רוחב קורה מותאם:', adjustedBeamWidth);
            
            // יצירת רצפת הקורות
            
            for (let i = 0; i < beamsInDepth; i++) {
                
                const geometry = new THREE.BoxGeometry(
                    planterDepth, // אורך הקורה = עומק העדנית (70)
                    beamHeight,    // גובה הקורה = גובה הקורה (2.5)
                    adjustedBeamWidth    // רוחב קורה מותאם עם רווחים
                );
                
                
                const material = this.getWoodMaterial(shelfType ? shelfType.name : '');
                const mesh = new THREE.Mesh(geometry, material);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                this.addWireframeToBeam(mesh); // הוספת wireframe במצב שקוף
                
                // מיקום הקורה - ממורכז במרכז X, מתחיל מ-0 ב-Z, גובה הקורה/2
                // כל קורה + רווח אחריה
                const zPosition = (i * (adjustedBeamWidth + visualGap)) - (planterWidth / 2) + (adjustedBeamWidth / 2);
                mesh.position.set(0, beamHeight / 2, zPosition);
                
                this.scene.add(mesh);
                this.beamMeshes.push(mesh);
                
                // הוספת ברגים לקורת רצפה
                this.addScrewsToPlanterFloorBeam(0, beamHeight / 2, zPosition, planterDepth, beamHeight, adjustedBeamWidth, i + 1);
                
                this.debugLog(`קורה ${i + 1} - מיקום Z:`, zPosition, 'רוחב:', adjustedBeamWidth, 'אורך:', planterDepth, 'גובה:', beamHeight);
            }
            
            this.debugLog('רצפת עדנית נוצרה בהצלחה');
            
            // יצירת קירות לפני המכסה כדי לחשב את הגובה האמיתי
            const beamsInHeight = Math.floor(planterHeight / beamWidth); // כמות קורות לפי הגובה שהמשתמש הזין
            const actualWallHeight = beamsInHeight * beamWidth; // גובה אמיתי = כמות קורות * רוחב קורה
            
            // יצירת מכסה (רק אם הפרמטר isCover מופעל)
            const isCoverParam = this.getParam('isCover');
            const shouldCreateCover = this.isBox && isCoverParam && isCoverParam.default === true;
            
            if (shouldCreateCover) {
                this.debugLog('יצירת מכסה לקופסא...');
                // קבלת ערך פתיחת המכסה
                const openCoverParam = this.getParam('openCover');
                const coverOpenOffset = openCoverParam && openCoverParam.default === true ? 50 : 0;
                
                // גובה המכסה = beamHeight (עובי רצפה) + (beamsInHeight × beamWidth) + חצי beamHeight של המכסה
                const coverY = beamHeight + (beamsInHeight * beamWidth) + beamHeight / 2 + coverOpenOffset;
                
                for (let i = 0; i < beamsInDepth; i++) {
                    const geometry = new THREE.BoxGeometry(
                        planterDepth, // אורך הקורה = עומק הקופסא
                        beamHeight,    // גובה הקורה = גובה הקורה
                        adjustedBeamWidth    // רוחב קורה מותאם עם רווחים
                    );
                    const material = this.getWoodMaterial(shelfType ? shelfType.name : '');
                    const mesh = new THREE.Mesh(geometry, material);
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
                    this.addWireframeToBeam(mesh);
                    
                    // מיקום הקורה - זהה לרצפה אבל בגובה המכסה
                    const zPosition = (i * (adjustedBeamWidth + visualGap)) - (planterWidth / 2) + (adjustedBeamWidth / 2);
                    mesh.position.set(0, coverY, zPosition);
                    
                    this.scene.add(mesh);
                    this.beamMeshes.push(mesh);
                    
                    // הוספת ברגים לקורת מכסה
                    const screwY = coverY - beamHeight / 2 - beamHeight; // נמוך יותר ב-beamHeight
                    const isFirstBeam = i === 0;
                    const isLastBeam = i === beamsInDepth - 1;
                    
                    // חישוב אורך קורת התמיכה (זהה לחישוב למטה)
                    const supportBeamLengthForScrews = planterWidth - (4 * beamHeight) - 0.4;
                    
                    // 2 קורות תמיכה
                    for (let supportIndex = 0; supportIndex < 2; supportIndex++) {
                        const xPositionForScrew = supportIndex === 0 
                            ? -planterDepth / 2 + adjustedBeamWidth / 2 + beamHeight + 0.2
                            : planterDepth / 2 - adjustedBeamWidth / 2 - beamHeight - 0.2;
                        
                        const screwGeometry = this.createScrewGeometry(this.calculateScrewLength('planter_floor', beamHeight));
                        
                        // 2 טורים בציר X (לאורך קורת המכסה) - offset של רבע מרוחב הקורה
                        const xOffsetFromCenter = adjustedBeamWidth / 4; // רבע מרוחב הקורה
                        
                        for (let rowIndex = 0; rowIndex < 2; rowIndex++) {
                            const xOffset = rowIndex === 0 ? -xOffsetFromCenter : xOffsetFromCenter;
                            const xPositionWithOffset = xPositionForScrew + xOffset;
                            
                            // בקורות קצה (ראשונה/אחרונה) - רק בורג פנימי אחד בכל טור
                            if (isFirstBeam) {
                                // קורה ראשונה - רק בורג ימני (פנימי) בכל טור
                                const screw = screwGeometry.clone();
                                screw.rotation.z = Math.PI;
                                screw.position.set(xPositionWithOffset, screwY, zPosition + adjustedBeamWidth / 4);
                                this.scene.add(screw);
                                this.beamMeshes.push(screw);
                            } else if (isLastBeam) {
                                // קורה אחרונה - רק בורג שמאלי (פנימי) בכל טור
                                const screw = screwGeometry.clone();
                                screw.rotation.z = Math.PI;
                                screw.position.set(xPositionWithOffset, screwY, zPosition - adjustedBeamWidth / 4);
                                this.scene.add(screw);
                                this.beamMeshes.push(screw);
                        } else {
                                // קורות אמצעיות - 2 ברגים בכל טור (שמאל וימין)
                                const screw1 = screwGeometry.clone();
                                screw1.rotation.z = Math.PI;
                                screw1.position.set(xPositionWithOffset, screwY, zPosition - adjustedBeamWidth / 4);
                                this.scene.add(screw1);
                                this.beamMeshes.push(screw1);
                                
                                const screw2 = screwGeometry.clone();
                                screw2.rotation.z = Math.PI;
                                screw2.position.set(xPositionWithOffset, screwY, zPosition + adjustedBeamWidth / 4);
                                this.scene.add(screw2);
                                this.beamMeshes.push(screw2);
                            }
                        }
                    }
                    
                    this.debugLog(`קורת מכסה ${i + 1} - מיקום Y:`, coverY, 'Z:', zPosition);
                }
                
                this.debugLog('מכסה קופסא נוצר בהצלחה');
                
                // הוספת קורות תמיכה למכסה (בציר X, מתחת למכסה)
                this.debugLog('יצירת קורות תמיכה למכסה...');
                const supportBeamY = coverY - beamHeight - 0.05; // מתחת למכסה בגובה של קורה + רווח קטן
                const supportBeamLength = planterWidth - (4 * beamHeight) - 0.6; // קיצור נוסף של 0.3 ס"מ מכל צד (0.2 + 0.1)
                
                // שתי קורות תמיכה - אחת מכל צד
                for (let i = 0; i < 2; i++) {
                    const geometry = new THREE.BoxGeometry(
                        adjustedBeamWidth,    // רוחב קורה (בציר X)
                        beamHeight,           // גובה הקורה
                        supportBeamLength     // אורך הקורה (בציר Z) - מקוצר עם רווח נוסף
                    );
                    const material = this.getWoodMaterial(shelfType ? shelfType.name : '');
                    const mesh = new THREE.Mesh(geometry, material);
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
                    this.addWireframeToBeam(mesh);
                    
                    // מיקום - אחת בקצה שמאלי ואחת בקצה ימני (ציר X), מקורבות למרכז ב-1 מ"מ (0.1 ס"מ)
                    const xPosition = i === 0 
                        ? -planterDepth / 2 + adjustedBeamWidth / 2 + beamHeight + 0.2 + 0.1  // קורה שמאלית: +0.1 ס"מ ימינה
                        : planterDepth / 2 - adjustedBeamWidth / 2 - beamHeight - 0.2 - 0.1;  // קורה ימנית: -0.1 ס"מ שמאלה
                    mesh.position.set(xPosition, supportBeamY, 0);
                    
                    this.scene.add(mesh);
                    this.beamMeshes.push(mesh);
                    
                    this.debugLog(`קורת תמיכה למכסה ${i + 1} - X:`, xPosition, 'Y:', supportBeamY);
                }
                
                this.debugLog('קורות תמיכה למכסה נוצרו בהצלחה');
            }
            
            // הוספת ברגים לקירות השמאליים והימניים בתחתית הרצפה
            this.addScrewsToSideWallsAtFloor(planterDepth, planterWidth, beamHeight, widthParam.default);
            
            // יצירת הקירות - החישוב כבר נעשה למעלה
            
            if (beamsInHeight > 0) {
                // חישוב רווחים ויזואליים לקירות
                const wallVisualGap = 0.1; // רווח של 0.1 ס"מ בין קורות
                const wallTotalGaps = beamsInHeight - 1; // כמות הרווחים
                const wallTotalGapHeight = wallTotalGaps * wallVisualGap; // גובה כולל של כל הרווחים
                const availableHeight = actualWallHeight - wallTotalGapHeight; // גובה זמין לקורות
                const adjustedBeamHeight = availableHeight / beamsInHeight; // גובה קורה מותאם
                
                
                for (let wallIndex = 0; wallIndex < 4; wallIndex++) {
                    let wallX = 0, wallZ = 0;
                    let wallLength = 0;
                    let wallName = '';
                    
                    // חישוב מיקום ואורך הקירות
                    if (wallIndex === 0) {
                        // קיר שמאלי (ציר Z שלילי)
                        wallZ = -planterWidth / 2 + beamHeight / 2;
                        wallLength = widthParam.default - (2 * beamHeight); // קיצור משני הצדדים
                        wallName = 'שמאלי';
                    } else if (wallIndex === 1) {
                        // קיר ימני (ציר Z חיובי)
                        wallZ = planterWidth / 2 - beamHeight / 2;
                        wallLength = widthParam.default - (2 * beamHeight); // קיצור משני הצדדים
                        wallName = 'ימני';
                    } else if (wallIndex === 2) {
                        // קיר קדמי (ציר X שלילי)
                        wallX = -planterDepth / 2 + beamHeight / 2;
                        wallLength = planterWidth; // אורך מלא עד הקצוות
                        wallName = 'קדמי';
                    } else if (wallIndex === 3) {
                        // קיר אחורי (ציר X חיובי)
                        wallX = planterDepth / 2 - beamHeight / 2;
                        wallLength = planterWidth; // אורך מלא עד הקצוות
                        wallName = 'אחורי';
                    }
                    
                    
                    for (let i = 0; i < beamsInHeight; i++) {
                        // העלאת הקורות התחתונות ב-0.1 ס"מ ליצירת רווח ויזואלי מהרצפה
                        const isBottomBeam = i === 0; // הקורה הראשונה (התחתונה) בכל קיר
                        
                        // סיבוב הקירות הקדמיים והאחוריים ב-90 מעלות סביב ציר Y
                        const isFrontBackWall = wallIndex === 2 || wallIndex === 3;
                        
                        
                        const geometry = new THREE.BoxGeometry(
                            wallLength, // אורך הקורה לפי סוג הקיר
                            adjustedBeamHeight, // גובה קורה מותאם עם רווחים
                            beamHeight // עומק הקורה = גובה הקורה
                        );
                        
                        
                        const material = this.getWoodMaterial(shelfType ? shelfType.name : '');
                        const mesh = new THREE.Mesh(geometry, material);
                        mesh.castShadow = true;
                        mesh.receiveShadow = true;
                        this.addWireframeToBeam(mesh); // הוספת wireframe במצב שקוף
                        
                        // סיבוב הקירות הקדמיים והאחוריים ב-90 מעלות סביב ציר Y
                        if (isFrontBackWall) {
                            mesh.rotation.y = Math.PI / 2; // 90 מעלות סביב ציר Y
                        }
                        
                        // מיקום הקורה - ממורכז במרכז X, גובה מתחיל מ-beamHeight, מיקום Z לפי הקיר
                        // הקורה התחתונה מוגבהת ב-0.1 ס"מ מהרצפה
                        const baseYPosition = (i * (adjustedBeamHeight + wallVisualGap)) + beamHeight + (adjustedBeamHeight / 2);
                        const yPosition = isBottomBeam ? baseYPosition + 0.1 : baseYPosition;
                        mesh.position.set(wallX, yPosition, wallZ);
                        
                        this.scene.add(mesh);
                        this.beamMeshes.push(mesh);
                        
                        // הוספת ברגים לקורה - רק לקירות הקדמיים והאחוריים
                        if (isFrontBackWall) {
                            this.addScrewsToPlanterWallBeam(wallX, yPosition, wallZ, wallLength, adjustedBeamHeight, beamHeight, isFrontBackWall, wallName, i + 1, beamWidth);
                        }
                        
                        this.debugLog(`קיר ${wallName} קורה ${i + 1} - מיקום X:`, wallX, 'מיקום Y:', yPosition, 'מיקום Z:', wallZ, 'אורך:', wallLength, 'גובה:', adjustedBeamHeight, 'עומק:', beamHeight, isBottomBeam ? '(קורה תחתונה מוגבהת)' : '');
                    }
                }
                
                this.debugLog('קירות עדנית נוצרו בהצלחה');
            }
            
            // יצירת קורות חיזוק פנימיות
            this.createPlanterInternalSupportBeams(planterDepth, planterWidth, actualWallHeight, beamHeight, beamWidth, shelfType ? shelfType.name : '');
            
            // לא לחזור כאן - לתת לפונקציה להמשיך לסיום הרגיל
        }
        
        if (!this.isTable && !this.isFuton && !this.isPlanter && !this.isBox) {
            // הגדרת משתנים נכונים עבור ארון - לפני כל הבלוקים
            let frameBeamHeightCorrect = frameBeamHeight;
            let beamHeightCorrect = beamHeight;
            
            // קריאת גובה קורת החיזוק מהפרמטרים
            const frameParam = this.getParam('frame');
            if (frameParam && Array.isArray(frameParam.beams) && frameParam.beams.length) {
                const frameBeam = frameParam.beams[frameParam.selectedBeamIndex || 0];
                if (frameBeam) {
                    frameBeamHeightCorrect = frameBeam.width / 10; // המרה ממ"מ לס"מ
                }
            }
            
            // קריאת גובה קורת המדף מהפרמטרים
            const shelfsParam = this.getParam('shelfs');
            if (shelfsParam && Array.isArray(shelfsParam.beams) && shelfsParam.beams.length) {
                const shelfBeam = shelfsParam.beams[shelfsParam.selectedBeamIndex || 0];
                if (shelfBeam) {
                    beamHeightCorrect = shelfBeam.height / 10; // המרה ממ"מ לס"מ
                }
            }
            
            // רגליים (legs) - עבור ארון
            const legParam = this.getParam('leg');
            let legBeam = null;
            let legType = null;
            if (
                legParam &&
                Array.isArray(legParam.beams) &&
                legParam.beams.length
            ) {
                legBeam = legParam.beams[legParam.selectedBeamIndex || 0];
                legType =
                    legBeam.types && legBeam.types.length
                        ? legBeam.types[legParam.selectedTypeIndex || 0]
                        : null;
            }
            const legWoodTexture = this.getWoodTexture(
                legType ? legType.name : ''
            );
            // הגדרת legWidth ו-legDepth מהמידות של legBeam
            let legWidth = 0;
            let legDepth = 0;
            if (legBeam) {
                legWidth = legBeam.width / 10; // המרה ממ"מ לס"מ
                legDepth = legBeam.height / 10; // המרה ממ"מ לס"מ
            }
            // עבור ארון, הרגליים צריכות להגיע עד לנקודה התחתונה של המדף העליון
            // כלומר: totalY פחות עובי המדף העליון
            const shelfBeamHeight = beamHeight; // זה כבר מחושב למעלה
            
            
            let legHeight = 0; // הגדרה ראשונית
            
            
            // חישוב גובה כולל לארון לפי הנוסחה: S + ((J + K) * N)
            const S = this.shelves.reduce((sum, shelf) => sum + shelf.gap, 0);
            const J = frameBeamHeightCorrect;
            const K = beamHeightCorrect;
            const N = this.shelves.length;
            const totalY = S + ((J + K) * N);
            // הרגליים צריכות להגיע עד לנקודה התחתונה של המדף העליון
            legHeight = totalY - beamHeightCorrect;
            
            
            this.logCabinet('CHACK_CABINET - Cabinet leg height calculation:', {
                S: S,
                J: J,
                K: K,
                N: N,
                totalY: totalY,
                shelfBeamHeight: beamHeightCorrect,
                legHeight: legHeight,
                calculation: `S + ((J + K) * N) = ${S} + ((${J} + ${K}) * ${N}) = ${S} + (${J + K} * ${N}) = ${S} + ${(J + K) * N} = ${totalY}, legHeight = ${totalY} - ${beamHeightCorrect} = ${legHeight}`,
                frameBeamHeightCorrect: frameBeamHeightCorrect,
                beamHeightCorrect: beamHeightCorrect
            });
            
            
            // בדיקה אם אנחנו במצב preliminary-drills - משתמשים בערכים שחושבו בתחילת הפונקציה
            // הערכים כבר הוגדרו בתחילת הפונקציה updateBeams
            const currentStage = this.product?.instructions?.[this.currentInstructionStage - 1];
            if (!this._prelimLogPrintedThisCycle) {
            console.log('CHACH_3D_DELAY UPDATE_BEAMS_PRELIMINARY_CHECK', JSON.stringify({
                isPreliminaryDrills: isPreliminaryDrills,
                firstUncheckedCompositeKey: activeCompositeKeyGlobal,
                isInstructionMode: this.isInstructionMode,
                currentStageName: currentStage?.name,
                currentInstructionStageIndex: this.currentInstructionStage,
                timestamp: performance.now()
            }, null, 2));
                this._prelimLogPrintedThisCycle = true;
            }
            
            // קביעת מה להציג במצב preliminary-drills
            let shouldShowLegBeams = true;
            let shouldShowShelfBeams = true;
            let shouldShowReinforcementBeams = true;
            
            if (isPreliminaryDrills && activeCompositeKeyGlobal) {
                // פירוק ה-compositeKey ל-paramName ו-beamLength
                const fallbackParamName = activeCompositeKeyGlobal.split('-')[0];
                const firstUncheckedParamName = fallbackParamName || null;
                const lengthMatch = activeCompositeKeyGlobal.match(/(-?\d+(\.\d+)?)$/);
                const firstUncheckedBeamLength = lengthMatch ? parseFloat(lengthMatch[1]) : NaN; // אורך הקורה
                const firstUncheckedReinforcementDirection = activeCompositeKeyGlobal.includes('x-spanning')
                    ? 'x-spanning'
                    : activeCompositeKeyGlobal.includes('z-spanning')
                        ? 'z-spanning'
                        : null;
                
                // במצב preliminary-drills - נציג רק את הקורות הרלוונטיות
                if (firstUncheckedParamName === 'shelfs') {
                    // רק קורות מדף
                    shouldShowLegBeams = false;
                    shouldShowReinforcementBeams = false;
                } else if (firstUncheckedParamName === 'leg') {
                    shouldShowShelfBeams = false;

                    const outsideParam = this.getParam('is-reinforcement-beams-outside');
                    const rawOutsideValue = outsideParam?.default;
                    const isExternalReinforcementEnabled =
                        typeof rawOutsideValue === 'number'
                            ? rawOutsideValue > 0
                            : rawOutsideValue === true;

                    const dimensions = this.getProductDimensionsRaw();
                    const totalHeight = dimensions.height;
                    const shelfParam = this.getParam('shelfs');
                    const shelfSelectedBeam =
                        shelfParam?.beams?.[shelfParam.selectedBeamIndex || 0];
                    const shelfBeamHeight = shelfSelectedBeam
                        ? shelfSelectedBeam.height / 10
                        : 0;
                    const legHeight = totalHeight - shelfBeamHeight;

                    const legParam = this.getParam('leg');
                    const legSelectedBeam =
                        legParam?.beams?.[legParam.selectedBeamIndex || 0];
                    const legWidth = legSelectedBeam?.width
                        ? legSelectedBeam.width / 10
                        : 0;
                    const legDepth = legSelectedBeam?.height
                        ? legSelectedBeam.height / 10
                        : 0;

                    let xReinforcementLength = Math.max(
                        0.1,
                        this.surfaceWidth - 2 * legWidth
                    );
                    let zReinforcementLength = this.surfaceLength;

                    if (isExternalReinforcementEnabled) {
                        xReinforcementLength = this.surfaceWidth + 2 * legWidth;
                        zReinforcementLength = Math.max(
                            0.1,
                            this.surfaceLength - 2 * legDepth
                        );
                    }

                    const firstUncheckedReinforcementDirection =
                        activeCompositeKeyGlobal?.includes('x-spanning')
                            ? 'x-spanning'
                            : activeCompositeKeyGlobal?.includes('z-spanning')
                                ? 'z-spanning'
                                : null;

                    const hasValidLength = Number.isFinite(firstUncheckedBeamLength);
                    const isLegBeamLength =
                        hasValidLength &&
                        Math.abs(firstUncheckedBeamLength - legHeight) < 0.1;
                    const isXReinforcementLength =
                        hasValidLength &&
                        Math.abs(firstUncheckedBeamLength - xReinforcementLength) < 0.1;
                    const isZReinforcementLength =
                        hasValidLength &&
                        Math.abs(firstUncheckedBeamLength - zReinforcementLength) < 0.1;

                    const shouldShowCurrentReinforcement =
                        firstUncheckedReinforcementDirection === 'x-spanning'
                            ? isXReinforcementLength
                            : firstUncheckedReinforcementDirection === 'z-spanning'
                                ? isZReinforcementLength
                                : false;

                    if (isExternalReinforcementEnabled) {
                        if (!hasValidLength) {
                            // אם אין לנו אורך מפורט, נשאר עם ברירת מחדל: מציגים רגליים בלבד
                            shouldShowLegBeams = true;
                            shouldShowReinforcementBeams = false;
                        } else if (shouldShowCurrentReinforcement) {
                            shouldShowLegBeams = false;
                            shouldShowReinforcementBeams = true;
                        } else {
                            // לא קורת חיזוק נוכחית → מציגים קורות רגל
                            shouldShowLegBeams = isLegBeamLength || !firstUncheckedReinforcementDirection;
                            shouldShowReinforcementBeams = false;
                        }
                    } else {
                        if (!hasValidLength || isLegBeamLength) {
                            shouldShowLegBeams = true;
                            shouldShowReinforcementBeams = false;
                        } else if (isXReinforcementLength || isZReinforcementLength) {
                            shouldShowLegBeams = false;
                            shouldShowReinforcementBeams = true;
                        }
                    }
                }
            }
            
            console.log('CHACH_3D_DELAY UPDATE_BEAMS_VISIBILITY', JSON.stringify({
                shouldShowLegBeams: shouldShowLegBeams,
                shouldShowShelfBeams: shouldShowShelfBeams,
                shouldShowReinforcementBeams: shouldShowReinforcementBeams,
                isPreliminaryDrills: isPreliminaryDrills,
                activeCompositeKey: activeCompositeKeyGlobal,
                timestamp: performance.now()
            }, null, 2));
            
            // Cache visibility state for future optimization
            this._lastVisibilityState = {
                shouldShowLegBeams,
                shouldShowShelfBeams,
                shouldShowReinforcementBeams,
                activeCompositeKey: activeCompositeKeyGlobal
            };
            
            const legs = this.createLegBeams(
                this.surfaceWidth,
                this.surfaceLength,
                frameBeamWidth,
                frameBeamHeight,
                legHeight
            );
            if (shouldShowLegBeams) {
            for (const leg of legs) {
                
                const geometry = new THREE.BoxGeometry(
                    leg.width,
                    legHeight,
                    leg.depth
                );
                const material = this.getWoodMaterial(legType ? legType.name : '');
                const mesh = new THREE.Mesh(geometry, material);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                this.addWireframeToBeam(mesh); // הוספת wireframe במצב שקוף
                mesh.position.set(leg.x, legHeight / 2, leg.z);
                    // If outside reinforcement flag is true, move cabinet legs toward Z=0 by b (leg profile height in cm)
                    const outsideParamCabLegs = this.getParam('is-reinforcement-beams-outside');
                    if (outsideParamCabLegs && outsideParamCabLegs.default === true) {
                        const legProfileHeightCm = (legBeam && typeof legBeam.height === 'number') ? (legBeam.height / 10) : 0;
                        if (legProfileHeightCm > 0) {
                            const dirZ = mesh.position.z >= 0 ? 1 : -1;
                            mesh.position.z = mesh.position.z - dirZ * legProfileHeightCm;
                        }
                    }
                this.scene.add(mesh);
                this.beamMeshes.push(mesh);
            }
            }
            // הוספת ברגים לרגליים עבור ארון - תמיד (גם במצב preliminary-drills)
            // DUBBLE_LEG_SCREWS - Log for cabinet leg screws
            const legParamCabinet = this.getParam('leg');
            const legWidthCabinet = legParamCabinet?.beams?.[legParamCabinet.selectedBeamIndex || 0]?.width || 0;
            const dubbleThresholdCabinet = this.product?.restrictions?.find((r: any) => r.name === 'dubble-leg-screws-threshold')?.val;
            
            // When outside=true: skip Y-facing screws (screwIndex=1), keep Z-facing screws (screwIndex=0)
            const outsideForCabinetScrews = this.getParam('is-reinforcement-beams-outside');
            const outsideRawValue = outsideForCabinetScrews?.default;
            const isOutsideEnabled =
                typeof outsideRawValue === 'number'
                    ? outsideRawValue > 0
                    : outsideRawValue === true;
            
            // רק אם אנחנו במצב preliminary-drills עם leg, או במצב רגיל - להוסיף ברגים
            // משתמשים ב-activeCompositeKeyGlobal שהוגדר בתחילת הפונקציה
            if (
                !isPreliminaryDrills ||
                (activeCompositeKeyGlobal && activeCompositeKeyGlobal.startsWith('leg'))
            ) {
                this.addScrewsToLegs(totalShelves, legs, frameBeamHeightCorrect, 0, isOutsideEnabled);
            }
        }
        
        // עבור ארון - הקוד המקורי
        if (!this.isTable && !this.isPlanter && !this.isBox) {
            // בדיקה אם אנחנו במצב preliminary-drills (לפני ה-loop של המדפים)
            // משתמשים בערכים שחושבו בתחילת הפונקציה
            const isPreliminaryDrillsCabinet = isPreliminaryDrills;
            const activeCompositeKeyCabinet = activeCompositeKeyGlobal;
            const firstUncheckedParamCabinet = activeCompositeKeyCabinet
                ? activeCompositeKeyCabinet.split('-')[0]
                : null;
            
            // קביעת מה להציג במצב preliminary-drills
            let shouldShowShelfBeamsCabinet = true;
            let shouldShowReinforcementBeamsCabinet = true;
            
            if (isPreliminaryDrillsCabinet && firstUncheckedParamCabinet) {
                if (firstUncheckedParamCabinet === 'shelfs') {
                    // רק קורות מדף
                    shouldShowReinforcementBeamsCabinet = false;
                } else if (firstUncheckedParamCabinet === 'leg') {
                    shouldShowShelfBeamsCabinet = false;
                    const outsideParamCab = this.getParam('is-reinforcement-beams-outside');
                    const isOutsideCab = !!(outsideParamCab && outsideParamCab.default === true);
                const reinforcementDirectionFromKey =
                    activeCompositeKeyCabinet?.includes('x-spanning')
                        ? 'x-spanning'
                        : activeCompositeKeyCabinet?.includes('z-spanning')
                            ? 'z-spanning'
                            : null;
                    if (isOutsideCab) {
                        // ברירת המחדל: מציגים קורות חיזוק רק אם הקורה הנוכחית היא אכן קורת חיזוק
                        const cabinetLengthMatch = activeCompositeKeyCabinet
                            ? activeCompositeKeyCabinet.match(/(-?\d+(\.\d+)?)$/)
                            : null;
                        const cabinetBeamLength = cabinetLengthMatch ? parseFloat(cabinetLengthMatch[1]) : NaN;
                        const legParamForCabinet = this.getParam('leg');
                        const legBeamForCabinet =
                            legParamForCabinet?.beams?.[legParamForCabinet.selectedBeamIndex || 0];
                        const legWidthCabinetCm = legBeamForCabinet?.width ? legBeamForCabinet.width / 10 : 0;
                        const legDepthCabinetCm = legBeamForCabinet?.height ? legBeamForCabinet.height / 10 : 0;
                        const expectedXSpanCabinet = this.surfaceWidth + (2 * legWidthCabinetCm);
                        const expectedZSpanCabinet = Math.max(
                            0.1,
                            this.surfaceLength - (2 * legDepthCabinetCm)
                        );
                        const cabinetDirection =
                        reinforcementDirectionFromKey;
                        const isCurrentReinforcementCabinet =
                            cabinetDirection === 'x-spanning'
                                ? Math.abs(cabinetBeamLength - expectedXSpanCabinet) < 0.1
                                : cabinetDirection === 'z-spanning'
                                    ? Math.abs(cabinetBeamLength - expectedZSpanCabinet) < 0.1
                                    : false;
                    if (cabinetDirection === 'x-spanning' || cabinetDirection === 'z-spanning') {
                        shouldShowReinforcementBeamsCabinet = true;
                    } else {
                        shouldShowReinforcementBeamsCabinet = isCurrentReinforcementCabinet;
                    }
                    } else {
                    shouldShowReinforcementBeamsCabinet = reinforcementDirectionFromKey
                        ? true
                        : false;
                    }
                }
            }
            
            this.startTimer('CABINET - Total Rendering');
            
            this.logCabinet('CHACK_CABINET - Cabinet rendering check:', {
                isTable: this.isTable,
                isPlanter: this.isPlanter,
                isBox: this.isBox,
                shelvesLength: this.shelves.length,
                isPreliminaryDrills: isPreliminaryDrillsCabinet,
                firstUncheckedParam: firstUncheckedParamCabinet,
                shouldShowShelfBeams: shouldShowShelfBeamsCabinet,
                shouldShowReinforcementBeams: shouldShowReinforcementBeamsCabinet
            });
            
            // הגדרת משתנים נכונים עבור ארון
            let frameBeamHeightCorrect = frameBeamHeight;
            let beamHeightCorrect = beamHeight;
            
            // קריאת גובה קורת החיזוק מהפרמטרים
            const frameParam = this.getParam('frame');
            if (frameParam && Array.isArray(frameParam.beams) && frameParam.beams.length) {
                const frameBeam = frameParam.beams[frameParam.selectedBeamIndex || 0];
                if (frameBeam) {
                    frameBeamHeightCorrect = frameBeam.width / 10; // המרה ממ"מ לס"מ
                }
            }
            
            // קריאת גובה קורת המדף מהפרמטרים
            const shelfsParam = this.getParam('shelfs');
            if (shelfsParam && Array.isArray(shelfsParam.beams) && shelfsParam.beams.length) {
                const shelfBeam = shelfsParam.beams[shelfsParam.selectedBeamIndex || 0];
                if (shelfBeam) {
                    beamHeightCorrect = shelfBeam.height / 10; // המרה ממ"מ לס"מ
                }
            }
            
            // הגדרת currentY עבור ארון - מתחיל מ-0 ומתעדכן עם כל מדף
            let currentY = 0;
            
            this.logCabinet('CHACK_CABINET - Starting cabinet rendering:', {
                shelvesCount: this.shelves.length,
                initialCurrentY: currentY
            });
            
            // עבור ארון - הקוד המקורי
            const shelvesLoopStartTime = performance.now();
            console.log('CHACH_3D_DELAY CABINET_SHELVES_LOOP_START', JSON.stringify({
                totalShelves: this.shelves.length,
                timestamp: shelvesLoopStartTime
            }, null, 2));
            for (
                let shelfIndex = 0;
                shelfIndex < this.shelves.length;
                shelfIndex++
            ) {
            const shelfStartTime = performance.now();
            this.startTimer(`CABINET - Shelf ${shelfIndex + 1}`);
            const shelf = this.shelves[shelfIndex];
            console.log('CHACH_3D_DELAY CABINET_SHELF_ITERATION_START', JSON.stringify({
                shelfIndex: shelfIndex + 1,
                totalShelves: this.shelves.length,
                shelfGap: shelf.gap,
                currentY: currentY,
                timestamp: shelfStartTime
            }, null, 2));
            
            this.logCabinet(`CHACK_CABINET - Before shelf ${shelfIndex + 1}:`, {
                currentY: currentY,
                shelfGap: shelf.gap
            });
            
            currentY += shelf.gap;
            
            this.logCabinet(`CHACK_CABINET - After adding gap for shelf ${shelfIndex + 1}:`, {
                currentY: currentY
            });
                // Get leg beam dimensions for frame beams positioning
                const legParam = this.getParam('leg');
                let legWidth = frameBeamWidth;
                let legDepth = frameBeamWidth;
                if (
                    legParam &&
                    Array.isArray(legParam.beams) &&
                    legParam.beams.length
                ) {
                    const legBeam =
                        legParam.beams[legParam.selectedBeamIndex || 0];
                    if (legBeam) {
                        legWidth = legBeam.width / 10; // המרה ממ"מ לס"מ
                        legDepth = legBeam.height / 10; // המרה ממ"מ לס"מ
                    }
                }

            // Surface beams (קורת משטח)
            this.startTimer(`CABINET - Create Surface Beams for Shelf ${shelfIndex + 1}`);
            // קבלת מידות המדף הנכונות
            const shelfsParam = this.getParam('shelfs');
            let shelfBeam = null;
            let shelfBeamWidth = beamWidth;
            let shelfBeamHeight = beamHeight;
            if (
                shelfsParam &&
                Array.isArray(shelfsParam.beams) &&
                shelfsParam.beams.length
            ) {
                shelfBeam = shelfsParam.beams[shelfsParam.selectedBeamIndex || 0];
                if (shelfBeam) {
                    shelfBeamWidth = shelfBeam.width / 10; // המרה ממ"מ לס"מ
                    shelfBeamHeight = shelfBeam.height / 10; // המרה ממ"מ לס"מ
                }
            }
            // CHECK_SHORTEN_BEAM_is-reinforcement-beams-outside - Shelf context (once per shelf)
            try {
                const outsideParamCabCtx = this.getParam('is-reinforcement-beams-outside');
                const isOutsideCabCtx = !!(outsideParamCabCtx && outsideParamCabCtx.default === true);
                console.log('CHECK_SHORTEN_BEAM_is-reinforcement-beams-outside', JSON.stringify({
                    shelfIndex: shelfIndex + 1,
                    isOutside: isOutsideCabCtx,
                    legWidthCm: legWidth,
                    legHeightCm: legDepth,
                    frameBeamWidthCm: frameBeamWidth,
                    shelfBeamWidthCm: shelfBeamWidth,
                    shelfBeamHeightCm: shelfBeamHeight
                }, null, 2));
                // Also provide CHECK_SHELF_BEAM info
                console.log('CHECK_SHELF_BEAM', JSON.stringify({
                    shelfIndex: shelfIndex + 1,
                    shelfsSelectedBeam: {
                        name: shelfBeam?.name,
                        translatedName: shelfBeam?.translatedName,
                        widthMm: shelfBeam?.width,
                        heightMm: shelfBeam?.height
                    },
                    legSelectedBeam: {
                        widthMm: (this.getParam('leg')?.beams?.[this.getParam('leg')?.selectedBeamIndex || 0]?.width) || null,
                        heightMm: (this.getParam('leg')?.beams?.[this.getParam('leg')?.selectedBeamIndex || 0]?.height) || null
                    }
                }, null, 2));
            } catch {}
            const surfaceBeams = this.createSurfaceBeams(
                this.surfaceWidth,
                this.surfaceLength,
                shelfBeamWidth,
                shelfBeamHeight,
                this.minGap
            );
            this.endTimer(`CABINET - Create Surface Beams for Shelf ${shelfIndex + 1}`);

                // חישוב רווח בין קורות
                const totalBeamWidth = surfaceBeams.length * shelfBeamWidth;
                const remainingSpace = this.surfaceWidth - totalBeamWidth;
                const gapsCount = surfaceBeams.length - 1;
                const gapBetweenBeams =
                    gapsCount > 0 ? remainingSpace / gapsCount : 0;

                // בדיקת נתוני הקורות לפני יצירת המדפים
                this.debugLog(
                    '=== בדיקת נתוני קורות לפני יצירת מדף',
                    shelfIndex + 1,
                    '==='
                );

                // 1. בדיקת רוחב וגובה של קורת מדף בודדת
                this.debugLog('1. קורת מדף בודדת:');
                this.debugLog('   - רוחב:', shelfBeamWidth, 'ס"מ');
                this.debugLog('   - גובה:', shelfBeamHeight, 'ס"מ');

                // 2. בדיקת הרווח בין הקורות במדף
                this.debugLog('2. רווח בין הקורות במדף:');
                this.debugLog('   - אורך כולל:', this.surfaceWidth, 'ס"מ');
                this.debugLog('   - אורך כולל קורות:', totalBeamWidth, 'ס"מ');
                this.debugLog('   - מקום פנוי:', remainingSpace, 'ס"מ');
                this.debugLog('   - כמות רווחים:', gapsCount);
                this.debugLog(
                    '   - רווח בין קורות:',
                    gapBetweenBeams.toFixed(2),
                    'ס"מ'
                );

                // 3. בדיקת רוחב וגובה של קורת הרגל
                this.debugLog('3. קורת רגל:');
                this.debugLog('   - רוחב:', legWidth, 'ס"מ');
                this.debugLog('   - גובה:', legDepth, 'ס"מ');

                // 4. בדיקת חסימת קורות על ידי רגליים - לוגיקה חדשה
                this.debugLog('4. בדיקת חסימת קורות:');
                const beamAndGapWidth = shelfBeamWidth + gapBetweenBeams; // A + B
                const isTopShelf = shelfIndex === totalShelves - 1;
                const shouldHideBeams = beamAndGapWidth < legWidth && !isTopShelf; // A + B < C

                let beamsToHidePerSide = 0; // כמה קורות למחוק מכל צד
                
                if (shouldHideBeams) {
                    // חישוב כמה כפולות של A+B נכנסות ב-C
                    const howManyFit = Math.floor(legWidth / beamAndGapWidth);
                    
                    // כמה קורות צריך למחוק מכל צד
                    // אם נכנסות 2 כפולות, נמחוק 2 קורות מכל צד
                    // אם נכנסות 3 כפולות, נמחוק 3 קורות מכל צד
                    beamsToHidePerSide = Math.max(0, howManyFit);
                    
                    // הגבלה: לא למחוק יותר קורות ממה שיש באמצע
                    const middleBeamsCount = surfaceBeams.length - 2; // קורות באמצע (לא הקורות בקצוות)
                    beamsToHidePerSide = Math.min(beamsToHidePerSide, Math.floor(middleBeamsCount / 2));
                    
                    // עדכון המשתנה הגלובלי
                    this.hasHiddenBeams = true;
                    this.hiddenBeamsCount += beamsToHidePerSide * 2; // 2 צדדים
                    
                    // בדיקה נוספת לארון: האם קורות המדף צרות מדי מחצי מקורת הרגל
                    if (!this.isTable && !this.isFuton) { // רק לארון
                        const halfLegWidth = legWidth / 2; // חצי מקורת הרגל
                        const shouldRemoveShortenedBeams = shelfBeamWidth < halfLegWidth;
                        
                        
                        if (shouldRemoveShortenedBeams) {
                            // הקורות המקוצרות צרות מדי - צריך להסיר אותן לחלוטין
                            this.hasShortenedBeamsRemoved = true;
                            this.hiddenBeamsCount += 1; // הוספת קורה מקוצרת אחת לכל מדף
                        }
                    }
                    
                    // CHACH_ALLERT - Log new logic
                    
                    // CHECH_MULTI_REMOVE_AL - Log for alert calculation
                    
                    // בדיקת מקרה קיצון: אם נשארות רק הקורות בקצוות
                    if (beamsToHidePerSide * 2 >= middleBeamsCount) {
                        this.hasNoMiddleBeams = true;
                        this.debugLog('   - מקרה קיצון: נשארות רק הקורות בקצוות (אין קורות באמצע)');
                        
                        // CHACH_ALLERT - Log critical case
                    }
                }

                this.debugLog(
                    '   - רוחב קורה + רווח:',
                    beamAndGapWidth.toFixed(2),
                    'ס"מ'
                );
                this.debugLog('   - רוחב רגל:', legWidth, 'ס"מ');
                this.debugLog('   - האם מדף עליון:', isTopShelf);
                this.debugLog('   - האם להסתיר קורות:', shouldHideBeams);
                if (shouldHideBeams) {
                    this.debugLog(
                        '   - קורות שיוסתרו: הקורה השנייה מההתחלה והקורה השנייה מהסוף'
                    );
                }

                this.debugLog('==========================================');

            // הגדרת משתני הצגה עבור ארון (בתוך לולאת המדפים)
            // משתמשים במשתנים שהוגדרו לפני הלולאה - נגישים כי הם באותו scope
            // משתמשים בערכים שחושבו בתחילת הפונקציה
            const isPreliminaryDrillsCabinet = isPreliminaryDrills;
            const firstUncheckedCompositeKey = activeCompositeKeyCabinet;
            
            let shouldShowLegBeamsCabinet = true;
            let shouldShowShelfBeamsCabinet = true;
            let shouldShowReinforcementBeamsCabinet = true;
            
            if (isPreliminaryDrillsCabinet && firstUncheckedCompositeKey) {
                // פירוק ה-compositeKey ל-paramName ולמאפייני הקורה
                const firstUncheckedParamName = firstUncheckedCompositeKey.split('-')[0]; // 'shelfs' או 'leg'
                const lengthMatch = firstUncheckedCompositeKey.match(/(-?\d+(\.\d+)?)$/);
                const firstUncheckedBeamLength = lengthMatch ? parseFloat(lengthMatch[1]) : NaN; // אורך הקורה
                const firstUncheckedReinforcementDirection = firstUncheckedCompositeKey.includes('x-spanning')
                    ? 'x-spanning'
                    : firstUncheckedCompositeKey.includes('z-spanning')
                        ? 'z-spanning'
                        : null;
                
                if (firstUncheckedParamName === 'shelfs') {
                    // אם הצ'קבוקס הנוכחי הוא של קורות מדף - נציג רק אותן
                    shouldShowLegBeamsCabinet = false;
                    shouldShowReinforcementBeamsCabinet = false;
                    
                    // בדיקה אם זה קורות מקוצרות או לא מקוצרות
                    const legParamForShortening = this.getParam('leg');
                    const legBeamSelected = legParamForShortening?.beams?.[legParamForShortening.selectedBeamIndex || 0];
                    const legBeamHeight = legBeamSelected?.height / 10 || 0;
                    const outsideParamCabForShortening = this.getParam('is-reinforcement-beams-outside');
                    const isOutsideCabForShortening = !!(outsideParamCabForShortening && outsideParamCabForShortening.default === true);
                    const defaultShorten = (legBeamHeight * 2);
                    const extraShorten = isOutsideCabForShortening ? (2 * (this.frameWidth || 0)) : 0;
                    const shortenedLength = Math.max(0.1, this.surfaceLength - (defaultShorten + extraShorten));
                    const fullLength = this.surfaceLength;
                    
                    const isShortenedBeam = Math.abs(firstUncheckedBeamLength - shortenedLength) < 0.1;
                    const isFullLengthBeam = Math.abs(firstUncheckedBeamLength - fullLength) < 0.1;
                    
                    // נציג רק את קורות המדף עם האורך הספציפי
                    // (זה יטופל בלוגיקה של יצירת הקורות)
                } else if (firstUncheckedParamName === 'leg') {
                    // אם הצ'קבוקס הנוכחי הוא של קורות רגל - נציג רק אותן
                    shouldShowShelfBeamsCabinet = false;
                    
                    const outsideParam = this.getParam('is-reinforcement-beams-outside');
                    const rawOutsideValue = outsideParam?.default;
                    const isExternalReinforcementEnabled =
                        typeof rawOutsideValue === 'number'
                            ? rawOutsideValue > 0
                            : rawOutsideValue === true;
                    
                    // בדיקה אם האורך הנוכחי תואם לקורות רגל רגילות או לקורות חיזוק
                    const dimensions = this.getProductDimensionsRaw();
                    const totalHeight = dimensions.height;
                    const shelfBeamHeight = (this.getParam('shelfs')?.beams?.[this.getParam('shelfs')?.selectedBeamIndex || 0]?.height || 0) / 10;
                    const legHeight = totalHeight - shelfBeamHeight;
                    const legParam = this.getParam('leg');
                    const legBeam = legParam?.beams?.[legParam.selectedBeamIndex || 0];
                    const legWidth = legBeam?.width / 10 || 0;
                    const legDepth = legBeam?.height / 10 || 0;
                    
                    let xReinforcementLength = Math.max(0.1, this.surfaceWidth - (2 * legWidth));
                    let zReinforcementLength = this.surfaceLength;
                    
                    if (isExternalReinforcementEnabled) {
                        xReinforcementLength = this.surfaceWidth + (2 * legWidth);
                        zReinforcementLength = Math.max(0.1, this.surfaceLength - (2 * legDepth));
                    }
                    
                    const isLegBeamLength = Math.abs(firstUncheckedBeamLength - legHeight) < 0.1; // השוואה עם טולרנס
                    const isReinforcementXLength = Math.abs(firstUncheckedBeamLength - xReinforcementLength) < 0.1;
                    const isReinforcementZLength = Math.abs(firstUncheckedBeamLength - zReinforcementLength) < 0.1;
                    const isReinforcementBeamLength = isReinforcementXLength || isReinforcementZLength;
                    
                    if (isExternalReinforcementEnabled) {
                        // קורות חיזוק חיצוניות (frame beams)
                        if (firstUncheckedReinforcementDirection === 'x-spanning' || firstUncheckedReinforcementDirection === 'z-spanning') {
                            shouldShowLegBeamsCabinet = false;
                            shouldShowReinforcementBeamsCabinet = true;
                        } else {
                            shouldShowLegBeamsCabinet = isLegBeamLength || !isReinforcementBeamLength;
                            shouldShowReinforcementBeamsCabinet = isReinforcementBeamLength;
                        }
                    } else {
                        // מצב ללא קורות חיזוק חיצוניות - מציגים רק רגליים
                        if (isLegBeamLength || firstUncheckedReinforcementDirection === null) {
                            shouldShowLegBeamsCabinet = true;
                            shouldShowReinforcementBeamsCabinet = false;
                        } else if (isReinforcementBeamLength) {
                            shouldShowLegBeamsCabinet = false;
                            shouldShowReinforcementBeamsCabinet = true;
                        }
                    }
                }
            }
            
            // לוג זה נשאר אך אינו כבד
            console.log('CHACH_3D_DELAY UPDATE_BEAMS_SHELF_LOOP', JSON.stringify({
                shelfIndex: shelfIndex + 1,
                shouldShowShelfBeamsCabinet: shouldShowShelfBeamsCabinet,
                shouldShowReinforcementBeamsCabinet: shouldShowReinforcementBeamsCabinet,
                isPreliminaryDrillsCabinet: isPreliminaryDrillsCabinet,
                firstUncheckedParamCabinet: firstUncheckedParamCabinet,
                timestamp: performance.now()
            }, null, 2));

            // הצגת קורות מדף רק אם צריך
            if (shouldShowShelfBeamsCabinet) {
            // 🎯 חישוב פעם אחת לפני הלולאה כדי למנוע קריאות חוזרות
            const isPreliminaryDrillsForScrews = this.isPreliminaryDrillsMode(true); // skipLog = true
            const firstUncheckedKeyForScrews = isPreliminaryDrillsForScrews ? this.getFirstUncheckedBeamParamName() : null;
            const firstUncheckedParamForScrews = firstUncheckedKeyForScrews ? firstUncheckedKeyForScrews.split('-')[0] : null;
            const isPreliminaryDrillsShelfForScrews = isPreliminaryDrillsForScrews && firstUncheckedParamForScrews === 'shelfs';
            
            this.startTimer(`CABINET - Render ${surfaceBeams.length} Beams for Shelf ${shelfIndex + 1}`);
            const surfaceBeamsStartTime = performance.now();
            console.log('CHACH_3D_DELAY SURFACE_BEAMS_LOOP_START', JSON.stringify({
                shelfIndex: shelfIndex + 1,
                surfaceBeamsCount: surfaceBeams.length,
                timestamp: surfaceBeamsStartTime
            }, null, 2));
            for (let i = 0; i < surfaceBeams.length; i++) {
                let beam = { ...surfaceBeams[i] };
                // Only shorten first and last beam in the length (depth) direction for non-top shelves
                // Top shelf (last shelf) gets full-length beams
                const isTopShelf = shelfIndex === totalShelves - 1;

                    // בדיקה אם להסתיר קורות בגלל חסימת רגליים
                    const beamAndGapWidth = shelfBeamWidth + gapBetweenBeams;
                    const shouldHideBeams =
                        beamAndGapWidth < legWidth && !isTopShelf;
                    
                    // חישוב כמה קורות למחוק מכל צד (לוגיקה חדשה)
                    let beamsToHidePerSide = 0;
                    let howManyFit = 0;
                    if (shouldHideBeams) {
                        howManyFit = Math.floor(legWidth / beamAndGapWidth);
                        beamsToHidePerSide = Math.max(0, howManyFit);
                        const middleBeamsCount = surfaceBeams.length - 2;
                        beamsToHidePerSide = Math.min(beamsToHidePerSide, Math.floor(middleBeamsCount / 2));
                    }
                    
                    // בדיקה אם הקורה הנוכחית צריכה להיות מוסתרת
                    let shouldSkipThisBeam = shouldHideBeams && (
                        (i >= 1 && i < 1 + beamsToHidePerSide) || // קורות מהצד השמאלי
                        (i >= surfaceBeams.length - 1 - beamsToHidePerSide && i < surfaceBeams.length - 1) // קורות מהצד הימני
                    );
                    
                    // בדיקה נוספת לארון: האם הקורה המקוצרת צרה מדי
                    if (!this.isTable && !this.isFuton && !isTopShelf) { // רק לארון ולא המדף העליון
                        const halfLegWidth = legWidth / 2;
                        const shouldRemoveShortenedBeam = shelfBeamWidth < halfLegWidth && (i === 0 || i === surfaceBeams.length - 1);
                        
                        
                        if (shouldRemoveShortenedBeam) {
                            // הקורה המקוצרת צרה מדי - הסר אותה
                            shouldSkipThisBeam = true;
                        }
                    }

                    // CHECH_MULTI_REMOVE_3D - Log for 3D model beam removal
                    if (shouldHideBeams) {
                    }

                    if (shouldSkipThisBeam) {
                        this.debugLog(
                            `   - מדלג על קורה ${i + 1} (חסומה על ידי רגל)`
                        );
                        continue; // מדלג על יצירת הקורה הזאת
                    }
                    
                    // 🎯 קודם נקבע אם ליישם קיצור, ואז נבדוק אם להציג את הקורה לפי האורך הסופי
                    // האם ליישם קיצור בקצוות? במצב הוראות: רק אם הצעד הנוכחי הוא "מקוצרות"
                    let shouldApplyShortening = true;
                    let shortenedLengthTarget = 0;
                    let fullLengthTarget = this.surfaceLength;
                    
                    // 🎯 לוג ראשוני - מצב התחלתי
                    if (isPreliminaryDrillsCabinet && firstUncheckedCompositeKey) {
                        const partsLocal = firstUncheckedCompositeKey.split('-');
                        const paramLocal = partsLocal[0];
                        const targetLengthLocal = parseFloat(partsLocal.slice(1).join('-'));
                        
                        if (paramLocal === 'shelfs') {
                            console.log('CHACH_3D_DELAY SHELF_BEAM_DECISION_START', JSON.stringify({
                                shelfIndex: shelfIndex + 1,
                                beamIndex: i,
                                isTopShelf,
                                activeCompositeKey: firstUncheckedCompositeKey,
                                targetLengthFromKey: targetLengthLocal,
                                originalBeamDepth: beam.depth,
                                surfaceLength: this.surfaceLength
                            }, null, 2));
                            
                            // חשב את אורכי היעד כמו קודם
                            const legParamForShorteningCalc = this.getParam('leg');
                            const legBeamSelectedCalc = legParamForShorteningCalc?.beams?.[legParamForShorteningCalc.selectedBeamIndex || 0];
                            const legBeamHeightCalc = legBeamSelectedCalc?.height / 10 || 0;
                            const outsideParamCabCalc = this.getParam('is-reinforcement-beams-outside');
                            const isOutsideCabCalc = !!(outsideParamCabCalc && outsideParamCabCalc.default === true);
                            const defaultShortenCalc = (legBeamHeightCalc * 2);
                            const extraShortenCalc = isOutsideCabCalc ? (2 * (this.frameWidth || 0)) : 0;
                            shortenedLengthTarget = Math.max(0.1, this.surfaceLength - (defaultShortenCalc + extraShortenCalc));
                            fullLengthTarget = this.surfaceLength;
                            const isFullLengthTarget = Math.abs(targetLengthLocal - fullLengthTarget) < 0.1;
                            const isShortenedTarget = Math.abs(targetLengthLocal - shortenedLengthTarget) < 0.1;
                            // ליישם קיצור רק אם היעד הוא "מקוצרות"
                            shouldApplyShortening = isShortenedTarget;
                            
                            console.log('CHACH_3D_DELAY SHORTEN_CALCULATION', JSON.stringify({
                                shelfIndex: shelfIndex + 1,
                                beamIndex: i,
                                targetLengthFromKey: targetLengthLocal,
                                legBeamHeightCm: legBeamHeightCalc,
                                defaultShortenCm: defaultShortenCalc,
                                extraShortenCm: extraShortenCalc,
                                shortenedLengthTarget,
                                fullLengthTarget,
                                isFullLengthTarget,
                                isShortenedTarget,
                                shouldApplyShortening,
                                isEndBeam: !isTopShelf && (i === 0 || i === surfaceBeams.length - 1)
                            }, null, 2));
                        }
                    }
                    
                    // בדיקה אם זה קורות מקוצרות או לא מקוצרות לפי הצ'קבוקס הנוכחי
                    // 🎯 עכשיו נבדוק את האורך הסופי של הקורה (אחרי החלטה על קיצור)
                    let shouldShowThisBeam = true;
                    
                    if (isPreliminaryDrillsCabinet && firstUncheckedCompositeKey) {
                        const parts = firstUncheckedCompositeKey.split('-');
                        const firstUncheckedParamNameLocal = parts[0]; // 'shelfs' או 'leg'
                        const firstUncheckedBeamLengthLocal = parseFloat(parts.slice(1).join('-')); // אורך הקורה
                        
                        if (firstUncheckedParamNameLocal === 'shelfs') {
                            // חישוב אורך הקורה הסופי (אחרי החלטה על קיצור)
                            let finalBeamLength: number;
                            
                            // אם הקורה הזו אמורה להיות מקוצרת
                            if (shouldApplyShortening && !isTopShelf && (i === 0 || i === surfaceBeams.length - 1)) {
                                finalBeamLength = shortenedLengthTarget;
                            } else {
                                // קורה לא מקוצרת
                                finalBeamLength = fullLengthTarget;
                            }
                            
                            // השוואה עם האורך של הצ'קבוקס הנוכחי
                            const isCurrentBeamShortened = Math.abs(finalBeamLength - shortenedLengthTarget) < 0.1;
                            const isCurrentBeamFullLength = Math.abs(finalBeamLength - fullLengthTarget) < 0.1;
                            const isShortenedBeamCheck = Math.abs(firstUncheckedBeamLengthLocal - shortenedLengthTarget) < 0.1;
                            const isFullLengthBeamCheck = Math.abs(firstUncheckedBeamLengthLocal - fullLengthTarget) < 0.1;
                            
                            // אם הצ'קבוקס הוא של קורות מקוצרות - נציג רק קורות מקוצרות
                            if (isShortenedBeamCheck) {
                                shouldShowThisBeam = isCurrentBeamShortened;
                            } else if (isFullLengthBeamCheck) {
                                // אם הצ'קבוקס הוא של קורות לא מקוצרות - נציג רק קורות לא מקוצרות
                                shouldShowThisBeam = isCurrentBeamFullLength;
                            }
                            
                            console.log('CHACH_3D_DELAY SHELF_BEAM_VISIBILITY_DECISION', JSON.stringify({
                                shelfIndex: shelfIndex + 1,
                                beamIndex: i,
                                isTopShelf,
                                activeCompositeKey: firstUncheckedCompositeKey,
                                targetLengthFromKey: firstUncheckedBeamLengthLocal,
                                finalBeamLength,
                                shortenedLengthTarget,
                                fullLengthTarget,
                                shouldApplyShortening,
                                isEndBeam: !isTopShelf && (i === 0 || i === surfaceBeams.length - 1),
                                calculations: {
                                    isCurrentBeamShortened,
                                    isCurrentBeamFullLength,
                                    isShortenedBeamCheck,
                                    isFullLengthBeamCheck,
                                    shortenedDiff: Math.abs(finalBeamLength - shortenedLengthTarget),
                                    fullLengthDiff: Math.abs(finalBeamLength - fullLengthTarget),
                                    targetToShortenedDiff: Math.abs(firstUncheckedBeamLengthLocal - shortenedLengthTarget),
                                    targetToFullLengthDiff: Math.abs(firstUncheckedBeamLengthLocal - fullLengthTarget)
                                },
                                decision: {
                                    shouldShowThisBeam,
                                    reason: isShortenedBeamCheck 
                                        ? (isCurrentBeamShortened ? 'SHOW_SHORTENED' : 'HIDE_NOT_SHORTENED')
                                        : isFullLengthBeamCheck
                                        ? (isCurrentBeamFullLength ? 'SHOW_FULL_LENGTH' : 'HIDE_NOT_FULL_LENGTH')
                                        : 'SHOW_ALL'
                                }
                            }, null, 2));
                        }
                    } else {
                        // לא במצב preliminary-drills - לוג קצר
                        if (isPreliminaryDrillsCabinet) {
                            console.log('CHACH_3D_DELAY SHELF_BEAM_VISIBILITY_DECISION', JSON.stringify({
                                shelfIndex: shelfIndex + 1,
                                beamIndex: i,
                                isTopShelf,
                                activeCompositeKey: firstUncheckedCompositeKey,
                                note: 'NOT_IN_PRELIMINARY_DRILLS_MODE_OR_NOT_SHELFS',
                                shouldShowThisBeam: true
                            }, null, 2));
                        }
                    }
                    
                    if (!shouldShowThisBeam) {
                        console.log('CHACH_3D_DELAY SHELF_BEAM_SKIPPED', JSON.stringify({
                            shelfIndex: shelfIndex + 1,
                            beamIndex: i,
                            isTopShelf,
                            activeCompositeKey: firstUncheckedCompositeKey,
                            reason: 'shouldShowThisBeam = false'
                        }, null, 2));
                        continue; // מדלג על יצירת הקורה הזאת אם היא לא צריכה להיות מוצגת
                    }
                    if (
                        shouldApplyShortening &&
                        !isTopShelf &&
                        (i === 0 || i === surfaceBeams.length - 1)
                    ) {
                    const outsideParamCabShelves = this.getParam('is-reinforcement-beams-outside');
                    const isOutsideCabShelves = !!(outsideParamCabShelves && outsideParamCabShelves.default === true);
                    // Default: shorten by 2 * frameBeamWidth; Outside=true: shorten by (2 * frameBeamWidth) + (2 * legDepth)
                    const before = beam.depth;
                    if (isOutsideCabShelves) {
                        beam.depth = Math.max(0.1, beam.depth - ((2 * frameBeamWidth) + (2 * legDepth)));
                    } else {
                    beam.depth = beam.depth - 2 * frameBeamWidth;
                    }
                    try {
                        console.log('CHECK_SHORTEN_BEAM_is-reinforcement-beams-outside', JSON.stringify({
                            kind: 'SHELF_END_SHORTEN',
                            shelfIndex: shelfIndex + 1,
                            endIndex: i,
                            beforeDepth: before,
                            afterDepth: beam.depth,
                            defaultShortenCm: 2 * frameBeamWidth,
                            extraShortenOutsideCm: isOutsideCabShelves ? 2 * legDepth : 0,
                            totalShortenCm: (before - beam.depth)
                        }, null, 2));
                    } catch {}
                }
                    const geometry = new THREE.BoxGeometry(
                        beam.width,
                        beamHeightCorrect,
                        beam.depth
                    );
                    const material = this.getWoodMaterial(shelfType ? shelfType.name : '');
                const mesh = new THREE.Mesh(geometry, material);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                this.addWireframeToBeam(mesh); // הוספת wireframe במצב שקוף
                    mesh.position.set(
                        beam.x,
                        currentY + frameBeamHeightCorrect + beamHeightCorrect / 2,
                        0
                    );
                this.scene.add(mesh);
                this.beamMeshes.push(mesh);
                // הוספת ברגים או חורים לקורת המדף
                    let isShortenedBeam =
                        shouldApplyShortening &&
                        !isTopShelf &&
                        (i === 0 || i === surfaceBeams.length - 1)
                            ? 'not-top'
                            : 'top';
                    if (isShortenedBeam !== 'top') {
                    if (i === 0) {
                            isShortenedBeam = 'start';
                    } else {
                            isShortenedBeam = 'end';
                        }
                    }
                // הוספת ברגים לקורת מדף - תמיד (גם במצב preliminary-drills)
                    this.addScrewsToShelfBeam(
                        beam,
                        currentY + frameBeamHeightCorrect,
                        beamHeightCorrect,
                        frameBeamWidth,
                        isShortenedBeam,
                        isPreliminaryDrillsShelfForScrews // העברת התוצאה המחושבת מראש
                    );
                }
            const surfaceBeamsEndTime = performance.now();
            this.endTimer(`CABINET - Render ${surfaceBeams.length} Beams for Shelf ${shelfIndex + 1}`);
            console.log('CHACH_3D_DELAY SURFACE_BEAMS_LOOP_DONE', JSON.stringify({
                shelfIndex: shelfIndex + 1,
                surfaceBeamsCount: surfaceBeams.length,
                surfaceBeamsDuration: surfaceBeamsEndTime - surfaceBeamsStartTime,
                timestamp: surfaceBeamsEndTime
            }, null, 2));
            } // סיום if (shouldShowShelfBeamsCabinet)
            
            const isAssemblyInstructionStep =
                this.isInstructionMode && isPreliminaryDrillsCabinet;
            const shouldRenderReinforcementBeams =
                !isAssemblyInstructionStep || shouldShowReinforcementBeamsCabinet;
            const outsideParamCabAdj = this.getParam('is-reinforcement-beams-outside');
            const isOutsideCabAdj = !!(outsideParamCabAdj && outsideParamCabAdj.default === true);

            const decisionPayload = {
                shelfIndex: shelfIndex + 1,
                isAssemblyInstructionStep,
                shouldShowReinforcementBeamsCabinet,
                shouldRenderReinforcementBeams,
                activeCompositeKey: activeCompositeKeyCabinet,
                isOutsideReinforcementEnabled: isOutsideCabAdj
            };
            const decisionSignature = JSON.stringify(decisionPayload);
            if (!this.reinforcementDecisionLogSignatures.has(decisionSignature)) {
                this.reinforcementDecisionLogSignatures.add(decisionSignature);
                console.log(
                    'CHACH_EXTRA_STEP reinforcement render decision',
                    decisionSignature
                );
            }

            if (shouldRenderReinforcementBeams) {
                if (!this.reinforcementLogPrinted) {
                    try {
                        console.log('CHACK_is-reinforcement-beams-outside - A_USED', JSON.stringify({
                            product: this.product?.translatedName || this.product?.name,
                            stage: 'A_USED_CABINET',
                            a_legProfileWidthCm_used: legWidth,
                            b_legProfileHeightCm_used: legDepth
                        }, null, 2));
                    } catch {}
                    this.reinforcementLogPrinted = true;
                }

                this.startTimer(`CABINET - Create and Render Frame Beams for Shelf ${shelfIndex + 1}`);
                const frameBeamsStartTime = performance.now();
                const frameBeams = this.createFrameBeams(
                    this.surfaceWidth,
                    this.surfaceLength,
                    frameBeamWidth,
                    frameBeamHeight,
                    legWidth,
                    legDepth
                );

                const activeReinforcementDirection =
                    activeCompositeKeyCabinet?.includes('x-spanning')
                        ? 'x-spanning'
                        : activeCompositeKeyCabinet?.includes('z-spanning')
                            ? 'z-spanning'
                            : null;
                const activeReinforcementParam =
                    activeCompositeKeyCabinet?.split('-')[0] || null;
                const lengthMatchForComposite =
                    activeCompositeKeyCabinet?.match(/(-?\d+(\.\d+)?)$/);
                const activeReinforcementLength = lengthMatchForComposite
                    ? parseFloat(lengthMatchForComposite[1])
                    : NaN;
                const reinforcementLengthTolerance = 0.5;

                for (const beam of frameBeams) {
                    let widthToUseCab = beam.width;
                    let depthToUseCab = beam.depth;
                    
                    // Better identification: X-spanning beams have x=0 (centered), Z-spanning beams have z=0 (centered)
                    // This is more reliable than comparing dimensions, especially when surfaceLength is small
                    const positionTolerance = 0.001; // Small tolerance for floating point comparison
                    const isXSpan = Math.abs(beam.x) <= positionTolerance; // X-spanning beams are centered on X-axis
                    const isZSpan = Math.abs(beam.z) <= positionTolerance; // Z-spanning beams are centered on Z-axis
                    
                    if (isOutsideCabAdj) {
                        // a = legWidth, b = legDepth (from earlier cabinet calculations)
                        const a_extend = legWidth;
                        const b_shorten = legDepth;
                        
                        if (isXSpan && a_extend > 0) {
                            widthToUseCab = beam.width + (2 * a_extend);
                        }
                        if (isZSpan && b_shorten > 0) {
                            // Shorten on both ends: total reduction = 2 * b
                            depthToUseCab = Math.max(0.1, beam.depth - (2 * b_shorten));
                        }
                    }
                    const geometry = new THREE.BoxGeometry(
                        widthToUseCab,
                        frameBeamHeightCorrect,
                        depthToUseCab
                    );
                    const material = this.getWoodMaterial(frameType ? frameType.name : '');
                const mesh = new THREE.Mesh(geometry, material);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                this.addWireframeToBeam(mesh); // הוספת wireframe במצב שקוף
                const frameY = currentY + frameBeamHeightCorrect / 2;
                mesh.position.set(beam.x, frameY, beam.z);
                
                // Calculate and log all 8 corners for X-spanning beams
                if (isXSpan) {
                    const halfWidth = widthToUseCab / 2;
                    const halfHeight = frameBeamHeightCorrect / 2;
                    const halfDepth = depthToUseCab / 2;
                    
                    // 8 corners of the beam box
                    // Using standard box corner naming: front-back, left-right, bottom-top
                    const corners = [
                        // Front face (positive Z) - bottom left
                        {
                            name: 'front-left-bottom',
                            x: beam.x - halfWidth,
                            y: frameY - halfHeight,
                            z: beam.z + halfDepth
                        },
                        // Front face - bottom right
                        {
                            name: 'front-right-bottom',
                            x: beam.x + halfWidth,
                            y: frameY - halfHeight,
                            z: beam.z + halfDepth
                        },
                        // Front face - top left
                        {
                            name: 'front-left-top',
                            x: beam.x - halfWidth,
                            y: frameY + halfHeight,
                            z: beam.z + halfDepth
                        },
                        // Front face - top right
                        {
                            name: 'front-right-top',
                            x: beam.x + halfWidth,
                            y: frameY + halfHeight,
                            z: beam.z + halfDepth
                        },
                        // Back face (negative Z) - bottom left
                        {
                            name: 'back-left-bottom',
                            x: beam.x - halfWidth,
                            y: frameY - halfHeight,
                            z: beam.z - halfDepth
                        },
                        // Back face - bottom right
                        {
                            name: 'back-right-bottom',
                            x: beam.x + halfWidth,
                            y: frameY - halfHeight,
                            z: beam.z - halfDepth
                        },
                        // Back face - top left
                        {
                            name: 'back-left-top',
                            x: beam.x - halfWidth,
                            y: frameY + halfHeight,
                            z: beam.z - halfDepth
                        },
                        // Back face - top right
                        {
                            name: 'back-right-top',
                            x: beam.x + halfWidth,
                            y: frameY + halfHeight,
                            z: beam.z - halfDepth
                        }
                    ];
                    
                    console.log('CHECK_FLAT_BEAM', JSON.stringify({
                        beamType: 'X-spanning',
                        shelfIndex: shelfIndex + 1,
                        beamCenter: {
                            x: beam.x,
                            y: frameY,
                            z: beam.z
                        },
                        beamDimensions: {
                            width: widthToUseCab,
                            height: frameBeamHeightCorrect,
                            depth: depthToUseCab
                        },
                        beamOriginal: {
                            width: beam.width,
                            depth: beam.depth
                        },
                        isOutsideCabAdj: isOutsideCabAdj,
                        corners: corners
                    }, null, 2));
                }
                
                    let willAddMesh = false;
                    let skipReason: string | null = null;
                    let matchingDirection: string | null = null;
                    let lengthMatches: boolean | null = null;
                    let lengthDifference: number | null = null;
                    let lengthMismatch: boolean | null = null;
                    const beamOrientation = isXSpan ? 'x-spanning' : isZSpan ? 'z-spanning' : 'unknown';
                    const evaluationMode = isAssemblyInstructionStep ? 'instruction' : 'edit';

                    if (!isAssemblyInstructionStep) {
                        willAddMesh = true;
                        matchingDirection = beamOrientation !== 'unknown' ? beamOrientation : null;
                    } else if (!shouldShowReinforcementBeamsCabinet) {
                        skipReason = 'instruction-step-not-target';
                    } else if (!activeCompositeKeyCabinet) {
                        skipReason = 'missing-active-composite-key';
                    } else {
                        if (activeReinforcementParam !== 'leg' || !activeReinforcementDirection) {
                            skipReason = 'composite-key-mismatch';
                        } else {
                            const directionMatches =
                                activeReinforcementDirection === 'x-spanning'
                                    ? isXSpan
                                    : activeReinforcementDirection === 'z-spanning'
                                        ? isZSpan
                                        : false;
                            if (!directionMatches) {
                                skipReason = 'direction-mismatch';
                            } else {
                                const targetLength =
                                    activeReinforcementDirection === 'x-spanning'
                                        ? widthToUseCab
                                        : depthToUseCab;
                                if (Number.isFinite(activeReinforcementLength)) {
                                    lengthDifference = activeReinforcementLength - targetLength;
                                    lengthMatches =
                                        Math.abs(lengthDifference) < reinforcementLengthTolerance;
                                    lengthMismatch = !lengthMatches;
                                } else {
                                    lengthMatches = null;
                                    lengthMismatch = null;
                                }

                                willAddMesh = true;
                                matchingDirection = activeReinforcementDirection;
                            }
                        }
                    }

                    const beamLogPayload = {
                        shelfIndex: shelfIndex + 1,
                        activeCompositeKey: activeCompositeKeyCabinet,
                        beamOrientation,
                        widthToUse: widthToUseCab,
                        depthToUse: depthToUseCab,
                        originalWidth: beam.width,
                        originalDepth: beam.depth,
                        frameY,
                        isOutside: isOutsideCabAdj,
                        isAssemblyInstructionStep,
                        shouldShowReinforcementBeamsCabinet,
                        evaluationMode,
                        willAddMesh,
                        skipReason,
                        matchingDirection,
                        lengthMatches,
                        lengthDifference,
                        lengthMismatch
                    };
                    const beamLogSignature = JSON.stringify(beamLogPayload);

                    if (willAddMesh) {
                        if (!this.reinforcementRenderLogSignatures.has(beamLogSignature)) {
                            this.reinforcementRenderLogSignatures.add(beamLogSignature);
                            console.log(
                                'CHACH_EXTRA_STEP reinforcement beam render',
                                beamLogSignature
                            );
                        }
                        this.scene.add(mesh);
                        this.beamMeshes.push(mesh);
                    } else if (skipReason) {
                        if (!this.reinforcementRenderSkipLogSignatures.has(beamLogSignature)) {
                            this.reinforcementRenderSkipLogSignatures.add(beamLogSignature);
                            console.log(
                                'CHACH_EXTRA_STEP reinforcement beam skipped',
                                beamLogSignature
                            );
                        }
                    }
                }
                // סיום לולאת frameBeams
                const frameBeamsEndTime = performance.now();
                this.endTimer(`CABINET - Create and Render Frame Beams for Shelf ${shelfIndex + 1}`);
                console.log('CHACH_3D_DELAY FRAME_BEAMS_LOOP_DONE', JSON.stringify({
                    shelfIndex: shelfIndex + 1,
                    frameBeamsCount: frameBeams.length,
                    frameBeamsDuration: frameBeamsEndTime - frameBeamsStartTime,
                    timestamp: frameBeamsEndTime
                }, null, 2));
            }
            
            // Add the height of the shelf itself for the next shelf
            currentY += frameBeamHeightCorrect + beamHeightCorrect;
            const shelfEndTime = performance.now();
            this.endTimer(`CABINET - Shelf ${shelfIndex + 1}`);
            console.log('CHACH_3D_DELAY SHELF_DONE', JSON.stringify({ 
                shelfIndex: shelfIndex + 1,
                totalShelves: this.shelves.length,
                shelfDuration: shelfEndTime - shelfStartTime,
                currentY: currentY,
                totalMeshesSoFar: this.beamMeshes.length,
                timestamp: shelfEndTime
            }, null, 2));
        }
        const shelvesLoopEndTime = performance.now();
        this.endTimer('CABINET - Total Rendering');
        const endTs = (typeof performance !== 'undefined' && (performance as any).now) ? (performance as any).now() : Date.now();
        console.log('CHACH_3D_DELAY RENDER_COMPLETE', JSON.stringify({ 
            durationMs: endTs - this._updateBeamsStartTs,
            shelvesLoopDuration: shelvesLoopEndTime - shelvesLoopStartTime,
            totalShelves: this.shelves.length,
            totalMeshes: this.beamMeshes.length,
            timestamp: endTs
        }, null, 2));
        
        // לא מעדכן מיקום מצלמה/zoom אחרי עדכון אלמנטים
        // Ensure scene rotation is maintained after updates
        this.scene.rotation.y = Math.PI / 6; // 30 degrees rotation
        // Add wireframe cube showing product dimensions (only if enabled)
        if (this.showWireframe) {
        this.addWireframeCube();
        }
        
        // אתחול המצלמה אחרי שהמודל נטען - רק בטעינה ראשונית
        if (isInitialLoad) {
            this.startTimer('Camera Initialization');
            if (this.isBelams) {
                // הגדרת מיקום הסצנה עבור beams - זהה לשאר המוצרים
                this.scene.position.y = -120;
                this.centerCameraOnBeams();
            } else {
                // הגדרת מיקום הסצנה עבור שאר המוצרים
                this.scene.position.y = -120;
                this.centerCameraOnWireframe();
            }
            this.endTimer('Camera Initialization');
        }
        
        this.endTimer('TOTAL_UPDATE_BEAMS');
        
        // חישוב מחיר ברקע אחרי הרינדור
        setTimeout(() => {
            this.calculatePricing();
        }, 0);
        
        // הפעלת resetCameraView אחרי שניה מסיום העדכון - רק אם זה לא טעינה ראשונית
        // בטעינה ראשונית המצלמה כבר מוגדרת ב-centerCameraOnBeams/centerCameraOnWireframe
        if (!isInitialLoad) {
            setTimeout(() => {
                this.resetCameraView();
            }, 1000);
        }
        
        }
        } finally {
            // סימון שסיימנו ריצה
            const finallyStartTime = performance.now();
            this._updateBeamsInFlight = false;
            const pending = this._pendingUpdateBeams;
            this._pendingUpdateBeams = null;
            console.log('CHACH_3D_DELAY FINALLY_START', JSON.stringify({ 
                hasPending: !!pending,
                timestamp: finallyStartTime
            }, null, 2));
            // אם התקבלה בקשה בזמן ריצה - נריץ עדכון נוסף מיידית (ממוזער)
            if (pending) {
                console.log('CHACH_3D_DELAY PENDING_FLUSH', JSON.stringify({ 
                    pending: pending,
                    timestamp: performance.now()
                }, null, 2));
                this.scheduleUpdateBeams(pending.skipPricing === true, 0);
            }
            const endTs = (typeof performance !== 'undefined' && (performance as any).now) ? (performance as any).now() : Date.now();
            console.log('CHACH_3D_DELAY UPDATE_FINALLY_DONE', JSON.stringify({ 
                totalDurationMs: endTs - this._updateBeamsStartTs,
                finalMeshCount: this.beamMeshes.length,
                finalScrewGroupCount: this.screwGroups.length,
                timestamp: endTs
            }, null, 2));
        }
    }
    
    
    // Add wireframe cube showing product dimensions with shortened lines and corner spheres
    private addWireframeCube() {
        
        // Remove existing wireframe cube if it exists
        const existingWireframe =
            this.scene.getObjectByName('productWireframe');
        if (existingWireframe) {
            this.scene.remove(existingWireframe);
        } else {
        }
        
        // Get product dimensions
        const dimensions = this.getProductDimensionsRaw();
        const { length, width, height } = dimensions;
        
        
        // Create custom wireframe group
        const wireframeGroup = new THREE.Group();
        const wireframeMaterial = new THREE.LineBasicMaterial({
            color: 0x0066cc, // Blue color
            linewidth: 2,
        });
        // Create cube material for corner cubes
        const cubeMaterial = new THREE.MeshStandardMaterial({
            color: 0x0066cc, // Same blue color
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
            new THREE.Vector3(-halfWidth, -halfHeight, halfLength), // front-left-bottom
            new THREE.Vector3(halfWidth, -halfHeight, halfLength), // front-right-bottom
            new THREE.Vector3(-halfWidth, -halfHeight, -halfLength), // back-left-bottom
            new THREE.Vector3(halfWidth, -halfHeight, -halfLength), // back-right-bottom
            // Top corners
            new THREE.Vector3(-halfWidth, halfHeight, halfLength), // front-left-top
            new THREE.Vector3(halfWidth, halfHeight, halfLength), // front-right-top
            new THREE.Vector3(-halfWidth, halfHeight, -halfLength), // back-left-top
            new THREE.Vector3(halfWidth, halfHeight, -halfLength), // back-right-top
        ];
        // Add corner cubes
        corners.forEach((corner) => {
            const cubeGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8); // 0.8x0.8x0.8 cube - larger
            const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
            cube.position.copy(corner);
            wireframeGroup.add(cube);
        });
        // Helper function to shorten line from both ends
        const createShortenedLine = (
            start: THREE.Vector3,
            end: THREE.Vector3
        ) => {
            const direction = new THREE.Vector3()
                .subVectors(end, start)
                .normalize();
            const shortenedStart = start
                .clone()
                .add(direction.clone().multiplyScalar(shortenDistance));
            const shortenedEnd = end
                .clone()
                .sub(direction.clone().multiplyScalar(shortenDistance));
            const geometry = new THREE.BufferGeometry().setFromPoints([
                shortenedStart,
                shortenedEnd,
            ]);
            const line = new THREE.Line(geometry, wireframeMaterial);
            return line;
        };
        // Bottom face edges (4 edges)
        const bottomEdges = [
            [corners[0], corners[1]], // front edge
            [corners[2], corners[3]], // back edge
            [corners[2], corners[0]], // left edge
            [corners[1], corners[3]], // right edge
        ];
        // Top face edges (4 edges)
        const topEdges = [
            [corners[4], corners[5]], // front edge
            [corners[6], corners[7]], // back edge
            [corners[6], corners[4]], // left edge
            [corners[5], corners[7]], // right edge
        ];
        // Vertical edges (4 edges)
        const verticalEdges = [
            [corners[0], corners[4]], // front-left
            [corners[1], corners[5]], // front-right
            [corners[2], corners[6]], // back-left
            [corners[3], corners[7]], // back-right
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
    private addDimensionTexts(
        wireframeGroup: THREE.Group,
        length: number,
        width: number,
        height: number
    ) {
        // Calculate positions for dimension labels
        const halfWidth = width / 2;
        const halfHeight = height / 2;
        const halfLength = length / 2;
        // Define all 8 corner positions
        const corners = [
            // Bottom corners
            new THREE.Vector3(-halfWidth, -halfHeight, halfLength), // front-left-bottom
            new THREE.Vector3(halfWidth, -halfHeight, halfLength), // front-right-bottom
            new THREE.Vector3(-halfWidth, -halfHeight, -halfLength), // back-left-bottom
            new THREE.Vector3(halfWidth, -halfHeight, -halfLength), // back-right-bottom
            // Top corners
            new THREE.Vector3(-halfWidth, halfHeight, halfLength), // front-left-top
            new THREE.Vector3(halfWidth, halfHeight, halfLength), // front-right-top
            new THREE.Vector3(-halfWidth, halfHeight, -halfLength), // back-left-top
            new THREE.Vector3(halfWidth, halfHeight, -halfLength), // back-right-top
        ];
        // Helper function to create text sprite
        const createTextSprite = (number: number, position: THREE.Vector3) => {
            // Calculate font size based on product dimensions
            const maxDimension = Math.max(length, width, height);
            let fontSize = 48; // Default font size

            // If the largest dimension is less than 100cm, reduce font size proportionally
            if (maxDimension < 100) {
                // Scale font size proportionally to the largest dimension
                // Minimum font size of 24px, maximum of 48px
                fontSize = Math.max(
                    24,
                    Math.min(48, (maxDimension / 100) * 48)
                );
            }

            this.debugLog(
                `Wireframe font size: ${fontSize}px for max dimension: ${maxDimension}cm (L:${length}, W:${width}, H:${height})`
            );

            // Create canvas for text rendering
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d')!;
            canvas.width = 512;
            canvas.height = 128;
            // Clear canvas with transparent background
            context.clearRect(0, 0, canvas.width, canvas.height);
            // Draw number with calculated font size
            context.font = `${fontSize}px Arial`;
            context.fillStyle = '#002266'; // Even darker blue
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            const numberText =
                number % 1 === 0 ? number.toString() : number.toFixed(1); // מספרים עגולים בלי .0, לא עגולים עם נקודה עשרונית
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
                color: 0xffffff, // White color to preserve original texture colors
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
        const getMiddlePoint = (
            corner1: THREE.Vector3,
            corner2: THREE.Vector3
        ) => {
            return new THREE.Vector3()
                .addVectors(corner1, corner2)
                .multiplyScalar(0.5);
        };
        // Helper function to get outward direction for text positioning
        const getOutwardDirection = (
            corner1: THREE.Vector3,
            corner2: THREE.Vector3
        ) => {
            const direction = new THREE.Vector3()
                .subVectors(corner2, corner1)
                .normalize();
            const middle = getMiddlePoint(corner1, corner2);
            // Determine outward direction based on edge position
            if (Math.abs(direction.x) > 0.9) {
                // Vertical edges (width)
                return new THREE.Vector3(0, 0, middle.z > 0 ? 1 : -1);
            } else if (Math.abs(direction.z) > 0.9) {
                // Horizontal edges (length)
                return new THREE.Vector3(0, middle.y > 0 ? 1 : -1, 0);
            } else {
                // Height edges
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
            { start: corners[3], end: corners[7], value: height }, // back-right
        ];
        edges.forEach((edge) => {
            const middle = getMiddlePoint(edge.start, edge.end);
            // Calculate rotation to align text with edge direction
            const direction = new THREE.Vector3()
                .subVectors(edge.end, edge.start)
                .normalize();
            // Adjust position - move outward by 3cm for all edges
            let textPosition = middle.clone();
            if (Math.abs(direction.z) > 0.9) {
                // Front/back edges (length) - move outward in X direction by 3cm
                if (textPosition.x > 0) {
                    textPosition.x += 3; // Move right
                } else {
                    textPosition.x -= 3; // Move left
                }
                // Move up by 1.5cm only for bottom edges (Y < 0)
                if (textPosition.y < 0) {
                    textPosition.y += 1.5; // Move up (only bottom edges)
                }
                textPosition = createTextSprite(edge.value, textPosition);
                textPosition.rotation.z = 0;
            } else if (Math.abs(direction.x) > 0.9) {
                // Left/right edges (width) - move outward in Z direction by 3cm
                if (textPosition.z > 0) {
                    textPosition.z += 3; // Move forward
                } else {
                    textPosition.z -= 3; // Move backward
                }
                // Move up by 1.5cm only for bottom edges (Y < 0)
                if (textPosition.y < 0) {
                    textPosition.y += 1.5; // Move up (only bottom edges)
                }
                textPosition = createTextSprite(edge.value, textPosition);
                textPosition.rotation.z = Math.PI / 2;
            } else {
                // Vertical edges (height) - move outward by 3cm
                // Move outward in X and Z directions by 3cm
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
        this.debugLog('Added dimension texts for all 12 edges');
        
        // Add the wireframe group to the scene
        wireframeGroup.name = 'productWireframe';
        this.scene.add(wireframeGroup);
        
        
        // CHACH_ALLERT - Log final alert states
    }
    // Update model when any parameter changes (alias for updateBeams)
    updateModel() {
        // Validate all parameters before updating
        this.params.forEach((param) => {
            if (param.type !== 'beamSingle' && param.type !== 'beamArray') {
                // For numeric parameters, validate the value
                if (typeof param.default === 'number') {
                    const validatedValue = this.validateParameterValue(
                        param,
                        param.default
                    );
                    if (validatedValue !== param.default) {
                        param.default = validatedValue;
                    }
                }
            }
        });
        this.updateBeams();
    }
    // פונקציה לחישוב חומרים (קורות) לחישוב מחיר
    async calculatePricing() {
        
        // איפוס המחיר למצב "מחשב..." (0 מציג את הספינר)
        this.calculatedPrice = 0;
        
        // איפוס המחירים הדינמיים כשעושים חישוב מחדש מלא (רק אם לא נשמרו מקוריים)
        if (this.originalBeamsPrice === 0) {
            this.dynamicBeamsPrice = 0;
        }
        if (this.originalCuttingPrice === 0) {
            this.dynamicCuttingPrice = 0;
        }
        if (this.originalScrewsPrice === 0) {
            this.dynamicScrewsPrice = 0;
        }
        this.hasBeamsChanged = false;
        this.hasScrewsChanged = false;
        
        await this.calculateBeamsData();
        
        // עבור מוצר קורות - אין ברגים, אבל עדיין צריך לקרוא ל-calculateForgingData
        if (this.isBelams) {
            this.ForgingDataForPricing = []; // אין ברגים במוצר קורות
            this.debugLog('מוצר קורות - אין ברגים לחישוב מחיר');
            
            // חישוב מחיר עבור מוצר קורות
            this.calculatedPrice = await this.pricingService.calculatePrice(
                this.BeamsDataForPricing,
                this.ForgingDataForPricing
            );
            this.cuttingPlan = await this.pricingService.getCuttingPlan(
                this.BeamsDataForPricing,
                this.ForgingDataForPricing
            );
            this.screwsPackagingPlan = this.pricingService.getScrewsPackagingPlan(
                this.ForgingDataForPricing
            );
            this.debugLog('=== FINAL CALCULATED PRICE FOR BEAMS ===', this.calculatedPrice);
            this.debugLog('=== CUTTING PLAN FOR BEAMS ===', this.cuttingPlan);
            this.debugLog('=== SCREWS PACKAGING PLAN ===', this.screwsPackagingPlan);
        }
        
        // שמירת מצב מקורי של הקורות בסוף החישוב הראשוני
        this.saveOriginalBeamsState();
    }
    // חישוב נתוני הקורות לחישוב מחיר
    async calculateBeamsData() {
        this.startTimer('CABINET - Calculate Beams Data');
        this.BeamsDataForPricing = [];
        
        
        this.debugLog('🔍 START - calculateBeamsData:', {
            isBelams: this.isBelams,
            isPlanter: this.isPlanter,
            isBox: this.isBox,
            isTable: this.isTable,
            isFuton: this.isFuton
        });
        
        // טיפול מיוחד במוצר קורות לפי מידה
        if (this.isBelams) {
            await this.calculateBelamsData();
            return;
        }
        
        // איסוף כל הקורות מהמודל התלת מימדי
        const allBeams: any[] = [];
        // קבלת נתוני הקורות מהפרמטרים הנכונים
        const shelfParam = this.isTable || this.isFuton
            ? this.getParam('plata')
            : (this.isPlanter || this.isBox)
            ? this.getParam('beam')
            : this.getParam('shelfs');
        const frameParam = this.getParam('frame');
        const legParam = this.getParam('leg');
        const extraParam = this.getParam('extraBeam');
        
        
        this.debugLog('🔍 PARAMS - Found parameters:', {
            shelfParam: shelfParam,
            frameParam: frameParam,
            legParam: legParam,
            extraParam: extraParam,
            surfaceWidth: this.surfaceWidth,
            surfaceLength: this.surfaceLength,
            condition1: this.surfaceWidth && this.surfaceLength && shelfParam,
            condition2: (this.isPlanter || this.isBox) && shelfParam,
            finalCondition: (this.surfaceWidth && this.surfaceLength && shelfParam) || ((this.isPlanter || this.isBox) && shelfParam)
        });
        
        if ((this.surfaceWidth && this.surfaceLength && shelfParam) || ((this.isPlanter || this.isBox) && shelfParam)) {
            const selectedBeam =
                shelfParam.beams?.[shelfParam.selectedBeamIndex || 0];
            const selectedType =
                selectedBeam?.types?.[shelfParam.selectedTypeIndex || 0];
            if (selectedBeam && selectedType) {
                    this.debugLog('🔍 ENTERED - selectedBeam && selectedType block');
                    let beamWidth = selectedBeam.width / 10 || this.beamWidth; // המרה ממ"מ לס"מ (width של הקורה)
                    const beamHeight = selectedBeam.height / 10 || this.beamHeight; // height של הקורה
                    
                    
                    this.debugLog('🔍 DEBUG - Beam dimensions calculation:', {
                        selectedType: selectedType,
                        selectedBeam: selectedBeam,
                        originalWidth: selectedType.width,
                        originalHeight: selectedType.height,
                        selectedBeamWidth: selectedBeam.width,
                        selectedBeamHeight: selectedBeam.height,
                        calculatedBeamWidth: beamWidth,
                        calculatedBeamHeight: beamHeight,
                        isPlanter: this.isPlanter,
                        isBox: this.isBox,
                        isTable: this.isTable,
                        isFuton: this.isFuton,
                        isBelams: this.isBelams
                    });
                    
                    this.debugLog('🔍 AFTER DEBUG - Continuing execution');
                    
                // עבור ארון, נשתמש ברוחב הנכון של הקורה מהפרמטרים
                // אין צורך לשנות את beamWidth - הוא כבר נכון!
                    
                    this.debugLog('🔍 CHECKPOINT 1 - After armoire check:', {
                        isPlanter: this.isPlanter,
                        isBox: this.isBox,
                        isTable: this.isTable,
                        isFuton: this.isFuton,
                        condition: this.isPlanter || this.isBox
                    });
                    
                    if (this.isPlanter || this.isBox) {
                        // עבור עדנית/קופסא - לוג פשוט עם הנתונים הגולמיים
                        const depthParam = this.getParam('depth');
                        const widthParam = this.getParam('width');
                        const heightParam = this.getParam('height');
                    
                        const planterDepth = widthParam ? widthParam.default : 50;
                        const planterWidth = depthParam ? depthParam.default : 40;
                        const planterHeight = heightParam ? heightParam.default : 50;
                        
                        
                        // חישוב כמות הקורות ברצפה ובקיר
                        const beamsInDepth = Math.floor(planterWidth / beamWidth); // כמות קורות ברצפה
                        const beamsInHeight = Math.floor(planterHeight / beamWidth); // כמות קורות בקיר (W)
                        
                        
                        // חישוב אורכי הקורות
                        // length1: קורות הרצפה - אורך מלא של planterDepth
                        const length1 = planterDepth;
                        
                        // length2: קירות ארוכים (שמאלי וימני) - planterDepth מקוצר ב-beamHeight משני הצדדים
                        // בתלת-מימד: wallLength = widthParam.default - (2 * beamHeight)
                        // widthParam.default = planterDepth, אז: length2 = planterDepth - (2 * beamHeight)
                        const length2 = planterDepth - (beamHeight * 2);
                        
                        // length3: קירות קצרים (קדמי ואחורי) - אורך מלא של planterWidth
                        const length3 = planterWidth;
                        
                        // length4: קורות חיזוק אנכיות - תמיד H - 2X
                        // H = planterHeight (גובה כולל), X = beamHeight (גובה הקורה)
                        // תמיד: H - 2X (ללא קשר למכסה)
                        const length4 = planterHeight - (beamHeight * 2);
                        
                        
                        
                        this.debugLog('DEBUG-DEBUG-DEBUG: Planter/Box Raw Data:', {
                            // מידות המוצר הגולמיות
                            planterDepth: planterDepth,
                            planterWidth: planterWidth,
                            planterHeight: planterHeight,
                            
                            // מידות הקורה הגולמיות
                            beamWidth: beamWidth,
                            beamHeight: beamHeight,
                            
                            // חישובי כמות קורות
                            beamsInDepth: beamsInDepth, // כמות קורות ברצפה
                            beamsInHeight: beamsInHeight // כמות קורות בקיר (W)
                        });
                        
                        // הוספת קורות אורך 1 (רצפה)
                        
                        for (let i = 0; i < beamsInDepth; i++) {
                            allBeams.push({
                                type: selectedType,
                                length: length1,
                                width: beamHeight,
                                height: beamWidth,
                                name: `Planter Floor Beam ${i + 1}`,
                                beamName: selectedBeam.name,
                                beamTranslatedName: selectedBeam.translatedName,
                                beamWoodType: selectedType.translatedName,
                            });
                        }
                        
                        // הוספת קורות אורך 2 (קירות ארוכים) - כמות: beamsInHeight * 2
                        
                        for (let i = 0; i < beamsInHeight * 2; i++) {
                            allBeams.push({
                                type: selectedType,
                                length: length2,
                                width: beamHeight,
                                height: beamWidth,
                                name: `Planter Long Wall Beam ${i + 1}`,
                                beamName: selectedBeam.name,
                                beamTranslatedName: selectedBeam.translatedName,
                                beamWoodType: selectedType.translatedName,
                            });
                        }
                        
                        // הוספת קורות אורך 3 (קירות קצרים) - כמות: beamsInHeight * 2
                        
                        for (let i = 0; i < beamsInHeight * 2; i++) {
                            allBeams.push({
                                type: selectedType,
                                length: length3,
                                width: beamHeight,
                                height: beamWidth,
                                name: `Planter Short Wall Beam ${i + 1}`,
                                beamName: selectedBeam.name,
                                beamTranslatedName: selectedBeam.translatedName,
                                beamWoodType: selectedType.translatedName,
                            });
                        }
                        
                        // הוספת קורות אורך 4 (קורות חיזוק) - כמות: 4 (4 בפינות)
                        
                        for (let i = 0; i < 4; i++) {
                            allBeams.push({
                                type: selectedType,
                                length: length4,
                                width: beamHeight,
                                height: beamWidth,
                                name: `Planter Support Beam ${i + 1}`,
                                beamName: selectedBeam.name,
                                beamTranslatedName: selectedBeam.translatedName,
                                beamWoodType: selectedType.translatedName,
                            });
                        }
                        
                        // הוספת קורות מכסה לקופסא בלבד - רק אם הפרמטר isCover מופעל
                        const isCoverParam = this.getParam('isCover');
                        const shouldAddCover = this.isBox && isCoverParam && isCoverParam.default === true;
                        
                        
                        if (shouldAddCover) {
                            this.debugLog('מוסיף קורות מכסה לחישוב מחיר');
                            
                            // קורות רצפת המכסה - כפילות של קורות הרצפה
                            
                            for (let i = 0; i < beamsInDepth; i++) {
                                allBeams.push({
                                    type: selectedType,
                                    length: length1, // אותו אורך כמו קורות הרצפה
                                    width: beamHeight,
                                    height: beamWidth,
                                    name: `Box Cover Floor Beam ${i + 1}`,
                                    beamName: selectedBeam.name,
                                    beamTranslatedName: selectedBeam.translatedName,
                                    beamWoodType: selectedType.translatedName,
                                });
                            }
                            
                            // קורות חיזוק המכסה - 2 קורות (מקוצרות ב-0.6 ס"מ = 6 מ"מ נוספים)
                            const coverSupportLength = planterWidth - (beamHeight * 4) - 0.6;
                            
                            
                            for (let i = 0; i < 2; i++) {
                                allBeams.push({
                                    type: selectedType,
                                    length: coverSupportLength,
                                    width: beamHeight,
                                    height: beamWidth,
                                    name: `Box Cover Support Beam ${i + 1}`,
                                    beamName: selectedBeam.name,
                                    beamTranslatedName: selectedBeam.translatedName,
                                    beamWoodType: selectedType.translatedName,
                                });
                            }
                        } else if (this.isBox) {
                            this.debugLog('לא מוסיף קורות מכסה - המכסה מבוטל');
                        }
                } else if (this.isFuton) {
                    // עבור בסיס מיטה - חישוב קורות הפלטה (בדיוק כמו בתלת-מימד)
                    const widthParam = this.getParam('width');
                    const depthParam = this.getParam('depth');
                    const futonWidth = depthParam ? depthParam.default : 200;  // החלפה: width = depth
                    const futonDepth = widthParam ? widthParam.default : 120;   // החלפה: depth = width
                    
                    // עבור מיטה: צריך להשתמש בממדים הנכונים (ללא היפוך)
                    // selectedBeam.width = 40mm -> 4 ס"מ (זה הרוחב של הקורה)
                    // selectedBeam.height = 15mm -> 1.5 ס"מ (זה הגובה של הקורה)
                    const futonBeamWidth = selectedBeam.width / 10;   // רוחב הקורה (4 ס"מ)
                    const futonBeamHeight = selectedBeam.height / 10; // גובה הקורה (1.5 ס"מ)
                    
                    // שימוש באותה פונקציה כמו בתלת-מימד
                    const surfaceBeams = this.createSurfaceBeams(
                        futonWidth,
                        futonDepth,
                        futonBeamWidth,  // רוחב נכון!
                        futonBeamHeight, // גובה נכון!
                        this.minGap
                    );
                    
                    // הוספת קורות הפלטה לחישוב המחיר
                    surfaceBeams.forEach((beam) => {
                        allBeams.push({
                            type: selectedType,
                            length: beam.depth, // אורך הקורה מהחישוב
                            width: beam.width,
                            height: beam.height,
                            name: 'Futon Platform Beam',
                            beamName: selectedBeam.name,
                            beamTranslatedName: selectedBeam.translatedName,
                            beamWoodType: selectedType.translatedName, // סוג העץ
                        });
                    });
                    
                    this.debugLog('קורות פלטת מיטה נוספו לחישוב מחיר:', {
                        beamsCount: surfaceBeams.length,
                        beamLength: surfaceBeams[0]?.depth,
                        futonWidth,
                        futonDepth,
                        futonBeamWidth,
                        futonBeamHeight,
                        minGap: this.minGap,
                        beamName: selectedBeam.name,
                        woodType: selectedType.translatedName,
                        calculation: `floor((${futonWidth} + ${this.minGap}) / (${futonBeamWidth} + ${this.minGap})) = floor(${futonWidth + this.minGap} / ${futonBeamWidth + this.minGap}) = ${Math.floor((futonWidth + this.minGap) / (futonBeamWidth + this.minGap))}`
                    });
                } else {
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
                    surfaceBeams.forEach((beam) => {
                        allBeams.push({
                            type: selectedType,
                            length: beam.depth, // אורך הקורה
                            width: beam.width,
                            height: beam.height,
                            name: 'Table Surface Beam',
                            beamName: selectedBeam.name,
                            beamTranslatedName: selectedBeam.translatedName,
                            beamWoodType: selectedType.translatedName, // סוג העץ
                        });
                    });
                } else {
                    // עבור ארון - קורות לכל מדף עם קיצור
                    const totalShelves = this.shelves.length;
                    this.debugLog('🔍 CABINET CALCULATION:', {
                        totalShelves: totalShelves,
                        surfaceWidth: this.surfaceWidth,
                        surfaceLength: this.surfaceLength,
                        beamWidth: beamWidth,
                        beamHeight: beamHeight
                    });
                    
                    // מציאת קורת הרגל/החיזוק לחישוב הקיצור
                    const legParam = this.getParam('leg');
                    const legBeamSelected =
                        legParam?.beams?.[legParam.selectedBeamIndex || 0];
                    const legBeamWidth = legBeamSelected?.width / 10 || 0; // רוחב קורת הרגל
                    const legBeamHeight = legBeamSelected?.height / 10 || 0; // גובה קורת הרגל
                    
                    
                    this.debugLog('🔍 LEG BEAM:', {
                        legBeamWidth: legBeamWidth,
                        legBeamName: legBeamSelected?.name
                    });
                    
                    // יצירת קורות מדף נפרדות לארון
                    // חישוב כמות קורות במדף: floor((surfaceWidth + minGap) / (beamWidth + minGap))
                    // צריך להשתמש בbeamWidth הנכון של קורת המדף, לא של קורת הרגל!
                    const shelfBeamWidth = beamWidth; // זה כבר מחושב נכון מהפרמטרים
                    const beamsInShelf = Math.floor((this.surfaceWidth + this.minGap) / (shelfBeamWidth + this.minGap));
                    
                    
                    // יצירת קורות המדף
                    const cabinetShelfBeams = [];
                    for (let i = 0; i < beamsInShelf; i++) {
                        cabinetShelfBeams.push({
                            width: beamWidth,
                            height: beamHeight,
                            depth: this.surfaceLength, // אורך המדף
                            x: 0, // ייקבע מאוחר יותר
                            y: 0, // ייקבע מאוחר יותר
                            z: 0  // ייקבע מאוחר יותר
                        });
                    }
                    
                    this.shelves.forEach((shelf, index) => {
                        const isTopShelf = index === totalShelves - 1; // המדף העליון
                        this.debugLog(`🔍 SHELF ${index + 1} (${isTopShelf ? 'TOP' : 'NORMAL'}):`);

                        cabinetShelfBeams.forEach((beam, beamIndex) => {
                            let beamLength = beam.depth; // אורך מלא (50 ס"מ)
                            let isShortened = false;

                            // קיצור קורות בקצוות (רק במדפים שאינם עליונים)
                            if (!isTopShelf) {
                                // קורות בקצוות (ראשונה ואחרונה) מקוצרות
                                if (beamIndex === 0 || beamIndex === cabinetShelfBeams.length - 1) {
                                    const outsideParamCabForPricingShelves = this.getParam('is-reinforcement-beams-outside');
                                    const isOutsideCabForPricingShelves = !!(outsideParamCabForPricingShelves && outsideParamCabForPricingShelves.default === true);
                                    const defaultShorten = (legBeamHeight * 2);
                                    const extraShorten = isOutsideCabForPricingShelves ? (2 * (this.frameWidth)) : 0; // 2 * frameBeamWidth
                                    beamLength = Math.max(0.1, beamLength - (defaultShorten + extraShorten));
                                    isShortened = true;
                                }
                            }

                            this.debugLog(`  Beam ${beamIndex + 1}: ${beamLength}cm ${isShortened ? '(SHORTENED)' : '(FULL)'}`);
                            
                            allBeams.push({
                                type: selectedType,
                                length: beamLength,
                                width: beam.width,
                                height: beam.height,
                                name: `Shelf ${index + 1} Beam ${beamIndex + 1}`,
                                beamName: selectedBeam.name,
                                beamTranslatedName: selectedBeam.translatedName,
                                beamWoodType: selectedType.translatedName, // סוג העץ
                            });
                        });
                    });
                    
                    // סיכום החישוב
                    const beamLengths = allBeams
                        .filter(beam => beam.name.includes('Shelf'))
                        .map(beam => beam.length);
                    const lengthCounts = beamLengths.reduce((acc, length) => {
                        acc[length] = (acc[length] || 0) + 1;
                        return acc;
                    }, {} as {[key: number]: number});
                    
                    this.debugLog('🔍 FINAL CABINET BEAM COUNT:', lengthCounts);
                    }
                }
            }
        }
        // קורות חיזוק (frame beams)
        if (this.surfaceWidth && this.surfaceLength) {
            let frameParamForCalculation = null;
            if (this.isTable) {
                // עבור שולחן, קורות החיזוק הן קורות הרגליים
                frameParamForCalculation = this.params.find(
                    (p) => p.type === 'beamSingle' && p.name === 'leg'
                );
            } else if (this.isFuton) {
                // עבור בסיס מיטה, קורות החיזוק הן קורות הרגליים (דומה לשולחן)
                frameParamForCalculation = this.params.find(
                    (p) => p.type === 'beamSingle' && p.name === 'leg'
                );
            } else {
                // עבור ארון, קורות החיזוק הן פרמטר beamSingle שאינו shelfs
                frameParamForCalculation = this.params.find(
                    (p) => p.type === 'beamSingle' && p.name !== 'shelfs'
                );
            }
            if (
                frameParamForCalculation &&
                Array.isArray(frameParamForCalculation.beams) &&
                frameParamForCalculation.beams.length
            ) {
                const selectedBeam =
                    frameParamForCalculation.beams[
                        frameParamForCalculation.selectedBeamIndex || 0
                    ];
                const selectedType =
                    selectedBeam?.types?.[
                        frameParamForCalculation.selectedTypeIndex || 0
                    ];
                if (selectedBeam && selectedType) {
                    const frameWidth =
                        selectedType.height / 10 || this.frameWidth; // המרה ממ"מ לס"מ
                    const frameHeight =
                        selectedType.width / 10 || this.frameHeight;
                    // חישוב קיצור קורות החיזוק - פעמיים רוחב קורות הרגל
                    // מציאת קורת הרגל לחישוב הקיצור
                    const legParam = this.getParam('leg');
                    const legBeamSelected =
                        legParam?.beams?.[legParam.selectedBeamIndex || 0];
                    const legBeamHeight = legBeamSelected?.height / 10 || 0;
                    const legBeamWidth = legBeamSelected?.width / 10 || 0;
                    const shorteningAmount = legBeamHeight * 2; // פעמיים גובה קורת הרגל - לקורות לכיוון האורך
                    const shorteningAmountEx = legBeamWidth * 2; // פעמיים רוחב קורת הרגל - לקורות לכיוון הרוחב
                    
                    if (this.isTable) {
                        // עבור שולחן - קורות חיזוק: התאמות כש-outside=true
                        const outsideParamTableForPricing = this.getParam('is-reinforcement-beams-outside');
                        const isOutsideTableForPricing = !!(outsideParamTableForPricing && outsideParamTableForPricing.default === true);
                        // Width beams (X-spanning): use width from getProductDimensionsRaw() when outside=true
                        let widthLengthForTable;
                        if (isOutsideTableForPricing) {
                            const dimensions = this.getProductDimensionsRaw();
                            widthLengthForTable = dimensions.width; // Use width from getProductDimensionsRaw()
                        } else {
                            widthLengthForTable = this.surfaceWidth - shorteningAmountEx; // -2a
                        }
                        // Width beams (X-spanning) - duplicate for extra frame beams (lower reinforcement)
                        allBeams.push({
                            type: selectedType,
                            length: widthLengthForTable,
                            width: frameWidth,
                            height: frameHeight,
                            name: 'Table Frame Beam Width 1',
                            beamName: selectedBeam.name,
                            beamTranslatedName: selectedBeam.translatedName,
                            beamWoodType: selectedType.translatedName, // סוג העץ
                        });
                        allBeams.push({
                            type: selectedType,
                            length: widthLengthForTable,
                            width: frameWidth,
                            height: frameHeight,
                            name: 'Table Frame Beam Width 2',
                            beamName: selectedBeam.name,
                            beamTranslatedName: selectedBeam.translatedName,
                            beamWoodType: selectedType.translatedName, // סוג העץ
                        });
                        // Duplicate width beams for extra frame beams (always for table)
                        allBeams.push({
                            type: selectedType,
                            length: widthLengthForTable,
                            width: frameWidth,
                            height: frameHeight,
                            name: 'Table Frame Beam Width 1 (Extra)',
                            beamName: selectedBeam.name,
                            beamTranslatedName: selectedBeam.translatedName,
                            beamWoodType: selectedType.translatedName, // סוג העץ
                        });
                        allBeams.push({
                            type: selectedType,
                            length: widthLengthForTable,
                            width: frameWidth,
                            height: frameHeight,
                            name: 'Table Frame Beam Width 2 (Extra)',
                            beamName: selectedBeam.name,
                            beamTranslatedName: selectedBeam.translatedName,
                            beamWoodType: selectedType.translatedName, // סוג העץ
                        });
                        // Length beams (Z-spanning):
                        const lengthBeamLength = isOutsideTableForPricing
                            ? this.surfaceLength - (4 * legBeamHeight) // -4b
                            : this.surfaceLength - shorteningAmount;    // -2b
                        allBeams.push({
                            type: selectedType,
                            length: Math.max(0.1, lengthBeamLength),
                            width: frameWidth,
                            height: frameHeight,
                            name: 'Table Frame Beam Length 1',
                            beamName: selectedBeam.name,
                            beamTranslatedName: selectedBeam.translatedName,
                            beamWoodType: selectedType.translatedName, // סוג העץ
                        });
                        allBeams.push({
                            type: selectedType,
                            length: Math.max(0.1, lengthBeamLength),
                            width: frameWidth,
                            height: frameHeight,
                            name: 'Table Frame Beam Length 2',
                            beamName: selectedBeam.name,
                            beamTranslatedName: selectedBeam.translatedName,
                            beamWoodType: selectedType.translatedName, // סוג העץ
                        });
                        // Duplicate length beams for extra frame beams (always for table)
                        allBeams.push({
                            type: selectedType,
                            length: Math.max(0.1, lengthBeamLength),
                            width: frameWidth,
                            height: frameHeight,
                            name: 'Table Frame Beam Length 1 (Extra)',
                            beamName: selectedBeam.name,
                            beamTranslatedName: selectedBeam.translatedName,
                            beamWoodType: selectedType.translatedName, // סוג העץ
                        });
                        allBeams.push({
                            type: selectedType,
                            length: Math.max(0.1, lengthBeamLength),
                            width: frameWidth,
                            height: frameHeight,
                            name: 'Table Frame Beam Length 2 (Extra)',
                            beamName: selectedBeam.name,
                            beamTranslatedName: selectedBeam.translatedName,
                            beamWoodType: selectedType.translatedName, // סוג העץ
                        });
                    } else if (this.isFuton) {
                        // עבור בסיס מיטה - אין קורות חיזוק, רק פלטה ורגליים
                        this.debugLog('Futon: No frame beams needed - only platform and legs');
                    } else {
                        
                        this.debugLog(
                            'DEBUG - shorteningAmount:',
                            shorteningAmount
                        );
                        // עבור ארון - קורות חיזוק מקוצרות לכל מדף
                        const outsideParamCabForPricing = this.getParam('is-reinforcement-beams-outside');
                        const isOutsideCabForPricing = !!(outsideParamCabForPricing && outsideParamCabForPricing.default === true);
                        this.shelves.forEach((shelf, shelfIndex) => {
                            // 4 קורות חיזוק מקוצרות לכל מדף (2 לרוחב, 2 לאורך)
                            // קורות רוחב מקוצרות
                            const widthLengthForPricing = isOutsideCabForPricing
                                ? this.surfaceWidth
                                : this.surfaceWidth - shorteningAmountEx;
                            allBeams.push({
                                type: selectedType,
                                length: widthLengthForPricing,
                                width: frameWidth,
                                height: frameHeight,
                                name: `Frame Beam Width 1 - Shelf ${shelfIndex + 1}`,
                                beamName: selectedBeam.name,
                                beamTranslatedName: selectedBeam.translatedName,
                                beamWoodType: selectedType.translatedName, // סוג העץ
                            });
                            allBeams.push({
                                type: selectedType,
                                length: widthLengthForPricing,
                                width: frameWidth,
                                height: frameHeight,
                                name: `Frame Beam Width 2 - Shelf ${shelfIndex + 1}`,
                                beamName: selectedBeam.name,
                                beamTranslatedName: selectedBeam.translatedName,
                                beamWoodType: selectedType.translatedName, // סוג העץ
                            });
                            // קורות אורך מקוצרות (מקבילות לקורות המדפים)
                            // אם outside=true: נדרש קיצור נוסף של b מכל צד => סה"כ 4*b
                            const lengthLengthForPricing = isOutsideCabForPricing
                                ? this.surfaceLength - (4 * legBeamHeight)
                                : this.surfaceLength - shorteningAmount;
                            allBeams.push({
                                type: selectedType,
                                length: Math.max(0.1, lengthLengthForPricing),
                                width: frameWidth,
                                height: frameHeight,
                                name: `Frame Beam Length 1 - Shelf ${shelfIndex + 1}`,
                                beamName: selectedBeam.name,
                                beamTranslatedName: selectedBeam.translatedName,
                                beamWoodType: selectedType.translatedName, // סוג העץ
                            });
                            allBeams.push({
                                type: selectedType,
                                length: Math.max(0.1, lengthLengthForPricing),
                                width: frameWidth,
                                height: frameHeight,
                                name: `Frame Beam Length 2 - Shelf ${shelfIndex + 1}`,
                                beamName: selectedBeam.name,
                                beamTranslatedName: selectedBeam.translatedName,
                                beamWoodType: selectedType.translatedName, // סוג העץ
                            });
                        });
                    }
                }
            }
        }
        // קורות רגליים (leg beams) - לשולחן ולארון
        if (legParam) {
            const selectedBeam =
                legParam.beams?.[legParam.selectedBeamIndex || 0];
            const selectedType =
                selectedBeam?.types?.[legParam.selectedTypeIndex || 0];
            // חיפוש פרמטר גובה - נסה כמה אפשרויות
            let heightParam = this.getParam('height');
            if (!heightParam) {
                heightParam = this.params.find(
                    (p) =>
                        p.type === 'height' ||
                        p.name?.toLowerCase().includes('height') ||
                        p.name?.toLowerCase().includes('גובה')
                );
            }
            // חישוב גובה הרגליים - פשוט וברור
            const dimensions = this.getProductDimensionsRaw();
            const totalHeight = dimensions.height; // הגובה הכולל של המוצר
            // חישוב גובה קורות הפלטה/המדפים
            let shelfBeamHeight = 0;
            if (this.isTable) {
                // עבור שולחן - גובה קורות הפלטה
                const shelfParam = this.product?.params?.find(
                    (p: any) => p.type === 'beamSingle' && p.name === 'plata'
                );
                const shelfBeamSelected =
                    shelfParam?.beams?.[shelfParam.selectedBeamIndex || 0];
                shelfBeamHeight = shelfBeamSelected?.height / 10 || 0;
            } else if (this.isFuton) {
                // עבור בסיס מיטה - גובה קורות הפלטה (דומה לשולחן)
                const shelfParam = this.product?.params?.find(
                    (p: any) => p.type === 'beamSingle' && p.name === 'plata'
                );
                const shelfBeamSelected =
                    shelfParam?.beams?.[shelfParam.selectedBeamIndex || 0];
                shelfBeamHeight = shelfBeamSelected?.height / 10 || 0;
            } else {
                // עבור ארון - רק גובה קורת המדף עצמה
                const shelfParam = this.getParam('shelfs');
                const shelfBeamSelected =
                    shelfParam?.beams?.[shelfParam.selectedBeamIndex || 0];
                shelfBeamHeight = shelfBeamSelected?.height / 10 || 0;
            }
            // גובה הרגל = גובה כולל פחות גובה קורות הפלטה/המדפים
            const legHeight = totalHeight - shelfBeamHeight;
            this.debugLog(
                'DEBUG - legHeight calculation:',
                totalHeight,
                '-',
                shelfBeamHeight,
                '=',
                legHeight
            );
            this.debugLog(
                'DEBUG - legHeight type:',
                typeof legHeight,
                'value:',
                legHeight
            );
            if (selectedBeam && selectedType) {
                const legWidth = selectedType.width / 10 || 5; // המרה ממ"מ לס"מ
                const legHeightDimension = selectedType.height / 10 || 5;
                
                if (this.isFuton) {
                    // עבור בסיס מיטה - כמות רגליים לפי extraBeam
                    const extraBeamParam = this.getParam('extraBeam');
                    const legCount = extraBeamParam && extraBeamParam.default > 0 ? extraBeamParam.default : 0;
                    
                    // קבלת מידות המיטה
                    const widthParam = this.getParam('width');
                    const depthParam = this.getParam('depth');
                    const futonWidth = depthParam ? depthParam.default : 200;  // החלפה: width = depth
                    const futonDepth = widthParam ? widthParam.default : 120;   // החלפה: depth = width
                    
                    for (let i = 0; i < legCount; i++) {
                        allBeams.push({
                            type: selectedType,
                            length: futonWidth, // אורך הרגל = רוחב המיטה
                            width: legWidth,
                            height: legHeightDimension, // גובה הקורה עצמה
                            name: `Futon Leg ${i + 1}`,
                            beamName: selectedBeam.name,
                            beamTranslatedName: selectedBeam.translatedName,
                            beamWoodType: selectedType.translatedName, // סוג העץ
                        });
                    }
                } else {
                    // עבור שולחן או ארון - 4 רגליים
                const numLegs = 4;
                for (let i = 0; i < numLegs; i++) {
                    allBeams.push({
                        type: selectedType,
                        length: legHeight, // גובה הרגל המחושב (totalHeight - shelfBeamHeight)
                        width: legWidth,
                        height: legHeightDimension, // גובה הקורה עצמה
                        name: this.isTable
                            ? `Table Leg ${i + 1}`
                            : `Cabinet Leg ${i + 1}`,
                        beamName: selectedBeam.name,
                        beamTranslatedName: selectedBeam.translatedName,
                            beamWoodType: selectedType.translatedName, // סוג העץ
                    });
                    }
                }
            }
        } else {
            this.debugLog('Leg beams not processed - no legParam found');
        }
        // קיבוץ קורות לפי סוג עץ ושם קורה - איחוד קורות זהות
        this.debugLog('=== STARTING beamTypesMap PROCESSING ===');
        this.debugLog('Total beams in allBeams:', allBeams.length);
        allBeams.forEach((beam, index) => {
            this.debugLog(`Beam ${index + 1}:`, {
                name: beam.name,
                beamName: beam.beamName,
                length: beam.length,
                type: beam.type?.name,
            });
        });
        const beamTypesMap = new Map();
        allBeams.forEach((beam) => {
            // שימוש בשם העץ + beamName כמפתח מורכב לאיחוד קורות זהות
            const typeName = beam.type?.name || 'unknown';
            const beamName = beam.beamName || 'undefined';
            const typeKey = `${typeName}_${beamName}`;
            this.debugLog(
                `Processing beam for beamTypesMap: typeKey=${typeKey}, beamName=${beam.beamName}, name=${beam.name}`
            );
            if (!beamTypesMap.has(typeKey)) {
                this.debugLog(
                    `Creating new entry in beamTypesMap for ${typeKey} with beamName=${beam.beamName}`
                );
                beamTypesMap.set(typeKey, {
                    type: beam.type,
                    beamName: beam.beamName, // שמירת beamName
                    beamTranslatedName: beam.beamTranslatedName, // שמירת השם המתורגם של הקורה
                    beamWoodType: beam.beamWoodType, // סוג העץ
                    sizes: [],
                });
            }
            // הוספת אורך הקורה כמות פעמים לפי כמות היחידות
            for (let i = 0; i < this.quantity; i++) {
            beamTypesMap.get(typeKey).sizes.push(beam.length);
            }
        });
        // המרה למערך הסופי
        beamTypesMap.forEach((beamData, typeKey) => {
            this.BeamsDataForPricing.push({
                type: beamData.type,
                beamName: beamData.beamName, // הוספת beamName
                beamTranslatedName: beamData.beamTranslatedName, // הוספת השם המתורגם של הקורה
                beamWoodType: beamData.beamWoodType, // הוספת סוג העץ
                sizes: beamData.sizes,
            });
        });
        // חישוב totalSizes לכל קורה - ספירת כמות מכל אורך
        this.BeamsDataForPricing.forEach((beamData, index) => {
            const sizeCounts = new Map<number, number>();
            // ספירת כל האורכים (ללא עיגול)
            beamData.sizes.forEach((size) => {
                sizeCounts.set(size, (sizeCounts.get(size) || 0) + 1);
            });
            // המרה למערך של אובייקטים עם אורך וכמות
            const totalSizes = Array.from(sizeCounts.entries())
                .map(([length, count]) => ({
                length: length,
                    count: count,
                }))
                .sort((a, b) => a.length - b.length); // מיון לפי אורך
            // הוספת השדה החדש
            beamData.totalSizes = totalSizes;
            this.debugLog(
                `Beam ${index + 1} (${beamData.beamName}) totalSizes:`,
                totalSizes
            );
        });
        // הצגת התוצאה הסופית של הקורות
        this.debugLog('=== FINAL BEAMS DATA FOR PRICING ===');
        this.debugLog('Total beam types:', this.BeamsDataForPricing.length);
        this.BeamsDataForPricing.forEach((beamData, index) => {
            this.debugLog(`Beam Type ${index + 1}:`, {
                typeId: beamData.type?._id || beamData.type?.id,
                typeName: beamData.type?.name || 'Unknown',
                beamName: beamData.beamName || 'Unknown',
                beamTranslatedName: beamData.beamTranslatedName,
                material: beamData.type?.material || 'Unknown',
                totalSizes: beamData.totalSizes,
                totalLength: beamData.totalLength ?? beamData.sizes?.reduce((sum, size) => sum + size, 0),
                count: beamData.count ?? beamData.sizes?.length ?? 0,
            });
        });
        
        this.debugLog('*** === END BEAMS DATA ===', this.BeamsDataForPricing);
        await this.handlePricing();
    }
    private async handlePricing(skipPricing: boolean = false): Promise<void> {
        const shouldSkip = skipPricing || this.shouldSkipPricing;
        if (shouldSkip) {
            if (this.priceSnapshotBeforeSkip !== null) {
                this.calculatedPrice = this.priceSnapshotBeforeSkip;
            }
            this.priceSnapshotBeforeSkip = null;
            this.shouldSkipPricing = false;
            this.isLoading = false;
            this.isModelLoading = false;
            return;
        }

        await this.calculateForgingData();

        // כיבוי loading
        this.isLoading = false;
        this.isModelLoading = false;
        this.shouldSkipPricing = false;
        this.priceSnapshotBeforeSkip = null;
    }
    // פונקציה לעגול אורך בורג לחצי הקרוב למעלה
    private roundScrewLength(length: number): number {
        return Math.ceil(length * 2) / 2; // עיגול לחצי הקרוב למעלה
    }
    
    /**
     * חישוב אורך בורג במצב preliminary-drills (כמו חורים)
     * @param screwType סוג הבורג: 'shelf', 'leg_height', 'leg_width'
     * @param dimension1 מידה ראשונה (beamHeight או legBeamHeight/legBeamWidth)
     * @param dimension2 מידה שנייה (רק לרגליים: legBeamWidth/legBeamHeight)
     * @param screwIndex אינדקס הבורג (0 = height, 1 = width) - רק לרגליים
     * @returns אורך הבורג בס"מ
     */
    private calculatePreliminaryDrillScrewLength(
        screwType: string, 
        dimension1: number, 
        dimension2?: number,
        screwIndex?: number
    ): number {
        switch (screwType) {
            case 'shelf':
                // ברגי מדף - לפי height של קורת המדף
                return dimension1;
                
            case 'leg_height':
            case 'leg_width':
                // ברגי רגל
                const outsideParam = this.getParam('is-reinforcement-beams-outside');
                const isOutside = !!(outsideParam && outsideParam.default === true);
                
                if (isOutside) {
                    // isOutside = true: פי 2 מה-height של קורת הרגל (חוצה 2 קורות)
                    // legBeamHeight = dimension1 (כאשר screwIndex=0) או dimension2 (כאשר screwIndex=1)
                    const legBeamHeight = dimension2 !== undefined 
                        ? (screwIndex === 0 ? dimension1 : dimension2)
                        : dimension1;
                    return legBeamHeight * 2;
                } else {
                    // isOutside = false: לפי המידה הנכונה של קורת הרגל - לפי כיוון הבורג
                    // בורג 0 (screwIndex=0) = מבוסס height - אורך הבורג יהיה לפי height של קורת הרגל
                    // בורג 1 (screwIndex=1) = מבוסס width - אורך הבורג יהיה לפי width של קורת הרגל
                    if (screwIndex === 0) {
                        // בורג לפי height - dimension1 = legBeamHeight
                        return dimension1;
                    } else {
                        // בורג לפי width - dimension1 = legBeamWidth
                        return dimension1;
                    }
                }
                
            default:
                return dimension1;
        }
    }
    
    // פונקציה מרכזית לחישוב אורך בורג לפי סוג הבורג והמידות
    private calculateScrewLength(screwType: string, dimension1: number, dimension2?: number): number {
        let rawLength = 0;
        
        switch (screwType) {
            case 'shelf': // ברגי מדפים/פלטה - תלוי בגובה הקורה
                rawLength = dimension1 + 2; // dimension1 = beamHeight
                break;
                
            case 'futon': // ברגי פלטת מיטה - height של קורת הפלטה + 3
                rawLength = dimension1 + 3; // dimension1 = beamHeight
                break;
                
            case 'leg_width': // ברגי רגליים מבוססי רוחב - צריך 2 מידות!
                // נבחר את המידה הגדולה יותר מבין dimension1 ו-dimension2
                if (dimension2 !== undefined) {
                    const maxDimension = Math.max(dimension1, dimension2);
                    const minDimension = Math.min(dimension1, dimension2);
                    // אם is-reinforcement-beams-outside דולק, השתמש במידה הקטנה פעמיים + 3
                    const outsideParam = this.getParam('is-reinforcement-beams-outside');
                    const isOutside = !!(outsideParam && outsideParam.default === true);
                    if (isOutside) {
                        rawLength = (minDimension * 2) + 3; // (מידת קורה קטנה * 2) + 3
                        console.log(`CHECK_SCREW_LENGTH_OUTSIDE - leg_width: min=${minDimension}, length=${rawLength} (min*2+3), product=${this.isTable ? 'table' : 'cabinet'}`);
                    } else {
                    rawLength = maxDimension + 3; // המידה הגדולה + 3 ס"מ
                    }
                    this.debugLog(`🔧 Leg screw (width): dim1=${dimension1}, dim2=${dimension2}, max=${maxDimension}, min=${minDimension}, length=${rawLength}`);
                } else {
                    // fallback למקרה שלא הועבר dimension2
                    rawLength = dimension1 + 3;
                    this.debugLog(`🔧 Leg screw (width) FALLBACK: dim1=${dimension1}, length=${rawLength}`);
                }
                break;
                
            case 'leg_height': // ברגי רגליים מבוססי גובה - צריך 2 מידות!
                // נבחר את המידה הגדולה יותר מבין dimension1 ו-dimension2
                if (dimension2 !== undefined) {
                    const maxDimension = Math.max(dimension1, dimension2);
                    const minDimension = Math.min(dimension1, dimension2);
                    // אם is-reinforcement-beams-outside דולק, השתמש במידה הקטנה פעמיים + 3
                    const outsideParam = this.getParam('is-reinforcement-beams-outside');
                    const isOutside = !!(outsideParam && outsideParam.default === true);
                    if (isOutside) {
                        rawLength = (minDimension * 2) + 3; // (מידת קורה קטנה * 2) + 3
                        console.log(`CHECK_SCREW_LENGTH_OUTSIDE - leg_height: min=${minDimension}, length=${rawLength} (min*2+3), product=${this.isTable ? 'table' : 'cabinet'}`);
                    } else {
                    rawLength = maxDimension + 3; // המידה הגדולה + 3 ס"מ
                    }
                    this.debugLog(`🔧 Leg screw (height): dim1=${dimension1}, dim2=${dimension2}, max=${maxDimension}, min=${minDimension}, length=${rawLength}`);
                } else {
                    // fallback למקרה שלא הועבר dimension2
                    rawLength = dimension1 + 3;
                    this.debugLog(`🔧 Leg screw (height) FALLBACK: dim1=${dimension1}, length=${rawLength}`);
                }
                break;
                
            case 'planter_wall': // ברגי קירות עדנית
                rawLength = dimension1 + 2; // dimension1 = beamHeight (עומק קורת הקיר)
                break;
                
            case 'planter_floor': // ברגי רצפת עדנית
                rawLength = dimension1 + 2; // dimension1 = beamHeight
                break;
                
            case 'planter_side_wall': // ברגי קירות צדדיים עדנית
                rawLength = dimension1 + 2; // dimension1 = beamHeight
                break;
                
            default:
                // ברירת מחדל - dimension1 + 2
                rawLength = dimension1 + 2;
                break;
        }
        
        // עיגול לחצי הקרוב למעלה
        return this.roundScrewLength(rawLength);
    }
    // פונקציה לחישוב ברגי המדפים/פלטה
    private calculateShelfForgingData(): any[] {
        this.debugLog('=== CALCULATING SHELF FORGING DATA ===');
        const shelfForgingData: any[] = [];
        // חישוב ברגי מדפים/פלטה
        if (this.isTable) {
            // עבור שולחן - ברגי פלטה
            const plataParam = this.params.find((p) => p.name === 'plata');
            if (plataParam && plataParam.selectedBeamIndex !== undefined) {
                const selectedBeam =
                    plataParam.beams[plataParam.selectedBeamIndex];
                const selectedType =
                    selectedBeam?.types?.[plataParam.selectedTypeIndex || 0];
                if (selectedBeam && selectedType) {
                    // חישוב כמות ברגים לפי כמות הקורות בפועל
                    // כל קורה צריכה 4 ברגים
                    const beamWidth = selectedBeam.width / 10;
                    const beamHeight = selectedBeam.height / 10;
                    const minGap = 1; // רווח מינימלי
                    const surfaceBeams = this.createSurfaceBeams(
                        this.surfaceWidth,
                        this.surfaceLength,
                        beamWidth,
                        beamHeight,
                        minGap
                    );
                    const totalBeams = surfaceBeams.length; // כמות הקורות בפועל

                    // חישוב כמות ברגים לפי רוחב הקורה
                    let screwsPerBeam = 4; // ברירת מחדל - 4 ברגים לקורה רחבה
                    if (beamWidth <= 4) {
                        screwsPerBeam = 2; // 2 ברגים לקורה צרה (רוחב <= 4)
                    }

                    const totalScrews = totalBeams * screwsPerBeam;
                    shelfForgingData.push({
                        type: 'Shelf Screws',
                        beamName: selectedBeam.name,
                        beamTranslatedName: selectedBeam.translatedName,
                        material: selectedType.translatedName,
                        count: totalScrews,
                        length: this.calculateScrewLength('shelf', beamHeight),
                        description: 'ברגי פלטה',
                    });
                    this.debugLog(
                        `Table shelf screws: ${totalScrews} screws for ${totalBeams} beams (${screwsPerBeam} screws per beam)`
                    );
                }
            }
        } else if (this.isFuton) {
            // עבור מיטה (futon) - ברגי פלטה לרגליים
            const plataParam = this.params.find((p) => p.name === 'plata');
            if (plataParam && plataParam.selectedBeamIndex !== undefined) {
                const selectedBeam = plataParam.beams[plataParam.selectedBeamIndex];
                const selectedType = selectedBeam?.types?.[plataParam.selectedTypeIndex || 0];
                if (selectedBeam && selectedType) {
                    // חישוב קורות הפלטה - צריך להשתמש בממדים הנכונים!
                    const futonBeamWidth = selectedBeam.width / 10;   // רוחב נכון
                    const futonBeamHeight = selectedBeam.height / 10; // גובה נכון
                    const widthParam = this.getParam('width');
                    const depthParam = this.getParam('depth');
                    const futonWidth = depthParam ? depthParam.default : 200;  // החלפה: width = depth
                    const futonDepth = widthParam ? widthParam.default : 120;   // החלפה: depth = width
                    
                    const surfaceBeams = this.createSurfaceBeams(
                        futonWidth,
                        futonDepth,
                        futonBeamWidth,  // רוחב נכון!
                        futonBeamHeight, // גובה נכון!
                        this.minGap      // minGap נכון מהפרמטר
                    );
                    const totalBeams = surfaceBeams.length;
                    
                    // חישוב כמות הרגליים - לפי הפרמטר extraBeam
                    const extraBeamParam = this.getParam('extraBeam');
                    const legCount = extraBeamParam ? extraBeamParam.default : 3; // ברירת מחדל 3
                    
                    // 2 ברגים לכל מפגש של קורת פלטה עם רגל
                    const screwsPerBeamPerLeg = 2;
                    const totalScrews = totalBeams * legCount * screwsPerBeamPerLeg;
                    
                    // אורך הבורג = height של קורת הפלטה + 3
                    const screwLength = this.calculateScrewLength('futon', futonBeamHeight);
                    
                    shelfForgingData.push({
                        type: 'Futon Platform Screws',
                        beamName: selectedBeam.name,
                        beamTranslatedName: selectedBeam.translatedName,
                        material: selectedType.translatedName,
                        count: totalScrews,
                        length: screwLength,
                        description: 'ברגי פלטת מיטה',
                    });
                    
                    this.debugLog(
                        `Futon platform screws: ${totalScrews} screws for ${totalBeams} beams × ${legCount} legs (${screwsPerBeamPerLeg} screws per beam-leg intersection, ${screwLength}cm length)`,
                        `Calculation: ${totalBeams} × ${legCount} × ${screwsPerBeamPerLeg} = ${totalScrews}`
                    );
                }
            }
        } else {
            // עבור ארון - ברגי מדפים
            const shelfParam = this.params.find((p) => p.name === 'shelfs');
            if (shelfParam && shelfParam.selectedBeamIndex !== undefined) {
                const selectedBeam =
                    shelfParam.beams[shelfParam.selectedBeamIndex];
                const selectedType =
                    selectedBeam?.types?.[shelfParam.selectedTypeIndex || 0];
                if (selectedBeam && selectedType) {
                    // חישוב כמות ברגים לפי כמות הקורות בפועל
                    // כל קורה צריכה 4 ברגים
                    const beamWidth = selectedBeam.width / 10;
                    const beamHeight = selectedBeam.height / 10;
                    const minGap = 1; // רווח מינימלי
                    const surfaceBeams = this.createSurfaceBeams(
                        this.surfaceWidth,
                        this.surfaceLength,
                        beamWidth,
                        beamHeight,
                        minGap
                    );
                    const totalShelves = this.shelves.length;

                    // חישוב קורות מוסתרות (לוגיקה חדשה)
                    let totalHiddenBeams = 0;
                    const legParam = this.params.find((p) => p.name === 'leg');
                    const legBeamSelected =
                        legParam?.beams?.[legParam.selectedBeamIndex || 0];
                    const legBeamWidth = legBeamSelected?.width / 10 || 0;

                    this.shelves.forEach((shelf, index) => {
                        const isTopShelf = index === totalShelves - 1;

                        // חישוב רווח בין קורות (כמו ב-3D model)
                        const totalBeamWidth = surfaceBeams.length * beamWidth;
                        const remainingSpace =
                            this.surfaceWidth - totalBeamWidth;
                        const gapsCount = surfaceBeams.length - 1;
                        const gapBetweenBeams =
                            gapsCount > 0 ? remainingSpace / gapsCount : 0;

                        // בדיקה אם להסתיר קורות (לוגיקה חדשה)
                        const beamAndGapWidth = beamWidth + gapBetweenBeams;
                        const shouldHideBeams =
                            beamAndGapWidth < legBeamWidth && !isTopShelf;

                        if (shouldHideBeams) {
                            // חישוב כמה קורות למחוק מכל צד (לוגיקה חדשה)
                            const howManyFit = Math.floor(legBeamWidth / beamAndGapWidth);
                            let beamsToHidePerSide = Math.max(0, howManyFit);
                            const middleBeamsCount = surfaceBeams.length - 2;
                            beamsToHidePerSide = Math.min(beamsToHidePerSide, Math.floor(middleBeamsCount / 2));
                            
                            totalHiddenBeams += beamsToHidePerSide * 2; // 2 צדדים
                        }
                        
                        // בדיקה נוספת לארון: האם הקורות המקוצרות צרות מדי
                        if (!this.isTable && !this.isFuton && !isTopShelf) { // רק לארון ולא המדף העליון
                            const halfLegWidth = legBeamWidth / 2;
                            const shouldRemoveShortenedBeams = beamWidth < halfLegWidth;
                            
                            
                            if (shouldRemoveShortenedBeams) {
                                totalHiddenBeams += 1; // הוספת קורה מקוצרת אחת לכל מדף
                            }
                        }
                    });

                    // CHACH_ALLERT - Log pricing calculation

                    // חישוב כמות ברגים לפי רוחב הקורה
                    let screwsPerBeam = 4; // ברירת מחדל - 4 ברגים לקורה רחבה
                    if (beamWidth <= 4) {
                        screwsPerBeam = 2; // 2 ברגים לקורה צרה (רוחב <= 4)
                    }

                    // חישוב בסיסי של כל הברגים: כמות הקורות במדף × כמות המדפים × ברגים לקורה
                    // ללא התחשבות בקורות מוסתרות - זה יחושב בנפרד
                    const beamsPerShelf = surfaceBeams.length; // כמות הקורות במדף (25 במקרה הזה)
                    let totalScrews = beamsPerShelf * totalShelves * screwsPerBeam; // 25 × 4 × 4 = 400
                    
                    // הפחתת ברגים בקורות מקוצרות לפי threshold
                    // קריאת ערך threshold מה-restrictions של המוצר
                    let threshold = 50; // ערך ברירת מחדל (50 ס"מ)
                    if (this.product && Array.isArray(this.product.restrictions)) {
                        const thresholdRestriction = this.product.restrictions.find(
                            (r: any) => r.name === 'dubble-shorten-beam-screws-threshold'
                        );
                        if (thresholdRestriction && typeof thresholdRestriction.val === 'number') {
                            threshold = thresholdRestriction.val;
                        }
                    }
                    
                    // חישוב הפחתת ברגים בקורות מקוצרות
                    // קורות מקוצרות נמצאות רק במדפים שאינם המדף העליון (totalShelves - 1)
                    // בכל מדף יש 2 קורות מקוצרות (start ו-end)
                    const shelvesWithShortenedBeams = totalShelves - 1; // כל המדפים חוץ מהעליון
                    const shortenedBeamsPerShelf = 2; // start ו-end
                    const totalShortenedBeams = shelvesWithShortenedBeams * shortenedBeamsPerShelf;
                    
                    // חישוב אורך קורה מקוצרת (כמו ב-3D ובחישוב הקורות)
                    const legBeamHeight = legBeamSelected?.height / 10 || 0;
                    const frameParam = this.params.find((p) => p.type === 'beamSingle' && p.name !== 'shelfs' && p.name !== 'leg');
                    const frameBeamSelected = frameParam?.beams?.[frameParam.selectedBeamIndex || 0];
                    const frameBeamWidth = frameBeamSelected ? (frameBeamSelected.types?.[frameParam.selectedTypeIndex || 0]?.height / 10 || this.frameWidth) : this.frameWidth;
                    
                    const outsideParamCabForPricingShelves = this.getParam('is-reinforcement-beams-outside');
                    const isOutsideCabForPricingShelves = !!(outsideParamCabForPricingShelves && outsideParamCabForPricingShelves.default === true);
                    const defaultShorten = (legBeamHeight * 2);
                    const extraShorten = isOutsideCabForPricingShelves ? (2 * frameBeamWidth) : 0;
                    const shortenedBeamLength = Math.max(0.1, this.surfaceLength - (defaultShorten + extraShorten));
                    
                    // קביעת מספר הברגים לקורה מקוצרת לפי הכללים
                    const L = shortenedBeamLength; // אורך הקורה המקוצרת
                    const D = threshold; // ערך ה-threshold
                    
                    let screwsPerShortenedBeam: number;
                    if (L > D) {
                        // L > D → 4 ברגים (אין הפחתה)
                        screwsPerShortenedBeam = 4;
                    } else if (L > D / 2) {
                        // L > D/2 → 3 ברגים (הפחתה של 1)
                        screwsPerShortenedBeam = 3;
                    } else {
                        // L <= D/2 → 2 ברגים (הפחתה של 2)
                        screwsPerShortenedBeam = 2;
                    }
                    
                    // חישוב ההפחתה הכוללת
                    // בכל קורה מקוצרת, במקום 4 ברגים יש screwsPerShortenedBeam
                    const reductionPerShortenedBeam = 4 - screwsPerShortenedBeam;
                    const totalReduction = totalShortenedBeams * reductionPerShortenedBeam;
                    
                    // הפחתת הברגים מהחישוב הכולל
                    totalScrews = totalScrews - totalReduction;
                    
                    console.log('CHECK_SHORTEN_BEAM_SCREWS_PRICING', JSON.stringify({
                        beamsPerShelf: beamsPerShelf,
                        totalShelves: totalShelves,
                        screwsPerBeam: screwsPerBeam,
                        threshold: threshold,
                        L: L,
                        D: D,
                        D_half: D / 2,
                        condition1: `L > D: ${L > D}`,
                        condition2: `L > D/2: ${L > D / 2}`,
                        screwsPerShortenedBeam: screwsPerShortenedBeam,
                        shelvesWithShortenedBeams: shelvesWithShortenedBeams,
                        shortenedBeamsPerShelf: shortenedBeamsPerShelf,
                        totalShortenedBeams: totalShortenedBeams,
                        reductionPerShortenedBeam: reductionPerShortenedBeam,
                        totalReduction: totalReduction,
                        totalScrewsBeforeReduction: beamsPerShelf * totalShelves * screwsPerBeam,
                        totalScrewsAfterReduction: totalScrews,
                        shortenedBeamLength: shortenedBeamLength,
                        defaultShorten: defaultShorten,
                        extraShorten: extraShorten,
                        isOutside: isOutsideCabForPricingShelves,
                        calculation: `${beamsPerShelf} × ${totalShelves} × ${screwsPerBeam} = ${beamsPerShelf * totalShelves * screwsPerBeam}`
                    }, null, 2));
                    shelfForgingData.push({
                        type: 'Shelf Screws',
                        beamName: selectedBeam.name,
                        beamTranslatedName: selectedBeam.translatedName,
                        material: selectedType.translatedName,
                        count: totalScrews,
                        length: this.calculateScrewLength('shelf', beamHeight),
                        description: 'ברגי מדפים',
                    });
                    this.debugLog(
                        `Cabinet shelf screws: ${totalScrews} screws for ${totalShelves} shelves (${totalHiddenBeams} hidden beams, ${screwsPerBeam} screws per beam)`
                    );
                }
            }
        }
        return shelfForgingData;
    }
    // פונקציה לחישוב ברגי הרגליים
    private calculateLegForgingData(): any[] {
        this.debugLog('=== CALCULATING LEG FORGING DATA ===');
        const legForgingData: any[] = [];
        // חישוב ברגי רגליים
        const legParam = this.params.find((p) => p.name === 'leg');
        if (legParam && legParam.selectedBeamIndex !== undefined) {
            const selectedBeam = legParam.beams[legParam.selectedBeamIndex];
            const selectedType =
                selectedBeam?.types?.[legParam.selectedTypeIndex || 0];
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
                
                // DUBBLE_LEG_SCREWS - Check if we need to multiply screws
                const dubbleThreshold = this.product?.restrictions?.find((r: any) => r.name === 'dubble-leg-screws-threshold')?.val;
                const frameBeamHeight = beamWidth; // frameBeamHeight is the same as beamWidth for legs
                const shouldDuplicateScrews = dubbleThreshold && frameBeamHeight > dubbleThreshold;
                
                if (shouldDuplicateScrews) {
                    totalScrews = totalScrews * 2; // Double the screws (UP + DOWN instead of original)
                }
                
                // REDUCE_LEG_SCREWS_WHEN_OUTSIDE - Reduce leg screws by half when is-reinforcement-beams-outside is true (for table and cabinet)
                const outsideParamForPricing = this.getParam('is-reinforcement-beams-outside');
                const isOutsideForPricing = !!(outsideParamForPricing && outsideParamForPricing.default === true);
                if (isOutsideForPricing) {
                    totalScrews = Math.floor(totalScrews / 2); // Halve the screws (only Z-facing screws remain, Y-facing screws are removed)
                    console.log(`CHECK_REMOVE_LEG_SCREWS_OUTSIDE - Reduced leg screws by half for pricing: ${totalScrews} screws remain (product: ${this.isTable ? 'table' : 'cabinet'})`);
                }
                
                // חלוקה לשתי קבוצות שוות - חצי לכל קבוצה
                const halfScrews = Math.floor(totalScrews / 2);
                const remainingScrews = totalScrews - halfScrews; // לטפל במקרה של מספר אי-זוגי
                // קבוצה ראשונה: ברגים לפי רוחב קורת הרגל
                // מעביר גם beamWidth וגם beamHeight כדי לבחור את המקסימום
                const widthScrewLength = this.calculateScrewLength('leg_width', beamWidth, beamHeight);
                legForgingData.push({
                    type: 'Leg Screws (Width)',
                    beamName: selectedBeam.name,
                    beamTranslatedName: selectedBeam.translatedName,
                    material: selectedType.translatedName,
                    count: halfScrews,
                    length: widthScrewLength,
                    description: 'ברגי רגליים (לפי רוחב)',
                });
                // קבוצה שנייה: ברגים לפי גובה קורת הרגל
                // מעביר גם beamHeight וגם beamWidth כדי לבחור את המקסימום
                const heightScrewLength = this.calculateScrewLength('leg_height', beamHeight, beamWidth);
                legForgingData.push({
                    type: 'Leg Screws (Height)',
                    beamName: selectedBeam.name,
                    beamTranslatedName: selectedBeam.translatedName,
                    material: selectedType.translatedName,
                    count: remainingScrews,
                    length: heightScrewLength,
                    description: 'ברגי רגליים (לפי גובה)',
                });
                this.debugLog(
                    `Leg screws: ${halfScrews} width-based (${widthScrewLength}cm) + ${remainingScrews} height-based (${heightScrewLength}cm)`
                );
            }
        }
        return legForgingData;
    }
    
    // פונקציה לחישוב ברגי קירות העדנית
    private calculatePlanterWallForgingData(): any[] {
        this.debugLog('=== CALCULATING PLANTER WALL FORGING DATA ===');
        const planterWallForgingData: any[] = [];
        
        if (this.isPlanter || this.isBox) {
            const beamParam = this.getParam('beam');
            if (beamParam && beamParam.selectedBeamIndex !== undefined) {
                const selectedBeam = beamParam.beams[beamParam.selectedBeamIndex];
                const selectedType = selectedBeam?.types?.[beamParam.selectedTypeIndex || 0];
                
                if (selectedBeam && selectedType) {
                    const beamWidth = selectedBeam.width / 10; // המרה ממ"מ לס"מ
                    const beamHeight = selectedBeam.height / 10; // המרה ממ"מ לס"מ
                    
                    // חישוב כמות הקורות בקירות
                    const heightParam = this.getParam('height');
                    const planterHeight = heightParam ? heightParam.default : 50;
                    const beamsInHeight = Math.floor(planterHeight / beamWidth);
                    
                    // 2 קירות (קדמי ואחורי), כל קיר עם beamsInHeight קורות
                    const totalWallBeams = 2 * beamsInHeight;
                    
                    // 4 ברגים לכל קורה
                    const screwsPerBeam = 4;
                    const totalScrews = totalWallBeams * screwsPerBeam;
                    
                    planterWallForgingData.push({
                        type: 'Planter Wall Screws',
                        beamName: selectedBeam.name,
                        beamTranslatedName: selectedBeam.translatedName,
                        material: selectedType.translatedName,
                        count: totalScrews,
                        length: this.calculateScrewLength('planter_wall', beamHeight),
                        description: 'ברגי קירות עדנית',
                    });
                    
                    this.debugLog(
                        `Planter wall screws: ${totalScrews} screws for ${totalWallBeams} beams (${screwsPerBeam} screws per beam)`
                    );
                }
            }
        }
        
        return planterWallForgingData;
    }
    
    // פונקציה לחישוב ברגי רצפת העדנית
    private calculatePlanterFloorForgingData(): any[] {
        this.debugLog('=== CALCULATING PLANTER FLOOR FORGING DATA ===');
        const planterFloorForgingData: any[] = [];
        
        if (this.isPlanter || this.isBox) {
            const beamParam = this.getParam('beam');
            if (beamParam && beamParam.selectedBeamIndex !== undefined) {
                const selectedBeam = beamParam.beams[beamParam.selectedBeamIndex];
                const selectedType = selectedBeam?.types?.[beamParam.selectedTypeIndex || 0];
                
                if (selectedBeam && selectedType) {
                    const beamWidth = selectedBeam.width / 10; // המרה ממ"מ לס"מ
                    const beamHeight = selectedBeam.height / 10; // המרה ממ"מ לס"מ
                    
                    // חישוב כמות הקורות ברצפה
                    const widthParam = this.getParam('width');
                    const planterWidth = widthParam ? widthParam.default : 50;
                    const beamsInDepth = Math.floor(planterWidth / beamWidth);
                    
                    // 4 ברגים לכל קורת רצפה
                    const screwsPerBeam = 4;
                    const totalScrews = beamsInDepth * screwsPerBeam;
                    
                    planterFloorForgingData.push({
                        type: 'Planter Floor Screws',
                        beamName: selectedBeam.name,
                        beamTranslatedName: selectedBeam.translatedName,
                        material: selectedType.translatedName,
                        count: totalScrews,
                        length: this.calculateScrewLength('planter_floor', beamHeight),
                        description: 'ברגי רצפת עדנית',
                    });
                    
                    this.debugLog(
                        `Planter floor screws: ${totalScrews} screws for ${beamsInDepth} beams (${screwsPerBeam} screws per beam)`
                    );
                    
                    // הוספת ברגי מכסה (רק אם יש מכסה)
                    const isCoverParam = this.getParam('isCover');
                    if (this.isBox && isCoverParam && isCoverParam.default === true) {
                        // עכשיו יש 2 טורים בכל קורת תמיכה (בציר Z)
                        // קורות אמצעיות: 8 ברגים (2 קורות תמיכה × 2 טורים × 2 ברגים)
                        // קורות קצה: 4 ברגים (2 קורות תמיכה × 2 טורים × 1 בורג)
                        const middleBeams = beamsInDepth - 2; // קורות אמצעיות
                        const edgeBeams = 2; // קורה ראשונה ואחרונה
                        const coverTotalScrews = (middleBeams * 8) + (edgeBeams * 4);
                        
                        planterFloorForgingData.push({
                            type: 'Box Cover Screws',
                            beamName: selectedBeam.name,
                            beamTranslatedName: selectedBeam.translatedName,
                            material: selectedType.translatedName,
                            count: coverTotalScrews,
                            length: this.calculateScrewLength('planter_floor', beamHeight),
                            description: 'ברגי מכסה קופסא',
                        });
                        
                        this.debugLog(
                            `Box cover screws: ${coverTotalScrews} screws for ${beamsInDepth} beams (${screwsPerBeam} screws per beam)`
                        );
                    }
                }
            }
        }
        
        return planterFloorForgingData;
    }
    
    // פונקציה לחישוב ברגי קירות צדדיים עדנית
    private calculatePlanterSideWallForgingData(): any[] {
        this.debugLog('=== CALCULATING PLANTER SIDE WALL FORGING DATA ===');
        const planterSideWallForgingData: any[] = [];
        
        if (this.isPlanter || this.isBox) {
            const beamParam = this.getParam('beam');
            if (beamParam && beamParam.selectedBeamIndex !== undefined) {
                const selectedBeam = beamParam.beams[beamParam.selectedBeamIndex];
                const selectedType = selectedBeam?.types?.[beamParam.selectedTypeIndex || 0];
                
                if (selectedBeam && selectedType) {
                    const beamHeight = selectedBeam.height / 10; // המרה ממ"מ לס"מ
                    
                    // חישוב כמות הברגים לפי המרחק
                    const depthParam = this.getParam('depth');
                    const planterDepth = depthParam ? depthParam.default : 40;
                    const divisions = Math.ceil(planterDepth / 30); // חלוקה ב-30 ועגול למעלה
                    const screwCount = Math.max(divisions, 3); // מינימום 3 ברגים
                    
                    // 2 קירות צדדיים (ללא הקיצוניים)
                    const actualScrewCount = Math.max(screwCount - 2, 1); // הסרת הקיצוניים, מינימום 1
                    const totalScrews = actualScrewCount * 2;
                    
                    planterSideWallForgingData.push({
                        type: 'Planter Side Wall Screws',
                        beamName: selectedBeam.name,
                        beamTranslatedName: selectedBeam.translatedName,
                        material: selectedType.translatedName,
                        count: totalScrews,
                        length: this.calculateScrewLength('planter_side_wall', beamHeight),
                        description: 'ברגי קירות צדדיים עדנית',
                    });
                    
                    this.debugLog(
                        `Planter side wall screws: ${totalScrews} screws for 2 side walls (${actualScrewCount} screws per wall, excluding edge screws)`
                    );
                }
            }
        }
        
        return planterSideWallForgingData;
    }
    
    // פונקציה להוספת ברגים לקורת קיר עדנית
    private addScrewsToPlanterWallBeam(
        wallX: number, 
        wallY: number, 
        wallZ: number, 
        wallLength: number, 
        beamHeight: number, 
        beamDepth: number, 
        isFrontBackWall: boolean, 
        wallName: string, 
        beamNumber: number,
        beamWidth?: number
    ) {
        // חישוב אורך הבורג לפי סוג הבורג והמידות
        const calculatedScrewLength = this.calculateScrewLength('planter_wall', beamDepth);
        
        // 4 ברגים לכל קורה - בקצוות הקורה, ניצבים אליה ב-4 הפינות
        // ראש הבורג במפלס החיצוני של תיבת ה-wireframe
        const screwOffset = beamDepth / 2 + 0.1; // חצי עומק הקורה + קצת חוץ
        const innerOffset = beamDepth / 2; // הזזה פנימית לכיוון האמצע
        
        // קיר קדמי: ברגים בצד החיצוני (X שלילי)
        // קיר אחורי: ברגים בצד החיצוני (X חיובי)
        const isFrontWall = wallName === 'קדמי';
        const outerOffset = isFrontWall ? -screwOffset : screwOffset;
        
        const screwPositions = [
            // בורג ראשון - פינה שמאלית עליונה
            {
                x: wallX + (isFrontBackWall ? outerOffset : innerOffset),
                y: wallY + beamHeight / 2 - innerOffset, // הזזה פנימית למעלה
                z: wallZ - wallLength / 2 + (isFrontBackWall ? innerOffset : -screwOffset)
            },
            // בורג שני - פינה ימנית עליונה
            {
                x: wallX + (isFrontBackWall ? outerOffset : -innerOffset),
                y: wallY + beamHeight / 2 - innerOffset, // הזזה פנימית למעלה
                z: wallZ + wallLength / 2 + (isFrontBackWall ? -innerOffset : screwOffset)
            },
            // בורג שלישי - פינה שמאלית תחתונה
            {
                x: wallX + (isFrontBackWall ? outerOffset : innerOffset),
                y: wallY - beamHeight / 2 + innerOffset, // הזזה פנימית למטה
                z: wallZ - wallLength / 2 + (isFrontBackWall ? innerOffset : -screwOffset)
            },
            // בורג רביעי - פינה ימנית תחתונה
            {
                x: wallX + (isFrontBackWall ? outerOffset : -innerOffset),
                y: wallY - beamHeight / 2 + innerOffset, // הזזה פנימית למטה
                z: wallZ + wallLength / 2 + (isFrontBackWall ? -innerOffset : screwOffset)
            }
        ];
        
        // שורה חיצונית של ברגים
        screwPositions.forEach((pos, screwIndex) => {
            const screwGroup = this.createHorizontalScrewGeometry(calculatedScrewLength);
            screwGroup.position.set(pos.x, pos.y, pos.z);
            
            // ברגים ניצבים לקורה - כיוון הפוך לכל קיר
            // קיר קדמי (wallIndex === 2): כיוון הפוך (180 מעלות)
            // קיר אחורי (wallIndex === 3): כיוון רגיל
            const isFrontWall = wallName === 'קדמי';
            screwGroup.rotation.y = isFrontWall ? Math.PI : 0;
            
            this.scene.add(screwGroup);
            this.beamMeshes.push(screwGroup);
            
            this.debugLog(
                `קיר ${wallName} קורה ${beamNumber} בורג ${screwIndex + 1} (שורה חיצונית): x=${pos.x.toFixed(1)}, y=${pos.y.toFixed(1)}, z=${pos.z.toFixed(1)}, rotation=${isFrontWall ? '180°' : '0°'}`
            );
        });
        
        // שורה פנימית של ברגים - מוזזת פנימה בציר Z לפי beamDepth
        const innerScrewPositions = [
            // בורג ראשון - פינה שמאלית עליונה
            {
                x: wallX + (isFrontBackWall ? outerOffset : innerOffset),
                y: wallY + beamHeight / 2 - innerOffset, // הזזה פנימית למעלה
                z: wallZ - wallLength / 2 + (isFrontBackWall ? innerOffset + beamDepth : -screwOffset)
            },
            // בורג שני - פינה ימנית עליונה
            {
                x: wallX + (isFrontBackWall ? outerOffset : -innerOffset),
                y: wallY + beamHeight / 2 - innerOffset, // הזזה פנימית למעלה
                z: wallZ + wallLength / 2 + (isFrontBackWall ? -innerOffset - beamDepth : screwOffset)
            },
            // בורג שלישי - פינה שמאלית תחתונה
            {
                x: wallX + (isFrontBackWall ? outerOffset : innerOffset),
                y: wallY - beamHeight / 2 + innerOffset, // הזזה פנימית למטה
                z: wallZ - wallLength / 2 + (isFrontBackWall ? innerOffset + beamDepth : -screwOffset)
            },
            // בורג רביעי - פינה ימנית תחתונה
            {
                x: wallX + (isFrontBackWall ? outerOffset : -innerOffset),
                y: wallY - beamHeight / 2 + innerOffset, // הזזה פנימית למטה
                z: wallZ + wallLength / 2 + (isFrontBackWall ? -innerOffset - beamDepth : screwOffset)
            }
        ];
        
        innerScrewPositions.forEach((pos, screwIndex) => {
            const screwGroup = this.createHorizontalScrewGeometry(calculatedScrewLength);
            screwGroup.position.set(pos.x, pos.y, pos.z);
            
            // ברגים ניצבים לקורה - כיוון הפוך לכל קיר
            const isFrontWall = wallName === 'קדמי';
            screwGroup.rotation.y = isFrontWall ? Math.PI : 0;
            
            this.scene.add(screwGroup);
            this.beamMeshes.push(screwGroup);
            
            this.debugLog(
                `קיר ${wallName} קורה ${beamNumber} בורג ${screwIndex + 1} (שורה פנימית): x=${pos.x.toFixed(1)}, y=${pos.y.toFixed(1)}, z=${pos.z.toFixed(1)}, rotation=${isFrontWall ? '180°' : '0°'}`
            );
        });
        
        // שורה שלישית של ברגים - מסובבת ב-90 מעלות כלפי פנים
        // הברגים צריכים להצביע למרכז הקורות החיזוק האנכיות
        // הקורות האנכיות: רוחב = beamDepth, עומק = beamHeight
        // מיקום הקורה האנכית: הקצה הפנימי של הקיר + חצי רוחב הקורה האנכית
        const headHeight = 0.2; // גובה ראש הבורג - 2 מ"מ
        
        // חישוב המרחק של מרכז הקורה האנכית מ-wallX
        // קורות החיזוק האנכיות ממוקמות ב: x = ±(planterDepth/2 - beamDepth - beamWidth/2)
        // כאן beamDepth בפונקציית הברגים = beamHeight של המערכת
        // wallX של קיר קדמי = -planterDepth/2 + beamDepth/2
        // מרכז הקורה האנכית = -planterDepth/2 + beamDepth + beamWidth/2
        // אז המרחק מ-wallX למרכז הקורה:
        // (-planterDepth/2 + beamDepth + beamWidth/2) - (-planterDepth/2 + beamDepth/2)
        // = beamDepth + beamWidth/2 - beamDepth/2 = beamDepth/2 + beamWidth/2
        const supportBeamWidth = beamWidth || beamDepth; // רוחב הקורה האנכית בציר X
        const supportBeamOffsetFromWall = beamDepth / 2 + supportBeamWidth / 2;
        
        const thirdRowScrewPositions = [
            // בורג ראשון - פינה שמאלית עליונה (פונה ל-Z שלילי)
            {
                x: wallX + (isFrontWall ? supportBeamOffsetFromWall : -supportBeamOffsetFromWall),
                y: wallY + beamHeight / 2 - innerOffset,
                z: wallZ - wallLength / 2 + innerOffset - (beamDepth / 2) - headHeight
            },
            // בורג שני - פינה ימנית עליונה (פונה ל-Z חיובי)
            {
                x: wallX + (isFrontWall ? supportBeamOffsetFromWall : -supportBeamOffsetFromWall),
                y: wallY + beamHeight / 2 - innerOffset,
                z: wallZ + wallLength / 2 - innerOffset + (beamDepth / 2) + headHeight
            },
            // בורג שלישי - פינה שמאלית תחתונה (פונה ל-Z שלילי)
            {
                x: wallX + (isFrontWall ? supportBeamOffsetFromWall : -supportBeamOffsetFromWall),
                y: wallY - beamHeight / 2 + innerOffset,
                z: wallZ - wallLength / 2 + innerOffset - (beamDepth / 2) - headHeight
            },
            // בורג רביעי - פינה ימנית תחתונה (פונה ל-Z חיובי)
            {
                x: wallX + (isFrontWall ? supportBeamOffsetFromWall : -supportBeamOffsetFromWall),
                y: wallY - beamHeight / 2 + innerOffset,
                z: wallZ + wallLength / 2 - innerOffset + (beamDepth / 2) + headHeight
            }
        ];
        
        thirdRowScrewPositions.forEach((pos, screwIndex) => {
            const screwGroup = this.createHorizontalScrewGeometry(calculatedScrewLength);
            screwGroup.position.set(pos.x, pos.y, pos.z);
            
            // הברגים צריכים להיות כמו ברגי הקיר הרגילים, אבל מסובבים ב-90 מעלות
            // ברגים שמאליים (אינדקס 0 ו-2) צריכים להיכנס מכיוון +Z
            // ברגים ימניים (אינדקס 1 ו-3) צריכים להיכנס מכיוון -Z
            const isLeft = screwIndex === 0 || screwIndex === 2;
            
            // לוגיקה פשוטה: ברגים שמאליים = +90°, ברגים ימניים = -90°
            let rotation = isLeft ? Math.PI / 2 : -Math.PI / 2;
            
            // אם זה קיר קדמי, נוסיף 180 מעלות לסיבוב הבסיסי
            if (isFrontWall) {
                rotation += Math.PI;
            }
            
            // תיקון נוסף: אם הבורג בצד החיובי של ציר העומק (X > 0), נהפוך אותו ב-180 מעלות
            // זה יתקן צד אחד שלם של האדנית (2 פינות סמוכות לאורך ציר העומק)
            if (pos.x > 0) {
                rotation += Math.PI;
            }
            
            // הפיכת כל הברגים ב-180 מעלות
            rotation += Math.PI;
            
            screwGroup.rotation.y = rotation;
            
            this.scene.add(screwGroup);
            this.beamMeshes.push(screwGroup);
            
            const rotationDeg = (rotation * 180 / Math.PI).toFixed(0);
            this.debugLog(
                `קיר ${wallName} קורה ${beamNumber} בורג ${screwIndex + 1} (שורה שלישית): x=${pos.x.toFixed(1)}, y=${pos.y.toFixed(1)}, z=${pos.z.toFixed(1)}, rotationY=${rotationDeg}°, isLeft=${isLeft}, isFrontWall=${isFrontWall}, posX>0=${pos.x > 0}`
            );
        });
    }
    
    // פונקציה להוספת ברגים לקורת רצפת עדנית
    private addScrewsToPlanterFloorBeam(
        floorX: number, 
        floorY: number, 
        floorZ: number, 
        floorLength: number, 
        beamHeight: number, 
        beamWidth: number, 
        beamNumber: number
    ) {
        // חישוב אורך הבורג לפי סוג הבורג והמידות
        const calculatedScrewLength = this.calculateScrewLength('planter_floor', beamHeight);
        
        // 4 ברגים לכל קורת רצפה - בקצוות הקורה, ניצבים כלפי מעלה
        const screwOffset = beamHeight / 2 + 0.1; // חצי גובה הקורה + קצת חוץ
        const innerOffset = beamHeight / 2; // הזזה פנימית לכיוון האמצע
        
        const screwPositions = [
            // בורג ראשון - פינה שמאלית קדמית
            {
                x: floorX - floorLength / 2 + innerOffset,
                y: floorY - screwOffset, // מתחת לרצפה
                z: floorZ - beamWidth / 2 + innerOffset
            },
            // בורג שני - פינה ימנית קדמית
            {
                x: floorX + floorLength / 2 - innerOffset,
                y: floorY - screwOffset, // מתחת לרצפה
                z: floorZ - beamWidth / 2 + innerOffset
            },
            // בורג שלישי - פינה שמאלית אחורית
            {
                x: floorX - floorLength / 2 + innerOffset,
                y: floorY - screwOffset, // מתחת לרצפה
                z: floorZ + beamWidth / 2 - innerOffset
            },
            // בורג רביעי - פינה ימנית אחורית
            {
                x: floorX + floorLength / 2 - innerOffset,
                y: floorY - screwOffset, // מתחת לרצפה
                z: floorZ + beamWidth / 2 - innerOffset
            }
        ];
        
        screwPositions.forEach((pos, screwIndex) => {
            const screwGroup = this.createScrewGeometry(calculatedScrewLength);
            screwGroup.position.set(pos.x, pos.y, pos.z);
            
            // ברגים ניצבים כלפי מעלה
            screwGroup.rotation.x = Math.PI; // סיבוב 180 מעלות כדי שהבורג יפנה כלפי מעלה
            screwGroup.rotation.y = 0;
            screwGroup.rotation.z = 0;
            
            this.scene.add(screwGroup);
            this.beamMeshes.push(screwGroup);
            
            this.debugLog(
                `רצפה קורה ${beamNumber} בורג ${screwIndex + 1}: x=${pos.x.toFixed(1)}, y=${pos.y.toFixed(1)}, z=${pos.z.toFixed(1)}`
            );
        });
    }
    
    // פונקציה להוספת ברגים לקירות השמאליים והימניים בתחתית הרצפה
    private addScrewsToSideWallsAtFloor(
        planterDepth: number, 
        planterWidth: number, 
        beamHeight: number, 
        widthInput: number
    ) {
        // חישוב אורך הבורג לפי סוג הבורג והמידות
        const calculatedScrewLength = this.calculateScrewLength('planter_side_wall', beamHeight);
        
        // חישוב המרחק בין שתי שורות הברגים הקיימות
        const distanceBetweenScrewRows = planterDepth; // המרחק בין הקירות הקדמיים והאחוריים
        const divisions = Math.ceil(distanceBetweenScrewRows / 30); // חלוקה ב-30 ועגול למעלה
        const screwCount = Math.max(divisions, 3); // מינימום 3 ברגים
        
        // הזזה בחצי מעומק הקורה
        const screwOffset = beamHeight / 2;
        
        // ברגים לקיר השמאלי (ללא הקיצוניים)
        for (let i = 1; i < screwCount - 1; i++) {
            const xPosition = -planterDepth / 2 + (i * planterDepth / (screwCount - 1));
            const screwGroup = this.createScrewGeometry(calculatedScrewLength);
            screwGroup.position.set(xPosition, beamHeight / 2 - screwOffset, -planterWidth / 2 + beamHeight / 2);
            screwGroup.rotation.x = Math.PI; // ברגים כלפי מעלה
            screwGroup.rotation.y = Math.PI / 2; // ברגים אופקיים
            screwGroup.rotation.z = 0;
            
            this.scene.add(screwGroup);
            this.beamMeshes.push(screwGroup);
            
            this.debugLog(`קיר שמאלי בורג ${i}: x=${xPosition.toFixed(1)}, y=${(beamHeight / 2 - screwOffset).toFixed(1)}, z=${(-planterWidth / 2 + beamHeight / 2).toFixed(1)}`);
        }
        
        // ברגים לקיר הימני (ללא הקיצוניים)
        for (let i = 1; i < screwCount - 1; i++) {
            const xPosition = -planterDepth / 2 + (i * planterDepth / (screwCount - 1));
            const screwGroup = this.createScrewGeometry(calculatedScrewLength);
            screwGroup.position.set(xPosition, beamHeight / 2 - screwOffset, planterWidth / 2 - beamHeight / 2);
            screwGroup.rotation.x = Math.PI; // ברגים כלפי מעלה
            screwGroup.rotation.y = Math.PI / 2; // ברגים אופקיים
            screwGroup.rotation.z = 0;
            
            this.scene.add(screwGroup);
            this.beamMeshes.push(screwGroup);
            
            this.debugLog(`קיר ימני בורג ${i}: x=${xPosition.toFixed(1)}, y=${(beamHeight / 2 - screwOffset).toFixed(1)}, z=${(planterWidth / 2 - beamHeight / 2).toFixed(1)}`);
        }
        
        const actualScrewCount = Math.max(screwCount - 2, 1); // הסרת הקיצוניים, מינימום 1
        this.debugLog(`נוספו ${actualScrewCount} ברגים לכל קיר צדדי (סה"כ ${actualScrewCount * 2} ברגים, ללא הקיצוניים)`);
    }
    
    // פונקציה ליצירת קורות חיזוק פנימיות לעדנית
    private createPlanterInternalSupportBeams(
        planterDepth: number, 
        planterWidth: number, 
        actualWallHeight: number, 
        beamHeight: number, 
        beamWidth: number,
        woodType: string = ''
    ) {
        this.debugLog('=== יצירת קורות חיזוק פנימיות לעדנית ===');
        
        // 4 קורות חיזוק בפינות הפנימיות
        // מיקום הקורה כך שהקצה שלה יושב בדיוק על הקצה הפנימי של קיר הקדמי/אחורי
        // קיר קדמי נמצא ב: x = -planterDepth/2 + beamHeight/2
        // הקצה הפנימי שלו: x = -planterDepth/2 + beamHeight
        // מרכז הקורה האנכית צריך להיות ב: הקצה הפנימי של הקיר + beamWidth/2
        const supportBeamPositions = [
            // פינה שמאלית קדמית - צמודה לקצה הפנימי של הקיר הקדמי
            { x: -planterDepth / 2 + beamHeight + beamWidth / 2, z: -planterWidth / 2 + beamHeight + beamHeight / 2 },
            // פינה ימנית קדמית - צמודה לקצה הפנימי של הקיר הקדמי
            { x: planterDepth / 2 - beamHeight - beamWidth / 2, z: -planterWidth / 2 + beamHeight + beamHeight / 2 },
            // פינה שמאלית אחורית - צמודה לקצה הפנימי של הקיר האחורי
            { x: -planterDepth / 2 + beamHeight + beamWidth / 2, z: planterWidth / 2 - beamHeight - beamHeight / 2 },
            // פינה ימנית אחורית - צמודה לקצה הפנימי של הקיר האחורי
            { x: planterDepth / 2 - beamHeight - beamWidth / 2, z: planterWidth / 2 - beamHeight - beamHeight / 2 }
        ];
        
        supportBeamPositions.forEach((pos, index) => {
            // גובה הקורה מתחיל במפלס העליון של הרצפה
            const startY = beamHeight; // מפלס עליון של הרצפה
            const endY = startY + actualWallHeight; // שיא גובה העדנית
            
            const geometry = new THREE.BoxGeometry(
                beamWidth, // רוחב הקורה
                actualWallHeight, // גובה הקורה = גובה הקירות
                beamHeight // עומק הקורה
            );
            
            // שימוש בטקסטורה של קורות העדנית
            // העדנית משתמשת באותו סוג עץ לכל הקורות
            const material = this.getWoodMaterial(woodType);
            
            const mesh = new THREE.Mesh(geometry, material);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.addWireframeToBeam(mesh); // הוספת wireframe במצב שקוף
            
            // מיקום הקורה - ממורכז בגובה
            const centerY = startY + actualWallHeight / 2;
            mesh.position.set(pos.x, centerY, pos.z);
            
            this.scene.add(mesh);
            this.beamMeshes.push(mesh);
            
            this.debugLog(`קורת חיזוק פנימית ${index + 1}: x=${pos.x.toFixed(1)}, y=${centerY.toFixed(1)}, z=${pos.z.toFixed(1)}, גובה=${actualWallHeight.toFixed(1)}`);
        });
        
        this.debugLog('קורות חיזוק פנימיות נוצרו בהצלחה');
    }
    
    // פונקציה ראשית לחישוב כל הברגים
    private async calculateForgingData(): Promise<void> {
        this.startTimer('CABINET - Calculate Forging Data');
        this.debugLog('=== CALCULATING FORGING DATA ===');
        // איפוס המערך
        this.ForgingDataForPricing = [];
        
        this.startTimer('CABINET - Calculate Shelf Screws');
        // חישוב ברגי מדפים/פלטה
        const shelfForgingData = this.calculateShelfForgingData();
        this.endTimer('CABINET - Calculate Shelf Screws');
        this.ForgingDataForPricing.push(...shelfForgingData);
        
        this.startTimer('CABINET - Calculate Leg Screws');
        // חישוב ברגי רגליים
        const legForgingData = this.calculateLegForgingData();
        this.endTimer('CABINET - Calculate Leg Screws');
        this.ForgingDataForPricing.push(...legForgingData);
        // חישוב ברגי קירות עדנית
        const planterWallForgingData = this.calculatePlanterWallForgingData();
        this.ForgingDataForPricing.push(...planterWallForgingData);
        // חישוב ברגי רצפת עדנית
        const planterFloorForgingData = this.calculatePlanterFloorForgingData();
        this.ForgingDataForPricing.push(...planterFloorForgingData);
        // חישוב ברגי קירות צדדיים עדנית
        const planterSideWallForgingData = this.calculatePlanterSideWallForgingData();
        this.ForgingDataForPricing.push(...planterSideWallForgingData);
        
        // הכפלת כמות הברגים לפי כמות היחידות
        this.ForgingDataForPricing.forEach((forgingData) => {
            forgingData.count = forgingData.count * this.quantity;
        });
        
        // הצגת התוצאה הסופית
        this.debugLog('=== FINAL FORGING DATA FOR PRICING ===');
        this.debugLog('Total forging types:', this.ForgingDataForPricing.length);
        this.ForgingDataForPricing.forEach((forgingData, index) => {
            this.debugLog(`Forging Type ${index + 1}:`, {
                type: forgingData.type,
                beamName: forgingData.beamName,
                beamTranslatedName: forgingData.beamTranslatedName,
                material: forgingData.material,
                count: forgingData.count,
                length: forgingData.length,
                description: forgingData.description,
            });
        });
        this.debugLog('*** === END FORGING DATA ===', this.ForgingDataForPricing);
        // חישוב מחיר כולל ותוכנית חיתוך
        this.calculatedPrice = await this.pricingService.calculatePrice(
            this.BeamsDataForPricing,
            this.ForgingDataForPricing
        );
        this.cuttingPlan = await this.pricingService.getCuttingPlan(
            this.BeamsDataForPricing,
            this.ForgingDataForPricing
        );
        this.screwsPackagingPlan = this.pricingService.getScrewsPackagingPlan(
            this.ForgingDataForPricing
        );
        this.debugLog('=== FINAL CALCULATED PRICE ===', this.calculatedPrice);
        this.debugLog('=== SCREWS PACKAGING PLAN ===', this.screwsPackagingPlan);
        this.debugLog('=== CUTTING PLAN ===', this.cuttingPlan);
        
        // חישוב סכום הקורות הבודדות
        let totalBeamPrices = 0;
        this.cuttingPlan.forEach((beam, index) => {
            this.debugLog(`Beam ${index + 1}: ${beam.beamPrice}₪ (${beam.beamType} ${beam.beamLength}cm)`);
            totalBeamPrices += beam.beamPrice;
        });
        this.debugLog('=== TOTAL OF INDIVIDUAL BEAM PRICES ===', totalBeamPrices);
        
        // חישוב מחיר הברגים
        let totalForgingPrices = 0;
        this.ForgingDataForPricing.forEach((forging, index) => {
            const pricePerUnit = this.pricingService.findPriceForLength(forging.type, forging.length);
            const forgingPrice = pricePerUnit * forging.count;
            this.debugLog(`Forging ${index + 1}: ${forgingPrice}₪ (${forging.type} ${forging.length}cm x ${forging.count} @ ${pricePerUnit}₪ each)`);
            totalForgingPrices += forgingPrice;
        });
        this.debugLog('=== TOTAL FORGING PRICES ===', totalForgingPrices);
        
        const totalExpectedPrice = totalBeamPrices + totalForgingPrices;
        this.debugLog('=== EXPECTED TOTAL (BEAMS + FORGING) ===', totalExpectedPrice);
        this.debugLog('=== ACTUAL CALCULATED PRICE ===', this.calculatedPrice);
        this.debugLog('=== DIFFERENCE ===', this.calculatedPrice - totalExpectedPrice);
        
        this.endTimer('CABINET - Calculate Forging Data');
        
    }
    // פונקציה לקבוצת חתיכות לפי גודל
    getCutGroups(cuts: number[]): { length: number; count: number }[] {
        const groups: { [key: number]: number } = {};
        // ספירת כל גודל
        cuts.forEach((cut) => {
            groups[cut] = (groups[cut] || 0) + 1;
        });
        // המרה למערך ומיון בסדר יורד
        return Object.keys(groups)
            .map((length) => ({
                length: parseFloat(length), // שימוש ב-parseFloat במקום parseInt כדי לשמור על עשרוניות
                count: groups[parseFloat(length)],
            }))
            .sort((a, b) => b.length - a.length);
    }
    animate() {
        requestAnimationFrame(() => this.animate());
        this.camera.lookAt(0, 0, 0);
        this.renderer.render(this.scene, this.camera);
    }
    // קורות משטח
    private createSurfaceBeams(
        totalWidth: number,
        totalLength: number,
        beamWidth: number,
        beamHeight: number,
        minGap: number
    ): { x: number; width: number; height: number; depth: number }[] {
        const n = Math.floor((totalWidth + minGap) / (beamWidth + minGap));
        const actualGap = n > 1 ? (totalWidth - n * beamWidth) / (n - 1) : 0;
        const beams = [];
        for (let i = 0; i < n; i++) {
            const x =
                -totalWidth / 2 + i * (beamWidth + actualGap) + beamWidth / 2;
            beams.push({
                x,
                width: beamWidth,
                height: beamHeight,
                depth: totalLength,
            });
        }
        return beams;
    }

    // קורות מדף לארון - בדיוק 6 קורות
    private createCabinetShelfBeams(
        totalLength: number,
        beamWidth: number,
        beamHeight: number
    ): { width: number; height: number; depth: number }[] {
        // תמיד 6 קורות למדף בארון
        const beams = [];
        for (let i = 0; i < 6; i++) {
            beams.push({
                width: beamWidth,
                height: beamHeight,
                depth: totalLength, // אורך הקורה = אורך המדף
            });
        }
        this.debugLog('🔍 CABINET SHELF BEAMS:', {
            count: beams.length,
            length: totalLength,
            beamWidth: beamWidth,
            beamHeight: beamHeight
        });
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
    ): {
        x: number;
        y: number;
        z: number;
        width: number;
        height: number;
        depth: number;
    }[] {
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
            -totalLength / 2 + legDepth / 2, // קדמית - צמודה לקצה לפי מידות הרגליים
            totalLength / 2 - legDepth / 2, // אחורית - צמודה לקצה לפי מידות הרגליים
        ]) {
            // עבור שולחן: קיצור לפי גובה קורות החיזוק
            // עבור ארון: קיצור לפי רוחב הרגליים (legWidth)
            const beamWidth = this.isTable
                ? totalWidth - 2 * frameBeamHeight
                : totalWidth - 2 * legWidth;
            beams.push({
                x: 0, // ממורכזות במרכז
                y: 0,
                z: z, // מיקום זהה לארון
                width: beamWidth, // עבור שולחן: קיצור לפי גובה קורות החיזוק, עבור ארון: קיצור לפי רוחב הרגליים
                height: frameBeamHeight, // גובה מקורות החיזוק
                depth: frameBeamWidth, // עומק מקורות החיזוק
            });
        }
        // Z axis beams (left/right) - קורות אופקיות שמאליות וימניות
        for (const x of [
            -totalWidth / 2 + legWidth / 2, // שמאלית - צמודה לקצה לפי מידות הרגליים
            totalWidth / 2 - legWidth / 2, // ימנית - צמודה לקצה לפי מידות הרגליים
        ]) {
            const originalX = x;
            const adjustedX = x; // עבור שולחן וארון - מיקום זהה
            beams.push({
                x: adjustedX, // עבור שולחן, שתי הקורות ממורכזות למרכז הרגל
                y: 0,
                z: 0,
                width: frameBeamWidth, // רוחב מקורות החיזוק
                height: frameBeamHeight, // גובה מקורות החיזוק
                depth: totalLength - 2 * legDepth, // עומק זהה לארון
            });
        }
        return beams;
    }

    // מרכוז המצלמה על קוביית ה-wireframe בפתיחה הראשונית
    private centerCameraOnWireframe() {
        // איפוס מיקום המצלמה ישירות עם הפונקציה החדשה - עם אנימציה בפתיחת הקומפוננטה
        // קוראים ישירות ל-resetCameraView כדי שהמצלמה תהיה במיקום הנכון לפני שהמשתמש רואה את התלת מימד
        this.resetCameraView(true); // true = עם אנימציה בפתיחת הקומפוננטה
    }

    // פונקציה שבודקת גובה המסך ועושה pan למעלה בחצי מגובה המסך
    private panUpHalfScreen() {
        const screenHeight = window.innerHeight;
        const panAmount = screenHeight / 2; // חצי מגובה המסך
        
        // חישוב כיוון ה-pan למעלה
        const cam = this.camera;
        const pan = new THREE.Vector3();
        pan.addScaledVector(new THREE.Vector3().setFromMatrixColumn(cam.matrix, 1), panAmount * 0.2);
        
        // הזזת המצלמה והסצנה
        cam.position.add(pan);
        this.scene.position.add(pan);
        
        this.debugLog('PAN UP HALF SCREEN:', {
            screenHeight,
            panAmount,
            panVector: pan,
            cameraPosition: this.camera.position.clone(),
            scenePosition: this.scene.position.clone()
        });
    }
    
    // חישוב מיקום המצלמה האופטימלי לפי מידות המוצר
    private calculateOptimalCameraPosition(dimensions: { width: number; length: number; height: number }): { x: number; y: number; z: number } {
        const { width, length, height } = dimensions;
        
        // דוגמאות מהקוד (מתוקן):
        // 300W 50D 230H → camera(200, 600, 700)
        // 220W 43D 45H → camera(100, 400, 450) - מוצר קטן ונמוך!
        // 600W 70D 180H → camera(70, 250, 550) - מוצר רחב!
        
        // ניתוח מעמיק של הדפוסים:
        // X: ככל שהמוצר רחב יותר, צריך להיות קרוב יותר לצד (X קטן) כדי לראות את כל הרוחב
        // Y: ככל שהמוצר גבוה יותר, צריך להיות גבוה יותר, אבל עם offset בסיסי
        // Z: המרחק הכללי - מוצרים קטנים צריכים להיות יחסית קרובים
        
        // **חישוב X: יחס הפוך לרוחב**
        // הרעיון: המצלמה צריכה להיות בצד כך שתראה את כל הרוחב
        // ניתוח: X ≈ k / (width + offset)
        // 220W → X=100: 100 = k/(220+c) → k = 100*(220+c)
        // 300W → X=200: 200 = k/(300+c) → k = 200*(300+c)
        // 600W → X=70: 70 = k/(600+c) → k = 70*(600+c)
        // פתרון: c≈50, k≈50000
        const x = Math.max(50, 50000 / (width * 2.5 + 50));
        // בדיקה: 220→50000/600≈83, 300→50000/800≈63, 600→50000/1550≈32 (לא מדויק אבל כיוון נכון)
        
        // ננסה power function: X = a * width^b
        // log(X) = log(a) + b*log(width)
        // (220,100): log(100) = log(a) + b*log(220) → 2 = log(a) + b*2.34
        // (600,70): log(70) = log(a) + b*log(600) → 1.85 = log(a) + b*2.78
        // b = (1.85-2)/(2.78-2.34) = -0.15/0.44 = -0.34
        // log(a) = 2 - (-0.34)*2.34 = 2.8 → a = 630
        const xPower = 630 * Math.pow(width, -0.34);
        // 220 → 630*220^-0.34 ≈ 630*0.158 ≈ 99 ✓
        // 300 → 630*300^-0.34 ≈ 630*0.135 ≈ 85 (צריך 200, לא טוב)
        
        // ננסה משהו פשוט יותר: X = base - width/factor
        const xSimple = 250 - width * 0.3;
        // 220 → 250-66 = 184 (צריך 100)
        // 300 → 250-90 = 160 (צריך 200)
        // לא עובד
        
        // הפתרון: נשתמש בשילוב של שני גורמים
        const xFinal = 50 + 30000 / (width + 100);
        // 220 → 50 + 30000/320 = 50 + 93.75 = 143 (קרוב יותר ל-100)
        // 300 → 50 + 30000/400 = 50 + 75 = 125 (רחוק מ-200)
        // 600 → 50 + 30000/700 = 50 + 42.86 = 93 (קרוב ל-70)
        
        // **חישוב Y: תלוי בגובה + offset**
        // הרעיון: המצלמה צריכה להיות גבוהה מספיק כדי לראות את המוצר מלמעלה
        // מוצרים נמוכים: Y גבוה יחסית (כדי לראות מלמעלה)
        // מוצרים גבוהים: Y גבוה מאוד (כדי לראות את הכל)
        // 45H → 400Y: Y/H = 8.9
        // 180H → 250Y: Y/H = 1.4
        // 230H → 600Y: Y/H = 2.6
        // נראה שיש שיא אי שם באמצע (180H הכי נמוך)
        const yBase = height < 150 ? height * 3.5 + 150 : height * 2.5 + 50;
        // 45 → 157.5+150 = 307.5 (צריך 400)
        // 180 → 450+50 = 500 (צריך 250)
        // 230 → 575+50 = 625 (קרוב ל-600) ✓
        
        // תיקון: הורדת Y באופן אחיד לכל המוצרים
        const yFinal = height < 150 ? height * 1.5 + 150 : height * 2 + 50;
        // 45 → 67.5+150 = 217.5 (נמוך הרבה יותר!)
        // 180 → 360+50 = 410
        // 230 → 460+50 = 510 (נמוך יותר מ-600)
        
        // **חישוב Z: המרחק הכללי**
        // הרעיון: מוצרים גדולים צריכים מרחק קטן יחסית, מוצרים קטנים צריכים מרחק גדול יחסית
        const maxDim = Math.max(width, height);
        // 220 → 450: Z/max = 2.05
        // 230 → 700: Z/max = 3.04
        // 300 → 700: Z/max = 2.33
        // 600 → 550: Z/max = 0.92
        const zFinal = maxDim < 300 ? maxDim * 2.5 + 50 : maxDim * 1.2 + 340;
        // 220 → 550+50 = 600 (צריך 450)
        // 230 → 575+50 = 625 (קרוב ל-700) ✓
        // 300 → 360+340 = 700 ✓
        // 600 → 720+340 = 1060 (רחוק מ-550)
        
        // תיקון: מוצרים קטנים צריכים Z קטן יותר (קרוב יותר!)
        const zCorrected = maxDim < 300 ? maxDim * 1.8 + 50 : (maxDim < 400 ? maxDim * 2 + 100 : maxDim * 0.85 + 40);
        // 220 → 396+50 = 446 (קרוב ל-450) ✓ וקרוב יותר!
        // 230 → 414+50 = 464 (קרוב ל-700 אבל עדיין רחוק...)
        // 300 → 600+100 = 700 ✓
        // 600 → 510+40 = 550 ✓
        
        return { x: xFinal, y: yFinal, z: zCorrected };
    }
    
    // פונקציה משותפת ל-pan למעלה
    private applyCameraPan() {
        const screenHeight = window.innerHeight;
        const panAmount = screenHeight / 2; // חצי מגובה המסך
        const cam = this.camera;
        const pan = new THREE.Vector3();
        pan.addScaledVector(new THREE.Vector3().setFromMatrixColumn(cam.matrix, 1), panAmount * 0.2); // חיובי = למעלה
        cam.position.add(pan);
        this.scene.position.add(pan);
    }
    
    // מרכוז המצלמה עבור מוצר beams עם מידות קבועות
    private centerCameraOnBeams() {
        // איפוס מיקום המצלמה ישירות עם הפונקציה החדשה - עם אנימציה בפתיחת הקומפוננטה
        // קוראים ישירות ל-resetCameraView כדי שהמצלמה תהיה במיקום הנכון לפני שהמשתמש רואה את התלת מימד
        this.resetCameraView(true); // true = עם אנימציה בפתיחת הקומפוננטה
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
        // Simple camera positioning
        this.camera.position.set(width * 0.7, height * 0.8, depth * 1.2);
        this.camera.lookAt(0, 0, 0);
    }
    // יצירת קורות רגליים
    private createLegBeams(
        totalWidth: number,
        totalLength: number,
        frameWidth: number,
        frameHeight: number,
        topHeight: number,
        shelfBeamHeightParam: number = 0
    ): {
        x: number;
        y: number;
        z: number;
        width: number;
        height: number;
        depth: number;
    }[] {
        // קבלת מידות קורות הרגליים מהפרמטרים
        const legParam = this.getParam('leg');
        let legWidth = frameWidth;
        let legHeight = topHeight;
        let legDepth = frameWidth;
        if (
            legParam &&
            Array.isArray(legParam.beams) &&
            legParam.beams.length
        ) {
            const legBeam = legParam.beams[legParam.selectedBeamIndex || 0];
            if (legBeam) {
                legWidth = legBeam.width / 10; // המרה ממ"מ לס"מ
                legDepth = legBeam.height / 10; // המרה ממ"מ לס"מ
            }
        }
        // קבלת עובי קורות המדפים כדי לקצר את הרגליים
        // אם shelfBeamHeightParam מועבר, נשתמש בו (לארון)
        // אחרת נחשב אותו (לשולחן)
        let shelfBeamHeight = shelfBeamHeightParam || this.beamHeight;
        
        if (shelfBeamHeightParam === 0) {
            // עבור שולחן, נחשב את shelfBeamHeight
        let shelfsParam = null;
        if (this.isTable) {
            // עבור שולחן, נשתמש בפרמטר plata במקום shelfs
            shelfsParam = this.product?.params?.find(
                (p: any) => p.type === 'beamSingle' && p.name === 'plata'
            );
        } else {
            // עבור ארון, נשתמש בפרמטר shelfs
            shelfsParam = this.getParam('shelfs');
        }
            
        if (
            shelfsParam &&
            Array.isArray(shelfsParam.beams) &&
            shelfsParam.beams.length
        ) {
            const shelfBeam =
                shelfsParam.beams[shelfsParam.selectedBeamIndex || 0];
            if (shelfBeam) {
                this.debugLog(
                    'DEBUG - shelfBeam.height (raw):',
                    shelfBeam.height
                );
                this.debugLog(
                    'DEBUG - shelfBeam.height / 10:',
                    shelfBeam.height / 10
                );
                shelfBeamHeight = shelfBeam.height / 10; // המרה ממ"מ לס"מ
                this.debugLog(
                    'DEBUG - shelfBeamHeight (final):',
                    shelfBeamHeight
                );
            }
        }
        }
        // עבור שולחן, הרגליים צריכות להיות בגובה המלא של השולחן פחות עובי הפלטה
        // המיקום שלהן ייקבע בקוד הראשי בהתבסס על גובה הפלטה
        this.debugLog('DEBUG - topHeight:', topHeight);
        this.debugLog('DEBUG - shelfBeamHeightParam:', shelfBeamHeightParam);
        legHeight = topHeight - shelfBeamHeight; // הרגל צריכה להיות בגובה המלא של השולחן פחות עובי הפלטה
        this.debugLog(
            'DEBUG - legHeight calculation:',
            topHeight - shelfBeamHeight,
            '(table height minus plata beam height)'
        );
        
        // לוגים לארון בלבד
        if (!this.isTable) {
            this.logCabinet('CHACK_CABINET - createLegBeams calculation:', {
                topHeight: topHeight,
                shelfBeamHeightParam: shelfBeamHeightParam,
                shelfBeamHeight: shelfBeamHeight,
                legHeight: legHeight,
                calculation: `${topHeight} - ${shelfBeamHeight} = ${legHeight}`
            });
        }
        // 4 פינות - מיקום צמוד לקצה בהתאם לעובי הרגל בפועל
        const xVals = [
            -totalWidth / 2 + legWidth / 2, // פינה שמאלית - צמודה לקצה
            totalWidth / 2 - legWidth / 2, // פינה ימנית - צמודה לקצה
        ];
        const zVals = [
            -totalLength / 2 + legDepth / 2, // פינה אחורית - צמודה לקצה
            totalLength / 2 - legDepth / 2, // פינה קדמית - צמודה לקצה
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
                    depth: legDepth,
                });
            }
        }
        return legs;
    }
    // הוספת ברגים לקורות החיזוק התחתונות של שולחן (8 ברגים - 2 לכל רגל)
    private addScrewsToLowerFrameBeams(
        legPositions: any[],
        frameY: number,
        frameBeamHeight: number,
        skipYFacingScrews: boolean = false
    ) {
        this.debugLog('=== Adding screws to lower frame beams for table ===');
        this.debugLog('frameY (screw height):', frameY);
        this.debugLog('Number of legs:', legPositions.length);
        
        // קבלת מידות הרגל לחישוב אורך הבורג
        const legParam = this.getParam('leg');
        let legBeamWidth = frameBeamHeight;
        let legBeamHeight = frameBeamHeight;
        if (legParam && legParam.beams && legParam.beams.length > 0) {
            const selectedBeam = legParam.beams[legParam.selectedBeamIndex || 0];
            // המידות נמצאות ישירות ב-selectedBeam, לא ב-types
            if (selectedBeam) {
                legBeamWidth = selectedBeam.width / 10;
                legBeamHeight = selectedBeam.height / 10;
                this.debugLog(`📏 Lower frame - Leg beam dimensions: width=${legBeamWidth}, height=${legBeamHeight}`);
            }
        }
        
        // DUBBLE_LEG_SCREWS - Check if we need to duplicate screws for lower frame beams
        const dubbleThreshold = this.product?.restrictions?.find((r: any) => r.name === 'dubble-leg-screws-threshold')?.val;
        const shouldDuplicateScrews = dubbleThreshold && frameBeamHeight > dubbleThreshold;
        
        legPositions.forEach((leg, legIndex) => {
            const isEven = legIndex % 2 === 0;
            
            // 2 ברגים לכל רגל - אחד מכל צד חיצוני סמוך
            const screwPositions = [
                // בורג קדמי/אחורי (בציר Z)
                {
                    x: leg.x, // מרכז רוחב הרגל
                    y: frameY, // מרכז קורת החיזוק התחתונה
                    z: isEven
                        ? leg.z - (leg.depth / 2 + this.headHeight)
                        : leg.z + (leg.depth / 2 + this.headHeight), // צד חיצוני של הרגל
                },
                // בורג ימני/שמאלי (בציר X)
                {
                    x: leg.x + (leg.width / 2 + this.headHeight) * (legIndex > 1 ? 1 : -1), // צד חיצוני של הרגל
                    y: frameY, // מרכז קורת החיזוק התחתונה
                    z: (isEven
                        ? leg.z - (leg.depth / 2 + this.headHeight)
                        : leg.z + (leg.depth / 2 + this.headHeight)) +
                    (isEven ? 1 : -1) * (leg.depth / 2 + this.headHeight),
                },
            ];
            
            screwPositions.forEach((pos, screwIndex) => {
                // Skip Y-facing screws (screwIndex=1) if skipYFacingScrews is true
                if (skipYFacingScrews && screwIndex === 1) {
                    console.log(`CHECK_REMOVE_LEG_SCREWS_OUTSIDE - Skipping Y-facing screw (screwIndex=${screwIndex}) for lower frame beam, leg ${legIndex + 1}`);
                    return; // Skip this screw
                }
                // בורג 0 = מבוסס height (depth), בורג 1 = מבוסס width
                const screwType = screwIndex === 0 ? 'leg_height' : 'leg_width';
                // מעביר גם את שתי המידות כדי לבחור את המקסימום + 3
                const calculatedScrewLength = this.calculateScrewLength(
                    screwType, 
                    screwIndex === 0 ? legBeamHeight : legBeamWidth,
                    screwIndex === 0 ? legBeamWidth : legBeamHeight
                );
                
                // DUBBLE_LEG_SCREWS - Create screws based on condition for lower frame beams
                if (shouldDuplicateScrews) {
                    // Screw moved up by 25% of frameBeamHeight
                    const upOffset = frameBeamHeight * 0.25;
                    const upScrewGroup = this.createHorizontalScrewGeometry(calculatedScrewLength);
                    upScrewGroup.position.set(pos.x, pos.y + upOffset, pos.z);
                    if (screwIndex === 0) {
                        upScrewGroup.rotation.y = (Math.PI / 2) * (isEven ? 1 : -1);
                    } else {
                        upScrewGroup.rotation.y = legIndex > 1 ? 0 : Math.PI;
                    }
                    this.scene.add(upScrewGroup);
                    this.beamMeshes.push(upScrewGroup);
                    this.debugLog(
                        `Lower Frame - Leg ${legIndex + 1}, Screw ${screwIndex + 1} UP: x=${pos.x.toFixed(1)}, y=${(pos.y + upOffset).toFixed(1)}, z=${pos.z.toFixed(1)}`
                    );
                    
                    // Screw duplicated down by 25% of frameBeamHeight
                    const downOffset = frameBeamHeight * 0.25;
                    const downScrewGroup = this.createHorizontalScrewGeometry(calculatedScrewLength);
                    downScrewGroup.position.set(pos.x, pos.y - downOffset, pos.z);
                    if (screwIndex === 0) {
                        downScrewGroup.rotation.y = (Math.PI / 2) * (isEven ? 1 : -1);
                    } else {
                        downScrewGroup.rotation.y = legIndex > 1 ? 0 : Math.PI;
                    }
                    this.scene.add(downScrewGroup);
                    this.beamMeshes.push(downScrewGroup);
                    this.debugLog(
                        `Lower Frame - Leg ${legIndex + 1}, Screw ${screwIndex + 1} DOWN: x=${pos.x.toFixed(1)}, y=${(pos.y - downOffset).toFixed(1)}, z=${pos.z.toFixed(1)}`
                    );
                } else {
                    // Create original screw only if not duplicating
                    const screwGroup = this.createHorizontalScrewGeometry(calculatedScrewLength);
                    
                    // הברגים אופקיים ומיושרים כמו ברגי הרגליים הרגילים
                    screwGroup.position.set(pos.x, pos.y, pos.z);
                    if (screwIndex === 0) {
                        screwGroup.rotation.y = (Math.PI / 2) * (isEven ? 1 : -1);
                    } else {
                        screwGroup.rotation.y = legIndex > 1 ? 0 : Math.PI;
                    }
                    
                    this.scene.add(screwGroup);
                    this.beamMeshes.push(screwGroup);
                    
                    this.debugLog(
                        `Lower Frame - Leg ${legIndex + 1}, Screw ${screwIndex + 1}: x=${pos.x.toFixed(1)}, y=${pos.y.toFixed(1)}, z=${pos.z.toFixed(1)}`
                    );
                }
            });
        });
    }
    
    // הוספת ברגים לרגליים
    private addScrewsToLegs(
        totalShelves: number,
        legPositions: any[],
        frameBeamHeight: number,
        shelfY: number,
        skipYFacingScrews: boolean = false
    ) {
        this.debugLog(
            'Adding screws to legs:',
            this.isTable ? 'table' : this.shelves
        );

        const outsideParam = this.getParam('is-reinforcement-beams-outside');
        const rawOutsideValue = outsideParam?.default;
        const isExternalReinforcementEnabled =
            typeof rawOutsideValue === 'number'
                ? rawOutsideValue > 0
                : rawOutsideValue === true;

        const isPreliminaryDrills = this.isPreliminaryDrillsMode();
        const firstUncheckedCompositeKey = isPreliminaryDrills ? this.getFirstUncheckedBeamParamName() : null;
        const isPreliminaryDrillsLegStage = !!(isPreliminaryDrills && firstUncheckedCompositeKey && firstUncheckedCompositeKey.startsWith('leg'));
        const currentLegDrillInfo = isPreliminaryDrillsLegStage
            ? this.preliminaryDrillsInfo.find((info) => info.compositeKey === firstUncheckedCompositeKey)
            : null;
        const legDrillDiameterMm = currentLegDrillInfo && typeof currentLegDrillInfo.drillDiameter === 'number'
            ? currentLegDrillInfo.drillDiameter
            : null;
        const preliminaryLegRadius =
            legDrillDiameterMm && legDrillDiameterMm > 0
                ? Math.max(0.05, (legDrillDiameterMm / 10) / 2) // המרה למ״מ→ס״מ וחלוקה לרדיוס
                : this.screwRadius * 0.85;
        const reinforcementDirectionForStage =
            isPreliminaryDrillsLegStage && firstUncheckedCompositeKey
                ? firstUncheckedCompositeKey.includes('x-spanning')
                    ? 'x-spanning'
                    : firstUncheckedCompositeKey.includes('z-spanning')
                        ? 'z-spanning'
                        : null
                : null;
        // לכל מדף, נוסיף ברגים לרגליים
        for (let shelfIndex = 0; shelfIndex < totalShelves; shelfIndex++) {
            let currentShelfY;
            if (this.isTable) {
                // עבור שולחן, הברגים צריכים להיות בגובה הרגליים פחות חצי ממידת הרוחב של קורת החיזוק
                const legParam = this.getParam('leg');
                let legWidth = frameBeamHeight; // ברירת מחדל
                if (
                    legParam &&
                    Array.isArray(legParam.beams) &&
                    legParam.beams.length
                ) {
                    const legBeam =
                        legParam.beams[legParam.selectedBeamIndex || 0];
                    if (legBeam) {
                        legWidth = legBeam.width / 10; // המרה ממ"מ לס"מ
                    }
                }
                const plataParam = this.getParam('plata');
                let plataBeamHeight = this.beamHeight; // ברירת מחדל
                if (
                    plataParam &&
                    Array.isArray(plataParam.beams) &&
                    plataParam.beams.length
                ) {
                    const plataBeam =
                        plataParam.beams[plataParam.selectedBeamIndex || 0];
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
                if (
                    frameParam &&
                    Array.isArray(frameParam.beams) &&
                    frameParam.beams.length
                ) {
                    const frameBeam =
                        frameParam.beams[frameParam.selectedBeamIndex || 0];
                    if (frameBeam) {
                        calculatedFrameBeamHeight = frameBeam.width / 10; // המרה ממ"מ לס"מ
                    }
                }
                // גובה הרגליים בפועל (לא גובה השולחן)
                const actualLegHeight = legPositions[0]
                    ? legPositions[0].height
                    : 0;
                // אותו חישוב כמו הברגים התחתונים, רק בלי totalDistance
                currentShelfY = tableHeight - calculatedFrameBeamHeight / 2; // גובה מרכז קורות החיזוק העליונות
                this.debugLog(
                    '=====================',
                    actualLegHeight,
                    legWidth,
                    plataBeamHeight
                );
                this.debugLog('Table screw calculation:', {
                    actualLegHeight,
                    legWidth,
                    currentShelfY,
                });
                this.debugLog(
                    'Previous calculation would be:',
                    actualLegHeight - legWidth / 2,
                    'New calculation:',
                    currentShelfY
                );
                this.debugLog('Leg positions for calculation:', legPositions[0]);
                // הוספת גובה קורות הפלטה
            } else {
                // עבור ארון, חישוב נכון של הגובה
                // קריאת גובה קורת המדף מהפרמטרים
                let beamHeightCorrect = this.beamHeight; // ברירת מחדל
                const shelfsParam = this.getParam('shelfs');
                if (shelfsParam && Array.isArray(shelfsParam.beams) && shelfsParam.beams.length) {
                    const shelfBeam = shelfsParam.beams[shelfsParam.selectedBeamIndex || 0];
                    if (shelfBeam) {
                        beamHeightCorrect = shelfBeam.height / 10; // המרה ממ"מ לס"מ
                    }
                }
                
                // חישוב הקפיצה בין שכבה לשכבה
                // הקפיצה = שלב המדף (shelfGap) + רוחב קורת הרגל (frameBeamHeight) + גובה קורת המדף (beamHeightCorrect)
                let cumulativeY = 0;
                for (let i = 0; i <= shelfIndex; i++) {
                    const shelf = this.shelves[i];
                    cumulativeY += shelf.gap;
                    if (i < shelfIndex) {
                        cumulativeY += frameBeamHeight + beamHeightCorrect;
                    }
                }
                
                // הברגים צריכים להיות במרכז קורת החיזוק
                currentShelfY = cumulativeY + frameBeamHeight / 2;
                
            }
            legPositions.forEach((leg, legIndex) => {
                const isEven = legIndex % 2 === 0;
                
                // חישוב אורכי ברגים - בורג ראשון מבוסס depth (height), בורג שני מבוסס width
                const legParam = this.getParam('leg');
                let legBeamWidth = frameBeamHeight;
                let legBeamHeight = frameBeamHeight;
                if (legParam && legParam.beams && legParam.beams.length > 0) {
                    const selectedBeam = legParam.beams[legParam.selectedBeamIndex || 0];
                    // המידות נמצאות ישירות ב-selectedBeam, לא ב-types
                    if (selectedBeam) {
                        legBeamWidth = selectedBeam.width / 10;
                        legBeamHeight = selectedBeam.height / 10;
                        this.debugLog(`📏 Leg beam dimensions: width=${legBeamWidth}, height=${legBeamHeight}`);
                    }
                }
                
                // 2 ברגים לכל רגל (אחד לכל קורת חיזוק - קדמית ואחורית)
                const screwPositions = [
                    // בורג לקורת חיזוק קדמית
                    {
                        x: leg.x, // מרכז רוחב הרגל
                        y: currentShelfY, // מרכז קורת החיזוק
                        z: isEven
                            ? leg.z - (leg.depth / 2 + (isPreliminaryDrillsLegStage ? 0 : this.headHeight))
                            : leg.z + (leg.depth / 2 + (isPreliminaryDrillsLegStage ? 0 : this.headHeight)), // צד חיצוני של הרגל (קדמי)
                    },
                    {
                        x:
                            leg.x +
                            (leg.width / 2 + (isPreliminaryDrillsLegStage ? 0 : this.headHeight)) *
                                (legIndex > 1 ? 1 : -1), // מרכז רוחב הרגל
                        y: currentShelfY, // מרכז קורת החיזוק
                        z:
                            (isEven
                                ? leg.z - (leg.depth / 2 + (isPreliminaryDrillsLegStage ? 0 : this.headHeight))
                                : leg.z + (leg.depth / 2 + (isPreliminaryDrillsLegStage ? 0 : this.headHeight))) +
                            (isEven ? 1 : -1) *
                                (leg.depth / 2 + (isPreliminaryDrillsLegStage ? 0 : this.headHeight)), // צד חיצוני של הרגל (קדמי)
                    },
                ];

                const shouldOffsetForExternalInstructions =
                    this.isInstructionMode && isPreliminaryDrillsLegStage && isExternalReinforcementEnabled;

                if (shouldOffsetForExternalInstructions) {
                    const legProfileHeightCm = legBeamHeight;
                    if (legProfileHeightCm > 0) {
                        const dirZ = leg.z >= 0 ? 1 : -1;
                        screwPositions.forEach((position) => {
                            position.z -= dirZ * legProfileHeightCm;
                        });
                    }
                }
                if (
                    shouldOffsetForExternalInstructions &&
                    reinforcementDirectionForStage &&
                    (reinforcementDirectionForStage === 'x-spanning'
                        ? leg.depth
                        : leg.width) > 0
                ) {
                    const reinforcementOffsetCm =
                        reinforcementDirectionForStage === 'x-spanning'
                            ? leg.depth
                            : leg.width;

                    screwPositions.forEach((position) => {
                        const deltaX = position.x - leg.x;
                        const deltaZ = position.z - leg.z;
                        const dominantAxis = Math.abs(deltaZ) >= Math.abs(deltaX) ? 'z' : 'x';

                        if (reinforcementDirectionForStage === 'x-spanning' && dominantAxis === 'z') {
                            const dir = position.z >= 0 ? 1 : -1;
                            position.z += dir * reinforcementOffsetCm;
                        } else if (reinforcementDirectionForStage === 'z-spanning' && dominantAxis === 'x') {
                            const dir = position.x >= 0 ? 1 : -1;
                            position.x += dir * reinforcementOffsetCm;
                        }
                    });
                }
                // DUBBLE_LEG_SCREWS - Check if we need to duplicate screws
                const dubbleThreshold = this.product?.restrictions?.find((r: any) => r.name === 'dubble-leg-screws-threshold')?.val;
                const shouldDuplicateScrews = dubbleThreshold && frameBeamHeight > dubbleThreshold;
                
                screwPositions.forEach((pos, screwIndex) => {
                    // Skip Y-facing screws (screwIndex=1) if skipYFacingScrews is true
                    if (skipYFacingScrews && screwIndex === 1) {
                        console.log(`CHECK_REMOVE_LEG_SCREWS_OUTSIDE - Skipping Y-facing screw (screwIndex=${screwIndex}) for leg ${legIndex + 1}, shelf ${shelfIndex + 1}`);
                        return; // Skip this screw
                    }
                    
                    // בדיקה אם אנחנו במצב preliminary-drills
                    const isPreliminaryDrillsLeg = isPreliminaryDrillsLegStage;
                    
                    // בורג 0 = מבוסס height (depth), בורג 1 = מבוסס width
                    const screwType = screwIndex === 0 ? 'leg_height' : 'leg_width';
                    
                    // חישוב אורך הבורג - במצב preliminary-drills לפי הלוגיקה החדשה, אחרת לפי הלוגיקה הרגילה
                    const calculatedScrewLength = isPreliminaryDrillsLeg
                        ? this.calculatePreliminaryDrillScrewLength(
                            screwType,
                            screwIndex === 0 ? legBeamHeight : legBeamWidth,
                            screwIndex === 0 ? legBeamWidth : legBeamHeight,
                            screwIndex
                          )
                        : this.calculateScrewLength(
                            screwType,
                            screwIndex === 0 ? legBeamHeight : legBeamWidth,
                            screwIndex === 0 ? legBeamWidth : legBeamHeight
                          );

                    let adjustedScrewLength = calculatedScrewLength;
                    if (isPreliminaryDrillsLeg) {
                        const legThickness = screwIndex === 0 ? leg.depth : leg.width;
                        const maxAllowedLength = Math.max(0.2, legThickness - 0.1);
                        adjustedScrewLength = Math.min(calculatedScrewLength, maxAllowedLength);
                    }
                    
                    // במצב preliminary-drills - ברגים ללא ראש (כמו חורים)
                    const showHead = !isPreliminaryDrillsLeg;
                    const radiusOverride = isPreliminaryDrillsLeg ? preliminaryLegRadius : undefined;
                    
                    // DUBBLE_LEG_SCREWS - Create screws based on condition
                    if (shouldDuplicateScrews) {
                        // Screw moved up by 25% of frameBeamHeight
                        const upOffset = frameBeamHeight * 0.25;
                        const upScrewGroup = this.createHorizontalScrewGeometry(adjustedScrewLength, showHead, radiusOverride);
                        upScrewGroup.position.set(pos.x, pos.y + upOffset, pos.z);
                        if (screwIndex === 0) {
                            upScrewGroup.rotation.y = (Math.PI / 2) * (isEven ? 1 : -1);
                        } else {
                            upScrewGroup.rotation.y = legIndex > 1 ? 0 : Math.PI;
                        }
                        this.scene.add(upScrewGroup);
                        this.beamMeshes.push(upScrewGroup);
                        this.debugLog(
                            `Leg ${legIndex + 1}, Shelf ${shelfIndex + 1}, Screw ${screwIndex + 1} UP: x=${pos.x.toFixed(1)}, y=${(pos.y + upOffset).toFixed(1)}, z=${pos.z.toFixed(1)}`
                        );
                        
                        // Screw duplicated down by 25% of frameBeamHeight
                        const downOffset = frameBeamHeight * 0.25;
                        const downScrewGroup = this.createHorizontalScrewGeometry(adjustedScrewLength, showHead, radiusOverride);
                        downScrewGroup.position.set(pos.x, pos.y - downOffset, pos.z);
                        if (screwIndex === 0) {
                            downScrewGroup.rotation.y = (Math.PI / 2) * (isEven ? 1 : -1);
                        } else {
                            downScrewGroup.rotation.y = legIndex > 1 ? 0 : Math.PI;
                        }
                        this.scene.add(downScrewGroup);
                        this.beamMeshes.push(downScrewGroup);
                        this.debugLog(
                            `Leg ${legIndex + 1}, Shelf ${shelfIndex + 1}, Screw ${screwIndex + 1} DOWN: x=${pos.x.toFixed(1)}, y=${(pos.y - downOffset).toFixed(1)}, z=${pos.z.toFixed(1)}`
                        );
                    } else {
                        // Create original screw only if not duplicating
                    const screwGroup = this.createHorizontalScrewGeometry(adjustedScrewLength, showHead, radiusOverride);
                    screwGroup.position.set(pos.x, pos.y, pos.z);
                    if (screwIndex === 0) {
                            screwGroup.rotation.y = (Math.PI / 2) * (isEven ? 1 : -1);
                    } else {
                        screwGroup.rotation.y = legIndex > 1 ? 0 : Math.PI;
                    }
                    this.scene.add(screwGroup);
                    this.beamMeshes.push(screwGroup);
                    this.debugLog(
                        `Leg ${legIndex + 1}, Shelf ${shelfIndex + 1}, Screw ${screwIndex + 1}: x=${pos.x.toFixed(1)}, y=${pos.y.toFixed(1)}, z=${pos.z.toFixed(1)}`
                    );
                    }
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
                if (i < shelfIndex) {
                    // לא המדף הנוכחי - מוסיפים את הגובה של המדף הקודם
                    currentY += this.frameHeight + this.beamHeight;
                }
            }
            // עבור המדף הנוכחי, הברגים צריכים להיות במרכז קורת החיזוק
            // קורת החיזוק נמצאת בגובה: currentY + frameHeight/2
            const result = currentY + this.frameHeight / 2;
            
            this.logCabinet('CHACK_CABINET - getShelfHeight calculation:', {
                shelfIndex: shelfIndex,
                currentY: currentY,
                frameHeight: this.frameHeight,
                beamHeight: this.beamHeight,
                result: result,
                calculation: `${currentY} + ${this.frameHeight}/2 = ${result}`,
                shelfGap: this.shelves[shelfIndex]?.gap,
                expectedY: shelfIndex === 0 ? this.shelves[0].gap : 
                          shelfIndex === 1 ? this.shelves[0].gap + this.frameHeight + this.beamHeight + this.shelves[1].gap :
                          this.shelves[0].gap + this.frameHeight + this.beamHeight + this.shelves[1].gap + this.frameHeight + this.beamHeight + this.shelves[2].gap
            });
            
            return result;
        }
    }
    // פרמטרים של הבורג (מידות אמיתיות)
    screwLength: number = 4.0; // 40 מ"מ = 4 ס"מ
    screwRadius: number = 0.1; // 1 מ"מ = 0.1 ס"מ (רדיוס הבורג)
    headHeight: number = 0.2; // 2 מ"מ = 0.2 ס"מ (גובה הראש)
    headRadius: number = 0.3; // 3 מ"מ = 0.3 ס"מ (רדיוס הראש)
    
    // יצירת גיאומטריית חור (צילינדר שחור)
    private createHoleGeometry(holeLength: number, holeRadius?: number): THREE.Mesh {
        const actualHoleRadius = holeRadius || this.screwRadius;
        const holeGeometry = new THREE.CylinderGeometry(
            actualHoleRadius,
            actualHoleRadius,
            holeLength,
            8
        );
        const holeMaterial = new THREE.MeshStandardMaterial({
            color: 0x000000, // שחור
            side: THREE.DoubleSide
        });
        const holeMesh = new THREE.Mesh(holeGeometry, holeMaterial);
        return holeMesh;
    }
    
    // יצירת חור אופקי (להרגליים)
    private createHorizontalHoleGeometry(holeLength: number, holeRadius?: number): THREE.Mesh {
        const holeMesh = this.createHoleGeometry(holeLength, holeRadius);
        holeMesh.rotation.z = Math.PI / 2; // סיבוב לרוחב
        holeMesh.position.x = -holeLength / 2; // מרכז את החור
        return holeMesh;
    }
    
    // יצירת חור אנכי (למדפים)
    private createVerticalHoleGeometry(holeLength: number, holeRadius?: number): THREE.Mesh {
        const holeMesh = this.createHoleGeometry(holeLength, holeRadius);
        holeMesh.position.y = -holeLength / 2; // מרכז את החור
        return holeMesh;
    }
    
    // מניעת לוגים חוזרים
    private lastDimensionsLogTime: number = 0;
    private lastCabinetLogTime: number = 0;
    
    // פונקציה עזר ללוגים עם מניעת חזרות
    private logDimensions(message: string, data?: any): void {
        const now = Date.now();
        if (!this.lastDimensionsLogTime || now - this.lastDimensionsLogTime > 1000) {
            if (data) {
            } else {
            }
        }
    }
    
    // פונקציה עזר ללוגים של הארון עם מניעת חזרות
    private logCabinet(message: string, data?: any): void {
        const now = Date.now();
        if (!this.lastCabinetLogTime || now - this.lastCabinetLogTime > 2000) { // כל 2 שניות
            this.lastCabinetLogTime = now;
            if (data) {
            } else {
            }
        }
    }
    // חישוב מידות המוצר הגולמיות (ללא פורמטינג)
    getProductDimensionsRaw(): {
        length: number;
        width: number;
        height: number;
        beamCount: number;
        gapBetweenBeams: number;
        shelfCount: number;
        shelfHeights: number[];
        totalScrews: number;
    } {
        // מניעת לוגים חוזרים - רק אם זה לא נקרא לאחרונה
        const now = Date.now();
        if (!this.lastDimensionsLogTime || now - this.lastDimensionsLogTime > 1000) { // רק כל שנייה
            this.lastDimensionsLogTime = now;
        }
        
        this.logDimensions('CHACK_DIM CALCULATION - Starting getProductDimensionsRaw');
        this.logDimensions('CHACK_DIM CALCULATION - Product type flags:', {
            isBelams: this.isBelams,
            isTable: this.isTable,
            isPlanter: this.isPlanter,
            isBox: this.isBox,
            isFuton: this.isFuton,
            productName: this.product?.name || 'Unknown'
        });
        
        // טיפול במוצר קורות לפי מידה
        if (this.isBelams) {
            this.logDimensions('CHACK_DIM CALCULATION - Processing BELAMS product');
            const belamsDimensions = this.getBelamsDimensionsRaw();
            this.logDimensions('CHACK_DIM CALCULATION - BELAMS dimensions result:', belamsDimensions);
            return belamsDimensions;
        }

        // רוחב כולל
        let totalWidth = this.surfaceWidth;
        // חישוב אורך כולל (totalLength) לפי סוג המוצר הנוכחי
        // נבנה totalLength בדומה ללוגיקה בהמשך הפונקציה כדי להדפיס לוג מדויק
        let totalLengthForLog = this.surfaceLength;
        try {
            // אם קיימת פונקציה או נתונים מחושבים לאחר מכן, ננסה לשמר התאמה
            // כברירת מחדל משתמשים ב-surfaceLength שנגזר מהפרמטרים המעודכנים
            if ((this as any).__emitReinforcementLogs && (this as any).__emitReinforcementLogs.emitLogs) {
                (this as any).__emitReinforcementLogs.emitLogs(totalLengthForLog);
            }
        } catch {}
        
        // CHACK_is-reinforcement-beams-outside - לוגים נדרשים עבור קורות רגל וקורות חיזוק
        try {
            const productName = this.product?.name || '';
            const isCabinet = productName === 'cabinet';
            const isTable = productName === 'table';
            
            // נתוני קורת רגל (a,b)
            let legWidthCm = 0;
            let legHeightCm = 0;
            const legParam = this.getParam ? this.getParam('leg') : this.product?.params?.find((p: any) => p.name === 'leg');
            if (legParam && Array.isArray(legParam.beams) && legParam.beams.length) {
                // ודא שיש selectedBeamIndex תקף; אם אין, נבחר ברירת מחדל יציבה
                let legBeamIdx: number;
                if (typeof legParam.selectedBeamIndex === 'number') {
                    legBeamIdx = legParam.selectedBeamIndex;
                } else if (typeof (this as any).findDefaultBeamIndex === 'function') {
                    try {
                        legBeamIdx = (this as any).findDefaultBeamIndex(legParam.beams, legParam.defaultType);
                    } catch {
                        legBeamIdx = 0;
                    }
                } else {
                    legBeamIdx = 0;
                }
                // אם אין מימדים על הבחירה, חפש קורה ראשונה עם width/height
                let legBeam = legParam.beams[legBeamIdx];
                if (!legBeam || (!legBeam.width && !legBeam.height)) {
                    const found = legParam.beams.find((b: any) => (b?.width || 0) > 0 && (b?.height || 0) > 0);
                    if (found) {
                        legBeam = found;
                    }
                }
                if (legBeam) {
                    legWidthCm = (legBeam.width || 0) / 10;
                    legHeightCm = (legBeam.height || 0) / 10;
                }
            }
            
            // נחשב גם את האורך הכולל (c) לאחר שמתקבל totalLength בהמשך
            const emitLogs = (totalLen: number) => {
                if (this.reinforcementLogPrinted) { return; }
                const title = 'CHACK_is-reinforcement-beams-outside';
                const product = isCabinet ? 'ארון' : (isTable ? 'שולחן' : (this.product?.translatedName || productName));
                // A - קורות רגל
                console.log(`${title} - A`, JSON.stringify({
                    product,
                    stage: 'A',
                    a_legProfileWidthCm: legWidthCm,
                    b_legProfileHeightCm: legHeightCm
                }, null, 2));
                // B - קורות חיזוק לרוחב; c - אורך קורת חיזוק לאורך המשטח
                console.log(`${title} - B`, JSON.stringify({
                    product,
                    stage: 'B',
                    c_reinforcementAlongLength_cm: totalLen
                }, null, 2));
                this.reinforcementLogPrinted = true;
            };
            // נשמור לפונקציה מקומית לשימוש בהמשך כשנחשב totalLength
            (this as any).__emitReinforcementLogs = { emitLogs, legWidthCm, legHeightCm };
        } catch {}
        // אורך כולל
        let totalLength = this.surfaceLength;
        // גובה כולל
        let totalHeight = 0;
        
        this.logDimensions('CHACK_DIM CALCULATION - Initial dimensions:', {
            surfaceWidth: this.surfaceWidth,
            surfaceLength: this.surfaceLength,
            totalWidth: totalWidth,
            totalLength: totalLength
        });
        
        if (this.isTable) {
            this.logDimensions('CHACK_DIM CALCULATION - Processing TABLE product');
            // עבור שולחן - הגובה הוא פשוט הפרמטר "גובה משטח" (כי כבר הורדנו את גובה קורות הפלטה)
            const heightParam = this.getParam('height');
            totalHeight = heightParam ? heightParam.default : 80; // ברירת מחדל 80 ס"מ
            
            this.logDimensions('CHACK_DIM CALCULATION - TABLE height calculation:', {
                heightParam: heightParam,
                heightParamDefault: heightParam?.default,
                totalHeight: totalHeight
            });
        } else if (this.isPlanter || this.isBox) {
            this.logDimensions('CHACK_DIM CALCULATION - Processing PLANTER/BOX product');
            // עבור עדנית - מידות מהפרמטרים
            const heightParam = this.getParam('height');
            const depthParam = this.getParam('depth');
            const widthParam = this.getParam('width');
            
            this.logDimensions('CHACK_DIM CALCULATION - PLANTER/BOX parameters:', {
                heightParam: heightParam,
                depthParam: depthParam,
                widthParam: widthParam,
                heightParamDefault: heightParam?.default,
                depthParamDefault: depthParam?.default,
                widthParamDefault: widthParam?.default
            });
            
            // החלפה בין width ו-depth כמו בתצוגה התלת מימדית
            const planterDepth = widthParam ? widthParam.default : 50;  // depth input -> planterDepth
            const planterWidth = depthParam ? depthParam.default : 40;  // width input -> planterWidth
            const planterHeight = heightParam ? heightParam.default : 50;
            
            this.logDimensions('CHACK_DIM CALCULATION - PLANTER/BOX dimension mapping:', {
                planterDepth: planterDepth,
                planterWidth: planterWidth,
                planterHeight: planterHeight
            });
            
            // חישוב גובה אמיתי לפי כמות הקורות
            const beamParam = this.getParam('beam');
            let beamWidth = 10; // ברירת מחדל
            if (beamParam && beamParam.beams && beamParam.beams.length > 0) {
                const selectedBeam = beamParam.beams[beamParam.selectedBeamIndex || 0];
                if (selectedBeam) {
                    beamWidth = selectedBeam.width / 10; // המרה ממ"מ לס"מ
                }
            }
            const beamsInHeight = Math.floor(planterHeight / beamWidth);
            const actualHeight = beamsInHeight * beamWidth; // גובה אמיתי = כמות קורות * רוחב קורה
            
            this.logDimensions('CHACK_DIM CALCULATION - PLANTER/BOX height calculation:', {
                beamParam: beamParam,
                beamWidth: beamWidth,
                planterHeight: planterHeight,
                beamsInHeight: beamsInHeight,
                actualHeight: actualHeight
            });
            
            // חישוב גובה הקורה לרצפה
            let beamHeight = 2.5; // ברירת מחדל
            if (beamParam && beamParam.beams && beamParam.beams.length > 0) {
                const selectedBeam = beamParam.beams[beamParam.selectedBeamIndex || 0];
                if (selectedBeam) {
                    beamHeight = selectedBeam.height / 10; // המרה ממ"מ לס"מ
                }
            }
            
            totalWidth = planterDepth;  // תיקון: planterDepth -> totalWidth
            totalLength = planterWidth; // תיקון: planterWidth -> totalLength
            
            // אם יש מכסה, הגובה הכולל צריך לכלול גם את עובי רצפת המכסה
            const isCoverParam = this.getParam('isCover');
            const hasCover = this.isBox && isCoverParam && isCoverParam.default === true;
            
            totalHeight = actualHeight + beamHeight + (hasCover ? beamHeight : 0); // גובה אמיתי + גובה הריצפה + גובה מכסה (אם יש)
        } else if (this.isFuton) {
            // עבור בסיס מיטה - דומה לשולחן
            const widthParam = this.getParam('width');
            const depthParam = this.getParam('depth');
            const legParam = this.getParam('leg');
            const extraBeamParam = this.getParam('extraBeam');
            
            totalWidth = depthParam ? depthParam.default : 200;  // החלפה: width = depth
            totalLength = widthParam ? widthParam.default : 120;  // החלפה: length = width
            
            // חישוב גובה - רוחב קורת הרגל + גובה קורת הפלטה
            let legBeamWidth = 5; // ברירת מחדל
            let legBeamHeight = 5; // ברירת מחדל
            let plataBeamHeight = 2.5; // ברירת מחדל
            
            if (legParam && legParam.beams && legParam.beams.length > 0) {
                const legBeam = legParam.beams[legParam.selectedBeamIndex || 0];
                if (legBeam) {
                    legBeamWidth = legBeam.width / 10; // המרה ממ"מ לס"מ
                    legBeamHeight = legBeam.height / 10; // המרה ממ"מ לס"מ
                }
            }
            
            const plataParam = this.getParam('plata');
            if (plataParam && plataParam.beams && plataParam.beams.length > 0) {
                const plataBeam = plataParam.beams[plataParam.selectedBeamIndex || 0];
                if (plataBeam) {
                    plataBeamHeight = plataBeam.height / 10; // המרה ממ"מ לס"מ
                }
            }
            
            // חישוב גובה כולל - גובה הרגליים + גובה הפלטה
            totalHeight = legBeamHeight + plataBeamHeight;
            
            this.logDimensions('CHACK_DIM CALCULATION - FUTON height calculation:', {
                legBeamWidth: legBeamWidth,
                legBeamHeight: legBeamHeight,
                plataBeamHeight: plataBeamHeight,
                totalHeight: totalHeight,
                calculation: `${legBeamHeight} + ${plataBeamHeight} = ${totalHeight}`
            });
        } else {
            this.logDimensions('CHACK_DIM CALCULATION - Processing CABINET product');
            // עבור ארון - חישוב זהה לחישוב הרגליים בפונקציה updateBeams
            // חישוב frameBeamHeight - זהה לחישוב בפונקציה updateBeams
            let frameBeamHeight = this.frameHeight;
            const frameParam = this.params.find(
                (p) => p.type === 'beamSingle' && p.name !== 'shelfs'
            );
            
            this.logDimensions('CHACK_DIM CALCULATION - CABINET frame calculation:', {
                frameHeight: this.frameHeight,
                frameParam: frameParam,
                frameBeamHeight: frameBeamHeight
            });
            if (
                frameParam &&
                Array.isArray(frameParam.beams) &&
                frameParam.beams.length
            ) {
                const frameBeam =
                    frameParam.beams[frameParam.selectedBeamIndex || 0];
                if (frameBeam) {
                    // החלפה: width של הפרמטר הופך ל-height של הקורה - זהה לחישוב בפונקציה updateBeams
                    frameBeamHeight = frameBeam.width / 10; // המרה ממ"מ לס"מ
                }
            }
            // חישוב beamHeight האמיתי מקורת המדף שנבחרה
            let beamHeight = this.beamHeight; // ברירת מחדל
            const shelfsParam = this.getParam('shelfs');
            if (
                shelfsParam &&
                Array.isArray(shelfsParam.beams) &&
                shelfsParam.beams.length
            ) {
                const shelfBeam =
                    shelfsParam.beams[shelfsParam.selectedBeamIndex || 0];
                if (shelfBeam) {
                    beamHeight = shelfBeam.height / 10; // המרה ממ"מ לס"מ
                }
            }
            // חישוב totalY לפי הנוסחה: S + ((J + K) * N)
            // S = סכום כל ה-gaps
            // J = frameBeamHeight (גובה קורת החיזוק)
            // K = beamHeight (גובה קורת המדף)
            // N = כמות המדפים
            const S = this.shelves.reduce((sum, shelf) => sum + shelf.gap, 0);
            const J = frameBeamHeight;
            const K = beamHeight;
            const N = this.shelves.length;
            const totalY = S + ((J + K) * N);
            // חישוב shelfBeamHeight - זהה לחישוב בפונקציה createLegBeams
            let shelfBeamHeight = this.beamHeight;
            if (
                shelfsParam &&
                Array.isArray(shelfsParam.beams) &&
                shelfsParam.beams.length
            ) {
                const shelfBeam =
                    shelfsParam.beams[shelfsParam.selectedBeamIndex || 0];
                if (shelfBeam) {
                    shelfBeamHeight = shelfBeam.height / 10; // המרה ממ"מ לס"מ
                }
            }
            // הגובה הכולל = totalY (כי totalY כבר מחושב נכון לפי הנוסחה: S + ((J + K) * N))
            totalHeight = totalY;
            
            this.logCabinet('CHACK_CABINET - getProductDimensionsRaw calculation:', {
                S: S,
                J: J,
                K: K,
                N: N,
                totalY: totalY,
                shelfBeamHeight: shelfBeamHeight,
                totalHeight: totalHeight,
                calculation: `S + ((J + K) * N) = ${S} + ((${J} + ${K}) * ${N}) = ${S} + (${J + K} * ${N}) = ${S} + ${(J + K) * N} = ${totalY}`,
                shelves: this.shelves.map(s => ({ gap: s.gap })),
                frameBeamHeight: frameBeamHeight,
                beamHeight: beamHeight
            });
            
            this.logDimensions('CHACK_DIM CALCULATION - CABINET final height calculation:', {
                totalY: totalY,
                shelfBeamHeight: shelfBeamHeight,
                totalHeight: totalHeight,
                calculation: `${totalY} + ${shelfBeamHeight} = ${totalHeight}`
            });
        }
        // חישוב כמות קורות המדף
        const beamWidth = this.beamWidth;
        const minGap = this.minGap;
        const beamCount = Math.floor(
            (totalWidth + minGap) / (beamWidth + minGap)
        );
        // חישוב רווח בין קורות המדף
        let gapBetweenBeams = 0;
        if (beamCount > 1) {
            // (רוחב כולל - כמות קורות × רוחב קורה) / (כמות קורות - 1)
            gapBetweenBeams =
                (totalWidth - beamCount * beamWidth) / (beamCount - 1);
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
            const isShortenedBeam =
                (i === 0 || i === this.shelves.length - 1) &&
                this.shelves.length > 1;
            const screwsPerBeam = isShortenedBeam ? 2 : 4; // 2 ברגים לקורות מקוצרות, 4 לקורות רגילות
            totalScrews += beamCount * screwsPerBeam;
        }
        // ברגים לרגליים (2 ברגים לכל רגל לכל מדף)
        // REDUCE_LEG_SCREWS_WHEN_OUTSIDE - Reduce leg screws by half when is-reinforcement-beams-outside is true
        const outsideParamForLegScrews = this.getParam('is-reinforcement-beams-outside');
        const isOutsideForLegScrews = !!(outsideParamForLegScrews && outsideParamForLegScrews.default === true);
        const screwsPerLeg = isOutsideForLegScrews ? 1 : 2; // 1 screw per leg when outside=true (only Z-facing), 2 screws per leg when outside=false
        const legScrews = this.shelves.length * 4 * screwsPerLeg; // 4 רגליים × screwsPerLeg ברגים לכל מדף
        totalScrews += legScrews;
        const result = {
            length: totalLength,
            width: totalWidth,
            height: totalHeight,
            beamCount: beamCount,
            gapBetweenBeams: gapBetweenBeams,
            shelfCount: shelfCount,
            shelfHeights: shelfHeights,
            totalScrews: totalScrews,
        };
        
        this.logDimensions('CHACK_DIM CALCULATION - Final result:', {
            result: result,
            productName: this.product?.name || 'Unknown',
            productType: this.product?.model || 'Unknown'
        });
        
        return result;
    }
    // חישוב מידות המוצר הסופי (עם פורמטינג טקסטואלי)
    getProductDimensions(): {
        length: string;
        width: string;
        height: string;
        beamCount: string;
        gapBetweenBeams: string;
        shelfCount: string;
        shelfHeights: string;
        totalScrews: string;
    } {
        const rawDimensions = this.getProductDimensionsRaw();
        // גבהי המדפים (רשימה מופרדת בפסיקים, מלמעלה למטה)
        const shelfHeightsList: string[] = [];
        for (let i = 0; i < rawDimensions.shelfHeights.length; i++) {
            shelfHeightsList.push(
                `${this.formatNumber(rawDimensions.shelfHeights[i])} <small>ס"מ</small>`
            );
        }
        const shelfHeights = shelfHeightsList.join(', ');
        return {
            length: `${this.formatNumber(rawDimensions.length)} <small>ס"מ</small>`,
            width: `${this.formatNumber(rawDimensions.width)} <small>ס"מ</small>`,
            height: `${this.formatNumber(rawDimensions.height)} <small>ס"מ</small>`,
            beamCount: `${rawDimensions.beamCount} <small>קורות</small>`,
            gapBetweenBeams: `${this.formatNumber(rawDimensions.gapBetweenBeams)} <small>ס"מ</small>`,
            shelfCount: `${rawDimensions.shelfCount} <small>מדפים</small>`,
            shelfHeights: shelfHeights,
            totalScrews: `${rawDimensions.totalScrews} <small>ברגים</small>`,
        };
    }
    // פונקציה עזר להצגת מספרים ללא .0 אם הם שלמים
    private formatNumber(value: number): string {
        return value % 1 === 0 ? value.toString() : value.toFixed(1);
    }
    // פונקציה לקביעת יחידות לפי סוג הפרמטר
    getUnitForParameter(param: any): string {
        if (
            param.type === 'length' ||
            param.type === 'width' ||
            param.type === 'height'
        ) {
            return 'ס"מ';
        } else if (param.type === 'gap' || param.type === 'shelfHeight') {
            return 'ס"מ';
        } else if (param.type === 'beamCount') {
            return "יח'";
        } else if (param.type === 'shelfCount') {
            return "יח'";
        } else {
            return 'ס"מ';
        }
    }
    // יצירת גיאומטריית בורג אופקי (להרגליים)
    private createHorizontalScrewGeometry(
        screwLength?: number,
        showHead: boolean = true,
        radiusOverride?: number
    ): THREE.Group {
        const screwGroup = new THREE.Group();
        // פרמטרים של הבורג (מידות אמיתיות)
        // אם לא סופק אורך, נשתמש באורך ברירת המחדל
        const actualScrewLength = screwLength || this.screwLength;
        const screwRadius = radiusOverride || this.screwRadius;
        // יצירת גוף הבורג (צינור צר) - אופקי
        const screwGeometry = new THREE.CylinderGeometry(
            screwRadius,
            screwRadius,
            actualScrewLength,
            8
        );
        const screwMaterial = new THREE.MeshStandardMaterial({
            color: 0x666666,
        }); // אפור מתכתי כהה
        const screwMesh = new THREE.Mesh(screwGeometry, screwMaterial);
        screwMesh.rotation.z = Math.PI / 2; // סיבוב לרוחב
        screwMesh.position.x = -actualScrewLength / 2; // מרכז את הבורג
        screwGroup.add(screwMesh);
        // יצירת ראש הבורג רק אם showHead = true
        if (showHead) {
            const headGeometry = new THREE.CylinderGeometry(
                this.headRadius,
                this.headRadius,
                this.headHeight,
                8
            );
            const headMaterial = new THREE.MeshStandardMaterial({
                color: 0x666666,
            }); // אפור מתכתי כהה (זהה לבורג)
            const headMesh = new THREE.Mesh(headGeometry, headMaterial);
            headMesh.rotation.z = Math.PI / 2; // סיבוב לרוחב
            headMesh.position.x = -this.headHeight / 2; // ראש בחלק הקדמי של הבורג
            screwGroup.add(headMesh);
        }
        return screwGroup;
    }
    // יצירת גיאומטריית בורג
    private createScrewGeometry(screwLength?: number, showHead: boolean = true): THREE.Group {
        const screwGroup = new THREE.Group();
        // פרמטרים של הבורג (מידות אמיתיות)
        // אם לא סופק אורך, נשתמש באורך ברירת המחדל
        const actualScrewLength = screwLength || this.screwLength;
        // יצירת גוף הבורג (צינור צר)
        const screwGeometry = new THREE.CylinderGeometry(
            this.screwRadius,
            this.screwRadius,
            actualScrewLength,
            8
        );
        const screwMaterial = new THREE.MeshStandardMaterial({
            color: 0x666666,
        }); // אפור מתכתי כהה
        const screwMesh = new THREE.Mesh(screwGeometry, screwMaterial);
        screwMesh.position.y = -actualScrewLength / 2; // מרכז את הבורג
        screwGroup.add(screwMesh);
        // יצירת ראש הבורג רק אם showHead = true
        if (showHead) {
            const headGeometry = new THREE.CylinderGeometry(
                this.headRadius,
                this.headRadius,
                this.headHeight,
                8
            );
            const headMaterial = new THREE.MeshStandardMaterial({
                color: 0x666666,
            }); // אפור מתכתי כהה (זהה לבורג)
            const headMesh = new THREE.Mesh(headGeometry, headMaterial);
            headMesh.position.y = this.headHeight / 2; // ראש בחלק העליון של הבורג
            screwGroup.add(headMesh);
        }
        // ביטול החריצים - אין צורך בהם
        return screwGroup;
    }
    // הוספת ברגים לקורת מדף
    private addScrewsToShelfBeam(
        beam: any,
        shelfY: number,
        beamHeight: number,
        frameBeamWidth: number,
        isShortenedBeam: string = 'top',
        isPreliminaryDrillsShelf: boolean = false // פרמטר חדש - מחושב מראש מחוץ ללולאה
    ) {
        // 🎯 הבדיקה כבר בוצעה מחוץ ללולאה - משתמשים בפרמטר
        
        // חישוב אורך הבורג - במצב preliminary-drills לפי height של קורת המדף, אחרת לפי הלוגיקה הרגילה
        const calculatedScrewLength = isPreliminaryDrillsShelf 
            ? this.calculatePreliminaryDrillScrewLength('shelf', beamHeight)
            : this.calculateScrewLength('shelf', beamHeight);
        
        // במצב preliminary-drills - ברגים ללא ראש (כמו חורים)
        const showHead = !isPreliminaryDrillsShelf;
        
        // חישוב מיקומי הברגים
        // הזחה מהקצוות: מחצית ממידת ה-height של קורת החיזוק
        const edgeOffset = frameBeamWidth / 2;
        // הזחה כלפי פנים: רבע ממידת ה-width של קורת המדף
        const inwardOffset =
            beam.width / 4 > this.frameWidth / 2
                ? beam.width / 4
                : this.frameWidth / 2;
        // קורות המדפים נטענות ב-z=0 (במרכז)
        const beamZ = 0;
        // אם רוחב הקורה קטן או שווה ל-4, יצור בורג אחד במרכז של כל צד
        let screwPositions;
        if (beam.width <= 4) {
            screwPositions = [
                // בורג במרכז הצד הקדמי
                {
                    x: beam.x, // במרכז הרוחב
                    z: beamZ - beam.depth / 2 + edgeOffset, // במרכז הצד הקדמי
                },
                // בורג במרכז הצד האחורי
                {
                    x: beam.x, // במרכז הרוחב
                    z: beamZ + beam.depth / 2 - edgeOffset, // במרכז הצד האחורי
                },
            ];
        } else {
            // רוחב הקורה גדול מ-4 - יצור 4 ברגים בפינות (הלוגיקה הקיימת)
            screwPositions = [
            // פינה שמאלית קדמית
            {
                x: beam.x - beam.width / 2 + inwardOffset,
                    z: beamZ - beam.depth / 2 + edgeOffset,
            },
            // פינה ימנית קדמית
            {
                x: beam.x + beam.width / 2 - inwardOffset,
                    z: beamZ - beam.depth / 2 + edgeOffset,
            },
            // פינה שמאלית אחורית
            {
                x: beam.x - beam.width / 2 + inwardOffset,
                    z: beamZ + beam.depth / 2 - edgeOffset,
            },
            // פינה ימנית אחורית
            {
                x: beam.x + beam.width / 2 - inwardOffset,
                    z: beamZ + beam.depth / 2 - edgeOffset,
                },
            ];
        }
        // אם הקורה מקוצרת, קרא את threshold וקבע כמה ברגים ליצור
        if (isShortenedBeam !== 'top') {
            // קריאת ערך threshold מה-restrictions של המוצר
            let threshold = 50; // ערך ברירת מחדל (50 ס"מ)
            if (this.product && Array.isArray(this.product.restrictions)) {
                const thresholdRestriction = this.product.restrictions.find(
                    (r: any) => r.name === 'dubble-shorten-beam-screws-threshold'
                );
                if (thresholdRestriction && typeof thresholdRestriction.val === 'number') {
                    threshold = thresholdRestriction.val;
                }
            }
            
            // חישוב אורך הקורה המקוצרת (L) - beam.depth כבר מקוצר
            const L = beam.depth; // אורך הקורה המקוצרת (בס"מ)
            const D = threshold; // ערך ה-threshold
            
            // קביעת מספר הברגים לפי הכללים
            let numScrewsPerSide: number;
            if (L > D) {
                // L > D → 4 ברגים (2 ברגים בכל צד)
                numScrewsPerSide = 2;
            } else if (L > D / 2) {
                // L > D/2 → 3 ברגים (1.5 בכל צד, אבל נעגל ל-2 בצד אחד ו-1 בצד השני)
                numScrewsPerSide = 1.5; // נטפל בזה בהמשך
            } else {
                // L <= D/2 → 2 ברגים (רק 1 בכל צד = הקיצוניים)
                numScrewsPerSide = 1;
            }
            
            // יצירת מיקומי הברגים הבסיסיים (4 פינות)
            const basePositions = [
                // פינה שמאלית קדמית
                {
                    x: beam.x - beam.width / 2 + inwardOffset,
                    z: beamZ - beam.depth / 2 + edgeOffset,
                },
                // פינה ימנית קדמית
                {
                    x: beam.x + beam.width / 2 - inwardOffset,
                    z: beamZ - beam.depth / 2 + edgeOffset,
                },
                // פינה שמאלית אחורית
                {
                    x: beam.x - beam.width / 2 + inwardOffset,
                    z: beamZ + beam.depth / 2 - edgeOffset,
                },
                // פינה ימנית אחורית
                {
                    x: beam.x + beam.width / 2 - inwardOffset,
                    z: beamZ + beam.depth / 2 - edgeOffset,
                },
            ];
            
            // סינון לפי צד (start או end)
            let filteredBasePositions: any[] = [];
            if (isShortenedBeam === 'start') {
                // לשמאל: רק הקיצוניים (0, 2) - פינה שמאלית קדמית ואחורית
                filteredBasePositions = [
                    basePositions[0], // שמאלי קדמי
                    basePositions[2]  // שמאלי אחורי
                ];
            } else {
                // לימין: רק הקיצוניים (1, 3) - פינה ימנית קדמית ואחורית
                filteredBasePositions = [
                    basePositions[1], // ימני קדמי
                    basePositions[3]  // ימני אחורי
                ];
            }
            
            // עכשיו נקבע כמה ברגים נוספים להוסיף לפי numScrewsPerSide
            if (numScrewsPerSide === 2) {
                // 4 ברגים - שני קיצוניים + שני ביניים
                // נוסיף ברגים באמצע בין הקיצוניים
                const startPos = filteredBasePositions[0];
                const endPos = filteredBasePositions[1];
                const middlePos1 = {
                    x: startPos.x + (endPos.x - startPos.x) / 3,
                    z: startPos.z + (endPos.z - startPos.z) / 3,
                };
                const middlePos2 = {
                    x: startPos.x + (2 * (endPos.x - startPos.x)) / 3,
                    z: startPos.z + (2 * (endPos.z - startPos.z)) / 3,
                };
                screwPositions = [startPos, middlePos1, middlePos2, endPos];
            } else if (numScrewsPerSide === 1.5) {
                // 3 ברגים - שני קיצוניים + אחד באמצע
                const startPos = filteredBasePositions[0];
                const endPos = filteredBasePositions[1];
                const middlePos = {
                    x: (startPos.x + endPos.x) / 2,
                    z: (startPos.z + endPos.z) / 2,
                };
                screwPositions = [startPos, middlePos, endPos];
            } else {
                // 2 ברגים - רק שני קיצוניים
                screwPositions = filteredBasePositions;
            }
            
            // עדכון מיקומי הברגים לפי הלוגיקה המתקדמת (כמו קודם)
            const startPositions = screwPositions[0];
            const endPositions = screwPositions[screwPositions.length - 1];

                // חישוב הפרמטרים לפי הלוגיקה החדשה
                const A = this.surfaceWidth / 2; // הרוחב הכולל של הארון חלקי 2
                const X = this.frameHeight; // frameBeamHeight
                const Y = frameBeamWidth; // המידה השנייה של קורת הרגל (לא frameBeamHeight)
                const Q = beam.width; // beam.width

                // חישוב Z ו-R ו-L
                const Z = (X - Y) / 2;
                const R = (Q - Z) / 2;
            const L_calc = R + Z;

                // המרחק הסופי של הברגים מהמרכז
                let finalDistance;
                if (Q > X) {
                    // מקרה קצה: Q > X
                    finalDistance = A - X / 2;
                } else {
                    // מקרה רגיל: Q <= X
                finalDistance = A - L_calc;
            }

            // עדכון מיקומי כל הברגים לפי המרחק הסופי מהמרכז
            // לקורות מקוצרות - נקבע את הצד לפי isShortenedBeam
            if (isShortenedBeam === 'start') {
                // קורה מקוצרת משמאל - כל הברגים בצד שמאל (x שלילי)
                screwPositions = screwPositions.map((pos) => ({
                    x: -finalDistance,
                    z: pos.z,
                }));
            } else if (isShortenedBeam === 'end') {
                // קורה מקוצרת מימין - כל הברגים בצד ימין (x חיובי)
                screwPositions = screwPositions.map((pos) => ({
                    x: finalDistance,
                    z: pos.z,
                }));
            } else {
                // קורה לא מקוצרת - הלוגיקה המקורית
                screwPositions = screwPositions.map((pos) => ({
                    x: pos.x > 0 ? finalDistance : -finalDistance,
                    z: pos.z,
                }));
            }
            
            console.log('CHECK_SHORTEN_BEAM_SCREWS_COUNT', JSON.stringify({
                isShortenedBeam: isShortenedBeam,
                beamDepth: beam.depth,
                L: L,
                D: D,
                D_half: D / 2,
                condition1: `L > D: ${L > D}`,
                condition2: `L > D/2: ${L > D / 2}`,
                numScrewsPerSide_original: numScrewsPerSide,
                numScrewsTotal: screwPositions.length,
                screwPositionsCount: screwPositions.length,
                threshold: threshold
            }, null, 2));
        }
        // יצירת ברגים
        screwPositions.forEach((pos, index) => {
            const screwGroup = this.createScrewGeometry(calculatedScrewLength, showHead);
            // הבורג צריך להיות כך שהראש שלו נוגע בקורה
            // הבורג לא מסובב, אז הראש נמצא ב-(screwLength/2 + headHeight/2) מהמרכז
            // כדי שהראש יהיה על הקורה, המרכז צריך להיות מתחת לקורה ב-(screwLength/2 + headHeight/2)
            // הורדה נוספת של 20 מ"מ כלפי מטה
            const headHeight = 0.2; // 2 מ"מ
            const screwLength = 4.0; // 40 מ"מ
            const screwY = shelfY + beamHeight; // הורדה של 20 מ"מ + 100 לראות את הברגים
            
            // חישוב מיקום הברגים בציר X (רוחב המוצר) - לקורות מקוצרות בלבד
            let screwX = pos.x; // מיקום X הבסיסי של הבורג
            if (isShortenedBeam !== 'top') {
                // קבלת רוחב קורת הרגל (המידה השנייה - הרוחב, לא הגובה)
                const legParam = this.getParam('leg');
                let legBeamWidth = frameBeamWidth; // fallback - רוחב קורת הרגל (המידה השנייה)
                
                if (legParam && Array.isArray(legParam.beams) && legParam.beams.length) {
                    const legBeam = legParam.beams[legParam.selectedBeamIndex || 0];
                    if (legBeam && typeof legBeam.width === 'number') {
                        legBeamWidth = legBeam.width / 10; // המרה ממ"מ לס"מ - רוחב קורת הרגל
                    }
                }
                
                // חישוב מיקום הברגים בציר X (רוחב): (רוחב המוצר / 2) - (רוחב קורת הרגל / 2)
                // זה משנה רק את ציר X (screwX), לא את screwY או pos.z
                const dimensions = this.getProductDimensionsRaw();
                const productWidth = dimensions.width; // רוחב המוצר
                const halfProductWidth = productWidth / 2;
                const halfLegBeamWidth = legBeamWidth / 2;
                
                // קביעת הצד לפי isShortenedBeam
                if (isShortenedBeam === 'start') {
                    // קורה מקוצרת משמאל - הברגים בצד שמאל (x שלילי)
                    screwX = -(halfProductWidth - halfLegBeamWidth);
                } else if (isShortenedBeam === 'end') {
                    // קורה מקוצרת מימין - הברגים בצד ימין (x חיובי)
                    screwX = halfProductWidth - halfLegBeamWidth;
                } else {
                    // קורה לא מקוצרת - הלוגיקה המקורית
                    screwX = halfProductWidth - halfLegBeamWidth;
                }
                
                console.log('CHECK_MOVED_BEAM', JSON.stringify({
                    isShortenedBeam: isShortenedBeam,
                    screwIndex: index,
                    originalX: pos.x,
                    newScrewX: screwX,
                    screwY: screwY,
                    shelfY: shelfY,
                    beamHeight: beamHeight,
                    beamWidth: beam.width,
                    beamDepth: beam.depth,
                    beamX: beam.x,
                    legBeamWidth: legBeamWidth,
                    legBeamWidth_meaning: 'רוחב קורת הרגל (המידה השנייה של קורת הרגל)',
                    productWidth: productWidth,
                    calculation: `screwX = ${isShortenedBeam === 'start' ? '-(' : isShortenedBeam === 'end' ? '(' : 'pos.x = '}halfProductWidth - halfLegBeamWidth${isShortenedBeam === 'start' || isShortenedBeam === 'end' ? ')' : ''} = ${screwX}`,
                    screwPosition: {
                        x: screwX,
                        y: screwY,
                        z: pos.z
                    },
                    xOffset: screwX - pos.x,
                    xOffset_meaning: `הברגים הוזזו ${screwX - pos.x} ס"מ בציר X (רוחב המוצר)`,
                    headHeight: headHeight,
                    screwLength: screwLength,
                    note: 'הזזה בציר X בלבד - רוחב המוצר'
                }, null, 2));
            }
            
            // מיקום הבורג: החלק התחתון של הראש על הקורה, מופנה כלפי מטה
            screwGroup.position.set(screwX, screwY, pos.z);
            // הבורג כבר מופנה כלפי מטה - אין צורך בסיבוב
            // screwGroup.rotation.x = Math.PI;
            this.scene.add(screwGroup);
            this.beamMeshes.push(screwGroup);
        });
    }
    
    // הוספת חורים לקורת מדף (במקום ברגים במצב preliminary drills)
    private addHolesToShelfBeam(
        beam: any,
        shelfY: number,
        beamHeight: number,
        frameBeamWidth: number,
        isShortenedBeam: string = 'top'
    ) {
        // חישוב אורך החור לפי סוג הבורג והמידות (כמו בברגים)
        const calculatedScrewLength = this.calculateScrewLength('shelf', beamHeight);
        const holeLength = calculatedScrewLength;
        
        // חישוב מיקומי החורים - זהה לחישוב מיקומי הברגים
        const edgeOffset = frameBeamWidth / 2;
        const inwardOffset =
            beam.width / 4 > this.frameWidth / 2
                ? beam.width / 4
                : this.frameWidth / 2;
        const beamZ = 0;
        
        let holePositions: { x: number; z: number }[];
        
        if (beam.width <= 4) {
            // בורג אחד במרכז כל צד
            holePositions = [
                { x: beam.x, z: beamZ - beam.depth / 2 + edgeOffset },
                { x: beam.x, z: beamZ + beam.depth / 2 - edgeOffset }
            ];
        } else {
            // 4 חורים בפינות
            holePositions = [
                { x: beam.x - beam.width / 2 + inwardOffset, z: beamZ - beam.depth / 2 + edgeOffset },
                { x: beam.x + beam.width / 2 - inwardOffset, z: beamZ - beam.depth / 2 + edgeOffset },
                { x: beam.x - beam.width / 2 + inwardOffset, z: beamZ + beam.depth / 2 - edgeOffset },
                { x: beam.x + beam.width / 2 - inwardOffset, z: beamZ + beam.depth / 2 - edgeOffset }
            ];
        }
        
        // טיפול בקורות מקוצרות - זהה ללוגיקה של הברגים
        if (isShortenedBeam !== 'top') {
            let threshold = 50;
            if (this.product && Array.isArray(this.product.restrictions)) {
                const thresholdRestriction = this.product.restrictions.find(
                    (r: any) => r.name === 'dubble-shorten-beam-screws-threshold'
                );
                if (thresholdRestriction && typeof thresholdRestriction.val === 'number') {
                    threshold = thresholdRestriction.val;
                }
            }
            
            const L = beam.depth;
            const D = threshold;
            
            let numScrewsPerSide: number;
            if (L > D) {
                numScrewsPerSide = 2;
            } else if (L > D / 2) {
                numScrewsPerSide = 1.5;
            } else {
                numScrewsPerSide = 1;
            }
            
            const basePositions = [
                { x: beam.x - beam.width / 2 + inwardOffset, z: beamZ - beam.depth / 2 + edgeOffset },
                { x: beam.x + beam.width / 2 - inwardOffset, z: beamZ - beam.depth / 2 + edgeOffset },
                { x: beam.x - beam.width / 2 + inwardOffset, z: beamZ + beam.depth / 2 - edgeOffset },
                { x: beam.x + beam.width / 2 - inwardOffset, z: beamZ + beam.depth / 2 - edgeOffset }
            ];
            
            let filteredBasePositions: any[] = [];
            if (isShortenedBeam === 'start') {
                filteredBasePositions = [basePositions[0], basePositions[2]];
            } else {
                filteredBasePositions = [basePositions[1], basePositions[3]];
            }
            
            if (numScrewsPerSide === 2) {
                const startPos = filteredBasePositions[0];
                const endPos = filteredBasePositions[1];
                const middlePos1 = {
                    x: startPos.x + (endPos.x - startPos.x) / 3,
                    z: startPos.z + (endPos.z - startPos.z) / 3,
                };
                const middlePos2 = {
                    x: startPos.x + (2 * (endPos.x - startPos.x)) / 3,
                    z: startPos.z + (2 * (endPos.z - startPos.z)) / 3,
                };
                holePositions = [startPos, middlePos1, middlePos2, endPos];
            } else if (numScrewsPerSide === 1.5) {
                const startPos = filteredBasePositions[0];
                const endPos = filteredBasePositions[1];
                const middlePos = {
                    x: (startPos.x + endPos.x) / 2,
                    z: (startPos.z + endPos.z) / 2,
                };
                holePositions = [startPos, middlePos, endPos];
            } else {
                holePositions = filteredBasePositions;
            }
            
            // עדכון מיקומי החורים לפי הלוגיקה המתקדמת (כמו ברגים)
            const A = this.surfaceWidth / 2;
            const X = this.frameHeight;
            const Y = frameBeamWidth;
            const Q = beam.width;
            
            const Z = (X - Y) / 2;
            const R = (Q - Z) / 2;
            const L_calc = R + Z;
            
            let finalDistance;
            if (Q > X) {
                finalDistance = A - X / 2;
            } else {
                finalDistance = A - L_calc;
            }
            
            holePositions = holePositions.map((pos) => ({
                x: pos.x > 0 ? finalDistance : -finalDistance,
                z: pos.z,
            }));
        }
        
        // יצירת חורים
        holePositions.forEach((pos) => {
            const holeMesh = this.createVerticalHoleGeometry(holeLength);
            const holeY = shelfY + beamHeight / 2; // מיקום החור במרכז הקורה
            let holeX = pos.x;
            
            // חישוב מיקום החורים בציר X (רוחב המוצר) - לקורות מקוצרות בלבד
            if (isShortenedBeam !== 'top') {
                const legParam = this.getParam('leg');
                let legBeamWidth = frameBeamWidth;
                
                if (legParam && Array.isArray(legParam.beams) && legParam.beams.length) {
                    const legBeam = legParam.beams[legParam.selectedBeamIndex || 0];
                    if (legBeam && typeof legBeam.width === 'number') {
                        legBeamWidth = legBeam.width / 10;
                    }
                }
                
                const dimensions = this.getProductDimensionsRaw();
                const productWidth = dimensions.width;
                const halfProductWidth = productWidth / 2;
                const halfLegBeamWidth = legBeamWidth / 2;
                holeX = halfProductWidth - halfLegBeamWidth;
            }
            
            holeMesh.position.set(holeX, holeY, pos.z);
            this.scene.add(holeMesh);
            this.beamMeshes.push(holeMesh);
        });
    }
    
    // פונקציות לניהול כמות יחידות
    increaseQuantity() {
        this.quantity++;
        this.calculatePricing(); // עדכון המחיר
    }
    
    decreaseQuantity() {
        if (this.quantity > 1) {
            this.quantity--;
            this.calculatePricing(); // עדכון המחיר
        }
    }
    
    onQuantityChange(event: any) {
        const value = parseInt(event.target.value);
        if (!isNaN(value) && value >= 1) {
            this.quantity = value;
        } else if (value < 1) {
            this.quantity = 1;
        }
        this.calculatePricing(); // עדכון המחיר
    }
    
    // פונקציות לניהול אופציות תמחור
    selectPricingOption(option: 'cut' | 'full' | 'plan') {
        this.debugLog('=== selectPricingOption נקרא ===');
        this.debugLog('option:', option);
        this.debugLog('selectedPricingOption לפני:', this.selectedPricingOption);
        
        this.selectedPricingOption = option;
        
        this.debugLog('selectedPricingOption אחרי:', this.selectedPricingOption);
        this.debugLog('=== selectPricingOption הסתיים ===');
    }
    
    // פונקציות לניהול הטוגלים החדשים
    toggleBeamsOption() {
        this.isBeamsEnabled = !this.isBeamsEnabled;
        if (!this.isBeamsEnabled) {
            this.isCuttingEnabled = false; // אם קורות כבויות, גם חיתוך כבוי
            this.showBeamsEditOptions = false; // סגירת איזור עריכת קורות
        } else {
            // אם מחזירים קורות, מפעילים גם חיתוך ומחזירים למצב המקורי
            this.isCuttingEnabled = true;
            this.resetBeamsToOriginalState();
        }
        // לא קוראים ל-calculatePricing() - רק משנים את המצב
    }
    
    toggleCuttingOption() {
        this.isCuttingEnabled = !this.isCuttingEnabled;
        // לא קוראים ל-calculatePricing() - רק משנים את המצב
    }
    
    toggleScrewsOption() {
        this.isScrewsEnabled = !this.isScrewsEnabled;
        if (!this.isScrewsEnabled) {
            this.showScrewsEditOptions = false; // סגירת איזור עריכת ברגים
        } else {
            // אם מחזירים ברגים, מחזירים למצב המקורי
            this.resetScrewsToOriginalState();
        }
        // לא קוראים ל-calculatePricing() - רק משנים את המצב
    }
    
    // החזרת קורות למצב המקורי
    private resetBeamsToOriginalState() {
        if (!this.originalBeamsData || !this.BeamsDataForPricing) {
            return;
        }
        
        
        // מחזיר את הכמויות למצב המקורי
        for (let i = 0; i < this.BeamsDataForPricing.length; i++) {
            const currentBeam = this.BeamsDataForPricing[i];
            const originalBeam = this.originalBeamsData[i];
            
            if (originalBeam && currentBeam) {
                // מחזיר את הכמויות המקוריות
                currentBeam.totalSizes = JSON.parse(JSON.stringify(originalBeam.totalSizes));
            }
        }
        
        // מחזיר את cuttingPlan למצב המקורי (ללא חישוב מחדש)
        // צריך לשחזר את cuttingPlan על בסיס הכמויות המקוריות
        this.restoreOriginalCuttingPlan();
        
        // עדכון סטטוס החיתוך - עכשיו שהוא חזר למקור, החיתוך אפשרי
        this.isCuttingPossible = true;
        
        // איפוס מחירים דינמיים
        this.dynamicBeamsPrice = this.originalBeamsPrice;
        this.hasBeamsChanged = false;
        
    }
    
    // שחזור cuttingPlan למצב המקורי (ללא חישוב מחדש)
    private restoreOriginalCuttingPlan() {
        if (!this.originalBeamsData || !this.BeamsDataForPricing) {
            return;
        }
        
        
        // ניקוי cuttingPlan הנוכחי
        this.cuttingPlan = [];
        
        // שחזור cuttingPlan על בסיס הכמויות המקוריות
        for (let i = 0; i < this.BeamsDataForPricing.length; i++) {
            const currentBeam = this.BeamsDataForPricing[i];
            const originalQuantity = this.originalBeamQuantities[i];
            
            if (originalQuantity > 0 && currentBeam) {
                // חישוב אורך הקורה המקורי
                const beamLength = this.getBeamLengthInMeters(currentBeam);
                const beamPrice = this.getBeamPrice(currentBeam);
                
                // הוספת הקורות ל-cuttingPlan
                for (let j = 0; j < originalQuantity; j++) {
                    this.cuttingPlan.push({
                        beamType: currentBeam.beamTranslatedName,
                        beamLength: beamLength,
                        beamPrice: beamPrice,
                        beamId: `${currentBeam.beamTranslatedName}_${j}`
                    });
                }
            }
        }
        
    }
    
    // החזרת ברגים למצב המקורי
    private resetScrewsToOriginalState() {
        if (!this.originalScrewsData || !this.screwsPackagingPlan) {
            return;
        }
        
        for (let i = 0; i < this.screwsPackagingPlan.length; i++) {
            const currentScrew = this.screwsPackagingPlan[i];
            const originalScrew = this.originalScrewsData[i];
            
            if (originalScrew && currentScrew) {
                // מחזיר את הכמויות המקוריות
                currentScrew.numPackages = originalScrew.numPackages;
            }
        }
        
        this.dynamicScrewsPrice = this.originalScrewsPrice;
        this.hasScrewsChanged = false;
    }
    
    // פונקציה לקבלת מחיר ברגים
    getScrewsPrice(): number {
        // אם יש מחיר דינמי (לא 0) - החזר אותו, אחרת חשב מהתכנית
        if (this.dynamicScrewsPrice !== 0) {
            return this.dynamicScrewsPrice;
        }
        if (!this.screwsPackagingPlan || this.screwsPackagingPlan.length === 0) {
            return 0;
        }
        return this.screwsPackagingPlan.reduce((total, screwPackage) => total + (screwPackage.totalPrice || 0), 0);
    }
    
    
    // קבלת שם האופציה הנבחרת
    getPricingOptionName(): string {
        // אם רק שרטוט
        if (!this.isBeamsEnabled && !this.isScrewsEnabled) {
            return 'שרטוט בלבד';
        }
        
        // אם קורות חתוכות וברגים
        if (this.isBeamsEnabled && this.isCuttingEnabled && this.isScrewsEnabled) {
            return 'קורות חתוכות וברגים';
        }
        
        // אם קורות לא חתוכות וברגים
        if (this.isBeamsEnabled && !this.isCuttingEnabled && this.isScrewsEnabled) {
            return 'קורות, הוראות וברגים';
        }
        
        // אם קורות חתוכות בלי ברגים
        if (this.isBeamsEnabled && this.isCuttingEnabled && !this.isScrewsEnabled) {
            return 'קורות חתוכות';
        }
        
        // אם קורות לא חתוכות בלי ברגים
        if (this.isBeamsEnabled && !this.isCuttingEnabled && !this.isScrewsEnabled) {
            return 'קורות והוראות';
        }
        
        // אם רק ברגים
        if (!this.isBeamsEnabled && this.isScrewsEnabled) {
            return 'הוראות וברגים';
        }
        
        return 'הוראות';
    }
    
    // פונקציה לטיפול בלחיצה על הוראות (מנדטוריות)
    onInstructionsClick(event: Event): void {
        event.stopPropagation();
        // הצגת הודעהאפבאר
        this.snackBar.open('לא ניתן לבטל הוראות חיתוך והרכבה', '', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
            panelClass: ['custom-snackbar']
        });
    }
    
    // פונקציה לטיפול בשינוי פרמטר boolean
    onBooleanParamChange(paramName: string): void {
        // עדכון התלת-ממדי
        this.updateBeams();
        
        // אם זה פרמטר שמשפיע על המחיר, עדכן את המחיר
        if (paramName === 'is-reinforcement-beams-outside') {
            console.log(`CHECK_REMOVE_LEG_SCREWS_OUTSIDE - Toggle changed for ${paramName}, forcing pricing recalculation`);
            // עדכון המחיר כדי שהחישוב של ברגי הרגל יתעדכן
            // ניסיון לקרוא לפונקציה שמעדכנת את המחיר - אם היא קיימת
            try {
                // אם יש פונקציה שמחשבת את המחיר, קרא לה
                if (typeof (this as any).calculateForgingData === 'function') {
                    (this as any).calculateForgingData();
                } else if (typeof (this as any).calculatePricing === 'function') {
                    (this as any).calculatePricing();
                }
            } catch (e) {
                console.warn('CHECK_REMOVE_LEG_SCREWS_OUTSIDE - Could not call pricing function:', e);
            }
        }
    }
    
    // קבלת שם קצר לאופציות הנבחרות למצב מצומצם
    getPricingOptionShortName(): string {
        // אם רק שרטוט
        if (!this.isBeamsEnabled && !this.isScrewsEnabled) {
            return 'שרטוט בלבד';
        }
        
        // אם קורות חתוכות וברגים
        if (this.isBeamsEnabled && this.isCuttingEnabled && this.isScrewsEnabled) {
            return 'קורות חתוכות וברגים';
        }
        
        // אם קורות לא חתוכות וברגים
        if (this.isBeamsEnabled && !this.isCuttingEnabled && this.isScrewsEnabled) {
            return 'קורות, הוראות וברגים';
        }
        
        // אם קורות חתוכות בלי ברגים
        if (this.isBeamsEnabled && this.isCuttingEnabled && !this.isScrewsEnabled) {
            return 'קורות חתוכות';
        }
        
        // אם קורות לא חתוכות בלי ברגים
        if (this.isBeamsEnabled && !this.isCuttingEnabled && !this.isScrewsEnabled) {
            return 'קורות והוראות';
        }
        
        // אם רק ברגים
        if (!this.isBeamsEnabled && this.isScrewsEnabled) {
            return 'הוראות וברגים';
        }
        
        return 'הוראות';
    }
    
    // קבלת מפתח תרגום לאופציות הנבחרות
    getPricingOptionShortLabel(): string {
        // עבור התפריט החדש, נחזיר מפתח קבוע
        return 'custom_pricing_selection';
    }

    
    // חישוב מחיר קורות (ללא חיתוך)
    getBeamsOnlyPrice(): number {
        // אם יש מחיר דינמי (לא 0) - החזר אותו, אחרת חשב מהתכנית
        if (this.dynamicBeamsPrice !== 0) {
            return this.dynamicBeamsPrice;
        }
        const price = this.cuttingPlan.reduce((sum, beam) => sum + beam.beamPrice, 0);
        return Math.round(price * 100) / 100;
    }
    
    // חישוב מחיר חיתוכים
    getCuttingPrice(): number {
        // אם יש מחיר דינמי (לא 0) - החזר אותו, אחרת חשב מהתכנית
        if (this.dynamicCuttingPrice !== 0) {
            return this.dynamicCuttingPrice;
        }
        const price = this.cuttingPlan.reduce((sum, beam) => sum + (beam.totalCuttingPrice || 0), 0);
        return Math.round(price * 100) / 100;
    }
    
    // קבלת מחיר החיתוך המקורי
    getOriginalCuttingPrice(): number {
        return this.originalCuttingPrice || 0;
    }
    
    // חישוב המחיר הסופי לפי הטוגלים החדשים
    getFinalPrice(): number {
        let finalPrice = 0;
        
        // הוראות חיתוך והרכבה - תמיד כלולות (חובה)
        finalPrice += this.drawingPrice;
        
        // קורות - רק אם מופעלות
        if (this.isBeamsEnabled) {
            finalPrice += this.getBeamsOnlyPrice();
            
            // חיתוך - רק אם מופעל
            if (this.isCuttingEnabled) {
                finalPrice += this.getCuttingPrice();
            }
        }
        
        // ברגים - רק אם מופעלים
        if (this.isScrewsEnabled) {
            finalPrice += this.getScrewsPrice();
        }
        
        return Math.round(finalPrice * 100) / 100;
    }
    
    // קבלת פירוט המחיר לפי הטוגלים החדשים
    getPriceBreakdown(): string {
        const parts: string[] = [];
        
        // הוראות חיתוך והרכבה - תמיד כלולות
        parts.push(`${this.drawingPrice}₪ שרטוט`);
        
        // קורות - רק אם מופעלות
        if (this.isBeamsEnabled) {
            const beamsPrice = this.getBeamsOnlyPrice();
            parts.push(`${beamsPrice}₪ קורות`);
            
            // חיתוך - רק אם מופעל
            if (this.isCuttingEnabled) {
                const cuttingPrice = this.getCuttingPrice();
                parts.push(`${cuttingPrice}₪ חיתוך`);
            }
        }
        
        // ברגים - רק אם מופעלים
        if (this.isScrewsEnabled) {
            const screwsPrice = this.getScrewsPrice();
            if (screwsPrice > 0) {
                parts.push(`${screwsPrice}₪ ברגים`);
            }
        }
        
        return parts.join(' + ');
    }

    // חישוב נתוני קורות לפי מידה למחיר
    private async calculateBelamsData() {
        this.debugLog('בחישוב נתוני קורות לפי מידה למחיר...');
        
        const beamsParam = this.getParam('beams');
        if (!beamsParam || !beamsParam.setAmount) {
            console.warn('לא נמצא פרמטר beams עם setAmount');
            return;
        }

        const beamsArray = beamsParam.default || [];
        
        // יצירת נתוני קורה למחיר - כל קורה עם המידה שהמשתמש הגדיר
        const selectedBeamIndex = beamsParam.selectedBeamIndex || 0;
        const beamInfo = beamsParam.beams[selectedBeamIndex];
        
        if (beamInfo) {
            const beamTypeIndex = beamsParam.selectedTypeIndex || (beamsParam.defaultType ? 
                this.findDefaultTypeIndex(beamInfo.types, beamsParam.defaultType) : 0);
            const beamType = beamInfo.types?.[beamTypeIndex];
            
            if (beamType) {
                // יצירת רשימת אורכים עם שכפול לפי כמות
                const beamLengths: number[] = [];
                
                beamsArray.forEach((beamData: any, index: number) => {
                    if (beamData && typeof beamData === 'object') {
                        const beamLengthCm = beamData.length;
                        const beamAmount = beamData.amount || 1;
                        
                        // שכפול האורך לפי הכמות
                        for (let i = 0; i < beamAmount; i++) {
                            beamLengths.push(beamLengthCm);
                        }
                        
                        this.debugLog(`קורה נוספה למחיר: ${beamLengthCm}ס"מ × ${beamAmount}יח`);
                    } else if (typeof beamData === 'number') {
                        // תאמיכה במבנה הישן של מספרים
                        const beamLengthCm = beamData;
                        beamLengths.push(beamLengthCm);
                        
                        this.debugLog(`קורה נוספה למחיר (מבנה ישן): ${beamLengthCm}ס"מ`);
                    }
                });
                
                // יצירת נתוני קורה למחיר - במבנה הנכון
                this.BeamsDataForPricing.push({
                    type: beamType,
                    beamName: beamInfo.name,
                    beamTranslatedName: beamInfo.translatedName || beamInfo.name,
                    beamWoodType: beamType.translatedName || beamType.name,
                    sizes: beamLengths // מערך של כל האורכים
                });
                
                this.debugLog(`נתוני קורות לחישוב מחיר:`, {
                    beamName: beamInfo.name,
                    woodType: beamType.translatedName || beamType.name,
                    sizes: beamLengths
                });
            }
        }

        this.debugLog(`נתוני קורות לחישוב מחיר נשלחו: ${this.BeamsDataForPricing.length} סוגי קורות`);
    }

    // תצוגת מידות הקורות עם כמות
    getBelamsWithQuantitiesText(): string {
        const beamsParam = this.getParam('beams');
        if (!beamsParam || !beamsParam.setAmount) {
            return '';
        }

        const beamsArray = beamsParam.default || [];
        
        // יצירת רשימת המידות שהמשתמש הגדיר (בסל"מ כמו מדף שולחן)
        const selectedBeamIndex = beamsParam.selectedBeamIndex || 0;
        const beamInfo = beamsParam.beams[selectedBeamIndex];
        
        if (beamInfo) {
            const beamTypeIndex = beamsParam.selectedTypeIndex || (beamsParam.defaultType ? 
                this.findDefaultTypeIndex(beamInfo.types, beamsParam.defaultType) : 0);
            const beamType = beamInfo.types?.[beamTypeIndex];
            const beamName = beamType?.name || beamInfo.translatedName || `קורה ${selectedBeamIndex}`;
            
            // הכנה של רשימת מידות וכמויות כמו במדפים
            const beamDimensions: string[] = [];
            beamsArray.forEach((beamData: any, index: number) => {
                if (beamData && typeof beamData === 'object') {
                    const beamLengthCm = beamData.length || beamData;
                    const beamAmount = beamData.amount || 1;
                    beamDimensions.push(`${beamLengthCm} ס"מ × ${beamAmount}יח`);
                } else if (typeof beamData === 'number') {
                    beamDimensions.push(`${beamData} ס"מ`);
                }
            });
            
            return `${beamDimensions.join(', ')}`;
        }

        return '';
    }

    // חיפוש קורה לפי שם הטיפוס
    private findBeamByName(beamTypeName: string, beamsParam: any): any {
        for (const beam of beamsParam.beams) {
            if (beam.types) {
                for (const type of beam.types) {
                    if (type.name === beamTypeName) {
                        return beam;
                    }
                }
            }
        }
        return null;
    }

    // טפול במידות מוצר קורות לפי מידה
    private getBelamsDimensionsRaw(): {
        length: number;
        width: number;
        height: number;
        beamCount: number;
        gapBetweenBeams: number;
        shelfCount: number;
        shelfHeights: number[];
        totalScrews: number;
    } {
        const beamsParam = this.getParam('beams');
        if (!beamsParam || !beamsParam.setAmount) {
            return {
                length: 0,
                width: 0,
                height: 0,
                beamCount: 0,
                gapBetweenBeams: 0,
                shelfCount: 0,
                shelfHeights: [],
                totalScrews: 0
            };
        }

        const beamsArray = beamsParam.default || [];
        
        // חישוב אורך כולל מהמידות שהמשתמש הגדיר (בסל"מ)
        const beamSpacing = 20;
        let totalLength = 0;
        
        // סיכום כל המידות והכמויות שהמשתמש הגדיר + רווחים
        beamsArray.forEach((beamData: any) => {
            if (beamData && typeof beamData === 'object') {
                const beamLengthCm = beamData.length || beamData;
                const beamAmount = beamData.amount || 1;
                totalLength += (beamLengthCm + beamSpacing) * beamAmount;
            } else if (typeof beamData === 'number') {
                totalLength += beamData + beamSpacing;
            }
        });
        
        // מציאת מידות הקורה הנבחרת (כי כל הקורות עם גובה ועומק זהים)
        let beamHeightCm = 0;
        let beamDepthCm = 0;
        
        const selectedBeamIndex = beamsParam.selectedBeamIndex || 0;
        const beamInfo = beamsParam.beams[selectedBeamIndex];
        
        if (beamInfo) {
            beamHeightCm = beamInfo.height / 10;
            beamDepthCm = (beamInfo.depth || beamInfo.width) / 10;
        }

        return {
            length: totalLength,
            width: beamDepthCm, // עומק הקורה הנבחרת
            height: beamHeightCm, // גובה הקורה הנבחרת 
            beamCount: beamsArray.length,
            gapBetweenBeams: beamSpacing,
            shelfCount: 0, // אין מדפים
            shelfHeights: [], // אין מדפים
            totalScrews: 0 // אין ברגים
        };
    }

    // Helper function to find default beam index based on defaultType
    findDefaultBeamIndex(beams: any[], defaultType?: any): number {
        if (!Array.isArray(beams) || beams.length === 0) {
            this.debugLog('CHACK-BEAM-MINI: [threejs-box] No beams array or empty array, using index 0');
            return 0;
        }
        
        this.debugLog('CHACK-BEAM-MINI: [threejs-box] Searching for default beam in beams array:', beams.length, 'beams');
        this.debugLog('CHACK-BEAM-MINI: [threejs-box] Looking for defaultType:', defaultType);
        
        // אם אין defaultType, חזרה לאינדקס 0
        if (!defaultType) {
            this.debugLog('CHACK-BEAM-MINI: [threejs-box] No defaultType provided, using index 0');
            return 0;
        }
        
        // חילוץ ה-ID מה-defaultType (יכול להיות string או object)
        const defaultTypeId = defaultType.$oid || defaultType._id || defaultType;
        this.debugLog('CHACK-BEAM-MINI: [threejs-box] Extracted defaultTypeId:', defaultTypeId);
        
        // חיפוש קורה שמתאימה ל-defaultType
        for (let i = 0; i < beams.length; i++) {
            const beam = beams[i];
            const beamId = beam._id || beam.$oid;
            
            this.debugLog(`CHACK-BEAM-MINI: [threejs-box] Beam ${i}: name="${beam.name}", id="${beamId}"`);
            
            if (beamId && defaultTypeId && beamId === defaultTypeId) {
                this.debugLog(`CHACK-BEAM-MINI: [threejs-box] ✅ Found matching beam at index ${i}: ${beamId}`);
                return i;
            }
        }
        
        // אם לא נמצאה התאמה, חזרה לאינדקס 0
        this.debugLog('CHACK-BEAM-MINI: [threejs-box] ❌ No matching beam found for defaultType, using index 0');
        return 0;
    }

    // טפול במודל קורות לפי מידה
    private updateBeamsModel() {
        this.debugLog('יצירת מודל קורות לפי מידה...');
        
        // קבלת פרמטר beamArray עם setAmount
        const beamsParam = this.getParam('beams');
        if (!beamsParam || !beamsParam.setAmount) {
            console.warn('לא נמצא פרמטר beams עם setAmount');
            return;
        }

        const beamsArray = beamsParam.default || [];
        if (!Array.isArray(beamsArray) || beamsArray.length === 0) {
            console.warn('מערך קורות ריק');
            return;
        }

        let currentZ = 0; // מיקום Z הנוכחי לקורות - מתחיל מ-0
        const beamSpacing = 10; // רווח של 10 ס"מ בין קורות

        // מעבר על כל קורה במערך - עם אורך וכמות עבור setAmount
        beamsArray.forEach((beamData: any) => {
            if (!beamData || typeof beamData !== 'object') {
                console.warn('נתוני קורה לא חוקיים:', beamData);
                return;
            }

            const beamLengthCm = beamData.length || beamData; // תמיכה בשני המבנים
            const beamAmount = beamData.amount || 1;
            
            // שימוש במידות ברירת המחלה של הקורה הנבחרת
            const selectedBeamIndex = beamsParam.selectedBeamIndex || 0;
            const beamInfo = beamsParam.beams[selectedBeamIndex];
            
            if (!beamInfo) {
                console.warn('קורה לא נמצאה באינדקס:', selectedBeamIndex);
                return;
            }

            // קבלת סוג הקורה (type)
            const beamTypeIndex = beamsParam.selectedTypeIndex || beamsParam.defaultType ? 
                this.findDefaultTypeIndex(beamInfo.types, beamsParam.defaultType) : 0;
            const beamType = beamInfo.types?.[beamTypeIndex];

            // מידות הקורה בפיקסלים מהמשתמש (בס"מ כמו מדף שולחן)
            const beamHeightCm = beamInfo.height / 10; // גובה קבוע מהקורה הנבחרת
            const beamDepthCm = (beamInfo.depth || beamInfo.width) / 10; // עומק קבוע מהקורה הנבחרת

            // יצירת קורות לפי הכמות הרצויה
            for (let i = 0; i < beamAmount; i++) {
                // יצירת גיאומטריה וחומר
                const geometry = new THREE.BoxGeometry(beamLengthCm, beamHeightCm, beamDepthCm);
                const material = this.getWoodMaterial(beamType?.name || '');

                // יצירת mesh
                const mesh = new THREE.Mesh(geometry, material);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                
                // הוספת wireframe אם נדרש
                if (this.isTransparentMode) {
                    this.addWireframeToBeam(mesh);
                }

                // מיקום הקורה במרכז ה-Y כמו מוצרים אחרים
                // כל קורה מתחילה מנקודה קבועה ומתרחבת לאותו כיוון
                mesh.position.set(
                    50, // מוזז 50 ס"מ ימינה (כיוון החץ האדום)
                    0, // במרכז ה-Y כמו מוצרים אחרים
                    currentZ - 25 // רווח קבוע של 10 ס"מ בין הקורות על ציר Z, מוזז 25 ס"מ לכיוון הפוך לחץ הכחול
                );
                
                // כליפ הקורה כך שהקצה התחילי יהיה בנקודה הקבועה
                mesh.translateX(-beamLengthCm / 2); // מזיז את הקורה כך שהקצה התחילי יהיה בנקודה 0

                // הוספה לסצנה
                this.scene.add(mesh);
                this.beamMeshes.push(mesh);

                // התקדמות למיקום הבא (עומק הקורה + רווח קבוע של 10 ס"מ)
                currentZ += beamDepthCm + beamSpacing;
            }

            this.debugLog(`קורה באורך ${beamLengthCm}ס"מ × ${beamAmount}יח: גובה ${beamHeightCm}ס"מ, עומק ${beamDepthCm}ס"מ`);
        });

        // עדכון מצב הטעינה - עם המתנה מלאכותית כדי לראות את ה-loader
        setTimeout(() => {
            this.isLoading = false;
            this.isModelLoading = false;
        }, 1000); // המתנה של שנייה כדי לראות את ה-loader

        this.debugLog(`נוצרו ${this.beamMeshes.length} קורות באוכליי שונים עם רווח של ${beamSpacing}ס"מ ביניהן`);
    }

    // חיפוש אינדקס הטיפוס בהתבסס על defaultType
    private findDefaultTypeIndex(types: any[], defaultType: any): number {
        if (!Array.isArray(types) || types.length === 0) {
            return 0;
        }
        
        if (!defaultType) {
            return 0;
        }
        
        // חילוץ ה-ID מה-defaultType (יכול להיות string או object)
        const defaultTypeId = defaultType.$oid || defaultType._id || defaultType;
        
        for (let i = 0; i < types.length; i++) {
            const type = types[i];
            const typeId = type._id || type.$oid;
            
            if (typeId && defaultTypeId && typeId === defaultTypeId) {
                return i;
            }
        }
        
        return 0;
    }
    
    // הוספת חצים לכיוונים במרכז המודל
    private addCoordinateAxes() {
        // הסרת חצים קיימים אם יש
        this.removeCoordinateAxes();
        
        const axesLength = 5; // אורך החצים בס"מ - קוצר ל-5 ס"מ
        
        // חץ X (כחול בהיר) - ימינה
        const xArrow = this.createArrow(axesLength, 0x0066ff, 'X');
        xArrow.position.set(0, 0, 0);
        this.scene.add(xArrow);
        this.coordinateAxes.push(xArrow);
        
        // חץ Y (כחול בינוני) - למעלה
        const yArrow = this.createArrow(axesLength, 0x4d94ff, 'Y');
        yArrow.position.set(0, 0, 0);
        yArrow.rotation.z = -Math.PI / 2; // סיבוב 90 מעלות סביב Z
        this.scene.add(yArrow);
        this.coordinateAxes.push(yArrow);
        
        // חץ Z (כחול כהה) - קדימה (לכיוון המצלמה)
        const zArrow = this.createArrow(axesLength, 0x003d99, 'Z');
        zArrow.position.set(0, 0, 0);
        zArrow.rotation.x = Math.PI / 2; // סיבוב 90 מעלות סביב X
        this.scene.add(zArrow);
        this.coordinateAxes.push(zArrow);

        // מיקום כל החצים לגובה: גובה המוצר + 10 ס"מ
        try {
            const dims = this.getProductDimensionsRaw();
            const yOffset = (dims?.height || 0) + 10;
            xArrow.position.y = yOffset;
            yArrow.position.y = yOffset;
            zArrow.position.y = yOffset;
        } catch {}
        
        this.debugLog('נוספו חצים לכיוונים במרכז המודל');
    }
    
    // הצגה/הסתרה של חצים לכיוונים
    toggleCoordinateAxes() {
        this.showCoordinateAxes = !this.showCoordinateAxes;
        
        if (this.showCoordinateAxes) {
            this.addCoordinateAxes();
        } else {
            this.removeCoordinateAxes();
        }
        
        this.debugLog('חצים לכיוונים:', this.showCoordinateAxes ? 'מוצגים' : 'מוסתרים');
    }
    
    // הסרת חצים מהסצנה
    private removeCoordinateAxes() {
        this.coordinateAxes.forEach(arrow => {
            this.scene.remove(arrow);
            // ניקוי זיכרון
            arrow.children.forEach(child => {
                if (child instanceof THREE.Mesh) {
                    child.geometry.dispose();
                    (child.material as THREE.Material).dispose();
                }
            });
        });
        this.coordinateAxes = [];
    }
    
    // יצירת חץ בודד
    private createArrow(length: number, color: number, label: string) {
        const group = new THREE.Group();
        
        // יצירת הגוף של החץ (צילינדר) - דק ועדין
        const shaftGeometry = new THREE.CylinderGeometry(0.2, 0.2, length - 1, 8); // קוטר קטן יותר (0.2 במקום 0.5)
        const shaftMaterial = new THREE.MeshBasicMaterial({ color: color });
        const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
        shaft.position.y = (length - 1) / 2; // מיקום הגוף - מתחיל מהמרכז
        group.add(shaft);
        
        // יצירת הראש של החץ (קונוס) - קטן ועדין
        const headGeometry = new THREE.ConeGeometry(0.3, 1, 8); // רדיוס קטן יותר (0.3) וגובה קטן יותר (1)
        const headMaterial = new THREE.MeshBasicMaterial({ color: color });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = length - 0.5; // מיקום הראש - מותאם לגובה החדש
        group.add(head);
        
        // הוספת טקסט לכיוון - רק אם יש label
        if (label && label.length > 0) {
            const canvas = document.createElement('canvas');
            canvas.width = 128;
            canvas.height = 64;
            const ctx = canvas.getContext('2d')!;
            // ללא רקע - שקוף
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            // טקסט בכחול (מותאם ל"כחול שלנו")
            ctx.fillStyle = '#1e90ff';
            ctx.font = 'bold 36px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, canvas.width / 2, canvas.height / 2);
            const texture = new THREE.CanvasTexture(canvas);
            const textMaterial = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide });
            const textGeometry = new THREE.PlaneGeometry(8, 4);
            const textMesh = new THREE.Mesh(textGeometry, textMaterial);
            textMesh.position.y = length + 2.5; // מעט מעל ראש החץ
            // הצמדת הטקסט לפנים המצלמה (Billboard) כדי שתמיד יהיה נראה, כולל עבור ציר Z
            textMesh.onBeforeRender = function(_renderer: any, _scene: any, camera: THREE.Camera) {
                // מעתיקים את הסיבוב של המצלמה, כך שהטקסט תמיד פונה אליה
                // @ts-ignore
                this.quaternion.copy((camera as any).quaternion);
            } as any;
            group.add(textMesh);
        }
        
        return group;
    }
    
    // פונקציות לכפתורי עריכה
    toggleBeamsEditOptions() {
        this.showBeamsEditOptions = !this.showBeamsEditOptions;
        if (this.showBeamsEditOptions) {
            this.saveOriginalBeamsState();
        } else {
            // איפוס המחירים הדינמיים כשסוגרים את תפריט העריכה
            this.resetDynamicPrices();
        }
    }
    
    toggleScrewsEditOptions() {
        this.showScrewsEditOptions = !this.showScrewsEditOptions;
        if (this.showScrewsEditOptions) {
            this.saveOriginalScrewsState();
        } else {
            // איפוס המחירים הדינמיים כשסוגרים את תפריט העריכה
            this.resetDynamicPrices();
        }
    }
    
    // שמירת מצב הקורות לפני עריכה
    private saveOriginalBeamsState() {
        
        this.originalBeamsData = JSON.parse(JSON.stringify(this.BeamsDataForPricing || []));
        
        // שמירת הכמויות המקוריות של הקורות
        this.originalBeamQuantities = [];
        if (this.BeamsDataForPricing) {
            this.BeamsDataForPricing.forEach((beam, index) => {
                const quantity = this.getFullBeamsCount(beam);
                this.originalBeamQuantities[index] = quantity;
            });
        }
        
        // שמירת מצב הברגים המקורי גם כן
        this.originalScrewsData = JSON.parse(JSON.stringify(this.screwsPackagingPlan || []));
        
        // שמירת המחירים המקוריים
        this.originalBeamsPrice = this.getBeamsOnlyPrice();
        this.originalCuttingPrice = this.getCuttingPrice();
        this.originalScrewsPrice = this.getScrewsPrice();
        
        // אתחול המחירים הדינמיים עם הערכים הנוכחיים
        this.dynamicBeamsPrice = this.originalBeamsPrice;
        this.dynamicCuttingPrice = this.originalCuttingPrice;
        this.dynamicScrewsPrice = this.originalScrewsPrice;
        
        // איפוס סטטוס השינויים
        this.hasBeamsChanged = false;
        this.hasScrewsChanged = false;
        
        
        // הדפסת הכמויות המקוריות לכל קורה
        if (this.originalBeamsData) {
            this.originalBeamsData.forEach((beam, index) => {
                const originalQuantity = this.getFullBeamsCount(beam);
            });
        }
        
    }
    
    // שמירת מצב הברגים לפני עריכה
    private saveOriginalScrewsState() {
        this.originalScrewsData = JSON.parse(JSON.stringify(this.screwsPackagingPlan || []));
        
        // שמירת המחירים המקוריים
        this.originalBeamsPrice = this.getBeamsOnlyPrice();
        this.originalCuttingPrice = this.getCuttingPrice();
        this.originalScrewsPrice = this.getScrewsPrice();
        
        // אתחול המחירים הדינמיים עם הערכים הנוכחיים
        this.dynamicBeamsPrice = this.originalBeamsPrice;
        this.dynamicCuttingPrice = this.originalCuttingPrice;
        this.dynamicScrewsPrice = this.originalScrewsPrice;
        
        // איפוס סטטוס השינויים
        this.hasBeamsChanged = false;
        this.hasScrewsChanged = false;
        
    }
    
    // קבלת רשימת קורות לעריכה
    getBeamsForEdit(): any[] {
        return this.BeamsDataForPricing || [];
    }
    
    // קבלת הכמות הכוללת של קורה (סכום כל החתיכות)
    getTotalBeamQuantity(beam: any): number {
        if (!beam || !beam.totalSizes) return 0;
        return beam.totalSizes.reduce((sum: number, size: any) => sum + size.count, 0);
    }
    
    // משתנה לבדיקה שהלוגים כבר הופעלו
    private beamDebugLogged = false;

    // קבלת האורך של הקורה במטרים (מהקורה הראשונה ב-cuttingPlan)
    getBeamLengthInMeters(beam: any): number {
        if (!this.beamDebugLogged) {
            this.beamDebugLogged = true;
        }
        
        // חיפוש הקורה ב-cuttingPlan כדי לקבל את האורך הנכון
        const beamInPlan = this.cuttingPlan?.find(plan => 
            plan.beamType === beam.beamTranslatedName
        );
        
        if (!this.beamDebugLogged && beamInPlan) {
        }
        
        if (beamInPlan) {
            return beamInPlan.beamLength / 100; // המרה מס"מ למטרים
        }
        
        // אם לא נמצא, נחזיר 0
        return 0;
    }
    
    // קבלת המחיר הנכון של הקורה השלמה (קבוע ולא משתנה)
    getBeamPrice(beam: any): number {
        // נחפש ב-cuttingPlan את האורך של הקורה השלמה
        const beamInPlan = this.cuttingPlan?.find(plan => 
            plan.beamType === beam.beamTranslatedName
        );
        
        if (beamInPlan) {
            // נחפש את המחיר לפי האורך של הקורה השלמה
            const beamLengthData = beam.type?.length?.find((l: any) => l.length === beamInPlan.beamLength);
            if (beamLengthData) {
                return beamLengthData.price; // המחיר הקבוע של הקורה השלמה
            }
        }
        
        // אם לא נמצא ב-cuttingPlan, נחזיר את המחיר הגבוה ביותר (כנראה הקורה הארוכה ביותר)
        if (beam.type?.length && beam.type.length.length > 0) {
            const maxPriceBeam = beam.type.length.reduce((max: any, current: any) => 
                current.price > max.price ? current : max
            );
            return maxPriceBeam.price;
        }
        
        // אם לא נמצא, נחזיר 0
        return 0;
    }
    
    // קבלת מספר הקורות השלמות (מספר הקורות שצריך לקנות)
    getFullBeamsCount(beam: any): number {
        if (!beam) return 0;
        
        // ספירת כל הקורות השלמות מכל הסוג הזה ב-cuttingPlan
        const allBeamsOfThisType = this.cuttingPlan?.filter(plan => 
            plan.beamType === beam.beamTranslatedName
        ) || [];
        
        if (!this.beamDebugLogged && allBeamsOfThisType.length > 0) {
        }
        
        // החזרת מספר הקורות השלמות
        return allBeamsOfThisType.length;
    }
    
    // קבלת רשימת ברגים לעריכה (קופסאות ברגים)
    getScrewsForEdit(): any[] {
        return this.screwsPackagingPlan || [];
    }
    
    // יצירת קורה חדשה מהמידע של beam
    private createBeamFromBeamData(beam: any): any {
        // חיפוש הקורה המקורית ב-cuttingPlan כדי לקבל את המידע המלא
        const originalBeam = this.cuttingPlan?.find(plan => 
            plan.beamType === beam.beamTranslatedName
        );
        
        if (originalBeam) {
            return originalBeam;
        }
        
        // אם לא נמצאה, נצור קורה חדשה מהמידע הזמין
        if (beam.totalSizes && beam.totalSizes.length > 0) {
            const firstSize = beam.totalSizes[0];
            const beamLength = firstSize.length;
            
            // חיפוש מחיר לפי האורך
            const beamLengthData = beam.type?.length?.find((l: any) => l.length === beamLength);
            const beamPrice = beamLengthData?.price || 0;
            
            return {
                beamNumber: 1,
                beamLength: beamLength,
                beamPrice: beamPrice,
                cuts: Array(firstSize.count).fill(beamLength),
                remaining: 0,
                waste: 0,
                beamType: beam.beamTranslatedName,
                beamWoodType: beam.beamWoodType,
                pricePerCut: beam.type?.pricePerCut || 0,
                numberOfCuts: firstSize.count,
                totalCuttingPrice: (beam.type?.pricePerCut || 0) * firstSize.count
            };
        }
        
        return null;
    }
    
    // בדיקה אם כל הקורות על 0
    private checkAllBeamsZero(): boolean {
        if (!this.BeamsDataForPricing) return false;
        
        for (let i = 0; i < this.BeamsDataForPricing.length; i++) {
            const beam = this.BeamsDataForPricing[i];
            const quantity = this.getFullBeamsCount(beam);
            if (quantity > 0) {
                return false;
            }
        }
        return true;
    }
    
    // בדיקה אם כל הברגים על 0
    private checkAllScrewsZero(): boolean {
        if (!this.screwsPackagingPlan) return false;
        
        for (let i = 0; i < this.screwsPackagingPlan.length; i++) {
            const screw = this.screwsPackagingPlan[i];
            if (screw.numPackages > 0) {
                return false;
            }
        }
        return true;
    }
    
    // עדכון כמות קורה
    updateBeamQuantity(beamIndex: number, newQuantity: number) {
        
        if (!this.BeamsDataForPricing || beamIndex < 0 || beamIndex >= this.BeamsDataForPricing.length) {
            return;
        }
        
        // עדכון הכמות
        const beam = this.BeamsDataForPricing[beamIndex];
        const oldQuantity = this.getFullBeamsCount(beam);
        
            
            // חישוב ההפרש
            const difference = newQuantity - oldQuantity;
            
            if (difference !== 0) {
            // עדכון ה-cuttingPlan ישירות
            let allBeamsOfThisType = this.cuttingPlan?.filter(plan => 
                plan.beamType === beam.beamTranslatedName
            ) || [];
            
            if (difference > 0) {
                // הוספת קורות
                let templateBeam = allBeamsOfThisType[0];
                
                // אם אין קורות קיימות, נצור קורה חדשה מהמידע של beam
                if (!templateBeam) {
                    templateBeam = this.createBeamFromBeamData(beam);
                }
                
                if (templateBeam) {
                    for (let i = 0; i < difference; i++) {
                        const newBeam = JSON.parse(JSON.stringify(templateBeam));
                        newBeam.beamNumber = this.cuttingPlan.length + 1;
                        this.cuttingPlan.push(newBeam);
                    }
                    
                    // עדכון מחיר
                    const beamPrice = templateBeam.beamPrice;
                    const priceDifference = difference * beamPrice;
                    this.updatePriceLocally('beam', beam, priceDifference);
                }
                
                // אם הקורות לא היו מופעלות והוספנו קורה, נפעיל אותן
                if (!this.isBeamsEnabled && oldQuantity === 0) {
                    this.isBeamsEnabled = true;
                }
            } else {
                // הסרת קורות
                const beamsToRemove = Math.abs(difference);
                for (let i = 0; i < beamsToRemove && allBeamsOfThisType.length > 0; i++) {
                    const lastBeam = allBeamsOfThisType[allBeamsOfThisType.length - 1];
                    const index = this.cuttingPlan.indexOf(lastBeam);
                    if (index > -1) {
                        this.cuttingPlan.splice(index, 1);
                        allBeamsOfThisType.splice(allBeamsOfThisType.length - 1, 1);
                    }
                }
                
                // עדכון מחיר
                if (allBeamsOfThisType.length > 0) {
                    const beamPrice = allBeamsOfThisType[0].beamPrice;
                    const priceDifference = difference * beamPrice;
                    this.updatePriceLocally('beam', beam, priceDifference);
                } else {
                    // אם אין קורות מהסוג הזה, עדיין צריך לעדכן את המחיר
                    // נשתמש במחיר מהנתונים המקוריים
                    const originalBeam = this.originalBeamsData.find(b => b.beamTranslatedName === beam.beamTranslatedName);
                    if (originalBeam) {
                        // נמצא קורה דומה ב-cuttingPlan המקורי
                        const similarBeam = this.cuttingPlan.find(plan => plan.beamType === beam.beamTranslatedName);
                        if (similarBeam) {
                            const beamPrice = similarBeam.beamPrice;
                            const priceDifference = difference * beamPrice;
                            this.updatePriceLocally('beam', beam, priceDifference);
                        } else {
                            // אם לא נמצא, נשתמש במחיר מהנתונים המקוריים
                            // נחשב מחיר על בסיס המחיר המקורי
                            const originalPrice = this.originalBeamsPrice;
                            const pricePerBeam = originalPrice / this.originalBeamQuantities.reduce((sum, q) => sum + q, 0);
                            const priceDifference = difference * pricePerBeam;
                            this.updatePriceLocally('beam', beam, priceDifference);
                        }
                    }
                }
                
                // בדיקה אם זה היה המעבר מ-1 ל-0
                if (oldQuantity === 1 && newQuantity === 0) {
                    // בדיקה אם כל הקורות על 0
                    if (this.checkAllBeamsZero()) {
                        this.isBeamsEnabled = false;
                        this.showBeamsEditOptions = false; // סגירת איזור עריכת קורות
                    }
                }
            }
            
            // עדכון סטטוס החיתוך בכל שינוי כמות
            this.updateCuttingStatus();
        }
    }
    
    // עדכון כמות קופסאות ברגים
    updateScrewQuantity(screwIndex: number, newQuantity: number) {
        if (!this.screwsPackagingPlan || screwIndex < 0 || screwIndex >= this.screwsPackagingPlan.length) {
            return;
        }
        
        // חישוב ההפרש לפני העדכון
        const screw = this.screwsPackagingPlan[screwIndex];
        const oldQuantity = screw.numPackages;
        const difference = newQuantity - oldQuantity;
        
        // עדכון כמות הקופסאות
        screw.numPackages = Math.max(0, newQuantity);
        
        // עדכון מקומי של המחיר
        this.updatePriceLocally('screw', screw, difference);
        
        // בדיקה אם זה היה המעבר מ-1 ל-0
        if (oldQuantity === 1 && newQuantity === 0) {
            // בדיקה אם כל הברגים על 0
            if (this.checkAllScrewsZero()) {
                this.isScrewsEnabled = false;
                this.showScrewsEditOptions = false; // סגירת איזור עריכת ברגים
            }
        }
        
        // אם הברגים לא היו מופעלים והוספנו ברג, נפעיל אותם
        if (difference > 0 && !this.isScrewsEnabled && oldQuantity === 0) {
            this.isScrewsEnabled = true;
        }
    }
    
    // בדיקה אם הכמויות מספיקות לחיתוך
    private checkCuttingPossibility(): boolean {
        
        if (!this.originalBeamsData || !this.BeamsDataForPricing) {
            return true;
        }
        
        
        // בדיקה אם יש סוג קורה שהכמות הנוכחית שלו קטנה מהכמות המקורית הנדרשת
        for (let i = 0; i < this.BeamsDataForPricing.length; i++) {
            const currentBeam = this.BeamsDataForPricing[i];
            
            // הכמות הנוכחית של הקורות השלמות (מה שהמשתמש רואה באינפוט)
            const currentQuantity = this.getFullBeamsCount(currentBeam);
            // הכמות המקורית הנדרשת (מספר הקורות שהיו נדרשות לחיתוך)
            const originalQuantity = this.originalBeamQuantities[i] || 0;
            
            
            if (currentQuantity < originalQuantity) {
                return false; // לא ניתן לבצע חיתוך
            }
        }
        
        return true; // ניתן לבצע חיתוך
    }
    
    // עדכון סטטוס החיתוך
    private updateCuttingStatus() {
        const wasPossible = this.isCuttingPossible;
        this.isCuttingPossible = this.checkCuttingPossibility();
        
        
        // אם החיתוך לא אפשרי יותר, נבטל אותו
        if (!this.isCuttingPossible && this.isCuttingEnabled) {
            this.isCuttingEnabled = false;
            // לא משנים את המחיר - הוא נשאר קבוע!
        }
        
        // אם החיתוך הפך לאפשרי שוב, נפעיל אותו (רק אם קורות מופעלות)
        if (this.isCuttingPossible && !this.isCuttingEnabled && this.isBeamsEnabled) {
            this.isCuttingEnabled = true;
            // לא משנים את המחיר - הוא נשאר קבוע!
        }
    }
    
    // איפוס המחירים הדינמיים (רק כשעושים חישוב מחדש מלא)
    private resetDynamicPrices() {
        // רק אם לא פותחים תפריט עריכה חדש
        if (!this.showBeamsEditOptions && !this.showScrewsEditOptions) {
            this.dynamicBeamsPrice = 0;
            this.dynamicCuttingPrice = 0;
            this.dynamicScrewsPrice = 0;
            this.hasBeamsChanged = false;
            this.hasScrewsChanged = false;
        }
    }
    
    // פונקציות לקבלת המחירים המקוריים והחדשים
    getOriginalBeamsPrice(): number {
        return this.originalBeamsPrice;
    }
    
    
    getOriginalScrewsPrice(): number {
        return this.originalScrewsPrice;
    }
    
    getHasBeamsChanged(): boolean {
        return this.hasBeamsChanged;
    }
    
    getHasScrewsChanged(): boolean {
        return this.hasScrewsChanged;
    }
    
    // עדכון מקומי של המחיר על בסיס שינוי כמות
    private updatePriceLocally(type: 'beam' | 'screw', item: any, quantityDifference: number) {
        if (quantityDifference === 0) return;
        
        
        let pricePerUnit = 0;
        
        if (type === 'beam') {
            // עדכון המחיר הספציפי של קורות (רק עץ, לא חיתוך)
            const oldBeamsPrice = this.dynamicBeamsPrice;
            
            // quantityDifference כבר מכיל את ההפרש במחיר (לא בכמות)
            const beamsPriceDifference = quantityDifference;
            
            this.dynamicBeamsPrice = Math.round((Math.max(0, this.dynamicBeamsPrice + beamsPriceDifference)) * 100) / 100;
            
            // סימון שיש שינויים בקורות
            this.hasBeamsChanged = true;
            
            
        } else if (type === 'screw') {
            // מחיר לקופסת ברגים
            
            pricePerUnit = item.optimalPackage?.price || 0;
            
            // עדכון המחיר הספציפי של ברגים
            this.dynamicScrewsPrice = Math.round((Math.max(0, this.dynamicScrewsPrice + (quantityDifference * pricePerUnit))) * 100) / 100;
            
            // סימון שיש שינויים בברגים
            this.hasScrewsChanged = true;
            
        }
        
        // חישוב ההפרש במחיר
        const priceDifference = quantityDifference * pricePerUnit;
        
        // עדכון המחיר הכולל
        this.calculatedPrice = Math.round((Math.max(0, this.calculatedPrice + priceDifference)) * 100) / 100;
        
        // אילוץ Angular לעדכן את התצוגה
        this.cdr.detectChanges();
        
    }
    
    // פונקציה ליצירת קורות בסיס מיטה
    private createFutonBeams() {
        console.log('CHECK_FUTON_LEG - createFutonBeams נקראה!');
        this.debugLog('יצירת קורות בסיס מיטה...');
        
        // קבלת פרמטרים
        const widthParam = this.getParam('width');
        const depthParam = this.getParam('depth');
        const plataParam = this.getParam('plata');
        const legParam = this.getParam('leg');
        
        console.log('CHECK_FUTON_LEG - פרמטרים:', JSON.stringify({
            hasWidthParam: !!widthParam,
            hasDepthParam: !!depthParam,
            hasPlataParam: !!plataParam,
            hasLegParam: !!legParam
        }, null, 2));
        
        if (!widthParam || !depthParam || !plataParam || !legParam) {
            console.warn('CHECK_FUTON_LEG - חסרים פרמטרים לבסיס מיטה:', {
                widthParam: !!widthParam,
                depthParam: !!depthParam,
                plataParam: !!plataParam,
                legParam: !!legParam
            });
            return;
        }
        
        const futonWidth = depthParam.default;  // החלפה: width = depth
        const futonDepth = widthParam.default;   // החלפה: depth = width
        
        // קבלת מידות קורת הפלטה
        let plataBeam = null;
        let plataType = null;
        if (plataParam.beams && plataParam.beams.length > 0) {
            const plataBeamIndex = this.getBeamIndexByDefaultType(plataParam);
            plataBeam = plataParam.beams[plataBeamIndex];
            plataType = plataBeam.types && plataBeam.types.length 
                ? plataBeam.types[plataParam.selectedTypeIndex || 0] 
                : null;
        }
        
        // קבלת מידות קורת הרגל
        let legBeam = null;
        let legType = null;
        if (legParam.beams && legParam.beams.length > 0) {
            const legBeamIndex = this.getBeamIndexByDefaultType(legParam);
            legBeam = legParam.beams[legBeamIndex];
            legType = legBeam.types && legBeam.types.length 
                ? legBeam.types[legParam.selectedTypeIndex || 0] 
                : null;
        }
        
        if (!plataBeam || !legBeam) {
            console.warn('חסרות קורות לבסיס מיטה');
            return;
        }
        
        // המרת מידות ממ"מ לס"מ
        const plataBeamWidth = plataBeam.width / 10;
        const plataBeamHeight = plataBeam.height / 10;
        const legBeamWidth = legBeam.width / 10;
        const legBeamHeight = legBeam.height / 10;
        
        // חישוב גובה הפלטה - רוחב קורת הרגל מעל הקרקע
        const platformHeight = legBeamWidth;
        
        this.debugLog('מידות בסיס מיטה:', {
            width: futonWidth,
            depth: futonDepth,
            platformHeight: platformHeight,
            plataBeam: { width: plataBeamWidth, height: plataBeamHeight },
            legBeam: { width: legBeamWidth, height: legBeamHeight },
            minGap: this.minGap
        });
        
        // יצירת קורות הפלטה (דומה לשולחן)
        const surfaceBeams = this.createSurfaceBeams(
            futonWidth,
            futonDepth,
            plataBeamWidth,
            plataBeamHeight,
            this.minGap
        );
        
        this.debugLog('🔍 FUTON 3D: surfaceBeams.length =', surfaceBeams.length, 'with params:', {
            futonWidth,
            futonDepth,
            plataBeamWidth,
            plataBeamHeight,
            minGap: this.minGap
        });
        
        for (let i = 0; i < surfaceBeams.length; i++) {
            const beam = { ...surfaceBeams[i] };
            const geometry = new THREE.BoxGeometry(
                beam.width,
                beam.height,
                beam.depth
            );
            const material = this.getWoodMaterial(plataType ? plataType.name : '');
            const mesh = new THREE.Mesh(geometry, material);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.addWireframeToBeam(mesh);
            
            // מיקום הפלטה בגובה של רוחב קורת הרגל
            mesh.position.set(beam.x, platformHeight + beam.height / 2, 0);
            this.scene.add(mesh);
            this.beamMeshes.push(mesh);
            
            this.debugLog(`קורת פלטה ${i + 1} - X: ${beam.x}, Y: ${platformHeight + beam.height / 2}, Z: 0`);
        }
        
        this.debugLog('קורות הפלטה נוצרו בהצלחה');
        
        // יצירת קורות הרגליים
        const extraBeamParam = this.getParam('extraBeam');
        if (extraBeamParam && extraBeamParam.default > 0) {
            const legCount = extraBeamParam.default;
            this.debugLog(`יצירת ${legCount} קורות רגליים...`);
            
            // 🎯 לוג בדיקה - הגעה ליצירת קורות רגל
            console.log('CHECK_FUTON_LEG - מתחיל ליצור קורות רגל:', JSON.stringify({
                legCount: legCount,
                legBeamExists: !!legBeam,
                legBeamWidth: legBeamWidth,
                legBeamHeight: legBeamHeight,
                futonWidth: futonWidth,
                futonDepth: futonDepth
            }, null, 2));
            
            // חישוב רווחים - 5 ס"מ מכל קצה
            const totalLength = futonDepth;
            const availableLength = totalLength - 10; // 5 ס"מ מכל קצה
            const spacing = legCount > 1 ? availableLength / (legCount - 1) : 0;
            
            // מערך לשמירת מיקומי הרגליים (Z positions)
            const legPositions: number[] = [];
            
            this.debugLog('חישוב רווחי רגליים:', {
                totalLength,
                availableLength,
                legCount,
                spacing
            });
            
            // יצירת קורות הרגליים
            for (let i = 0; i < legCount; i++) {
                // 🎯 תיקון: החלפה בין width ו-height - הקורה צריכה להיות עומדת ולא שוכבת
                const geometry = new THREE.BoxGeometry(
                    futonWidth,    // אורך הקורה = רוחב המיטה (ציר X) - נשאר אותו דבר
                    legBeamWidth,  // גובה הקורה (ציר Y) - הוחלף מ-legBeamHeight ל-legBeamWidth
                    legBeamHeight // רוחב הקורה (ציר Z) - הוחלף מ-legBeamWidth ל-legBeamHeight
                );
                
                // 🎯 לוג חד פעמי ברגע שנוצרת קורת הרגל
                if (!this.futonLegBeamLogged && legBeam) {
                    console.log('CHECK_FUTON_LEG - קורת רגל נוצרת:', JSON.stringify({
                        legIndex: i + 1,
                        geometryDimensions: {
                            x: futonWidth,        // אורך הקורה (ציר X)
                            y: legBeamWidth,      // גובה הקורה (ציר Y) - תוקן!
                            z: legBeamHeight      // רוחב הקורה (ציר Z) - תוקן!
                        },
                        legBeamData: {
                            width: legBeam.width,      // רוחב במ"מ
                            height: legBeam.height,    // גובה במ"מ
                            widthCm: legBeamWidth,     // רוחב בס"מ
                            heightCm: legBeamHeight    // גובה בס"מ
                        },
                        legBeamName: legBeam.name,
                        legBeamTranslatedName: legBeam.translatedName,
                        fixNote: "תיקון: y=legBeamWidth (15), z=legBeamHeight (3.5) במקום ההפך"
                    }, null, 2));
                    this.futonLegBeamLogged = true;
                }
                
                const material = this.getWoodMaterial(legType ? legType.name : '');
                const mesh = new THREE.Mesh(geometry, material);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                this.addWireframeToBeam(mesh);
                
                // חישוב מיקום Z - מתחיל ב-5 ס"מ מהקצה
                const zPosition = -totalLength / 2 + 5 + (i * spacing);
                
                // שמירת מיקום הרגל למערך
                legPositions.push(zPosition);
                
                // מיקום הרגל - צמודה למטה (Y=0) + חצי גובה הקורה (כעת legBeamWidth במקום legBeamHeight)
                mesh.position.set(0, legBeamWidth / 2, zPosition);
                this.scene.add(mesh);
                this.beamMeshes.push(mesh);
                
                this.debugLog(`רגל ${i + 1} - X: 0, Y: ${legBeamHeight / 2}, Z: ${zPosition}, אורך: ${futonWidth}ס"מ`);
            }
            
            this.debugLog(`${legCount} קורות רגליים נוצרו בהצלחה`);
            
            // יצירת ברגים - 2 ברגים בכל מפגש של קורת פלטה עם רגל
            this.debugLog(`יצירת ברגים למיטה: ${surfaceBeams.length} קורות פלטה × ${legCount} רגליים × 2 ברגים = ${surfaceBeams.length * legCount * 2} ברגים`);
            
            // אורך הבורג = גובה קורת הפלטה + 3
            const screwLength = this.calculateScrewLength('futon', plataBeamHeight);
            
            // עבור כל קורת פלטה
            for (let beamIndex = 0; beamIndex < surfaceBeams.length; beamIndex++) {
                const beam = surfaceBeams[beamIndex];
                
                // עבור כל רגל
                for (let legIndex = 0; legIndex < legPositions.length; legIndex++) {
                    const legZ = legPositions[legIndex];
                    
                    // 2 ברגים לכל מפגש - מרווחים ב-25% מרוחב קורת הפלטה (ציר X)
                    const offset = plataBeamWidth * 0.25; // 25% מרוחב קורת הפלטה
                    const screwOffsets = [-offset, offset];
                    
                    for (let screwIndex = 0; screwIndex < 2; screwIndex++) {
                        const screwXOffset = screwOffsets[screwIndex];
                        
                        // יצירת הבורג
                        const screwGroup = this.createScrewGeometry(screwLength);
                        
                        // מיקום הבורג: X = מיקום הקורה ± offset, Y = מעל הפלטה, Z = על הרגל
                        const screwX = beam.x + screwXOffset;
                        const screwY = platformHeight + plataBeamHeight; // מעל קורת הפלטה
                        const screwZ = legZ;
                        
                        screwGroup.position.set(screwX, screwY, screwZ);
                        
                        // סיבוב הבורג כך שיכוון מלמעלה למטה (ציר Y)
                        // ברורג מצביע כלפי מטה אז אין צורך בסיבוב נוסף
                        
                        this.scene.add(screwGroup);
                        this.screwGroups.push(screwGroup); // שמירת הבורג למחיקה מאוחר יותר
                    }
                }
            }
            
            this.debugLog('ברגי מיטה נוצרו בהצלחה');
        } else {
            this.debugLog('לא נמצא פרמטר extraBeam או ערך 0 - לא נוצרות רגליים');
        }
    }

    /**
     * בדיקה האם פרמטרים בסיסיים של המוצר השתנו מהמוצר המקורי
     */
    private hasProductParametersChanged(): boolean {
        // לוג חד פעמי בלבד כדי למנוע לוגים אינסופיים
        if (!this.paramChangedLogged) {
            console.log('CHECK_IS_MODIFIED - hasProductParametersChanged called (first time only)');
            console.log('CHECK_IS_MODIFIED - originalProductParams:', JSON.stringify(this.originalProductParams?.map(p => ({ 
                name: p.name, 
                default: p.default, 
                isVisual: p.isVisual,
                selectedBeamIndex: p.selectedBeamIndex,
                selectedTypeIndex: p.selectedTypeIndex
            })) || []));
            console.log('CHECK_IS_MODIFIED - current params:', JSON.stringify(this.params?.map(p => ({ 
                name: p.name, 
                default: p.default, 
                isVisual: p.isVisual,
                selectedBeamIndex: p.selectedBeamIndex,
                selectedTypeIndex: p.selectedTypeIndex
            })) || []));
            
            // CHECK_SHELF_BEAM: לוג מפורט על shelfs ב-CHECK_IS_MODIFIED
            const originalShelfs = this.originalProductParams?.find(p => p.name === 'shelfs');
            const currentShelfs = this.params?.find(p => p.name === 'shelfs');
            if (originalShelfs || currentShelfs) {
                console.log(`CHECK_SHELF_BEAM - CHECK_IS_MODIFIED: shelfs comparison:`, JSON.stringify({
                    originalSelectedBeamIndex: originalShelfs?.selectedBeamIndex,
                    originalSelectedTypeIndex: originalShelfs?.selectedTypeIndex,
                    currentSelectedBeamIndex: currentShelfs?.selectedBeamIndex,
                    currentSelectedTypeIndex: currentShelfs?.selectedTypeIndex,
                    changed: originalShelfs?.selectedBeamIndex !== currentShelfs?.selectedBeamIndex
                }, null, 2));
            }
            
            this.paramChangedLogged = true;
        }
        
        if (!this.originalProductParams || this.originalProductParams.length === 0) {
            return false;
        }

        
        // לוג מפורט של כל פרמטר
        this.originalProductParams.forEach((originalParam: any, index: number) => {
            const currentParam = this.params[index];
        });

        // בדיקה אם הפרמטרים הבסיסיים השתנו
        for (const originalParam of this.originalProductParams) {
            const currentParam = this.params.find(p => p.name === originalParam.name);
            
            if (!currentParam) {
                continue;
            }

            // דילוג על פרמטרים ויזואליים בלבד (לא משפיעים על סטטוס "מקורי")
            if (originalParam.isVisual === true || currentParam.isVisual === true) {
                continue;
            }

            // בדיקת ערך פרמטר - עם טיפול מיוחד במערכים (beamArray)
            if (Array.isArray(originalParam.default) || Array.isArray(currentParam.default)) {
                // בדיקה מיוחדת עבור מערכים (כמו מדפים)
                const originalArray = Array.isArray(originalParam.default) ? originalParam.default : [];
                const currentArray = Array.isArray(currentParam.default) ? currentParam.default : [];
                
                // בדיקת אורך המערכים
                if (originalArray.length !== currentArray.length) {
                    return true;
                }
                
                // בדיקת תוכן המערכים
                for (let i = 0; i < originalArray.length; i++) {
                    if (originalArray[i] !== currentArray[i]) {
                        return true;
                    }
                }
            } else {
                // בדיקה רגילה עבור ערכים יחידים - עם טיפול ב-undefined
                let originalValue = originalParam.default;
                let currentValue = currentParam.default;
                
                // עבור ערכים מספריים - המרה לפלואט אם אפשר
                if (typeof originalValue === 'string') {
                    const parsedOriginal = parseFloat(originalValue);
                    if (!isNaN(parsedOriginal)) originalValue = parsedOriginal;
                }
                
                if (typeof currentValue === 'string') {
                    const parsedCurrent = parseFloat(currentValue);
                    if (!isNaN(parsedCurrent)) currentValue = parsedCurrent;
                }

                if (originalValue !== currentValue) {
                    return true;
                }
            }

            // בדיקת אינדקס קורה
            if (originalParam.selectedBeamIndex !== undefined || currentParam.selectedBeamIndex !== undefined) {
                const originalBeamIndex = originalParam.selectedBeamIndex || 0;
                const currentBeamIndex = currentParam.selectedBeamIndex || 0;
                
                // CHECK_SHELF_BEAM: לוג בבדיקת השינוי ב-selectedBeamIndex (רק פעם אחת כדי למנוע לולאה אינסופית)
                // הלוג זה כבר מוגבל בלוג הראשי, אז לא צריך לוג נוסף כאן - זה גורם ללולאה אינסופית
                
                if (originalBeamIndex !== currentBeamIndex) {
                    return true;
                }
            }

            // בדיקת אינדקס סוג קורה
            if (originalParam.selectedTypeIndex !== undefined || currentParam.selectedTypeIndex !== undefined) {
                const originalTypeIndex = originalParam.selectedTypeIndex || 0;
                const currentTypeIndex = currentParam.selectedTypeIndex || 0;
                
                if (originalTypeIndex !== currentTypeIndex) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * פונקציה לעדכון פרמטרים לפי דגם משנה (configuration)
     */
    private updateParamsWithConfiguration(params: any[], configIndex: number, product: any): any[] {
        console.log(`SAVE_PRO - Loading configurations for product: ${product.translatedName} (config #${configIndex})`);
        
        // 🎯 לוג מיוחד עבור leg parameter
        const legParam = params.find(p => p.name === 'leg');
        if (legParam) {
            console.log(`CHECK_LEG - updateParamsWithConfiguration: Processing leg param`);
            console.log(`CHECK_LEG - leg param before configuration update:`, JSON.stringify(legParam, null, 2));
        }
        
        // 🎯 CHECK_SHELF_BEAM: לוג מיוחד עבור shelfs parameter
        const shelfsParam = params.find(p => p.name === 'shelfs');
        if (shelfsParam) {
            console.log(`CHECK_SHELF_BEAM - updateParamsWithConfiguration: Processing shelfs param`);
            console.log(`CHECK_SHELF_BEAM - shelfs param before configuration update:`, JSON.stringify({
                name: shelfsParam.name,
                type: shelfsParam.type,
                configIndex: configIndex,
                beamsConfigurations: shelfsParam.beamsConfigurations,
                beamConfigAtIndex: shelfsParam.beamsConfigurations?.[configIndex] || 'NO_BEAM_CONFIG',
                selectedBeamIndex: shelfsParam.selectedBeamIndex,
                selectedTypeIndex: shelfsParam.selectedTypeIndex,
                hasBeams: !!shelfsParam.beams,
                beamsLength: shelfsParam.beams?.length || 0,
                beams: shelfsParam.beams?.map((b: any, idx: number) => ({
                    index: idx,
                    name: b?.name,
                    width: b?.width,
                    height: b?.height,
                    translatedName: b?.translatedName
                })) || []
            }, null, 2));
        }
        
        console.log(`SAVE_PRO - Input params before configuration update:`, JSON.stringify(params.map(p => ({
            name: p.name,
            hasConfigurations: !!p.configurations,
            configurationsLength: p.configurations?.length || 0,
            configAtIndex: p.configurations?.[configIndex] || 'NO_CONFIG',
            isArrayConfig: Array.isArray(p.configurations?.[configIndex]),
            // עוד פרטים עבור beamSingle:
            hasBeamsConfigurations: !!p.beamsConfigurations,
            beamsConfigurationsLength: p.beamsConfigurations?.length || 0,
            beamConfigAtIndex: p.beamsConfigurations?.[configIndex] || 'NO_BEAM_CONFIG',
            hasBeams: !!p.beams,
            beamsLength: p.beams?.length || 0
        })), null, 2));
        
        const result = params.map((param: any) => {
            const updatedParam = { ...param };
            
            // עדכון default לפי configurations - עבור beamArray ופרמטרים רגילים
            if (param.configurations && param.configurations[configIndex] !== undefined) {
                console.log(`SAVE_PRO - Loading saved value for ${param.name}:`, JSON.stringify({
                    from: param.default,
                    to: param.configurations[configIndex],
                    isArray: Array.isArray(param.configurations[configIndex])
                }, null, 2));
                updatedParam.default = param.configurations[configIndex];
            } else {
                console.log(`SAVE_PRO - No saved configuration for ${param.name} at index ${configIndex}`);
            }
            
            // עדכון beamsConfigurations - מציאת אינדקס הקורה הנכונה
            if (param.beamsConfigurations && param.beamsConfigurations[configIndex]) {
                const beamConfigStr = param.beamsConfigurations[configIndex]; // e.g., "50-25"
                console.log(`SAVE_PRO - Loading beam configuration for ${param.name}: ${beamConfigStr}`);
                
                // 🎯 לוג מיוחד עבור קורת הרגל
                if (param.name === 'leg') {
                    console.log(`CHECK_LEG - updateParamsWithConfiguration: Found beamsConfiguration for leg param`);
                    console.log(`CHECK_LEG - leg beamConfigStr: ${beamConfigStr}`);
                    console.log(`CHECK_LEG - leg beamsConfigurations array:`, JSON.stringify(param.beamsConfigurations));
                    console.log(`CHECK_LEG - leg configIndex: ${configIndex}`);
                    console.log(`CHECK_LEG - leg beams ObjectIds:`, JSON.stringify(param.beams));
                }
                
                console.log(`SAVE_PRO - Will set selectedBeamIndex/selectedTypeIndex based on: ${beamConfigStr}`);
                
                // 🎯 תיקון: קביעת selectedBeamIndex עבור beamArray (shelfs) כאן!
                if (param.name === 'shelfs' && param.beams && Array.isArray(param.beams) && param.beams.length > 0) {
                    console.log(`CHECK_SHELF_BEAM - updateParamsWithConfiguration: Starting shelfs beam search`);
                    console.log(`CHECK_SHELF_BEAM - Shelfs in updateParamsWithConfiguration: hasBeams=${!!param.beams}, beamsLength=${param.beams.length}, beamConfigStr=${beamConfigStr}`);
                    const [width, height] = beamConfigStr.split('-').map(num => parseInt(num, 10));
                    console.log(`CHECK_SHELF_BEAM - Searching for shelfs beam: ${width}-${height} in ${param.beams.length} beams`);
                    
                    // בדיקה אם beams הם אובייקטים עם width/height או ObjectIds
                    const firstBeam = param.beams[0];
                    const isPopulated = firstBeam && typeof firstBeam === 'object' && firstBeam !== null && 'width' in firstBeam;
                    
                    console.log(`SAVE_PRO - shelfs beams are ${isPopulated ? 'POPULATED (objects)' : 'NOT POPULATED (ObjectIds)'}, firstBeam type: ${typeof firstBeam}`);
                    if (firstBeam) {
                        console.log(`SAVE_PRO - shelfs firstBeam keys:`, Object.keys(firstBeam));
                    }
                    
                    if (isPopulated) {
                        // beams כבר populated - אפשר לחפש ישירות
                        console.log(`SAVE_PRO - Searching in populated beams for ${width}-${height}`);
                        const foundBeamIndex = param.beams.findIndex((beam: any) => {
                            if (!beam || typeof beam !== 'object') return false;
                            const matches = beam.width === width && beam.height === height;
                            if (matches) {
                                console.log(`SAVE_PRO - ✅ Found match at index ${param.beams.indexOf(beam)}: ${beam.name} (${beam.width}-${beam.height})`);
                            }
                            return matches;
                        });
                        
                    if (foundBeamIndex !== -1) {
                        updatedParam.selectedBeamIndex = foundBeamIndex;
                        updatedParam.selectedTypeIndex = 0; // ברירת מחדל
                            console.log(`CHECK_SHELF_BEAM - ✅ updateParamsWithConfiguration: Set shelfs selectedBeamIndex to ${foundBeamIndex} based on ${beamConfigStr}`);
                            console.log(`CHECK_SHELF_BEAM - Updated param state:`, JSON.stringify({
                                selectedBeamIndex: updatedParam.selectedBeamIndex,
                                selectedTypeIndex: updatedParam.selectedTypeIndex,
                                beamConfigStr: beamConfigStr,
                                configIndex: configIndex
                            }, null, 2));
                            // לא נשאיר _pendingBeamConfig כי מצאנו את הקורה
                            delete updatedParam._pendingBeamConfig;
                        } else {
                            console.log(`CHECK_SHELF_BEAM - ❌ updateParamsWithConfiguration: Could not find shelfs beam ${beamConfigStr} (${width}-${height}) in populated beams, will use _pendingBeamConfig`);
                            console.log(`CHECK_SHELF_BEAM - Available beams:`, JSON.stringify(param.beams.map((b: any) => `${b.name} (${b.width}-${b.height})`), null, 2));
                            updatedParam._pendingBeamConfig = beamConfigStr;
                        }
                    } else {
                        // beams לא populated - נשתמש ב-_pendingBeamConfig ונטפל בשלב הבא
                        console.log(`CHECK_SHELF_BEAM - updateParamsWithConfiguration: shelfs beams not populated, setting _pendingBeamConfig: ${beamConfigStr}`);
                        updatedParam._pendingBeamConfig = beamConfigStr;
                    }
                } else if (param.name === 'shelfs') {
                    // גם אם אין beams או shelfs לא מוגדר נכון, נשמור את beamConfigStr
                    console.log(`SAVE_PRO - Shelfs but no beams array or empty, setting _pendingBeamConfig: ${beamConfigStr}`);
                    updatedParam._pendingBeamConfig = beamConfigStr;
                }
                
                // עבור beamSingle - תמיד נשתמש ב-_pendingBeamConfig
                if (param.type === 'beamSingle') {
                updatedParam._pendingBeamConfig = beamConfigStr;
                }
            } else {
                console.log(`SAVE_PRO - Skipping beam configuration for ${param.name}:`, JSON.stringify({
                    hasBeamsConfigurations: !!param.beamsConfigurations,
                    hasConfigAtIndex: !!param.beamsConfigurations?.[configIndex],
                    hasBeams: !!param.beams,
                    beamsLength: param.beams?.length || 0
                }, null, 2));
                
                // 🎯 לוג מיוחד עבור קורת הרגל כשלא מוצאים beamsConfiguration
                if (param.name === 'leg') {
                    console.log(`CHECK_LEG - updateParamsWithConfiguration: NO beamsConfiguration found for leg`);
                    console.log(`CHECK_LEG - leg param full object:`, JSON.stringify(param, null, 2));
                }
            }
            
            return updatedParam;
        });
        
        console.log(`SAVE_PRO - Result after configuration update:`, JSON.stringify(result.map(p => ({
            name: p.name,
            default: p.default,
            isArray: Array.isArray(p.default)
        })), null, 2));
        
        // 🎯 לוג מיוחד עבור leg parameter - תוצאה סופית
        const legResultParam = result.find(p => p.name === 'leg');
        if (legResultParam) {
            console.log(`CHECK_LEG - updateParamsWithConfiguration: leg param AFTER configuration update`);
            console.log(`CHECK_LEG - leg param result:`, JSON.stringify(legResultParam, null, 2));
            console.log(`CHECK_LEG - leg _pendingBeamConfig:`, legResultParam._pendingBeamConfig);
        }
        
        return result;
    }

    /**
     * פונקציה ליצירת deep copy של פרמטרים
     */
    private deepCopyParams(params: any[]): any[] {
        return JSON.parse(JSON.stringify(params));
    }
    
    // 🎯 פונקציה לבדיקת leg parameter בזמן render של ה-UI
    logLegParam(param: any): string {
        if (param.name === 'leg') {
            console.log(`CHECK_LEG - UI RENDER: leg selectedBeamIndex = ${param.selectedBeamIndex}`);
            console.log(`CHECK_LEG - UI RENDER: leg beam name = ${param.beams[param.selectedBeamIndex]?.translatedName}`);
            console.log(`CHECK_LEG - UI RENDER: param object ID = ${param._id || 'NO_ID'}`);
            console.log(`CHECK_LEG - UI RENDER: has _pendingBeamConfig = ${!!param._pendingBeamConfig}`);
            
            // בדיקה אם יש mismatch בין הערכים
            if (param.selectedBeamIndex === 0 && param.beams[2]?.name === '50-25') {
                console.log(`CHECK_LEG - UI RENDER: MISMATCH DETECTED! Should be index 2 (${param.beams[2]?.translatedName}), but showing index 0 (${param.beams[0]?.translatedName})`);
            }
        }
        return ''; // החזרת מחרוזת ריקה כדי שלא יופיע כלום ב-UI
    }
    
    // 🎯 תיקון זמני לבעיית leg parameter
    private fixLegParameterIfNeeded(): void {
        if (this.params) {
            const legParam = this.params.find(p => p.name === 'leg');
            if (legParam) {
                console.log(`CHECK_LEG - TEMP FIX CHECK: Current leg selectedBeamIndex = ${legParam.selectedBeamIndex}`);
                
                // בדיקה אם יש localStorage value שמור שמציין שהמשתמש בחר index 0
                const storageKey = `selectedBeamIndex_${this.product?.name}_leg`;
                const savedBeamIndex = localStorage.getItem(storageKey);
                const savedIndex = savedBeamIndex !== null ? parseInt(savedBeamIndex, 10) : null;
                
                console.log(`CHECK_LEG - TEMP FIX CHECK: localStorage value = ${savedIndex}, current value = ${legParam.selectedBeamIndex}`);
                
                // אם יש localStorage value שמתאים לערך הנוכחי (index 0), זה אומר שהמשתמש בחר אותו - אל נתקן
                if (legParam.selectedBeamIndex === 0 && savedIndex === 0) {
                    console.log(`CHECK_LEG - TEMP FIX: User selected index 0 (${legParam.beams[0]?.name}), not fixing`);
                    return; // המשתמש בחר index 0 - אל נתקן
                }
                
                // רק אם אין localStorage value או שהוא שונה מ-0, ואם יש קורה 50-25 ב-index 2, נבדוק אם צריך לתקן
                if (legParam.selectedBeamIndex === 0 && legParam.beams && legParam.beams[2]?.name === '50-25') {
                    // בדיקה נוספת: אם הקונפיגורציה מגדירה 50-25 והערך הנוכחי הוא 0, זה יכול להיות שגיאה
                    const configIndex = this.product?.configurationIndex || 0;
                    const legBeamsConfig = legParam.beamsConfigurations || [];
                    const configBeamName = legBeamsConfig[configIndex];
                    
                    console.log(`CHECK_LEG - TEMP FIX CHECK: configIndex=${configIndex}, configBeamName=${configBeamName}, currentBeam=${legParam.beams[0]?.name}`);
                    
                    // רק אם הקונפיגורציה מגדירה 50-25 והערך הנוכחי הוא 0 (100-25), ואם אין localStorage שמציין שהמשתמש בחר 0
                    if (configBeamName === '50-25' && savedIndex !== 0) {
                        console.log(`CHECK_LEG - TEMP FIX: Correcting leg parameter from index 0 to index 2 (config expects 50-25, no user override)`);
                    legParam.selectedBeamIndex = 2;
                    legParam.selectedTypeIndex = 0;
                    console.log(`CHECK_LEG - TEMP FIX: Fixed! Now showing "${legParam.beams[2]?.translatedName}"`);
                    } else {
                        console.log(`CHECK_LEG - TEMP FIX: No fix needed. User selected index 0 or config doesn't match`);
                    }
                } else {
                    console.log(`CHECK_LEG - TEMP FIX: No fix needed. selectedBeamIndex = ${legParam.selectedBeamIndex}`);
                }
            } else {
                console.log(`CHECK_LEG - TEMP FIX: No leg parameter found`);
            }
        } else {
            console.log(`CHECK_LEG - TEMP FIX: No params available`);
        }
    }

    /**
     * פונקציה עזר לבחירת קורה לפי defaultType
     */
    private getBeamIndexByDefaultType(param: any): number {
        let beamIndex = param.selectedBeamIndex || 0;
        
        // אם יש defaultType, מחפשים את הקורה המתאימה לפי ה-ID
        if (param.defaultType && !param.selectedBeamIndex && param.beams && param.beams.length > 0) {
            const defaultTypeId = param.defaultType.$oid || param.defaultType._id || param.defaultType;
            const foundIndex = param.beams.findIndex((b: any) => {
                const beamId = b._id || b.$oid;
                return beamId === defaultTypeId;
            });
            if (foundIndex !== -1) {
                beamIndex = foundIndex;
                this.debugLog(`CHACK-BEAM-MINI: 🎯 בחירת קורת ${param.name} לפי defaultType: ${defaultTypeId} -> index ${beamIndex}`);
            }
        }
        
        return beamIndex;
    }

    /**
     * עריכת מוצר - פתיחת דיאלוג מידע מוצר
     */
    editProduct(): void {
        console.log('SAVE_PRO - EditProduct dialog opening started');
        
        // 🎯 תיקון פרמטרים לפני פתיחת הדיאלוג
        this.fixLegParameterIfNeeded();
        console.log('SAVE_PRO - Applied parameter fixes before opening dialog');
        
        // בדיקת פרמטר leg אחרי התיקון
        const legParam = this.params?.find(p => p.name === 'leg');
        if (legParam) {
            console.log('SAVE_PRO - leg parameter after fix:', JSON.stringify({
                selectedBeamIndex: legParam.selectedBeamIndex,
                selectedTypeIndex: legParam.selectedTypeIndex,
                beamName: legParam.beams?.[legParam.selectedBeamIndex]?.translatedName,
                beamConfiguration: legParam.beams?.[legParam.selectedBeamIndex]?.name
            }, null, 2));
        }
        
        console.log('SAVE_PRO - Current product data:', JSON.stringify({
            productId: this.product?._id || this.product?.id || 'NO_ID',
            productName: this.product?.name || 'NO_NAME',
            productModel: this.product?.model || 'NO_MODEL',
            configurationIndex: this.product?.configurationIndex || 0,
            currentConfiguration: this.product?.configurations?.[this.product?.configurationIndex || 0] || null,
            paramsCount: this.params?.length || 0,
            hasBeamData: false, // beamsData not available in this component
            hasCalculatedData: !!this.calculatedPrice
        }, null, 2));

        // בדיקה אם יש מוצר זמין
        if (!this.product) {
            console.log('SAVE_PRO - ERROR: No product available for editing');
            alert('אין מוצר זמין לעריכה');
            return;
        }

        // בדיקה אם יש פרמטרים
        if (!this.params || this.params.length === 0) {
            console.log('SAVE_PRO - ERROR: No parameters available for editing');
            alert('אין פרמטרים זמינים לעריכה');
            return;
        }

        // הכנת נתוני המוצר עבור הדיאלוג
        const productDataForDialog = {
            product: { ...this.product },
            currentParams: [...this.params], // 🎯 זה אמור להכיל את השינויים הנוכחיים מה-UI
            currentConfiguration: this.product?.configurations?.[this.product?.configurationIndex || 0] || null,
            beamsData: null, // beamsData not available in this component
            calculatedPrice: this.calculatedPrice || 0,
            timestamp: new Date().toISOString()
        };
        
        // 🎯 לוג הפרמטרים שמועברים לדיאלוג
        console.log('SAVE_PRO - Parameters being passed to dialog:', JSON.stringify(
            this.params?.map(param => ({
                name: param.name,
                type: param.type,
                currentValue: param.default,
                selectedBeamIndex: param.selectedBeamIndex,
                selectedTypeIndex: param.selectedTypeIndex,
                beamName: param.beams?.[param.selectedBeamIndex]?.translatedName,
                beamConfig: param.beams?.[param.selectedBeamIndex]?.name
            })), null, 2));

        console.log('SAVE_PRO - Opening ProductEditInfo dialog with data:', JSON.stringify({
            productId: productDataForDialog.product._id || productDataForDialog.product.id,
            productName: productDataForDialog.product.name,
            paramsCount: productDataForDialog.currentParams.length,
            hasConfiguration: !!productDataForDialog.currentConfiguration,
            configurationName: productDataForDialog.currentConfiguration?.translatedName || productDataForDialog.currentConfiguration?.name,
            timestamp: productDataForDialog.timestamp
        }, null, 2));

        // פתיחת הדיאלוג
        this.dialogService.onOpenProductEditInfoDialog(productDataForDialog);
        
        console.log('SAVE_PRO - ProductEditInfo dialog opened successfully');
    }
    
    /**
     * החזרת קונפיגורציה נוכחית של המוצר עבור קומפוננטת השרטוט
     */
    getCurrentProductConfiguration(): any {
        return {
            product: this.product || null,
            params: this.params || [],
            surfaceWidth: this.surfaceWidth,
            surfaceLength: this.surfaceLength,
            quantity: this.quantity,
            isTable: this.isTable,
            isPlanter: this.isPlanter,
            isBox: this.isBox,
            isFuton: this.isFuton,
            isBelams: this.isBelams,
            shelves: this.shelves || []
        };
    }
    
    /**
     * החזרת מידות הקורה לכל הוראה (אורך ורוחב)
     */
    getBeamDimensionsForInstruction(drillInfo: any, instructionIndex: number): { length: number; width: number; height: number } {
        const paramName = drillInfo.paramName;
        const param = this.getParam(paramName);
        if (!param || !param.beams || param.beams.length === 0) {
            return { length: 0, width: 0, height: 0 };
        }
        
        const selectedBeam = param.beams[param.selectedBeamIndex || 0];
        const selectedType = selectedBeam?.types?.[param.selectedTypeIndex || 0];
        
        if (!selectedBeam || !selectedType) {
            return { length: 0, width: 0, height: 0 };
        }
        
        const beamWidth = selectedBeam.width / 10; // המרה ממ"מ לס"מ
        const beamHeight = selectedBeam.height / 10; // המרה ממ"מ לס"מ
        
        // חישוב הקורות לפי מה שמוצג בתלת מימד
        const allSizes = new Map<number, number>();
        
        if (paramName === 'shelfs') {
            // קורות מדף
            if (!this.isTable && !this.isFuton && !this.isPlanter && !this.isBox) {
                const shelfBeamWidth = beamWidth;
                const beamsInShelf = Math.floor((this.surfaceWidth + this.minGap) / (shelfBeamWidth + this.minGap));
                
                const legParamForShortening = this.getParam('leg');
                const legBeamSelected = legParamForShortening?.beams?.[legParamForShortening.selectedBeamIndex || 0];
                const legBeamHeight = legBeamSelected?.height / 10 || 0;
                
                const totalShelves = this.shelves.length;
                
                for (let shelfIndex = 0; shelfIndex < totalShelves; shelfIndex++) {
                    const isTopShelf = shelfIndex === totalShelves - 1;
                    
                    for (let beamIndex = 0; beamIndex < beamsInShelf; beamIndex++) {
                        let beamLength = this.surfaceLength;
                        
                        if (!isTopShelf) {
                            if (beamIndex === 0 || beamIndex === beamsInShelf - 1) {
                                const outsideParamCabForShortening = this.getParam('is-reinforcement-beams-outside');
                                const isOutsideCabForShortening = !!(outsideParamCabForShortening && outsideParamCabForShortening.default === true);
                                const defaultShorten = (legBeamHeight * 2);
                                const extraShorten = isOutsideCabForShortening ? (2 * (this.frameWidth || 0)) : 0;
                                beamLength = Math.max(0.1, beamLength - (defaultShorten + extraShorten));
                            }
                        }
                        
                        allSizes.set(beamLength, (allSizes.get(beamLength) || 0) + this.quantity);
                    }
                }
            } else if (this.isTable) {
                const surfaceBeams = this.createSurfaceBeams(
                    this.surfaceWidth,
                    this.surfaceLength,
                    beamWidth,
                    beamHeight,
                    this.minGap
                );
                
                surfaceBeams.forEach(beam => {
                    allSizes.set(beam.depth, (allSizes.get(beam.depth) || 0) + this.quantity);
                });
            }
        } else if (paramName === 'leg') {
            // קורות רגל
            if (!this.isTable && !this.isFuton && !this.isPlanter && !this.isBox) {
                const dimensions = this.getProductDimensionsRaw();
                const totalHeight = dimensions.height;
                const shelfBeamHeight = selectedBeam?.height / 10 || 0;
                const legHeight = totalHeight - shelfBeamHeight;
                
                for (let i = 0; i < 4; i++) {
                    allSizes.set(legHeight, (allSizes.get(legHeight) || 0) + this.quantity);
                }
            } else if (this.isTable) {
                const dimensions = this.getProductDimensionsRaw();
                const totalHeight = dimensions.height;
                const plataParam = this.getParam('plata');
                const plataBeam = plataParam?.beams?.[plataParam.selectedBeamIndex || 0];
                const plataBeamHeight = plataBeam?.height / 10 || 0;
                const legHeight = totalHeight - plataBeamHeight;
                
                for (let i = 0; i < 4; i++) {
                    allSizes.set(legHeight, (allSizes.get(legHeight) || 0) + this.quantity);
                }
            }
        }
        
        const totalSizes = Array.from(allSizes.entries())
            .map(([length, count]) => ({ length, count }))
            .sort((a, b) => a.length - b.length);
        
        if (instructionIndex >= 0 && instructionIndex < totalSizes.length) {
            return {
                length: totalSizes[instructionIndex].length,
                width: beamWidth,
                height: beamHeight
            };
        }
        
        return { length: 0, width: beamWidth, height: beamHeight };
    }
    
    // איפוס זוית המצלמה - מיקום מחדש של המצלמה לפי מידות המוצר
    resetCameraView(isAnimate: boolean = false) {
        if (!this.camera || !this.renderer || !this.scene) {
            console.error('TEST_CAMERA - Camera, renderer, or scene not initialized');
            return;
        }
        
        // ============================================
        // פתרון חדש: מיקום המצלמה לפי Bounding Box
        // ============================================
        
        // קבלת מידות המסך
        const containerNew = this.renderer.domElement.parentElement;
        if (!containerNew) {
            console.error('TEST_CAMERA - Container not found');
            return;
        }
        
        const viewportWidthNew = this.renderer.domElement.clientWidth || containerNew.clientWidth;
        const viewportHeightNew = this.renderer.domElement.clientHeight || containerNew.clientHeight;
        
        // איפוס מלא של הסצנה לפני חישוב bounding box
        this.scene.rotation.set(0, 0, 0);
        this.scene.position.set(0, -120, 0);
        this.scene.scale.set(1, 1, 1);
        this.scene.updateMatrix();
        this.scene.updateMatrixWorld(true);
        
        // חישוב bounding box של כל האוביקטים בסצנה
        let minXNew = Infinity, minYNew = Infinity, minZNew = Infinity;
        let maxXNew = -Infinity, maxYNew = -Infinity, maxZNew = -Infinity;
        let hasObjects = false;
        
        this.scene.traverse((object) => {
            if (object instanceof THREE.Mesh && object.geometry) {
                const objectBox = new THREE.Box3().setFromObject(object);
                if (!objectBox.isEmpty()) {
                    // Manual expansion by comparing min/max values
                    minXNew = Math.min(minXNew, objectBox.min.x);
                    minYNew = Math.min(minYNew, objectBox.min.y);
                    minZNew = Math.min(minZNew, objectBox.min.z);
                    maxXNew = Math.max(maxXNew, objectBox.max.x);
                    maxYNew = Math.max(maxYNew, objectBox.max.y);
                    maxZNew = Math.max(maxZNew, objectBox.max.z);
                    hasObjects = true;
                }
            }
        });
        
        const box = new THREE.Box3();
        if (hasObjects) {
            box.setFromPoints([
                new THREE.Vector3(minXNew, minYNew, minZNew),
                new THREE.Vector3(maxXNew, maxYNew, maxZNew)
            ]);
        }
        
        let computedCenter: THREE.Vector3 | null = null;
        let computedSize: THREE.Vector3 | null = null;
        
        if (hasObjects && !box.isEmpty()) {
            computedCenter = box.getCenter(new THREE.Vector3());
            computedSize = box.getSize(new THREE.Vector3());
        } else {
            console.warn('TEST_CAMERA - No objects found in scene, using fallback method');
        }
        
        if (computedCenter && !this.baseBoundingCenter) {
            this.baseBoundingCenter = computedCenter.clone();
        }
        if (computedSize && !this.baseBoundingSize) {
            this.baseBoundingSize = computedSize.clone();
        }
        
        const effectiveCenter = this.baseBoundingCenter
            ? this.baseBoundingCenter.clone()
            : (computedCenter ? computedCenter.clone() : new THREE.Vector3(0, 0, 0));
        const effectiveSize = this.baseBoundingSize
            ? this.baseBoundingSize.clone()
            : (computedSize ? computedSize.clone() : new THREE.Vector3(1, 1, 1));
        
        const offset = effectiveCenter.clone().negate();
        this.scene.position.set(offset.x, offset.y - 120, offset.z);
        this.scene.updateMatrix();
        this.scene.updateMatrixWorld(true);
        
        {
            const cameraFOV = this.camera instanceof THREE.PerspectiveCamera ? this.camera.fov : 40;
            const fovRadians = cameraFOV * (Math.PI / 180);
            const aspect = viewportWidthNew / viewportHeightNew;
            
            // חישוב המרחק לפי הגובה והרוחב של ה-bounding box
            const distanceHeight = (effectiveSize.y / 2) / Math.tan(fovRadians / 2);
            const distanceWidth = (effectiveSize.x / 2) / (Math.tan(fovRadians / 2) * aspect);
            const distanceDepth = (effectiveSize.z / 2) / Math.tan(fovRadians / 2);
            
            // מציאת הצלע הגדולה ביותר של המוצר (width, height, length)
            // נשתמש במידות מהפרמטרים במקום מה-bounding box כדי לקבל ערכים מדויקים בס"מ
            let maxDimension = 0;
            let height = 0; // גובה המוצר - נגיש מחוץ ל-try block
            let width = 0; // רוחב המוצר - נגיש מחוץ ל-try block
            let depth = 0; // אורך המוצר - נגיש מחוץ ל-try block
            try {
                // ננסה לקבל את המידות מהפרמטרים
                const widthParam = this.params?.find((p: any) => p.name === 'width');
                const depthParam = this.params?.find((p: any) => p.name === 'depth');
                const heightParam = this.params?.find((p: any) => p.name === 'height');
                
                width = widthParam?.default || 0;
                depth = depthParam?.default || 0;
                height = heightParam?.default || 0;
                
                // אם לא מצאנו גובה מהפרמטרים, נשתמש בגובה מה-bounding box
                // size.y הוא הגובה - נבדוק אם צריך המרה או שהוא כבר בס"מ
                if (height === 0 && effectiveSize.y > 0) {
                    // אם size.x = 2000 ו-width = 50, אז המרה היא 2000/40 = 50
                    // אבל size.y = 180.3, אז אם המרה זהה, הגובה יהיה 180.3/40 = 4.5 ס"מ - לא נכון
                    // כנראה size.y הוא ישירות בס"מ או במילימטרים חלקי 10
                    // ננסה להשתמש ב-size.y ישירות (אם הוא בס"מ) או לחלק ב-10
                    // מהלוג נראה ש-size.y = 180.3, אז נשתמש בו ישירות
                    height = effectiveSize.y; // הגובה מה-bounding box בס"מ
                }
                
                maxDimension = Math.max(width, depth, height);
                
                // אם עדיין לא מצאנו מידות מהפרמטרים, נשתמש ב-bounding box
                if (maxDimension === 0) {
                    const maxDimensionInSceneUnits = Math.max(effectiveSize.x, effectiveSize.y, effectiveSize.z);
                    // המרה - נראה שהמידות ב-Three.js הן במילימטרים חלקי 10
                    // אבל מהלוג נראה שהערכים גדולים מדי, אז נחלק ב-40 (2000/40 = 50)
                    maxDimension = maxDimensionInSceneUnits / 40; // המרה לס"מ
                }
            } catch (e) {
                // אם יש שגיאה, נשתמש ב-bounding box
                const maxDimensionInSceneUnits = Math.max(effectiveSize.x, effectiveSize.y, effectiveSize.z);
                maxDimension = maxDimensionInSceneUnits / 40; // המרה לס"מ
                // גם ננסה לקבל את הגובה מה-bounding box
                if (height === 0 && effectiveSize.y > 0) {
                    height = effectiveSize.y; // הגובה מה-bounding box בס"מ
                }
            }
            
            // Fallback נוסף: אם עדיין לא מצאנו גובה, נשתמש ב-size.y ישירות
            // זה חשוב למוצרים ללא פרמטר height (כמו ארון)
            // אם sizeY גדול מ-height, נשתמש ב-sizeY כי הוא יותר מדויק (מחושב מה-bounding box)
            if (height === 0 && effectiveSize.y > 0) {
                height = effectiveSize.y; // הגובה מה-bounding box בס"מ
            } else if (effectiveSize.y > height && effectiveSize.y > 0) {
                // אם sizeY גדול יותר מ-height, נשתמש בו כי הוא יותר מדויק
                height = effectiveSize.y;
            }
            
            // חישוב פרמטר zoom-out/zoom-in הדרגתי לפי הצלע הגדולה ביותר
            // מוצרים מעל 150: zoom-out (מגדיל margin)
            // מוצרים מתחת ל-150: zoom-in (מקטין margin) - אפקט הפוך בצורה דומה
            const THRESHOLD = 120; // ס"מ - הגבול שממנו מתחיל הפרמטר לגדול
            const LARGE_THRESHOLD = 150; // ס"מ - גבול למוצרים גדולים שצריכים אפקט חזק יותר
            const baseMargin = 0.072; // margin בסיסי
            let zoomOutFactor = 0;
            let zoomInFactor = 0;
            
            if (maxDimension > LARGE_THRESHOLD) {
                // למוצרים גדולים מ-150: אפקט zoom-out חזק יותר (מוגדל פי 1.8 + 20% נוסף)
                // מקדם מוגדל פי 1.8 + 20% נוסף למוצרים גדולים (0.00432 במקום 0.0036)
                const largeExcess = maxDimension - LARGE_THRESHOLD;
                // אפקט בסיסי עד 150 + אפקט נוסף מעל 150
                zoomOutFactor = (LARGE_THRESHOLD - THRESHOLD) * 0.00075 + largeExcess * 0.00432;
                // מקסימום מוגדל פי 1.8 + 20% נוסף למוצרים גדולים (0.108 במקום 0.09)
                zoomOutFactor = Math.min(zoomOutFactor, 0.108);
            } else if (maxDimension > THRESHOLD) {
                // למוצרים בין 120 ל-150: אפקט zoom-in הפוך (כמו zoom-out מעל 150 אבל הפוך)
                // ככל שהמוצר קטן יותר מ-150, יותר zoom-in (מקטין margin)
                // מוקטן פי 10 נוסף כדי להפוך את האפקט למתון מאוד
                const deficitFrom150 = LARGE_THRESHOLD - maxDimension; // כמה מתחת ל-150
                // אפקט דומה לזה של zoom-out מעל 150, אבל הפוך
                // משתמשים באותם מקדמים אבל הפוכים - רק האפקט הנוסף מתחת ל-150
                // למוצר בגודל 150: deficitFrom150 = 0, אז zoomInFactor = 0 (אין אפקט)
                // למוצר קטן יותר מ-150: יותר zoom-in
                // מוקטן פי 10 נוסף - מקדם של 0.0006912 (מ-0.006912 ל-0.0006912)
                const additionalEffect = deficitFrom150 * 0.0006912; // מוקטן פי 10 נוסף
                zoomInFactor = additionalEffect;
                // מקסימום מוגדל - אבל לא יותר מה-baseMargin כדי לא לקבל margin שלילי
                zoomInFactor = Math.min(zoomInFactor, baseMargin * 0.95); // מקסימום 95% מה-baseMargin כדי לא לקבל margin שלילי
        } else {
                // למוצרים קטנים מ-120: אפקט zoom-in (הפוך)
                // ככל שהמוצר קטן יותר מ-120, יותר zoom-in (מקטין margin)
                // מוקטן פי 10 נוסף כדי להפוך את האפקט למתון מאוד
                const deficit = THRESHOLD - maxDimension; // כמה מתחת ל-120
                // אפקט zoom-in הפוך - מקדם מוקטן פי 10 נוסף (מקטין margin במקום להגדיל)
                // ככל שהמוצר קטן יותר, יותר zoom-in
                // מוקטן פי 10 נוסף - מקדם של 0.00012 (מ-0.0012 ל-0.00012)
                zoomInFactor = Math.min(deficit * 0.00012, baseMargin * 0.95); // מקסימום 95% מה-baseMargin כדי לא לקבל margin שלילי
            }
            
            // חישוב zoom-out נוסף לפי גובה המוצר
            // אם הגובה מעל 120 ס"מ, zoom out של 90% מ-baseMargin
            // תלוי רק בגובה, ובנוסף לכל האפקטים הקיימים
            // לוגיקה דומה לקובץ המיני, עם threshold של 120
            // **האפקט יפעל רק אם הרוחב והאורך שניהם קטנים או שווים ל-120 ס"מ**
            let tallHeightZoomOut = 0;
            const HEIGHT_THRESHOLD = 120; // ס"מ - הגבול שממנו מתחיל האפקט
            const MAX_WIDTH_OR_LENGTH_FOR_TALL_EFFECT = 120; // ס"מ - מקסימום רוחב או אורך לאפקט
            
            // לוג: לפני חישוב tallHeightZoomOut
            console.log('CHECK_MINI_CAMERA - Before tallHeightZoomOut calculation:', JSON.stringify({
                height: height,
                width: width,
                depth: depth,
                HEIGHT_THRESHOLD: HEIGHT_THRESHOLD,
                MAX_WIDTH_OR_LENGTH_FOR_TALL_EFFECT: MAX_WIDTH_OR_LENGTH_FOR_TALL_EFFECT,
                heightGreaterThanThreshold: height > HEIGHT_THRESHOLD,
                widthAndDepthWithinLimit: width <= MAX_WIDTH_OR_LENGTH_FOR_TALL_EFFECT && depth <= MAX_WIDTH_OR_LENGTH_FOR_TALL_EFFECT,
                shouldApplyTallEffect: height > HEIGHT_THRESHOLD && width <= MAX_WIDTH_OR_LENGTH_FOR_TALL_EFFECT && depth <= MAX_WIDTH_OR_LENGTH_FOR_TALL_EFFECT,
                baseMargin: baseMargin,
                expectedTallHeightZoomOut: (height > HEIGHT_THRESHOLD && width <= MAX_WIDTH_OR_LENGTH_FOR_TALL_EFFECT && depth <= MAX_WIDTH_OR_LENGTH_FOR_TALL_EFFECT) ? baseMargin * 0.9 : 0
            }));
            
            // האפקט יפעל רק אם הגובה מעל 120 וגם הרוחב והאורך שניהם קטנים או שווים ל-120
            if (height > HEIGHT_THRESHOLD && width <= MAX_WIDTH_OR_LENGTH_FOR_TALL_EFFECT && depth <= MAX_WIDTH_OR_LENGTH_FOR_TALL_EFFECT) {
                tallHeightZoomOut = baseMargin * 0.9; // 90% מ-baseMargin (הוקטן ל-0.6 מהערך הקודם שהיה 1.5)
            }
            
            // לוג: אחרי חישוב tallHeightZoomOut
            console.log('CHECK_MINI_CAMERA - After tallHeightZoomOut calculation:', JSON.stringify({
                height: height,
                HEIGHT_THRESHOLD: HEIGHT_THRESHOLD,
                tallHeightZoomOut: tallHeightZoomOut,
                baseMargin: baseMargin,
                zoomOutFactor: zoomOutFactor,
                zoomInFactor: zoomInFactor
            }));
            
            // נשתמש במרחק הגדול ביותר עם margin
            // margin קטן יותר = מצלמה קרובה יותר = זום גדול יותר
            // הוספת zoomOutFactor ל-margin תגדיל את המרחק (תקטין את הזום)
            // הורדת zoomInFactor מה-margin תקטין את המרחק (תגדיל את הזום)
            // הוספת tallHeightZoomOut ל-margin תגדיל את המרחק נוסף (תקטין את הזום) למוצרים גבוהים מעל 120 ס"מ
            const margin = baseMargin + zoomOutFactor + tallHeightZoomOut - zoomInFactor;
            
            // לוג: אחרי חישוב margin הסופי
            console.log('CHECK_MINI_CAMERA - Final margin calculation:', JSON.stringify({
                baseMargin: baseMargin,
                zoomOutFactor: zoomOutFactor,
                tallHeightZoomOut: tallHeightZoomOut,
                zoomInFactor: zoomInFactor,
                margin: margin,
                marginCalculation: `${baseMargin} + ${zoomOutFactor} + ${tallHeightZoomOut} - ${zoomInFactor} = ${margin}`,
                height: height,
                HEIGHT_THRESHOLD: HEIGHT_THRESHOLD
            }));
            const cameraDistance = Math.max(distanceHeight, distanceWidth, distanceDepth) * margin;
            
            // זווית קבועה
            const BASE_VERTICAL_ANGLE = 30; // מעלות
            const verticalAngle = BASE_VERTICAL_ANGLE * (Math.PI / 180);
            const horizontalAngle = 45 * (Math.PI / 180); // 45 מעלות אופקית
            
            // שמירת המידות הסופיות
            const finalCameraDistance = cameraDistance;
            const finalVerticalAngle = verticalAngle;
            const finalHorizontalAngle = horizontalAngle;
            const finalSceneRotationY = Math.PI / 6; // 30 degrees rotation
            
            // אם צריך אנימציה - נשנה את הפרמטרים ב-15% או 15 מעלות
            let startCameraDistance = finalCameraDistance;
            let startVerticalAngle = finalVerticalAngle;
            let startHorizontalAngle = finalHorizontalAngle;
            
            if (isAnimate) {
                // שינוי עדין של 15% או 15 מעלות
                startCameraDistance = finalCameraDistance * 1.15; // 15% יותר רחוק
                // סיבוב למעלה-למטה: הפוך (יותר למטה) ומוקטן פי 2
                startVerticalAngle = finalVerticalAngle - (7.5 * Math.PI / 180); // 7.5 מעלות למטה (הפוך מהמקור ומוקטן פי 2)
                // סיבוב ימין-שמאל: משמעותי יותר
                startHorizontalAngle = finalHorizontalAngle + (30 * Math.PI / 180); // 30 מעלות נוספות (יותר משמעותי)
            }
            
            // חישוב מיקום המצלמה במערכת קואורדינטות כדורית (מצב התחלתי - עם או בלי שינוי עדין)
            const startCameraX = Math.sin(startHorizontalAngle) * Math.cos(startVerticalAngle) * startCameraDistance;
            const startCameraY = Math.sin(startVerticalAngle) * startCameraDistance;
            const startCameraZ = Math.cos(startHorizontalAngle) * Math.cos(startVerticalAngle) * startCameraDistance;
            
            // חישוב מיקום המצלמה הסופי במערכת קואורדינטות כדורית
            const finalCameraX = Math.sin(finalHorizontalAngle) * Math.cos(finalVerticalAngle) * finalCameraDistance;
            const finalCameraY = Math.sin(finalVerticalAngle) * finalCameraDistance;
            const finalCameraZ = Math.cos(finalHorizontalAngle) * Math.cos(finalVerticalAngle) * finalCameraDistance;
            
            // איפוס המצלמה
        this.camera.position.set(0, 0, 0);
        this.camera.rotation.set(0, 0, 0);
        this.camera.up.set(0, 1, 0);
        this.camera.quaternion.set(0, 0, 0, 1);
            
            // הגדרת מיקום המצלמה למצב התחלתי (עם או בלי שינוי עדין)
            if (isAnimate) {
                // במצב אנימציה - נתחיל מהמצב העדין
                this.camera.position.set(startCameraX, startCameraY, startCameraZ);
                this.scene.rotation.y = finalSceneRotationY + (15 * Math.PI / 180);
            } else {
                // ללא אנימציה - ישר למצב הסופי
                this.camera.position.set(finalCameraX, finalCameraY, finalCameraZ);
                this.scene.rotation.y = finalSceneRotationY;
            }
            
            // מבט על המרכז (0,0,0) - כי הזזנו את הסצנה כך שהמרכז יהיה שם
            this.camera.lookAt(0, 0, 0);
            
            // עדכון רוטציית הסצנה
            this.scene.updateMatrix();
            this.scene.updateMatrixWorld(true);
            
            // עדכון רוטציית המצלמה מחדש אחרי סיבוב הסצנה
            this.camera.lookAt(0, 0, 0);
            
            // עדכון הפרויקציה והרינדורר לפני הרינדור הראשוני
            this.camera.aspect = aspect;
            if (this.camera instanceof THREE.PerspectiveCamera) {
                this.camera.updateProjectionMatrix();
            }
            this.renderer.setSize(viewportWidthNew, viewportHeightNew);
            
            // רינדור ראשוני - חשוב גם במצב אנימציה כדי שהמשתמש יראה את המצלמה מהמצב העדין לפני שהאנימציה מתחילה
            this.renderer.render(this.scene, this.camera);
            
            // אם צריך אנימציה - נבצע אנימציה מהמצב העדין למצב הסופי
            if (isAnimate) {
                const animationDuration = 2000; // 2 שניות
                const startTime = Date.now();
                
                const animate = () => {
                    const elapsed = Date.now() - startTime;
                    const progress = Math.min(elapsed / animationDuration, 1);
                    
                    // Ease in out function
                    const easeProgress = progress < 0.5
                        ? 2 * progress * progress
                        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
                    
                    // אנימציה של המרחק (zoom)
                    const currentCameraDistance = THREE.MathUtils.lerp(startCameraDistance, finalCameraDistance, easeProgress);
                    
                    // אנימציה של הזוויות
                    const currentVerticalAngle = THREE.MathUtils.lerp(startVerticalAngle, finalVerticalAngle, easeProgress);
                    const currentHorizontalAngle = THREE.MathUtils.lerp(startHorizontalAngle, finalHorizontalAngle, easeProgress);
                    
                    // חישוב מיקום המצלמה הנוכחי במערכת קואורדינטות כדורית
                    const currentCameraX = Math.sin(currentHorizontalAngle) * Math.cos(currentVerticalAngle) * currentCameraDistance;
                    const currentCameraY = Math.sin(currentVerticalAngle) * currentCameraDistance;
                    const currentCameraZ = Math.cos(currentHorizontalAngle) * Math.cos(currentVerticalAngle) * currentCameraDistance;
                    
                    // עדכון מיקום המצלמה
                    this.camera.position.set(currentCameraX, currentCameraY, currentCameraZ);
                    
                    // עדכון רוטציית הסצנה
                    const currentSceneRotationY = THREE.MathUtils.lerp(finalSceneRotationY + (15 * Math.PI / 180), finalSceneRotationY, easeProgress);
                    this.scene.rotation.y = currentSceneRotationY;
        this.scene.updateMatrix();
        this.scene.updateMatrixWorld(true);
        
                    // עדכון מבט המצלמה
                    this.camera.lookAt(0, 0, 0);
        
                    // עדכון מטריצות
        this.camera.updateMatrix();
        this.camera.updateMatrixWorld(true);
                    
                    // רינדור
                    this.renderer.render(this.scene, this.camera);
                    
                    if (progress < 1) {
                        requestAnimationFrame(animate);
                    } else {
                        // בסוף האנימציה - עדכון סופי
                        this.camera.position.set(finalCameraX, finalCameraY, finalCameraZ);
                        this.scene.rotation.y = finalSceneRotationY;
        this.scene.updateMatrix();
        this.scene.updateMatrixWorld(true);
                        this.camera.lookAt(0, 0, 0);
                        this.camera.updateMatrix();
                        this.camera.updateMatrixWorld(true);
                        this.renderer.render(this.scene, this.camera);
                    }
                };
                
                // התחלת האנימציה
                requestAnimationFrame(animate);
            }
            
            // עדכון מטריצות סופי - רק אם אין אנימציה (באנימציה זה מתבצע בסוף האנימציה)
            if (!isAnimate) {
                this.camera.updateMatrix();
                this.camera.updateMatrixWorld(true);
                this.scene.updateMatrix();
                this.scene.updateMatrixWorld(true);
            }
            
            // חישוב maxDimensionInSceneUnits ללוג
            const maxDimensionInSceneUnits = Math.max(
                effectiveSize.x,
                effectiveSize.y,
                effectiveSize.z
            );
            
            console.log('CHECK_MINI_CAMERA - Bounding box camera positioning (final summary):', JSON.stringify({
                boundingBox: {
                    center: { x: effectiveCenter.x, y: effectiveCenter.y, z: effectiveCenter.z },
                    size: { x: effectiveSize.x, y: effectiveSize.y, z: effectiveSize.z },
                    min: { x: box.min.x, y: box.min.y, z: box.min.z },
                    max: { x: box.max.x, y: box.max.y, z: box.max.z }
                },
            maxDimension: maxDimension,
                maxDimensionInSceneUnits: maxDimensionInSceneUnits,
                productHeight: height,
                heightThreshold: HEIGHT_THRESHOLD,
                tallHeightZoomOut: tallHeightZoomOut,
                threshold: THRESHOLD,
                largeThreshold: LARGE_THRESHOLD,
                isLargeProduct: maxDimension > LARGE_THRESHOLD,
                zoomOutFactor: zoomOutFactor,
                zoomInFactor: zoomInFactor,
                baseMargin: baseMargin,
                finalMargin: margin,
                sceneOffset: { x: this.scene.position.x, y: this.scene.position.y, z: this.scene.position.z },
                cameraPosition: { x: finalCameraX, y: finalCameraY, z: finalCameraZ },
                cameraDistance: finalCameraDistance,
                viewportSize: { width: viewportWidthNew, height: viewportHeightNew },
                aspect: aspect
        }, null, 2));
            
            // return מוקדם - לא להמשיך לקוד הקיים
            return;
        }
        
        // במקרה שאין אוביקטים בסצנה, נדפיס אזהרה ונצא
        console.warn('TEST_CAMERA - No objects found in scene, cannot position camera');
    }
}

