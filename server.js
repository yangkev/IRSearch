var express = require('express');
var bodyParser = require('body-parser');
var mongoSetup = require(__dirname + '/mongo_connection');
var routes = require('./routes/index');

var app = express();


app.use(express.static(__dirname + '/public'));
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: true}));

app.use('/', routes);


app.listen(3000, function(){
	console.log('listening on 3000');
});


