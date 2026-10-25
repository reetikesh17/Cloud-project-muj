import express from 'express';
import { bookService } from '../services/bookService.js';

const router = express.Router();

// GET /api/books/stats - Must be before /:id route
router.get('/stats', (req, res) => {
  try {
    const stats = bookService.getStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/books - List and search
router.get('/', (req, res) => {
  try {
    const { search, genre, availability } = req.query;
    const books = bookService.getAllBooks({ search, genre, availability });
    res.json({
      success: true,
      count: books.length,
      data: books
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/books/:id - Get single book
router.get('/:id', (req, res) => {
  const book = bookService.getBookById(req.params.id);
  if (!book) {
    return res.status(404).json({ success: false, error: 'Book not found' });
  }
  res.json({ success: true, data: book });
});

// POST /api/books - Add book
router.post('/', (req, res) => {
  try {
    const { title, author, isbn, genre, publishedYear, totalCopies, description } = req.body;
    if (!title || !author) {
      return res.status(400).json({
        success: false,
        error: 'Title and author are required fields.'
      });
    }

    const created = bookService.createBook({
      title,
      author,
      isbn,
      genre,
      publishedYear,
      totalCopies,
      description
    });

    res.status(201).json({
      success: true,
      message: 'Book added successfully',
      data: created
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PUT /api/books/:id - Update book
router.put('/:id', (req, res) => {
  try {
    const updated = bookService.updateBook(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Book not found' });
    }
    res.json({
      success: true,
      message: 'Book updated successfully',
      data: updated
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE /api/books/:id - Delete book
router.delete('/:id', (req, res) => {
  try {
    const deleted = bookService.deleteBook(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Book not found' });
    }
    res.json({
      success: true,
      message: `Book "${deleted.title}" deleted successfully`,
      data: deleted
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/books/:id/borrow - Borrow copy
router.post('/:id/borrow', (req, res) => {
  const result = bookService.borrowBook(req.params.id);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

// POST /api/books/:id/return - Return copy
router.post('/:id/return', (req, res) => {
  const result = bookService.returnBook(req.params.id);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

// POST /api/books/reset - Reset to seed catalog
router.post('/reset', (req, res) => {
  const success = bookService.resetToDefaults();
  if (success) {
    res.json({ success: true, message: 'Catalog reset to original sample books' });
  } else {
    res.status(500).json({ success: false, error: 'Failed to reset catalog' });
  }
});

export default router;
