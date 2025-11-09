# Kitchen Maintenance Manager

Complete TamperMonkey solution for managing kitchen maintenance jobs with auto-processing, Supabase sync, job tracking, and email template generation.

> **Latest Version:** v4.1 - Now with Supabase database integration and web app support!

## 🚀 Features

- **Supabase Sync** - Automatically sync jobs to cloud database
- **Auto-Process Jobs** - Extract all maintenance data from the portal
- **Web App Integration** - View and manage jobs in admin portal
- **Email Templates** - Generate ready-to-send emails for follow-ups and completions
- **Delivery Tracking** - Automatically detect and track item delivery status
- **Mobile-Friendly** - Works on phones, tablets, and desktop
- **Auto-Updates** - TamperMonkey automatically checks for script updates

## 📱 Installation

### Desktop (Chrome/Edge/Firefox)
1. Install [TamperMonkey extension](https://www.tampermonkey.net/)
2. Click this link to install: [Kitchen Maintenance - Supabase Sync](https://raw.githubusercontent.com/YOUR_USERNAME/kitchen-maintenance-scraper/main/kitchen-portal-to-supabase.user.js)
3. Click "Install" when TamperMonkey prompts
4. Done! The script will auto-update when new versions are released

**Manual Installation:**
1. Open TamperMonkey Dashboard → Create new script
2. Copy contents of `kitchen-portal-to-supabase.user.js`
3. Paste and save (Ctrl+S)

### Mobile (Android - Kiwi Browser)
1. Install **Kiwi Browser** from Play Store
2. Install TamperMonkey extension in Kiwi
3. Create new script → paste code → save

### Mobile (iOS - Safari)
1. Install **Userscripts** app from App Store
2. Create new script → paste code
3. Enable in Safari settings

## 🎯 Quick Start

1. Navigate to `https://trades.kitchengroup.com.au/Trades/MyJobs_Maintenance.aspx`
2. TamperMonkey panel appears in top-right corner
3. Click **"▶ Auto-Process All Jobs"**
4. Wait for processing to complete
5. Click **"📧 Job Manager"** to manage jobs and generate emails

## 📊 Job Manager

### Filter Jobs
- **All Jobs** - View everything
- **Ready to Complete** - Jobs with all items delivered
- **Pending Delivery** - Jobs waiting for delivery dates

### Generate Emails
1. Filter jobs by status
2. Select jobs (click cards or "Select All")
3. Click appropriate email button:
   - **📧 Ready Emails** - For jobs ready to complete
   - **📧 Follow-Up Emails** - For jobs needing delivery updates
4. Copy to clipboard
5. Paste into your email client

## 📧 Email Templates

### Ready to Complete Email
```
Subject: Kitchen Maintenance - Ready to Complete - JOB123

Hi [Customer],

All maintenance items have been delivered and we're ready to complete the work.

Job Number: JOB123
Address: [Address]

Items Ready:
1. [Item 1]
2. [Item 2]

Please let us know a suitable time to schedule.
```

### Follow-Up Email
```
Subject: Kitchen Maintenance - Delivery Status Update Required - JOB123

Hi [Customer],

Some items are still pending delivery:

Items Awaiting Delivery:
1. [Item 1]
2. [Item 2]

Please provide expected delivery dates.
```

## 🔄 Updates

### Automatic Updates (Recommended)
The script checks for updates automatically! TamperMonkey will:
- Check GitHub for new versions every 24 hours
- Notify you when updates are available
- Auto-install updates (if enabled in TamperMonkey settings)

### Manual Update Methods

**Method 1: Reinstall from GitHub**
1. Click the [install link](https://raw.githubusercontent.com/YOUR_USERNAME/kitchen-maintenance-scraper/main/kitchen-portal-to-supabase.user.js)
2. TamperMonkey will detect it's an update and replace the old version

**Method 2: Git Pull**
```bash
cd "C:\Work project\data scrape scipt"
git pull
```
Then update the script in TamperMonkey with the new version from the file.

## 📁 Files

### Main Scripts
- **kitchen-portal-to-supabase.user.js** (v4.1) - Latest! Syncs to Supabase database ⭐ RECOMMENDED
- **kitchen-portal-scraper-complete.user.js** (v3.0) - Standalone version with built-in job manager
- **kitchen-portal-scraper.user.js** (v2.0) - Legacy version with CSV export

### Additional Tools (Optional - Legacy)
- **dashboard.html** - Standalone dashboard with charts
- **job-manager.html** - Standalone job manager
- **open-dashboard.html** - Quick launcher

### Documentation
- **README.md** - This file
- **AUTO-PROCESS-GUIDE.md** - Auto-processing instructions
- **JOB-MANAGER-GUIDE.md** - Job manager detailed guide
- **NAVIGATION-GUIDE.md** - Navigation between tools

## 🛠️ Configuration

Edit these variables in the script if needed:

```javascript
const CONFIG = {
    processDelay: 3000,      // Delay between jobs (ms)
    reportFormat: 'CSV',     // Export format
    debugMode: true          // Console logging
};
```

## 📋 Workflow Examples

### Morning Routine - Book Completions
```
1. Open portal on any device
2. Click "Auto-Process All Jobs"
3. Open "Job Manager"
4. Filter "Ready to Complete"
5. Select All → Generate Emails
6. Copy and send to customers
```

### Weekly Follow-Up
```
1. Open "Job Manager"
2. Filter "Pending Delivery"
3. Select older jobs
4. Generate Follow-Up Emails
5. Send delivery date requests
```

## 🔐 Data Privacy

- All data stored locally in browser
- No data sent to external servers
- Data syncs via TamperMonkey storage
- Clear data anytime with "Clear Data" button

## 📊 CSV Export Format

Columns include:
- Job Number
- Maker Name, Mobile, Email
- Site Address, Suburb
- Total Items, Items Delivered, Items Complete
- Individual item details
- Completion status

## 🆘 Troubleshooting

### Script not appearing
- Check TamperMonkey is enabled
- Verify script is active
- Refresh the page

### Data not saving
- Check browser storage permissions
- Try clearing data and re-processing
- Ensure TamperMonkey has storage permissions

### Mobile issues
- Use Kiwi Browser (Android) or Userscripts (iOS)
- Ensure extensions are enabled
- Check popup blockers

## 📞 Support

For issues or questions:
1. Check the documentation guides
2. Review console logs (F12)
3. Clear data and try again

## 📝 Version History

- **v3.0** - Complete all-in-one script with built-in job manager
- **v2.0** - Added dashboard navigation and auto-processing
- **v1.0** - Initial release with basic extraction

## 🎯 Features Roadmap

- [ ] SMS template generation
- [ ] Calendar integration for bookings
- [ ] Job priority scoring
- [ ] Automated email sending
- [ ] Mobile app version

## 📜 License

Personal use only. Not for redistribution.

---

**Built for Kitchen Group Trades Portal**
Last Updated: 2025-01-09
