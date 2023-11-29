import express from 'express';
import pg from 'pg';
import bodyParser from 'body-parser';
import axios from 'axios';
/*
GET BOOKS FROM HERE:

https://openlibrary.org/search?q=search+results

*/
const app = express();
const port = 3000;
const db = new pg.Client({
    user: 'postgres',
    password: 'abimael',
    database: 'books',
    host: 'localhost',
    port: 5432
});
db.connect();

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

async function getBook(id) {
    const queryResult = await db.query('SELECT * FROM books WHERE id = $1', [id]);
    const row = queryResult.rows[0];
    return row;   
}

async function getBooks() {
    const queryResult = await db.query('SELECT * FROM books');
    const rows = queryResult.rows;
    let books = [];
    for (let row of rows) {
        const result = await axios.get(`https://covers.openlibrary.org/b/${row.key}/${row.key_value}-${row.size}.jpg`, {responseType: 'arraybuffer'});
        const buffer64 = Buffer.from(result.data, 'binary').toString('base64');
        const book = {
            id: row.id,
            description: row.description,
            title: row.title,
            image: buffer64
        }
        books.push(book);
    }
    return books;    
}

async function saveBooks(book) {
    const values = [
        book.titulo,
        book.rating,
        book.descricao,
        book.anotacoes,
        book.key,
        book.valorChave,
        new Date()
    ];
    await db.query("INSERT INTO books(title, rating, description, notes, key, key_value, size, date_read) VALUES($1, $2, $3, $4, $5, $6, 'M', $7)", values);
}

async function deleteBook(id) {
    await db.query("DELETE FROM books WHERE id = $1", [id]);
}

async function updateBooks(id, book) {
    const values = [
        book.titulo,
        book.rating,
        book.descricao,
        book.anotacoes,
        book.key,
        book.valorChave,
        new Date(),
        id
    ];
    await db.query("UPDATE books SET title = $1, rating = $2, description = $3, notes = $4, key = $5, key_value = $6, date_read = $7 WHERE id = $8;", values);
}

app.post('/update/:id', async (req, res) => {
    try{
        await updateBooks(req.params.id, req.body)
        res.redirect('/');
    } catch(err) {
        console.error('Error message: ',err.message);
        res.status(400).send({ error: err.message });        
    }
});

app.get('/edit/:id', async (req, res) => {
    const book = await getBook(req.params.id);
    res.render('form.ejs', { book: book });
});

app.delete('/delete/:id', async(req,res) => {
    try {
        await deleteBook(req.params.id);
        res.sendStatus(200);
    } catch(err){
        console.error('Error message: ',err.message);
        res.status(400).send({ error: err.message });
    }
});

app.get('/delete/:id', async(req,res) => {
    try {
        await deleteBook(req.params.id);
        res.redirect('/');
    } catch(err){
        console.error('Error: ',err.code);
        res.render('index.ejs', { error: JSON.stringify(err.message) });        
    }
});

app.post('/save', async (req, res) => {
    try {
        await saveBooks(req.body);
        res.redirect('/');
    } catch(err) {
        console.error('Error: ',err.code);
        console.log('Error', err.message)
        res.render('index.ejs', { error: JSON.stringify(err.message) });
    }
});

app.get('/new', (req, res) => {
    res.render('form.ejs');
});

app.get('/', async (req, res) => {
    try {
        const books = await getBooks();
        res.render('index.ejs', { books: books });
    } catch(err){
        console.error('Error: ',err.code);
        res.render('index.ejs', { error: JSON.stringify(err.message) });
    }
});

app.listen(port, () => {
    console.log(`The server is running on port ${port}`)
});