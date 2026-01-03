'use client';

import { useEffect, useRef } from 'react';

interface Store {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: 'critical' | 'warning' | 'ok';
  criticalCount: number;
  warningCount: number;
}

interface MapComponentProps {
  stores: Store[];
  onStoreClick: (storeId: string) => void;
}

export default function MapComponent({ stores, onStoreClick }: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined' || !mapRef.current) return;

    // Dynamic import of Leaflet
    const initMap = async () => {
      const L = (await import('leaflet')).default;

      // Clean up previous instance
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }

      // Initialize map centered on San Francisco
      const map = L.map(mapRef.current!, {
        center: [37.7749, -122.4194],
        zoom: 12,
        zoomControl: true,
      });

      // Add dark tile layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Add markers for each store
      stores.forEach(store => {
        const color = store.status === 'critical' ? '#ef4444' :
                      store.status === 'warning' ? '#f59e0b' : '#22c55e';
        
        const pulseClass = store.status === 'critical' ? 'pulse-critical' : '';

        // Create custom icon with pulsing effect for critical stores
        const icon = L.divIcon({
          className: 'custom-marker',
          html: `
            <div style="
              position: relative;
              width: 30px;
              height: 30px;
            ">
              ${store.status === 'critical' ? `
                <div style="
                  position: absolute;
                  width: 30px;
                  height: 30px;
                  border-radius: 50%;
                  background: ${color}44;
                  animation: pulse 1.5s infinite;
                "></div>
              ` : ''}
              <div style="
                position: absolute;
                top: 5px;
                left: 5px;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: ${color};
                border: 3px solid white;
                box-shadow: 0 2px 8px rgba(0,0,0,0.4);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
                font-weight: bold;
                color: white;
              ">
                ${store.criticalCount > 0 ? store.criticalCount : '✓'}
              </div>
            </div>
          `,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });

        const marker = L.marker([store.lat, store.lng], { icon })
          .addTo(map)
          .bindPopup(`
            <div style="min-width: 150px; font-family: Inter, sans-serif;">
              <strong style="font-size: 14px;">${store.name}</strong>
              <div style="margin-top: 8px; display: flex; gap: 8px;">
                ${store.criticalCount > 0 ? `
                  <span style="
                    background: #ef444422;
                    color: #ef4444;
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 11px;
                    font-weight: 600;
                  ">
                    ⚠️ ${store.criticalCount} critical
                  </span>
                ` : ''}
                ${store.warningCount > 0 ? `
                  <span style="
                    background: #f59e0b22;
                    color: #f59e0b;
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 11px;
                    font-weight: 600;
                  ">
                    ${store.warningCount} warning
                  </span>
                ` : ''}
                ${store.criticalCount === 0 && store.warningCount === 0 ? `
                  <span style="
                    background: #22c55e22;
                    color: #22c55e;
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 11px;
                    font-weight: 600;
                  ">
                    ✓ All good
                  </span>
                ` : ''}
              </div>
            </div>
          `);

        marker.on('click', () => {
          onStoreClick(store.id);
        });
      });

      // Add CSS animation for pulse effect
      const style = document.createElement('style');
      style.textContent = `
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
      `;
      document.head.appendChild(style);

      mapInstanceRef.current = map;
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [stores, onStoreClick]);

  return (
    <div 
      ref={mapRef} 
      style={{ 
        width: '100%', 
        height: '100%',
        background: 'var(--neutral-800)'
      }} 
    />
  );
}
