import "dotenv/config";

/**
 * Geocodes an address string to latitude and longitude.
 * Includes fuzzy fallback logic to city/state if the full address fails.
 */
export async function geocodeAddress(address, city, state) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error("Geocoding Error: GOOGLE_MAPS_API_KEY is missing in .env");
    return null;
  }

  const tryGeocode = async (query) => {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.status === 'OK' && data.results.length > 0) {
        const loc = data.results[0].geometry.location;
        return { lat: loc.lat, lng: loc.lng };
      }
      return null;
    } catch (err) {
      console.error("Geocoding fetch error:", err.message);
      return null;
    }
  };

  // 1. Precise Attempt: Try the full provided address string
  if (address && address.trim()) {
    const result = await tryGeocode(address);
    if (result) return result;
  }

  // 2. Intelligent Fallback: Try parts of the address (e.g., skip first part if it's a fake house number)
  if (address && address.includes(',')) {
    const parts = address.split(',').map(p => p.trim());
    if (parts.length > 1) {
        // Try without the first part (often house no/street)
        const partialQuery = parts.slice(1).join(', ');
        console.log(`Fuzzy Fallback: Retrying with partial address: "${partialQuery}"`);
        const result = await tryGeocode(partialQuery);
        if (result) return result;
        
        // Try just the last part (often city/state/country)
        const lastPart = parts[parts.length - 1];
        if (lastPart.length > 2) {
            console.log(`Fuzzy Fallback: Retrying with city/region part: "${lastPart}"`);
            const finalResult = await tryGeocode(lastPart);
            if (finalResult) return finalResult;
        }
    }
  }

  // 3. Contextual Fallback: If city/state were provided separately
  if (city || state) {
    const query = `${city || ''}, ${state || ''}`.trim();
    const result = await tryGeocode(query);
    if (result) {
        console.log(`Geocoding Fallback: Located general area via city/state: "${query}"`);
        return result;
    }
  }

  return null;
}
