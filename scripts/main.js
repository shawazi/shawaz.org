// Theme toggle and sticky-nav border. No dependencies.
(function () {
  var root = document.documentElement;
  var KEY = "shawaz-theme";

  function store(v) {
    try {
      localStorage.setItem(KEY, v);
    } catch (e) {
      /* private mode — theme just won't persist */
    }
  }

  function current() {
    var t = root.getAttribute("data-theme");
    if (t) return t;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  var toggle = document.getElementById("theme-toggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var next = current() === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      store(next);
    });
  }

  var nav = document.querySelector(".nav");
  function onScroll() {
    if (nav) nav.classList.toggle("scrolled", window.scrollY > 8);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
