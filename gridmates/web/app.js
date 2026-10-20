const MIN = 0.10, MAX = 0.25, QTY = 3, ROUNDS = 3;
const GRAPH_ID = "gridmates";
const PROMPT = "Start the electricity negotiation between the buyer and the seller.";

const $ = (id) => document.getElementById(id);
const els = {
  log: $("log"), round: $("round-label"), supBox: $("supervisor"), supText: $("sup-text"),
  pinB: $("pin-buyer"), pinS: $("pin-seller"), deal: $("deal"), result: $("result"),
  start: $("btn-start"), status: $("status"), server: $("server"), apikey: $("apikey"),
  actors: { buyer: $("buyer"), seller: $("seller") },
};

const pct = (p) => ((p - MIN) / (MAX - MIN)) * 100 + "%";
const eur = (p) => "€" + p.toFixed(2);

function setTalking(who) {
  for (const [name, el] of Object.entries(els.actors)) el.classList.toggle("talking", name === who);
}

function setStatus(text, isError = false) {
  els.status.hidden = !text;
  els.status.textContent = text || "";
  els.status.classList.toggle("error", isError);
}

function setSupervisor(text) {
  els.supText.textContent = text;
  els.supBox.classList.add("active");
}

function addMessage(cls, who, price, text) {
  const li = document.createElement("li");
  li.className = "msg " + cls;
  if (who) {
    const label = document.createElement("span");
    label.className = "who";
    label.textContent = who;
    li.append(label);
  }
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  if (price) {
    const p = document.createElement("span");
    p.className = "price";
    p.textContent = price;
    bubble.append(p);
  }
  bubble.append(document.createTextNode(text));
  li.append(bubble);
  els.log.append(li);
  li.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function movePin(pin, price) {
  pin.hidden = false;
  pin.style.left = pct(Math.min(MAX, Math.max(MIN, price)));
  pin.firstElementChild.textContent = eur(price);
}

function reset() {
  els.log.replaceChildren();
  els.result.hidden = true;
  for (const pin of [els.pinB, els.pinS, els.deal]) pin.hidden = true;
  els.round.textContent = "Round 1 of " + ROUNDS;
  els.supText.textContent = "Supervisor ready";
  els.supBox.classList.remove("active");
  setTalking(null);
  setStatus("");
}

// --- Agent server (LangGraph API served by `mda dev`) ---

function headers() {
  const h = { "Content-Type": "application/json" };
  if (els.apikey.value.trim()) h["x-api-key"] = els.apikey.value.trim();
  return h;
}

async function api(path, body) {
  const base = els.server.value.replace(/\/$/, "");
  const res = await fetch(base + path, { method: "POST", headers: headers(), body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} from ${path}: ${(await res.text()).slice(0, 200)}`);
  return res;
}

async function findAssistant() {
  const list = await (await api("/assistants/search", { limit: 20 })).json();
  const match = list.find((a) => a.graph_id === GRAPH_ID) || list[0];
  if (!match) throw new Error("The server has no agents. Is `mda dev` running in the project?");
  return match.assistant_id;
}

async function* sse(res) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
    let end;
    while ((end = buffer.indexOf("\n\n")) >= 0) {
      const block = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      let event = "message", data = "";
      for (const line of block.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data += line.slice(5).trim();
      }
      if (data) yield { event, data: JSON.parse(data) };
    }
  }
}

// Every message the run adds, from any node of the graph.
function* messagesOf(update) {
  for (const node of Object.values(update || {})) {
    const msgs = node && node.messages;
    if (Array.isArray(msgs)) yield* msgs;
  }
}

const textOf = (content) =>
  typeof content === "string" ? content
    : Array.isArray(content) ? content.map((c) => (typeof c === "string" ? c : c.text || "")).join("") : "";

// --- Negotiation state ---

const state = { pending: new Map(), buyerOffers: 0, deal: null };

function parseReply(text) {
  const m = text.match(/(OFFER|ACCEPT)\s*:\s*€?\s*(\d+(?:[.,]\d+)?)/i);
  if (!m) return null;
  return { kind: m[1].toUpperCase(), price: parseFloat(m[2].replace(",", ".")) };
}

function onToolCall(call) {
  if (call.name !== "task") return;
  const who = call.args.subagent_type;
  state.pending.set(call.id, who);
  const brief = String(call.args.description || "").replace(/\s+/g, " ").slice(0, 160);
  setSupervisor(`Asking ${who}`);
  addMessage("msg--sup", null, null, `Supervisor → ${who}: ${brief}`);
  setTalking(who);
}

function onToolResult(msg) {
  const who = state.pending.get(msg.tool_call_id);
  if (!who) return;
  const reply = textOf(msg.content).trim();
  const parsed = parseReply(reply);
  const isBuyer = who === "buyer";
  if (isBuyer) {
    state.buyerOffers += 1;
    els.round.textContent = `Round ${Math.min(state.buyerOffers, ROUNDS)} of ${ROUNDS}`;
  }
  if (parsed) {
    movePin(isBuyer ? els.pinB : els.pinS, parsed.price);
    if (parsed.kind === "ACCEPT") state.deal = parsed.price;
  }
  const body = parsed ? reply.replace(/^[^\n]*(OFFER|ACCEPT)[^\n]*\n?/i, "").trim() || reply : reply;
  addMessage(isBuyer ? "msg--buyer" : "msg--seller", isBuyer ? "Buyer" : "Seller",
    parsed ? `${parsed.kind} ${eur(parsed.price)}` : "", body);
  setTalking(null);
}

function onFinal(msg) {
  setTalking(null);
  const text = textOf(msg.content).trim();
  if (!text) return;
  const valid = state.deal != null && state.deal >= MIN && state.deal <= MAX;
  setSupervisor(valid ? "Deal checked: price and quantity are valid" : "Negotiation finished");
  if (valid) {
    els.deal.hidden = false;
    els.deal.style.left = pct(state.deal);
  }
  els.result.hidden = false;
  els.result.replaceChildren();
  if (valid) {
    const b = document.createElement("b");
    b.textContent = `${eur(state.deal)} per kWh, ${eur(state.deal * QTY)} for ${QTY} kWh. `;
    els.result.append(b);
  }
  els.result.append(document.createTextNode(text));
}

function handle(msg) {
  if (msg.type === "ai") {
    (msg.tool_calls || []).forEach(onToolCall);
    if (!(msg.tool_calls || []).length) onFinal(msg);
  } else if (msg.type === "tool") {
    onToolResult(msg);
  }
}

async function start() {
  reset();
  state.pending.clear();
  state.buyerOffers = 0;
  state.deal = null;
  els.start.disabled = true;
  els.start.textContent = "Negotiating…";
  setStatus("Connecting to the agent…");
  try {
    const assistant_id = await findAssistant();
    const thread = await (await api("/threads", {})).json();
    const res = await api(`/threads/${thread.thread_id}/runs/stream`, {
      assistant_id,
      input: { messages: [{ role: "user", content: PROMPT }] },
      stream_mode: ["updates"],
    });
    setStatus("");
    for await (const { event, data } of sse(res)) {
      if (event === "error") throw new Error(data.message || JSON.stringify(data));
      if (event.startsWith("updates")) for (const m of messagesOf(data)) handle(m);
    }
  } catch (err) {
    const hint = err instanceof TypeError
      ? "Could not reach the server. Start it with `mda dev` in the project folder, then check the address under Connection."
      : err.message;
    setStatus(hint, true);
  } finally {
    setTalking(null);
    els.start.disabled = false;
    els.start.textContent = "Run again";
  }
}

els.start.addEventListener("click", start);
