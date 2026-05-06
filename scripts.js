const root = document.documentElement;
const toggleBtn = document.getElementById("toggleBtn");
const toggleText = document.getElementById("toggleText");
const toggleBtnMobile = document.getElementById("toggleBtnMobile");

function setTheme(theme) {
  if (theme === "dark") {
    root.classList.add("dark-theme");
    toggleText.textContent = "Светлая тема";
  } else {
    root.classList.remove("dark-theme");
    toggleText.textContent = "Тёмная тема";
  }
  localStorage.setItem("theme", theme);
}

function toggleTheme() {
  const currentTheme = root.classList.contains("dark-theme") ? "dark" : "light";
  setTheme(currentTheme === "dark" ? "light" : "dark");
}

function initTheme() {
  const savedTheme = localStorage.getItem("theme");

  if (savedTheme) {
    setTheme(savedTheme);
  } else {
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    setTheme(prefersDark ? "dark" : "light");
  }
}

toggleBtn.addEventListener("click", toggleTheme);

initTheme();

window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", (e) => {
    if (!localStorage.getItem("theme")) {
      setTheme(e.matches ? "dark" : "light");
    }
  });

class UniversalSlider {
  constructor(sliderElement) {
    this.slider = sliderElement;

    // Находим элементы
    this.wrapper = sliderElement.querySelector(
      ".slider_wrapper, .photos_slider_wrapper",
    );
    this.track = sliderElement.querySelector(
      ".slider_track, .photos_slider_track",
    );
    this.prevBtn = sliderElement.querySelector(".prev-btn, .photos-prev-btn");
    this.nextBtn = sliderElement.querySelector(".next-btn, .photos-next-btn");

    // Параметры
    this.currentIndex = 0;
    this.cardWidth = 0;
    this.gap = 0;
    this.visibleCards = 0;
    this.totalCards = 0;

    // Touch переменные
    this.touchStartX = 0;
    this.touchEndX = 0;
    this.isSwiping = false;
    this.swipeThreshold = 50;

    this.init();
  }

  init() {
    this.calculateDimensions();
    this.updateArrowsState();
    this.addEventListeners();
    window.addEventListener("resize", () => this.handleResize());
  }

  calculateDimensions() {
    // Определяем тип слайдера по наличию классов
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
      this.gap = 20; // photos_slider_track имеет gap: 20px
    } else {
      const trackStyle = window.getComputedStyle(this.track);
      this.gap = parseInt(trackStyle.gap) || 100;
    }

    const wrapperWidth = this.wrapper.offsetWidth;
    let rawVisible = wrapperWidth / (this.cardWidth + this.gap);
    this.visibleCards = Math.floor(rawVisible);

    if (this.visibleCards < 1) this.visibleCards = 1;
  }

  getMaxIndex() {
    return Math.max(0, this.totalCards - this.visibleCards);
  }

  updateSlider() {
    const offset = -this.currentIndex * (this.cardWidth + this.gap);
    this.track.style.transform = `translateX(${offset}px)`;
    this.updateArrowsState();
  }

  updateArrowsState() {
    const maxIndex = this.getMaxIndex();

    this.updateArrowState(this.prevBtn, this.currentIndex <= 0);
    this.updateArrowState(this.nextBtn, this.currentIndex >= maxIndex);
  }

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

  handleTouchStart(e) {
    this.touchStartX = e.touches[0].clientX;
    this.isSwiping = true;
    this.track.style.transition = "none";
  }

  handleTouchMove(e) {
    if (!this.isSwiping) return;

    this.touchEndX = e.touches[0].clientX;
    const deltaX = this.touchEndX - this.touchStartX;
    const currentOffset = -this.currentIndex * (this.cardWidth + this.gap);

    let newOffset = currentOffset + deltaX;

    const minOffset = -this.getMaxIndex() * (this.cardWidth + this.gap);
    const maxOffset = 0;

    if (newOffset > maxOffset) {
      newOffset = maxOffset + (newOffset - maxOffset) * 0.3;
    } else if (newOffset < minOffset) {
      newOffset = minOffset + (newOffset - minOffset) * 0.3;
    }

    this.track.style.transform = `translateX(${newOffset}px)`;
  }

  handleTouchEnd(e) {
    if (!this.isSwiping) return;

    this.isSwiping = false;
    this.track.style.transition = "transform 0.5s ease";

    const deltaX = this.touchEndX - this.touchStartX;

    if (Math.abs(deltaX) > this.swipeThreshold) {
      if (deltaX > 0) {
        this.prev();
      } else {
        this.next();
      }
    } else {
      this.updateSlider();
    }

    this.touchStartX = 0;
    this.touchEndX = 0;
  }

  next() {
    const maxIndex = this.getMaxIndex();
    if (this.currentIndex < maxIndex) {
      this.currentIndex++;
      this.updateSlider();
    }
  }

  prev() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.updateSlider();
    }
  }

  handleResize() {
    this.calculateDimensions();
    const maxIndex = this.getMaxIndex();
    if (this.currentIndex > maxIndex) {
      this.currentIndex = maxIndex;
    }
    this.updateSlider();
  }

  addEventListeners() {
    if (this.prevBtn) {
      this.prevBtn.addEventListener("click", () => this.prev());
    }
    if (this.nextBtn) {
      this.nextBtn.addEventListener("click", () => this.next());
    }

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

// Инициализация
document.addEventListener("DOMContentLoaded", () => {
  // Все слайдеры с классом .gallery
  document
    .querySelectorAll(".gallery")
    .forEach((gallery) => new UniversalSlider(gallery));

  // Все слайдеры с классом .photos
  document
    .querySelectorAll(".photos")
    .forEach((photos) => new UniversalSlider(photos));
});
