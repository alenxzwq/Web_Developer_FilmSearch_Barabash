// Настройки API
const API_CONFIG = {
  BASE_URL: "https://kinopoiskapiunofficial.tech/api",
  API_KEY: "d90bf8d1-e283-426b-a2bf-e10ae8f6e6b8",
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

  card.addEventListener("click", () => {
    console.log("=== КЛИК ПО КАРТОЧКЕ ===");
    console.log("Весь объект film:", film);

    // Исправлено: используем filmId вместо kinopoiskId
    const filmId = film.filmId || film.kinopoiskId;

    console.log("Найденный ID:", filmId);

    if (filmId) {
      window.location.href = `/movie/movie.html?id=${filmId}`;
    } else {
      console.error("Не удалось найти ID в объекте:", film);
    }
  });

  return card;
}

async function loadMovies(containerSelector, type = "FILM", limit = 50) {
  const container = document.querySelector(containerSelector);

  if (!container) {
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

  originalMovies = [...filteredResults];

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

const isMoviePage = window.location.pathname.includes("movie.html");

if (isMoviePage) {
  const urlParams = new URLSearchParams(window.location.search);
  const filmId = urlParams.get("id");

  console.log("Страница фильма, ID:", filmId);

  async function loadFilmPage() {
    if (!filmId) {
      const titleElement = document.querySelector(".film_title_mobile");
      if (titleElement) titleElement.innerHTML = "ID не указан";
      return;
    }

    try {
      // Загружаем основную информацию о фильме
      const filmUrl = `${API_CONFIG.BASE_URL}/v2.2/films/${filmId}`;
      const filmResponse = await fetch(filmUrl, {
        headers: {
          "X-API-KEY": API_CONFIG.API_KEY,
          "Content-Type": "application/json",
        },
      });
      const film = await filmResponse.json();
      console.log("Фильм загружен:", film);

      console.log("Проверка трейлера:", {
        "videos.trailers": film.videos?.trailers,
        trailerUrl: film.trailerUrl,
      });

      // 1. Заполняем заголовки
      const title =
        film.nameRu ||
        film.nameEn ||
        film.nameOriginal ||
        "Название неизвестно";

      const titleMobile = document.querySelector(".film_title_mobile");
      if (titleMobile) titleMobile.innerHTML = title;

      const titleDesktop = document.querySelector(".film_title");
      if (titleDesktop) titleDesktop.innerHTML = title;

      // 2. Заполняем рейтинг
      const rating =
        film.ratingKinopoisk || film.ratingImdb || film.rating || "Нет";
      const ratingValue = rating === "Нет" ? 10 : parseFloat(rating);
      const ratingClass = ratingValue < 8.6 ? "rating-low" : "";
      const ratingText =
        rating === "Нет" ? "Нет" : parseFloat(rating).toFixed(1);

      const ratingDiv = document.querySelector(".style_card_ratting");
      if (ratingDiv) {
        ratingDiv.innerHTML = `<p>${ratingText}</p>`;
        if (ratingClass) ratingDiv.classList.add(ratingClass);
      }

      // 3. Заполняем постер
      const posterUrl =
        film.posterUrl ||
        film.posterUrlPreview ||
        "/assets/gallery/poster_1.png";
      const posterImg = document.querySelector(".film_poster img");
      if (posterImg) {
        posterImg.src = posterUrl;
        posterImg.alt = title;
      }

      // 4. Заполняем жанры
      const genresSpan = document.querySelector(".film_item:first-child span");
      if (genresSpan && film.genres && film.genres.length > 0) {
        const genresList = film.genres.map((g) => g.genre).join(", ");
        genresSpan.innerHTML = genresList;
      }

      // 5. Заполняем страны
      const countrySpan = document.querySelector(
        ".film_item:nth-child(2) span",
      );
      if (countrySpan && film.countries && film.countries.length > 0) {
        const countriesList = film.countries.map((c) => c.country).join(", ");
        countrySpan.innerHTML = countriesList;
      }

      // 6. Загружаем актёров и режиссёров
      try {
        const staffUrl = `${API_CONFIG.BASE_URL}/v1/staff?filmId=${filmId}`;
        const staffResponse = await fetch(staffUrl, {
          headers: {
            "X-API-KEY": API_CONFIG.API_KEY,
            "Content-Type": "application/json",
          },
        });
        const staff = await staffResponse.json();
        console.log("Актёры/режиссёры:", staff);

        // Актёры
        const actorsSpan = document.querySelector(
          ".film_item:nth-child(3) span",
        );
        if (actorsSpan && staff && staff.length > 0) {
          const actors = staff
            .filter((person) => person.professionKey === "ACTOR")
            .slice(0, 5);
          if (actors.length > 0) {
            actorsSpan.innerHTML = actors
              .map((a) => a.nameRu || a.nameEn)
              .join(", ");
          }
        }

        // Режиссёры
        const directorsSpan = document.querySelector(
          ".film_item:nth-child(4) span",
        );
        if (directorsSpan && staff && staff.length > 0) {
          const directors = staff.filter(
            (person) => person.professionKey === "DIRECTOR",
          );
          if (directors.length > 0) {
            directorsSpan.innerHTML = directors
              .map((d) => d.nameRu || d.nameEn)
              .join(", ");
          }
        }
      } catch (error) {
        console.error("Ошибка загрузки актёров:", error);
      }

      // 7. Заполняем дату релиза
      const releaseSpan = document.querySelector(
        ".film_item:nth-child(5) span",
      );
      if (releaseSpan && film.year) {
        releaseSpan.innerHTML = `${film.year} год`;
      }

      // 8. Заполняем возрастное ограничение
      const ageSpan = document.querySelector(".film_item:nth-child(6) span");
      if (ageSpan && film.ratingAgeLimits) {
        let age = film.ratingAgeLimits.replace("age", "");
        ageSpan.innerHTML = `${age}+`;
      }

      // ========== ТРЕЙЛЕР ==========
      let trailerUrl = null;

      if (
        film.videos &&
        film.videos.trailers &&
        film.videos.trailers.length > 0
      ) {
        trailerUrl = film.videos.trailers[0].url;
      } else if (film.trailerUrl) {
        trailerUrl = film.trailerUrl;
      }

      const videoSection = document.querySelector(".video");

      if (videoSection) {
        if (trailerUrl) {
          // Показываем трейлер
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
      <iframe 
        width="100%" 
        height="400" 
        src="${embedUrl}" 
        frameborder="0" 
        allowfullscreen>
      </iframe>
    `;
        } else {
          // Показываем сообщение, что трейлера нет
          videoSection.innerHTML = `
      <h1 class="video_heading">Трейлер</h1>
      <div style="background: #f0f0f0; height: 200px; display: flex; align-items: center; justify-content: center;">
        Трейлер временно недоступен
      </div>
    `;
        }
      }

      // ========== ФОТОГАЛЕРЕЯ ==========
      // ========== ФОТОГАЛЕРЕЯ (с сообщением вместо скрытия) ==========
      try {
        const imagesUrl = `${API_CONFIG.BASE_URL}/v2.2/films/${filmId}/images?type=STILL&page=1`;
        const imagesResponse = await fetch(imagesUrl, {
          headers: {
            "X-API-KEY": API_CONFIG.API_KEY,
            "Content-Type": "application/json",
          },
        });
        const imagesData = await imagesResponse.json();

        console.log("Кадры из фильма:", imagesData);

        const photosSection = document.querySelector(".photos");
        const photosTrack = document.querySelector(".photos_slider_track");

        if (photosTrack && imagesData.items && imagesData.items.length > 0) {
          // Если кадры есть - показываем их
          if (photosSection) photosSection.style.display = "block";

          photosTrack.innerHTML = "";
          imagesData.items.slice(0, 10).forEach((image) => {
            const card = document.createElement("div");
            card.className = "photos_slider_card";
            card.innerHTML = `<img src="${image.imageUrl}" alt="Кадр из фильма" onerror="this.src='/assets/gallery/poster_1.png'" />`;
            photosTrack.appendChild(card);
          });

          // Показываем кнопки слайдера
          const prevBtn = document.querySelector(".photos-prev-btn");
          const nextBtn = document.querySelector(".photos-next-btn");
          if (prevBtn) prevBtn.style.display = "flex";
          if (nextBtn) nextBtn.style.display = "flex";
        } else {
          // Если кадров нет - показываем сообщение
          if (photosSection) {
            photosSection.style.display = "block";
            photosTrack.innerHTML = `
        <div style="width:100%; text-align:center; padding:40px; background:#f5f5f5; border-radius:10px;">
          📷 Кадры из фильма отсутствуют
        </div>
      `;

            // Скрываем кнопки слайдера
            const prevBtn = document.querySelector(".photos-prev-btn");
            const nextBtn = document.querySelector(".photos-next-btn");
            if (prevBtn) prevBtn.style.display = "none";
            if (nextBtn) nextBtn.style.display = "none";
          }
          console.log("Нет кадров для этого фильма");
        }
      } catch (error) {
        console.error("Ошибка загрузки кадров:", error);
        const photosSection = document.querySelector(".photos");
        if (photosSection) {
          const photosTrack = document.querySelector(".photos_slider_track");
          if (photosTrack) {
            photosTrack.innerHTML = `
        <div style="width:100%; text-align:center; padding:40px; background:#f5f5f5; border-radius:10px;">
          ❌ Не удалось загрузить кадры
        </div>
      `;
          }
        }
      }

      // ========== ОТЗЫВЫ ==========
      // ========== ОТЗЫВЫ ==========
      try {
        const reviewsUrl = `${API_CONFIG.BASE_URL}/v2.2/films/${filmId}/reviews?page=1`;
        const reviewsResponse = await fetch(reviewsUrl, {
          headers: {
            "X-API-KEY": API_CONFIG.API_KEY,
            "Content-Type": "application/json",
          },
        });
        const reviewsData = await reviewsResponse.json();

        console.log("Отзывы:", reviewsData);

        const reviewContainer = document.querySelector(".review_container");
        if (reviewContainer) {
          // Берём только 2 отзыва
          const reviews = reviewsData.items?.slice(0, 2) || [];

          if (reviews.length > 0) {
            reviewContainer.innerHTML = "";

            reviews.forEach((review) => {
              const reviewCard = document.createElement("div");
              reviewCard.className = "review_card";

              // Имя автора
              const authorName = review.author || "Анонимный пользователь";

              // Текст отзыва - лежит в поле description
              let reviewText =
                review.description || review.review || "Нет текста отзыва";

              // ОБРЕЗАЕМ ТЕКСТ: максимум 300 символов, обрезаем по пробелу
              const maxLength = 300;
              let shortText = reviewText;

              if (reviewText.length > maxLength) {
                // Обрезаем до maxLength символов
                let cutText = reviewText.substring(0, maxLength);
                // Находим последний пробел, чтобы не обрезать слово
                const lastSpace = cutText.lastIndexOf(" ");
                if (lastSpace > 0) {
                  cutText = cutText.substring(0, lastSpace);
                }
                shortText = cutText + "...";
              }

              // Тип отзыва (POSITIVE, NEGATIVE, NEUTRAL)
              const reviewType = review.type;

              // Определяем количество звёзд на основе типа
              let ratingValue = 0;
              if (reviewType === "POSITIVE") {
                ratingValue = 10; // 10 звёзд
              } else if (reviewType === "NEUTRAL") {
                ratingValue = 5; // 5 звёзд
              } else if (reviewType === "NEGATIVE") {
                ratingValue = 2; // 2 звезды
              }

              // Создаём звёзды (10 звёзд)
              let starsHtml = '<div class="ratting">';
              for (let i = 1; i <= 10; i++) {
                if (i <= ratingValue) {
                  starsHtml +=
                    '<img class="star-filled" src="/assets/icons/ic_round-star.svg" />';
                } else {
                  starsHtml +=
                    '<img class="star-empty" src="/assets/icons/ic_round-star_.svg" />';
                }
              }
              starsHtml += "</div>";

              // Добавляем класс для цвета отзыва (опционально)
              let reviewClass = "";
              if (reviewType === "POSITIVE") reviewClass = "review-positive";
              if (reviewType === "NEGATIVE") reviewClass = "review-negative";
              if (reviewType === "NEUTRAL") reviewClass = "review-neutral";

              reviewCard.innerHTML = `
          <h2>${authorName}</h2>
          ${starsHtml}
          <p class="${reviewClass}">${shortText}</p>
        `;

              reviewContainer.appendChild(reviewCard);
            });
          } else {
            reviewContainer.innerHTML = `
        <div class="review_card">
          <h2>Пока нет отзывов</h2>
          <p>Будьте первым, кто оценит этот фильм!</p>
        </div>
      `;
          }
        }
      } catch (error) {
        console.error("Ошибка загрузки отзывов:", error);
        const reviewContainer = document.querySelector(".review_container");
        if (reviewContainer) {
          reviewContainer.innerHTML = `
      <div class="review_card">
        <h2>Не удалось загрузить отзывы</h2>
        <p>Попробуйте позже</p>
      </div>
    `;
        }
      }

      function escapeHtml(text) {
        if (!text) return "";
        return text
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");
      }

      // ========== СЛАЙДЕР ФОТО ==========
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
      setupPhotosSlider();
    } catch (error) {
      console.error("Ошибка загрузки:", error);
      const titleElement = document.querySelector(".film_title");
      if (titleElement) titleElement.innerHTML = "Ошибка загрузки фильма";
    }
  }

  loadFilmPage();
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
