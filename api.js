// Настройки API
const API_CONFIG = {
  BASE_URL: "https://kinopoiskapiunofficial.tech/api",
  API_KEY: "83208d21-5ac5-47d5-9713-65a362bc9fc7",
};

let originalMovies = [];

async function getContent(type = "FILM", page = 1, limit = 100) {
  let url = "";

  if (type === "FILM") {
    url = `${API_CONFIG.BASE_URL}/v2.2/films/top?type=TOP_100_POPULAR_FILMS&page=${page}`;
  } else if (type === "SERIES") {
    url = `${API_CONFIG.BASE_URL}/v2.2/films?order=RATING&type=TV_SERIES&ratingFrom=7&page=${page}`;
  } else {
    url = `${API_CONFIG.BASE_URL}/v2.2/films/top?type=TOP_100_POPULAR_FILMS&page=${page}`;
  }

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-API-KEY": API_CONFIG.API_KEY,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error(`Ошибка ${response.status}: ${response.statusText}`);
      return [];
    }

    const data = await response.json();

    let results = [];
    if (data.films) results = data.films;
    if (data.items) results = data.items;

    // Если нужно больше фильмов, загружаем несколько страниц
    if (results.length < limit && page < 3) {
      const nextPage = await getContent(type, page + 1, limit - results.length);
      results = [...results, ...nextPage];
    }

    return results.slice(0, limit);
  } catch (error) {
    console.error("Ошибка загрузки:", error);
    return [];
  }
}

function createMovieCard(film) {
  const card = document.createElement("div");
  card.className = "style_card";

  let rating = film.rating;

  if (rating === undefined || rating === null || isNaN(parseFloat(rating))) {
    rating = 0;
  } else {
    rating = parseFloat(rating);
  }

  const ratingText = rating === 0 ? "Нет" : rating.toFixed(1);
  const ratingValue = rating === 0 ? 10 : rating;
  const ratingClass = ratingValue < 8.6 ? "rating-low" : "";

  const title =
    film.nameRu || film.nameEn || film.nameOriginal || "Название неизвестно";
  const posterUrl =
    film.posterUrlPreview || film.posterUrl || "/assets/gallery/poster_1.png";

  card.innerHTML = `
    <div class="style_card_ratting ${ratingClass}">
      <p>${ratingText}</p>
    </div>
    <div class="style_card_name">
      <p>${title}</p>
    </div>
    <img src="${posterUrl}" alt="${title}" onerror="this.src='/assets/gallery/poster_1.png'" />
  `;

  return card;
}

async function loadMovies(containerSelector, type = "FILM", limit = 50) {
  const container = document.querySelector(containerSelector);

  if (!container) {
    console.error("Контейнер не найден:", containerSelector);
    return;
  }

  const loadingText =
    type === "SERIES" ? "Загрузка сериалов..." : "Загрузка фильмов...";
  container.innerHTML = `<div style="text-align:center; padding:20px;">${loadingText}</div>`;

  const items = await getContent(type);

  if (!items || items.length === 0) {
    const errorText =
      type === "SERIES"
        ? "Не удалось загрузить сериалы"
        : "Не удалось загрузить фильмы";
    container.innerHTML = `<div style="text-align:center; padding:20px;">${errorText}</div>`;
    return;
  }

  container.innerHTML = "";
  items.slice(0, limit).forEach((item) => {
    container.appendChild(createMovieCard(item));
  });
}

async function searchContent(query) {
  if (!query || query.trim() === "") return [];

  const url = `${API_CONFIG.BASE_URL}/v2.1/films/search-by-keyword?keyword=${encodeURIComponent(query)}&page=1`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-API-KEY": API_CONFIG.API_KEY,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) throw new Error(`Ошибка ${response.status}`);

    const data = await response.json();
    return data.films || [];
  } catch (error) {
    console.error("Ошибка поиска", error);
    return [];
  }
}

function setupSearch() {
  const searchInput = document.querySelector(".search-input");
  const searchBtn = document.querySelector(".search_btn");

  if (!searchBtn || !searchInput) return;

  searchBtn.addEventListener("click", () => {
    const query = searchInput.value.trim();
    if (!query) return;

    const currentPath = window.location.pathname;

    if (currentPath.includes("search_results")) {
      window.location.href = `/search_results.html?search=${encodeURIComponent(query)}`;
    } else if (currentPath.includes("movie_list")) {
      window.location.href = `/movie_list/movie_list.html?search=${encodeURIComponent(query)}`;
    } else if (currentPath.includes("series_list")) {
      window.location.href = `/series_list/series_list.html?search=${encodeURIComponent(query)}`;
    } else {
      window.location.href = `/search_results/search_results.html?search=${encodeURIComponent(query)}`;
    }
  });

  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      searchBtn.click();
    }
  });
}

let pgItems = [];
let pgPage = 1;
const pgLimit = 9;

function pgShow() {
  let container = document.querySelector(".movies_grid");
  if (!container) return;

  let start = (pgPage - 1) * pgLimit;
  let end = start + pgLimit;
  let show = pgItems.slice(start, end);

  container.innerHTML = "";
  for (let item of show) {
    container.appendChild(createMovieCard(item));
  }

  pgDraw();
}

function pgDraw() {
  let pagesDiv = document.querySelector(".pages");
  if (!pagesDiv) return;

  let total = Math.ceil(pgItems.length / pgLimit);
  if (total <= 1) {
    pagesDiv.style.display = "none";
    return;
  }

  pagesDiv.style.display = "flex";
  pagesDiv.innerHTML = "";

  for (let i = 1; i <= total; i++) {
    let btn = document.createElement("span");
    btn.innerText = i;
    if (i === pgPage) btn.classList.add("active");

    btn.onclick = (function (page) {
      return function () {
        pgPage = page;
        pgShow();
      };
    })(i);

    pagesDiv.appendChild(btn);
  }
}

async function pgLoadMovies(type) {
  let container = document.querySelector(".movies_grid");
  if (!container) return;

  container.innerHTML = "<div style='text-align:center;'>Загрузка...</div>";

  let items = await getContent(type);

  if (!items || items.length === 0) {
    container.innerHTML =
      "<div style='text-align:center;'>Ошибка загрузки</div>";
    return;
  }

  pgItems = items;
  pgPage = 1;
  pgShow();
}

async function pgSearch(query, searchType = "MIXED") {
  let container = document.querySelector(".movies_grid");
  if (!container) return;

  container.innerHTML = `<div style="text-align:center; padding:20px;">Поиск "${query}"...</div>`;

  const allResults = await searchContent(query);

  let filteredResults;
  if (searchType === "FILM") {
    filteredResults = allResults.filter((item) => item.type !== "TV_SERIES");
  } else if (searchType === "SERIES") {
    filteredResults = allResults.filter((item) => item.type === "TV_SERIES");
  } else {
    filteredResults = allResults;
  }

  if (filteredResults.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:20px;">По запросу "${query}" ничего не найдено</div>`;
    const pagesDiv = document.querySelector(".pages");
    if (pagesDiv) pagesDiv.style.display = "none";
    return;
  }

  pgItems = filteredResults;
  pgPage = 1;
  pgShow();
}

// Глобальный флаг, чтобы не загружать слайдер повторно при поиске
let isSearchMode = false;

async function reloadSliderWithSearch(query, type = "FILM") {
  const sliderTrack = document.querySelector(".slider_track");
  if (!sliderTrack) return;

  sliderTrack.innerHTML = '<div style="text-align:center;">Поиск...</div>';

  const allResults = await searchContent(query);

  let filteredResults;
  if (type === "FILM") {
    filteredResults = allResults.filter((item) => item.type !== "TV_SERIES");
  } else if (type === "SERIES") {
    filteredResults = allResults.filter((item) => item.type === "TV_SERIES");
  } else {
    filteredResults = allResults;
  }

  if (filteredResults.length === 0) {
    sliderTrack.innerHTML =
      '<div style="text-align:center;">Ничего не найдено для слайдера</div>';
    return;
  }

  sliderTrack.innerHTML = "";
  filteredResults.slice(0, 15).forEach((item) => {
    sliderTrack.appendChild(createMovieCard(item));
  });
}

function checkSearchParam() {
  const urlParams = new URLSearchParams(window.location.search);
  const searchQuery = urlParams.get("search");

  if (!searchQuery) return false;

  isSearchMode = true; // Включаем режим поиска

  const currentPath = window.location.pathname;

  if (currentPath.includes("search_results")) {
    pgSearch(searchQuery, "MIXED");
    reloadSliderWithSearch(searchQuery, "MIXED");
    const h1 = document.querySelector("#pageTitle");
    if (h1) {
      h1.innerHTML = `Результаты поиска: "${searchQuery}"`;
    }
    return true;
  } else if (currentPath.includes("movie_list")) {
    pgSearch(searchQuery, "FILM");
    reloadSliderWithSearch(searchQuery, "FILM");
    const h1 = document.querySelector("h1");
    if (h1) {
      h1.innerHTML = `Результаты поиска: "${searchQuery}"`;
    }
    return true;
  } else if (currentPath.includes("series_list")) {
    pgSearch(searchQuery, "SERIES");
    reloadSliderWithSearch(searchQuery, "SERIES");
    const h1 = document.querySelector("h1");
    if (h1) {
      h1.innerHTML = `Результаты поиска: "${searchQuery}"`;
    }
    return true;
  }

  return false;
}

async function loadRandomMovies(type = "FILM") {
  let container = document.querySelector(".movies_grid");
  if (!container) return;

  container.innerHTML =
    "<div style='text-align:center; padding:20px;'>Загрузка...</div>";

  // Просто загружаем обычные фильмы
  let items = await getContent(type);

  if (!items || items.length === 0) {
    container.innerHTML =
      "<div style='text-align:center; padding:20px;'>Ошибка загрузки</div>";
    return;
  }

  originalMovies = [...items];

  // Перемешиваем в случайном порядке
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }

  // Сортируем по рейтингу
  items.sort(
    (a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0),
  );

  // Берём первые 9 и показываем
  pgItems = items.slice(0, 50);
  pgPage = 1;
  pgShow();
}

function applyFilters() {
  const year = document.getElementById("yearFilter").value;
  const genre = document.getElementById("genreFilter").value;
  const country = document.getElementById("countryFilter").value;
  const rating = document.getElementById("ratingFilter").value;

  let filtered = [...originalMovies];

  if (year && year !== "") {
    const yearNum = parseInt(year);
    filtered = filtered.filter((movie) => {
      // Преобразуем год фильма в число для сравнения
      const movieYear = parseInt(movie.year);
      return movieYear === yearNum;
    });
    console.log(
      `После фильтра по году ${yearNum}: осталось ${filtered.length} фильмов`,
    );
  }

  if (genre && genre !== "") {
    filtered = filtered.filter((movie) => {
      // Проверяем, есть ли выбранный жанр в массиве жанров фильма
      return movie.genres?.some(
        (g) => g.genre.toLowerCase() === genre.toLowerCase(),
      );
    });
  }

  // Фильтр по стране (аналогично жанру)
  if (country && country !== "") {
    filtered = filtered.filter((movie) => {
      return movie.countries?.some((c) =>
        c.country.toLowerCase().includes(country.toLowerCase()),
      );
    });
  }

  // Фильтр по рейтингу
  if (rating && rating !== "") {
    const minRating = parseInt(rating);
    filtered = filtered.filter((movie) => (movie.rating || 0) >= minRating);
  }

  if (filtered.length === 0) {
    console.log("❌ Фильмов не найдено!");
    const container = document.querySelector(".movies_grid");
    container.innerHTML =
      "<div style='text-align:center; padding:20px;'>По выбранным фильтрам ничего не найдено</div>";
    return;
  }

  pgItems = filtered;
  pgPage = 1;
  pgShow();

  // 5. Сообщаем результат
  console.log(`Найдено фильмов: ${filtered.length}`);
}

function autoFilter() {
  const filters = [
    "yearFilter",
    "genreFilter",
    "countryFilter",
    "ratingFilter",
  ];

  filters.forEach((filterId) => {
    const element = document.getElementById(filterId);
    if (element) {
      element.addEventListener("change", () => {
        applyFilters();
      });
    }
  });
}

const applyBtn = document.getElementById("applyFilter");
if (applyBtn) {
  applyBtn.addEventListener("click", applyFilters);
}

// ========== ОСНОВНАЯ ЗАГРУЗКА (упрощённая) ==========

const currentPath = window.location.pathname;
const isSeriesPage = currentPath.includes("series_list");
const hasSearch = checkSearchParam();

// Если нет поиска - загружаем случайные фильмы
if (!hasSearch) {
  if (isSeriesPage) {
    loadRandomMovies("SERIES");
  } else {
    loadRandomMovies("FILM");
  }
} else {
  // Если есть поиск - он уже обработан в checkSearchParam()
}

// Загружаем слайдер
if (!isSearchMode) {
  if (isSeriesPage) {
    loadMovies(".slider_track", "SERIES", 20);
  } else {
    loadMovies(".slider_track", "FILM", 20);
  }
}

// Запускаем обработчик поиска
setupSearch();
autoFilter();
