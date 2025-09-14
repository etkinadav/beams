import { Component, OnInit, OnDestroy, AfterViewInit } from "@angular/core";
import { Subscription } from 'rxjs';
import { DirectionService } from '../../direction.service';

import { Router, ActivatedRoute } from "@angular/router";
import { BranchesService } from "../../super-management/branch/branches.service";
import { FormGroup, FormControl, Validators } from "@angular/forms";
import { now, set } from "lodash";
import { SimpleChanges } from '@angular/core';

import lottie from 'lottie-web';

@Component({
  selector: "app-order-list",
  templateUrl: "./station-screen.component.html",
  styleUrls: ["./station-screen.component.css"],
  host: {
    class: 'fill-screen'
  }
})

export class StationScreenComponent implements OnInit, OnDestroy {
  isRTL: boolean = true;
  private directionSubscription: Subscription;
  isDarkMode: boolean = false;
  isLoading = false;

  printingService = 'plotter';
  branches: any[] = [];
  form: FormGroup;

  updateInterval: number = 2500;

  selectedBranches: any[] = [];
  isQueShowen: boolean = false;
  private intervalQue: any;
  lastUpdated: Date;
  rangeOfUpdating: number = 30000;

  isAutoScrolling = false;

  animationPics: any;
  animationDocs: any;

  expressError: Array<any> = [];
  expressErrorAlertDelay: number = 120000;

  constructor(
    private directionService: DirectionService,
    private router: Router,
    private route: ActivatedRoute,
    private branchesService: BranchesService,
  ) { }

  ngOnInit() {
    this.isLoading = true;

    this.directionSubscription = this.directionService.direction$.subscribe(direction => {
      this.isRTL = direction === 'rtl';
    });

    this.directionService.isDarkMode$.subscribe(isDarkMode => {
      this.isDarkMode = isDarkMode;
    });

    this.form = new FormGroup({
      branches: new FormControl(
        [], [Validators.required, this.maxSelectedBranchesValidator(2)]
      ),
    });

    this.route.params.subscribe(params => {
      this.printingService = params['service'] === 'p' ? 'plotter' : 'express';
      const branchUnique = params['branch'];

      this.branchesService.getAllBranches().subscribe(branches => {
        this.branches = branches;
        console.log(this.branches);

        let selectedBranch;
        if (this.printingService === 'plotter') {
          selectedBranch = this.branches.find(branch => String(branch.plotter?.unique) === branchUnique);
        } else if (this.printingService === 'express') {
          selectedBranch = this.branches.find(branch => String(branch.express?.unique) === branchUnique);
        }

        if (selectedBranch) {
          console.log('selectedBranch:', selectedBranch);
          if (selectedBranch.express?.attached_express && selectedBranch.express?.attached_express.length > 0) {
            const attachedBranch = this.branches.find(branch => branch.express?._id === selectedBranch.express?.attached_express);
            this.form.controls['branches'].patchValue([selectedBranch.name, attachedBranch.name]);
          } else {
            this.form.controls['branches'].patchValue([selectedBranch.name]);
          }
          this.updateSelectedBranchesAndShowQueue();
        }

        this.intervalQue = setInterval(() => {
          if (this.form.controls['branches'].value.length > 0 && this.isQueShowen === true && this.isLoading === false) {
            this.updateQueData();
          }
        }, this.updateInterval);

        this.isLoading = false;
      });
    });
  }

  maxSelectedBranchesValidator(max: number) {
    return (control: FormControl): { [key: string]: any } | null => {
      const selectedBranches = control.value;
      if (selectedBranches && selectedBranches.length > max) {
        return { 'maxSelectedBranches': { max } };
      }
      return null;
    };
  }

  ngOnDestroy() {
    this.directionSubscription.unsubscribe();
  }

  togglePrintingService() {
    this.printingService = this.printingService === 'plotter' ? 'express' : 'plotter';

    if (this.printingService === 'plotter' && this.selectedBranches.length > 0) {
      const container = document.getElementById('scrollContainer');
      if (container) {
        const observer = new MutationObserver(() => {
          if (container.scrollHeight > container.clientHeight && !this.isAutoScrolling) {
            this.isAutoScrolling = false;
            this.autoScroll();
          }
        });

        observer.observe(container, { childList: true, subtree: true });
      }
    }
  }

  // updateSelectedBranchesAndShowQueue() {
  //   const selectedBranchNames = this.form.get('branches').value;
  //   this.selectedBranches = this.branches.filter(branch => selectedBranchNames.includes(branch.name));
  //   this.isQueShowen = true;
  //   console.log(this.selectedBranches);
  // }
  updateSelectedBranchesAndShowQueue() {
    console.log('Date.now():', Date.now());
    let selectedBranchNames = this.form.get('branches').value;
    selectedBranchNames = selectedBranchNames.reverse();
    this.selectedBranches = this.branches.filter(branch => selectedBranchNames.includes(branch.name));
    console.log("this.selectedBranches@@", this.selectedBranches);
    // if "this.selectedBranches[1].name" incluses the string "pics" - flip order
    let orderdselectedBranches;
    if (this.selectedBranches[1] && this.selectedBranches[1].name.includes("pics")) {
      orderdselectedBranches = this.selectedBranches.reverse();
      console.log("this.selectedBranches - DO flip!", orderdselectedBranches);
    } else {
      orderdselectedBranches = this.selectedBranches;
      console.log("this.selectedBranches - DONT flip!", orderdselectedBranches);
    }
    this.selectedBranches = orderdselectedBranches;
    this.isQueShowen = true;
    this.expressError = [];
    if (this.printingService === 'express') {
      for (let i = 0; i < this.selectedBranches.length; i++) {
        if (this.selectedBranches[i].express.error) {
          this.expressError.push(Date.now());
        } else {
          this.expressError.push(false);
        }
      }
      console.log('expressError FIRST:', this.expressError);
    }
    if (this.selectedBranches.length > 1) {
      setTimeout(() => {
        this.animate();
      }, 5000);
    }
  }

  resetPapers() {
    this.form.get('branches').reset();
  }

  closeQue() {
    this.isQueShowen = false;
    this.selectedBranches = [];
  }

  printingCode(printerNum: number, randomDigits: number) {
    let code = "00000";
    if (printerNum && randomDigits) {
      code =
        printerNum.toString().charAt(0) +
        randomDigits.toString().charAt(0) +
        printerNum.toString().charAt(1) +
        randomDigits.toString().charAt(1) +
        printerNum.toString().charAt(2);
    }
    return code;
  }

  getPtinterNumber(branch: any) {
    let num = "000";
    if (branch) {
      if (this.printingService === 'plotter') {
        num = branch.plotter.unique.toString();
      } else if (this.printingService === 'express') {
        num = branch.express.unique.toString();
      }
    }
    return num;
  }

  updateQueData() {
    if (!this.printingService || !this.selectedBranches || this.selectedBranches.length === 0) {
      return;
    }

    let branchIdArray = [];
    if (this.printingService === 'plotter') {
      branchIdArray.push(this.selectedBranches[0].plotter._id);
      this.autoScroll();
    } else if (this.printingService === 'express') {
      branchIdArray.push(this.selectedBranches[0].express._id);
    }
    if (this.selectedBranches.length > 1) {
      branchIdArray.push(this.selectedBranches[1].express._id);
    }

    this.branchesService.getQueData(this.printingService, branchIdArray).subscribe(
      queData => {
        if (queData && queData.fetchedBranches?.length > 0) {
          this.selectedBranches.forEach((branch, index) => {
            if (this.printingService === 'plotter') {
              if (branch.plotter._id === queData.fetchedBranches[index]._id) {
                branch.plotter = queData.fetchedBranches[index];
              }
            } else if (this.printingService === 'express') {
              if (branch.express._id === queData.fetchedBranches[index]._id) {
                branch.express = queData.fetchedBranches[index];
              }
            }
          });
          if (queData.fetchedBranches.length > 0) {
            this.lastUpdated = new Date();
          }
        } else {
          console.warn('Received empty or null queData'); // Log if data is empty or null
        }
      },
      error => {
        console.error('Error fetching que data:', error); // Log any unexpected errors in the subscription
      }
    );
  }

  isVeryUpdated() {
    const now = new Date();
    if (this.lastUpdated) {
      const diff = Math.abs(now.getTime() - this.lastUpdated.getTime());
      for (let i = 0; i < this.selectedBranches.length; i++) {
        if (this.selectedBranches[i].express?.error) {
          if (!this.expressError[i]) {
            this.expressError[i] = Date.now();
          }
        } else {
          this.expressError[i] = false;
        }
      }
      return diff < this.rangeOfUpdating;
    }
    return false;
  }

  isExpressError(branchIndex: number) {
    if (!this.expressError[branchIndex]) {
      return false;
    }
    const now = Date.now();
    const diff = Math.abs(now - this.expressError[branchIndex]);
    if (diff < this.expressErrorAlertDelay) {
      return false;
    } else {
      return true;
    }
  }

  getOrderNumOfFiles(order: any) {
    let totalImages = 0;
    if (order && order.files) {
      order.files.forEach(file => {
        totalImages += 1;
      });
    }
    return totalImages;
  }

  getOrderTimeEstimation(branch: any, order: any, orderIndex: number, isInPrinter: boolean) {
    let totalOrdersListDurationInMinutes = 0;
    if (branch.plotter?.printers[0]?.printerQueue && branch.plotter?.printers[0]?.printerQueue.length > 0 && order?.totalOrderDurationInMinutes) {
      branch.plotter?.printers[0]?.printerQueue.forEach((order, index) => {
        if (!isInPrinter || index < orderIndex) {
          totalOrdersListDurationInMinutes += order.totalOrderDurationInMinutes;
        }
      });
    }
    if ((branch.plotter?.printers[0]?.queue && branch.plotter?.printers[0]?.queue.length > 0 && order?.totalOrderDurationInMinutes) && !isInPrinter) {
      branch.plotter?.printers[0]?.queue.forEach((order, index) => {
        if (index < orderIndex) {
          totalOrdersListDurationInMinutes += order.totalOrderDurationInMinutes;
        }
      });
    }
    return Math.ceil(totalOrdersListDurationInMinutes);
  }

  getTotalTimeEstimation(branch: any) {
    let totalBranchDurationInMinutes = 0;
    if (branch.plotter?.printers[0]?.printerQueue && branch.plotter?.printers[0]?.printerQueue.length > 0) {
      branch.plotter?.printers[0]?.printerQueue.forEach((order, index) => {
        totalBranchDurationInMinutes += order.totalOrderDurationInMinutes;
      });
    }
    if (branch.plotter?.printers[0]?.queue && branch.plotter?.printers[0]?.queue.length > 0) {
      branch.plotter?.printers[0]?.queue.forEach(order => {
        totalBranchDurationInMinutes += order.totalOrderDurationInMinutes;
      });
    }
    return Math.ceil(totalBranchDurationInMinutes);
  }

  getTotalNumOfOrders(branch: any) {
    let totalOrders = 0;
    if (branch.plotter?.printers[0]?.printerQueue && branch.plotter?.printers[0]?.printerQueue.length > 0) {
      totalOrders = branch.plotter?.printers[0]?.printerQueue.length;
    }
    if (branch.plotter?.printers[0]?.queue && branch.plotter?.printers[0]?.queue.length > 0) {
      totalOrders += branch.plotter?.printers[0]?.queue.length;
    }
    return totalOrders;
  }

  // SCROLL PLOTTER QUEUE

  autoScroll() {
    if (this.printingService === 'plotter' && this.selectedBranches.length > 0) {
      const container = document.getElementById('scrollContainer');
      const endOfContent = document.getElementById('endOfContent');
      const scrollSpeed = 20; // pixels per second

      if (container && container.scrollHeight > container.clientHeight && !this.isAutoScrolling) {
        this.isAutoScrolling = true;
        setTimeout(() => {
          console.log('autoScroll started');
          let scrollInterval = setInterval(() => {
            // Check if the endOfContent is visible
            const containerRect = container.getBoundingClientRect();
            const contentRect = endOfContent.getBoundingClientRect();
            const isVisible = contentRect.top >= containerRect.top && contentRect.bottom <= containerRect.bottom;

            if (!isVisible) {
              // console.log('scrolling down');
              container.scrollTop += scrollSpeed / (1000 / 60); // scrollSpeed pixels per second
            } else {
              // console.log('reached bottom, stopping scroll');
              clearInterval(scrollInterval); // stop the interval
              setTimeout(() => {
                console.log('scrolling back to top');
                container.scrollTop = 0; // jump to the top
                setTimeout(() => {
                  console.log('restarting scroll');
                  // this.isAutoScrolling = false;
                  this.autoScroll(); // restart the function
                }, 3000); // wait for 3 seconds before starting to scroll again
              }, 3000); // wait for 3 seconds after reaching the bottom
            }
          }, 1000 / 60); // run the interval every 60th of a second to simulate smooth scrolling
        }, 3000); // wait for 3 seconds before starting to scroll
      }
    }
  }

  // LOTTIE ANIMATION
  animate() {
    this.animationPics = lottie.loadAnimation({
      container: document.getElementById('animationContainerPics'),
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: 'assets/videos/que-docs.json'
    });

    this.animationDocs = lottie.loadAnimation({
      container: document.getElementById('animationContainerDocs'),
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: 'assets/videos/que-pics.json'
    });
  }

  isImagesBranch(branch: any) {
    let isImagesBranch = false;
    if (branch.express?.consumables?.papers) {
      branch.express.consumables.papers.forEach(paper => {
        if (paper.serial_name === 'SM' || paper.serial_name === 'LG') {
          isImagesBranch = true;
        }
      });
    }
    return isImagesBranch;
  }
  // ==================
}
