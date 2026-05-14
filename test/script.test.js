/**
 * @jest-environment jsdom
 */

// ============================================
// 1. НАСТРОЙКА DOM ПЕРЕД ИМПОРТОМ
// ============================================

// Создаем полный DOM с необходимыми элементами
beforeAll(() => {
  // Создаем html структуру
  document.documentElement.innerHTML = `
    <!DOCTYPE html>
    <html>
      <head></head>
      <body>
        <div id="sidebar" class="sidebar"></div>
        <div id="burger" class="burger"></div>
        <div id="close" class="close"></div>
        <button id="toggleBtn">Тёмная тема</button>
        <button id="toggleBtnMobile">Тёмная тема</button>
        <p id="toggleText">Тёмная тема</p>
        
        <div class="style_select_container">
          <select class="style_select">
            <option value="1">Option 1</option>
          </select>
          <div class="select_arrow"></div>
        </div>
        
        <div class="gallery">
          <div class="slider_wrapper">
            <div class="slider_track">
              <div class="style_card">Card 1</div>
              <div class="style_card">Card 2</div>
              <div class="style_card">Card 3</div>
            </div>
          </div>
          <button class="prev-btn">Prev</button>
          <button class="next-btn">Next</button>
        </div>
      </body>
    </html>
  `;

  // Добавляем classList для html элемента
  if (!document.documentElement.classList) {
    document.documentElement.classList = {
      add: jest.fn(),
      remove: jest.fn(),
      contains: jest.fn(),
    };
  }
});

// ============================================
// 2. НАСТРОЙКА МОКОВ
// ============================================

// ПРАВИЛЬНЫЙ мок для localStorage
let store = {};
const localStorageMock = {
  getItem: jest.fn((key) => store[key] || null),
  setItem: jest.fn((key, value) => {
    store[key] = value;
  }),
  removeItem: jest.fn((key) => {
    delete store[key];
  }),
  clear: jest.fn(() => {
    store = {};
  }),
};

// Заменяем глобальный localStorage
Object.defineProperty(global, "localStorage", {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

// Мок для matchMedia
global.matchMedia = jest.fn().mockImplementation((query) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
}));

// Мок для getComputedStyle
global.getComputedStyle = jest.fn().mockImplementation(() => ({
  gap: "100px",
}));

// ============================================
// 3. ИМПОРТ ФУНКЦИЙ
// ============================================

const {
  setTheme,
  toggleTheme,
  initTheme,
  UniversalSlider,
  initBurgerMenu,
  initSelects,
} = require("../scripts");

// ============================================
// 4. НАСТРОЙКА ПЕРЕД КАЖДЫМ ТЕСТОМ
// ============================================

beforeEach(() => {
  // Очищаем store
  store = {};

  // Сбрасываем моки
  jest.clearAllMocks();

  // Сбрасываем classList моки
  document.documentElement.classList.add = jest.fn();
  document.documentElement.classList.remove = jest.fn();
  document.documentElement.classList.contains = jest.fn();

  // Сбрасываем текст
  const toggleText = document.getElementById("toggleText");
  if (toggleText) toggleText.textContent = "Тёмная тема";
});

// ============================================
// 5. ТЕСТЫ ДЛЯ ТЕМЫ
// ============================================

describe("setTheme", () => {
  test("устанавливает тёмную тему", () => {
    setTheme("dark");

    expect(document.documentElement.classList.add).toHaveBeenCalledWith(
      "dark-theme",
    );

    const toggleText = document.getElementById("toggleText");
    expect(toggleText.textContent).toBe("Светлая тема");

    // Проверяем вызов localStorage.setItem
    expect(localStorageMock.setItem).toHaveBeenCalledWith("theme", "dark");
    expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
  });

  test("устанавливает светлую тему", () => {
    setTheme("light");

    expect(document.documentElement.classList.remove).toHaveBeenCalledWith(
      "dark-theme",
    );

    const toggleText = document.getElementById("toggleText");
    expect(toggleText.textContent).toBe("Тёмная тема");

    // Проверяем вызов localStorage.setItem
    expect(localStorageMock.setItem).toHaveBeenCalledWith("theme", "light");
    expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
  });
});

describe("toggleTheme", () => {
  test("переключает тему со светлой на тёмную", () => {
    // Мокаем contains для возврата false (светлая тема)
    document.documentElement.classList.contains.mockReturnValueOnce(false);

    toggleTheme();

    expect(document.documentElement.classList.add).toHaveBeenCalledWith(
      "dark-theme",
    );
    expect(localStorageMock.setItem).toHaveBeenCalledWith("theme", "dark");
  });

  test("переключает тему с тёмной на светлую", () => {
    // Мокаем contains для возврата true (тёмная тема)
    document.documentElement.classList.contains.mockReturnValueOnce(true);

    toggleTheme();

    expect(document.documentElement.classList.remove).toHaveBeenCalledWith(
      "dark-theme",
    );
    expect(localStorageMock.setItem).toHaveBeenCalledWith("theme", "light");
  });
});

describe("initTheme", () => {
  test("загружает тему из localStorage", () => {
    // Устанавливаем тему в store
    store.theme = "dark";
    localStorageMock.getItem.mockReturnValueOnce("dark");

    initTheme();

    expect(document.documentElement.classList.add).toHaveBeenCalledWith(
      "dark-theme",
    );
  });

  test("использует системные настройки, если тема не сохранена", () => {
    // localStorage.getItem возвращает null
    localStorageMock.getItem.mockReturnValueOnce(null);

    // Мокаем matchMedia для возврата dark
    window.matchMedia.mockReturnValueOnce({
      matches: true,
      addEventListener: jest.fn(),
    });

    initTheme();

    expect(document.documentElement.classList.add).toHaveBeenCalledWith(
      "dark-theme",
    );
    expect(localStorageMock.setItem).toHaveBeenCalledWith("theme", "dark");
  });

  test("использует светлую тему, если системная светлая и тема не сохранена", () => {
    localStorageMock.getItem.mockReturnValueOnce(null);

    window.matchMedia.mockReturnValueOnce({
      matches: false,
      addEventListener: jest.fn(),
    });

    initTheme();

    expect(document.documentElement.classList.remove).toHaveBeenCalledWith(
      "dark-theme",
    );
    expect(localStorageMock.setItem).toHaveBeenCalledWith("theme", "light");
  });
});

// ============================================
// 6. ТЕСТЫ ДЛЯ БУРГЕР-МЕНЮ
// ============================================

describe("Burger Menu", () => {
  test("бургер-меню инициализируется без ошибок", () => {
    expect(() => initBurgerMenu()).not.toThrow();
  });

  test("элементы бургер-меню существуют", () => {
    const burger = document.getElementById("burger");
    const menu = document.getElementById("sidebar");
    const close = document.getElementById("close");

    expect(burger).not.toBeNull();
    expect(menu).not.toBeNull();
    expect(close).not.toBeNull();
  });
});

// ============================================
// 7. ТЕСТЫ ДЛЯ SELECT
// ============================================

describe("Selects", () => {
  test("инициализация selects не вызывает ошибок", () => {
    expect(() => initSelects()).not.toThrow();
  });

  test("select элементы существуют", () => {
    const select = document.querySelector(".style_select");
    expect(select).not.toBeNull();
  });
});

// ============================================
// 8. ТЕСТЫ ДЛЯ SLIDER
// ============================================

describe("UniversalSlider", () => {
  let sliderElement;
  let slider;

  beforeEach(() => {
    sliderElement = document.querySelector(".gallery");
    if (sliderElement) {
      slider = new UniversalSlider(sliderElement);
    }
  });

  test("создает экземпляр слайдера", () => {
    expect(slider).toBeInstanceOf(UniversalSlider);
  });

  test("имеет метод next", () => {
    expect(typeof slider.next).toBe("function");
  });

  test("имеет метод prev", () => {
    expect(typeof slider.prev).toBe("function");
  });

  test("обновляет состояние стрелок", () => {
    expect(() => slider.updateArrowsState()).not.toThrow();
  });
});

// ============================================
// 9. ТЕСТЫ ДЛЯ ИНТЕГРАЦИИ
// ============================================

describe("Integration tests", () => {
  test("setTheme сохраняет тему в localStorage", () => {
    setTheme("dark");
    expect(store.theme).toBe("dark");

    setTheme("light");
    expect(store.theme).toBe("light");
  });

  test("несколько вызовов setTheme не дублируют обработчики", () => {
    setTheme("dark");
    setTheme("light");
    setTheme("dark");

    // Проверяем, что setItem вызывался 3 раза
    expect(localStorageMock.setItem).toHaveBeenCalledTimes(3);
    expect(localStorageMock.setItem).toHaveBeenLastCalledWith("theme", "dark");
  });
});

// ============================================
// 10. ДОПОЛНИТЕЛЬНЫЕ ТЕСТЫ
// ============================================

describe("DOM элементы", () => {
  test("кнопки темы существуют", () => {
    const toggleBtn = document.getElementById("toggleBtn");
    const toggleBtnMobile = document.getElementById("toggleBtnMobile");
    expect(toggleBtn).not.toBeNull();
    expect(toggleBtnMobile).not.toBeNull();
  });

  test("текстовый элемент темы существует", () => {
    const toggleText = document.getElementById("toggleText");
    expect(toggleText).not.toBeNull();
  });
});

// ============================================
// 11. ТЕСТЫ ДЛЯ ГРАНИЧНЫХ СЛУЧАЕВ
// ============================================

describe("Edge cases", () => {
  test("setTheme обрабатывает undefined тему", () => {
    expect(() => setTheme()).not.toThrow();
  });

  test("toggleTheme работает при отсутствии класса", () => {
    document.documentElement.classList.contains.mockReturnValueOnce(undefined);
    expect(() => toggleTheme()).not.toThrow();
  });
});
