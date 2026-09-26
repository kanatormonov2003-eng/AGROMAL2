# Google Apps Script booking integration

## Sheet structure

The Apps Script creates or uses the sheet named `Booking Requests` with columns:

1. `Дата`
2. `Номер заявки`
3. `Номер лота`
4. `Название лота`
5. `Цена`
6. `Единица цены`
7. `Количество`
8. `Имя закупщика`
9. `Телефон`
10. `Организация`
11. `Login / Email`
12. `Комментарий`
13. `Статус`

## Deployment

1. Open Google Sheets.
2. Extensions → Apps Script.
3. Replace the default script with `Code.gs` from this folder.
4. Save the project.
5. Deploy → New deployment → Web app.
6. Execute as: `Me`.
7. Who has access: `Anyone`.
8. Copy the deployed `/exec` URL.
9. Paste it into `assets/js/config.js` as `bookingAppsScriptUrl`.

## Expected frontend request

Method: `POST`

Content-Type: `text/plain;charset=utf-8`

Body:

```json
{
  "lotNumber": "001",
  "lotTitle": "КРС • Швицкая порода (Бычки)",
  "price": 630,
  "priceUnit": "сом / кг",
  "quantity": 24,
  "customerName": "Иван Иванов",
  "customerPhone": "+996500000000",
  "organization": "TEST BUYER",
  "login": "inn.87654322@login.agromal.kg",
  "comment": "..."
}
```

## Success response

```json
{
  "ok": true,
  "bookingNumber": "AG-1048"
}
```

## Error response

```json
{
  "ok": false,
  "error": "описание ошибки"
}
```
