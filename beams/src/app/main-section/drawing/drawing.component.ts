import { Component, Input, ViewChild, ElementRef, OnInit, AfterViewInit, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-drawing',
  templateUrl: './drawing.component.html',
  styleUrls: ['./drawing.component.css']
})
export class DrawingComponent implements OnInit, AfterViewInit, OnChanges {
  @Input() isDrillingMode: boolean = false; // flag שמציין שזה מצב קידוח
  @Input() beamType: string = ''; // סוג הקורה (קורת רגל, קורת מדף וכו')
  @Input() product: any = null; // כל האובייקט של המוצר בקונפיגורציה הנוכחית
  @Input() beamLength: number = 0; // אורך הקורה בס"מ
  @Input() beamWidth: number = 0; // רוחב הקורה בס"מ
  @ViewChild('container', { static: false }) containerRef!: ElementRef;
  
  calculatedHeight: number = 10; // גובה ברירת מחדל
  
  // ערכי דיבוג
  containerWidth: number = 0; // X - רוחב הקונטיינר בפיקסלים
  containerHeight: number = 0; // Y - גובה הקונטיינר בפיקסלים
  beamLengthPx: number = 0; // x - אורך הקורה בפיקסלים
  beamWidthPx: number = 0; // y - עובי הקורה בפיקסלים
  
  // מערך הקדחים
  holes: Array<{x: number, y: number, left: number, top: number}> = [];
  lengthTextTop: number = 0;
  
  // Set לעקיבה אחרי שילובים שכבר לוגנו (beamType-beamLength-beamWidth)
  private loggedHolesKeys: Set<string> = new Set();
  
  ngOnInit() {
    this.calculateHeight();
  }
  
  /**
   * מאתחל קדחים לפי סוג הקורה
   */
  initializeHoles() {
    // ניקוי חורים קיימים
    this.holes = [];
    
    // זיהוי סוג הקורה
    const isShelfBeam = this.beamType && (
      this.beamType.includes('מדף') || 
      this.beamType.includes('shelf') ||
      this.beamType === 'קורת מדף' ||
      this.beamType === 'קורות מדף מקוצרות'
    );
    
    if (isShelfBeam) {
      this.initializeShelfBeamHoles();
    } else {
      // עבור סוגי קורות אחרים - נשתמש בחור קבוע זמני (יתעדכן בהמשך)
      this.createHole(0.25, 0.5);
    }
    
    // לוג של כל החורים - רק פעם אחת לכל שילוב ייחודי
    if (this.holes.length > 0) {
      const logKey = `${this.beamType || 'unknown'}-${this.beamLength}-${this.beamWidth}`;
      if (!this.loggedHolesKeys.has(logKey)) {
        this.logHolesLocations();
        this.loggedHolesKeys.add(logKey);
      }
    }
  }
  
  /**
   * מציג לוג עם מיקומי כל החורים
   */
  private logHolesLocations() {
    const holesData = this.holes.map((hole, index) => ({
      index: index + 1,
      x: hole.x.toFixed(4),
      y: hole.y.toFixed(4),
      left: hole.left.toFixed(2),
      top: hole.top.toFixed(2)
    }));
    
    console.log('LOCATE_SCREWS_DRAWING', JSON.stringify({
      beamType: this.beamType,
      beamLength: this.beamLength,
      beamWidth: this.beamWidth,
      holesCount: this.holes.length,
      holes: holesData
    }, null, 2));
  }
  
  /**
   * מאתחל חורים לקורת מדף (רגילה או מקוצרת)
   * אם הקורה צרה (beamWidth <= 4): 2 חורים במרכז (Y=0.5)
   * אחרת: 4 חורים - 2 בציר Y (0.25 ו-0.75), 2 בציר X (מחושב לפי H/2/L)
   */
  initializeShelfBeamHoles() {
    // L = אורך הקורה (beamLength בס"מ)
    const L = this.beamLength;
    
    // בדיקה בסיסית - אם אין אורך, לא נוכל לחשב
    if (!L || L <= 0) {
      return;
    }
    
    // בדיקה אם הקורה צרה (כמו בתלת מימד: beam.width <= 4)
    // beamWidth הוא העובי של הקורה בס"מ
    const isNarrowBeam = this.beamWidth <= 4;
    
    // H = height של קורת הרגל (בס"מ)
    let H = 0;
    
    if (this.product && this.product.params && Array.isArray(this.product.params)) {
      const legParam = this.product.params.find((p: any) => p.name === 'leg');
      if (legParam && legParam.beams && Array.isArray(legParam.beams) && legParam.beams.length > 0) {
        const selectedBeamIndex = legParam.selectedBeamIndex || 0;
        const legBeam = legParam.beams[selectedBeamIndex];
        if (legBeam && typeof legBeam.height === 'number') {
          // המרה ממ"מ לס"מ
          H = legBeam.height / 10;
        }
      }
    }
    
    // אם לא מצאנו H, נשתמש בערך ברירת מחדל (10 ס"מ)
    if (H === 0) {
      H = 10;
    }
    
    // חישוב מיקומי X (אורך הקורה)
    // מיקום ראשון: H/2 / L
    // מיקום שני: 1 - (H/2 / L)
    let x1 = (H / 2) / L;
    let x2 = 1 - x1;
    
    // בדיקות תקינות - וידוא שהמיקומים בטווח 0-1
    // אם H/2 גדול מ-L, נגביל את המיקומים
    if (x1 > 0.5) {
      x1 = 0.1; // מיקום מינימלי של 10% מהאורך
      x2 = 0.9; // מיקום מקסימלי של 90% מהאורך
    } else if (x1 < 0) {
      x1 = 0.1;
      x2 = 0.9;
    }
    
    if (isNarrowBeam) {
      // קורה צרה (beamWidth <= 4): 2 חורים במרכז (Y=0.5)
      this.createHole(x1, 0.5); // חור שמאלי במרכז
      this.createHole(x2, 0.5); // חור ימני במרכז
    } else {
      // קורה רחבה: 4 חורים - 2 בציר Y (0.25 ו-0.75), 2 בציר X
      const y1 = 0.25;
      const y2 = 0.75;
      
      this.createHole(x1, y1); // חור שמאלי עליון
      this.createHole(x1, y2); // חור שמאלי תחתון
      this.createHole(x2, y1); // חור ימני עליון
      this.createHole(x2, y2); // חור ימני תחתון
    }
  }
  
  /**
   * יוצר קדח לפי ערכי X ו-Y יחסיים (0-1)
   * X = 0 → שמאל, X = 1 → ימין
   * Y = 0 → למעלה, Y = 1 → למטה
   * @param x - מיקום אופקי יחסי (0 עד 1)
   * @param y - מיקום אנכי יחסי (0 עד 1)
   */
  createHole(x: number, y: number) {
    if (!this.containerRef || !this.containerRef.nativeElement) {
      return;
    }
    
    const rectangle = this.containerRef.nativeElement.querySelector('.beam-rectangle');
    if (!rectangle) {
      return;
    }
    
    // שימוש ב-getBoundingClientRect() כדי לקבל מידות מדויקות
    const rect = rectangle.getBoundingClientRect();
    // חישוב מידות ללא border (כי החורים צריכים להיות בתוך המלבן)
    const computedStyle = window.getComputedStyle(rectangle);
    const borderLeft = parseFloat(computedStyle.borderLeftWidth) || 0;
    const borderRight = parseFloat(computedStyle.borderRightWidth) || 0;
    const borderTop = parseFloat(computedStyle.borderTopWidth) || 0;
    const borderBottom = parseFloat(computedStyle.borderBottomWidth) || 0;
    
    // רוחב וגובה פנימיים (ללא border)
    const innerWidth = rect.width - borderLeft - borderRight;
    const innerHeight = rect.height - borderTop - borderBottom;
    
    // חישוב מיקום לפי ערכי X ו-Y יחסיים
    // X = 0 → left = borderLeft, X = 1 → left = borderLeft + innerWidth
    // Y = 0 → top = borderTop, Y = 1 → top = borderTop + innerHeight
    // עם transform: translate(-50%, calc(-50% - 2px)) העיגול יוזז ב-50% מהרוחב/גובה שלו
    // אז המיקום צריך להיות מדויק - העיגול ימרכז את עצמו בנקודה
    const finalLeft = borderLeft + (innerWidth * x);
    const finalTop = borderTop + (innerHeight * y);
    
    // שמירת הקואורדינטות היחסיות והמיקום בפיקסלים
    this.holes.push({
      x: x,
      y: y,
      left: finalLeft,
      top: finalTop
    });
  }
  
  /**
   * מעדכן את מיקומי כל הקדחים לאחר שינויי מידות
   */
  updateHolesPositions() {
    if (!this.containerRef || !this.containerRef.nativeElement) {
      return;
    }
    
    const rectangle = this.containerRef.nativeElement.querySelector('.beam-rectangle');
    if (!rectangle) {
      return;
    }
    
    // שימוש ב-getBoundingClientRect() כדי לקבל מידות מדויקות
    const rect = rectangle.getBoundingClientRect();
    // חישוב מידות ללא border (כמו ב-createHole)
    const computedStyle = window.getComputedStyle(rectangle);
    const borderLeft = parseFloat(computedStyle.borderLeftWidth) || 0;
    const borderRight = parseFloat(computedStyle.borderRightWidth) || 0;
    const borderTop = parseFloat(computedStyle.borderTopWidth) || 0;
    const borderBottom = parseFloat(computedStyle.borderBottomWidth) || 0;
    
    // רוחב וגובה פנימיים (ללא border)
    const innerWidth = rect.width - borderLeft - borderRight;
    const innerHeight = rect.height - borderTop - borderBottom;
    
    this.holes = this.holes.map(hole => {
      // חישוב מיקום לפי ערכי X ו-Y יחסיים (0-1)
      const finalLeft = borderLeft + (innerWidth * hole.x);
      const finalTop = borderTop + (innerHeight * hole.y);
      
      return {
        ...hole,
        left: finalLeft,
        top: finalTop
      };
    });
  }
  
  ngAfterViewInit() {
    this.calculateHeight();
  }
  
  ngOnChanges(changes: SimpleChanges) {
    if (changes['beamLength'] || changes['beamWidth']) {
      this.calculateHeight();
    }
    
    // אם השתנו נתונים רלוונטיים לחישוב חורים, נאתחל מחדש
    if (changes['beamType'] || changes['product'] || changes['beamLength']) {
      // נחכה עד שהגובה יתעדכן ואז נאתחל את החורים
      setTimeout(() => {
        if (this.holes.length > 0) {
          // אם יש חורים קיימים, נאתחל מחדש
          this.initializeHoles();
        }
      }, 50);
    }
  }
  
  calculateHeight() {
    if (!this.beamLength || !this.beamWidth || !this.containerRef) {
      this.calculatedHeight = 10;
      this.updateLengthTextOffset();
      return;
    }
    
    // חישוב גובה לשמירה על פרופורציה נכונה של הקורה
    // אם רוחב הקורה הוא beamWidth ואורך הקורה הוא beamLength,
    // אז היחס בין אורך לרוחב הוא beamLength / beamWidth
    // אם רוחב הקונטיינר הוא containerWidth, אז הגובה צריך להיות:
    // (רוחב_קונטיינר * רוחב_קורה) / אורך_קורה = containerWidth * (beamWidth / beamLength)
    setTimeout(() => {
      if (this.containerRef && this.containerRef.nativeElement) {
        const containerWidth = this.containerRef.nativeElement.offsetWidth;
        const containerHeight = this.containerRef.nativeElement.offsetHeight;
        
        // שמירת ערכי הקונטיינר
        this.containerWidth = containerWidth; // X
        this.containerHeight = containerHeight; // Y
        
        if (containerWidth > 0 && this.beamLength > 0 && this.beamWidth > 0) {
          // חישוב גובה לפי הנוסחה המדויקת:
          // גובה = (רוחב_קורה / אורך_קורה) * רוחב_קונטיינר
          // דוגמה: רוחב קורה = 5 ס"מ, אורך קורה = 40 ס"מ, רוחב קונטיינר = 200px
          // גובה = (5 / 40) * 200 = 0.125 * 200 = 25px
          this.calculatedHeight = (this.beamWidth / this.beamLength) * containerWidth;
          
          // חישוב ערכים בפיקסלים:
          // x - אורך הקורה בפיקסלים = רוחב הקונטיינר (כי המלבן הוא 100% רוחב)
          this.beamLengthPx = containerWidth;
          
          // y - עובי הקורה בפיקסלים = הגובה המחושב
          this.beamWidthPx = this.calculatedHeight;
          
          // הגבלת מינימום ומקסימום
          if (this.calculatedHeight < 3) {
            this.calculatedHeight = 3;
            this.beamWidthPx = 3;
          }
          if (this.calculatedHeight > 45) {
            this.calculatedHeight = 45;
            this.beamWidthPx = 45;
          }

          this.updateLengthTextOffset();
          
          // עדכון מיקומי הקדחים לאחר חישוב הגובה
          setTimeout(() => {
            // תמיד נאתחל מחדש את החורים (אם יש נתונים מספיקים)
            if (this.beamLength > 0 && this.beamWidth > 0) {
              this.initializeHoles();
            } else if (this.holes.length > 0) {
              // אם אין נתונים מספיקים אבל יש חורים קיימים, נעדכן רק את המיקומים
              this.updateHolesPositions();
            }
          }, 10);
        } else {
          // אפס ערכים אם אין נתונים
          this.beamLengthPx = 0;
          this.beamWidthPx = 0;
          this.updateLengthTextOffset();
        }
      }
    }, 0);
  }

  private updateLengthTextOffset() {
    const containerHeight = this.containerHeight || 50;
    const rectangleTop = (containerHeight - this.calculatedHeight) / 2;
    const margin = Math.max(6, Math.min(18, this.calculatedHeight * 0.17));
    this.lengthTextTop = rectangleTop - margin - 5;
  }
}
