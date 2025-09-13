/* Copyright (c) 2017, Gordon Williams, MPLv2 License. https://github.com/espruino/TinyDash */
/* All elements have x/y/width/height,name

  Elements that can be changed can also have `onchanged`

  TODO:
    terminal
    dial
    scrollbar
 */

interface BaseElementOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  name?: string;
  data?: any[] | { [key: string]: number }[];
  onchange?: (el: TDElement, value: any) => void;
}

interface LabelOptions extends BaseElementOptions {
  label: string;
}

interface ButtonOptions extends BaseElementOptions {
  label: string;
  glyph?: string;
  value?: boolean;
  toggle?: boolean;
}

interface ToggleOptions extends BaseElementOptions {
  label: string;
  value?: boolean;
}

interface ValueOptions extends BaseElementOptions {
  label: string;
  value: number;
  step?: number;
  min?: number;
  max?: number;
}

interface GaugeOptions extends BaseElementOptions {
  label: string;
  value?: number;
  min?: number;
  max?: number;
  colors?: string[];
  ratios?: number[];
}

interface GraphOptions extends BaseElementOptions {
  label: string;
  gridy?: number;
  ylabel?: (y: number) => string;
  gridx?: number;
  xlabel?: (x: number) => string;
}

interface LogOptions extends BaseElementOptions {
  label: string;
  text?: string;
}

interface ModalOptions extends BaseElementOptions {
  label: string;
}

interface TDElement extends HTMLElement {
  type: string;
  opts: BaseElementOptions;
  setValue?: (v: any) => void;
  pressed?: boolean;
  toggle?: boolean;
  value?: number;
  update?: () => void;
  log?: (txt: string) => void;
  clear?: () => void;
  draw?: () => void;
  setData?: (d: any[] | { [key: string]: number }[]) => void;
}

class TD {
  static update(data: { [key: string]: any }): void {
    const els = document.getElementsByClassName("td") as HTMLCollectionOf<TDElement>;
    for (let i = 0; i < els.length; i++) {
      const el = els[i];
      if (el.opts.name && el.setValue && data[el.opts.name] !== undefined) {
        el.setValue(data[el.opts.name]);
      }
    }
  }

  static label(opts: LabelOptions): TDElement {
    return new LabelElement(opts);
  }

  static button(opts: ButtonOptions): TDElement {
    return new ButtonElement(opts);
  }

  static toggle(opts: ToggleOptions): TDElement {
    return new ToggleElement(opts);
  }

  static value(opts: ValueOptions): TDElement {
    return new ValueElement(opts);
  }

  static gauge(opts: GaugeOptions): TDElement {
    return new GaugeElement(opts);
  }

  static pointer_gauge(opts: GaugeOptions): TDElement {
    return new PointerGaugeElement(opts);
  }

  static graph(opts: GraphOptions): TDElement {
    return new GraphElement(opts);
  }

  static log(opts: LogOptions): TDElement {
    return new LogElement(opts);
  }

  static modal(opts: ModalOptions): TDElement {
    return new ModalElement(opts);
  }
}

const API_BASE_URL = "/tinydash"; // Base URL for TinyDash REST API

async function fetchData(endpoint: string): Promise<any | null> {
    try {
        const response = await fetch(`${API_BASE_URL}/${endpoint}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching data:', error);
        return null;
    }
}

async function sendCommand(endpoint: string, method: string, payload: { [key: string]: any }): Promise<any | null> {
    try {
        const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
            method: method,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams(payload).toString()
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error sending command:', error);
        return null;
    }
}

function sendChanges(el: TDElement, value: any): void {
  if (el.opts.name) {
    const o: { [key: string]: any } = {};
    o[el.opts.name] = value;
    handleChange(o);
  }
  if (el.opts.onchange) {
    el.opts.onchange(el, value);
  }
}

function togglePressed(el: TDElement): void {
  el.pressed = !Boolean(el.getAttribute("pressed"));
  el.setAttribute("pressed", el.pressed ? "1" : "0");
  sendChanges(el, el.pressed);
  if (!el.toggle) {
    el.pressed = false;
    setTimeout(function() {
      el.setAttribute("pressed", "0");
    }, 200);
  }
}

function formatText(txt: any): string {
  if (typeof txt !== "number")
    return txt;
  if (Math.floor(txt) === txt) return txt.toString(); // ints
  if (Math.abs(txt) > 1000) return txt.toFixed(0);
  if (Math.abs(txt) > 100) return txt.toFixed(1);
  return txt.toFixed(2);
}

async function handleChange(data: { [key: string]: any }): Promise<void> {
  console.log("Sending change:", data);
  await sendCommand("update", "POST", data);
}

abstract class BaseElement extends HTMLElement implements TDElement {
  type: string;
  opts: BaseElementOptions;

  constructor(type: string, opts: BaseElementOptions) {
    super();
    this.classList.add("td", `td_${type}`);
    this.style.width = `${opts.width}px`;
    this.style.height = `${opts.height}px`;
    this.style.left = `${opts.x}px`;
    this.style.top = `${opts.y}px`;
    this.type = type;
    this.opts = opts;
  }
}

class LabelElement extends BaseElement {
  constructor(opts: LabelOptions) {
    super("label", opts);
    this.innerHTML = `<div class="td_label"><span>${opts.label}</span></div>`;
  }
}

class ButtonElement extends BaseElement {
  pressed: boolean;
  toggle?: boolean;

  constructor(opts: ButtonOptions) {
    super("button", opts);
    const pressed = opts.value ? 1 : 0;
    const glyph = opts.glyph || "&#x1f4a1;";
    this.innerHTML = `<div class="td_btn" pressed="${pressed}"><span>${opts.label}</span><div class="td_btn_a">${glyph}</div></div>`;
    this.pressed = Boolean(pressed);
    this.toggle = opts.toggle;

    const btnA = this.getElementsByClassName("td_btn_a")[0] as HTMLElement;
    btnA.onclick = () => togglePressed(this);
  }

  setValue(v: boolean): void {
    this.pressed = v;
    this.setAttribute("pressed", this.pressed ? "1" : "0");
  }
}

class ToggleElement extends BaseElement {
  pressed: boolean = false;
  toggle = true;

  constructor(opts: ToggleOptions) {
    super("toggle", opts);
    const pressed = opts.value ? 1 : 0;
    this.innerHTML = `<div class="td_toggle" pressed="${pressed}"><span>${opts.label}</span><div class="td_toggle_a"><div class="td_toggle_b"></div></div></div>`;
    this.pressed = Boolean(pressed);

    const toggleA = this.getElementsByClassName("td_toggle_a")[0] as HTMLElement;
    toggleA.onclick = () => togglePressed(this);
  }

  setValue(v: boolean): void {
    this.pressed = v;
    this.setAttribute("pressed", this.pressed ? "1" : "0");
  }
}

class ValueElement extends BaseElement {
  value: number;
  min?: number;
  max?: number;
  step?: number;

  constructor(opts: ValueOptions) {
    super("value", opts);
    const valueOpts = this.opts as ValueOptions;
    this.value = parseFloat(String(valueOpts.value));
    this.min = valueOpts.min;
    this.max = valueOpts.max;
    this.step = valueOpts.step;

    let html: string;
    if (this.step !== undefined) {
      html = '<div class="td_val_b">&#9664;</div><div class="td_val_a"></div><div class="td_val_b">&#9654;</div>';
    } else {
      html = '<div class="td_val_a"></div>';
    }
    this.innerHTML = `<div class="td_val"><span>${valueOpts.label}</span>${html}</div>`;

    if (this.step !== undefined) {
      const b = this.getElementsByClassName("td_val_b") as HTMLCollectionOf<HTMLElement>;
      b[0].onclick = (e: MouseEvent) => {
        this.setValue(this.value - (this.step!));
      };
      b[1].onclick = (e: MouseEvent) => {
        this.setValue(this.value + (this.step!));
      };
    }

    this.setValue(this.value);
  }

  setValue(v: number): void {
    if (this.min !== undefined && v < this.min) v = this.min;
    if (this.max !== undefined && v > this.max) v = this.max;
    if (this.value !== v) {
      sendChanges(this, v);
      this.value = v;
    }
    const valA = this.getElementsByClassName("td_val_a")[0] as HTMLElement;
    valA.innerHTML = formatText(v);
  }
}

class GaugeElement extends BaseElement {
  value: number = 0;
  min: number = 0;
  max: number = 1;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(opts: GaugeOptions) {
    super("gauge", opts);
    const gaugeOpts = this.opts as GaugeOptions;
    this.value = (gaugeOpts.value === undefined) ? 0 : gaugeOpts.value;
    this.min = (gaugeOpts.min === undefined) ? 0 : gaugeOpts.min;
    this.max = (gaugeOpts.max === undefined) ? 1 : gaugeOpts.max;
    this.innerHTML = `<div class="td_gauge"><span>${gaugeOpts.label}</span><canvas></canvas><div class="td_gauge_a">${formatText(this.value)}</div></div>`;
    this.canvas = this.getElementsByTagName("canvas")[0] as HTMLCanvasElement;
    this.ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;

    setTimeout(() => this.draw(), 100);
    this.onresize = () => this.draw();
  }

  draw(): void {
    this.canvas.width = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;
    const s = Math.min(this.canvas.width, this.canvas.height);
    this.ctx.lineCap = "round";
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.beginPath();
    this.ctx.lineWidth = 20;
    this.ctx.strokeStyle = "#000";
    this.ctx.arc(this.canvas.width / 2, this.canvas.height / 2 + 20, (s / 2) - 24, Math.PI * 0.75, 2.25 * Math.PI);
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.lineWidth = 16;
    this.ctx.strokeStyle = "#09F";
    let normalizedV = ((this.value || 0) - this.min) / (this.max - this.min);
    if (normalizedV < 0) normalizedV = 0;
    if (normalizedV > 1) normalizedV = 1;
    this.ctx.arc(this.canvas.width / 2, this.canvas.height / 2 + 20, (s / 2) - 24, Math.PI * 0.75, (0.75 + (1.5 * normalizedV)) * Math.PI);
    this.ctx.stroke();
  }

  setValue(v: number): void {
    this.value = v;
    const gaugeA = this.getElementsByClassName("td_gauge_a")[0] as HTMLElement;
    gaugeA.innerHTML = formatText(v);
    this.draw();
  }
}

class PointerGaugeElement extends BaseElement {
  value: number = 0;
  min: number = 0;
  max: number = 1;
  colors: string[] = ["#4DDB67", "#D4DB4D", "#DB4D4D"];
  ratios: number[] = [];

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(opts: GaugeOptions) {
    super("pointer_gauge", opts);
    const gaugeOpts = this.opts as GaugeOptions;
    this.value = (gaugeOpts.value === undefined) ? 0 : gaugeOpts.value;
    this.min = (gaugeOpts.min === undefined) ? 0 : gaugeOpts.min;
    this.max = (gaugeOpts.max === undefined) ? 1 : gaugeOpts.max;
    if (gaugeOpts.colors) this.colors = gaugeOpts.colors;
    if (gaugeOpts.ratios) this.ratios = gaugeOpts.ratios;
    this.innerHTML = `<div class="td_gauge"><span>${gaugeOpts.label}</span><canvas></canvas><div class="td_gauge_a">${formatText(this.value)}</div></div>`;
    this.canvas = this.getElementsByTagName("canvas")[0] as HTMLCanvasElement;
    this.ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;

    setTimeout(() => this.draw(), 100);
    this.onresize = () => this.draw();
  }

  draw(): void {
    this.canvas.width = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;
    const s = Math.min(this.canvas.width, this.canvas.height);
    this.ctx.lineCap = "square";
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.beginPath();
    this.ctx.lineWidth = 20;
    this.ctx.strokeStyle = "#000";
    this.ctx.arc(this.canvas.width / 2, this.canvas.height / 2 + 20, (s / 2) - 24, Math.PI * 0.75, 2.25 * Math.PI);
    this.ctx.stroke();

    // Determine the actual number of segments to draw
    const numSegments = Math.min(this.colors.length, this.ratios.length > 0 ? this.ratios.length : this.colors.length);

    // If ratios are not explicitly provided or are insufficient, fill with 1s up to numSegments
    const effectiveRatios: number[] = [];
    for (let i = 0; i < numSegments; i++) {
      effectiveRatios.push(this.ratios[i] !== undefined ? this.ratios[i] : 1);
    }

    const totalRatio = effectiveRatios.reduce((sum, r) => sum + r, 0);
    const safeTotalRatio = totalRatio === 0 ? (numSegments > 0 ? numSegments : 1) : totalRatio; // Avoid division by zero

    // Calculate angles for the segments
    const startAngle = Math.PI * 0.75;
    const endAngle = Math.PI * 2.25;
    const totalArcAngle = endAngle - startAngle;

    let currentAngle = startAngle;
    for (let i = 0; i < numSegments; i++) {
      const segmentAngle = (effectiveRatios[i] / safeTotalRatio) * totalArcAngle;
      this.ctx.beginPath();
      this.ctx.lineWidth = 16;
      this.ctx.strokeStyle = this.colors[i];
      this.ctx.arc(this.canvas.width / 2, this.canvas.height / 2 + 20, (s / 2) - 24, currentAngle, currentAngle + segmentAngle);
      this.ctx.stroke();
      currentAngle += segmentAngle;
    }

    // Draw pointer
    this.ctx.beginPath();
    this.ctx.lineWidth = 3;
    this.ctx.strokeStyle = "#000";
    let v_normalized = ((this.value || 0) - this.min) / (this.max - this.min);
    if (v_normalized < 0) v_normalized = 0;
    if (v_normalized > 1) v_normalized = 1;
    const angle = (0.75 + (1.5 * v_normalized)) * Math.PI;
    const pointerLength = (s / 2) - 24;
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2 + 20;
    const pointerX = centerX + pointerLength * Math.cos(angle);
    const pointerY = centerY + pointerLength * Math.sin(angle);
    this.ctx.moveTo(centerX, centerY);
    this.ctx.lineTo(pointerX, pointerY);
    this.ctx.stroke();

    // Draw center circle
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, 5, 0, 2 * Math.PI);
    this.ctx.fillStyle = "#000";
    this.ctx.fill();
  }

  setValue(v: number): void {
    this.value = v;
    const gaugeA = this.getElementsByClassName("td_gauge_a")[0] as HTMLElement;
    gaugeA.innerHTML = formatText(v);
    this.draw();
  }
}

class GraphElement extends BaseElement {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(opts: GraphOptions) {
    super("graph", opts);
    this.innerHTML = `<div class="td_graph"><span>${opts.label}</span><canvas></canvas></div>`;
    this.canvas = this.getElementsByTagName("canvas")[0] as HTMLCanvasElement;
    this.ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;

    setTimeout(() => this.draw(), 100);
    this.onresize = () => this.draw();
  }

  setData(d: any[] | { [key: string]: number }[]): void {
    this.opts.data = d;
    this.draw();
  }

  draw(): void {
    this.canvas.width = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;
    const s = Math.min(this.canvas.width, this.canvas.height);
    const xbase = 18;
    const ybase = this.canvas.height - 18;
    const xs = (this.canvas.width - 8 - xbase);
    const ys = (ybase - 28);
    this.ctx.font = "8px Sans";
    this.ctx.fillStyle = "#000";
    this.ctx.fillRect(4, 24, this.canvas.width - 8, this.canvas.height - 28);
    let dxmin: number | undefined, dxmax: number | undefined, dymin: number | undefined, dymax: number | undefined;
    const graphOpts = this.opts as GraphOptions;
    if (this.opts.data !== undefined) {
      let traces: any[] = this.opts.data && this.opts.data.length > 0 && typeof this.opts.data[0] === 'object' ? this.opts.data : [this.opts.data || []];
      traces.forEach(function(trace: any) {
        for (const i in trace) {
          const key = parseFloat(i);
          const v = parseFloat(trace[i]);
          if (dxmin === undefined || key < dxmin) dxmin = key;
          if (dxmax === undefined || key > dxmax) dxmax = key;
          if (dymin === undefined || v < dymin) dymin = v;
          if (dymax === undefined || v > dymax) dymax = v;
        }
      });
      if (dxmin !== undefined && dxmax !== undefined && dymin !== undefined && dymax !== undefined) {
        if (graphOpts.gridy) {
          const gy = graphOpts.gridy;
          dymin = gy * Math.floor(dymin / gy);
          dymax = gy * Math.ceil(dymax / gy);
        }
        const dxs = dxmax + 1 - dxmin;
        const dys = dymax - dymin;
        const safeDxs = dxs === 0 ? 1 : dxs;
        const safeDys = dys === 0 ? 1 : dys;
        function getx(x: number): number { return xbase + (xs * (x - dxmin!) / safeDxs); }
        function gety(y: number): number { return ybase - (ys * (y - dymin!) / safeDys); }
        traces.forEach((trace: any, idx: number) => {
          this.ctx.beginPath();
          this.ctx.strokeStyle = (traces.length > 1) ? `hsl(${(idx * 360 / traces.length)}, 100%, 50%)` : "#09F";
          let first = true;
          for (const i in trace) {
            const key = parseFloat(i);
            const val = parseFloat(trace[i]);
            if (first) {
              this.ctx.moveTo(getx(key), gety(val));
              first = false;
            } else {
              this.ctx.lineTo(getx(key), gety(val));
            }
          }
          this.ctx.stroke();
        });
        this.ctx.fillStyle = "#fff";
        if (graphOpts.gridy) {
          this.ctx.textAlign = "right";
          for (let i = dymin; i <= dymax; i += graphOpts.gridy) {
            const y = gety(i);
            const t = graphOpts.ylabel ? graphOpts.ylabel(i) : i.toString();
            this.ctx.fillRect(xbase - 1, y, 3, 1);
            if (y > this.ctx.measureText(t).width / 2) { // does it fit?
              this.ctx.fillText(t, xbase - 5, y + 2);
            }
          }
        }
        if (graphOpts.gridx) {
          const gx = graphOpts.gridx;
          this.ctx.textAlign = "center";
          for (let i = gx * Math.ceil(dxmin! / gx); i <= dxmax!; i += gx) {
            const x = getx(i);
            const t = graphOpts.xlabel ? graphOpts.xlabel(i) : i.toString();
            this.ctx.fillRect(x, ybase - 1, 1, 3);
            this.ctx.fillText(t, x, ybase + 10);
          }
        }
      }
    } else {
      this.ctx.fillStyle = "#888";
      this.ctx.textAlign = "center";
      this.ctx.fillText("[No Data]", xbase + (xs / 2), ybase - (ys / 2));
    }
    // axes
    this.ctx.beginPath();
    this.ctx.strokeStyle = "#fff";
    this.ctx.moveTo(xbase, ybase - ys);
    this.ctx.lineTo(xbase, ybase + 10);
    this.ctx.moveTo(xbase - 10, ybase);
    this.ctx.lineTo(xbase + xs, ybase);
    this.ctx.stroke();
  }
}

class LogElement extends BaseElement {
  private logDiv: HTMLElement;

  constructor(opts: LogOptions) {
    super("log", opts);
    const logOpts = this.opts as LogOptions;
    logOpts.text = logOpts.text || "";
    this.innerHTML = `<div class="td_log"><span>${opts.label}</span><div class="td_log_a td_scrollable"></div></div>`;
    this.logDiv = this.getElementsByClassName("td_log_a")[0] as HTMLElement;
    this.update();
  }

  update(): void {
    const logOpts = this.opts as LogOptions;
    this.logDiv.innerHTML = (logOpts.text || "").replace(/\n/g, "<br/>\n");
  }

  log(txt: string): void {
    const logOpts = this.opts as LogOptions;
    logOpts.text = (logOpts.text || "") + "\n" + txt;
    this.update();
    this.logDiv.scrollTop = this.logDiv.scrollHeight;
  }

  clear(): void {
    const logOpts = this.opts as LogOptions;
    logOpts.text = "";
    this.update();
  }
}

class ModalElement extends BaseElement {
  constructor(opts: ModalOptions) {
    super("modal", opts);
    this.innerHTML = `<div class="td_modal"><span>${opts.label}</span></div>`;
    this.onclick = () => {
      togglePressed(this);
      if (!this.opts.onchange) {
        this.remove();
      }
    };
  }
}

// Basic polling mechanism for dashboard data
setInterval(async () => {
  const data = await fetchData("data");
  if (data) {
    TD.update(data);
  }
}, 2000); // Poll every 2 seconds (adjust as needed)