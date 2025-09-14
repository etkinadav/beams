export interface Paper {
    id: string;
    paperName: string;
    paperWidth: Number;
    paperHeight: Number;
    paperWeight: Number;
    paperPrinterCode: string;
    paperPrinterQuality: Number;
    isExpress: boolean;
    isPlotter: boolean;
    isPh: boolean;
}