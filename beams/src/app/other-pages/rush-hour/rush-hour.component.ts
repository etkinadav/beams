import { Component, OnInit } from "@angular/core";

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
  }
})
export class RushHourComponent implements OnInit {
  GRID_SIZE = 6;
  
  vehicles: Vehicle[] = [];
  selectedVehicleId: string | null = null;
  gameWon: boolean = false;
  initialVehicles: Vehicle[] = []; // Store initial state for reset

  constructor() { }

  ngOnInit() {
    this.initializeGame();
  }

  initializeGame() {
    // Initialize vehicles according to specification
    // Row/Col are 0-indexed: row=row-1, col: A=0,B=1,C=2,D=3,E=4,F=5
    this.initialVehicles = [
      { id: "red", color: "red", orientation: "H", length: 2, row: 2, col: 0 }, // A3 -> row=2, col=0
      { id: "g1", color: "#4CAF50", orientation: "H", length: 2, row: 0, col: 2 }, // C1 -> row=0, col=2
      { id: "y1", color: "#FFC107", orientation: "V", length: 3, row: 0, col: 5 }, // F1 -> row=0, col=5
      { id: "o1", color: "#FF9800", orientation: "H", length: 2, row: 1, col: 1 }, // B2 -> row=1, col=1
      { id: "lb1", color: "#03A9F4", orientation: "V", length: 3, row: 1, col: 4 }, // E2 -> row=1, col=4
      { id: "p1", color: "#E91E63", orientation: "V", length: 2, row: 2, col: 2 }, // C3 -> row=2, col=2
      { id: "ps1", color: "#9C27B0", orientation: "V", length: 2, row: 2, col: 3 }, // D3 -> row=2, col=3
      { id: "dg1", color: "#607D8B", orientation: "H", length: 2, row: 2, col: 4 }, // E3 -> row=2, col=4
      { id: "g2", color: "#8BC34A", orientation: "H", length: 2, row: 3, col: 0 }, // A4 -> row=3, col=0
      { id: "pl1", color: "#673AB7", orientation: "H", length: 3, row: 3, col: 3 }, // D4 -> row=3, col=3
      { id: "b1", color: "#D7CCC8", orientation: "H", length: 2, row: 4, col: 0 }, // A5 -> row=4, col=0
      { id: "ys1", color: "#FFEB3B", orientation: "V", length: 2, row: 4, col: 2 }, // C5 -> row=4, col=2
      { id: "bl1", color: "#2196F3", orientation: "H", length: 3, row: 4, col: 3 }, // D5 -> row=4, col=3
      { id: "g3", color: "#689F38", orientation: "H", length: 2, row: 5, col: 0 }, // A6 -> row=5, col=0
    ];
    
    this.resetGame();
  }

  resetGame() {
    this.vehicles = JSON.parse(JSON.stringify(this.initialVehicles)); // Deep copy
    this.selectedVehicleId = null;
    this.gameWon = false;
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
    const cellSize = 60; // pixels per cell
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
        zIndex: isSelected ? 10 : 1,
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
        zIndex: isSelected ? 10 : 1,
        boxShadow: isSelected ? "0 0 10px rgba(255, 215, 0, 0.8)" : "none"
      };
    }
  }

  getArrowStyle(vehicle: Vehicle, direction: Direction): any {
    const cellSize = 60;
    const arrowSize = 20;
    const offset = 5;

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
      zIndex: 20
    };
  }
}
