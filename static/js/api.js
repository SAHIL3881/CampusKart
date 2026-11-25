// Campus Kart API Client
const API = {
  tokenKey: 'campus_kart_token',
  userKey: 'campus_kart_user',

  getToken() {
    return localStorage.getItem(this.tokenKey);
  },

  setToken(token) {
    if (token) {
      localStorage.setItem(this.tokenKey, token);
    } else {
      localStorage.removeItem(this.tokenKey);
    }
  },

  getCurrentUser() {
    const raw = localStorage.getItem(this.userKey);
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  setCurrentUser(user) {
    if (user) {
      localStorage.setItem(this.userKey, JSON.stringify(user));
    } else {
      localStorage.removeItem(this.userKey);
    }
  },

  logout() {
    this.setToken(null);
    this.setCurrentUser(null);
  },

  async request(endpoint, options = {}) {
    const headers = options.headers || {};
    const token = this.getToken();

    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    options.headers = headers;

    try {
      const response = await fetch(endpoint, options);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.message || 'An error occurred');
      }

      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err);
      throw err;
    }
  },

  // Auth
  async login(email, password) {
    const res = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (res.token) {
      this.setToken(res.token);
      this.setCurrentUser(res.user);
    }
    return res;
  },

  async register(userData) {
    const res = await this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    if (res.token) {
      this.setToken(res.token);
      this.setCurrentUser(res.user);
    }
    return res;
  },

  async getMe() {
    return await this.request('/api/auth/me');
  },

  async updateProfile(profileData) {
    const res = await this.request('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
    if (res.user) {
      this.setCurrentUser(res.user);
    }
    return res;
  },

  async resetPassword(email, new_password) {
    return await this.request('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, new_password })
    });
  },

  async getUserProfile(userId) {
    return await this.request(`/api/auth/users/${userId}`);
  },

  // Products
  async getProducts(params = {}) {
    const query = new URLSearchParams();
    Object.keys(params).forEach(k => {
      if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
        query.append(k, params[k]);
      }
    });
    return await this.request(`/api/products?${query.toString()}`);
  },

  async getProduct(productId) {
    return await this.request(`/api/products/${productId}`);
  },

  async createProduct(formData) {
    return await this.request('/api/products', {
      method: 'POST',
      body: formData
    });
  },

  async updateProduct(productId, formData) {
    return await this.request(`/api/products/${productId}`, {
      method: 'PUT',
      body: formData
    });
  },

  async updateProductStatus(productId, status) {
    const form = new FormData();
    form.append('status', status);
    return await this.request(`/api/products/${productId}/status`, {
      method: 'PATCH',
      body: form
    });
  },

  async deleteProduct(productId) {
    return await this.request(`/api/products/${productId}`, {
      method: 'DELETE'
    });
  },

  async toggleSaveProduct(productId) {
    return await this.request(`/api/products/${productId}/save`, {
      method: 'POST'
    });
  },

  // Services
  async getServices(params = {}) {
    const query = new URLSearchParams();
    Object.keys(params).forEach(k => {
      if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
        query.append(k, params[k]);
      }
    });
    return await this.request(`/api/services?${query.toString()}`);
  },

  async getService(serviceId) {
    return await this.request(`/api/services/${serviceId}`);
  },

  async createService(formData) {
    return await this.request('/api/services', {
      method: 'POST',
      body: formData
    });
  },

  async deleteService(serviceId) {
    return await this.request(`/api/services/${serviceId}`, {
      method: 'DELETE'
    });
  },

  async toggleSaveService(serviceId) {
    return await this.request(`/api/services/${serviceId}/save`, {
      method: 'POST'
    });
  },

  // Notes
  async getNotes(params = {}) {
    const query = new URLSearchParams();
    Object.keys(params).forEach(k => {
      if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
        query.append(k, params[k]);
      }
    });
    return await this.request(`/api/notes?${query.toString()}`);
  },

  async getNote(noteId) {
    return await this.request(`/api/notes/${noteId}`);
  },

  async uploadNotes(formData) {
    return await this.request('/api/notes', {
      method: 'POST',
      body: formData
    });
  },

  async purchaseNote(noteId) {
    return await this.request(`/api/notes/${noteId}/purchase`, {
      method: 'POST'
    });
  },

  async deleteNote(noteId) {
    return await this.request(`/api/notes/${noteId}`, {
      method: 'DELETE'
    });
  },

  // Chat
  async getConversations() {
    return await this.request('/api/chat/conversations');
  },

  async getMessages(conversationId) {
    return await this.request(`/api/chat/conversations/${conversationId}/messages`);
  },

  async startConversation(data) {
    return await this.request('/api/chat/start', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async sendMessage(conversationId, text) {
    return await this.request('/api/chat/messages', {
      method: 'POST',
      body: JSON.stringify({ conversation_id: conversationId, text })
    });
  },

  async getUnreadCount() {
    return await this.request('/api/chat/unread-count');
  },

  // Dashboard
  async getDashboardSummary() {
    return await this.request('/api/dashboard/summary');
  },

  async getMyListings() {
    return await this.request('/api/dashboard/my-listings');
  },

  async getMyServices() {
    return await this.request('/api/dashboard/my-services');
  },

  async getMyNotes() {
    return await this.request('/api/dashboard/my-notes');
  },

  async getSavedItems() {
    return await this.request('/api/dashboard/saved-items');
  },

  async getPurchasedNotes() {
    return await this.request('/api/dashboard/purchased-notes');
  }
};
