// ==UserScript==
// @name         Kitchen Maintenance - Supabase Sync
// @namespace    http://tampermonkey.net/
// @version      4.2
// @description  Scrape maintenance jobs and sync to Supabase database
// @author       TPB Kitchens
// @match        https://trades.kitchengroup.com.au/Trades/MyJobs_Maintenance.aspx*
// @match        https://trades.kitchengroup.com.au/Trades/MyJobs.aspx?JobNumber=*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @connect      ugqahhbopqkhbyozsbfo.supabase.co
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/Trevo88423/kitchen-maintenance-scraper/main/kitchen-portal-to-supabase.user.js
// @downloadURL  https://raw.githubusercontent.com/Trevo88423/kitchen-maintenance-scraper/main/kitchen-portal-to-supabase.user.js
// ==/UserScript==

(function() {
    'use strict';

    // Supabase Configuration
    const SUPABASE_URL = 'https://ugqahhbopqkhbyozsbfo.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVncWFoaGJvcHFraGJ5b3pzYmZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MjU5NzgsImV4cCI6MjA3NzMwMTk3OH0.bc6fC0wCQACyfCf78BwdUO8eNNG2vSW6XozBH4lXpNo';

    // Configuration
    const CONFIG = {
        processDelay: 3000,
        debugMode: true
    };

    // Data storage
    let jobLinks = [];
    let currentJobIndex = 0;
    let isProcessing = false;
    let processedCount = 0;

    function log(...args) {
        if (CONFIG.debugMode) console.log('[Kitchen Sync]', ...args);
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function isMainPage() {
        return window.location.href.includes('MyJobs_Maintenance.aspx');
    }

    // Supabase API call
    async function supabaseRequest(endpoint, method = 'GET', body = null) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: method,
                url: `${SUPABASE_URL}/rest/v1/${endpoint}`,
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                data: body ? JSON.stringify(body) : null,
                onload: function(response) {
                    if (response.status >= 200 && response.status < 300) {
                        resolve(response.responseText ? JSON.parse(response.responseText) : null);
                    } else {
                        reject(new Error(`API Error: ${response.status} - ${response.responseText}`));
                    }
                },
                onerror: function(error) {
                    reject(error);
                }
            });
        });
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
                    url: jobLink.href
                });
            }
        });

        log('Found job links:', links);
        return links;
    }

    // Extract job details from detail page
    function extractJobDetails() {
        log('=== EXTRACTING JOB DETAILS ===');
        const pageText = document.body.textContent;
        log('Page text length:', pageText.length);

        const nameMatch = pageText.match(/Name:\s*([^\n]+)/);
        const jobMatch = pageText.match(/Job Number:\s*(\w+\d+)/);
        const mobileMatch = pageText.match(/Mobile:\s*([\d\s]+)/);
        const emailMatch = pageText.match(/Email:\s*([\w.-]+@[\w.-]+\.\w+)/);
        const addressMatch = pageText.match(/Site Address:\s*([^\n]+(?:\n[^\n]+)?)/);

        log('Name match:', nameMatch);
        log('Job match:', jobMatch);
        log('Mobile match:', mobileMatch);
        log('Email match:', emailMatch);
        log('Address match:', addressMatch);

        let suburb = '';
        let address = '';
        if (addressMatch) {
            address = addressMatch[1].trim().replace(/\s+/g, ' ');
            const suburbMatch = address.match(/([A-Z\s]+),\s*[A-Z]+,\s*\d+/);
            if (suburbMatch) suburb = suburbMatch[1].trim();
        }

        log('Extracting maintenance items...');
        const items = extractMaintenanceItems();

        const details = {
            job_number: jobMatch ? jobMatch[1].trim() : '',
            client_name: nameMatch ? nameMatch[1].trim() : '',
            mobile: mobileMatch ? mobileMatch[1].trim() : '',
            email: emailMatch ? emailMatch[1].trim() : '',
            site_address: address,
            suburb: suburb,
            items: items
        };

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

        if (!maintenanceTable) return items;

        const rows = maintenanceTable.querySelectorAll('tr');

        rows.forEach((row) => {
            if (row.querySelectorAll('th').length > 0) return;

            const cells = row.querySelectorAll('td');
            if (cells.length >= 5) {
                const itemName = cells[1]?.textContent.trim() || '';
                const deliveryInfo = cells[4]?.textContent.trim() || '';

                if (itemName && !itemName.includes('Select')) {
                    // Check if delivered (has "Despatched On:" text)
                    const isDelivered = deliveryInfo.includes('Despatched');

                    // Extract delivery date if present
                    let deliveryDate = null;
                    const dateMatch = deliveryInfo.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
                    if (dateMatch) {
                        // Convert DD/MM/YYYY to YYYY-MM-DD for database
                        const parts = dateMatch[1].split('/');
                        deliveryDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                    }

                    items.push({
                        item_name: itemName,
                        reason: cells[2]?.textContent.trim() || '',
                        date_created: cells[3]?.textContent.trim() || '',
                        delivery_info: deliveryInfo,
                        delivery_date: deliveryDate,
                        is_delivered: isDelivered
                    });
                }
            }
        });

        log('Found maintenance items:', items);
        return items;
    }

    // Save job to Supabase
    async function saveJobToSupabase(jobData) {
        try {
            log('Saving job to Supabase:', jobData.job_number);

            // First, check if job already exists
            const existingJobs = await supabaseRequest(
                `kitchen_maintenance_jobs?job_number=eq.${jobData.job_number}&select=id`
            );

            let jobId;

            if (existingJobs && existingJobs.length > 0) {
                // Update existing job
                jobId = existingJobs[0].id;
                await supabaseRequest(
                    `kitchen_maintenance_jobs?id=eq.${jobId}`,
                    'PATCH',
                    {
                        client_name: jobData.client_name,
                        mobile: jobData.mobile,
                        email: jobData.email,
                        site_address: jobData.site_address,
                        suburb: jobData.suburb,
                        processed_at: new Date().toISOString()
                    }
                );
                log('Updated existing job:', jobId);

                // Delete old items
                await supabaseRequest(
                    `kitchen_maintenance_items?kitchen_maintenance_job_id=eq.${jobId}`,
                    'DELETE'
                );
            } else {
                // Create new job
                const newJob = await supabaseRequest(
                    'kitchen_maintenance_jobs',
                    'POST',
                    {
                        job_number: jobData.job_number,
                        client_name: jobData.client_name,
                        mobile: jobData.mobile,
                        email: jobData.email,
                        site_address: jobData.site_address,
                        suburb: jobData.suburb,
                        processed_at: new Date().toISOString()
                    }
                );
                jobId = newJob[0].id;
                log('Created new job:', jobId);
            }

            // Insert items
            if (jobData.items && jobData.items.length > 0) {
                const itemsToInsert = jobData.items.map(item => ({
                    kitchen_maintenance_job_id: jobId,
                    ...item
                }));

                await supabaseRequest(
                    'kitchen_maintenance_items',
                    'POST',
                    itemsToInsert
                );
                log('Inserted items:', itemsToInsert.length);
            }

            return true;
        } catch (error) {
            log('Error saving to Supabase:', error);
            alert('Error saving job: ' + error.message);
            return false;
        }
    }

    // Show job summary popup
    function showJobSummary(jobData) {
        const itemsDelivered = jobData.items.filter(item => item.is_delivered).length;
        const totalItems = jobData.items.length;
        const status = totalItems === 0 ? 'No Items' :
                      itemsDelivered === totalItems ? '✓ All Delivered' :
                      `⏳ ${itemsDelivered}/${totalItems} Delivered`;

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
            <h2 style="margin: 0 0 20px 0; color: #667eea; font-size: 22px;">Job Synced</h2>
            <div style="background: #f7f7f7; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <div style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">
                    ${jobData.client_name}
                </div>
                <div style="font-size: 14px; color: #666; margin-bottom: 10px;">
                    ${jobData.job_number} - ${jobData.suburb || 'Unknown'}
                </div>
                <div style="font-size: 24px; font-weight: bold; color: ${itemsDelivered === totalItems ? '#28a745' : '#ffc107'};">
                    ${status}
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
        processedCount = 0;

        if (jobLinks.length === 0) {
            alert('No jobs found in the table.');
            isProcessing = false;
            return;
        }

        const confirmMsg = `Found ${jobLinks.length} jobs. Sync to database?\n\nThis will:\n1. Open each job\n2. Extract data\n3. Save to Supabase\n\nEstimated time: ${Math.ceil(jobLinks.length * CONFIG.processDelay / 1000 / 60)} minutes`;

        if (!confirm(confirmMsg)) {
            isProcessing = false;
            return;
        }

        GM_setValue('jobLinks', jobLinks);
        GM_setValue('currentJobIndex', 0);
        GM_setValue('isAutoProcessing', true);
        GM_setValue('processedCount', 0);

        window.location.href = jobLinks[0].url;
    }

    // Continue auto-processing
    async function continueAutoProcessing() {
        log('=== CONTINUE AUTO PROCESSING ===');
        const jobLinks = GM_getValue('jobLinks', []);
        const currentIndex = GM_getValue('currentJobIndex', 0);
        processedCount = GM_getValue('processedCount', 0);

        log('Job Links:', jobLinks);
        log('Current Index:', currentIndex);
        log('Processed Count:', processedCount);

        if (jobLinks.length === 0 || currentIndex >= jobLinks.length) {
            log('Processing complete or no jobs found');
            GM_setValue('isAutoProcessing', false);
            GM_setValue('jobLinks', []);
            GM_setValue('currentJobIndex', 0);
            GM_setValue('processedCount', 0);
            alert(`✓ Sync complete!\n\nProcessed ${processedCount} jobs\n\nView them in your web app!`);
            window.location.href = 'https://trades.kitchengroup.com.au/Trades/MyJobs_Maintenance.aspx';
            return;
        }

        log('Extracting job details from current page...');
        const jobData = extractJobDetails();
        log('Extracted job data:', jobData);

        log('Saving to Supabase...');
        const saved = await saveJobToSupabase(jobData);
        log('Save result:', saved);

        if (saved) {
            processedCount++;
            GM_setValue('processedCount', processedCount);
            log('Showing job summary...');
            await showJobSummary(jobData);
        }

        const nextIndex = currentIndex + 1;
        GM_setValue('currentJobIndex', nextIndex);

        if (nextIndex < jobLinks.length) {
            log(`Moving to next job: ${nextIndex + 1}/${jobLinks.length}`);
            log('Next URL:', jobLinks[nextIndex].url);
            updateUI(`Syncing ${nextIndex + 1}/${jobLinks.length}...`);
            await sleep(1000); // Small delay before navigation
            window.location.href = jobLinks[nextIndex].url;
        } else {
            log('All jobs processed!');
            GM_setValue('isAutoProcessing', false);
            alert(`✓ Sync complete!\n\nProcessed ${processedCount} jobs\n\nView them in your web app!`);
            window.location.href = 'https://trades.kitchengroup.com.au/Trades/MyJobs_Maintenance.aspx';
        }
    }

    // Extract and save single job
    async function extractAndSaveCurrentJob() {
        const jobData = extractJobDetails();
        const saved = await saveJobToSupabase(jobData);

        if (saved) {
            await showJobSummary(jobData);
            alert('✓ Job synced to database!');
        }
    }

    // Create control panel
    function createControlPanel() {
        const existing = document.getElementById('sync-panel');
        if (existing) existing.remove();

        const panel = document.createElement('div');
        panel.id = 'sync-panel';
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
                <h3 style="margin: 0; font-size: 16px; font-weight: 600;">☁️ Database Sync</h3>
                <button id="sync-close" style="background: rgba(255,255,255,0.2); border: none; color: white; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; font-size: 16px; line-height: 1;">×</button>
            </div>

            <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 6px; margin-bottom: 12px;">
                <div style="font-size: 12px; opacity: 0.9;">Status:</div>
                <div id="sync-status" style="font-size: 14px; font-weight: bold;">Ready</div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 8px;">
                ${isMain ? `
                    <button id="sync-all-btn" class="sync-btn" style="background: #10b981;">
                        ☁️ Sync All Jobs
                    </button>
                    <button id="open-app-btn" class="sync-btn" style="background: #3b82f6;">
                        📱 Open Web App
                    </button>
                ` : `
                    <button id="sync-current-btn" class="sync-btn" style="background: #3b82f6;">
                        ☁️ Sync This Job
                    </button>
                    <button id="sync-back-btn" class="sync-btn" style="background: #6366f1;">
                        ← Back to List
                    </button>
                `}
            </div>

            <style>
                .sync-btn {
                    padding: 10px; border: none; color: white; border-radius: 6px;
                    cursor: pointer; font-weight: 600; font-size: 13px;
                    transition: all 0.2s; text-align: left;
                }
                .sync-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
                }
                .sync-btn:active {
                    transform: translateY(0);
                }
            </style>
        `;

        document.body.appendChild(panel);

        // Event listeners
        document.getElementById('sync-close')?.addEventListener('click', () => {
            panel.style.display = 'none';
        });

        if (isMain) {
            document.getElementById('sync-all-btn')?.addEventListener('click', autoProcessAllJobs);
            document.getElementById('open-app-btn')?.addEventListener('click', () => {
                window.open('https://your-app-url.vercel.app/maintenance', '_blank');
            });
        } else {
            document.getElementById('sync-current-btn')?.addEventListener('click', extractAndSaveCurrentJob);
            document.getElementById('sync-back-btn')?.addEventListener('click', () => {
                window.location.href = 'https://trades.kitchengroup.com.au/Trades/MyJobs_Maintenance.aspx';
            });
        }
    }

    // Update UI
    function updateUI(status = 'Ready') {
        const statusEl = document.getElementById('sync-status');
        if (statusEl) statusEl.textContent = status;
    }

    // Initialize
    function init() {
        log('=== INITIALIZATION ===');
        log('Initializing Supabase Sync');
        log('Current page:', window.location.href);
        log('Is main page?', isMainPage());

        setTimeout(createControlPanel, 1000);

        const isAutoProcessing = GM_getValue('isAutoProcessing', false);
        log('Is auto-processing active?', isAutoProcessing);

        if (!isMainPage() && isAutoProcessing) {
            log('On detail page with auto-processing active - will start in 2 seconds');
            setTimeout(() => {
                log('Starting auto-processing continuation...');
                continueAutoProcessing();
            }, 2000);
        } else if (!isMainPage() && !isAutoProcessing) {
            log('On detail page but auto-processing not active');
        } else if (isMainPage() && isAutoProcessing) {
            log('On main page with auto-processing active - this should not happen');
        } else {
            log('On main page, waiting for user action');
        }
    }

    // Start when page is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
