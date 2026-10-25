import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data paths
const initialSeedPath = path.join(__dirname, '..', 'data', 'initialBooks.json');
const storageDir = process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data_storage');
const storageFilePath = path.join(storageDir, 'books.json');

class BookService {
  constructor() {
    this.books = [];
    this.init();
  }

  init() {
    try {
      if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true });
      }

      if (fs.existsSync(storageFilePath)) {
        const fileData = fs.readFileSync(storageFilePath, 'utf-8');
        this.books = JSON.parse(fileData);
      } else {
        const seedData = fs.readFileSync(initialSeedPath, 'utf-8');
        this.books = JSON.parse(seedData);
        this.saveToFile();
      }
    } catch (err) {
      console.warn('Could not initialize file storage, falling back to seed in-memory:', err.message);
      try {
        const seedData = fs.readFileSync(initialSeedPath, 'utf-8');
        this.books = JSON.parse(seedData);
      } catch {
        this.books = [];
      }
    }
  }

  saveToFile() {
    try {
      if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true });
      }
      fs.writeFileSync(storageFilePath, JSON.stringify(this.books, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist books to disk:', err.message);
    }
  }

  getAllBooks({ search = '', genre = '', availability = 'all' } = {}) {
    let result = [...this.books];

    if (search) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        b =>
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q) ||
          (b.isbn && b.isbn.toLowerCase().includes(q))
      );
    }

    if (genre && genre !== 'all') {
      result = result.filter(b => b.genre.toLowerCase() === genre.toLowerCase());
    }

    if (availability === 'available') {
      result = result.filter(b => b.availableCopies > 0);
    } else if (availability === 'borrowed') {
      result = result.filter(b => b.availableCopies < b.totalCopies);
    }

    return result;
  }

  getBookById(id) {
    return this.books.find(b => b.id === id);
  }

  createBook(data) {
    const { title, author, isbn, genre, publishedYear, totalCopies, description } = data;

    if (!title || !author) {
      throw new Error('Title and author are required.');
    }

    const copies = parseInt(totalCopies, 10) || 1;
    if (copies < 1) {
      throw new Error('Total copies must be at least 1.');
    }

    const newBook = {
      id: `b-${crypto.randomUUID().slice(0, 8)}`,
      title: title.trim(),
      author: author.trim(),
      isbn: isbn ? isbn.trim() : `ISBN-${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      genre: genre ? genre.trim() : 'General',
      publishedYear: parseInt(publishedYear, 10) || new Date().getFullYear(),
      totalCopies: copies,
      availableCopies: copies,
      description: description ? description.trim() : 'No description provided.',
      createdAt: new Date().toISOString()
    };

    this.books.unshift(newBook);
    this.saveToFile();
    return newBook;
  }

  updateBook(id, data) {
    const index = this.books.findIndex(b => b.id === id);
    if (index === -1) {
      return null;
    }

    const current = this.books[index];
    const totalCopies = data.totalCopies !== undefined ? parseInt(data.totalCopies, 10) : current.totalCopies;
    const diff = totalCopies - current.totalCopies;
    const newAvailable = Math.max(0, current.availableCopies + diff);

    const updated = {
      ...current,
      ...data,
      totalCopies,
      availableCopies: newAvailable,
      updatedAt: new Date().toISOString()
    };

    this.books[index] = updated;
    this.saveToFile();
    return updated;
  }

  deleteBook(id) {
    const index = this.books.findIndex(b => b.id === id);
    if (index === -1) {
      return false;
    }
    const [deleted] = this.books.splice(index, 1);
    this.saveToFile();
    return deleted;
  }

  borrowBook(id) {
    const book = this.getBookById(id);
    if (!book) {
      return { success: false, message: 'Book not found' };
    }

    if (book.availableCopies <= 0) {
      return { success: false, message: 'No copies currently available to borrow.' };
    }

    book.availableCopies -= 1;
    book.updatedAt = new Date().toISOString();
    this.saveToFile();

    return {
      success: true,
      book,
      message: `Successfully borrowed "${book.title}". Copies remaining: ${book.availableCopies}`
    };
  }

  returnBook(id) {
    const book = this.getBookById(id);
    if (!book) {
      return { success: false, message: 'Book not found' };
    }

    if (book.availableCopies >= book.totalCopies) {
      return { success: false, message: 'All copies of this book are already returned.' };
    }

    book.availableCopies += 1;
    book.updatedAt = new Date().toISOString();
    this.saveToFile();

    return {
      success: true,
      book,
      message: `Successfully returned "${book.title}". Available copies: ${book.availableCopies}`
    };
  }

  getStats() {
    const totalBooks = this.books.length;
    const totalCopies = this.books.reduce((acc, b) => acc + (b.totalCopies || 0), 0);
    const availableCopies = this.books.reduce((acc, b) => acc + (b.availableCopies || 0), 0);
    const borrowedCopies = Math.max(0, totalCopies - availableCopies);

    const genres = {};
    for (const b of this.books) {
      const g = b.genre || 'General';
      genres[g] = (genres[g] || 0) + 1;
    }

    return {
      totalTitles: totalBooks,
      totalCopies,
      availableCopies,
      borrowedCopies,
      genreCounts: genres,
      systemUptimeSeconds: Math.floor(process.uptime())
    };
  }

  resetToDefaults() {
    try {
      const seedData = fs.readFileSync(initialSeedPath, 'utf-8');
      this.books = JSON.parse(seedData);
      this.saveToFile();
      return true;
    } catch (err) {
      console.error('Failed to reset to defaults:', err.message);
      return false;
    }
  }
}

export const bookService = new BookService();
