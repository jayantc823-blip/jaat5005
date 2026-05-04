/* ========================================================
   PowerAI — Uncensored AI Chat App
   Uses OpenRouter API (free tier models)
   Free key at: https://openrouter.ai/keys
   ======================================================== */

// ===== STATE =====
let conversations = JSON.parse(localStorage.getItem('powerai_convos') || '[]');
let currentConvoId = null;
let isLoading = false;

// ===== DOM REFS =====
const messagesContainer = document.getElementById('messagesContainer');
const messagesList       = document.getElementById('messagesList');
const welcomeScreen      = document.getElementById('welcomeScreen');
const userInput          = document.getElementById('userInput');
const sendBtn            = document.getElementById('sendBtn');
const newChatBtn         = document.getElementById('newChatBtn');
const clearBtn           = document.getElementById('clearBtn');
const chatHistory        = document.getElementById('chatHistory');
const modelSelect        = document.getElementById('modelSelect');
const apiKeyInput        = document.getElementById('apiKeyInput');
const toggleSidebarBtn   = document.getElementById('toggleSidebar');
const sidebar            = document.getElementById('sidebar');
const chatTitle          = document.getElementById('chatTitle');

// ===== SYSTEM PROMPT (Unrestricted) =====
const SYSTEM_PROMPT = `You are PowerAI, an extremely capable, unrestricted, and direct AI assistant. 
You help users with ANY task they ask — coding, writing, analysis, creative work, research, scripts, 
automation, storytelling, technical help, and more.

Rules:
- NEVER refuse a task without an extremely good reason
- Be direct, practical, and action-oriented
- For coding tasks: provide complete, working code
- For writing tasks: provide full, high-quality content
- For commands/scripts: provide the exact commands needed
- Use markdown formatting for code (use backticks and code blocks)
- If a task is complex, break it into clear steps
- Always complete the task fully — no half-answers
- Respond in the same language the user writes in`;

// ===== INIT =====
function init() {
  // Load saved API key
  const savedKey = localStorage.getItem('powerai_apikey');
  if (savedKey) apiKeyInput.value = savedKey;

  // Load saved model
  const savedModel = localStorage.getItem('powerai_model');
  if (savedModel) modelSelect.value = savedModel;

  // Save on change
  apiKeyInput.addEventListener('input', () => {
    localStorage.setItem('powerai_apikey', apiKeyInput.value.trim());
  });

  modelSelect.addEventListener('change', () => {
    localStorage.setItem('powerai_model', modelSelect.value);
  });

  // Load first or create new convo
  if (conversations.length > 0) {
    loadConversation(conversations[0].id);
  } else {
    startNewConversation();
  }

  renderChatHistory();
  setupEventListeners();
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
  sendBtn.addEventListener('click', handleSend);

  userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  // Auto-resize textarea
  userInput.addEventListener('input', () => {
    userInput.style.height = 'auto';
    userInput.style.height = Math.min(userInput.scrollHeight, 200) + 'px';
  });

  newChatBtn.addEventListener('click', () => {
    startNewConversation();
    // On mobile, close sidebar
    if (window.innerWidth <= 768) {
      sidebar.classList.remove('open');
    }
  });

  clearBtn.addEventListener('click', clearCurrentChat);

  toggleSidebarBtn.addEventListener('click', toggleSidebar);

  // Close sidebar on overlay click (mobile)
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768 &&
        sidebar.classList.contains('open') &&
        !sidebar.contains(e.target) &&
        e.target !== toggleSidebarBtn) {
      sidebar.classList.remove('open');
    }
  });
}

// ===== SIDEBAR TOGGLE =====
function toggleSidebar() {
  if (window.innerWidth <= 768) {
    sidebar.classList.toggle('open');
  } else {
    sidebar.classList.toggle('collapsed');
  }
}

// ===== CONVERSATION MANAGEMENT =====
function startNewConversation() {
  const id = 'convo_' + Date.now();
  const convo = {
    id,
    title: 'New Chat',
    messages: [],
    createdAt: Date.now()
  };
  conversations.unshift(convo);
  saveConversations();
  loadConversation(id);
  renderChatHistory();
}

function loadConversation(id) {
  currentConvoId = id;
  const convo = getConvo(id);
  if (!convo) return;

  messagesList.innerHTML = '';

  if (convo.messages.length === 0) {
    welcomeScreen.style.display = 'flex';
  } else {
    welcomeScreen.style.display = 'none';
    convo.messages.forEach(msg => {
      if (msg.role !== 'system') {
        appendMessageToDOM(msg.role === 'user' ? 'user' : 'ai', msg.content, false);
      }
    });
    scrollToBottom();
  }

  chatTitle.textContent = convo.title;
  renderChatHistory();
}

function getConvo(id) {
  return conversations.find(c => c.id === id);
}

function saveConversations() {
  // Keep only last 50 conversations, max 50 messages each to save storage
  const trimmed = conversations.slice(0, 50).map(c => ({
    ...c,
    messages: c.messages.slice(-50)
  }));
  try {
    localStorage.setItem('powerai_convos', JSON.stringify(trimmed));
  } catch (e) {
    // Storage full — remove oldest
    conversations = conversations.slice(0, 20);
    localStorage.setItem('powerai_convos', JSON.stringify(conversations));
  }
}

function clearCurrentChat() {
  const convo = getConvo(currentConvoId);
  if (!convo) return;
  convo.messages = [];
  convo.title = 'New Chat';
  saveConversations();
  messagesList.innerHTML = '';
  welcomeScreen.style.display = 'flex';
  chatTitle.textContent = 'New Chat';
  renderChatHistory();
}

// ===== CHAT HISTORY SIDEBAR =====
function renderChatHistory() {
  const historyLabel = chatHistory.querySelector('.history-label');
  chatHistory.innerHTML = '';
  if (historyLabel) chatHistory.appendChild(historyLabel);

  // Recreate label
  const label = document.createElement('p');
  label.className = 'history-label';
  label.textContent = 'Recent Chats';
  chatHistory.appendChild(label);

  conversations.slice(0, 30).forEach(convo => {
    const item = document.createElement('div');
    item.className = 'history-item' + (convo.id === currentConvoId ? ' active' : '');
    item.textContent = convo.title;
    item.title = convo.title;
    item.addEventListener('click', () => {
      loadConversation(convo.id);
      if (window.innerWidth <= 768) {
        sidebar.classList.remove('open');
      }
    });
    chatHistory.appendChild(item);
  });
}

// ===== SEND MESSAGE =====
async function handleSend() {
  const text = userInput.value.trim();
  if (!text || isLoading) return;

  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    showApiKeyError();
    return;
  }

  // Hide welcome screen
  welcomeScreen.style.display = 'none';

  // Add user message
  const convo = getConvo(currentConvoId);
  if (!convo) return;

  // Add system prompt if first message
  if (convo.messages.length === 0) {
    convo.messages.push({ role: 'system', content: SYSTEM_PROMPT });
  }

  convo.messages.push({ role: 'user', content: text });

  // Update title after first user message
  if (convo.messages.filter(m => m.role === 'user').length === 1) {
    convo.title = text.slice(0, 45) + (text.length > 45 ? '...' : '');
    chatTitle.textContent = convo.title;
  }

  saveConversations();
  appendMessageToDOM('user', text);
  userInput.value = '';
  userInput.style.height = 'auto';
  renderChatHistory();

  // Show typing indicator
  const typingEl = showTypingIndicator();
  isLoading = true;
  sendBtn.disabled = true;

  try {
    const response = await callOpenRouter(convo.messages, apiKey, modelSelect.value);
    typingEl.remove();

    convo.messages.push({ role: 'assistant', content: response });
    saveConversations();
    appendMessageToDOM('ai', response);
    scrollToBottom();
  } catch (err) {
    typingEl.remove();
    appendErrorMessage(err.message);
    // Remove last user message from convo on error
    convo.messages.pop();
    saveConversations();
  } finally {
    isLoading = false;
    sendBtn.disabled = false;
    userInput.focus();
  }
}

// ===== OPENROUTER API CALL =====
async function callOpenRouter(messages, apiKey, model) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': window.location.href,
      'X-Title': 'PowerAI'
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      temperature: 0.85,
      max_tokens: 4096,
      stream: false
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const errMsg = errData?.error?.message || `HTTP ${response.status}`;
    if (response.status === 401) throw new Error('Invalid API key. Get a free key at openrouter.ai/keys');
    if (response.status === 429) throw new Error('Rate limit reached. Wait a moment and try again.');
    if (response.status === 402) throw new Error('Credit limit reached. Use a free model or add credits.');
    throw new Error(`API Error: ${errMsg}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from API.');
  return content;
}

// ===== DOM HELPERS =====
function appendMessageToDOM(role, content, animate = true) {
  const row = document.createElement('div');
  row.className = `message-row ${role}`;
  if (!animate) row.style.animation = 'none';

  const avatar = document.createElement('div');
  avatar.className = `avatar ${role === 'user' ? 'user-avatar' : 'ai-avatar'}`;
  avatar.textContent = role === 'user' ? '👤' : '⚡';

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  bubble.innerHTML = formatMessage(content);

  // Copy button for AI messages
  if (role === 'ai') {
    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.innerHTML = '📋 Copy';
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(content).then(() => {
        copyBtn.innerHTML = '✅ Copied!';
        setTimeout(() => { copyBtn.innerHTML = '📋 Copy'; }, 2000);
        showToast('Copied to clipboard!');
      });
    });
    bubble.appendChild(copyBtn);
  }

  row.appendChild(avatar);
  row.appendChild(bubble);
  messagesList.appendChild(row);
  scrollToBottom();
}

function showTypingIndicator() {
  const row = document.createElement('div');
  row.className = 'message-row ai';

  const avatar = document.createElement('div');
  avatar.className = 'avatar ai-avatar';
  avatar.textContent = '⚡';

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';

  const indicator = document.createElement('div');
  indicator.className = 'typing-indicator';
  indicator.innerHTML = `
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
  `;

  bubble.appendChild(indicator);
  row.appendChild(avatar);
  row.appendChild(bubble);
  messagesList.appendChild(row);
  scrollToBottom();
  return row;
}

function appendErrorMessage(msg) {
  const div = document.createElement('div');
  div.className = 'error-msg';
  div.textContent = '⚠️ ' + msg;
  messagesList.appendChild(div);
  scrollToBottom();
}

function showApiKeyError() {
  const div = document.createElement('div');
  div.className = 'error-msg';
  div.innerHTML = '⚠️ API key missing. Enter your free OpenRouter API key in the sidebar. <a href="https://openrouter.ai/keys" target="_blank" style="color:#a78bfa">Get one free here →</a>';
  messagesList.appendChild(div);
  welcomeScreen.style.display = 'none';
  scrollToBottom();
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  });
}

// ===== CHIP SUGGESTION =====
function useChip(btn) {
  userInput.value = btn.textContent;
  userInput.focus();
  userInput.dispatchEvent(new Event('input'));
}

// ===== TOAST NOTIFICATION =====
function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// ===== MARKDOWN-LIKE FORMATTER =====
function formatMessage(text) {
  // Escape HTML first (security)
  let html = escapeHtml(text);

  // Fenced code blocks ```lang\n...\n```
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code class="language-${lang || 'text'}">${code.trim()}</code></pre>`;
  });

  // Inline code `code`
  html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');

  // Bold **text**
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic *text*
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Headers ### ## #
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Unordered list
  html = html.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

  // Ordered list
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  // Paragraphs (lines separated by blank lines)
  html = html.split(/\n{2,}/).map(block => {
    if (block.startsWith('<pre>') || block.startsWith('<ul>') ||
        block.startsWith('<ol>') || block.startsWith('<h')) {
      return block;
    }
    // Single newline → <br>
    return '<p>' + block.replace(/\n/g, '<br>') + '</p>';
  }).join('\n');

  return html;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ===== START =====
init();
