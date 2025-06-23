
"use client";

import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Configure Leaflet's default icon paths to use CDN
if (L.Icon.Default.prototype) {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
}
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41] as L.PointTuple,
  iconAnchor: [12, 41] as L.PointTuple,
  popupAnchor: [1, -34] as L.PointTuple,
  tooltipAnchor: [16, -28] as L.PointTuple,
  shadowSize: [41, 41] as L.PointTuple
});

import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';

import type { ActivityItem, ActivityType } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const ICON_BASE_URL = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/';
const SHADOW_URL_COLORED = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'; // Standard shadow
const DEFAULT_ICON_SIZE_COLORED: L.PointTuple = [25, 41];
const DEFAULT_ICON_ANCHOR_COLORED: L.PointTuple = [12, 41];
const DEFAULT_POPUP_ANCHOR_COLORED: L.PointTuple = [1, -34];
const DEFAULT_SHADOW_SIZE_COLORED: L.PointTuple = [41, 41];

const blueIcon = new L.Icon({
  iconUrl: `${ICON_BASE_URL}marker-icon-blue.png`,
  iconRetinaUrl: `${ICON_BASE_URL}marker-icon-2x-blue.png`,
  shadowUrl: SHADOW_URL_COLORED, iconSize: DEFAULT_ICON_SIZE_COLORED, iconAnchor: DEFAULT_ICON_ANCHOR_COLORED, popupAnchor: DEFAULT_POPUP_ANCHOR_COLORED, shadowSize: DEFAULT_SHADOW_SIZE_COLORED,
});
const greenIcon = new L.Icon({
  iconUrl: `${ICON_BASE_URL}marker-icon-green.png`,
  iconRetinaUrl: `${ICON_BASE_URL}marker-icon-2x-green.png`,
  shadowUrl: SHADOW_URL_COLORED, iconSize: DEFAULT_ICON_SIZE_COLORED, iconAnchor: DEFAULT_ICON_ANCHOR_COLORED, popupAnchor: DEFAULT_POPUP_ANCHOR_COLORED, shadowSize: DEFAULT_SHADOW_SIZE_COLORED,
});
const violetIcon = new L.Icon({
  iconUrl: `${ICON_BASE_URL}marker-icon-violet.png`,
  iconRetinaUrl: `${ICON_BASE_URL}marker-icon-2x-violet.png`,
  shadowUrl: SHADOW_URL_COLORED, iconSize: DEFAULT_ICON_SIZE_COLORED, iconAnchor: DEFAULT_ICON_ANCHOR_COLORED, popupAnchor: DEFAULT_POPUP_ANCHOR_COLORED, shadowSize: DEFAULT_SHADOW_SIZE_COLORED,
});
const orangeIcon = new L.Icon({
  iconUrl: `${ICON_BASE_URL}marker-icon-orange.png`,
  iconRetinaUrl: `${ICON_BASE_URL}marker-icon-2x-orange.png`,
  shadowUrl: SHADOW_URL_COLORED, iconSize: DEFAULT_ICON_SIZE_COLORED, iconAnchor: DEFAULT_ICON_ANCHOR_COLORED, popupAnchor: DEFAULT_POPUP_ANCHOR_COLORED, shadowSize: DEFAULT_SHADOW_SIZE_COLORED,
});
const redIcon = new L.Icon({
  iconUrl: `${ICON_BASE_URL}marker-icon-red.png`,
  iconRetinaUrl: `${ICON_BASE_URL}marker-icon-2x-red.png`,
  shadowUrl: SHADOW_URL_COLORED, iconSize: DEFAULT_ICON_SIZE_COLORED, iconAnchor: DEFAULT_ICON_ANCHOR_COLORED, popupAnchor: DEFAULT_POPUP_ANCHOR_COLORED, shadowSize: DEFAULT_SHADOW_SIZE_COLORED,
});
const greyIcon = new L.Icon({
  iconUrl: `${ICON_BASE_URL}marker-icon-grey.png`,
  iconRetinaUrl: `${ICON_BASE_URL}marker-icon-2x-grey.png`,
  shadowUrl: SHADOW_URL_COLORED, iconSize: DEFAULT_ICON_SIZE_COLORED, iconAnchor: DEFAULT_ICON_ANCHOR_COLORED, popupAnchor: DEFAULT_POPUP_ANCHOR_COLORED, shadowSize: DEFAULT_SHADOW_SIZE_COLORED,
});

const activityTypeToIcon: Record<ActivityType, L.Icon> = {
  'Alojamiento': blueIcon,
  'Transporte': greenIcon,
  'Actividad': violetIcon,
  'Comida': orangeIcon,
  'Compras': redIcon,
};

function getActivityIcon(activityType?: ActivityType): L.Icon {
  if (activityType && activityTypeToIcon[activityType]) {
    return activityTypeToIcon[activityType];
  }
  return greyIcon; // Fallback icon
}

interface ActivityMapProps {
  activities: ActivityItem[];
  tripDestination?: string;
}

export function ActivityMap({ activities, tripDestination }: ActivityMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const routingControlRef = useRef<L.Routing.Control | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const isMountedRef = useRef(true);

  const waypointsAndCenter = useMemo(() => {
    const sortedActivities = [...activities].sort((a, b) => {
      const dateA = parseISO(a.startDate).getTime();
      const dateB = parseISO(b.startDate).getTime();
      if (dateA !== dateB) return dateA - dateB;
      const timeA = a.startTime || "00:00";
      const timeB = b.startTime || "00:00";
      return timeA.localeCompare(timeB);
    });

    const validWaypoints: L.LatLng[] = [];
    sortedActivities.forEach(act => {
      if (act.type === 'Transporte') {
        if (typeof act.originLatitude === 'number' && typeof act.originLongitude === 'number') {
          validWaypoints.push(L.latLng(act.originLatitude, act.originLongitude));
        }
        if (typeof act.destinationLatitude === 'number' && typeof act.destinationLongitude === 'number') {
          validWaypoints.push(L.latLng(act.destinationLatitude, act.destinationLongitude));
        }
      } else {
        if (typeof act.latitude === 'number' && typeof act.longitude === 'number') {
          validWaypoints.push(L.latLng(act.latitude, act.longitude));
        }
      }
    });
    // Remove duplicate consecutive waypoints
    const uniqueWaypoints = validWaypoints.filter((wp, index, arr) => {
      if (index === 0) return true;
      return !wp.equals(arr[index - 1]);
    });


    let mapCenter: L.LatLngTuple = [20, 0]; // Default center
    let defaultZoom = 2;

    if (uniqueWaypoints.length > 0) {
      const bounds = L.latLngBounds(uniqueWaypoints);
      mapCenter = [bounds.getCenter().lat, bounds.getCenter().lng] as L.LatLngTuple;
      defaultZoom = uniqueWaypoints.length === 1 ? 13 : 6;
    } else if (tripDestination) {
      // Placeholder for geocoding tripDestination, for now keeps default map view
    }
    return { waypoints: uniqueWaypoints, center: mapCenter, zoom: defaultZoom, sortedActivities };
  }, [activities, tripDestination]);

  const clearMarkers = useCallback(() => {
    if (markersRef.current.length > 0 && mapRef.current && mapRef.current.getContainer()) {
      markersRef.current.forEach(marker => {
        try {
          mapRef.current?.removeLayer(marker);
        } catch (error) {
          console.warn("Error removing individual marker during clearMarkers:", error);
        }
      });
    }
    markersRef.current = [];
  }, []);

  const clearRoutingControl = useCallback(() => {
    if (routingControlRef.current && mapRef.current && mapRef.current.getContainer()) {
      try {
        mapRef.current.removeControl(routingControlRef.current);
      } catch (error) {
        console.warn('Error removing routing control during clearRoutingControl:', error);
      }
    }
    routingControlRef.current = null;
  }, []);


  useEffect(() => {
    isMountedRef.current = true;
    if (!mapContainerRef.current) return;

    if (!mapRef.current) {
        mapRef.current = L.map(mapContainerRef.current).setView(waypointsAndCenter.center, waypointsAndCenter.zoom);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(mapRef.current);
    } else {
       if (mapRef.current.getContainer()){ // Ensure map container still exists
            mapRef.current.setView(waypointsAndCenter.center, waypointsAndCenter.zoom);
       }
    }
    
    return () => {
      isMountedRef.current = false;
      // Cleanup order: control, then markers, then map
      if (mapRef.current && mapRef.current.getContainer()) { // Check map exists before cleaning its parts
        clearRoutingControl();
        clearMarkers();
      }
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (error) {
          console.warn("Error removing map instance on unmount:", error)
        }
        mapRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 


  useEffect(() => {
    if (!isMountedRef.current || !mapRef.current || !mapRef.current.getContainer()) {
      return;
    }

    const currentMapInstance = mapRef.current;
    const { waypoints, sortedActivities } = waypointsAndCenter;
    let newRoutingControlInstance: L.Routing.Control | null = null;
    let timeoutId: NodeJS.Timeout | null = null;

    const handleRoutesFound = (e: L.Routing.RoutesFoundEvent) => {
        if (!isMountedRef.current || !mapRef.current || !mapRef.current.getContainer()) return;
        if (e.routes && e.routes.length > 0) {
            try {
                currentMapInstance.fitBounds(e.routes[0].bounds, { padding: [50, 50] });
            } catch (error) {
                console.warn("Error fitting bounds on routesfound:", error);
            }
        }
    };
    
    const handleRoutingError = (e: any) => {
      if (!isMountedRef.current || !currentMapInstance || !currentMapInstance.getContainer() || !mapRef.current || !mapRef.current.getContainer()) {
        console.warn('Map instance no longer exists or component unmounted, skipping routing error fallback');
        return;
      }
      console.warn('No se pudo calcular la ruta, mostrando markers individuales. Detalles:', e.error || e);
  
      // Remove the failed routing control first
      if (routingControlRef.current) {
          try {
              currentMapInstance.removeControl(routingControlRef.current);
          } catch (err) {
              console.warn("Error removing failed routing control in fallback:", err);
          }
          routingControlRef.current = null;
      }
      
      clearMarkers(); // Clear any existing individual markers
  
      if (waypoints.length > 0 && mapRef.current && mapRef.current.getContainer()) { // Check map again
          waypoints.forEach((waypoint, index) => {
              if (!isMountedRef.current || !currentMapInstance || !currentMapInstance.getContainer() || !mapRef.current || !mapRef.current.getContainer()) {
                  console.warn('Map instance destroyed or component unmounted during marker creation in fallback.');
                  return; 
              }

              const activityFinder = sortedActivities.find(actF => {
                  if (actF.type === 'Transporte') {
                      return (actF.originLatitude === waypoint.lat && actF.originLongitude === waypoint.lng) ||
                             (actF.destinationLatitude === waypoint.lat && actF.destinationLongitude === waypoint.lng);
                  }
                  return actF.latitude === waypoint.lat && actF.longitude === waypoint.lng;
              });
              
              let popupText = `<b>Parada ${index + 1}</b>`;
              let iconToUse = getActivityIcon(); // Default grey
              let roleInTransport = "";

              if (activityFinder) {
                  popupText = `<b>${activityFinder.name}</b> (${activityFinder.type})`;
                  if (activityFinder.type === 'Transporte') {
                      const isOrigin = activityFinder.originLatitude === waypoint.lat && activityFinder.originLongitude === waypoint.lng;
                      const isDestination = activityFinder.destinationLatitude === waypoint.lat && activityFinder.destinationLongitude === waypoint.lng;

                      if (isOrigin) {
                          iconToUse = activityTypeToIcon['Transporte'];
                          roleInTransport = "<br/><i>(Origen de Transporte)</i>";
                      } else if (isDestination) {
                          const arrivalDateStr = activityFinder.endDate;
                          const isDestAnAccommodation = sortedActivities.some(nextAct =>
                              nextAct.type === 'Alojamiento' &&
                              nextAct.startDate === arrivalDateStr &&
                              nextAct.latitude === activityFinder.destinationLatitude &&
                              nextAct.longitude === activityFinder.destinationLongitude
                          );
                          if (isDestAnAccommodation) {
                              iconToUse = activityTypeToIcon['Alojamiento'];
                              roleInTransport = "<br/><i>(Llegada a Alojamiento)</i>";
                          } else {
                              iconToUse = activityTypeToIcon['Transporte'];
                              roleInTransport = "<br/><i>(Destino de Transporte)</i>";
                          }
                      } else { // Waypoint is for a transport but neither origin nor dest (should not happen with current waypoint logic)
                           iconToUse = activityTypeToIcon['Transporte'];
                      }
                  } else { // Not a transport activity
                      iconToUse = getActivityIcon(activityFinder.type);
                  }
              }
              popupText += `${roleInTransport}<br/>${activityFinder ? format(parseISO(activityFinder.startDate), "P", { locale: es }) : ''} ${activityFinder?.startTime || ''}`;
              
              try {
                  const marker = L.marker(waypoint, { icon: iconToUse, draggable: false })
                      .bindPopup(popupText)
                      .addTo(currentMapInstance);
                  markersRef.current.push(marker);
              } catch (markerError) {
                  console.error("Error adding fallback marker to map:", markerError);
              }
          });
      }
      
      if (mapRef.current && mapRef.current.getContainer() && markersRef.current.length > 0) {
          try {
              const bounds = L.latLngBounds(markersRef.current.map(m => m.getLatLng()));
              currentMapInstance.fitBounds(bounds, { padding: [50, 50] });
          } catch (boundsError) {
              console.error("Error fitting bounds for fallback markers:", boundsError);
          }
      }
    };

    // --- Main logic for adding routing or markers ---
    clearRoutingControl();
    clearMarkers();

    if (waypoints.length > 1 && currentMapInstance.getContainer()) {
      newRoutingControlInstance = L.Routing.control({
        waypoints: waypoints,
        routeWhileDragging: true,
        show: true,
        addWaypoints: false,
        draggableWaypoints: false,
        createMarker: function(i: number, waypoint: L.Routing.Waypoint, n: number) {
          const activityFinder = sortedActivities.find(actF => {
            if (actF.type === 'Transporte') {
              return (actF.originLatitude === waypoint.latLng.lat && actF.originLongitude === waypoint.latLng.lng) ||
                     (actF.destinationLatitude === waypoint.latLng.lat && actF.destinationLongitude === waypoint.latLng.lng);
            }
            return actF.latitude === waypoint.latLng.lat && actF.longitude === waypoint.latLng.lng;
          });
          
          let popupText = `<b>Parada ${i + 1}</b>`;
          let iconToUse = getActivityIcon(); // Default grey
          let roleInTransport = "";

          if (activityFinder) {
            popupText = `<b>${activityFinder.name}</b> (${activityFinder.type})`;
            if (activityFinder.type === 'Transporte') {
                const isOrigin = activityFinder.originLatitude === waypoint.latLng.lat && activityFinder.originLongitude === waypoint.latLng.lng;
                const isDestination = activityFinder.destinationLatitude === waypoint.latLng.lat && activityFinder.destinationLongitude === waypoint.latLng.lng;

                if (isOrigin) {
                    iconToUse = activityTypeToIcon['Transporte'];
                    roleInTransport = "<br/><i>(Origen de Transporte)</i>";
                } else if (isDestination) {
                    const arrivalDateStr = activityFinder.endDate;
                    const isDestAnAccommodation = sortedActivities.some(nextAct =>
                        nextAct.type === 'Alojamiento' &&
                        nextAct.startDate === arrivalDateStr &&
                        nextAct.latitude === activityFinder.destinationLatitude &&
                        nextAct.longitude === activityFinder.destinationLongitude
                    );
                    if (isDestAnAccommodation) {
                        iconToUse = activityTypeToIcon['Alojamiento'];
                        roleInTransport = "<br/><i>(Llegada a Alojamiento)</i>";
                    } else {
                        iconToUse = activityTypeToIcon['Transporte'];
                        roleInTransport = "<br/><i>(Destino de Transporte)</i>";
                    }
                } else { // Should ideally not happen if waypoint logic matches exactly
                     iconToUse = activityTypeToIcon['Transporte'];
                }
            } else { // Not a transport activity
                iconToUse = getActivityIcon(activityFinder.type);
            }
        }
        popupText += `${roleInTransport}<br/>${activityFinder ? format(parseISO(activityFinder.startDate), "P", {locale: es}) : ''} ${activityFinder?.startTime || ''}`;
          
        return L.marker(waypoint.latLng, {
            icon: iconToUse,
            draggable: false,
        }).bindPopup(popupText);
        },
        router: L.Routing.osrmv1({
          serviceUrl: 'https://router.project-osrm.org/route/v1'
        })
      });

      newRoutingControlInstance.on('routesfound', handleRoutesFound);
      newRoutingControlInstance.on('routingerror', handleRoutingError);
      
      timeoutId = setTimeout(() => {
        if (isMountedRef.current && mapRef.current && mapRef.current.getContainer() && newRoutingControlInstance) {
          try {
            newRoutingControlInstance.addTo(currentMapInstance);
            routingControlRef.current = newRoutingControlInstance;
          } catch (error) {
            console.error("Error adding routing control to map inside setTimeout:", error);
            handleRoutingError({ error: "Failed to add routing control in setTimeout" });
          }
        }
      }, 100);

    } else if (waypoints.length === 1 && currentMapInstance.getContainer()) {
        const waypoint = waypoints[0];
        const activityFinder = sortedActivities.find(actF => {
            if (actF.type === 'Transporte') { // Should not be a single waypoint for transport unless it's just one point
                return (actF.originLatitude === waypoint.lat && actF.originLongitude === waypoint.lng) ||
                       (actF.destinationLatitude === waypoint.lat && actF.destinationLongitude === waypoint.lng);
            }
            return actF.latitude === waypoint.lat && actF.longitude === waypoint.lng;
        });

        let popupText = '<b>Ubicación Única</b>';
        let iconToUse = getActivityIcon();
        if (activityFinder) {
            iconToUse = getActivityIcon(activityFinder.type);
            popupText = `<b>${activityFinder.name}</b> (${activityFinder.type})<br/>${format(parseISO(activityFinder.startDate), "P", {locale: es})} ${activityFinder.startTime || ''}`;
        }
        try {
            const marker = L.marker(waypoints[0], { icon: iconToUse, draggable: false })
            .bindPopup(popupText)
            .addTo(currentMapInstance);
            markersRef.current.push(marker);
            currentMapInstance.setView(waypoints[0], waypointsAndCenter.zoom);
        } catch (error) {
            console.error("Error adding single marker to map:", error);
        }
    }

    return () => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        // Crucially, remove listeners from the specific instance of the control that this effect created
        if (newRoutingControlInstance) {
            newRoutingControlInstance.off('routesfound', handleRoutesFound);
            newRoutingControlInstance.off('routingerror', handleRoutingError);
            // Only remove the control if it's the one currently in the ref AND map still exists
            if (routingControlRef.current === newRoutingControlInstance && mapRef.current && mapRef.current.getContainer()) { 
                try {
                    mapRef.current.removeControl(newRoutingControlInstance);
                } catch (e) {
                   console.warn("Error removing specific newRoutingControlInstance on effect cleanup", e);
                }
                routingControlRef.current = null; // Nullify ref after removing this specific instance
            } else if (newRoutingControlInstance && (newRoutingControlInstance as any)._map && mapRef.current && mapRef.current.getContainer()){
                 // If it was added to map but not assigned to ref (e.g. timeout didn't assign yet) or ref changed
                 try {
                    mapRef.current.removeControl(newRoutingControlInstance);
                 } catch (e) {
                     console.warn("Error removing orphaned newRoutingControlInstance on effect cleanup", e);
                 }
            }
        }
    };
  }, [waypointsAndCenter, clearMarkers, clearRoutingControl]);


  return (
    <div 
      ref={mapContainerRef} 
      className="h-[600px] w-full rounded-md border overflow-hidden bg-muted"
    />
  );
}

