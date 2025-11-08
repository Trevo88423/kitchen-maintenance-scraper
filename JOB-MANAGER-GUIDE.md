# Kitchen Maintenance Job Manager Guide

## Purpose

Quickly identify which jobs are ready to complete and which need follow-up for delivery dates, then generate email templates for both scenarios.

## Quick Start

### Option 1: Auto-Load from Portal
1. Collect jobs using the TamperMonkey script
2. Click "📊 Open Dashboard" in portal
3. Open `job-manager.html` in your browser
4. Data loads automatically!

### Option 2: Upload CSV
1. Download CSV from portal
2. Open `job-manager.html`
3. Click "Choose CSV File"
4. Upload the CSV

## Understanding Job Status

### ✅ Ready to Complete (Green Border)
- All items have delivery dates
- **Action**: Book to complete or send staff

### ⏳ Pending Delivery (Yellow Border)
- Some items missing delivery dates
- **Action**: Send follow-up email

## Workflow

### 1. Filter Jobs

**Three filter options:**
- **All Jobs** - Show everything
- **Ready to Complete** - Only jobs with all items delivered
- **Pending Delivery** - Only jobs waiting for items

Click filter buttons at the top to switch views.

### 2. Select Jobs

**Selection methods:**
- **Click job cards** to select/deselect individual jobs
- **Select All** - Selects all visible jobs (filtered)
- **Deselect All** - Clears selection

Selected jobs have a **blue background**.

### 3. Generate Emails

#### For Jobs Ready to Complete:
1. Filter or select "Ready to Complete" jobs
2. Click **"📧 Ready to Complete Email"**
3. Email templates generated for each job
4. Click **"Copy to Clipboard"**
5. Paste into your email client

**Email includes:**
- Job number and customer name
- Address
- List of items ready
- Request to schedule completion

#### For Jobs Needing Follow-Up:
1. Filter or select "Pending Delivery" jobs
2. Click **"📧 Follow-Up Email"**
3. Email templates generated
4. Click **"Copy to Clipboard"**
5. Paste and send

**Email includes:**
- Job number and customer name
- List of items awaiting delivery
- Request for delivery date updates

## Features

### Job Cards Show:
- Customer name & job number
- Status badge (Ready/Pending)
- Suburb & mobile number
- Delivery progress (e.g., "3 / 5" items delivered)
- **Pending items list** (for incomplete jobs)

### Statistics Dashboard:
- Total Jobs
- Ready to Complete (green)
- Pending Delivery (yellow)
- Currently Selected (blue)

### Email Templates:
- Professional formatting
- Pre-filled with job details
- Item lists included
- Easy to customize before sending

## Example Workflows

### Morning Routine - Book Completions
```
1. Open job-manager.html
2. Click "Ready to Complete" filter
3. Shows: 5 jobs ready
4. Click "Select All"
5. Click "Ready to Complete Email"
6. Copy all 5 emails
7. Send to customers to schedule
```

### Weekly Follow-Up - Chase Deliveries
```
1. Open job-manager.html
2. Click "Pending Delivery" filter
3. Shows: 12 jobs waiting
4. Select jobs older than 1 week
5. Click "Follow-Up Email"
6. Copy emails
7. Send delivery date requests
```

### Quick Check - Single Job
```
1. Search for customer name (Ctrl+F)
2. Click their job card
3. View pending items in card
4. Select and generate appropriate email
```

## Email Template Customization

Before sending, you can edit:
- **[YOUR PHONE]** - Replace with your contact number
- **[YOUR NAME]** - Replace with your name
- Add company branding
- Adjust tone/wording

## Tips

### Smart Selection
- **Filter first**, then "Select All" to batch similar jobs
- Select multiple ready jobs → book them all at once
- Select pending jobs by age (oldest first)

### Email Management
- Generate all ready emails Monday morning
- Send follow-ups on Fridays
- Keep track of responses in your email

### Staff Coordination
- Filter "Ready" jobs by suburb
- Assign to local staff members
- Generate completion emails for their bookings

### Priority Handling
1. **Urgent**: Jobs ready for 1+ week
2. **Follow-up**: Pending for 2+ weeks
3. **New**: Recently created jobs

## Keyboard Shortcuts

- **Ctrl+F** - Search for customer name/job number
- **Ctrl+C** - Copy selected emails
- **Esc** - Deselect all

## File Location

```
C:\Work project\data scrape scipt\job-manager.html
```

**Bookmark it** for quick daily access!

## Integration with Portal

The job manager automatically loads data from:
- TamperMonkey script (via localStorage)
- Manually uploaded CSV files
- Dashboard exports

All three methods work seamlessly!

---

**Quick Reference:**

✅ **Ready** = All delivered → Send booking email
⏳ **Pending** = Missing items → Send follow-up
📊 **Stats** = Quick overview
📧 **Emails** = One-click templates

Enjoy streamlined job management! 🚀
