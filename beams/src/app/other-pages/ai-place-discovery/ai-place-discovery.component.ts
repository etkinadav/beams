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
import type { Map as MaplibreMap, Marker, Popup } from "maplibre-gl";
import { Subscription } from "rxjs";
import { DirectionService } from "../../direction.service";
import { environment } from "../../../environments/environment";
import { MatDialog } from "@angular/material/dialog";
import { SearchDebugFlowDialogComponent } from "../../dialog/search-debug-flow-dialog/search-debug-flow-dialog.component";
import { AiPlaceCategory, AiPlaceResult, AiPlaceSearchResponse } from "../../models/ai-place-search.model";
import { AiPlaceSearchService } from "../../services/ai-place-search.service";
import {
  buildMapTilerStyleUrl,
  isConfiguredMapTilerApiKey,
  sanitizeMapTilerMapId,
} from "./maptiler-map.config";

const SESSION_PROMPT_KEY = "ai-place-discovery-prompt";
const DEFAULT_CENTER: [number, number] = [34.7818, 32.0853]; // lng, lat — Tel Aviv
const SEARCH_RADIUS = 1500;
const SEARCH_CATEGORY: AiPlaceCategory = "all";

@Component({
  selector: "app-ai-place-discovery",
  templateUrl: "./ai-place-discovery.component.html",
  styleUrls: ["./ai-place-discovery.component.scss"],
})
export class AiPlaceDiscoveryComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild("mapContainer", { static: true }) mapContainerRef!: ElementRef<HTMLElement>;

  isRTL = true;
  private directionSub?: Subscription;
  private resizeObserver: ResizeObserver | null = null;
  private readonly onWindowResize = () => this.map?.resize();

  prompt = "";
  userLat: number | null = null;
  userLng: number | null = null;
  locationLoading = false;

  get maptilerConfigured(): boolean {
    return isConfiguredMapTilerApiKey(environment.maptilerApiKey);
  }

  mapReady = false;
  mapsLoadError: string | null = null;

  private map: MaplibreMap | null = null;
  private userMarker: Marker | null = null;
  private readonly placeMarkers = new Map<string, Marker>();
  private activePopup: Popup | null = null;

  places: AiPlaceResult[] = [];
  selectedPlaceId: string | null = null;

  searchLoading = false;
  searchError: string | null = null;

  /** TEMPORARY: full `meta.searchDebug` JSON for on-page debugging when modal fails */
  debugSearchDebugInline: string | null = null;

  constructor(
    private directionService: DirectionService,
    private aiPlaceSearch: AiPlaceSearchService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    const saved = sessionStorage.getItem(SESSION_PROMPT_KEY);
    if (saved) {
      this.prompt = saved;
    }
    this.directionSub = this.directionService.direction$.subscribe((d) => {
      this.isRTL = d === "rtl";
    });
  }

  ngAfterViewInit(): void {
    if (!this.maptilerConfigured) {
      return;
    }
    // Defer until layout / fixed fullscreen dimensions are applied (fixes 0×0 map canvas).
    setTimeout(() => this.initMap(), 0);
  }

  ngOnDestroy(): void {
    this.directionSub?.unsubscribe();
    window.removeEventListener("resize", this.onWindowResize);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.activePopup?.remove();
    this.activePopup = null;
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

    const apiKey = environment.maptilerApiKey!.trim();
    const mapId = sanitizeMapTilerMapId(environment.maptilerMapId);
    const styleUrl = buildMapTilerStyleUrl(apiKey, mapId);

    const center: [number, number] =
      this.userLng != null && this.userLat != null
        ? [this.userLng, this.userLat]
        : DEFAULT_CENTER;

    try {
      this.map = new maplibregl.Map({
        container: el,
        style: styleUrl,
        center,
        zoom: 13,
      });

      this.map.on("load", () => {
        this.ngZone.run(() => {
          this.map?.resize();
          this.mapsLoadError = null;
          this.mapReady = true;
          this.refreshMarkers();
          this.scheduleMapMarkerRepaint();
          this.attachResizeHandling(el);
          this.cdr.markForCheck();
        });
      });

      this.map.on("error", (e) => {
        console.warn("MapLibre error:", e);
        const msg =
          typeof (e as { error?: unknown }).error === "string"
            ? ((e as { error: string }).error as string)
            : (e as { error?: { message?: string } }).error?.message;
        if (msg && /style|key|unauthorized|forbidden/i.test(msg)) {
          this.ngZone.run(() => {
            this.mapsLoadError = msg;
            this.cdr.markForCheck();
          });
        }
      });
    } catch (e: unknown) {
      this.mapsLoadError = e instanceof Error ? e.message : "Failed to initialize map.";
    }
  }

  private attachResizeHandling(el: HTMLElement): void {
    window.addEventListener("resize", this.onWindowResize);
    this.resizeObserver?.disconnect();
    this.resizeObserver = new ResizeObserver(() => {
      if (this.map) {
        this.map.resize();
      }
    });
    this.resizeObserver.observe(el);
  }

  useMyLocation(): void {
    this.searchError = null;
    if (!navigator.geolocation) {
      this.searchError = "Geolocation is not supported in this browser.";
      return;
    }
    this.locationLoading = true;
    this.cdr.markForCheck();
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.ngZone.run(() => {
          this.locationLoading = false;
          const parsed = this.parseAndValidateGeolocation(pos);
          if (!parsed) {
            this.userLat = null;
            this.userLng = null;
            this.refreshMarkers();
            this.searchError =
              "Could not use the reported location (invalid or unreliable). Try again with precise location enabled, disable VPN, or move outdoors.";
            this.cdr.markForCheck();
            return;
          }
          const { lat, lng } = parsed;
          this.userLat = lat;
          this.userLng = lng;
          if (this.map && this.mapReady) {
            this.map.resize();
            this.refreshMarkers();
            this.map.flyTo({
              center: [lng, lat],
              zoom: 14,
              essential: true,
            });
            this.scheduleMapMarkerRepaint();
          }
          this.cdr.markForCheck();
        });
      },
      (err: GeolocationPositionError) => {
        this.ngZone.run(() => {
          this.locationLoading = false;
          this.userLat = null;
          this.userLng = null;
          this.refreshMarkers();
          this.searchError = this.geolocationErrorMessage(err);
          this.cdr.markForCheck();
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      }
    );
  }

  /**
   * Rejects non-finite coords, out-of-range, null island, and absurd accuracy (coarse IP/VPN fallbacks).
   */
  private parseAndValidateGeolocation(pos: GeolocationPosition): { lat: number; lng: number } | null {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return null;
    }
    if (Math.abs(lat) < 1e-8 && Math.abs(lng) < 1e-8) {
      return null;
    }
    const acc = pos.coords.accuracy;
    if (Number.isFinite(acc) && acc > 500_000) {
      console.warn("Geolocation rejected: accuracy too poor (m):", acc, { lat, lng });
      return null;
    }
    return { lat, lng };
  }

  private geolocationErrorMessage(err: GeolocationPositionError): string {
    switch (err.code) {
      case err.PERMISSION_DENIED:
        return "Location access denied. Allow location for this site in the browser settings.";
      case err.POSITION_UNAVAILABLE:
        return "Location unavailable. Try turning on GPS/location services, disabling VPN, or using a different browser.";
      case err.TIMEOUT:
        return "Location request timed out. Try again outdoors or with a stronger signal.";
      default:
        return "Could not read your location. Please try again.";
    }
  }

  /** Resize + repaint after markers / camera change (markers live in the canvas container DOM). */
  private scheduleMapMarkerRepaint(): void {
    if (!this.map) {
      return;
    }
    const map = this.map;
    const bump = () => {
      map.resize();
      map.triggerRepaint();
    };
    requestAnimationFrame(() => {
      bump();
      requestAnimationFrame(bump);
    });
    map.once("moveend", bump);
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
      const lng = this.userLng;
      const lat = this.userLat;
      // Built-in SVG marker (same code path as place pins) — reliable vs custom DOM + RTL % transforms
      this.userMarker = new maplibregl.Marker({
        color: "#d32f2f",
        scale: 1.15,
        anchor: "center",
      })
        .setLngLat([lng, lat])
        .addTo(this.map);
      const el = this.userMarker.getElement();
      el.setAttribute("aria-label", "Your current location");
      el.style.zIndex = "5";
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
        this.ngZone.run(() => this.openPlacePopup(p));
      });
      this.placeMarkers.set(p.id, marker);
    }
  }

  private openPlacePopup(p: AiPlaceResult): void {
    this.selectedPlaceId = p.id;
    this.refreshMarkers();
    this.activePopup?.remove();
    const safeName = this.escapeHtml(p.name || "Place");
    const safeAddr = this.escapeHtml(p.address || "");
    const rating =
      p.rating != null
        ? `<div class="apd-pop-rating">★ ${p.rating.toFixed(1)}${
            p.userRatingsTotal != null ? ` (${p.userRatingsTotal})` : ""
          }</div>`
        : "";
    const link =
      p.googleMapsUrl != null && /^https:\/\//i.test(p.googleMapsUrl)
        ? `<p style="margin:8px 0 0"><a href="${encodeURI(
            p.googleMapsUrl
          )}" target="_blank" rel="noopener noreferrer">Open in Google Maps</a></p>`
        : "";
    const html = `<div style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.35;max-width:260px">
      <strong>${safeName}</strong>${rating}
      <div style="margin-top:6px;color:#444">${safeAddr}</div>${link}</div>`;

    this.activePopup = new maplibregl.Popup({ maxWidth: "280px", closeButton: true })
      .setLngLat([p.lng, p.lat])
      .setHTML(html)
      .addTo(this.map!);
  }

  private escapeHtml(s: string): string {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  search(): void {
    this.searchError = null;
    if (this.userLat == null || this.userLng == null) {
      this.searchError = "Use “Use my location” first.";
      return;
    }
    const trimmed = this.prompt.trim();
    if (!trimmed) {
      this.searchError = "Enter a search prompt.";
      return;
    }

    sessionStorage.setItem(SESSION_PROMPT_KEY, trimmed);
    this.searchLoading = true;
    this.debugSearchDebugInline = null;
    this.places = [];
    this.selectedPlaceId = null;
    this.activePopup?.remove();
    this.activePopup = null;

    this.aiPlaceSearch
      .search({
        prompt: trimmed,
        latitude: this.userLat,
        longitude: this.userLng,
        radius: SEARCH_RADIUS,
        category: SEARCH_CATEGORY,
      })
      .subscribe({
        next: (res: AiPlaceSearchResponse) => {
          this.searchLoading = false;
          console.log("[DEBUG] AI place search full response:", res);
          console.log("[DEBUG] geminiPlan:", res?.meta?.searchDebug?.geminiPlan);
          console.log("DEBUG FLOW:", res?.meta?.debugFlow);
          console.log("FULL RESPONSE:", res);
          console.log("res.meta:", res?.meta);
          console.log("res.meta.searchDebug:", res?.meta?.searchDebug);
          console.log("res.meta.searchDebug.geminiPlan:", res?.meta?.searchDebug?.geminiPlan);

          const searchDebug = res?.meta?.searchDebug;
          this.debugSearchDebugInline = searchDebug
            ? JSON.stringify(searchDebug, null, 2)
            : "(no meta.searchDebug — is backend debug enabled?)";

          this.places = res.places || [];

          const debugFlow = res?.meta?.debugFlow;
          if (debugFlow != null && typeof debugFlow === "object") {
            this.ngZone.run(() => {
              try {
                this.dialog.open(SearchDebugFlowDialogComponent, {
                  width: "min(880px, 96vw)",
                  maxHeight: "92vh",
                  data: { debugFlow: debugFlow as Record<string, unknown> },
                  autoFocus: false,
                });
              } catch (e) {
                console.error("SearchDebugFlowDialog open failed:", e);
              }
            });
          }
          setTimeout(() => {
            this.refreshMarkers();
            this.fitMapToResults();
          }, 50);
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.searchLoading = false;
          const msg =
            err?.error?.message ||
            err?.error?.error ||
            err?.message ||
            "Search failed.";
          this.searchError = typeof msg === "string" ? msg : "Search failed.";
          this.cdr.markForCheck();
        },
      });
  }

  private fitMapToResults(): void {
    if (!this.map || !this.mapReady || this.userLat == null || this.userLng == null) {
      return;
    }
    this.map.resize();
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
    this.map.fitBounds(bounds, { padding: { top: 100, right: 48, bottom: 120, left: 48 }, maxZoom: 16, duration: 500 });
  }
}
