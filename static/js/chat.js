// Campus Kart Real-Time Chat Engine
const Chat = {
  socket: null,
  activeConversationId: null,
  reconnectInterval: 3000,
  pingInterval: null,

  init() {
    const user = API.getCurrentUser();
    if (!user) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const token = API.getToken();
    const wsUrl = `${protocol}//${host}/ws/chat/${user.id}?token=${encodeURIComponent(token)}`;

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log('✅ Real-time Chat WebSocket connected.');
        // Setup keep-alive ping
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => {
          if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ type: 'ping' }));
          }
        }, 25000);
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleIncoming(data);
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };

      this.socket.onclose = () => {
        console.log('Chat WebSocket disconnected. Reconnecting in 3s...');
        clearInterval(this.pingInterval);
        setTimeout(() => this.init(), this.reconnectInterval);
      };

      this.socket.onerror = (err) => {
        console.error('Chat WebSocket error:', err);
      };
    } catch (e) {
      console.error('WebSocket connection failed:', e);
    }
  },

  handleIncoming(payload) {
    if (payload.type === 'new_message') {
      const msg = payload.message;

      // Update badge count
      App.updateUnreadCountBadge();

      // If viewing the conversation, append message directly
      if (this.activeConversationId && Number(this.activeConversationId) === Number(msg.conversation_id)) {
        this.appendMessageBubble(msg);
        this.scrollToBottom();
      } else {
        // Show subtle notification toast if message is from someone else
        const user = API.getCurrentUser();
        if (user && msg.sender_id !== user.id) {
          App.showToast(`New message from ${msg.sender_name}: "${msg.text.substring(0, 30)}..."`, 'info');
        }
      }

      // Refresh conversations list in chat pane if visible
      if (window.location.hash.startsWith('#chat')) {
        this.loadConversations();
      }
    }
  },

  async loadConversations(selectFirst = false) {
    const listEl = document.getElementById('chat-conversations-list');
    if (!listEl) return;

    try {
      const res = await API.getConversations();
      const convs = res.conversations || [];

      if (convs.length === 0) {
        listEl.innerHTML = `
          <div style="padding: 2.5rem 1.5rem; text-align: center; color: var(--secondary-text);">
            <i class="fa-regular fa-comments" style="font-size: 2.5rem; margin-bottom: 0.75rem; color: #cbd5e1;"></i>
            <p style="font-weight: 600;">No conversations yet</p>
            <p style="font-size: 0.85rem;">Click "Chat with Seller" on any marketplace or service listing to start chatting.</p>
          </div>
        `;
        document.getElementById('chat-active-header').style.display = 'none';
        document.getElementById('chat-messages-container').innerHTML = `
          <div style="margin: auto; text-align: center; color: var(--secondary-text);">
            <i class="fa-solid fa-comments" style="font-size: 3rem; margin-bottom: 1rem; color: #cbd5e1;"></i>
            <h3 style="margin-bottom: 0.5rem;">Select a conversation</h3>
            <p style="font-size: 0.9rem;">Chat privately and securely with Chandigarh University students.</p>
          </div>
        `;
        return;
      }

      listEl.innerHTML = convs.map(c => `
        <div class="conversation-item ${this.activeConversationId === c.conversation_id ? 'active' : ''}" 
             onclick="Chat.openConversation(${c.conversation_id}, '${escapeHtml(c.other_user_name)}', '${c.other_user_photo}')">
          <img src="${c.other_user_photo}" class="conversation-avatar" alt="${escapeHtml(c.other_user_name)}" />
          <div class="conversation-info">
            <div class="conversation-top-row">
              <span class="conversation-name">${escapeHtml(c.other_user_name)}</span>
              <span class="conversation-time">${formatDate(c.last_message_time || c.updated_at)}</span>
            </div>
            <p class="conversation-preview">${escapeHtml(c.last_message || 'Started a conversation')}</p>
          </div>
          ${c.unread_count > 0 ? `<span class="badge-count" style="position: static; margin-left: 6px;">${c.unread_count}</span>` : ''}
        </div>
      `).join('');

      if (selectFirst && convs.length > 0 && !this.activeConversationId) {
        const first = convs[0];
        this.openConversation(first.conversation_id, first.other_user_name, first.other_user_photo);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  },

  async openConversation(convId, userName, userPhoto) {
    this.activeConversationId = convId;

    // Highlight selected item in sidebar
    document.querySelectorAll('.conversation-item').forEach(el => el.classList.remove('active'));
    this.loadConversations();

    const headerEl = document.getElementById('chat-active-header');
    headerEl.style.display = 'flex';
    document.getElementById('chat-header-name').textContent = userName;
    document.getElementById('chat-header-avatar').src = userPhoto;

    const messagesEl = document.getElementById('chat-messages-container');
    messagesEl.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: var(--secondary-text);">
        <i class="fa-solid fa-spinner fa-spin"></i> Loading messages...
      </div>
    `;

    try {
      const res = await API.getMessages(convId);
      const messages = res.messages || [];

      if (messages.length === 0) {
        messagesEl.innerHTML = `
          <div style="margin: auto; text-align: center; color: var(--secondary-text); padding: 2rem;">
            <p>Say hello to ${escapeHtml(userName)} 👋</p>
            <p style="font-size: 0.8rem; margin-top: 4px;">Never share your password or confidential OTPs.</p>
          </div>
        `;
      } else {
        messagesEl.innerHTML = '';
        messages.forEach(m => this.appendMessageBubble(m));
      }

      this.scrollToBottom();
      App.updateUnreadCountBadge();
    } catch (err) {
      messagesEl.innerHTML = `<div style="color: var(--red-accent); text-align: center; padding: 1rem;">Failed to load messages</div>`;
    }
  },

  appendMessageBubble(msg) {
    const messagesEl = document.getElementById('chat-messages-container');
    if (!messagesEl) return;

    const user = API.getCurrentUser();
    const isOutgoing = user && msg.sender_id === user.id;

    const bubble = document.createElement('div');
    bubble.className = `message-bubble ${isOutgoing ? 'outgoing' : 'incoming'}`;
    bubble.innerHTML = `
      <div class="message-text">${escapeHtml(msg.text)}</div>
      <div class="message-meta">
        <span>${formatTime(msg.created_at)}</span>
        ${isOutgoing ? `<i class="fa-solid ${msg.is_read ? 'fa-check-double' : 'fa-check'}"></i>` : ''}
      </div>
    `;
    messagesEl.appendChild(bubble);
  },

  scrollToBottom() {
    const el = document.getElementById('chat-messages-container');
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  },

  async handleSendMessage(e) {
    if (e) e.preventDefault();
    const input = document.getElementById('chat-input-text');
    if (!input || !this.activeConversationId) return;

    const text = input.value.trim();
    if (!text) return;

    input.value = '';

    try {
      await API.sendMessage(this.activeConversationId, text);
      // Fallback in case WebSocket is reconnecting
      this.scrollToBottom();
    } catch (err) {
      App.showToast('Failed to deliver message: ' + err.message, 'error');
    }
  }
};
