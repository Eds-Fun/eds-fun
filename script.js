const BACKEND_URL = "https://eds-fun-eds-fun.hf.space"; 

let currentRotation = 0;
let isSpinning = false;
let wheelConfig = { items: [], weights: [], locked: [], mode: "normal" };
const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#6366f1"];

async function initWheel() {
    try {
        const res = await fetch(`${BACKEND_URL}/api/config`);
        if (!res.ok) throw new Error("Backend offline");
        
        wheelConfig = await res.json();
        updateModeUI(wheelConfig.mode);
        renderWheel();
        renderInputs();
    } catch (err) {
        console.error("Gagal sinkronisasi awal dengan backend:", err);
        wheelConfig.items = ["1", "2", "3", "4", "5", "6"];
        wheelConfig.weights = [16.6, 16.6, 16.6, 16.6, 16.6, 17.0];
        wheelConfig.locked = [false, false, false, false, false, false];
        renderWheel();
        renderInputs();
    }
}

function updateModeUI(currentMode) {
    const btnNormal = document.getElementById("modeNormal");
    const btnEliminate = document.getElementById("modeEliminate");
    if(btnNormal) btnNormal.classList.toggle("active", currentMode === "normal");
    if(btnEliminate) btnEliminate.classList.toggle("active", currentMode === "elimination");
}

async function changeMode(mode) {
    if (isSpinning) return;
    try {
        const res = await fetch(`${BACKEND_URL}/api/set-mode`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ mode: mode })
        });
        if (res.ok) {
            wheelConfig.mode = mode;
            updateModeUI(mode);
        }
    } catch (err) {
        console.error(err);
    }
}

function renderInputs() {
    const container = document.getElementById('item-inputs');
    if (!container) return;
    container.innerHTML = '';
    
    if (!wheelConfig.items || wheelConfig.items.length === 0) {
        addItemRow("");
    } else {
        wheelConfig.items.forEach(item => addItemRow(item));
    }
    updateBadgeCount();
}

function addItemRow(val = "") {
    if (isSpinning) return;
    const container = document.getElementById('item-inputs');
    if (!container) return;
    
    const div = document.createElement('div');
    div.className = 'item-row';
    // Menggunakan karakter Unicode minimalis biasa pengganti emotikon silang
    div.innerHTML = `
        <input type="text" value="${val}" class="item-val" placeholder="Nama item..." ${isSpinning ? 'disabled' : ''}>
        <button class="btn-del" onclick="if(!isSpinning){this.parentElement.remove(); updateBadgeCount();}">Remove</button>
    `;
    container.appendChild(div);
    updateBadgeCount();
}

function updateBadgeCount() {
    const inputs = document.querySelectorAll('.item-val');
    const badge = document.getElementById('itemCount');
    if (badge) badge.innerText = `${inputs.length} Item`;
}

async function saveItems() {
    if (isSpinning) return;
    const inputs = document.querySelectorAll('.item-val');
    const newItems = Array.from(inputs).map(i => i.value.trim()).filter(v => v !== "");
    
    if (newItems.length === 0) {
        alert("Masukkan minimal satu item.");
        return;
    }

    try {
        const res = await fetch(`${BACKEND_URL}/api/update-items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newItems)
        });
        
        if (res.ok) {
            wheelConfig = await res.json();
            renderWheel();
            renderInputs();
        }
    } catch (err) {
        console.error("Gagal memperbarui item:", err);
    }
}

function renderWheel() {
    const wheel = document.getElementById('wheel');
    if (!wheel) return;
    
    wheel.innerHTML = '';
    const total = wheelConfig.items ? wheelConfig.items.length : 0;
    
    if (total === 0) { 
        wheel.style.background = "#334155"; 
        return; 
    }
    
    const slice = 360 / total;
    wheelConfig.items.forEach((item, i) => {
        const angle = i * slice;
        
        const wrapperDiv = document.createElement('div');
        wrapperDiv.className = 'wheel-text';
        wrapperDiv.style.transform = `rotate(${angle + (slice / 2)}deg)`;
        
        const spanText = document.createElement('span');
        spanText.innerText = item;
        
        wrapperDiv.appendChild(spanText);
        wheel.appendChild(wrapperDiv);
    });

    const gradients = wheelConfig.items.map((_, i) => 
        `${colors[i % colors.length]} ${i * slice}deg ${(i+1) * slice}deg`
    );
    wheel.style.background = `conic-gradient(${gradients.join(',')})`;
}

async function spinWheel() {
    if (isSpinning || !wheelConfig.items || wheelConfig.items.length === 0) return;
    
    isSpinning = true;
    const btn = document.getElementById('spinBtn');
    if (btn) btn.disabled = true;
    
    const resultText = document.getElementById('resultText');
    if (resultText) resultText.innerText = "Memutar roda...";

    try {
        const res = await fetch(`${BACKEND_URL}/api/spin`);
        const data = await res.json();

        const slice = 360 / wheelConfig.items.length;
        const targetPos = (360 - (data.index * slice + slice / 2)) % 360;
        const currentMod = currentRotation % 360;
        
        let diff = targetPos - currentMod;
        if (diff <= 0) diff += 360;

        currentRotation += diff + (360 * 5); 
        document.getElementById('wheel').style.transform = `rotate(${currentRotation}deg)`;

        setTimeout(async () => {
            // Teks pemenang dibersihkan dari dekorasi emotikon
            if (resultText) resultText.innerText = `Pemenang: ${data.winner}`;
            
            if (data.mode === "elimination") {
                const elimRes = await fetch(`${BACKEND_URL}/api/eliminate`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ item: data.winner })
                });
                if (elimRes.ok) {
                    wheelConfig = await elimRes.json();
                    setTimeout(() => {
                        renderWheel();
                        renderInputs();
                        isSpinning = false;
                        if (btn) btn.disabled = false;
                    }, 1200);
                } else {
                    isSpinning = false;
                    if (btn) btn.disabled = false;
                }
            } else {
                isSpinning = false;
                if (btn) btn.disabled = false;
            }
        }, 4000);
    } catch (err) {
        isSpinning = false;
        if (btn) btn.disabled = false;
        console.error(err);
    }
}

window.onload = initWheel;
