const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.use('/api', routes);
// Admin web panel (static HTML/CSS/JS) -> http://localhost:4000/admin
app.use('/admin', express.static(path.join(__dirname, '..', '..', 'admin-web')));
app.use(notFound);
app.use(errorHandler);

module.exports = app;
