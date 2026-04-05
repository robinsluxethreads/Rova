// ===== SITE CONFIG =====
let siteConfig = {};
let products = [];

function loadConfig() {
  return fetch('data/config.json')
    .then(r => r.json())
    .then(data => { siteConfig = data; return data; })
    .catch(() => { siteConfig = {}; return {}; });
}

function loadProducts() {
  return fetch('data/products.json')
    .then(res => res.json())
    .then(data => { products = data; return data; })
    .catch(() => { products = []; return []; });
}

// Load both config and products
function loadSiteData() {
  return Promise.all([loadConfig(), loadProducts()]);
}

// Currency formatter
function formatPrice(amount) {
  const sym = (siteConfig.currency && siteConfig.currency.symbol) || '₹';
  return `${sym}${amount.toLocaleString('en-IN')}`;
}

// Get config values safely
function cfg(path, fallback) {
  const keys = path.split('.');
  let val = siteConfig;
  for (const k of keys) {
    if (val && typeof val === 'object' && k in val) val = val[k];
    else return fallback || '';
  }
  return val;
}

// Apply brand name to all logo elements and footer copyright
function applyBranding() {
  const brandName = cfg('brand.name', 'ROBINS LUXE THREADS');
  const year = cfg('brand.year', '2027');
  document.querySelectorAll('.navbar__logo').forEach(el => el.textContent = brandName);
  document.querySelectorAll('.footer__bottom').forEach(el => {
    el.innerHTML = `&copy; ${year} ${brandName}. All rights reserved.`;
  });
  document.querySelectorAll('.footer__brand-desc').forEach(el => {
    el.textContent = cfg('brand.tagline', '');
  });
}

// ===== TOAST =====
function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// ===== MOBILE NAV =====
function toggleNav() {
  const links = document.getElementById('navLinks');
  if (links) links.classList.toggle('open');
}

// ===== IMAGE HELPER =====
function productImageHTML(p, size) {
  const hasImages = p.images && p.images.length > 0;
  if (hasImages) {
    return `<img src="${p.images[0]}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.innerHTML='<span style=\\'font-size:${size};\\'>${p.emoji || '👗'}</span>'">`;
  }
  return `<span style="font-size:${size};">${p.emoji || '👗'}</span>`;
}

// ===== RENDER PRODUCTS =====
function renderProducts(containerId, productList) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (productList.length === 0) {
    container.innerHTML = '<p style="text-align:center;color:var(--text-secondary);grid-column:1/-1;padding:40px;">No products found matching your filters.</p>';
    return;
  }

  container.innerHTML = productList.map(p => `
    <a href="product.html?id=${p.id}" class="product-card">
      <div class="product-card__image">
        <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#1a1a1a,#111);">${productImageHTML(p, '4rem')}</div>
        ${p.badge ? `<span class="product-card__badge">${p.badge}</span>` : ''}
      </div>
      <div class="product-card__info">
        <p class="product-card__category">${p.category}</p>
        <h3 class="product-card__name">${p.name}</h3>
        <div class="product-card__price">
          <span class="product-card__price--current">${formatPrice(p.price)}</span>
          ${p.oldPrice ? `<span class="product-card__price--old">${formatPrice(p.oldPrice)}</span>` : ''}
        </div>
      </div>
    </a>
  `).join('');
}

// ===== SHOP FILTERING =====
function filterProducts() {
  const categories = cfg('categories', []);
  const catValues = categories.map(c => c.slug);
  const categoryCheckboxes = document.querySelectorAll('.filter-group input[type="checkbox"]');
  const selectedCategories = Array.from(categoryCheckboxes).filter(cb => catValues.includes(cb.value) && cb.checked).map(cb => cb.value);

  const sizeValues = ['XS','S','M','L','XL','XXL','One Size'];
  const sizeCheckboxes = Array.from(categoryCheckboxes).filter(cb => sizeValues.includes(cb.value));
  const selectedSizes = sizeCheckboxes.filter(cb => cb.checked).map(cb => cb.value);

  const priceFilter = document.getElementById('priceFilter');
  const priceRange = priceFilter ? priceFilter.value : 'all';

  const sortFilter = document.getElementById('sortFilter');
  const sortBy = sortFilter ? sortFilter.value : 'default';

  let filtered = products.filter(p => {
    const catMatch = selectedCategories.length === 0 || selectedCategories.includes(p.category.toLowerCase());
    const sizeMatch = selectedSizes.length === 0 || p.sizes.some(s => selectedSizes.includes(s));

    let priceMatch = true;
    if (priceRange === '0-1000') priceMatch = p.price < 1000;
    else if (priceRange === '1000-3000') priceMatch = p.price >= 1000 && p.price <= 3000;
    else if (priceRange === '3000-10000') priceMatch = p.price >= 3000 && p.price <= 10000;
    else if (priceRange === '10000+') priceMatch = p.price > 10000;

    return catMatch && sizeMatch && priceMatch;
  });

  if (sortBy === 'price-low') filtered.sort((a, b) => a.price - b.price);
  else if (sortBy === 'price-high') filtered.sort((a, b) => b.price - a.price);
  else if (sortBy === 'name') filtered.sort((a, b) => a.name.localeCompare(b.name));

  renderProducts('shopProducts', filtered);

  const countEl = document.getElementById('productCount');
  if (countEl) countEl.textContent = `Showing ${filtered.length} product${filtered.length !== 1 ? 's' : ''}`;
}

function clearFilters() {
  document.querySelectorAll('.filter-group input[type="checkbox"]').forEach(cb => cb.checked = false);
  const priceFilter = document.getElementById('priceFilter');
  if (priceFilter) priceFilter.value = 'all';
  const sortFilter = document.getElementById('sortFilter');
  if (sortFilter) sortFilter.value = 'default';
  filterProducts();
}

// ===== DYNAMIC CATEGORIES =====
function renderCategories(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const categories = cfg('categories', []);
  container.innerHTML = categories.map(c => `
    <a href="shop.html?category=${c.slug}" class="category-card">
      <div class="category-card__overlay">
        <span class="category-card__name">${c.name}</span>
      </div>
      <div style="width:100%;height:100%;background:${c.gradient || 'linear-gradient(135deg,#1a1a1a,#111)'};display:flex;align-items:center;justify-content:center;font-size:3rem;">${c.emoji}</div>
    </a>
  `).join('');
}

// ===== DYNAMIC SHOP SIDEBAR =====
function renderShopSidebar() {
  const catGroup = document.getElementById('categoryFilters');
  if (!catGroup) return;
  const categories = cfg('categories', []);
  catGroup.innerHTML = categories.map(c => `
    <label><input type="checkbox" value="${c.slug}" onchange="filterProducts()"> ${c.name}</label>
  `).join('');
}

// ===== DYNAMIC FOOTER CATEGORIES =====
function renderFooterCategories() {
  const el = document.getElementById('footerCategories');
  if (!el) return;
  const categories = cfg('categories', []);
  el.innerHTML = categories.map(c => `<a href="shop.html?category=${c.slug}">${c.name}</a>`).join('');
}

// ===== NEWSLETTER (Google Forms via hidden iframe) =====
const GOOGLE_FORM_ACTION = 'https://docs.google.com/forms/d/e/1FAIpQLSeu1bpn1DDhnbfBOHnZG7biJJPHEKxkEkE8JBcOVrohAG4knQ/formResponse';
const GOOGLE_FORM_EMAIL_FIELD = 'entry.1045781291';

function submitNewsletter(e) {
  e.preventDefault();
  const emailInput = document.getElementById('newsletterEmail');
  const btn = document.getElementById('newsletterBtn');
  const email = emailInput.value.trim();
  if (!email) return;

  btn.textContent = 'SENDING...';
  btn.style.pointerEvents = 'none';

  // Create hidden iframe to receive form response
  let iframe = document.getElementById('gform-iframe');
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'gform-iframe';
    iframe.name = 'gform-iframe';
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
  }

  // Create a real form and submit it to the iframe
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = GOOGLE_FORM_ACTION;
  form.target = 'gform-iframe';

  const input = document.createElement('input');
  input.type = 'hidden';
  input.name = GOOGLE_FORM_EMAIL_FIELD;
  input.value = email;
  form.appendChild(input);

  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);

  // Show success after short delay
  setTimeout(() => {
    showToast('Thank you for subscribing! You will hear from us soon.');
    emailInput.value = '';
    btn.textContent = 'SUBSCRIBED ✓';
    setTimeout(() => {
      btn.textContent = 'SUBSCRIBE';
      btn.style.pointerEvents = 'auto';
    }, 3000);
  }, 1000);
}

// Legacy support
function subscribeNewsletter(e) { submitNewsletter(e); }

// ===== SCROLL ANIMATIONS =====
function initScrollAnimations() {
  const animatedElements = document.querySelectorAll('.fade-in, .fade-in-left, .fade-in-right, .scale-in, .stagger-children');
  if (animatedElements.length === 0) return;

  if (!('IntersectionObserver' in window)) {
    animatedElements.forEach(el => el.classList.add('visible'));
    return;
  }

  document.body.classList.add('animate-ready');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.05, rootMargin: '50px 0px 50px 0px' });

  animatedElements.forEach(el => observer.observe(el));

  // Fallback: if elements still not visible after 2 seconds, force show them
  setTimeout(() => {
    animatedElements.forEach(el => {
      if (!el.classList.contains('visible')) {
        el.classList.add('visible');
      }
    });
  }, 2000);
}

// ===== NAVBAR SCROLL EFFECT =====
function initNavbarScroll() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  }, { passive: true });
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  initScrollAnimations();
  initNavbarScroll();
});
