var xml2js = require('xml2js');
var parser = new xml2js.Parser({explicitArray: false, ignoreAttrs: true});

module.exports = {

	form990: function(xml, callback){
		parser.parseString(xml, function(err, result){
			if(err){
				console.log(err);
			}
			else{
				var data = {}
				// Choose between the newer or older schemas
				// Older (used before ~2013)
				if (result.Return.ReturnData.IRS990.TotalExpensesCurrentYear){
					Officer = "NameOfPrincipalOfficerPerson";
					Mission = "MissionDescription";
					Location = "StateLegalDomicile";
					Revenue = "TotalRevenueCurrentYear";
					GrantsPaid = "GrantsAndSimilarAmntsCY";
					Expenses = "TotalExpensesCurrentYear";
					NetAssets = "NetAssetsOrFundBalancesEOY";
					keyPeople = "Form990PartVIISectionA";
					keyPeopleNames = "NamePerson";
					title = "Title"
				}
				// Newer (used from ~2013-2014 on)
				else{
					Officer = "PrincipalOfficerNm";
					Mission = "MissionDesc";
					Location = "LegalDomicileStateCd";
					Revenue = "CYTotalRevenueAmt";
					GrantsPaid = "CYGrantsAndSimilarPaidAmt";
					Expenses = "CYTotalExpensesAmt";
					NetAssets = "NetAssetsOrFundBalancesEOYAmt";
					keyPeople = "Form990PartVIISectionAGrp"
					keyPeopleNames = "PersonNm";
					title = "TitleTxt"	
				}

				data["PrincipalOfficer"] = result.Return.ReturnData.IRS990[Officer];
				data["Mission"] = result.Return.ReturnData.IRS990[Mission];
				data["Location"] = result.Return.ReturnData.IRS990[Location];
				data["CYRevenue"] = result.Return.ReturnData.IRS990[Revenue];
				data["GrantsPaid"] = result.Return.ReturnData.IRS990[GrantsPaid];
				data["CYExpenses"] = result.Return.ReturnData.IRS990[Expenses];
				data["CYNetAssets"] = result.Return.ReturnData.IRS990[NetAssets];
			

				var people = [];

				try{
					notableMembers = Array.from(result.Return.ReturnData.IRS990[keyPeople]);;
					for (var i = 0; i < notableMembers.length; ++i){
						PersonTitle = [notableMembers[i][keyPeopleNames], notableMembers[i][title]];
						people.push(PersonTitle);
					}
				}
				catch (e){
					console.log(e, 'Error finding key people');
				}

				data["keyPeople"] = people;
				callback(data);
			}
		})


	},

	form990ez: function(xml, callback){
		parser.parseString(xml, function(err, result){
			if(err){
				console.log(err);
			}
			else{
				var data = {}
				// Choose between the newer or older schemas
				// Older
				if (result.Return.ReturnHeader.Filer.Name){
					//Officer = "PrincipalOfficerPerson";
					Mission = "PrimaryExemptPurpose";
					//Location = "StateLegalDomicile";
					Revenue = "TotalRevenue";
					GrantsPaid = "GrantsAndSimilarAmountsPaid";
					Expenses = "TotalExpenses";
					NetAssets = "NetAssetsOrFundBalancesEOY";
					keyPeople = "OfficerDirectorTrusteeKeyEmpl";
					keyPeopleNames = "PersonName";
					title = "Title";
				}
				// Newer
				else{
					//Officer = "PrincipalOfficerNm";
					Mission = "PrimaryExemptPurposeTxt";
					//Location = "LegalDomicileStateCd";
					Revenue = "TotalRevenueAmt";
					GrantsPaid = "GrantsAndSimilarAmountsPaidAmt";
					Expenses = "TotalExpensesAmt";
					NetAssets = "NetAssetsOrFundBalancesEOYAmt";
					keyPeople = "OfficerDirectorTrusteeEmplGrp";
					keyPeopleNames = "PersonNm";
					title = "TitleTxt";
				}

				//data["PrincipalOfficer"] = result.Return.ReturnData.IRS990EZ[Officer];
				data["Mission"] = result.Return.ReturnData.IRS990EZ[Mission];
				//data["Location"] = result.Return.ReturnData.IRS990EZ[Location];
				data["CYRevenue"] = result.Return.ReturnData.IRS990EZ[Revenue];
				data["GrantsPaid"] = result.Return.ReturnData.IRS990EZ[GrantsPaid];
				data["CYExpenses"] = result.Return.ReturnData.IRS990EZ[Expenses];
				data["CYNetAssets"] = result.Return.ReturnData.IRS990EZ[NetAssets];
			
				var people = [];

				try{
					notableMembers = Array.from(result.Return.ReturnData.IRS990EZ[keyPeople]);
					for (var i = 0; i < notableMembers.length; ++i){
						PersonTitle = [notableMembers[i][keyPeopleNames], notableMembers[i][title]];
						people.push(PersonTitle);
					}
				}
				catch (e){
					console.log(e, 'Error finding key people');
				}

				data["keyPeople"] = people;
				callback(data);
			}
		})
	},

	form990pf: function(xml, callback){
		parser.parseString(xml, function(err, result){
			if(err){
				console.log(err);
			}
			else{
				var data = {}
				// Choose between the newer or older schemas
				if (result.Return.ReturnHeader.BusinessOfficerGrp){
					Officer = "BusinessOfficerGrp";
					OffName = "PersonNm";
					// Mission = "PrimaryExemptPurposeTxt";
					// Location = "LegalDomicileStateCd";
					Revenue = "TotalRevAndExpnssAmt";
					GrantsPaid = "ContriPaidDsbrsChrtblAmt";
					Expenses = "TotalExpensesRevAndExpnssAmt";
					// NetAssets = "NetAssetsOrFundBalancesEOYAmt";
					keyPeopleInfo = "OfficerDirTrstKeyEmplInfoGrp"
					keyPeople = "OfficerDirTrstKeyEmplGrp";
					keyPeopleNames = "PersonNm";	
					title = "TitleTxt";				
				}
				else if (result.Return.ReturnHeader.Officer){
					Officer = "Officer";
					OffName = "Name";
					// Mission = "PrimaryExemptPurpose";
					// Location = "StateLegalDomicile";
					Revenue = "TotalRevenueAndExpenses";
					GrantsPaid = "ContriGiftsPaidDsbrsChrtblPrps";
					Expenses = "TotalExpensesRevAndExpnss";
					// NetAssets = "NetAssetsOrFundBalancesEOY";
					keyPeopleInfo = "OfcrDirTrusteesKeyEmployeeInfo"
					keyPeople = "OfcrDirTrusteesOrKeyEmployee";
					keyPeopleNames = "PersonName";
					title = "Title";
				}
				else{
					Officer = "BusinessOfficerGrp";
					OffName = "PersonNm";
					// Mission = "PrimaryExemptPurposeTxt";
					// Location = "LegalDomicileStateCd";
					Revenue = "TotalRevAndExpnssAmt";
					GrantsPaid = "ContriPaidDsbrsChrtblAmt";
					Expenses = "TotalExpensesRevAndExpnssAmt";
					// NetAssets = "NetAssetsOrFundBalancesEOYAmt";
					keyPeopleInfo = "OfficerDirTrstKeyEmplInfoGrp"
					keyPeople = "OfficerDirTrstKeyEmplGrp";
					keyPeopleNames = "PersonNm";	
				}

				data["PrincipalOfficer"] = result.Return.ReturnHeader[Officer][OffName];
				// data["Mission"] = result.Return.ReturnData.IRS990PF[Mission];
				// data["Location"] = result.Return.ReturnData.IRS990PF[Location];
				data["CYRevenue"] = result.Return.ReturnData.IRS990PF.AnalysisOfRevenueAndExpenses[Revenue];
				data["GrantsPaid"] = result.Return.ReturnData.IRS990PF.AnalysisOfRevenueAndExpenses[GrantsPaid];
				data["CYExpenses"] = result.Return.ReturnData.IRS990PF.AnalysisOfRevenueAndExpenses[Expenses];
				// data["CYNetAssets"] = result.Return.ReturnData.IRS990PF[NetAssets];
			
				var people = [];
				try{
					notableMembers = Array.from(result.Return.ReturnData.IRS990PF[keyPeopleInfo][keyPeople]);
					for (var i = 0; i < notableMembers.length; ++i){
						PersonTitle = [notableMembers[i][keyPeopleNames], notableMembers[i][title]];
						people.push(PersonTitle);
					}
				}
				catch (e){
					console.log(e, 'Error finding key people');
				}

				data["keyPeople"] = people;
				callback(data);
			}
		})
	}

}
