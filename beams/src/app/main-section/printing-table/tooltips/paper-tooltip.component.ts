import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { DirectionService } from '../../../direction.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-tooltip-content',
    templateUrl: './paper-tooltip.component.html',
    styleUrls: ['./paper-tooltip.component.css'],
})

export class TooltipContentComponent implements OnInit, OnDestroy {
    isRTL: boolean = true;
    private directionSubscription: Subscription;
    expressPapers: Array<any>;

    @Input() header: string;
    @Input() text: string;
    @Input() printingService: string;
    @Input() inputBins: any;
    @Input() printServicePapers: any;

    constructor(
        private directionService: DirectionService,
    ) { }

    ngOnInit() {
        this.directionSubscription = this.directionService.direction$.subscribe(direction => {
            this.isRTL = direction === 'rtl';
        });

        this.expressPapers = [];
        for (let paper of this.printServicePapers) {
            let newPaper = {
                paperWidth: 0,
                paperHeight: 0,
                paperWeight: 0,
                serialName: ''
            }
            if (paper.serial_name === 'A4') {
                newPaper.paperWidth = 21;
                newPaper.paperHeight = 29.7;
                newPaper.paperWeight = 100;
            } else if (paper.serial_name === 'A3') {
                newPaper.paperWidth = 29.7;
                newPaper.paperHeight = 42;
                newPaper.paperWeight = 100;
            } else if (paper.serial_name === 'A4160') {
                newPaper.paperWidth = 21;
                newPaper.paperHeight = 29.7;
                newPaper.paperWeight = 160;
            } else if (paper.serial_name === 'A3160') {
                newPaper.paperWidth = 29.7;
                newPaper.paperHeight = 42;
                newPaper.paperWeight = 160;
            } else if (paper.serial_name === 'A4Recycled') {
                newPaper.paperWidth = 21;
                newPaper.paperHeight = 29.7;
                newPaper.paperWeight = 120;
            } else if (paper.serial_name === 'SM') {
                newPaper.paperWidth = 15.24;
                newPaper.paperHeight = 10.16;
                newPaper.paperWeight = 260;
            } else if (paper.serial_name === 'MD') {
                newPaper.paperWidth = 17.78;
                newPaper.paperHeight = 12.7;
                newPaper.paperWeight = 260;
            } else if (paper.serial_name === 'LG') {
                newPaper.paperWidth = 20.32;
                newPaper.paperHeight = 15.24;
                newPaper.paperWeight = 260;
            }
            this.expressPapers.push(newPaper);
        }
    }

    ngOnDestroy() {
        this.directionSubscription.unsubscribe();
    }
}