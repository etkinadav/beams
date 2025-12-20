import { Component, OnInit, OnDestroy } from "@angular/core";
import { Subscription } from 'rxjs';
import { DirectionService } from '../../direction.service';

@Component({
  selector: "app-landbot",
  templateUrl: "./landbot.component.html",
  styleUrls: ["./landbot.component.css"],
  host: {
    class: 'fill-screen'
  }
})

export class LandbotComponent implements OnInit, OnDestroy {
  isRTL: boolean = true;
  private directionSubscription: Subscription;
  isDarkMode: boolean = false;

  constructor(
    private directionService: DirectionService,
  ) { }

  ngOnInit() {
    this.directionSubscription = this.directionService.direction$.subscribe(direction => {
      this.isRTL = direction === 'rtl';
    });

    this.directionService.isDarkMode$.subscribe(isDarkMode => {
      this.isDarkMode = isDarkMode;
    });
  }

  ngOnDestroy() {
    this.directionSubscription.unsubscribe();
  }
}

