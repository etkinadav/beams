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
  public shelfGaps: number[] = [];
  
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

  // Helper for numeric step
  getStep(type: number): number {
    return 1 / Math.pow(10, type);
  }

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
  private autoChangeTimer: any = null; // טיימר לשינוי אוטומטי של פרמטרים
  private savedRotation: THREE.Euler = new THREE.Euler(); // שמירת סיבוב המודל
  private iterationCounter: number = 0; // מונה איטרציות לשינוי מדפים
  private lastSaveTime: number = 0; // זמן השמירה האחרונה של הסיבוב
  private rotationSpeed: number = 0.005; // מהירות הסיבוב האוטומטי (רדיאנים לפריים)

  ngAfterViewInit() {
    this.initThreeJS();
    this.initializeParamsFromProduct();
    this.createSimpleProduct();
    this.animate();
    this.startAutoParameterChange(); // התחלת שינוי אוטומטי של פרמטרים
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
    if (this.autoChangeTimer) {
      clearInterval(this.autoChangeTimer);
    }
  }

  // פונקציה לאפס את טיימר חוסר הפעילות
  private resetInactivityTimer() {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }
    this.inactivityTimer = setTimeout(() => {
      this.hasUserInteracted = false; // החזרת הסיבוב האוטומטי
      console.log('החזרת סיבוב אוטומטי אחרי 30 שניות של חוסר פעילות');
    }, 30000); // 30 שניות
  }

  // פונקציה לשינוי אוטומטי של פרמטרים כל 2 שניות
  private startAutoParameterChange() {
    if (this.autoChangeTimer) {
      clearInterval(this.autoChangeTimer);
    }
    
    this.autoChangeTimer = setInterval(() => {
      // רק אם המשתמש לא נוגע במודל והמודל מסתובב
      if (!this.hasUserInteracted) {
        this.changeRandomParameter();
      }
    }, 5000); // כל 5 שניות
  }

  // פונקציה לשינוי פרמטר רנדומלי
  private changeRandomParameter() {
    this.iterationCounter++; // הגדלת מונה האיטרציות
    
    const actions = [
      'changeWidth',
      'changeLength', 
      'changeShelfHeight',
      'changeFrameBeam',
      'changeShelfBeam'
    ];
    
    // הוספת שינוי מספר מדפים הוסרה - לא רוצים לשנות את כמות המדפים
    
    // בחירת 3 פרמטרים רנדומליים שונים
    const selectedActions: string[] = [];
    const availableActions = [...actions]; // עותק של המערך
    
    for (let i = 0; i < 3 && availableActions.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * availableActions.length);
      const selectedAction = availableActions.splice(randomIndex, 1)[0];
      selectedActions.push(selectedAction);
    }
    
    // ביצוע השינויים
    selectedActions.forEach(action => {
      switch (action) {
        case 'changeWidth':
          this.changeRandomWidth();
          break;
        case 'changeLength':
          this.changeRandomLength();
          break;
        case 'changeShelfHeight':
          this.changeRandomShelfHeight();
          break;
        case 'changeFrameBeam':
          this.changeFrameBeamTypeAuto();
          break;
        case 'changeShelfBeam':
          this.changeShelfBeamTypeAuto();
          break;
      }
    });
    
    console.log(`שינוי אוטומטי של 3 פרמטרים (איטרציה ${this.iterationCounter}): ${selectedActions.join(', ')}`);
  }

  // פונקציות לשינוי רנדומלי של מידות
  private changeRandomWidth() {
    this.saveCurrentRotation(); // שמירת הסיבוב הנוכחי
    
    // חיפוש פרמטר הרוחב
    const widthParam = this.product?.params?.find((p: any) => p.name === 'width');
    if (!widthParam) return; // אם לא נמצא פרמטר רוחב, לא נשנה כלום
    
    const step = this.getStep(widthParam.type || 0);
    // מינימום של 45 ס"מ לפרמטרים עם type = 0 (או undefined/null)
    const min = (widthParam.type === 0 || widthParam.type === undefined || widthParam.type === null) ? 
      Math.max(widthParam.min || 45, 45) : Math.max(widthParam.min || 50, 45);
    const max = Math.min(widthParam.max || 200, 200); // הגבלה מקסימלית של 200
    
    // בחירת ערך רנדומלי בטווח המלא
    const range = max - min;
    const randomSteps = Math.floor(Math.random() * (range / step)) + 1;
    const newValue = min + (randomSteps * step);
    
    this.dynamicParams.width = Math.min(newValue, max);
    this.createSimpleProductWithoutCameraUpdate();
    this.updateCameraPosition(); // עדכון מצלמה לשינויים אוטומטיים
    this.restoreRotation(); // שחזור הסיבוב
    
    console.log(`רוחב השתנה ל: ${this.dynamicParams.width} (טווח: ${min}-${max}, צעד: ${step})`);
  }

  private changeRandomLength() {
    this.saveCurrentRotation(); // שמירת הסיבוב הנוכחי
    
    // חיפוש פרמטר האורך
    const lengthParam = this.product?.params?.find((p: any) => p.name === 'depth');
    if (!lengthParam) return; // אם לא נמצא פרמטר אורך, לא נשנה כלום
    
    const step = this.getStep(lengthParam.type || 0);
    // מינימום של 45 ס"מ לפרמטרים עם type = 0 (או undefined/null)
    const min = (lengthParam.type === 0 || lengthParam.type === undefined || lengthParam.type === null) ? 
      Math.max(lengthParam.min || 45, 45) : Math.max(lengthParam.min || 50, 45);
    const max = Math.min(lengthParam.max || 200, 200); // הגבלה מקסימלית של 200
    
    // בחירת ערך רנדומלי בטווח המלא
    const range = max - min;
    const randomSteps = Math.floor(Math.random() * (range / step)) + 1;
    const newValue = min + (randomSteps * step);
    
    this.dynamicParams.length = Math.min(newValue, max);
    this.createSimpleProductWithoutCameraUpdate();
    this.updateCameraPosition(); // עדכון מצלמה לשינויים אוטומטיים
    this.restoreRotation(); // שחזור הסיבוב
    
    console.log(`אורך השתנה ל: ${this.dynamicParams.length} (טווח: ${min}-${max}, צעד: ${step})`);
  }

  private changeRandomShelfHeight() {
    this.saveCurrentRotation(); // שמירת הסיבוב הנוכחי
    
    // זיהוי סוג המוצר
    const isTable = this.product?.name === 'table';
    console.log('changeRandomShelfHeight נקרא - סוג מוצר:', isTable ? 'שולחן' : 'ארון');
    
    if (isTable) {
      // שולחן - שינוי גובה המדף היחיד
      const heightParam = this.product?.params?.find((p: any) => p.name === 'height');
      console.log('פרמטר גובה שולחן:', heightParam);
      if (!heightParam) {
        console.log('לא נמצא פרמטר גובה לשולחן');
        return;
      }
      
      const step = this.getStep(heightParam.type || 0);
      // מינימום של 45 ס"מ לפרמטרים עם type = 0 (או undefined/null)
      const min = (heightParam.type === 0 || heightParam.type === undefined || heightParam.type === null) ? 
        Math.max(heightParam.min || 45, 45) : Math.max(heightParam.min || 50, 45);
      const max = Math.min(heightParam.max || 120, 200);
      
      // בחירת ערך רנדומלי בטווח המלא
      const range = max - min;
      const randomSteps = Math.floor(Math.random() * (range / step)) + 1;
      const newValue = min + (randomSteps * step);
      
      this.shelfGaps[0] = Math.min(newValue, max); // שולחן - מדף אחד בלבד
      this.dynamicParams.height = this.shelfGaps[0]; // עדכון פרמטר הגובה
      console.log(`גובה שולחן השתנה ל: ${this.shelfGaps[0]} (טווח: ${min}-${max}, צעד: ${step})`);
    } else {
      // ארון - שינוי גובה המדף התחתון (השלישי)
      // עבור ארון, נשתמש בטווח של פרמטר shelfs או נגדיר טווח ברירת מחדל
      const shelfsParam = this.product?.params?.find((p: any) => p.type === 'beamArray' && p.name === 'shelfs');
      console.log('פרמטר shelfs ארון:', shelfsParam);
      
      // הגדרת טווח ברירת מחדל עבור ארון
      const min = 20; // מינימום 20 ס"מ למדף תחתון
      const max = 100; // מקסימום 100 ס"מ למדף תחתון
      const step = 1; // צעד של 1 ס"מ
      
      // בחירת ערך רנדומלי בטווח המלא
      const range = max - min;
      const randomSteps = Math.floor(Math.random() * (range / step)) + 1;
      const newValue = min + (randomSteps * step);
      
      this.shelfGaps[2] = Math.min(newValue, max); // ארון - מדף תחתון (שלישי)
      console.log(`גובה המדף התחתון השתנה ל: ${this.shelfGaps[2]} (טווח: ${min}-${max}, צעד: ${step})`);
    }
    
    this.createSimpleProductWithoutCameraUpdate();
    this.updateCameraPosition(); // עדכון מצלמה לשינויים אוטומטיים
    this.restoreRotation(); // שחזור הסיבוב
  }

  // פונקציות לשמירה ושחזור סיבוב המודל עם חישוב זמן
  private saveCurrentRotation() {
    if (this.scene) {
      this.savedRotation.copy(this.scene.rotation);
      this.lastSaveTime = performance.now(); // שמירת זמן השמירה
    }
  }

  private restoreRotation() {
    if (this.scene) {
      // חישוב הזמן שעבר מאז השמירה האחרונה
      const currentTime = performance.now();
      const timeElapsed = currentTime - this.lastSaveTime;
      
      // חישוב הסיבוב שהיה אמור להתרחש בזמן הזה
      // נניח 60 FPS, אז כל פריים הוא ~16.67ms
      const framesElapsed = timeElapsed / 16.67;
      const rotationToAdd = framesElapsed * this.rotationSpeed;
      
      // הוספת הסיבוב המחושב + 10 מעלות נוספות (כ-0.175 רדיאנים)
      const additionalRotation = 10 * Math.PI / 180; // 10 מעלות לרדיאנים
      const totalRotationToAdd = rotationToAdd + additionalRotation;
      
      // עדכון הסיבוב
      this.scene.rotation.y = this.savedRotation.y + totalRotationToAdd;
      
      console.log(`שחזור סיבוב: זמן שעבר=${timeElapsed.toFixed(1)}ms, פריימים=${framesElapsed.toFixed(1)}, סיבוב נוסף=${totalRotationToAdd.toFixed(3)} רדיאנים`);
    }
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
    
    // זיהוי סוג המוצר
    const isTable = this.product.name === 'table';
    
    // חיפוש קורות המדפים
    let currentBeam: any = null;
    let currentBeamType: any = null;
    
    this.product.params.forEach((param: any) => {
      if (isTable) {
        // שולחן - חיפוש פרמטר plata
        if (param.type === 'beamSingle' && param.name === 'plata' && param.beams && param.beams.length > 0) {
          const beamIndex = param.selectedBeamIndex || 0;
          if (param.beams[beamIndex]) {
            currentBeam = param.beams[beamIndex];
            const typeIndex = param.selectedBeamTypeIndex || 0;
            if (currentBeam.types && currentBeam.types[typeIndex]) {
              currentBeamType = currentBeam.types[typeIndex];
            }
          }
        }
      } else {
        // ארון - חיפוש פרמטר shelfs
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
    // עצירת האנימציה האוטומטית למשך 30 שניות
    this.hasUserInteracted = true;
    this.resetInactivityTimer();
    
    if (!this.product || !this.product.params) {
      return;
    }

    // שמירת המצב הנוכחי של המצלמה
    const currentCameraState = this.saveCurrentCameraState();

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

    // יצירת המודל מחדש ללא עדכון מצלמה
    this.createSimpleProductWithoutCameraUpdate();
    this.updateCameraPosition(); // עדכון מצלמה לשינויים אוטומטיים
    
    // שחזור המצב של המצלמה
    this.restoreCameraState(currentCameraState);
  }

  // פונקציה להחלפת סוג קורת המדפים
  changeShelfBeamType() {
    // עצירת האנימציה האוטומטית למשך 30 שניות
    this.hasUserInteracted = true;
    this.resetInactivityTimer();
    
    if (!this.product || !this.product.params) {
      return;
    }

    // שמירת המצב הנוכחי של המצלמה
    const currentCameraState = this.saveCurrentCameraState();

    // זיהוי סוג המוצר
    const isTable = this.product.name === 'table';

    // חיפוש קורות המדפים
    let shelfBeams: any[] = [];
    let shelfParam: any = null;
    this.product.params.forEach((param: any) => {
      if (isTable) {
        // שולחן - חיפוש פרמטר plata
        if (param.type === 'beamSingle' && param.name === 'plata' && param.beams && param.beams.length > 0) {
          shelfBeams = param.beams;
          shelfParam = param;
        }
      } else {
        // ארון - חיפוש פרמטר shelfs
        if (param.type === 'beamArray' && param.name === 'shelfs' && param.beams && param.beams.length > 0) {
          shelfBeams = param.beams;
          shelfParam = param;
        }
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

    // יצירת המודל מחדש ללא עדכון מצלמה
    this.createSimpleProductWithoutCameraUpdate();
    this.updateCameraPosition(); // עדכון מצלמה לשינויים אוטומטיים
    
    // שחזור המצב של המצלמה
    this.restoreCameraState(currentCameraState);
  }

  // פונקציות אוטומטיות להחלפת קורות (ללא עצירת האנימציה)
  private changeFrameBeamTypeAuto() {
    if (!this.product || !this.product.params) {
      return;
    }

    // שמירת המצב הנוכחי של המצלמה
    const currentCameraState = this.saveCurrentCameraState();

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
      console.log('עדכון מידות קורת חיזוק (אוטומטי):', { beamWidth, beamHeight, frameWidthCm: this.dynamicParams.frameWidth, frameHeightCm: this.dynamicParams.frameHeight });
    } else {
      // אם אין types, נשתמש במידות הקורה עצמה
      const beamWidth = beam.width || 50; // ברירת מחדל 50 מ"מ
      const beamHeight = beam.height || 50; // ברירת מחדל 50 מ"מ
      this.dynamicParams.frameWidth = beamHeight / 10;
      this.dynamicParams.frameHeight = beamWidth / 10;
      console.log('עדכון מידות קורת חיזוק (אוטומטי, ללא types):', { beamWidth, beamHeight, frameWidthCm: this.dynamicParams.frameWidth, frameHeightCm: this.dynamicParams.frameHeight });
    }

    console.log(`החלפתי קורת חיזוק אוטומטית לקורה ${randomBeamIndex}, סוג ${randomTypeIndex}:`, beam);

    // יצירת המודל מחדש ללא עדכון מצלמה
    this.createSimpleProductWithoutCameraUpdate();
    this.updateCameraPosition(); // עדכון מצלמה לשינויים אוטומטיים
    
    // שחזור המצב של המצלמה
    this.restoreCameraState(currentCameraState);
  }

  private changeShelfBeamTypeAuto() {
    if (!this.product || !this.product.params) {
      return;
    }

    // שמירת המצב הנוכחי של המצלמה
    const currentCameraState = this.saveCurrentCameraState();

    // זיהוי סוג המוצר
    const isTable = this.product.name === 'table';

    // חיפוש קורות המדפים
    let shelfBeams: any[] = [];
    let shelfParam: any = null;
    this.product.params.forEach((param: any) => {
      if (isTable) {
        // שולחן - חיפוש פרמטר plata
        if (param.type === 'beamSingle' && param.name === 'plata' && param.beams && param.beams.length > 0) {
          shelfBeams = param.beams;
          shelfParam = param;
        }
      } else {
        // ארון - חיפוש פרמטר shelfs
        if (param.type === 'beamArray' && param.name === 'shelfs' && param.beams && param.beams.length > 0) {
          shelfBeams = param.beams;
          shelfParam = param;
        }
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
      console.log('עדכון מידות קורת מדפים (אוטומטי):', { beamWidth, beamHeight, beamWidthCm: this.dynamicParams.beamWidth, beamHeightCm: this.dynamicParams.beamHeight });
    } else {
      // אם אין types, נשתמש במידות הקורה עצמה
      const beamWidth = beam.width || 100; // ברירת מחדל 100 מ"מ
      const beamHeight = beam.height || 25; // ברירת מחדל 25 מ"מ
      this.dynamicParams.beamWidth = beamWidth / 10;
      this.dynamicParams.beamHeight = beamHeight / 10;
      console.log('עדכון מידות קורת מדפים (אוטומטי, ללא types):', { beamWidth, beamHeight, beamWidthCm: this.dynamicParams.beamWidth, beamHeightCm: this.dynamicParams.beamHeight });
    }

    console.log(`החלפתי קורת מדפים אוטומטית לקורה ${randomBeamIndex}, סוג ${randomTypeIndex}:`, beam);

    // יצירת המודל מחדש ללא עדכון מצלמה
    this.createSimpleProductWithoutCameraUpdate();
    this.updateCameraPosition(); // עדכון מצלמה לשינויים אוטומטיים
    
    // שחזור המצב של המצלמה
    this.restoreCameraState(currentCameraState);
  }

  // פונקציות לשליטה ברוחב
  increaseWidth() {
    // עצירת האנימציה האוטומטית למשך 30 שניות
    this.hasUserInteracted = true;
    this.resetInactivityTimer();
    
    // שמירת המצב הנוכחי של המצלמה
    const currentCameraState = this.saveCurrentCameraState();
    
    this.dynamicParams.width += 5; // הוספת 5 ס"מ
    this.createSimpleProductWithoutCameraUpdate(); // יצירת המודל מחדש ללא עדכון מצלמה
    
    // שחזור המצב של המצלמה
    this.restoreCameraState(currentCameraState);
    
    console.log('רוחב הוגדל ל:', this.dynamicParams.width);
  }

  decreaseWidth() {
    // חיפוש פרמטר הרוחב כדי לבדוק את המינימום המקורי
    const widthParam = this.product?.params?.find((p: any) => p.name === 'width');
    const minWidth = widthParam?.min || 0; // מינימום מקורי של הפרמטר
    
    if (this.dynamicParams.width > minWidth) { // הגבלה מינימלית מקורית
      // עצירת האנימציה האוטומטית למשך 30 שניות
      this.hasUserInteracted = true;
      this.resetInactivityTimer();
      
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
    // עצירת האנימציה האוטומטית למשך 30 שניות
    this.hasUserInteracted = true;
    this.resetInactivityTimer();
    
    // שמירת המצב הנוכחי של המצלמה
    const currentCameraState = this.saveCurrentCameraState();
    
    this.dynamicParams.length += 5; // הוספת 5 ס"מ
    this.createSimpleProductWithoutCameraUpdate(); // יצירת המודל מחדש ללא עדכון מצלמה
    
    // שחזור המצב של המצלמה
    this.restoreCameraState(currentCameraState);
    
    console.log('אורך הוגדל ל:', this.dynamicParams.length);
  }

  decreaseLength() {
    // חיפוש פרמטר האורך כדי לבדוק את המינימום המקורי
    const lengthParam = this.product?.params?.find((p: any) => p.name === 'depth');
    const minLength = lengthParam?.min || 0; // מינימום מקורי של הפרמטר
    
    if (this.dynamicParams.length > minLength) { // הגבלה מינימלית מקורית
      // עצירת האנימציה האוטומטית למשך 30 שניות
      this.hasUserInteracted = true;
      this.resetInactivityTimer();
      
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
    // עצירת האנימציה האוטומטית למשך 30 שניות
    this.hasUserInteracted = true;
    this.resetInactivityTimer();
    
    // שמירת המצב הנוכחי של המצלמה
    const currentCameraState = this.saveCurrentCameraState();
    
    // זיהוי סוג המוצר
    const isTable = this.product?.name === 'table';
    
    if (isTable) {
      // שולחן - הגדלת גובה המדף היחיד
      this.shelfGaps[0] += 5; // הוספת 5 ס"מ למדף היחיד
      this.dynamicParams.height = this.shelfGaps[0]; // עדכון פרמטר הגובה
      console.log('גובה שולחן הוגדל ל:', this.shelfGaps[0]);
    } else {
      // ארון - הגדלת גובה המדף השלישי
      this.shelfGaps[2] += 5; // הוספת 5 ס"מ למדף השלישי
      console.log('גובה המדף השלישי הוגדל ל:', this.shelfGaps[2]);
    }
    
    this.createSimpleProductWithoutCameraUpdate(); // יצירת המודל מחדש ללא עדכון מצלמה
    
    // עדכון הזום בהתאם לגובה הכולל
    this.restoreCameraState(currentCameraState, true);
  }

  decreaseShelfHeight() {
    // עצירת האנימציה האוטומטית למשך 30 שניות
    this.hasUserInteracted = true;
    this.resetInactivityTimer();
    
    // זיהוי סוג המוצר
    const isTable = this.product?.name === 'table';
    
    if (isTable) {
      // שולחן - הקטנת גובה המדף היחיד
      // חיפוש פרמטר הגובה כדי לבדוק את המינימום המקורי
      const heightParam = this.product?.params?.find((p: any) => p.name === 'height');
      const minHeight = heightParam?.min || 0; // מינימום מקורי של הפרמטר
      
      if (this.shelfGaps[0] > minHeight) { // הגבלה מינימלית מקורית
        // שמירת המצב הנוכחי של המצלמה
        const currentCameraState = this.saveCurrentCameraState();
        
        this.shelfGaps[0] -= 5; // הפחתת 5 ס"מ למדף היחיד
        this.dynamicParams.height = this.shelfGaps[0]; // עדכון פרמטר הגובה
        this.createSimpleProductWithoutCameraUpdate(); // יצירת המודל מחדש ללא עדכון מצלמה
        
        // עדכון הזום בהתאם לגובה הכולל
        this.restoreCameraState(currentCameraState, true);
        
        console.log('גובה שולחן הוקטן ל:', this.shelfGaps[0]);
      }
    } else {
      // ארון - הקטנת גובה המדף השלישי
      // חיפוש פרמטר הגובה כדי לבדוק את המינימום המקורי
      const shelfsParam = this.product?.params?.find((p: any) => p.type === 'beamArray' && p.name === 'shelfs');
      const minHeight = shelfsParam?.min || 0; // מינימום מקורי של הפרמטר
      
      if (this.shelfGaps[2] > minHeight) { // הגבלה מינימלית מקורית
        // שמירת המצב הנוכחי של המצלמה
        const currentCameraState = this.saveCurrentCameraState();
        
        this.shelfGaps[2] -= 5; // הפחתת 5 ס"מ למדף השלישי
        this.createSimpleProductWithoutCameraUpdate(); // יצירת המודל מחדש ללא עדכון מצלמה
        
        // עדכון הזום בהתאם לגובה הכולל
        this.restoreCameraState(currentCameraState, true);
        
        console.log('גובה המדף השלישי הוקטן ל:', this.shelfGaps[2]);
      }
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
      this.spherical.radius = Math.max(5, Math.min(500, this.spherical.radius)); // הגבלת טווח זום מורחבת
      
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

    // Mobile touch support
    let lastTouchDist = 0;
    let lastTouchAngle = 0;
    let lastTouchX = 0;
    let lastTouchY = 0;
    let isTouchRotating = false;
    let isTouchZooming = false;
    let isTouchPanning = false;
    
    container.addEventListener('touchstart', (event: TouchEvent) => {
      this.hasUserInteracted = true; // המשתמש התחיל להזיז
      this.resetInactivityTimer(); // אפס את טיימר חוסר הפעילות
      
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

    container.addEventListener('touchmove', (event: TouchEvent) => {
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
        if (newDistance < 5) newDistance = 5; // הגבלה מינימלית נמוכה יותר
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

    container.addEventListener('touchend', (event: TouchEvent) => {
      isTouchRotating = false;
      isTouchZooming = false;
      isTouchPanning = false;
    });

    // הגדרת סגנון עכבר
    container.style.cursor = 'grab';
  }

  private initializeParamsFromProduct() {
    if (!this.product || !this.product.params) {
      // אם אין product או params, נשתמש בערכי ברירת מחדל
      return;
    }

    // זיהוי סוג המוצר
    const isTable = this.product.name === 'table';

    // אתחול אינדקס הקורה הנוכחית - תמיד הקורה הראשונה וה-type הראשון שלה
    this.currentBeamIndex = 0;
    this.currentBeamTypeIndex = 0;
    
    // אתחול הקורה הראשונה של המדפים אם יש קורות זמינות
    let shelfBeams: any[] = [];
    
    // חיפוש קורות המדפים
    this.product.params.forEach((param: any) => {
      if (isTable) {
        // שולחן - חיפוש פרמטר plata
        if (param.type === 'beamSingle' && param.name === 'plata' && param.beams && param.beams.length > 0) {
          shelfBeams = param.beams;
        }
      } else {
        // ארון - חיפוש פרמטר shelfs
        if (param.type === 'beamArray' && param.name === 'shelfs' && param.beams && param.beams.length > 0) {
          shelfBeams = param.beams;
        }
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
      } else if (isTable && param.type === 'beamSingle' && param.name === 'plata') {
        // שולחן - טיפול בפרמטר plata
        if (param.beams && param.beams.length > 0) {
          const beam = param.beams[param.selectedBeamIndex || 0];
          console.log('plata beam:', beam);
          // המרה ממ"מ לס"מ כמו בקובץ הראשי
          const beamWidth = beam.width || 100; // ברירת מחדל 100 מ"מ
          const beamHeight = beam.height || 25; // ברירת מחדל 25 מ"מ
          this.dynamicParams.beamWidth = beamWidth / 10; // המרה ממ"מ לס"מ
          this.dynamicParams.beamHeight = beamHeight / 10; // המרה ממ"מ לס"מ
          console.log('אתחול מידות קורת פלטה:', { beamWidth, beamHeight, beamWidthCm: this.dynamicParams.beamWidth, beamHeightCm: this.dynamicParams.beamHeight });
        }
        // שולחן - יש רק מדף אחד
        this.dynamicParams.shelfCount = 1;
        
        // גובה המדף נקבע על ידי פרמטר height
        const heightParam = this.product?.params?.find((p: any) => p.name === 'height');
        const tableHeight = heightParam ? this.dynamicParams.height || heightParam.default || 80 : 80;
        this.shelfGaps = [tableHeight]; // מדף אחד בגובה שנקבע
        console.log('גובה מדף שולחן נטען:', this.shelfGaps);
      }
    });

    // אתחול ברירת מחדל עבור שולחן אם shelfGaps עדיין ריק
    if (isTable && this.shelfGaps.length === 0) {
      const heightParam = this.product?.params?.find((p: any) => p.name === 'height');
      const tableHeight = heightParam ? heightParam.default || 80 : 80;
      this.shelfGaps = [tableHeight];
      this.dynamicParams.height = tableHeight;
      console.log('אתחול ברירת מחדל לגובה שולחן:', this.shelfGaps);
    }

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
    
    // זיהוי סוג המוצר - שולחן או ארון
    const isTable = this.product?.name === 'table';
    console.log('סוג מוצר:', isTable ? 'שולחן' : 'ארון');
    
    // קבלת רשימת gaps מהמוצר
    let shelfsParam = null;
    let shelfGaps = [];
    let totalShelves = 0;
    
    if (isTable) {
      // שולחן - יש רק מדף אחד בגובה שנקבע על ידי shelfGaps[0]
      shelfGaps = [this.shelfGaps[0]]; // מדף אחד בגובה שנקבע מ-shelfGaps
      totalShelves = 1;
      
      // עבור שולחן, נשתמש בפרמטר plata במקום shelfs
      shelfsParam = this.product?.params?.find((p: any) => p.type === 'beamSingle' && p.name === 'plata');
    } else {
      // ארון - שימוש בגבהי המדפים הנוכחיים
      shelfsParam = this.product?.params?.find((p: any) => p.type === 'beamArray' && p.name === 'shelfs');
      shelfGaps = this.shelfGaps;
      totalShelves = shelfGaps.length;
    }

    // קבלת סוג הקורה והעץ מהפרמטרים - זהה לקובץ הראשי
    let shelfBeam = null;
    let shelfType = null;
    console.log('shelfsParam:', shelfsParam);
    if (shelfsParam && Array.isArray(shelfsParam.beams) && shelfsParam.beams.length) {
      console.log('selectedBeamIndex:', shelfsParam.selectedBeamIndex);
      console.log('selectedBeamTypeIndex:', shelfsParam.selectedBeamTypeIndex);
      shelfBeam = shelfsParam.beams[shelfsParam.selectedBeamIndex || 0];
      console.log('shelfBeam:', shelfBeam);
      console.log('shelfBeam.types:', shelfBeam ? shelfBeam.types : 'null');
      shelfType = shelfBeam.types && shelfBeam.types.length ? shelfBeam.types[shelfsParam.selectedBeamTypeIndex || 0] : null;
    }
    
    // קבלת טקסטורת עץ לקורות המדפים - זהה לקובץ הראשי
    console.log('shelfType:', shelfType);
    console.log('shelfType.name:', shelfType ? shelfType.name : 'null');
    const shelfWoodTexture = this.getWoodTexture(shelfType ? shelfType.name : '');
    
    // קבלת סוג הקורה והעץ של קורות החיזוק מהפרמטרים
    const frameParam = this.product?.params?.find((p: any) => p.type === 'beamSingle' && p.name === 'leg');
    let frameBeam = null;
    let frameType = null;
    console.log('frameParam:', frameParam);
    if (frameParam && Array.isArray(frameParam.beams) && frameParam.beams.length) {
      console.log('frameParam.selectedBeamIndex:', frameParam.selectedBeamIndex);
      console.log('frameParam.selectedBeamTypeIndex:', frameParam.selectedBeamTypeIndex);
      frameBeam = frameParam.beams[frameParam.selectedBeamIndex || 0];
      console.log('frameBeam:', frameBeam);
      console.log('frameBeam.types:', frameBeam ? frameBeam.types : 'null');
      frameType = frameBeam.types && frameBeam.types.length ? frameBeam.types[frameParam.selectedBeamTypeIndex || 0] : null;
    }
    
    // קבלת טקסטורת עץ לקורות החיזוק
    console.log('frameType:', frameType);
    console.log('frameType.name:', frameType ? frameType.name : 'null');
    const frameWoodTexture = this.getWoodTexture(frameType ? frameType.name : '');
    
    // חישוב מידות אמיתיות של קורת החיזוק פעם אחת
    let actualFrameWidth = this.dynamicParams.frameWidth;
    let actualFrameHeight = this.dynamicParams.frameHeight;
    if (frameType) {
      actualFrameWidth = frameType.width ? frameType.width / 10 : this.dynamicParams.frameWidth;
      actualFrameHeight = frameType.height ? frameType.height / 10 : this.dynamicParams.frameHeight;
    } else if (frameBeam) {
      actualFrameWidth = frameBeam.width ? frameBeam.width / 10 : this.dynamicParams.frameWidth;
      actualFrameHeight = frameBeam.height ? frameBeam.height / 10 : this.dynamicParams.frameHeight;
    }
    
    // בדיקות בטיחות למידות
    actualFrameWidth = actualFrameWidth || 5; // ברירת מחדל 5 ס"מ
    actualFrameHeight = actualFrameHeight || 5; // ברירת מחדל 5 ס"מ
    
    console.log('מידות אמיתיות של קורת החיזוק:');
    console.log('actualFrameWidth:', actualFrameWidth);
    console.log('actualFrameHeight:', actualFrameHeight);
    
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
          beam.depth = beam.depth - 2 * actualFrameWidth;
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
      
      // Frame beams (קורת חיזוק) - רק עבור ארון, לא עבור שולחן
      if (!isTable) {
        const frameBeams = this.createFrameBeams(
          this.dynamicParams.width,
          this.dynamicParams.length,
          actualFrameWidth,
          actualFrameHeight,
          actualFrameWidth, // legWidth
          actualFrameHeight  // legDepth - עומק הרגל מקורת החיזוק
        );
        
        for (const beam of frameBeams) {
          const frameGeometry = new THREE.BoxGeometry(beam.width, beam.height, beam.depth);
          this.setCorrectTextureMapping(frameGeometry, beam.width, beam.height, beam.depth);
          const frameMaterial = new THREE.MeshStandardMaterial({ map: frameWoodTexture });
          const frameMesh = new THREE.Mesh(frameGeometry, frameMaterial);
          frameMesh.position.set(beam.x, currentY + beam.height / 2, beam.z);
          frameMesh.castShadow = true;
          frameMesh.receiveShadow = true;
          this.scene.add(frameMesh);
          this.meshes.push(frameMesh);
        }
      }
      
      // Add the height of the shelf itself for the next shelf
      currentY += actualFrameHeight + this.dynamicParams.beamHeight;
    }

    // יצירת רגליים (legs) - זהה לקורות החיזוק
    // הרגליים משתמשות באותן הגדרות של קורות החיזוק
    // לא צריך לחפש פרמטר נפרד - משתמשים ב-frameParam שכבר נמצא
    console.log('רגליים משתמשות בהגדרות קורות החיזוק:');
    console.log('frameType.name:', frameType ? frameType.name : 'null');
    console.log('frameWidth:', this.dynamicParams.frameWidth);
    console.log('frameHeight:', this.dynamicParams.frameHeight);

    // חישוב גובה הרגליים - הרגליים מגיעות רק עד לקורות החיזוק התחתונות
    let totalY = 0;
    for (let i = 0; i < totalShelves; i++) {
      const safeShelfGap = shelfGaps[i] || 30; // ברירת מחדל 30 ס"מ
      const safeActualFrameHeight = actualFrameHeight || 5; // ברירת מחדל 5 ס"מ
      const safeBeamHeight = this.dynamicParams.beamHeight || 2.5; // ברירת מחדל 2.5 ס"מ
      totalY += safeShelfGap + safeActualFrameHeight + safeBeamHeight; // גובה מלא
    }
    // הרגליים מגיעות רק עד לקורות החיזוק התחתונות (לא כולל קורות המדפים העליונות)
    // הרגליים צריכות להיות בגובה הכולל פחות גובה קורת מדף העליונה ופחות מרווח המדף העליון
    // הרגליים מגיעות רק עד לקורות החיזוק התחתונות, לא עד קורות המדפים העליונות
    // לפי הלוגיקה של threejs-box: legHeight = topHeight - shelfBeamHeight
    const safeBeamHeight = this.dynamicParams.beamHeight || 2.5; // גובה קורת מדף
    const legHeight = Math.max(totalY - safeBeamHeight, 20); // מינימום 20 ס"מ
    
    console.log('חישוב גובה רגליים:', {
      totalY,
      safeBeamHeight,
      legHeight,
      shelfGapsLength: shelfGaps.length,
      totalShelves
    });
    
    
    // קבלת מידות הרגליים מקורת החיזוק (לא מקורת הפלטה)
    let legWidth = actualFrameWidth;
    let legDepth = actualFrameHeight;
    if (isTable && frameBeam) {
      // עבור שולחן, נשתמש במידות קורת הפלטה
      legWidth = frameBeam.width ? frameBeam.width / 10 : actualFrameWidth; // רוחב הרגל מקורת החיזוק
      legDepth = frameBeam.height ? frameBeam.height / 10 : actualFrameHeight; // עומק הרגל מקורת החיזוק
      console.log('מידות רגליים משולחן (מקורת חיזוק):', { legWidth, legDepth, frameBeam });
    }

    // מיקום הרגליים - זהה לקובץ הראשי
    const legPositions = [
      [-this.dynamicParams.width/2 + legWidth/2, 0, -this.dynamicParams.length/2 + legDepth/2],
      [this.dynamicParams.width/2 - legWidth/2, 0, -this.dynamicParams.length/2 + legDepth/2],
      [-this.dynamicParams.width/2 + legWidth/2, 0, this.dynamicParams.length/2 - legDepth/2],
      [this.dynamicParams.width/2 - legWidth/2, 0, this.dynamicParams.length/2 - legDepth/2]
    ];

    legPositions.forEach(pos => {
      // בדיקות בטיחות למידות הרגל
      const safeLegHeight = legHeight || 10; // ברירת מחדל 10 ס"מ
      const safeLegWidth = legWidth || 5; // ברירת מחדל 5 ס"מ
      const safeLegDepth = legDepth || 5; // ברירת מחדל 5 ס"מ
      
      const legGeometry = new THREE.BoxGeometry(
        safeLegWidth,
        safeLegHeight,
        safeLegDepth
      );
      this.setCorrectTextureMapping(legGeometry, legWidth, legHeight, legDepth);
      const legMaterial = new THREE.MeshStandardMaterial({ map: frameWoodTexture });
      const leg = new THREE.Mesh(legGeometry, legMaterial);
      leg.position.set(pos[0], legHeight/2, pos[2]);
      leg.castShadow = true;
      leg.receiveShadow = true;
      this.scene.add(leg);
      this.meshes.push(leg);
    });

    // יצירת קורות חיזוק עבור שולחן - אחרי הרגליים
    if (isTable) {
      // סט ראשון: קורות חיזוק מתחת למדף (בגובה הרגליים)
      const frameBeams = this.createFrameBeams(
        this.dynamicParams.width,
        this.dynamicParams.length,
        actualFrameWidth,
        actualFrameHeight,
        legWidth, // legWidth - מידות נכונות מהפלטה
        legDepth  // legDepth - מידות נכונות מהפלטה
      );
      
      for (const beam of frameBeams) {
        const frameGeometry = new THREE.BoxGeometry(beam.width, beam.height, beam.depth);
        this.setCorrectTextureMapping(frameGeometry, beam.width, beam.height, beam.depth);
        const frameMaterial = new THREE.MeshStandardMaterial({ map: frameWoodTexture });
        const frameMesh = new THREE.Mesh(frameGeometry, frameMaterial);
        // מיקום קורות החיזוק מתחת למדף (בגובה הרגליים) - קיצור בגובה קורת המדף
        frameMesh.position.set(beam.x, currentY - beam.height / 2 - this.dynamicParams.beamHeight, beam.z);
        frameMesh.castShadow = true;
        frameMesh.receiveShadow = true;
        this.scene.add(frameMesh);
        this.meshes.push(frameMesh);
      }
      
      // סט שני: קורות חיזוק נוספות (extraBeam) מתחת לסט הראשון
      const extraBeamParam = this.product?.params?.find((p: any) => p.name === 'extraBeam');
      if (extraBeamParam && extraBeamParam.default > 0) {
        const extraBeamDistance = extraBeamParam.default;
        console.log('Adding extra frame beams for table with distance:', extraBeamDistance);
        
        // יצירת קורות חיזוק נוספות באותו מיקום אבל יותר נמוך
        const extraFrameBeams = this.createFrameBeams(
          this.dynamicParams.width,
          this.dynamicParams.length,
          actualFrameWidth,
          actualFrameHeight,
          legWidth, // legWidth - מידות נכונות מהפלטה
          legDepth  // legDepth - מידות נכונות מהפלטה
        );
        
        // המרחק הכולל = הנתון החדש + גובה קורות החיזוק
        const totalDistance = extraBeamDistance + actualFrameHeight;
        console.log('Extra beam calculation:', { extraBeamDistance, actualFrameHeight, totalDistance });
        
        for (const beam of extraFrameBeams) {
          const extraFrameGeometry = new THREE.BoxGeometry(beam.width, beam.height, beam.depth);
          this.setCorrectTextureMapping(extraFrameGeometry, beam.width, beam.height, beam.depth);
          const extraFrameMaterial = new THREE.MeshStandardMaterial({ map: frameWoodTexture });
          const extraFrameMesh = new THREE.Mesh(extraFrameGeometry, extraFrameMaterial);
          // מיקום יותר נמוך במידת totalDistance (הנתון החדש + גובה קורות החיזוק) - קיצור נוסף בגובה קורת המדף
          extraFrameMesh.position.set(beam.x, currentY - beam.height / 2 - totalDistance - this.dynamicParams.beamHeight, beam.z);
          extraFrameMesh.castShadow = true;
          extraFrameMesh.receiveShadow = true;
          this.scene.add(extraFrameMesh);
          this.meshes.push(extraFrameMesh);
          console.log('Created extra frame beam at position:', beam.x, currentY - beam.height / 2 - totalDistance - this.dynamicParams.beamHeight, beam.z);
        }
      }
    }

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
    
    // זיהוי סוג המוצר - שולחן או ארון
    const isTable = this.product?.name === 'table';
    console.log('סוג מוצר:', isTable ? 'שולחן' : 'ארון');
    
    // קבלת רשימת gaps מהמוצר
    let shelfsParam = null;
    let shelfGaps = [];
    let totalShelves = 0;
    
    if (isTable) {
      // שולחן - יש רק מדף אחד בגובה שנקבע על ידי shelfGaps[0]
      shelfGaps = [this.shelfGaps[0]]; // מדף אחד בגובה שנקבע מ-shelfGaps
      totalShelves = 1;
      
      // עבור שולחן, נשתמש בפרמטר plata במקום shelfs
      shelfsParam = this.product?.params?.find((p: any) => p.type === 'beamSingle' && p.name === 'plata');
    } else {
      // ארון - שימוש בגבהי המדפים הנוכחיים
      shelfsParam = this.product?.params?.find((p: any) => p.type === 'beamArray' && p.name === 'shelfs');
      shelfGaps = this.shelfGaps;
      totalShelves = shelfGaps.length;
    }

    // קבלת סוג הקורה והעץ מהפרמטרים - זהה לקובץ הראשי
    let shelfBeam = null;
    let shelfType = null;
    console.log('shelfsParam:', shelfsParam);
    if (shelfsParam && Array.isArray(shelfsParam.beams) && shelfsParam.beams.length) {
      console.log('selectedBeamIndex:', shelfsParam.selectedBeamIndex);
      console.log('selectedBeamTypeIndex:', shelfsParam.selectedBeamTypeIndex);
      shelfBeam = shelfsParam.beams[shelfsParam.selectedBeamIndex || 0];
      console.log('shelfBeam:', shelfBeam);
      console.log('shelfBeam.types:', shelfBeam ? shelfBeam.types : 'null');
      shelfType = shelfBeam.types && shelfBeam.types.length ? shelfBeam.types[shelfsParam.selectedBeamTypeIndex || 0] : null;
    }
    
    // קבלת טקסטורת עץ לקורות המדפים - זהה לקובץ הראשי
    console.log('shelfType:', shelfType);
    console.log('shelfType.name:', shelfType ? shelfType.name : 'null');
    const shelfWoodTexture = this.getWoodTexture(shelfType ? shelfType.name : '');
    
    // קבלת סוג הקורה והעץ של קורות החיזוק מהפרמטרים
    const frameParam = this.product?.params?.find((p: any) => p.type === 'beamSingle' && p.name === 'leg');
    let frameBeam = null;
    let frameType = null;
    console.log('frameParam:', frameParam);
    if (frameParam && Array.isArray(frameParam.beams) && frameParam.beams.length) {
      console.log('frameParam.selectedBeamIndex:', frameParam.selectedBeamIndex);
      console.log('frameParam.selectedBeamTypeIndex:', frameParam.selectedBeamTypeIndex);
      frameBeam = frameParam.beams[frameParam.selectedBeamIndex || 0];
      console.log('frameBeam:', frameBeam);
      console.log('frameBeam.types:', frameBeam ? frameBeam.types : 'null');
      frameType = frameBeam.types && frameBeam.types.length ? frameBeam.types[frameParam.selectedBeamTypeIndex || 0] : null;
    }
    
    // קבלת טקסטורת עץ לקורות החיזוק
    console.log('frameType:', frameType);
    console.log('frameType.name:', frameType ? frameType.name : 'null');
    const frameWoodTexture = this.getWoodTexture(frameType ? frameType.name : '');
    
    // חישוב מידות אמיתיות של קורת החיזוק פעם אחת
    let actualFrameWidth = this.dynamicParams.frameWidth;
    let actualFrameHeight = this.dynamicParams.frameHeight;
    if (frameType) {
      actualFrameWidth = frameType.width ? frameType.width / 10 : this.dynamicParams.frameWidth;
      actualFrameHeight = frameType.height ? frameType.height / 10 : this.dynamicParams.frameHeight;
    } else if (frameBeam) {
      actualFrameWidth = frameBeam.width ? frameBeam.width / 10 : this.dynamicParams.frameWidth;
      actualFrameHeight = frameBeam.height ? frameBeam.height / 10 : this.dynamicParams.frameHeight;
    }
    
    // בדיקות בטיחות למידות
    actualFrameWidth = actualFrameWidth || 5; // ברירת מחדל 5 ס"מ
    actualFrameHeight = actualFrameHeight || 5; // ברירת מחדל 5 ס"מ
    
    console.log('מידות אמיתיות של קורת החיזוק:');
    console.log('actualFrameWidth:', actualFrameWidth);
    console.log('actualFrameHeight:', actualFrameHeight);
    
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
          beam.depth = beam.depth - 2 * actualFrameWidth;
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
      
      // Frame beams (קורת חיזוק) - רק עבור ארון, לא עבור שולחן
      if (!isTable) {
        const frameBeams = this.createFrameBeams(
          this.dynamicParams.width,
          this.dynamicParams.length,
          actualFrameWidth,
          actualFrameHeight,
          actualFrameWidth, // legWidth
          actualFrameHeight  // legDepth - עומק הרגל מקורת החיזוק
        );
        
        for (const beam of frameBeams) {
          const frameGeometry = new THREE.BoxGeometry(beam.width, beam.height, beam.depth);
          this.setCorrectTextureMapping(frameGeometry, beam.width, beam.height, beam.depth);
          const frameMaterial = new THREE.MeshStandardMaterial({ map: frameWoodTexture });
          const frameMesh = new THREE.Mesh(frameGeometry, frameMaterial);
          frameMesh.position.set(beam.x, currentY + beam.height / 2, beam.z);
          frameMesh.castShadow = true;
          frameMesh.receiveShadow = true;
          this.scene.add(frameMesh);
          this.meshes.push(frameMesh);
        }
      }
      
      // Add the height of the shelf itself for the next shelf
      currentY += actualFrameHeight + this.dynamicParams.beamHeight;
    }

    // יצירת רגליים (legs) - זהה לקורות החיזוק
    // הרגליים משתמשות באותן הגדרות של קורות החיזוק
    // לא צריך לחפש פרמטר נפרד - משתמשים ב-frameParam שכבר נמצא
    console.log('רגליים משתמשות בהגדרות קורות החיזוק:');
    console.log('frameType.name:', frameType ? frameType.name : 'null');
    console.log('frameWidth:', this.dynamicParams.frameWidth);
    console.log('frameHeight:', this.dynamicParams.frameHeight);

    // חישוב גובה הרגליים - הרגליים מגיעות רק עד לקורות החיזוק התחתונות
    let totalY = 0;
    for (let i = 0; i < totalShelves; i++) {
      const safeShelfGap = shelfGaps[i] || 30; // ברירת מחדל 30 ס"מ
      const safeActualFrameHeight = actualFrameHeight || 5; // ברירת מחדל 5 ס"מ
      const safeBeamHeight = this.dynamicParams.beamHeight || 2.5; // ברירת מחדל 2.5 ס"מ
      totalY += safeShelfGap + safeActualFrameHeight + safeBeamHeight; // גובה מלא
    }
    // הרגליים מגיעות רק עד לקורות החיזוק התחתונות (לא כולל קורות המדפים העליונות)
    // הרגליים צריכות להיות בגובה הכולל פחות גובה קורת מדף העליונה ופחות מרווח המדף העליון
    // הרגליים מגיעות רק עד לקורות החיזוק התחתונות, לא עד קורות המדפים העליונות
    // לפי הלוגיקה של threejs-box: legHeight = topHeight - shelfBeamHeight
    const safeBeamHeight = this.dynamicParams.beamHeight || 2.5; // גובה קורת מדף
    const legHeight = Math.max(totalY - safeBeamHeight, 20); // מינימום 20 ס"מ
    
    console.log('חישוב גובה רגליים:', {
      totalY,
      safeBeamHeight,
      legHeight,
      shelfGapsLength: shelfGaps.length,
      totalShelves
    });
    
    
    // קבלת מידות הרגליים מקורת החיזוק (לא מקורת הפלטה)
    let legWidth = actualFrameWidth;
    let legDepth = actualFrameHeight;
    if (isTable && frameBeam) {
      // עבור שולחן, נשתמש במידות קורת הפלטה
      legWidth = frameBeam.width ? frameBeam.width / 10 : actualFrameWidth; // רוחב הרגל מקורת החיזוק
      legDepth = frameBeam.height ? frameBeam.height / 10 : actualFrameHeight; // עומק הרגל מקורת החיזוק
      console.log('מידות רגליים משולחן (מקורת חיזוק):', { legWidth, legDepth, frameBeam });
    }

    // מיקום הרגליים - זהה לקובץ הראשי
    const legPositions = [
      [-this.dynamicParams.width/2 + legWidth/2, 0, -this.dynamicParams.length/2 + legDepth/2],
      [this.dynamicParams.width/2 - legWidth/2, 0, -this.dynamicParams.length/2 + legDepth/2],
      [-this.dynamicParams.width/2 + legWidth/2, 0, this.dynamicParams.length/2 - legDepth/2],
      [this.dynamicParams.width/2 - legWidth/2, 0, this.dynamicParams.length/2 - legDepth/2]
    ];

    legPositions.forEach(pos => {
      // בדיקות בטיחות למידות הרגל
      const safeLegHeight = legHeight || 10; // ברירת מחדל 10 ס"מ
      const safeLegWidth = legWidth || 5; // ברירת מחדל 5 ס"מ
      const safeLegDepth = legDepth || 5; // ברירת מחדל 5 ס"מ
      
      const legGeometry = new THREE.BoxGeometry(
        safeLegWidth,
        safeLegHeight,
        safeLegDepth
      );
      this.setCorrectTextureMapping(legGeometry, legWidth, legHeight, legDepth);
      const legMaterial = new THREE.MeshStandardMaterial({ map: frameWoodTexture });
      const leg = new THREE.Mesh(legGeometry, legMaterial);
      leg.position.set(pos[0], legHeight/2, pos[2]);
      leg.castShadow = true;
      leg.receiveShadow = true;
      this.scene.add(leg);
      this.meshes.push(leg);
    });

    // יצירת קורות חיזוק עבור שולחן - אחרי הרגליים
    if (isTable) {
      // סט ראשון: קורות חיזוק מתחת למדף (בגובה הרגליים)
      const frameBeams = this.createFrameBeams(
        this.dynamicParams.width,
        this.dynamicParams.length,
        actualFrameWidth,
        actualFrameHeight,
        legWidth, // legWidth - מידות נכונות מהפלטה
        legDepth  // legDepth - מידות נכונות מהפלטה
      );
      
      for (const beam of frameBeams) {
        const frameGeometry = new THREE.BoxGeometry(beam.width, beam.height, beam.depth);
        this.setCorrectTextureMapping(frameGeometry, beam.width, beam.height, beam.depth);
        const frameMaterial = new THREE.MeshStandardMaterial({ map: frameWoodTexture });
        const frameMesh = new THREE.Mesh(frameGeometry, frameMaterial);
        // מיקום קורות החיזוק מתחת למדף (בגובה הרגליים) - קיצור בגובה קורת המדף
        frameMesh.position.set(beam.x, currentY - beam.height / 2 - this.dynamicParams.beamHeight, beam.z);
        frameMesh.castShadow = true;
        frameMesh.receiveShadow = true;
        this.scene.add(frameMesh);
        this.meshes.push(frameMesh);
      }
      
      // סט שני: קורות חיזוק נוספות (extraBeam) מתחת לסט הראשון
      const extraBeamParam = this.product?.params?.find((p: any) => p.name === 'extraBeam');
      if (extraBeamParam && extraBeamParam.default > 0) {
        const extraBeamDistance = extraBeamParam.default;
        console.log('Adding extra frame beams for table with distance:', extraBeamDistance);
        
        // יצירת קורות חיזוק נוספות באותו מיקום אבל יותר נמוך
        const extraFrameBeams = this.createFrameBeams(
          this.dynamicParams.width,
          this.dynamicParams.length,
          actualFrameWidth,
          actualFrameHeight,
          legWidth, // legWidth - מידות נכונות מהפלטה
          legDepth  // legDepth - מידות נכונות מהפלטה
        );
        
        // המרחק הכולל = הנתון החדש + גובה קורות החיזוק
        const totalDistance = extraBeamDistance + actualFrameHeight;
        console.log('Extra beam calculation:', { extraBeamDistance, actualFrameHeight, totalDistance });
        
        for (const beam of extraFrameBeams) {
          const extraFrameGeometry = new THREE.BoxGeometry(beam.width, beam.height, beam.depth);
          this.setCorrectTextureMapping(extraFrameGeometry, beam.width, beam.height, beam.depth);
          const extraFrameMaterial = new THREE.MeshStandardMaterial({ map: frameWoodTexture });
          const extraFrameMesh = new THREE.Mesh(extraFrameGeometry, extraFrameMaterial);
          // מיקום יותר נמוך במידת totalDistance (הנתון החדש + גובה קורות החיזוק) - קיצור נוסף בגובה קורת המדף
          extraFrameMesh.position.set(beam.x, currentY - beam.height / 2 - totalDistance - this.dynamicParams.beamHeight, beam.z);
          extraFrameMesh.castShadow = true;
          extraFrameMesh.receiveShadow = true;
          this.scene.add(extraFrameMesh);
          this.meshes.push(extraFrameMesh);
          console.log('Created extra frame beam at position:', beam.x, currentY - beam.height / 2 - totalDistance - this.dynamicParams.beamHeight, beam.z);
        }
      }
    }

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
    
    console.log('createFrameBeams called with:', { totalWidth, totalLength, frameWidth, frameHeight, legWidth, legDepth });
    console.log('Using frameBeamWidth/Height:', frameBeamWidth, frameBeamHeight);
    console.log('Leg width/depth:', legWidth, legDepth);
    console.log('Total width/length:', totalWidth, totalLength);
    
    const beams = [];
    // X axis beams (front/back) - קורות אופקיות קדמיות ואחוריות
    for (const z of [
      -totalLength / 2 + legDepth / 2,    // קדמית - צמודה לקצה לפי מידות הרגליים
      totalLength / 2 - legDepth / 2      // אחורית - צמודה לקצה לפי מידות הרגליים
    ]) {
      const beamWidth = totalWidth - 2 * frameBeamWidth;
      console.log('Creating horizontal frame beam:', {
        z: z,
        beamWidth: beamWidth,
        totalWidth: totalWidth,
        legWidth: legWidth,
        beamStart: -beamWidth / 2,
        beamEnd: beamWidth / 2,
        legStart: -totalWidth / 2 + legWidth / 2,
        legEnd: totalWidth / 2 - legWidth / 2
      });
      beams.push({
        x: 0,  // ממורכזות במרכז
        y: 0,
        z: z,  // מיקום זהה לארון
        width: beamWidth,  // עבור שולחן וארון, רוחב מותאם לעובי הרגליים
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
      console.log('Creating vertical frame beam:', {
        originalX: originalX,
        adjustedX: adjustedX,
        legWidth: legWidth,
        beamDepth: totalLength - 2 * legDepth
      });
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
    const shelfsParam = this.product?.params?.find((p: any) => p.type === 'beamArray' && p.name === 'shelfs');
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

  // פונקציות לבדיקת גבולות עבור disabled של כפתורים
  isWidthAtMinimum(): boolean {
    const widthParam = this.product?.params?.find((p: any) => p.name === 'width');
    if (!widthParam) return true;
    
    const minWidth = widthParam.min || 0;
    return this.dynamicParams.width <= minWidth;
  }

  isWidthAtMaximum(): boolean {
    const widthParam = this.product?.params?.find((p: any) => p.name === 'width');
    if (!widthParam) return true;
    
    const maxWidth = widthParam.max || 200;
    return this.dynamicParams.width >= maxWidth;
  }

  isLengthAtMinimum(): boolean {
    const lengthParam = this.product?.params?.find((p: any) => p.name === 'depth');
    if (!lengthParam) return true;
    
    const minLength = lengthParam.min || 0;
    return this.dynamicParams.length <= minLength;
  }

  isLengthAtMaximum(): boolean {
    const lengthParam = this.product?.params?.find((p: any) => p.name === 'depth');
    if (!lengthParam) return true;
    
    const maxLength = lengthParam.max || 200;
    return this.dynamicParams.length >= maxLength;
  }

  isShelfHeightAtMinimum(): boolean {
    const isTable = this.product?.name === 'table';
    
    if (isTable) {
      const heightParam = this.product?.params?.find((p: any) => p.name === 'height');
      if (!heightParam) return true;
      
      const minHeight = heightParam.min || 0;
      return this.shelfGaps[0] <= minHeight;
    } else {
      const shelfsParam = this.product?.params?.find((p: any) => p.type === 'beamArray' && p.name === 'shelfs');
      if (!shelfsParam) return true;
      
      const minHeight = shelfsParam.min || 0;
      return this.shelfGaps[2] <= minHeight;
    }
  }

  isShelfHeightAtMaximum(): boolean {
    const isTable = this.product?.name === 'table';
    
    if (isTable) {
      const heightParam = this.product?.params?.find((p: any) => p.name === 'height');
      if (!heightParam) return true;
      
      const maxHeight = heightParam.max || 200;
      return this.shelfGaps[0] >= maxHeight;
    } else {
      const shelfsParam = this.product?.params?.find((p: any) => p.type === 'beamArray' && p.name === 'shelfs');
      if (!shelfsParam) return true;
      
      const maxHeight = shelfsParam.max || 200;
      return this.shelfGaps[2] >= maxHeight;
    }
  }
}
