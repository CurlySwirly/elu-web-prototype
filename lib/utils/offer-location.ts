export function isOnlineOfferFormat(format?: string | null) {
  return (format || '').trim().toLowerCase() === 'online';
}

export function formatLocationParts(parts: {
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
}) {
  const cityLine = [parts.postal_code, parts.city].filter(Boolean).join(' ');
  return [parts.address, cityLine].filter(Boolean).join(', ');
}

export function formatOfferLocation(offer?: {
  location_address?: string | null;
  location_postal_code?: string | null;
  location_city?: string | null;
} | null) {
  if (!offer) return '';
  return formatLocationParts({
    address: offer.location_address,
    postal_code: offer.location_postal_code,
    city: offer.location_city,
  });
}
