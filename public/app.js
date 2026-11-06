import { MENU, newDraft, totals, restoreDraft, validateSale } from './order.mjs';

const $ = selector => document.querySelector(selector);
const icon = name => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
const money = pence => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pence / 100);
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const image = item => `/assets/${item.image}.svg`;
const STORAGE_KEY = 'juniper-epos-v1';
let draft = newDraft();
let sales = [];
let category = 'All items';
let activeView = 'till';
let toastTimeout;
let storageWarning = false;
let saved;
try {
  saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  if (saved && saved.version === 1) {
    draft = restoreDraft(saved.draft);
    sales = Array.isArray(saved.sales) ? saved.sales.filter(validateSale).map(sale => ({ ...sale, draft: restoreDraft(sale.draft) })).slice(-500) : [];
  }
} catch {
  storageWarning = true;
}

function toast(message) {
  $('#toast').textContent = message;
  $('#toast').hidden = false;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => { $('#toast').hidden = true; }, 3500);
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, draft, sales }));
    $('.demo-indicator').innerHTML = '<span></span>Local demo';
    $('.demo-indicator').classList.remove('storage-warning');
    return true;
  } catch {
    $('.demo-indicator').textContent = 'Session only · not saved';
    $('.demo-indicator').classList.add('storage-warning');
    toast('Storage is unavailable or full. Changes will last only for this session.');
    return false;
  }
}

function nextNumber() {
  return Math.max(1000, ...sales.map(sale => sale.number)) + 1;
}

const categories = [
  ['All items', 'grid'], ['Starters', 'leaf'], ['Mains', 'dining'], ['Desserts', 'cake'], ['Drinks', 'coffee'],
];

function renderMenu() {
  $('#categories').innerHTML = categories.map(([name, glyph]) =>
    `<button class="category ${category === name ? 'active' : ''}" data-category="${name}" aria-pressed="${category === name}">${icon(glyph)}${name}<span class="category-count">${name === 'All items' ? MENU.length : MENU.filter(item => item.category === name).length}</span></button>`
  ).join('');
  const query = $('#menu-search').value.trim().toLowerCase();
  const items = MENU.filter(item => (category === 'All items' || item.category === category) && `${item.name} ${item.description} ${item.category}`.toLowerCase().includes(query));
  $('#category-heading').firstChild.textContent = `${category} `;
  $('#item-count').textContent = `(${items.length})`;
  $('#menu-grid').innerHTML = items.map(item => {
    const quantity = draft.items.find(line => line.id === item.id)?.quantity;
    return `<button class="menu-card" data-add="${item.id}" aria-label="Add ${item.name}, ${money(item.price)}">
      <div class="food-image"><img src="${image(item)}" alt="" loading="lazy">
        ${item.badge ? `<span class="food-badge ${item.badge === 'House favourite' ? 'popular' : ''}">${item.badge === 'House favourite' ? '✦' : icon('leaf')} ${item.badge}</span>` : ''}
        ${quantity ? `<span class="item-in-cart">${quantity}</span>` : ''}
      </div><div class="food-info"><div class="food-category">${item.category}</div><h3>${item.name}</h3><p class="food-description">${item.description}</p><div class="food-bottom"><span class="food-price">${money(item.price)}</span><span class="add-item">${icon('plus')}</span></div></div></button>`;
  }).join('') || '<div class="no-results">Nothing on the menu matches that search.<br>Try a different dish or category.</div>';
}

function renderCart() {
  const amounts = totals(draft);
  const count = draft.items.reduce((sum, line) => sum + line.quantity, 0);
  $('#order-count').textContent = count;
  $('#mobile-order-shortcut').hidden = !count || activeView !== 'till';
  $('#mobile-order-label').textContent = `View order (${count}) · ${money(amounts.total)}`;
  $('#order-number').innerHTML = `Order #${nextNumber()} <span>•</span> New order`;
  $('#table-select').value = draft.table;
  $('#guests-select').value = draft.guests;
  $('#table-details').hidden = draft.mode !== 'dine-in';
  $('#takeaway-details').hidden = draft.mode !== 'takeaway';
  document.querySelectorAll('[data-mode]').forEach(button => {
    button.classList.toggle('active', button.dataset.mode === draft.mode);
    button.setAttribute('aria-pressed', button.dataset.mode === draft.mode);
  });
  $('#cart-items').innerHTML = draft.items.length ? draft.items.map(line => {
    const item = MENU.find(item => item.id === line.id);
    return `<div class="cart-item"><img class="cart-thumbnail" src="${image(item)}" alt=""><div class="cart-info"><h3>${item.name}</h3><div class="unit-price">${money(item.price)} each</div>${line.note ? `<span class="cart-note">${escape(line.note)}</span>` : ''}<div class="cart-controls"><div class="quantity-control"><button data-quantity="${line.id}" data-change="-1" aria-label="Remove one ${item.name}">${icon('minus')}</button><span aria-label="Quantity">${line.quantity}</span><button data-quantity="${line.id}" data-change="1" aria-label="Add one ${item.name}">${icon('plus')}</button></div><button class="item-note-button" data-note="${line.id}" aria-label="Edit note for ${item.name}">${icon('note')}Note</button></div></div><strong class="line-total">${money(item.price * line.quantity)}</strong></div>`;
  }).join('') : `<div class="empty-cart"><div class="empty-icon">${icon('bag')}</div><h3>A fresh start, a new order.</h3><p>Tap something delicious from the menu to get things going.</p></div>`;
  $('#subtotal').textContent = money(amounts.subtotal);
  $('#service-toggle').checked = draft.service;
  $('#service-toggle').disabled = draft.mode === 'takeaway';
  $('#service-total').textContent = money(amounts.service);
  $('#discount-row').hidden = !draft.discount;
  $('#edit-discount').textContent = `Discount (${draft.discount}%)`;
  $('#discount-total').textContent = `−${money(amounts.discount)}`;
  $('#grand-total').textContent = money(amounts.total);
  $('#pay-total').textContent = money(amounts.total);
  $('#pay-button').disabled = !count;
  $('#clear-order').disabled = !count && !draft.note && !draft.discount;
  $('#discount-button').innerHTML = `${icon('tag')}${draft.discount ? 'Edit discount' : 'Add discount'}`;
  $('#order-note-label').textContent = draft.note || 'Add an order note';
}

function update() {
  const isSaved = persist();
  renderMenu();
  renderCart();
  return isSaved;
}

function addItem(id) {
  const line = draft.items.find(line => line.id === id);
  if (line?.quantity === 99) return toast('A maximum of 99 of each item can be added.');
  if (line) line.quantity += 1;
  else draft.items.push({ id, quantity: 1, note: '' });
  update();
}

function openModal(title, content) {
  $('#modal-title').textContent = title;
  $('#modal-content').innerHTML = content;
  if (!$('#modal').open) $('#modal').showModal();
}

function closeModal() { $('#modal').close(); }
$('#close-modal').addEventListener('click', closeModal);
$('#modal').addEventListener('click', event => { if (event.target === $('#modal') && (event.offsetX < 0 || event.offsetY < 0 || event.offsetX > $('#modal').clientWidth || event.offsetY > $('#modal').clientHeight)) closeModal(); });

$('#categories').addEventListener('click', event => {
  const button = event.target.closest('[data-category]');
  if (button) { category = button.dataset.category; renderMenu(); }
});
$('#menu-search').addEventListener('input', renderMenu);
$('#menu-grid').addEventListener('click', event => {
  const button = event.target.closest('[data-add]');
  if (button) addItem(button.dataset.add);
});
$('#cart-items').addEventListener('click', event => {
  const quantityButton = event.target.closest('[data-quantity]');
  if (quantityButton) {
    const line = draft.items.find(line => line.id === quantityButton.dataset.quantity);
    const next = line.quantity + Number(quantityButton.dataset.change);
    if (next > 99) return toast('A maximum of 99 of each item can be added.');
    line.quantity = next;
    draft.items = draft.items.filter(line => line.quantity > 0);
    update();
    return;
  }
  const noteButton = event.target.closest('[data-note]');
  if (noteButton) editNote(noteButton.dataset.note);
});
document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => { draft.mode = button.dataset.mode; update(); }));
$('#table-select').addEventListener('change', event => { draft.table = event.target.value; persist(); });
$('#guests-select').addEventListener('change', event => { draft.guests = event.target.value; persist(); });
$('#service-toggle').addEventListener('change', event => { draft.service = event.target.checked; update(); });
$('#clear-order').addEventListener('click', () => {
  openModal('Clear this order?', '<p class="modal-copy">All items, notes and discounts will be removed. This cannot be undone.</p><div class="modal-actions"><button class="secondary-button" id="cancel-clear">Keep order</button><button class="primary-button" id="confirm-clear">Clear order</button></div>');
  $('#cancel-clear').onclick = closeModal;
  $('#confirm-clear').onclick = () => { draft = newDraft(); update(); closeModal(); toast('Order cleared. Ready for a fresh start.'); };
});

function editNote(id) {
  const line = id ? draft.items.find(line => line.id === id) : draft;
  openModal(id ? 'Kitchen note' : 'Order note', `<p class="modal-copy">Add preparation requests or a note for the team. Always confirm allergies with the kitchen.</p><form id="note-form"><label class="form-label" for="note-text">Your note</label><textarea class="form-input" id="note-text" maxlength="300" placeholder="e.g. Dressing on the side">${escape(line.note)}</textarea><div class="modal-actions"><button type="submit" class="primary-button">Save note ${icon('check')}</button></div></form>`);
  $('#note-form').onsubmit = event => {
    event.preventDefault();
    line.note = $('#note-text').value.trim();
    update();
    closeModal();
  };
}
$('#order-note-button').addEventListener('click', () => editNote());

function editDiscount() {
  openModal('A little something off', `<p class="modal-copy">Apply a percentage discount to the whole order. Service charge is calculated after the discount.</p><form id="discount-form"><label class="form-label" for="discount-input">Discount (%)</label><input class="form-input" id="discount-input" type="number" min="0" max="100" step="0.5" value="${draft.discount}" required><div class="modal-actions"><button type="button" class="secondary-button" id="remove-discount">Remove discount</button><button class="primary-button" type="submit">Apply discount</button></div></form>`);
  $('#discount-form').onsubmit = event => {
    event.preventDefault();
    const value = Number($('#discount-input').value);
    if (!Number.isFinite(value) || value < 0 || value > 100) return;
    draft.discount = value;
    update();
    closeModal();
  };
  $('#remove-discount').onclick = () => { draft.discount = 0; update(); closeModal(); };
}
$('#discount-button').addEventListener('click', editDiscount);
$('#edit-discount').addEventListener('click', editDiscount);

function checkout() {
  if (!draft.items.length) return;
  if (draft.mode === 'dine-in' && !draft.table) {
    toast('Choose a table before checking out.');
    $('#table-select').focus();
    return;
  }
  const amounts = totals(draft);
  let method = 'card';
  openModal('Let’s settle up', `<p class="payment-label">Order #${nextNumber()} · ${draft.mode === 'dine-in' ? escape(draft.table) : 'Takeaway'}</p><div class="payment-total">${money(amounts.total)}</div><p class="payment-label">${draft.items.reduce((sum, line) => sum + line.quantity, 0)} items · VAT included</p><div class="payment-methods"><button class="payment-method active" data-payment="card" aria-pressed="true">${icon('card')}Card</button><button class="payment-method" data-payment="cash" aria-pressed="false">£ &nbsp; Cash</button></div><form id="checkout-form"><div id="cash-fields" hidden><label class="form-label" for="cash-received">Cash received (£)</label><input id="cash-received" class="form-input" type="number" min="${(amounts.total / 100).toFixed(2)}" step="0.01" value="${(amounts.total / 100).toFixed(2)}"><div class="change-due"><span>Change due</span><strong id="change-due">£0.00</strong></div></div><div class="payment-warning">Demo mode — no payment is processed and no card details are collected. Completing this sale creates a local record only.</div><p class="form-error" id="payment-error" hidden></p><button class="primary-button full-width checkout-complete" type="submit" id="complete-sale">Complete demo sale ${icon('arrow')}</button></form>`);
  document.querySelectorAll('[data-payment]').forEach(button => button.onclick = () => {
    method = button.dataset.payment;
    document.querySelectorAll('[data-payment]').forEach(button => {
      button.classList.toggle('active', button.dataset.payment === method);
      button.setAttribute('aria-pressed', button.dataset.payment === method);
    });
    $('#cash-fields').hidden = method !== 'cash';
    $('#cash-received').required = method === 'cash';
    $('#cash-received').disabled = method !== 'cash';
    $('#payment-error').hidden = true;
  });
  $('#cash-received').disabled = true;
  $('#cash-received').oninput = () => {
    const received = Math.round(Number($('#cash-received').value) * 100);
    $('#change-due').textContent = received >= amounts.total ? money(received - amounts.total) : 'Insufficient cash';
  };
  $('#checkout-form').onsubmit = event => {
    event.preventDefault();
    const received = method === 'cash' ? Math.round(Number($('#cash-received').value) * 100) : amounts.total;
    if (!Number.isSafeInteger(received) || received < amounts.total) {
      $('#payment-error').textContent = 'Cash received must cover the total.';
      $('#payment-error').hidden = false;
      return;
    }
    const sale = { number: nextNumber(), date: new Date().toISOString(), draft: structuredClone(draft), amounts, payment: method, received };
    sales.push(sale);
    sales = sales.slice(-500);
    draft = newDraft();
    const isSaved = update();
    showReceipt(sale, true, isSaved);
    toast(isSaved ? `Order #${sale.number} completed.` : 'Sale recorded for this session only. It could not be saved.');
  };
}
$('#pay-button').addEventListener('click', checkout);

function showReceipt(sale, justCompleted = false, isSaved = true) {
  const date = new Date(sale.date).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
  openModal(justCompleted ? 'Another happy guest.' : `Receipt #${sale.number}`, `<div class="receipt-heading">${justCompleted ? `<div class="success-mark">${icon('check')}</div>` : ''}<h3>${justCompleted ? 'All settled. Thank you!' : 'Juniper Bistro & Bar'}</h3><p>Order #${sale.number} · ${sale.draft.mode === 'dine-in' ? escape(sale.draft.table) : 'Takeaway'}<br>${date}</p></div><div class="receipt-lines">${sale.draft.items.map(line => {
    const item = MENU.find(item => item.id === line.id);
    return `<div class="receipt-line"><span>${line.quantity} × ${item.name}${line.note ? `<br><small>${escape(line.note)}</small>` : ''}</span><span>${money(item.price * line.quantity)}</span></div>`;
  }).join('')}${sale.draft.note ? `<p class="receipt-note">${escape(sale.draft.note)}</p>` : ''}</div><div class="receipt-line"><span>Subtotal</span><span>${money(sale.amounts.subtotal)}</span></div>${sale.amounts.discount ? `<div class="receipt-line"><span>Discount (${sale.draft.discount}%)</span><span>−${money(sale.amounts.discount)}</span></div>` : ''}<div class="receipt-line"><span>Service charge</span><span>${money(sale.amounts.service)}</span></div><div class="receipt-line receipt-total"><span>Total</span><span>${money(sale.amounts.total)}</span></div>${sale.payment === 'cash' ? `<div class="receipt-line"><span>Cash received</span><span>${money(sale.received)}</span></div><div class="receipt-line"><span>Change</span><span>${money(sale.received - sale.amounts.total)}</span></div>` : ''}<p class="receipt-meta">Demo ${escape(sale.payment)} sale · VAT included<br>This is a demo receipt, not proof of payment.</p>${!isSaved ? '<div class="payment-warning" role="alert">This sale could not be saved. It is available for this session only and will be lost on reload.</div>' : ''}<div class="modal-actions"><button class="primary-button full-width" id="receipt-done">${justCompleted ? 'Start a new order' : 'Done'} ${icon('arrow')}</button></div>`);
  $('#receipt-done').onclick = closeModal;
}

function todaySales() {
  const today = new Date().toDateString();
  return sales.filter(sale => new Date(sale.date).toDateString() === today);
}

function renderHistory() {
  const total = sales.reduce((sum, sale) => sum + sale.amounts.total, 0);
  $('#history-summary').textContent = `${sales.length} completed ${sales.length === 1 ? 'order' : 'orders'} · ${money(total)} in recorded sales · Most recent 500 orders retained`;
  $('#order-history').innerHTML = sales.length ? `<table class="history-table"><thead><tr><th>ORDER</th><th>DATE & TIME</th><th>TABLE / TYPE</th><th>PAYMENT</th><th>TOTAL</th><th>RECEIPT</th></tr></thead><tbody>${[...sales].reverse().map(sale => `<tr><td>#${sale.number}</td><td>${new Date(sale.date).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td><td>${sale.draft.mode === 'takeaway' ? 'Takeaway' : escape(sale.draft.table)}</td><td><span class="status-paid">Demo ${escape(sale.payment)}</span></td><td><strong>${money(sale.amounts.total)}</strong></td><td><button class="receipt-button" data-receipt="${sale.number}">View receipt</button></td></tr>`).join('')}</tbody></table>` : `<div class="empty-cart"><div class="empty-icon">${icon('orders')}</div><h3>Your first sale is just around the corner.</h3><p>Complete an order at the till and it will appear here.</p></div>`;
}
$('#order-history').addEventListener('click', event => {
  const button = event.target.closest('[data-receipt]');
  if (button) showReceipt(sales.find(sale => sale.number === Number(button.dataset.receipt)));
});

function renderOverview() {
  const today = todaySales();
  const revenue = today.reduce((sum, sale) => sum + sale.amounts.total, 0);
  $('#overview-stats').innerHTML = [
    ['Today’s sales', money(revenue), 'Local demo sales, including service', 'chart'],
    ['Completed orders', today.length, 'A little hospitality in every order', 'orders'],
    ['Average order', money(today.length ? Math.round(revenue / today.length) : 0), 'Based on today’s completed orders', 'dining'],
  ].map(([label, value, caption, glyph]) => `<div class="stat-card"><div>${label}${icon(glyph)}</div><strong>${value}</strong><p>${caption}</p></div>`).join('');
  const quantities = {};
  today.forEach(sale => sale.draft.items.forEach(line => { quantities[line.id] = (quantities[line.id] || 0) + line.quantity; }));
  $('#popular-items').innerHTML = Object.entries(quantities).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, quantity]) => {
    const item = MENU.find(item => item.id === id);
    return `<div class="popular-row"><img src="${image(item)}" alt=""><div><h3>${item.name}</h3><p>${item.category}</p></div><strong>${quantity} sold</strong></div>`;
  }).join('') || '<div class="no-results">The favourites will find their way here.<br>Complete a sale to get started.</div>';
}

function changeView(view) {
  activeView = view;
  $('#mobile-order-shortcut').hidden = !draft.items.length || view !== 'till';
  document.querySelectorAll('.view').forEach(element => { element.hidden = element.id !== `${view}-view`; });
  document.querySelectorAll('[data-view]').forEach(button => {
    button.classList.toggle('active', button.dataset.view === view);
    if (button.dataset.view === view) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  if (view === 'orders') renderHistory();
  if (view === 'overview') renderOverview();
}
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => changeView(button.dataset.view)));
document.querySelectorAll('.return-to-till').forEach(button => button.addEventListener('click', () => changeView('till')));
$('#mobile-order-shortcut').addEventListener('click', () => {
  $('.order-panel').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
});
new IntersectionObserver(([entry]) => {
  $('#mobile-order-shortcut').classList.toggle('at-order', entry.isIntersecting);
}).observe($('.order-panel'));

function settings() {
  openModal('Made for the front of house', '<p class="modal-copy">Juniper is a self-contained EPOS demonstration. Menu prices are in GBP, with VAT included. The optional 10% service charge applies to dine-in orders after discounts.</p><div class="settings-info"><strong>Your data stays here.</strong><br>Orders are stored in this browser on this device. The most recent 500 sales are kept. There is no account, cloud sync, payment terminal or kitchen printer connected. Do not rely on this demo for live trading.</div><div class="modal-actions"><button class="primary-button" id="settings-done">Got it</button></div>');
  $('#settings-done').onclick = closeModal;
}
$('#settings-button').addEventListener('click', settings);
$('#help-button').addEventListener('click', () => {
  openModal('A quick helping hand', `<p class="modal-copy"><strong>1. Build the order.</strong> Choose dine in or takeaway, then tap menu items to add them. Use + and − to adjust quantities.<br><br><strong>2. Make it personal.</strong> Select a table for dine-in orders, add kitchen notes, or apply a discount. Confirm any allergies with the kitchen.<br><br><strong>3. Settle up.</strong> Tap Charge, choose demo card or cash, and complete the sale. Find receipts under Orders.<br><br><strong>Shortcut:</strong> Press / to search the menu.</p><div class="payment-warning">This is a local demo. Payments are simulated, and orders are not sent to a kitchen.</div>`);
});
document.addEventListener('keydown', event => {
  if (event.key === '/' && activeView === 'till' && !$('#modal').open && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
    event.preventDefault();
    $('#menu-search').focus();
  }
});
$('#current-date').textContent = new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
renderMenu();
renderCart();
if (storageWarning) toast('Saved data could not be loaded. Starting a new session.');
