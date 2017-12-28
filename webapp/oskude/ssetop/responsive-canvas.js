export class OskudeSsetopResponsiveCanvas extends HTMLElement
{
	constructor ()
	{
		super();
		this.attachShadow({mode:"open"});
		this.shadowRoot.innerHTML = `
			<style>
				:host {
					display: block;
					font-size: 0;
				}
				canvas {
					position: absolute;
				}
			</style>
			<canvas></canvas>
		`;
		this.canvas = this.shadowRoot.querySelector("canvas");
		this.ctx = this.canvas.getContext("2d");
		this.width = this.canvas.width = 0;
		this.height = this.canvas.height = 0;
		this.resizeObserver = new ResizeObserver((entries)=>{
			let entry = entries[0];
			this.width = this.canvas.width = Math.ceil(entry.contentRect.width);
			this.height = this.canvas.height = Math.ceil(entry.contentRect.height);
			this.resizedCallback();
		});
		this.resizeObserver.observe(this);
	}

	disconnectedCallback ()
	{
		this.resizeObserver.disconnect();
	}

	resizedCallback ()
	{
		/* can be implemented by extender */
	}
}

window.customElements.define(
	"oskude-ssetop-responsive-canvas",
	OskudeSsetopResponsiveCanvas
);
