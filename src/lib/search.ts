import {buildAdvancedQuery, searchTracks} from 'gerdur-core';
import type {
  advancedSearchFilters,
  publicApiSearchOptions,
  publicApiSearchResponse,
  searchResultTrack,
} from 'gerdur-core/types';

/** The raw `--search` / `--artist` / `--bpm-min` … values as `commander` parses them (strings). */
export interface SearchFlags {
  search?: string;
  artist?: string;
  album?: string;
  track?: string;
  label?: string;
  bpmMin?: string | number;
  bpmMax?: string | number;
  durMin?: string | number;
  durMax?: string | number;
}

const toFiniteNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};

const trimmed = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const s = value.trim();
  return s ? s : undefined;
};

/**
 * Fold the CLI search flags into a {@link advancedSearchFilters} bag for
 * `buildAdvancedQuery` / `searchTracks`. Returns `null` when none were supplied,
 * so the caller can tell "no search requested" from "empty search".
 */
export const advancedFiltersFromFlags = (flags: SearchFlags): advancedSearchFilters | null => {
  const filters: advancedSearchFilters = {
    query: trimmed(flags.search),
    artist: trimmed(flags.artist),
    album: trimmed(flags.album),
    track: trimmed(flags.track),
    label: trimmed(flags.label),
    durMin: toFiniteNumber(flags.durMin),
    durMax: toFiniteNumber(flags.durMax),
    bpmMin: toFiniteNumber(flags.bpmMin),
    bpmMax: toFiniteNumber(flags.bpmMax),
  };

  return Object.values(filters).some((v) => v !== undefined) ? filters : null;
};

/** The words in a filter bag, for a free-text retry when the operators come back empty. */
export const plainTextQuery = (filters: advancedSearchFilters): string =>
  [filters.query, filters.artist, filters.album, filters.track, filters.label]
    .filter((v): v is string => Boolean(v))
    .join(' ')
    .trim();

export interface AdvancedSearchOptions extends Omit<publicApiSearchOptions, 'type'> {
  /**
   * Deezer's advanced operators are unreliable. When they return nothing, retry
   * with the same words as a plain free-text query. Default `true`.
   */
  fallback?: boolean;
}

export interface AdvancedSearchResult extends publicApiSearchResponse<searchResultTrack> {
  /** the advanced-operator query that was built */
  query: string;
  /** whether the free-text fallback was used */
  usedFallback: boolean;
}

/**
 * `buildAdvancedQuery` + `searchTracks`, with an automatic free-text retry when
 * the operators match nothing (unless `fallback: false`).
 */
export const searchAdvancedTracks = async (
  filters: advancedSearchFilters,
  options: AdvancedSearchOptions = {},
): Promise<AdvancedSearchResult> => {
  const {fallback = true, ...searchOptions} = options;
  const query = buildAdvancedQuery(filters);

  // `query` already contains every text field, so an empty query means nothing to search.
  if (!query) {
    return {data: [], total: 0, query, usedFallback: false};
  }

  let response: publicApiSearchResponse<searchResultTrack> = await searchTracks(query, searchOptions);
  let usedFallback = false;

  if (!response.data.length && fallback) {
    const plain = plainTextQuery(filters);
    if (plain && plain !== query) {
      response = await searchTracks(plain, searchOptions);
      usedFallback = true;
    }
  }

  return {...response, query, usedFallback};
};
