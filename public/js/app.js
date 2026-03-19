/* EcoMarket — Complete Frontend */
const API = '';
let state = { user:null, token:null, cart:[], products:[], currentCategory:'All', cartOpen:false, appliedCoupon:null, currentReviewProductId:null, selectedRating:0, currentView:'grid' };

// ── INIT ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  loadAuth();
  showPage('home');
  await loadFeaturedProducts();
  loadCartBadge();
  startSlider();
  startFlashTimer();
  startCounters();
  if (localStorage.getItem('eco_dark') === 'true') document.body.classList.add('dark');
  const dateInput = document.getElementById('recycleDate');
  if (dateInput) { const t = new Date(); t.setDate(t.getDate()+1); dateInput.min = t.toISOString().split('T')[0]; }
});

// ── NAVIGATION ─────────────────────────────────────────────────
function showPage(pageId) {
  const tr = document.getElementById('pageTransition');
  tr.classList.add('active');
  setTimeout(() => {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const t = document.getElementById('page-'+pageId);
    if (t) { t.classList.add('active'); window.scrollTo({top:0,behavior:'smooth'}); }
    tr.classList.remove('active');
  }, 250);
  closeCart(); closeUserMenu();
  if (pageId==='shop')     loadShopProducts();
  if (pageId==='profile')  loadProfile();
  if (pageId==='orders')   loadOrders();
  if (pageId==='recycle')  loadRecyclePage();
  if (pageId==='checkout') loadCheckoutSummary();
  if (pageId==='referral') loadReferralPage();
  if (pageId==='wishlist') loadWishlist();
  if (pageId==='admin')    loadAdminOverview();
}

// ── AUTH ───────────────────────────────────────────────────────
function loadAuth() {
  const token = localStorage.getItem('eco_token');
  const user  = localStorage.getItem('eco_user');
  if (token && user) { state.token = token; state.user = JSON.parse(user); updateAuthUI(); }
}
function updateAuthUI() {
  const lo = document.getElementById('loggedOutMenu');
  const li = document.getElementById('loggedInMenu');
  const ui = document.getElementById('dropdownUserInfo');
  const ab = document.getElementById('adminNavBtn');
  if (state.user) {
    lo.style.display = 'none'; li.style.display = 'block';
    ui.innerHTML = `<strong>${state.user.name}</strong><br/>🌿 ${state.user.eco_points||0} Eco Points`;
    if (ab) ab.style.display = state.user.role==='admin' ? 'block' : 'none';
  } else { lo.style.display='block'; li.style.display='none'; }
}
async function handleLogin(e) {
  e.preventDefault();
  const errEl = document.getElementById('loginError');
  errEl.classList.remove('show');
  try {
    const res = await fetch('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email:document.getElementById('loginEmail').value, password:document.getElementById('loginPassword').value}) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error||'Login failed');
    saveAuth(data); showToast('Welcome back, '+data.user.name+'!','success'); showPage('home');
  } catch(err) { errEl.textContent=err.message; errEl.classList.add('show'); }
}
async function handleRegister(e) {
  e.preventDefault();
  const errEl = document.getElementById('registerError');
  errEl.classList.remove('show');
  try {
    const res = await fetch('/api/auth/register', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name:document.getElementById('regName').value, email:document.getElementById('regEmail').value, password:document.getElementById('regPassword').value}) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error||'Failed');
    saveAuth(data); showToast('Welcome to EcoMarket!','success'); showPage('home');
  } catch(err) { errEl.textContent=err.message; errEl.classList.add('show'); }
}
async function demoLogin() {
  document.getElementById('loginEmail').value = 'demo@ecomarket.com';
  document.getElementById('loginPassword').value = 'demo1234';
  await handleLogin({preventDefault:()=>{}});
}
function saveAuth(data) {
  state.token = data.token; state.user = data.user;
  localStorage.setItem('eco_token', data.token);
  localStorage.setItem('eco_user', JSON.stringify(data.user));
  updateAuthUI();
}
function logout() {
  state.token=null; state.user=null;
  localStorage.removeItem('eco_token'); localStorage.removeItem('eco_user');
  updateAuthUI(); closeUserMenu(); showToast('Signed out'); showPage('home');
}
function toggleUserMenu() { document.getElementById('userDropdown').classList.toggle('open'); }
function closeUserMenu()  { document.getElementById('userDropdown').classList.remove('open'); }
document.addEventListener('click', e => {
  const btn = document.getElementById('userBtn');
  const dd  = document.getElementById('userDropdown');
  if (btn && dd && !btn.contains(e.target) && !dd.contains(e.target)) dd.classList.remove('open');
});

// ── SEARCH ─────────────────────────────────────────────────────
function toggleSearch() {
  const s = document.getElementById('navSearch');
  s.classList.toggle('open');
  if (s.classList.contains('open')) document.getElementById('navSearchInput').focus();
}
async function liveSearch(q) {
  const box = document.getElementById('searchResults');
  if (!q || q.length < 2) { box.style.display='none'; return; }
  try {
    const res = await fetch('/api/products?search='+encodeURIComponent(q));
    const products = await res.json();
    if (!products.length) { box.innerHTML='<div class="sr-item">No results found</div>'; }
    else {
      box.innerHTML = products.slice(0,6).map(p => `
        <div class="sr-item" onclick="document.getElementById('navSearch').classList.remove('open'); showProductDetail(${p.id})">
          <img src="${p.image_url||'https://picsum.photos/seed/'+p.id+'/60/60'}" onerror="this.src='https://picsum.photos/seed/${p.id}/60/60'"/>
          <div><strong>${p.name}</strong><span>$${parseFloat(p.price).toFixed(2)}</span></div>
        </div>`).join('');
    }
    box.style.display = 'block';
  } catch(e) {}
}

// ── PRODUCTS ───────────────────────────────────────────────────
async function loadFeaturedProducts() {
  const grid = document.getElementById('featuredGrid');
  if (!grid) return;
  grid.innerHTML = skeletonCards(4);
  try {
    const products = await (await fetch('/api/products?sort=rating')).json();
    grid.innerHTML = products.slice(0,4).map(p => productCard(p)).join('');
  } catch(e) { grid.innerHTML='<p>Failed to load</p>'; }
}
async function loadFeatured(sort, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const grid = document.getElementById('featuredGrid');
  grid.innerHTML = skeletonCards(4);
  const products = await (await fetch('/api/products?sort='+sort)).json();
  grid.innerHTML = products.slice(0,4).map(p => productCard(p)).join('');
}
async function loadShopProducts() {
  const grid = document.getElementById('shopGrid');
  if (!grid) return;
  grid.innerHTML = skeletonCards(6);
  try {
    const cats = await (await fetch('/api/products/categories')).json();
    renderCategories(cats);
    await filterProducts();
  } catch(e) { grid.innerHTML='<p>Failed to load products.</p>'; }
}
function renderCategories(cats) {
  const el = document.getElementById('categoryFilters');
  if (!el) return;
  el.innerHTML = cats.map(c => `<button class="category-btn ${c===state.currentCategory?'active':''}" onclick="selectCategory('${c}')">${c}</button>`).join('');
}
function selectCategory(cat) {
  state.currentCategory = cat;
  document.querySelectorAll('.category-btn').forEach(b => b.classList.toggle('active', b.textContent===cat));
  filterProducts();
}
async function filterProducts() {
  const search   = document.getElementById('searchInput')?.value||'';
  const sort     = document.getElementById('sortSelect')?.value||'';
  const maxPrice = document.getElementById('maxPrice')?.value||500;
  const priceLabel = document.getElementById('priceLabel');
  if (priceLabel) priceLabel.textContent = maxPrice;
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (sort)   params.set('sort', sort);
  if (state.currentCategory !== 'All') params.set('category', state.currentCategory);
  params.set('maxPrice', maxPrice);
  const grid     = document.getElementById('shopGrid');
  const countEl  = document.getElementById('productCount');
  try {
    const products = await (await fetch('/api/products?'+params)).json();
    state.products = products;
    const view = state.currentView;
    grid.className = view === 'list' ? 'product-list' : 'product-grid';
    grid.innerHTML = products.length
      ? products.map(p => view==='list' ? productListItem(p) : productCard(p)).join('')
      : '<p style="color:var(--sage);grid-column:1/-1;text-align:center;padding:40px">No products found.</p>';
    if (countEl) countEl.textContent = `Showing ${products.length} product${products.length!==1?'s':''}`;
  } catch(e) {}
}
function setView(view) {
  state.currentView = view;
  document.getElementById('viewGrid').classList.toggle('active', view==='grid');
  document.getElementById('viewList').classList.toggle('active', view==='list');
  filterProducts();
}
function productCard(p) {
  const price  = parseFloat(p.price)||0;
  const rating = parseFloat(p.rating)||0;
  const carbon = parseFloat(p.carbon_kg)||0;
  const stars  = '★'.repeat(Math.round(rating))+'☆'.repeat(5-Math.round(rating));
  const imgUrl = p.image_url || 'https://picsum.photos/seed/'+p.id+'/600/600';
  return `<div class="product-card" onclick="showProductDetail(${p.id})">
    <div class="product-img">
      <img src="${imgUrl}" alt="${p.name}" loading="lazy" onerror="this.src='https://picsum.photos/seed/${p.id}/600/600'"/>
      ${p.eco_badge?`<div class="eco-badge">${p.eco_badge}</div>`:''}
      ${p.is_sale?'<div class="sale-badge">SALE</div>':''}
      ${p.is_new?'<div class="new-badge">NEW</div>':''}
      <div class="product-img-overlay">
        <button class="quick-view-btn" onclick="event.stopPropagation();openQuickView(${p.id})">Quick View</button>
      </div>
    </div>
    <div class="product-body">
      <div class="product-category">${p.category||''}</div>
      <div class="product-name">${p.name}</div>
      ${carbon>0?`<div class="product-carbon">🌿 ${carbon}kg CO₂</div>`:''}
      <div class="product-meta">
        <div class="product-price">$${price.toFixed(2)}</div>
        <div class="product-rating">${stars} (${p.reviews||0})</div>
      </div>
      <div class="product-card-actions">
        <button class="add-to-cart-btn" onclick="event.stopPropagation();addToCart(${p.id},'${p.name.replace(/'/g,"\\'")}')">Add to Cart</button>
        <button class="wishlist-btn" onclick="event.stopPropagation();toggleWishlist(${p.id})" title="Add to Wishlist">♥</button>
      </div>
    </div>
  </div>`;
}
function productListItem(p) {
  const price  = parseFloat(p.price)||0;
  const rating = parseFloat(p.rating)||0;
  const stars  = '★'.repeat(Math.round(rating))+'☆'.repeat(5-Math.round(rating));
  const imgUrl = p.image_url || 'https://picsum.photos/seed/'+p.id+'/200/200';
  return `<div class="product-list-item" onclick="showProductDetail(${p.id})">
    <img src="${imgUrl}" alt="${p.name}" onerror="this.src='https://picsum.photos/seed/${p.id}/200/200'"/>
    <div class="list-item-info">
      <div class="product-category">${p.category||''}</div>
      <div class="product-name">${p.name}</div>
      <div class="product-rating">${stars} (${p.reviews||0})</div>
      <p style="font-size:0.85rem;color:#666;margin-top:4px">${(p.description||'').slice(0,120)}...</p>
    </div>
    <div class="list-item-actions">
      <div class="product-price">$${price.toFixed(2)}</div>
      <button class="add-to-cart-btn" onclick="event.stopPropagation();addToCart(${p.id},'${p.name.replace(/'/g,"\\'")}')">Add to Cart</button>
    </div>
  </div>`;
}
async function showProductDetail(productId) {
  showPage('product');
  const container = document.getElementById('productDetail');
  container.innerHTML = '<div class="product-detail-inner"><p style="color:var(--sage);padding:60px;text-align:center">Loading...</p></div>';
  try {
    const p = await (await fetch('/api/products/'+productId)).json();
    const price  = parseFloat(p.price)||0;
    const rating = parseFloat(p.rating)||0;
    const carbon = parseFloat(p.carbon_kg)||0;
    const stars  = '★'.repeat(Math.round(rating))+'☆'.repeat(5-Math.round(rating));
    const imgUrl = p.image_url || 'https://picsum.photos/seed/'+p.id+'/600/600';
    // Get reviews
    const rv = await (await fetch('/api/reviews/'+productId)).json();
    const reviewsHtml = rv.reviews.length ? rv.reviews.slice(0,3).map(r => `
      <div class="review-item">
        <div class="review-header"><strong>${r.user_name}</strong><span>${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</span><span class="review-date">${new Date(r.created_at).toLocaleDateString()}</span></div>
        ${r.title?`<div class="review-title">${r.title}</div>`:''}
        <p>${r.body||''}</p>
      </div>`).join('') : '<p style="color:var(--sage)">No reviews yet. Be the first!</p>';

    container.innerHTML = `<div class="product-detail-inner">
      <div class="breadcrumb"><a href="#" onclick="showPage('shop')">Shop</a> › ${p.category||''} › ${p.name}</div>
      <div class="product-detail-grid">
        <div class="product-detail-img"><img src="${imgUrl}" alt="${p.name}" onerror="this.src='https://picsum.photos/seed/${p.id}/600/600'"/>${p.eco_badge?`<div class="eco-badge">${p.eco_badge}</div>`:''}</div>
        <div class="product-detail-info">
          <div class="detail-category">${p.category||''}</div>
          <h1 class="detail-name">${p.name}</h1>
          <div class="detail-rating">${stars} <span>${rating} (${p.reviews||0} reviews)</span></div>
          <div class="detail-price">$${price.toFixed(2)}</div>
          <p class="detail-description">${p.description||''}</p>
          <div class="detail-specs">
            ${p.material?`<div class="spec-item"><div class="spec-label">Material</div><div class="spec-value">${p.material}</div></div>`:''}
            ${p.origin?`<div class="spec-item"><div class="spec-label">Origin</div><div class="spec-value">${p.origin}</div></div>`:''}
            ${carbon>0?`<div class="spec-item"><div class="spec-label">Carbon Footprint</div><div class="spec-value">${carbon} kg CO₂</div></div>`:''}
            ${p.eco_badge?`<div class="spec-item"><div class="spec-label">Eco Badge</div><div class="spec-value">${p.eco_badge}</div></div>`:''}
          </div>
          <div class="detail-actions">
            <div class="qty-selector"><button onclick="changeQty(-1)">−</button><input type="number" id="detailQty" value="1" min="1" max="${p.stock||99}"/><button onclick="changeQty(1)">+</button></div>
            <button class="btn-primary" onclick="addToCart(${p.id},'${p.name.replace(/'/g,"\\'")}',parseInt(document.getElementById('detailQty').value))">Add to Cart</button>
            <button class="btn-ghost" onclick="toggleWishlist(${p.id})">♥ Wishlist</button>
            <button class="btn-ghost" onclick="openShareModal(${p.id},'${p.name.replace(/'/g,"\\'")}')">Share</button>
          </div>
          <p style="font-size:0.8rem;color:var(--sage);margin-top:12px">✅ ${p.stock||0} in stock · Free carbon-neutral shipping over $50</p>
        </div>
      </div>
      <div class="reviews-section">
        <div class="reviews-header"><h2>Customer Reviews</h2><button class="btn-primary" onclick="openReviewModal(${p.id})">Write a Review</button></div>
        ${reviewsHtml}
      </div>
    </div>`;
  } catch(e) { container.innerHTML='<div class="product-detail-inner"><p>Failed to load product.</p></div>'; }
}
function changeQty(d) { const i = document.getElementById('detailQty'); if(i) i.value=Math.max(1,parseInt(i.value)+d); }

// ── CART ───────────────────────────────────────────────────────
function toggleCart() {
  state.cartOpen = !state.cartOpen;
  document.getElementById('cartDrawer').classList.toggle('open', state.cartOpen);
  document.getElementById('cartOverlay').classList.toggle('open', state.cartOpen);
  if (state.cartOpen) renderCart();
}
function closeCart() { state.cartOpen=false; document.getElementById('cartDrawer').classList.remove('open'); document.getElementById('cartOverlay').classList.remove('open'); }
async function addToCart(productId, name, quantity=1) {
  if (!state.token) { showToast('Please sign in first','error'); showPage('login'); return; }
  try {
    const res = await fetch('/api/cart', { method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+state.token}, body:JSON.stringify({product_id:productId,quantity}) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    showToast(name+' added to cart 🛒','success');
    await loadCartBadge();
  } catch(e) { showToast(e.message||'Failed','error'); }
}
async function loadCartBadge() {
  if (!state.token) { updateBadge(0); return; }
  try {
    const items = await (await fetch('/api/cart',{headers:{'Authorization':'Bearer '+state.token}})).json();
    state.cart = items;
    updateBadge(items.reduce((s,i)=>s+i.quantity,0));
  } catch(e) { updateBadge(0); }
}
function updateBadge(n) { const b=document.getElementById('cartBadge'); if(b){b.textContent=n;b.style.display=n>0?'flex':'none';} }
async function renderCart() {
  if (!state.token) {
    document.getElementById('cartItems').innerHTML='<div class="empty-cart"><p>Sign in to view cart</p><button class="btn-primary" onclick="closeCart();showPage(\'login\')" style="margin-top:16px">Sign In</button></div>';
    document.getElementById('cartFooter').innerHTML=''; return;
  }
  const items = await (await fetch('/api/cart',{headers:{'Authorization':'Bearer '+state.token}})).json();
  state.cart = items;
  const itemsEl  = document.getElementById('cartItems');
  const footerEl = document.getElementById('cartFooter');
  if (!items.length) {
    itemsEl.innerHTML='<div class="empty-cart"><p style="font-size:2rem">🛒</p><p>Your cart is empty</p><button class="btn-primary" onclick="closeCart();showPage(\'shop\')" style="margin-top:16px">Shop Now</button></div>';
    footerEl.innerHTML=''; return;
  }
  itemsEl.innerHTML = items.map(item=>`<div class="cart-item">
    <div class="cart-item-img"><img src="${item.image_url||'https://picsum.photos/seed/'+item.product_id+'/64/64'}" alt="${item.name}" onerror="this.src='https://picsum.photos/seed/${item.product_id}/64/64'"/></div>
    <div class="cart-item-info">
      <div class="cart-item-name">${item.name}</div>
      <div class="cart-item-price">$${(parseFloat(item.price)*item.quantity).toFixed(2)}</div>
      <div class="cart-item-qty"><button onclick="updateCartItem(${item.id},${item.quantity-1})">−</button><span>${item.quantity}</span><button onclick="updateCartItem(${item.id},${item.quantity+1})">+</button></div>
    </div>
    <button class="cart-remove" onclick="removeCartItem(${item.id})">✕</button>
  </div>`).join('');
  const subtotal = items.reduce((s,i)=>s+parseFloat(i.price)*i.quantity,0);
  const carbon   = items.reduce((s,i)=>s+parseFloat(i.carbon_kg||0)*i.quantity,0);
  footerEl.innerHTML=`<div class="cart-total"><span>Subtotal</span><span>$${subtotal.toFixed(2)}</span></div><div class="cart-carbon-note">🌿 Est. carbon: ${carbon.toFixed(1)}kg CO₂</div><button class="btn-primary" style="width:100%" onclick="closeCart();showPage('checkout')">Checkout</button>`;
}
async function updateCartItem(id,qty) {
  await fetch('/api/cart/'+id,{method:'PUT',headers:{'Content-Type':'application/json','Authorization':'Bearer '+state.token},body:JSON.stringify({quantity:qty})});
  await loadCartBadge(); renderCart();
}
async function removeCartItem(id) {
  await fetch('/api/cart/'+id,{method:'DELETE',headers:{'Authorization':'Bearer '+state.token}});
  await loadCartBadge(); renderCart();
}

// ── WISHLIST ───────────────────────────────────────────────────
async function toggleWishlist(productId) {
  if (!state.token) { showToast('Sign in to save items','error'); return; }
  try {
    const res  = await fetch('/api/wishlist/'+productId,{method:'POST',headers:{'Authorization':'Bearer '+state.token}});
    const data = await res.json();
    showToast(data.wishlisted?'Added to wishlist ♥':'Removed from wishlist','success');
    loadWishlistBadge();
  } catch(e) {}
}
async function loadWishlist() {
  if (!state.token) { showPage('login'); return; }
  const grid  = document.getElementById('wishlistGrid');
  const empty = document.getElementById('wishlistEmpty');
  try {
    const items = await (await fetch('/api/wishlist',{headers:{'Authorization':'Bearer '+state.token}})).json();
    if (!items.length) { grid.innerHTML=''; empty.style.display='block'; }
    else { empty.style.display='none'; grid.innerHTML=items.map(p=>productCard(p)).join(''); }
    const b = document.getElementById('wishBadge');
    if (b) { b.textContent=items.length; b.style.display=items.length>0?'flex':'none'; }
  } catch(e) {}
}
async function loadWishlistBadge() {
  if (!state.token) return;
  try {
    const items = await (await fetch('/api/wishlist',{headers:{'Authorization':'Bearer '+state.token}})).json();
    const b = document.getElementById('wishBadge');
    if (b) { b.textContent=items.length; b.style.display=items.length>0?'flex':'none'; }
  } catch(e) {}
}

// ── QUICK VIEW ─────────────────────────────────────────────────
async function openQuickView(productId) {
  document.getElementById('modalOverlay').classList.add('open');
  document.getElementById('quickViewModal').classList.add('open');
  document.getElementById('quickViewContent').innerHTML='<div class="modal-loading">Loading...</div>';
  try {
    const p = await (await fetch('/api/products/'+productId)).json();
    const price  = parseFloat(p.price)||0;
    const rating = parseFloat(p.rating)||0;
    const stars  = '★'.repeat(Math.round(rating))+'☆'.repeat(5-Math.round(rating));
    const imgUrl = p.image_url||'https://picsum.photos/seed/'+p.id+'/600/600';
    document.getElementById('quickViewContent').innerHTML=`<div class="qv-grid">
      <div class="qv-img"><img src="${imgUrl}" alt="${p.name}" onerror="this.src='https://picsum.photos/seed/${p.id}/600/600'"/>${p.eco_badge?`<div class="eco-badge">${p.eco_badge}</div>`:''}</div>
      <div class="qv-info">
        <div class="detail-category">${p.category||''}</div>
        <h2 class="qv-name">${p.name}</h2>
        <div class="detail-rating">${stars} <span>${rating} (${p.reviews||0})</span></div>
        <div class="qv-price">$${price.toFixed(2)}</div>
        <p class="qv-desc">${p.description||''}</p>
        <div class="qv-specs">${p.material?`<span>🌿 ${p.material}</span>`:''}${p.origin?`<span>📍 ${p.origin}</span>`:''}</div>
        <div class="qv-actions">
          <button class="btn-primary" onclick="addToCart(${p.id},'${p.name.replace(/'/g,"\\'")}');closeQuickView()">Add to Cart</button>
          <button class="btn-ghost" onclick="closeQuickView();showProductDetail(${p.id})">Full Details</button>
        </div>
      </div>
    </div>`;
  } catch(e) { document.getElementById('quickViewContent').innerHTML='<p style="padding:24px">Failed to load.</p>'; }
}
function closeQuickView() { document.getElementById('modalOverlay').classList.remove('open'); document.getElementById('quickViewModal').classList.remove('open'); }
document.addEventListener('keydown', e => { if(e.key==='Escape'){closeQuickView();closeShareModal();closeReviewModal();} });

// ── REVIEWS ────────────────────────────────────────────────────
function openReviewModal(productId) {
  if (!state.token) { showToast('Sign in to review','error'); return; }
  state.currentReviewProductId = productId;
  state.selectedRating = 0;
  document.getElementById('reviewTitle').value='';
  document.getElementById('reviewBody').value='';
  renderStarPicker(0);
  document.getElementById('reviewOverlay').classList.add('open');
  document.getElementById('reviewModal').classList.add('open');
}
function closeReviewModal() { document.getElementById('reviewOverlay').classList.remove('open'); document.getElementById('reviewModal').classList.remove('open'); }
function renderStarPicker(selected) {
  document.getElementById('starPicker').innerHTML = [1,2,3,4,5].map(n =>
    `<span class="star-pick ${n<=selected?'active':''}" onclick="selectStar(${n})">${n<=selected?'★':'☆'}</span>`).join('');
}
function selectStar(n) { state.selectedRating=n; renderStarPicker(n); }
async function submitReview() {
  if (!state.selectedRating) { showToast('Please select a rating','error'); return; }
  try {
    const res = await fetch('/api/reviews/'+state.currentReviewProductId, {
      method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+state.token},
      body:JSON.stringify({rating:state.selectedRating, title:document.getElementById('reviewTitle').value, body:document.getElementById('reviewBody').value})
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    closeReviewModal(); showToast('Review submitted! Thanks 🌿','success');
    showProductDetail(state.currentReviewProductId);
  } catch(e) { showToast(e.message||'Failed','error'); }
}

// ── CHECKOUT ───────────────────────────────────────────────────
function loadCheckoutSummary() {
  if (!state.token) { showPage('login'); return; }
  renderCheckoutSummary();
}
function renderCheckoutSummary() {
  const items    = state.cart;
  const el       = document.getElementById('checkoutSummary');
  if (!items.length) { el.innerHTML='<p>Cart is empty</p>'; return; }
  const subtotal = items.reduce((s,i)=>s+parseFloat(i.price)*i.quantity,0);
  const discount = state.appliedCoupon?.discount||0;
  const offset   = document.getElementById('carbonOffset')?.checked?1.50:0;
  const total    = subtotal-discount+offset;
  el.innerHTML=`<h3>Order Summary</h3>
    ${items.map(i=>`<div class="summary-item"><span>${i.name} x${i.quantity}</span><span>$${(parseFloat(i.price)*i.quantity).toFixed(2)}</span></div>`).join('')}
    <hr class="summary-divider"/>
    <div class="summary-item"><span>Subtotal</span><span>$${subtotal.toFixed(2)}</span></div>
    ${discount>0?`<div class="summary-item" style="color:var(--success)"><span>Discount (${state.appliedCoupon.code})</span><span>-$${discount.toFixed(2)}</span></div>`:''}
    <div class="summary-item"><span>Carbon Offset</span><span>$${offset.toFixed(2)}</span></div>
    <div class="summary-item"><span>Shipping</span><span>Free</span></div>
    <hr class="summary-divider"/>
    <div class="summary-total"><span>Total</span><span>$${total.toFixed(2)}</span></div>
    ${state.appliedCoupon?`<div style="background:var(--mint);color:var(--forest);padding:8px 12px;border-radius:8px;font-size:0.82rem;margin-top:8px;text-align:center">Coupon <strong>${state.appliedCoupon.code}</strong> applied!</div>`:''}`;
}
async function applyCoupon() {
  const code = document.getElementById('couponInput').value.trim().toUpperCase();
  const msgEl = document.getElementById('couponMessage');
  if (!code) return;
  const subtotal = state.cart.reduce((s,i)=>s+parseFloat(i.price)*i.quantity,0);
  try {
    const res  = await fetch('/api/coupons/validate',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+state.token},body:JSON.stringify({code,order_total:subtotal})});
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    state.appliedCoupon = data;
    msgEl.innerHTML=`<p style="color:var(--success);font-size:0.85rem;margin-top:8px">✅ Coupon applied! You save $${data.discount.toFixed(2)}</p>`;
    renderCheckoutSummary();
  } catch(e) { msgEl.innerHTML=`<p style="color:var(--error);font-size:0.85rem;margin-top:8px">❌ ${e.message}</p>`; }
}
async function placeOrder() {
  if (!state.token) { showPage('login'); return; }
  const name    = document.getElementById('shipName').value;
  const address = document.getElementById('shipAddress').value;
  const city    = document.getElementById('shipCity').value;
  const zip     = document.getElementById('shipZip').value;
  const card    = document.getElementById('cardNumber').value.replace(/\s/g,'');
  if (!name||!address||!city||!zip||!card) { showToast('Please fill all fields','error'); return; }
  try {
    const piRes  = await fetch('/api/payments/create-intent',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+state.token},body:JSON.stringify({amount:100})});
    const pi     = await piRes.json();
    const cfmRes = await fetch('/api/payments/confirm',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+state.token},body:JSON.stringify({payment_intent_id:pi.payment_intent_id,card_number:card})});
    if (!cfmRes.ok) throw new Error((await cfmRes.json()).error);
    const orderRes = await fetch('/api/orders',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+state.token},body:JSON.stringify({shipping_address:`${name}, ${address}, ${city} ${zip}`,carbon_offset:document.getElementById('carbonOffset')?.checked?1.50:0,coupon_code:state.appliedCoupon?.code})});
    const order  = await orderRes.json();
    if (!orderRes.ok) throw new Error(order.error);
    state.cart=[]; updateBadge(0); state.appliedCoupon=null;
    fireConfetti();
    showToast(`Order placed! Earned ${order.eco_points_earned} Eco Points 🌱`,'success');
    showPage('orders');
  } catch(e) { showToast(e.message||'Order failed','error'); }
}

// ── CARBON WIZARD ─────────────────────────────────────────────
let wizardData = { transport:'car', diet:'omnivore' };

function selectTransport(val, el) {
  wizardData.transport = val;
  document.querySelectorAll('.transport-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
}
function selectDiet(val, el) {
  wizardData.diet = val;
  document.querySelectorAll('.diet-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
}
function changePeople(d) {
  const input = document.getElementById('calcHousehold');
  const span  = document.getElementById('peopleVal');
  const val   = Math.min(10, Math.max(1, parseInt(input.value) + d));
  input.value = val; span.textContent = val;
}
function wizardNext(step) {
  document.querySelectorAll('.wizard-step').forEach(s => s.classList.remove('active'));
  document.getElementById('wstep' + step).classList.add('active');
  document.querySelectorAll('.prog-step').forEach((s, i) => {
    s.classList.toggle('active',  i < step);
    s.classList.toggle('done',    i < step - 1);
  });
  const pct = (step / 4) * 100;
  document.getElementById('wizardProgress').style.width = pct + '%';
  document.querySelector('.carbon-wizard').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function wizardReset() {
  wizardData = { transport:'car', diet:'omnivore' };
  document.querySelectorAll('.transport-card').forEach(c => c.classList.remove('selected'));
  document.querySelector('.transport-card').classList.add('selected');
  document.querySelectorAll('.diet-card').forEach(c => c.classList.remove('selected'));
  document.querySelectorAll('.diet-card')[3].classList.add('selected');
  wizardNext(1);
}
async function runCalculation() {
  wizardNext(4);
  try {
    const res  = await fetch('/api/carbon/calculate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transport:      wizardData.transport,
        distance_km:    document.getElementById('calcDistance').value,
        diet:           wizardData.diet,
        electricity_kwh:document.getElementById('calcElec').value,
        gas_m3:         document.getElementById('calcGas').value,
        household_size: document.getElementById('calcHousehold').value
      })
    });
    const data = await res.json();
    renderResults(data);
  } catch(e) { showToast('Calculation failed', 'error'); }
}
// Keep old function name working too
async function calculateCarbon() { await runCalculation(); }

function renderResults(data) {
  const kg    = data.total_kg;
  const grade = kg < 2000 ? 'A+' : kg < 3000 ? 'A' : kg < 4000 ? 'B' : kg < 6000 ? 'C' : 'D';
  const gradeColor = { 'A+':'#27ae60','A':'#2ecc71','B':'#f39c12','C':'#e67e22','D':'#e74c3c' };

  // Animate ring
  const circumference = 502;
  const pct = Math.min(kg / 14500, 1);
  const offset = circumference - (circumference * pct);
  const ringFill = document.getElementById('ringFill');
  ringFill.style.stroke = gradeColor[grade];
  setTimeout(() => { ringFill.style.strokeDashoffset = offset; }, 100);

  // Animate number
  const numEl = document.getElementById('ringNumber');
  let current = 0;
  const step  = Math.ceil(kg / 60);
  const timer = setInterval(() => {
    current = Math.min(current + step, kg);
    numEl.textContent = current.toLocaleString();
    if (current >= kg) clearInterval(timer);
  }, 25);

  document.getElementById('ringGrade').textContent = grade;
  document.getElementById('ringGrade').style.fill  = gradeColor[grade];

  // Context
  const trees = Math.round(kg / 21);
  const flights = Math.round(kg / 255);
  document.getElementById('scComparison').innerHTML = `<strong>${data.diff_pct}% ${data.comparison}</strong> global average`;
  document.getElementById('scEquivalent').innerHTML = `≈ ${trees} trees needed to offset · ${flights} flights`;

  // Breakdown bars
  const maxVal = Math.max(...Object.values(data.breakdown));
  const colors = { transport:'#2d5a3d', diet:'#5a8a6a', electricity:'#a8d5b5', gas:'#7c5c3e' };
  const icons  = { transport:'🚗', diet:'🥗', electricity:'⚡', gas:'🔥' };
  document.getElementById('breakdownBars').innerHTML = Object.entries(data.breakdown).map(([k, v]) => `
    <div class="bb-row">
      <div class="bb-label">${icons[k]||'🌿'} ${k.charAt(0).toUpperCase()+k.slice(1)}</div>
      <div class="bb-track"><div class="bb-fill" style="width:0%;background:${colors[k]||'var(--sage)'}" data-width="${Math.round(v/maxVal*100)}%"></div></div>
      <div class="bb-val">${v.toLocaleString()} kg</div>
    </div>`).join('');
  setTimeout(() => {
    document.querySelectorAll('.bb-fill').forEach(el => { el.style.width = el.dataset.width; });
  }, 200);

  // Tips
  const tipIcons = ['💡','🌱','⚡','🚴','🛒'];
  document.getElementById('tipsSection').innerHTML = `
    <h3>Your Personal Action Plan</h3>
    <div class="tips-grid">
      ${data.tips.map((t, i) => `<div class="tip-card"><div class="tip-icon">${tipIcons[i]||'🌿'}</div><p>${t}</p></div>`).join('')}
    </div>`;

  // Offset
  document.getElementById('offsetPrice').textContent = `$${data.offset_cost_usd}/year`;
  document.getElementById('offsetTrees').textContent = `= ${trees} trees planted`;

  // Country comparison
  document.getElementById('compareYou').style.display = 'flex';
  document.getElementById('youVal').textContent = kg.toLocaleString() + ' kg';
  document.getElementById('youBar').style.width = Math.min(pct * 100, 100) + '%';
}

// ── RECYCLE ────────────────────────────────────────────────────
async function loadRecyclePage() {
  try {
    const stats = await (await fetch('/api/recycle/stats')).json();
    document.getElementById('recycleStats').innerHTML=`<div class="recycle-stat"><strong>${stats.total_requests}</strong><span>Total Pickups</span></div><div class="recycle-stat"><strong>${stats.kg_diverted}kg</strong><span>Waste Diverted</span></div><div class="recycle-stat"><strong>${stats.trees_saved}</strong><span>Trees Equivalent</span></div><div class="recycle-stat"><strong>${stats.total_points_awarded}</strong><span>Points Awarded</span></div>`;
    const types = await (await fetch('/api/recycle/types')).json();
    document.getElementById('recycleTypeGrid').innerHTML=types.map(t=>`<div class="type-card"><div class="type-icon">${t.icon}</div><div class="type-name">${t.label}</div><div class="type-points">+${t.points} Eco Points</div><div class="type-desc">${t.desc}</div></div>`).join('');
  } catch(e){}
  if (!state.token) { document.getElementById('recycleForm').style.display='none'; document.getElementById('recycleLoginPrompt').style.display='block'; }
  else { document.getElementById('recycleForm').style.display='block'; document.getElementById('recycleLoginPrompt').style.display='none'; }
}
async function submitRecycle(e) {
  e.preventDefault();
  try {
    const res  = await fetch('/api/recycle/request',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+state.token},body:JSON.stringify({item_description:document.getElementById('recycleDesc').value,item_type:document.getElementById('recycleType').value,pickup_date:document.getElementById('recycleDate').value,address:document.getElementById('recycleAddress').value})});
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    showToast(data.message,'success'); document.getElementById('recycleForm').reset(); loadRecyclePage();
  } catch(e) { showToast(e.message||'Failed','error'); }
}

// ── PROFILE ────────────────────────────────────────────────────
async function loadProfile() {
  if (!state.token) { showPage('login'); return; }
  try {
    const user = await (await fetch('/api/auth/profile',{headers:{'Authorization':'Bearer '+state.token}})).json();
    document.getElementById('profileAvatar').textContent=user.name.charAt(0).toUpperCase();
    document.getElementById('profileInfo').innerHTML=`<div class="profile-name">${user.name}</div><div class="profile-email">${user.email}</div><div class="profile-points"><strong>${user.eco_points}</strong><span>Eco Points Earned</span></div><p style="font-size:0.85rem;color:var(--sage);text-align:center">Member since ${new Date(user.created_at).toLocaleDateString('en-US',{year:'numeric',month:'long'})}</p><div style="margin-top:24px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap"><button class="btn-primary" onclick="showPage('orders')">My Orders</button><button class="btn-ghost" onclick="showPage('recycle')">Schedule Recycle</button></div>`;
  } catch(e) {}
}

// ── ORDERS ─────────────────────────────────────────────────────
async function loadOrders() {
  if (!state.token) { showPage('login'); return; }
  const container = document.getElementById('ordersContainer');
  container.innerHTML='<p style="color:var(--sage)">Loading...</p>';
  try {
    const orders = await (await fetch('/api/orders',{headers:{'Authorization':'Bearer '+state.token}})).json();
    if (!orders.length) { container.innerHTML=`<div style="text-align:center;padding:60px"><p style="font-size:2rem">📦</p><p style="color:var(--sage);margin-top:8px">No orders yet</p><button class="btn-primary" onclick="showPage('shop')" style="margin-top:16px">Start Shopping</button></div>`; return; }
    container.innerHTML=orders.map(order=>`<div class="order-card">
      <div class="order-header"><div><div class="order-id">Order #${order.id}</div><div class="order-date">${new Date(order.created_at).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}</div></div><span class="order-status">${order.status}</span></div>
      <div class="order-items-list">${order.items.map(i=>`<div class="order-item-row"><span>${i.name} x${i.quantity}</span><span>$${(parseFloat(i.price)*i.quantity).toFixed(2)}</span></div>`).join('')}</div>
      <div class="order-total">Total: $${parseFloat(order.total).toFixed(2)}</div>
      ${order.carbon_offset>0?'<p style="font-size:0.78rem;color:var(--moss);text-align:right;margin-top:4px">🌳 Carbon offset included</p>':''}
      <div class="order-actions">
        <button class="btn-track" onclick="showOrderTracking(${order.id},'${order.status}','${order.created_at}','${order.tracking_number||''}')">📦 Track Order</button>
        <button class="btn-share-order" onclick="openShareModal(${order.id},'EcoMarket Order #${order.id}')">🌿 Share</button>
      </div>
    </div>`).join('');
  } catch(e) { container.innerHTML='<p>Failed to load orders.</p>'; }
}

// ── ORDER TRACKING ─────────────────────────────────────────────
function showOrderTracking(orderId, status, createdAt, trackingNum) {
  showPage('tracking');
  const statuses = ['pending','processing','shipped','out_for_delivery','delivered'];
  const labels   = {pending:'Order Placed',processing:'Processing',shipped:'Shipped',out_for_delivery:'Out for Delivery',delivered:'Delivered'};
  const icons    = {pending:'📋',processing:'⚙️',shipped:'📦',out_for_delivery:'🚚',delivered:'✅'};
  const idx = Math.max(statuses.indexOf(status), 1);
  const orderDate = new Date(createdAt);
  const delivery  = new Date(orderDate); delivery.setDate(delivery.getDate()+5);
  const steps = statuses.map((s,i)=>{
    const done = i<=idx; const active = i===idx;
    const d = new Date(orderDate); d.setDate(d.getDate()+i);
    return `<div class="track-step ${done?'done':''} ${active?'active':''}">
      <div class="track-icon">${done?icons[s]:'○'}</div>
      <div class="track-info"><strong>${labels[s]}</strong><span>${done?d.toLocaleDateString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'Pending'}</span></div>
      ${i<statuses.length-1?`<div class="track-line ${done&&i<idx?'done':''}"></div>`:''}
    </div>`;
  }).join('');
  document.getElementById('trackingContent').innerHTML=`<div class="tracking-card">
    <div class="tracking-top"><div><div class="tracking-order-id">Order #${orderId}</div><div class="tracking-date">${orderDate.toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}</div>${trackingNum?`<div style="font-size:0.8rem;color:var(--sage);margin-top:4px">Tracking: ${trackingNum}</div>`:''}</div><div class="tracking-eta"><strong>Est. Delivery</strong><span>${delivery.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</span></div></div>
    <div class="track-steps">${steps}</div>
    <div class="tracking-actions"><button class="btn-ghost" onclick="showPage('orders')">Back to Orders</button></div>
  </div>`;
}

// ── NEWSLETTER ─────────────────────────────────────────────────
async function subscribeNewsletter(e) {
  e.preventDefault();
  try {
    const res  = await fetch('/api/newsletter/subscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:document.getElementById('nlName').value,email:document.getElementById('nlEmail').value})});
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    document.getElementById('newsletterForm').style.display='none';
    document.getElementById('newsletterSuccess').style.display='flex';
    document.getElementById('discountCodeBox').textContent=data.discount_code;
    showToast('Subscribed! Your discount code: '+data.discount_code,'success');
  } catch(e) { showToast(e.message||'Failed','error'); }
}

// ── REFERRAL ───────────────────────────────────────────────────
function loadReferralPage() {
  if (!state.token) { showPage('login'); return; }
  const code = 'ECO-'+state.user.id+'-'+(state.user.name||'USER').replace(/\s/g,'').toUpperCase().substr(0,4);
  const url  = window.location.origin+'?ref='+code;
  document.getElementById('referralLink').value = url;
}
function copyReferralLink() { navigator.clipboard.writeText(document.getElementById('referralLink').value).then(()=>showToast('Link copied!','success')); }
function shareReferral(p) {
  const link = document.getElementById('referralLink').value;
  const text = "Shop sustainably on EcoMarket! Use my link and we both earn Eco Points";
  const urls  = {whatsapp:`https://wa.me/?text=${encodeURIComponent(text+' '+link)}`,twitter:`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`,facebook:`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`,email:`mailto:?subject=Join EcoMarket!&body=${encodeURIComponent(text+'\n\n'+link)}`};
  window.open(urls[p],'_blank');
}

// ── SHARE MODAL ────────────────────────────────────────────────
function openShareModal(productId, productName) {
  const url = window.location.origin+'?product='+productId;
  const text = 'Check this out on EcoMarket: '+productName;
  document.getElementById('shareProductName').textContent = productName;
  document.getElementById('shareLink').value = url;
  document.getElementById('shareModalButtons').innerHTML=`<button class="share-btn whatsapp" onclick="shareTo('whatsapp','${encodeURIComponent(text)}','${encodeURIComponent(url)}')">WhatsApp</button><button class="share-btn twitter" onclick="shareTo('twitter','${encodeURIComponent(text)}','${encodeURIComponent(url)}')">Twitter</button><button class="share-btn facebook" onclick="shareTo('facebook','${encodeURIComponent(text)}','${encodeURIComponent(url)}')">Facebook</button><button class="share-btn email" onclick="shareTo('email','${encodeURIComponent(text)}','${encodeURIComponent(url)}')">Email</button>`;
  document.getElementById('shareOverlay').classList.add('open');
  document.getElementById('shareModal').classList.add('open');
}
function closeShareModal() { document.getElementById('shareOverlay').classList.remove('open'); document.getElementById('shareModal').classList.remove('open'); }
function shareTo(p, text, url) { const urls={whatsapp:`https://wa.me/?text=${text}%20${url}`,twitter:`https://twitter.com/intent/tweet?text=${text}&url=${url}`,facebook:`https://www.facebook.com/sharer/sharer.php?u=${url}`,email:`mailto:?subject=Check this out!&body=${text}%20${url}`}; window.open(urls[p],'_blank'); }
function copyShareLink() { navigator.clipboard.writeText(document.getElementById('shareLink').value).then(()=>showToast('Copied!','success')); }

// ── ADMIN DASHBOARD ────────────────────────────────────────────
async function loadAdminOverview() {
  if (!state.user||state.user.role!=='admin') { showPage('home'); return; }
  document.querySelectorAll('.admin-tab').forEach(t=>t.classList.remove('active'));
  document.querySelector('.admin-tab').classList.add('active');
  const el = document.getElementById('adminContent');
  el.innerHTML='<p style="padding:40px;color:var(--sage)">Loading...</p>';
  try {
    const data = await (await fetch('/api/admin/stats',{headers:{'Authorization':'Bearer '+state.token}})).json();
    el.innerHTML=`<div class="admin-stats">
      <div class="admin-stat-card"><div class="admin-stat-icon">📦</div><div class="admin-stat-val">${data.orders}</div><div class="admin-stat-label">Total Orders</div></div>
      <div class="admin-stat-card"><div class="admin-stat-icon">💰</div><div class="admin-stat-val">$${parseFloat(data.revenue||0).toFixed(2)}</div><div class="admin-stat-label">Revenue</div></div>
      <div class="admin-stat-card"><div class="admin-stat-icon">👥</div><div class="admin-stat-val">${data.users}</div><div class="admin-stat-label">Customers</div></div>
      <div class="admin-stat-card"><div class="admin-stat-icon">🛍️</div><div class="admin-stat-val">${data.products}</div><div class="admin-stat-label">Products</div></div>
    </div>
    <div class="admin-panels">
      <div class="admin-panel"><h3>Recent Orders</h3><table class="admin-table"><thead><tr><th>#</th><th>Customer</th><th>Total</th><th>Status</th><th>Date</th></tr></thead><tbody>${data.recent.map(o=>`<tr><td>#${o.id}</td><td>${o.user_name}</td><td>$${parseFloat(o.total).toFixed(2)}</td><td><span class="order-status">${o.status}</span></td><td>${new Date(o.created_at).toLocaleDateString()}</td></tr>`).join('')}</tbody></table></div>
      <div class="admin-panel"><h3>Top Products</h3>${data.topProducts.map(p=>`<div class="top-product-row"><span>${p.name}</span><span>${p.sold} sold</span></div>`).join('')}</div>
    </div>`;
  } catch(e) { el.innerHTML='<p style="padding:40px">Failed to load stats. Make sure you are admin.</p>'; }
}
async function adminTab(tab, btn) {
  document.querySelectorAll('.admin-tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  if (tab==='overview') { loadAdminOverview(); return; }
  const el = document.getElementById('adminContent');
  el.innerHTML='<p style="padding:40px;color:var(--sage)">Loading...</p>';
  try {
    if (tab==='products') {
      const products = await (await fetch('/api/admin/products',{headers:{'Authorization':'Bearer '+state.token}})).json();
      el.innerHTML=`<div class="admin-panel"><div class="admin-panel-header"><h3>Products (${products.length})</h3><button class="btn-primary" onclick="showAddProductForm()">+ Add Product</button></div><div id="addProductForm"></div><table class="admin-table"><thead><tr><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Actions</th></tr></thead><tbody>${products.map(p=>`<tr><td>${p.name}</td><td>${p.category||'-'}</td><td>$${parseFloat(p.price).toFixed(2)}</td><td>${p.stock}</td><td><button onclick="adminDeleteProduct(${p.id})" style="color:var(--error);background:none;border:none;cursor:pointer;font-size:0.85rem">Delete</button></td></tr>`).join('')}</tbody></table></div>`;
    }
    if (tab==='orders') {
      const orders = await (await fetch('/api/admin/orders',{headers:{'Authorization':'Bearer '+state.token}})).json();
      el.innerHTML=`<div class="admin-panel"><h3>All Orders</h3><table class="admin-table"><thead><tr><th>#</th><th>Customer</th><th>Total</th><th>Status</th><th>Update</th></tr></thead><tbody>${orders.map(o=>`<tr><td>#${o.id}</td><td>${o.user_name}</td><td>$${parseFloat(o.total).toFixed(2)}</td><td>${o.status}</td><td><select onchange="updateOrderStatus(${o.id},this.value)"><option>pending</option><option>processing</option><option>shipped</option><option>out_for_delivery</option><option>delivered</option></select></td></tr>`).join('')}</tbody></table></div>`;
    }
    if (tab==='users') {
      const users = await (await fetch('/api/admin/users',{headers:{'Authorization':'Bearer '+state.token}})).json();
      el.innerHTML=`<div class="admin-panel"><h3>All Users (${users.length})</h3><table class="admin-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Eco Points</th><th>Joined</th></tr></thead><tbody>${users.map(u=>`<tr><td>${u.name}</td><td>${u.email}</td><td>${u.role}</td><td>${u.eco_points}</td><td>${new Date(u.created_at).toLocaleDateString()}</td></tr>`).join('')}</tbody></table></div>`;
    }
  } catch(e) { el.innerHTML='<p style="padding:40px">Failed to load.</p>'; }
}
function showAddProductForm() {
  document.getElementById('addProductForm').innerHTML=`<div class="add-product-form">
    <h4>Add New Product</h4>
    <div class="apf-grid">
      <input type="text" id="apfName" placeholder="Product name" required/>
      <input type="text" id="apfCategory" placeholder="Category"/>
      <input type="number" id="apfPrice" placeholder="Price" step="0.01"/>
      <input type="number" id="apfStock" placeholder="Stock" value="50"/>
      <input type="text" id="apfBadge" placeholder="Eco Badge"/>
      <input type="number" id="apfCarbon" placeholder="Carbon kg" step="0.1"/>
      <input type="text" id="apfMaterial" placeholder="Material"/>
      <input type="text" id="apfOrigin" placeholder="Origin"/>
    </div>
    <input type="text" id="apfImage" placeholder="Image URL" style="width:100%;margin:8px 0"/>
    <textarea id="apfDesc" placeholder="Description" rows="3" style="width:100%;border:1.5px solid var(--sand);border-radius:10px;padding:10px;font-family:var(--font-body)"></textarea>
    <div style="display:flex;gap:12px;margin-top:12px">
      <button class="btn-primary" onclick="adminAddProduct()">Add Product</button>
      <button class="btn-ghost" onclick="document.getElementById('addProductForm').innerHTML=''">Cancel</button>
    </div>
  </div>`;
}
async function adminAddProduct() {
  try {
    const res = await fetch('/api/admin/products',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+state.token},body:JSON.stringify({name:document.getElementById('apfName').value,description:document.getElementById('apfDesc').value,price:document.getElementById('apfPrice').value,category:document.getElementById('apfCategory').value,image_url:document.getElementById('apfImage').value,stock:document.getElementById('apfStock').value,carbon_kg:document.getElementById('apfCarbon').value,eco_badge:document.getElementById('apfBadge').value,material:document.getElementById('apfMaterial').value,origin:document.getElementById('apfOrigin').value})});
    if (!res.ok) throw new Error('Failed');
    showToast('Product added!','success'); adminTab('products',document.querySelectorAll('.admin-tab')[1]);
  } catch(e) { showToast('Failed to add product','error'); }
}
async function adminDeleteProduct(id) {
  if (!confirm('Delete this product?')) return;
  await fetch('/api/admin/products/'+id,{method:'DELETE',headers:{'Authorization':'Bearer '+state.token}});
  showToast('Product deleted'); adminTab('products',document.querySelectorAll('.admin-tab')[1]);
}
async function updateOrderStatus(id, status) {
  await fetch('/api/admin/orders/'+id+'/status',{method:'PUT',headers:{'Content-Type':'application/json','Authorization':'Bearer '+state.token},body:JSON.stringify({status})});
  showToast('Order status updated','success');
}

// ── HERO SLIDER ────────────────────────────────────────────────
let currentSlide=0, sliderTimer;
function startSlider() { sliderTimer=setInterval(()=>slideChange(1),5000); }
function slideChange(dir) {
  const slides=document.querySelectorAll('.slide'); const dots=document.querySelectorAll('.dot');
  if(!slides.length)return;
  slides[currentSlide].classList.remove('active'); dots[currentSlide]?.classList.remove('active');
  currentSlide=(currentSlide+dir+slides.length)%slides.length;
  slides[currentSlide].classList.add('active'); dots[currentSlide]?.classList.add('active');
  clearInterval(sliderTimer); startSlider();
}
function goToSlide(n) {
  document.querySelectorAll('.slide')[currentSlide]?.classList.remove('active');
  document.querySelectorAll('.dot')[currentSlide]?.classList.remove('active');
  currentSlide=n;
  document.querySelectorAll('.slide')[n]?.classList.add('active');
  document.querySelectorAll('.dot')[n]?.classList.add('active');
  clearInterval(sliderTimer); startSlider();
}

// ── FLASH SALE TIMER ───────────────────────────────────────────
function startFlashTimer() {
  const end = new Date(); end.setHours(23,59,59,0);
  const el  = document.getElementById('flashTimer');
  if (!el) return;
  setInterval(()=>{
    const diff = end-new Date();
    if (diff<=0) { el.textContent='Ended'; return; }
    const h=Math.floor(diff/3600000), m=Math.floor((diff%3600000)/60000), s=Math.floor((diff%60000)/1000);
    el.textContent=`${h}h ${m}m ${s}s`;
  },1000);
}

// ── COUNTERS ───────────────────────────────────────────────────
function startCounters() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el  = entry.target;
      const end = parseInt(el.dataset.target)||0;
      let current = 0;
      const step = Math.ceil(end/80);
      const timer = setInterval(()=>{
        current = Math.min(current+step, end);
        el.textContent = current.toLocaleString();
        if (current>=end) clearInterval(timer);
      },20);
      observer.unobserve(el);
    });
  },{threshold:0.5});
  document.querySelectorAll('.counter').forEach(el=>observer.observe(el));
}

// ── SKELETON LOADING ───────────────────────────────────────────
function skeletonCards(n=6) { return Array(n).fill(`<div class="product-card skeleton-card"><div class="skeleton skeleton-img"></div><div class="product-body"><div class="skeleton skeleton-line short"></div><div class="skeleton skeleton-line"></div><div class="skeleton skeleton-line medium"></div><div class="skeleton skeleton-btn"></div></div></div>`).join(''); }

// ── DARK MODE ──────────────────────────────────────────────────
function toggleDarkMode() { document.body.classList.toggle('dark'); localStorage.setItem('eco_dark',document.body.classList.contains('dark')); }

// ── CONFETTI ───────────────────────────────────────────────────
function fireConfetti() {
  const container=document.getElementById('confettiContainer');
  const colors=['#1a3a2a','#a8d5b5','#5a8a6a','#f8f4ee','#2d5a3d'];
  const emojis=['🌿','🌱','♻️','🌍','⭐'];
  for(let i=0;i<80;i++){
    const piece=document.createElement('div');
    if(Math.random()>0.6){piece.classList.add('confetti-emoji');piece.textContent=emojis[Math.floor(Math.random()*emojis.length)];}
    else{piece.classList.add('confetti-piece');piece.style.background=colors[Math.floor(Math.random()*colors.length)];piece.style.width=Math.random()*10+6+'px';piece.style.height=Math.random()*6+4+'px';piece.style.borderRadius=Math.random()>0.5?'50%':'2px';}
    piece.style.left=Math.random()*100+'vw';
    piece.style.animationDuration=Math.random()*2+2+'s';
    piece.style.animationDelay=Math.random()*0.8+'s';
    container.appendChild(piece);
    setTimeout(()=>piece.remove(),4000);
  }
}

// ── TOAST ──────────────────────────────────────────────────────
let toastTimer;
function showToast(msg,type=''){
  const t=document.getElementById('toast'); t.textContent=msg; t.className='toast '+type+' show';
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove('show'),3500);
}