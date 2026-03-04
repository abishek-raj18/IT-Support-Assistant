/* ============================================================
   chatbot-logic.js – Keyword Matching & Response Engine
   ============================================================ */

/**
 * Issue categories with keywords and troubleshooting steps.
 */
const ISSUE_CATEGORIES = [
  {
    name: 'Network',
    icon: '🌐',
    keywords: ['internet', 'wifi', 'wi-fi', 'network', 'vpn', 'slow internet', 'connection', 'ethernet', 'router', 'bandwidth', 'dns', 'ip address', 'firewall', 'proxy', 'disconnected', 'no internet'],
    steps: [
      'Check your WiFi connection and make sure it is enabled.',
      'Restart your router/modem and wait 30 seconds before reconnecting.',
      'Check the Ethernet cable is securely plugged in at both ends.',
      'Verify your network settings (IP configuration, DNS, and proxy).',
      'If using VPN, try disconnecting and reconnecting to the VPN.',
      'Run the built-in network troubleshooter (Settings → Network & Internet → Troubleshoot).'
    ],
    summary: 'It sounds like you\'re experiencing a **Network** issue. Here are some troubleshooting steps:'
  },
  {
    name: 'Hardware',
    icon: '🖥️',
    keywords: ['keyboard', 'mouse', 'monitor', 'printer', 'cpu', 'hardware', 'screen', 'display', 'speaker', 'headphone', 'usb', 'webcam', 'camera', 'fan', 'overheating', 'battery', 'charger', 'laptop', 'desktop'],
    steps: [
      'Check all device cables and connections are secure.',
      'Restart your computer to reset hardware states.',
      'Disconnect and reconnect the problematic device.',
      'Update your hardware drivers via Device Manager.',
      'Try using the device on a different USB port or computer.',
      'If the issue persists, the device may need physical repair or replacement.'
    ],
    summary: 'This looks like a **Hardware** issue. Please try the following steps:'
  },
  {
    name: 'Software',
    icon: '💻',
    keywords: ['application', 'login', 'software', 'error', 'crash', 'not opening', 'freeze', 'frozen', 'update', 'install', 'uninstall', 'bug', 'virus', 'malware', 'slow', 'loading', 'password', 'permission', 'access denied', 'blue screen', 'bsod'],
    steps: [
      'Restart the application and try again.',
      'Check for and install any available software updates.',
      'Ensure your operating system is up to date (Settings → Windows Update).',
      'Clear the application cache or temporary files.',
      'Reinstall the application if the problem persists.',
      'Run a full antivirus/malware scan on your system.'
    ],
    summary: 'This appears to be a **Software** issue. Here\'s what you can try:'
  }
];

/**
 * Analyzes user input and returns a response object.
 * @param {string} userInput – The raw text from the user.
 * @returns {{ category: string|null, icon: string, summary: string, steps: string[] }}
 */
function analyzeIssue(userInput) {
  const input = userInput.toLowerCase().trim();

  // Score each category based on keyword matches
  let bestMatch = null;
  let bestScore = 0;

  for (const category of ISSUE_CATEGORIES) {
    let score = 0;
    for (const keyword of category.keywords) {
      if (input.includes(keyword)) {
        // Longer keywords get more weight to prefer specific matches
        score += keyword.length;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = category;
    }
  }

  if (bestMatch && bestScore > 0) {
    return {
      category: bestMatch.name,
      icon: bestMatch.icon,
      summary: bestMatch.summary,
      steps: bestMatch.steps
    };
  }

  // Fallback response
  return {
    category: null,
    icon: '🤔',
    summary: '',
    steps: [],
    fallback: true
  };
}

/**
 * Formats the analysis result into an HTML string for the chat bubble.
 * @param {object} result – Output from analyzeIssue().
 * @returns {string} HTML string.
 */
function formatBotResponse(result) {
  if (result.fallback) {
    return `<p>I'm unable to identify the issue from your description. Please provide more details, or contact the <strong>IT Support Team</strong> directly for assistance.</p>
<p>You can try describing your issue using keywords like <em>wifi, printer, application crash</em>, etc.</p>`;
  }

  let html = `<p>${result.summary}</p><ol>`;
  for (const step of result.steps) {
    html += `<li>${step}</li>`;
  }
  html += '</ol>';

  // Add problem solved confirmation
  html += `
<div class="solution-check">
  <span class="solution-text">Did this solve your problem?</span>
  <button class="solution-btn" onclick="issueSolved(true)">Yes 👍</button>
  <button class="solution-btn" onclick="issueSolved(false)">No 👎</button>
</div>`;

  return html;
}
