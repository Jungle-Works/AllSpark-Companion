const express = require('express');
const router = express.Router();

var api = require('../utils/api');

(async () => {

	await api.setup();
})();

router.use(function(req, res, next){
    res.header("Access-Control-Allow-Origin", "*");
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    next();
});

router.get('/', function(req, res, next) {
  res.render('index', { title: 'Exprexxo' });
});

router.get('/hello', function(req, res, next) {
    res.render('index', { title: 'hello' });
});

router.get('/v2/*', api.serve());
router.post('/v2/*', api.serve());

module.exports = router;