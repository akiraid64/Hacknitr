# GS1 Digital Link API

A FastAPI-based backend system for generating and parsing GS1 Digital Link QR codes.

## 🎯 Features

### Manufacturer Side (`/manufacturer/generate-qr`)
- Generate valid GS1 Digital Link URLs
- Create QR code images as base64
- Support for GTIN, Batch ID, and Expiry Date

### Retailer Side (`/retailer/scan-item`)
- Parse scanned GS1 Digital Link URLs
- Extract product information (GTIN, Batch, Expiry)
- Calculate days until expiry
- Error handling for invalid formats

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Run the Server

```bash
python main.py
```

Or using uvicorn directly:

```bash
uvicorn main:app --reload
```

### 3. Access Swagger UI

Open your browser and navigate to:
```
http://localhost:8000/docs
```

## 📋 API Endpoints

### Manufacturer: Generate QR Code
**POST** `/manufacturer/generate-qr`

**Request Body:**
```json
{
  "gtin": "09506000134352",
  "batch_id": "LOT123456",
  "expiry_date": "2026-12-31"
}
```

**Response:**
```json
{
  "digital_link_url": "https://id.yourdomain.com/01/09506000134352/10/LOT123456/17/261231",
  "qr_image_base64": "data:image/png;base64,...",
  "gtin": "09506000134352",
  "batch_id": "LOT123456",
  "expiry_date": "2026-12-31",
  "formatted_expiry_gs1": "261231"
}
```

### Retailer: Scan Item
**POST** `/retailer/scan-item`

**Request Body:**
```json
{
  "scanned_url": "https://id.yourdomain.com/01/09506000134352/10/LOT123456/17/261231"
}
```

**Response:**
```json
{
  "product_id": "09506000134352",
  "gtin": "09506000134352",
  "batch": "LOT123456",
  "expiry_date": "2026-12-31",
  "days_remaining": 362,
  "serial_number": null,
  "parsed_successfully": true
}
```

## 🔍 GS1 Application Identifiers (AIs)

| AI | Description | Format |
|----|-------------|--------|
| 01 | GTIN | 13-14 digits |
| 10 | Batch/Lot Number | Alphanumeric |
| 17 | Expiry Date | YYMMDD |
| 21 | Serial Number | Alphanumeric (Optional) |

## 🧪 Testing with Swagger

1. Start the server
2. Open `http://localhost:8000/docs`
3. Try the **Manufacturer** endpoint first to generate a QR code
4. Copy the `digital_link_url` from the response
5. Use that URL in the **Retailer** endpoint to parse it back

## 📁 Project Structure

```
backend/
├── main.py              # FastAPI application
├── requirements.txt     # Python dependencies
└── README.md           # This file
```

## 🛠️ Technology Stack

- **FastAPI**: Modern web framework for building APIs
- **Pydantic**: Data validation using Python type annotations
- **qrcode**: QR code generation library
- **Uvicorn**: ASGI server implementation

## 📝 Notes

- The domain `id.yourdomain.com` is a placeholder. Replace with your actual domain in production.
- Expiry dates use GS1 format (YYMMDD) in the URL
- The system handles century calculation for dates (00-49 = 2000s, 50-99 = 1900s)
- QR codes are returned as base64-encoded PNG images
