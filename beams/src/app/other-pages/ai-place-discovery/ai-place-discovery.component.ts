import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
} from "@angular/core";
import * as maplibregl from "maplibre-gl";
import type { Map as MaplibreMap, Marker } from "maplibre-gl";
import { Subscription } from "rxjs";
import { DirectionService } from "../../direction.service";
import { environment } from "../../../environments/environment";
import { AiPlaceCategory, AiPlaceResult, AiPlaceSearchResponse } from "../../models/ai-place-search.model";
import { AiPlaceSearchService } from "../../services/ai-place-search.service";
import { buildMapTilerStyleUrl } from "./maptiler-map.config";

const SESSION_PROMPT_KEY = "ai-place-discovery-prompt";
const DEFAULT_CENTER = { lat: 32.0853, lng: 34.7818 };

@Component({
  selector: "app-ai-place-discovery",
  templateUrl: "./ai-place-discovery.component.html",
  styleUrls: ["./ai-place-discovery.component.scss"],
  host: { class: "ai-place-discovery-host" },
})
export class AiPlaceDiscoveryComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild("mapContainer") mapContainerRef?: ElementRef<HTMLElement>;

  isRTL = true;
  private directionSub?: Subscription;

  prompt = "";
  category: AiPlaceCategory = "all";
  radiusMeters = 1500;
  radiusOptions = [500, 1000, 2000, 5000];

  userLat: number | null = null;
  userLng: number | null = null;
  locationLoading = false;
  locationMessage: string | null = null;
  locationDenied = false;

  manualLat: string = "";
  manualLng: string = "";

  /** True when MapTiler API key is set in environment (required to instantiate the map). */
  get maptilerConfigured(): boolean {
    return !!environment.maptilerApiKey?.trim();
  }

  mapReady = false;
  mapsLoadError: string | null = null;

  private map: MaplibreMap | null = null;
  private userMarker: Marker | null = null;
  private readonly placeMarkers = new Map<string, Marker>();

  places: AiPlaceResult[] = [];
  meta: AiPlaceSearchResponse["meta"] | null = null;
  selectedPlaceId: string | null = null;

  searchLoading = false;
  searchError: string | null = null;
  hasSearched = false;

  constructor(
    private directionService: DirectionService,
    private aiPlaceSearch: AiPlaceSearchService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const saved = sessionStorage.getItem(SESSION_PROMPT_KEY);
    if (saved) this.prompt = saved;

    this.directionSub = this.directionService.direction$.subscribe((d) => {
      this.isRTL = d === "rtl";
    });

    this.offerGeolocation();
  }

  ngAfterViewInit(): void {
    if (!this.maptilerConfigured) {
      return;
    }
    queueMicrotask(() => this.initMap());
  }

  ngOnDestroy(): void {
    this.directionSub?.unsubscribe();
    this.destroyMap();
  }

  private destroyMap(): void {
    this.placeMarkers.forEach((m) => m.remove());
    this.placeMarkers.clear();
    this.userMarker?.remove();
    this.userMarker = null;
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    this.mapReady = false;
  }

  private initMap(): void {
    const el = this.mapContainerRef?.nativeElement;
    if (!el || this.map) {
      return;
    }

    const styleUrl = buildMapTilerStyleUrl(
      environment.maptilerApiKey!,
      environment.maptilerMapId || null
    );

    const center: [number, number] =
      this.userLng != null && this.userLat != null
        ? [this.userLng, this.userLat]
        : [DEFAULT_CENTER.lng, DEFAULT_CENTER.lat];

    try {
      this.map = new maplibregl.Map({
        container: el,
        style: styleUrl,
        center,
        zoom: 14,
      });

      this.map.on("load", () => {
        this.ngZone.run(() => {
          this.mapsLoadError = null;
          this.mapReady = true;
          this.refreshMarkers();
          this.cdr.markForCheck();
        });
      });

      this.map.on("error", (e) => {
        console.warn("MapLibre error:", e);
      });
    } catch (e: unknown) {
      this.mapsLoadError = e instanceof Error ? e.message : "Failed to initialize map.";
    }
  }

  offerGeolocation(): void {
    this.locationMessage = "Use your location for better nearby results.";
  }

  useMyLocation(): void {
    if (!navigator.geolocation) {
      this.locationMessage = "Geolocation is not supported in this browser.";
      return;
    }
    this.locationLoading = true;
    this.locationDenied = false;
    this.locationMessage = null;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.userLat = pos.coords.latitude;
        this.userLng = pos.coords.longitude;
        this.locationLoading = false;
        this.maybeFitAfterLocation();
        this.refreshMarkers();
      },
      (err: GeolocationPositionError) => {
        this.locationLoading = false;
        this.locationDenied = true;
        this.locationMessage =
          err.code === 1
            ? "Location permission denied. Enter coordinates manually below, or adjust browser settings."
            : "Could not read your location.";
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 }
    );
  }

  applyManualLocation(): void {
    const lat = parseFloat(this.manualLat);
    const lng = parseFloat(this.manualLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      this.locationMessage = "Enter valid numeric latitude and longitude.";
      return;
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      this.locationMessage = "Latitude must be −90…90 and longitude −180…180.";
      return;
    }
    this.userLat = lat;
    this.userLng = lng;
    this.locationDenied = false;
    this.locationMessage = "Using manual coordinates.";
    this.maybeFitAfterLocation();
    this.refreshMarkers();
  }

  private maybeFitAfterLocation(): void {
    setTimeout(() => {
      if (this.map && this.mapReady && this.userLat != null && this.userLng != null) {
        this.map.flyTo({ center: [this.userLng, this.userLat], zoom: 14 });
      }
    }, 200);
  }

  private refreshMarkers(): void {
    if (!this.map || !this.mapReady) {
      return;
    }

    this.userMarker?.remove();
    this.userMarker = null;
    this.placeMarkers.forEach((m) => m.remove());
    this.placeMarkers.clear();

    if (this.userLat != null && this.userLng != null) {
      this.userMarker = new maplibregl.Marker({ color: "#1976d2" })
        .setLngLat([this.userLng, this.userLat])
        .addTo(this.map);
    }

    for (const p of this.places) {
      if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) {
        continue;
      }
      const selected = p.id === this.selectedPlaceId;
      const color = selected ? "#e91e63" : "#5c6bc0";
      const marker = new maplibregl.Marker({ color })
        .setLngLat([p.lng, p.lat])
        .addTo(this.map);

      marker.getElement().style.cursor = "pointer";
      marker.getElement().addEventListener("click", (ev) => {
        ev.stopPropagation();
        this.ngZone.run(() => this.onMarkerClick(p.id));
      });
      this.placeMarkers.set(p.id, marker);
    }
  }

  onMarkerClick(placeId: string): void {
    this.selectedPlaceId = placeId;
    this.refreshMarkers();
    const p = this.places.find((x) => x.id === placeId);
    if (p && this.map && this.mapReady && Number.isFinite(p.lat) && Number.isFinite(p.lng)) {
      this.map.flyTo({
        center: [p.lng, p.lat],
        zoom: Math.max(this.map.getZoom(), 15),
        essential: true,
      });
    }
    const el = document.getElementById(`place-card-${placeId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  selectCard(p: AiPlaceResult): void {
    this.onMarkerClick(p.id);
  }

  search(): void {
    if (this.userLat == null || this.userLng == null) {
      this.searchError = "Set your location or enter coordinates before searching.";
      return;
    }
    const trimmed = this.prompt.trim();
    if (!trimmed) {
      this.searchError = "Enter a search prompt.";
      return;
    }

    sessionStorage.setItem(SESSION_PROMPT_KEY, trimmed);
    this.searchLoading = true;
    this.searchError = null;
    this.hasSearched = true;
    this.places = [];
    this.meta = null;
    this.selectedPlaceId = null;

    this.aiPlaceSearch
      .search({
        prompt: trimmed,
        latitude: this.userLat,
        longitude: this.userLng,
        radius: this.radiusMeters,
        category: this.category,
      })
      .subscribe({
        next: (res) => {
          this.searchLoading = false;
          this.meta = res.meta;
          this.places = res.places || [];
          setTimeout(() => {
            this.refreshMarkers();
            this.fitMapToResults();
          }, 100);
        },
        error: (err) => {
          this.searchLoading = false;
          const msg =
            err?.error?.message ||
            err?.error?.error ||
            err?.message ||
            "Search failed.";
          this.searchError = typeof msg === "string" ? msg : "Search failed.";
        },
      });
  }

  private fitMapToResults(): void {
    if (!this.map || !this.mapReady || this.userLat == null || this.userLng == null) {
      return;
    }
    if (this.places.length === 0) {
      this.map.flyTo({ center: [this.userLng, this.userLat], zoom: 14, essential: true });
      return;
    }
    const bounds = new maplibregl.LngLatBounds();
    bounds.extend([this.userLng, this.userLat]);
    for (const p of this.places) {
      if (Number.isFinite(p.lat) && Number.isFinite(p.lng)) {
        bounds.extend([p.lng, p.lat]);
      }
    }
    this.map.fitBounds(bounds, { padding: 56, maxZoom: 16, duration: 600 });
  }

  priceLevelLabel(level: number | null): string {
    if (level == null) return "—";
    return Array(Math.min(4, level) + 1).join("$") + (level >= 4 ? "+" : "");
  }

  trackByPlaceId(_i: number, p: AiPlaceResult): string {
    return p.id;
  }
}
