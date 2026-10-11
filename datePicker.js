// datePicker.js

function detectDateFormat(input) {
  const clues = [
    input.placeholder || '',
    input.getAttribute('aria-label') || '',
    input.name || '',
    input.id || '',
    input.className || '',
    (input.closest('label') && input.closest('label').innerText) || '',
    (input.parentElement && input.parentElement.innerText || '').slice(0, 200)
  ].join(' ').toLowerCase();

  if (/dd[\/\-\.\s]?mm[\/\-\.\s]?yyyy/.test(clues)) return 'dd/mm/yyyy';
  if (/mm[\/\-\.\s]?dd[\/\-\.\s]?yyyy/.test(clues)) return 'mm/dd/yyyy';
  if (/yyyy[\/\-\.\s]?mm[\/\-\.\s]?dd/.test(clues)) return 'yyyy-mm-dd';
  if (/dd[\/\-\.\s]?mm[\/\-\.\s]?yy(?!y)/.test(clues)) return 'dd/mm/yy';

  if (input.value) {
    const v = input.value;
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) return 'yyyy-mm-dd';
    if (/^\d{2}\/\d{2}\/\d{4}/.test(v)) return 'dd/mm/yyyy';
    if (/^\d{2}-\d{2}-\d{4}/.test(v)) return 'dd-mm-yyyy';
  }
  return 'dd/mm/yyyy';
}

function formatForPortal(date, fmt) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const yy = String(y).slice(2);
  return fmt
    .replace('yyyy', String(y))
    .replace('yy', yy)
    .replace('mm', m)
    .replace('dd', d);
}

function _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function setDateField(input, targetDate) {
  const fmt = detectDateFormat(input);
  const formatted = formatForPortal(targetDate, fmt);
  const iso = formatForPortal(targetDate, 'yyyy-mm-dd');

  try {
    input.focus();
    input.value = formatted;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    if (input.value === formatted || input.value === iso) {
      return { success: true, method: 'direct', format: fmt };
    }
  } catch (e) { /* ignore */ }

  if (input.type === 'date') {
    try {
      input.value = iso;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return { success: true, method: 'native', format: 'yyyy-mm-dd' };
    } catch (e) { /* ignore */ }
  }

  try {
    input.click();
    await _sleep(300);
    const picker = _findOpenPicker();
    if (!picker) return { success: false, error: 'No picker', format: fmt };

    const header = _readPickerHeader(picker);
    const diff = (targetDate.getFullYear() - header.year) * 12
               + (targetDate.getMonth() - header.month);
    const next = _findNextMonthBtn(picker);
    const prev = _findPrevMonthBtn(picker);

    for (let i = 0; i < Math.abs(diff); i++) {
      if (diff > 0 && next) next.click();
      else if (diff < 0 && prev) prev.click();
      await _sleep(80);
    }

    const cell = _findDayCell(picker, targetDate.getDate());
    if (cell) {
      cell.click();
      return { success: true, method: 'calendar', format: fmt };
    }
    return { success: false, error: 'Day cell missing', format: fmt };
  } catch (e) {
    return { success: false, error: e.message, format: fmt };
  }
}

function _findOpenPicker() {
  const sels = ['.datepicker', '.date-picker', '.calendar', '.ui-datepicker', '[class*="picker"]', '[class*="calendar"]'];
  for (const s of sels) {
    const list = document.querySelectorAll(s);
    for (const el of list) {
      if (el.offsetParent && el.offsetHeight > 0) return el;
    }
  }
  return null;
}

function _readPickerHeader(picker) {
  const el = picker.querySelector('.datepicker-switch, .ui-datepicker-title, [class*="header"]');
  const text = el ? el.innerText : picker.innerText.slice(0, 100);
  const months = ['january','february','march','april','may','june','july','august','september','october','november','december'];
  const lower = text.toLowerCase();
  let month = -1;
  let year = new Date().getFullYear();
  for (let i = 0; i < months.length; i++) {
    if (lower.includes(months[i]) || lower.includes(months[i].slice(0, 3))) {
      month = i;
      break;
    }
  }
  const ym = text.match(/\b(20\d{2})\b/);
  if (ym) year = parseInt(ym[1], 10);
  return { month, year };
}

function _findNextMonthBtn(p) { return p.querySelector('.next, [class*="next"], [aria-label*="next" i]'); }
function _findPrevMonthBtn(p) { return p.querySelector('.prev, [class*="prev"], [aria-label*="prev" i]'); }

function _findDayCell(p, day) {
  const cells = p.querySelectorAll('td, .day, [class*="day"], button');
  for (const c of cells) {
    if ((c.innerText || '').trim() === String(day)) return c;
  }
  return null;
}

window.setDateField = setDateField;
window.detectDateFormat = detectDateFormat;