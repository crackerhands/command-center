/**
 * Command Center — Google Apps Script Notification System
 *
 * Two triggers:
 *   1. Morning digest  — runs daily at 8:00 AM, sends a task summary email
 *   2. Nightly prompt  — runs daily at 9:00 PM, sends a reminder to plan tomorrow
 *
 * SETUP (one-time, ~5 minutes):
 *   1. Go to script.google.com → New project → paste this entire file
 *   2. Click "Save" (floppy disk icon) and give the project a name
 *   3. Run setupTriggers() once: click the function dropdown → select
 *      "setupTriggers" → click Run → approve permissions when prompted
 *   4. Done. Triggers are now installed and will fire automatically every day.
 *
 * To update your planner URL or email, change the CONFIG values below.
 * To remove triggers, run removeTriggers().
 */

// ─── CONFIG ────────────────────────────────────────────────────────────────
const CONFIG = {
  plannerUrl:    'https://crackerhands.github.io/command-center/',
  emailTo:       Session.getActiveUser().getEmail(), // your Gmail address automatically
  morningHour:   8,   // 8 AM local time
  eveningHour:   21,  // 9 PM local time
  timezone:      'America/Chicago' // change to your timezone if needed
};
// ───────────────────────────────────────────────────────────────────────────


/**
 * MORNING DIGEST
 * Reads your planner tasks from Google Drive backup (if available),
 * then sends a summary email with a direct link to open the planner.
 *
 * Since the planner uses localStorage (browser-only), the email contains
 * a direct link. For full task syncing across devices, the script also
 * supports an optional Google Sheet integration (see syncToSheet below).
 */
function sendMorningDigest() {
  const today = Utilities.formatDate(new Date(), CONFIG.timezone, 'EEEE, MMMM d');
  const plannerLink = CONFIG.plannerUrl;

  // Try to read tasks from Sheet backup (optional — only if syncToSheet is set up)
  let taskSummary = '';
  try {
    taskSummary = getTaskSummaryFromSheet();
  } catch(e) {
    // Sheet not set up — send generic prompt
    taskSummary = '';
  }

  const subject = '\u2600\ufe0f Good morning — ' + today;

  let body = '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', sans-serif; max-width: 520px; margin: 0 auto; color: #1a1a1a;">';
  body += '<h2 style="font-size: 22px; font-weight: 700; margin: 0 0 4px;">Good morning \u2600\ufe0f</h2>';
  body += '<p style="color: #888; font-size: 14px; margin: 0 0 24px;">' + today + '</p>';

  if (taskSummary) {
    body += taskSummary;
  } else {
    body += '<p style="font-size: 15px; line-height: 1.6; margin: 0 0 20px;">Time to check your Command Center and see what\'s on today\'s list.</p>';
  }

  body += '<a href="' + plannerLink + '" style="display: inline-block; background: #c8b87e; color: #111; font-weight: 700; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-size: 15px; margin-top: 8px;">Open Command Center \u2192</a>';
  body += '<p style="font-size: 12px; color: #bbb; margin-top: 32px;">This reminder is sent every morning at 8 AM. <a href="' + plannerLink + '" style="color: #bbb;">Manage</a></p>';
  body += '</div>';

  GmailApp.sendEmail(CONFIG.emailTo, subject, '', { htmlBody: body });
}


/**
 * NIGHTLY PLANNING PROMPT
 * Sent at 9 PM to prompt the daily shutdown ritual:
 * review what happened today, plan tomorrow's tasks.
 */
function sendNightlyPrompt() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = Utilities.formatDate(tomorrow, CONFIG.timezone, 'EEEE, MMMM d');
  const plannerLink = CONFIG.plannerUrl;

  const subject = '\ud83c\udf19 Plan tomorrow before you sleep — ' + tomorrowStr;

  let body = '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', sans-serif; max-width: 520px; margin: 0 auto; color: #1a1a1a;">';
  body += '<h2 style="font-size: 22px; font-weight: 700; margin: 0 0 4px;">Nightly shutdown \ud83c\udf19</h2>';
  body += '<p style="color: #888; font-size: 14px; margin: 0 0 24px;">Planning for ' + tomorrowStr + '</p>';
  body += '<p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px;">Before you close out for the night, take 2 minutes to:</p>';
  body += '<ul style="font-size: 15px; line-height: 2; padding-left: 20px; margin: 0 0 20px;">';
  body += '<li>Check off anything you completed today</li>';
  body += '<li>Add tasks you thought of but haven\'t captured yet</li>';
  body += '<li>Set dates on anything due this week</li>';
  body += '<li>Look at tomorrow\'s list so there are no surprises</li>';
  body += '</ul>';
  body += '<a href="' + plannerLink + '" style="display: inline-block; background: #a07cd8; color: #fff; font-weight: 700; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-size: 15px; margin-top: 8px;">Open Command Center \u2192</a>';
  body += '<p style="font-size: 12px; color: #bbb; margin-top: 32px;">This reminder is sent every evening at 9 PM.</p>';
  body += '</div>';

  GmailApp.sendEmail(CONFIG.emailTo, subject, '', { htmlBody: body });
}


/**
 * OPTIONAL: Sync tasks from the planner to a Google Sheet for cross-device backup.
 *
 * How to use:
 *   1. Create a Google Sheet and paste its ID into SHEET_ID below
 *   2. In the planner, export tasks (add an Export button or use browser console:
 *        copy(localStorage.getItem('command-center-tasks'))
 *   3. Paste the JSON into cell A1 of the sheet
 *   4. The morning email will then include a task breakdown
 *
 * SHEET_ID is the long string in the Google Sheet URL:
 *   https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit
 */
const SHEET_ID = ''; // paste your Sheet ID here to enable task summaries in email

function getTaskSummaryFromSheet() {
  if (!SHEET_ID) return '';

  const sheet = SpreadsheetApp.openById(SHEET_ID).getActiveSheet();
  const raw = sheet.getRange('A1').getValue();
  if (!raw) return '';

  const tasks = JSON.parse(raw);
  const todayStr = Utilities.formatDate(new Date(), CONFIG.timezone, 'yyyy-MM-dd');

  const todayTasks   = tasks.filter(t => !t.done && t.date === todayStr);
  const overdueTasks = tasks.filter(t => !t.done && t.date && t.date < todayStr);
  const somedayCount = tasks.filter(t => !t.done && !t.date).length;

  if (!todayTasks.length && !overdueTasks.length) return '';

  let html = '';

  if (overdueTasks.length > 0) {
    html += '<div style="background: #fff1f0; border-left: 4px solid #e05c4b; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px;">';
    html += '<p style="font-weight: 700; color: #e05c4b; margin: 0 0 8px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">\u26a0\ufe0f Overdue (' + overdueTasks.length + ')</p>';
    overdueTasks.slice(0, 5).forEach(t => {
      html += '<p style="margin: 4px 0; font-size: 14px;">\u2022 ' + escapeHtml(t.title) + '</p>';
    });
    if (overdueTasks.length > 5) html += '<p style="margin: 4px 0; font-size: 13px; color: #888;">+ ' + (overdueTasks.length - 5) + ' more</p>';
    html += '</div>';
  }

  if (todayTasks.length > 0) {
    html += '<div style="background: #fffbf0; border-left: 4px solid #c8b87e; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px;">';
    html += '<p style="font-weight: 700; color: #9a8a50; margin: 0 0 8px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">\u2605 Today (' + todayTasks.length + ')</p>';
    todayTasks.forEach(t => {
      const time = t.time ? ' <span style="color:#888; font-size:12px;">' + formatTime(t.time) + '</span>' : '';
      html += '<p style="margin: 4px 0; font-size: 14px;">\u2022 ' + escapeHtml(t.title) + time + '</p>';
    });
    html += '</div>';
  }

  if (somedayCount > 0) {
    html += '<p style="font-size: 13px; color: #aaa; margin: 0 0 20px;">' + somedayCount + ' item' + (somedayCount !== 1 ? 's' : '') + ' in your Someday backlog</p>';
  }

  return html;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatTime(t) {
  if (!t) return '';
  var parts = t.split(':').map(Number);
  var h = parts[0], m = parts[1];
  var ampm = h >= 12 ? 'PM' : 'AM';
  return ((h % 12) || 12) + ':' + String(m).padStart(2,'0') + ' ' + ampm;
}


/**
 * TRIGGER SETUP — run this once to install the daily triggers
 */
function setupTriggers() {
  // Remove any existing Command Center triggers first (prevents duplicates)
  removeTriggers();

  // Morning digest at 8 AM
  ScriptApp.newTrigger('sendMorningDigest')
    .timeBased()
    .everyDays(1)
    .atHour(CONFIG.morningHour)
    .create();

  // Nightly planning prompt at 9 PM
  ScriptApp.newTrigger('sendNightlyPrompt')
    .timeBased()
    .everyDays(1)
    .atHour(CONFIG.eveningHour)
    .create();

  Logger.log('Triggers installed. Morning digest at ' + CONFIG.morningHour + ':00, nightly prompt at ' + CONFIG.eveningHour + ':00.');
}

function removeTriggers() {
  ScriptApp.getProjectTriggers().forEach(trigger => {
    const fn = trigger.getHandlerFunction();
    if (fn === 'sendMorningDigest' || fn === 'sendNightlyPrompt') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

/**
 * Test: run these manually to preview emails before triggers go live.
 */
function testMorning() { sendMorningDigest(); }
function testNightly()  { sendNightlyPrompt(); }
