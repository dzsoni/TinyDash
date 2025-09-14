"use strict";
function createBaseElement(type, opts) {
    const element = document.createElement('div');
    element.classList.add("td", `td_${type}`);
    element.style.width = `${opts.width}px`;
    element.style.height = `${opts.height}px`;
    element.style.left = `${opts.x}px`;
    element.style.top = `${opts.y}px`;
    element.style.position = 'absolute';
    element.type = type;
    element.opts = opts;
    return element;
}
class TD {
    static update(data) {
        const els = document.getElementsByClassName("td");
        for (let i = 0; i < els.length; i++) {
            const el = els[i];
            if (el.opts.name && el.setValue && data[el.opts.name] !== undefined) {
                el.setValue(data[el.opts.name]);
            }
        }
    }
    static text(opts) {
        return createTextElement(opts);
    }
    static button(opts) {
        return createButtonElement(opts);
    }
    static toggle(opts) {
        return createToggleElement(opts);
    }
    static value_steppable(opts) {
        return createValueSteppableElement(opts);
    }
    static gauge(opts) {
        return createGaugeElement(opts);
    }
    static pointer_gauge(opts) {
        return createPointerGaugeElement(opts);
    }
    static graph(opts) {
        return createGraphElement(opts);
    }
    static log(opts) {
        return createLogElement(opts);
    }
    static modal(opts) {
        return createModalElement(opts);
    }
}
const API_BASE_URL = "/tinydash";
async function fetchData(endpoint) {
    try {
        const response = await fetch(`${API_BASE_URL}/${endpoint}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    }
    catch (error) {
        console.error('Error fetching data:', error);
        return null;
    }
}
async function sendCommand(endpoint, method, payload) {
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
    }
    catch (error) {
        console.error('Error sending command:', error);
        return null;
    }
}
function sendChanges(el, value) {
    if (el.opts.name) {
        const o = {};
        o[el.opts.name] = value;
        handleChange(o);
    }
    if (el.opts.onchange) {
        el.opts.onchange(el, value);
    }
}
function togglePressed(el) {
    el.pressed = !el.pressed;
    if (el.type === "toggle") {
        const toggleDiv = el.getElementsByClassName("td_toggle")[0];
        toggleDiv.setAttribute("pressed", el.pressed ? "1" : "0");
    }
    sendChanges(el, el.pressed);
}
function buttonPressed(el) {
    el.pressed = !el.pressed;
    if (el.type === "button") {
        el.setAttribute("pressed", el.pressed ? "1" : "0");
    }
    sendChanges(el, el.pressed);
    el.pressed = false;
    setTimeout(function () {
        el.setAttribute("pressed", "0");
    }, 200);
}
function buttonMousedown(el) {
    if (el.type === "button") {
        el.setAttribute("pressed", "1");
    }
}
function formatText(txt) {
    if (typeof txt !== "number")
        return txt;
    if (Math.floor(txt) === txt)
        return txt.toString();
    if (Math.abs(txt) > 1000)
        return txt.toFixed(0);
    if (Math.abs(txt) > 100)
        return txt.toFixed(1);
    return txt.toFixed(2);
}
async function handleChange(data) {
    console.log("Sending change:", data);
    await sendCommand("update", "POST", data);
}
function createTextElement(opts) {
    const element = createBaseElement("label", opts);
    const textContent = opts.text ? `<div class="td_label_text">${opts.text}</div>` : '<div class="td_label_text"></div>';
    element.innerHTML = `<div class="td_label"><span>${opts.label || ''}</span>${textContent}</div>`;
    element.setValue = function (v) {
        let textDiv = this.getElementsByClassName("td_label_text")[0];
        if (!textDiv) {
            textDiv = document.createElement('div');
            textDiv.className = 'td_label_text';
            this.querySelector('.td_label').appendChild(textDiv);
        }
        textDiv.innerHTML = String(v);
    };
    return element;
}
function createButtonElement(opts) {
    const element = createBaseElement("button", opts);
    const pressed = 0;
    const glyph = opts.glyph || "&#x1f4a1;";
    element.innerHTML = `<div class="td_btn" pressed="${pressed}"><span>${opts.label}</span><div class="td_btn_a">${glyph}</div></div>`;
    element.pressed = Boolean(pressed);
    const btnA = element.getElementsByClassName("td_btn_a")[0];
    btnA.onclick = () => buttonPressed(element);
    btnA.onmousedown = () => buttonMousedown(element);
    element.setValue = function (v) {
        this.pressed = v;
        this.setAttribute("pressed", this.pressed ? "1" : "0");
    };
    return element;
}
function createToggleElement(opts) {
    const element = createBaseElement("toggle", opts);
    const pressed = opts.value ? 1 : 0;
    element.innerHTML = `<div class="td_toggle" pressed="${pressed}"><span>${opts.label}</span><div class="td_toggle_a"><div class="td_toggle_b"></div></div></div>`;
    element.pressed = Boolean(pressed);
    const toggleA = element.getElementsByClassName("td_toggle_a")[0];
    toggleA.onclick = () => togglePressed(element);
    element.setValue = function (v) {
        this.pressed = v;
        const toggleDiv = this.getElementsByClassName("td_toggle")[0];
        toggleDiv.setAttribute("pressed", this.pressed ? "1" : "0");
    };
    return element;
}
function createValueSteppableElement(opts) {
    const element = createBaseElement("steppablevalue", opts);
    const valueOpts = element.opts;
    element.value = parseFloat(String(valueOpts.value));
    element.min = valueOpts.min;
    element.max = valueOpts.max;
    element.step = valueOpts.step;
    let html;
    html = '<div class="td_val_b">&#9664;</div><div class="td_val_a"></div><div class="td_val_b">&#9654;</div>';
    element.innerHTML = `<div class="td_val"><span>${valueOpts.label}</span>${html}</div>`;
    const b = element.getElementsByClassName("td_val_b");
    b[0].onclick = () => {
        element.setValue(element.value - element.step);
    };
    b[1].onclick = () => {
        element.setValue(element.value + element.step);
    };
    element.setValue = function (v) {
        if (this.min !== undefined && v < this.min)
            v = this.min;
        if (this.max !== undefined && v > this.max)
            v = this.max;
        if (this.value !== v) {
            sendChanges(this, v);
            this.value = v;
        }
        const valA = this.getElementsByClassName("td_val_a")[0];
        valA.innerHTML = formatText(v);
    };
    element.setValue(element.value);
    return element;
}
function createGaugeElement(opts) {
    const element = createBaseElement("gauge", opts);
    const gaugeOpts = element.opts;
    element.value = (gaugeOpts.value === undefined) ? 0 : gaugeOpts.value;
    element.min = (gaugeOpts.min === undefined) ? 0 : gaugeOpts.min;
    element.max = (gaugeOpts.max === undefined) ? 1 : gaugeOpts.max;
    element.innerHTML = `<div class="td_gauge"><span>${gaugeOpts.label}</span><canvas></canvas><div class="td_gauge_a">${formatText(element.value)}</div></div>`;
    const canvas = element.getElementsByTagName("canvas")[0];
    const ctx = canvas.getContext("2d");
    element.draw = function () {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        const s = Math.min(canvas.width, canvas.height);
        ctx.lineCap = "round";
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        ctx.lineWidth = 20;
        ctx.strokeStyle = "#000";
        ctx.arc(canvas.width / 2, canvas.height / 2 + 20, (s / 2) - 24, Math.PI * 0.75, 2.25 * Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.lineWidth = 16;
        ctx.strokeStyle = "#09F";
        let normalizedV = ((this.value || 0) - this.min) / (this.max - this.min);
        if (normalizedV < 0)
            normalizedV = 0;
        if (normalizedV > 1)
            normalizedV = 1;
        ctx.arc(canvas.width / 2, canvas.height / 2 + 20, (s / 2) - 24, Math.PI * 0.75, (0.75 + (1.5 * normalizedV)) * Math.PI);
        ctx.stroke();
    };
    element.setValue = function (v) {
        this.value = v;
        const gaugeA = this.getElementsByClassName("td_gauge_a")[0];
        gaugeA.innerHTML = formatText(v);
        this.draw();
    };
    setTimeout(() => element.draw(), 100);
    element.onresize = () => element.draw();
    return element;
}
function createPointerGaugeElement(opts) {
    const element = createBaseElement("pointer_gauge", opts);
    const gaugeOpts = element.opts;
    element.value = (gaugeOpts.value === undefined) ? 0 : gaugeOpts.value;
    element.min = (gaugeOpts.min === undefined) ? 0 : gaugeOpts.min;
    element.max = (gaugeOpts.max === undefined) ? 1 : gaugeOpts.max;
    const colors = gaugeOpts.colors || ["#4DDB67", "#D4DB4D", "#DB4D4D"];
    const ratios = gaugeOpts.ratios || [];
    element.innerHTML = `<div class="td_gauge"><span>${gaugeOpts.label}</span><canvas></canvas><div class="td_gauge_a">${formatText(element.value)}</div></div>`;
    const canvas = element.getElementsByTagName("canvas")[0];
    const ctx = canvas.getContext("2d");
    element.draw = function () {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        const s = Math.min(canvas.width, canvas.height);
        ctx.lineCap = "square";
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        ctx.lineWidth = 20;
        ctx.strokeStyle = "#000";
        ctx.arc(canvas.width / 2, canvas.height / 2 + 20, (s / 2) - 24, Math.PI * 0.75, 2.25 * Math.PI);
        ctx.stroke();
        const numSegments = Math.min(colors.length, ratios.length > 0 ? ratios.length : colors.length);
        const effectiveRatios = [];
        for (let i = 0; i < numSegments; i++) {
            effectiveRatios.push(ratios[i] !== undefined ? ratios[i] : 1);
        }
        const totalRatio = effectiveRatios.reduce((sum, r) => sum + r, 0);
        const safeTotalRatio = totalRatio === 0 ? (numSegments > 0 ? numSegments : 1) : totalRatio;
        const startAngle = Math.PI * 0.75;
        const endAngle = Math.PI * 2.25;
        const totalArcAngle = endAngle - startAngle;
        let currentAngle = startAngle;
        for (let i = 0; i < numSegments; i++) {
            const segmentAngle = (effectiveRatios[i] / safeTotalRatio) * totalArcAngle;
            ctx.beginPath();
            ctx.lineWidth = 16;
            ctx.strokeStyle = colors[i];
            ctx.arc(canvas.width / 2, canvas.height / 2 + 20, (s / 2) - 24, currentAngle, currentAngle + segmentAngle);
            ctx.stroke();
            currentAngle += segmentAngle;
        }
        ctx.beginPath();
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#000";
        let v_normalized = ((this.value || 0) - this.min) / (this.max - this.min);
        if (v_normalized < 0)
            v_normalized = 0;
        if (v_normalized > 1)
            v_normalized = 1;
        const angle = (0.75 + (1.5 * v_normalized)) * Math.PI;
        const pointerLength = (s / 2) - 24;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2 + 20;
        const pointerX = centerX + pointerLength * Math.cos(angle);
        const pointerY = centerY + pointerLength * Math.sin(angle);
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(pointerX, pointerY);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(centerX, centerY, 5, 0, 2 * Math.PI);
        ctx.fillStyle = "#000";
        ctx.fill();
    };
    element.setValue = function (v) {
        this.value = v;
        const gaugeA = this.getElementsByClassName("td_gauge_a")[0];
        gaugeA.innerHTML = formatText(v);
        this.draw();
    };
    setTimeout(() => element.draw(), 100);
    element.onresize = () => element.draw();
    return element;
}
function createGraphElement(opts) {
    const element = createBaseElement("graph", opts);
    element.innerHTML = `<div class="td_graph"><span>${opts.label}</span><canvas></canvas></div>`;
    const canvas = element.getElementsByTagName("canvas")[0];
    const ctx = canvas.getContext("2d");
    element.setData = function (d) {
        this.opts.data = d;
        this.draw();
    };
    element.draw = function () {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        const s = Math.min(canvas.width, canvas.height);
        const xbase = 18;
        const ybase = canvas.height - 18;
        const xs = (canvas.width - 8 - xbase);
        const ys = (ybase - 28);
        ctx.font = "8px Sans";
        ctx.fillStyle = "#000";
        ctx.fillRect(4, 24, canvas.width - 8, canvas.height - 28);
        let dxmin, dxmax, dymin, dymax;
        const graphOpts = this.opts;
        if (this.opts.data !== undefined) {
            let traces = this.opts.data && this.opts.data.length > 0 && typeof this.opts.data[0] === 'object' ? this.opts.data : [this.opts.data || []];
            traces.forEach(function (trace) {
                for (const i in trace) {
                    const key = parseFloat(i);
                    const v = parseFloat(trace[i]);
                    if (dxmin === undefined || key < dxmin)
                        dxmin = key;
                    if (dxmax === undefined || key > dxmax)
                        dxmax = key;
                    if (dymin === undefined || v < dymin)
                        dymin = v;
                    if (dymax === undefined || v > dymax)
                        dymax = v;
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
                function getx(x) { return xbase + (xs * (x - dxmin) / safeDxs); }
                function gety(y) { return ybase - (ys * (y - dymin) / safeDys); }
                traces.forEach((trace, idx) => {
                    ctx.beginPath();
                    ctx.strokeStyle = (traces.length > 1) ? `hsl(${(idx * 360 / traces.length)}, 100%, 50%)` : "#09F";
                    let first = true;
                    for (const i in trace) {
                        const key = parseFloat(i);
                        const val = parseFloat(trace[i]);
                        if (first) {
                            ctx.moveTo(getx(key), gety(val));
                            first = false;
                        }
                        else {
                            ctx.lineTo(getx(key), gety(val));
                        }
                    }
                    ctx.stroke();
                });
                ctx.fillStyle = "#fff";
                if (graphOpts.gridy) {
                    ctx.textAlign = "right";
                    for (let i = dymin; i <= dymax; i += graphOpts.gridy) {
                        const y = gety(i);
                        const t = graphOpts.ylabel ? graphOpts.ylabel(i) : i.toString();
                        ctx.fillRect(xbase - 1, y, 3, 1);
                        if (y > ctx.measureText(t).width / 2) {
                            ctx.fillText(t, xbase - 5, y + 2);
                        }
                    }
                }
                if (graphOpts.gridx) {
                    const gx = graphOpts.gridx;
                    ctx.textAlign = "center";
                    for (let i = gx * Math.ceil(dxmin / gx); i <= dxmax; i += gx) {
                        const x = getx(i);
                        const t = graphOpts.xlabel ? graphOpts.xlabel(i) : i.toString();
                        ctx.fillRect(x, ybase - 1, 1, 3);
                        ctx.fillText(t, x, ybase + 10);
                    }
                }
            }
        }
        else {
            ctx.fillStyle = "#888";
            ctx.textAlign = "center";
            ctx.fillText("[No Data]", xbase + (xs / 2), ybase - (ys / 2));
        }
        ctx.beginPath();
        ctx.strokeStyle = "#fff";
        ctx.moveTo(xbase, ybase - ys);
        ctx.lineTo(xbase, ybase + 10);
        ctx.moveTo(xbase - 10, ybase);
        ctx.lineTo(xbase + xs, ybase);
        ctx.stroke();
    };
    setTimeout(() => element.draw(), 100);
    element.onresize = () => element.draw();
    return element;
}
function createLogElement(opts) {
    const element = createBaseElement("log", opts);
    const logOpts = element.opts;
    logOpts.text = logOpts.text || "";
    element.innerHTML = `<div class="td_log"><span>${opts.label}</span><div class="td_log_a td_scrollable"></div></div>`;
    const logDiv = element.getElementsByClassName("td_log_a")[0];
    element.update = function () {
        const logOpts = this.opts;
        logDiv.innerHTML = (logOpts.text || "").replace(/\n/g, "<br/>\n");
    };
    element.log = function (txt) {
        const logOpts = this.opts;
        logOpts.text = (logOpts.text || "") + "\n" + txt;
        this.update();
        logDiv.scrollTop = logDiv.scrollHeight;
    };
    element.clear = function () {
        const logOpts = this.opts;
        logOpts.text = "";
        this.update();
    };
    element.update();
    return element;
}
function createModalElement(opts) {
    const element = createBaseElement("modal", opts);
    element.innerHTML = `<div class="td_modal"><span>${opts.label}</span></div>`;
    element.onclick = () => {
        togglePressed(element);
        if (!element.opts.onchange) {
            element.remove();
        }
    };
    return element;
}
setInterval(async () => {
    const data = await fetchData("data");
    if (data) {
        TD.update(data);
    }
}, 2000);
