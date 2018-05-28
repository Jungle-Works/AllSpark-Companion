const express = require('express');
const router = express.Router();

router.use(express.static('./client'));

router.get('/signup', (req, res) => {

	res.send(`
		<h1>Signup Page</h1>
	`);

});

module.exports = router;