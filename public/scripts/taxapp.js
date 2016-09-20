var app = angular.module('app', ['ui.bootstrap']);


// Searching
app.controller('searchController', ['$scope', '$http', function($scope, $http){

	// Required parameters for sending a search query
	$scope.searchform = {};
	$scope.searchform.primarySearch = "";
	$scope.validOrgNameRegex = /[\w]+/;
	$scope.searchStatus = null;
	$scope.showResults = false;

	// Pagination
	$scope.CurrentPage = 1;
	$scope.ItemsPerPage = 10;
	$scope.TotalItems = null;
	
	$scope.showingBegin = null;
	$scope.showingEnd = null;
	$scope.NumItemsOnCurrentPage = null;

	// Search that sends 1 http request and gets all the results from the database
	var searchfor = function(isValid){
		if(isValid){
			item = {
				main: $scope.searchform.primarySearch,
				CurrentPage: $scope.CurrentPage,
				ItemsPerPage: $scope.ItemsPerPage
			}
			$http.get('/search', {params: item}).then(function(response){
				$scope.searchResp = response.data;
				if (!angular.isArray($scope.searchResp)){
					$scope.searchStatus = response.data;
					$scope.showResults = false;
				}
				else{
					$scope.searchStatus = null;
					$scope.NumItemsOnCurrentPage = $scope.searchResp.length;
					prepareAdditionalFields($scope.searchResp, function(response){
						CalculateShowingPages();
						$scope.showResults = true;
					});
				}
			});
		}
	}

	// Called whenever form is submitted (so that a a call to FindNumItems only needs to happen once);
	$scope.searchHelper = function(param){
		$scope.CurrentPage = 1;
		FindNumItems();
		searchfor(param);
	}

	// Retrievew the total number of items that the database query returns
	var FindNumItems = function(){
		item = {main: $scope.searchform.primarySearch}
		$http.get('/search/FindNumItems', {params:item}).then(function(response){
			$scope.TotalItems = response.data;
		});
	}

	// Determines the "Showing Results 11-20 of 348" numbers whenever a new page is selected
	var CalculateShowingPages = function(){
		$scope.showingBegin = ($scope.CurrentPage - 1) * $scope.ItemsPerPage + 1;
		$scope.showingEnd = ($scope.showingBegin + $scope.NumItemsOnCurrentPage - 1);
	}

	// Helper Function for changing the page
	$scope.changePage = function(){
		searchfor(true);
	}

	// Initialize 2 fields for displaying the information in the table when the row is expanded (item.downloadData & item.toggle).
	// 		item.downloadData will be used whenever toggle is called and will store the individual item's information from the API request.
	// 		item.toggle is used to toggle the showing of item.downloadData per item.
	// Additionally, item.most_recent_TabIndex stores which Tab is the most_recent available tab
	var prepareAdditionalFields = function(searchResp, callback){
		var completed = 0;
		for (var i = 0; i < searchResp.length; ++i){
			item = searchResp[i];	
			item.downloadData = '';
			item.toggle = false;
			item.most_recent_TabIndex = -1;
		}
		callback();
	}

	// Live search for the typeahead feature
	$scope.searchlive = function(val){
		if(val){
			return $http.get('/search/live', {
				params: {
					main: val
				}
			}).then(function(response){
				return response.data;	
			});
		}
		else{ 
			$scope.searchStatus = '';
			$scope.showResults = false;
		}
	}

	// Only is called when a typeahead option is selected. Adds quotes to the search term
	// so only matches that match the selected string exactly are found, rather than fuzzy matches
	$scope.formatLiveInput = function(){
		var tempSearchTerm = $scope.searchform.primarySearch;
		$scope.searchform.primarySearch = '"' + tempSearchTerm + '"';
	}

}]);

// Showing Results
app.controller('ResultsController', ['$scope', '$http', function($scope, $http){
	$scope.expand = function(item){
		if (!item.toggle){
			findOnline(item, function(){
				getMostRecentTab(item.RefsByTaxPeriod, function(response){
					item.most_recent_TabIndex = response;
					item.toggle = !item.toggle;
				});
			});
		}
		else{
			item.toggle = !item.toggle;
		}
	} 

	// Called whenever an accordion-group is expanded
	//		-Downloads the most recent available year's taxdata
	$scope.displayDataHelper = function(item, year, id){
		displayData(item, year, id, function(){});
	}

	// Gets tax data and then binds the result to the item for display
	var displayData = function(item, year, id, callback){
		getTaxData(item.EIN, year, id, function(response){
			item.downloadData = response.data;
			callback();
		});
	}

	// Sends HTTP request to get the IRS990 data given the ObjectID
	var getTaxData = function(EIN_in, TaxPeriod_in, id_in, callback){
		var item = {EIN: EIN_in, TaxPeriod: TaxPeriod_in, id: id_in};
		$http.get('/getTaxData', {params: item}).then(function(response){
			callback(response);
		})
	}

	var findOnline = function(item, callback){
		var count = 0;
		angular.forEach(item.RefsByTaxPeriod, function(value, key){
			
			obj = {EIN: item.EIN, TaxPeriod: value.TaxPeriod, id: value.id};
			$http.get('/IsOnline', {params: obj}).then(function(response){
				if(response.data == true){
					value.disabled = false;
					item.isOnline = true;
				}
				else{
					value.disabled = true;
				}
				
				value.tabIndex = count;
				if(count == item.RefsByTaxPeriod.length - 1){
					callback();
				}
				count++;			
			});
		});
	}

	var getMostRecentTab = function(TaxPeriodArray, callback){
		var most_recent = 0;
		var most_recent_index = 0;
		for(var i = 0; i < TaxPeriodArray.length; ++i){
			if(!TaxPeriodArray[i].disabled){
				if(TaxPeriodArray[i].TaxPeriod > most_recent){
					most_recent = TaxPeriodArray[i].TaxPeriod;
					most_recent_index = TaxPeriodArray[i].tabIndex;
				}
			}
		}
		callback(most_recent_index);
	}	
}]);

// Handling DART interaction of results
app.controller('PeopleController', ['$scope', function($scope){
	// Toggle the expand/collapse of displaying the key people
	$scope.expandPeopleStatus = false;

	// Expands the key people section upon button-click, runs the DART Name-match
	$scope.expandPeople = function(peopleArray){
		// If its not currently being displayed, then run name-match before displaying
		if (!$scope.expandPeopleStatus){
			findMatches(peopleArray, function(response){
				$scope.expandPeopleStatus = !$scope.expandPeopleStatus;
			})
		}
		else{
			$scope.expandPeopleStatus = !$scope.expandPeopleStatus;
		}
	}

	var findMatches = function(peopleArray, callback){
		var counter = 0;
		for (var i = 0; i < peopleArray.length; ++i){
			(function(index, person){
				name_match(person, function(response){
					if(response){
						peopleArray[index]["isMatched"] = response;
					}
					else{
						peopleArray[index]["isMatched"] = '';
					}
					// Callback when all the names have been processed
					if (index == peopleArray.length - 1){
						callback("Done with name_match")
					}
				});
			}(i, peopleArray[i][0]) );
		}	
	}

	var name_match = function(name, callback){
		var ID = 77777777;
		if(name.length % 3 == 0){
			callback(ID);
		}
		else{
			callback(false);
		}
	}
}]);

// Custom filter option to change items to array for ng-repeat
app.filter('toArray', function(){
	return function(input){
		if(angular.isArray(input)){
			return input;
		}
		else{
			return [input];
		}
	};
});

// Custom filter that reduces something like "201412" to "2014"
// Used in reducing a TaxPeriod field such as "201412" to "2014"
app.filter('CleanYear', function(){
	return function(input){
		return input.slice(0, 4);
	}
});