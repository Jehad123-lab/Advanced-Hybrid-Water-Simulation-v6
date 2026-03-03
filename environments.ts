/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SkyboxOption {
  name: string;
  url: string;
}

export const skyboxOptions: SkyboxOption[] = [
  {
    name: 'Qwantani Noon',
    url: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/qwantani_noon_puresky_1k.hdr',
  },
  {
    name: 'Tropical Beach',
    url: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/kloofendal_48d_partly_cloudy_1k.hdr',
  },
  {
    name: 'Snowy Park',
    url: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/snowy_park_01_1k.hdr',
  },
  {
    name: 'Quarry Sunset',
    url: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/sunset_in_the_chalk_quarry_1k.hdr',
  },
  {
    name: 'Evening Meadow',
    url: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/evening_meadow_1k.hdr'
  }
];
