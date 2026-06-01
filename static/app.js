// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const uploadProgress = document.getElementById('uploadProgress');
const resultSection = document.getElementById('resultSection');
const resultContent = document.getElementById('resultContent');
const errorSection = document.getElementById('errorSection');
const errorMessage = document.getElementById('errorMessage');

// Drag and drop
uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#764ba2';
    uploadArea.style.background = '#f0f2ff';
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.style.borderColor = '#667eea';
    uploadArea.style.background = '#f8f9ff';
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        fileInput.files = files;
        handleFileUpload();
    }
});

fileInput.addEventListener('change', handleFileUpload);

function handleFileUpload() {
    const file = fileInput.files[0];
    if (!file) return;

    // Verifica tipo di file
    if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
        showError('Formato file non supportato. Usa JPG, PNG o GIF.');
        return;
    }

    // Verifica dimensione
    if (file.size > 16 * 1024 * 1024) {
        showError('File troppo grande. Massimo 16MB.');
        return;
    }

    uploadFile(file);
}

async function uploadFile(file) {
    showProgress();

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            displayBook(data.book);
            loadHistory();
        } else {
            showError(data.error || 'Errore durante l\'elaborazione');
        }
    } catch (error) {
        showError('Errore di rete: ' + error.message);
    } finally {
        hideProgress();
    }
}

function displayBook(book) {
    let html = `
        <div class="book-card">
            <div class="book-cover">
                ${book.image_url ? 
                    `<img src="${book.image_url}" alt="${book.title}">` :
                    `<div class="book-cover no-image">📚</div>`
                }
            </div>
            <div class="book-info">
                <h2>${escapeHtml(book.title)}</h2>
                <div class="book-detail">
                    <strong>Autore:</strong> ${escapeHtml(book.authors)}
                </div>
                <div class="book-detail">
                    <strong>Editore:</strong> ${escapeHtml(book.publisher)}
                </div>
                <div class="book-detail">
                    <strong>Pubblicato:</strong> ${escapeHtml(book.published_date)}
                </div>
                <div class="book-detail isbn">
                    📖 ISBN: ${book.isbn}
                </div>
                <div class="book-description">
                    ${escapeHtml(book.description)}
                </div>
                <span class="book-source">📍 ${book.source}</span>
                <div class="book-links">
                    ${book.preview_link ? 
                        `<a href="${book.preview_link}" target="_blank">Visualizza</a>` :
                        ''
                    }
                    <a href="https://www.google.com/search?q=${encodeURIComponent(book.title + ' ' + book.authors)}" target="_blank">Cerca Online</a>
                </div>
            </div>
        </div>
    `;

    resultContent.innerHTML = html;
    resultSection.classList.remove('hidden');
    errorSection.classList.add('hidden');
}

async function searchISBN() {
    const isbn = document.getElementById('isbnInput').value.trim();

    if (!isbn) {
        showManualError('Inserisci un ISBN valido');
        return;
    }

    const manualResultSection = document.getElementById('manualResultSection');
    const manualResultContent = document.getElementById('manualResultContent');
    const manualErrorSection = document.getElementById('manualErrorSection');

    try {
        const response = await fetch('/api/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ isbn })
        });

        const data = await response.json();

        if (response.ok) {
            let html = `
                <div class="book-card">
                    <div class="book-cover">
                        ${data.book.image_url ? 
                            `<img src="${data.book.image_url}" alt="${data.book.title}">` :
                            `<div class="book-cover no-image">📚</div>`
                        }
                    </div>
                    <div class="book-info">
                        <h2>${escapeHtml(data.book.title)}</h2>
                        <div class="book-detail">
                            <strong>Autore:</strong> ${escapeHtml(data.book.authors)}
                        </div>
                        <div class="book-detail">
                            <strong>Editore:</strong> ${escapeHtml(data.book.publisher)}
                        </div>
                        <div class="book-detail">
                            <strong>Pubblicato:</strong> ${escapeHtml(data.book.published_date)}
                        </div>
                        <div class="book-detail isbn">
                            📖 ISBN: ${data.book.isbn}
                        </div>
                        <div class="book-description">
                            ${escapeHtml(data.book.description)}
                        </div>
                        <span class="book-source">📍 ${data.book.source}</span>
                        <div class="book-links">
                            ${data.book.preview_link ? 
                                `<a href="${data.book.preview_link}" target="_blank">Visualizza</a>` :
                                ''
                            }
                            <a href="https://www.google.com/search?q=${encodeURIComponent(data.book.title + ' ' + data.book.authors)}" target="_blank">Cerca Online</a>
                        </div>
                    </div>
                </div>
            `;
            manualResultContent.innerHTML = html;
            manualResultSection.classList.remove('hidden');
            manualErrorSection.classList.add('hidden');
            loadHistory();
        } else {
            showManualError(data.error || 'Libro non trovato');
        }
    } catch (error) {
        showManualError('Errore di rete: ' + error.message);
    }
}

function showProgress() {
    uploadProgress.classList.remove('hidden');
    resultSection.classList.add('hidden');
    errorSection.classList.add('hidden');
}

function hideProgress() {
    uploadProgress.classList.add('hidden');
}

function showError(msg) {
    errorMessage.textContent = '❌ ' + msg;
    errorSection.classList.remove('hidden');
    resultSection.classList.add('hidden');
}

function showManualError(msg) {
    const manualErrorMessage = document.getElementById('manualErrorMessage');
    const manualErrorSection = document.getElementById('manualErrorSection');
    const manualResultSection = document.getElementById('manualResultSection');
    
    manualErrorMessage.textContent = '❌ ' + msg;
    manualErrorSection.classList.remove('hidden');
    manualResultSection.classList.add('hidden');
}

function resetForm() {
    fileInput.value = '';
    resultSection.classList.add('hidden');
    errorSection.classList.add('hidden');
    uploadProgress.classList.add('hidden');
}

function resetManualSearch() {
    document.getElementById('isbnInput').value = '';
    document.getElementById('manualResultSection').classList.add('hidden');
    document.getElementById('manualErrorSection').classList.add('hidden');
}

function switchTab(tab) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

    // Show selected tab
    document.getElementById(tab + '-tab').classList.add('active');
    event.target.classList.add('active');

    // Load history when history tab is clicked
    if (tab === 'history') {
        loadHistory();
    }
}

async function loadHistory() {
    try {
        const response = await fetch('/api/history');
        const history = await response.json();

        const historyContent = document.getElementById('historyContent');

        if (history.length === 0) {
            historyContent.innerHTML = '<p class="no-data">Nessuna ricerca ancora</p>';
            return;
        }

        let html = '';
        history.forEach(item => {
            const date = new Date(item.timestamp);
            const dateStr = date.toLocaleDateString('it-IT') + ' ' + date.toLocaleTimeString('it-IT', {hour: '2-digit', minute: '2-digit'});

            html += `
                <div class="history-item" onclick="searchFromHistory('${item.isbn}')">
                    <div class="history-title">${escapeHtml(item.title)}</div>
                    <div class="history-authors">${escapeHtml(item.authors)}</div>
                    <div class="history-isbn">ISBN: ${item.isbn}</div>
                    <div class="history-date">${dateStr}</div>
                </div>
            `;
        });

        historyContent.innerHTML = html;
    } catch (error) {
        console.error('Error loading history:', error);
    }
}

async function searchFromHistory(isbn) {
    document.getElementById('isbnInput').value = isbn;
    switchTab('manual');
    await searchISBN();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Load history on page load
document.addEventListener('DOMContentLoaded', loadHistory);

// Allow Enter key in search
document.getElementById('isbnInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchISBN();
    }
});