// ==UserScript==
// @name         Kitchen Maintenance Manager - Complete
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  Complete maintenance job management with auto-processing, dashboard, and email templates
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
        processDelay: 3000,
        reportFormat: 'CSV',
        debugMode: true
    };

    // Data storage
    let reportData = GM_getValue('reportData', []);
    let jobLinks = [];
    let currentJobIndex = 0;
    let isProcessing = false;

    // Utility functions
    function log(...args) {
        if (CONFIG.debugMode) console.log('[Kitchen Manager]', ...args);
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function getText(selector, parent = document) {
        const element = parent.querySelector(selector);
        return element ? element.textContent.trim() : '';
    }

    function isMainPage() {
        return window.location.href.includes('MyJobs_Maintenance.aspx');
    }

    // Extract job links from main table
    function extractJobLinks() {
        const links = [];
        const jobRows = document.querySelectorAll('table tr');

        jobRows.forEach((row, index) => {
            if (index === 0) return;
            const cells = row.querySelectorAll('td');
            if (cells.length < 6) return;

            const jobLink = row.querySelector('a[href*="JobNumber"]') || cells[0].querySelector('a');
            if (jobLink) {
                links.push({
                    jobNumber: cells[0].textContent.trim(),
                    surname: cells[2].textContent.trim(),
                    firstName: cells[3].textContent.trim(),
                    dateCreated: cells[4].textContent.trim(),
                    lastDispatch: cells[5].textContent.trim(),
                    url: jobLink.href
                });
            }
        });

        log('Found job links:', links);
        return links;
    }

    // Extract job details
    function extractJobDetails() {
        const details = {
            jobNumber: '',
            maker: { name: '', mobile: '', email: '', address: '', suburb: '' },
            maintenanceItems: [],
            completionStatus: '',
            timestamp: new Date().toISOString()
        };

        const pageText = document.body.textContent;

        const nameMatch = pageText.match(/Name:\s*([^\n]+)/);
        if (nameMatch) details.maker.name = nameMatch[1].trim();

        const jobMatch = pageText.match(/Job Number:\s*(\w+\d+)/);
        if (jobMatch) details.jobNumber = jobMatch[1].trim();

        const mobileMatch = pageText.match(/Mobile:\s*([\d\s]+)/);
        if (mobileMatch) details.maker.mobile = mobileMatch[1].trim();

        const emailMatch = pageText.match(/Email:\s*([\w.-]+@[\w.-]+\.\w+)/);
        if (emailMatch) details.maker.email = emailMatch[1].trim();

        const addressMatch = pageText.match(/Site Address:\s*([^\n]+(?:\n[^\n]+)?)/);
        if (addressMatch) {
            details.maker.address = addressMatch[1].trim().replace(/\s+/g, ' ');
            const suburbMatch = details.maker.address.match(/([A-Z\s]+),\s*[A-Z]+,\s*\d+/);
            if (suburbMatch) details.maker.suburb = suburbMatch[1].trim();
        }

        details.maintenanceItems = extractMaintenanceItems();
        details.completionStatus = checkCompletionStatus();

        log('Extracted job details:', details);
        return details;
    }

    // Extract maintenance items
    function extractMaintenanceItems() {
        const items = [];
        const tables = document.querySelectorAll('table');
        let maintenanceTable = null;

        for (const table of tables) {
            const headerText = table.textContent;
            if (headerText.includes('Maintenance Items') ||
                (headerText.includes('Item') && headerText.includes('Reason') && headerText.includes('Date Created'))) {
                maintenanceTable = table;
                break;
            }
        }

        if (!maintenanceTable) {
            log('No maintenance table found');
            return items;
        }

        const rows = maintenanceTable.querySelectorAll('tr');

        rows.forEach((row) => {
            if (row.querySelectorAll('th').length > 0) return;

            const cells = row.querySelectorAll('td');
            if (cells.length >= 5) {
                const hasSubmitButton = cells[5] && cells[5].textContent.includes('Submit');
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

                if (item.name && item.name !== '' && !item.name.includes('Select')) {
                    items.push(item);
                }
            }
        });

        log('Found maintenance items:', items);
        return items;
    }

    // Check completion status
    function checkCompletionStatus() {
        const submitButtons = document.querySelectorAll('input[type="submit"][value*="Submit"]');
        const incompleteCount = submitButtons.length;

        return {
            hasMarkCompleteButtons: incompleteCount > 0,
            incompleteItemsCount: incompleteCount,
            allItemsComplete: incompleteCount === 0
        };
    }

    // Save current job
    function saveCurrentJob() {
        const jobData = extractJobDetails();
        reportData.push(jobData);
        GM_setValue('reportData', reportData);
        updateUI();
        log('Saved job data. Total records:', reportData.length);
    }

    // Generate CSV
    function generateCSV() {
        const rows = [];
        rows.push([
            'Job Number', 'Maker Name', 'Mobile', 'Email', 'Site Address', 'Suburb',
            'Total Maintenance Items', 'Items With Delivery', 'Items Complete',
            'Incomplete Items Count', 'All Items Complete', 'Item #', 'Item Name',
            'Reason', 'Date Created', 'Delivery Info', 'Item Is Complete',
            'Item Has Mark Complete Button', 'Timestamp'
        ].join(','));

        reportData.forEach(job => {
            const itemsWithDelivery = job.maintenanceItems.filter(item =>
                item.deliveryInfo && item.deliveryInfo.includes('Despatched')
            ).length;

            const itemsComplete = job.maintenanceItems.filter(item => item.isComplete === true).length;

            if (job.maintenanceItems.length === 0) {
                rows.push([
                    escapeCSV(job.jobNumber), escapeCSV(job.maker.name), escapeCSV(job.maker.mobile),
                    escapeCSV(job.maker.email), escapeCSV(job.maker.address), escapeCSV(job.maker.suburb),
                    0, 0, 0, job.completionStatus?.incompleteItemsCount || 0,
                    job.completionStatus?.allItemsComplete || 'N/A', '', 'No maintenance items',
                    '', '', '', 'N/A', 'N/A', job.timestamp
                ].join(','));
            } else {
                job.maintenanceItems.forEach(item => {
                    rows.push([
                        escapeCSV(job.jobNumber), escapeCSV(job.maker.name), escapeCSV(job.maker.mobile),
                        escapeCSV(job.maker.email), escapeCSV(job.maker.address), escapeCSV(job.maker.suburb),
                        job.maintenanceItems.length, itemsWithDelivery, itemsComplete,
                        job.completionStatus?.incompleteItemsCount || 0,
                        job.completionStatus?.allItemsComplete || 'N/A',
                        item.index, escapeCSV(item.name), escapeCSV(item.reason),
                        escapeCSV(item.dateCreated), escapeCSV(item.deliveryInfo),
                        item.isComplete ? 'Yes' : 'No', item.hasMarkCompleteButton ? 'Yes' : 'No',
                        job.timestamp
                    ].join(','));
                });
            }
        });

        return rows.join('\n');
    }

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
        const report = generateCSV();
        const filename = `kitchen-maintenance-report-${new Date().toISOString().split('T')[0]}.csv`;
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
        const report = generateCSV();
        GM_setClipboard(report);
        alert(`✓ Report copied to clipboard!\nRecords: ${reportData.length}`);
    }

    // Show job summary popup
    function showJobSummary(jobData) {
        const surname = jobData.maker.name.split(' ').pop() || 'Unknown';
        const suburb = jobData.maker.suburb || 'Unknown';
        const itemsWithDelivery = jobData.maintenanceItems.filter(item =>
            item.deliveryInfo && item.deliveryInfo.includes('Despatched')
        ).length;
        const totalItems = jobData.maintenanceItems.length;

        const popup = document.createElement('div');
        popup.id = 'job-summary-popup';
        popup.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: white; color: #333; padding: 30px; border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3); z-index: 9999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            min-width: 350px; text-align: center;
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
            <button id="close-popup" style="background: #667eea; color: white; border: none;
                padding: 12px 30px; border-radius: 6px; font-size: 16px; font-weight: 600; cursor: pointer;">
                Continue
            </button>
        `;

        const overlay = document.createElement('div');
        overlay.id = 'popup-overlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5); z-index: 9999998;
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(popup);

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

    // Auto-process jobs
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

        GM_setValue('jobLinks', jobLinks);
        GM_setValue('currentJobIndex', 0);
        GM_setValue('isAutoProcessing', true);

        window.location.href = jobLinks[0].url;
    }

    // Continue auto-processing
    async function continueAutoProcessing() {
        const jobLinks = GM_getValue('jobLinks', []);
        const currentIndex = GM_getValue('currentJobIndex', 0);

        if (jobLinks.length === 0 || currentIndex >= jobLinks.length) {
            GM_setValue('isAutoProcessing', false);
            GM_setValue('jobLinks', []);
            GM_setValue('currentJobIndex', 0);
            window.location.href = 'https://trades.kitchengroup.com.au/Trades/MyJobs_Maintenance.aspx';
            return;
        }

        const jobData = extractJobDetails();
        reportData.push(jobData);
        GM_setValue('reportData', reportData);

        await showJobSummary(jobData);

        const nextIndex = currentIndex + 1;
        GM_setValue('currentJobIndex', nextIndex);

        if (nextIndex < jobLinks.length) {
            updateUI(`Processing ${nextIndex + 1}/${jobLinks.length}...`);
            window.location.href = jobLinks[nextIndex].url;
        } else {
            GM_setValue('isAutoProcessing', false);
            alert(`✓ Processing complete!\nProcessed ${jobLinks.length} jobs`);
            window.location.href = 'https://trades.kitchengroup.com.au/Trades/MyJobs_Maintenance.aspx';
        }
    }

    // Show Job Manager Modal
    function showJobManager() {
        if (reportData.length === 0) {
            alert('No data collected yet. Please process some jobs first.');
            return;
        }

        // Process jobs data
        const jobs = {};
        reportData.forEach(job => {
            const jobNum = job.jobNumber;
            if (!jobs[jobNum]) {
                const itemsWithDelivery = job.maintenanceItems.filter(item =>
                    item.deliveryInfo && item.deliveryInfo.includes('Despatched')
                ).length;

                jobs[jobNum] = {
                    ...job,
                    totalItems: job.maintenanceItems.length,
                    itemsWithDelivery: itemsWithDelivery,
                    status: itemsWithDelivery === job.maintenanceItems.length ? 'ready' : 'pending',
                    selected: false
                };
            }
        });

        const jobsList = Object.values(jobs);
        let selectedJobs = new Set();
        let currentFilter = 'all';

        // Create modal
        const modal = document.createElement('div');
        modal.id = 'job-manager-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.8); z-index: 9999999; overflow-y: auto;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
        `;

        modal.innerHTML = `
            <div style="max-width: 1200px; margin: 20px auto; background: white; border-radius: 12px; padding: 30px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 style="margin: 0; color: #667eea;">📧 Job Manager</h2>
                    <button id="close-manager" style="background: #dc3545; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600;">
                        Close
                    </button>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 20px;">
                    <div style="background: #f0f4ff; padding: 15px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 12px; color: #666; font-weight: 600;">TOTAL JOBS</div>
                        <div id="stat-total" style="font-size: 28px; font-weight: bold; color: #667eea;">${jobsList.length}</div>
                    </div>
                    <div style="background: #d4edda; padding: 15px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 12px; color: #666; font-weight: 600;">READY</div>
                        <div id="stat-ready" style="font-size: 28px; font-weight: bold; color: #28a745;">0</div>
                    </div>
                    <div style="background: #fff3cd; padding: 15px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 12px; color: #666; font-weight: 600;">PENDING</div>
                        <div id="stat-pending" style="font-size: 28px; font-weight: bold; color: #ffc107;">0</div>
                    </div>
                    <div style="background: #e7f3ff; padding: 15px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 12px; color: #666; font-weight: 600;">SELECTED</div>
                        <div id="stat-selected" style="font-size: 28px; font-weight: bold; color: #007bff;">0</div>
                    </div>
                </div>

                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <div style="margin-bottom: 10px;">
                        <button class="filter-btn" data-filter="all" style="background: #667eea; color: white;">All Jobs</button>
                        <button class="filter-btn" data-filter="ready">Ready to Complete</button>
                        <button class="filter-btn" data-filter="pending">Pending Delivery</button>
                    </div>
                    <div>
                        <button id="select-all-btn" class="action-btn" style="background: #007bff;">Select All</button>
                        <button id="deselect-all-btn" class="action-btn" style="background: #6c757d;">Deselect All</button>
                        <button id="ready-email-btn" class="action-btn" style="background: #28a745;">📧 Ready Emails</button>
                        <button id="followup-email-btn" class="action-btn" style="background: #ffc107; color: #000;">📧 Follow-Up Emails</button>
                    </div>
                </div>

                <div id="jobs-container" style="max-height: 500px; overflow-y: auto;"></div>

                <div id="email-section" style="display: none; margin-top: 20px; background: #f8f9fa; padding: 20px; border-radius: 8px;">
                    <h3>Generated Emails</h3>
                    <div id="email-content" style="background: white; padding: 15px; border-radius: 6px; max-height: 400px; overflow-y: auto; white-space: pre-wrap; font-family: monospace; font-size: 12px;"></div>
                    <button id="copy-emails-btn" style="margin-top: 10px; padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
                        Copy to Clipboard
                    </button>
                </div>

                <style>
                    .filter-btn, .action-btn {
                        padding: 8px 16px;
                        border: 2px solid #e0e0e0;
                        background: white;
                        border-radius: 6px;
                        cursor: pointer;
                        font-weight: 600;
                        margin: 5px;
                        transition: all 0.3s;
                    }
                    .filter-btn:hover, .action-btn:hover {
                        transform: translateY(-2px);
                    }
                    .filter-btn.active {
                        border-color: #667eea;
                        background: #667eea;
                        color: white;
                    }
                    .job-item {
                        border: 2px solid #e0e0e0;
                        border-radius: 8px;
                        padding: 15px;
                        margin-bottom: 10px;
                        cursor: pointer;
                        transition: all 0.3s;
                    }
                    .job-item:hover {
                        border-color: #667eea;
                        box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
                    }
                    .job-item.selected {
                        border-color: #667eea;
                        background: #f0f4ff;
                    }
                    .job-item.ready {
                        border-left: 5px solid #28a745;
                    }
                    .job-item.pending {
                        border-left: 5px solid #ffc107;
                    }
                </style>
            </div>
        `;

        document.body.appendChild(modal);

        // Render jobs function
        function renderJobs() {
            const container = document.getElementById('jobs-container');
            const filtered = jobsList.filter(job => {
                if (currentFilter === 'ready') return job.status === 'ready';
                if (currentFilter === 'pending') return job.status === 'pending';
                return true;
            });

            container.innerHTML = filtered.map(job => {
                const pendingItems = job.maintenanceItems.filter(item => !item.deliveryInfo || !item.deliveryInfo.includes('Despatched'));
                const isSelected = selectedJobs.has(job.jobNumber);

                return `
                    <div class="job-item ${job.status} ${isSelected ? 'selected' : ''}" data-job="${job.jobNumber}">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <div>
                                <strong style="font-size: 16px;">${job.maker.name}</strong>
                                <span style="color: #667eea; margin-left: 10px;">${job.jobNumber}</span>
                            </div>
                            <span style="background: ${job.status === 'ready' ? '#d4edda' : '#fff3cd'}; color: ${job.status === 'ready' ? '#155724' : '#856404'}; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">
                                ${job.status === 'ready' ? '✓ Ready' : '⏳ Pending'}
                            </span>
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; font-size: 13px; color: #666;">
                            <div><strong>Suburb:</strong> ${job.maker.suburb || 'N/A'}</div>
                            <div><strong>Mobile:</strong> ${job.maker.mobile}</div>
                            <div><strong>Items:</strong> ${job.totalItems}</div>
                            <div><strong>Delivered:</strong> ${job.itemsWithDelivery}/${job.totalItems}</div>
                        </div>
                        ${pendingItems.length > 0 ? `
                            <div style="margin-top: 10px; padding: 10px; background: #fff3cd; border-radius: 6px;">
                                <strong style="font-size: 12px;">Pending Items:</strong>
                                ${pendingItems.map(item => `<div style="font-size: 12px; color: #856404;">• ${item.name}</div>`).join('')}
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('');

            // Update stats
            const readyCount = jobsList.filter(j => j.status === 'ready').length;
            const pendingCount = jobsList.filter(j => j.status === 'pending').length;
            document.getElementById('stat-ready').textContent = readyCount;
            document.getElementById('stat-pending').textContent = pendingCount;
            document.getElementById('stat-selected').textContent = selectedJobs.size;

            // Add click handlers
            document.querySelectorAll('.job-item').forEach(el => {
                el.addEventListener('click', () => {
                    const jobNum = el.dataset.job;
                    if (selectedJobs.has(jobNum)) {
                        selectedJobs.delete(jobNum);
                    } else {
                        selectedJobs.add(jobNum);
                    }
                    renderJobs();
                });
            });
        }

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentFilter = btn.dataset.filter;
                renderJobs();
            });
        });

        // Action buttons
        document.getElementById('select-all-btn').addEventListener('click', () => {
            const filtered = jobsList.filter(job => {
                if (currentFilter === 'ready') return job.status === 'ready';
                if (currentFilter === 'pending') return job.status === 'pending';
                return true;
            });
            filtered.forEach(job => selectedJobs.add(job.jobNumber));
            renderJobs();
        });

        document.getElementById('deselect-all-btn').addEventListener('click', () => {
            selectedJobs.clear();
            renderJobs();
        });

        document.getElementById('ready-email-btn').addEventListener('click', () => {
            const selected = jobsList.filter(job => selectedJobs.has(job.jobNumber) && job.status === 'ready');
            if (selected.length === 0) {
                alert('Please select jobs that are ready to complete');
                return;
            }

            let emails = '';
            selected.forEach(job => {
                emails += `To: ${job.maker.email}\n`;
                emails += `Subject: Kitchen Maintenance - Ready to Complete - ${job.jobNumber}\n\n`;
                emails += `Hi ${job.maker.name.split(' ')[0]},\n\n`;
                emails += `Good news! All maintenance items for your kitchen have been delivered and we're ready to complete the work.\n\n`;
                emails += `Job Number: ${job.jobNumber}\n`;
                emails += `Address: ${job.maker.address}\n\n`;
                emails += `Items Ready:\n`;
                job.maintenanceItems.forEach((item, i) => {
                    emails += `${i + 1}. ${item.name}${item.reason ? ` (${item.reason})` : ''}\n`;
                });
                emails += `\nPlease let us know when would be a suitable time to visit and complete the maintenance work.\n\n`;
                emails += `Best regards,\n[YOUR NAME]\nKitchen Maintenance Team\n\n`;
                emails += '='.repeat(80) + '\n\n';
            });

            document.getElementById('email-content').textContent = emails;
            document.getElementById('email-section').style.display = 'block';
            document.getElementById('email-section').scrollIntoView({ behavior: 'smooth' });
        });

        document.getElementById('followup-email-btn').addEventListener('click', () => {
            const selected = jobsList.filter(job => selectedJobs.has(job.jobNumber) && job.status === 'pending');
            if (selected.length === 0) {
                alert('Please select jobs with pending deliveries');
                return;
            }

            let emails = '';
            selected.forEach(job => {
                const pendingItems = job.maintenanceItems.filter(item => !item.deliveryInfo || !item.deliveryInfo.includes('Despatched'));

                emails += `To: ${job.maker.email}\n`;
                emails += `Subject: Kitchen Maintenance - Delivery Status Update Required - ${job.jobNumber}\n\n`;
                emails += `Hi ${job.maker.name.split(' ')[0]},\n\n`;
                emails += `We're following up on the maintenance items for your kitchen. Some items are still pending delivery.\n\n`;
                emails += `Job Number: ${job.jobNumber}\n`;
                emails += `Address: ${job.maker.address}\n\n`;
                emails += `Items Awaiting Delivery (${pendingItems.length}):\n`;
                pendingItems.forEach((item, i) => {
                    emails += `${i + 1}. ${item.name}${item.reason ? ` (${item.reason})` : ''}\n`;
                });
                emails += `\nCould you please provide us with the expected delivery dates for these items?\n\n`;
                emails += `Best regards,\n[YOUR NAME]\nKitchen Maintenance Team\n\n`;
                emails += '='.repeat(80) + '\n\n';
            });

            document.getElementById('email-content').textContent = emails;
            document.getElementById('email-section').style.display = 'block';
            document.getElementById('email-section').scrollIntoView({ behavior: 'smooth' });
        });

        document.getElementById('copy-emails-btn').addEventListener('click', () => {
            const text = document.getElementById('email-content').textContent;
            GM_setClipboard(text);
            alert('✓ Emails copied to clipboard!');
        });

        document.getElementById('close-manager').addEventListener('click', () => {
            modal.remove();
        });

        // Initial render
        renderJobs();
        document.querySelector('.filter-btn[data-filter="all"]').classList.add('active');
    }

    // Create control panel
    function createControlPanel() {
        const existing = document.getElementById('scraper-panel');
        if (existing) existing.remove();

        const panel = document.createElement('div');
        panel.id = 'scraper-panel';
        panel.style.cssText = `
            position: fixed; top: 10px; right: 10px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; padding: 15px; border-radius: 10px;
            box-shadow: 0 8px 16px rgba(0,0,0,0.3); z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            min-width: 280px; max-width: 320px;
        `;

        const isMain = isMainPage();

        panel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <h3 style="margin: 0; font-size: 16px; font-weight: 600;">🔧 Maintenance Manager</h3>
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
                ` : `
                    <button id="scraper-extract" class="scraper-btn" style="background: #3b82f6;">
                        📄 Extract This Job
                    </button>
                    <button id="scraper-back" class="scraper-btn" style="background: #6366f1;">
                        ← Back to Job List
                    </button>
                `}

                <button id="scraper-manager" class="scraper-btn" style="background: #28a745; margin-top: 10px; border-top: 2px solid rgba(255,255,255,0.2); padding-top: 10px;">
                    📧 Job Manager
                </button>

                <button id="scraper-download" class="scraper-btn" style="background: #f59e0b;">
                    ⬇ Download CSV
                </button>

                <button id="scraper-copy" class="scraper-btn" style="background: #8b5cf6;">
                    📋 Copy to Clipboard
                </button>

                <button id="scraper-clear" class="scraper-btn" style="background: #ef4444;">
                    🗑 Clear Data
                </button>
            </div>

            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.2); font-size: 10px; opacity: 0.8; text-align: center;">
                <div id="scraper-status">Ready</div>
            </div>

            <style>
                .scraper-btn {
                    padding: 10px; border: none; color: white; border-radius: 6px;
                    cursor: pointer; font-weight: 600; font-size: 13px;
                    transition: all 0.2s; text-align: left;
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
        } else {
            document.getElementById('scraper-extract')?.addEventListener('click', saveCurrentJob);
            document.getElementById('scraper-back')?.addEventListener('click', () => {
                window.location.href = 'https://trades.kitchengroup.com.au/Trades/MyJobs_Maintenance.aspx';
            });
        }

        document.getElementById('scraper-manager')?.addEventListener('click', showJobManager);
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
        log('Initializing Kitchen Maintenance Manager');
        log('Current page:', window.location.href);
        log('Is main page:', isMainPage());

        setTimeout(createControlPanel, 1000);

        const isAutoProcessing = GM_getValue('isAutoProcessing', false);
        if (!isMainPage() && isAutoProcessing) {
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
