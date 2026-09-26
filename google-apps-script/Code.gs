const SHEET_NAME = 'Booking Requests';
const STATUS_NEW = 'Новая';
const BOOKING_PREFIX = 'AG-';
const BOOKING_START = 1001;
const DUPLICATE_WINDOW_MINUTES = 30;
const HEADERS = [
  'Дата',
  'Номер заявки',
  'Номер лота',
  'Название лота',
  'Цена',
  'Единица цены',
  'Количество',
  'Имя закупщика',
  'Телефон',
  'Организация',
  'Login / Email',
  'Комментарий',
  'Статус'
];

function doPost(e) {
  return handleRequest_(e);
}

function doGet() {
  return jsonResponse_({
    ok: false,
    error: 'Use POST with JSON body.'
  });
}

function handleRequest_(e) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    const payload = parsePayload_(e);
    const booking = validatePayload_(payload);
    const sheet = getBookingSheet_();
    ensureHeaders_(sheet);

    const duplicateBookingNumber = findDuplicateBookingNumber_(sheet, booking);
    if (duplicateBookingNumber) {
      return jsonResponse_({
        ok: true,
        bookingNumber: duplicateBookingNumber
      });
    }

    const bookingNumber = nextBookingNumber_(sheet);
    const now = new Date();

    sheet.appendRow([
      now,
      bookingNumber,
      booking.lotNumber,
      booking.lotTitle,
      booking.price,
      booking.priceUnit,
      booking.quantity,
      booking.customerName,
      booking.customerPhone,
      booking.organization,
      booking.login,
      booking.comment,
      STATUS_NEW
    ]);

    return jsonResponse_({
      ok: true,
      bookingNumber: bookingNumber
    });
  } catch (error) {
    return jsonResponse_({
      ok: false,
      error: userSafeMessage_(error)
    });
  } finally {
    try {
      lock.releaseLock();
    } catch (_) {
      // ignore
    }
  }
}

function parsePayload_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error('Пустой запрос. Не получено тело JSON.');
  }

  try {
    const parsed = JSON.parse(e.postData.contents);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('INVALID_JSON_OBJECT');
    }
    return parsed;
  } catch (error) {
    throw new Error('Некорректный JSON в теле запроса.');
  }
}

function validatePayload_(payload) {
  const booking = {
    lotNumber: cleanString_(payload.lotNumber, 30),
    lotTitle: cleanString_(payload.lotTitle, 220),
    price: normalizeNumber_(payload.price),
    priceUnit: cleanString_(payload.priceUnit, 40),
    quantity: normalizeInteger_(payload.quantity),
    customerName: cleanString_(payload.customerName, 160),
    customerPhone: cleanString_(payload.customerPhone, 32),
    organization: cleanString_(payload.organization, 160, true),
    login: cleanString_(payload.login, 160, true),
    comment: cleanString_(payload.comment, 1000, true)
  };

  if (!booking.lotNumber) throw new Error('Не указан номер лота.');
  if (!booking.lotTitle) throw new Error('Не указано название лота.');
  if (!isFinite(booking.price) || booking.price <= 0) throw new Error('Некорректная цена лота.');
  if (!booking.priceUnit) throw new Error('Не указана единица цены.');
  if (!Number.isInteger(booking.quantity) || booking.quantity <= 0) throw new Error('Некорректное количество.');
  if (booking.customerName.length < 2) throw new Error('Укажите имя закупщика.');
  if (booking.customerPhone.length < 6) throw new Error('Укажите корректный номер телефона.');

  return booking;
}

function cleanString_(value, maxLength, optional) {
  const normalized = String(value == null ? '' : value).trim().replace(/\s+/g, ' ');
  if (!normalized) return optional ? '' : '';
  return normalized.slice(0, maxLength);
}

function normalizeNumber_(value) {
  if (typeof value === 'number') return value;
  const normalized = Number(String(value == null ? '' : value).replace(/\s+/g, '').replace(',', '.'));
  return normalized;
}

function normalizeInteger_(value) {
  if (typeof value === 'number') return Math.trunc(value);
  const normalized = Number(String(value == null ? '' : value).replace(/\s+/g, '').replace(',', '.'));
  return Math.trunc(normalized);
}

function getBookingSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error('Google Sheets не привязана к Apps Script проекту.');
  }

  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }
  return sheet;
}

function ensureHeaders_(sheet) {
  const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
  const currentHeaders = headerRange.getValues()[0];
  const hasHeaders = HEADERS.every(function (header, index) {
    return currentHeaders[index] === header;
  });

  if (!hasHeaders) {
    headerRange.setValues([HEADERS]);
    sheet.setFrozenRows(1);
  }
}

function findDuplicateBookingNumber_(sheet, booking) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return '';

  const values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  const now = Date.now();

  for (let index = values.length - 1; index >= 0; index -= 1) {
    const row = values[index];
    const rowDate = row[0] instanceof Date ? row[0].getTime() : new Date(row[0]).getTime();
    if (!rowDate || now - rowDate > DUPLICATE_WINDOW_MINUTES * 60 * 1000) {
      continue;
    }

    const isSame = String(row[2]).trim() === booking.lotNumber
      && String(row[3]).trim() === booking.lotTitle
      && Number(row[4]) === booking.price
      && String(row[5]).trim() === booking.priceUnit
      && Number(row[6]) === booking.quantity
      && String(row[7]).trim() === booking.customerName
      && String(row[8]).trim() === booking.customerPhone
      && String(row[9]).trim() === booking.organization
      && String(row[10]).trim() === booking.login
      && String(row[11]).trim() === booking.comment;

    if (isSame) {
      return String(row[1]).trim();
    }
  }

  return '';
}

function nextBookingNumber_(sheet) {
  const props = PropertiesService.getScriptProperties();
  const stored = Number(props.getProperty('LAST_BOOKING_NUMBER') || '0');
  let next = stored;

  if (!Number.isInteger(next) || next < BOOKING_START) {
    next = findMaxBookingNumber_(sheet);
  }

  next = Math.max(next, BOOKING_START - 1) + 1;
  props.setProperty('LAST_BOOKING_NUMBER', String(next));
  return BOOKING_PREFIX + next;
}

function findMaxBookingNumber_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return BOOKING_START - 1;

  const values = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
  let maxNumber = BOOKING_START - 1;

  values.forEach(function (row) {
    const match = String(row[0] || '').match(/^AG-(\d+)$/i);
    if (!match) return;
    const numericPart = Number(match[1]);
    if (numericPart > maxNumber) maxNumber = numericPart;
  });

  return maxNumber;
}

function userSafeMessage_(error) {
  const message = error && error.message ? String(error.message).trim() : '';
  return message || 'Не удалось обработать заявку.';
}

function jsonResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
