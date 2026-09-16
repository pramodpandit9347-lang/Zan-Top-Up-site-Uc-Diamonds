/* ==========================================================================
   Zan Top-Up — catalogue + store settings
   --------------------------------------------------------------------------
   EDIT THIS FILE to change prices, add packs, or set your payment details.
   Nothing else needs to change: the site rebuilds the rack, the per-100 rate
   and the "best rate" tag from this data every time the page loads.
   ========================================================================== */

/* --- 1. Store settings ---------------------------------------------------- */
const ZAN_CONFIG = {
  /* UPI ID that receives payments. Shown to the buyer and used to build the
     "Open UPI app" link. Replace with your own VPA, e.g. "zantopup@okaxis". */
  upiId: "zantopup@nyes",

  /* Name shown inside the buyer's UPI app when the link opens. */
  payeeName: "Zan Top-Up",

  /* Hosted payment page for card payments — a Razorpay / PayU / Cashfree
     payment link works well. Leave empty ("") to hide the card option. */
  cardPaymentUrl: "razorpay.me@zantopup",

  /* WhatsApp number in international format, digits only, no + or spaces.
     Used to send the order details after payment. Leave "" to hide. */
  whatsapp: "8374604403",

  /* Telegram username without the @. Leave "" to hide. */
  telegram: "zantopup",

  /* Social profiles used by the header, footer and contact page. */
  instagram: "https://www.instagram.com/hazeflux_editrix?stkn=MXZpam5sN2llMTdlOQ==",
  twitter: "https://zantopup.com/",

  /* Contact form. Leave formspreeEndpoint empty to fall back to mailto. */
  email: "support@zantopup.example",
  formspreeEndpoint: "",

  /* Typical delivery window, shown in the checkout sheet. */
  deliveryWindow: "5–30 minutes"
};

/* --- 2. Catalogue --------------------------------------------------------- */
const ZAN_CATALOGUE = [
  {
    id: "freefire",
    name: "Free Fire",
    unit: "Diamonds",
    unitShort: "DIAMONDS",
    idLabel: "Free Fire player ID",
    idHint: "Open Free Fire, tap your avatar — the ID is the number under your name.",
    packs: [
      { amount: 250,  price: 80 },
      { amount: 560,  price: 160 },
      { amount: 1120, price: 340 },
      { amount: 2140, price: 680 },
      { amount: 4290, price: 1340 },
      { amount: 8680, price: 2760 }
    ]
  },
  {
    id: "bgmi",
    name: "BGMI",
    unit: "UC",
    unitShort: "UC",
    idLabel: "BGMI character ID",
    idHint: "Open BGMI, go to your profile — the character ID sits under your name.",
    packs: [
      { amount: 120,   price: 70 },
      { amount: 720,   price: 390 },
      { amount: 1440,  price: 640 },
      { amount: 2510,  price: 960 },
      { amount: 4820,  price: 1240 },
      { amount: 11060, price: 1610 },
      { amount: 24620, price: 3160 }
    ]
  }
];

/* ==========================================================================
   Below this line is rendering logic — you should not need to edit it.
   ========================================================================== */
window.ZAN_CONFIG = ZAN_CONFIG;
window.ZAN_CATALOGUE = ZAN_CATALOGUE;

(function () {
  "use strict";

  const grid = document.getElementById("packGrid");

  const tabs = Array.from(document.querySelectorAll(".game-tab"));
  const searchInput = document.getElementById("packSearch");
  const sortSelect = document.getElementById("packSort");
  const liveCount = document.getElementById("packCount");

  const nf = new Intl.NumberFormat("en-IN");
  const money = (n) => "₹" + nf.format(n);
  const rupees2 = (n) => "₹" + n.toFixed(2);

  const getGameById = (id) => ZAN_CATALOGUE.find((g) => g.id === id);

  /* Expose for the checkout sheet in main.js (every page needs this). */
  window.ZanStore = {
    config: ZAN_CONFIG,
    catalogue: ZAN_CATALOGUE,
    getGame: getGameById,
    money: money,
    nf: nf
  };

  if (!grid) return;

  let activeGame = ZAN_CATALOGUE[0].id;

  /* Rate per 100 units — the honest comparison number. Lower is better. */
  const rate = (p) => (p.price / p.amount) * 100;

  function buildRows(game) {
    const best = Math.min(...game.packs.map(rate));
    return game.packs.map((p, i) => ({
      ...p,
      game,
      order: i,
      rate: rate(p),
      isBest: Math.abs(rate(p) - best) < 1e-9
    }));
  }

  function applyFilters(rows) {
    const q = (searchInput ? searchInput.value : "").trim().toLowerCase();
    let out = rows;

    if (q) {
      const digits = q.replace(/[^0-9]/g, "");
      out = out.filter((r) => {
        const hay = [
          String(r.amount),
          String(r.price),
          r.game.name,
          r.game.unit
        ].join(" ").toLowerCase();
        return hay.includes(q) || (digits && (String(r.amount).includes(digits) || String(r.price).includes(digits)));
      });
    }

    const mode = sortSelect ? sortSelect.value : "default";
    const sorted = out.slice();
    if (mode === "price-asc") sorted.sort((a, b) => a.price - b.price);
    else if (mode === "price-desc") sorted.sort((a, b) => b.price - a.price);
    else if (mode === "rate") sorted.sort((a, b) => a.rate - b.rate);
    else sorted.sort((a, b) => a.order - b.order);

    return sorted;
  }

  function packMarkup(r) {
    const el = document.createElement("article");
    el.className = "pack";
    el.dataset.game = r.game.id;

    const tag = r.isBest
      ? '<span class="tag">Best rate</span>'
      : "";

    el.innerHTML = `
      ${tag}
      <p class="pack__amount">${nf.format(r.amount)}<span class="pack__unit">${r.game.unitShort}</span></p>
      <p class="pack__price">${money(r.price)}</p>
      <div class="pack__meta">
        <span class="pack__rate">${rupees2(r.rate)} per 100</span>
        <span>${r.game.name}</span>
      </div>
      <div class="pack__cta">
        <button class="btn btn--primary btn--wide btn--sm" type="button"
          data-buy data-game="${r.game.id}" data-amount="${r.amount}" data-price="${r.price}">
          Top up
        </button>
      </div>`;
    return el;
  }

  function render() {
    const game = getGameById(activeGame);
    const rows = applyFilters(buildRows(game));

    grid.innerHTML = "";

    if (!rows.length) {
      const empty = document.createElement("div");
      empty.className = "packs__empty";
      empty.innerHTML =
        "<p>No pack matches that search. Clear the box to see every " +
        game.unit.toLowerCase() + " pack.</p>";
      grid.appendChild(empty);
    } else {
      const frag = document.createDocumentFragment();
      rows.forEach((r) => {
        frag.appendChild(packMarkup(r));
      });
      grid.appendChild(frag);
    }

    if (liveCount) {
      liveCount.textContent =
        rows.length + " " + (rows.length === 1 ? "pack" : "packs") +
        " for " + game.name;
    }

    if (window.ZanMotion && typeof window.ZanMotion.observe === "function") {
      window.ZanMotion.observe(grid.querySelectorAll(".reveal"));
    }
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      activeGame = tab.dataset.game;
      tabs.forEach((t) => t.setAttribute("aria-selected", String(t === tab)));
      render();
    });
  });

  if (searchInput) searchInput.addEventListener("input", render);
  if (sortSelect) sortSelect.addEventListener("change", render);

  render();
})();
