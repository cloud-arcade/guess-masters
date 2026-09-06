/**
 * Category Registry
 *
 * Adding a new category: add an entry here, create
 * `src/data/categories/<id>.ts` exporting a `DateEntry[]`, then register it in
 * `src/data/index.ts`. Nothing else needs to change — the menu, the filters and
 * the question pool all derive from this registry.
 */

import type { Category, CategoryId } from './types';

export const CATEGORIES: Category[] = [
  {
    id: 'film',
    label: 'Film',
    icon: '🎬',
    blurb: 'Release years of the movies everyone has seen',
    accent: { from: 'from-amber-400', to: 'to-orange-600', text: 'text-amber-300', ring: 'ring-amber-500/40' },
  },
  {
    id: 'music',
    label: 'Music',
    icon: '🎵',
    blurb: 'Albums, singles and the songs that defined eras',
    accent: { from: 'from-fuchsia-400', to: 'to-purple-600', text: 'text-fuchsia-300', ring: 'ring-fuchsia-500/40' },
  },
  {
    id: 'history',
    label: 'History',
    icon: '🏛️',
    blurb: 'Battles, treaties, empires and turning points',
    accent: { from: 'from-stone-300', to: 'to-amber-700', text: 'text-amber-200', ring: 'ring-amber-600/40' },
  },
  {
    id: 'science',
    label: 'Science',
    icon: '🔬',
    blurb: 'Discoveries, theories and breakthroughs',
    accent: { from: 'from-emerald-400', to: 'to-teal-600', text: 'text-emerald-300', ring: 'ring-emerald-500/40' },
  },
  {
    id: 'space',
    label: 'Space',
    icon: '🚀',
    blurb: 'Launches, landings and things that left the planet',
    accent: { from: 'from-indigo-400', to: 'to-violet-700', text: 'text-indigo-300', ring: 'ring-indigo-500/40' },
  },
  {
    id: 'technology',
    label: 'Technology',
    icon: '💻',
    blurb: 'Gadgets, websites and the digital world',
    accent: { from: 'from-sky-400', to: 'to-blue-600', text: 'text-sky-300', ring: 'ring-sky-500/40' },
  },
  {
    id: 'sport',
    label: 'Sport',
    icon: '⚽',
    blurb: 'Records, finals and unforgettable moments',
    accent: { from: 'from-lime-400', to: 'to-green-600', text: 'text-lime-300', ring: 'ring-lime-500/40' },
  },
  {
    id: 'videogames',
    label: 'Video Games',
    icon: '🎮',
    blurb: 'Consoles and classics, from arcades to open worlds',
    accent: { from: 'from-rose-400', to: 'to-pink-600', text: 'text-rose-300', ring: 'ring-rose-500/40' },
  },
  {
    id: 'art',
    label: 'Art',
    icon: '🎨',
    blurb: 'Paintings, sculptures and the people who made them',
    accent: { from: 'from-orange-300', to: 'to-red-500', text: 'text-orange-300', ring: 'ring-orange-500/40' },
  },
  {
    id: 'exploration',
    label: 'Exploration',
    icon: '🧭',
    blurb: 'Voyages, summits and the edges of the map',
    accent: { from: 'from-cyan-300', to: 'to-sky-600', text: 'text-cyan-300', ring: 'ring-cyan-500/40' },
  },
  {
    id: 'politics',
    label: 'Politics',
    icon: '🗳️',
    blurb: 'Elections, leaders, laws and independence',
    accent: { from: 'from-red-400', to: 'to-rose-700', text: 'text-red-300', ring: 'ring-red-500/40' },
  },
  {
    id: 'disasters',
    label: 'Disasters',
    icon: '🌊',
    blurb: 'Earthquakes, wrecks and things that went wrong',
    accent: { from: 'from-slate-300', to: 'to-slate-600', text: 'text-slate-300', ring: 'ring-slate-500/40' },
  },
  {
    id: 'inventions',
    label: 'Inventions',
    icon: '💡',
    blurb: 'The first time somebody built the thing',
    accent: { from: 'from-yellow-300', to: 'to-amber-600', text: 'text-yellow-300', ring: 'ring-yellow-500/40' },
  },
  {
    id: 'television',
    label: 'Television',
    icon: '📺',
    blurb: 'Premieres, finales and the shows people quote',
    accent: { from: 'from-violet-400', to: 'to-indigo-600', text: 'text-violet-300', ring: 'ring-violet-500/40' },
  },
  {
    id: 'literature',
    label: 'Literature',
    icon: '📚',
    blurb: 'Novels, poems and publication dates',
    accent: { from: 'from-teal-300', to: 'to-emerald-700', text: 'text-teal-300', ring: 'ring-teal-500/40' },
  },
];

export const CATEGORY_MAP: Record<CategoryId, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c])
) as Record<CategoryId, Category>;

export function getCategory(id: CategoryId): Category {
  return CATEGORY_MAP[id];
}
