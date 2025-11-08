# Auto-Process Guide

## New Feature: Automatic Job Processing with Popups

The script now automatically opens all jobs, processes them, and shows a popup summary for each one!

## How It Works

### 1. Start Auto-Processing

1. Go to the main jobs list page: `MyJobs_Maintenance.aspx`
2. Click the **"Auto-Process All Jobs"** button in the scraper panel
3. Confirm the prompt

### 2. Automatic Processing

The script will:
- Automatically open each job one by one
- Extract all information (name, address, maintenance items, etc.)
- Show a popup summary for each job
- Save all data to the report
- Move to the next job when you click "Continue"
- Return to the main page when complete

### 3. Popup Summary Format

Each job shows:

```
Job Summary
━━━━━━━━━━━━━━━━━━━━
    Smith @ HUNTERS HILL

         3 / 5
    items with delivery date

    [Continue Button]
```

**Format:** `surname @ suburb`
**Number:** `items with delivery date / total items`

### 4. Navigation

- Click **"Continue"** button to move to the next job
- Or click outside the popup to close it and continue
- The script automatically navigates between jobs
- No manual clicking required!

### 5. Download Report

When all jobs are processed:
- Click **"Download Report (CSV)"** to get the full data
- The CSV includes all job details and maintenance items

## CSV Report Includes

- Job Number
- Maker Name, Mobile, Email
- Site Address & Suburb
- Total Maintenance Items
- Items With Delivery (count)
- Each item's details:
  - Item Name
  - Reason
  - Date Created
  - Delivery Info
  - Completion Status

## Example Workflow

1. **Start:** Click "Auto-Process All Jobs" on main page
2. **Confirm:** "Found 5 jobs. Start processing?"
3. **Job 1:** Opens → Shows popup "Smith @ HUNTERS HILL, 3/5 items" → Click Continue
4. **Job 2:** Opens → Shows popup "Jones @ SYDNEY, 2/4 items" → Click Continue
5. **Job 3:** Opens → Shows popup "Brown @ BONDI, 5/5 items" → Click Continue
6. ...continues for all jobs...
7. **Complete:** Returns to main page → Download report

## Benefits

✓ **Fully Automatic** - No manual clicking through jobs
✓ **Visual Summaries** - See delivery status at a glance
✓ **Complete Data** - All information saved to CSV
✓ **Resume Support** - Can pause and continue later
✓ **No Data Loss** - Everything saved as you go

## Tips

- **Don't close the browser** while processing
- **Check the popup** for each job before continuing
- **Data is saved automatically** - safe to pause anytime
- **Console logs** show detailed progress (press F12)
- **Total time:** Approximately 2-3 seconds per job

## Troubleshooting

### Popup doesn't appear
- Wait 2 seconds for page to fully load
- Check browser console (F12) for errors
- Refresh the page and try again

### Process stops
- Check your internet connection
- Look for any error popups
- Click "Clear Data" and start over

### Data missing
- Verify the page structure hasn't changed
- Check console logs for extraction errors
- Try processing one job manually first

## Technical Details

### How Suburb is Extracted
From address: `12A Ferdinand St HUNTERS HILL, NSW, 2110`
Extracts: `HUNTERS HILL`

### How Delivery Count Works
Counts items where delivery info contains "Despatched On:"

### Data Storage
- Saved to TamperMonkey storage (GM_setValue)
- Persists across browser restarts
- Cleared only when you click "Clear Data"

## Keyboard Shortcuts

While popup is open:
- **Enter/Space** - Continue to next job
- **Escape** - Close popup (continues automatically)
- **Click outside** - Close and continue

---

Enjoy automated job processing! 🚀
