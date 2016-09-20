
var mongodb = require('mongodb');

var MongoClient = mongodb.MongoClient;
var mydb;

module.exports = {
	connectToServer: function(callback){
		MongoClient.connect('mongodb://localhost/irs990', function(err, db){
			mydb = db;
			return callback(err);
		});	
	},

	// Creates an index on the indexField in the given collection
	createIndex: function(collectionName, indexField, callback){
		mydb.collection(collectionName).ensureIndex(indexField, function(err, status){
			return callback(err, status);
		});
	},

	getDb: function(){
		// console.log("getDb called");
		return mydb;
	}
};



