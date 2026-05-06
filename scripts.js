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
toggleBtnMobile.addEventListener("click", toggleTheme);

initTheme();

window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", (e) => {
    if (!localStorage.getItem("theme")) {
      setTheme(e.matches ? "dark" : "light");
    }
  });
