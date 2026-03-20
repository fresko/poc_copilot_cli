const API_URL = 'http://localhost:3000/api';

// Time constants
const MS_PER_MINUTE = 60000;
const MINUTES_PER_HOUR = 60;

// State
let reservations = [];
let pendingCheckoutId = null;
let clockInterval = null;

// DOM Elements
const tableBody = document.getElementById('reservationTableBody');
const emptyState = document.getElementById('emptyState');
const createModal = new bootstrap.Modal(document.getElementById('createModal'));
const checkoutModal = new bootstrap.Modal(document.getElementById('checkoutModal'));
const checkoutTimeDisplay = document.getElementById('checkoutTimeDisplay');
const confirmCheckoutBtn = document.getElementById('confirmCheckoutBtn');

// Init
document.addEventListener('DOMContentLoaded', () => {
    fetchReservations();
    setupSearch();
    
    // Refresh active reservation durations every minute
    setInterval(() => {
        if (reservations.some(r => r.status === 'active')) {
            renderReservations(reservations);
        }
    }, MS_PER_MINUTE);

    // Checkout Modal Events
    const checkoutModalEl = document.getElementById('checkoutModal');
    checkoutModalEl.addEventListener('shown.bs.modal', startClock);
    checkoutModalEl.addEventListener('hidden.bs.modal', stopClock);
    
    confirmCheckoutBtn.addEventListener('click', finalizeCheckout);
});

// Canvas Clock Logic
function startClock() {
    const canvas = document.getElementById('clockCanvas');
    const ctx = canvas.getContext('2d');
    const radius = canvas.height / 2;
    ctx.translate(radius, radius);
    const clockRadius = radius * 0.90;

    function drawClock() {
        drawFace(ctx, clockRadius);
        drawNumbers(ctx, clockRadius);
        drawTime(ctx, clockRadius);
    }

    // Initial draw
    drawClock();
    // Update every second
    clockInterval = setInterval(drawClock, 1000);
}

function stopClock() {
    if (clockInterval) {
        clearInterval(clockInterval);
        clockInterval = null;
    }
    // Reset canvas context transformation for next open
    const canvas = document.getElementById('clockCanvas');
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Identity matrix
}

function drawFace(ctx, radius) {
    // Circle
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, 2 * Math.PI);
    ctx.fillStyle = 'white';
    ctx.fill();
    
    // Rim
    const grad = ctx.createRadialGradient(0, 0, radius * 0.95, 0, 0, radius * 1.05);
    grad.addColorStop(0, '#333');
    grad.addColorStop(0.5, 'white');
    grad.addColorStop(1, '#333');
    ctx.strokeStyle = grad;
    ctx.lineWidth = radius * 0.1;
    ctx.stroke();
    
    // Center dot
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.1, 0, 2 * Math.PI);
    ctx.fillStyle = '#333';
    ctx.fill();
}

function drawNumbers(ctx, radius) {
    ctx.font = radius * 0.15 + "px arial";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    for(let num = 1; num < 13; num++){
        const ang = num * Math.PI / 6;
        ctx.rotate(ang);
        ctx.translate(0, -radius * 0.85);
        ctx.rotate(-ang);
        ctx.fillText(num.toString(), 0, 0);
        ctx.rotate(ang);
        ctx.translate(0, radius * 0.85);
        ctx.rotate(-ang);
    }
}

function drawTime(ctx, radius){
    const now = new Date();
    let hour = now.getHours();
    let minute = now.getMinutes();
    let second = now.getSeconds();
    
    // Update text display
    if(checkoutTimeDisplay) {
        checkoutTimeDisplay.textContent = now.toLocaleTimeString();
    }
    
    // Hour
    hour = hour % 12;
    hour = (hour*Math.PI/6) + (minute*Math.PI/(6*60)) + (second*Math.PI/(360*60));
    drawHand(ctx, hour, radius*0.5, radius*0.07);
    
    // Minute
    minute = (minute*Math.PI/30) + (second*Math.PI/(30*60));
    drawHand(ctx, minute, radius*0.8, radius*0.07);
    
    // Second
    second = (second*Math.PI/30);
    drawHand(ctx, second, radius*0.9, radius*0.02, 'red');
}

function drawHand(ctx, pos, length, width, color = '#333') {
    ctx.beginPath();
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.strokeStyle = color;
    ctx.moveTo(0,0);
    ctx.rotate(pos);
    ctx.lineTo(0, -length);
    ctx.stroke();
    ctx.rotate(-pos);
}

// Calculate elapsed time between two ISO date strings and format as HH:MM
function formatDuration(startIso, endIso) {
    if (!startIso) return '—';
    const start = new Date(startIso);
    const end = endIso ? new Date(endIso) : new Date();
    const diffMs = end - start;
    if (isNaN(diffMs) || diffMs < 0) return '—';
    const totalMinutes = Math.floor(diffMs / MS_PER_MINUTE);
    const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR).toString().padStart(2, '0');
    const minutes = (totalMinutes % MINUTES_PER_HOUR).toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

// Fetch Data
async function fetchReservations() {
    try {
        const res = await fetch(`${API_URL}/reservations`);
        reservations = await res.json();
        renderReservations(reservations);
        updateStats();
    } catch (err) {
        console.error('Error fetching reservations:', err);
    }
}

// Render Table
function renderReservations(data) {
    tableBody.innerHTML = '';
    
    if (data.length === 0) {
        emptyState.classList.remove('d-none');
        return;
    }
    emptyState.classList.add('d-none');

    // Sort: Active first, then by date
    const sorted = [...data].sort((a, b) => {
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (a.status !== 'active' && b.status === 'active') return 1;
        return new Date(b.check_in_time) - new Date(a.check_in_time);
    });

    sorted.forEach(res => {
        const tr = document.createElement('tr');
        const checkIn = new Date(res.check_in_time).toLocaleString();
        const checkOut = res.check_out_time ? new Date(res.check_out_time).toLocaleString() : '—';
        const duration = formatDuration(res.check_in_time, res.check_out_time);

        // Safe access to nested properties
        const plate = res.vehicle?.license_plate || 'Unknown';
        const damage = res.vehicle?.damage_report || 'No damage reported';
        const name = res.customer?.full_name || 'Unknown';
        const mobile = res.customer?.mobile_number || 'Unknown';

        tr.innerHTML = `
            <td class="ps-4">
                <div class="fw-bold text-uppercase">${plate}</div>
                <small class="text-muted">${damage}</small>
            </td>
            <td>
                <div>${name}</div>
                <small class="text-muted">${mobile}</small>
            </td>
            <td>${checkIn}</td>
            <td>${checkOut}</td>
            <td class="font-monospace">${duration}</td>
            <td><span class="status-badge status-${(res.status || 'active').toLowerCase()}">${
            res.status === 'completed' ? 'CheckOut' :
            res.status === 'active' ? '<i class="fas fa-car me-1"></i>active' :
            (res.status || 'active')
        }</span></td>
            <td class="text-end pe-4">
                ${res.status === 'active' ? `
                <button class="btn btn-sm btn-success btn-action" title="Check Out" onclick="checkOut('${res.reservation_id}')">
                    <i class="fas fa-check"></i>
                </button>
                ` : ''}
                <button class="btn btn-sm btn-outline-danger btn-action" title="Delete" onclick="deleteReservation('${res.reservation_id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

// Create Reservation
window.submitReservation = async function() {
    const form = document.getElementById('createForm');
    
    // Basic Validation
    if (!form.fullName.value || !form.mobileNumber.value || !form.licensePlate.value) {
        alert("Please fill in all required fields.");
        return; 
    }

    // Generate QR code mock data
    const qrData = `VP-${Date.now()}-${Math.floor(Math.random()*1000)}`;
    
    const payload = {
        customer: {
            full_name: form.fullName.value,
            mobile_number: form.mobileNumber.value
        },
        vehicle: {
            license_plate: form.licensePlate.value,
            damage_report: form.damageReport.value || null,
            key_scan_data: null
        },
        qr_code_data: qrData,
        reservation_id: crypto.randomUUID(),
        status: 'active'
    };

    try {
        const res = await fetch(`${API_URL}/reservations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            form.reset();
            // Close modal using bootstrap API
            const modalEl = document.getElementById('createModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();
            fetchReservations();
        } else {
            alert('Error creating reservation');
        }
    } catch (err) {
        console.error(err);
        alert('Network error');
    }
}

// Check Out - Trigger Modal
window.checkOut = function(id) {
    pendingCheckoutId = id;
    checkoutModal.show();
}

// Finalize Checkout
async function finalizeCheckout() {
    if (!pendingCheckoutId) return;

    try {
        const now = new Date().toISOString();
        await fetch(`${API_URL}/reservations/${pendingCheckoutId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                status: 'completed',
                check_out_time: now
            })
        });
        
        checkoutModal.hide();
        pendingCheckoutId = null;
        fetchReservations();
    } catch (err) {
        console.error(err);
        alert('Error completing checkout');
    }
}

// Delete
window.deleteReservation = async function(id) {
    if (!confirm('Are you sure you want to delete this record?')) return;
    
    try {
        await fetch(`${API_URL}/reservations/${id}`, {
            method: 'DELETE'
        });
        fetchReservations();
    } catch (err) {
        console.error(err);
    }
}

// Stats
function updateStats() {
    if (!reservations) return;
    const active = reservations.filter(r => r.status === 'active').length;
    const completed = reservations.filter(r => r.status === 'completed').length;
    // Count unique customers by mobile
    const uniqueCustomers = new Set(reservations.map(r => r.customer?.mobile_number).filter(Boolean)).size;

    document.getElementById('stat-active').textContent = active;
    document.getElementById('stat-completed').textContent = completed;
    document.getElementById('stat-customers').textContent = uniqueCustomers;
}

// Search
function setupSearch() {
    document.getElementById('searchInput').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = reservations.filter(r => 
            (r.vehicle?.license_plate || '').toLowerCase().includes(term) ||
            (r.customer?.full_name || '').toLowerCase().includes(term)
        );
        renderReservations(filtered);
    });
}

