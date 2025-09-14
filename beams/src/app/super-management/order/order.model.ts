export interface Order {
    id: string;
    created: Date;
    print_sent: Date;
    print_start: Date;
    print_end: Date;
    files: any[];
    status: string;
    qrOrder: Boolean;
    adminOrder: Boolean;
    businessOrder: Boolean;
    hasErrors: Boolean;
    addedToQueue: Date;
    isPaid: Boolean;
    branchID: any[];
    printerID: any[];
    isArchived: Boolean;
    totalOrderLength: Number;
    totalOrderLengthInMeters: Number;
    totalOrderDurationInMinutes: Number;
    needMail: Boolean;
    isMinimal: Boolean;
    alerts: any[];
}

