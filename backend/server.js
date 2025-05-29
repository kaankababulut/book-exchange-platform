const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// MySQL connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '', // your MySQL password, leave blank for XAMPP default
  database: 'book_exchange'
});

db.connect(err => {
  if (err) throw err;
  console.log('MySQL connected');
});

// REGISTER USER
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  const hash = await bcrypt.hash(password, 10);
  db.query(
    'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
    [username, email, hash],
    err => {
      if (err) return res.status(500).send(err);
      res.send({ message: 'User registered!' });
    }
  );
});

// LOGIN USER
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
    if (err) return res.status(500).send('Database error');
    if (results.length === 0) return res.status(401).send('Invalid login');

    const user = results[0];
    if (user.password === password) {
  res.send({
    user_id: user.user_id,
    username: user.username,
    role: user.role
  });
} else {
  res.status(401).send('Wrong password');
}

  });
});

// ADD BOOK (student)
app.post('/add-book', (req, res) => {
  const { title, author, price, seller_id } = req.body;
  const status = 'pending';

  const sql = `
    INSERT INTO books (title, author, price, seller_id, status)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(sql, [title, author, price, seller_id, status], (err) => {
    if (err) return res.status(500).send(err);
    res.send({ message: 'Book added successfully!' });
  });
});

// VIEW AVAILABLE BOOKS
app.get('/books', (req, res) => {
  db.query('SELECT * FROM books WHERE status = "available"', (err, results) => {
    if (err) return res.status(500).send(err);
    res.send(results);
  });
});

// VIEW A BOOK BY ID
app.get('/books/:book_id', (req, res) => {
  const { book_id } = req.params;
  const sql = `
    SELECT b.*, u.username AS seller_name
    FROM books b
    JOIN users u ON b.seller_id = u.user_id
    WHERE b.book_id = ?
  `;
  db.query(sql, [book_id], (err, results) => {
    if (err) return res.status(500).send(err);
    if (results.length === 0) return res.status(404).send({ message: 'Book not found' });
    res.send(results[0]);
  });
});



// VIEW ALL BOOKS (admin)
app.get('/all-books', (req, res) => {
  const sql = `
    SELECT b.*, u.username AS seller_name, u.email AS seller_email
    FROM books b
    JOIN users u ON b.seller_id = u.user_id
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).send(err);
    res.send(results);
  });
});

// APPROVE BOOK
app.post('/approve-book', (req, res) => {
  const { book_id } = req.body;
  db.query('UPDATE books SET status = "available" WHERE book_id = ?', [book_id], err => {
    if (err) return res.status(500).send(err);
    res.send({ message: 'Book approved!' });
  });
});

// REJECT BOOK
app.post('/reject-book', (req, res) => {
  const { book_id } = req.body;
  db.query('UPDATE books SET status = "rejected" WHERE book_id = ?', [book_id], err => {
    if (err) return res.status(500).send(err);
    res.send({ message: 'Book rejected!' });
  });
});

// DELETE BOOK
app.delete('/delete-book/:book_id', (req, res) => {
  const book_id = req.params.book_id;
  db.query('DELETE FROM books WHERE book_id = ?', [book_id], err => {
    if (err) return res.status(500).send(err);
    res.send({ message: 'Book deleted successfully' });
  });
});

// GET USER INFO
app.get('/user/:user_id', (req, res) => {
  const { user_id } = req.params;
  db.query('SELECT username, email, role FROM users WHERE user_id = ?', [user_id], (err, results) => {
    if (err) return res.status(500).send(err);
    if (results.length === 0) return res.status(404).send('User not found');
    res.send(results[0]);
  });
});

// GET USER'S BOOKS
app.get('/my-books/:user_id', (req, res) => {
  const { user_id } = req.params;
  db.query('SELECT * FROM books WHERE seller_id = ?', [user_id], (err, results) => {
    if (err) return res.status(500).send(err);
    res.send(results);
  });
});

// GET MESSAGES FOR A BOOK
app.get('/messages/:book_id', (req, res) => {
  const { book_id } = req.params;
  db.query('SELECT * FROM messages WHERE book_id = ? ORDER BY created_at ASC', [book_id], (err, results) => {
    if (err) return res.status(500).send(err);
    res.send(results);
  });
});

// SEND MESSAGE
app.post('/messages', (req, res) => {
  const { book_id, sender_id, message } = req.body;
  const sql = 'INSERT INTO messages (book_id, sender_id, message) VALUES (?, ?, ?)';
  db.query(sql, [book_id, sender_id, message], (err) => {
    if (err) return res.status(500).send(err);
    res.send({ message: 'Message sent' });
  });
});

// GET USER'S CHAT BOOKS
app.get('/my-chats/:user_id', (req, res) => {
  const { user_id } = req.params;
  const sql = `
    SELECT DISTINCT b.book_id, b.title, b.author, b.price
    FROM messages m
    JOIN books b ON m.book_id = b.book_id
    WHERE m.sender_id = ? OR b.seller_id = ?
  `;
  db.query(sql, [user_id, user_id], (err, results) => {
    if (err) return res.status(500).send(err);
    res.send(results);
  });
});

// START SERVER
app.listen(3001, () => console.log('Server running on http://localhost:3001'));
