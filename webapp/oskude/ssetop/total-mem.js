import {OskudeSsetopMemoryBar} from "/oskude/ssetop/memory-bar.js";

export class OskudeSsetopTotalMem extends HTMLElement
{
	constructor ()
	{
		super();
		this.attachShadow({mode:"open"});
		this.shadowRoot.innerHTML = `
			<style>
				#total-mem-usage {
					height: 0.75rem;
					margin-bottom: 1px;
					background: var(--bar-background);
				}
			</style>
			<oskude-ssetop-memory-bar id="total-mem-usage"></oskude-ssetop-memory-bar>
		`;
		this.totalMemUsage = this.shadowRoot.querySelector("#total-mem-usage");
		this.type = "total-mem";
	}

	set mem (v)
	{
		this.totalMemUsage.value = v;
	}
}

window.customElements.define(
	'oskude-ssetop-total-mem',
	OskudeSsetopTotalMem
);
