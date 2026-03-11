const CONFIG = {
  DATABASE_LABEL: 'Local Movie DB',
  LANGUAGES: {
    all: { label: 'All Movies' },
    hindi: { label: 'Hindi' },
    english: { label: 'English' }
  },
  DIFFICULTIES: {
    easy: { label: 'Easy Mode', multiplier: 1 },
    medium: { label: 'Medium Mode', multiplier: 1.5 },
    hard: { label: 'Hard Mode', multiplier: 2 }
  },
  SCORING: {
    BASE_SCORE: 100,
    PENALTY_LETTER: 10,
    PENALTY_YEAR: 15,
    PENALTY_GENRE: 10,
    PENALTY_WRONG: 5,
    PENALTY_TIME: 1, // per second
    SPEED_BONUSES: [
      { threshold: 5, bonus: 30 },
      { threshold: 10, bonus: 20 },
      { threshold: 20, bonus: 10 }
    ],
    STREAK_BONUSES: {
      3: 20,
      5: 50
    },
    PERFECT_GUESS_BONUS: 50
  },
  HINT_COSTS: { year: 15, genre: 10, letter: 10 },
  MAX_ATTEMPTS: 3,
  TOTAL_ROUNDS: 10
};
