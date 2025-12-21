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
      message: this.message
    }).subscribe({
      next: (response) => {
        console.log('✅ Message sent successfully:', response);
        this.isSending = false;
        
        if (response.success) {
          this.successMessage = response.message || 'Message sent successfully!';
          // Clear form on success
          this.userId = '';
          this.message = '';
        } else {
          this.errorMessage = response.error || 'Failed to send message';
        }
      },
      error: (error) => {
        this.isSending = false;
        
        // Extract error message from various possible formats
        let errorMsg = 'An error occurred while sending the message';
        if (error.error) {
          if (typeof error.error === 'string') {
            errorMsg = error.error;
          } else if (error.error.error) {
            errorMsg = error.error.error;
            if (error.error.hint) {
              errorMsg += ` (${error.error.hint})`;
            } else if (error.error.details) {
              const detailsStr = typeof error.error.details === 'string' 
                ? error.error.details 
                : JSON.stringify(error.error.details);
              errorMsg += `: ${detailsStr}`;
            }
            if (error.error.requestId) {
              errorMsg += ` [Request ID: ${error.error.requestId}]`;
            }
          } else if (error.error.message) {
            errorMsg = error.error.message;
          }
        } else if (error.message) {
          errorMsg = error.message;
        }
        
        this.errorMessage = errorMsg;
      }
    });
  }
}

