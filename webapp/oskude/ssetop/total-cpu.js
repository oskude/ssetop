import {OskudeSsetopHeatBar} from "/oskude/ssetop/heat-bar.js";

export class OskudeSsetopTotalCpu extends HTMLElement
{
	constructor ()
	{
		super();
		this.attachShadow({mode:"open"});
		this.shadowRoot.innerHTML = `
			<style>
				.total-cpu-usage {
					height: 0.75rem;
					margin-bottom: 1px;
				}
			</style>
			<div id="total-cpu-usage"></div>
			<template id="template-total-cpu-entry">
				<oskude-ssetop-heat-bar class="total-cpu-usage"></oskude-ssetop-heat-bar>
			</template>
		`;
		this.totalCpuUsageRoot = this.shadowRoot.querySelector("#total-cpu-usage");
		this.totalCpuEntryTemplate = this.shadowRoot.querySelector("#template-total-cpu-entry");
		this.type = "total-cpu";
		this.state = {
			tick: 0,
			interval: 0,
			pageSize: 0,
			maxPages: 0,
			numCpus: 0,
			maxCpu: 0
		}
	}

	set config (v)
	{
		this.state.tick = v.tick;
		this.state.interval = v.interval;
		this.state.pageSize = v.pageSize;
		this.state.maxPages = v.maxPages;
		this.state.numCpus = v.numCpus;
		this.state.maxCpu = v.maxCpu;
		this.createCpuUsage();
	}

	set cpu (v)
	{
		for (let cnum = 0; cnum < v.length; cnum++) {
			this.state.cpuList[cnum].ele.cpuElem.value = v[cnum];
		}
	}

	createCpuUsage ()
	{
		this.state.cpuList = {};
		this.totalCpuUsageRoot.innerHTML = "";

		for (let cnum = 0; cnum < this.state.numCpus; cnum++) {
			let cloneElem = document.importNode(this.totalCpuEntryTemplate.content, true);
			let cpuElem = cloneElem.querySelector(".total-cpu-usage");

			this.totalCpuUsageRoot.appendChild(cloneElem);

			this.state.cpuList[cnum] = {
				val: {
					cpu: 0
				},
				ele: {
					cpuElem: cpuElem
				}
			};
		}
	}
}

window.customElements.define(
	'oskude-ssetop-total-cpu',
	OskudeSsetopTotalCpu
);
