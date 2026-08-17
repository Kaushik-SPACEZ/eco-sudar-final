# AI Insights Setup Guide

## 🎯 Overview

This guide explains how to set up and deploy the AI-powered Insights feature using Groq API.

---

## 📋 Prerequisites

1. **Groq API Key** (Free tier available)
2. **Hostinger hosting** with PHP and MySQL
3. **Environment variables** support

---

## 🔑 Step 1: Get Groq API Key

### Sign up for Groq:

1. Go to https://console.groq.com
2. Sign up with your email
3. Verify your email
4. Navigate to API Keys section
5. Click "Create API Key"
6. Copy the key (starts with `gsk_...`)

### Free Tier Limits:
- **30 requests per minute**
- **14,400 tokens per minute**
- **Model:** llama-3.1-70b-versatile
- **Cost:** FREE for typical usage

---

## ⚙️ Step 2: Configure Environment Variables

### On Hostinger:

1. **Login to cPanel**
2. **Go to "Select PHP Version"**
3. **Click "Switch To PHP Options"**
4. **Add environment variable:**
   - Name: `GROQ_API_KEY`
   - Value: `your_groq_api_key_here`

### Alternative (using .htaccess):

Create/edit `api/.htaccess`:

```apache
SetEnv GROQ_API_KEY "your_groq_api_key_here"
```

### Verify Configuration:

Create `api/test-groq.php`:

```php
<?php
echo "GROQ_API_KEY: " . (getenv('GROQ_API_KEY') ? 'SET ✓' : 'NOT SET ✗');
```

Visit: `https://yourdomain.com/api/test-groq.php`

---

## 📁 Step 3: Deploy Backend Files

### Files to Upload:

```
api/
├── helpers/
│   └── GroqAPI.php                    ✓ NEW
├── models/
│   └── Insights.php                   ✓ NEW
├── controllers/admin/
│   └── AdminInsightsController.php    ✓ NEW
└── index.php                          ✓ UPDATED
```

### Upload via FTP/cPanel:

1. Connect to your Hostinger account
2. Navigate to `public_html/api/`
3. Upload the new files
4. Ensure file permissions are 644

---

## 🎨 Step 4: Deploy Frontend

### Build Frontend:

```bash
cd eco-sudar-control
npm run build
```

### Upload to Hostinger:

```
public_html/
├── index.html          # From dist/
├── assets/             # From dist/assets/
│   ├── index-*.js
│   └── index-*.css
└── api/                # Your PHP backend
```

---

## 🧪 Step 5: Test the Integration

### Test Backend API:

```bash
curl -X POST https://yourdomain.com/api/admin/insights/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"category":"sales"}'
```

### Expected Response:

```json
{
  "success": true,
  "data": {
    "recommendations": [...],
    "improvements": [...],
    "criticalIssues": [...],
    "performanceMetrics": [...],
    "generatedAt": "2026-04-25 11:42:00",
    "category": "sales"
  }
}
```

### Test Frontend:

1. Login to your admin panel
2. Navigate to **AI Insights** page
3. Click **Generate Insights** for any category
4. Wait 5-10 seconds for AI processing
5. View the generated insights

---

## 🎯 How It Works

### Data Flow:

```
1. User clicks "Generate Insights"
   ↓
2. Frontend calls: POST /api/admin/insights/generate
   ↓
3. Backend (AdminInsightsController):
   - Fetches data from database (Insights model)
   - Aggregates metrics (sales, expenses, employees, production)
   ↓
4. Sends data to Groq API:
   - Model: llama-3.1-70b-versatile
   - Prompt: Business context + data + JSON schema
   ↓
5. Groq AI analyzes and returns:
   - Recommendations with mitigation steps
   - Critical issues with severity
   - Improvements with performance impact
   - Performance metrics with projections
   ↓
6. Backend returns structured JSON
   ↓
7. Frontend displays in expandable cards
```

---

## 📊 Data Sources

### Sales Insights:
- **Tables:** `orders`, `invoices`, `products`, `customers`
- **Metrics:** Revenue trend, overdue invoices, top products, conversion rate

### Expenses Insights:
- **Tables:** `expenses`
- **Metrics:** Category breakdown, vendor concentration, MoM comparison

### Employees Insights:
- **Tables:** `employees`, `attendance`, `payroll`
- **Metrics:** Attendance rate, overtime hours, department performance

### Production Insights:
- **Tables:** `sops`, `workflows`, `tasks`, `meetings`
- **Metrics:** SOP status, workflow bottlenecks, task completion, meeting frequency

---

## 🐛 Troubleshooting

### Error: "GROQ_API_KEY environment variable not set"

**Solution:**
- Check environment variable is set in cPanel
- Verify .htaccess has SetEnv directive
- Restart PHP-FPM if needed

### Error: "Groq API request failed"

**Solution:**
- Check API key is valid
- Verify you haven't exceeded rate limits (30 req/min)
- Check internet connectivity from server

### Error: "Failed to parse JSON from Groq response"

**Solution:**
- Groq sometimes returns markdown-wrapped JSON
- GroqAPI.php handles this automatically
- Check error logs for details

### No Data in Insights

**Solution:**
- Ensure database has data in relevant tables
- Check SQL queries in Insights.php
- Verify date ranges (last 30 days)

---

## 💰 Cost Estimation

### Free Tier (Groq):
- **Limit:** 30 requests/minute
- **Your Usage:** ~10-20 insights/day
- **Cost:** **FREE** ✓

### If You Exceed Free Tier:
- **Paid:** $0.10 per 1M tokens
- **Typical insight:** ~2000 tokens
- **1000 insights/month:** ~$0.20/month

**Conclusion:** You'll likely stay within free tier!

---

## 🔒 Security Best Practices

1. **Never commit API keys to git**
2. **Use environment variables**
3. **Restrict API access to admin users only**
4. **Enable HTTPS on Hostinger**
5. **Rotate API keys periodically**

---

## 📈 Performance Tips

1. **Cache insights** in localStorage (already implemented)
2. **Regenerate only when needed** (not on every page load)
3. **Use "Generate All" sparingly** (generates 4 insights at once)
4. **Monitor Groq rate limits** (30 req/min)

---

## 🎉 Success Checklist

- [ ] Groq API key obtained
- [ ] Environment variable configured
- [ ] Backend files uploaded
- [ ] Frontend built and deployed
- [ ] Test API endpoint works
- [ ] Test frontend generates insights
- [ ] All 4 categories working (Sales, Expenses, Employees, Production)
- [ ] Insights display correctly
- [ ] No errors in browser console
- [ ] No errors in PHP error logs

---

## 📞 Support

If you encounter issues:

1. Check PHP error logs in cPanel
2. Check browser console for frontend errors
3. Verify database has data
4. Test API endpoint with curl
5. Check Groq API status: https://status.groq.com

---

## 🚀 Next Steps

Once working, you can:

1. **Customize prompts** in `AdminInsightsController.php`
2. **Add more data sources** in `Insights.php`
3. **Adjust AI temperature** for more/less creative responses
4. **Add more insight categories** (e.g., Inventory, Quality)
5. **Schedule automatic generation** (cron job)

---

**Congratulations! Your AI Insights feature is now live! 🎉**