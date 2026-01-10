import { Component, OnInit, ViewEncapsulation } from "@angular/core";
import { trigger, transition, style, animate } from '@angular/animations';

export interface Vehicle {
  id: string;
  color: string;
  orientation: "H" | "V";
  length: number;
  row: number; // 0-5 (rowIndex)
  col: number; // 0-5 (colIndex)
}

type Direction = "left" | "right" | "up" | "down";

@Component({
  selector: "app-rush-hour",
  templateUrl: "./rush-hour.component.html",
  styleUrls: ["./rush-hour.component.css"],
  host: {
    class: 'fill-screen'
  },
  encapsulation: ViewEncapsulation.None,
  animations: [
    trigger('textAnimation', [
      transition('* => *', [
        style({ opacity: 0, transform: 'scale(0.5) translateY(-50px)' }),
        animate('0.5s ease-out', style({ opacity: 1, transform: 'scale(1) translateY(0)' })),
        animate('1s ease-in', style({ opacity: 1, transform: 'scale(1) translateY(0)' })),
        animate('0.5s ease-in', style({ opacity: 0, transform: 'scale(0.5) translateY(50px)' }))
      ])
    ])
  ]
})
export class RushHourComponent implements OnInit {
  GRID_SIZE = 6;
  
  vehicles: Vehicle[] = [];
  selectedVehicleId: string | null = null;
  gameWon: boolean = false;
  initialVehicles: Vehicle[] = []; // Store initial state for reset
  backgroundOpacity: number = 0; // Opacity based on red car position
  backgroundBlur: number = 20; // Blur based on red car position (starts high, decreases as car moves)
  celebrationStarted: boolean = false;
  celebrationTextIndex: number = 0;
  celebrationTexts: string[] = ["אבא ❤️", "יום הולדת שמח!!! 🎉🎉", "אוהב אותך מלא 😍", "המתנה שלך… 🎧😉"];
  vehiclesFlying: boolean = false;
  vehicleFlyOffsets: Map<string, {x: number, y: number, rotation: number}> = new Map();
  showGiftMessage: boolean = false;
  showInstructions: boolean = true; // Show instructions modal at start

  constructor() { }
  

  ngOnInit() {
    this.initializeGame();
  }

  initializeGame() {
    // Initialize vehicles according to specification
    // Row/Col are 0-indexed: row=row-1, col: A=0,B=1,C=2,D=3,E=4,F=5
    this.initialVehicles = [
      { id: "red", color: "red", orientation: "H", length: 2, row: 2, col: 0 }, // A3 -> row=2, col=0 (starts at leftmost position)
      { id: "g1", color: "#4CAF50", orientation: "H", length: 2, row: 0, col: 2 }, // C1 -> row=0, col=2
      { id: "y1", color: "#FFC107", orientation: "V", length: 3, row: 0, col: 5 }, // F1 -> row=0, col=5
      { id: "o1", color: "#FF9800", orientation: "H", length: 2, row: 1, col: 2 }, // C2 -> row=1, col=2
      { id: "lb1", color: "#03A9F4", orientation: "V", length: 2, row: 0, col: 4 }, // E1 -> row=0, col=4
      { id: "p1", color: "#E91E63", orientation: "V", length: 2, row: 2, col: 2 }, // C3 -> row=2, col=2
      { id: "ps1", color: "#9C27B0", orientation: "V", length: 2, row: 2, col: 3 }, // D3 -> row=2, col=3
      { id: "dg1", color: "#607D8B", orientation: "H", length: 2, row: 3, col: 4 }, // E4 -> row=3, col=4
      { id: "g2", color: "#8BC34A", orientation: "H", length: 2, row: 3, col: 0 }, // A4 -> row=3, col=0
      { id: "pl1", color: "#673AB7", orientation: "H", length: 3, row: 4, col: 3 }, // D5 -> row=4, col=3
      { id: "b1", color: "#D7CCC8", orientation: "H", length: 2, row: 4, col: 0 }, // A5 -> row=4, col=0
      { id: "ys1", color: "#FFEB3B", orientation: "V", length: 2, row: 4, col: 2 }, // C5 -> row=4, col=2
      { id: "bl1", color: "#2196F3", orientation: "H", length: 3, row: 5, col: 3 }, // D6 -> row=5, col=3
      { id: "g3", color: "#689F38", orientation: "H", length: 2, row: 5, col: 0 }, // A6 -> row=5, col=0
    ];
    
    // Initialize game state (but don't reset showInstructions on first load)
    this.vehicles = JSON.parse(JSON.stringify(this.initialVehicles)); // Deep copy
    this.selectedVehicleId = null;
    this.gameWon = false;
    this.celebrationStarted = false;
    this.vehiclesFlying = false;
    this.celebrationTextIndex = 0;
    this.showGiftMessage = false;
    this.vehicleFlyOffsets.clear();
    this.updateBackgroundOpacity(); // Initialize opacity and blur on game start
    // showInstructions stays true on initial load (set in property declaration)
  }
  
  getBackgroundOpacity(): number {
    return this.backgroundOpacity;
  }
  
  getBackgroundImageStyle(): any {
    return {
      opacity: this.backgroundOpacity,
      filter: `blur(${this.backgroundBlur}px)`
    };
  }

  resetGame() {
    this.vehicles = JSON.parse(JSON.stringify(this.initialVehicles)); // Deep copy
    this.selectedVehicleId = null;
    this.gameWon = false;
    this.celebrationStarted = false;
    this.vehiclesFlying = false;
    this.celebrationTextIndex = 0;
    this.showGiftMessage = false;
    this.vehicleFlyOffsets.clear();
    this.updateBackgroundOpacity(); // Reset opacity when resetting game
    this.showInstructions = false; // Don't show instructions again on reset
  }
  
  closeInstructions() {
    this.showInstructions = false;
  }
  
  startCelebration() {
    this.celebrationStarted = true;
    
    // Pre-calculate fly offsets for each vehicle (consistent per vehicle)
    // Vehicles should fly far enough to disappear from screen
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const flyDistance = Math.max(screenWidth, screenHeight) * 1.5; // Fly far enough to disappear
    
    this.vehicles.forEach((vehicle, index) => {
      const angle = (index * 360 / this.vehicles.length) + (index % 3) * 15;
      const radians = (angle * Math.PI) / 180;
      const x = Math.cos(radians) * flyDistance;
      const y = Math.sin(radians) * flyDistance;
      const rotation = angle + (index % 5) * 20;
      this.vehicleFlyOffsets.set(vehicle.id, { x, y, rotation });
    });
    
    // Trigger vehicles flying animation
    setTimeout(() => {
      this.vehiclesFlying = true;
    }, 100);
    
    // Rotate celebration texts every 1.5 seconds (4 texts total)
    let textIndex = 0;
    const textInterval = setInterval(() => {
      textIndex++;
      if (textIndex >= this.celebrationTexts.length) {
        clearInterval(textInterval);
        // After all texts, show gift message
        setTimeout(() => {
          this.showGiftMessage = true;
        }, 500);
        return;
      }
      this.celebrationTextIndex = textIndex;
    }, 1500);
  }
  
  goToHome() {
    // Navigate back to home
    window.location.href = '/';
  }
  
  getCelebrationText(): string {
    return this.celebrationTexts[this.celebrationTextIndex] || this.celebrationTexts[0];
  }
  
  getVehicleCelebrationStyle(vehicle: Vehicle, index: number): any {
    if (!this.vehiclesFlying) {
      return this.getVehicleStyle(vehicle);
    }
    
    // Get pre-calculated offset or calculate if not exists
    let offset = this.vehicleFlyOffsets.get(vehicle.id);
    if (!offset) {
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const flyDistance = Math.max(screenWidth, screenHeight) * 1.5;
      const angle = (index * 360 / this.vehicles.length) + (index % 3) * 15;
      const radians = (angle * Math.PI) / 180;
      offset = {
        x: Math.cos(radians) * flyDistance,
        y: Math.sin(radians) * flyDistance,
        rotation: angle + (index % 5) * 20
      };
      this.vehicleFlyOffsets.set(vehicle.id, offset);
    }
    
    const baseStyle = this.getVehicleStyle(vehicle);
    
    return {
      ...baseStyle,
      transform: `translate(${offset.x}px, ${offset.y}px) rotate(${offset.rotation}deg)`,
      transition: 'transform 2.5s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 2.5s ease-out',
      opacity: 0,
      zIndex: 100
    };
  }

  buildOccupancyGrid(): (Vehicle | null)[][] {
    const grid: (Vehicle | null)[][] = Array(this.GRID_SIZE)
      .fill(null)
      .map(() => Array(this.GRID_SIZE).fill(null));

    for (const vehicle of this.vehicles) {
      const cells = this.getVehicleCells(vehicle);
      for (const [r, c] of cells) {
        grid[r][c] = vehicle;
      }
    }
    return grid;
  }

  getVehicleCells(vehicle: Vehicle): [number, number][] {
    const cells: [number, number][] = [];
    if (vehicle.orientation === "H") {
      for (let i = 0; i < vehicle.length; i++) {
        cells.push([vehicle.row, vehicle.col + i]);
      }
    } else {
      for (let i = 0; i < vehicle.length; i++) {
        cells.push([vehicle.row + i, vehicle.col]);
      }
    }
    return cells;
  }

  canMoveLeft(vehicle: Vehicle, grid: (Vehicle | null)[][]): boolean {
    if (vehicle.orientation !== "H") return false;
    const newCol = vehicle.col - 1;
    if (newCol < 0) return false;
    return grid[vehicle.row][newCol] === null;
  }

  canMoveRight(vehicle: Vehicle, grid: (Vehicle | null)[][]): boolean {
    if (vehicle.orientation !== "H") return false;
    const endCol = vehicle.col + vehicle.length - 1;
    const newCol = endCol + 1;
    
    // Special case for red vehicle: if it's at E3-F3 (row=2, col=4-5), moving right wins
    if (vehicle.id === "red" && vehicle.row === 2 && endCol === 5) {
      return true; // Can exit (win condition)
    }
    
    if (newCol >= this.GRID_SIZE) return false;
    return grid[vehicle.row][newCol] === null;
  }

  canMoveUp(vehicle: Vehicle, grid: (Vehicle | null)[][]): boolean {
    if (vehicle.orientation !== "V") return false;
    const newRow = vehicle.row - 1;
    if (newRow < 0) return false;
    return grid[newRow][vehicle.col] === null;
  }

  canMoveDown(vehicle: Vehicle, grid: (Vehicle | null)[][]): boolean {
    if (vehicle.orientation !== "V") return false;
    const endRow = vehicle.row + vehicle.length - 1;
    const newRow = endRow + 1;
    if (newRow >= this.GRID_SIZE) return false;
    return grid[newRow][vehicle.col] === null;
  }

  selectVehicle(vehicleId: string | null) {
    this.selectedVehicleId = vehicleId;
  }

  moveVehicle(vehicleId: string, direction: Direction) {
    const vehicle = this.vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return;

    const grid = this.buildOccupancyGrid();
    
    // Check if move is valid
    let canMove = false;
    switch (direction) {
      case "left":
        canMove = this.canMoveLeft(vehicle, grid);
        break;
      case "right":
        canMove = this.canMoveRight(vehicle, grid);
        break;
      case "up":
        canMove = this.canMoveUp(vehicle, grid);
        break;
      case "down":
        canMove = this.canMoveDown(vehicle, grid);
        break;
    }

    if (!canMove) return;

    // Check for win condition (red vehicle exiting)
    if (vehicle.id === "red" && direction === "right") {
      const endCol = vehicle.col + vehicle.length - 1;
      if (vehicle.row === 2 && endCol === 5) {
        // Red is at E3-F3, moving right wins
        this.gameWon = true;
        this.startCelebration();
        return;
      }
    }

    // Perform move
    switch (direction) {
      case "left":
        vehicle.col -= 1;
        break;
      case "right":
        vehicle.col += 1;
        break;
      case "up":
        vehicle.row -= 1;
        break;
      case "down":
        vehicle.row += 1;
        break;
    }
    
    // Update background opacity based on red car position
    this.updateBackgroundOpacity();
  }
  
  updateBackgroundOpacity() {
    const redCar = this.vehicles.find(v => v.id === "red");
    if (redCar) {
      // col 0 = 0%, col 1 = 20%, col 2 = 40%, etc. (max 100% at col 5)
      // Since red car starts at col 0 (opacity 0) and moves right
      this.backgroundOpacity = Math.min(redCar.col * 0.2, 1.0);
      
      // Blur starts at 20px (when col=0, opacity=0) and decreases to 0px (when col=5, opacity=1.0)
      // When red car is at col 0: blur = 20px
      // When red car is at col 5: blur = 0px
      // Linear decrease: blur = 20 - (redCar.col * 4)
      this.backgroundBlur = Math.max(20 - (redCar.col * 4), 0);
    } else {
      this.backgroundOpacity = 0;
      this.backgroundBlur = 20;
    }
  }

  onVehicleClick(vehicleId: string) {
    this.selectVehicle(vehicleId);
  }

  onGridClick() {
    this.selectVehicle(null);
  }

  onArrowClick(event: Event, direction: Direction) {
    event.stopPropagation();
    if (this.selectedVehicleId) {
      this.moveVehicle(this.selectedVehicleId, direction);
    }
  }

  getSelectedVehicle(): Vehicle | null {
    if (!this.selectedVehicleId) return null;
    return this.vehicles.find(v => v.id === this.selectedVehicleId) || null;
  }

  getVehicleStyle(vehicle: Vehicle): any {
    // Calculate cell size as 70vh / 6 (70% of viewport height divided by 6 rows)
    const cellSize = window.innerHeight * 0.7 / 6;
    const isSelected = vehicle.id === this.selectedVehicleId;
    
    if (vehicle.orientation === "H") {
      return {
        position: "absolute",
        left: `${vehicle.col * cellSize}px`,
        top: `${vehicle.row * cellSize}px`,
        width: `${vehicle.length * cellSize}px`,
        height: `${cellSize}px`,
        backgroundColor: vehicle.color,
        border: isSelected ? "3px solid #FFD700" : "2px solid #333",
        borderRadius: "4px",
        cursor: "pointer",
        zIndex: 10, // All vehicles on same layer
        boxShadow: isSelected ? "0 0 10px rgba(255, 215, 0, 0.8)" : "none"
      };
    } else {
      return {
        position: "absolute",
        left: `${vehicle.col * cellSize}px`,
        top: `${vehicle.row * cellSize}px`,
        width: `${cellSize}px`,
        height: `${vehicle.length * cellSize}px`,
        backgroundColor: vehicle.color,
        border: isSelected ? "3px solid #FFD700" : "2px solid #333",
        borderRadius: "4px",
        cursor: "pointer",
        zIndex: 10, // All vehicles on same layer
        boxShadow: isSelected ? "0 0 10px rgba(255, 215, 0, 0.8)" : "none"
      };
    }
  }

  getArrowStyle(vehicle: Vehicle, direction: Direction): any {
    // Calculate cell size as 70vh / 6
    const cellSize = window.innerHeight * 0.7 / 6;
    const arrowSize = cellSize * 0.33; // 33% of cell size
    const offset = cellSize * 0.08; // 8% of cell size

    let left = 0;
    let top = 0;

    if (vehicle.orientation === "H") {
      if (direction === "left") {
        left = -arrowSize - offset;
        top = (cellSize - arrowSize) / 2;
      } else if (direction === "right") {
        left = vehicle.length * cellSize + offset;
        top = (cellSize - arrowSize) / 2;
      }
    } else {
      if (direction === "up") {
        left = (cellSize - arrowSize) / 2;
        top = -arrowSize - offset;
      } else if (direction === "down") {
        left = (cellSize - arrowSize) / 2;
        top = vehicle.length * cellSize + offset;
      }
    }

    return {
      position: "absolute",
      left: `${vehicle.col * cellSize + left}px`,
      top: `${vehicle.row * cellSize + top}px`,
      width: `${arrowSize}px`,
      height: `${arrowSize}px`,
      cursor: "pointer",
      zIndex: 30 // Arrows always on top
    };
  }
}
