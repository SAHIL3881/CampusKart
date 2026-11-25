// Campus Kart Application Controller & Single Page Router
const App = {
  currentRoute: 'home',
  currentFilters: {
    category: 'all',
    listing_type: 'all',
    condition: 'all',
    sort_by: 'newest',
    search: '',
    min_price: '',
    max_price: ''
  },

  init() {
    this.setupRouter();
    this.setupEventListeners();
    this.renderNavUser();
    this.updateUnreadCountBadge();
    Chat.init();

    // Listen to hash change
    window.addEventListener('hashchange', () => this.handleRouting());
    this.handleRouting();
  },

  setupRouter() {
    // Basic hash routing
    if (!window.location.hash) {
      window.location.hash = '#home';
    }
  },

  handleRouting() {
    const hash = window.location.hash.substring(1) || 'home';
    const [route, param] = hash.split('/');

    this.currentRoute = route;

    // Update active nav-link
    document.querySelectorAll('.nav-link').forEach(link => {
      const target = link.getAttribute('data-route');
      if (target === route) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    const appContainer = document.getElementById('app');
    window.scrollTo(0, 0);

    switch (route) {
      case 'home':
        this.renderHomePage(appContainer);
        break;
      case 'marketplace':
        this.renderMarketplacePage(appContainer);
        break;
      case 'product':
        this.renderProductDetailsPage(appContainer, param);
        break;
      case 'services':
        this.renderServicesPage(appContainer);
        break;
      case 'notes':
        this.renderNotesPage(appContainer);
        break;
      case 'chat':
        this.renderChatPage(appContainer, param);
        break;
      case 'profile':
        this.renderProfilePage(appContainer, param);
        break;
      case 'dashboard':
        this.renderDashboardPage(appContainer);
        break;
      case 'login':
        this.renderLoginPage(appContainer);
        break;
      case 'signup':
        this.renderSignupPage(appContainer);
        break;
      case 'about':
        this.renderAboutPage(appContainer);
        break;
      case 'contact':
        this.renderContactPage(appContainer);
        break;
      default:
        this.renderHomePage(appContainer);
        break;
    }
  },

  navigateTo(route, param = null) {
    if (param) {
      window.location.hash = `#${route}/${param}`;
    } else {
      window.location.hash = `#${route}`;
    }
  },

  setupEventListeners() {
    // Global click outside to close dropdowns
    document.addEventListener('click', (e) => {
      const dropdown = document.getElementById('user-dropdown-menu');
      const avatarBtn = document.getElementById('user-avatar-btn');
      if (dropdown && !dropdown.contains(e.target) && avatarBtn && !avatarBtn.contains(e.target)) {
        dropdown.classList.remove('show');
      }
    });
  },

  renderNavUser() {
    const navAuth = document.getElementById('nav-auth-container');
    const user = API.getCurrentUser();

    if (!navAuth) return;

    if (user) {
      navAuth.innerHTML = `
        <div class="user-menu-wrapper">
          <button id="user-avatar-btn" class="user-avatar-btn" onclick="App.toggleUserDropdown()">
            <img src="${user.profile_photo || 'https://api.dicebear.com/7.x/initials/svg?seed=' + encodeURIComponent(user.full_name)}" class="user-avatar-img" alt="Avatar" />
            <span class="user-menu-name">${escapeHtml(user.full_name.split(' ')[0])}</span>
            <i class="fa-solid fa-chevron-down" style="font-size: 0.75rem; color: var(--secondary-text);"></i>
          </button>
          <div id="user-dropdown-menu" class="dropdown-menu">
            <div style="padding: 0.6rem 1rem; border-bottom: 1px solid var(--border-light);">
              <div style="font-weight: 700; font-size: 0.95rem;">${escapeHtml(user.full_name)}</div>
              <div style="font-size: 0.75rem; color: var(--secondary-text);">${escapeHtml(user.university || 'Chandigarh University')}</div>
              <div style="font-size: 0.75rem; color: var(--primary-blue); font-weight: 500;">${escapeHtml(user.course || 'CU Student')}</div>
            </div>
            <a class="dropdown-item" href="#dashboard" onclick="App.closeUserDropdown()">
              <i class="fa-solid fa-table-columns" style="width: 18px; color: var(--primary-blue);"></i> Dashboard
            </a>
            <a class="dropdown-item" href="#profile/${user.id}" onclick="App.closeUserDropdown()">
              <i class="fa-regular fa-user" style="width: 18px; color: var(--primary-blue);"></i> My Profile
            </a>
            <a class="dropdown-item" href="#chat" onclick="App.closeUserDropdown()">
              <i class="fa-regular fa-comments" style="width: 18px; color: var(--primary-blue);"></i> Messages
            </a>
            <div class="dropdown-divider"></div>
            <a class="dropdown-item" style="color: var(--red-accent);" onclick="App.handleLogout()">
              <i class="fa-solid fa-arrow-right-from-bracket" style="width: 18px;"></i> Logout
            </a>
          </div>
        </div>
      `;
    } else {
      navAuth.innerHTML = `
        <a href="#login" class="btn btn-secondary btn-sm">Log In</a>
        <a href="#signup" class="btn btn-primary btn-sm">Sign Up</a>
      `;
    }
  },

  toggleUserDropdown() {
    const dropdown = document.getElementById('user-dropdown-menu');
    if (dropdown) dropdown.classList.toggle('show');
  },

  closeUserDropdown() {
    const dropdown = document.getElementById('user-dropdown-menu');
    if (dropdown) dropdown.classList.remove('show');
  },

  async updateUnreadCountBadge() {
    const badge = document.getElementById('chat-badge');
    const user = API.getCurrentUser();
    if (!badge || !user) {
      if (badge) badge.style.display = 'none';
      return;
    }

    try {
      const res = await API.getUnreadCount();
      if (res.unread_count > 0) {
        badge.textContent = res.unread_count > 9 ? '9+' : res.unread_count;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    } catch {
      badge.style.display = 'none';
    }
  },

  handleLogout() {
    API.logout();
    this.renderNavUser();
    this.updateUnreadCountBadge();
    this.showToast('You have been logged out.', 'info');
    this.navigateTo('home');
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-triangle-exclamation';

    toast.innerHTML = `
      <i class="fa-solid ${icon}" style="font-size: 1.1rem;"></i>
      <span>${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  },

  // ----------------------------------------------------
  // 1. Home Page
  // ----------------------------------------------------
  async renderHomePage(container) {
    container.innerHTML = `
      <!-- Hero Section -->
      <section class="hero">
        <div class="container hero-grid">
          <div>
            <div class="hero-badge">
              <i class="fa-solid fa-graduation-cap"></i> Exclusively for Chandigarh University Students
            </div>
            <h1 class="hero-title">
              Buy, Sell & Rent with <span>Verified Campus Peers</span>
            </h1>
            <p class="hero-desc">
              Campus Kart is the student community marketplace for CU Gharuan students. Exchange textbooks, laptops, hostel essentials, rent bicycles & gear, and offer student services safely within your campus.
            </p>
            
            <div class="search-bar-wrapper">
              <div class="search-input-group">
                <i class="fa-solid fa-magnifying-glass"></i>
                <input type="text" id="hero-search-input" class="search-input" placeholder="Search textbooks, laptops, calculators, bicycles, services..." onkeydown="if(event.key==='Enter') App.executeHeroSearch()" />
              </div>
              <select id="hero-search-type" class="search-select">
                <option value="marketplace">Products</option>
                <option value="services">Services</option>
                <option value="notes">Notes</option>
              </select>
              <button class="btn btn-primary" onclick="App.executeHeroSearch()">Search</button>
            </div>
          </div>

          <div class="hero-visual">
            <div class="hero-stat-card">
              <div class="hero-stat-icon icon-blue"><i class="fa-solid fa-bag-shopping"></i></div>
              <div class="hero-stat-number">100% Peer-to-Peer</div>
              <div class="hero-stat-label">Direct deals between CU students without middlemen</div>
            </div>
            <div class="hero-stat-card">
              <div class="hero-stat-icon icon-green"><i class="fa-solid fa-shield-halved"></i></div>
              <div class="hero-stat-number">Verified Campus</div>
              <div class="hero-stat-label">CU email & student ID authentication for safety</div>
            </div>
            <div class="hero-stat-card">
              <div class="hero-stat-icon icon-amber"><i class="fa-solid fa-arrows-rotate"></i></div>
              <div class="hero-stat-number">Rent & Save</div>
              <div class="hero-stat-label">Daily and weekly campus rentals for labs & events</div>
            </div>
            <div class="hero-stat-card">
              <div class="hero-stat-icon icon-purple"><i class="fa-solid fa-book-open-reader"></i></div>
              <div class="hero-stat-number">Study Notes</div>
              <div class="hero-stat-label">Solved papers, handwritten notes & assignments</div>
            </div>
          </div>
        </div>
      </section>

      <!-- Quick Access Cards -->
      <section class="quick-access-section">
        <div class="container quick-access-grid">
          <div class="quick-card" onclick="App.navigateTo('marketplace')">
            <div class="quick-card-icon icon-blue"><i class="fa-solid fa-cart-shopping"></i></div>
            <div>
              <h4>Buy Products</h4>
              <p>Electronics, books & hostel gear</p>
            </div>
          </div>
          <div class="quick-card" onclick="App.openSellModal()">
            <div class="quick-card-icon icon-green"><i class="fa-solid fa-tag"></i></div>
            <div>
              <h4>Sell an Item</h4>
              <p>List in 60s & reach 40,000+ peers</p>
            </div>
          </div>
          <div class="quick-card" onclick="App.filterMarketplaceType('rent')">
            <div class="quick-card-icon icon-amber"><i class="fa-solid fa-key"></i></div>
            <div>
              <h4>Campus Rentals</h4>
              <p>Cycles, cameras, lab tools & calculators</p>
            </div>
          </div>
          <div class="quick-card" onclick="App.navigateTo('services')">
            <div class="quick-card-icon icon-purple"><i class="fa-solid fa-laptop-code"></i></div>
            <div>
              <h4>Student Services</h4>
              <p>Project help, tutoring & design</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Popular Categories -->
      <section class="section">
        <div class="container">
          <div class="section-header">
            <div>
              <h2 class="section-title">Browse Categories</h2>
              <p class="section-subtitle">Find exactly what you need for this semester</p>
            </div>
            <a href="#marketplace" class="see-all-link">View All Items <i class="fa-solid fa-arrow-right"></i></a>
          </div>

          <div class="category-chips">
            <button class="category-chip active" onclick="App.filterHomeCategory('all', this)"><i class="fa-solid fa-border-all"></i> All Categories</button>
            <button class="category-chip" onclick="App.filterHomeCategory('Laptops and Electronics', this)"><i class="fa-solid fa-laptop"></i> Laptops & Electronics</button>
            <button class="category-chip" onclick="App.filterHomeCategory('Books and Study Materials', this)"><i class="fa-solid fa-book"></i> Books & Materials</button>
            <button class="category-chip" onclick="App.filterHomeCategory('Bicycles and Bikes', this)"><i class="fa-solid fa-bicycle"></i> Bicycles & Bikes</button>
            <button class="category-chip" onclick="App.filterHomeCategory('Cameras and Photography Equipment', this)"><i class="fa-solid fa-camera"></i> Cameras</button>
            <button class="category-chip" onclick="App.filterHomeCategory('Hostel and Room Essentials', this)"><i class="fa-solid fa-bed"></i> Hostel Essentials</button>
            <button class="category-chip" onclick="App.filterHomeCategory('Sports Equipment', this)"><i class="fa-solid fa-basketball"></i> Sports Gear</button>
          </div>

          <div id="home-products-container" class="products-grid">
            <div style="grid-column: 1 / -1; text-align: center; padding: 2rem;">
              <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.5rem; color: var(--primary-blue);"></i>
            </div>
          </div>
        </div>
      </section>

      <!-- Trending Services Section -->
      <section class="section" style="background: white; border-top: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color);">
        <div class="container">
          <div class="section-header">
            <div>
              <h2 class="section-title">Student Services & Tutoring</h2>
              <p class="section-subtitle">Academic guidance, coding help, presentation design, and photography</p>
            </div>
            <a href="#services" class="see-all-link">Explore Services <i class="fa-solid fa-arrow-right"></i></a>
          </div>

          <div id="home-services-container" class="services-grid">
            <div style="grid-column: 1 / -1; text-align: center; padding: 2rem;">
              <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.5rem; color: var(--primary-blue);"></i>
            </div>
          </div>
        </div>
      </section>

      <!-- Featured Study Notes Section -->
      <section class="section">
        <div class="container">
          <div class="section-header">
            <div>
              <h2 class="section-title">Verified Study Notes & Materials</h2>
              <p class="section-subtitle">High-quality handwritten and typed notes tailored to Chandigarh University syllabus</p>
            </div>
            <a href="#notes" class="see-all-link">Browse Notes <i class="fa-solid fa-arrow-right"></i></a>
          </div>

          <div id="home-notes-container" class="notes-grid">
            <div style="grid-column: 1 / -1; text-align: center; padding: 2rem;">
              <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.5rem; color: var(--primary-blue);"></i>
            </div>
          </div>
        </div>
      </section>

      <!-- How Campus Kart Works -->
      <section class="section how-it-works">
        <div class="container">
          <div style="text-align: center; max-width: 600px; margin: 0 auto 3rem;">
            <h2 class="section-title">How Campus Kart Works</h2>
            <p class="section-subtitle">A safe, simple 3-step platform designed specially for university life</p>
          </div>

          <div class="steps-grid">
            <div class="step-card">
              <div class="step-number">1</div>
              <h3 style="margin-bottom: 0.5rem;">Join with CU ID</h3>
              <p style="color: var(--secondary-text); font-size: 0.9rem;">Sign up using your student details. Connect instantly with peers in your department, batch, and hostels.</p>
            </div>
            <div class="step-card">
              <div class="step-number">2</div>
              <h3 style="margin-bottom: 0.5rem;">List or Discover</h3>
              <p style="color: var(--secondary-text); font-size: 0.9rem;">Post your used gear, rental bikes, services, or study notes. Filter by price, category, and condition.</p>
            </div>
            <div class="step-card">
              <div class="step-number">3</div>
              <h3 style="margin-bottom: 0.5rem;">Chat & Meet on Campus</h3>
              <p style="color: var(--secondary-text); font-size: 0.9rem;">Chat privately in real time. Meet safely at common university spots like the Student Centre or Academic Blocks.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Call To Action -->
      <div class="container">
        <section class="cta-section">
          <h2 class="cta-title">Got Items You No Longer Need?</h2>
          <p class="cta-desc">Help a junior out and make extra cash. It takes less than 60 seconds to post an item on Campus Kart.</p>
          <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
            <button class="btn btn-secondary btn-lg" onclick="App.openSellModal()">
              <i class="fa-solid fa-plus"></i> Post a Product Listing
            </button>
            <button class="btn btn-outline-primary btn-lg" style="color: white; border-color: white;" onclick="App.openServiceModal()">
              <i class="fa-solid fa-briefcase"></i> Offer a Student Service
            </button>
          </div>
        </section>
      </div>
    `;

    // Load dynamic items
    this.loadHomeProducts();
    this.loadHomeServices();
    this.loadHomeNotes();
  },

  executeHeroSearch() {
    const term = document.getElementById('hero-search-input')?.value.trim() || '';
    const type = document.getElementById('hero-search-type')?.value || 'marketplace';

    if (type === 'services') {
      this.navigateTo('services');
      setTimeout(() => {
        const inp = document.getElementById('services-search-input');
        if (inp) {
          inp.value = term;
          this.loadServicesList();
        }
      }, 50);
    } else if (type === 'notes') {
      this.navigateTo('notes');
      setTimeout(() => {
        const inp = document.getElementById('notes-search-input');
        if (inp) {
          inp.value = term;
          this.loadNotesList();
        }
      }, 50);
    } else {
      this.currentFilters.search = term;
      this.navigateTo('marketplace');
    }
  },

  async loadHomeProducts(category = 'all') {
    const el = document.getElementById('home-products-container');
    if (!el) return;

    try {
      const params = { status: 'available' };
      if (category !== 'all') params.category = category;
      const res = await API.getProducts(params);
      const products = res.products || [];

      if (products.length === 0) {
        el.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 2.5rem; color: var(--secondary-text);">No listings found in this category. Be the first to post!</div>`;
        return;
      }

      el.innerHTML = products.slice(0, 8).map(p => this.renderProductCardHtml(p)).join('');
    } catch (err) {
      el.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: var(--red-accent);">Error loading products</div>`;
    }
  },

  filterHomeCategory(cat, btn) {
    document.querySelectorAll('.category-chips .category-chip').forEach(c => c.classList.remove('active'));
    if (btn) btn.classList.add('active');
    this.loadHomeProducts(cat);
  },

  async loadHomeServices() {
    const el = document.getElementById('home-services-container');
    if (!el) return;

    try {
      const res = await API.getServices();
      const services = res.services || [];
      if (services.length === 0) {
        el.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: var(--secondary-text);">No services offered yet.</div>`;
        return;
      }
      el.innerHTML = services.slice(0, 4).map(s => this.renderServiceCardHtml(s)).join('');
    } catch (err) {
      el.innerHTML = `<div style="grid-column: 1 / -1; color: var(--red-accent); text-align: center;">Error loading services</div>`;
    }
  },

  async loadHomeNotes() {
    const el = document.getElementById('home-notes-container');
    if (!el) return;

    try {
      const res = await API.getNotes();
      const notes = res.notes || [];
      if (notes.length === 0) {
        el.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: var(--secondary-text);">No study notes available yet.</div>`;
        return;
      }
      el.innerHTML = notes.slice(0, 4).map(n => this.renderNoteCardHtml(n)).join('');
    } catch (err) {
      el.innerHTML = `<div style="grid-column: 1 / -1; color: var(--red-accent); text-align: center;">Error loading notes</div>`;
    }
  },

  // ----------------------------------------------------
  // 2. Marketplace Page
  // ----------------------------------------------------
  renderMarketplacePage(container) {
    container.innerHTML = `
      <div class="container" style="padding-top: 2rem; padding-bottom: 4rem;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h1 style="font-size: 2rem; font-weight: 800;">Student Marketplace</h1>
            <p style="color: var(--secondary-text);">Buy, sell, rent, and giveaway verified campus items</p>
          </div>
          <button class="btn btn-primary" onclick="App.openSellModal()">
            <i class="fa-solid fa-plus"></i> Post Product Listing
          </button>
        </div>

        <!-- Filter Controls -->
        <div style="background: white; padding: 1.25rem; border-radius: var(--radius-lg); border: 1px solid var(--border-color); box-shadow: var(--shadow-sm); margin-bottom: 1.5rem;">
          <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr; gap: 0.75rem; align-items: center;" class="marketplace-filter-grid">
            <div class="search-input-group" style="background: var(--light-bg); border-radius: var(--radius-md); padding: 0.6rem 0.8rem;">
              <i class="fa-solid fa-magnifying-glass"></i>
              <input type="text" id="market-search" class="search-input" placeholder="Search products, brands, models..." value="${escapeHtml(this.currentFilters.search)}" oninput="App.onMarketFilterChange()" />
            </div>

            <select id="market-category" class="form-control" onchange="App.onMarketFilterChange()">
              <option value="all">All Categories</option>
              <option value="Laptops and Electronics">Laptops & Electronics</option>
              <option value="Books and Study Materials">Books & Study Materials</option>
              <option value="Notes and Assignments">Notes & Assignments</option>
              <option value="Bicycles and Bikes">Bicycles & Bikes</option>
              <option value="Cameras and Photography Equipment">Cameras & Gear</option>
              <option value="Hostel and Room Essentials">Hostel & Room Essentials</option>
              <option value="Furniture">Furniture & Coolers</option>
              <option value="Clothing and Accessories">Clothing & Accessories</option>
              <option value="Sports Equipment">Sports Equipment</option>
              <option value="Other Products">Other Products</option>
            </select>

            <select id="market-listing-type" class="form-control" onchange="App.onMarketFilterChange()">
              <option value="all">All Listing Types</option>
              <option value="sale">For Sale</option>
              <option value="rent">For Rent</option>
              <option value="purchase">Wanted / For Purchase</option>
              <option value="giveaway">Free / Giveaway</option>
            </select>

            <select id="market-condition" class="form-control" onchange="App.onMarketFilterChange()">
              <option value="all">All Conditions</option>
              <option value="Brand New">Brand New</option>
              <option value="Like New">Like New</option>
              <option value="Gently Used">Gently Used</option>
              <option value="Fair">Fair</option>
            </select>

            <select id="market-sort" class="form-control" onchange="App.onMarketFilterChange()">
              <option value="newest">Sort: Newest First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="oldest">Sort: Oldest First</option>
            </select>
          </div>

          <!-- Quick Type Filters -->
          <div style="display: flex; gap: 0.5rem; margin-top: 1rem; align-items: center; flex-wrap: wrap;">
            <span style="font-size: 0.8rem; font-weight: 600; color: var(--secondary-text); margin-right: 0.25rem;">Quick View:</span>
            <button class="btn btn-sm btn-secondary ${this.currentFilters.listing_type === 'all' ? 'btn-primary' : ''}" onclick="App.setListingTypeFilter('all')">All</button>
            <button class="btn btn-sm btn-secondary ${this.currentFilters.listing_type === 'sale' ? 'btn-primary' : ''}" onclick="App.setListingTypeFilter('sale')">🏷️ For Sale</button>
            <button class="btn btn-sm btn-secondary ${this.currentFilters.listing_type === 'rent' ? 'btn-primary' : ''}" onclick="App.setListingTypeFilter('rent')">🔑 For Rent</button>
            <button class="btn btn-sm btn-secondary ${this.currentFilters.listing_type === 'giveaway' ? 'btn-primary' : ''}" onclick="App.setListingTypeFilter('giveaway')">🎁 Free Giveaway</button>
            <button class="btn btn-sm btn-secondary ${this.currentFilters.listing_type === 'purchase' ? 'btn-primary' : ''}" onclick="App.setListingTypeFilter('purchase')">🔍 Wanted</button>
          </div>
        </div>

        <div style="margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between;">
          <span id="market-results-count" style="font-size: 0.9rem; font-weight: 600; color: var(--secondary-text);">Loading products...</span>
        </div>

        <div id="marketplace-grid" class="products-grid">
          <div style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
            <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary-blue);"></i>
          </div>
        </div>
      </div>
    `;

    // Apply filters
    if (this.currentFilters.category !== 'all') {
      document.getElementById('market-category').value = this.currentFilters.category;
    }
    if (this.currentFilters.listing_type !== 'all') {
      document.getElementById('market-listing-type').value = this.currentFilters.listing_type;
    }

    this.loadMarketplaceProducts();
  },

  filterMarketplaceType(type) {
    this.currentFilters.listing_type = type;
    this.navigateTo('marketplace');
  },

  setListingTypeFilter(type) {
    this.currentFilters.listing_type = type;
    const sel = document.getElementById('market-listing-type');
    if (sel) sel.value = type;
    this.loadMarketplaceProducts();
  },

  onMarketFilterChange() {
    this.currentFilters.search = document.getElementById('market-search')?.value.trim() || '';
    this.currentFilters.category = document.getElementById('market-category')?.value || 'all';
    this.currentFilters.listing_type = document.getElementById('market-listing-type')?.value || 'all';
    this.currentFilters.condition = document.getElementById('market-condition')?.value || 'all';
    this.currentFilters.sort_by = document.getElementById('market-sort')?.value || 'newest';
    this.loadMarketplaceProducts();
  },

  async loadMarketplaceProducts() {
    const grid = document.getElementById('marketplace-grid');
    const countEl = document.getElementById('market-results-count');
    if (!grid) return;

    try {
      const res = await API.getProducts({
        search: this.currentFilters.search,
        category: this.currentFilters.category,
        listing_type: this.currentFilters.listing_type,
        condition: this.currentFilters.condition,
        sort_by: this.currentFilters.sort_by,
        status: 'available'
      });

      const products = res.products || [];
      if (countEl) countEl.textContent = `Showing ${products.length} item${products.length === 1 ? '' : 's'}`;

      if (products.length === 0) {
        grid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1.5rem; background: white; border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
            <i class="fa-solid fa-box-open" style="font-size: 3rem; color: #cbd5e1; margin-bottom: 1rem;"></i>
            <h3>No products found</h3>
            <p style="color: var(--secondary-text); margin-top: 0.25rem;">Try adjusting your search keywords or category filters.</p>
            <button class="btn btn-primary" style="margin-top: 1rem;" onclick="App.resetMarketFilters()">Reset All Filters</button>
          </div>
        `;
        return;
      }

      grid.innerHTML = products.map(p => this.renderProductCardHtml(p)).join('');
    } catch (err) {
      grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: var(--red-accent);">Failed to load products: ${err.message}</div>`;
    }
  },

  resetMarketFilters() {
    this.currentFilters = { category: 'all', listing_type: 'all', condition: 'all', sort_by: 'newest', search: '' };
    this.renderMarketplacePage(document.getElementById('app'));
  },

  // ----------------------------------------------------
  // Product Card Template
  // ----------------------------------------------------
  renderProductCardHtml(p) {
    const isFree = p.listing_type === 'giveaway' || p.price === 0;
    const isRent = p.listing_type === 'rent';

    let badgeClass = 'badge-sale';
    let badgeText = 'FOR SALE';
    if (p.listing_type === 'rent') { badgeClass = 'badge-rent'; badgeText = 'FOR RENT'; }
    if (p.listing_type === 'giveaway') { badgeClass = 'badge-giveaway'; badgeText = 'FREE GIVEAWAY'; }
    if (p.listing_type === 'purchase') { badgeClass = 'badge-purchase'; badgeText = 'WANTED'; }

    return `
      <div class="product-card" id="product-card-${p.id}">
        <div class="card-image-wrap" onclick="App.navigateTo('product', ${p.id})">
          <img src="${p.primary_image || 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=800&q=80'}" alt="${escapeHtml(p.title)}" loading="lazy" />
          <div class="card-badges">
            <span class="badge ${badgeClass}">${badgeText}</span>
            <span class="badge badge-condition">${escapeHtml(p.condition)}</span>
          </div>
          <button class="save-btn ${p.is_saved ? 'saved' : ''}" title="Save item" onclick="event.stopPropagation(); App.handleToggleSaveProduct(${p.id})">
            <i class="fa-${p.is_saved ? 'solid' : 'regular'} fa-heart"></i>
          </button>
        </div>

        <div class="product-card-body">
          <div class="product-category">${escapeHtml(p.category)}</div>
          <h3 class="product-title" onclick="App.navigateTo('product', ${p.id})">${escapeHtml(p.title)}</h3>
          
          <div class="product-price-row">
            ${isFree ? `
              <span class="product-price" style="color: var(--green-accent);">FREE</span>
            ` : `
              <span class="product-price">₹${Number(p.price).toLocaleString()}</span>
              ${isRent ? `<span class="product-price-unit">/${escapeHtml(p.rent_rate_type || 'day')}</span>` : ''}
            `}
          </div>

          <div class="product-meta-row">
            <i class="fa-solid fa-location-dot"></i>
            <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(p.location)}</span>
          </div>

          <div class="product-seller-footer">
            <div class="seller-info" onclick="App.navigateTo('profile', ${p.user_id})" style="cursor: pointer;" title="View seller profile">
              <img src="${p.seller_photo || 'https://api.dicebear.com/7.x/initials/svg?seed=' + encodeURIComponent(p.seller_name)}" class="seller-avatar" alt="Avatar" />
              <span class="seller-name">${escapeHtml(p.seller_name)}</span>
            </div>
            
            <button class="btn btn-outline-primary btn-sm" onclick="App.handleStartChatWithUser(${p.user_id}, ${p.id}, null, 'Hi! Is ${escapeJsString(p.title)} still available?')">
              <i class="fa-regular fa-comment-dots"></i> Chat
            </button>
          </div>
        </div>
      </div>
    `;
  },

  // ----------------------------------------------------
  // 3. Product Details Page
  // ----------------------------------------------------
  async renderProductDetailsPage(container, productId) {
    container.innerHTML = `
      <div class="container" style="padding-top: 2rem; padding-bottom: 4rem;">
        <div style="text-align: center; padding: 4rem;">
          <i class="fa-solid fa-spinner fa-spin" style="font-size: 2.5rem; color: var(--primary-blue);"></i>
          <p style="margin-top: 1rem; color: var(--secondary-text);">Loading product details...</p>
        </div>
      </div>
    `;

    try {
      const res = await API.getProduct(productId);
      const p = res.product;
      const images = p.images && p.images.length > 0 ? p.images : [{ image_url: 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=800&q=80' }];
      const currentUser = API.getCurrentUser();
      const isOwner = currentUser && currentUser.id === p.user_id;

      let badgeClass = 'badge-sale';
      let badgeText = 'FOR SALE';
      if (p.listing_type === 'rent') { badgeClass = 'badge-rent'; badgeText = 'FOR RENT'; }
      if (p.listing_type === 'giveaway') { badgeClass = 'badge-giveaway'; badgeText = 'FREE GIVEAWAY'; }
      if (p.listing_type === 'purchase') { badgeClass = 'badge-purchase'; badgeText = 'WANTED'; }

      container.innerHTML = `
        <div class="container" style="padding-top: 2rem; padding-bottom: 4rem;">
          <!-- Breadcrumb -->
          <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: var(--secondary-text); margin-bottom: 1.5rem;">
            <a href="#home">Home</a> <i class="fa-solid fa-chevron-right" style="font-size: 0.65rem;"></i>
            <a href="#marketplace">Marketplace</a> <i class="fa-solid fa-chevron-right" style="font-size: 0.65rem;"></i>
            <span style="color: var(--dark-text); font-weight: 500;">${escapeHtml(p.category)}</span>
          </div>

          <div style="display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 2.5rem; align-items: start;" class="product-details-grid">
            
            <!-- Gallery Left -->
            <div>
              <div style="width: 100%; border-radius: var(--radius-lg); overflow: hidden; background: white; border: 1px solid var(--border-color); box-shadow: var(--shadow-sm); margin-bottom: 1rem; position: relative;">
                <img id="detail-main-img" src="${images[0].image_url}" style="width: 100%; height: 420px; object-fit: cover;" alt="${escapeHtml(p.title)}" />
                <span class="badge ${badgeClass}" style="position: absolute; top: 16px; left: 16px; font-size: 0.85rem; padding: 0.4rem 0.8rem;">${badgeText}</span>
              </div>

              ${images.length > 1 ? `
                <div style="display: flex; gap: 0.75rem; overflow-x: auto;">
                  ${images.map((img, i) => `
                    <img src="${img.image_url}" onclick="document.getElementById('detail-main-img').src='${img.image_url}'" style="width: 75px; height: 75px; object-fit: cover; border-radius: var(--radius-md); border: 2px solid ${i === 0 ? 'var(--primary-blue)' : 'var(--border-color)'}; cursor: pointer;" alt="Thumb" />
                  `).join('')}
                </div>
              ` : ''}

              <!-- Description Box -->
              <div style="background: white; border-radius: var(--radius-lg); border: 1px solid var(--border-color); padding: 1.75rem; margin-top: 1.5rem; box-shadow: var(--shadow-sm);">
                <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem;">Description</h3>
                <p style="color: var(--dark-text); line-height: 1.7; white-space: pre-line;">${escapeHtml(p.description)}</p>

                ${p.listing_type === 'rent' ? `
                  <div style="margin-top: 1.5rem; padding: 1.25rem; background: var(--amber-accent-light); border-radius: var(--radius-md); border-left: 4px solid var(--amber-accent);">
                    <h4 style="font-weight: 700; color: #92400e; margin-bottom: 0.5rem;"><i class="fa-solid fa-circle-info"></i> Rental Terms & Deposit</h4>
                    <p style="font-size: 0.9rem; color: #92400e; margin-bottom: 0.35rem;"><strong>Security Deposit:</strong> ₹${Number(p.security_deposit || 0).toLocaleString()} (Refundable)</p>
                    <p style="font-size: 0.9rem; color: #92400e;"><strong>Terms:</strong> ${escapeHtml(p.rental_terms || 'Requires valid Chandigarh University Student ID card upon pickup.')}</p>
                  </div>
                ` : ''}
              </div>
            </div>

            <!-- Details & Actions Right -->
            <div style="display: flex; flex-direction: column; gap: 1.5rem;">
              <div style="background: white; border-radius: var(--radius-lg); border: 1px solid var(--border-color); padding: 1.75rem; box-shadow: var(--shadow-sm);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 0.5rem;">
                  <span class="product-category">${escapeHtml(p.category)}</span>
                  <button class="save-btn ${p.is_saved ? 'saved' : ''}" style="position: static;" onclick="App.handleToggleSaveProduct(${p.id})">
                    <i class="fa-${p.is_saved ? 'solid' : 'regular'} fa-heart"></i>
                  </button>
                </div>

                <h1 style="font-size: 1.75rem; font-weight: 800; line-height: 1.3; margin-bottom: 1rem;">${escapeHtml(p.title)}</h1>

                <div style="display: flex; align-items: baseline; gap: 0.5rem; margin-bottom: 1.5rem;">
                  ${p.listing_type === 'giveaway' || p.price === 0 ? `
                    <span style="font-size: 2rem; font-weight: 800; color: var(--green-accent);">FREE</span>
                  ` : `
                    <span style="font-size: 2.25rem; font-weight: 800; color: var(--dark-text);">₹${Number(p.price).toLocaleString()}</span>
                    ${p.listing_type === 'rent' ? `<span style="font-size: 1rem; color: var(--secondary-text);">/${escapeHtml(p.rent_rate_type || 'day')}</span>` : ''}
                  `}
                </div>

                <!-- Attributes Table -->
                <div style="border-top: 1px solid var(--border-light); border-bottom: 1px solid var(--border-light); padding: 1.25rem 0; margin-bottom: 1.5rem; display: flex; flex-direction: column; gap: 0.75rem;">
                  <div style="display: flex; justify-content: space-between; font-size: 0.9rem;">
                    <span style="color: var(--secondary-text);">Condition</span>
                    <span style="font-weight: 600;">${escapeHtml(p.condition)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-size: 0.9rem;">
                    <span style="color: var(--secondary-text);">Campus Location</span>
                    <span style="font-weight: 600;"><i class="fa-solid fa-location-dot" style="color: var(--primary-blue);"></i> ${escapeHtml(p.location)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-size: 0.9rem;">
                    <span style="color: var(--secondary-text);">Listed On</span>
                    <span style="font-weight: 500;">${formatDate(p.created_at)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-size: 0.9rem;">
                    <span style="color: var(--secondary-text);">Item Status</span>
                    <span class="badge ${p.status === 'available' ? 'badge-giveaway' : 'badge-condition'}">${p.status.toUpperCase()}</span>
                  </div>
                </div>

                <!-- Action Buttons -->
                ${isOwner ? `
                  <div style="display: flex; gap: 0.75rem;">
                    <button class="btn btn-secondary" style="flex: 1;" onclick="App.openEditProductModal(${p.id})">
                      <i class="fa-regular fa-pen-to-square"></i> Edit Listing
                    </button>
                    <button class="btn btn-sm" style="color: var(--red-accent); border: 1px solid #fee2e2;" onclick="App.handleDeleteProduct(${p.id})">
                      <i class="fa-solid fa-trash"></i> Delete
                    </button>
                  </div>
                ` : `
                  <button class="btn btn-primary btn-lg" style="width: 100%; margin-bottom: 0.75rem;" onclick="App.handleStartChatWithUser(${p.seller_id}, ${p.id}, null, 'Hi ${escapeJsString(p.seller_name.split(' ')[0])}! I am interested in your listing: ${escapeJsString(p.title)}. Is it still available for inspection?')">
                    <i class="fa-regular fa-comment-dots" style="font-size: 1.1rem;"></i> Chat with Seller
                  </button>
                  ${p.seller_phone ? `
                    <a href="tel:${p.seller_phone}" class="btn btn-secondary" style="width: 100%;">
                      <i class="fa-solid fa-phone"></i> Call Seller (${escapeHtml(p.seller_phone)})
                    </a>
                  ` : ''}
                `}
              </div>

              <!-- Seller Profile Card -->
              <div style="background: white; border-radius: var(--radius-lg); border: 1px solid var(--border-color); padding: 1.5rem; box-shadow: var(--shadow-sm);">
                <h4 style="font-size: 0.9rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--secondary-text); margin-bottom: 1rem;">Seller Information</h4>
                
                <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                  <img src="${p.seller_photo || 'https://api.dicebear.com/7.x/initials/svg?seed=' + encodeURIComponent(p.seller_name)}" style="width: 56px; height: 56px; border-radius: var(--radius-full); object-fit: cover; border: 2px solid var(--primary-blue-light);" alt="Avatar" />
                  <div>
                    <h3 style="font-size: 1.1rem; font-weight: 700;">${escapeHtml(p.seller_name)}</h3>
                    <p style="font-size: 0.85rem; color: var(--primary-blue); font-weight: 600;"><i class="fa-solid fa-certificate"></i> Verified CU Student</p>
                    <p style="font-size: 0.8rem; color: var(--secondary-text);">${escapeHtml(p.seller_course || 'Chandigarh University')} • ${escapeHtml(p.seller_semester || '')}</p>
                  </div>
                </div>

                <div style="display: flex; gap: 1.5rem; background: var(--light-bg); padding: 0.75rem 1rem; border-radius: var(--radius-md); margin-bottom: 1rem;">
                  <div>
                    <div style="font-size: 0.75rem; color: var(--secondary-text);">Rating</div>
                    <div style="font-weight: 700; color: var(--dark-text);"><i class="fa-solid fa-star" style="color: #fbbf24;"></i> ${p.seller_rating} / 5.0</div>
                  </div>
                  <div>
                    <div style="font-size: 0.75rem; color: var(--secondary-text);">Reviews</div>
                    <div style="font-weight: 700; color: var(--dark-text);">${p.seller_review_count} verified</div>
                  </div>
                </div>

                <button class="btn btn-secondary btn-sm" style="width: 100%;" onclick="App.navigateTo('profile', ${p.seller_id})">
                  View Full Profile & Listings
                </button>
              </div>

              <!-- Campus Safety Card -->
              <div style="background: #f8fafc; border-radius: var(--radius-lg); border: 1px dashed var(--border-color); padding: 1.25rem;">
                <h4 style="font-weight: 700; font-size: 0.875rem; color: var(--dark-text); margin-bottom: 0.4rem;"><i class="fa-solid fa-shield-halved" style="color: var(--green-accent);"></i> Campus Kart Safety Tips</h4>
                <ul style="font-size: 0.8rem; color: var(--secondary-text); padding-left: 1.2rem; line-height: 1.6;">
                  <li>Always inspect goods in daylight at public campus hubs (Academic Blocks, Student Centre, Library).</li>
                  <li>Pay via UPI or cash only after you have tested and verified the product.</li>
                </ul>
              </div>

            </div>
          </div>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `
        <div class="container" style="padding: 4rem; text-align: center;">
          <h2 style="color: var(--red-accent);">Error loading product</h2>
          <p style="margin-top: 0.5rem;">${err.message}</p>
          <a href="#marketplace" class="btn btn-primary" style="margin-top: 1.5rem;">Back to Marketplace</a>
        </div>
      `;
    }
  },

  // ----------------------------------------------------
  // 4. Student Services Page
  // ----------------------------------------------------
  renderServicesPage(container) {
    container.innerHTML = `
      <div class="container" style="padding-top: 2rem; padding-bottom: 4rem;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h1 style="font-size: 2rem; font-weight: 800;">Student Services & Freelance</h1>
            <p style="color: var(--secondary-text);">Academic mentorship, programming help, slide design, resume building, and photography</p>
          </div>
          <button class="btn btn-primary" onclick="App.openServiceModal()">
            <i class="fa-solid fa-plus"></i> Offer a Service
          </button>
        </div>

        <!-- Academic Integrity Notice -->
        <div style="background: var(--primary-blue-light); border: 1px solid rgba(37, 99, 235, 0.2); border-radius: var(--radius-md); padding: 1rem 1.25rem; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 1rem;">
          <i class="fa-solid fa-graduation-cap" style="font-size: 1.5rem; color: var(--primary-blue);"></i>
          <div style="font-size: 0.875rem; color: #1e40af;">
            <strong>Academic Integrity Commitment:</strong> Services listed on Campus Kart focus strictly on tutoring, code mentorship, project guidance, and skill sharing. Dishonest submissions or exam impersonation are strictly prohibited.
          </div>
        </div>

        <!-- Filter Row -->
        <div style="background: white; padding: 1.25rem; border-radius: var(--radius-lg); border: 1px solid var(--border-color); box-shadow: var(--shadow-sm); margin-bottom: 1.5rem; display: flex; gap: 1rem; flex-wrap: wrap;">
          <div class="search-input-group" style="flex: 2; background: var(--light-bg); border-radius: var(--radius-md); padding: 0.6rem 0.8rem;">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input type="text" id="services-search-input" class="search-input" placeholder="Search services (e.g., Python guidance, PPT design, portrait photography)..." oninput="App.loadServicesList()" />
          </div>

          <select id="services-category-select" class="form-control" style="flex: 1;" onchange="App.loadServicesList()">
            <option value="all">All Service Categories</option>
            <option value="Project guidance and development assistance">Project Guidance & Mentorship</option>
            <option value="Programming and coding help">Programming & Coding Help</option>
            <option value="Website development">Website Development</option>
            <option value="Graphic design">Graphic Design</option>
            <option value="Video editing">Video Editing</option>
            <option value="Assignment tutoring and academic assistance">Assignment Tutoring & Assistance</option>
            <option value="Presentation and PPT design">Presentation & PPT Design</option>
            <option value="Resume and portfolio creation">Resume & Portfolio Creation</option>
            <option value="Photography">Photography</option>
            <option value="Other student services">Other Services</option>
          </select>

          <select id="services-sort-select" class="form-control" style="flex: 1;" onchange="App.loadServicesList()">
            <option value="newest">Newest First</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>

        <div id="services-grid-container" class="services-grid">
          <div style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
            <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary-blue);"></i>
          </div>
        </div>
      </div>
    `;

    this.loadServicesList();
  },

  async loadServicesList() {
    const grid = document.getElementById('services-grid-container');
    if (!grid) return;

    const search = document.getElementById('services-search-input')?.value.trim() || '';
    const category = document.getElementById('services-category-select')?.value || 'all';
    const sort = document.getElementById('services-sort-select')?.value || 'newest';

    try {
      const res = await API.getServices({ search, category, sort_by: sort });
      const services = res.services || [];

      if (services.length === 0) {
        grid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 4rem; background: white; border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
            <i class="fa-solid fa-laptop-code" style="font-size: 3rem; color: #cbd5e1; margin-bottom: 1rem;"></i>
            <h3>No services found</h3>
            <p style="color: var(--secondary-text); margin-top: 0.25rem;">Have skills in coding, design, or tutoring? Be the first to offer your services.</p>
            <button class="btn btn-primary" style="margin-top: 1rem;" onclick="App.openServiceModal()">Offer a Service</button>
          </div>
        `;
        return;
      }

      grid.innerHTML = services.map(s => this.renderServiceCardHtml(s)).join('');
    } catch (err) {
      grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: var(--red-accent);">Error loading services: ${err.message}</div>`;
    }
  },

  renderServiceCardHtml(s) {
    return `
      <div class="service-card">
        <div class="service-img-wrap">
          <img src="${s.image_url || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80'}" alt="${escapeHtml(s.title)}" />
          <span class="badge badge-sale" style="position: absolute; top: 12px; left: 12px; font-size: 0.7rem; background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(4px);">
            <i class="fa-regular fa-clock"></i> ${escapeHtml(s.delivery_time)}
          </span>
          <button class="save-btn ${s.is_saved ? 'saved' : ''}" style="position: absolute; top: 10px; right: 10px;" onclick="App.handleToggleSaveService(${s.id})">
            <i class="fa-${s.is_saved ? 'solid' : 'regular'} fa-heart"></i>
          </button>
        </div>

        <div class="service-card-body">
          <div class="product-category">${escapeHtml(s.category)}</div>
          <h3 class="product-title" style="margin-bottom: 0.5rem;">${escapeHtml(s.title)}</h3>
          <p style="font-size: 0.85rem; color: var(--secondary-text); line-height: 1.5; margin-bottom: 1rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
            ${escapeHtml(s.description)}
          </p>

          <div style="display: flex; align-items: baseline; gap: 0.3rem; margin-bottom: 1rem;">
            <span style="font-size: 0.8rem; color: var(--secondary-text);">Starting at</span>
            <span style="font-size: 1.35rem; font-weight: 800; color: var(--dark-text);">₹${Number(s.price).toLocaleString()}</span>
          </div>

          <div class="product-seller-footer">
            <div class="seller-info" onclick="App.navigateTo('profile', ${s.user_id})" style="cursor: pointer;">
              <img src="${s.provider_photo || 'https://api.dicebear.com/7.x/initials/svg?seed=' + encodeURIComponent(s.provider_name)}" class="seller-avatar" alt="Avatar" />
              <div>
                <div class="seller-name">${escapeHtml(s.provider_name)}</div>
                <div style="font-size: 0.72rem; color: #fbbf24;"><i class="fa-solid fa-star"></i> ${s.provider_rating} (${s.provider_review_count})</div>
              </div>
            </div>

            <button class="btn btn-primary btn-sm" onclick="App.handleStartChatWithUser(${s.user_id}, null, ${s.id}, 'Hi ${escapeJsString(s.provider_name.split(' ')[0])}! I saw your service listing: ${escapeJsString(s.title)}. I would like to discuss working together.')">
              <i class="fa-regular fa-comment-dots"></i> Hire
            </button>
          </div>
        </div>
      </div>
    `;
  },

  // ----------------------------------------------------
  // 5. Notes Marketplace Page
  // ----------------------------------------------------
  renderNotesPage(container) {
    container.innerHTML = `
      <div class="container" style="padding-top: 2rem; padding-bottom: 4rem;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h1 style="font-size: 2rem; font-weight: 800;">CU Notes & Study Materials</h1>
            <p style="color: var(--secondary-text);">Hand-written notes, exam revision sheets, lab manuals, and solved papers by top CU scholars</p>
          </div>
          <button class="btn btn-primary" onclick="App.openUploadNotesModal()">
            <i class="fa-solid fa-upload"></i> Upload & Sell Notes
          </button>
        </div>

        <!-- Filter Row -->
        <div style="background: white; padding: 1.25rem; border-radius: var(--radius-lg); border: 1px solid var(--border-color); box-shadow: var(--shadow-sm); margin-bottom: 1.5rem; display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 0.75rem;">
          <div class="search-input-group" style="background: var(--light-bg); border-radius: var(--radius-md); padding: 0.6rem 0.8rem;">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input type="text" id="notes-search-input" class="search-input" placeholder="Search subject (e.g. Data Structures, OS, Chemistry)..." oninput="App.loadNotesList()" />
          </div>

          <select id="notes-course-select" class="form-control" onchange="App.loadNotesList()">
            <option value="all">All Courses</option>
            <option value="B.Tech CSE">B.Tech CSE</option>
            <option value="All Engineering First Year">Engineering 1st Year</option>
            <option value="BBA">BBA</option>
            <option value="MBA / BBA">MBA / Management</option>
            <option value="B.Sc Biotechnology">Biotechnology</option>
          </select>

          <select id="notes-semester-select" class="form-control" onchange="App.loadNotesList()">
            <option value="all">All Semesters</option>
            <option value="Semester 1">Semester 1</option>
            <option value="Semester 2">Semester 2</option>
            <option value="Semester 3">Semester 3</option>
            <option value="Semester 4">Semester 4</option>
            <option value="Semester 5">Semester 5</option>
            <option value="Semester 6">Semester 6</option>
          </select>

          <select id="notes-sort-select" class="form-control" onchange="App.loadNotesList()">
            <option value="newest">Newest First</option>
            <option value="price_asc">Price: Free / Low</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>

        <div id="notes-grid-container" class="notes-grid">
          <div style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
            <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary-blue);"></i>
          </div>
        </div>
      </div>
    `;

    this.loadNotesList();
  },

  async loadNotesList() {
    const grid = document.getElementById('notes-grid-container');
    if (!grid) return;

    const search = document.getElementById('notes-search-input')?.value.trim() || '';
    const course = document.getElementById('notes-course-select')?.value || 'all';
    const semester = document.getElementById('notes-semester-select')?.value || 'all';
    const sort = document.getElementById('notes-sort-select')?.value || 'newest';

    try {
      const res = await API.getNotes({ search, course, semester, sort_by: sort });
      const notes = res.notes || [];

      if (notes.length === 0) {
        grid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 4rem; background: white; border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
            <i class="fa-solid fa-book-open" style="font-size: 3rem; color: #cbd5e1; margin-bottom: 1rem;"></i>
            <h3>No study notes found</h3>
            <p style="color: var(--secondary-text); margin-top: 0.25rem;">Have quality exam notes? Upload and monetize your hard work!</p>
            <button class="btn btn-primary" style="margin-top: 1rem;" onclick="App.openUploadNotesModal()">Upload Study Notes</button>
          </div>
        `;
        return;
      }

      grid.innerHTML = notes.map(n => this.renderNoteCardHtml(n)).join('');
    } catch (err) {
      grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: var(--red-accent);">Error loading notes: ${err.message}</div>`;
    }
  },

  renderNoteCardHtml(n) {
    const isFree = n.price === 0;
    const currentUser = API.getCurrentUser();
    const isOwner = currentUser && currentUser.id === n.user_id;

    return `
      <div class="note-card">
        <div class="note-badge-row">
          <span class="note-subject-pill">${escapeHtml(n.subject)}</span>
          <span style="font-size: 0.75rem; font-weight: 600; color: var(--secondary-text);">
            <i class="fa-regular fa-file-pdf" style="color: var(--red-accent);"></i> ${n.total_pages} Pages
          </span>
        </div>

        <h3 style="font-size: 1.05rem; font-weight: 700; line-height: 1.4; margin-bottom: 0.5rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
          ${escapeHtml(n.title)}
        </h3>

        <div style="font-size: 0.8rem; color: var(--secondary-text); margin-bottom: 0.75rem;">
          <span>${escapeHtml(n.course)}</span> • <span>${escapeHtml(n.semester)}</span>
        </div>

        <p style="font-size: 0.825rem; color: var(--secondary-text); line-height: 1.5; margin-bottom: 1.25rem; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
          ${escapeHtml(n.description)}
        </p>

        <div style="margin-top: auto; padding-top: 0.8rem; border-top: 1px solid var(--border-light); display: flex; align-items: center; justify-content: space-between;">
          <div>
            <div style="font-size: 0.75rem; color: var(--secondary-text);">Price</div>
            <div style="font-size: 1.25rem; font-weight: 800; color: ${isFree ? 'var(--green-accent)' : 'var(--dark-text)'};">
              ${isFree ? 'FREE' : `₹${Number(n.price).toLocaleString()}`}
            </div>
          </div>

          <div style="display: flex; gap: 0.4rem;">
            ${n.is_purchased || isOwner || isFree ? `
              <button class="btn btn-success btn-sm" onclick="App.handleDownloadNotes(${n.id}, '${escapeJsString(n.title)}')">
                <i class="fa-solid fa-download"></i> Download
              </button>
            ` : `
              <button class="btn btn-primary btn-sm" onclick="App.handlePurchaseNote(${n.id}, ${n.price})">
                <i class="fa-solid fa-lock-open"></i> Unlock (₹${n.price})
              </button>
            `}
          </div>
        </div>
      </div>
    `;
  },

  // ----------------------------------------------------
  // 6. Real-Time Chat Page
  // ----------------------------------------------------
  renderChatPage(container, targetConversationId = null) {
    const user = API.getCurrentUser();
    if (!user) {
      container.innerHTML = `
        <div class="container" style="padding: 4rem 1.5rem; text-align: center;">
          <i class="fa-regular fa-comments" style="font-size: 3rem; color: var(--primary-blue); margin-bottom: 1rem;"></i>
          <h2>Please Log In to Access Campus Messages</h2>
          <p style="color: var(--secondary-text); margin-top: 0.5rem; max-width: 450px; margin-left: auto; margin-right: auto;">
            Connect with buyers and sellers privately to negotiate prices, ask questions, and arrange campus meetups.
          </p>
          <div style="margin-top: 1.5rem; display: flex; gap: 1rem; justify-content: center;">
            <a href="#login" class="btn btn-primary">Log In</a>
            <a href="#signup" class="btn btn-secondary">Create Account</a>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="container">
        <div class="chat-container-layout">
          
          <!-- Left Sidebar -->
          <div class="chat-sidebar">
            <div class="chat-sidebar-header">
              <h2 style="font-size: 1.25rem; font-weight: 700;">Messages</h2>
              <div style="font-size: 0.8rem; color: var(--secondary-text); margin-top: 2px;">
                <i class="fa-solid fa-circle" style="color: var(--green-accent); font-size: 0.5rem;"></i> Real-time campus network
              </div>
            </div>
            
            <div id="chat-conversations-list" class="conversations-list">
              <div style="padding: 2rem; text-align: center; color: var(--secondary-text);">
                <i class="fa-solid fa-spinner fa-spin"></i> Loading...
              </div>
            </div>
          </div>

          <!-- Right Active Chat Pane -->
          <div class="chat-main-pane">
            <div id="chat-active-header" class="chat-header" style="display: none;">
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <img id="chat-header-avatar" src="" style="width: 42px; height: 42px; border-radius: var(--radius-full); object-fit: cover;" alt="Avatar" />
                <div>
                  <h3 id="chat-header-name" style="font-size: 1rem; font-weight: 700;"></h3>
                  <div style="font-size: 0.75rem; color: var(--green-accent); font-weight: 600;">
                    <i class="fa-solid fa-circle" style="font-size: 0.45rem;"></i> Chandigarh University Student
                  </div>
                </div>
              </div>
            </div>

            <div id="chat-messages-container" class="chat-messages-scroll">
              <div style="margin: auto; text-align: center; color: var(--secondary-text);">
                <i class="fa-regular fa-comments" style="font-size: 3rem; margin-bottom: 1rem; color: #cbd5e1;"></i>
                <h3>Select a conversation to start chatting</h3>
              </div>
            </div>

            <form class="chat-input-bar" onsubmit="Chat.handleSendMessage(event)">
              <input type="text" id="chat-input-text" class="chat-input-field" placeholder="Type a message (prices, meetup location, inspection details)..." autocomplete="off" />
              <button type="submit" class="btn btn-primary btn-icon">
                <i class="fa-solid fa-paper-plane"></i>
              </button>
            </form>
          </div>

        </div>
      </div>
    `;

    Chat.loadConversations(true);

    if (targetConversationId) {
      setTimeout(() => {
        Chat.openConversation(targetConversationId, 'Campus Peer', 'https://api.dicebear.com/7.x/initials/svg?seed=CU');
      }, 200);
    }
  },

  async handleStartChatWithUser(recipientId, productId = null, serviceId = null, initialMsg = null) {
    const user = API.getCurrentUser();
    if (!user) {
      this.showToast('Please log in to chat with the student seller', 'error');
      this.navigateTo('login');
      return;
    }

    if (user.id === recipientId) {
      this.showToast("This is your own listing!", "info");
      return;
    }

    try {
      const res = await API.startConversation({
        recipient_id: recipientId,
        product_id: productId,
        service_id: serviceId,
        initial_message: initialMsg
      });

      this.navigateTo('chat', res.conversation_id);
      setTimeout(() => {
        Chat.openConversation(res.conversation_id, 'Student Peer', 'https://api.dicebear.com/7.x/initials/svg?seed=' + recipientId);
      }, 100);
    } catch (err) {
      this.showToast('Could not start conversation: ' + err.message, 'error');
    }
  },

  // ----------------------------------------------------
  // 7. User Profile Page
  // ----------------------------------------------------
  async renderProfilePage(container, userId) {
    const currentUser = API.getCurrentUser();
    const targetId = userId || (currentUser ? currentUser.id : null);

    if (!targetId) {
      this.navigateTo('login');
      return;
    }

    container.innerHTML = `
      <div class="container" style="padding-top: 3rem; padding-bottom: 4rem; text-align: center;">
        <i class="fa-solid fa-spinner fa-spin" style="font-size: 2.5rem; color: var(--primary-blue);"></i>
      </div>
    `;

    try {
      const res = await API.getUserProfile(targetId);
      const u = res.user;
      const isSelf = currentUser && currentUser.id === u.id;

      container.innerHTML = `
        <div class="container" style="padding-top: 2rem; padding-bottom: 4rem;">
          
          <!-- Profile Card Header -->
          <div style="background: white; border-radius: var(--radius-xl); border: 1px solid var(--border-color); box-shadow: var(--shadow-sm); overflow: hidden; margin-bottom: 2rem;">
            <div style="height: 140px; background: linear-gradient(135deg, var(--primary-blue), #1e40af); position: relative;">
              <span style="position: absolute; bottom: 12px; right: 20px; color: rgba(255, 255, 255, 0.75); font-size: 0.8rem; font-weight: 600;">
                <i class="fa-solid fa-building-columns"></i> ${escapeHtml(u.university || 'Chandigarh University')}
              </span>
            </div>

            <div style="padding: 0 2rem 2rem; position: relative;">
              <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: -50px; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
                <img src="${u.profile_photo || 'https://api.dicebear.com/7.x/initials/svg?seed=' + encodeURIComponent(u.full_name)}" style="width: 100px; height: 100px; border-radius: var(--radius-full); object-fit: cover; border: 4px solid white; box-shadow: var(--shadow-md);" alt="${escapeHtml(u.full_name)}" />
                
                <div>
                  ${isSelf ? `
                    <button class="btn btn-secondary btn-sm" onclick="App.openEditProfileModal()">
                      <i class="fa-solid fa-user-pen"></i> Edit Profile
                    </button>
                  ` : `
                    <button class="btn btn-primary btn-sm" onclick="App.handleStartChatWithUser(${u.id}, null, null, 'Hi ${escapeJsString(u.full_name.split(' ')[0])}!')">
                      <i class="fa-regular fa-comment-dots"></i> Message
                    </button>
                  `}
                </div>
              </div>

              <h1 style="font-size: 1.75rem; font-weight: 800;">${escapeHtml(u.full_name)}</h1>
              <p style="color: var(--primary-blue); font-weight: 600; font-size: 0.95rem; margin-top: 0.2rem;">
                ${escapeHtml(u.course || 'CU Student')} ${u.semester ? `• ${escapeHtml(u.semester)}` : ''}
              </p>
              <p style="color: var(--secondary-text); font-size: 0.9rem; margin-top: 0.5rem; max-width: 700px; line-height: 1.6;">
                ${escapeHtml(u.bio || 'Proud student member of Campus Kart Chandigarh University community.')}
              </p>

              <!-- Stats overview bar -->
              <div style="display: flex; gap: 2.5rem; margin-top: 1.5rem; border-top: 1px solid var(--border-light); padding-top: 1.25rem;">
                <div>
                  <div style="font-size: 1.25rem; font-weight: 800; color: var(--dark-text);">${res.products.length}</div>
                  <div style="font-size: 0.8rem; color: var(--secondary-text);">Products Listed</div>
                </div>
                <div>
                  <div style="font-size: 1.25rem; font-weight: 800; color: var(--dark-text);">${res.services.length}</div>
                  <div style="font-size: 0.8rem; color: var(--secondary-text);">Services</div>
                </div>
                <div>
                  <div style="font-size: 1.25rem; font-weight: 800; color: var(--dark-text);">${res.notes.length}</div>
                  <div style="font-size: 0.8rem; color: var(--secondary-text);">Notes Uploaded</div>
                </div>
                <div>
                  <div style="font-size: 1.25rem; font-weight: 800; color: #fbbf24;"><i class="fa-solid fa-star"></i> ${res.rating}</div>
                  <div style="font-size: 0.8rem; color: var(--secondary-text);">${res.review_count} Reviews</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Profile Tabs -->
          <div class="dashboard-tabs">
            <button class="dash-tab active" onclick="App.switchProfileTab('products', this)">Products (${res.products.length})</button>
            <button class="dash-tab" onclick="App.switchProfileTab('services', this)">Services (${res.services.length})</button>
            <button class="dash-tab" onclick="App.switchProfileTab('notes', this)">Notes (${res.notes.length})</button>
            <button class="dash-tab" onclick="App.switchProfileTab('reviews', this)">Student Reviews (${res.reviews.length})</button>
          </div>

          <!-- Tab Contents -->
          <div id="profile-tab-products">
            <div class="products-grid">
              ${res.products.length > 0 ? res.products.map(p => this.renderProductCardHtml(p)).join('') : `<p style="color: var(--secondary-text); padding: 2rem;">No products listed yet.</p>`}
            </div>
          </div>

          <div id="profile-tab-services" style="display: none;">
            <div class="services-grid">
              ${res.services.length > 0 ? res.services.map(s => this.renderServiceCardHtml(s)).join('') : `<p style="color: var(--secondary-text); padding: 2rem;">No services listed yet.</p>`}
            </div>
          </div>

          <div id="profile-tab-notes" style="display: none;">
            <div class="notes-grid">
              ${res.notes.length > 0 ? res.notes.map(n => this.renderNoteCardHtml(n)).join('') : `<p style="color: var(--secondary-text); padding: 2rem;">No study notes uploaded yet.</p>`}
            </div>
          </div>

          <div id="profile-tab-reviews" style="display: none;">
            <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 700px;">
              ${res.reviews.length > 0 ? res.reviews.map(r => `
                <div style="background: white; padding: 1.25rem; border-radius: var(--radius-lg); border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                    <div style="display: flex; align-items: center; gap: 0.6rem;">
                      <img src="${r.reviewer_photo || 'https://api.dicebear.com/7.x/initials/svg?seed=' + encodeURIComponent(r.reviewer_name)}" style="width: 32px; height: 32px; border-radius: var(--radius-full);" alt="Avatar" />
                      <span style="font-weight: 700; font-size: 0.9rem;">${escapeHtml(r.reviewer_name)}</span>
                    </div>
                    <div style="color: #fbbf24; font-size: 0.85rem;">
                      ${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}
                    </div>
                  </div>
                  <p style="font-size: 0.875rem; color: var(--dark-text); line-height: 1.5;">${escapeHtml(r.comment)}</p>
                  <span style="font-size: 0.75rem; color: var(--secondary-text); margin-top: 0.4rem; display: block;">${formatDate(r.created_at)}</span>
                </div>
              `).join('') : `<p style="color: var(--secondary-text); padding: 2rem;">No reviews yet.</p>`}
            </div>
          </div>

        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div class="container" style="padding: 4rem; text-align: center; color: var(--red-accent);">Error loading profile: ${err.message}</div>`;
    }
  },

  switchProfileTab(tabName, btn) {
    document.querySelectorAll('.dash-tab').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    ['products', 'services', 'notes', 'reviews'].forEach(t => {
      const el = document.getElementById(`profile-tab-${t}`);
      if (el) el.style.display = t === tabName ? 'block' : 'none';
    });
  },

  // ----------------------------------------------------
  // 8. User Dashboard Page
  // ----------------------------------------------------
  async renderDashboardPage(container) {
    const user = API.getCurrentUser();
    if (!user) {
      this.navigateTo('login');
      return;
    }

    container.innerHTML = `
      <div class="container dashboard-layout">
        <div class="dashboard-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h1 style="font-size: 2rem; font-weight: 800;">Student Dashboard</h1>
            <p style="color: var(--secondary-text);">Welcome back, ${escapeHtml(user.full_name)}! Manage your campus listings, services, and notes.</p>
          </div>
          <div style="display: flex; gap: 0.75rem;">
            <button class="btn btn-primary btn-sm" onclick="App.openSellModal()">
              <i class="fa-solid fa-plus"></i> Post Product
            </button>
            <button class="btn btn-secondary btn-sm" onclick="App.openServiceModal()">
              <i class="fa-solid fa-briefcase"></i> Add Service
            </button>
            <button class="btn btn-secondary btn-sm" onclick="App.openUploadNotesModal()">
              <i class="fa-solid fa-file-pdf"></i> Upload Notes
            </button>
          </div>
        </div>

        <!-- Stats Overview Cards -->
        <div id="dash-stats-container" class="stats-grid">
          <div class="stat-box">
            <div class="stat-box-icon icon-blue"><i class="fa-solid fa-bag-shopping"></i></div>
            <div>
              <div id="stat-products" style="font-size: 1.4rem; font-weight: 800;">-</div>
              <div style="font-size: 0.8rem; color: var(--secondary-text);">My Products</div>
            </div>
          </div>
          <div class="stat-box">
            <div class="stat-box-icon icon-amber"><i class="fa-solid fa-key"></i></div>
            <div>
              <div id="stat-rentals" style="font-size: 1.4rem; font-weight: 800;">-</div>
              <div style="font-size: 0.8rem; color: var(--secondary-text);">Active Rentals</div>
            </div>
          </div>
          <div class="stat-box">
            <div class="stat-box-icon icon-purple"><i class="fa-solid fa-laptop-code"></i></div>
            <div>
              <div id="stat-services" style="font-size: 1.4rem; font-weight: 800;">-</div>
              <div style="font-size: 0.8rem; color: var(--secondary-text);">My Services</div>
            </div>
          </div>
          <div class="stat-box">
            <div class="stat-box-icon icon-green"><i class="fa-solid fa-book"></i></div>
            <div>
              <div id="stat-notes" style="font-size: 1.4rem; font-weight: 800;">-</div>
              <div style="font-size: 0.8rem; color: var(--secondary-text);">My Notes</div>
            </div>
          </div>
          <div class="stat-box">
            <div class="stat-box-icon" style="background: #fef2f2; color: var(--red-accent);"><i class="fa-regular fa-heart"></i></div>
            <div>
              <div id="stat-saved" style="font-size: 1.4rem; font-weight: 800;">-</div>
              <div style="font-size: 0.8rem; color: var(--secondary-text);">Saved Items</div>
            </div>
          </div>
        </div>

        <!-- Dashboard Navigation Tabs -->
        <div class="dashboard-tabs">
          <button class="dash-tab active" onclick="App.switchDashTab('my-listings', this)">My Products & Rentals</button>
          <button class="dash-tab" onclick="App.switchDashTab('my-services', this)">My Services</button>
          <button class="dash-tab" onclick="App.switchDashTab('my-notes', this)">My Uploaded Notes</button>
          <button class="dash-tab" onclick="App.switchDashTab('purchased-notes', this)">Purchased Notes</button>
          <button class="dash-tab" onclick="App.switchDashTab('saved-items', this)">Saved Items</button>
        </div>

        <!-- Section Panes -->
        <div id="dash-pane-my-listings">
          <div id="dash-listings-container" class="products-grid">
            <div style="grid-column: 1 / -1; text-align: center; padding: 2rem;">
              <i class="fa-solid fa-spinner fa-spin"></i> Loading...
            </div>
          </div>
        </div>

        <div id="dash-pane-my-services" style="display: none;">
          <div id="dash-services-container" class="services-grid"></div>
        </div>

        <div id="dash-pane-my-notes" style="display: none;">
          <div id="dash-notes-container" class="notes-grid"></div>
        </div>

        <div id="dash-pane-purchased-notes" style="display: none;">
          <div id="dash-purchased-notes-container" class="notes-grid"></div>
        </div>

        <div id="dash-pane-saved-items" style="display: none;">
          <div id="dash-saved-container" class="products-grid"></div>
        </div>

      </div>
    `;

    this.loadDashboardData();
  },

  async loadDashboardData() {
    try {
      const summary = await API.getDashboardSummary();
      const counts = summary.counts || {};
      document.getElementById('stat-products').textContent = counts.products || 0;
      document.getElementById('stat-rentals').textContent = counts.rentals || 0;
      document.getElementById('stat-services').textContent = counts.services || 0;
      document.getElementById('stat-notes').textContent = counts.notes || 0;
      document.getElementById('stat-saved').textContent = counts.saved || 0;

      // Load initial tab (my-listings)
      this.loadDashListings();
    } catch (err) {
      console.error('Error loading dashboard summary:', err);
    }
  },

  switchDashTab(paneName, btn) {
    document.querySelectorAll('.dash-tab').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    ['my-listings', 'my-services', 'my-notes', 'purchased-notes', 'saved-items'].forEach(p => {
      const el = document.getElementById(`dash-pane-${p}`);
      if (el) el.style.display = p === paneName ? 'block' : 'none';
    });

    if (paneName === 'my-listings') this.loadDashListings();
    if (paneName === 'my-services') this.loadDashServices();
    if (paneName === 'my-notes') this.loadDashNotes();
    if (paneName === 'purchased-notes') this.loadDashPurchasedNotes();
    if (paneName === 'saved-items') this.loadDashSavedItems();
  },

  async loadDashListings() {
    const el = document.getElementById('dash-listings-container');
    if (!el) return;

    try {
      const res = await API.getMyListings();
      const products = res.products || [];

      if (products.length === 0) {
        el.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; background: white; border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
            <i class="fa-solid fa-box-open" style="font-size: 2.5rem; color: #cbd5e1; margin-bottom: 0.75rem;"></i>
            <h3>No products listed yet</h3>
            <p style="color: var(--secondary-text); margin-top: 0.25rem;">Have textbooks, gadgets, bicycles or room gear? Post an item now.</p>
            <button class="btn btn-primary" style="margin-top: 1rem;" onclick="App.openSellModal()">Post a Listing</button>
          </div>
        `;
        return;
      }

      el.innerHTML = products.map(p => `
        <div class="product-card">
          <div class="card-image-wrap" onclick="App.navigateTo('product', ${p.id})">
            <img src="${p.primary_image || 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=800&q=80'}" alt="${escapeHtml(p.title)}" />
            <div class="card-badges">
              <span class="badge ${p.status === 'available' ? 'badge-sale' : 'badge-condition'}">${p.status.toUpperCase()}</span>
            </div>
          </div>
          <div class="product-card-body">
            <div class="product-category">${escapeHtml(p.category)}</div>
            <h3 class="product-title" onclick="App.navigateTo('product', ${p.id})">${escapeHtml(p.title)}</h3>
            <div class="product-price-row">
              <span class="product-price">₹${Number(p.price).toLocaleString()}</span>
            </div>
            
            <div style="margin-top: auto; padding-top: 0.8rem; border-top: 1px solid var(--border-light); display: flex; gap: 0.5rem; flex-wrap: wrap;">
              <select class="form-control" style="flex: 1; padding: 0.4rem; font-size: 0.8rem;" onchange="App.handleStatusChange(${p.id}, this.value)">
                <option value="available" ${p.status === 'available' ? 'selected' : ''}>Available</option>
                <option value="sold" ${p.status === 'sold' ? 'selected' : ''}>Mark as Sold</option>
                <option value="rented" ${p.status === 'rented' ? 'selected' : ''}>Mark as Rented</option>
                <option value="unavailable" ${p.status === 'unavailable' ? 'selected' : ''}>Unavailable</option>
              </select>
              <button class="btn btn-sm btn-secondary" onclick="App.openEditProductModal(${p.id})"><i class="fa-solid fa-pen"></i></button>
              <button class="btn btn-sm" style="color: var(--red-accent);" onclick="App.handleDeleteProduct(${p.id})"><i class="fa-solid fa-trash"></i></button>
            </div>
          </div>
        </div>
      `).join('');
    } catch (err) {
      el.innerHTML = `<div style="grid-column: 1 / -1; color: var(--red-accent);">Error loading listings</div>`;
    }
  },

  async handleStatusChange(productId, newStatus) {
    try {
      await API.updateProductStatus(productId, newStatus);
      this.showToast(`Listing status updated to ${newStatus}`, 'success');
      this.loadDashListings();
    } catch (err) {
      this.showToast('Failed to update status: ' + err.message, 'error');
    }
  },

  async loadDashServices() {
    const el = document.getElementById('dash-services-container');
    if (!el) return;

    try {
      const res = await API.getMyServices();
      const services = res.services || [];
      if (services.length === 0) {
        el.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; background: white; border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
            <p style="color: var(--secondary-text);">You haven't listed any services yet.</p>
            <button class="btn btn-primary" style="margin-top: 1rem;" onclick="App.openServiceModal()">Offer a Service</button>
          </div>
        `;
        return;
      }
      el.innerHTML = services.map(s => `
        <div class="service-card">
          <div class="service-img-wrap"><img src="${s.image_url}" alt="${escapeHtml(s.title)}" /></div>
          <div class="service-card-body">
            <div class="product-category">${escapeHtml(s.category)}</div>
            <h3 class="product-title">${escapeHtml(s.title)}</h3>
            <div style="font-weight: 800; font-size: 1.2rem; margin-bottom: 0.75rem;">₹${Number(s.price).toLocaleString()}</div>
            <button class="btn btn-sm btn-secondary" style="color: var(--red-accent);" onclick="App.handleDeleteService(${s.id})">
              <i class="fa-solid fa-trash"></i> Delete Service
            </button>
          </div>
        </div>
      `).join('');
    } catch (err) {
      el.innerHTML = `<div style="grid-column: 1 / -1; color: var(--red-accent);">Error loading services</div>`;
    }
  },

  async loadDashNotes() {
    const el = document.getElementById('dash-notes-container');
    if (!el) return;

    try {
      const res = await API.getMyNotes();
      const notes = res.notes || [];
      if (notes.length === 0) {
        el.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; background: white; border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
            <p style="color: var(--secondary-text);">No uploaded notes yet.</p>
            <button class="btn btn-primary" style="margin-top: 1rem;" onclick="App.openUploadNotesModal()">Upload Notes</button>
          </div>
        `;
        return;
      }
      el.innerHTML = notes.map(n => `
        <div class="note-card">
          <div class="note-badge-row">
            <span class="note-subject-pill">${escapeHtml(n.subject)}</span>
            <span style="font-size: 0.75rem; font-weight: 700; color: var(--green-accent);">Earnings: ₹${n.total_earnings}</span>
          </div>
          <h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 0.5rem;">${escapeHtml(n.title)}</h3>
          <p style="font-size: 0.8rem; color: var(--secondary-text); margin-bottom: 1rem;">
            ${n.purchases_count} student downloads
          </p>
          <div style="margin-top: auto; display: flex; gap: 0.5rem;">
            <button class="btn btn-sm btn-secondary" style="color: var(--red-accent);" onclick="App.handleDeleteNote(${n.id})">
              <i class="fa-solid fa-trash"></i> Delete
            </button>
          </div>
        </div>
      `).join('');
    } catch (err) {
      el.innerHTML = `<div style="grid-column: 1 / -1; color: var(--red-accent);">Error loading notes</div>`;
    }
  },

  async loadDashPurchasedNotes() {
    const el = document.getElementById('dash-purchased-notes-container');
    if (!el) return;

    try {
      const res = await API.getPurchasedNotes();
      const notes = res.purchased_notes || [];
      if (notes.length === 0) {
        el.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; background: white; border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
            <p style="color: var(--secondary-text);">You haven't unlocked any notes yet.</p>
            <button class="btn btn-primary" style="margin-top: 1rem;" onclick="App.navigateTo('notes')">Explore Notes Marketplace</button>
          </div>
        `;
        return;
      }

      el.innerHTML = notes.map(n => `
        <div class="note-card">
          <div class="note-badge-row">
            <span class="note-subject-pill">${escapeHtml(n.subject)}</span>
            <span style="font-size: 0.75rem; color: var(--green-accent); font-weight: 700;">Unlocked</span>
          </div>
          <h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 0.5rem;">${escapeHtml(n.title)}</h3>
          <div style="font-size: 0.75rem; color: var(--secondary-text); margin-bottom: 1rem;">Tx ID: ${escapeHtml(n.transaction_id)}</div>
          <button class="btn btn-success btn-sm" style="margin-top: auto;" onclick="App.handleDownloadNotes(${n.id}, '${escapeJsString(n.title)}')">
            <i class="fa-solid fa-download"></i> Download Full PDF
          </button>
        </div>
      `).join('');
    } catch (err) {
      el.innerHTML = `<div style="grid-column: 1 / -1; color: var(--red-accent);">Error loading unlocked notes</div>`;
    }
  },

  async loadDashSavedItems() {
    const el = document.getElementById('dash-saved-container');
    if (!el) return;

    try {
      const res = await API.getSavedItems();
      const prods = res.saved_products || [];
      if (prods.length === 0) {
        el.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; background: white; border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
            <p style="color: var(--secondary-text);">No saved items yet.</p>
            <a href="#marketplace" class="btn btn-primary" style="margin-top: 1rem;">Browse Marketplace</a>
          </div>
        `;
        return;
      }
      el.innerHTML = prods.map(p => this.renderProductCardHtml(p)).join('');
    } catch (err) {
      el.innerHTML = `<div style="grid-column: 1 / -1; color: var(--red-accent);">Error loading saved items</div>`;
    }
  },

  // ----------------------------------------------------
  // 9. Login Page
  // ----------------------------------------------------
  renderLoginPage(container) {
    container.innerHTML = `
      <div class="container" style="padding: 3rem 1.25rem 5rem; max-width: 480px;">
        <div style="background: white; border-radius: var(--radius-xl); border: 1px solid var(--border-color); box-shadow: var(--shadow-lg); padding: 2.25rem;">
          
          <div style="text-align: center; margin-bottom: 2rem;">
            <div class="brand-icon" style="margin: 0 auto 1rem; width: 50px; height: 50px; font-size: 1.5rem;">
              <i class="fa-solid fa-graduation-cap"></i>
            </div>
            <h1 style="font-size: 1.75rem; font-weight: 800;">Welcome Back</h1>
            <p style="color: var(--secondary-text); font-size: 0.9rem; margin-top: 0.25rem;">Log in with your Chandigarh University credentials</p>
          </div>

          <form id="login-form" onsubmit="App.handleLoginForm(event)">
            <div class="form-group">
              <label class="form-label">University Email</label>
              <input type="email" id="login-email" class="form-control" placeholder="e.g. yourname@cuchd.in" required />
            </div>

            <div class="form-group">
              <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.4rem;">
                <label class="form-label" style="margin-bottom: 0;">Password</label>
                <a href="javascript:void(0)" onclick="App.openForgotPasswordPrompt()" style="font-size: 0.8rem;">Forgot password?</a>
              </div>
              <input type="password" id="login-password" class="form-control" placeholder="••••••••" required />
            </div>

            <button type="submit" id="login-submit-btn" class="btn btn-primary btn-lg" style="width: 100%; margin-top: 0.5rem;">
              Sign In
            </button>
          </form>

          <!-- Quick Demo Logins for Instant Testing -->
          <div style="margin-top: 2rem; border-top: 1px solid var(--border-light); padding-top: 1.5rem;">
            <div style="font-size: 0.75rem; font-weight: 700; color: var(--secondary-text); text-transform: uppercase; letter-spacing: 0.05em; text-align: center; margin-bottom: 0.75rem;">
              Instant Demo Logins (Click to Test)
            </div>
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
              <button class="btn btn-secondary btn-sm" style="font-size: 0.825rem; text-align: left; justify-content: flex-start;" onclick="App.quickLogin('arav.sharma@cuchd.in', 'cu123456')">
                <i class="fa-solid fa-user-check" style="color: var(--primary-blue);"></i> Aarav Sharma (CS Sem 6 • Seller)
              </button>
              <button class="btn btn-secondary btn-sm" style="font-size: 0.825rem; text-align: left; justify-content: flex-start;" onclick="App.quickLogin('priya.singh@cuchd.in', 'cu123456')">
                <i class="fa-solid fa-user-check" style="color: var(--green-accent);"></i> Priya Singh (Biotech Sem 4 • Buyer)
              </button>
              <button class="btn btn-secondary btn-sm" style="font-size: 0.825rem; text-align: left; justify-content: flex-start;" onclick="App.quickLogin('ananya.kapoor@cuchd.in', 'cu123456')">
                <i class="fa-solid fa-user-check" style="color: var(--purple-accent);"></i> Ananya Kapoor (UI/UX • Service Provider)
              </button>
            </div>
          </div>

          <div style="text-align: center; margin-top: 1.5rem; font-size: 0.9rem; color: var(--secondary-text);">
            Don't have an account? <a href="#signup" style="font-weight: 600;">Sign up</a>
          </div>

        </div>
      </div>
    `;
  },

  async handleLoginForm(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-password').value;
    const btn = document.getElementById('login-submit-btn');

    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Signing in...`;

    try {
      await API.login(email, pass);
      this.renderNavUser();
      this.updateUnreadCountBadge();
      Chat.init();
      this.showToast('Welcome back to Campus Kart!', 'success');
      this.navigateTo('marketplace');
    } catch (err) {
      this.showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `Sign In`;
    }
  },

  async quickLogin(email, pass) {
    document.getElementById('login-email').value = email;
    document.getElementById('login-password').value = pass;
    document.getElementById('login-form').dispatchEvent(new Event('submit'));
  },

  openForgotPasswordPrompt() {
    const email = prompt("Enter your registered Chandigarh University email address to reset your password:");
    if (!email) return;
    const newPass = prompt("Enter your new password (min 6 characters):");
    if (!newPass) return;

    API.resetPassword(email, newPass).then(res => {
      this.showToast(res.message, 'success');
    }).catch(err => {
      this.showToast(err.message, 'error');
    });
  },

  // ----------------------------------------------------
  // 10. Sign Up Page
  // ----------------------------------------------------
  renderSignupPage(container) {
    container.innerHTML = `
      <div class="container" style="padding: 3rem 1.25rem 5rem; max-width: 540px;">
        <div style="background: white; border-radius: var(--radius-xl); border: 1px solid var(--border-color); box-shadow: var(--shadow-lg); padding: 2.25rem;">
          
          <div style="text-align: center; margin-bottom: 2rem;">
            <div class="brand-icon" style="margin: 0 auto 1rem; width: 50px; height: 50px; font-size: 1.5rem;">
              <i class="fa-solid fa-user-plus"></i>
            </div>
            <h1 style="font-size: 1.75rem; font-weight: 800;">Create CU Student Account</h1>
            <p style="color: var(--secondary-text); font-size: 0.9rem; margin-top: 0.25rem;">Join the official Chandigarh University marketplace</p>
          </div>

          <form id="signup-form" onsubmit="App.handleSignupForm(event)">
            <div class="form-group">
              <label class="form-label">Full Name *</label>
              <input type="text" id="reg-name" class="form-control" placeholder="e.g. Sahil Patel" required />
            </div>

            <div class="form-group">
              <label class="form-label">Student University Email *</label>
              <input type="email" id="reg-email" class="form-control" placeholder="e.g. 21bcs1234@cuchd.in" required />
              <div style="font-size: 0.75rem; color: var(--secondary-text); margin-top: 0.25rem;">
                <i class="fa-solid fa-circle-check" style="color: var(--green-accent);"></i> CU student domain (@cuchd.in) or valid student mail recommended.
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">University</label>
                <select id="reg-university" class="form-control">
                  <option value="Chandigarh University" selected>Chandigarh University (Gharuan)</option>
                  <option value="Panjab University">Panjab University (Chandigarh)</option>
                  <option value="Chitkara University">Chitkara University</option>
                  <option value="CGC Landran">CGC Landran / Jhanjeri</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Course / Degree</label>
                <input type="text" id="reg-course" class="form-control" placeholder="e.g. B.Tech CSE, MBA, BCA" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Current Semester</label>
                <select id="reg-semester" class="form-control">
                  <option value="Semester 1">Semester 1</option>
                  <option value="Semester 2">Semester 2</option>
                  <option value="Semester 3">Semester 3</option>
                  <option value="Semester 4">Semester 4</option>
                  <option value="Semester 5">Semester 5</option>
                  <option value="Semester 6">Semester 6</option>
                  <option value="Semester 7">Semester 7</option>
                  <option value="Semester 8">Semester 8</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Mobile / WhatsApp (Optional)</label>
                <input type="tel" id="reg-phone" class="form-control" placeholder="e.g. 9876543210" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Password * (Min 6 characters)</label>
              <input type="password" id="reg-password" class="form-control" placeholder="••••••••" required />
            </div>

            <div style="font-size: 0.8rem; color: var(--secondary-text); margin-bottom: 1.5rem; line-height: 1.5;">
              By registering, you agree to follow the Chandigarh University student code of conduct and Campus Kart safety guidelines.
            </div>

            <button type="submit" id="signup-submit-btn" class="btn btn-primary btn-lg" style="width: 100%;">
              Create Account
            </button>
          </form>

          <div style="text-align: center; margin-top: 1.5rem; font-size: 0.9rem; color: var(--secondary-text);">
            Already have an account? <a href="#login" style="font-weight: 600;">Log in</a>
          </div>

        </div>
      </div>
    `;
  },

  async handleSignupForm(e) {
    e.preventDefault();
    const data = {
      full_name: document.getElementById('reg-name').value.trim(),
      email: document.getElementById('reg-email').value.trim(),
      university: document.getElementById('reg-university').value,
      course: document.getElementById('reg-course').value.trim(),
      semester: document.getElementById('reg-semester').value,
      phone: document.getElementById('reg-phone').value.trim(),
      password: document.getElementById('reg-password').value
    };

    const btn = document.getElementById('signup-submit-btn');
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Creating account...`;

    try {
      await API.register(data);
      this.renderNavUser();
      this.updateUnreadCountBadge();
      Chat.init();
      this.showToast('Account registered successfully! Welcome to Campus Kart.', 'success');
      this.navigateTo('marketplace');
    } catch (err) {
      this.showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `Create Account`;
    }
  },

  // ----------------------------------------------------
  // 11. About Campus Kart Page
  // ----------------------------------------------------
  renderAboutPage(container) {
    container.innerHTML = `
      <div class="container" style="padding-top: 3rem; padding-bottom: 5rem; max-width: 900px;">
        <div style="text-align: center; margin-bottom: 3rem;">
          <div class="hero-badge"><i class="fa-solid fa-building-columns"></i> Chandigarh University & Tricity</div>
          <h1 style="font-size: 2.5rem; font-weight: 800; margin-bottom: 1rem;">Empowering University Life Through Peer Commerce</h1>
          <p style="font-size: 1.1rem; color: var(--secondary-text); line-height: 1.7;">
            Campus Kart was built to solve a problem every college student faces: spending thousands on semester books, calculators, and hostel essentials only to leave them behind after exams.
          </p>
        </div>

        <div style="background: white; border-radius: var(--radius-xl); border: 1px solid var(--border-color); padding: 2.5rem; box-shadow: var(--shadow-sm); margin-bottom: 2rem;">
          <h2 style="font-size: 1.5rem; margin-bottom: 1rem;">Our Mission</h2>
          <p style="color: var(--dark-text); line-height: 1.8; margin-bottom: 1.5rem;">
            Initially launched exclusively for <strong>Chandigarh University (Gharuan)</strong>, Campus Kart connects tens of thousands of hostellers, day scholars, and flats residents across Kharar, Mohali, and Morinda. 
          </p>
          <p style="color: var(--dark-text); line-height: 1.8;">
            In upcoming phases, we are expanding coverage to neighboring higher education institutes including Panjab University, Chitkara University, and CGC Landran to build North India's largest verified student marketplace network.
          </p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem;" class="form-row">
          <div style="background: white; border-radius: var(--radius-lg); border: 1px solid var(--border-color); padding: 1.75rem;">
            <div class="hero-stat-icon icon-blue"><i class="fa-solid fa-recycle"></i></div>
            <h3 style="font-size: 1.15rem; margin-bottom: 0.5rem;">Circular Campus Economy</h3>
            <p style="font-size: 0.9rem; color: var(--secondary-text); line-height: 1.6;">Reduce student waste and save up to 70% on academic costs by reusing books, furniture, bicycles, and electronics.</p>
          </div>

          <div style="background: white; border-radius: var(--radius-lg); border: 1px solid var(--border-color); padding: 1.75rem;">
            <div class="hero-stat-icon icon-green"><i class="fa-solid fa-user-shield"></i></div>
            <h3 style="font-size: 1.15rem; margin-bottom: 0.5rem;">Safe Campus Transactions</h3>
            <p style="font-size: 0.9rem; color: var(--secondary-text); line-height: 1.6;">No strangers, no fake couriers. Meet face-to-face inside campus security zones with peer-verified university profiles.</p>
          </div>
        </div>
      </div>
    `;
  },

  // ----------------------------------------------------
  // 12. Contact / Help & Campus Safety Page
  // ----------------------------------------------------
  renderContactPage(container) {
    container.innerHTML = `
      <div class="container" style="padding-top: 3rem; padding-bottom: 5rem; max-width: 900px;">
        <div style="text-align: center; margin-bottom: 3rem;">
          <h1 style="font-size: 2.25rem; font-weight: 800;">Contact & Student Help Centre</h1>
          <p style="color: var(--secondary-text); margin-top: 0.5rem;">Need support, reported an issue, or have a feature idea for Chandigarh University?</p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;" class="form-row">
          <!-- Contact Form -->
          <div style="background: white; border-radius: var(--radius-xl); border: 1px solid var(--border-color); padding: 2rem; box-shadow: var(--shadow-sm);">
            <h3 style="font-size: 1.25rem; margin-bottom: 1.25rem;">Send a Message</h3>
            
            <form onsubmit="App.handleContactSubmit(event)">
              <div class="form-group">
                <label class="form-label">Your Name</label>
                <input type="text" class="form-control" required placeholder="Sahil Patel" />
              </div>
              <div class="form-group">
                <label class="form-label">CU Email Address</label>
                <input type="email" class="form-control" required placeholder="student@cuchd.in" />
              </div>
              <div class="form-group">
                <label class="form-label">Subject</label>
                <input type="text" class="form-control" required placeholder="Listing query, report user, or suggestion" />
              </div>
              <div class="form-group">
                <label class="form-label">Message Details</label>
                <textarea class="form-control" required placeholder="How can we help you?"></textarea>
              </div>
              <button type="submit" class="btn btn-primary" style="width: 100%;">Submit Message</button>
            </form>
          </div>

          <!-- Safe Meetup Locations at CU -->
          <div style="display: flex; flex-direction: column; gap: 1.5rem;">
            <div style="background: white; border-radius: var(--radius-xl); border: 1px solid var(--border-color); padding: 2rem; box-shadow: var(--shadow-sm);">
              <h3 style="font-size: 1.25rem; margin-bottom: 1rem;"><i class="fa-solid fa-map-pin" style="color: var(--primary-blue);"></i> Recommended Meetup Spots</h3>
              <p style="font-size: 0.875rem; color: var(--secondary-text); margin-bottom: 1rem;">For safe item inspections and transactions at Chandigarh University, we recommend meeting at:</p>
              
              <ul style="font-size: 0.875rem; color: var(--dark-text); display: flex; flex-direction: column; gap: 0.6rem; padding-left: 1.2rem;">
                <li><strong>Student Centre & Fountain Area:</strong> Open, well-lit with active students and CCTV cameras.</li>
                <li><strong>Academic Block 3 & Block 1 Cafeterias:</strong> Great for testing electronics and laptop bootup.</li>
                <li><strong>CU Central Library Entrance:</strong> Ideal for study notes and textbook handovers.</li>
                <li><strong>Gate No. 2 Security Zone:</strong> Convenient for bicycle test rides.</li>
              </ul>
            </div>

            <div style="background: var(--green-accent-light); border-radius: var(--radius-xl); border: 1px solid rgba(16, 185, 129, 0.3); padding: 1.5rem;">
              <h4 style="color: #065f46; font-weight: 700; margin-bottom: 0.35rem;"><i class="fa-solid fa-envelope"></i> Direct Student Support</h4>
              <p style="font-size: 0.85rem; color: #065f46;">support@campuskart-cu.in</p>
              <p style="font-size: 0.85rem; color: #065f46; margin-top: 2px;">Campus Response Time: &lt; 2 hours on working days</p>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  handleContactSubmit(e) {
    e.preventDefault();
    e.target.reset();
    this.showToast('Thank you! Your message has been sent to our campus support team.', 'success');
  },

  // ----------------------------------------------------
  // Modals & Action Handlers
  // ----------------------------------------------------
  openSellModal() {
    const user = API.getCurrentUser();
    if (!user) {
      this.showToast('Please log in first to create a product listing', 'info');
      this.navigateTo('login');
      return;
    }
    const modal = document.getElementById('sell-item-modal');
    if (modal) modal.classList.add('show');
  },

  closeSellModal() {
    const modal = document.getElementById('sell-item-modal');
    if (modal) modal.classList.remove('show');
  },

  async handleSellFormSubmit(e) {
    e.preventDefault();
    const user = API.getCurrentUser();
    if (!user) return;

    const form = e.target;
    const formData = new FormData(form);

    const btn = document.getElementById('sell-submit-btn');
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Publishing...`;

    try {
      const res = await API.createProduct(formData);
      this.showToast('Product listed on Campus Kart successfully!', 'success');
      this.closeSellModal();
      form.reset();

      if (this.currentRoute === 'marketplace') {
        this.loadMarketplaceProducts();
      } else {
        this.navigateTo('product', res.product.id);
      }
    } catch (err) {
      this.showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `Post Product`;
    }
  },

  openServiceModal() {
    const user = API.getCurrentUser();
    if (!user) {
      this.showToast('Please log in to offer a student service', 'info');
      this.navigateTo('login');
      return;
    }
    const modal = document.getElementById('offer-service-modal');
    if (modal) modal.classList.add('show');
  },

  closeServiceModal() {
    const modal = document.getElementById('offer-service-modal');
    if (modal) modal.classList.remove('show');
  },

  async handleServiceFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    const btn = document.getElementById('service-submit-btn');
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Publishing...`;

    try {
      await API.createService(formData);
      this.showToast('Your service listing is now live!', 'success');
      this.closeServiceModal();
      form.reset();
      this.navigateTo('services');
    } catch (err) {
      this.showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `Publish Service`;
    }
  },

  openUploadNotesModal() {
    const user = API.getCurrentUser();
    if (!user) {
      this.showToast('Please log in to upload study notes', 'info');
      this.navigateTo('login');
      return;
    }
    const modal = document.getElementById('upload-notes-modal');
    if (modal) modal.classList.add('show');
  },

  closeUploadNotesModal() {
    const modal = document.getElementById('upload-notes-modal');
    if (modal) modal.classList.remove('show');
  },

  async handleNotesFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    const btn = document.getElementById('notes-submit-btn');
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Uploading...`;

    try {
      await API.uploadNotes(formData);
      this.showToast('Study notes published to marketplace!', 'success');
      this.closeUploadNotesModal();
      form.reset();
      this.navigateTo('notes');
    } catch (err) {
      this.showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `Publish Notes`;
    }
  },

  openEditProfileModal() {
    const user = API.getCurrentUser();
    if (!user) return;

    document.getElementById('edit-profile-name').value = user.full_name || '';
    document.getElementById('edit-profile-course').value = user.course || '';
    document.getElementById('edit-profile-semester').value = user.semester || '';
    document.getElementById('edit-profile-phone').value = user.phone || '';
    document.getElementById('edit-profile-bio').value = user.bio || '';
    document.getElementById('edit-profile-photo').value = user.profile_photo || '';

    const modal = document.getElementById('edit-profile-modal');
    if (modal) modal.classList.add('show');
  },

  closeEditProfileModal() {
    const modal = document.getElementById('edit-profile-modal');
    if (modal) modal.classList.remove('show');
  },

  async handleEditProfileSubmit(e) {
    e.preventDefault();
    const data = {
      full_name: document.getElementById('edit-profile-name').value.trim(),
      course: document.getElementById('edit-profile-course').value.trim(),
      semester: document.getElementById('edit-profile-semester').value.trim(),
      phone: document.getElementById('edit-profile-phone').value.trim(),
      bio: document.getElementById('edit-profile-bio').value.trim(),
      profile_photo: document.getElementById('edit-profile-photo').value.trim()
    };

    try {
      await API.updateProfile(data);
      this.showToast('Profile updated successfully!', 'success');
      this.closeEditProfileModal();
      this.renderNavUser();
      const currentUser = API.getCurrentUser();
      this.renderProfilePage(document.getElementById('app'), currentUser.id);
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async handleToggleSaveProduct(productId) {
    const user = API.getCurrentUser();
    if (!user) {
      this.showToast('Log in to save products', 'info');
      this.navigateTo('login');
      return;
    }
    try {
      const res = await API.toggleSaveProduct(productId);
      this.showToast(res.message, 'info');

      // Update hearts in view
      const btns = document.querySelectorAll(`[onclick*="handleToggleSaveProduct(${productId})"]`);
      btns.forEach(b => {
        if (res.saved) {
          b.classList.add('saved');
          b.querySelector('i').className = 'fa-solid fa-heart';
        } else {
          b.classList.remove('saved');
          b.querySelector('i').className = 'fa-regular fa-heart';
        }
      });
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async handleToggleSaveService(serviceId) {
    const user = API.getCurrentUser();
    if (!user) {
      this.showToast('Log in to save services', 'info');
      this.navigateTo('login');
      return;
    }
    try {
      const res = await API.toggleSaveService(serviceId);
      this.showToast(res.message, 'info');
      const btns = document.querySelectorAll(`[onclick*="handleToggleSaveService(${serviceId})"]`);
      btns.forEach(b => {
        if (res.saved) {
          b.classList.add('saved');
          b.querySelector('i').className = 'fa-solid fa-heart';
        } else {
          b.classList.remove('saved');
          b.querySelector('i').className = 'fa-regular fa-heart';
        }
      });
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async handlePurchaseNote(noteId, price) {
    const user = API.getCurrentUser();
    if (!user) {
      this.showToast('Please log in to unlock notes', 'info');
      this.navigateTo('login');
      return;
    }

    if (!confirm(`Unlock full access to these study notes for ₹${price}?\n(Instant simulated campus payment)`)) {
      return;
    }

    try {
      const res = await API.purchaseNote(noteId);
      this.showToast(res.message, 'success');
      this.loadNotesList();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  handleDownloadNotes(noteId, noteTitle) {
    const token = API.getToken();
    if (!token) {
      this.showToast('Please log in to download notes', 'info');
      this.navigateTo('login');
      return;
    }

    // Direct download endpoint with auth token
    const url = `/api/notes/${noteId}/download`;
    fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(resp => {
      if (!resp.ok) throw new Error("Could not download note file");
      return resp.blob();
    })
    .then(blob => {
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${noteTitle.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      this.showToast('Download started!', 'success');
    })
    .catch(err => {
      this.showToast(err.message, 'error');
    });
  },

  async handleDeleteProduct(productId) {
    if (!confirm("Are you sure you want to delete this listing?")) return;
    try {
      await API.deleteProduct(productId);
      this.showToast('Listing deleted successfully', 'success');
      if (this.currentRoute === 'dashboard') {
        this.loadDashListings();
      } else {
        this.navigateTo('marketplace');
      }
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async handleDeleteService(serviceId) {
    if (!confirm("Delete this service?")) return;
    try {
      await API.deleteService(serviceId);
      this.showToast('Service deleted', 'success');
      this.loadDashServices();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async handleDeleteNote(noteId) {
    if (!confirm("Delete this note?")) return;
    try {
      await API.deleteNote(noteId);
      this.showToast('Note deleted', 'success');
      this.loadDashNotes();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }
};

// Utilities
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeJsString(str) {
  if (!str) return '';
  return String(str).replace(/'/g, "\\'").replace(/"/g, '\\"');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateStr;
  }
}

// Bootstrap on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
