export const MENU = [
  { id: 'burrata', name: 'Burrata & heirloom tomatoes', description: 'Creamy burrata, basil oil, toasted sourdough', category: 'Starters', price: 850, image: 'salad', badge: 'Vegetarian' },
  { id: 'burger', name: 'The Juniper burger', description: 'British beef, aged cheddar, house relish & fries', category: 'Mains', price: 1550, image: 'burger', badge: 'House favourite' },
  { id: 'bowl', name: 'Garden harvest bowl', description: 'Roasted seasonal veg, grains & tahini dressing', category: 'Mains', price: 1300, image: 'bowl', badge: 'Plant based' },
  { id: 'soup', name: 'Roasted tomato soup', description: 'Slow-roasted tomatoes, fresh basil & warm bread', category: 'Starters', price: 700, image: 'soup', badge: 'Vegetarian' },
  { id: 'chicken', name: 'Lemon & herb chicken', description: 'Grilled chicken, rosemary potatoes & greens', category: 'Mains', price: 1650, image: 'chicken' },
  { id: 'salmon', name: 'Pan-seared salmon', description: 'Crisp-skinned salmon, tenderstem & lemon butter', category: 'Mains', price: 1850, image: 'salmon', badge: 'House favourite' },
  { id: 'cake', name: 'Lemon & blueberry cake', description: 'A slice of sunshine, with crème fraîche', category: 'Desserts', price: 650, image: 'cake', badge: 'Vegetarian' },
  { id: 'brownie', name: 'Warm chocolate brownie', description: 'Dark chocolate, vanilla ice cream & cocoa', category: 'Desserts', price: 600, image: 'brownie', badge: 'Vegetarian' },
  { id: 'coffee', name: 'Flat white', description: 'Double-origin espresso, silky steamed milk', category: 'Drinks', price: 340, image: 'coffee' },
  { id: 'matcha', name: 'Iced matcha latte', description: 'Ceremonial matcha, oat milk & plenty of ice', category: 'Drinks', price: 450, image: 'matcha', badge: 'Plant based' },
  { id: 'lemonade', name: 'House lemonade', description: 'Freshly squeezed lemon, mint & a little sparkle', category: 'Drinks', price: 400, image: 'lemonade' },
  { id: 'fries', name: 'Truffle parmesan fries', description: 'Golden skin-on fries, truffle oil & parmesan', category: 'Starters', price: 550, image: 'fries', badge: 'Vegetarian' },
];

export function newDraft() {
  return { items: [], mode: 'dine-in', table: '', guests: '1', note: '', discount: 0, service: false };
}

export function totals(draft) {
  const subtotal = draft.items.reduce((sum, line) => {
    const item = MENU.find(item => item.id === line.id);
    return sum + (item ? item.price * line.quantity : 0);
  }, 0);
  const discount = Math.round(subtotal * draft.discount / 100);
  const service = draft.service && draft.mode === 'dine-in' ? Math.round((subtotal - discount) / 10) : 0;
  return { subtotal, discount, service, total: subtotal - discount + service };
}

export function restoreDraft(value) {
  const draft = newDraft();
  if (!value || typeof value !== 'object') return draft;
  draft.mode = value.mode === 'takeaway' ? 'takeaway' : 'dine-in';
  draft.table = typeof value.table === 'string' && /^(Table 0[1-9]|Table 10|Bar)$/.test(value.table) ? value.table : '';
  draft.guests = typeof value.guests === 'string' && /^[1-8]$/.test(value.guests) ? value.guests : '1';
  draft.note = typeof value.note === 'string' ? value.note.slice(0, 300) : '';
  draft.discount = Number.isFinite(value.discount) && value.discount >= 0 && value.discount <= 100 ? Number(value.discount) : 0;
  draft.service = value.service === true;
  if (Array.isArray(value.items)) {
    for (const line of value.items) {
      if (!line || !MENU.some(item => item.id === line.id) || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 99 || draft.items.some(item => item.id === line.id)) continue;
      draft.items.push({ id: line.id, quantity: line.quantity, note: typeof line.note === 'string' ? line.note.slice(0, 300) : '' });
    }
  }
  return draft;
}

export function validateSale(sale) {
  if (!sale || !Number.isSafeInteger(sale.number) || sale.number < 1001 ||
    typeof sale.date !== 'string' || !Number.isFinite(Date.parse(sale.date)) ||
    !['cash', 'card'].includes(sale.payment) || !sale.draft || !sale.amounts) return false;
  const draft = restoreDraft(sale.draft);
  if (!draft.items.length) return false;
  const amounts = totals(draft);
  return ['subtotal', 'discount', 'service', 'total'].every(key => amounts[key] === sale.amounts[key]) &&
    (sale.payment !== 'cash' || (Number.isSafeInteger(sale.received) && sale.received >= amounts.total));
}
