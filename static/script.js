// GANTI URL DI BAWAH INI DENGAN URL BACKEND LIVE ANDA YANG SEBENARNYA!
const BACKEND_URL = "https://eds-fun-eds-fun.hf.space";

let currentRotation = 0;
let wheelConfig = { items: [], weights: [], locked: [], mode: "normal" };
const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#6366f1"];

async function initWheel() {
    const res = await fetch(`${BACKEND_URL}/api/config`);
    wheelConfig = await res.json();
    updateModeUI(wheelConfig.mode);
    renderWheel();
    renderInputs();
}

async function changeMode(mode) {
    const res = await fetch(`${BACKEND_URL}/api/set-mode`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ mode: mode })
    });
    if (res.ok) {
        wheelConfig.mode = mode;
        updateModeUI(mode);
    }
}

async function saveItems() {
    const inputs = document.querySelectorAll('.item-val');
    const newItems = Array.from(inputs).map(i => i.value).filter(v => v.trim() !== "");
    const res = await fetch(`${BACKEND_URL}/api/update-items`, {
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

async function spinWheel() {
    if (wheelConfig.items.length === 0) return;
    const btn = document.getElementById('spinBtn');
    btn.disabled = true;
    document.getElementById('resultText').innerText = "Memutar...";

    const res = await fetch(`${BACKEND_URL}/api/spin`);
    const data = await res.json();

    const slice = 360 / wheelConfig.items.length;
    const targetPos = (360 - (data.index * slice + slice/2)) % 360;
    const currentMod = currentRotation % 360;
    
    let diff = targetPos - currentMod;
    if (diff <= 0) diff += 360;

    currentRotation += diff + (360 * 5);
    document.getElementById('wheel').style.transform = `rotate(${currentRotation}deg)`;

    setTimeout(async () => {
        document.getElementById('resultText').innerText = `Angka ${data.winner}`;
        btn.disabled = false;

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
}
// ... sisa fungsi render UI tetap sama seperti kode sebelumnya ...