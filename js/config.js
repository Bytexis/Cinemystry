const CONFIG = {
  API_KEY: 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI3N2VjODgwNDA5MDVmZTNmOGZlY2FlZjNkYWI1Yzk0MCIsIm5iZiI6MTc3MjE2MDA0NS4yNzgsInN1YiI6IjY5YTEwNDJkMzcxOGRmYWM0MmZmNTJjYyIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.d2BJBE-ug1P0P7LTB65fR05SRIC1jPB0KbXIH8Qci3c',
  BASE_URL: 'https://api.themoviedb.org/3',
  IMG_BASE: 'https://image.tmdb.org/t/p/w500',
  DIFFICULTIES: {
    easy: { label: 'Easy Mode', voteMin: 2000, pageMax: 25, multiplier: 1 },
    medium: { label: 'Medium Mode', voteMin: 500, pageMax: 50, multiplier: 1.5 },
    hard: { label: 'Hard Mode', voteMin: 50, pageMax: 100, multiplier: 2 }
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
  LANGUAGES: {
    all: { label: 'All Movies', code: '' },
    english: { label: 'English', code: 'en' },
    hindi: { label: 'Hindi', code: 'hi' },
    spanish: { label: 'Spanish', code: 'es' },
    french: { label: 'French', code: 'fr' }
  },
  HINT_COSTS: { year: 15, genre: 10, letter: 10 },
  MAX_ATTEMPTS: 3,
  TOTAL_ROUNDS: 10
};

