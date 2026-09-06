# Guess Masters — Guess the Date

A survival guessing game for the CloudArcade platform. The player is asked what
year something happened; every year they are off costs one health. Run out of
health and the run ends — the score is the number of rounds survived.

Static site, no backend. The entire knowledge base ships in the bundle.

## Gameplay

| Rule | Value |
|------|-------|
| Starting health | 250 |
| Damage | 1 per year off (`\|guess − answer\|`) |
| Perfect guess | +10 health (tapered by round) |
| Within 2 years | +3 health (tapered by round) |
| Score | Rounds survived |

Answers are always four digits, entered into four slots via an on-screen keypad
or the physical keyboard. `Enter` locks in a guess and advances the reveal;
`Backspace` deletes.

### The bonus taper

A flat perfect-guess bonus larger than a skilled player's typical damage lets
health regenerate faster than it drains, making expert runs endless. The bonus
therefore scales down as rounds climb (`bonusScale` in `src/game/rules.ts`):
full value to round 10, 60% to round 25, 30% to round 45, then nothing. Simulated
outcomes across player skill levels:

| Player | Median rounds | p90 |
|--------|---------------|-----|
| Casual | 12 | 17 |
| Average | 18 | 24 |
| Strong | 34 | 44 |
| Expert | 75 | 90 |

### Modes

- **Survival** — always plays the full library and submits to the leaderboard.
  The platform has a single leaderboard, so filtered runs would produce
  incomparable scores; survival is deliberately not filterable.
- **Freeplay** — pick any combination of categories, practise, no score.

An in-progress survival run is saved to `localStorage` after every round and can
be resumed from the menu.

## Knowledge base

730 questions across 15 categories, spanning 1066–2023.

| Category | Entries | | Category | Entries |
|----------|--------:|-|----------|--------:|
| Film | 100 | | Art | 35 |
| Music | 84 | | Inventions | 35 |
| History | 83 | | Politics | 35 |
| Technology | 50 | | Television | 35 |
| Video Games | 50 | | Exploration | 30 |
| Sport | 45 | | Disasters | 28 |
| Literature | 40 | | | |
| Science | 40 | | | |
| Space | 40 | | | |

Difficulty runs 1 (household knowledge) to 5 (specialist). Early rounds weight
easy entries so new players get a foothold; later rounds open up the full range.

### Adding questions

1. Open `src/data/categories/<category>.ts`.
2. Append a `DateEntry`:

```ts
{
  id: 'film-some-movie',        // unique, `<category>-<slug>`
  prompt: 'What year was "Some Movie" released?',
  year: 1994,                    // four digits, CE
  category: 'film',
  difficulty: 3,                 // 1–5
  fact: 'Optional trivia shown after the guess.',
}
```

Ids must be unique across the whole library — `ALL_ENTRIES` de-duplicates by id,
and a duplicate would silently drop. Prompts should be unique too, so the same
question cannot appear twice in one run.

### Adding a category

1. Add metadata to `CATEGORIES` in `src/data/categories.ts` (label, icon, blurb,
   accent colours).
2. Create `src/data/categories/<id>.ts` exporting a `DateEntry[]`.
3. Register it in `CATEGORY_SOURCES` in `src/data/index.ts`.
4. Add the id to the `CategoryId` union in `src/data/types.ts`.

The menu, filters and question pool all derive from that registry — nothing else
needs changing.

## Project structure

```
src/
├── data/
│   ├── types.ts              # DateEntry, Category, CategoryId
│   ├── categories.ts         # category registry (labels, icons, colours)
│   ├── categories/*.ts       # the knowledge base, one file per category
│   └── index.ts              # aggregation, de-duplication, pool selection
├── game/                     # pure logic, no React
│   ├── rules.ts              # health, damage, bonuses, difficulty ramp, ranks
│   ├── selector.ts           # seeded RNG + weighted question selection
│   ├── storage.ts            # localStorage (run, stats, prefs) — all best-effort
│   └── sound.ts              # WebAudio SFX, synthesised (no audio assets)
├── hooks/
│   ├── useDateGame.ts        # the run state machine
│   └── useCloudArcade.ts     # platform postMessage integration
├── components/
│   ├── game/                 # DigitSlots, Keypad, HealthBar, QuestionCard, ResultReveal
│   ├── screens/              # HomeScreen, PlayScreen, ResultsScreen
│   └── GameContainer.tsx     # screen routing + platform wiring
└── styles/index.css          # theme tokens + animations
```

The `game/` layer is deliberately framework-free so the rules can be tested and
simulated without React.

## Platform integration

Survival runs call `START_SESSION` on start and, on death, `SUBMIT_SCORE` with
rounds survived plus metadata (exact guesses, average delta), followed by
`GAME_OVER`. The results screen reports whether the submission succeeded and the
returned rank.

The game is fully playable standalone — if nothing answers `GAME_READY`,
`isConnected` stays false and sends are harmless no-ops.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server on :3000 |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the build |
| `npm run test:harness` | Platform test harness on :3001 |

## Deployment

Push to `main`; GitHub Actions builds and deploys to Pages. Set `base` in
`vite.config.ts` to your repository name.

## License

MIT
