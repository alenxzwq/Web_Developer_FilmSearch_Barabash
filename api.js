// ============================================
// 1. КОНФИГИ И ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// ============================================

const API_CONFIG = {
  BASE_URL: "https://kinopoiskapiunofficial.tech/api",
  API_KEY: "d90bf8d1-e283-426b-a2bf-e10ae8f6e6b8",
};

let currentMovieList = []; // было pgItems
let currentPage = 1; // было pgPage
const PAGINATION_LIMIT = 9; // было pgLimit

// ============================================
// 2. ВСПОМОГАТЕЛЬНЫЕ УТИЛИТЫ
// ============================================

// Единый метод для API-запросов
async function apiRequest(url) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "X-API-KEY": API_CONFIG.API_KEY,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

// Отображение загрузки
function showLoading(container, message = "Загрузка...") {
  if (!container) return;
  container.innerHTML = `<div class="loading-message">${message}</div>`;
}

// Отображение ошибки
function showError(container, message = "Ошибка загрузки") {
  if (!container) return;
  container.innerHTML = `<div class="error-message">${message}</div>`;
}

// Экранирование HTML для безопасности
function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Получение рейтинга из объекта фильма
function getRatingValue(film) {
  const rating = film.rating;
  if (rating === undefined || rating === null || isNaN(parseFloat(rating))) {
    return 0;
  }
  return parseFloat(rating);
}

// Форматирование текста отзыва (обрезаем до maxLength)
function truncateText(text, maxLength = 300) {
  if (!text || text.length <= maxLength) return text;

  let cutText = text.substring(0, maxLength);
  const lastSpace = cutText.lastIndexOf(" ");
  if (lastSpace > 0) {
    cutText = cutText.substring(0, lastSpace);
  }
  return cutText + "...";
}

// ============================================
// 3. API ЗАПРОСЫ
// ============================================

function buildContentUrl(type, page) {
  const urls = {
    FILM: `${API_CONFIG.BASE_URL}/v2.2/films/top?type=TOP_100_POPULAR_FILMS&page=${page}`,
    SERIES: `${API_CONFIG.BASE_URL}/v2.2/films?order=RATING&type=TV_SERIES&ratingFrom=7&page=${page}`,
  };
  return urls[type] || urls.FILM;
}

async function getContent(type = "FILM", page = 1, limit = 100) {
  const url = buildContentUrl(type, page);

  try {
    const data = await apiRequest(url);
    let results = data.films || data.items || [];

    // Если нужно больше фильмов, загружаем дополнительные страницы
    if (results.length < limit && page < 3) {
      const nextPage = await getContent(type, page + 1, limit - results.length);
      results = [...results, ...nextPage];
    }

    return results.slice(0, limit);
  } catch (error) {
    console.error("Ошибка загрузки контента:", error);
    return [];
  }
}

async function searchContent(query) {
  if (!query || query.trim() === "") return [];

  const url = `${API_CONFIG.BASE_URL}/v2.1/films/search-by-keyword?keyword=${encodeURIComponent(query)}&page=1`;

  try {
    const data = await apiRequest(url);
    return data.films || [];
  } catch (error) {
    console.error("Ошибка поиска:", error);
    return [];
  }
}

function filterByType(items, type) {
  if (type === "FILM") {
    return items.filter((item) => item.type !== "TV_SERIES");
  } else if (type === "SERIES") {
    return items.filter((item) => item.type === "TV_SERIES");
  }
  return items;
}

// ============================================
// 4. UI КОМПОНЕНТЫ
// ============================================

function createMovieCard(film) {
  const card = document.createElement("div");
  card.className = "style_card";

  const rating = getRatingValue(film);
  const ratingText = rating === 0 ? "Нет" : rating.toFixed(1);
  const ratingClass = rating !== 0 && rating < 8.6 ? "rating-low" : "";

  const title =
    film.nameRu || film.nameEn || film.nameOriginal || "Название неизвестно";
  const posterUrl =
    film.posterUrlPreview || film.posterUrl || "/assets/gallery/poster_1.png";

  card.innerHTML = `
    <div class="style_card_ratting ${ratingClass}">
      <p>${escapeHtml(ratingText)}</p>
    </div>
    <div class="style_card_name">
      <p>${escapeHtml(title)}</p>
    </div>
    <img src="${posterUrl}" alt="${escapeHtml(title)}" onerror="this.src='/assets/gallery/poster_1.png'" />
  `;

  card.addEventListener("click", () => {
    const filmId = film.kinopoiskId || film.filmId;
    if (filmId) {
      window.location.href = `/movie/movie.html?id=${filmId}`;
    } else {
      console.error("Не удалось найти ID в объекте:", film);
    }
  });

  return card;
}

// ============================================
// 5. СЛАЙДЕР (новая функция)
// ============================================

async function loadMovies(containerSelector, type = "FILM", limit = 20) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  showLoading(
    container,
    type === "SERIES" ? "Загрузка сериалов..." : "Загрузка фильмов...",
  );

  const items = await getContent(type);

  if (!items || items.length === 0) {
    showError(
      container,
      type === "SERIES"
        ? "Не удалось загрузить сериалы"
        : "Не удалось загрузить фильмы",
    );
    return;
  }

  container.innerHTML = "";
  items.slice(0, limit).forEach((item) => {
    container.appendChild(createMovieCard(item));
  });
}

// ============================================
// 6. ПАГИНАЦИЯ ДЛЯ СЕТКИ
// ============================================

function updatePaginationDisplay() {
  const pagesDiv = document.querySelector(".pages");
  if (!pagesDiv) return;

  const total = Math.ceil(currentMovieList.length / PAGINATION_LIMIT);

  if (total <= 1) {
    pagesDiv.style.display = "none";
    return;
  }

  pagesDiv.style.display = "flex";
  pagesDiv.innerHTML = "";

  for (let i = 1; i <= total; i++) {
    const btn = document.createElement("span");
    btn.innerText = i;
    if (i === currentPage) btn.classList.add("active");

    btn.addEventListener("click", () => {
      currentPage = i;
      showCurrentPage();
    });

    pagesDiv.appendChild(btn);
  }
}

function showCurrentPage() {
  const container = document.querySelector(".movies_grid");
  if (!container) return;

  const start = (currentPage - 1) * PAGINATION_LIMIT;
  const end = start + PAGINATION_LIMIT;
  const itemsToShow = currentMovieList.slice(start, end);

  container.innerHTML = "";
  itemsToShow.forEach((item) => {
    container.appendChild(createMovieCard(item));
  });

  updatePaginationDisplay();
}

// ============================================
// 7. ПОИСК И ФИЛЬТРАЦИЯ
// ============================================

async function performSearch(query, searchType = "MIXED") {
  const container = document.querySelector(".movies_grid");
  if (!container) return;

  if (!query || query.trim() === "") {
    showError(container, "Введите поисковый запрос");
    return;
  }

  showLoading(container, `Поиск "${query}"...`);

  const allResults = await searchContent(query);
  const filteredResults = filterByType(allResults, searchType);

  if (filteredResults.length === 0) {
    container.innerHTML = `<div class="error-message">По запросу "${escapeHtml(query)}" ничего не найдено</div>`;
    const pagesDiv = document.querySelector(".pages");
    if (pagesDiv) pagesDiv.style.display = "none";
    return;
  }

  currentMovieList = filteredResults;
  currentPage = 1;
  showCurrentPage();
}

async function reloadSliderWithSearch(query, type = "FILM") {
  const sliderTrack = document.querySelector(".slider_track");
  if (!sliderTrack) return;

  showLoading(sliderTrack, "Поиск...");

  const allResults = await searchContent(query);
  const filteredResults = filterByType(allResults, type);

  if (filteredResults.length === 0) {
    sliderTrack.innerHTML =
      '<div class="error-message">Ничего не найдено для слайдера</div>';
    return;
  }

  sliderTrack.innerHTML = "";
  filteredResults.slice(0, 15).forEach((item) => {
    sliderTrack.appendChild(createMovieCard(item));
  });
}

function setupSearch() {
  const searchInput = document.querySelector(".search-input");
  const searchBtn = document.querySelector(".search_btn");

  if (!searchBtn || !searchInput) return;

  const redirectToSearchPage = () => {
    const query = searchInput.value.trim();
    if (!query) return;

    const currentPath = window.location.pathname;
    let searchUrl = "/search_results/search_results.html";

    if (currentPath.includes("search_results")) {
      searchUrl = "/search_results.html";
    } else if (currentPath.includes("movie_list")) {
      searchUrl = "/movie_list/movie_list.html";
    } else if (currentPath.includes("series_list")) {
      searchUrl = "/series_list/series_list.html";
    }

    window.location.href = `${searchUrl}?search=${encodeURIComponent(query)}`;
  };

  searchBtn.addEventListener("click", redirectToSearchPage);
  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") redirectToSearchPage();
  });
}

// ============================================
// 8. ФИЛЬТРЫ
// ============================================

function filterByYear(movies, year) {
  if (!movies || !Array.isArray(movies)) return [];
  if (!year || year === "") return movies;
  const yearNum = parseInt(year);
  return movies.filter((movie) => parseInt(movie.year) === yearNum);
}

function filterByGenre(movies, genre) {
  if (!movies || !Array.isArray(movies)) return [];
  if (!genre || genre === "") return movies;
  return movies.filter((movie) =>
    movie.genres?.some((g) => g.genre.toLowerCase() === genre.toLowerCase()),
  );
}

function filterByCountry(movies, country) {
  if (!movies || !Array.isArray(movies)) return [];
  if (!country || country === "") return movies;
  return movies.filter((movie) =>
    movie.countries?.some((c) =>
      c.country.toLowerCase().includes(country.toLowerCase()),
    ),
  );
}

function filterByRating(movies, minRating) {
  if (!movies || !Array.isArray(movies)) return [];
  if (!minRating || minRating === "") return movies;
  return movies.filter((movie) => (movie.rating || 0) >= parseInt(minRating));
}

function applyFilters() {
  const year = document.getElementById("yearFilter")?.value;
  const genre = document.getElementById("genreFilter")?.value;
  const country = document.getElementById("countryFilter")?.value;
  const rating = document.getElementById("ratingFilter")?.value;
  if (typeof window.originalMovies === "undefined") {
    console.warn("originalMovies не определена");
    return;
  }

  let filtered = [...window.originalMovies];
  filtered = filterByYear(filtered, year);
  filtered = filterByGenre(filtered, genre);
  filtered = filterByCountry(filtered, country);
  filtered = filterByRating(filtered, rating);

  if (filtered.length === 0) {
    const container = document.querySelector(".movies_grid");
    if (container) {
      container.innerHTML =
        '<div class="error-message">По выбранным фильтрам ничего не найдено</div>';
    }
    return;
  }

  currentMovieList = filtered;
  currentPage = 1;
  showCurrentPage();

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
      element.addEventListener("change", applyFilters);
    }
  });
}

// ============================================
// 9. СЛУЧАЙНЫЕ ФИЛЬМЫ ДЛЯ СЕТКИ
// ============================================

async function loadRandomMovies(type = "FILM") {
  const container = document.querySelector(".movies_grid");
  if (!container) return;

  showLoading(container, "Загрузка...");

  let items = await getContent(type);

  if (!items || items.length === 0) {
    showError(container, "Ошибка загрузки");
    return;
  }

  // Сохраняем оригинальные фильмы для фильтров
  window.originalMovies = [...items];

  // Перемешиваем
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }

  // Сортируем по рейтингу
  items.sort(
    (a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0),
  );

  currentMovieList = items.slice(0, 50);
  currentPage = 1;
  showCurrentPage();
}

// ============================================
// 10. СТРАНИЦА ФИЛЬМА
// ============================================

async function loadFilmInfo(film, filmId) {
  const title =
    film.nameRu || film.nameEn || film.nameOriginal || "Название неизвестно";

  // Заголовки
  const titleMobile = document.querySelector(".film_title_mobile");
  const titleDesktop = document.querySelector(".film_title");
  if (titleMobile) titleMobile.innerHTML = escapeHtml(title);
  if (titleDesktop) titleDesktop.innerHTML = escapeHtml(title);

  // Рейтинг
  const rating =
    film.ratingKinopoisk || film.ratingImdb || film.rating || "Нет";
  const ratingValue = rating === "Нет" ? 10 : parseFloat(rating);
  const ratingClass = ratingValue < 8.6 ? "rating-low" : "";
  const ratingText = rating === "Нет" ? "Нет" : parseFloat(rating).toFixed(1);

  const ratingDiv = document.querySelector(".style_card_ratting");
  if (ratingDiv) {
    ratingDiv.innerHTML = `<p>${ratingText}</p>`;
    if (ratingClass) ratingDiv.classList.add(ratingClass);
  }

  // Постер
  const posterUrl =
    film.posterUrl || film.posterUrlPreview || "/assets/gallery/poster_1.png";
  const posterImg = document.querySelector(".film_poster img");
  if (posterImg) {
    posterImg.src = posterUrl;
    posterImg.alt = escapeHtml(title);
  }

  // Жанры
  const genresSpan = document.querySelector(".film_item:first-child span");
  if (genresSpan && film.genres?.length) {
    genresSpan.innerHTML = film.genres.map((g) => g.genre).join(", ");
  }

  // Страны
  const countrySpan = document.querySelector(".film_item:nth-child(2) span");
  if (countrySpan && film.countries?.length) {
    countrySpan.innerHTML = film.countries.map((c) => c.country).join(", ");
  }

  // Дата релиза
  const releaseSpan = document.querySelector(".film_item:nth-child(5) span");
  if (releaseSpan && film.year) {
    releaseSpan.innerHTML = `${film.year} год`;
  }

  // Возрастное ограничение
  const ageSpan = document.querySelector(".film_item:nth-child(6) span");
  if (ageSpan && film.ratingAgeLimits) {
    let age = film.ratingAgeLimits.replace("age", "");
    ageSpan.innerHTML = `${age}+`;
  }
}

async function loadStaff(filmId) {
  try {
    const staffUrl = `${API_CONFIG.BASE_URL}/v1/staff?filmId=${filmId}`;
    const staff = await apiRequest(staffUrl);

    // Актёры
    const actorsSpan = document.querySelector(".film_item:nth-child(3) span");
    if (actorsSpan && staff?.length) {
      const actors = staff
        .filter((person) => person.professionKey === "ACTOR")
        .slice(0, 5);
      if (actors.length) {
        actorsSpan.innerHTML = actors
          .map((a) => a.nameRu || a.nameEn)
          .join(", ");
      }
    }

    // Режиссёры
    const directorsSpan = document.querySelector(
      ".film_item:nth-child(4) span",
    );
    if (directorsSpan && staff?.length) {
      const directors = staff.filter(
        (person) => person.professionKey === "DIRECTOR",
      );
      if (directors.length) {
        directorsSpan.innerHTML = directors
          .map((d) => d.nameRu || d.nameEn)
          .join(", ");
      }
    }
  } catch (error) {
    console.error("Ошибка загрузки актёров и режиссёров:", error);
  }
}

function loadTrailer(film) {
  const videoSection = document.querySelector(".video");
  if (!videoSection) return;

  let trailerUrl = null;
  if (film.videos?.trailers?.length) {
    trailerUrl = film.videos.trailers[0].url;
  } else if (film.trailerUrl) {
    trailerUrl = film.trailerUrl;
  }

  if (trailerUrl) {
    let embedUrl = trailerUrl;
    if (trailerUrl.includes("youtube.com/watch?v=")) {
      const videoId = trailerUrl.split("v=")[1].split("&")[0];
      embedUrl = `https://www.youtube.com/embed/${videoId}`;
    } else if (trailerUrl.includes("youtu.be/")) {
      const videoId = trailerUrl.split("youtu.be/")[1].split("?")[0];
      embedUrl = `https://www.youtube.com/embed/${videoId}`;
    }

    videoSection.innerHTML = `
      <h1 class="video_heading">Трейлер</h1>
      <iframe width="100%" height="400" src="${embedUrl}" frameborder="0" allowfullscreen></iframe>
    `;
  } else {
    videoSection.innerHTML = `
      <h1 class="video_heading">Трейлер</h1>
      <div class="no-trailer-message">Трейлер временно недоступен</div>
    `;
  }
}

async function loadFilmImages(filmId) {
  const photosSection = document.querySelector(".photos");
  const photosTrack = document.querySelector(".photos_slider_track");

  if (!photosTrack) return;

  try {
    const imagesUrl = `${API_CONFIG.BASE_URL}/v2.2/films/${filmId}/images?type=STILL&page=1`;
    const imagesData = await apiRequest(imagesUrl);

    if (imagesData.items?.length) {
      if (photosSection) photosSection.style.display = "block";

      photosTrack.innerHTML = "";
      imagesData.items.slice(0, 10).forEach((image) => {
        const card = document.createElement("div");
        card.className = "photos_slider_card";
        card.innerHTML = `<img src="${image.imageUrl}" alt="Кадр из фильма" onerror="this.src='/assets/gallery/poster_1.png'" />`;
        photosTrack.appendChild(card);
      });

      // Показываем кнопки
      const prevBtn = document.querySelector(".photos-prev-btn");
      const nextBtn = document.querySelector(".photos-next-btn");
      if (prevBtn) prevBtn.style.display = "flex";
      if (nextBtn) nextBtn.style.display = "flex";
    } else {
      if (photosSection) photosSection.style.display = "block";
      photosTrack.innerHTML =
        '<div class="no-content-message">Кадры из фильма отсутствуют</div>';
      const prevBtn = document.querySelector(".photos-prev-btn");
      const nextBtn = document.querySelector(".photos-next-btn");
      if (prevBtn) prevBtn.style.display = "none";
      if (nextBtn) nextBtn.style.display = "none";
    }
  } catch (error) {
    console.error("Ошибка загрузки кадров:", error);
    photosTrack.innerHTML =
      '<div class="error-message">❌ Не удалось загрузить кадры</div>';
  }
}

async function loadReviews(filmId) {
  const reviewContainer = document.querySelector(".review_container");
  if (!reviewContainer) return;

  try {
    const reviewsUrl = `${API_CONFIG.BASE_URL}/v2.2/films/${filmId}/reviews?page=1`;
    const reviewsData = await apiRequest(reviewsUrl);
    const reviews = reviewsData.items?.slice(0, 2) || [];

    if (reviews.length === 0) {
      reviewContainer.innerHTML = `
        <div class="review_card">
          <h2>Пока нет отзывов</h2>
          <p>Будьте первым, кто оценит этот фильм!</p>
        </div>
      `;
      return;
    }

    reviewContainer.innerHTML = "";
    reviews.forEach((review) => {
      const reviewCard = document.createElement("div");
      reviewCard.className = "review_card";

      const authorName = review.author || "Анонимный пользователь";
      let reviewText =
        review.description || review.review || "Нет текста отзыва";
      const shortText = truncateText(reviewText);

      const reviewType = review.type;
      let ratingValue = 0;
      if (reviewType === "POSITIVE") ratingValue = 10;
      else if (reviewType === "NEUTRAL") ratingValue = 5;
      else if (reviewType === "NEGATIVE") ratingValue = 2;

      let starsHtml = '<div class="ratting">';
      for (let i = 1; i <= 10; i++) {
        const starClass = i <= ratingValue ? "star-filled" : "star-empty";
        starsHtml += `<img class="${starClass}" src="/assets/icons/ic_round-star${starClass === "star-empty" ? "_" : ""}.svg" />`;
      }
      starsHtml += "</div>";

      let reviewClass = "";
      if (reviewType === "POSITIVE") reviewClass = "review-positive";
      if (reviewType === "NEGATIVE") reviewClass = "review-negative";
      if (reviewType === "NEUTRAL") reviewClass = "review-neutral";

      reviewCard.innerHTML = `
        <h2>${escapeHtml(authorName)}</h2>
        ${starsHtml}
        <p class="${reviewClass}">${escapeHtml(shortText)}</p>
      `;

      reviewContainer.appendChild(reviewCard);
    });
  } catch (error) {
    console.error("Ошибка загрузки отзывов:", error);
    reviewContainer.innerHTML = `
      <div class="review_card">
        <h2>Не удалось загрузить отзывы</h2>
        <p>Попробуйте позже</p>
      </div>
    `;
  }
}

function setupPhotosSlider() {
  const track = document.querySelector(".photos_slider_track");
  const prevBtn = document.querySelector(".photos-prev-btn");
  const nextBtn = document.querySelector(".photos-next-btn");

  if (track && prevBtn && nextBtn) {
    const scrollAmount = 320;
    prevBtn.addEventListener("click", () =>
      track.scrollBy({ left: -scrollAmount, behavior: "smooth" }),
    );
    nextBtn.addEventListener("click", () =>
      track.scrollBy({ left: scrollAmount, behavior: "smooth" }),
    );
  }
}

async function loadFilmPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const filmId = urlParams.get("id");

  if (!filmId) {
    const titleElement = document.querySelector(".film_title_mobile");
    if (titleElement) titleElement.innerHTML = "ID не указан";
    return;
  }

  try {
    const filmUrl = `${API_CONFIG.BASE_URL}/v2.2/films/${filmId}`;
    const film = await apiRequest(filmUrl);
    console.log("Фильм загружен:", film);

    await loadFilmInfo(film, filmId);
    await loadStaff(filmId);
    loadTrailer(film);
    await loadFilmImages(filmId);
    await loadReviews(filmId);
    setupPhotosSlider();
  } catch (error) {
    console.error("Ошибка загрузки фильма:", error);
    const titleElement = document.querySelector(".film_title");
    if (titleElement) titleElement.innerHTML = "Ошибка загрузки фильма";
  }
}

// ============================================
// 11. ОБРАБОТКА ПАРАМЕТРОВ ПОИСКА В URL
// ============================================

function checkSearchParam() {
  const urlParams = new URLSearchParams(window.location.search);
  const searchQuery = urlParams.get("search");

  if (!searchQuery) return false;

  const currentPath = window.location.pathname;
  let searchType = "MIXED";
  let pageTitle = `Результаты поиска: "${searchQuery}"`;

  if (currentPath.includes("movie_list")) {
    searchType = "FILM";
  } else if (currentPath.includes("series_list")) {
    searchType = "SERIES";
  }

  // Обновляем заголовок
  const h1 =
    document.querySelector("#pageTitle") || document.querySelector("h1");
  if (h1) h1.innerHTML = pageTitle;

  // Выполняем поиск
  performSearch(searchQuery, searchType);
  reloadSliderWithSearch(searchQuery, searchType);

  return true;
}

// ============================================
// 12. ИНИЦИАЛИЗАЦИЯ (ЗАВИСИТ ОТ СТРАНИЦЫ)
// ============================================

const currentPath = window.location.pathname;
const isMoviePage = currentPath.includes("movie.html");
const isSeriesPage = currentPath.includes("series_list");
const hasSearch = checkSearchParam();

if (isMoviePage) {
  // Загружаем страницу фильма
  loadFilmPage();
  setupSearch();
} else {
  // Загружаем основную страницу со списком фильмов
  if (!hasSearch) {
    if (isSeriesPage) {
      loadRandomMovies("SERIES");
      loadMovies(".slider_track", "SERIES", 20);
    } else {
      loadRandomMovies("FILM");
      loadMovies(".slider_track", "FILM", 20);
    }
  }

  // Запускаем обработчики
  setupSearch();
  autoFilter();
}

// ============================================
// ЭКСПОРТ ДЛЯ ТЕСТИРОВАНИЯ
// ============================================

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    // Утилиты
    getRatingValue,
    truncateText,
    escapeHtml,
    filterByType,
    // Фильтры
    filterByYear,
    filterByGenre,
    filterByCountry,
    filterByRating,
    applyFilters,
    // API
    getContent,
    searchContent,
    apiRequest,
    // UI
    createMovieCard,
    // Пагинация
    showCurrentPage,
    updatePaginationDisplay,
    // Поиск
    performSearch,
    checkSearchParam,
  };
}
