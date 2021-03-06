import {OskudeSsetopTotalCpu} from "/oskude/ssetop/total-cpu.js";
import {OskudeSsetopTotalMem} from "/oskude/ssetop/total-mem.js";
import {OskudeSsetopProcessList} from "/oskude/ssetop/process-list.js";

class OskudeSsetop extends HTMLElement
{
	constructor ()
	{
		super();
		this.jiffies = [];
		this.state = {
			config: {
				tick: 0,
				interval: 0,
				pageSize: 0,
				maxPages: 0,
				numCpus: 0,
				maxCpu: 0
			},
			processList: {}
		}
	}

	_mutationObserver (muts)
	{
		muts.forEach((m)=>{
			m.addedNodes.forEach((n)=>{
				if (n.type == "total-cpu") {
					this.totalCpu = n;
					this.totalCpu.config = this.state.config;
				} else if (n.type == "total-mem") {
					this.totalMem = n;
				} else if (n.type == "process-list") {
					this.processList = n;
					this.processList.config = this.state.config;
				}
			});
		});
	}

	connectedCallback ()
	{
		window.addEventListener("beforeunload", this.disconnect.bind(this));
		this._mo = new MutationObserver(this._mutationObserver.bind(this));

		this._mo.observe(this, {
			childList: true
		});

		// TODO: bug/feature? in previous commit we did not need to "trigger" mutation for initial children
		this._mutationObserver([{addedNodes: this.childNodes}]);
	}

	disconnectedCallback ()
	{
		window.removeEventListener("beforeunload", this.disconnect.bind(this));
		this.disconnect();
		this._mo.disconnect();
	}

	attributeChangedCallback(name, oldValue, newValue)
	{
		switch (name) {
			case "stream-url":
				this.connect();
				break;
			case "disabled":
				if (newValue) {
					this.disconnect();
				} else {
					this.connect();
				}
				break;
		}
	}

	static get observedAttributes ()
	{
		return [
			"stream-url",
			"disabled"
		];
	}

	set serverUrl (v)
	{
		this.setAttribute("stream-url", v);
	}

	get serverUrl ()
	{
		return this.getAttribute("stream-url");
	}

	set disabled (v)
	{
		if (val) {
			this.setAttribute("disabled", v);
		} else {
			this.removeAttribute("disabled");
		}
	}

	get disabled ()
	{
		return this.hasAttribute("disabled");
	}

	connect ()
	{
		this.disconnect();
		this.eventSource = new EventSource(this.serverUrl);
		this.eventSource.addEventListener("config", this.onServerConfig.bind(this));
		this.eventSource.addEventListener("processes", this.onServerProcesses.bind(this));
		this.eventSource.addEventListener("total-cpu", this.onServerTotalCpu.bind(this));
		this.eventSource.addEventListener("total-mem", this.onServerTotalMem.bind(this));
	}

	disconnect ()
	{
		if (this.eventSource) {
			this.eventSource.close();
		}
	}

	onServerConfig (e)
	{
		let data = e.data.split(" ");
		this.state.config.tick = parseInt(data[0], 10);
		this.state.config.interval = parseInt(data[1], 10);
		this.state.config.pageSize = parseInt(data[2], 10);
		this.state.config.maxPages = parseInt(data[3], 10);
		this.state.config.numCpus = parseInt(data[4], 10);
		this.state.config.maxCpu = this.state.config.tick / (1000 / this.state.config.interval);

		if (this.totalCpu) {
			this.totalCpu.config = this.state.config;
		}
		if (this.processList) {
			this.processList.config = this.state.config;
		}

		this.jiffies = [];
		for (let i = 0; i < this.state.config.numCpus; i++) {
			this.jiffies[i] = [0,0];
		}
	}

	onServerProcesses (e)
	{
		if (!this.processList) {
			return;
		}

		let lines = e.data.split("\n");
		let processData = {};

		for (let line of lines)
		{
			let data = line.split(" ");
			let pid = data[0];
			let com = data[1];
			let cpu = parseInt(data[2], 10) + parseInt(data[3], 10);
			let mem = Math.ceil(parseInt(data[4], 10) / 1024);
			let pro = parseInt(data[5], 10);
			processData[pid] = {
				com: com,
				cpu: cpu,
				mem: mem
			};
		}
		this.processList.value = processData;
	}

	onServerTotalCpu (e)
	{
		if (!this.totalCpu) {
			return;
		}

		let lines = e.data.split("\n");
		let totalCpuData = [];

		for (let line of lines) {
			let data = line.split(" ");
			let cnum = parseInt(data[0], 10);

			let jiffTotal = 0;
			let jiffWork = 0;
			for (let i = 1; i <= 7; i++){
				 jiffTotal += parseInt(data[i], 10);
				 if (i == 3) {
					  jiffWork = jiffTotal;
				 }
			}
			let usageTotal = jiffTotal - this.jiffies[cnum][0];
			let usageWork = jiffWork - this.jiffies[cnum][1];
			totalCpuData[cnum] = usageWork / usageTotal;
			this.jiffies[cnum][0] = jiffTotal;
			this.jiffies[cnum][1] = jiffWork;
		}

		this.totalCpu.cpu = totalCpuData;
	}

	onServerTotalMem (e)
	{
		if (!this.totalMem) {
			return;
		}

		let fields = e.data.split(" ");
		let total = parseInt(fields[0], 10);
		let free = parseInt(fields[1], 10);
		let buffers = parseInt(fields[2], 10);
		let cached = parseInt(fields[3], 10);
		let shmem = parseInt(fields[4], 10);
		let srec = parseInt(fields[5], 10);
		let used = total - free;
		cached += srec - shmem;

		let usedPercent = used / total;
		let buffersPercent = buffers / total;
		let cachedPercent = cached / total;
		usedPercent -= (buffersPercent + cachedPercent);

		this.totalMem.mem = {
			used: usedPercent,
			buffers: buffersPercent,
			cached: cachedPercent
		};
	}
}

window.customElements.define(
	"oskude-ssetop",
	OskudeSsetop
);
