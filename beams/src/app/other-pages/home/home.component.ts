import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild } from "@angular/core";
import { Subscription, concat } from 'rxjs';
import { DirectionService } from '../../direction.service';
import { TranslateService } from '@ngx-translate/core';

import { trigger, transition, style, animate, state } from '@angular/animations';
import { Observable, timer } from 'rxjs';
import { take, map, filter } from 'rxjs/operators';
import { Router } from '@angular/router';
import { set } from "lodash";

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  host: {
    class: 'fill-screen'
  },
  animations: [
    trigger('slideInOut', [
      state('in', style({ transform: 'translateX(0%) scale(1.0)', opacity: 1 })),
      state('out', style({ transform: 'translateX(5%) scale(0.9)', opacity: 0 })),
      transition('out => in', [
        style({ transform: 'translateX(-15%) scale(0.9)' }),
        animate('150ms ease-in', style({ transform: 'translateX(0%) scale(1.0)', opacity: 1 }))
      ]),
      transition('in => out', [
        animate('150ms ease-in', style({ transform: 'translateX(15%) scale(0.9)', opacity: 0 }))
      ])
    ])
  ]
})

export class HomeComponent implements OnInit, OnDestroy, AfterViewInit {
  isRTL: boolean = true;
  private directionSubscription: Subscription;
  isDarkMode: boolean = false;
  isLoading = false;

  userId: string;
  userIsAuthenticated = false;

  imgDevice: string;
  devices = ['sketch', 'img', 'doc'];
  deviceIndex = 0;
  typedText = '';
  typing = false;
  typedTextDevice = '';

  @ViewChild('videoPlayer') videoPlayer: ElementRef;
  @ViewChild('scrollContainer') scrollContainer: ElementRef;
  private initialized = false;
  isAnimatingSteps: boolean = false;
  animatingStep: number = 0;
  animationInterval: any;
  scrollTop: number = 0;
  fullHeight: number = 0;

  constructor(
    private directionService: DirectionService,
    private translate: TranslateService,
    private router: Router,
  ) { }

  ngOnInit() {
    this.isLoading = true;

    this.directionSubscription = this.directionService.direction$.subscribe(direction => {
      this.isRTL = direction === 'rtl';
    });

    this.directionService.isDarkMode$.subscribe(isDarkMode => {
      // this.isDarkMode = isDarkMode;
    });

    timer(0, 3000).subscribe(() => {
      this.deviceIndex = (this.deviceIndex + 1) % this.devices.length;
      this.imgDevice = this.devices[this.deviceIndex];
      this.typeDeviceText(this.devices[this.deviceIndex]);
    });

    this.startStepsAnimation();

    this.isLoading = false;
  }

  private playVideo = () => {
    if (this.videoPlayer.nativeElement.paused) {
      this.videoPlayer.nativeElement.playbackRate = 1;
      this.videoPlayer.nativeElement.play();
    }
  };

  ngAfterViewInit(): void {
    if (this.scrollContainer && !this.initialized) {
      this.initialized = true;
      if (!this.isIphone()) {
        this.videoPlayer.nativeElement.currentTime = 0;
        this.videoPlayer.nativeElement.muted = true;
        this.videoPlayer.nativeElement.playbackRate = 1;
        this.videoPlayer.nativeElement.play();

        const checkTimeAndUpdate = () => {
          const timeToEnd = this.videoPlayer.nativeElement.duration - this.videoPlayer.nativeElement.currentTime;
          if (timeToEnd < 4.5) {
            this.videoPlayer.nativeElement.currentTime = 0;
            this.videoPlayer.nativeElement.play();
          }
          requestAnimationFrame(checkTimeAndUpdate);
        };

        requestAnimationFrame(checkTimeAndUpdate);

        // Add click event listener
        document.addEventListener('click', () => {
          if (this.videoPlayer.nativeElement.paused) {
            this.videoPlayer.nativeElement.playbackRate = 1;
            this.videoPlayer.nativeElement.play();
          }
        });
      }

      // Add scroll event listener
      this.scrollContainer.nativeElement.addEventListener('scroll', () => {
        this.animatemateHomePage(this.scrollContainer.nativeElement.scrollTop, this.isRTL);
      });
    }

    this.fullHeight = window.innerHeight;
  }

  ngOnDestroy() {
    this.directionSubscription.unsubscribe();
    if (!this.isIphone()) {
      document.removeEventListener('click', this.playVideo);
    }
  }

  getLang() {
    if (this.isRTL) {
      return 'he';
    }
    return 'en';
  }

  typeDeviceText(newDevice: string) {
    if (this.typing) {
      return;
    }

    this.typing = true;

    const key = 'about-us.main-title-2.' + newDevice;

    this.translate.stream(key).pipe(
      filter((translatedText: string) => translatedText !== key)
    ).subscribe((translatedText: string) => {

      const delete$ = timer(0, 40).pipe(
        take(this.typedText.length),
        map(() => this.typedText.slice(0, -1))
      );

      const type$ = timer(0, 40).pipe(
        take(translatedText.length),
        map((i: number) => translatedText.slice(0, i + 1))
      );

      concat(delete$, type$).subscribe(
        (text: string) => this.typedText = text,
        null,
        () => this.typing = false
      );
    });

    const keyDevice = 'about-us.devices-explain-1.' + newDevice;

    this.translate.stream(keyDevice).pipe(
      filter((translatedText: string) => translatedText !== keyDevice)
    ).subscribe((translatedText: string) => {

      const delete$ = timer(0, 40).pipe(
        take(this.typedTextDevice.length),
        map(() => this.typedTextDevice.slice(0, -1))
      );

      const type$ = timer(0, 40).pipe(
        take(translatedText.length),
        map((i: number) => translatedText.slice(0, i + 1))
      );

      concat(delete$, type$).subscribe(
        (text: string) => this.typedTextDevice = text,
        null,
        () => this.typing = false
      );
    });
  }

  goHome() {
    this.router.navigate(['/']);
  }

  goToQAndA() {
    this.router.navigate(['/qanda']);
  }

  animatemateHomePage(scrollTop: number, isRTL: boolean) {
    this.scrollTop = scrollTop;
    // scroller
    const scrollDowns = document.querySelectorAll('.scroll-downs');
    if (scrollTop < 12) {
      scrollDowns.forEach((scrollDown: HTMLElement) => {
        scrollDown.style.opacity = ((12 - scrollTop) / 12) * 100 + '%';
      });
    } else {
      scrollDowns.forEach((scrollDown: HTMLElement) => {
        scrollDown.style.opacity = '0';
      });
    }
    // steps
    if (this.getHeightForAnimation() > 966) {
      if (!this.isAnimatingSteps) {
        this.isAnimatingSteps = true;
        this.startStepsAnimation();
      }
    } else {
      this.stopStepsAnimation();
    }
  }

  startStepsAnimation() {
    this.isAnimatingSteps = true;
    this.animationInterval = setInterval(() => {
      if (this.isAnimatingSteps) {
        this.animatingStep++;
      }
    }, 333);
  }

  forceReflow() {
    // Get the elements
    const elements = document.querySelectorAll('.step-1, .step-2, .step-3');
    // Force a reflow on each element
    elements.forEach((element: Element) => {
      void (element as HTMLElement).offsetWidth;
    });
  }

  stopStepsAnimation() {
    this.isAnimatingSteps = false;
    clearInterval(this.animationInterval);
    this.animatingStep = 0;
  }

  getHeightForAnimation(): number {
    if (this.fullHeight < 667) {
      return this.fullHeight + this.scrollTop;
    } else {
      return 667 + ((this.fullHeight - 667) * 0.62) + this.scrollTop;
    }
  }

  isIphone(): boolean {
    return /iPhone/.test(navigator.userAgent);
  }

  // ================================
}

