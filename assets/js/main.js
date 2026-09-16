/* ==========================================================================
   Zan Top-Up — site behaviour
   ========================================================================== */
(function () {
  "use strict";

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $  = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /* --- Theme ------------------------------------------------------------- */
  const THEME_KEY = "zan-theme";

  function readTheme() {
    try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; }
  }
  function writeTheme(v) {
    try { localStorage.setItem(THEME_KEY, v); } catch (e) { /* private mode */ }
  }
  function setTheme(v) {
    document.documentElement.setAttribute("data-theme", v);
    const btn = $("[data-theme-toggle]");
    if (btn) {
      btn.setAttribute("aria-pressed", String(v === "light"));
      btn.setAttribute("aria-label",
        v === "light" ? "Switch to dark theme" : "Switch to light theme");
    }
  }

  setTheme(readTheme() || "dark");

  const themeBtn = $("[data-theme-toggle]");
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const next =
        document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
      setTheme(next);
      writeTheme(next);
    });
  }

  /* --- Mobile navigation -------------------------------------------------- */
  const navToggle = $("[data-nav-toggle]");
  const nav = $("#primaryNav");

  function isMobile() { return window.matchMedia("(max-width: 760px)").matches; }

  function syncNav() {
    if (!nav || !navToggle) return;
    if (isMobile()) {
      const open = navToggle.getAttribute("aria-expanded") === "true";
      nav.hidden = !open;
    } else {
      nav.hidden = false;
      navToggle.setAttribute("aria-expanded", "false");
    }
  }

  if (navToggle && nav) {
    navToggle.addEventListener("click", () => {
      const open = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", String(!open));
      syncNav();
    });
    window.addEventListener("resize", syncNav);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isMobile() && navToggle.getAttribute("aria-expanded") === "true") {
        navToggle.setAttribute("aria-expanded", "false");
        syncNav();
        navToggle.focus();
      }
    });
    syncNav();
  }

  /* --- Reveal on scroll ---------------------------------------------------
     The hidden state is applied by JS only, so a failed script or a blocked
     observer can never leave real content stranded at opacity 0.            */
  let observer = null;
  if (!reduced && "IntersectionObserver" in window) {
    document.documentElement.classList.add("js-motion");
    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
  }

  window.ZanMotion = {
    observe: function (nodes) {
      const list = Array.prototype.slice.call(nodes);
      if (!observer) { list.forEach((n) => n.classList.add("is-in")); return; }
      list.forEach((n) => observer.observe(n));
    }
  };
  window.ZanMotion.observe(document.querySelectorAll(".reveal"));

  /* Safety net: if anything is still hidden shortly after load, show it. */
  window.addEventListener("load", () => {
    window.setTimeout(() => {
      $$(".reveal:not(.is-in)").forEach((n) => n.classList.add("is-in"));
    }, 1200);
  });

  /* --- FAQ accordion ------------------------------------------------------ */
  $$(".faq__q").forEach((btn) => {
    btn.addEventListener("click", () => {
      const panel = document.getElementById(btn.getAttribute("aria-controls"));
      const open = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!open));
      if (panel) panel.hidden = open;
    });
  });

  /* --- Config-driven links ------------------------------------------------ */
  const cfg = (window.ZanStore && window.ZanStore.config) || window.ZAN_CONFIG || null;

  if (cfg) {
    $$("[data-link='instagram']").forEach((a) => { if (cfg.instagram) a.href = cfg.instagram; });
    $$("[data-link='twitter']").forEach((a) => { if (cfg.twitter) a.href = cfg.twitter; });
    $$("[data-link='telegram']").forEach((a) => {
      if (cfg.telegram) { a.href = "https://t.me/" + cfg.telegram; }
    });
    $$("[data-link='whatsapp']").forEach((a) => {
      if (cfg.whatsapp) { a.href = "https://wa.me/" + cfg.whatsapp; }
      else { a.closest("li") ? a.closest("li").remove() : a.remove(); }
    });
    $$("[data-link='email']").forEach((a) => {
      if (cfg.email) { a.href = "mailto:" + cfg.email; a.textContent = cfg.email; }
    });
    $$("[data-text='telegram']").forEach((el) => {
      if (cfg.telegram) el.textContent = "@" + cfg.telegram;
    });
    $$("[data-delivery], #heroDelivery").forEach((el) => {
      if (cfg.deliveryWindow) el.textContent = cfg.deliveryWindow;
    });
  }

  /* --- Copy to clipboard -------------------------------------------------- */
  function copyText(text, button) {
    const done = () => {
      const original = button.dataset.originalLabel || button.textContent;
      button.dataset.originalLabel = original;
      button.textContent = "Copied";
      window.setTimeout(() => { button.textContent = original; }, 1800);
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallback(text, done));
    } else {
      fallback(text, done);
    }
  }
  function fallback(text, done) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); done(); } catch (e) { /* ignore */ }
    document.body.removeChild(ta);
  }

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-copy]");
    if (!btn) return;
    copyText(btn.dataset.copy || "", btn);
  });

  /* --- Checkout sheet ----------------------------------------------------- */
  const sheet = $("#checkout");

  if (sheet && window.ZanStore) {
    const store = window.ZanStore;
    const money = store.money;
    const nf = store.nf;

    const els = {
      amount:  $("#coAmount", sheet),
      game:    $("#coGame", sheet),
      price:   $("#coPrice", sheet),
      idLabel: $("#coIdLabel", sheet),
      idHint:  $("#coIdHint", sheet),
      idInput: $("#coPlayerId", sheet),
      name:    $("#coPlayerName", sheet),
      upiPane: $("#coUpi", sheet),
      cardPane:$("#coCard", sheet),
      upiCode: $("#coUpiId", sheet),
      upiCopy: $("#coUpiCopy", sheet),
      upiOpen: $("#coUpiOpen", sheet),
      cardOpen:$("#coCardOpen", sheet),
      confirm: $("#coConfirm", sheet),
      error:   $("#coError", sheet),
      delivery:$("#coDelivery", sheet),
      methods: $$(".method", sheet)
    };

    let current = null;
    let method = "upi";
    let lastTrigger = null;

    if (els.upiCode) els.upiCode.textContent = store.config.upiId;
    if (els.upiCopy) els.upiCopy.dataset.copy = store.config.upiId;
    if (els.delivery) els.delivery.textContent = store.config.deliveryWindow;

    function upiLink(order) {
      const p = new URLSearchParams({
        pa: store.config.upiId,
        pn: store.config.payeeName,
        am: String(order.price),
        cu: "INR",
        tn: order.game.name + " " + nf.format(order.amount) + " " + order.game.unit
      });
      return "upi://pay?" + p.toString();
    }

    function orderText(order, playerId, playerName) {
      return [
        "Zan Top-Up order",
        order.game.name + " — " + nf.format(order.amount) + " " + order.game.unit,
        "Amount: " + money(order.price),
        "Player ID: " + playerId,
        playerName ? "In-game name: " + playerName : null,
        "Paid by: " + (method === "upi" ? "UPI" : "Card"),
        "(Payment screenshot attached)"
      ].filter(Boolean).join("\n");
    }

    function setMethod(next) {
      method = next;
      els.methods.forEach((m) =>
        m.setAttribute("aria-pressed", String(m.dataset.method === next)));
      if (els.upiPane) els.upiPane.hidden = next !== "upi";
      if (els.cardPane) els.cardPane.hidden = next !== "card";
    }

    els.methods.forEach((m) => {
      m.addEventListener("click", () => { if (!m.disabled) setMethod(m.dataset.method); });
    });

    function openSheet(trigger) {
      const game = store.getGame(trigger.dataset.game);
      if (!game) return;
      const amount = Number(trigger.dataset.amount);
      const price = Number(trigger.dataset.price);
      current = { game: game, amount: amount, price: price };
      lastTrigger = trigger;

      els.amount.textContent = nf.format(amount) + " " + game.unit;
      els.game.textContent = game.name;
      els.price.textContent = money(price);
      els.idLabel.textContent = game.idLabel;
      els.idHint.textContent = game.idHint;
      els.idInput.value = "";
      els.name.value = "";
      els.error.textContent = "";

      setMethod(store.config.cardPaymentUrl ? method : "upi");

      if (els.upiOpen) els.upiOpen.href = upiLink(current);
      if (els.cardOpen) els.cardOpen.href = store.config.cardPaymentUrl || "#";

      if (typeof sheet.showModal === "function") sheet.showModal();
      else sheet.setAttribute("open", "");
      window.setTimeout(() => els.idInput.focus(), 40);
    }

    document.addEventListener("click", (e) => {
      const buy = e.target.closest("[data-buy]");
      if (buy) { e.preventDefault(); openSheet(buy); return; }
      const close = e.target.closest("[data-close-sheet]");
      if (close) { e.preventDefault(); sheet.close(); }
    });

    sheet.addEventListener("close", () => {
      if (lastTrigger && document.contains(lastTrigger)) lastTrigger.focus();
    });

    /* Click on the backdrop closes the sheet */
    sheet.addEventListener("click", (e) => {
      if (e.target === sheet) sheet.close();
    });

    function requireId() {
      const id = els.idInput.value.trim();
      if (id.length < 5) {
        els.error.textContent = "Enter your player ID first so the top-up reaches the right account.";
        els.idInput.focus();
        return null;
      }
      els.error.textContent = "";
      return id;
    }

    if (els.upiOpen) {
      els.upiOpen.addEventListener("click", (e) => {
        if (!requireId()) e.preventDefault();
      });
    }
    function showOrderHandoff(id) {
      const text = orderText(current, id, els.name.value.trim());
      let url;
      if (store.config.whatsapp) {
        url = "https://wa.me/" + store.config.whatsapp + "?text=" + encodeURIComponent(text);
      } else if (store.config.telegram) {
        url = "https://t.me/" + store.config.telegram;
      } else {
        url = "mailto:" + (store.config.email || "") +
              "?subject=" + encodeURIComponent("Zan Top-Up order") +
              "&body=" + encodeURIComponent(text);
      }
      window.open(url, "_blank", "noopener");
    }

    let razorpayKey = null;
    let paymentBusy = false;

    async function getRazorpayKey() {
      if (razorpayKey) return razorpayKey;
      const res = await fetch("/api/config");
      const data = await res.json();
      if (!res.ok || !data.key_id) throw new Error("Razorpay is not configured.");
      razorpayKey = data.key_id;
      return razorpayKey;
    }

    async function startRazorpayPayment() {
      const id = requireId();
      if (!id || !current || paymentBusy) return;
      if (typeof window.Razorpay !== "function") {
        els.error.textContent = "The payment window could not load. Check your connection and try again.";
        return;
      }

      paymentBusy = true;
      els.confirm.disabled = true;
      if (els.cardOpen) els.cardOpen.disabled = true;
      els.error.textContent = "Preparing secure payment…";

      try {
        const orderResponse = await fetch("/api/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: Math.round(current.price * 100),
            currency: "INR",
            receipt: "zan_" + Date.now()
          })
        });
        const orderData = await orderResponse.json();
        if (!orderResponse.ok) throw new Error(orderData.error || "Unable to create payment order.");

        const checkout = new window.Razorpay({
          key: await getRazorpayKey(),
          amount: orderData.amount,
          currency: orderData.currency,
          order_id: orderData.order_id,
          name: "Zan Top-Up",
          description: current.game.name + " " + current.amount + " " + current.game.unit,
          notes: { player_id: id, game: current.game.id },
          handler: async function (payment) {
            try {
              const verifyResponse = await fetch("/api/verify-payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payment)
              });
              const verifyData = await verifyResponse.json();
              if (!verifyResponse.ok || !verifyData.verified) {
                throw new Error(verifyData.error || "Payment verification failed.");
              }
              els.error.textContent = "Payment verified. Opening your order message…";
              showOrderHandoff(id);
              window.setTimeout(() => sheet.close(), 300);
            } catch (error) {
              els.error.textContent = error.message;
            } finally {
              paymentBusy = false;
              els.confirm.disabled = false;
              if (els.cardOpen) els.cardOpen.disabled = false;
            }
          },
          modal: {
            ondismiss: function () {
              paymentBusy = false;
              els.confirm.disabled = false;
              if (els.cardOpen) els.cardOpen.disabled = false;
              els.error.textContent = "Payment cancelled. No order was placed.";
            }
          }
        });

        checkout.on("payment.failed", function (event) {
          paymentBusy = false;
          els.confirm.disabled = false;
          if (els.cardOpen) els.cardOpen.disabled = false;
          els.error.textContent = (event.error && event.error.description) || "Payment failed. Try another method.";
        });
        checkout.open();
      } catch (error) {
        paymentBusy = false;
        els.confirm.disabled = false;
        if (els.cardOpen) els.cardOpen.disabled = false;
        els.error.textContent = error.message || "Unable to start payment.";
      }
    }

    if (els.cardOpen) els.cardOpen.addEventListener("click", startRazorpayPayment);
    if (els.confirm) els.confirm.addEventListener("click", startRazorpayPayment);
  }

  /* --- Contact form ------------------------------------------------------- */
  const form = $("#contactForm");
  if (form && cfg) {
    const status = $("#formStatus");

    function say(msg, state) {
      if (!status) return;
      status.textContent = msg;
      status.dataset.state = state || "ok";
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      const name = form.elements.name.value.trim();
      const email = form.elements.email.value.trim();
      const message = form.elements.message.value.trim();

      if (!name || !email || !message) {
        say("Fill in your name, email and message before sending.", "error");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        say("That email address does not look right. Check it and try again.", "error");
        return;
      }

      /* Route A — Formspree, when an endpoint is configured. */
      if (cfg.formspreeEndpoint) {
        say("Sending…");
        fetch(cfg.formspreeEndpoint, {
          method: "POST",
          headers: { Accept: "application/json" },
          body: new FormData(form)
        })
          .then((res) => {
            if (!res.ok) throw new Error("bad status");
            form.reset();
            say("Message sent. We reply within a working day.");
          })
          .catch(() => {
            say("That did not go through. Email us directly at " + cfg.email + ".", "error");
          });
        return;
      }

      /* Route B — no endpoint set, hand off to the visitor's mail app. */
      const body =
        "Name: " + name + "\nEmail: " + email + "\n\n" + message;
      window.location.href =
        "mailto:" + cfg.email +
        "?subject=" + encodeURIComponent("Website enquiry from " + name) +
        "&body=" + encodeURIComponent(body);
      say("Your mail app is opening with the message ready to send.");
    });
  }

  /* --- Year stamp --------------------------------------------------------- */
  $$("[data-year]").forEach((el) => { el.textContent = String(new Date().getFullYear()); });
})();
