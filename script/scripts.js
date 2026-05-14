// 1. ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
let isOpen = false; // Состояние бургер-меню (открыто/закрыто)
let burger = null; // Кнопка-бургер
let menu = null; // Боковое меню
let close = null; // Кнопка закрытия меню

// 2. УПРАВЛЕНИЕ ТЕМОЙ ОФОРМЛЕНИЯ
/**
 * Устанавливает тему оформления (тёмная/светлая)
 * @param {string} theme - Название темы: "dark" или "light"
 *
 * Функция выполняет:
 * 1. Добавляет/удаляет класс 'dark-theme' у корневого элемента <html>
 * 2. Обновляет текст кнопки переключения темы
 * 3. Сохраняет выбранную тему в localStorage
 */
function setTheme(theme) {
  const root = document.documentElement; // <html> элемент
  const toggleText = document.getElementById("toggleText");
  const toggleBtn = document.getElementById("toggleBtn");
  const toggleBtnMobile = document.getElementById("toggleBtnMobile");

  if (theme === "dark") {
    root.classList.add("dark-theme");
    if (toggleText) toggleText.textContent = "Светлая тема";
  } else {
    root.classList.remove("dark-theme");
    if (toggleText) toggleText.textContent = "Тёмная тема";
  }

  // Сохраняем выбор пользователя в localStorage
  localStorage.setItem("theme", theme);
}

/**
 * Переключает тему между тёмной и светлой
 * Вызывается при клике на кнопку переключения темы
 */
function toggleTheme() {
  const root = document.documentElement;
  const currentTheme = root.classList.contains("dark-theme") ? "dark" : "light";
  setTheme(currentTheme === "dark" ? "light" : "dark");
}

/**
 * Инициализирует тему при загрузке страницы
 * Приоритет: сохранённая тема > системные настройки > светлая тема
 */
function initTheme() {
  const savedTheme = localStorage.getItem("theme");

  if (savedTheme) {
    // Если пользователь уже выбирал тему - используем её
    setTheme(savedTheme);
  } else {
    // Иначе проверяем системные настройки ОС
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    setTheme(prefersDark ? "dark" : "light");
  }
}

// 3. БУРГЕР-МЕНЮ (МОБИЛЬНАЯ ВЕРСИЯ)
/**
 * Инициализирует бургер-меню для мобильных устройств
 *
 * Логика работы:
 * - При клике на бургер-иконку добавляется/удаляется класс 'active'
 * - При клике на крестик меню закрывается
 *
 * Важно: Используется cloneNode для удаления старых обработчиков
 * чтобы избежать дублирования событий
 */
function initBurgerMenu() {
  // Получаем DOM-элементы
  burger = document.getElementById("burger");
  menu = document.getElementById("sidebar");
  close = document.getElementById("close");

  // Настройка кнопки-бургера
  if (burger) {
    // Клонируем элемент для удаления старых обработчиков
    const newBurger = burger.cloneNode(true);
    burger.parentNode.replaceChild(newBurger, burger);
    burger = newBurger;

    burger.addEventListener("click", () => {
      if (isOpen) {
        if (menu) menu.classList.remove("active");
        isOpen = false;
      } else {
        if (menu) menu.classList.add("active");
        isOpen = true;
      }
    });
  }

  // Настройка кнопки закрытия (крестик в меню)
  if (close) {
    const newClose = close.cloneNode(true);
    close.parentNode.replaceChild(newClose, close);
    close = newClose;

    close.addEventListener("click", () => {
      if (menu) menu.classList.remove("active");
      isOpen = false;
    });
  }
}

// 4. СТРЕЛКА SELECT
/**
 * Инициализирует кастомные селекты
 */
function initSelects() {
  document.querySelectorAll(".style_select").forEach((select) => {
    const container = select.parentElement;
    const arrow = container.querySelector(".select_arrow");

    if (!arrow) return;

    // При клике - поворачиваем стрелку
    select.addEventListener("click", () => {
      setTimeout(() => {
        arrow.classList.toggle("rotated");
      }, 10);
    });

    // При потере фокуса - возвращаем стрелку
    select.addEventListener("blur", () => {
      arrow.classList.remove("rotated");
    });
  });
}

// 5. УНИВЕРСАЛЬНЫЙ КЛАСС СЛАЙДЕРА
/**
 * Универсальный класс для создания горизонтальных слайдеров
 *
 * Поддерживает:
 * - Автоматическое определение ширины карточек и отступов
 * - Кнопки "назад/вперёд" с автоматическим скрытием на краях
 * - Свайп (touch swipe) для мобильных устройств
 * - Адаптивность при изменении размера окна
 * - Работу как с обычным слайдером (gallery), так и со слайдером фото (photos)
 *
 * @param {HTMLElement} sliderElement - Корневой элемент слайдера
 */
class UniversalSlider {
  constructor(sliderElement) {
    this.slider = sliderElement;

    // Поиск DOM-элементов внутри слайдера
    // Поддерживает два типа классов: стандартный слайдер и фото-слайдер
    this.wrapper = sliderElement.querySelector(
      ".slider_wrapper, .photos_slider_wrapper",
    );
    this.track = sliderElement.querySelector(
      ".slider_track, .photos_slider_track",
    );
    this.prevBtn = sliderElement.querySelector(".prev-btn, .photos-prev-btn");
    this.nextBtn = sliderElement.querySelector(".next-btn, .photos-next-btn");

    // Параметры слайдера
    this.currentIndex = 0; // Текущая позиция
    this.cardWidth = 0; // Ширина одной карточки
    this.gap = 0; // Отступ между карточками
    this.visibleCards = 0; // Количество видимых карточек
    this.totalCards = 0; // Общее количество карточек

    // Переменные для обработки свайпов на мобильных устройствах
    this.touchStartX = 0;
    this.touchEndX = 0;
    this.isSwiping = false;
    this.swipeThreshold = 50; // Минимальное расстояние для свайпа

    this.init();
  }

  /**
   * Инициализация слайдера
   */
  init() {
    this.calculateDimensions(); // Вычисляем размеры
    this.updateArrowsState(); // Обновляем состояние кнопок
    this.addEventListeners(); // Навешиваем обработчики
    window.addEventListener("resize", () => this.handleResize());
  }

  /**
   * Вычисляет размеры слайдера
   * Определяет тип слайдера (обычный или фото) для корректного gap
   */
  calculateDimensions() {
    // Определяем тип слайдера по наличию класса "photos"
    const isPhotosSlider = this.slider.classList.contains("photos");
    const cardsSelector = isPhotosSlider
      ? ".photos_slider_card"
      : ".style_card";
    const cards = this.track.querySelectorAll(cardsSelector);

    if (cards.length === 0) return;

    this.totalCards = cards.length;
    this.cardWidth = cards[0].offsetWidth;

    // Устанавливаем gap в зависимости от типа слайдера
    if (isPhotosSlider) {
      this.gap = 20; // У фото-слайдера gap: 20px
    } else {
      const trackStyle = window.getComputedStyle(this.track);
      this.gap = parseInt(trackStyle.gap) || 100; // Обычный gap: 100px по умолчанию
    }

    const wrapperWidth = this.wrapper.offsetWidth;
    let rawVisible = wrapperWidth / (this.cardWidth + this.gap);
    this.visibleCards = Math.floor(rawVisible);

    // Минимум 1 видимая карточка (для мобильных устройств)
    if (this.visibleCards < 1) this.visibleCards = 1;
  }

  /**
   * Возвращает максимально возможный индекс (последняя позиция)
   * @returns {number} Максимальный индекс
   */
  getMaxIndex() {
    return Math.max(0, this.totalCards - this.visibleCards);
  }

  /**
   * Обновляет позицию слайдера (сдвигает трек)
   * Использует transform: translateX() для плавности
   */
  updateSlider() {
    const offset = -this.currentIndex * (this.cardWidth + this.gap);
    this.track.style.transform = `translateX(${offset}px)`;
    this.updateArrowsState();
  }

  /**
   * Обновляет состояние кнопок (активны/неактивны)
   * На краях слайдера кнопки становятся полупрозрачными
   */
  updateArrowsState() {
    const maxIndex = this.getMaxIndex();

    this.updateArrowState(this.prevBtn, this.currentIndex <= 0);
    this.updateArrowState(this.nextBtn, this.currentIndex >= maxIndex);
  }

  /**
   * Обновляет состояние одной кнопки
   * @param {HTMLElement} btn - Кнопка
   * @param {boolean} isDisabled - Отключена ли
   */
  updateArrowState(btn, isDisabled) {
    if (!btn) return;

    if (isDisabled) {
      btn.style.opacity = "0.4";
      btn.style.cursor = "not-allowed";
    } else {
      btn.style.opacity = "1";
      btn.style.cursor = "pointer";
    }
  }

  //ОБРАБОТЧИКИ СВАЙПОВ ДЛЯ МОБИЛЬНЫХ

  /**
   * Обработчик начала касания
   * Запоминает начальную позицию и отключает transition для плавного следования
   */
  handleTouchStart(e) {
    this.touchStartX = e.touches[0].clientX;
    this.isSwiping = true;
    this.track.style.transition = "none";
  }

  /**
   * Обработчик движения пальца
   * Перемещает слайдер вслед за пальцем
   */
  handleTouchMove(e) {
    if (!this.isSwiping) return;

    this.touchEndX = e.touches[0].clientX;
    const deltaX = this.touchEndX - this.touchStartX;
    const currentOffset = -this.currentIndex * (this.cardWidth + this.gap);

    let newOffset = currentOffset + deltaX;

    // Эффект "резины" на краях (сопротивление)
    const minOffset = -this.getMaxIndex() * (this.cardWidth + this.gap);
    const maxOffset = 0;

    if (newOffset > maxOffset) {
      newOffset = maxOffset + (newOffset - maxOffset) * 0.3;
    } else if (newOffset < minOffset) {
      newOffset = minOffset + (newOffset - minOffset) * 0.3;
    }

    this.track.style.transform = `translateX(${newOffset}px)`;
  }

  /**
   * Обработчик окончания касания
   * Определяет, был ли свайп и переключает слайд
   */
  handleTouchEnd(e) {
    if (!this.isSwiping) return;

    this.isSwiping = false;
    this.track.style.transition = "transform 0.5s ease";

    const deltaX = this.touchEndX - this.touchStartX;

    if (Math.abs(deltaX) > this.swipeThreshold) {
      if (deltaX > 0) {
        this.prev(); // Свайп вправо → предыдущий слайд
      } else {
        this.next(); // Свайп влево → следующий слайд
      }
    } else {
      this.updateSlider(); // Возврат к текущей позиции
    }

    this.touchStartX = 0;
    this.touchEndX = 0;
  }

  // НАВИГАЦИЯ

  /**
   * Переключение на следующий слайд
   */
  next() {
    const maxIndex = this.getMaxIndex();
    if (this.currentIndex < maxIndex) {
      this.currentIndex++;
      this.updateSlider();
    }
  }

  /**
   * Переключение на предыдущий слайд
   */
  prev() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.updateSlider();
    }
  }

  /**
   * Обработчик изменения размера окна
   * Пересчитывает размеры и корректирует позицию
   */
  handleResize() {
    this.calculateDimensions();
    const maxIndex = this.getMaxIndex();
    if (this.currentIndex > maxIndex) {
      this.currentIndex = maxIndex;
    }
    this.updateSlider();
  }

  /**
   * Навешивает все обработчики событий
   */
  addEventListeners() {
    // Кнопки навигации
    if (this.prevBtn) {
      this.prevBtn.addEventListener("click", () => this.prev());
    }
    if (this.nextBtn) {
      this.nextBtn.addEventListener("click", () => this.next());
    }

    // Свайпы для мобильных устройств
    if (this.track) {
      this.track.addEventListener(
        "touchstart",
        (e) => this.handleTouchStart(e),
        { passive: false },
      );
      this.track.addEventListener("touchmove", (e) => this.handleTouchMove(e), {
        passive: false,
      });
      this.track.addEventListener("touchend", (e) => this.handleTouchEnd(e));

      // Предотвращаем стандартную прокрутку страницы при свайпе по слайдеру
      this.track.addEventListener(
        "touchmove",
        (e) => {
          if (this.isSwiping) {
            e.preventDefault();
          }
        },
        { passive: false },
      );
    }
  }
}

// 6. ГЛАВНАЯ ФУНКЦИЯ ИНИЦИАЛИЗАЦИИ
/**
 * Инициализирует все компоненты приложения
 * Вызывается после загрузки DOM
 */
function initApp() {
  const toggleBtn = document.getElementById("toggleBtn");
  const toggleBtnMobile = document.getElementById("toggleBtnMobile");

  if (toggleBtn) {
    const newToggleBtn = toggleBtn.cloneNode(true);
    toggleBtn.parentNode.replaceChild(newToggleBtn, toggleBtn);
    newToggleBtn.addEventListener("click", toggleTheme);
  }

  if (toggleBtnMobile) {
    const newToggleBtnMobile = toggleBtnMobile.cloneNode(true);
    toggleBtnMobile.parentNode.replaceChild(
      newToggleBtnMobile,
      toggleBtnMobile,
    );
    newToggleBtnMobile.addEventListener("click", toggleTheme);
  }

  initTheme();
  initBurgerMenu();
  initSelects();

  document
    .querySelectorAll(".gallery")
    .forEach((gallery) => new UniversalSlider(gallery));

  document
    .querySelectorAll(".photos")
    .forEach((photos) => new UniversalSlider(photos));

  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", (e) => {
      // Если пользователь не сохранял тему вручную - применяем системную
      if (!localStorage.getItem("theme")) {
        setTheme(e.matches ? "dark" : "light");
      }
    });
}

// 7. ЗАПУСК ПРИЛОЖЕНИЯ
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
  } else {
    // DOM уже загружен - запускаем сразу
    initApp();
  }
}

// 8. ЭКСПОРТ ДЛЯ ТЕСТИРОВАНИЯ
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    setTheme, // Установка темы
    toggleTheme, // Переключение темы
    initTheme, // Инициализация темы
    UniversalSlider, // Класс слайдера
    initBurgerMenu, // Инициализация бургер-меню
    initSelects, // Инициализация селектов
    initApp, // Главная функция
  };
}
