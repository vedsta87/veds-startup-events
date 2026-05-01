export type LatLng = [number, number];

export const TOKYO_CENTER: LatLng = [35.6762, 139.6503];

// District / venue keywords → approximate center coordinates
const LOOKUP: Array<[string, LatLng]> = [
  // Wards & districts
  ["roppongi",        [35.6628, 139.7319]],
  ["shibuya",         [35.6580, 139.7016]],
  ["shinjuku",        [35.6895, 139.6917]],
  ["akihabara",       [35.7020, 139.7740]],
  ["ginza",           [35.6717, 139.7649]],
  ["marunouchi",      [35.6812, 139.7671]],
  ["chiyoda",         [35.6812, 139.7671]],
  ["otemachi",        [35.6883, 139.7642]],
  ["minato",          [35.6581, 139.7514]],
  ["toranomon",       [35.6672, 139.7492]],
  ["azabu",           [35.6501, 139.7352]],
  ["akasaka",         [35.6731, 139.7369]],
  ["kasumigaseki",    [35.6738, 139.7504]],
  ["aoyama",          [35.6635, 139.7162]],
  ["harajuku",        [35.6702, 139.7027]],
  ["daikanyama",      [35.6493, 139.7031]],
  ["nakameguro",      [35.6442, 139.6987]],
  ["ebisu",           [35.6462, 139.7109]],
  ["meguro",          [35.6340, 139.7157]],
  ["setagaya",        [35.6465, 139.6531]],
  ["ueno",            [35.7148, 139.7744]],
  ["asakusa",         [35.7117, 139.7969]],
  ["sumida",          [35.7099, 139.8023]],
  ["koto",            [35.6717, 139.8169]],
  ["ariake",          [35.6296, 139.7756]],
  ["odaiba",          [35.6296, 139.7756]],
  ["konan",           [35.6298, 139.7374]],
  ["shinagawa",       [35.6284, 139.7387]],
  ["osaki",           [35.6197, 139.7284]],
  ["nihonbashi",      [35.6833, 139.7741]],
  ["chuo",            [35.6654, 139.7706]],
  ["ikebukuro",       [35.7298, 139.7108]],
  ["toshima",         [35.7298, 139.7108]],
  ["tamagawa",        [35.5985, 139.6600]],
  ["jingumae",        [35.6701, 139.7026]],
  ["minami-aoyama",   [35.6635, 139.7162]],
  ["minami-azabu",    [35.6501, 139.7352]],
  ["nishi-shinjuku",  [35.6925, 139.6903]],
  ["nishi-azabu",     [35.6606, 139.7249]],
  ["azumabashi",      [35.7090, 139.8008]],
  // Near-Tokyo cities
  ["kawasaki",        [35.5313, 139.7029]],
  ["yokohama",        [35.4437, 139.6380]],
  ["chiba",           [35.6073, 140.1063]],
  ["tsukuba",         [36.0835, 140.0776]],
  // Default
  ["tokyo",           [35.6762, 139.6503]],
  ["japan",           [35.6762, 139.6503]],
];

function hashSeed(str: string): number {
  return [...str].reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) & 0xffff, 0);
}

/**
 * Deterministic jitter — same URL always produces the same offset,
 * so markers don't jump between renders.
 */
function applyJitter(base: LatLng, seed: string): LatLng {
  const h = hashSeed(seed);
  return [
    base[0] + ((h & 0xff) / 255 - 0.5) * 0.012,
    base[1] + (((h >> 8) & 0xff) / 255 - 0.5) * 0.012,
  ];
}

/**
 * Geocode a free-text Tokyo address to approximate lat/lng.
 * Pass `seed` (e.g. event URL) to get stable jitter so co-located
 * events don't stack exactly on top of each other.
 */
export function geocodeAddress(address: string, seed = ""): LatLng | null {
  if (!address) return null;
  const lower = address.toLowerCase();
  for (const [keyword, coords] of LOOKUP) {
    if (lower.includes(keyword)) {
      return seed ? applyJitter(coords, seed) : coords;
    }
  }
  return null;
}
