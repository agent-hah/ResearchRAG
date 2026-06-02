import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { SpatialDataPoint } from '../../services/spatialVisualizationService'
import { getPointColor } from '../../services/spatialVisualizationService'

// Fix for default marker icons in react-leaflet
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
})

L.Marker.prototype.options.icon = DefaultIcon

interface SpatialMapProps {
  points: SpatialDataPoint[]
  center: [number, number]
  zoom: number
  showHeatmap?: boolean
}

// Component to fit map bounds to data
function FitBounds({ points }: { points: SpatialDataPoint[] }) {
  const map = useMap()

  useEffect(() => {
    if (points.length > 0) {
      const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng]))
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [points, map])

  return null
}

export function SpatialMap({ points, center, zoom, showHeatmap = false }: SpatialMapProps) {
  if (points.length === 0) {
    return (
      <div className="w-full h-[500px] bg-gray-100 rounded-lg flex items-center justify-center">
        <p className="text-gray-500">No spatial data to display</p>
      </div>
    )
  }

  // Calculate min/max values for color scaling
  const values = points.map(p => p.value).filter((v): v is number => v !== undefined)
  const minValue = values.length > 0 ? Math.min(...values) : 0
  const maxValue = values.length > 0 ? Math.max(...values) : 1

  return (
    <div className="w-full h-[500px] rounded-lg overflow-hidden border border-gray-200">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <FitBounds points={points} />

        {points.map((point, idx) => {
          const color = getPointColor(point.value, minValue, maxValue)
          
          if (showHeatmap && point.value !== undefined) {
            // Use circle markers for heatmap-style visualization
            return (
              <CircleMarker
                key={idx}
                center={[point.lat, point.lng]}
                radius={8}
                pathOptions={{
                  fillColor: color,
                  fillOpacity: 0.7,
                  color: '#fff',
                  weight: 2
                }}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-semibold text-gray-900">{point.label}</h3>
                    {point.value !== undefined && (
                      <p className="text-sm text-gray-600 mt-1">
                        Value: {point.value.toFixed(2)}
                      </p>
                    )}
                    <div className="text-xs text-gray-500 mt-2">
                      <p>Lat: {point.lat.toFixed(6)}</p>
                      <p>Lng: {point.lng.toFixed(6)}</p>
                    </div>
                    {point.metadata && Object.keys(point.metadata).length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        {Object.entries(point.metadata).map(([key, value]) => (
                          <p key={key} className="text-xs text-gray-600">
                            {key}: {String(value)}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            )
          }

          // Use standard markers for point visualization
          return (
            <Marker key={idx} position={[point.lat, point.lng]}>
              <Popup>
                <div className="p-2">
                  <h3 className="font-semibold text-gray-900">{point.label}</h3>
                  {point.value !== undefined && (
                    <p className="text-sm text-gray-600 mt-1">
                      Value: {point.value.toFixed(2)}
                    </p>
                  )}
                  <div className="text-xs text-gray-500 mt-2">
                    <p>Lat: {point.lat.toFixed(6)}</p>
                    <p>Lng: {point.lng.toFixed(6)}</p>
                  </div>
                  {point.metadata && Object.keys(point.metadata).length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      {Object.entries(point.metadata).map(([key, value]) => (
                        <p key={key} className="text-xs text-gray-600">
                          {key}: {String(value)}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}
