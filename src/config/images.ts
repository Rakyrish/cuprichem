/**
 * Central photography registry.
 *
 * Every photo used in page furniture (heroes, feature bands, category cards)
 * is declared here ONCE, so adding new artwork is a single-file change:
 *
 *   1. drop the file into `public/website photos/`
 *   2. add an entry below with a real `alt` description
 *   3. reference it by key from a component
 *
 * The public folder name contains a space. Write it as a LITERAL space here —
 * `next/image` URL-encodes the `src` itself when building the `/_next/image`
 * request, so a pre-encoded `%20` would be encoded a second time to `%2520`
 * and the optimizer would 400 looking for a directory named "website%20photos".
 */

const DIR = "/website photos";

export interface SitePhoto {
  src: string;
  /** Written for screen readers — describes the scene, not the file. */
  alt: string;
  /** Focal bias for `object-position` when the photo is cropped to a band. */
  position?: string;
}

export const photos = {
  drumStoreWide: {
    src: `${DIR}/0d860e704bc251193110c4fa35870f1a.jpg`,
    alt: "Blue steel drums stacked on pallets beside IBC totes in a chemical storage warehouse",
    position: "center 55%",
  },
  drumsStacked: {
    src: `${DIR}/9012dab074c0f4136ae12efa4386a397.jpg`,
    alt: "Blue plastic drums, jerrycans and an IBC tote arranged in a bulk chemical yard",
    position: "center",
  },
  coatingsAisle: {
    src: `${DIR}/3c60d09be7f60e29abddab4a1fd3ffbd.jpg`,
    alt: "Columns of sealed paint and coatings pails stacked in a distribution store",
    position: "center 40%",
  },
  coatingsStore: {
    src: `${DIR}/4a10f3fd46a1b469b00dad962d741496.jpg`,
    alt: "Shelved and palletised coatings stock filling a supply warehouse floor",
    position: "center 45%",
  },
} as const satisfies Record<string, SitePhoto>;

export type PhotoKey = keyof typeof photos;

/**
 * Ordered pool used where a page needs "some photo" without caring which
 * (e.g. category cards). Cycling this keeps repeat imagery spread out.
 */
export const photoRotation: PhotoKey[] = [
  "drumsStacked",
  "coatingsAisle",
  "drumStoreWide",
  "coatingsStore",
];

/** Pick from the rotation by index, wrapping — never returns undefined. */
export function rotatePhoto(index: number): SitePhoto {
  return photos[photoRotation[index % photoRotation.length]];
}
