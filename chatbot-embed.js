/**
 * AuraBot — Embeddable AI Chatbot Widget v1.0
 * Drop-in chatbot for any business website.
 * No dependencies. No backend required.
 * (c) 2026 AuraSamuraiHub
 */
(function() {
  'use strict';

  // Default configuration — override via window.AURABOT_CONFIG before loading
  const DEFAULT_CONFIG = {
    businessName: 'Our Business',
    botName: 'AI Assistant',
    botEmoji: '🤖',
    welcomeMessage: "Hi! 👋 I'm here to help. What can I assist you with today?",
    leadCapture: true,
    leadCaptureTitle: "Let's get started!",
    leadCaptureSubtitle: "Enter your info so we can help you better.",
    webhookUrl: null, // POST conversation data here (optional)
    primaryColor: '#6366f1',
    faqs: [
      { keywords: ['hours', 'open', 'close', 'schedule', 'time'], answer: "We're open Monday to Friday, 9 AM - 6 PM. Saturday 10 AM - 2 PM. Closed on Sundays." },
      { keywords: ['price', 'cost', 'pricing', 'how much', 'fee'], answer: "Our pricing depends on the service. Would you like me to send you a detailed quote?" },
      { keywords: ['book', 'appointment', 'schedule', 'reserve'], answer: "I'd love to help you book an appointment! Please call us or email, and we'll find the best time for you." },
      { keywords: ['contact', 'email', 'phone', 'reach'], answer: "You can reach us by email or phone during business hours. Would you like our contact details?" },
      { keywords: ['location', 'address', 'where', 'directions'], answer: "We're conveniently located in the city center. Would you like directions?" },
    ],
    quickReplies: ['Hours & Schedule', 'Pricing', 'Book Appointment', 'Contact Info'],
    fallbackMessage: "Thanks for your message! Let me connect you with our team for a more detailed answer. Is there anything else I can help with?",
  };

  const config = Object.assign({}, DEFAULT_CONFIG, window.AURABOT_CONFIG || {});

  // State
  let isOpen = false;
  let leadCaptured = false;
  let leadData = { name: '', email: '' };
  let conversationLog = [];

  // Build DOM
  function init() {
    // Load CSS if not already loaded
    if (!document.getElementById('aurabot-css')) {
      const cssUrl = getScriptDir() + 'chatbot-embed.css';
      const link = document.createElement('link');
      link.id = 'aurabot-css';
      link.rel = 'stylesheet';
      link.href = cssUrl;
      document.head.appendChild(link);
    }

    // Apply custom color
    document.documentElement.style.setProperty('--aurabot-primary', config.primaryColor);

    // Container
    const container = document.createElement('div');
    container.id = 'aurabot-container';
    container.innerHTML = buildHTML();
    document.body.appendChild(container);

    // Event listeners
    document.getElementById('aurabot-toggle').addEventListener('click', toggleChat);
    document.getElementById('aurabot-send').addEventListener('click', sendMessage);
    document.getElementById('aurabot-input').addEventListener('keypress', function(e) {
      if (e.key === 'Enter') sendMessage();
    });

    if (config.leadCapture) {
      document.getElementById('aurabot-lead-submit').addEventListener('click', submitLead);
      document.getElementById('aurabot-lead-email').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') submitLead();
      });
    }

    // Show badge after 3s
    setTimeout(function() {
      if (!isOpen) {
        document.getElementById('aurabot-badge').style.display = 'block';
      }
    }, 3000);
  }

  function getScriptDir() {
    const scripts = document.getElementsByTagName('script');
    for (let i = scripts.length - 1; i >= 0; i--) {
      if (scripts[i].src && scripts[i].src.includes('chatbot-embed')) {
        return scripts[i].src.replace(/[^/]*$/, '');
      }
    }
    return '';
  }

  function buildHTML() {
    const leadForm = config.leadCapture ? `
      <div id="aurabot-lead-form">
        <h3>${config.leadCaptureTitle}</h3>
        <p>${config.leadCaptureSubtitle}</p>
        <input type="text" id="aurabot-lead-name" placeholder="Your name" autocomplete="name" />
        <input type="email" id="aurabot-lead-email" placeholder="Your email" autocomplete="email" />
        <button id="aurabot-lead-submit">Start Chat →</button>
      </div>` : '';

    return `
      <button id="aurabot-toggle" aria-label="Open chat">
        <span id="aurabot-toggle-icon">💬</span>
        <span id="aurabot-badge"></span>
      </button>
      <div id="aurabot-window">
        <div id="aurabot-header">
          <div id="aurabot-avatar">${config.botEmoji}</div>
          <div id="aurabot-header-info">
            <h3>${config.botName}</h3>
            <span>Online</span>
          </div>
        </div>
        ${leadForm}
        <div id="aurabot-messages" style="${config.leadCapture ? 'display:none' : ''}"></div>
        <div id="aurabot-quick-container" style="display:none"></div>
        <div id="aurabot-input-area" style="${config.leadCapture ? 'display:none' : ''}">
          <input type="text" id="aurabot-input" placeholder="Type a message..." autocomplete="off" />
          <button id="aurabot-send" aria-label="Send">➤</button>
        </div>
        <div id="aurabot-powered">Powered by <a href="https://dilomcfly.github.io/automation-services/chatbot.html" target="_blank">AuraBot</a></div>
      </div>`;
  }

  function toggleChat() {
    isOpen = !isOpen;
    const win = document.getElementById('aurabot-window');
    const btn = document.getElementById('aurabot-toggle');
    const icon = document.getElementById('aurabot-toggle-icon');

    if (isOpen) {
      win.classList.add('visible');
      btn.classList.add('open');
      icon.textContent = '✕';
      document.getElementById('aurabot-badge').style.display = 'none';
      if (!config.leadCapture || leadCaptured) {
        document.getElementById('aurabot-input').focus();
        if (document.getElementById('aurabot-messages').children.length === 0) {
          showWelcome();
        }
      }
    } else {
      win.classList.remove('visible');
      btn.classList.remove('open');
      icon.textContent = '💬';
    }
  }

  function submitLead() {
    const name = document.getElementById('aurabot-lead-name').value.trim();
    const email = document.getElementById('aurabot-lead-email').value.trim();

    if (!name || !email || !email.includes('@')) {
      document.getElementById('aurabot-lead-email').style.borderColor = '#ef4444';
      return;
    }

    leadData = { name, email };
    leadCaptured = true;

    // Hide form, show chat
    document.getElementById('aurabot-lead-form').style.display = 'none';
    document.getElementById('aurabot-messages').style.display = 'flex';
    document.getElementById('aurabot-input-area').style.display = 'flex';

    // Welcome
    showWelcome();
    document.getElementById('aurabot-input').focus();

    // Send lead data to webhook
    sendToWebhook({ type: 'lead', name, email, timestamp: new Date().toISOString() });
  }

  function showWelcome() {
    addMessage('bot', config.welcomeMessage);
    setTimeout(showQuickReplies, 500);
  }

  function showQuickReplies() {
    if (!config.quickReplies || config.quickReplies.length === 0) return;
    const container = document.getElementById('aurabot-quick-container');
    container.style.display = 'block';
    container.innerHTML = '<div class="aurabot-quick-replies">' +
      config.quickReplies.map(function(q) {
        return '<button class="aurabot-qr" onclick="window._aurabot_qr(\'' + q.replace(/'/g, "\\'") + '\')">' + q + '</button>';
      }).join('') + '</div>';
  }

  window._aurabot_qr = function(text) {
    document.getElementById('aurabot-quick-container').style.display = 'none';
    processUserMessage(text);
  };

  function sendMessage() {
    const input = document.getElementById('aurabot-input');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    document.getElementById('aurabot-quick-container').style.display = 'none';
    processUserMessage(text);
  }

  function processUserMessage(text) {
    addMessage('user', text);
    conversationLog.push({ role: 'user', text, ts: new Date().toISOString() });

    // Show typing
    const typing = document.createElement('div');
    typing.className = 'aurabot-typing';
    typing.id = 'aurabot-typing';
    typing.innerHTML = '<span></span><span></span><span></span>';
    document.getElementById('aurabot-messages').appendChild(typing);
    scrollToBottom();

    // Find matching FAQ
    const response = findResponse(text);

    // Simulate typing delay
    setTimeout(function() {
      const t = document.getElementById('aurabot-typing');
      if (t) t.remove();
      addMessage('bot', response);
      conversationLog.push({ role: 'bot', text: response, ts: new Date().toISOString() });
      sendToWebhook({ type: 'message', userMessage: text, botResponse: response, lead: leadData });
    }, 800 + Math.random() * 600);
  }

  function findResponse(text) {
    const lower = text.toLowerCase();
    for (let i = 0; i < config.faqs.length; i++) {
      const faq = config.faqs[i];
      for (let j = 0; j < faq.keywords.length; j++) {
        if (lower.includes(faq.keywords[j])) {
          return faq.answer;
        }
      }
    }
    return config.fallbackMessage;
  }

  function addMessage(role, text) {
    const messages = document.getElementById('aurabot-messages');
    const msg = document.createElement('div');
    msg.className = 'aurabot-msg ' + role;
    msg.textContent = text;
    messages.appendChild(msg);
    scrollToBottom();
  }

  function scrollToBottom() {
    const messages = document.getElementById('aurabot-messages');
    messages.scrollTop = messages.scrollHeight;
  }

  function sendToWebhook(data) {
    if (!config.webhookUrl) return;
    try {
      fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).catch(function() {}); // Silent fail
    } catch(e) {}
  }

  // Init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
