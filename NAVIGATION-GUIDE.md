# Dashboard Navigation Guide

## Opening the Dashboard from Portal

### Method 1: Direct Button (Recommended)

1. **Collect some data** first by processing jobs
2. In the TamperMonkey scraper panel, click **"📊 Open Dashboard"**
3. Dashboard opens in a new tab with your data automatically loaded!

### Method 2: Manual Upload

1. Click **"⬇ Download Report (CSV)"** in the scraper panel
2. Open `dashboard.html` in your browser
3. Click **"Choose CSV File"** and select the downloaded CSV

## Returning to Portal

From the dashboard:

1. Click the **"← Back to Portal"** button (top right)
2. Confirms: "Return to the portal? (Data will remain saved)"
3. Click OK to return

## How It Works

### Data Storage

- When you click "Open Dashboard", the script:
  1. Generates CSV from collected data
  2. Stores it in browser localStorage
  3. Opens dashboard in new tab
  4. Dashboard auto-loads the data

### Data Persistence

- Data stays in localStorage until you:
  - Clear browser data
  - Click "Clear Data" in the scraper panel
  - Manually clear localStorage

### Browser Compatibility

**Best browsers for this feature:**
- ✅ Chrome/Edge - Full support
- ✅ Firefox - Full support
- ⚠️ Safari - May require manual navigation

## Navigation Flow

```
Portal Page
    ↓
[Collect Jobs]
    ↓
Click "Open Dashboard"
    ↓
Dashboard opens in new tab
    ↓
[View Charts & Stats]
    ↓
Click "Back to Portal"
    ↓
Return to portal
```

## Tips

### Quick Workflow

1. **Portal:** Auto-process all jobs
2. **Portal:** Click "Open Dashboard"
3. **Dashboard:** Analyze data, filter, export
4. **Dashboard:** Click "Back to Portal"
5. **Portal:** Process more jobs or download report

### Multiple Tabs

- You can have both portal and dashboard open
- Dashboard updates when you click "Open Dashboard" again
- Data syncs via localStorage

### Dashboard Features Available

When opened from portal:
- ✓ All charts render automatically
- ✓ Filters work instantly
- ✓ Export filtered data
- ✓ Full table view
- ✓ Statistics cards

## Troubleshooting

### Dashboard doesn't open

**Solution 1:** Check popup blocker
- Your browser may be blocking the new tab
- Look for a popup icon in the address bar
- Click it and allow popups from the site

**Solution 2:** Manual navigation
1. Download CSV using "Download Report"
2. Open `C:\Work project\data scrape scipt\dashboard.html`
3. Upload the CSV file

### Data not showing

**Check:**
1. Did you collect any jobs first?
2. Is localStorage enabled in your browser?
3. Try refreshing the dashboard page

**Fix:**
- Download CSV manually
- Upload it to dashboard
- Data will load

### Back button doesn't work

Some browsers prevent `window.close()` on tabs you didn't manually open.

**Alternative:**
1. Manually navigate to: `https://trades.kitchengroup.com.au/Trades/MyJobs_Maintenance.aspx`
2. Or just close the dashboard tab

## File Paths

Dashboard location:
```
C:\Work project\data scrape scipt\dashboard.html
```

You can also:
- Bookmark the dashboard
- Create a desktop shortcut
- Pin the tab for quick access

## Advanced Usage

### Keep Dashboard Open

1. Open portal in one window
2. Click "Open Dashboard"
3. Arrange windows side by side
4. Process jobs on left, view stats on right
5. Click "Open Dashboard" again to refresh data

### Export from Dashboard

1. Use filters to narrow down jobs
2. Click "Export Filtered" button
3. Get a CSV with only filtered data
4. Perfect for sharing specific suburb data

---

Enjoy seamless navigation between portal and dashboard! 🚀
