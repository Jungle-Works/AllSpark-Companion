const express = require('express');
const path = require('path');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

const server = require('./server/routes/index');
const client = require('./client/index');

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


app.use('/api/', server);
app.use('/', client);


// catch 404 and forward to error handler
app.use(function (req, res, next) {

	const err = new Error('Not Found');
	err.status = 404;
	next(err);
});

module.exports = app;
