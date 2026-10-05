/**
 * ScholarForge AI — Academic Research & Citation Workstation
 * Client-Side Interactive Engine: SSE Streaming, OpenAlex Grounding, Library, KaTeX
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let groundedPapers = [];
    let currentPaperId = null;
    let copilotHistory = [];
    let isStreaming = false;

    // --- ELEMENT SELECTORS ---
    const tabs = document.querySelectorAll('.tab-btn');
    const panels = document.querySelectorAll('.tab-panel');

    // Manuscript Studio Elements
    const topicInput = document.getElementById('topic-input');
    const topicCharCount = document.getElementById('topic-char-count');
    const languageSelect = document.getElementById('language-select');
    const citationStyleSelect = document.getElementById('citation-style-select');
    const generatePaperBtn = document.getElementById('generate-paper-btn');
    const generateIcon = document.getElementById('generate-icon');
    const generateBtnText = document.getElementById('generate-btn-text');
    const streamingProgressBar = document.getElementById('streaming-progress-bar');
    const trendingTopics = document.getElementById('trending-topics');
    const groundingTray = document.getElementById('grounding-tray');
    const groundedChipsList = document.getElementById('grounded-chips-list');
    const groundedCount = document.getElementById('grounded-count');
    const clearGroundedBtn = document.getElementById('clear-grounded-btn');

    // Editor & Preview Elements
    const paperEditor = document.getElementById('paper-editor');
    const paperPreview = document.getElementById('paper-preview');
    const wordCountSpan = document.getElementById('word-count');
    const readTimeSpan = document.getElementById('read-time');
    const toggleViewBtn = document.getElementById('toggle-view-btn');
    const viewModeText = document.getElementById('view-mode-text');
    const downloadFormatSelect = document.getElementById('download-format-select');
    const downloadBtn = document.getElementById('download-btn');
    const saveLibraryBtn = document.getElementById('save-library-btn');
    const copyPaperBtn = document.getElementById('copy-paper-btn');
    const clearPaperBtn = document.getElementById('clear-paper-btn');

    // Literature Search Elements
    const searchInput = document.getElementById('search-input');
    const searchPapersBtn = document.getElementById('search-papers-btn');
    const searchResultsContainer = document.getElementById('search-results-container');
    const searchTabTriggerBtn = document.getElementById('search-tab-trigger-btn');
    const quickStartBtn = document.getElementById('quick-start-btn');

    // Citation Engine Elements
    const citationSourceInput = document.getElementById('citation-source-input');
    const citationFormatStyle = document.getElementById('citation-format-style');
    const formatCitationBtn = document.getElementById('format-citation-btn');
    const citationOutputBox = document.getElementById('citation-output-box');
    const copyCitationBtn = document.getElementById('copy-citation-btn');

    // Library Elements
    const openLibraryBtn = document.getElementById('open-library-btn');
    const refreshLibraryBtn = document.getElementById('refresh-library-btn');
    const libraryPapersList = document.getElementById('library-papers-list');
    const libraryCitationsList = document.getElementById('library-citations-list');

    // Toast & Copilot Elements
    const statusToast = document.getElementById('status-toast');
    const toastMessage = document.getElementById('toast-message');
    const toastIcon = document.getElementById('toast-icon');
    const closeToastBtn = document.getElementById('close-toast-btn');

    const copilotToggleBtn = document.getElementById('copilot-toggle-btn');
    const copilotWindow = document.getElementById('copilot-window');
    const closeCopilotBtn = document.getElementById('close-copilot-btn');
    const copilotMessages = document.getElementById('copilot-messages');
    const copilotInput = document.getElementById('copilot-input');
    const copilotSendBtn = document.getElementById('copilot-send-btn');

    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');

    // --- TAB SWITCHING LOGIC ---
    function switchTab(tabId) {
        tabs.forEach(tab => {
            if (tab.id === tabId) {
                tab.classList.add('border-slate-900', 'dark:border-sky-400', 'text-slate-900', 'dark:text-sky-400', 'font-bold');
                tab.classList.remove('border-transparent', 'text-slate-500');
            } else {
                tab.classList.remove('border-slate-900', 'dark:border-sky-400', 'text-slate-900', 'dark:text-sky-400', 'font-bold');
                tab.classList.add('border-transparent', 'text-slate-500');
            }
        });

        const targetPanelId = tabId.replace('tab-', 'panel-');
        panels.forEach(p => {
            if (p.id === targetPanelId) {
                p.classList.remove('hidden');
            } else {
                p.classList.add('hidden');
            }
        });

        if (tabId === 'tab-library') {
            loadLibrary();
        }
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.id));
    });

    if (searchTabTriggerBtn) searchTabTriggerBtn.addEventListener('click', () => switchTab('tab-search'));
    if (quickStartBtn) quickStartBtn.addEventListener('click', () => {
        switchTab('tab-generate');
        topicInput.focus();
    });
    if (openLibraryBtn) openLibraryBtn.addEventListener('click', () => switchTab('tab-library'));

    // --- TOAST NOTIFICATIONS ---
    function showToast(message, type = 'info') {
        if (!statusToast) return;
        toastMessage.textContent = message;
        statusToast.classList.remove('hidden', 'bg-rose-50', 'text-rose-900', 'bg-emerald-50', 'text-emerald-900', 'bg-sky-50', 'text-sky-900');
        
        if (type === 'error') {
            statusToast.classList.add('bg-rose-50', 'text-rose-900');
            toastIcon.className = 'fa-solid fa-circle-exclamation text-rose-600';
        } else if (type === 'success') {
            statusToast.classList.add('bg-emerald-50', 'text-emerald-900');
            toastIcon.className = 'fa-solid fa-circle-check text-emerald-600';
        } else {
            statusToast.classList.add('bg-sky-50', 'text-sky-900');
            toastIcon.className = 'fa-solid fa-circle-info text-sky-600';
        }

        setTimeout(() => {
            statusToast.classList.add('hidden');
        }, 5000);
    }
    if (closeToastBtn) closeToastBtn.addEventListener('click', () => statusToast.classList.add('hidden'));

    // --- TOPIC & WORD METRICS ---
    function updateMetrics() {
        const text = paperEditor.value || '';
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        const readTime = Math.ceil(words / 200); // Average academic reading speed
        wordCountSpan.textContent = words.toLocaleString();
        readTimeSpan.textContent = `${readTime} min`;
    }

    if (topicInput) {
        topicInput.addEventListener('input', () => {
            topicCharCount.textContent = `${topicInput.value.length} characters`;
        });
    }

    if (trendingTopics) {
        trendingTopics.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                topicInput.value = btn.textContent;
                topicCharCount.textContent = `${topicInput.value.length} characters`;
            });
        });
    }

    if (paperEditor) {
        paperEditor.addEventListener('input', updateMetrics);
    }

    // --- GROUNDING TRAY MANAGEMENT ---
    function renderGroundingTray() {
        if (!groundingTray) return;
        if (groundedPapers.length === 0) {
            groundingTray.classList.add('hidden');
            groundedChipsList.innerHTML = '';
            return;
        }

        groundingTray.classList.remove('hidden');
        groundedCount.textContent = groundedPapers.length;
        groundedChipsList.innerHTML = '';

        groundedPapers.forEach((paper, idx) => {
            const chip = document.createElement('div');
            chip.className = 'inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-900 dark:text-sky-200 border border-sky-300 dark:border-sky-800';
            chip.innerHTML = `
                <i class="fa-solid fa-check text-sky-500"></i>
                <span class="font-semibold truncate max-w-[200px]" title="${paper.title}">${paper.title}</span>
                <span class="text-xs opacity-75">(${paper.year})</span>
                <button class="remove-chip-btn text-slate-400 hover:text-rose-600 ml-1" data-idx="${idx}"><i class="fa-solid fa-xmark"></i></button>
            `;
            groundedChipsList.appendChild(chip);
        });

        groundedChipsList.querySelectorAll('.remove-chip-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(btn.getAttribute('data-idx'));
                groundedPapers.splice(idx, 1);
                renderGroundingTray();
            });
        });
    }

    if (clearGroundedBtn) {
        clearGroundedBtn.addEventListener('click', () => {
            groundedPapers = [];
            renderGroundingTray();
        });
    }

    // --- REAL-TIME SSE STREAMING MANUSCRIPT GENERATION ---
    async function streamGeneratePaper() {
        const topic = topicInput.value.trim();
        if (!topic) {
            showToast('Please enter a research topic or thesis scope first.', 'error');
            topicInput.focus();
            return;
        }

        if (isStreaming) return;
        isStreaming = true;

        // UI Loading States
        generatePaperBtn.disabled = true;
        generateIcon.className = 'fa-solid fa-spinner fa-spin';
        generateBtnText.textContent = 'Synthesizing Manuscript...';
        paperEditor.value = '';
        updateMetrics();
        streamingProgressBar.style.width = '25%';

        showToast('Initiating academic model streaming...', 'info');

        try {
            const response = await fetch('/generate-stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic: topic,
                    language: languageSelect.value,
                    style: citationStyleSelect.value,
                    grounded_papers: groundedPapers
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Server returned ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';

            streamingProgressBar.style.width = '60%';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop(); // Keep partial line

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.text) {
                                paperEditor.value += data.text;
                                updateMetrics();
                                paperEditor.scrollTop = paperEditor.scrollHeight;
                            }
                            if (data.error) {
                                showToast(`Model generation error: ${data.error}`, 'error');
                            }
                        } catch (e) {
                            // Non-json SSE data line
                        }
                    }
                }
            }

            streamingProgressBar.style.width = '100%';
            showToast('Manuscript generation completed successfully!', 'success');
            setTimeout(() => { streamingProgressBar.style.width = '0%'; }, 600);

            // Auto-render preview if toggled
            if (!paperPreview.classList.contains('hidden')) {
                renderPreview();
            }

        } catch (error) {
            showToast(`Streaming failed: ${error.message}`, 'error');
        } finally {
            isStreaming = false;
            generatePaperBtn.disabled = false;
            generateIcon.className = 'fa-solid fa-wand-magic-sparkles';
            generateBtnText.textContent = 'Generate Full Manuscript';
        }
    }

    if (generatePaperBtn) generatePaperBtn.addEventListener('click', streamGeneratePaper);

    // --- PREVIEW & KATEX MATH RENDERING ---
    function renderPreview() {
        if (!paperEditor.value) return;
        if (window.marked) {
            paperPreview.innerHTML = marked.parse(paperEditor.value);
            // Render LaTeX formulas with KaTeX auto-render if available
            if (window.renderMathInElement) {
                try {
                    renderMathInElement(paperPreview, {
                        delimiters: [
                            { left: '$$', right: '$$', display: true },
                            { left: '$', right: '$', display: false }
                        ],
                        throwOnError: false
                    });
                } catch (e) {
                    console.warn('KaTeX render warning:', e);
                }
            }
        }
    }

    function toggleView() {
        const isPreviewActive = !paperPreview.classList.contains('hidden');
        if (isPreviewActive) {
            paperPreview.classList.add('hidden');
            paperEditor.classList.remove('hidden');
            viewModeText.textContent = 'Preview';
        } else {
            renderPreview();
            paperEditor.classList.add('hidden');
            paperPreview.classList.remove('hidden');
            viewModeText.textContent = 'Editor';
        }
    }

    if (toggleViewBtn) toggleViewBtn.addEventListener('click', toggleView);

    // --- COPY & CLEAR ---
    if (copyPaperBtn) {
        copyPaperBtn.addEventListener('click', () => {
            if (paperEditor.value) {
                navigator.clipboard.writeText(paperEditor.value);
                showToast('Manuscript Markdown copied to clipboard!', 'success');
            }
        });
    }

    if (clearPaperBtn) {
        clearPaperBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear the canvas?')) {
                paperEditor.value = '';
                paperPreview.innerHTML = '';
                currentPaperId = null;
                updateMetrics();
                showToast('Canvas cleared.', 'info');
            }
        });
    }

    // --- DOWNLOAD PIPELINE ---
    async function downloadDocument() {
        const content = paperEditor.value;
        const format = downloadFormatSelect.value;
        const topic = topicInput.value.trim() || 'Research_Paper';

        if (!content) {
            showToast('Please generate or write a manuscript before downloading.', 'error');
            return;
        }

        downloadBtn.disabled = true;
        showToast(`Compiling ${format.toUpperCase()} document...`, 'info');

        try {
            const response = await fetch('/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: content,
                    format: format,
                    title: topic
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Download compilation failed');
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = downloadUrl;
            
            // Map extensions
            const extMap = { pdf: 'pdf', docx: 'docx', latex: 'tex', md: 'md', txt: 'txt' };
            const ext = extMap[format] || format;
            a.download = `${topic.slice(0, 30).replace(/[^a-zA-Z0-9_-]/g, '_')}.${ext}`;
            
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            a.remove();

            showToast(`Document downloaded as .${ext}`, 'success');
        } catch (error) {
            showToast(`Download error: ${error.message}`, 'error');
        } finally {
            downloadBtn.disabled = false;
        }
    }

    if (downloadBtn) downloadBtn.addEventListener('click', downloadDocument);

    // --- SAVE TO USER LIBRARY ---
    async function savePaperToLibrary() {
        const content = paperEditor.value;
        const topic = topicInput.value.trim() || 'Untitled Topic';
        // Extract title from first # heading or default
        const match = content.match(/^#\s+(.+)$/m);
        const title = match ? match[1].trim() : topic;

        if (!content) {
            showToast('Canvas is empty. Nothing to save.', 'error');
            return;
        }

        try {
            const response = await fetch('/api/papers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: currentPaperId,
                    title: title,
                    topic: topic,
                    language: languageSelect.value,
                    citation_style: citationStyleSelect.value,
                    content: content
                })
            });

            const result = await response.json();
            if (result.success) {
                currentPaperId = result.paper.id;
                showToast(result.message, 'success');
            } else {
                showToast(`Save failed: ${result.message}`, 'error');
            }
        } catch (error) {
            showToast(`Error saving paper: ${error.message}`, 'error');
        }
    }

    if (saveLibraryBtn) saveLibraryBtn.addEventListener('click', savePaperToLibrary);

    // --- VERIFIED LITERATURE SEARCH (OpenAlex + CrossRef) ---
    async function performScholarlySearch() {
        const query = searchInput.value.trim();
        if (!query) {
            showToast('Please enter search terms.', 'error');
            return;
        }

        searchPapersBtn.disabled = true;
        searchPapersBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Searching 250M+ Papers...';
        searchResultsContainer.innerHTML = `
            <div class="p-8 text-center text-slate-500">
                <i class="fa-solid fa-circle-notch fa-spin text-3xl mb-3 text-sky-500 block"></i>
                Querying scholarly knowledge graphs...
            </div>
        `;

        try {
            const response = await fetch('/find-papers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic: query })
            });

            const data = await response.json();
            if (!data.success || !data.papers || data.papers.length === 0) {
                searchResultsContainer.innerHTML = `
                    <div class="p-8 text-center text-slate-400">
                        <i class="fa-solid fa-triangle-exclamation text-3xl mb-2 text-amber-500 block"></i>
                        No papers found for "${query}". Try broader scientific keywords.
                    </div>
                `;
                return;
            }

            searchResultsContainer.innerHTML = '';
            data.papers.forEach(paper => {
                const card = document.createElement('div');
                card.className = 'sketch-card p-5 rounded-xl space-y-3';
                const authorsStr = (paper.authors && paper.authors.length > 0) ? paper.authors.join(', ') : 'Unknown Authors';
                
                card.innerHTML = `
                    <div class="flex items-start justify-between gap-3">
                        <h4 class="font-bold text-base text-slate-900 dark:text-white leading-snug">
                            ${paper.doi ? `<a href="${paper.doi}" target="_blank" rel="noopener" class="hover:text-sky-500 hover:underline">${paper.title}</a>` : paper.title}
                        </h4>
                        <span class="px-2.5 py-0.5 rounded text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            ${paper.year}
                        </span>
                    </div>

                    <div class="text-xs text-slate-500 font-medium">
                        <i class="fa-solid fa-user-group text-slate-400 mr-1"></i> ${authorsStr}
                    </div>

                    <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        ${paper.abstract}
                    </p>

                    <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div class="flex items-center space-x-3 text-xs">
                            <span class="text-slate-500"><i class="fa-solid fa-quote-left text-sky-500 mr-1"></i> ${paper.citations} citations</span>
                            ${paper.doi ? `<a href="${paper.doi}" target="_blank" rel="noopener" class="text-sky-600 hover:underline"><i class="fa-solid fa-barcode mr-1"></i> DOI</a>` : ''}
                            ${paper.is_oa && paper.oa_url ? `<a href="${paper.oa_url}" target="_blank" rel="noopener" class="text-emerald-600 hover:underline font-semibold"><i class="fa-solid fa-lock-open mr-1"></i> Open Access PDF</a>` : ''}
                        </div>

                        <div class="flex items-center space-x-2">
                            <button class="cite-this-btn sketch-btn px-3 py-1 rounded text-xs" data-title="${encodeURIComponent(paper.title)}" data-doi="${encodeURIComponent(paper.doi || '')}" data-authors="${encodeURIComponent(authorsStr)}">
                                <i class="fa-solid fa-quote-right mr-1 text-sky-500"></i> Cite
                            </button>
                            <button class="ground-this-btn sketch-btn-primary px-3 py-1 rounded text-xs" data-json='${encodeURIComponent(JSON.stringify(paper))}'>
                                <i class="fa-solid fa-plus mr-1"></i> Ground Paper
                            </button>
                        </div>
                    </div>
                `;
                searchResultsContainer.appendChild(card);
            });

            // Attach event handlers to card buttons
            searchResultsContainer.querySelectorAll('.ground-this-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const paper = JSON.parse(decodeURIComponent(btn.getAttribute('data-json')));
                    if (!groundedPapers.some(p => p.title === paper.title)) {
                        groundedPapers.push(paper);
                        renderGroundingTray();
                        showToast(`"${paper.title.slice(0, 30)}..." attached to grounding tray!`, 'success');
                    } else {
                        showToast('Paper already attached to grounding tray.', 'info');
                    }
                });
            });

            searchResultsContainer.querySelectorAll('.cite-this-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const title = decodeURIComponent(btn.getAttribute('data-title'));
                    const doi = decodeURIComponent(btn.getAttribute('data-doi'));
                    const authors = decodeURIComponent(btn.getAttribute('data-authors'));
                    
                    citationSourceInput.value = `${title}. Authors: ${authors}. ${doi ? `DOI: ${doi}` : ''}`;
                    switchTab('tab-citation');
                    formatCitation();
                });
            });

        } catch (error) {
            searchResultsContainer.innerHTML = `
                <div class="p-8 text-center text-rose-500 font-semibold text-sm">
                    Search failed: ${error.message}
                </div>
            `;
        } finally {
            searchPapersBtn.disabled = false;
            searchPapersBtn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> <span>Search Scholarly Works</span>';
        }
    }

    if (searchPapersBtn) searchPapersBtn.addEventListener('click', performScholarlySearch);
    if (searchInput) searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') performScholarlySearch(); });

    // --- CITATION STUDIO ---
    async function formatCitation() {
        const source = citationSourceInput.value.trim();
        const style = citationFormatStyle.value;

        if (!source) {
            showToast('Please enter source details to format.', 'error');
            return;
        }

        formatCitationBtn.disabled = true;
        formatCitationBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Formatting...';

        try {
            const response = await fetch('/generate-citation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ source: source, style: style })
            });

            const result = await response.json();
            if (result.success) {
                citationOutputBox.value = result.citation;
                showToast(`Formatted in ${style} style and saved to Library!`, 'success');
            } else {
                showToast(`Citation failed: ${result.message}`, 'error');
            }
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
        } finally {
            formatCitationBtn.disabled = false;
            formatCitationBtn.innerHTML = '<i class="fa-solid fa-quote-left"></i> <span>Format & Save Citation</span>';
        }
    }

    if (formatCitationBtn) formatCitationBtn.addEventListener('click', formatCitation);
    if (copyCitationBtn) {
        copyCitationBtn.addEventListener('click', () => {
            if (citationOutputBox.value) {
                navigator.clipboard.writeText(citationOutputBox.value);
                showToast('Citation copied to clipboard!', 'success');
            }
        });
    }

    // --- RESEARCH LIBRARY (Saved Papers & Citations) ---
    async function loadLibrary() {
        try {
            // Load Papers
            const papersRes = await fetch('/api/papers');
            const papersData = await papersRes.json();
            
            if (papersData.success && papersData.papers.length > 0) {
                libraryPapersList.innerHTML = '';
                papersData.papers.forEach(p => {
                    const item = document.createElement('div');
                    item.className = 'p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-xs';
                    item.innerHTML = `
                        <div class="overflow-hidden mr-3">
                            <div class="font-bold text-slate-900 dark:text-white truncate">${p.title}</div>
                            <div class="text-slate-400 mt-0.5">${p.word_count.toLocaleString()} words &bull; ${p.created_at}</div>
                        </div>
                        <div class="flex items-center space-x-1.5 whitespace-nowrap">
                            <button class="load-paper-btn sketch-btn px-2.5 py-1 rounded text-xs" data-id="${p.id}" title="Load into Studio"><i class="fa-solid fa-folder-open text-sky-500"></i></button>
                            <button class="delete-paper-btn sketch-btn px-2.5 py-1 rounded text-xs text-rose-500" data-id="${p.id}" title="Delete"><i class="fa-solid fa-trash-can"></i></button>
                        </div>
                    `;
                    libraryPapersList.appendChild(item);
                });

                libraryPapersList.querySelectorAll('.load-paper-btn').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const id = btn.getAttribute('data-id');
                        const res = await fetch(`/api/papers/${id}`);
                        const d = await res.json();
                        if (d.success) {
                            currentPaperId = d.paper.id;
                            topicInput.value = d.paper.topic;
                            paperEditor.value = d.paper.content;
                            updateMetrics();
                            switchTab('tab-generate');
                            showToast(`Loaded "${d.paper.title}"`, 'success');
                        }
                    });
                });

                libraryPapersList.querySelectorAll('.delete-paper-btn').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        if (confirm('Delete this manuscript from your library?')) {
                            const id = btn.getAttribute('data-id');
                            await fetch(`/api/papers/${id}`, { method: 'DELETE' });
                            loadLibrary();
                            showToast('Manuscript deleted.', 'info');
                        }
                    });
                });
            } else {
                libraryPapersList.innerHTML = '<div class="text-xs text-slate-400 italic">No saved papers yet. Generate a paper and click Save.</div>';
            }

            // Load Citations
            const citRes = await fetch('/api/citations');
            const citData = await citRes.json();
            
            if (citData.success && citData.citations.length > 0) {
                libraryCitationsList.innerHTML = '';
                citData.citations.forEach(c => {
                    const item = document.createElement('div');
                    item.className = 'p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start justify-between text-xs';
                    item.innerHTML = `
                        <div class="mr-3 font-mono leading-relaxed text-slate-700 dark:text-slate-300">
                            <span class="font-bold text-sky-500">[${c.style}]</span> ${c.formatted_citation}
                        </div>
                        <div class="flex items-center space-x-1 whitespace-nowrap">
                            <button class="copy-cit-item-btn sketch-btn px-2 py-1 rounded" data-text="${encodeURIComponent(c.formatted_citation)}" title="Copy"><i class="fa-solid fa-copy"></i></button>
                            <button class="del-cit-item-btn sketch-btn px-2 py-1 rounded text-rose-500" data-id="${c.id}" title="Delete"><i class="fa-solid fa-trash-can"></i></button>
                        </div>
                    `;
                    libraryCitationsList.appendChild(item);
                });

                libraryCitationsList.querySelectorAll('.copy-cit-item-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        navigator.clipboard.writeText(decodeURIComponent(btn.getAttribute('data-text')));
                        showToast('Citation copied!', 'success');
                    });
                });

                libraryCitationsList.querySelectorAll('.del-cit-item-btn').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const id = btn.getAttribute('data-id');
                        await fetch(`/api/citations/${id}`, { method: 'DELETE' });
                        loadLibrary();
                    });
                });
            } else {
                libraryCitationsList.innerHTML = '<div class="text-xs text-slate-400 italic">No citations saved yet.</div>';
            }

        } catch (e) {
            console.error('Error loading library:', e);
        }
    }

    if (refreshLibraryBtn) refreshLibraryBtn.addEventListener('click', loadLibrary);

    // --- FLOATING AI COPILOT CHAT ---
    if (copilotToggleBtn) {
        copilotToggleBtn.addEventListener('click', () => {
            copilotWindow.classList.toggle('hidden');
            if (!copilotWindow.classList.contains('hidden')) {
                copilotInput.focus();
            }
        });
    }

    if (closeCopilotBtn) {
        closeCopilotBtn.addEventListener('click', () => {
            copilotWindow.classList.add('hidden');
        });
    }

    async function sendCopilotMessage() {
        const text = copilotInput.value.trim();
        if (!text) return;

        // Append user bubble
        const userDiv = document.createElement('div');
        userDiv.className = 'p-3 rounded-xl bg-slate-900 text-white dark:bg-sky-500 dark:text-slate-950 font-medium ml-6';
        userDiv.textContent = text;
        copilotMessages.appendChild(userDiv);
        copilotInput.value = '';
        copilotMessages.scrollTop = copilotMessages.scrollHeight;

        copilotSendBtn.disabled = true;

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text, history: copilotHistory })
            });

            const data = await response.json();
            const botDiv = document.createElement('div');
            botDiv.className = 'p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 mr-6';

            if (data.success) {
                botDiv.innerHTML = window.marked ? marked.parse(data.reply) : data.reply;
                copilotHistory.push({ role: 'user', parts: [{ text: text }] });
                copilotHistory.push({ role: 'model', parts: [{ text: data.reply }] });
            } else {
                botDiv.textContent = `Copilot error: ${data.message}`;
            }

            copilotMessages.appendChild(botDiv);
            copilotMessages.scrollTop = copilotMessages.scrollHeight;
        } catch (error) {
            const errDiv = document.createElement('div');
            errDiv.className = 'p-3 rounded-xl bg-rose-100 text-rose-800 mr-6';
            errDiv.textContent = `Network error: ${error.message}`;
            copilotMessages.appendChild(errDiv);
        } finally {
            copilotSendBtn.disabled = false;
        }
    }

    if (copilotSendBtn) copilotSendBtn.addEventListener('click', sendCopilotMessage);
    if (copilotInput) copilotInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendCopilotMessage(); });

    // --- THEME SWITCHER ---
    function setTheme(mode) {
        if (mode === 'dark') {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
            if (themeIcon) themeIcon.className = 'fa-solid fa-sun';
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
            if (themeIcon) themeIcon.className = 'fa-solid fa-moon';
        }
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentMode = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
            setTheme(currentMode);
        });
    }

    // Initialize Theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
});
