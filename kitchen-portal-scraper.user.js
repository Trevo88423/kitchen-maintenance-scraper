// ==UserScript==
// @name         Kitchen Group Trades Portal - Maintenance Scraper
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Extract maintenance job data from Kitchen Group trades portal with auto-processing and dashboard
// @author       You
// @match        https://trades.kitchengroup.com.au/Trades/MyJobs_Maintenance.aspx*
// @match        https://trades.kitchengroup.com.au/Trades/MyJobs.aspx?JobNumber=*
// @grant        GM_setClipboard
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        processDelay: 3000, // Delay between processing jobs (ms)
        reportFormat: 'CSV', // 'JSON' or 'CSV'
        debugMode: true
    };

    // Data storage
    let reportData = GM_getValue('reportData', []);
    let jobLinks = [];
    let currentJobIndex = 0;
    let isProcessing = false;

    // Utility: Log with debug mode
    function log(...args) {
        if (CONFIG.debugMode) {
            console.log('[Kitchen Scraper]', ...args);
        }
    }

    // Utility: Sleep
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Utility: Safe text extraction
    function getText(selector, parent = document) {
        const element = parent.querySelector(selector);
        return element ? element.textContent.trim() : '';
    }

    // Utility: Get all text matching selector
    function getAllText(selector, parent = document) {
        const elements = parent.querySelectorAll(selector);
        return Array.from(elements).map(el => el.textContent.trim());
    }

    // Check if we're on the main jobs list page
    function isMainPage() {
        return window.location.href.includes('MyJobs_Maintenance.aspx');
    }

    // Extract all job links from the main table
    function extractJobLinks() {
        const links = [];

        // Find the table with jobs - adjust selector if needed
        const jobRows = document.querySelectorAll('table tr');

        jobRows.forEach((row, index) => {
            // Skip header row
            if (index === 0) return;

            const cells = row.querySelectorAll('td');
            if (cells.length < 6) return;

            // Extract job information from the row
            const jobLink = row.querySelector('a[href*="JobNumber"]') || cells[0].querySelector('a');

            if (jobLink) {
                const jobData = {
                    jobNumber: cells[0].textContent.trim(),
                    surname: cells[2].textContent.trim(),
                    firstName: cells[3].textContent.trim(),
                    dateCreated: cells[4].textContent.trim(),
                    lastDispatch: cells[5].textContent.trim(),
                    url: jobLink.href
                };

                links.push(jobData);
            }
        });

        log('Found job links:', links);
        return links;
    }

    // Extract data from job detail page
    function extractJobDetails() {
        const details = {
            jobNumber: '',
            maker: {
                name: '',
                mobile: '',
                email: '',
                address: '',
                suburb: '' // Added suburb extraction
            },
            maintenanceItems: [],
            completionStatus: '',
            timestamp: new Date().toISOString()
        };

        // Extract maker information by looking for specific text patterns
        // Format: "Name: Emma  Adam" "Job Number: MWDNDR26057" "Mobile: 0458800865" etc.
        const pageText = document.body.textContent;

        // Extract Name (format: "Name: FirstName LastName")
        const nameMatch = pageText.match(/Name:\s*([^\n]+)/);
        if (nameMatch) {
            details.maker.name = nameMatch[1].trim();
        }

        // Extract Job Number (format: "Job Number: MWDNDR26057")
        const jobMatch = pageText.match(/Job Number:\s*(\w+\d+)/);
        if (jobMatch) {
            details.jobNumber = jobMatch[1].trim();
        }

        // Extract Mobile (format: "Mobile: 0458800865")
        const mobileMatch = pageText.match(/Mobile:\s*([\d\s]+)/);
        if (mobileMatch) {
            details.maker.mobile = mobileMatch[1].trim();
        }

        // Extract Email (format: "Email: emmaadam@mac.com")
        const emailMatch = pageText.match(/Email:\s*([\w.-]+@[\w.-]+\.\w+)/);
        if (emailMatch) {
            details.maker.email = emailMatch[1].trim();
        }

        // Extract Site Address (format: "Site Address: 12A Ferdinand St\nHUNTERS HILL, NSW, 2110")
        const addressMatch = pageText.match(/Site Address:\s*([^\n]+(?:\n[^\n]+)?)/);
        if (addressMatch) {
            details.maker.address = addressMatch[1].trim().replace(/\s+/g, ' ');

            // Extract suburb from address (format: "HUNTERS HILL, NSW, 2110")
            const suburbMatch = details.maker.address.match(/([A-Z\s]+),\s*[A-Z]+,\s*\d+/);
            if (suburbMatch) {
                details.maker.suburb = suburbMatch[1].trim();
            }
        }

        // Extract maintenance items
        details.maintenanceItems = extractMaintenanceItems();

        // Check completion status
        details.completionStatus = checkCompletionStatus();

        log('Extracted job details:', details);
        return details;
    }

    // Extract maintenance items from detail page
    function extractMaintenanceItems() {
        const items = [];

        // Look for the maintenance items table
        // Table has columns: Item | Reason | Date Created | Delivery Info | Mark as Completed | Print
        const tables = document.querySelectorAll('table');

        let maintenanceTable = null;

        // Find the table with "Maintenance Items" header
        for (const table of tables) {
            const headerText = table.textContent;
            if (headerText.includes('Maintenance Items') ||
                headerText.includes('Item') && headerText.includes('Reason') && headerText.includes('Date Created')) {
                maintenanceTable = table;
                break;
            }
        }

        if (!maintenanceTable) {
            log('No maintenance table found');
            return items;
        }

        const rows = maintenanceTable.querySelectorAll('tr');

        rows.forEach((row, rowIndex) => {
            // Skip header rows
            const headerCells = row.querySelectorAll('th');
            if (headerCells.length > 0) return;

            const cells = row.querySelectorAll('td');

            // Table structure:
            // Column 0: Select checkbox
            // Column 1: Item (e.g., "3 x 24V 6-Way Distributor")
            // Column 2: Reason (e.g., "Broken connector" or empty)
            // Column 3: Date Created (e.g., "12/10/2025")
            // Column 4: Delivery Info (e.g., "Despatched On: 23/10/2025")
            // Column 5: Mark as Completed button
            // Column 6: Print link

            if (cells.length >= 5) {
                // Check if this item has a "Mark as Completed" submit button
                const hasSubmitButton = cells[5] && cells[5].textContent.includes('Submit');

                // An item is complete if it does NOT have a submit button
                const isComplete = !hasSubmitButton;

                const item = {
                    index: items.length + 1,
                    name: cells[1]?.textContent.trim() || '',
                    reason: cells[2]?.textContent.trim() || '',
                    dateCreated: cells[3]?.textContent.trim() || '',
                    deliveryInfo: cells[4]?.textContent.trim() || '',
                    hasMarkCompleteButton: hasSubmitButton,
                    isComplete: isComplete,
                    completionText: cells[5]?.textContent.trim() || ''
                };

                // Only add if item has a name
                if (item.name && item.name !== '' && !item.name.includes('Select')) {
                    items.push(item);
                }
            }
        });

        log('Found maintenance items:', items);
        return items;
    }

    // Check if job has "Mark as Completed" button
    function checkCompletionStatus() {
        // Look for the "Mark as Completed" submit buttons in the table
        const submitButtons = document.querySelectorAll('input[type="submit"][value*="Submit"]');

        // Count how many items have incomplete maintenance
        const incompleteCount = submitButtons.length;

        return {
            hasMarkCompleteButtons: incompleteCount > 0,
            incompleteItemsCount: incompleteCount,
            allItemsComplete: incompleteCount === 0
        };
    }

    // Save current job data
    function saveCurrentJob() {
        const jobData = extractJobDetails();
        reportData.push(jobData);
        GM_setValue('reportData', reportData);
        updateUI();
        log('Saved job data. Total records:', reportData.length);
    }

    // Generate CSV report
    function generateCSV() {
        const rows = [];

        // Headers
        rows.push([
            'Job Number',
            'Maker Name',
            'Mobile',
            'Email',
            'Site Address',
            'Suburb',
            'Total Maintenance Items',
            'Items With Delivery',
            'Items Complete',
            'Incomplete Items Count',
            'All Items Complete',
            'Item #',
            'Item Name',
            'Reason',
            'Date Created',
            'Delivery Info',
            'Item Is Complete',
            'Item Has Mark Complete Button',
            'Timestamp'
        ].join(','));

        // Data rows
        reportData.forEach(job => {
            // Count items with delivery info
            const itemsWithDelivery = job.maintenanceItems.filter(item =>
                item.deliveryInfo && item.deliveryInfo.includes('Despatched')
            ).length;

            // Count completed items
            const itemsComplete = job.maintenanceItems.filter(item =>
                item.isComplete === true
            ).length;

            if (job.maintenanceItems.length === 0) {
                rows.push([
                    escapeCSV(job.jobNumber),
                    escapeCSV(job.maker.name),
                    escapeCSV(job.maker.mobile),
                    escapeCSV(job.maker.email),
                    escapeCSV(job.maker.address),
                    escapeCSV(job.maker.suburb),
                    0,
                    0,
                    0,
                    job.completionStatus?.incompleteItemsCount || 0,
                    job.completionStatus?.allItemsComplete || 'N/A',
                    '',
                    'No maintenance items',
                    '',
                    '',
                    '',
                    'N/A',
                    'N/A',
                    job.timestamp
                ].join(','));
            } else {
                job.maintenanceItems.forEach(item => {
                    rows.push([
                        escapeCSV(job.jobNumber),
                        escapeCSV(job.maker.name),
                        escapeCSV(job.maker.mobile),
                        escapeCSV(job.maker.email),
                        escapeCSV(job.maker.address),
                        escapeCSV(job.maker.suburb),
                        job.maintenanceItems.length,
                        itemsWithDelivery,
                        itemsComplete,
                        job.completionStatus?.incompleteItemsCount || 0,
                        job.completionStatus?.allItemsComplete || 'N/A',
                        item.index,
                        escapeCSV(item.name),
                        escapeCSV(item.reason),
                        escapeCSV(item.dateCreated),
                        escapeCSV(item.deliveryInfo),
                        item.isComplete ? 'Yes' : 'No',
                        item.hasMarkCompleteButton ? 'Yes' : 'No',
                        job.timestamp
                    ].join(','));
                });
            }
        });

        return rows.join('\n');
    }

    // Generate JSON report
    function generateJSON() {
        return JSON.stringify(reportData, null, 2);
    }

    // Escape CSV values
    function escapeCSV(value) {
        if (value === null || value === undefined) return '';
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    }

    // Download report
    function downloadReport() {
        const report = CONFIG.reportFormat === 'CSV' ? generateCSV() : generateJSON();
        const ext = CONFIG.reportFormat.toLowerCase();
        const filename = `kitchen-maintenance-report-${new Date().toISOString().split('T')[0]}.${ext}`;

        const blob = new Blob([report], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        alert(`✓ Downloaded: ${filename}\nRecords: ${reportData.length}`);
    }

    // Copy to clipboard
    function copyToClipboard() {
        const report = CONFIG.reportFormat === 'CSV' ? generateCSV() : generateJSON();
        GM_setClipboard(report);
        alert(`✓ Report copied to clipboard!\nRecords: ${reportData.length}`);
    }

    // Show popup summary for a job
    function showJobSummary(jobData) {
        const surname = jobData.maker.name.split(' ').pop() || 'Unknown';
        const suburb = jobData.maker.suburb || 'Unknown';

        // Count items with delivery dates
        const itemsWithDelivery = jobData.maintenanceItems.filter(item =>
            item.deliveryInfo && item.deliveryInfo.includes('Despatched')
        ).length;

        const totalItems = jobData.maintenanceItems.length;

        const message = `Job: ${surname} @ ${suburb}\n\n${itemsWithDelivery} / ${totalItems} items with delivery date`;

        // Create styled popup
        const popup = document.createElement('div');
        popup.id = 'job-summary-popup';
        popup.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            color: #333;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            z-index: 9999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            min-width: 350px;
            text-align: center;
        `;

        popup.innerHTML = `
            <h2 style="margin: 0 0 20px 0; color: #667eea; font-size: 22px;">Job Summary</h2>
            <div style="background: #f7f7f7; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <div style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">
                    ${surname} @ ${suburb}
                </div>
                <div style="font-size: 32px; font-weight: bold; color: #667eea;">
                    ${itemsWithDelivery} / ${totalItems}
                </div>
                <div style="font-size: 14px; color: #666; margin-top: 5px;">
                    items with delivery date
                </div>
            </div>
            <button id="close-popup" style="
                background: #667eea;
                color: white;
                border: none;
                padding: 12px 30px;
                border-radius: 6px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
            ">Continue</button>
        `;

        // Add overlay
        const overlay = document.createElement('div');
        overlay.id = 'popup-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 9999998;
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(popup);

        // Return promise that resolves when popup is closed
        return new Promise((resolve) => {
            const closePopup = () => {
                popup.remove();
                overlay.remove();
                resolve();
            };

            document.getElementById('close-popup').addEventListener('click', closePopup);
            overlay.addEventListener('click', closePopup);
        });
    }

    // Auto-process all jobs with popup summaries
    async function autoProcessAllJobs() {
        if (isProcessing) {
            alert('Already processing jobs...');
            return;
        }

        if (!isMainPage()) {
            alert('Please run this from the main jobs list page.');
            return;
        }

        isProcessing = true;
        jobLinks = extractJobLinks();

        if (jobLinks.length === 0) {
            alert('No jobs found in the table.');
            isProcessing = false;
            return;
        }

        const confirmMsg = `Found ${jobLinks.length} jobs. Start processing?\n\nThis will:\n1. Open each job\n2. Show summary popup\n3. Extract all data\n\nEstimated time: ${Math.ceil(jobLinks.length * CONFIG.processDelay / 1000 / 60)} minutes`;

        if (!confirm(confirmMsg)) {
            isProcessing = false;
            return;
        }

        // Store job links and current index for navigation
        GM_setValue('jobLinks', jobLinks);
        GM_setValue('currentJobIndex', 0);
        GM_setValue('isAutoProcessing', true);

        // Navigate to first job
        window.location.href = jobLinks[0].url;
    }

    // Continue auto-processing (called from job detail pages)
    async function continueAutoProcessing() {
        const jobLinks = GM_getValue('jobLinks', []);
        const currentIndex = GM_getValue('currentJobIndex', 0);

        if (jobLinks.length === 0 || currentIndex >= jobLinks.length) {
            // Done processing
            GM_setValue('isAutoProcessing', false);
            GM_setValue('jobLinks', []);
            GM_setValue('currentJobIndex', 0);

            // Navigate back to main page
            window.location.href = 'https://trades.kitchengroup.com.au/Trades/MyJobs_Maintenance.aspx';
            return;
        }

        // Extract current job data
        const jobData = extractJobDetails();

        // Save to report
        reportData.push(jobData);
        GM_setValue('reportData', reportData);

        // Show summary popup
        await showJobSummary(jobData);

        // Move to next job
        const nextIndex = currentIndex + 1;
        GM_setValue('currentJobIndex', nextIndex);

        if (nextIndex < jobLinks.length) {
            // Navigate to next job
            updateUI(`Processing ${nextIndex + 1}/${jobLinks.length}...`);
            window.location.href = jobLinks[nextIndex].url;
        } else {
            // All done - go back to main page
            GM_setValue('isAutoProcessing', false);
            alert(`✓ Processing complete!\nProcessed ${jobLinks.length} jobs`);
            window.location.href = 'https://trades.kitchengroup.com.au/Trades/MyJobs_Maintenance.aspx';
        }
    }

    // Create control panel
    function createControlPanel() {
        // Remove existing panel if present
        const existing = document.getElementById('scraper-panel');
        if (existing) existing.remove();

        const panel = document.createElement('div');
        panel.id = 'scraper-panel';
        panel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px;
            border-radius: 10px;
            box-shadow: 0 8px 16px rgba(0,0,0,0.3);
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            min-width: 280px;
            max-width: 320px;
        `;

        const isMain = isMainPage();

        panel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <h3 style="margin: 0; font-size: 16px; font-weight: 600;">🔧 Maintenance Scraper</h3>
                <button id="scraper-close" style="background: rgba(255,255,255,0.2); border: none; color: white; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; font-size: 16px; line-height: 1;">×</button>
            </div>

            <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 6px; margin-bottom: 12px;">
                <div style="font-size: 12px; opacity: 0.9;">Records collected:</div>
                <div id="scraper-count" style="font-size: 24px; font-weight: bold;">${reportData.length}</div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 8px;">
                ${isMain ? `
                    <button id="scraper-auto" class="scraper-btn" style="background: #10b981;">
                        ▶ Auto-Process All Jobs
                    </button>
                    <button id="scraper-extract-table" class="scraper-btn" style="background: #3b82f6;">
                        📋 Extract Job List
                    </button>
                ` : `
                    <button id="scraper-extract" class="scraper-btn" style="background: #3b82f6;">
                        📄 Extract This Job
                    </button>
                    <button id="scraper-back" class="scraper-btn" style="background: #6366f1;">
                        ← Back to Job List
                    </button>
                `}

                <button id="scraper-download" class="scraper-btn" style="background: #f59e0b;">
                    ⬇ Download Report (${CONFIG.reportFormat})
                </button>

                <button id="scraper-copy" class="scraper-btn" style="background: #8b5cf6;">
                    📋 Copy to Clipboard
                </button>

                <button id="scraper-clear" class="scraper-btn" style="background: #ef4444;">
                    🗑 Clear Data
                </button>

                <button id="scraper-dashboard" class="scraper-btn" style="background: #10b981; margin-top: 10px; border-top: 2px solid rgba(255,255,255,0.2); padding-top: 10px;">
                    📊 Open Dashboard
                </button>
            </div>

            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.2); font-size: 10px; opacity: 0.8; text-align: center;">
                <div id="scraper-status">Ready</div>
            </div>

            <style>
                .scraper-btn {
                    padding: 10px;
                    border: none;
                    color: white;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 13px;
                    transition: all 0.2s;
                    text-align: left;
                }
                .scraper-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
                }
                .scraper-btn:active {
                    transform: translateY(0);
                }
            </style>
        `;

        document.body.appendChild(panel);

        // Event listeners
        document.getElementById('scraper-close')?.addEventListener('click', () => {
            panel.style.display = 'none';
        });

        if (isMain) {
            document.getElementById('scraper-auto')?.addEventListener('click', autoProcessAllJobs);
            document.getElementById('scraper-extract-table')?.addEventListener('click', () => {
                const links = extractJobLinks();
                console.table(links);
                alert(`Found ${links.length} jobs. Check console for details.`);
            });
        } else {
            document.getElementById('scraper-extract')?.addEventListener('click', saveCurrentJob);
            document.getElementById('scraper-back')?.addEventListener('click', () => {
                window.location.href = 'https://trades.kitchengroup.com.au/Trades/MyJobs_Maintenance.aspx';
            });
        }

        document.getElementById('scraper-download')?.addEventListener('click', downloadReport);
        document.getElementById('scraper-copy')?.addEventListener('click', copyToClipboard);
        document.getElementById('scraper-clear')?.addEventListener('click', () => {
            if (confirm('Clear all collected data?')) {
                reportData = [];
                GM_setValue('reportData', []);
                updateUI();
                alert('✓ Data cleared');
            }
        });
        document.getElementById('scraper-dashboard')?.addEventListener('click', openDashboard);
    }

    // Open dashboard with data
    function openDashboard() {
        if (reportData.length === 0) {
            alert('No data collected yet. Please extract some jobs first.');
            return;
        }

        // Generate CSV data
        const csvData = generateCSV();

        // Store CSV in localStorage for the dashboard to access
        localStorage.setItem('dashboardData', csvData);
        localStorage.setItem('dashboardTimestamp', new Date().toISOString());

        // Download CSV automatically as backup
        downloadReport();

        // Show instructions to open dashboard
        const message = `✓ Data saved for dashboard!\n\nTo view the dashboard:\n\n1. Open this file in your browser:\nC:\\Work project\\data scrape scipt\\dashboard.html\n\n2. The dashboard will auto-load your data\n\nOR\n\nThe CSV has been downloaded - you can upload it manually to the dashboard.`;

        alert(message);

        // Try to open dashboard (may be blocked by browser)
        try {
            // Try multiple path formats
            const paths = [
                'file:///C:/Work%20project/data%20scrape%20scipt/dashboard.html',
                'file:///C:/Work project/data scrape scipt/dashboard.html',
            ];

            // Attempt to open
            const dashboardWindow = window.open(paths[0], '_blank');

            if (!dashboardWindow) {
                console.log('Popup blocked. User will need to open dashboard manually.');
            }
        } catch (e) {
            console.log('Could not auto-open dashboard:', e);
        }
    }

    // Update UI
    function updateUI(status = 'Ready') {
        const countEl = document.getElementById('scraper-count');
        const statusEl = document.getElementById('scraper-status');

        if (countEl) countEl.textContent = reportData.length;
        if (statusEl) statusEl.textContent = status;
    }

    // Initialize
    function init() {
        log('Initializing Kitchen Group Maintenance Scraper');
        log('Current page:', window.location.href);
        log('Is main page:', isMainPage());

        // Create control panel after a short delay to ensure page is loaded
        setTimeout(createControlPanel, 1000);

        // Check if we're in auto-processing mode
        const isAutoProcessing = GM_getValue('isAutoProcessing', false);

        if (!isMainPage() && isAutoProcessing) {
            // We're on a job detail page and auto-processing is active
            setTimeout(() => {
                log('Auto-processing: Extracting and showing summary...');
                continueAutoProcessing();
            }, 2000);
        }
    }

    // Start when page is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
