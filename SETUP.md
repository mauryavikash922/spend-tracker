# SpendWise — Setup Guide

## Prerequisites

- Node.js 18+
- A Google account
- A Vercel account (free)

---

## 1. Google Cloud Setup

### Create a Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Click **"Select a project"** → **"New Project"**
3. Name it `SpendWise` → **Create**

### Enable APIs

4. Go to **APIs & Services → Library**
5. Search and enable **Google Sheets API**
6. Search and enable **Google Drive API**

### Configure OAuth Consent Screen

7. Go to **APIs & Services → OAuth consent screen**
8. Choose **External** → **Create**
9. Fill in:
   - App name: `SpendWise`
   - User support email: your email
   - Developer contact: your email
10. Click **Save and Continue**
11. On **Scopes** step → **Add or Remove Scopes**:
    - Add `https://www.googleapis.com/auth/spreadsheets`
    - Add `https://www.googleapis.com/auth/drive.file`
12. Click **Save and Continue** through the rest

### Create OAuth Client ID

13. Go to **APIs & Services → Credentials**
14. Click **Create Credentials → OAuth 2.0 Client ID**
15. Application type: **Web application**
16. Name: `SpendWise Web`
17. Add **Authorized JavaScript origins**:
    ```
    http://localhost:5173
    https://your-app.vercel.app
    ```
18. Click **Create**
19. Copy the **Client ID**

---

## 2. Local Development

```bash
# Clone / enter project
cd spend-tracker

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Add your Client ID to .env
echo "VITE_GOOGLE_CLIENT_ID=your_client_id_here" > .env

# Start dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 3. Deploy to Vercel

```bash
# Push to GitHub first
git init && git add . && git commit -m "Initial commit"
gh repo create spend-tracker --public --push
```

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repository
3. Add environment variable:
   - Key: `VITE_GOOGLE_CLIENT_ID`
   - Value: your Google OAuth Client ID
4. Click **Deploy**
5. Copy the Vercel URL (e.g., `https://spend-tracker-xyz.vercel.app`)
6. Go back to Google Cloud → **Credentials** → edit your OAuth Client
7. Add the Vercel URL to **Authorized JavaScript origins**
8. Save

---

## 4. Add to Home Screen (PWA)

**Android (Chrome):**
- Open the app → tap the 3-dot menu → "Add to Home screen"

**iOS (Safari):**
- Open the app → tap Share button → "Add to Home Screen"

---

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth 2.0 Client ID |

---

## How It Works

1. **Login** — Google OAuth grants access to Sheets + Drive
2. **First use** — App auto-creates `"My Spends - 2026"` in your Google Drive
3. **Log expenses** — Data writes directly to your Google Sheet
4. **All data is yours** — You can view/edit the Sheet directly in Google Sheets anytime
