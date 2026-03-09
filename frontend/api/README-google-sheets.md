# Sending booking data to Google Sheets

To save "Book Your Call" submissions to a Google Sheet:

## Option 1: Google Apps Script (no backend server)

1. Create a new Google Sheet and note its URL.
2. In the sheet: **Extensions → Apps Script**. Delete any sample code.
3. Paste this script (replace `SHEET_NAME` with your sheet’s name if different):

```javascript
function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sheet1');
    if (!sheet) return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'Sheet not found' })).setMimeType(ContentService.MimeType.JSON);

    const data = JSON.parse(e.postData.contents);
    const row = [
      new Date(),
      data.name || '',
      data.mobile || '',
      data.purpose || '',
      data.details || ''
    ];
    sheet.appendRow(row);

    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.message })).setMimeType(ContentService.MimeType.JSON);
  }
}
```

4. Add a header row in the sheet (Row 1): e.g. `Date`, `Name`, `Mobile`, `Purpose`, `Details`.
5. **Deploy**: Deploy → New deployment → Type: Web app → Execute as: Me, Who has access: Anyone → Deploy. Copy the **Web app URL**.
6. In your app: set `EXPO_PUBLIC_BOOKING_API_URL` to that URL (e.g. in `.env` or `app.config.js`).

## Sending SMS to the user's mobile

When a call is booked, the app shows a **local notification** in the device notification bar. To also **send an SMS** to the user's mobile number:

- **Backend responsibility:** When your backend (Apps Script or API) receives the booking, it should send an SMS to `data.mobile` with a confirmation message (e.g. "Your call with [Company] has been booked. We'll contact you shortly.").
- **Options:** Use any SMS provider (e.g. MSG91, or your own Node/Express API that calls an SMS gateway). From Google Apps Script, use `UrlFetchApp.fetch()` to call the provider’s HTTP API; store credentials in Script Properties. From your own backend, use the provider’s SDK or REST API.

## Option 2: Your own API

Implement a POST endpoint that accepts JSON `{ name, mobile, purpose, details }`, appends a row to Google Sheets, and (optionally) sends an SMS to the provided mobile number. Point `EXPO_PUBLIC_BOOKING_API_URL` to that endpoint.

## Company Registration form (Page 2)

For Company Registration submissions, the app posts to:

- `EXPO_PUBLIC_COMPANY_REGISTRATION_API_URL`
- Current Web App URL:
  `https://script.google.com/macros/s/AKfycbwzOESr3otuEtWtJ8GFS9BYQnGktXUnC7c9q2gfg7v9QwslWinVj9YRWfXGrc7dU0jP/exec`

Payload includes:

- `businessType`
- `proposedName1`, `proposedName2`, `proposedName3`
- `businessActivity`, `registeredAddress`, `capitalStructure`
- `companyMobile`, `companyEmail`
- `directors[]` with `{ name, pan, aadhaar, shareholding, panFileUri, aadhaarFileUri }`

Note: The Google Sheet URL itself is not a POST endpoint. Use a Google Apps Script Web App URL (or your backend API URL) that writes into your target sheet.
