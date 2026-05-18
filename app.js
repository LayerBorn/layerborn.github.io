/* ──────────────────────────────────────────────────────────────
   LayerBorn storefront — shared JS
   ──────────────────────────────────────────────────────────────
   Loaded by every page. Handles: management-app fetching for
   products, contact form submit + Discord forwarding, mobile nav
   toggle, current-page link highlighting in the nav.
   If the tunnel URL ever changes, update MGMT_API_BASE here.
*/

const MGMT_API_BASE = "https://lounge-bids-actors-workstation.trycloudflare.com";

/* Hardcoded fallback shown only if the management app is offline /
   the URL is wrong. Kept generic so the page never goes blank. */
const FALLBACK_PRODUCTS = [
  { name: "Custom Order", category: "Custom",
    desc: "Have something specific in mind? Message us to get a quote.",
    price_cents: null, etsy_url: "contact.html", image: null, badge: "Ask Us" },
];

/* ── Money / display helpers ─────────────────────────── */
function fmtPrice(cents) {
  if (cents == null) return "Quote";
  return "$" + (cents / 100).toFixed(2);
}

function imageUrlFor(p) {
  if (!p.image) return "";
  if (/^https?:\/\//.test(p.image)) return p.image;
  return MGMT_API_BASE + p.image;
}

function escapeHtml(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ── Product fetching ─────────────────────────────────── */
async function fetchProducts() {
  try {
    const r = await fetch(MGMT_API_BASE + "/api/public/products");
    if (!r.ok) throw new Error("HTTP " + r.status);
    const data = await r.json();
    if (!Array.isArray(data)) throw new Error("Bad response shape");
    return data;
  } catch (err) {
    console.warn("[layerborn] using fallback product list:", err.message);
    return FALLBACK_PRODUCTS;
  }
}

/* ── Product card renderer (shared between home + shop) ─ */
function renderProductCard(p) {
  const href = p.id != null ? `product.html?id=${p.id}` : (p.etsy_url || "contact.html");
  const img = imageUrlFor(p);
  return `
    <a href="${escapeHtml(href)}" class="product-card">
      <div class="product-img-wrap">
        ${img
          ? `<img class="product-img" src="${escapeHtml(img)}" alt="${escapeHtml(p.name)}" loading="lazy"/>`
          : `<div class="product-img-placeholder">${escapeHtml(p.category || 'Layerborn')}</div>`
        }
        ${p.badge ? `<div class="product-badge">${escapeHtml(p.badge)}</div>` : ""}
      </div>
      <div class="product-info">
        <div class="product-category">${escapeHtml(p.category || 'Other')}</div>
        <div class="product-name">${escapeHtml(p.name)}</div>
        ${p.description ? `<div class="product-desc">${escapeHtml(p.description)}</div>` : ""}
        <div class="product-footer">
          <div class="product-price">${escapeHtml(fmtPrice(p.price_cents))}</div>
          <span class="product-btn">${p.price_cents == null ? "Inquire" : "View"}</span>
        </div>
      </div>
    </a>
  `;
}

/* ── Mobile nav toggle ───────────────────────────────── */
function setupNav() {
  const toggle = document.querySelector(".nav-toggle");
  const list   = document.querySelector("nav.site-nav ul");
  if (!toggle || !list) return;
  toggle.addEventListener("click", () => {
    toggle.classList.toggle("open");
    list.classList.toggle("open");
  });
  // Close on link click
  list.querySelectorAll("a").forEach(a => {
    a.addEventListener("click", () => {
      toggle.classList.remove("open");
      list.classList.remove("open");
    });
  });
}

function highlightCurrentNav() {
  const here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  document.querySelectorAll('nav.site-nav ul a').forEach(a => {
    const href = (a.getAttribute('href') || '').toLowerCase();
    if (!href || href.startsWith('http')) return;
    // Strip query/hash for compare
    const cleanHref = href.split('?')[0].split('#')[0];
    if (cleanHref === here || (here === '' && cleanHref === 'index.html')) {
      a.classList.add('active');
    }
  });
}

/* ── Contact form: Formspree + Discord forward ──────── */
function setupContactForm() {
  const form = document.getElementById("contact-form");
  if (!form) return;
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const btn = document.getElementById("form-btn");
    const msg = document.getElementById("form-msg");
    btn.disabled = true; btn.textContent = "Sending…";
    msg.style.display = "none";

    const fd = new FormData(form);
    // Fire-and-forget Discord forward
    fetch(MGMT_API_BASE + "/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name:      fd.get("name"),
        email:     fd.get("email"),
        message:   fd.get("message"),
        _honeypot: fd.get("_honeypot") || "",
      }),
    }).catch(() => {});

    try {
      const res = await fetch(form.action, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        msg.style.color = "var(--accent)";
        msg.textContent = "Message sent! Check your inbox for a confirmation.";
        form.reset();
      } else if (data.errors && data.errors.length) {
        msg.style.color = "#ff4444";
        msg.textContent = data.errors.map(err => err.message).join(", ");
      } else {
        msg.style.color = "#ff4444";
        msg.textContent = "Something went wrong (status " + res.status + "). Email us directly at layerborn0@gmail.com.";
      }
    } catch (err) {
      msg.style.color = "#ff4444";
      msg.textContent = "Network error. Please try again or email us directly.";
    }

    msg.style.display = "block";
    btn.disabled = false;
    btn.textContent = "Send Message →";
  });
}

/* ── FAQ accordion ────────────────────────────────────── */
function setupFaq() {
  document.querySelectorAll(".faq-item").forEach(item => {
    item.addEventListener("click", () => item.classList.toggle("open"));
  });
}

/* ── Bootstrap (called by each page) ─────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  setupNav();
  highlightCurrentNav();
  setupContactForm();
  setupFaq();
});

/* Expose helpers to page-specific scripts */
window.LB = {
  fetchProducts, renderProductCard, fmtPrice, imageUrlFor, escapeHtml,
  MGMT_API_BASE,
};
