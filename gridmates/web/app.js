const MIN = 0.10, MAX = 0.25, QTY = 3;

const SCRIPT = [
  { round: 1 },
  { sup: "Asking buyer for an opening offer" },
  { who: "buyer", kind: "OFFER", price: 0.12, text: "Three kWh is a small order. I can do €0.12 per kWh." },
  { sup: "Passing buyer's offer (€0.12) to seller" },
  { who: "seller", kind: "OFFER", price: 0.22, text: "That's too low for clean, ready power. My price is €0.22 per kWh." },
  { round: 2 },
  { sup: "Passing seller's offer (€0.22) to buyer" },
  { who: "buyer", kind: "OFFER", price: 0.16, text: "I'll move up to €0.16. Pay me back in volume next time." },
  { sup: "Passing buyer's offer (€0.16) to seller" },
  { who: "seller", kind: "OFFER", price: 0.19, text: "I can come down to €0.19 per kWh." },
  { round: 3 },
  { sup: "Passing seller's offer (€0.19) to buyer" },
  { who: "buyer", kind: "OFFER", price: 0.18, text: "Last move from me: €0.18 per kWh." },
  { sup: "Passing buyer's offer (€0.18) to seller" },
  { who: "seller", kind: "ACCEPT", price: 0.18, text: "Fair enough. I accept €0.18 per kWh for 3 kWh." },
  { done: 0.18 },
];

const $ = (id) => document.getElementById(id);
const els = {
  log: $("log"), round: $("round-label"), supBox: $("supervisor"), supText: $("sup-text"),
  pinB: $("pin-buyer"), pinS: $("pin-seller"), deal: $("deal"), result: $("result"),
  play: $("btn-play"), replay: $("btn-replay"),
  actors: { buyer: $("buyer"), seller: $("seller") },
};

let index = 0, paused = false, timer = null;

const pct = (p) => ((p - MIN) / (MAX - MIN)) * 100 + "%";
const eur = (p) => "€" + p.toFixed(2);

function setTalking(who) {
  for (const [name, el] of Object.entries(els.actors)) el.classList.toggle("talking", name === who);
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
  if (price != null) {
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
  pin.style.left = pct(price);
  pin.firstElementChild.textContent = eur(price);
}

function reset() {
  clearTimeout(timer);
  index = 0;
  els.log.replaceChildren();
  els.result.hidden = true;
  for (const pin of [els.pinB, els.pinS, els.deal]) pin.hidden = true;
  els.round.textContent = "Round 1 of 3";
  els.supText.textContent = "Supervisor ready";
  els.supBox.classList.remove("active");
  setTalking(null);
}

// Returns how long to wait before the next step.
function runStep(step) {
  if (step.round) {
    els.round.textContent = `Round ${step.round} of 3`;
    return 300;
  }
  if (step.sup) {
    els.supText.textContent = step.sup;
    els.supBox.classList.add("active");
    addMessage("msg--sup", null, null, step.sup);
    setTalking(null);
    return 1100;
  }
  if (step.who) {
    const isBuyer = step.who === "buyer";
    setTalking(step.who);
    movePin(isBuyer ? els.pinB : els.pinS, step.price);
    addMessage(isBuyer ? "msg--buyer" : "msg--seller", isBuyer ? "Buyer" : "Seller",
      `${step.kind} ${eur(step.price)}`, step.text);
    return 2600;
  }
  setTalking(null);
  els.supText.textContent = "Deal checked: price and quantity are valid";
  els.deal.hidden = false;
  els.deal.style.left = pct(step.done);
  els.result.hidden = false;
  els.result.innerHTML = `Agreement reached at <b>${eur(step.done)}</b> per kWh for ${QTY} kWh. ` +
    `Total cost: <b>${eur(step.done * QTY)}</b>.`;
  return 0;
}

function tick() {
  if (paused || index >= SCRIPT.length) return;
  const wait = runStep(SCRIPT[index++]);
  if (index < SCRIPT.length) timer = setTimeout(tick, wait);
}

els.play.addEventListener("click", () => {
  paused = !paused;
  els.play.textContent = paused ? "Play" : "Pause";
  if (!paused) { clearTimeout(timer); tick(); }
});
els.replay.addEventListener("click", () => {
  reset();
  paused = false;
  els.play.textContent = "Pause";
  tick();
});

tick();
