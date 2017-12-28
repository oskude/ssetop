import {OskudeSsetopResponsiveCanvas} from "/oskude/ssetop/responsive-canvas.js";

export class OskudeSsetopMultiBar extends OskudeSsetopResponsiveCanvas
{
	constructor ()
	{
		super();
		this.state = {
			value: -1,
			color: "hsla(220, 100%, 70%, 0.6)",
			maxValue: 100,
			lineSize: 1,
			lineSpace: 1,
			direction: "right",
			startFrom: "left"
		}
	}

	connectedCallback ()
	{
		let style = getComputedStyle(this);
		this.state.color = style.getPropertyValue("--multi-bar-color") || this.state.color;
		this.draw();
	}

	resizedCallback ()
	{
		this.draw();
	}

	attributeChangedCallback(name, oldValue, newValue)
	{
		switch (name) {
			case "max-value":
				this.state.maxValue = parseInt(newValue, 10);
				break;
			case "line-size":
				this.state.lineSize = parseInt(newValue, 10);
				break;
			case "line-space":
				this.state.lineSpace = parseInt(newValue, 10);
				break;
			case "direction":
				this.state.direction = newValue;
				break;
			case "start-from":
				this.state.startFrom = newValue;
				break;
		}
	}

	static get observedAttributes ()
	{
		return [
			"max-value",
			"line-size",
			"line-space",
			"direction",
			"start-from",
		];
	}

	set value (v)
	{
		if (v >= 0 && v != this.state.value) {
			this.state.value = v;
			this.draw();
		}
	}

	draw ()
	{
		let div = this.state.value / this.state.maxValue;
		let numFullLines = Math.floor(div);
		let lastLine = div - numFullLines;

		let yStep = this.state.lineSize + this.state.lineSpace;
		let size = yStep * (numFullLines + 1);
		size -= this.state.lineSpace;

		switch (this.state.direction)
		{
			case "right":
				this.style.height = size + "px";
				this.height = this.canvas.height = size;

				this.ctx.clearRect(0, 0, this.width, size);
				this.ctx.fillStyle = this.state.color;

				let y = 0;
				while (y < numFullLines) {
					this.ctx.fillRect(0, y * yStep, this.width, this.state.lineSize);
					y++
				}
				this.ctx.fillRect(0, y * yStep, this.width * lastLine, this.state.lineSize);
			break;
			case "up":
				if (this.state.startFrom == "right") {
					this.style.width = size + "px";
					this.width = this.canvas.width = size;

					this.ctx.clearRect(0, 0, size, this.height);
					this.ctx.fillStyle = this.state.color;

					let y = 0;
					while (y < numFullLines) {
						this.ctx.fillRect(
							(this.width - (y * yStep)) - this.state.lineSize,
							0,
							this.state.lineSize,
							this.height
						);
						y++
					}
					this.ctx.fillRect(
						(this.width - (y * yStep)) - this.state.lineSize,
						this.height - (this.height * lastLine),
						this.state.lineSize,
						this.height * lastLine
					);
				}
			break;
		}
	}
}

window.customElements.define(
	'oskude-ssetop-multi-bar',
	OskudeSsetopMultiBar
);
