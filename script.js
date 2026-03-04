/* ============================================================
   script.js – Chat UI Controller
   ============================================================ */

(function () {
    'use strict';

    // DOM elements
    const chatMessages = document.getElementById('chat-messages');
    const chatMessagesContainer = document.getElementById('chat-messages-container');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const suggestions = document.getElementById('chat-suggestions');
    const newChatBtn = document.getElementById('new-chat-btn');
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const downloadChatBtn = document.getElementById('download-chat-btn');
    const micBtn = document.getElementById('micBtn');

    // Chat history
    const chatHistory = [];

    // ---------- Helpers ----------

    /** Returns a formatted time string (HH:MM AM/PM). */
    function getTimeStamp() {
        return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    /** Scrolls to the bottom of the chat area. */
    function scrollToBottom() {
        requestAnimationFrame(() => {
            if (chatMessagesContainer) {
                chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
            } else {
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
        });
    }

    // ---------- Rendering ----------

    /**
     * Appends a message bubble to the chat area.
     * @param {'bot'|'user'} sender
     * @param {string} html – HTML content for the bubble.
     */
    function addMessage(sender, html) {
        const wrapper = document.createElement('div');
        wrapper.classList.add('message', `message--${sender}`);

        const icon = document.createElement('div');
        icon.classList.add('message__icon');
        icon.textContent = sender === 'bot' ? '🤖' : '👤';

        const bubble = document.createElement('div');
        bubble.classList.add('message__bubble');
        bubble.innerHTML = html;

        // Timestamp
        const time = document.createElement('span');
        time.classList.add('message__time');
        time.textContent = getTimeStamp();
        bubble.appendChild(time);

        wrapper.appendChild(icon);
        wrapper.appendChild(bubble);
        chatMessages.appendChild(wrapper);

        // Store in history
        chatHistory.push({ sender, html, time: getTimeStamp() });

        scrollToBottom();
    }

    /** Shows a typing indicator, then calls `callback` after a delay. */
    function showTyping(callback) {
        const wrapper = document.createElement('div');
        wrapper.classList.add('message', 'message--bot');
        wrapper.id = 'typing-msg';

        const icon = document.createElement('div');
        icon.classList.add('message__icon');
        icon.textContent = '🤖';

        const bubble = document.createElement('div');
        bubble.classList.add('message__bubble');
        bubble.innerHTML = `
      <div class="typing-indicator">
        <span></span><span></span><span></span>
      </div>`;

        wrapper.appendChild(icon);
        wrapper.appendChild(bubble);
        chatMessages.appendChild(wrapper);
        scrollToBottom();

        // Simulate bot "thinking"
        const delay = 600 + Math.random() * 600;
        setTimeout(() => {
            const el = document.getElementById('typing-msg');
            if (el) el.remove();
            callback();
        }, delay);
    }

    // ---------- User Input Handling ----------

    function handleUserMessage(text) {
        if (!text.trim()) return;

        // Hide suggestions after first real message
        if (suggestions) suggestions.style.display = 'none';

        // 1. Render user message
        addMessage('user', `<p>${escapeHtml(text)}</p>`);

        if (window.firebaseAPI) {
            window.firebaseAPI.saveMessage(sessionCounter.toString(), 'user', text);
        }

        // 2. Fire event so sidebar can rename the active history entry
        document.dispatchEvent(new CustomEvent('user-message-sent', { detail: { text } }));

        // 3. Disable input while bot "types"
        chatInput.disabled = true;

        // 4. Analyze & respond
        showTyping(() => {
            const result = analyzeIssue(text);
            const botHtml = formatBotResponse(result);
            addMessage('bot', botHtml);

            if (window.firebaseAPI) {
                window.firebaseAPI.saveMessage(sessionCounter.toString(), 'bot', result.solution || 'Response');
            }

            chatInput.disabled = false;
            chatInput.focus();
        });
    }

    /** Basic HTML escaping for user input. */
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ---------- Voice Assistant ----------
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = "en-US";
        recognition.continuous = false;
        recognition.interimResults = false;

        if (micBtn) {
            micBtn.addEventListener('click', () => {
                micBtn.classList.add('mic-active');
                chatInput.placeholder = "Listening...";
                recognition.start();
            });
        }

        recognition.onresult = function (event) {
            const transcript = event.results[0][0].transcript;
            chatInput.value = '';
            micBtn.classList.remove('mic-active');
            chatInput.placeholder = "Message IT Support...";

            // Auto submit the recognized text
            handleUserMessage(transcript);
        };

        recognition.onerror = function () {
            console.warn("Voice recognition error");
            micBtn.classList.remove('mic-active');
            chatInput.placeholder = "Message IT Support...";
        };

        recognition.onend = function () {
            micBtn.classList.remove('mic-active');
            chatInput.placeholder = "Message IT Support...";
        };
    } else {
        if (micBtn) micBtn.style.display = 'none'; // Hide if not supported
    }

    // ---------- Event Listeners ----------

    // Form submit
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = chatInput.value.trim();
        chatInput.value = '';
        handleUserMessage(text);
    });

    // Suggestion chips
    if (suggestions) {
        suggestions.addEventListener('click', (e) => {
            const chip = e.target.closest('.suggestion-chip');
            if (!chip) return;
            const query = chip.dataset.query;
            chatInput.value = query;
            handleUserMessage(query);
        });
    }

    // ---------- Chat Download ----------

    /**
     * Converts all visible chat messages to plain text and downloads as a .txt file.
     */
    function downloadChat() {
        const messages = chatMessages.querySelectorAll('.message');

        if (!messages.length) {
            alert('No chat messages to download yet!');
            return;
        }

        // Get the current session title from the active sidebar item
        const activeItem = document.querySelector('.history-item.active span');
        const sessionTitle = activeItem ? activeItem.textContent.trim() : 'IT-Support-Chat';
        const dateStr = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');

        let output = '';
        output += '================================================\n';
        output += '       IT Support Helpdesk – Chat Transcript\n';
        output += '================================================\n';
        output += `Session : ${sessionTitle}\n`;
        output += `Date    : ${new Date().toLocaleString()}\n`;
        output += '================================================\n\n';

        messages.forEach(msg => {
            const isBot = msg.classList.contains('message--bot');
            const sender = isBot ? '🤖 IT Support Bot' : '👤 You';

            // Get the timestamp span text
            const timeEl = msg.querySelector('.message__time');
            const time = timeEl ? timeEl.textContent.trim() : '';

            // Get clean text from the bubble (excluding the timestamp)
            const bubble = msg.querySelector('.message__bubble');
            if (!bubble) return;

            // Clone bubble & remove time element so we don't repeat it
            const bubbleClone = bubble.cloneNode(true);
            const timeClone = bubbleClone.querySelector('.message__time');
            if (timeClone) timeClone.remove();

            // Convert ordered list items to numbered text
            bubbleClone.querySelectorAll('ol li').forEach((li, i) => {
                li.textContent = `  ${i + 1}. ${li.textContent.trim()}`;
            });

            const text = bubbleClone.innerText || bubbleClone.textContent || '';

            output += `[${time}] ${sender}\n`;
            output += `${'─'.repeat(40)}\n`;
            output += `${text.trim()}\n\n`;
        });

        output += '================================================\n';
        output += 'End of transcript\n';
        output += '================================================\n';

        // Trigger download
        const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${sessionTitle.replace(/[^a-z0-9]/gi, '_')}_${dateStr}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    if (downloadChatBtn) {
        downloadChatBtn.addEventListener('click', downloadChat);
    }

    // ---------- Session Store ----------
    // Stores chat snapshots by sessionId: { html, title }
    const sessionStore = {};
    const historyGroup = document.getElementById('history-group');
    let sessionCounter = "session_" + Date.now(); // Current active session ID

    /** Saves the current chat state to the store. */
    function saveCurrentSession() {
        const activeItem = historyGroup.querySelector('.history-item.active');
        const title = activeItem ? activeItem.querySelector('span').textContent : 'IT Support Assistant';
        sessionStore[sessionCounter] = {
            html: chatMessages.innerHTML,
            title,
            hasMessages: chatMessages.innerHTML.trim() !== ''
        };
    }

    /** Switches to a different session by restoring its snapshot. */
    function switchToSession(targetId) {
        // Save current session first
        saveCurrentSession();

        // Mark history items
        historyGroup.querySelectorAll('.history-item').forEach(el => {
            el.classList.toggle('active', el.dataset.sessionId === targetId.toString());
        });

        // Restore the target session
        const target = sessionStore[targetId];
        if (target && target.html) {
            chatMessages.innerHTML = target.html;
            if (suggestions) suggestions.style.display = 'none';
            scrollToBottom();
        } else {
            // Brand-new blank session or loading from Firebase
            chatMessages.innerHTML = '';

            if (window.firebaseAPI) {
                window.firebaseAPI.loadMessages(targetId.toString()).then(msgs => {
                    if (msgs.length > 0) {
                        chatMessages.innerHTML = '';
                        msgs.forEach(msg => {
                            const html = msg.sender === 'user' ? `<p>${escapeHtml(msg.text)}</p>` : formatBotResponse({ solution: msg.text });
                            addMessage(msg.sender, html);
                        });
                        if (suggestions) suggestions.style.display = 'none';
                        scrollToBottom();
                    } else {
                        if (suggestions) suggestions.style.display = 'flex';
                        showGreeting();
                    }
                });
            } else {
                if (suggestions) suggestions.style.display = 'flex';
                showGreeting();
            }
        }

        sessionCounter = targetId;
        scrollToBottom();
    }

    /**
     * Creates a history item in the sidebar and wires up its click handler.
     * @param {string} label - Display label for the chat.
     * @param {number} sessionId - Unique ID for the session.
     */
    function addToRecents(label, sessionId) {
        const item = document.createElement('div');
        item.className = 'history-item active';
        item.dataset.sessionId = sessionId;
        item.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <span>${label}</span>`;

        item.addEventListener('click', () => switchToSession(sessionId));

        // Insert at the top, just after the "Recent" label
        const labelEl = historyGroup.querySelector('.history-label');
        labelEl.insertAdjacentElement('afterend', item);
    }

    // Wire up the initial "IT Support Assistant" item (session 0)
    const initialItem = historyGroup.querySelector('.history-item[data-session-id="0"]');
    if (initialItem) {
        initialItem.addEventListener('click', () => switchToSession(0));
    }

    // When user sends first message, rename the current session's history entry
    document.addEventListener('user-message-sent', (e) => {
        const activeItem = historyGroup.querySelector('.history-item.active');
        if (activeItem) {
            const span = activeItem.querySelector('span');
            if (span && span.textContent === 'New Chat') {
                const newTitle = e.detail.text.slice(0, 28) || 'Chat Session';
                span.textContent = newTitle;
                if (window.firebaseAPI) {
                    window.firebaseAPI.createOrUpdateSession(sessionCounter.toString(), newTitle);
                }
            }
        }
    });

    // New Chat
    if (newChatBtn) {
        newChatBtn.addEventListener('click', () => {
            // Save current session snapshot
            saveCurrentSession();

            // Start new session
            sessionCounter = "session_" + Date.now();
            const newId = sessionCounter;
            chatMessages.innerHTML = '';
            chatHistory.length = 0;
            if (suggestions) suggestions.style.display = 'flex';
            showGreeting();

            // Save the initial greeting for this new session
            sessionStore[newId] = { html: chatMessages.innerHTML, title: 'New Chat', hasMessages: false };

            // Deactivate all items
            historyGroup.querySelectorAll('.history-item').forEach(el => el.classList.remove('active'));

            // Insert new session at the top of recents
            addToRecents('New Chat', newId);

            // Close sidebar on mobile
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('active');
                sidebarOverlay.classList.remove('active');
            }
        });
    }

    // Sidebar Toggle (Mobile)
    if (menuToggle && sidebar && sidebarOverlay) {
        const toggleSidebar = () => {
            sidebar.classList.toggle('active');
            sidebarOverlay.classList.toggle('active');
        };

        menuToggle.addEventListener('click', toggleSidebar);
        sidebarOverlay.addEventListener('click', toggleSidebar);

        // Close sidebar when clicking a history item on mobile
        sidebar.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && e.target.closest('.history-item')) {
                sidebar.classList.remove('active');
                sidebarOverlay.classList.remove('active');
            }
        });
    }

    // ---------- Greeting on Load ----------

    function showGreeting() {
        const greetingHtml = `
      <p>Hello! 👋 I'm your <strong>IT Support Assistant</strong>.</p>
      <p>Please describe the issue you're facing and I'll help you troubleshoot it. You can mention things like:</p>
      <ol>
        <li>WiFi or internet problems</li>
        <li>Keyboard, mouse, or printer issues</li>
        <li>Application errors or crashes</li>
      </ol>
      <p>Type or <strong>say</strong> your issue below, or click a quick suggestion to get started!</p>`;
        addMessage('bot', greetingHtml);
    }

    // ---------- Global Functions ----------

    /** 
     * Handled globally so inline onclick handlers in bot messages can trigger it. 
     */
    window.issueSolved = function (status) {
        // Disable the buttons in the most recent solution check to prevent spamming
        const allChecks = chatMessages.querySelectorAll('.solution-check');
        if (allChecks.length > 0) {
            const lastCheck = allChecks[allChecks.length - 1];
            lastCheck.style.pointerEvents = 'none';
            lastCheck.style.opacity = '0.7';
            lastCheck.innerHTML = `<span class="solution-text">${status ? 'Resolved 👍' : 'Not Resolved 👎'}</span>`;
        }

        // Add follow-up bot response
        if (status) {
            addMessage('bot', `<p>Great! I'm glad your issue is resolved. Let me know if you need anything else.</p>`);
        } else {
            addMessage('bot', `<p>Sorry about that. Please contact the <strong>IT support team</strong> for further assistance.</p>`);
        }
    };

    // Init
    if (window.firebaseAPI) {
        window.firebaseAPI.loadAllSessions().then(sessions => {
            if (sessions.length > 0) {
                // Clear placeholder history
                historyGroup.querySelectorAll('.history-item').forEach(el => el.remove());

                // Add sessions to sidebar (ordered newest first)
                sessions.forEach((s, idx) => {
                    const item = document.createElement('div');
                    item.className = 'history-item';
                    if (idx === 0) item.classList.add('active');
                    item.dataset.sessionId = s.id;
                    item.innerHTML = `
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                        <span>${s.title}</span>`;
                    item.addEventListener('click', () => switchToSession(s.id));
                    historyGroup.appendChild(item);
                });

                // Load newest session messages
                switchToSession(sessions[0].id);
            } else {
                showGreeting();
            }
        });
    } else {
        showGreeting();
    }
    chatInput.focus();

})();
