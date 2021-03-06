import {OskudeSsetopHeatBar} from "/oskude/ssetop/heat-bar.js";
import {OskudeSsetopMultiBar} from "/oskude/ssetop/multi-bar.js";

export class OskudeSsetopProcessList extends HTMLElement
{
	constructor ()
	{
		super();
		this.attachShadow({mode:"open"});
		this.shadowRoot.innerHTML = `
			<style>
				:host {
					display: block;
					contain: content;
				}
				.process-entry {
					display: grid;
					grid-template-columns: 100%;
				}
				.cmd-name {
					grid-column: 1;
					grid-row: 1;
					word-break: keep-all;
					white-space: nowrap;
					overflow: hidden;
					text-overflow: ellipsis;
				}
				.mem-usage {
					z-index: 100;
					grid-column: 1;
					grid-row: 1;
					justify-self: end;
					padding: 2px 0;
				}
				.cpu-usage {
					grid-column: 1;
					grid-row: 2;
					height: 1px;
				}
				.strike-out {
					display: none;
				}
			</style>
			<div id="process-list">
				<div id="entry-root"></div>
			</div>

			<template id="template-process-entry">
				<div class="process-entry strike-out">
					<div class="cmd-name"></div>
					<oskude-ssetop-multi-bar class="mem-usage"
						max-value="64"
						line-space="2"
						direction="up"
						start-from="right"
					></oskude-ssetop-multi-bar>
					<oskude-ssetop-heat-bar class="cpu-usage"></oskude-ssetop-heat-bar>
				</div>
			</template>
		`;
		this.entryRoot = this.shadowRoot.querySelector("#entry-root");
		this.processEntryTemplate = this.shadowRoot.querySelector("#template-process-entry");
		this.type = "process-list";
		this.state = {
			tick: 0,
			interval: 0,
			pageSize: 0,
			maxPages: 0,
			numCpus: 0,
			maxCpu: 0,
			maxStrikes: 100, // TODO: user configurable
			processList: {}
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
		this.state.processList = {};
		this.entryRoot.innerHTML = "";
	}

	set value (v)
	{
		let processesGone = new Map();
		Object.keys(this.state.processList).forEach((key)=>{
			processesGone.set(key, 1);
		});

		for (let p in v) {
			let data = v[p];
			this.updateProcess(p, data);
			processesGone.delete(p);
		}

		if (processesGone.size > 0) {
			for (let p of processesGone.keys()) {
				this.entryRoot.removeChild(this.state.processList[p].ele.root);
				delete this.state.processList[p];
			}
		}
	}

	updateProcess (p, data)
	{
		if (!this.state.processList[p] && data.cpu > 0) {
			let cloneElem = document.importNode(this.processEntryTemplate.content, true);
			let cpuElem = cloneElem.querySelector(".cpu-usage");
			let memElem = cloneElem.querySelector(".mem-usage");
			let rootElem = cloneElem.querySelector(".process-entry");
			let cmdElem = cloneElem.querySelector(".cmd-name");

			cmdElem.textContent = data.com.slice(1, -1);

			this.entryRoot.appendChild(cloneElem);

			this.state.processList[p] = {
				val: {
					cpu: data.cpu,
					mem: null
				},
				ele: {
					root: rootElem,
					cpu: cpuElem,
					mem: memElem
				}
			};
		}

		let process = this.state.processList[p];

		if (process) {
			let cpuUsage = (data.cpu - process.val.cpu) / this.state.maxCpu;
			process.val.cpu = data.cpu;

			if (cpuUsage > 0 || data.mem > 64) { // TODO
				process.ele.root.classList.remove("strike-out");
				process.val.strikeOut = 0;
			} else {
				process.val.strikeOut++; // TODO: overflow?
				if (process.val.strikeOut == this.state.maxStrikes) {
					process.ele.root.classList.add("strike-out");
				}
			}

			if (process.val.strikeOut < this.state.maxStrikes) {
				process.ele.cpu.value = cpuUsage;
			}

			if (process.val.mem != data.mem) {
				process.ele.mem.value = data.mem;
				process.val.mem = data.mem;
			}
		}
	}
}

window.customElements.define(
	'oskude-ssetop-process-list',
	OskudeSsetopProcessList
);
