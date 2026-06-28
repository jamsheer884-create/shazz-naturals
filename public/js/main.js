/* ═══════════════════════════════════════════════════
   Shazz Natural's – Main JavaScript
   Shared across all public pages
═══════════════════════════════════════════════════ */

// ─── Settings Cache ───
window._settings = {};

// ─── Sound Effects ───
function _getAC() { return new (window.AudioContext || window.webkitAudioContext)(); }

function soundDreamyKiss() {
  try {
    const a = _getAC();
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, a.currentTime);
    osc.frequency.linearRampToValueAtTime(520, a.currentTime + 0.08);
    osc.frequency.linearRampToValueAtTime(440, a.currentTime + 0.18);
    gain.gain.setValueAtTime(0, a.currentTime);
    gain.gain.linearRampToValueAtTime(0.28, a.currentTime + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.25);
    osc.connect(gain); gain.connect(a.destination);
    osc.start(); osc.stop(a.currentTime + 0.25);
  } catch(e) {}
}

function soundHeartbeat() {
  try {
    function thump(delay) {
      const a = _getAC();
      const osc = a.createOscillator();
      const gain = a.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(80, a.currentTime + delay);
      osc.frequency.exponentialRampToValueAtTime(40, a.currentTime + delay + 0.1);
      gain.gain.setValueAtTime(0, a.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.45, a.currentTime + delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, a.currentTime + delay + 0.15);
      osc.connect(gain); gain.connect(a.destination);
      osc.start(a.currentTime + delay);
      osc.stop(a.currentTime + delay + 0.15);
    }
    thump(0); thump(0.18);
  } catch(e) {}
}

// Wire sounds to clicks after page loads
document.addEventListener('DOMContentLoaded', () => {
  // Dreamy Kiss — all buttons and nav links
  document.addEventListener('click', e => {
    const el = e.target.closest('button, .btn, a.btn, [onclick], .category-card, .category-card-wrap, a[href]');
    if (el) soundDreamyKiss();
  });
});

async function loadSettings() {
  try {
    const data = await fetch('/api/settings').then(r => r.json());
    window._settings = data || {};
    applySettingsToPage(data);
  } catch(e) {
    console.warn('Could not load settings');
  }
}

function applySettingsToPage(s) {
  if (!s) return;
  // Update nav logo from settings (navbar only)
  if (s.logo) {
    document.querySelectorAll('.nav-logo-svg').forEach(el => { el.src = s.logo; });
    document.querySelectorAll('.site-logo, #site-logo').forEach(el => { el.src = s.logo; });
  }
  // Update hero taglines (homepage only)
  if (s.heroLine1) { const el = document.getElementById('hero-line1'); if (el) el.textContent = s.heroLine1; }
  if (s.heroLine2) { const el = document.getElementById('hero-line2'); if (el) el.textContent = s.heroLine2; }
  if (s.heroLine3) { const el = document.getElementById('hero-line3'); if (el) el.textContent = s.heroLine3; }
  // Update category images
  if (s.categoryImages) {
    Object.entries(s.categoryImages).forEach(([key, url]) => {
      if (!url) return;
      const el = document.getElementById('cat-icon-' + key);
      if (el) el.innerHTML = `<img src="${url}" style="width:64px;height:64px;object-fit:cover;border-radius:12px"/>`;
    });
  }
  // Update hero banner image (separate from logo)
  if (s.heroImage) {
    const img = document.getElementById('hero-image-img');
    const placeholder = document.getElementById('hero-img-placeholder');
    if (img) { img.src = s.heroImage; img.style.display = 'block'; }
    if (placeholder) placeholder.style.display = 'none';
  }
  // Update product showcase slides
  if (s.heroSlides && Array.isArray(s.heroSlides)) {
    s.heroSlides.forEach((slide, i) => {
      if (!slide) return;
      const bg = document.getElementById('pss-bg-' + i);
      if (bg && slide.image) bg.innerHTML = `<img src="${slide.image}" style="width:100%;height:100%;object-fit:cover"/>`;
      const contentEl = document.getElementById('pss-content-' + i);
      const overlayEl = document.getElementById('pss-overlay-' + i);
      const labelEl = document.getElementById('pss-label-' + i);
      const titleEl = document.getElementById('pss-title-' + i);
      const subEl = document.getElementById('pss-sub-' + i);
      // Always show content area (Shop Now button always visible when image uploaded)
      if (contentEl) contentEl.style.display = slide.image ? '' : 'none';
      if (overlayEl) overlayEl.style.display = slide.image ? '' : 'none';
      // Text elements only show when user has saved them
      if (labelEl) { labelEl.textContent = slide.label || ''; labelEl.style.display = slide.label ? '' : 'none'; }
      if (titleEl) { titleEl.textContent = slide.title || ''; titleEl.style.display = slide.title ? '' : 'none'; }
      if (subEl) { subEl.textContent = slide.subtitle || ''; subEl.style.display = slide.subtitle ? '' : 'none'; }
    });
  }
  // Update about section image
  if (s.aboutImage) {
    const img = document.getElementById('about-image-img');
    const placeholder = document.getElementById('about-img-placeholder');
    if (img) { img.src = s.aboutImage; img.style.display = 'block'; }
    if (placeholder) placeholder.style.display = 'none';
  }
  // Update contact details if elements exist
  const emailEls = document.querySelectorAll('#contact-email, #footer-email');
  emailEls.forEach(el => { if (s.email) el.textContent = s.email; });
  const addrEls = document.querySelectorAll('#contact-address, #footer-address');
  addrEls.forEach(el => { if (s.address) el.textContent = s.address; });
}

// ─── Cart Badge ───
async function updateCartBadge() {
  try {
    const data = await fetch('/api/cart').then(r => r.json());
    const cart = data.cart || [];
    const count = cart.reduce((s, i) => s + i.quantity, 0);
    const badges = document.querySelectorAll('#cart-count');
    badges.forEach(badge => {
      if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    });
  } catch(e) {}
}

// ─── Add to Cart ───
async function addToCart(productId, event) {
  if (event) event.stopPropagation();
  const btn = event?.currentTarget;
  if (btn) {
    btn.innerHTML = '<span style="display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,0.4);border-top-color:white;border-radius:50%;animation:spin 0.6s linear infinite"></span>';
    btn.disabled = true;
  }
  try {
    const res = await fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, quantity: 1 })
    });
    const data = await res.json();
    if (data.success) {
      soundHeartbeat();
      showToast('Added to cart! 🛒', 'cart');
      updateCartBadge();
      if (btn) {
        btn.innerHTML = '✓ Added';
        btn.classList.add('added');
        setTimeout(() => {
          btn.innerHTML = '<i class="fa fa-shopping-bag"></i> Add to Cart';
          btn.classList.remove('added');
          btn.disabled = false;
        }, 1500);
      }
    } else {
      showToast('Could not add to cart', 'error');
      if (btn) { btn.innerHTML = '<i class="fa fa-shopping-bag"></i> Add to Cart'; btn.disabled = false; }
    }
  } catch(e) {
    showToast('Network error. Please try again.', 'error');
    if (btn) { btn.innerHTML = '<i class="fa fa-shopping-bag"></i> Add to Cart'; btn.disabled = false; }
  }
}

// ─── Toast Notifications ───
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const icons = { success: '✅', error: '❌', cart: '🛒', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span><span class="toast-msg">${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(30px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ─── Category Emoji ───
function getCategoryEmoji(category) {
  if (window._catEmojiMap && window._catEmojiMap[category]) return window._catEmojiMap[category];
  const map = {
    'Face Care': '✨', 'Lip Care': '💋', 'Hair Care': '💆',
    'Natural Oils': '🫙', 'Soaps': '🧼', 'Henna & Mehndi': '🌿',
    'Herbal Powders': '🪴', 'Eye Care': '👁', 'Fragrances': '🌸',
    'Soap Making': '🎨', 'Ornaments': '💎'
  };
  return map[category] || '🌿';
}

// ─── Product Card Renderer ───
function renderProductCard(p) {
  const discount = p.originalPrice ? Math.round((1 - p.price / p.originalPrice) * 100) : 0;
  const stars = '★'.repeat(Math.round(p.rating || 4)) + '☆'.repeat(5 - Math.round(p.rating || 4));
  const emoji = getCategoryEmoji(p.category);
  const badgeHtml = p.badge
    ? `<span class="badge badge-gold">${p.badge}</span>`
    : '';
  const discountBadge = discount >= 10
    ? `<span class="badge badge-red">${discount}% OFF</span>`
    : '';
  const inStockHtml = !p.inStock
    ? '<div style="position:absolute;inset:0;background:rgba(255,255,255,0.7);display:flex;align-items:center;justify-content:center;font-weight:700;color:#c62828;font-size:0.85rem">Out of Stock</div>'
    : '';
  return `
    <div class="product-card-wrap" onmousemove="_tilt3d(this,event)" onmouseleave="_resetTilt(this)">
    <div class="product-card" onclick="window.location.href='/product.html?id=${p.id}'">
      <div class="card-shine"></div>
      <div class="product-img-wrap">
        <img src="${p.image}"
          onerror="this.style.display='none';this.nextSibling.style.display='flex'"
          alt="${p.name}"
          style="width:100%;height:100%;object-fit:cover"
          loading="lazy"
        />
        <div class="product-img-placeholder" style="display:none">
          <div class="prod-icon">${emoji}</div>
          <div style="font-size:0.75rem;color:#aaa">${p.category}</div>
        </div>
        ${inStockHtml}
        <div class="product-badge-wrap">
          ${badgeHtml}
          ${discountBadge}
        </div>
      </div>
      <div class="product-info">
        <div class="product-category">${p.category}</div>
        <div class="product-name">${p.name}</div>
        <div class="product-rating">
          <span class="stars">${stars}</span>
          <span class="rating-count">(${p.reviewCount || 0})</span>
        </div>
        ${p.weight ? `<div style="font-size:0.75rem;color:#888;margin-bottom:8px">📦 ${p.weight}</div>` : ''}
        <div class="product-price-row">
          <span class="product-price">₹${p.price}</span>
          ${p.originalPrice ? `<span class="product-original-price">₹${p.originalPrice}</span>` : ''}
        </div>
        <button
          class="product-add-btn"
          onclick="addToCart('${p.id}', event)"
          ${!p.inStock ? 'disabled style="opacity:0.5;cursor:not-allowed"' : ''}
        >
          <i class="fa fa-shopping-bag"></i>
          ${p.inStock ? 'Add to Cart' : 'Out of Stock'}
        </button>
      </div>
    </div>
    </div>`;
}

// ─── 3D Card Tilt ───
function _tilt3d(wrap, e) {
  const card = wrap.querySelector('.product-card');
  const shine = wrap.querySelector('.card-shine');
  const rect = wrap.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const cx = rect.width / 2;
  const cy = rect.height / 2;
  const rotX = ((y - cy) / cy) * -14;
  const rotY = ((x - cx) / cx) * 14;
  card.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(1.04,1.04,1.04)`;
  card.style.boxShadow = `${-rotY * 1.2}px ${rotX * 1.2}px 40px rgba(0,0,0,0.18)`;
  if (shine) shine.style.background = `radial-gradient(circle at ${(x/rect.width)*100}% ${(y/rect.height)*100}%, rgba(255,255,255,0.38) 0%, transparent 55%)`;
}
function _resetTilt(wrap) {
  const card = wrap.querySelector('.product-card');
  card.style.transition = 'transform 0.5s ease, box-shadow 0.5s ease, border-color 0.3s';
  card.style.transform = 'rotateX(0) rotateY(0) scale3d(1,1,1)';
  card.style.boxShadow = '';
  setTimeout(() => { card.style.transition = 'transform 0.1s ease, box-shadow 0.1s ease, border-color 0.3s'; }, 500);
}

// ─── Smooth scroll for anchor links ───
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('a[href^="/#"]').forEach(link => {
    link.addEventListener('click', function(e) {
      const target = this.getAttribute('href');
      if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
        e.preventDefault();
        const id = target.replace('/#', '');
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
});

// ─── Device Preview Toggle ───
function setDeviceView(mode) {
  const html = document.documentElement;
  const pcBtn = document.getElementById('dt-pc');
  const mbBtn = document.getElementById('dt-mobile');
  if (mode === 'mobile') {
    html.classList.add('mobile-preview');
    if (pcBtn) pcBtn.classList.remove('dt-active');
    if (mbBtn) mbBtn.classList.add('dt-active');
  } else {
    html.classList.remove('mobile-preview');
    if (pcBtn) pcBtn.classList.add('dt-active');
    if (mbBtn) mbBtn.classList.remove('dt-active');
  }
  localStorage.setItem('deviceView', mode);
  if (mode === 'mobile') {
    document.body.scrollTop = 0;
  } else {
    window.scrollTo(0, 0);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (window.innerWidth <= 768) return; // real phones already get the responsive layout; this preview is a desktop-only tool
  const toggle = document.createElement('div');
  toggle.className = 'device-toggle';
  toggle.innerHTML = `
    <button class="dt-btn dt-active" id="dt-pc" onclick="setDeviceView('pc')">🖥 PC</button>
    <button class="dt-btn" id="dt-mobile" onclick="setDeviceView('mobile')">📱 Mobile</button>
  `;
  document.body.appendChild(toggle);
  if (localStorage.getItem('deviceView') === 'mobile') setDeviceView('mobile');
});

// ─── Product Showcase Slider ───
let pssIndex = 0;
let pssTimer = null;

function pssGo(n) {
  const slides = document.querySelectorAll('.pss-slide');
  if (!slides.length) return;
  pssIndex = ((n % slides.length) + slides.length) % slides.length;
  const track = document.getElementById('pss-track');
  if (track) track.style.transform = `translateX(-${pssIndex * 100}%)`;
  document.querySelectorAll('.pss-dot').forEach((d, i) => d.classList.toggle('active', i === pssIndex));
  clearInterval(pssTimer);
  pssTimer = setInterval(() => pssGo(pssIndex + 1), 6000);
}

function pssMove(dir) { pssGo(pssIndex + dir); }

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('pss-track')) {
    pssTimer = setInterval(() => pssGo(pssIndex + 1), 6000);
  }
});

// ─── Add CSS for spinner ───
const style = document.createElement('style');
style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(style);
