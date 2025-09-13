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
  label?: string;
  onchange?: (el: TDElement, value: any) => void;
  data?: any[] | { [key: string]: number }[];
  value?: any;
  min?: number;
  max?: number;
  step?: number;
  colors?: string[];
  ratios?: number[];
  glyph?: string;
  toggle?: boolean;
  gridx?: number;
  gridy?: number;
  xlabel?: (x: number) => string;
  ylabel?: (y: number) => string;
  text?: string;
}

interface LogOptions extends BaseElementOptions {
  label: string;
  text?: string;
}

interface TDElement extends HTMLDivElement {
  opts: BaseElementOptions;
  type: string;
  setValue?: (v: any) => void;
  draw?: () => void;
  setData?: (d: any[]) => void;
  log?: (txt: string) => void;
  clear?: () => void;
  update?: () => void;
  logDiv?: HTMLDivElement;
  canvas?: HTMLCanvasElement;
  ctx?: CanvasRenderingContext2D;
  value?: number;
  min?: number;
  max?: number;
  step?: number;
  pressed?: boolean;
  toggle?: boolean;
  colors?: string[];
  ratios?: number[];
}

class TD {
  constructor() {}

  static update(data: { [key: string]: any }): void {
    const els = document.getElementsByClassName("td") as HTMLCollectionOf<TDElement>;
    for (let i = 0; i < els.length; i++) {
      const el = els[i];
      if (el.opts.name && el.setValue && data[el.opts.name] !== undefined) {
        el.setValue(data[el.opts.name]);
      }
    }
  }

  static label(opts: BaseElementOptions & { label: string }): TDElement {
    const el = createBaseElement("label", opts);
    el.innerHTML = `<div class="td_label"><span>${opts.label}</span></div>`;
    return el;
  }

  static button(opts: BaseElementOptions & { label: string; glyph?: string; value?: boolean; toggle?: boolean }): TDElement {
    const el = createBaseElement("button", opts);
    const pressed = opts.value ? 1 : 0;
    const glyph = opts.glyph || "&#x1f4a1;";
    el.innerHTML = `<div class="td_btn" pressed="${pressed}"><span>${opts.label}</span><div class="td_btn_a">${glyph}</div></div>`;
    el.pressed = Boolean(pressed);
    el.toggle = opts.toggle;
    const btnA = el.getElementsByClassName("td_btn_a")[0] as HTMLElement;
    btnA.onclick = () => togglePressed(el);
    el.setValue = function(v: boolean): void {
      this.pressed = v;
      this.setAttribute("pressed", this.pressed ? "1" : "0");
    };
    return el;
  }

  static toggle(opts: BaseElementOptions & { label: string; value?: boolean }): TDElement {
    const el = createBaseElement("toggle", opts);
    el.pressed = false;
    el.toggle = true;
    const pressed = opts.value ? 1 : 0;
    el.innerHTML = `<div class="td_toggle" pressed="${pressed}"><span>${opts.label}</span><div class="td_toggle_a"><div class="td_toggle_b"></div></div></div>`;
    el.pressed = Boolean(pressed);
    const toggleA = el.getElementsByClassName("td_toggle_a")[0] as HTMLElement;
    toggleA.onclick = () => togglePressed(el);
    el.setValue = function(v: boolean): void {
      this.pressed = v;
      this.setAttribute("pressed", this.pressed ? "1" : "0");
    };
    return el;
  }

  static value(opts: BaseElementOptions & { label: string; value: number; step?: number; min?: number; max?: number }): TDElement {
    const el = createBaseElement("value", opts);
    const valueOpts = opts;
    el.value = parseFloat(String(valueOpts.value));
    el.min = valueOpts.min;
    el.max = valueOpts.max;
    el.step = valueOpts.step;
    let html: string;
    if (el.step !== undefined) {
      html = '<div class="td_val_b">&#9664;</div><div class="td_val_a"></div><div class="td_val_b">&#9654;</div>';
    } else {
      html = '<div class="td_val_a"></div>';
    }
    el.innerHTML = `<div class="td_val"><span>${valueOpts.label}</span>${html}</div>`;
    if (el.step !== undefined) {
      const b = el.getElementsByClassName("td_val_b") as HTMLCollectionOf<HTMLElement>;
      b[0].onclick = (e: MouseEvent) => {
        el.setValue!(el.value! - (el.step!));
      };
      b[1].onclick = (e: MouseEvent) => {
        el.setValue!(el.value! + (el.step!));
      };
    }
    el.setValue = function(v: number): void {
      if (this.min !== undefined && v < this.min)
        v = this.min;
      if (this.max !== undefined && v > this.max)
        v = this.max;
      if (this.value !== v) {
        sendChanges(this, v);
        this.value = v;
      }
      const valA = this.getElementsByClassName("td_val_a")[0] as HTMLElement;
      valA.innerHTML = formatText(v);
    };
    el.setValue(el.value!);
    return el;
  }

  static gauge(opts: BaseElementOptions & { label: string; value?: number}): TDElement {
    const el = createBaseElement("gauge", opts);
    el.innerHTML = `<div class="td_gauge"><span>${opts.label}</span></div>`;
    return el;
  }