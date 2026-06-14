/* ═══════════════════════════════════════════════════
   Shazz Natural's – Main JavaScript
   Shared across all public pages
═══════════════════════════════════════════════════ */

// ─── Settings Cache ───
window._settings = {};

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
  const map = {
    'Face Care': '✨', 'Lip Care': '💋', 'Hair Care': '💆',
    'Natural Oils': '🫙', 'Soaps': '🧼', 'Henna & Mehndi': '🌿',
    'Herbal Powders': '🪴', 'Eye Care': '👁', 'Fragrances': '🌸',
    'Soap Making': '🎨'
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
    <div class="product-card" onclick="window.location.href='/product.html?id=${p.id}'">
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
    </div>`;
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

// ─── Add CSS for spinner ───
const style = document.createElement('style');
style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(style);
