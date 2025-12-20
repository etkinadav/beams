import { Component, OnInit, OnDestroy } from "@angular/core";
import { Subscription } from 'rxjs';
import { DirectionService } from '../../direction.service';
import { LandbotService } from '../../services/landbot.service';

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

  // Form fields
  userId: string = '';
  staticField: string = '';
  message: string = '';

  // UI state
  isSending: boolean = false;
  successMessage: string = '';
  errorMessage: string = '';

  constructor(
    private directionService: DirectionService,
    private landbotService: LandbotService,
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

  sendMessage() {
    // Clear previous messages
    this.successMessage = '';
    this.errorMessage = '';

    // Validate required fields
    if (!this.userId || !this.message) {
      this.errorMessage = 'User ID and Message are required fields';
      return;
    }

    // Set loading state
    this.isSending = true;

    // Call the service
    this.landbotService.sendMessage({
      userId: this.userId,
      staticField: this.staticField,
      message: this.message
    }).subscribe({
      next: (response) => {
        console.log('✅ Message sent successfully:', response);
        this.isSending = false;
        
        if (response.success) {
          this.successMessage = response.message || 'Message sent successfully!';
          // Clear form on success
          this.userId = '';
          this.staticField = '';
          this.message = '';
        } else {
          this.errorMessage = response.error || 'Failed to send message';
        }
      },
      error: (error) => {
        console.error('❌ Error sending message:', error);
        this.isSending = false;
        this.errorMessage = error.error?.error || error.message || 'An error occurred while sending the message';
      }
    });
  }
}

