import { Component, OnInit } from "@angular/core";

@Component({
  selector: "app-laundry",
  templateUrl: "./laundry.component.html",
  styleUrls: ["./laundry.component.css"],
  host: {
    class: 'fill-screen'
  }
})

export class LaundryComponent implements OnInit {
  constructor() { }

  ngOnInit() {
  }

  onGetStartedClick() {
    // TODO: Implement weigh laundry functionality
    console.log('Get Started button clicked');
  }
}
