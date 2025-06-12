"use client";

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet-routing-machine'; // This is a side-effect import for the plugin
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css'; // CSS for the plugin
import type { ActivityItem } from '@/lib/types';

// Fix for Leaflet default icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface ActivityMapProps {
  activities: ActivityItem[];
}

export function ActivityMap({ activities }: ActivityMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const routingControlRef = useRef<L.Routing.Control | null>(null);
  const activitiesRef = useRef(activities); // Ref to store current activities

  // Update activitiesRef whenever the activities prop changes
  useEffect(() => {
    activitiesRef.current = activities;
  }, [activities]);

  useEffect(() => {
    // Initialize map only once
    if (typeof window !== 'undefined' && !mapRef.current) {
      const mapElement = document.getElementById('activity-map-container');
      if (mapElement && !mapElement.hasChildNodes()) { // Initialize map only if the container is empty
        mapRef.current = L.map('activity-map-container').setView([6.2442, -75.5812], 12); // Default to Medellín

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(mapRef.current);
      }
    }

    // Cleanup map instance on component unmount
    return () => {
      if (mapRef.current) {
        // Before removing the map, ensure the routing control is also removed if it exists
        if (routingControlRef.current) {
            mapRef.current.removeControl(routingControlRef.current);
            routingControlRef.current = null;
        }
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // Empty dependency array means this effect runs once on mount and cleanup on unmount

  useEffect(() => {
    if (!mapRef.current) return;

    // Clear previous routing control if it exists
    if (routingControlRef.current) {
      mapRef.current.removeControl(routingControlRef.current);
      routingControlRef.current = null;
    }
    
    const currentActivities = activitiesRef.current; 
    const waypoints = currentActivities
      .filter(act => typeof act.latitude === 'number' && typeof act.longitude === 'number' && act.latitude !== null && act.longitude !== null)
      .map(act => L.latLng(act.latitude!, act.longitude!));

    if (waypoints.length > 0) {
      // Define the custom icon for routing machine markers using CDN URLs
      const customWaypointIcon = L.icon({
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize: [25, 41],    // Default Leaflet icon size
        iconAnchor: [12, 41],  // Point of the icon which will correspond to marker's location
        popupAnchor: [1, -34], // Point from which the popup should open relative to the iconAnchor
        shadowSize: [41, 41]   // Size of the shadow image
      });

      routingControlRef.current = L.Routing.control({
        waypoints: waypoints,
        routeWhileDragging: false, 
        showAlternatives: false,
        fitSelectedRoutes: 'smart', 
        lineOptions: {
          styles: [{ color: 'hsl(var(--primary))', opacity: 0.8, weight: 6 }]
        },
        createMarker: function(i, waypoint, n) {
          // Get the corresponding activity for this waypoint
          const waypointActivity = currentActivities
            .filter(act => typeof act.latitude === 'number' && typeof act.longitude === 'number')
            [i]; // This relies on the order of filtered activities matching the order of waypoints

          const marker = L.marker(waypoint.latLng, {
              draggable: false, 
              icon: customWaypointIcon // Use the explicitly defined icon here
          });
          if (waypointActivity) { // Check if activity exists for this waypoint
              marker.bindPopup(`<b>${waypointActivity.name}</b><br>${waypointActivity.type}`);
          }
          return marker;
        },
         router: L.Routing.osrmv1({ // Explicitly use OSRM
           serviceUrl: 'https://router.project-osrm.org/route/v1' 
         })
      }).addTo(mapRef.current);

      if (waypoints.length === 1 && mapRef.current) {
        mapRef.current.setView(waypoints[0], 13);
      }

    } else if (mapRef.current) {
      mapRef.current.setView([6.2442, -75.5812], 12); // Default to Medellín
    }

  }, [activities]); // Rerun when activities prop changes

  return <div id="activity-map-container" style={{ height: '100%', width: '100%' }} />;
}