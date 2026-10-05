document.addEventListener('DOMContentLoaded', () => {

    // --- TAB SWITCHING LOGIC ---
    const tabs = document.querySelectorAll('.tab-btn');
    const panels = document.querySelectorAll('.tab-panel');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetPanelId = tab.id.replace('tab-', 'panel-');

            tabs.forEach(t => {
                t.classList.remove('border-blue-500', 'text-blue-600');
                t.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
            });
            panels.forEach(p => {
                p.classList.add('hidden');
            });

            tab.classList.add('border-blue-500', 'text-blue-600');
            tab.classList.remove('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
            document.getElementById(targetPanelId).classList.remove('hidden');
        });
    });

    // --- ELEMENT SELECTORS ---
    const generatePaperBtn = document.getElementById('generate-paper-btn');
    const downloadBtn = document.getElementById('download-btn');
    const findPapersBtn = document.getElementById('find-papers-btn');
    const generateCitationBtn = document.getElementById('generate-citation-btn');
    
    const topicInput = document.getElementById('topic-input');
    const languageSelect = document.getElementById('language-select');
    const paperOutput = document.getElementById('paper-output');
    const paperSpinner = document.getElementById('paper-spinner');
    const paperButtonText = document.getElementById('paper-button-text');
    const paperPreview = document.getElementById('paper-preview');
    const copyPaperBtn = document.getElementById('copy-paper-btn');
    const clearPaperBtn = document.getElementById('clear-paper-btn');
    const togglePreviewBtn = document.getElementById('toggle-preview-btn');
    const charCount = document.getElementById('topic-char-count');
    const progressBar = document.getElementById('progress-bar');
    const recentTopics = document.getElementById('recent-topics');
    const exampleTopics = document.getElementById('example-topics');

    const papersTopicInput = document.getElementById('papers-topic-input');
    const findPapersStyle = document.getElementById('find-papers-style');
    const papersOutput = document.getElementById('papers-output');
    
    const citationSourceInput = document.getElementById('citation-source-input');
    const citationEngineStyle = document.getElementById('citation-engine-style');
    const citationOutput = document.getElementById('citation-output');

    const downloadFormatSelect = document.getElementById('download-format-select');
    const messageBox = document.getElementById('message-box');
    
    const chatBubble = document.getElementById('chat-bubble');
    const chatWindow = document.getElementById('chat-window');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const chatSendBtn = document.getElementById('chat-send-btn');
    const themeToggle = document.getElementById('theme-toggle');
    const themeLabel = document.getElementById('theme-label');
    const iconSun = document.getElementById('icon-sun');
    const iconMoon = document.getElementById('icon-moon');
    const startWritingBtn = document.getElementById('start-writing-btn');
    
    let conversationHistory = [];

    // --- HELPER FUNCTIONS ---
    function showMessage(message, isError = false) {
        messageBox.textContent = message;
        let classes = 'p-4 mb-4 text-sm rounded-lg border';
        if (isError) {
            classes += ' bg-black text-white border-white';
        } else {
            classes += ' bg-white text-black border-black';
        }
        messageBox.className = classes;
    }

    // --- EVENT LISTENERS ---
    if (generatePaperBtn) generatePaperBtn.addEventListener('click', generatePaper);
    if (downloadBtn) downloadBtn.addEventListener('click', downloadPaper);
    if (findPapersBtn) findPapersBtn.addEventListener('click', findPapers);
    if (generateCitationBtn) generateCitationBtn.addEventListener('click', generateCitation);
    if (chatBubble) chatBubble.addEventListener('click', () => chatWindow.classList.toggle('hidden'));
    if (chatSendBtn) chatSendBtn.addEventListener('click', sendChatMessage);
    if (chatInput) chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendChatMessage(); });
    if (copyPaperBtn) copyPaperBtn.addEventListener('click', () => { if (paperOutput.value) navigator.clipboard.writeText(paperOutput.value); });
    if (clearPaperBtn) clearPaperBtn.addEventListener('click', () => { paperOutput.value = ''; paperPreview.classList.add('hidden'); paperOutput.classList.remove('hidden'); });
    if (togglePreviewBtn) togglePreviewBtn.addEventListener('click', togglePreview);
    if (topicInput) topicInput.addEventListener('input', () => { if (charCount) charCount.textContent = `${topicInput.value.length} characters`; });
    if (exampleTopics) exampleTopics.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { topicInput.value = b.textContent; if (charCount) charCount.textContent = `${topicInput.value.length} characters`; }));
    if (themeToggle) themeToggle.addEventListener('click', () => { const mode = document.documentElement.classList.contains('dark') ? 'light' : 'dark'; setTheme(mode); });
    if (startWritingBtn) startWritingBtn.addEventListener('click', () => { topicInput.focus(); topicInput.scrollIntoView({ behavior: 'smooth', block: 'center' }); topicInput.classList.add('ring-2','ring-blue-500'); setTimeout(() => topicInput.classList.remove('ring-2','ring-blue-500'), 800); });
    initializeTheme();
    renderRecentTopics();

    // --- API CALL FUNCTIONS ---
    async function generatePaper() {
        const topic = topicInput.value.trim();
        if (!topic) { showMessage('Please enter a research topic.', true); return; }
        
        showMessage('Generating paper... this may take some time.');
        generatePaperBtn.disabled = true;
        paperSpinner.classList.remove('hidden');
        paperButtonText.textContent = 'Generating...';
        if (progressBar) progressBar.style.width = '30%';

        try {
            const response = await fetch('/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic: topic, language: languageSelect.value })
            });
            const result = await response.json();
            if (result.success) {
                paperOutput.value = result.content;
                showMessage('Paper generated successfully!');
                saveRecentTopic(topic);
                renderRecentTopics();
                if (progressBar) progressBar.style.width = '100%';
                setTimeout(() => { if (progressBar) progressBar.style.width = '0%'; }, 600);
                generatePaperBtn.classList.add('ring-4','ring-black');
                setTimeout(() => generatePaperBtn.classList.remove('ring-4','ring-black'), 600);
            } else { showMessage(`Error: ${result.message}`, true); }
        } catch (error) { showMessage(`Network or server error: ${error.message}`, true); }
        finally {
            generatePaperBtn.disabled = false;
            paperSpinner.classList.add('hidden');
            paperButtonText.textContent = 'Generate Paper';
            if (progressBar) progressBar.style.width = '0%';
        }
    }

    async function downloadPaper() {
        const markdownContent = paperOutput.value;
        const format = downloadFormatSelect.value.toLowerCase();
        if (!markdownContent) { showMessage('Please generate a paper first before downloading.', true); return; }
        showMessage(`Preparing your ${format.toUpperCase()} download...`);
        downloadBtn.disabled = true;
        try {
            const response = await fetch('/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: markdownContent, format: format })
            });
            if (response.headers.get('Content-Type')?.includes('application/json')) {
                const errorResult = await response.json();
                showMessage(`Download failed: ${errorResult.message}`, true);
            } else if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `research_paper.${format}`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
                showMessage('Download started successfully!');
            } else { showMessage(`Download failed with status: ${response.status}`, true); }
        } catch (error) { showMessage(`Network or server error during download: ${error.message}`, true); }
        finally { downloadBtn.disabled = false; }
    }

    async function findPapers() {
        const topic = papersTopicInput.value.trim();
        if (!topic) { showMessage('Please enter a topic to find papers.', true); return; }
        showMessage('Finding related papers...');
        findPapersBtn.disabled = true;
        try {
            const response = await fetch('/find-papers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic: topic, style: findPapersStyle.value })
            });
            const result = await response.json();
            if (result.success) {
                papersOutput.value = result.bibliography;
                showMessage('Found a list of related papers!', false);
            } else { showMessage(`Error: ${result.message}`, true); }
        } catch (error) { showMessage(`Network or server error: ${error.message}`, true); }
        finally { findPapersBtn.disabled = false; }
    }

    async function generateCitation() {
        const source = citationSourceInput.value.trim();
        if (!source) { showMessage('Please enter source information to generate a citation.', true); return; }
        showMessage('Formatting citation...');
        generateCitationBtn.disabled = true;
        try {
            const response = await fetch('/generate-citation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ source: source, style: citationEngineStyle.value })
            });
            const result = await response.json();
            if (result.success) {
                citationOutput.value = result.citation;
                showMessage('Citation generated successfully!', false);
            } else { showMessage(`Error: ${result.message}`, true); }
        } catch (error) { showMessage(`Network or server error: ${error.message}`, true); }
        finally { generateCitationBtn.disabled = false; }
    }

    // --- CHATBOT FUNCTIONS ---
    function appendMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.textContent = text;
        messageDiv.className = sender === 'user' ?
            'bg-blue-100 text-blue-800 p-2 rounded-lg mb-2 text-right' :
            'bg-gray-200 text-gray-800 p-2 rounded-lg mb-2';
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async function sendChatMessage() {
        const message = chatInput.value.trim();
        if (!message) return;
        appendMessage(message, 'user');
        chatInput.value = '';
        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: message, history: conversationHistory })
            });
            const result = await response.json();
            if (result.success) {
                appendMessage(result.reply, 'assistant');
                conversationHistory.push({ role: 'user', parts: [{ text: message }] });
                conversationHistory.push({ role: 'model', parts: [{ text: result.reply }] });
            } else { appendMessage(`Error: ${result.message}`, 'assistant'); }
        } catch (error) { appendMessage(`Network or server error: ${error.message}`, 'assistant'); }
    }

    function togglePreview() {
        if (!paperOutput.value) return;
        const showingPreview = !paperPreview.classList.contains('hidden');
        if (showingPreview) {
            paperPreview.classList.add('hidden');
            paperOutput.classList.remove('hidden');
            togglePreviewBtn.textContent = 'Preview';
        } else {
            if (window.marked) paperPreview.innerHTML = marked.parse(paperOutput.value);
            paperPreview.classList.remove('hidden');
            paperOutput.classList.add('hidden');
            togglePreviewBtn.textContent = 'Editor';
        }
    }

    function saveRecentTopic(topic) {
        try {
            const key = 'recentTopics';
            const list = JSON.parse(localStorage.getItem(key) || '[]');
            const next = [topic, ...list.filter(t => t !== topic)].slice(0, 8);
            localStorage.setItem(key, JSON.stringify(next));
        } catch (e) {}
    }

    function renderRecentTopics() {
        if (!recentTopics) return;
        recentTopics.innerHTML = '';
        try {
            const list = JSON.parse(localStorage.getItem('recentTopics') || '[]');
            list.forEach(t => {
                const b = document.createElement('button');
                b.className = 'px-2 py-1 rounded-full bg-gray-100 text-gray-700';
                b.textContent = t;
                b.addEventListener('click', () => { topicInput.value = t; if (charCount) charCount.textContent = `${topicInput.value.length} characters`; generatePaper(); });
                recentTopics.appendChild(b);
            });
        } catch (e) {}
    }

    function setTheme(mode) {
        if (mode === 'dark') {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
            if (themeLabel) themeLabel.textContent = 'Dark';
            if (iconSun) iconSun.classList.add('hidden');
            if (iconMoon) iconMoon.classList.remove('hidden');
            showMessage('Theme: Dark mode enabled');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
            if (themeLabel) themeLabel.textContent = 'Light';
            if (iconSun) iconSun.classList.remove('hidden');
            if (iconMoon) iconMoon.classList.add('hidden');
            showMessage('Theme: Light mode enabled');
        }
    }

    function initializeTheme() {
        const stored = localStorage.getItem('theme') || 'light';
        setTheme(stored);
    }
});
