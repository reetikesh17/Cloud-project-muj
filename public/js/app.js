// Seed catalog for fallback / static preview mode
const FALLBACK_BOOKS = [
  {
    id: "b101",
    title: "Clean Code: A Handbook of Agile Software Craftsmanship",
    author: "Robert C. Martin",
    isbn: "978-0132350884",
    genre: "Software Engineering",
    publishedYear: 2008,
    totalCopies: 5,
    availableCopies: 3,
    description: "A handbook of agile craftsmanship focusing on writing clean, readable, and maintainable code.",
    createdAt: "2026-01-15T09:00:00.000Z"
  },
  {
    id: "b102",
    title: "Designing Data-Intensive Applications",
    author: "Martin Kleppmann",
    isbn: "978-1449373320",
    genre: "Distributed Systems",
    publishedYear: 2017,
    totalCopies: 4,
    availableCopies: 4,
    description: "The definitive guide to the architecture and principles of reliable, scalable, and maintainable data systems.",
    createdAt: "2026-01-20T10:30:00.000Z"
  },
  {
    id: "b103",
    title: "The Pragmatic Programmer: Your Journey To Mastery",
    author: "David Thomas, Andrew Hunt",
    isbn: "978-0135957059",
    genre: "Software Engineering",
    publishedYear: 2019,
    totalCopies: 6,
    availableCopies: 2,
    description: "Timeless advice for modern software craftsmanship, career growth, and pragmatic engineering practices.",
    createdAt: "2026-02-01T11:15:00.000Z"
  },
  {
    id: "b104",
    title: "Site Reliability Engineering: How Google Runs Production Systems",
    author: "Betsy Beyer, Chris Jones, Jennifer Petoff, Niall Murphy",
    isbn: "978-1491929124",
    genre: "DevOps & Cloud",
    publishedYear: 2016,
    totalCopies: 3,
    availableCopies: 1,
    description: "Insights and practices from Google on building, deploying, monitoring, and maintaining scalable production services.",
    createdAt: "2026-02-10T14:45:00.000Z"
  },
  {
    id: "b105",
    title: "Docker in Action, Second Edition",
    author: "Jeff Nickoloff, Stephen Kuenzli",
    isbn: "978-1617294761",
    genre: "DevOps & Cloud",
    publishedYear: 2019,
    totalCopies: 4,
    availableCopies: 4,
    description: "Hands-on guide to container packaging, multi-container orchestration, security, and production deployments.",
    createdAt: "2026-03-05T08:20:00.000Z"
  },
  {
    id: "b106",
    title: "Continuous Delivery: Reliable Software Releases",
    author: "Jez Humble, David Farley",
    isbn: "978-0321601919",
    genre: "CI/CD & DevOps",
    publishedYear: 2010,
    totalCopies: 3,
    availableCopies: 2,
    description: "The foundational blueprint for automated build pipelines, comprehensive testing, and low-risk releases.",
    createdAt: "2026-03-12T16:00:00.000Z"
  }
];

// State
let allBooks = [];
let isOfflineMode = false;
let currentFilter = {
  search: '',
  genre: 'all',
  availability: 'all'
};

// DOM Elements
const booksGrid = document.getElementById('booksGrid');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const genreFilter = document.getElementById('genreFilter');
const availabilityFilter = document.getElementById('availabilityFilter');
const catalogCounter = document.getElementById('catalogCounter');
const resetDemoBtn = document.getElementById('resetDemoBtn');

// Stats Elements
const statTotalTitles = document.getElementById('statTotalTitles');
const statAvailable = document.getElementById('statAvailable');
const statBorrowed = document.getElementById('statBorrowed');
const statUptime = document.getElementById('statUptime');
const healthPill = document.getElementById('healthPill');
const healthStatusText = document.getElementById('healthStatusText');

// Modal Elements
const bookModal = document.getElementById('bookModal');
const bookForm = document.getElementById('bookForm');
const openAddModalBtn = document.getElementById('openAddModalBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const toastContainer = document.getElementById('toastContainer');

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  // Start with fallback immediately so UI is NEVER empty
  allBooks = JSON.parse(JSON.stringify(FALLBACK_BOOKS));
  filterAndRenderBooks();
  updateStatsLocally();
  updateGenreDropdown();

  // Then attempt live API fetch and health probe
  fetchBooks();
  fetchStats();
  checkHealth();

  setInterval(checkHealth, 5000);
});

function initEventListeners() {
  let searchTimeout;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const val = e.target.value.trim();
    clearSearchBtn.style.display = val ? 'block' : 'none';
    searchTimeout = setTimeout(() => {
      currentFilter.search = val;
      if (isOfflineMode) {
        filterAndRenderBooks();
      } else {
        fetchBooks();
      }
    }, 200);
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    currentFilter.search = '';
    if (isOfflineMode) {
      filterAndRenderBooks();
    } else {
      fetchBooks();
    }
  });

  genreFilter.addEventListener('change', (e) => {
    currentFilter.genre = e.target.value;
    if (isOfflineMode) {
      filterAndRenderBooks();
    } else {
      fetchBooks();
    }
  });

  availabilityFilter.addEventListener('change', (e) => {
    currentFilter.availability = e.target.value;
    if (isOfflineMode) {
      filterAndRenderBooks();
    } else {
      fetchBooks();
    }
  });

  resetDemoBtn.addEventListener('click', handleResetDemo);

  openAddModalBtn.addEventListener('click', () => {
    bookForm.reset();
    document.getElementById('inputCopies').value = 3;
    document.getElementById('inputYear').value = new Date().getFullYear();
    bookModal.style.display = 'flex';
  });

  closeModalBtn.addEventListener('click', () => {
    bookModal.style.display = 'none';
  });

  cancelModalBtn.addEventListener('click', () => {
    bookModal.style.display = 'none';
  });

  bookModal.addEventListener('click', (e) => {
    if (e.target === bookModal) {
      bookModal.style.display = 'none';
    }
  });

  bookForm.addEventListener('submit', handleSaveBook);
}

// Fetch books from REST API with graceful offline fallback
async function fetchBooks() {
  try {
    const params = new URLSearchParams();
    if (currentFilter.search) params.append('search', currentFilter.search);
    if (currentFilter.genre && currentFilter.genre !== 'all') params.append('genre', currentFilter.genre);
    if (currentFilter.availability && currentFilter.availability !== 'all') {
      params.append('availability', currentFilter.availability);
    }

    const res = await fetch(`/api/books?${params.toString()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    allBooks = json.data || [];
    isOfflineMode = false;
    renderBooks(allBooks);
    updateGenreDropdown();
  } catch {
    // If backend isn't reached (e.g. file:// or server not started), use in-memory data
    isOfflineMode = true;
    filterAndRenderBooks();
  }
}

function filterAndRenderBooks() {
  let filtered = [...allBooks];

  if (currentFilter.search) {
    const q = currentFilter.search.toLowerCase();
    filtered = filtered.filter(b =>
      b.title.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q) ||
      (b.isbn && b.isbn.toLowerCase().includes(q))
    );
  }

  if (currentFilter.genre && currentFilter.genre !== 'all') {
    filtered = filtered.filter(b => b.genre.toLowerCase() === currentFilter.genre.toLowerCase());
  }

  if (currentFilter.availability === 'available') {
    filtered = filtered.filter(b => b.availableCopies > 0);
  } else if (currentFilter.availability === 'borrowed') {
    filtered = filtered.filter(b => b.availableCopies < b.totalCopies);
  }

  renderBooks(filtered);
}

// Render book cards
function renderBooks(books) {
  catalogCounter.textContent = `Showing ${books.length} ${books.length === 1 ? 'book' : 'books'}`;

  if (books.length === 0) {
    booksGrid.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }

  booksGrid.style.display = 'grid';
  emptyState.style.display = 'none';

  booksGrid.innerHTML = books.map(book => {
    const isAvailable = book.availableCopies > 0;
    const canReturn = book.availableCopies < book.totalCopies;

    return `
      <article class="book-card" id="card-${book.id}">
        <div>
          <div class="book-top">
            <span class="genre-tag">${escapeHtml(book.genre || 'General')}</span>
            <span class="copies-badge ${isAvailable ? 'available' : 'depleted'}">
              ${isAvailable ? `${book.availableCopies} / ${book.totalCopies} Available` : '0 Available'}
            </span>
          </div>

          <h3 class="book-title">${escapeHtml(book.title)}</h3>
          <p class="book-author">by ${escapeHtml(book.author)} &bull; ${book.publishedYear || 'N/A'}</p>
          <p class="book-desc">${escapeHtml(book.description || 'No description available.')}</p>
        </div>

        <div class="book-meta-footer">
          <span class="book-isbn">${escapeHtml(book.isbn || 'ISBN: N/A')}</span>
          <div class="card-actions">
            <button 
              class="btn btn-sm btn-borrow" 
              onclick="handleBorrow('${book.id}')"
              ${!isAvailable ? 'disabled title="No copies available"' : 'title="Borrow a copy"'}
            >
              Borrow
            </button>
            <button 
              class="btn btn-sm btn-return" 
              onclick="handleReturn('${book.id}')"
              ${!canReturn ? 'disabled title="All copies already returned"' : 'title="Return a copy"'}
            >
              Return
            </button>
            <button 
              class="btn-icon-del" 
              onclick="handleDelete('${book.id}', '${escapeHtml(book.title)}')"
              title="Delete book"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

function updateGenreDropdown() {
  const currentVal = genreFilter.value;
  const genres = {};
  allBooks.forEach(b => {
    const g = b.genre || 'General';
    genres[g] = (genres[g] || 0) + 1;
  });

  let html = '<option value="all">All Genres</option>';
  Object.keys(genres).sort().forEach(g => {
    html += `<option value="${escapeHtml(g)}" ${g === currentVal ? 'selected' : ''}>${escapeHtml(g)} (${genres[g]})</option>`;
  });
  genreFilter.innerHTML = html;
}

function updateStatsLocally() {
  const totalTitles = allBooks.length;
  const totalCopies = allBooks.reduce((acc, b) => acc + (b.totalCopies || 0), 0);
  const availableCopies = allBooks.reduce((acc, b) => acc + (b.availableCopies || 0), 0);
  const borrowedCopies = Math.max(0, totalCopies - availableCopies);

  statTotalTitles.textContent = totalTitles;
  statAvailable.textContent = `${availableCopies} (${totalCopies} total)`;
  statBorrowed.textContent = borrowedCopies;
}

async function fetchStats() {
  try {
    const res = await fetch('/api/books/stats');
    if (!res.ok) throw new Error('Failed');
    const json = await res.json();
    if (json.success) {
      const { totalTitles, totalCopies, availableCopies, borrowedCopies } = json.data;
      statTotalTitles.textContent = totalTitles;
      statAvailable.textContent = `${availableCopies} (${totalCopies} total)`;
      statBorrowed.textContent = borrowedCopies;
      return;
    }
  } catch {
    updateStatsLocally();
  }
}

// Health check probe
async function checkHealth() {
  try {
    const start = performance.now();
    const res = await fetch('/health');
    const latency = Math.round(performance.now() - start);

    if (res.ok) {
      const data = await res.json();
      healthPill.className = 'health-pill online';
      healthStatusText.textContent = `Online (${latency}ms) &bull; Container: healthy`;
      statUptime.textContent = formatUptime(data.uptimeSeconds);
      if (isOfflineMode) {
        isOfflineMode = false;
        fetchBooks();
        fetchStats();
      }
      return;
    }
  } catch {}

  // Fallback indicator
  healthPill.className = 'health-pill preview-mode';
  healthStatusText.textContent = '⚡ Static Preview Mode (Run npm start for Live API)';
  statUptime.textContent = 'Live in Node/Docker';
}

function formatUptime(seconds) {
  if (typeof seconds !== 'number') return '0s';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// Borrow action
window.handleBorrow = async function(bookId) {
  if (isOfflineMode) {
    const b = allBooks.find(item => item.id === bookId);
    if (b && b.availableCopies > 0) {
      b.availableCopies -= 1;
      showToast(`[Demo] Borrowed "${b.title}". Copies remaining: ${b.availableCopies}`, 'success');
      filterAndRenderBooks();
      updateStatsLocally();
    }
    return;
  }

  try {
    const res = await fetch(`/api/books/${bookId}/borrow`, { method: 'POST' });
    const json = await res.json();
    if (json.success) {
      showToast(json.message, 'success');
      fetchBooks();
      fetchStats();
    } else {
      showToast(json.message || 'Cannot borrow copy', 'error');
    }
  } catch (err) {
    showToast(`Borrow failed: ${err.message}`, 'error');
  }
};

// Return action
window.handleReturn = async function(bookId) {
  if (isOfflineMode) {
    const b = allBooks.find(item => item.id === bookId);
    if (b && b.availableCopies < b.totalCopies) {
      b.availableCopies += 1;
      showToast(`[Demo] Returned "${b.title}". Available copies: ${b.availableCopies}`, 'success');
      filterAndRenderBooks();
      updateStatsLocally();
    }
    return;
  }

  try {
    const res = await fetch(`/api/books/${bookId}/return`, { method: 'POST' });
    const json = await res.json();
    if (json.success) {
      showToast(json.message, 'success');
      fetchBooks();
      fetchStats();
    } else {
      showToast(json.message || 'Cannot return copy', 'error');
    }
  } catch (err) {
    showToast(`Return failed: ${err.message}`, 'error');
  }
};

// Delete action
window.handleDelete = async function(bookId, title) {
  if (!confirm(`Are you sure you want to remove "${title}" from the library catalog?`)) {
    return;
  }

  if (isOfflineMode) {
    allBooks = allBooks.filter(b => b.id !== bookId);
    showToast(`[Demo] Removed "${title}"`, 'info');
    filterAndRenderBooks();
    updateStatsLocally();
    updateGenreDropdown();
    return;
  }

  try {
    const res = await fetch(`/api/books/${bookId}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) {
      showToast(json.message, 'info');
      fetchBooks();
      fetchStats();
    } else {
      showToast(json.error || 'Failed to delete book', 'error');
    }
  } catch (err) {
    showToast(`Delete failed: ${err.message}`, 'error');
  }
};

// Save new book
async function handleSaveBook(e) {
  e.preventDefault();

  const payload = {
    title: document.getElementById('inputTitle').value.trim(),
    author: document.getElementById('inputAuthor').value.trim(),
    genre: document.getElementById('inputGenre').value.trim() || 'General',
    totalCopies: parseInt(document.getElementById('inputCopies').value, 10) || 1,
    publishedYear: parseInt(document.getElementById('inputYear').value, 10) || new Date().getFullYear(),
    isbn: document.getElementById('inputIsbn').value.trim() || `ISBN-${Math.floor(1000000000 + Math.random() * 9000000000)}`,
    description: document.getElementById('inputDesc').value.trim() || 'No description provided.'
  };

  if (isOfflineMode) {
    const newBook = {
      ...payload,
      id: `b-${Date.now().toString(36)}`,
      availableCopies: payload.totalCopies,
      createdAt: new Date().toISOString()
    };
    allBooks.unshift(newBook);
    showToast(`[Demo] Added "${payload.title}" to catalog`, 'success');
    bookModal.style.display = 'none';
    bookForm.reset();
    filterAndRenderBooks();
    updateStatsLocally();
    updateGenreDropdown();
    return;
  }

  try {
    const res = await fetch('/api/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const json = await res.json();
    if (json.success) {
      showToast(`Added "${payload.title}" to catalog`, 'success');
      bookModal.style.display = 'none';
      bookForm.reset();
      fetchBooks();
      fetchStats();
    } else {
      showToast(json.error || 'Failed to save book', 'error');
    }
  } catch (err) {
    showToast(`Error saving book: ${err.message}`, 'error');
  }
}

// Reset Demo Data
async function handleResetDemo() {
  if (!confirm('Reset library catalog to default sample books?')) return;

  if (isOfflineMode) {
    allBooks = JSON.parse(JSON.stringify(FALLBACK_BOOKS));
    showToast('[Demo] Catalog reset to original books', 'info');
    filterAndRenderBooks();
    updateStatsLocally();
    updateGenreDropdown();
    return;
  }

  try {
    const res = await fetch('/api/books/reset', { method: 'POST' });
    const json = await res.json();
    if (json.success) {
      showToast(json.message, 'info');
      fetchBooks();
      fetchStats();
    }
  } catch (err) {
    showToast(`Reset failed: ${err.message}`, 'error');
  }
}

// Toast notification helper
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
