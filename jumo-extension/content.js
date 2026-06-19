console.log("🚀 JUMO-IMMO EXTENSION V2 LOADED");

(() => {
  if (window.__jumoImmoInjected) return;
  window.__jumoImmoInjected = true;

  const API_URL = "http://localhost:3000/api/listings/import";
  const BUTTON_ID = "jumo-immo-fab";

  /* ── Glassmorphic floating button styles ──────────────────────────── */
  const style = document.createElement("style");
  style.textContent = `
    #${BUTTON_ID} {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 14px 20px;
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.35);
      background: linear-gradient(135deg, rgba(124, 58, 237, 0.55), rgba(37, 99, 235, 0.55));
      backdrop-filter: blur(16px) saturate(180%);
      -webkit-backdrop-filter: blur(16px) saturate(180%);
      color: #ffffff;
      font: 600 14px/1.2 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.25);
      cursor: pointer;
      user-select: none;
      transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
    }
    #${BUTTON_ID}:hover {
      transform: translateY(-2px) scale(1.02);
      box-shadow: 0 12px 40px rgba(124, 58, 237, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.3);
    }
    #${BUTTON_ID}.jumo-loading {
      opacity: 0.7;
      cursor: wait;
      pointer-events: none;
    }
    #${BUTTON_ID} .jumo-spinner {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 2px solid rgba(255, 255, 255, 0.4);
      border-top-color: #ffffff;
      animation: jumo-spin 0.7s linear infinite;
      display: none;
    }
    #${BUTTON_ID}.jumo-loading .jumo-spinner { display: inline-block; }
    #${BUTTON_ID}.jumo-loading .jumo-logo { display: none; }
    #${BUTTON_ID}.jumo-loading .jumo-label { display: none; }
    @keyframes jumo-spin { to { transform: rotate(360deg); } }
  `;
  document.documentElement.appendChild(style);

  const floatingButton = document.createElement("button");
  floatingButton.id = BUTTON_ID;
  floatingButton.type = "button";

  const spinner = document.createElement("span");
  spinner.className = "jumo-spinner";

  const buttonText = document.createElement("span");
  buttonText.className = "jumo-label";
  buttonText.innerText = "Analyser avec Jumo-Immo";

  const logoImg = document.createElement("img");
  logoImg.className = "jumo-logo";
  logoImg.src = chrome.runtime.getURL("logo.png");
  logoImg.style.cssText = "width: 28px; height: 28px; object-fit: contain; margin-right: 10px;";
  logoImg.alt = "";
  logoImg.setAttribute("aria-hidden", "true");

  floatingButton.append(spinner, buttonText);
  floatingButton.prepend(logoImg); // logo must sit to the left of the text
  document.documentElement.appendChild(floatingButton);

  floatingButton.addEventListener("click", () => runAnalysis());

  /* ── Scraping helpers (universal regex/DOM scanning) ──────────────── */
  function extractNumber(raw) {
    if (raw == null) return null;
    const normalized = String(raw).replace(/[\s  ]/g, "").replace(",", ".");
    const match = normalized.match(/\d+(?:\.\d+)?/);
    if (!match) return null;
    const num = parseFloat(match[0]);
    return Number.isFinite(num) ? Math.round(num) : null;
  }

  function scrapePrice() {
    const selectors = [
      '[itemprop="price"]',
      'meta[property="product:price:amount"]',
      'meta[property="og:price:amount"]',
    ];
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      const raw = el?.getAttribute?.("content") || el?.textContent;
      if (raw) {
        const parsed = extractNumber(raw);
        if (parsed && parsed > 1000) return parsed;
      }
    }

    // Fallback: scan the whole page text for "<number> €" / "<number> EUR"
    // and keep the largest plausible match (real-estate prices dominate
    // smaller euro amounts like monthly charges).
    const text = document.body.innerText || "";
    const matches = [...text.matchAll(/([\d\s  .,]{4,})\s*(?:€|EUR)/gi)];
    const candidates = matches
      .map((m) => extractNumber(m[1]))
      .filter((n) => n && n >= 10000 && n <= 50000000);

    return candidates.length ? Math.max(...candidates) : null;
  }

  function scrapeSurface() {
    const text = document.body.innerText || "";
    const match = text.match(/(\d+(?:[.,]\d+)?)\s*(?:m²|m2|m²)/i);
    return match ? extractNumber(match[1]) : null;
  }

  function scrapeLocation() {
    const metaSelectors = [
      'meta[property="og:locality"]',
      'meta[name="locality"]',
      'meta[itemprop="addressLocality"]',
      '[itemprop="addressLocality"]',
    ];
    for (const selector of metaSelectors) {
      const el = document.querySelector(selector);
      const value = el?.getAttribute?.("content") || el?.textContent;
      if (value && value.trim()) return value.trim();
    }

    const h1 = document.querySelector("h1")?.innerText || "";
    const metaDescription =
      document.querySelector('meta[name="description"]')?.getAttribute("content") || "";
    const haystack = [h1, document.title, metaDescription].join(" | ");

    // Look for "City (75011)" / "75011 City" patterns first.
    const postalWithCity =
      haystack.match(/([A-ZÀ-Ý][a-zà-ÿ'\-]+(?:[\s-][A-ZÀ-Ý][a-zà-ÿ'\-]+)*)\s*\(?(\d{5})\)?/) ||
      haystack.match(/(\d{5})\s*([A-ZÀ-Ý][a-zà-ÿ'\-]+(?:[\s-][A-ZÀ-Ý][a-zà-ÿ'\-]+)*)/);
    if (postalWithCity) {
      const first = postalWithCity[1];
      const second = postalWithCity[2];
      const isFirstNumeric = /^\d+$/.test(first);
      const city = isFirstNumeric ? second : first;
      const code = isFirstNumeric ? first : second;
      return code ? `${city} (${code})` : city;
    }

    // Fallback: capitalized phrase right after "à"/"a" (e.g. "Appartement à Lyon").
    const cityAfterPreposition = haystack.match(
      /\b[Aa]\s+([A-ZÀ-Ý][a-zà-ÿ'\-]+(?:[\s-][A-ZÀ-Ý][a-zà-ÿ'\-]+)*)/
    );
    if (cityAfterPreposition) return cityAfterPreposition[1];

    return "France";
  }

  function scrapeImage() {
    const og = document.querySelector('meta[property="og:image"]');
    return og?.getAttribute("content") || "";
  }

  function scrapeTitle() {
    const h1 = document.querySelector("h1")?.innerText?.trim();
    return h1 || document.title.trim();
  }

  function buildPayload() {
    return {
      price: scrapePrice(),
      surface: scrapeSurface(),
      location: scrapeLocation(),
      url: window.location.href,
      imageUrl: scrapeImage(),
      title: scrapeTitle(),
    };
  }

  /* ── Status persistence, read live by popup.js ────────────────────── */
  function setStatus(status, extra = {}) {
    chrome.storage?.local?.set({
      jumoStatus: status,
      jumoLastResult: { status, timestamp: Date.now(), ...extra },
    });
  }

  /* ── Main analysis flow ───────────────────────────────────────────── */
  async function runAnalysis() {
    floatingButton.classList.add("jumo-loading");
    setStatus("scraping");

    const payload = buildPayload();

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }

      setStatus("success", { payload, redirectUrl: data.redirectUrl });
      window.open(data.redirectUrl, "_blank");
    } catch (error) {
      console.error("[Jumo-Immo Analyzer] import failed:", error);
      setStatus("error", { payload, error: String(error?.message || error) });
    } finally {
      floatingButton.classList.remove("jumo-loading");
    }
  }

  /* ── Messages from popup.js ───────────────────────────────────────── */
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "JUMO_PING") {
      sendResponse({ ok: true });
      return;
    }
    if (message?.type === "JUMO_TRIGGER_SCRAPE") {
      runAnalysis();
      sendResponse({ ok: true });
    }
  });
})();
