var express = require('express');
var mongoStart = require('../mongo_connection');
var request = require('request');
var parser = require('./xmltojson');

// Start the MongoDB connection
var db;

var dbStatusCheck = function(error, status, category){
	if(error){
		console.log("error creating index");
	}
	else if(!status){
		console.log(category, "Index create unsuccessfully");
	}
	else{
		console.log(category, "Index created successfully");
	}
};

mongoStart.connectToServer( function(err){
	if(err){
		console.log("Error connecting to Mongo Database");
	}
	else{
		console.log("Mongo connection established");

		// mongoStart.createIndex('reference', "OrganizationName", function(error, status){
		// 	dbStatusCheck(error, status, "OrganizationName");
		// });
		// mongoStart.createIndex('reference', "EIN", function(error, status){
		// 	dbStatusCheck(error, status, "EIN");
		// });
	}
	db = mongoStart.getDb();
})

//////////////////////////////////////// ROUTES //////////////////////////////////////////////////
var router = express.Router();

// Finds the total number of results for a query
router.get('/search/FindNumItems', function(req, res){
	var dbQuery = {$text: { $search: req.query.main} };
	var scoring = {score: { $meta: "textScore"} };

	db.collection('xmldata').find(dbQuery, scoring).sort({score:{$meta:"textScore"} }).count(function(err, count){
		res.json(count);
	});			
});

// REQUIRES: Any text-search parameter as "main"
// EFFECTS: Returns up to 10 search results sorted in order of match-score (relevancy)
router.get('/search', function(req, res){
	// console.log(req.originalUrl);
	console.log("Main search called for: ", req.query.main);
	// Build the Query given the fields provided by req.query

	var dbQuery = {$text: { $search: req.query.main} };
	var scoring = {score: { $meta: "textScore"} };

	var CurrentPage = parseInt(req.query.CurrentPage, 10);
	var ItemsPerPage = parseInt(req.query.ItemsPerPage, 10);
	var SkipAmount = (CurrentPage - 1) * ItemsPerPage;

	// if (req.query.EIN){
	// 	dbQuery["EIN"] = req.query.EIN;
	// }
	// if (req.query.availOnline){
	// 	dbQuery["IsAvailable"] = true;
	// }
	// if (req.query.formType){
	// 	dbQuery["FormType"] = req.query.formType;
	// }
	// if (req.query.taxPeriod){
	// 	var lessThanRegex = /<(.*)/;
	// 	var year = lessThanRegex.exec(req.query.taxPeriod);
	// 	if (year){
	// 		dbQuery["TaxPeriod"] = {$lt: year[1]}; 
	// 	}
	// 	else{
	// 		dbQuery["TaxPeriod"] = new RegExp('^' + req.query.taxPeriod);
	// 	}
	// }

	// Callback function to be used to handle errors and send the http response
	var returnQueryResult = function(err, doc){
		// console.log("Running returnQueryResult now");
		if (err){
			console.log(err);
			res.send('Server Error');
		}
		if(!doc.length){
			res.send('No records found for: [' + req.query.main + ']. Try adjusting search terms.');
		}
		else{
			res.json(doc);
		}
	}

	// Takes the XML documents that are found by the textQuery, and retrieves their respective document in "reference" collection
	var XMLtoReference = function(doc, callback){
		var counter = 0;
		var new_doc = [];

		// Special case if doc is empty. Poor style, I know
		if (counter > doc.length - 1 ){
			callback(new_doc);
		}

		for (var i = 0; i < doc.length; ++i){
			(function(index, unique_doc){
				EINQuery = {"EIN": doc[index].EIN};
				db.collection('reference').find(EINQuery, {"OrganizationName": true, "EIN": true, "RefsByTaxPeriod": true, _id: false}).limit(1).next(function(err, result){
					result["score"] = unique_doc.score;
					new_doc.push(result);
					counter++;
					if (counter > doc.length - 1 ){
						callback(new_doc);
					}
				});
			}(i, doc[i]) );
		}

	}

	// Queries "xmldata" collection using a query on the text index
	var textQuery = function(callback, queryArg){
		db.collection('xmldata').find(queryArg, scoring).sort({score:{$meta:"textScore"} }).skip(SkipAmount).limit(ItemsPerPage).toArray(function(err, doc){
			XMLtoReference(doc, function(result){
				callback(err, result);
			});
		});
	}

	// Queries "reference" with text-search (for OrganizationName only)
	var orgTextQuery = function(callback, queryArg){
		db.collection('reference').find(queryArg, scoring).sort({score:{$meta:"textScore"} }).limit(10).toArray(function(err, doc){
			callback(err, doc)
		});
	}

	// Queries "reference" without text-search
	var normalQuery = function(callback, queryArg){
		db.collection('reference').find(queryArg, {"OrganizationName": true, "EIN": true, "RefsByTaxPeriod": true, _id: false}).limit(20).toArray( function(err, doc){
			callback(err, doc)
		});
	}

	// normalQuery(returnQueryResult, dbQuery);
	textQuery(returnQueryResult, dbQuery);
	// orgTextQuery(returnQueryResult, dbQuery);
});


// REQUIRES: Organization Name (req.query.main)
// EFFECTS: Returns an array of up to 5 of the closest matches to the query in "real-time"
router.get('/search/live', function(req, res){
	var scoring = {score: { $meta: "textScore"} };

	// Text-indexed query on "XMlData" for all fields
	var dbQuery = {$text: { $search: req.query.main} };
	db.collection('xmldata').find(dbQuery, scoring).sort({score:{$meta:"textScore"} }).limit(5).toArray(function(err, doc){
		res.json(doc);
	});

	// Text-indexed query on REFERENCE just for OrganizationName
	// var dbQuery = {$text: { $search: req.query.orgName} };
	// db.collection('reference').find(dbQuery, scoring).sort({score:{$meta:"textScore"} }).limit(5).toArray(function(err, doc){
	// 	res.json(doc);
	// });
});

// REQUIRES: id
// EFFECTS: Returns true if the form is available online
router.get('/IsOnline', function(req, res){
	var IDtoFind = '';
	var dbQuery = {"EIN": req.query.EIN};
	db.collection('reference').find(dbQuery).limit(1).next(function(err, doc){
		var IDtoFind = '';
		for(var i = 0; i < doc.RefsByTaxPeriod.length; ++i){
			if (doc.RefsByTaxPeriod[i].id == req.query.id){
				 IDtoFind = doc.RefsByTaxPeriod[i].id
			}
		}

		db.collection('tax').find({"_id": IDtoFind}).limit(1).next(function(err, result){
			if(!result.IsAvailable){
				res.send(false);
			}
			else{
				res.send(true);
			}
		});
	});
});

// REQUIRES: EIN, ID number (ObjectID)
// EFFECTS: Returns the parsed tax data of the respective document 
router.get('/getTaxData', function(req, res){
	console.log('getTaxData requested');

	db.collection('reference').find({"EIN": req.query.EIN}).limit(1).next(function(err, result){
		// Find the objectID of the correct document 
		var IDtoFind = '';
		for(var i = 0; i < result.RefsByTaxPeriod.length; ++i){
			if (result.RefsByTaxPeriod[i].id == req.query.id){
				 IDtoFind = result.RefsByTaxPeriod[i].id
			}
		}
		

		db.collection('tax').find({"_id": IDtoFind}).limit(1).next(function(err, result){
			if(!result.URL){
				res.send("Not Available Online");
			}
			else{
				request(result.URL, function(err, response, body){
					if (!err && response.statusCode == 200){
						if (result.FormType == "990"){
							parser.form990(body, function(answer){
								answer.URL = result.URL;
								res.json(answer);
							});
						}
						else if(result.FormType == "990EZ"){
							parser.form990ez(body, function(answer){
								answer.URL = result.URL;
								res.json(answer);
							});
						}
						else{
							if(result.FormType != "990PF"){
								res.send('Form', result.FormType, 'not supported right now');
								throw Error('Problem reading form: ' + result.FormType);
							}
							else{
								parser.form990pf(body, function(answer){
									answer.URL = result.URL
									res.json(answer);
								});
							}
						}
					}
					else{
						res.sendStatus(response.statusCode);
					}
				
				});
			}
		});
	});

});

module.exports = router;