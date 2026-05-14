// 1. КОНФИГУРАЦИЯ API

// Базовые настройки для работы с API Кинопоиска
const API_CONFIG = {
  BASE_URL: "https://kinopoiskapiunofficial.tech/api",
  API_KEY: "d90bf8d1-e283-426b-a2bf-e10ae8f6e6b8",
};

// 2. ГЛОБАЛЬНОЕ СОСТОЯНИЕ ПРИЛОЖЕНИЯ
let currentMovieList = []; // Текущий список фильмов для отображения
let currentPage = 1; // Текущая страница пагинации
const PAGINATION_LIMIT = 9; // Количество фильмов на одной странице

// 3. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
/**
 * Универсальный метод для API-запросов
 * @param {string} url - URL для запроса
 * @returns {Promise<Object>} - Promise с данными ответа
 * @throws {Error} - Если запрос не удался
 */
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

/**
 * Отображает индикатор загрузки в контейнере
 * @param {HTMLElement} container - DOM-элемент для отображения
 * @param {string} message - Текст загрузки
 */
function showLoading(container, message = "Загрузка...") {
  if (!container) return;
  container.innerHTML = `<div class="loading-message">${message}</div>`;
}

/**
 * Отображает сообщение об ошибке
 * @param {HTMLElement} container - DOM-элемент для отображения
 * @param {string} message - Текст ошибки
 */
function showError(container, message = "Ошибка загрузки") {
  if (!container) return;
  container.innerHTML = `<div class="error-message">${message}</div>`;
}

/**
 * Экранирует HTML-теги для предотвращения XSS-атак
 * @param {string} text - Исходный текст
 * @returns {string} - Безопасный текст
 */
function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Извлекает числовое значение рейтинга из объекта фильма
 * @param {Object} film - Объект фильма
 * @returns {number} - Числовой рейтинг (0 если нет)
 */
function getRatingValue(film) {
  const rating = film.rating;
  if (rating === undefined || rating === null || isNaN(parseFloat(rating))) {
    return 0;
  }
  return parseFloat(rating);
}

/**
 * Обрезает длинный текст до указанной длины (по словам)
 * @param {string} text - Исходный текст
 * @param {number} maxLength - Максимальная длина
 * @returns {string} - Обрезанный текст с многоточием
 */
function truncateText(text, maxLength = 300) {
  if (!text || text.length <= maxLength) return text;

  let cutText = text.substring(0, maxLength);
  const lastSpace = cutText.lastIndexOf(" ");
  if (lastSpace > 0) {
    cutText = cutText.substring(0, lastSpace);
  }
  return cutText + "...";
}

// 4. API ЗАПРОСЫ К КИНОПОИСКУ
/**
 * Формирует URL для запроса в зависимости от типа контента
 * @param {string} type - Тип контента: "FILM" или "SERIES"
 * @param {number} page - Номер страницы
 * @returns {string} - Сформированный URL
 */
function buildContentUrl(type, page) {
  const urls = {
    FILM: `${API_CONFIG.BASE_URL}/v2.2/films/top?type=TOP_100_POPULAR_FILMS&page=${page}`,

    SERIES: `${API_CONFIG.BASE_URL}/v2.2/films?order=RATING&type=TV_SERIES&ratingFrom=7&page=${page}`,
  };
  return urls[type] || urls.FILM;
}

/**
 * Загружает контент (фильмы или сериалы) с пагинацией
 * @param {string} type - Тип контента
 * @param {number} page - Номер страницы
 * @param {number} limit - Лимит элементов
 * @returns {Promise<Array>} - Массив фильмов
 */
async function getContent(type = "FILM", page = 1, limit = 100) {
  const url = buildContentUrl(type, page);

  try {
    const data = await apiRequest(url);
    let results = data.films || data.items || [];

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

/**
 * Поиск фильмов/сериалов по ключевому слову
 * @param {string} query - Поисковый запрос
 * @returns {Promise<Array>} - Массив найденных фильмов
 */
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

/**
 * Фильтрует контент по типу (фильмы/сериалы)
 * @param {Array} items - Массив элементов
 * @param {string} type - Тип фильтрации
 * @returns {Array} - Отфильтрованный массив
 */
function filterByType(items, type) {
  if (type === "FILM") {
    return items.filter((item) => item.type !== "TV_SERIES");
  } else if (type === "SERIES") {
    return items.filter((item) => item.type === "TV_SERIES");
  }
  return items;
}

// 5. UI КОМПОНЕНТЫ И КАРТОЧКИ
/**
 * Создаёт DOM-элемент карточки фильма
 * @param {Object} film - Объект фильма
 * @returns {HTMLElement} - Готовая карточка для вставки в DOM
 */
function createMovieCard(film) {
  const card = document.createElement("div");
  card.className = "style_card";

  // Обработка рейтинга
  const rating = getRatingValue(film);
  const ratingText = rating === 0 ? "Нет" : rating.toFixed(1);
  const ratingClass = rating !== 0 && rating < 8.6 ? "rating-low" : "";

  // Обработка названия и постера
  const title =
    film.nameRu || film.nameEn || film.nameOriginal || "Название неизвестно";
  const posterUrl =
    film.posterUrlPreview || film.posterUrl || "/assets/gallery/poster_1.png";

  // Формируем HTML карточки
  card.innerHTML = `
    <div class="style_card_ratting ${ratingClass}">
      <p>${escapeHtml(ratingText)}</p>
    </div>
    <div class="style_card_name">
      <p>${escapeHtml(title)}</p>
    </div>
    <img src="${posterUrl}" alt="${escapeHtml(title)}" onerror="this.src='/assets/gallery/poster_1.png'" />
  `;

  // Клик по карточке
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

/**
 * Загружает фильмы в указанный контейнер (используется для слайдера)
 * @param {string} containerSelector - CSS-селектор контейнера
 * @param {string} type - Тип контента ("FILM" или "SERIES")
 * @param {number} limit - Максимальное количество фильмов
 */
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

  // Отрисовка карточек
  container.innerHTML = "";
  items.slice(0, limit).forEach((item) => {
    container.appendChild(createMovieCard(item));
  });
}

// 6. ПАГИНАЦИЯ ДЛЯ ОСНОВНОГО СПИСКА
/**
 * Обновляет отображение кнопок страниц
 * Кнопки создаются динамически на основе количества страниц
 */
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

  // Создаём кнопки для каждой страницы
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

/**
 * Отображает текущую страницу с фильмами
 * Использует глобальные переменные currentMovieList и currentPage
 */
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

// 7. ПОИСК И ОБРАБОТКА URL-ПАРАМЕТРОВ
/**
 * Выполняет поиск по запросу и обновляет список фильмов
 * @param {string} query - Поисковый запрос
 * @param {string} searchType - Тип поиска ("FILM", "SERIES", "MIXED")
 */
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

/**
 * Обновляет слайдер результатами поиска
 * @param {string} query - Поисковый запрос
 * @param {string} type - Тип контента
 */
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

/**
 * Настраивает обработчики поисковой строки
 */
function setupSearch() {
  const searchInput = document.querySelector(".search-input");
  const searchBtn = document.querySelector(".search_btn");

  if (!searchBtn || !searchInput) return;

  const redirectToSearchPage = () => {
    const query = searchInput.value.trim();
    if (!query) return;

    const currentPath = window.location.pathname;
    let searchUrl = "/search_results/search_results.html";

    // Определяем правильную страницу
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

// 8. ФИЛЬТРАЦИЯ КОНТЕНТА
/**
 * Фильтрация по году выпуска
 * @param {Array} movies - Массив фильмов
 * @param {string} year - Год для фильтрации
 * @returns {Array} - Отфильтрованный массив
 */
function filterByYear(movies, year) {
  if (!movies || !Array.isArray(movies)) return [];
  if (!year || year === "") return movies;
  const yearNum = parseInt(year);
  return movies.filter((movie) => parseInt(movie.year) === yearNum);
}

/**
 * Фильтрация по жанру
 * @param {Array} movies - Массив фильмов
 * @param {string} genre - Жанр для фильтрации
 * @returns {Array} - Отфильтрованный массив
 */
function filterByGenre(movies, genre) {
  if (!movies || !Array.isArray(movies)) return [];
  if (!genre || genre === "") return movies;
  return movies.filter((movie) =>
    movie.genres?.some((g) => g.genre.toLowerCase() === genre.toLowerCase()),
  );
}

/**
 * Фильтрация по стране
 * @param {Array} movies - Массив фильмов
 * @param {string} country - Страна для фильтрации
 * @returns {Array} - Отфильтрованный массив
 */
function filterByCountry(movies, country) {
  if (!movies || !Array.isArray(movies)) return [];
  if (!country || country === "") return movies;
  return movies.filter((movie) =>
    movie.countries?.some((c) =>
      c.country.toLowerCase().includes(country.toLowerCase()),
    ),
  );
}

/**
 * Фильтрация по минимальному рейтингу
 * @param {Array} movies - Массив фильмов
 * @param {string} minRating - Минимальный рейтинг
 * @returns {Array} - Отфильтрованный массив
 */
function filterByRating(movies, minRating) {
  if (!movies || !Array.isArray(movies)) return [];
  if (!minRating || minRating === "") return movies;
  return movies.filter((movie) => (movie.rating || 0) >= parseInt(minRating));
}

/**
 * Применяет все активные фильтры к текущему списку
 * Вызывается при изменении любого фильтра
 */
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

/**
 * Навешивает обработчики на элементы фильтров
 * При изменении значения фильтра автоматически применяются все фильтры
 */
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

// 9. ЗАГРУЗКА СЛУЧАЙНЫХ ФИЛЬМОВ ДЛЯ ГЛАВНОЙ СТРАНИЦЫ
/**
 * Загружает случайные фильмы для отображения в основном списке
 * Перемешивает массив и сортирует по рейтингу
 * @param {string} type - Тип контента ("FILM" или "SERIES")
 */
async function loadRandomMovies(type = "FILM") {
  const container = document.querySelector(".movies_grid");
  if (!container) return;

  showLoading(container, "Загрузка...");

  let items = await getContent(type);

  if (!items || items.length === 0) {
    showError(container, "Ошибка загрузки");
    return;
  }

  // Сохраняем оригинальный список для фильтров
  window.originalMovies = [...items];

  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }

  // Сортировка по убыванию рейтинга
  items.sort(
    (a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0),
  );

  currentMovieList = items.slice(0, 50);
  currentPage = 1;
  showCurrentPage();
}

// 10. СТРАНИЦА ДЕТАЛЬНОГО ПРОСМОТРА ФИЛЬМА
/**
 * Загружает основную информацию о фильме и заполняет DOM
 * @param {Object} film - Объект фильма
 * @param {number} filmId - ID фильма
 */
async function loadFilmInfo(film, filmId) {
  const title =
    film.nameRu || film.nameEn || film.nameOriginal || "Название неизвестно";

  const titleMobile = document.querySelector(".film_title_mobile");
  const titleDesktop = document.querySelector(".film_title");
  if (titleMobile) titleMobile.innerHTML = escapeHtml(title);
  if (titleDesktop) titleDesktop.innerHTML = escapeHtml(title);

  // Обработка рейтинга и его стилизации
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

  // Постер фильма
  const posterUrl =
    film.posterUrl || film.posterUrlPreview || "/assets/gallery/poster_1.png";
  const posterImg = document.querySelector(".film_poster img");
  if (posterImg) {
    posterImg.src = posterUrl;
    posterImg.alt = escapeHtml(title);
  }

  // Информационные поля (жанры, страны, год, возрастной рейтинг)
  const genresSpan = document.querySelector(".film_item:first-child span");
  if (genresSpan && film.genres?.length) {
    genresSpan.innerHTML = film.genres.map((g) => g.genre).join(", ");
  }

  const countrySpan = document.querySelector(".film_item:nth-child(2) span");
  if (countrySpan && film.countries?.length) {
    countrySpan.innerHTML = film.countries.map((c) => c.country).join(", ");
  }

  const releaseSpan = document.querySelector(".film_item:nth-child(5) span");
  if (releaseSpan && film.year) {
    releaseSpan.innerHTML = `${film.year} год`;
  }

  const ageSpan = document.querySelector(".film_item:nth-child(6) span");
  if (ageSpan && film.ratingAgeLimits) {
    let age = film.ratingAgeLimits.replace("age", "");
    ageSpan.innerHTML = `${age}+`;
  }
}

/**
 * Загружает актёров и режиссёров фильма
 * @param {number} filmId - ID фильма
 */
async function loadStaff(filmId) {
  try {
    const staffUrl = `${API_CONFIG.BASE_URL}/v1/staff?filmId=${filmId}`;
    const staff = await apiRequest(staffUrl);

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

/**
 * Загружает и отображает трейлер фильма
 * Поддерживает YouTube ссылки в разных форматах
 * @param {Object} film - Объект фильма
 */
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
    // Конвертация разных форматов YouTube ссылок в embed-формат
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

/**
 * Загружает кадры из фильма (скриншоты) в слайдер
 * @param {number} filmId - ID фильма
 */
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

/**
 * Загружает отзывы на фильм (до 2 штук)
 * @param {number} filmId - ID фильма
 */
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

      // Конвертация типа отзыва в звёзды
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

/**
 * Настраивает навигацию в слайдере кадров
 * При клике на кнопки происходит плавная прокрутка
 */
function setupPhotosSlider() {
  const track = document.querySelector(".photos_slider_track");
  const prevBtn = document.querySelector(".photos-prev-btn");
  const nextBtn = document.querySelector(".photos-next-btn");

  if (track && prevBtn && nextBtn) {
    const scrollAmount = 320; // Ширина карточки + отступ
    prevBtn.addEventListener("click", () =>
      track.scrollBy({ left: -scrollAmount, behavior: "smooth" }),
    );
    nextBtn.addEventListener("click", () =>
      track.scrollBy({ left: scrollAmount, behavior: "smooth" }),
    );
  }
}

/**
 * Главная функция загрузки страницы фильма
 * Определяет ID из URL и последовательно загружает все данные
 */
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

    // Последовательная загрузка всех данных
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

// 11. ОБРАБОТКА URL-ПАРАМЕТРОВ ПОИСКА
/**
 * Проверяет наличие параметра поиска в URL
 * Если есть - выполняет поиск и обновляет страницу
 * @returns {boolean} - Был ли выполнен поиск
 */
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

  // Выполняем поиск в основном списке и слайдере
  performSearch(searchQuery, searchType);
  reloadSliderWithSearch(searchQuery, searchType);

  return true;
}

// 12. ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
// Здесь определяется, на какой странице мы находимся
const currentPath = window.location.pathname;
const isMoviePage = currentPath.includes("movie.html");
const isSeriesPage = currentPath.includes("series_list");
const hasSearch = checkSearchParam();

if (isMoviePage) {
  loadFilmPage();
  setupSearch();
} else {
  // Страница со списком фильмов/сериалов
  if (!hasSearch) {
    if (isSeriesPage) {
      // Загрузка сериалов для основной сетки и слайдера
      loadRandomMovies("SERIES");
      loadMovies(".slider_track", "SERIES", 20);
    } else {
      // Загрузка фильмов для основной сетки и слайдера
      loadRandomMovies("FILM");
      loadMovies(".slider_track", "FILM", 20);
    }
  }
  setupSearch();
  autoFilter();
}

// 13. ЭКСПОРТ ДЛЯ ТЕСТИРОВАНИЯ
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    getRatingValue,
    truncateText,
    escapeHtml,
    filterByType,
    filterByYear,
    filterByGenre,
    filterByCountry,
    filterByRating,
    applyFilters,
    getContent,
    searchContent,
    apiRequest,
    createMovieCard,
    showCurrentPage,
    updatePaginationDisplay,
    performSearch,
    checkSearchParam,
  };
}
