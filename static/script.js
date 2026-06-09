let currentRotation = 0;
let wheelConfig = { items: [], weights: [], locked: [], mode: "normal" };
const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#6366f1"];

async function initWheel() {
    const res = await fetch('/api/config');
    wheelConfig = await res.json();
    updateModeUI(wheelConfig.mode);
    renderWheel();
    renderInputs();
}

function updateModeUI(currentMode) {
    document.getElementById("modeNormal").classList.toggle("active", currentMode === "normal");
    document.getElementById("modeEliminate").classList.toggle("active", currentMode === "elimination");
}

async function changeMode(mode) {
    const res = await fetch('/api/set-mode', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ mode: mode })
    });
    if (res.ok) {
        wheelConfig.mode = mode;
        updateModeUI(mode);
    }
}

function renderInputs() {
    const container = document.getElementById('item-inputs');
    container.innerHTML = '';
    wheelConfig.items.forEach(item => addItemRow(item));
    document.getElementById('itemCount').innerText = `${wheelConfig.items.length} Item`;
}

function addItemRow(val = "") {
    const container = document.getElementById('item-inputs');
    const div = document.createElement('div');
    div.className = 'item-row';
    div.innerHTML = `
        <input type="text" value="${val}" class="item-val" placeholder="Ketik nama...">
        <button class="btn-del" onclick="this.parentElement.remove()">✕</button>
    `;
    container.appendChild(div);
}

async function saveItems() {
    const inputs = document.querySelectorAll('.item-val');
    const newItems = Array.from(inputs).map(i => i.value).filter(v => v.trim() !== "");
    const res = await fetch('/api/update-items', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(newItems)
    });
    if (res.ok) {
        wheelConfig = await res.json();
        renderWheel();
        document.getElementById('itemCount').innerText = `${wheelConfig.items.length} Item`;
    }
}

function renderWheel() {
    const wheel = document.getElementById('wheel');
    wheel.innerHTML = '';
    const total = wheelConfig.items.length;
    if (total === 0) { wheel.style.background = "#334155"; return; }
    
    const slice = 360 / total;
    wheelConfig.items.forEach((item, i) => {
        const angle = i * slice;
        const textDiv = document.createElement('div');
        textDiv.className = 'wheel-text';
        textDiv.innerText = item;
        textDiv.style.transform = `rotate(${angle + slice/2}deg)`;
        wheel.appendChild(textDiv);
    });

    const gradients = wheelConfig.items.map((_, i) => 
        `${colors[i % colors.length]} ${i * slice}deg ${(i+1) * slice}deg`
    );
    wheel.style.background = `conic-gradient(${gradients.join(',')})`;
}

async function spinWheel() {
    if (wheelConfig.items.length === 0) return;
    const btn = document.getElementById('spinBtn');
    btn.disabled = true;
    document.getElementById('resultText').innerText = "Memutar...";

    const res = await fetch('/api/spin');
    const data = await res.json();

    const slice = 360 / wheelConfig.items.length;
    const targetPos = (360 - (data.index * slice + slice/2)) % 360;
    const currentMod = currentRotation % 360;
    
    let diff = targetPos - currentMod;
    if (diff <= 0) diff += 360;

    currentRotation += diff + (360 * 5);
    document.getElementById('wheel').style.transform = `rotate(${currentRotation}deg)`;

    setTimeout(async () => {
        document.getElementById('resultText').innerText = `${data.winner}`;
        btn.disabled = false;

        // EKSEKUSI JIKA MODE ELIMINASI AKTIF
        if (data.mode === "elimination") {
            const elimRes = await fetch('/api/eliminate', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ item: data.winner })
            });
            if (elimRes.ok) {
                wheelConfig = await elimRes.ok ? await elimRes.json() : wheelConfig;
                // Update tampilan roda setelah jeda singkat agar terkesan halus
                setTimeout(() => {
                    renderWheel();
                    renderInputs();
                }, 1200);
            }
        }
    }, 4000);
}

window.onload = initWheel;