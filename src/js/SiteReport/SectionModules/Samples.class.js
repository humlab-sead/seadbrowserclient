import css from '../../../stylesheets/style.scss';

/*
* Class: Samples
 */
class Samples {
	constructor(hqs, siteId, renderAnchor) {
		this.hqs = hqs;
		//this.siteReport = this.hqs.siteReportManager.siteReport;
		this.siteId = siteId;
		this.anchor = renderAnchor;
        this.buildComplete = false;
		this.data = {
			"sampleGroups": []
		};
	}
	
	
	/*
	* Function: render
	*
	* Renders samples table. Although it uses the renderSection function in the SiteReport class,
	* so it really just compiles the data in an appropriate format and hands it over.
	*
	 */
	render() {
		
		var section = {
			"name": "samples",
			"title": "Sample groups",
			"collapsed": false,
			"contentItems": [{
				"name": "sampleGroups",
				"title": "Table",
				"data": {
					"columns": [],
					"rows": []
				},
				"renderOptions": [{
					"selected": true,
					"type": "table",
					"name": "Spreadsheet",
					"options": [
						{
							"showControls": false,
							"name": "columnsVisibility",
							"hiddenColumns": [
								3
							]
						}
					]
				}]
			}]
		};
		
		section.contentItems[0].data.columns = [
			{
				"dataType": "subtable",
				"pkey": false
			},
			{
				"dataType": "number",
				"pkey": true,
				"title": "Sample group id"
			},
			{
				"dataType": "string",
				"pkey": false,
				"title": "Group name"
			},
			{
				"dataType": "string",
				"pkey": false,
				"title": "Method"
			},
			{
				"dataType": "string",
				"pkey": false,
				"title": "Analyses"
			},
			{
				"dataType": "string",
				"pkey": false,
				"title": "Reference"
			}
			];
		
		for(var key in this.data.sampleGroups) {
			var sampleGroup = this.data.sampleGroups[key];
			
			
			var subTableColumns = [
				{
					"pkey": true,
					"title": "Sample name"
				},
				{
					"title": "Sample type"
				}
			];
			
			var subTable = {
				"columns": subTableColumns,
				"rows": []
			};
			
			for(var k in sampleGroup.samples) {
				var sample = sampleGroup.samples[k];
				
				this.hqs.hqsEventListen("fetchSampleDimensions", () => {
					console.log("All sample dimensions fetched");
				});

				subTable.rows.push([
					{
						"type": "cell",
						"value": sample.sampleName,
						"tooltip": ""
					},
					/*
					{
						"type": "cell",
						"tooltip": "",
						"callback": (row, targetCell) => { //FIXME: What if all of these turn up empty though? What then bro? WHAT THEN???
							//FIXME: Yeah... We're gonna have to the loading of this data before the table is rendered, sorry bro, but that's just the way it's gotta be.
							var sampleId = row[0].value;
							this.fetchSampleDimensions(sampleId, targetCell);
						}
					},
					*/
					{
						"type": "cell",
						"value": sample.sampleTypeName,
						"tooltip": sample.sampleTypeDescription == null ? "" : sample.sampleTypeDescription
					}
				]);
				
			}
			
			
			var biblioParsed = "";
			var authors = "";
			for(var key in sampleGroup.biblio) {
				var b = sampleGroup.biblio[key];
				biblioParsed += b.publication_type+"<br />";
				biblioParsed += b.biblio_author+"<br />";
				biblioParsed += b.biblio_title+"<br />";
				biblioParsed += b.biblio_year+"<br />";
				biblioParsed += b.publisher_name+", "+b.place_of_publishing_house+"<br />";
				if(authors.length > 0) {
					authors += ", ";
				}
				authors += b.biblio_author;
			}
			
			if(biblioParsed.length == 0) {
				biblioParsed = "No reference found.";
				authors = "None";
			}

			let analysesButtons = [];
			for(let ak in sampleGroup.analyses) { //Define in-cell buttons to be rendered in the table cell
				let methodId = sampleGroup.analyses[ak].method_id;
				let sampleGroupId = sampleGroup.analyses[ak].sample_group_id;
				let datasetId = sampleGroup.analyses[ak].dataset_id;
				//sga = sample group analysis, just a unique identifier for this
				analysesButtons.push({
					nodeId: "sga-"+methodId+"-"+sampleGroupId+"-"+datasetId,
					title: sampleGroup.analyses[ak].method_abbrev_or_alt_name,
					callback: (evt) => { //What happens when this button is clicked
						let buttonId = $(evt.currentTarget).attr("id");
						let components = buttonId.split("-");
						let methodId = components[1];
						let sampleGroupId = components[2];
						let datasetId = components[3];

						//site-report-level-content
						if($("[site-report-section-name="+methodId+"] > .site-report-level-content").attr("collapsed") == "true") {
							$("[site-report-section-name="+methodId+"] > .site-report-level-title").click();
						}
						
						//Scroll into view of data when it's done rendering
						let scrollInterval = setInterval(() => {
							//Is data is still rendering?
							if($(".data-vis-container > .siteReportContentItemLoadingMsg", "#cic-"+datasetId).length == 0) {
								clearInterval(scrollInterval);
								$("#cic-"+datasetId)[0].scrollIntoView();
								$("#cic-"+datasetId).effect("highlight", {
									color: css.auxColor,
									duration: 3000
								});
							}
						}, 100);
					}
				});
			}

			section.contentItems[0].data.rows.push([
				{
					"type": "subtable",
					"value": subTable
				},
				{
					"type": "cell",
					"value": sampleGroup.sampleGroupId,
					"tooltip": ""
				},
				{
					"type": "cell",
					"value": sampleGroup.sampleGroupName,
					"tooltip": sampleGroup.sampleGroupDescription == null ? "" : sampleGroup.sampleGroupDescription
				},
				{
					"type": "cell",
					"value": sampleGroup.methodName,
					"tooltip": sampleGroup.methodDescription == null ? "" : sampleGroup.methodDescription
				},
				{
					"type": "cell",
					"value": "",
					"buttons": analysesButtons,
					"tooltip": "Analyses performed on this sample group"
				},
				{
					"type": "cell",
					"value": authors,
					"tooltip": {
						"msg": biblioParsed,
						"options": {}
					}
				}
			]);
			
		}
		
		this.hqs.siteReportManager.siteReport.renderSection(section);
	}

	/*
	* Function: fetch
	*
	* Will fetch the sample groups.
	*
	 */
	async fetch() {
		await new Promise((resolve, reject) => {
			$.ajax(this.hqs.config.siteReportServerAddress+"/qse_sample_group?site_id=eq."+this.siteId, {
				method: "get",
				dataType: "json",
				success: (data, textStatus, xhr) => {
					let auxiliaryFetchPromises = [];
					for(var key in data) {
						var sampleGroup = data[key];
						var sampleGroupKey = this.hqs.findObjectPropInArray(this.data.sampleGroups, "sampleGroupId", sampleGroup.sample_group_id);
						
						if(sampleGroupKey === false) {
							this.data.sampleGroups.push({
								"sampleGroupId": sampleGroup.sample_group_id,
								"methodId": sampleGroup.method_id,
								"methodAbbreviation": sampleGroup.method_abbrev_or_alt_name,
								"methodDescription": sampleGroup.method_description,
								"methodName": sampleGroup.method_name,
								"sampleGroupDescription": sampleGroup.sample_group_description,
								"sampleGroupDescriptionTypeDescription": sampleGroup.sample_group_description_type_description,
								"sampleGroupDescriptionTypeName": sampleGroup.sample_group_description_type_name,
								"sampleGroupName": sampleGroup.sample_group_name,
								"samplingContextId": sampleGroup.sampling_context_id,
								"samples": []
							});
							

							auxiliaryFetchPromises.push(this.fetchSampleGroupBiblio(sampleGroup.sample_group_id));
							auxiliaryFetchPromises.push(this.fetchSamples(sampleGroup.sample_group_id));
							auxiliaryFetchPromises.push(this.fetchSampleGroupAnalyses(sampleGroup.sample_group_id));
						}
						
					}

					Promise.all(auxiliaryFetchPromises).then((data) => {
						this.render();
						this.buildComplete = true;
					});

					resolve(data);
				},
				error: () => {
					reject();
				}
			});
		});
	}
	
	async fetchSampleGroupAnalyses(sampleGroupId) {
		return await new Promise((resolve, reject) => {
			$.ajax(this.hqs.config.siteReportServerAddress+"/qse_sample_group_analyses?sample_group_id=eq."+sampleGroupId, {
				method: "get",
				dataType: "json",
				success: (data, textStatus, xhr) => {
					for(let key in this.data.sampleGroups) {
						if(typeof this.data.sampleGroups[key].analyses == "undefined") {
							this.data.sampleGroups[key].analyses = [];
						}
						for(let ak in data) {
							let analysis = data[ak];
							if(this.data.sampleGroups[key].sampleGroupId == analysis.sample_group_id) {
								this.data.sampleGroups[key].analyses.push(analysis);
							}
						}
					}
					resolve(data);
				},
				error: () => {
					reject();
				}
			});
		});
	}

	async fetchSampleGroupBiblio(sampleGroupId) {
		return await new Promise((resolve, reject) => {
			$.ajax(this.hqs.config.siteReportServerAddress+"/qse_sample_group_biblio?sample_group_id=eq."+sampleGroupId, {
				method: "get",
				dataType: "json",
				success: (data, textStatus, xhr) => {
					var sampleGroup = this.getSampleGroupById(sampleGroupId);
					sampleGroup.biblio = data;
					resolve(data);
				},
				error: () => {
					reject();
				}
			});
		});
	}
	
	async fetchSamples(sampleGroupId) {
		return await new Promise((resolve, reject) => {
			$.ajax(this.hqs.config.siteReportServerAddress+"/qse_sample?sample_group_id=eq."+sampleGroupId, {
				method: "get",
				dataType: "json",
				success: (data, textStatus, xhr) => {
					for(var key in data) {
						var sampleGroupKey = this.hqs.findObjectPropInArray(this.data.sampleGroups, "sampleGroupId", data[key].sample_group_id);
						var sample = {
							"sampleId": data[key].physical_sample_id,
							"sampleTypeId": data[key].sample_type_id,
							"sampleTypeName": data[key].sample_type_name,
							"sampleName": data[key].sample_name,
							"sampleTypeDescription": data[key].sample_type_description
						};
						this.data.sampleGroups[sampleGroupKey].samples.push(sample);
						//this.fetchSampleModifiers(data[key].physical_sample_id, sample);
						//this.fetchSampleDimensions(data[key].physical_sample_id, sample); //FIXME: Yeah... this is a performance-hog and it turns out empty at least some of the time anyway... so... that's gonna be a no from me dog
						
					}
					
					resolve(data);
				},
				error: () => {
					reject();
				}
			});
		});
	}
	
	fetchSampleModifiers(sampleId, targetCell) {
		var xhr1 = this.hqs.pushXhr(null, "fetchSampleModifiers");
		xhr1.xhr = $.ajax(this.hqs.config.siteReportServerAddress+"/qse_sample_modifiers?physical_sample_id=eq."+sampleId, {
			method: "get",
			dataType: "json",
			success: (data, textStatus, xhr) => {
				console.log(data);
				
				//$("#"+targetCell).html(d);
				this.hqs.popXhr(xhr1);
			}
		});
	}

	fetchSampleDimensions(sampleId, targetCell) {
		var xhr1 = this.hqs.pushXhr(null, "fetchSampleDimensions");
		xhr1.xhr = $.ajax(this.hqs.config.siteReportServerAddress+"/qse_sample_dimensions?physical_sample_id=eq."+sampleId, {
			method: "get",
			dataType: "json",
			success: (data, textStatus, xhr) => {
				
				var d = "";
				for(var key in data) {
					d += data[key].dimension_value+" "+data[key].unit_abbrev;
					if(key != data.length-1) {
						d += ", ";
					}
				}
				
				$("#"+targetCell).html(d);
				this.hqs.popXhr(xhr1);
			}
		});
	}
	
	getSampleGroupById(sampleGroupId) {
		for(var key in this.data.sampleGroups) {
			if(this.data.sampleGroups[key].sampleGroupId == sampleGroupId) {
				return this.data.sampleGroups[key];
			}
		}
		return false;
	}
	
	destroy() {
	}
}

export { Samples as default }