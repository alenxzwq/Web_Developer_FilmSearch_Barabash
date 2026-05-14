/**
 * @jest-environment jsdom
 */

// ============================================
// 1. ПОЛНАЯ НАСТРОЙКА ОКРУЖЕНИЯ
// ============================================

// Мок для fetch - ДОЛЖЕН БЫТЬ НАСТРОЕН ДО ИМПОРТА
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ films: [] }),
});

// Мок для localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
  removeItem: jest.fn(),
};
global.localStorage = localStorageMock;

// Мок для matchMedia
global.matchMedia = jest.fn().mockImplementation((query) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
}));

// Мок для window.location - чтобы избежать ошибок навигации
delete window.location;
window.location = {
  href: "",
  pathname: "/",
  search: "",
  reload: jest.fn(),
};

// Создаем минимальный DOM для тестов
document.body.innerHTML = `
  <div class="movies_grid"></div>
  <div class="slider_track"></div>
  <div class="pages"></div>
  <input class="search-input" type="text" value="" />
  <button class="search_btn">Поиск</button>
  <select id="yearFilter">
    <option value="">Все годы</option>
    <option value="2023">2023</option>
  </select>
  <select id="genreFilter">
    <option value="">Все жанры</option>
    <option value="комедия">Комедия</option>
  </select>
  <select id="countryFilter">
    <option value="">Все страны</option>
    <option value="США">США</option>
  </select>
  <select id="ratingFilter">
    <option value="">Любой рейтинг</option>
    <option value="8">От 8</option>
  </select>
  <div class="film_title_mobile"></div>
  <div class="film_title"></div>
  <div class="film_poster"><img /></div>
  <div class="video"></div>
  <div class="photos"></div>
  <div class="photos_slider_track"></div>
  <div class="review_container"></div>
  <button class="photos-prev-btn"></button>
  <button class="photos-next-btn"></button>
  <h1 id="pageTitle"></h1>
  <h1></h1>
`;

// Подавляем console.error в тестах
console.error = jest.fn();

// Импортируем функции
const scripts = require("../api");

// ============================================
// 2. ТЕСТЫ ФУНКЦИЙ
// ============================================

describe("Unit-тесты функций", () => {
  describe("getRatingValue", () => {
    test("возвращает корректный рейтинг из строки", () => {
      expect(scripts.getRatingValue({ rating: "8.5" })).toBe(8.5);
    });

    test("возвращает корректный рейтинг из числа", () => {
      expect(scripts.getRatingValue({ rating: 9 })).toBe(9);
    });

    test("возвращает 0 если рейтинга нет", () => {
      expect(scripts.getRatingValue({})).toBe(0);
      expect(scripts.getRatingValue({ rating: null })).toBe(0);
      expect(scripts.getRatingValue({ rating: "N/A" })).toBe(0);
    });
  });

  describe("truncateText", () => {
    test("обрезает длинный текст и добавляет многоточие", () => {
      const longText = "А".repeat(400);
      const result = scripts.truncateText(longText, 300);
      expect(result.length).toBeLessThanOrEqual(303);
      expect(result.endsWith("...")).toBe(true);
    });

    test("не обрезает короткий текст", () => {
      const shortText = "Короткий текст";
      expect(scripts.truncateText(shortText, 300)).toBe(shortText);
    });

    test("обрабатывает null и пустую строку", () => {
      expect(scripts.truncateText(null)).toBe(null);
      expect(scripts.truncateText("")).toBe("");
    });
  });

  describe("escapeHtml", () => {
    test("экранирует HTML теги", () => {
      const result = scripts.escapeHtml('<script>alert("xss")</script>');
      expect(result).not.toContain("<script>");
      expect(result).toContain("&lt;script&gt;");
    });

    test("возвращает пустую строку для null", () => {
      expect(scripts.escapeHtml(null)).toBe("");
    });
  });

  describe("filterByType", () => {
    const items = [{ type: "FILM" }, { type: "TV_SERIES" }, { type: "FILM" }];

    test("фильтрует только фильмы", () => {
      const result = scripts.filterByType(items, "FILM");
      expect(result).toHaveLength(2);
    });

    test("фильтрует только сериалы", () => {
      const result = scripts.filterByType(items, "SERIES");
      expect(result).toHaveLength(1);
    });

    test("возвращает все при MIXED", () => {
      const result = scripts.filterByType(items, "MIXED");
      expect(result).toHaveLength(3);
    });
  });

  describe("filterByYear", () => {
    const movies = [{ year: "2023" }, { year: "2022" }, { year: "2023" }];

    test("фильтрует по году", () => {
      const result = scripts.filterByYear(movies, "2023");
      expect(result).toHaveLength(2);
    });

    test("возвращает все если год не указан", () => {
      const result = scripts.filterByYear(movies, "");
      expect(result).toHaveLength(3);
    });
  });

  describe("filterByGenre", () => {
    const movies = [
      { genres: [{ genre: "комедия" }] },
      { genres: [{ genre: "драма" }] },
      { genres: [{ genre: "комедия" }] },
    ];

    test("фильтрует по жанру", () => {
      const result = scripts.filterByGenre(movies, "комедия");
      expect(result).toHaveLength(2);
    });
  });

  describe("filterByCountry", () => {
    const movies = [
      { countries: [{ country: "США" }] },
      { countries: [{ country: "Россия" }] },
      { countries: [{ country: "США" }] },
    ];

    test("фильтрует по стране", () => {
      const result = scripts.filterByCountry(movies, "США");
      expect(result).toHaveLength(2);
    });
  });

  describe("filterByRating", () => {
    const movies = [{ rating: 9 }, { rating: 7 }, { rating: 8 }];

    test("фильтрует по минимальному рейтингу", () => {
      const result = scripts.filterByRating(movies, 8);
      expect(result).toHaveLength(2);
    });
  });
});

// ============================================
// 3. ТЕСТЫ GET-ЗАПРОСОВ
// ============================================

describe("GET-запросы", () => {
  beforeEach(() => {
    fetch.mockClear();
    console.error.mockClear();
  });

  test("apiRequest отправляет GET-запрос с правильными заголовками", async () => {
    const mockResponse = { test: "data" };
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await scripts.apiRequest("https://api.test.com/endpoint");

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      "https://api.test.com/endpoint",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          "X-API-KEY": expect.any(String),
          "Content-Type": "application/json",
        }),
      }),
    );
    expect(result).toEqual(mockResponse);
  });

  test("apiRequest обрабатывает ошибку ответа", async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    await expect(
      scripts.apiRequest("https://api.test.com/endpoint"),
    ).rejects.toThrow("HTTP 404: Not Found");
  });

  test("getContent загружает фильмы через GET-запрос", async () => {
    const mockFilms = [{ nameRu: "Фильм 1" }, { nameRu: "Фильм 2" }];

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ films: mockFilms }),
    });

    const result = await scripts.getContent("FILM", 1, 10);

    expect(fetch).toHaveBeenCalled();
    expect(result).toEqual(mockFilms);
  });

  test("searchContent отправляет GET-запрос поиска", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ films: [] }),
    });

    await scripts.searchContent("тест");

    const callUrl = fetch.mock.calls[0][0];
    expect(callUrl).toContain("search-by-keyword");
    expect(callUrl).toContain(encodeURIComponent("тест"));
  });

  test("getContent обрабатывает ошибку сети", async () => {
    fetch.mockRejectedValueOnce(new Error("Network error"));

    const result = await scripts.getContent("FILM", 1, 10);

    expect(result).toEqual([]);
  });
});

// ============================================
// 4. ТЕСТЫ ОБРАБОТКИ ОТВЕТОВ API
// ============================================

describe("Обработка ответов API", () => {
  test("createMovieCard правильно обрабатывает данные из ответа", () => {
    const filmData = {
      nameRu: "Тестовый фильм",
      rating: "9.5",
      posterUrlPreview: "https://example.com/poster.jpg",
      kinopoiskId: 12345,
    };

    const card = scripts.createMovieCard(filmData);

    expect(card.querySelector(".style_card_name p").textContent).toBe(
      "Тестовый фильм",
    );
    expect(card.querySelector(".style_card_ratting p").textContent).toContain(
      "9.5",
    );
  });

  test("createMovieCard использует fallback для постера", () => {
    const filmData = {
      nameRu: "Тест",
      kinopoiskId: 123,
    };

    const card = scripts.createMovieCard(filmData);
    const img = card.querySelector("img");
    expect(img.src).toContain("poster_1.png");
  });
});

// ============================================
// 5. ТЕСТЫ ПАГИНАЦИИ
// ============================================

describe("Пагинация", () => {
  beforeEach(() => {
    window.currentMovieList = Array(20)
      .fill()
      .map((_, i) => ({
        nameRu: `Фильм ${i}`,
        rating: "8.0",
        kinopoiskId: i,
      }));
    window.currentPage = 1;

    document.body.innerHTML =
      '<div class="pages"></div><div class="movies_grid"></div>';
  });

  test("updatePaginationDisplay создает кнопки пагинации", () => {
    expect(() => scripts.updatePaginationDisplay()).not.toThrow();
  });

  test("showCurrentPage отображает фильмы", () => {
    expect(() => scripts.showCurrentPage()).not.toThrow();
  });
});

// ============================================
// 6. ИСПРАВЛЕНИЕ ОШИБОК В КОДЕ
// ============================================

describe("Исправление ошибок в коде", () => {
  test("filterByYear не падает с null значениями", () => {
    expect(() => scripts.filterByYear(null, "2023")).not.toThrow();
    expect(() => scripts.filterByYear(undefined, "2023")).not.toThrow();
  });

  test("filterByGenre не падает с отсутствующими жанрами", () => {
    const movies = [{}, { genres: null }, { genres: undefined }];
    expect(() => scripts.filterByGenre(movies, "комедия")).not.toThrow();
  });

  test("createMovieCard обрабатывает отсутствие ID", () => {
    const film = { nameRu: "Тест" };
    const card = scripts.createMovieCard(film);
    expect(card).toBeDefined();
  });
});
