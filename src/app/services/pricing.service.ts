import { Injectable } from '@angular/core';

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
    
    let totalPrice = 0;
    
    // חישוב מחיר קורות
    beamsData.forEach((beamData, index) => {
      console.log(`Processing beam ${index + 1}:`, beamData);
      
      // עבור כל גודל קורה
      beamData.totalSizes.forEach((sizeData: any) => {
        const length = sizeData.length;
        const count = sizeData.count;
        
        console.log(`Beam size: ${length}cm x ${count} pieces`);
        
        // חיפוש המחיר המתאים באורך הקורה
        const pricePerLength = this.findPriceForLength(beamData.type, length);
        console.log(`Price per ${length}cm: ${pricePerLength}`);
        
        const beamPrice = pricePerLength * count;
        console.log(`Total price for this size: ${beamPrice}`);
        
        totalPrice += beamPrice;
      });
    });
    
    // חישוב מחיר ברגים
    forgingData.forEach((forgingItem, index) => {
      console.log(`Processing forging ${index + 1}:`, forgingItem);
      
      const length = forgingItem.length;
      const count = forgingItem.count;
      
      console.log(`Forging: ${length}cm x ${count} pieces`);
      
      // חיפוש המחיר המתאים באורך הבורג
      const pricePerLength = this.findPriceForLength(forgingItem.type, length);
      console.log(`Price per ${length}cm: ${pricePerLength}`);
      
      const forgingPrice = pricePerLength * count;
      console.log(`Total price for this forging: ${forgingPrice}`);
      
      totalPrice += forgingPrice;
    });
    
    console.log(`Total calculated price: ${totalPrice}`);
    
    // בשלב זה נחזיר תמיד 99 לצורך בדיקה
    return 99;
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
}
