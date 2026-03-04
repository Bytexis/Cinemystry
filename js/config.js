const CONFIG = {
  API_KEY: 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI3N2VjODgwNDA5MDVmZTNmOGZlY2FlZjNkYWI1Yzk0MCIsIm5iZiI6MTc3MjE2MDA0NS4yNzgsInN1YiI6IjY5YTEwNDJkMzcxOGRmYWM0MmZmNTJjYyIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.d2BJBE-ug1P0P7LTB65fR05SRIC1jPB0KbXIH8Qci3c',
  BASE_URL: 'https://api.themoviedb.org/3',
  IMG_BASE: 'https://image.tmdb.org/t/p/w500',
  DIFFICULTIES: {
    easy:   { label: 'Easy Mode',   voteMin: 2000, pageMax: 25,  baseScore: 300 },
    medium: { label: 'Medium Mode', voteMin: 500,  pageMax: 50,  baseScore: 450 },
    hard:   { label: 'Hard Mode',   voteMin: 50,   pageMax: 100, baseScore: 600 }
  },
  LANGUAGES: {
    all:      { label: 'All Movies',    code: '' },
    english:  { label: 'English',       code: 'en' },
    hindi:    { label: 'Hindi',         code: 'hi' },
    spanish:  { label: 'Spanish',       code: 'es' },
    french:   { label: 'French',        code: 'fr' }
  },
  HINT_COSTS: { year: 30, genre: 20, letter: 50, overview: 100 },
  MAX_ATTEMPTS: 3,
  TOTAL_ROUNDS: 10
};

