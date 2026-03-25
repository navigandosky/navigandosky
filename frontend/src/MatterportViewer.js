import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Maximize2,
  Minimize2,
  RefreshCw,
  MapPin,
  Navigation,
  Eye,
  Loader2,
  CheckCircle,
  AlertTriangle
} from "lucide-react";

const SDK_VERSION = "3.0.0-0-g0517b8d76c";
const SDK_KEY = process.env.REACT_APP_MATTERPORT_SDK_KEY || "";
const DEFAULT_SPACE_ID = process.env.REACT_APP_MATTERPORT_SPACE_ID || "j1r4zUjanif";

// Matterport SDK URL - use script tag approach for better compatibility
const getSDKUrl = (key) => 
  `https://static.matterport.com/showcase-sdk/bootstrap/${SDK_VERSION}/sdk.js?applicationKey=${key}`;

// Fallback SDK URL
const getSDKUrlFallback = (key) =>
  `https://api.matterport.com/sdk/bootstrap/${SDK_VERSION}/sdk.es6.js?applicationKey=${key}`;

// Showcase embed URL with SDK key
const getShowcaseUrl = (spaceId, key) =>
  `https://my.matterport.com/show?m=${spaceId}&play=1&applicationKey=${key}`;

/**
 * MatterportViewer Component
 * 
 * A React component that integrates with the Matterport SDK to provide
 * interactive 3D model viewing with programmatic navigation capabilities.
 * 
 * Props:
 * - spaceId: Matterport space ID to display
 * - onSdkReady: Callback when SDK is connected and ready
 * - onTagsLoaded: Callback when Mattertags are loaded with tag data
 * - className: Additional CSS classes
 * 
 * Ref Methods:
 * - navigateToTag(tagId): Move camera to a specific Mattertag
 * - getTags(): Get all available Mattertags
 * - getCurrentPosition(): Get current camera position
 * - getSdk(): Get the raw SDK instance for advanced usage
 */
const MatterportViewer = forwardRef(({ 
  spaceId = DEFAULT_SPACE_ID, 
  onSdkReady, 
  onTagsLoaded,
  onTagClick,
  className = ""
}, ref) => {
  const iframeRef = useRef(null);
  const sdkRef = useRef(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // disconnected, connecting, connected, error
  const [mattertags, setMattertags] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [modelData, setModelData] = useState(null);
  const containerRef = useRef(null);

  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    /**
     * Navigate the camera to a specific Mattertag/Tag
     */
    navigateToTag: async (tagId) => {
      console.log("MatterportViewer.navigateToTag called with tagId:", tagId);
      if (!sdkRef.current) {
        toast.error("SDK non connesso");
        return false;
      }
      try {
        // Use Mattertag.navigateToTag directly (most reliable method)
        console.log("Calling sdk.Mattertag.navigateToTag with:", tagId);
        await sdkRef.current.Mattertag.navigateToTag(
          tagId,
          sdkRef.current.Mattertag.Transition.FLY
        );
        toast.success("Navigazione completata");
        return true;
      } catch (error) {
        console.error("Navigation error:", error);
        toast.error(`Errore navigazione: ${error?.message || "impossibile raggiungere il POI"}`);
        return false;
      }
    },

    /**
     * Get all available Mattertags
     */
    getTags: () => mattertags,

    /**
     * Reload/refresh tags from Matterport SDK
     * Forces fresh data by trying multiple approaches
     * @returns {Array} - Updated list of tags
     */
    refreshTags: async () => {
      if (!sdkRef.current) return [];
      try {
        let tags = [];
        
        // Use legacy Mattertag API first (most reliable)
        if (sdkRef.current.Mattertag) {
          await sdkRef.current.Mattertag.getData();
          await new Promise(resolve => setTimeout(resolve, 500));
          tags = await sdkRef.current.Mattertag.getData();
          console.log(`Refreshed ${tags.length} Mattertags`);
        } else if (sdkRef.current.Tag && sdkRef.current.Tag.data && typeof sdkRef.current.Tag.data.collect === 'function') {
          await sdkRef.current.Tag.data.collect();
          await new Promise(resolve => setTimeout(resolve, 500));
          tags = await sdkRef.current.Tag.data.collect();
          console.log(`Refreshed ${tags.length} Tags (new API)`);
        }
        
        setMattertags(tags);
        return tags;
      } catch (error) {
        console.error("Error refreshing tags:", error);
        try {
          const tags = await sdkRef.current.Mattertag.getData();
          setMattertags(tags);
          console.log(`Refreshed ${tags.length} Mattertags (fallback)`);
          return tags;
        } catch (e2) {
          console.error("Could not refresh tags:", e2);
          return [];
        }
      }
    },

    /**
     * Reload the entire Matterport space (force refresh)
     */
    reloadSpace: () => {
      if (iframeRef.current) {
        // Force reload the iframe to get fresh data from Matterport
        const currentSrc = iframeRef.current.src;
        iframeRef.current.src = '';
        setTimeout(() => {
          iframeRef.current.src = currentSrc;
        }, 100);
        setSdkReady(false);
        toast.info("Ricaricamento Space Matterport...");
      }
    },

    /**
     * Get current camera position
     */
    getCurrentPosition: async () => {
      if (!sdkRef.current) return null;
      try {
        const pose = await sdkRef.current.Camera.getPose();
        return pose;
      } catch (error) {
        console.error("Error getting position:", error);
        return null;
      }
    },

    /**
     * Add a new Mattertag at a specific position
     * @param {Object} tagData - Tag data including position, label, description
     * @returns {string|null} - The ID of the created tag, or null on failure
     */
    addTag: async (tagData) => {
      if (!sdkRef.current) {
        toast.error("SDK non connesso");
        return null;
      }
      try {
        const mattertagDesc = {
          label: tagData.label || tagData.title || "POI",
          description: tagData.description || "",
          anchorPosition: {
            x: tagData.position?.x || 0,
            y: tagData.position?.y || 0,
            z: tagData.position?.z || 0
          },
          stemVector: { x: 0, y: 0.15, z: 0 }, // Small stem above the anchor
          color: tagData.color || { r: 0, g: 0.75, b: 1 } // Cyan color
        };

        // Add the mattertag
        const [mattertagId] = await sdkRef.current.Mattertag.add(mattertagDesc);
        console.log("Created Mattertag with ID:", mattertagId);
        
        // Refresh tags list
        const tags = await sdkRef.current.Mattertag.getData();
        setMattertags(tags);
        
        toast.success("POI aggiunto alla vista 3D");
        return mattertagId;
      } catch (error) {
        console.error("Add tag error:", error);
        toast.error(`Errore creazione tag: ${error.message}`);
        return null;
      }
    },

    /**
     * Remove a Mattertag by ID
     */
    removeTag: async (tagId) => {
      if (!sdkRef.current) return false;
      try {
        await sdkRef.current.Mattertag.remove(tagId);
        // Refresh tags list
        const tags = await sdkRef.current.Mattertag.getData();
        setMattertags(tags);
        toast.success("POI rimosso dalla vista 3D");
        return true;
      } catch (error) {
        console.error("Remove tag error:", error);
        return false;
      }
    },

    /**
     * Update a Mattertag's label and color based on device state
     * @param {string} tagId - The Mattertag ID
     * @param {Object} updateData - { label, description, color }
     */
    updateTag: async (tagId, updateData) => {
      if (!sdkRef.current || !tagId) return false;
      try {
        // Matterport SDK allows updating certain properties
        if (updateData.label !== undefined) {
          await sdkRef.current.Mattertag.editBillboard(tagId, {
            label: updateData.label,
            description: updateData.description || ""
          });
        }
        if (updateData.color) {
          await sdkRef.current.Mattertag.editColor(tagId, updateData.color);
        }
        return true;
      } catch (error) {
        console.error("Update tag error:", error);
        return false;
      }
    },

    /**
     * Create or update status overlay tags for POIs with device states
     * @param {Array} pois - Array of POIs with device info
     * @param {Object} deviceStates - { deviceId: "on"|"off" }
     * @param {Object} sensorValues - { deviceId: { temperature: 22.5, humidity: 45 } }
     * @returns {Array} - IDs of created status tags
     */
    createStatusOverlays: async (pois, deviceStates, sensorValues = {}) => {
      if (!sdkRef.current) return [];
      
      const statusTagIds = [];
      
      for (const poi of pois) {
        if (!poi.smartthings_device_id || !poi.position) continue;
        
        const deviceId = poi.smartthings_device_id;
        const state = deviceStates[deviceId];
        const sensors = sensorValues[deviceId] || {};
        
        // Build status label
        let statusLabel = "";
        let statusColor = { r: 0.5, g: 0.5, b: 0.5 }; // Gray default
        
        if (state === "on") {
          statusLabel = "🔴 ON";
          statusColor = { r: 1, g: 0.2, b: 0.2 }; // Red
        } else if (state === "off") {
          statusLabel = "⚫ OFF";
          statusColor = { r: 0.3, g: 0.3, b: 0.3 }; // Dark gray
        }
        
        // Add sensor values if available
        if (sensors.temperature !== undefined) {
          statusLabel = `🌡️ ${sensors.temperature}°C`;
          // Color based on temperature
          if (sensors.temperature > 25) {
            statusColor = { r: 1, g: 0.4, b: 0 }; // Orange/hot
          } else if (sensors.temperature < 18) {
            statusColor = { r: 0.2, g: 0.6, b: 1 }; // Blue/cold
          } else {
            statusColor = { r: 0.2, g: 0.8, b: 0.2 }; // Green/comfortable
          }
        }
        
        if (sensors.humidity !== undefined) {
          statusLabel += ` 💧${sensors.humidity}%`;
        }
        
        if (sensors.power !== undefined) {
          statusLabel += ` ⚡${sensors.power}W`;
        }
        
        if (!statusLabel) continue;
        
        try {
          // Create a small status tag slightly above the POI
          const [statusTagId] = await sdkRef.current.Mattertag.add({
            label: statusLabel,
            description: "",
            anchorPosition: {
              x: poi.position.x,
              y: poi.position.y + 0.3, // Slightly above
              z: poi.position.z
            },
            stemVector: { x: 0, y: 0.05, z: 0 },
            color: statusColor
          });
          statusTagIds.push(statusTagId);
        } catch (e) {
          console.log("Could not create status tag for", poi.id);
        }
      }
      
      return statusTagIds;
    },

    /**
     * Remove status overlay tags
     */
    removeStatusOverlays: async (tagIds) => {
      if (!sdkRef.current || !tagIds) return;
      for (const id of tagIds) {
        try {
          await sdkRef.current.Mattertag.remove(id);
        } catch (e) {
          // Ignore
        }
      }
    },

    /**
     * Get the raw SDK instance for advanced usage
     */
    getSdk: () => sdkRef.current,

    /**
     * Get all sweeps (scan points) from the model
     */
    getSweeps: async () => {
      if (!sdkRef.current) return [];
      try {
        return new Promise((resolve) => {
          const sweepList = [];
          let resolved = false;
          sdkRef.current.Sweep.data.subscribe({
            onAdded: (index, item) => sweepList.push(item),
            onCollectionUpdated: () => {
              if (!resolved) {
                resolved = true;
                resolve(sweepList);
              }
            }
          });
          setTimeout(() => { if (!resolved) { resolved = true; resolve(sweepList); } }, 3000);
        });
      } catch (error) {
        console.error("Error getting sweeps:", error);
        return [];
      }
    },

    /**
     * Create visual path with waypoint markers
     * @param {Array} waypoints - Array of {x, y, z} coordinates
     * @param {Object} options - Path options (color, animated, etc.)
     * @returns {Array} - Array of created marker IDs
     */
    createPathMarkers: async (waypoints, options = {}) => {
      if (!sdkRef.current || !waypoints || waypoints.length === 0) return [];
      
      const {
        color = { r: 1, g: 0.5, b: 0 }, // Orange by default
        markerLabel = "●",
        showArrows = true
      } = options;

      try {
        const markerIds = [];
        
        for (let i = 0; i < waypoints.length; i++) {
          const wp = waypoints[i];
          const isLast = i === waypoints.length - 1;
          const isFirst = i === 0;
          
          // Create floor marker at each waypoint - low stem to keep on floor
          const markerDesc = {
            label: isLast ? "🎯 ARRIVO" : (isFirst ? "📍 PARTENZA" : `● ${i}`),
            description: isLast ? "Destinazione finale" : (isFirst ? "Punto di partenza" : `Waypoint ${i}`),
            anchorPosition: { 
              x: wp.x, 
              y: wp.y - 0.5, // Slightly below original position (floor level)
              z: wp.z 
            },
            stemVector: { x: 0, y: 0.3, z: 0 }, // Short stem to stay close to floor
            color: isLast ? { r: 1, g: 0, b: 0 } : (isFirst ? { r: 0, g: 0.7, b: 1 } : color),
            floorIndex: 0 // Ensure it's on the floor
          };

          try {
            const [markerId] = await sdkRef.current.Mattertag.add(markerDesc);
            markerIds.push(markerId);
            console.log(`Path marker ${i} created:`, markerId);
          } catch (e) {
            console.log("Could not add path marker:", e);
          }
        }

        return markerIds;
      } catch (error) {
        console.error("Create path markers error:", error);
        return [];
      }
    },

    /**
     * Remove path markers
     * @param {Array} markerIds - Array of marker IDs to remove
     */
    removePathMarkers: async (markerIds) => {
      if (!sdkRef.current || !markerIds) return;
      
      for (const id of markerIds) {
        try {
          await sdkRef.current.Mattertag.remove(id);
        } catch (e) {
          // Ignore removal errors
        }
      }
    },

    /**
     * Calculate path between two points using sweeps
     * Returns array of waypoint positions
     */
    calculatePath: async (startPos, endPos) => {
      if (!sdkRef.current) return [];
      
      try {
        // Get all sweeps
        const sweeps = await new Promise((resolve) => {
          const sweepList = [];
          let resolved = false;
          sdkRef.current.Sweep.data.subscribe({
            onAdded: (index, item) => sweepList.push(item),
            onCollectionUpdated: () => {
              if (!resolved) {
                resolved = true;
                resolve(sweepList);
              }
            }
          });
          setTimeout(() => { if (!resolved) { resolved = true; resolve(sweepList); } }, 3000);
        });

        if (sweeps.length === 0) return [];

        // Find nearest sweep to start
        let startSweep = null;
        let minStartDist = Infinity;
        for (const s of sweeps) {
          if (!s.position) continue;
          const d = Math.sqrt(
            Math.pow(s.position.x - startPos.x, 2) +
            Math.pow(s.position.y - startPos.y, 2) +
            Math.pow(s.position.z - startPos.z, 2)
          );
          if (d < minStartDist) {
            minStartDist = d;
            startSweep = s;
          }
        }

        // Find nearest sweep to end
        let endSweep = null;
        let minEndDist = Infinity;
        for (const s of sweeps) {
          if (!s.position) continue;
          const d = Math.sqrt(
            Math.pow(s.position.x - endPos.x, 2) +
            Math.pow(s.position.y - endPos.y, 2) +
            Math.pow(s.position.z - endPos.z, 2)
          );
          if (d < minEndDist) {
            minEndDist = d;
            endSweep = s;
          }
        }

        if (!startSweep || !endSweep) return [];

        // Simple path: find sweeps along the line between start and end
        // Sort sweeps by distance from start along the path direction
        const pathDir = {
          x: endSweep.position.x - startSweep.position.x,
          y: endSweep.position.y - startSweep.position.y,
          z: endSweep.position.z - startSweep.position.z
        };
        const pathLen = Math.sqrt(pathDir.x*pathDir.x + pathDir.y*pathDir.y + pathDir.z*pathDir.z);
        
        if (pathLen < 0.5) {
          // Start and end are very close
          return [startSweep.position, endSweep.position];
        }

        // Find sweeps near the path line
        const pathSweeps = sweeps.filter(s => {
          if (!s.position) return false;
          
          // Calculate distance from sweep to the path line
          const toSweep = {
            x: s.position.x - startSweep.position.x,
            y: s.position.y - startSweep.position.y,
            z: s.position.z - startSweep.position.z
          };
          
          // Project onto path
          const proj = (toSweep.x * pathDir.x + toSweep.y * pathDir.y + toSweep.z * pathDir.z) / (pathLen * pathLen);
          
          // Only include sweeps along the path (not behind or beyond)
          if (proj < -0.1 || proj > 1.1) return false;
          
          // Calculate perpendicular distance
          const perpX = toSweep.x - proj * pathDir.x;
          const perpY = toSweep.y - proj * pathDir.y;
          const perpZ = toSweep.z - proj * pathDir.z;
          const perpDist = Math.sqrt(perpX*perpX + perpY*perpY + perpZ*perpZ);
          
          // Include if within 3 meters of path
          return perpDist < 3;
        });

        // Sort by projection along path
        pathSweeps.sort((a, b) => {
          const projA = ((a.position.x - startSweep.position.x) * pathDir.x + 
                        (a.position.y - startSweep.position.y) * pathDir.y + 
                        (a.position.z - startSweep.position.z) * pathDir.z) / pathLen;
          const projB = ((b.position.x - startSweep.position.x) * pathDir.x + 
                        (b.position.y - startSweep.position.y) * pathDir.y + 
                        (b.position.z - startSweep.position.z) * pathDir.z) / pathLen;
          return projA - projB;
        });

        // Sample every N sweeps to avoid too many markers
        const maxWaypoints = 8;
        const step = Math.max(1, Math.floor(pathSweeps.length / maxWaypoints));
        const waypoints = [];
        
        waypoints.push(startSweep.position);
        for (let i = step; i < pathSweeps.length - step; i += step) {
          waypoints.push(pathSweeps[i].position);
        }
        waypoints.push(endSweep.position);

        return waypoints;
      } catch (error) {
        console.error("Calculate path error:", error);
        return [];
      }
    },

    /**
     * Navigate with visual path
     * Shows waypoint markers and then moves to destination
     */
    navigateWithPath: async (targetPosition, options = {}) => {
      if (!sdkRef.current) return { success: false, markerIds: [] };
      
      const { showPath = true, autoNavigate = true, pathDuration = 5000 } = options;
      
      try {
        // Get current position
        const pose = await sdkRef.current.Camera.getPose();
        if (!pose || !pose.position) {
          return { success: false, markerIds: [] };
        }

        let markerIds = [];

        if (showPath) {
          // Calculate path
          const waypoints = await ref.current.calculatePath(pose.position, targetPosition);
          
          if (waypoints.length > 0) {
            // Create visual markers
            markerIds = await ref.current.createPathMarkers(waypoints, {
              showArrows: true,
              color: { r: 0, g: 0.8, b: 0.2 }
            });
            
            toast.info(`🗺️ Percorso: ${waypoints.length} punti`, { duration: 3000 });
          }
        }

        if (autoNavigate) {
          // Wait a moment for user to see the path
          if (showPath && markerIds.length > 0) {
            await new Promise(resolve => setTimeout(resolve, 1500));
          }

          // Find nearest sweep to destination and move there
          try {
            // Get sweeps using the correct SDK method
            const sweepData = await new Promise((resolve) => {
              const sweeps = [];
              const subscription = sdkRef.current.Sweep.data.subscribe({
                onCollectionUpdated: (collection) => {
                  // Collection is a Map-like structure
                  if (collection && typeof collection.forEach === 'function') {
                    collection.forEach((sweep, sid) => {
                      sweeps.push({ ...sweep, id: sid });
                    });
                  } else if (collection && typeof collection[Symbol.iterator] === 'function') {
                    for (const [sid, sweep] of collection) {
                      sweeps.push({ ...sweep, id: sid });
                    }
                  }
                  resolve(sweeps);
                }
              });
              // Timeout fallback
              setTimeout(() => resolve([]), 2000);
            });
            
            if (sweepData.length > 0) {
              // Find closest sweep to target position
              let nearestSweep = null;
              let minDistance = Infinity;
              
              for (const sweep of sweepData) {
                if (sweep.position) {
                  const dx = sweep.position.x - targetPosition.x;
                  const dz = sweep.position.z - targetPosition.z;
                  const dist = Math.sqrt(dx * dx + dz * dz);
                  if (dist < minDistance) {
                    minDistance = dist;
                    nearestSweep = sweep;
                  }
                }
              }
              
              if (nearestSweep) {
                console.log("Moving to nearest sweep:", nearestSweep.id);
                await sdkRef.current.Sweep.moveTo(nearestSweep.id, {
                  transition: sdkRef.current.Sweep.Transition?.FLY || 1,
                  transitionTime: 2000
                });
              }
            }
          } catch (navError) {
            console.log("Sweep navigation error:", navError);
          }
        }

        // Schedule marker removal
        if (markerIds.length > 0) {
          setTimeout(() => {
            if (ref.current) {
              ref.current.removePathMarkers(markerIds);
            }
          }, pathDuration);
        }

        return { success: true, markerIds };
      } catch (error) {
        console.error("Navigate with path error:", error);
        return { success: false, markerIds: [] };
      }
    },

    /**
     * Move to a specific position in the model using nearest sweep
     */
    moveTo: async (position, rotation) => {
      if (!sdkRef.current) return false;
      try {
        // Get sweeps using the correct SDK method
        const sweepData = await new Promise((resolve) => {
          const sweeps = [];
          sdkRef.current.Sweep.data.subscribe({
            onCollectionUpdated: (collection) => {
              if (collection && typeof collection.forEach === 'function') {
                collection.forEach((sweep, sid) => {
                  sweeps.push({ ...sweep, id: sid });
                });
              } else if (collection && typeof collection[Symbol.iterator] === 'function') {
                for (const [sid, sweep] of collection) {
                  sweeps.push({ ...sweep, id: sid });
                }
              }
              resolve(sweeps);
            }
          });
          setTimeout(() => resolve([]), 1000);
        });
        
        if (sweepData.length > 0) {
          let nearestSweep = null;
          let minDistance = Infinity;
          
          for (const sweep of sweepData) {
            if (sweep.position) {
              const dx = sweep.position.x - position.x;
              const dz = sweep.position.z - position.z;
              const dist = Math.sqrt(dx * dx + dz * dz);
              if (dist < minDistance) {
                minDistance = dist;
                nearestSweep = sweep;
              }
            }
          }
          
          if (nearestSweep) {
            await sdkRef.current.Sweep.moveTo(nearestSweep.id, {
              transition: sdkRef.current.Sweep.Transition?.FLY || 1,
              transitionTime: 1500
            });
            return true;
          }
        }
        return false;
      } catch (error) {
        console.error("Move error:", error);
        return false;
      }
    },

    /**
     * Reload the model
     */
    reload: () => {
      if (iframeRef.current) {
        setConnectionStatus('connecting');
        iframeRef.current.src = getShowcaseUrl(spaceId, SDK_KEY);
      }
    }
  }));

  // Load the SDK via script tag (more compatible than dynamic import)
  const loadSdkScript = useCallback((sdkUrl) => {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (window.MP_SDK) {
        resolve(window.MP_SDK);
        return;
      }
      
      // Remove any existing SDK script
      const existing = document.getElementById('matterport-sdk-script');
      if (existing) existing.remove();
      
      const script = document.createElement('script');
      script.id = 'matterport-sdk-script';
      script.src = sdkUrl;
      script.async = true;
      
      script.onload = () => {
        if (window.MP_SDK) {
          resolve(window.MP_SDK);
        } else {
          // Try ES6 module approach as fallback
          reject(new Error('MP_SDK not available after script load'));
        }
      };
      
      script.onerror = () => {
        reject(new Error('Failed to load Matterport SDK script'));
      };
      
      document.head.appendChild(script);
    });
  }, []);

  // Load the SDK and connect to the iframe
  const connectSdk = useCallback(async () => {
    if (!iframeRef.current || !SDK_KEY) {
      console.error("Missing iframe or SDK key");
      setConnectionStatus('error');
      return;
    }

    setConnectionStatus('connecting');

    try {
      let mpSdk = null;
      
      // Try script tag approach first (more compatible)
      try {
        const sdk = await loadSdkScript(getSDKUrl(SDK_KEY));
        mpSdk = await sdk.connect(iframeRef.current, SDK_KEY);
      } catch (scriptError) {
        console.warn("Script tag approach failed, trying dynamic import fallback:", scriptError.message);
        // Fallback to dynamic import with api.matterport.com
        try {
          const sdkModule = await import(/* webpackIgnore: true */ getSDKUrlFallback(SDK_KEY));
          mpSdk = await sdkModule.connect(iframeRef.current);
        } catch (importError) {
          console.warn("Dynamic import also failed:", importError.message);
          throw new Error(`Impossibile caricare SDK Matterport. Verifica la connessione internet.`);
        }
      }
      
      sdkRef.current = mpSdk;

      console.log("Matterport SDK connected successfully!");

      // Get model data
      try {
        const data = await mpSdk.Model.getData();
        setModelData(data);
        console.log("Model SID:", data.sid);
      } catch (e) {
        console.log("Could not get model data:", e);
      }

      // Load Mattertags/Tags - use legacy API first (more reliable), then try new
      try {
        let tags = [];
        // Try the deprecated Mattertag API first (most compatible)
        if (mpSdk.Mattertag) {
          tags = await mpSdk.Mattertag.getData();
          console.log(`Loaded ${tags.length} Mattertags`);
        } else if (mpSdk.Tag && mpSdk.Tag.data && typeof mpSdk.Tag.data.collect === 'function') {
          // Try the new Tag.data API as fallback
          tags = await mpSdk.Tag.data.collect();
          console.log(`Loaded ${tags.length} Tags (new API)`);
        }
        setMattertags(tags);
        
        if (onTagsLoaded) {
          onTagsLoaded(tags);
        }
      } catch (e) {
        console.log("Could not load Tags:", e);
        // Try alternative approach
        try {
          const tags = await mpSdk.Mattertag.getData();
          setMattertags(tags);
          console.log(`Loaded ${tags.length} Mattertags (fallback)`);
          if (onTagsLoaded) {
            onTagsLoaded(tags);
          }
        } catch (e2) {
          console.log("Could not load Mattertags either:", e2);
        }
      }

      // Subscribe to tag click events
      try {
        if (mpSdk.Mattertag && mpSdk.Mattertag.Event) {
          mpSdk.on(mpSdk.Mattertag.Event.CLICK, (tagSid) => {
            console.log("Matterport tag clicked:", tagSid);
            if (onTagClick) {
              onTagClick(tagSid);
            }
          });
          console.log("Subscribed to Mattertag click events");
        }
      } catch (e) {
        console.log("Could not subscribe to tag click events:", e);
      }

      setConnectionStatus('connected');
      
      if (onSdkReady) {
        onSdkReady(mpSdk);
      }

      toast.success("SDK Matterport connesso!");

    } catch (error) {
      console.error("SDK connection error:", error);
      setConnectionStatus('error');
      toast.error(`Errore connessione SDK: ${error.message}`);
    }
  }, [onSdkReady, onTagsLoaded, onTagClick, loadSdkScript]);

  // Handle iframe load event
  const handleIframeLoad = useCallback(() => {
    // Wait a bit for the showcase to fully initialize
    setTimeout(() => {
      connectSdk();
    }, 2000);
  }, [connectSdk]);

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Render status badge based on connection status
  const renderStatusBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return (
          <Badge className="bg-green-500 text-white">
            <CheckCircle size={12} className="mr-1" />
            SDK Connesso
          </Badge>
        );
      case 'connecting':
        return (
          <Badge className="bg-yellow-500 text-white animate-pulse">
            <Loader2 size={12} className="mr-1 animate-spin" />
            Connessione...
          </Badge>
        );
      case 'error':
        return (
          <Badge className="bg-red-500 text-white">
            <AlertTriangle size={12} className="mr-1" />
            Errore SDK
          </Badge>
        );
      default:
        return (
          <Badge className="bg-slate-500 text-white">
            <Eye size={12} className="mr-1" />
            Solo Visualizzazione
          </Badge>
        );
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`relative bg-slate-900 rounded-xl overflow-hidden ${className}`}
    >
      {/* Top Controls Bar */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge className="bg-red-500 text-white animate-pulse">LIVE</Badge>
          {renderStatusBadge()}
        </div>
        
        <div className="flex items-center gap-2">
          {mattertags.length > 0 && (
            <Badge variant="outline" className="border-cyan-500/50 text-cyan-400 bg-slate-900/80">
              <MapPin size={12} className="mr-1" />
              {mattertags.length} POI
            </Badge>
          )}
          
          <Button
            size="sm"
            variant="ghost"
            className="bg-slate-900/80 text-white hover:bg-slate-800"
            onClick={() => {
              if (iframeRef.current) {
                setConnectionStatus('connecting');
                iframeRef.current.src = getShowcaseUrl(spaceId, SDK_KEY);
              }
            }}
            title="Ricarica"
          >
            <RefreshCw size={16} />
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            className="bg-slate-900/80 text-white hover:bg-slate-800"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Esci Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </Button>
        </div>
      </div>

      {/* Matterport iframe */}
      <div className="aspect-video bg-slate-900 relative">
        <iframe
          ref={iframeRef}
          id="matterport-showcase"
          title="Matterport 3D Digital Twin"
          src={getShowcaseUrl(spaceId, SDK_KEY)}
          width="100%"
          height="100%"
          frameBorder="0"
          allow="fullscreen; vr; xr"
          allowFullScreen
          onLoad={handleIframeLoad}
          className="w-full h-full"
        />
      </div>

      {/* Bottom Info Bar - only show when connected */}
      {connectionStatus === 'connected' && modelData && (
        <div className="absolute bottom-3 left-3 right-3 z-10">
          <div className="bg-slate-900/90 backdrop-blur-sm rounded-lg px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Navigation size={12} />
                Space: {modelData.sid}
              </span>
            </div>
            <div className="text-xs text-slate-500">
              SDK v{SDK_VERSION}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

MatterportViewer.displayName = 'MatterportViewer';

export default MatterportViewer;
