import {OskudeSsetopResponsiveCanvas} from "/oskude/ssetop/responsive-canvas.js";

export class OskudeSsetopHeatBar extends OskudeSsetopResponsiveCanvas
{
	constructor ()
	{
		super();
		this.state = {
			barColor: "hsla(120, 100%, 30%, 0.4)",
			fadeColor: "hsla(0, 100%, 0%, 0.15)",
			value: 0
		}
	}

	connectedCallback ()
	{
		let style = getComputedStyle(this);
		this.state.barColor = style.getPropertyValue("--bar--color") || this.state.barColor;
		this.state.fadeColor = style.getPropertyValue("--fade-color") || this.state.fadeColor;
	}

	set value (v)
	{
		this.state.value = v;
		this.draw();
	}

	draw ()
	{
		this.ctx.fillStyle = this.state.fadeColor;
		this.ctx.fillRect(0, 0, this.width, this.height);
		this.ctx.fillStyle = this.state.barColor;
		this.ctx.fillRect(0, 0, Math.ceil(this.width * this.state.value), this.height);
	}
}

window.customElements.define(
	'oskude-ssetop-heat-bar',
	OskudeSsetopHeatBar
);
