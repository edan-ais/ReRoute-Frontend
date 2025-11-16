import type { Airport, Flight } from "./types";

// ---------------------------------------------------------
// Interpolation helper
// ---------------------------------------------------------
function interpolate(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// ---------------------------------------------------------
// Interpolate along a multi-point path
// ---------------------------------------------------------
export function interpolatePath(
  path: { lat: number; lon: number }[],
  t: number
): { lat: number; lon: number } {
  if (path.length < 2) {
    return path[0];
  }

  const segCount = path.length - 1;
  const segFloat = t * segCount;
  const segIndex = Math.floor(segFloat);
  const segT = segFloat - segIndex;

  const p1 = path[segIndex];
  const p2 = path[Math.min(segIndex + 1, segCount)];

  return {
    lat: interpolate(p1.lat, p2.lat, segT),
    lon: interpolate(p1.lon, p2.lon, segT),
  };
}

// ---------------------------------------------------------
// Generate a naturally bent synthetic initial flight path
// ---------------------------------------------------------
export function generateRandomPath(
  origin: Airport,
  dest: Airport
): { lat: number; lon: number }[] {
  // One random curve
  const midLat =
    (origin.lat + dest.lat) / 2 + (Math.random() * 2 - 1) * 0.8;
  const midLon =
    (origin.lon + dest.lon) / 2 + (Math.random() * 2 - 1) * 0.8;

  return [
    { lat: origin.lat, lon: origin.lon },
    { lat: midLat, lon: midLon },
    { lat: dest.lat, lon: dest.lon },
  ];
}

// ---------------------------------------------------------
// Build the NEW rerouted path with controlled curvature
// ---------------------------------------------------------
export function buildCurvedPath(
  origin: Airport,
  dest: Airport,
  bendFactor: number
): { lat: number; lon: number }[] {
  const midLat = (origin.lat + dest.lat) / 2;
  const midLon = (origin.lon + dest.lon) / 2;

  // Apply bend factor: push the midpoint off the direct great-circle
  const newMidLat = midLat + bendFactor * 1.2;
  const newMidLon = midLon - bendFactor * 1.2;

  return [
    { lat: origin.lat, lon: origin.lon },
    { lat: newMidLat, lon: newMidLon },
    { lat: dest.lat, lon: dest.lon },
  ];
}

// ---------------------------------------------------------
// Step flight positions forward along their path
// ---------------------------------------------------------
export function stepFlights(prevFlights: Flight[]): Flight[] {
  const delta = 0.02; // movement per tick

  return prevFlights.map((f) => {
    // Never modify approved flights (they should not re-route)
    if (f.frozen) {
      return f;
    }

    // No usable path
    if (!f.path || f.path.length < 2) {
      return f;
    }

    const nextProgress = (f.progress + delta) % 1;

    const pos = interpolatePath(f.path, nextProgress);

    return {
      ...f,
      progress: nextProgress,
      latitude: pos.lat,
      longitude: pos.lon,
      // A tiny altitude oscillation to simulate motion
      altitude: f.altitude + Math.sin(nextProgress * Math.PI * 2) * 200,
    };
  });
}

