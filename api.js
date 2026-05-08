// Настройки API
const API_CONFIG = {
  BASE_URL: "https://kinopoiskapiunofficial.tech/api",
  API_KEY: "d90bf8d1-e283-426b-a2bf-e10ae8f6e6b8",
};

async function getContent(type = "FILM") {
  let url = "";

  if (type === "FILM") {
    // Фильмы - работает
    url = `${API_CONFIG.BASE_URL}/v2.2/films/top?type=TOP_100_POPULAR_FILMS&page=1`;
  } else if (type === "SERIES") {
    // Для сериалов используем другой эндпоинт
    url = `${API_CONFIG.BASE_URL}/v2.2/films?order=RATING&type=TV_SERIES&ratingFrom=7&page=1`;
  } else {
    url = `${API_CONFIG.BASE_URL}/v2.2/films/top?type=TOP_100_POPULAR_FILMS&page=1`;
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

    // Для разных эндпоинтов данные могут быть в разных полях
    if (data.films) return data.films;
    if (data.items) return data.items;

    return [];
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

async function loadMovies(containerSelector, type = "FILM", limit = 20) {
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

// Определяем тип страницы
const isSeriesPage = window.location.pathname.includes("series");

// Загружаем сетку в зависимости от страницы
if (isSeriesPage) {
  loadMovies(".movies_grid", "SERIES", 20);
} else {
  loadMovies(".movies_grid", "FILM", 20);
}

// Загружаем слайдер в зависимости от страницы
if (isSeriesPage) {
  loadMovies(".slider_track", "SERIES", 20); // Слайдер с сериалами
} else {
  loadMovies(".slider_track", "FILM", 20); // Слайдер с фильмами
}
