# GS1 QR Code Scanner - Frontend

A standalone frontend application for scanning and parsing GS1 Digital Link QR codes.

## 🎯 Features

- **📷 Camera Scanner**: Scan QR codes directly using your device camera
- **📁 Image Upload**: Upload QR code images from your device
- **⌨️ Manual Entry**: Paste GS1 Digital Link URLs manually
- **✅ Real-time Parsing**: Instant product information display
- **📊 Expiry Tracking**: Color-coded expiry status with days remaining

## 🚀 Quick Start

### 1. Make sure the backend is running

The backend must be running on `http://localhost:8000`:

```bash
cd ../backend
python main.py
```

### 2. Open the frontend

Simply open `index.html` in your browser, or use a local server:

```bash
# Using Python
python -m http.server 3000

# Using Node.js (if you have http-server installed)
npx http-server -p 3000
```

Then navigate to `http://localhost:3000`

### 3. Start Scanning!

Choose your preferred scanning method:
- **Camera**: Click "Start Camera Scanner" to scan with your webcam/phone camera
- **Upload**: Click to upload a QR code image
- **Manual**: Paste a GS1 Digital Link URL

## 📱 How to Use

### Camera Scanning
1. Click on the "📷 Camera Scan" tab
2. Click "Start Camera Scanner"
3. Allow camera permissions
4. Point your camera at a GS1 QR code
5. The app will automatically detect and parse it

### Upload Image
1. Click on the "📁 Upload Image" tab
2. Click "Click to Upload QR Code Image"
3. Select a QR code image from your device
4. The app will scan and parse it automatically

### Manual Entry
1. Click on the "⌨️ Manual Entry" tab
2. Paste a GS1 Digital Link URL (e.g., `https://id.yourdomain.com/01/09506000134352/10/LOT123456/17/261231`)
3. Click "Parse URL"

## 🔍 Example GS1 Digital Link

```
https://id.yourdomain.com/01/09506000134352/10/LOT123456/17/261231
```

Where:
- `01` = GTIN: 09506000134352
- `10` = Batch: LOT123456
- `17` = Expiry: 261231 (Dec 31, 2026)

## 🎨 Design Features

- Modern gradient UI with purple theme
- Responsive design for mobile and desktop
- Color-coded expiry badges:
  - 🟢 **Green**: More than 30 days remaining
  - 🟡 **Yellow**: 1-30 days remaining
  - 🔴 **Red**: Expired or expires today
- Smooth animations and transitions
- Tab-based interface for different scanning methods

## 🔧 Technologies Used

- **HTML5**: Structure
- **CSS3**: Modern styling with gradients and animations
- **JavaScript**: Frontend logic
- **html5-qrcode**: QR code scanning library
- **Fetch API**: Backend communication

## 📝 Notes

- Camera scanning requires HTTPS in production (works on localhost)
- Make sure CORS is enabled in the backend (already configured)
- The backend API URL is set to `http://localhost:8000` by default
- For production, update the `API_URL` variable in `index.html`

## 🌐 API Endpoint Used

**POST** `/retailer/scan-item`

```json
Request:
{
  "scanned_url": "https://id.yourdomain.com/01/09506000134352/10/LOT123456/17/261231"
}

Response:
{
  "gtin": "09506000134352",
  "batch": "LOT123456",
  "expiry_date": "2026-12-31",
  "days_remaining": 362,
  "parsed_successfully": true
}
```
