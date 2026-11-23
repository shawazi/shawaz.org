/* First-party visit insight and the AI assistant call button (FR-5, FR-6; see privacy.html#site).
 *
 * Sends this site's own visit events (page, sections seen, scroll depth, clicks, résumé downloads, time on
 * page) with a random visitor id kept in this browser to the site's own insight service. No cookies, no
 * third-party trackers. A browser that sends Global Privacy Control or Do Not Track is not tracked.
 *
 * Prior-art: an open-source web analytics collector's event/identify payload, IntersectionObserver and the Page
 * Visibility API (MDN); written by hand instead of loading a vendor's tracker tag so no third-party code runs here.
 */
(function () {
  "use strict";

  var ENDPOINT = "https://in.shawaz.org";
  var WEBSITE = "SITE_ID"; // the insight service's id for this site (not a secret)
  var optedOut =
    navigator.globalPrivacyControl === true ||
    navigator.doNotTrack === "1" ||
    window.doNotTrack === "1";
  var cache = null;

  function store(kind, key, make) {
    try {
      var s = window[kind];
      var v = s.getItem(key);
      if (!v) {
        v = make();
        s.setItem(key, v);
      }
      return v;
    } catch (e) {
      return make();
    }
  }

  function rid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return String(Date.now()) + Math.random().toString(16).slice(2);
  }

  var visitor = store("localStorage", "shawaz-visitor", rid);

  function payload(extra) {
    var p = {
      website: WEBSITE,
      hostname: location.hostname,
      screen: screen.width + "x" + screen.height,
      language: navigator.language,
      title: document.title,
      url: location.pathname + location.search,
      referrer: document.referrer,
      id: visitor,
    };
    for (var k in extra) p[k] = extra[k];
    return p;
  }

  function send(type, extra, keepalive) {
    if (optedOut || WEBSITE === "SITE_ID") return;
    var headers = { "Content-Type": "application/json" };
    if (cache) headers["x-insight-cache"] = cache;
    try {
      fetch(ENDPOINT + "/e", {
        method: "POST",
        headers: headers,
        body: JSON.stringify({ type: type, payload: payload(extra || {}) }),
        keepalive: !!keepalive,
        credentials: "omit",
      })
        .then(function (r) {
          return r.ok ? r.json() : null;
        })
        .then(function (d) {
          if (d && d.cache) cache = d.cache;
        })
        .catch(function () {});
    } catch (e) {}
  }

  function track(name, data, keepalive) {
    send("event", { name: name, data: data || {} }, keepalive);
  }

  // A session starts with who the visitor is (the service adds their network), then the page view.
  var identified = false;
  try {
    identified = sessionStorage.getItem("shawaz-identified") === "1";
    sessionStorage.setItem("shawaz-identified", "1");
  } catch (e) {}
  if (!identified) send("identify", { data: {} });
  send("event", {});

  // Sections seen: once each, when half of one is on screen.
  if ("IntersectionObserver" in window) {
    var seen = {};
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          var id = en.target.id;
          if (en.isIntersecting && id && !seen[id]) {
            seen[id] = 1;
            track("section", { id: id });
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.5 },
    );
    document.querySelectorAll("section[id]").forEach(function (el) {
      io.observe(el);
    });
  }

  // Scroll depth: 25, 50, 75 and 100 percent, once each.
  var marks = [25, 50, 75, 100];
  var passed = {};
  window.addEventListener(
    "scroll",
    function () {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      var pct =
        max <= 0
          ? 100
          : Math.round(((h.scrollTop || document.body.scrollTop) / max) * 100);
      marks.forEach(function (m) {
        if (pct >= m && !passed[m]) {
          passed[m] = 1;
          track("scroll", { depth: m });
        }
      });
    },
    { passive: true },
  );

  // Clicks on links and buttons; links off this site are outbound; a PDF is the résumé download.
  document.addEventListener(
    "click",
    function (ev) {
      var el = ev.target.closest ? ev.target.closest("a, button") : null;
      if (!el) return;
      var label = (el.getAttribute("aria-label") || el.textContent || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 60);
      var href = el.getAttribute("href") || "";
      if (/\.pdf($|\?)/i.test(href))
        track("resume-download", { href: href }, true);
      else if (/^https?:\/\//i.test(href) && el.hostname !== location.hostname)
        track("outbound", { href: href.slice(0, 200), label: label }, true);
      else track("click", { label: label, href: href.slice(0, 200) }, true);
    },
    true,
  );

  // Time on page, when the visitor leaves or switches away.
  var start = Date.now();
  var sentTime = false;
  function leave() {
    if (sentTime) return;
    sentTime = true;
    track("time", { seconds: Math.round((Date.now() - start) / 1000) }, true);
  }
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") leave();
  });
  window.addEventListener("pagehide", leave);

  // ---------------------------------------------------------------- the AI assistant call (FR-6)

  var dialog = document.getElementById("ai-call");
  if (!dialog) return;
  var statusEl = dialog.querySelector("[data-call-status]");
  var startBtn = dialog.querySelector("[data-call-start]");
  var endBtn = dialog.querySelector("[data-call-end]");
  var muteBtn = dialog.querySelector("[data-call-mute]");
  var audio = dialog.querySelector("audio");
  var began = 0;
  var muted = false;
  var sdk = null;
  var UNREACHABLE =
    "The assistant couldn't be reached. Please try again in a minute, or email shawaz@shawaz.org.";

  function say(text) {
    statusEl.textContent = text;
  }

  function loadSdk() {
    if (sdk) return sdk;
    sdk = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = ENDPOINT + "/voice/sdk.js";
      s.onload = function () {
        if (window.WebCall) resolve(window.WebCall);
        else reject(new Error("sdk"));
      };
      s.onerror = function () {
        sdk = null;
        reject(new Error("sdk"));
      };
      document.head.appendChild(s);
    });
    return sdk;
  }

  function idle() {
    startBtn.hidden = false;
    startBtn.disabled = false;
    endBtn.hidden = true;
    muteBtn.hidden = true;
    muted = false;
    muteBtn.textContent = "Mute";
    muteBtn.setAttribute("aria-pressed", "false");
  }

  function onState(state) {
    if (state === "connecting") say("Connecting…");
    else if (state === "active") {
      began = Date.now();
      say("Connected. Ask anything about my work.");
      muteBtn.hidden = false;
      track("voice-call", { phase: "start" });
    } else if (state === "ended" || state === "error") {
      if (began)
        track(
          "voice-call",
          { phase: "end", seconds: Math.round((Date.now() - began) / 1000) },
          true,
        );
      say(
        state === "error" && !began
          ? UNREACHABLE
          : "Call ended. Thanks for calling.",
      );
      began = 0;
      idle();
    }
  }

  document.querySelectorAll("[data-open-call]").forEach(function (b) {
    b.addEventListener("click", function () {
      idle();
      say("");
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    });
  });

  startBtn.addEventListener("click", function () {
    startBtn.disabled = true;
    say("Starting…");
    Promise.all([
      loadSdk(),
      fetch(ENDPOINT + "/voice/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
        credentials: "omit",
      }).then(function (r) {
        if (r.status === 429) throw new Error("busy");
        if (!r.ok) throw new Error("token");
        return r.json();
      }),
    ])
      .then(function (got) {
        startBtn.hidden = true;
        endBtn.hidden = false;
        got[0].start({
          token: got[1].token,
          dial: got[1].dial,
          audio: audio,
          headers: {
            "X-Visitor": visitor,
            "X-Caller-Country": got[1].country || "",
          },
          onState: onState,
        });
      })
      .catch(function (e) {
        say(
          e && e.message === "busy"
            ? "Too many calls just now. Please try again later, or email shawaz@shawaz.org."
            : UNREACHABLE,
        );
        idle();
      });
  });

  endBtn.addEventListener("click", function () {
    if (window.WebCall) window.WebCall.hangup();
    onState("ended");
  });
  muteBtn.addEventListener("click", function () {
    muted = !muted;
    if (window.WebCall) window.WebCall.mute(muted);
    muteBtn.textContent = muted ? "Unmute" : "Mute";
    muteBtn.setAttribute("aria-pressed", String(muted));
  });
  dialog.addEventListener("close", function () {
    if (began && window.WebCall) {
      window.WebCall.hangup();
      onState("ended");
    }
  });
})();
