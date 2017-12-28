import {OskudeSsetopResponsiveCanvas} from "/oskude/ssetop/responsive-canvas.js";

export class OskudeSsetopMemoryBar extends OskudeSsetopResponsiveCanvas
{
	constructor ()
	{
		super();
		this.state = {
			usedColor: "#4581b3",
			cachedColor: "#284a66",
			bufferColor: "#37658c",
			used: 0,
			cached: 0,
			buffers: 0
		}
	}

	connectedCallback ()
	{
		let style = getComputedStyle(this);
		this.state.usedColor = style.getPropertyValue("--mem-used-color") || this.state.usedColor;
		this.state.cachedColor = style.getPropertyValue("--mem-cached-color") || this.state.cachedColor;
		this.state.bufferColor = style.getPropertyValue("--mem-buffer-color") || this.state.bufferColor;
	}

	set value (v)
	{
		v.used = Math.ceil(v.used * this.width);
		v.cached = Math.ceil(v.cached * this.width);
		v.buffers = Math.ceil(v.buffers * this.width);

		if (
			this.state.used != v.used
			|| this.state.cached != v.cached
			|| this.state.buffers != v.buffers
		) {
			this.state.used = v.used;
			this.state.cached = v.cached;
			this.state.buffers = v.buffers;
			this.draw();
		}
	}

	draw ()
	{
		this.ctx.clearRect(0, 0, this.width, this.height);

		let start = 0;
		let length = this.state.used;
		this.ctx.fillStyle = this.state.usedColor;
		this.ctx.fillRect(start, 0, length, this.height);

		start += length;
		length = this.state.buffers;
		this.ctx.fillStyle = this.state.bufferColor;
		this.ctx.fillRect(start, 0, length, this.height);

		start += length;
		length = this.state.cached;
		this.ctx.fillStyle = this.state.cachedColor;
		this.ctx.fillRect(start, 0, length, this.height);

		let w = 1;
		let g = 1;
		for (let i = w; i < this.width; i += (w + g)) {
			this.ctx.clearRect(i, 0, g, this.height);
		}
	}
}

window.customElements.define(
	'oskude-ssetop-memory-bar',
	OskudeSsetopMemoryBar
);
