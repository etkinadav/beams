import { Injectable } from '@angular/core';
import { BinPacking } from 'binpacking';

@Injectable({
  providedIn: 'root'
})
export class PricingService {

  constructor() { }

  /**
   * חישוב מחיר עבור נתוני קורות
   * @param beamsData - נתוני הקורות מ-BeamsDataForPricing
   * @param forgingData - נתוני הברגים מ-ForgingDataForPricing
   * @returns מחיר כולל
   */
  calculatePrice(beamsData: any[], forgingData: any[]): number {
    console.log('=== PRICING SERVICE - CALCULATING PRICE ===');
    console.log('Beams data:', beamsData);
    console.log('Forging data:', forgingData);
    
    // שימוש באלגוריתם חיתוך אופטימלי
    const result = this.calculateOptimalCutting(beamsData, forgingData);
    return result.totalPrice;
  }
  
  /**
   * חישוב אופטימלי של חיתוך קורות עץ
   * @param beamsData - נתוני הקורות מ-BeamsDataForPricing
   * @param forgingData - נתוני הברגים מ-ForgingDataForPricing
   * @returns אובייקט עם מחיר כולל ותוכנית חיתוך מפורטת
   */
  calculateOptimalCutting(beamsData: any[], forgingData: any[]): { totalPrice: number, cuttingPlan: any[] } {
    console.log('=== OPTIMAL CUTTING CALCULATION ===');
    
    let totalPrice = 0;
    let allCuttingPlans: any[] = [];
    
    // עיבוד כל סוג קורה
    beamsData.forEach((beamData, index) => {
      console.log(`Processing beam type ${index + 1}:`, beamData);
      
      // יצירת רשימת חיתוכים נדרשים
      const requiredCuts: number[] = [];
      beamData.totalSizes.forEach((sizeData: any) => {
        for (let i = 0; i < sizeData.count; i++) {
          requiredCuts.push(sizeData.length);
        }
      });
      
      console.log(`Required cuts for beam type ${index + 1}:`, requiredCuts);
      
      // קבלת אפשרויות הקורות הזמינות
      const beamOptions = this.getBeamOptions(beamData.type);
      console.log(`Available beam options:`, beamOptions);
      
      // חישוב אופטימלי עם binpacking
      const optimalSolution = this.calculateOptimalCuttingForBeamType(requiredCuts, beamOptions);
      console.log(`Optimal solution for beam type ${index + 1}:`, optimalSolution);
      
      // הדפסת לוגים מפורטים לכל קורה
      console.log(`=== תוכנית חיתוך עבור סוג קורה ${index + 1} ===`);
      optimalSolution.beams.forEach((beam: any, beamIndex: number) => {
        const beamLength = beam.totalLength;
        const beamPrice = this.getBeamPriceByLength(beamLength);
        const cuts = beam.cuts;
        
        console.log(`קורה באורך ${beamLength} (מחיר ${beamPrice}) → חתיכות: [${cuts.join(', ')}]`);
        
        // הוספה לתוכנית החיתוך הכוללת
        allCuttingPlans.push({
          beamNumber: allCuttingPlans.length + 1,
          beamLength: beamLength,
          beamPrice: beamPrice,
          cuts: cuts,
          beamType: beamData.beamTranslatedName || beamData.beamName
        });
      });
      console.log(''); // שורה ריקה להפרדה
      
      // חישוב מחיר עבור הפתרון האופטימלי
      const beamTypePrice = this.calculatePriceForOptimalSolution(optimalSolution, beamData.type);
      console.log(`מחיר כולל לסוג קורה ${index + 1}: ${beamTypePrice}`);
      console.log(''); // שורה ריקה להפרדה
      
      totalPrice += beamTypePrice;
    });
    
    // עיבוד ברגים (ללא חיתוך אופטימלי)
    forgingData.forEach((forgingItem, index) => {
      console.log(`Processing forging ${index + 1}:`, forgingItem);
      
      const length = forgingItem.length;
      const count = forgingItem.count;
      
      const pricePerLength = this.findPriceForLength(forgingItem.type, length);
      const forgingPrice = pricePerLength * count;
      
      totalPrice += forgingPrice;
    });
    
    console.log(`סה"כ מחיר: ${totalPrice}`);
    console.log('=== סיום חישוב אופטימלי ===');
    
    return {
      totalPrice: totalPrice,
      cuttingPlan: allCuttingPlans
    };
  }
  
  /**
   * חישוב אופטימלי של חיתוך עבור סוג קורה ספציפי
   * @param requiredCuts - רשימת אורכים נדרשים
   * @param beamOptions - אפשרויות קורות זמינות
   * @returns פתרון אופטימלי
   */
  private calculateOptimalCuttingForBeamType(requiredCuts: number[], beamOptions: any[]): any {
    if (requiredCuts.length === 0) {
      return { beams: [], totalWaste: 0, totalCost: 0 };
    }
    
    // מיון אורכים בסדר יורד (First Fit Decreasing)
    const sortedCuts = [...requiredCuts].sort((a, b) => b - a);
    
    let bestSolution = null;
    let bestCost = Infinity;
    
    // בדיקת כל אפשרות קורה
    beamOptions.forEach(beamOption => {
      const solution = this.packCutsIntoBeams(sortedCuts, beamOption.length, beamOption.price);
      
      if (solution.totalCost < bestCost) {
        bestCost = solution.totalCost;
        bestSolution = solution;
      }
    });
    
    return bestSolution || { beams: [], totalWaste: 0, totalCost: 0 };
  }
  
  /**
   * אריזה של חיתוכים לתוך קורות באורך נתון
   * @param cuts - רשימת חיתוכים
   * @param beamLength - אורך הקורה
   * @param beamPrice - מחיר הקורה
   * @returns פתרון אריזה
   */
  private packCutsIntoBeams(cuts: number[], beamLength: number, beamPrice: number): any {
    const bins: any[] = [];
    let totalWaste = 0;
    
    cuts.forEach(cutLength => {
      let placed = false;
      
      // חיפוש קורה קיימת עם מקום פנוי
      for (let i = 0; i < bins.length; i++) {
        if (bins[i].remaining >= cutLength) {
          bins[i].cuts.push(cutLength);
          bins[i].remaining -= cutLength;
          placed = true;
          break;
        }
      }
      
      // אם לא נמצאה קורה מתאימה, יצירת קורה חדשה
      if (!placed) {
        bins.push({
          cuts: [cutLength],
          remaining: beamLength - cutLength,
          totalLength: beamLength
        });
      }
    });
    
    // חישוב פסולת כוללת
    bins.forEach(bin => {
      totalWaste += bin.remaining;
    });
    
    return {
      beams: bins,
      totalWaste: totalWaste,
      totalCost: bins.length * beamPrice,
      beamCount: bins.length,
      wastePercentage: (totalWaste / (bins.length * beamLength)) * 100
    };
  }
  
  /**
   * קבלת אפשרויות קורות זמינות עבור סוג קורה
   * @param beamType - סוג הקורה
   * @returns רשימת אפשרויות קורות
   */
  private getBeamOptions(beamType: any): any[] {
    // בשלב זה נחזיר אפשרויות ברירת מחדל
    // בהמשך זה יבוא מהנתונים האמיתיים
    return [
      { length: 300, price: 50 }, // 3 מטר
      { length: 400, price: 65 }, // 4 מטר
      { length: 500, price: 80 }, // 5 מטר
      { length: 600, price: 95 }  // 6 מטר
    ];
  }
  
  /**
   * חישוב מחיר עבור פתרון אופטימלי
   * @param solution - פתרון אופטימלי
   * @param beamType - סוג הקורה
   * @returns מחיר כולל
   */
  private calculatePriceForOptimalSolution(solution: any, beamType: any): number {
    return solution.totalCost;
  }
  
  /**
   * חיפוש מחיר עבור אורך נתון
   * @param type - סוג הקורה/בורג
   * @param length - אורך בס"מ
   * @returns מחיר ליחידה
   */
  private findPriceForLength(type: any, length: number): number {
    console.log(`Finding price for type: ${type}, length: ${length}cm`);
    
    // בשלב זה נחזיר תמיד מחיר קבוע לצורך בדיקה
    return 5;
  }
  
  /**
   * קבלת תוכנית חיתוך מפורטת
   * @param beamsData - נתוני הקורות מ-BeamsDataForPricing
   * @param forgingData - נתוני הברגים מ-ForgingDataForPricing
   * @returns תוכנית חיתוך מפורטת
   */
  getCuttingPlan(beamsData: any[], forgingData: any[]): any[] {
    const result = this.calculateOptimalCutting(beamsData, forgingData);
    return result.cuttingPlan;
  }
  
  /**
   * קבלת מחיר קורה לפי אורך
   * @param length - אורך הקורה בס"מ
   * @returns מחיר הקורה
   */
  private getBeamPriceByLength(length: number): number {
    const beamOptions = this.getBeamOptions(null);
    const beamOption = beamOptions.find(option => option.length === length);
    return beamOption ? beamOption.price : 0;
  }
}
