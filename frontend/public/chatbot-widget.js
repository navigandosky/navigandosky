/**
 * Trivor Chatbot Widget - Multilingual Embed Script
 * Aeroporto di Olbia Costa Smeralda
 * 
 * Features:
 * - Automatic language detection based on IP geolocation
 * - Always visible language flags bar
 * - Localized UI and suggested questions
 */

(function() {
  'use strict';

  const CONFIG = {
    API_URL: 'https://virtual-agent-info.preview.emergentagent.com/api',
    WIDGET_ID: 'trivor-chatbot-widget',
    Z_INDEX: 999999,
    LOGO_URL: 'https://customer-assets.emergentagent.com/job_virtual-agent-info/artifacts/blz7uoye_logo%20trivor%20heritage%20senza%20testo.png'
  };

  if (window.OlbiaAirportChatbot) {
    console.log('Trivor Chatbot already initialized');
    return;
  }

  window.OlbiaAirportChatbot = { initialized: true };

  // Available languages
  const LANGUAGES = {
    it: { name: 'Italiano', flag: '🇮🇹' },
    en: { name: 'English', flag: '🇬🇧' },
    de: { name: 'Deutsch', flag: '🇩🇪' },
    fr: { name: 'Français', flag: '🇫🇷' },
    es: { name: 'Español', flag: '🇪🇸' },
    ru: { name: 'Русский', flag: '🇷🇺' }
  };

  // Styles
  const styles = `
    #${CONFIG.WIDGET_ID} * {
      box-sizing: border-box;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    #${CONFIG.WIDGET_ID} .oac-toggle-btn {
      position: fixed;
      bottom: 50%;
      right: 50%;
      transform: translate(50%, 50%);
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: linear-gradient(135deg, #0d9488 0%, #0891b2 100%);
      border: none;
      cursor: pointer;
      box-shadow: 0 8px 32px rgba(13, 148, 136, 0.5);
      z-index: ${CONFIG.Z_INDEX};
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
    }

    #${CONFIG.WIDGET_ID} .oac-toggle-btn:hover {
      transform: translate(50%, 50%) scale(1.15);
      box-shadow: 0 12px 40px rgba(13, 148, 136, 0.6);
    }

    #${CONFIG.WIDGET_ID} .oac-toggle-btn svg {
      width: 36px;
      height: 36px;
      fill: white;
    }

    #${CONFIG.WIDGET_ID} .oac-chat-window {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 400px;
      height: 620px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
      z-index: ${CONFIG.Z_INDEX};
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: oac-slide-in 0.3s ease;
    }

    @keyframes oac-slide-in {
      from { opacity: 0; transform: translateY(20px) scale(0.95); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    #${CONFIG.WIDGET_ID} .oac-header {
      background: linear-gradient(135deg, #0d9488 0%, #0891b2 100%);
      color: white;
      padding: 14px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    #${CONFIG.WIDGET_ID} .oac-header-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    #${CONFIG.WIDGET_ID} .oac-header-icon {
      background: rgba(255,255,255,0.2);
      border-radius: 50%;
      padding: 8px;
      display: flex;
    }

    #${CONFIG.WIDGET_ID} .oac-header-icon svg {
      width: 20px;
      height: 20px;
      fill: white;
    }

    #${CONFIG.WIDGET_ID} .oac-header-text h3 {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
    }

    #${CONFIG.WIDGET_ID} .oac-header-text p {
      margin: 2px 0 0 0;
      font-size: 11px;
      opacity: 0.8;
    }

    #${CONFIG.WIDGET_ID} .oac-header-actions {
      display: flex;
      gap: 6px;
      align-items: center;
    }

    #${CONFIG.WIDGET_ID} .oac-header-btn {
      background: rgba(255,255,255,0.2);
      border: none;
      border-radius: 8px;
      padding: 8px;
      cursor: pointer;
      display: flex;
      transition: background 0.2s;
    }

    #${CONFIG.WIDGET_ID} .oac-header-btn:hover {
      background: rgba(255,255,255,0.3);
    }

    #${CONFIG.WIDGET_ID} .oac-header-btn svg {
      width: 16px;
      height: 16px;
      fill: white;
    }

    /* Language flags bar - always visible */
    #${CONFIG.WIDGET_ID} .oac-lang-bar {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding: 8px 12px;
      background: linear-gradient(135deg, #0f766e 0%, #0e7490 100%);
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }

    #${CONFIG.WIDGET_ID} .oac-lang-flag {
      font-size: 20px;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 6px;
      transition: all 0.2s;
      border: 2px solid transparent;
      background: rgba(255,255,255,0.1);
      opacity: 0.7;
    }

    #${CONFIG.WIDGET_ID} .oac-lang-flag:hover {
      opacity: 1;
      background: rgba(255,255,255,0.2);
      transform: scale(1.1);
    }

    #${CONFIG.WIDGET_ID} .oac-lang-flag.active {
      opacity: 1;
      background: rgba(255,255,255,0.3);
      border-color: white;
      transform: scale(1.1);
    }

    #${CONFIG.WIDGET_ID} .oac-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    #${CONFIG.WIDGET_ID} .oac-message {
      max-width: 85%;
      padding: 12px 16px;
      border-radius: 16px;
      font-size: 14px;
      line-height: 1.5;
      word-wrap: break-word;
    }

    #${CONFIG.WIDGET_ID} .oac-message.user {
      align-self: flex-end;
      background: linear-gradient(135deg, #0d9488 0%, #0891b2 100%);
      color: white;
      border-bottom-right-radius: 4px;
    }

    #${CONFIG.WIDGET_ID} .oac-message.assistant {
      align-self: flex-start;
      background: #f3f4f6;
      color: #1f2937;
      border-bottom-left-radius: 4px;
    }

    #${CONFIG.WIDGET_ID} .oac-typing {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: #f3f4f6;
      border-radius: 16px;
      border-bottom-left-radius: 4px;
      align-self: flex-start;
    }

    #${CONFIG.WIDGET_ID} .oac-typing-dots {
      display: flex;
      gap: 4px;
    }

    #${CONFIG.WIDGET_ID} .oac-typing-dot {
      width: 8px;
      height: 8px;
      background: #0d9488;
      border-radius: 50%;
      animation: oac-bounce 1.4s infinite ease-in-out;
    }

    #${CONFIG.WIDGET_ID} .oac-typing-dot:nth-child(1) { animation-delay: 0s; }
    #${CONFIG.WIDGET_ID} .oac-typing-dot:nth-child(2) { animation-delay: 0.2s; }
    #${CONFIG.WIDGET_ID} .oac-typing-dot:nth-child(3) { animation-delay: 0.4s; }

    @keyframes oac-bounce {
      0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
      40% { transform: scale(1); opacity: 1; }
    }

    #${CONFIG.WIDGET_ID} .oac-suggestions {
      padding: 0 16px 12px 16px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    #${CONFIG.WIDGET_ID} .oac-suggestions-title {
      width: 100%;
      font-size: 11px;
      color: #6b7280;
      margin-bottom: 4px;
    }

    #${CONFIG.WIDGET_ID} .oac-suggestion-btn {
      background: white;
      border: 1px solid #99f6e4;
      border-radius: 20px;
      padding: 8px 12px;
      font-size: 12px;
      color: #0d9488;
      cursor: pointer;
      transition: all 0.2s;
    }

    #${CONFIG.WIDGET_ID} .oac-suggestion-btn:hover {
      background: #f0fdfa;
      border-color: #5eead4;
    }

    #${CONFIG.WIDGET_ID} .oac-input-area {
      padding: 12px 16px;
      border-top: 1px solid #e5e7eb;
      background: #f9fafb;
      display: flex;
      gap: 8px;
    }

    #${CONFIG.WIDGET_ID} .oac-input {
      flex: 1;
      border: 1px solid #d1d5db;
      border-radius: 24px;
      padding: 10px 16px;
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s;
    }

    #${CONFIG.WIDGET_ID} .oac-input:focus {
      border-color: #0d9488;
    }

    #${CONFIG.WIDGET_ID} .oac-send-btn {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #0d9488 0%, #0891b2 100%);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: opacity 0.2s;
    }

    #${CONFIG.WIDGET_ID} .oac-send-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    #${CONFIG.WIDGET_ID} .oac-send-btn svg {
      width: 16px;
      height: 16px;
      fill: white;
    }

    /* Trivor logo - fixed bottom left, minimum size */
    #${CONFIG.WIDGET_ID} .oac-powered {
      position: fixed;
      bottom: 8px;
      left: 8px;
      display: flex;
      align-items: center;
      gap: 3px;
      padding: 2px 6px;
      font-size: 7px;
      color: #c0c0c0;
      background: rgba(255,255,255,0.8);
      border-radius: 3px;
      z-index: ${CONFIG.Z_INDEX - 1};
    }

    #${CONFIG.WIDGET_ID} .oac-powered img {
      width: 8px;
      height: 8px;
      object-fit: contain;
      opacity: 0.6;
    }

    #${CONFIG.WIDGET_ID} .oac-powered span {
      opacity: 0.6;
    }

    @media (max-width: 480px) {
      #${CONFIG.WIDGET_ID} .oac-chat-window {
        width: calc(100vw - 32px);
        height: calc(100vh - 100px);
        bottom: 50px;
        right: 16px;
      }
      #${CONFIG.WIDGET_ID} .oac-toggle-btn {
        bottom: 50%;
        right: 50%;
        transform: translate(50%, 50%);
        width: 70px;
        height: 70px;
      }
      #${CONFIG.WIDGET_ID} .oac-toggle-btn:hover {
        transform: translate(50%, 50%) scale(1.1);
      }
    }
  `;

  // SVG Icons
  const icons = {
    chat: '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>',
    plane: '<svg viewBox="0 0 24 24"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>',
    send: '<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>'
  };

  // State
  let state = {
    isOpen: false,
    messages: [],
    sessionId: null,
    isLoading: false,
    showSuggestions: true,
    currentLanguage: 'it',
    detectedLanguage: null,
    langConfig: null
  };

  // Detect language from IP
  async function detectLanguage() {
    try {
      const response = await fetch(`${CONFIG.API_URL}/detect-language`);
      if (response.ok) {
        const data = await response.json();
        state.detectedLanguage = data.language;
        state.currentLanguage = data.language;
        await loadLanguageConfig(data.language);
        return data.language;
      }
    } catch (e) {
      console.log('Language detection failed, using default');
    }
    state.currentLanguage = 'it';
    await loadLanguageConfig('it');
    return 'it';
  }

  // Load language configuration
  async function loadLanguageConfig(langCode) {
    try {
      const response = await fetch(`${CONFIG.API_URL}/language-config/${langCode}`);
      if (response.ok) {
        state.langConfig = await response.json();
      }
    } catch (e) {
      console.log('Failed to load language config');
      state.langConfig = {
        welcome: 'Hello! How can I help you?',
        online_status: 'Online',
        input_placeholder: 'Type a message...',
        typing: 'Typing...',
        suggestions_title: 'Suggested:',
        suggested_questions: []
      };
    }
  }

  // Change language
  async function changeLanguage(langCode) {
    if (langCode === state.currentLanguage) return;
    
    state.currentLanguage = langCode;
    state.messages = [];
    state.sessionId = null;
    state.showSuggestions = true;
    await loadLanguageConfig(langCode);
    
    // Add welcome message in new language
    if (state.langConfig) {
      state.messages.push({
        role: 'assistant',
        content: state.langConfig.welcome
      });
    }
    
    render();
  }

  // Create widget
  async function createWidget() {
    await detectLanguage();
    
    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);

    const container = document.createElement('div');
    container.id = CONFIG.WIDGET_ID;
    document.body.appendChild(container);

    render();
  }

  // Render
  function render() {
    const container = document.getElementById(CONFIG.WIDGET_ID);
    const lang = LANGUAGES[state.currentLanguage] || LANGUAGES.en;
    const config = state.langConfig || {};
    
    if (!state.isOpen) {
      container.innerHTML = `
        <button class="oac-toggle-btn" onclick="OlbiaAirportChatbot.toggle()" title="${lang.flag} ${lang.name}">
          ${icons.chat}
        </button>
        <div class="oac-powered">
          <img src="${CONFIG.LOGO_URL}" alt="Trivor">
          <span>Trivor srl</span>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="oac-chat-window">
          <div class="oac-header">
            <div class="oac-header-info">
              <div class="oac-header-icon">${icons.plane}</div>
              <div class="oac-header-text">
                <h3>Olbia Airport Assistant</h3>
                <p>${config.online_status || 'Online'}</p>
              </div>
            </div>
            <div class="oac-header-actions">
              <button class="oac-header-btn" onclick="OlbiaAirportChatbot.clearChat()" title="${config.new_conversation || 'New conversation'}">
                ${icons.trash}
              </button>
              <button class="oac-header-btn" onclick="OlbiaAirportChatbot.toggle()" title="Close">
                ${icons.close}
              </button>
            </div>
          </div>
          
          <!-- Language flags bar - always visible -->
          <div class="oac-lang-bar">
            ${Object.entries(LANGUAGES).map(([code, l]) => `
              <span class="oac-lang-flag ${code === state.currentLanguage ? 'active' : ''}" 
                    onclick="OlbiaAirportChatbot.changeLanguage('${code}')"
                    title="${l.name}">
                ${l.flag}
              </span>
            `).join('')}
          </div>
          
          <div class="oac-messages" id="oac-messages">
            ${renderMessages()}
          </div>
          ${state.showSuggestions && state.messages.length <= 1 ? renderSuggestions() : ''}
          <div class="oac-input-area">
            <input 
              type="text" 
              class="oac-input" 
              id="oac-input" 
              placeholder="${config.input_placeholder || 'Type a message...'}" 
              onkeypress="if(event.key==='Enter')OlbiaAirportChatbot.send()"
              ${state.isLoading ? 'disabled' : ''}
            />
            <button 
              class="oac-send-btn" 
              onclick="OlbiaAirportChatbot.send()" 
              ${state.isLoading ? 'disabled' : ''}
            >
              ${icons.send}
            </button>
          </div>
        </div>
        <div class="oac-powered">
          <img src="${CONFIG.LOGO_URL}" alt="Trivor">
          <span>Trivor srl</span>
        </div>`;

      setTimeout(() => {
        const messagesEl = document.getElementById('oac-messages');
        if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
      }, 50);

      setTimeout(() => {
        const inputEl = document.getElementById('oac-input');
        if (inputEl) inputEl.focus();
      }, 100);
    }
  }

  // Render messages
  function renderMessages() {
    const config = state.langConfig || {};
    let html = state.messages.map(msg => 
      `<div class="oac-message ${msg.role}">${escapeHtml(msg.content)}</div>`
    ).join('');

    if (state.isLoading) {
      html += `
        <div class="oac-typing">
          <div class="oac-typing-dots">
            <div class="oac-typing-dot"></div>
            <div class="oac-typing-dot"></div>
            <div class="oac-typing-dot"></div>
          </div>
          <span style="font-size: 12px; color: #6b7280;">${config.typing || 'Typing...'}</span>
        </div>
      `;
    }

    return html;
  }

  // Render suggestions
  function renderSuggestions() {
    const config = state.langConfig || {};
    const questions = config.suggested_questions || [];
    
    if (questions.length === 0) return '';
    
    return `
      <div class="oac-suggestions">
        <div class="oac-suggestions-title">${config.suggestions_title || 'Suggested:'}</div>
        ${questions.map(q => 
          `<button class="oac-suggestion-btn" onclick="OlbiaAirportChatbot.sendSuggestion('${escapeHtml(q.question)}')">
            ${escapeHtml(q.short)}
          </button>`
        ).join('')}
      </div>
    `;
  }

  // Escape HTML
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Toggle chat
  window.OlbiaAirportChatbot.toggle = function() {
    state.isOpen = !state.isOpen;
    
    if (state.isOpen && state.messages.length === 0 && state.langConfig) {
      state.messages.push({
        role: 'assistant',
        content: state.langConfig.welcome
      });
    }
    
    render();
  };

  // Change language
  window.OlbiaAirportChatbot.changeLanguage = function(langCode) {
    changeLanguage(langCode);
  };

  // Send message
  window.OlbiaAirportChatbot.send = async function() {
    const inputEl = document.getElementById('oac-input');
    const message = inputEl ? inputEl.value.trim() : '';
    
    if (!message || state.isLoading) return;

    state.messages.push({ role: 'user', content: message });
    state.isLoading = true;
    state.showSuggestions = false;
    render();

    try {
      const response = await fetch(`${CONFIG.API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message,
          session_id: state.sessionId,
          language: state.currentLanguage
        })
      });

      const data = await response.json();
      
      state.messages.push({ role: 'assistant', content: data.response });
      state.sessionId = data.session_id;
    } catch (error) {
      console.error('Chat error:', error);
      state.messages.push({ 
        role: 'assistant', 
        content: 'Sorry, an error occurred. Please try again.' 
      });
    }

    state.isLoading = false;
    render();
  };

  // Send suggestion
  window.OlbiaAirportChatbot.sendSuggestion = function(text) {
    const inputEl = document.getElementById('oac-input');
    if (inputEl) {
      inputEl.value = text;
      window.OlbiaAirportChatbot.send();
    }
  };

  // Clear chat
  window.OlbiaAirportChatbot.clearChat = async function() {
    if (state.sessionId) {
      try {
        await fetch(`${CONFIG.API_URL}/chat/session/${state.sessionId}`, {
          method: 'DELETE'
        });
      } catch (e) {
        console.error('Error clearing session:', e);
      }
    }
    
    state.messages = [];
    state.sessionId = null;
    state.showSuggestions = true;
    state.isOpen = true;
    
    if (state.langConfig) {
      state.messages.push({
        role: 'assistant',
        content: state.langConfig.welcome
      });
    }
    
    render();
  };

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createWidget);
  } else {
    createWidget();
  }

})();
