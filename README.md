# IRSearch #
#### A search tool designed to help find connections between alumni & foundations, and alumni-alumni through foundations ####

## Contents ##
1. Getting Started
2. File Descriptions
3. Dependencies
4. Using MongoDB to store the data
5. API
6. Parsing XML data
7. Front-end with AngularJS
8. Maintenance
9. Moving Forward
10. Issues

## Getting Started ##

1. Create and start a [MongoDB instance](https://docs.mongodb.com/getting-started/shell/tutorial/install-mongodb-on-windows/)
2. Download the source code
3. Navigate to the downloaded directory. You should be able to see `package.json`
4. Run the command `npm install` from the command line (This installs all the dependencies)
5. Run the command `node server.js` from the command line (still should be in the downloaded directory)
6. Go to `localhost:3000` in the browser

## File Descriptions ##

File                       |Description
:--------------------------|:----------------------
public/js/taxapp.js        | All the **front-end** Javascript using AngularJS
public/styles/style.css    | User-applied styles 
public/index.html          | HTML for this single-page-app
routes/index.js            | Contains **API/Back-end** routes
routes/xmltojson.js        | All functions for **parsing** the IRS990, IRS990EZ, and IRS990PF forms
mongo_connection.js        | Sets up the connection to the **MongoDB**
server.js                  | **Starts the app** and listens for requests
package.json               | Contains dependency/package version information

## Dependencies ##
Back-end

* Express 4.14.0: [Express 4.x API Reference](https://expressjs.com/en/4x/api.html)
* MongoDB 3.2.8: [Node.js MongoDB Driver API](http://mongodb.github.io/node-mongodb-native/2.2/api/)

Front-end

* AngularJS 1.5.8: [AngularJS v1.5.8 API Reference](https://code.angularjs.org/1.5.8/docs/api)
* Angular UI Bootstrap: [Docs](https://angular-ui.github.io/bootstrap/)

## Using MongoDB to store the data ##

**_CAUTION_**: As of yet, no database administration functionality has been implemented, thus it is almost **_too easy_** to accidentally drop a collection, database, 
overwrite records etc.

All of the data is stored in a single database instance over 3 collections:

#### db.tax ####
The `db.tax` collection contains the `index.json` file downloaded directly from [the AWS IRS990](https://aws.amazon.com/public-data-sets/irs-990/) bucket. There are **
~3.5 million** documents (as of Aug 23, 2016) that look like this:

~~~
{
    "_id": ObjectID("57923ef2d8e739a7326adfee"),									// MongoDB created identifier
    "EIN": "586320346"																// Employer-Identification-Number
    "SubmittedOn": "2016-02-10",
    "TaxPeriod": "201509",	
    "DLN": 	"93493320047685",														// Document Lookup Number 
    "FormType": "990PF",															// 3 form types: 990, 990EZ, 990PF
    "LastUpdated": "2016-06-14T01:20:25.3920704Z",	
    "URL": "https://s3.amazonaws.com/irs-form-990/201533209349304768_public.xml"	// URL to download the filing in XML form from AWS		
    "OrganizationName": "COL THEO SEM U A L CAMPBELL",
    "IsElectronic": true,
    "IsAvailable": true   
}
~~~
This collection is indexed by the **"_id"** field only (by default per MongoDB).

#### db.reference ####
The `db.reference` collection stores 1 document per EIN number from the `db.tax` collection. Each document contains an array of references to each of an organization's 
filings that are available in `db.tax`. There are **~830,000** documents (as of Aug 23, 2016) that look like this:

~~~
{
	"_id": ObjectID("57a895bf738bf21b485e06f9"),
	"RefsByTaxPeriod": [
		{
			"TaxPeriod": "201412",
			"id": ObjectID("57923ef3d8e739a7326ae7b7")			// This is the same id as the document in db.tax
		},
		{
			"TaxPeriod": "201312",
			"id": ObjectID("57923f67d8e739a73279c7d1")
		}
		{
			"TaxPeriod": "201212",
			"id": ObjectID("57823fa0d8e739a732810024")
		}
		...
		...
	],
	"OrganizationName": "CARL CHERRY FOUNDATION",
	"EIN": "941207693"
}
~~~
This collection is indexed by the "OrganizationName" and "EIN" fields and has a **text-index** on the "OrganizationName" field as well.

#### db.xmldata ####
The `db.xmldata` collection stores the **most-recent downloadable XML form data per organization**. This means that out of all the organizations that have information 
available on AWS, only the most-recent (by tax period) XML form was downloaded and parsed. There are **~460,000** such documents (as of Aug 23, 2016) that look like this:

~~~
{
	"_id": ObjectID("57ac7ad4738bf208a0e7b4d2"),
	"City": "WATERTOWN",
	"OrganizationName": "BENEVOLENT & PROTECTIVE ORDER OF",
	"Mission": "FRATERNAL & CHARITABLE",
	"State": "MA",
	"KeyPeople": [
		"ROBERT RUNDLETI",
		"SUSAN WOLK",
		"KIM CALDER",
		"KATHY PELLETIER",
		...
		...
		...
	],
	"EIN": "041079730"
}
~~~

This collection has a **text-index** on the "OrganizationName", "City", and "KeyPeople" categories, with weights of 10, 2, and 5, respectively. See [MongoDB Text Indexes](https://docs.mongodb.com/manual/core/index-text/) and [MongoDB $text search](https://docs.mongodb.com/manual/reference/operator/query/text/).

Since this collection contains tax-filing data that was parsed by a script, there are some inconsistencies to be aware of: 

1. **City/State**: A *very* small handful (<30) of organizations have foreign addresses, so these fields may be missing.
2. **Mission**: A small number of organizations do not have a mission description, especially those that file the 990PF. On a much larger scale, a lot of filings say 
something like:

    > See Schedule O
    >
    > See Attached

    Or provide little to no description of their organization in the mission field that was parsed. It is not known how many documents this inconsistency impacts.

3. **Key People**: Around 1% (4,500) documents have the "KeyPeople" field missing because they did not provide that information. Still, some organizations may list banks,
trusts, management firms, etc as a "key person" in their tax return. There are a handful of organizations that file *Group Returns* where they aggregate their entire 
world-wide presence in 1 tax-return. As a result, their "KeyPeople" category may contain hundreds, if not thousands of names. This can significantly impact how the 
MongoDB text-search scoring system scores the document when doing a text-query, as simply searching for `Ann Arbor` (as opposed to `"Ann Arbor"`) will also match the name "Ann".

## API ##

#### Standard Search `/search`####
The `/search` route takes in a query string with the following parameters:

1. orgName- String that is used for text-search in MongoDB
2. CurrentPage- Number(parsed as interger) of the current page that the app (front-end) is on
3. ItemsPerPage- Number(parsed as interger) of results to return/display in 1 page

The route does a text-search on `db.xmldata`, then retrieves the corresponding documents in `db.reference`, matching by "EIN" number. Only documents that are specified by 
the page-range information are returned. 

If the text-search does not return any matches, then a message saying "No records found" will be sent back.

Otherwise, it returns a JSON array of documents `[doc1, doc2, doc3,...]` where each document is the document found in `db.reference` plus the text-search score:
~~~
{
	"_id": ObjectID("57a895bf738bf21b485e06f9"),
	"RefsByTaxPeriod": [
		{
			"TaxPeriod": "201412",
			"id": ObjectID("57923ef3d8e739a7326ae7b7")			
		},
		{
			"TaxPeriod": "201312",
			"id": ObjectID("57923f67d8e739a73279c7d1")
		}
		{
			"TaxPeriod": "201212",
			"id": ObjectID("57823fa0d8e739a732810024")
		}
		...
		...
	],
	"OrganizationName": "CARL CHERRY FOUNDATION",
	"EIN": "941207693",
	"score": "22.7"										// MongoDB Text-search relevancy score
}
~~~

#### Counting search results `/search/FindNumItems` ####

The `/search/FindNumItems` route simply takes the same query string as `/search` and returns the total number of documents
that `req.query.orgName` matches to. 

This route is needed in order for the front end to display the correct number of pages. A single MongoDB query cannot gather both the matched-documents and the number of 
matches, so a minimum of 2 queries is needed: 1 to return the count and 1 to return the documents. However, rather than put both these queries in the `/search` route,  
they are separated since the `count` only needs to be retrieved once per search from the front-end, while the `/search` route can be accessed multiple times per search 
to retrieve different pages.

#### Live Search `/search/live` ####

The `/search/live` route provides typeahead-like live search capability. It does a text-search query of `db.xmldata` taking in only the "OrganizationName" `orgName` as a 
parameter. It returns the top 5 matches.

#### Checking availability `/IsOnline` ####

The `/IsOnline` route takes in the `EIN` and `ObjectId` of a document and returns `true` if it is available for download and `false` otherwise.

This route is used on the front-end when displaying the different filings per an organization by disabling the tabs where a particular tax period's data is unavailable.

#### Retrieving Tax Data `/getTaxData` ####

The `/getTaxData` route takes in the `EIN` and `ObjectId` of a document and retrieves its information from AWS. It does this by using the URL found in the `db.tax` 
document's `URL` field, downloads the information from that URL, and then parses it according to the form in the `FormType` field. The parsing is done in the `routes/ 
xmltojson.js` file. 


## Parsing XML data ##

The `/routes/xmltojson.js` file contains parsing functions for parsing the 990, 990EZ, and 990PF forms. It uses the [xml2js](https://github.com/Leonidas-from-XIV/
node-xml2js) parsing library. 

Since each form type is different, and even within them different years use different schemas. The parsing functions dynamically decide which set of field-text to use for 
parsing a particular field by figuring out which version of a particular form type the tax return is. These field-text sets may need to be updated to parse additional 
information, and new field-text sets may need to be added when newer versions of tax forms come out.

Also, not all the parsing functions extract all of the same fields as the others (as of Aug 23, 2016). For example, the `Mission`, `Location` and `Net Assets` fields are 
not currently supported for 990PF forms, and `PrincipalOfficer` and `Location` are not supported for the 990EZ forms. 

## Front-end with AngularJS ##

### Search Controller ###

The search controller is the "broadest" controller and covers all of the searching and pagination functionality. 

The search box has form-validation using RegEx:
~~~
$scope.validOrgNameRegex = /[\w]+/;
~~~
This ensures that only string queries are allowed.

`searchfor` is the main function of this controller, and it issues an `HTTP GET` request on the `/search` API route. There are also helper functions, and functions that 
cover additional capabilities such as typeahead and pagination. Descriptive comments can be found in the source code.

### Results Controller ###

This controller covers the displaying of the results and retrieval of the results' data. 

The results are displayed using [Angular-UI-Bootstrap's Accordion directive](https://angular-ui.github.io/bootstrap/#/accordion). Whenever an `accordion-group` is 
expanded, tabs are created for each of the different tax periods, and any tax periods whose data is not available are disabled. The `item.most_recent_TabIndex` is also 
created at this time by using the `findOnline` function so that the most-recent available tab is always displayed by default.

Everytime a tab is clicked, that tab's tax data is requested from the API and then displayed once retrieved. There is a minor delay in doing this because the back-end has 
to issue an `HTTP GET` request of its own, and download/parse the data.

## Maintenance ##

With each new version of the IRS990 form, the IRS may modify the XML schema tags for fields as it has done in the past. Thus newer filings may require modification of the parsing functions in `/routes/xmltojson.js` in order to be parsed correctly.

The IRS990 Bucket is updated monthly to accomodate new filings, thus the database will need to be updated as well. I recommend using Python to write an update script.

#### Recommended Database Update Procedure ####
1. Download new `index.json` file from [Amazon Web Services](https://aws.amazon.com/public-data-sets/irs-990/)
2. Import into a temporary collection
3. Use a diff checker to isolate the new documents by comparing the temporary collection with the `db.tax` collection
4. For each new document:
    1. Add it to the `db.tax` collection
    2. Check if the foundation exists in `db.xmldata` by using the `EIN` number. 
        * If it exists, download and parse the data (if it is online) and replace the existing document with the new, parsed data
    	* If it does not exist, download and parse the data (if it is online) and add it to the collection
    3. Check if the foundation exists in `db.reference` by using the `EIN` number.
        * If the foundation exists, append to the existing document the following
         
                {
                    "TaxPeriod": <new document's TaxPeriod>,
                    "id": <new document's ObjectId that was created in step 4.1>
                } 
             
        * If the foundation does not exist, add a new document following the schema of the `db.reference` collection.

 5. Recreate each collection's indexes

## Moving Forward ##

### Ideas for additional features ###

#### Batch-Search ####
Search for multiple names of people at the same time.

#### Displaying Expenses ####
Use a pie-chart to show where foundations are spending their money and to show proportion of total expenses spent on grants/gifts.

#### Where does a foundation give its money? ####
This information is available in the IRS990 data. It would be helpful to see, for example, if a foundation only gives out 1 big gift, or if they
give out dozens of small gifts. 

#### Genres/Category specific giving ####
For example, if you are the Bentley Historical Library, you want to find foundations that give to historical archives, collections, libraries etc (similar organizations)
so that perhaps you (the Bentley Historical Library), can nab a share.

#### Network Graphs of UMich People ####
With the DART name-match API, use it to create Network Graphs/visualizations of connections between matched `KeyPeople`. 

#### Download Bare-minimum Information to create DART Records ####
Add functionaility to download information about an organization so that a DART record can be created for it. Also download the `KeyPeople` for relationship mapping in DART.

## Issues ##
1. Clicking the title to go back to home page results in "Angular Flash". This can be fixed easily with [ng-bind](http://stackoverflow.com/questions/28514241/angularjs-how-to-prevent-code-flash-in-page-while-loading)
