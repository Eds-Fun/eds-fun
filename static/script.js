const BACKEND_URL = "https://eds-fun-eds-fun.hf.space"; 

let currentRotation = 0;
let wheelConfig = { items: [], weights: [], locked: [], mode: "normal" };
const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#6366f1"];

// Fungsi Inisialisasi Utama saat Halaman Dimuat
async function initWheel() {
    try {
        const res = await fetch(`${BACKEND_URL}/api/config`);
        if (!res.ok) throw new Error("Server backend merespons dengan error");
        
        wheelConfig = await res.json();
        updateModeUI(wheelConfig.mode);
        renderWheel();
        renderInputs();
    } catch (err) {
        console.error("Gagal sinkronisasi awal dengan backend:", err);
        // FIX: Menggunakan huruf kecil 'false' agar JavaScript tidak error/macet
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
        console.error("Gagal mengubah mode:", err);
    }
}

// Fungsi Merender Kotak Input List di Sisi Kanan
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
    const container = document.getElementById('item-inputs');
    if (!container) return;
    
    const div = document.createElement('div');
    div.className = 'item-row';
    div.innerHTML = `
        <input type="text" value="${val}" class="item-val" placeholder="Ketik nama/angka...">
        <button class="btn-del" onclick="this.parentElement.remove(); updateBadgeCount();">✕</button>
    `;
    container.appendChild(div);
    updateBadgeCount();
}

function updateBadgeCount() {
    const inputs = document.querySelectorAll('.item-val');
    const badge = document.getElementById('itemCount');
    if (badge) {
        badge.innerText = `${inputs.length} Item`;
    }
}

// KIRIM DATA KE SERVER (Tombol Terapkan Perubahan)
async function saveItems() {
    const inputs = document.querySelectorAll('.item-val');
    const newItems = Array.from(inputs).map(i => i.value.trim()).filter(v => v !== "");
    
    if (newItems.length === 0) {
        alert("Silakan masukkan minimal satu item terlebih dahulu!");
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
            alert("Roda dan item berhasil diperbarui di server pusat!");
        } else {
            alert("Gagal memperbarui item. Server merespons dengan kesalahan.");
        }
    } catch (err) {
        alert("Gagal mengirim data ke backend. Pastikan server Hugging Face Anda tidak dalam kondisi Sleep/Tertidur.");
        console.error(err);
    }
}

// Fungsi Menggambar Roda Berwarna
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

// Fungsi Animasi Putar Roda Roulette
async function spinWheel() {
    if (!wheelConfig.items || wheelConfig.items.length === 0) {
        alert("Roda tidak dapat diputar karena item masih kosong!");
        return;
    }
    
    const btn = document.getElementById('spinBtn');
    if (btn) btn.disabled = true;
    
    const resultText = document.getElementById('resultText');
    if (resultText) resultText.innerText = "Memutar...";

    try {
        const res = await fetch(`${BACKEND_URL}/api/spin`);
        if (!res.ok) throw new Error("Gagal mendapatkan hasil spin");
        const data = await res.json();

        const slice = 360 / wheelConfig.items.length;
        const targetPos = (360 - (data.index * slice + slice/2)) % 360;
        const currentMod = currentRotation % 360;
        
        let diff = targetPos - currentMod;
        if (diff <= 0) diff += 360;

        currentRotation += diff + (360 * 5); 
        const wheelEl = document.getElementById('wheel');
        if (wheelEl) wheelEl.style.transform = `rotate(${currentRotation}deg)`;

        setTimeout(async () => {
            if (resultText) resultText.innerText = `Angka ${data.winner}`;
            if (btn) btn.disabled = false;

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
                    }, 1200);
                }
            }
        }, 4000);

    } catch (err) {
        if (btn) btn.disabled = false;
        if (resultText) resultText.innerText = "Error!";
        console.error(err);
    }
}

window.onload = initWheel;
