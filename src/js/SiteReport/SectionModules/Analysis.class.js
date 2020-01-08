import GenericDataset from './DatasetModules/GenericDataset.class';
import AbundanceDataset from './DatasetModules/AbundanceDataset.class';
import MeasuredValueDataset from './DatasetModules/MeasuredValueDataset.class';
import DendrochronologyDataset from "./DatasetModules/DendrochronologyDataset.class";
import CeramicDataset from "./DatasetModules/CeramicDataset.class";
/*
* Class: Analysis
*
 */

class Analysis {
	/*
	* Function: constructor
	*/
	constructor(hqs, siteId) {
		this.hqs = hqs;
		this.siteId = siteId;
		this.buildComplete = false;
		//The section structure this will result in after everything is fetched and parsed.
		this.section = {
			"name": "analyses",
			"title": "Analyses",
			"contentItems": [],
			"sections": [] //Each type of analysis/method will get its own section here
		};
		
		this.data = {
			"analyses": []
		};
		
		this.meta = {
			"methods": []
		};
		
		/* ABOUT analysisModules
		* So what's going on here is that there's a lot of different type of analyses that can be done and lots of different type of datasets
		* so in order for this class not to get HUGE we break them out into modules. So each module takes responsibility for knowing how to handle
		* a certain type of analysis/dataset, both in terms of what extra data can be fetched and how to best render it.
		* All these modules gets registered here and then this class does the basic loading of analyses and then each analysis
		* is handed off to a module (hopefully - assuming there will always be a module written for every type of analysis in the db).
		*
		* NOTE: Order is important here, more specific modules should be first and more generic last, since whichever module claims an analysis first
		* is the one to get it.
		 */
		this.analysisModules = [];
		this.activeAnalysisModules = [];
		this.analysisModules.push({
			"className": AbundanceDataset
		});
		this.analysisModules.push({
			"className": MeasuredValueDataset
		});
		this.analysisModules.push({
			"className": DendrochronologyDataset
		});
		this.analysisModules.push({
			"className": CeramicDataset
		});
		this.analysisModules.push({
			"className": GenericDataset
		});

		for(let key in this.analysisModules) {
			this.analysisModules[key]["instance"] = new this.analysisModules[key]["className"](this);
		}
		
	}

	/*
	* Function: render
	*/
	render() {
		this.hqs.siteReportManager.siteReport.renderSection(this.section);
		this.destroyAllAnalysisModules();
	}
	
	/*
	* Function: destroyAllAnalysisModules
	*/
	destroyAllAnalysisModules() {
		for(var key in this.activeAnalysisModules) {
			this.activeAnalysisModules[key].destroy();
			this.activeAnalysisModules.splice(key, 1);
		}
	}

	/*
	* Function: fetch
	*/
	async fetch() {
		//Fetching all analyses for this site
		await new Promise((resolve, reject) => {

			$.ajax(this.hqs.config.siteReportServerAddress+"/qse_site_analyses?site_id=eq."+this.siteId, {
				method: "get",
				dataType: "json",
				success: (data, textStatus, xhr) => {
					for(var key in data) { //For each analysis...
						//Each analysis (data[key]) here contains:
						//method_id - Defines what type of analysis this is
						//dataset_id - A key you can use to fetch more information about this dataset (a dataset is a result set from an analysis)
						//sample_group_id - The sample group this analysis was performed on
						
						//Check that this datasetId is not already registered. Sometimes we get duplicate dataset ID's with different sample groups as individual rows,
						//presumably because multiple sample groups are sometimes used to perform an analysis
						var analysisKey = this.hqs.findObjectPropInArray(this.data.analyses, "datasetId", data[key].dataset_id);
						
						if(analysisKey === false) {
							this.data.analyses.push({
								"methodGroupId": data[key].method_group_id,
								"methodId": data[key].method_id,
								"datasetId": data[key].dataset_id,
								"sampleGroups": [{
									"sampleGroupId": data[key].sample_group_id,
									"samples": []
								}]
							});
						}
						else {
							this.data.analyses[analysisKey].sampleGroups.push({
								"sampleGroupId": data[key].sample_group_id,
								"samples": []
							});
						}
					}
					
					let analysesPromises = this.delegateAnalyses(this.data.analyses);

					Promise.all(analysesPromises).then(() => {
						this.render();
						resolve();
					});

					//Now that we have stored the analyses properly, fetch more data about each one.
					//(analysis and dataset is pretty much synonymous since the dataset is a result of an analysis)
					/*
					for(var key in this.data.analyses) {
						analysisPromises.push(this.fetchAnalysis(this.data.analyses[key].datasetId));
					}
					

					let promises = methodPromises.concat(analysisPromises);

					Promise.all(promises).then((values) => {
						//console.log("All analyses fetched and built - Running Analysis Render", values);
						this.render();
						resolve(data);
					});
					*/
				},
				error: () => {
					reject();
				}
			});
		});
	}

	/** 
	* Function: delegateAnalyses
	*
	* 
	*
	*/
	delegateAnalyses(analyses) {
		let analysesPromises = [];
		for(var key in this.analysisModules) {
			let promise = this.analysisModules[key]["instance"].offerAnalyses(analyses);
			analysesPromises.push(promise);
		}
		return analysesPromises;
	}
	
	/*
	* Function: fetchAnalysis
	*
	* Fetches all data about a certain anlysis/dataset, and stores the data in the master data structure. If you thought you were actually gonna get it returned
	* then I must laugh in your general direction, because this is now how the glory of asynchronous javascript work you simple peasant. You want data? You get a slap to the face, and even that is quite generous.
	*
	* Parameters:
	* datasetId
	 */
	async fetchAnalysis(dataset) {
		await new Promise((resolve, reject) => {
			$.ajax(this.hqs.config.siteReportServerAddress+"/qse_analysis?dataset_id=eq."+dataset.datasetId, {
				method: "get",
				dataType: "json",
				success: (data, textStatus, xhr) => {
					//Find the relevant analysis in the master data structure
					dataset.dataTypeId = data[0].data_type_id;
					dataset.masterSetId = data[0].master_set_id; //1 or 2 which is Bugs or MAL, also often empty
					dataset.dataTypeName = data[0].data_type_name;
					dataset.dataTypeDefinition = data[0].definition;
					dataset.methodId = data[0].method_id;
					dataset.methodName = data[0].method_name;
					dataset.datasetName = data[0].dataset_name;
					resolve(dataset);
				}
			});
		});
	}

	async fetchDataset(datasetId) {
		await new Promise((resolve, reject) => {
			$.ajax(this.hqs.config.siteReportServerAddress+"/datasets?dataset_id=eq."+dataset.datasetId, {
				method: "get",
				dataType: "json",
				success: (data, textStatus, xhr) => {
					//Find the relevant analysis in the master data structure
					dataset.dataTypeId = data[0].data_type_id;
					dataset.masterSetId = data[0].master_set_id; //1 or 2 which is Bugs or MAL, also often empty
					dataset.dataTypeName = data[0].data_type_name;
					dataset.dataTypeDefinition = data[0].definition;
					dataset.methodId = data[0].method_id;
					dataset.methodName = data[0].method_name;
					dataset.datasetName = data[0].dataset_name;
					resolve(dataset);
				}
			});
		});
	}
	
	/*
	* Function: fetchMethodMetaData
	*
	* Fetches all information about a particular method. Such as name & description.
	*
	* Parameters:
	* methodId - The id of the method to fetch.
	 */
	fetchMethodMetaDataOld(methodId) {
		
		var methodFound = false;
		for(var key in this.meta.methods) {
			if(this.meta.methods[key].method_id == methodId) {
				methodFound = true;
			}
		}
		
		if(methodFound == false) {
			var xhr1 = this.hqs.pushXhr(null, "fetchSiteAnalyses");
			xhr1.xhr = $.ajax(this.hqs.config.siteReportServerAddress+"/methods?method_id=eq."+methodId, {
				method: "get",
				dataType: "json",
				success: (data, textStatus, xhr) => {
					this.meta.methods.push(data[0]);
					this.hqs.popXhr(xhr1);
				}
			});
		}
	}

	/*
	* Function: fetchMethodMetaData
	*
	* Fetches all information about a particular method. Such as name & description.
	*
	* Parameters:
	* methodId - The id of the method to fetch.
	 */
	async fetchMethodMetaData(methodId) {
		new Promise((resolve, reject) => {
			let methodObj = null;
			var methodFound = false;
			for(var key in this.meta.methods) {
				if(this.meta.methods[key].method_id == methodId) {
					methodFound = true;
					methodObj = this.meta.methods[key];
				}
			}
			
			if(methodFound == false) {
				$.ajax(this.hqs.config.siteReportServerAddress+"/methods?method_id=eq."+methodId, {
					method: "get",
					dataType: "json",
					success: (data, textStatus, xhr) => {
						let method = data[0];
						this.meta.methods.push(method);
						resolve(method);
					},
					error: () => {
						console.error("WARN: Failed to fetch method meta data");
						reject();
					}
				});
			}
			else {
				resolve(methodObj);
			}
		});
	}
	
	/*
	* Function: destroy
	*/
	destroy() {
	}

	/*
	* Function: fetchSampleType
	*/
	async fetchSampleType(dataset) {
		let uniqueFetchIds = new Set();
		for(let key in dataset.dataPoints) {
			let sampleTypeId = dataset.dataPoints[key].sampleTypeId;
			if (sampleTypeId != null) {
				uniqueFetchIds.add(sampleTypeId);
			}
		}
		let fetchIds = Array.from(uniqueFetchIds);

		let sampleTypes = await this.hqs.fetchFromTable("qse_sample_types", "sample_type_id", fetchIds);

		dataset.dataPoints.map((dp) => {
			sampleTypes.map((st) => {
				if(dp.sampleTypeId == st.sample_type_id) {
					dp.sampleType = st;
				}
			});
		});
	}
}

export { Analysis as default }