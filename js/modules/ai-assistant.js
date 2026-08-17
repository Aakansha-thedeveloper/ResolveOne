(function () {
  'use strict';

  var API_BASE = 'http://localhost:8000';

  var state = {
    flow: 'idle',
    currentStep: 1,
    formData: {},
    selectedSolution: null,
    issueResolved: false,
    awaitingChoice: false,
    isProcessing: false,
    clarificationCount: 0,
    steps: {
      2: { status: 'pending' },
      3: { status: 'pending' },
      4: { status: 'pending' },
      5: { status: 'pending' },
      6: { status: 'pending' }
    }
  };

  var els = {};

  function qs(s, c) { return (c || document).querySelector(s); }
  function qsa(s, c) { return (c || document).querySelectorAll(s); }

  function init() {
    cacheEls();
    bindEvents();
    updateStepUI(1);
    resetConversation();
    state.flow = 'idle';
  }

  function cacheEls() {
    els.messages = qs('[data-messages]');
    els.input = qs('[data-conversation-input]');
    els.sendBtn = qs('[data-send-btn]');
    els.attachBtn = qs('[data-attach-btn]');
    els.voiceBtn = qs('[data-voice-btn]');
    els.suggested = qs('[data-suggested-chips]');
    els.clearBtn = qs('[data-clear-conversation]');
    els.scrollArea = qs('[data-conversation-scroll]');
    els.conversation = qs('[data-conversation]');
    els.progressItems = qsa('.step-progress-item');
    els.progressLines = qsa('.step-progress-line');
    els.navToggle = qs('[data-nav-toggle]');
    els.navLinks = qs('[data-nav-links]');
  }

  function bindEvents() {
    if (els.sendBtn) els.sendBtn.addEventListener('click', handleSend);
    if (els.input) {
      els.input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') handleSend();
      });
      els.input.addEventListener('paste', function (e) {
        var text = (e.clipboardData || window.clipboardData).getData('text');
        if (text) {
          var start = this.selectionStart;
          var end = this.selectionEnd;
          var before = this.value.substring(0, start);
          var after = this.value.substring(end);
          this.value = before + text + after;
          this.selectionStart = this.selectionEnd = start + text.length;
        }
        e.preventDefault();
      });
      els.input.addEventListener('copy', function (e) {});
      els.input.addEventListener('cut', function (e) {});
    }
    if (els.attachBtn) els.attachBtn.addEventListener('click', triggerFileUpload);
    if (els.voiceBtn) els.voiceBtn.addEventListener('click', handleVoice);
    if (els.suggested) els.suggested.addEventListener('click', function (e) {
      var chip = e.target.closest('[data-chip]');
      if (chip) sendMessage(chip.getAttribute('data-chip'));
    });
    if (els.clearBtn) els.clearBtn.addEventListener('click', resetConversation);
    if (els.navToggle && els.navLinks) {
      els.navToggle.addEventListener('click', function () {
        var open = els.navLinks.classList.toggle('open');
        els.navToggle.setAttribute('aria-expanded', open);
      });
    }
    els.progressItems.forEach(function (item) {
      item.addEventListener('click', function () {
        var step = parseInt(item.getAttribute('data-step'), 10);
        if (step < state.currentStep) {
          addMessage('ai', 'You can review step ' + step + ' above, but the current active workflow is at step ' + state.currentStep + '. Would you like to restart?');
          addChoices(['Restart workflow'], function () { resetConversation(); });
        }
      });
    });
  }

  function handleSend() {
    if (state.isProcessing || state.awaitingChoice) return;
    var text = els.input.value.trim();
    if (!text) return;
    sendMessage(text);
  }

  function sendMessage(text) {
    els.input.value = '';
    hideSuggested();
    addMessage('user', text);



    processFlow(text);
  }

  function processFlow(input) {
    switch (state.flow) {
      case 'idle':
        state.formData.issue = input;
        startInfoCollection();
        break;
      case 'collecting_info':
        processInfoCollection(input);
        break;
      case 'awaiting_feedback_resolve':
        if (input.toLowerCase().includes('yes') || input.toLowerCase().includes('solved') || input.toLowerCase().includes('fixed')) {
          handleResolved();
        } else {
          handleNotResolved();
        }
        break;
      default:
        if (window.AIService) {
          window.AIService.sendMessage(input).then(function (r) { addMessage('ai', r.text); });
        } else {
          addMessage('ai', 'Thanks for the information. Let me process that and continue.');
        }
        break;
    }
  }

  function inferDepartment(text) {
    var t = text.toLowerCase();
    if (/vpn|network|connect|gateway|dns|wifi|internet|connectivity/.test(t)) return 'Network & VPN';
    if (/email|outlook|exchange|mail|sync/.test(t)) return 'Email & Collaboration';
    if (/sap|oracle|finance|invoice|quickbooks|erp|payroll/.test(t)) return 'Finance Systems';
    if (/laptop|computer|monitor|keyboard|mouse|hardware|boot|screen|printer/.test(t)) return 'Hardware';
    if (/access|permission|drive|sharepoint|onedrive|share|folder/.test(t)) return 'IT Support';
    if (/password|login|auth|mfa|2fa|account|locked|authenticator/.test(t)) return 'Security & Access';
    if (/software|app|application|install|crash|error|update|license/.test(t)) return 'Software / Applications';
    if (/hr|people|employee|attendance|leave|hiring|onboard/.test(t)) return 'HR Systems';
    if (/facilities|office|door|badge|ac|heating|cleaning|desk/.test(t)) return 'Facilities';
    return null;
  }

  function getFirstName() {
    try {
      var raw = localStorage.getItem('resolveone_profile');
      if (raw) {
        var data = JSON.parse(raw);
        if (data && data.name) return data.name.trim().split(' ')[0];
      }
    } catch (e) {}
    try {
      var raw = localStorage.getItem('rs_session_v2');
      if (raw) {
        var data = JSON.parse(raw);
        var u = data.user || {};
        var name = u.full_name || u.name || u.email || '';
        if (name) return name.trim().split(' ')[0];
      }
    } catch (e) {}
    return null;
  }

  function sessionInitials() {
    try {
      var raw = localStorage.getItem('rs_session_v2');
      if (raw) {
        var u = (JSON.parse(raw).user) || {};
        var name = u.full_name || u.name || u.email || '';
        var parts = name.trim().split(/\s+/);
        if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        if (name) return name.slice(0, 2).toUpperCase();
      }
    } catch (e) {}
    return null;
  }

  function startInfoCollection() {
    state.isProcessing = true;
    disableInput();

    addMessage('ai', 'Thanks! Let me gather some information about your issue.');

    var questionsPrompt = 'You are an IT support technician gathering information. Ask 1-3 brief questions to clarify the issue. Do NOT analyze or diagnose - just ask questions.\n\nIssue: ' + state.formData.issue;

    var cb = function (response) {
      showTyping(function () {
        addMessage('ai', response);
        state.clarificationCount = 0;
        state.flow = 'collecting_info';
        state.isProcessing = false;
        enableInput();
      });
    };
    if (window.AIService) {
      window.AIService.sendMessage(questionsPrompt).then(function (r) { cb(r.text); });
    } else {
      cb('I see you\'re having an issue. Could you tell me:\n\n1. When did this problem first start?\n2. Are there any error messages you\'re seeing?\n3. Does this affect just you or multiple people?');
    }
  }

  function processInfoCollection(input) {
    state.clarificationCount++;
    state.isProcessing = true;
    disableInput();

    var proceedToAnalysis = function () {
      doAnalysis(input);
    };

    var askFollowUp = function () {
      var followUpPrompt = 'Issue: ' + state.formData.issue + '\nAdditional information: ' + input + '\n\nThe information is not sufficient. Ask ONE more specific follow-up question. Do NOT analyze or diagnose.';
      window.AIService.sendMessage(followUpPrompt).then(function (r) {
        showTyping(function () {
          addMessage('ai', r.text);
          state.flow = 'collecting_info';
          state.isProcessing = false;
          enableInput();
        });
      });
    };

    if (window.AIService) {
      var evalPrompt = 'Issue: ' + state.formData.issue + '\nAdditional information: ' + input + '\n\nBased on the above, is there enough information to diagnose the problem? Reply with only: SUFFICIENT or NEED_MORE';
      window.AIService.sendMessage(evalPrompt).then(function (r) {
        var needsMore = r.text.trim().toUpperCase().indexOf('NEED_MORE') !== -1;
        if (needsMore && state.clarificationCount < 2) {
          askFollowUp();
        } else {
          proceedToAnalysis();
        }
      }, function () {
        proceedToAnalysis();
      });
    } else {
      proceedToAnalysis();
    }
  }

  function doAnalysis(input) {
    state.isProcessing = true;
    disableInput();
    advanceStep(2);

    addMessage('ai', 'I\'m analysing your issue now...');

    var statuses = [
      { text: 'Analysing issue...', icon: 'loading' },
      { text: 'Searching knowledge base...', icon: 'loading' },
      { text: 'Comparing 31,000 tickets...', icon: 'loading' },
      { text: 'Finding similar incidents...', icon: 'loading' },
      { text: 'Ranking confidence...', icon: 'loading' },
      { text: 'Preparing recommendations...', icon: 'loading' }
    ];

    showStatusSequence(statuses, function () {
      var analysisPrompt = 'Analyze this IT support issue and describe the category, likely cause, affected systems, and estimated resolution time.\n\nIssue: ' + state.formData.issue + '\nDetails: ' + input;
      var cb = function (analysisData) {
        showTyping(function () {
          if (!analysisData) {
            var fallbackCategory = inferDepartment(state.formData.issue) || 'IT Support';
            analysisData = {
              category: fallbackCategory,
              confidence: 75,
              possible_cause: 'Issue under investigation based on your description of: ' + state.formData.issue,
              affected_systems: 'System reported by user',
              estimated_resolution: 'Under investigation'
            };
          }
          showAnalysisResults(analysisData);
        });
      };
      if (window.AIService) {
        window.AIService.sendMessage(analysisPrompt).then(function (r) { cb(r.analysis); });
      } else {
        cb(null);
      }
    });
  }

  function escHtml(str) {
    if (str == null) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function showAnalysisResults(analysisData) {
    var data = analysisData || {};
    state.formData.analysis = data;

    var analysisHTML = '';
    analysisHTML += '<div class="conv-analysis-card compact">';
    analysisHTML += '<div class="conv-analysis-header">';
    analysisHTML += '<div class="conv-analysis-icon"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></div>';
    analysisHTML += '<span class="conv-analysis-title">AI Analysis Report</span>';
    analysisHTML += '</div>';
    analysisHTML += '<div class="conv-analysis-grid">';
    analysisHTML += '<div class="conv-analysis-item"><span class="conv-analysis-label">Detected Category</span><span class="conv-analysis-value">' + escHtml(data.category || 'General') + '</span></div>';
    analysisHTML += '<div class="conv-analysis-item"><span class="conv-analysis-label">Confidence</span><span class="conv-analysis-value">' + (data.confidence != null ? escHtml(String(data.confidence) + '%') : 'N/A') + '</span></div>';
    analysisHTML += '<div class="conv-analysis-item conv-analysis-full"><span class="conv-analysis-label">Possible Cause</span><span class="conv-analysis-value">' + escHtml(data.possible_cause || 'Analysis in progress') + '</span></div>';
    analysisHTML += '<div class="conv-analysis-item"><span class="conv-analysis-label">Affected Systems</span><span class="conv-analysis-value">' + escHtml(data.affected_systems || 'N/A') + '</span></div>';
    analysisHTML += '<div class="conv-analysis-item"><span class="conv-analysis-label">Est. Resolution</span><span class="conv-analysis-value">' + escHtml(data.estimated_resolution || 'TBD') + '</span></div>';
    analysisHTML += '</div></div>';

    addCustomMessage('ai', analysisHTML, 'html');

    addMessage('ai', 'Analysis complete. I\'ve identified the most likely cause of your issue.');
    state.flow = 'awaiting_continue_after_analysis';
    state.isProcessing = false;
    addChoices(['View Similar Cases â†’'], function () {
      handleContinueAfterAnalysis();
    });
  }

  function handleContinueAfterAnalysis() {
    advanceStep(3);
    state.isProcessing = true;
    disableInput();
    addMessage('ai', 'Searching for similar incidents...');
    showTyping(function () {
      showSimilarIssues();
    });
  }

  function showSimilarIssues() {

    addSimilarCard('RSV-9812', '98% match', 'VPN connection timeout on remote gateway', 'Engineering', '23 min', 'VPN tunnel dropped due to expired certificate on gateway. Re-issued certificate and updated VPN client configuration.');
    addSimilarCard('RSV-8743', '92% match', 'VPN authentication failure after password reset', 'Design', '18 min', 'AD credentials not synced to VPN LDAP. Forced sync and cleared cached credentials.');
    addSimilarCard('RSV-7901', '85% match', 'Intermittent VPN disconnects on MacOS client', 'Marketing', '35 min', 'Known issue with VPN client v3.2 on MacOS Sonoma. Rolled back to v3.1 and stabilised connection.');

    addMessage('ai', 'I found several previously resolved incidents that closely match your issue.');
    state.flow = 'awaiting_continue_after_similar';
    state.isProcessing = false;
    addChoices(['See Recommended Solutions â†’'], function () {
      handleContinueAfterSimilar();
    });
  }

  function handleContinueAfterSimilar() {
    advanceStep(4);
    state.isProcessing = true;
    disableInput();
    showTyping(function () {
      showSolutions();
    });
  }

  function generateSolutions() {
    var cat = (state.formData.analysis && state.formData.analysis.category) || inferDepartment(state.formData.issue) || 'IT Support';

    var TEMPLATES = {
      'Network & VPN': [
        { recommended: true, title: 'Regenerate VPN certificate and reconfigure client', problemSummary: 'VPN tunnel configuration mismatch causing authentication handshake failure at the gateway.', whyRecommended: 'Certificate expiration or misconfiguration is the most common cause of VPN authentication failures. This solution directly addresses the root cause.', steps: ['Disconnect the current VPN session completely.', 'Open your VPN client (Cisco AnyConnect, GlobalProtect, etc.).', 'Navigate to the settings or preferences section.', 'Clear all cached credentials and saved certificates.', 'Request a new VPN client certificate from the IT certificate authority.', 'Install the renewed certificate on your device.', 'Update the VPN client configuration with the renewed certificate details.', 'Reconnect to the VPN gateway using the new credentials.', 'Verify connection stability by accessing internal network resources.'], expectedOutcome: 'You should now be able to connect to the VPN successfully without authentication errors or timeouts.', success: '94%', difficulty: 'Easy', time: '~25 min', confidence: 'Very High', commonMistakes: 'Using an expired certificate; skipping certificate cache clearing before requesting a new one', additionalNotes: 'If the issue persists after renewal, verify the VPN gateway certificate has not also expired. Contact the network team if needed.' },
        { recommended: false, title: 'Force LDAP/AD credential sync and clear VPN cache', problemSummary: 'AD credentials not synchronised to VPN LDAP directory causing authentication failure.', whyRecommended: 'Credential sync issues can occur after password changes. This is a quick fix that resolves most sync-related authentication failures.', steps: ['Open a command prompt as administrator.', 'Run the command: klist purge to clear cached Kerberos tickets.', 'Clear the client-side VPN credential cache from the VPN application settings.', 'Trigger an immediate synchronisation between Active Directory and the VPN LDAP directory.', 'Restart the VPN client service.', 'Re-authenticate with your updated credentials.', 'Verify access to network drives and internal applications.'], expectedOutcome: 'Your credentials should now synchronise properly, allowing successful VPN authentication.', success: '82%', difficulty: 'Easy', time: '~15 min', confidence: 'High', commonMistakes: 'Forgetting to clear cached Kerberos tickets with klist purge; not restarting the VPN client service after sync', additionalNotes: 'AD to LDAP synchronisation can take up to 5 minutes. Wait before retrying authentication.' },
        { recommended: false, title: 'Roll back VPN client to previous stable version', problemSummary: 'Known compatibility issue with VPN client on certain operating systems causing intermittent disconnects.', whyRecommended: 'Recent VPN client updates have known regressions. Rolling back restores reliable connectivity while the issue is patched.', steps: ['Uninstall the current VPN client version from Programs and Features.', 'Restart your computer to clear any remaining drivers or services.', 'Download the previous stable VPN client version from the IT portal.', 'Install the archived version using default settings.', 'Reconnect to the VPN and verify connection stability.', 'Monitor the connection for 10-15 minutes to confirm intermittent disconnects have stopped.', 'Report the issue to the network team for a permanent fix.'], expectedOutcome: 'VPN connectivity should stabilise with the previous client version.', success: '71%', difficulty: 'Medium', time: '~30 min', confidence: 'Moderate', commonMistakes: 'Not fully uninstalling the previous version before installing the archived version; skipping the required restart', additionalNotes: 'Report the regression to IT so the permanent fix is tracked. Include the version numbers of both the broken and working clients.' }
      ],
      'Email & Collaboration': [
        { recommended: true, title: 'Force Outlook client sync and repair mailbox', problemSummary: 'Outlook client experiencing synchronisation failures with Exchange server causing email delays or send/receive errors.', whyRecommended: 'Mailbox sync issues are typically caused by corrupted offline data files or profile misconfigurations.', steps: ['Close Microsoft Outlook completely.', 'Open Control Panel and navigate to Mail (32-bit).', 'Click "Show Profiles" and select your email profile.', 'Click "Repair" to run the built-in mailbox repair tool.', 'Restart Outlook in safe mode by holding Ctrl while opening Outlook.', 'Go to File > Account Settings and verify server settings.', 'Run the Inbox Repair Tool (scanpst.exe) on your OST file.', 'Recreate your Outlook profile if sync issues persist.', 'Test send/receive by sending an email to yourself.'], expectedOutcome: 'Your Outlook client should now synchronise correctly with the Exchange server. Emails, calendar, and contacts will be up to date.', success: '92%', difficulty: 'Easy', time: '~20 min', confidence: 'High', commonMistakes: 'Not running scanpst.exe as administrator; skipping the profile recreation step when repair does not work', additionalNotes: 'Your OST file can be safely deleted if corrupted - Exchange will rebuild it from the server during the next sync.' },
        { recommended: false, title: 'Clear Exchange cache and reconfigure account', problemSummary: 'Corrupted Exchange cache causing synchronisation loop and connection errors.', whyRecommended: 'A corrupted Exchange cache can prevent proper synchronisation. Clearing it forces a fresh sync without losing server-side data.', steps: ['Open Outlook and go to File > Account Settings > Account Settings.', 'Select your Exchange account and click Change.', 'Turn off "Use Cached Exchange Mode" and click Next.', 'Restart Outlook and verify connectivity.', 'Re-enable Cached Exchange Mode in the same settings.', 'Restart Outlook again to rebuild the offline cache.', 'Allow the initial sync to complete (may take several minutes).'], expectedOutcome: 'Exchange cache is rebuilt and synchronisation resumes correctly.', success: '78%', difficulty: 'Easy', time: '~15 min', confidence: 'Moderate', commonMistakes: 'Not disabling Cached Exchange Mode before restarting Outlook; skipping the full initial sync after re-enabling', additionalNotes: 'Initial sync time depends on your mailbox size and network speed. Larger mailboxes may take 30+ minutes.' }
      ],
      'Hardware': [
        { recommended: true, title: 'Update or reinstall device drivers', problemSummary: 'Device driver mismatch or corruption causing hardware malfunction or instability.', whyRecommended: 'Outdated or corrupt drivers are the primary cause of hardware-related issues.', steps: ['Press Win + X and select Device Manager.', 'Locate the problematic device (marked with a yellow exclamation).', 'Right-click the device and select Update driver.', 'Choose "Search automatically for drivers".', 'If Windows does not find a new driver, visit the manufacturer website.', 'Download and install the latest driver for your device model.', 'Restart your computer to apply the changes.', 'Verify the device is functioning correctly in Device Manager.'], expectedOutcome: 'The hardware device should now be recognised and functioning correctly without errors.', success: '90%', difficulty: 'Easy', time: '~15 min', confidence: 'High', commonMistakes: 'Using generic Windows drivers instead of manufacturer-specific drivers from the OEM website; not cleaning old driver remnants', additionalNotes: 'For GPU-related issues, use Display Driver Uninstaller (DDU) in Safe Mode for a clean removal before installing new drivers.' }
      ],
      'Software / Applications': [
        { recommended: true, title: 'Repair application installation and clear cache', problemSummary: 'Application files corrupted or cache issues causing crashes or errors during use.', whyRecommended: 'Application corruption or cache buildup is the most common cause of software errors.', steps: ['Close the application completely.', 'Go to Settings > Apps > Apps & Features.', 'Find the problematic application and click Modify or Advanced Options.', 'Select the Repair option and follow the prompts.', 'Clear the application cache from in-app settings if available.', 'Restart your computer.', 'Launch the application and verify the issue is resolved.', 'If the issue persists, uninstall and reinstall the application.'], expectedOutcome: 'The application should now open and function normally without errors or crashes.', success: '88%', difficulty: 'Easy', time: '~20 min', confidence: 'High', commonMistakes: 'Skipping the Repair option in favour of an immediate reinstall; not clearing the application cache before repairing', additionalNotes: 'Check the software vendor support page for any known issues or specific version requirements before reinstalling.' }
      ],
      'Security & Access': [
        { recommended: true, title: 'Reset account credentials and clear cached authentication', problemSummary: 'Account authentication failure due to expired credentials or cached token mismatch.', whyRecommended: 'Expired passwords or stale authentication tokens are the most common causes of access issues.', steps: ['Press Ctrl + Alt + Del and select Change a password.', 'Enter your current password and then a new strong password.', 'Log out of all applications and services.', 'Clear credential manager entries in Windows Credential Manager.', 'Restart your computer.', 'Log in with your new password.', 'Re-authenticate in any applications that prompted for credentials.'], expectedOutcome: 'Your account credentials should now work across all services without authentication errors.', success: '95%', difficulty: 'Easy', time: '~10 min', confidence: 'High', commonMistakes: 'Not clearing Windows Credential Manager entries after password change; skipping the system restart', additionalNotes: 'Some services like Outlook may require re-entering the password even after a successful credential update.' }
      ],
      'Finance Systems': [
        { recommended: true, title: 'Clear SAP cache and verify connection settings', problemSummary: 'SAP system experiencing connection timeouts or authentication failures.', whyRecommended: 'Corrupted SAP cache or outdated connection settings are the most common causes of finance system access issues.', steps: ['Close all SAP sessions and applications.', 'Navigate to the SAP logon directory on your computer.', 'Delete all files in the cache folder.', 'Open SAP Logon Pad and select your system entry.', 'Click Edit and verify the connection settings are correct.', 'Save changes and try connecting again.', 'If the issue persists, contact the SAP team to verify server status.'], expectedOutcome: 'SAP should now connect successfully and load all modules without errors.', success: '87%', difficulty: 'Medium', time: '~20 min', confidence: 'High', commonMistakes: 'Deleting files from the wrong SAP directory; not verifying connection parameters before retrying the connection', additionalNotes: 'SAP GUI version must match the server version. Contact the SAP team if you are unsure about connection settings.' }
      ],
      'HR Systems': [
        { recommended: true, title: 'Clear browser cache and verify HR portal access', problemSummary: 'HR system portal not loading or displaying errors when accessing employee records.', whyRecommended: 'Browser cache issues or expired session tokens commonly prevent HR portal access.', steps: ['Open your web browser settings.', 'Clear browsing history, cache, and cookies.', 'Close and reopen the browser completely.', 'Navigate to the HR portal URL.', 'Log in with your credentials.', 'If prompted, complete multi-factor authentication.', 'Verify you can access employee records and modules.'], expectedOutcome: 'The HR portal should load correctly and all modules should be accessible.', success: '85%', difficulty: 'Easy', time: '~10 min', confidence: 'Moderate', commonMistakes: 'Clearing only the browser cache but not cookies and session data; using an incorrect or outdated portal URL', additionalNotes: 'Ensure you are connected to the corporate network or VPN for internal HR portal access.' }
      ]
    };

    var solutions = TEMPLATES[cat] || TEMPLATES['IT Support'] || [
      { recommended: true, title: 'Troubleshoot and diagnose the reported issue', problemSummary: 'Issue reported but requires further technical investigation.', whyRecommended: 'A systematic troubleshooting approach ensures the root cause is identified and resolved.', steps: ['Restart the affected system or application.', 'Check for any error messages or codes displayed.', 'Verify network connectivity and system status.', 'Clear temporary files and application cache.', 'Update the relevant software to the latest version.', 'Test the system to confirm if the issue persists.', 'If still unresolved, escalate to the IT support team.'], expectedOutcome: 'The issue should be resolved or escalated to the appropriate team for further investigation.', success: '80%', difficulty: 'Medium', time: '~30 min', confidence: 'Moderate', commonMistakes: 'Skipping the basic system restart step; not documenting error messages or codes for escalation', additionalNotes: 'Check Windows Event Viewer (Eventvwr.msc) for detailed error logs before escalating to the support team.' }
    ];
    if (!solutions || solutions.length === 0) {
      solutions = TEMPLATES['IT Support'];
    }
    state.generatedSolutions = solutions;

    addMessage('ai', 'Based on my analysis and similar resolved tickets, here are my <strong>recommended solutions</strong>. Please choose one:');

    for (var i = 0; i < solutions.length; i++) {
      var sol = solutions[i];
      sol.id = i + 1;
      addSolutionCard(sol);
    }

    state.flow = 'awaiting_solution_choice';
    state.isProcessing = false;
    enableInput();
  }

  function showSolutions() {
    generateSolutions();
  }

  function onSolutionSelect(solutionId) {
    if (state.awaitingChoice) return;
    var solutions = state.generatedSolutions || [];
    var solution = null;
    for (var i = 0; i < solutions.length; i++) {
      if (solutions[i].id === solutionId) {
        solution = solutions[i];
        break;
      }
    }
    if (!solution) return;
    showSolutionDetail(solution, solutionId);
  }

  function showSolutionDetail(opts, solutionId) {
    if (document.querySelector('.conv-solution-modal-overlay')) return;
    var category = (state.formData.analysis && state.formData.analysis.category) || inferDepartment(state.formData.issue) || 'IT Support';

    var stepsHtml = '';
    if (opts.steps && opts.steps.length > 0) {
      stepsHtml += '<div class="kb-article-section"><h4 class="kb-article-h4">Resolution Steps</h4>';
      for (var si = 0; si < opts.steps.length; si++) {
        var stepText = opts.steps[si];
        var colonIdx = stepText.indexOf(':');
        var title, desc;
        if (colonIdx > 0 && colonIdx < 60) {
          title = stepText.substring(0, colonIdx);
          desc = stepText.substring(colonIdx + 1).trim();
        } else {
          title = stepText;
          desc = '';
        }
        stepsHtml += '<div class="conv-modal-step">';
        stepsHtml += '<span class="conv-modal-step-number">' + (si + 1) + '</span>';
        stepsHtml += '<div class="conv-modal-step-content">';
        stepsHtml += '<div class="conv-modal-step-title">' + escHtml(title) + '</div>';
        if (desc) stepsHtml += '<div class="conv-modal-step-desc">' + escHtml(desc) + '</div>';
        stepsHtml += '</div></div>';
      }
      stepsHtml += '</div>';
    }

    var expectedHtml = '';
    if (opts.expectedOutcome) {
      expectedHtml = '<div class="kb-article-section"><div class="conv-modal-success-card"><span class="conv-modal-success-icon">&#10003;</span><div><div class="conv-modal-success-title">Expected Result</div><div class="conv-modal-success-text">' + escHtml(opts.expectedOutcome) + '</div></div></div></div>';
    }

    var mistakesHtml = '';
    if (opts.commonMistakes) {
      var mistakes = opts.commonMistakes.split('; ');
      var listHtml = '';
      for (var mi = 0; mi < mistakes.length; mi++) {
        listHtml += '<li>' + escHtml(mistakes[mi]) + '</li>';
      }
      mistakesHtml = '<div class="kb-article-section"><div class="conv-modal-warning-card"><span class="conv-modal-warning-icon">&#9888;</span><div><div class="conv-modal-warning-title">Common Mistakes</div><ul class="conv-modal-warning-list">' + listHtml + '</ul></div></div></div>';
    }

    var notesHtml = '';
    if (opts.additionalNotes) {
      notesHtml = '<div class="kb-article-section"><div class="conv-modal-info-card"><span class="conv-modal-info-icon">&#9432;</span><div><div class="conv-modal-info-title">Additional Notes</div><div class="conv-modal-info-text">' + escHtml(opts.additionalNotes) + '</div></div></div></div>';
    }

    var overlay = document.createElement('div');
    overlay.className = 'conv-solution-modal-overlay';
    overlay.innerHTML = '<div class="conv-solution-modal"><div class="conv-solution-modal-scroll"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:28px;"><span class="kb-article-cat-badge">' + escHtml(category) + '</span><button class="conv-modal-close-btn">&times;</button></div><h1 class="kb-article-title">' + escHtml(opts.title) + '</h1><div class="kb-article-body"><div class="kb-article-section"><h4 class="kb-article-h4">Problem Summary</h4><p class="kb-article-text">' + escHtml(opts.problemSummary || '') + '</p></div><div class="kb-article-section"><h4 class="kb-article-h4">Why This Solution</h4><p class="kb-article-text">' + escHtml(opts.whyRecommended || '') + '</p></div>' + stepsHtml + expectedHtml + mistakesHtml + notesHtml + '</div></div><div class="conv-solution-modal-footer"><button class="kb-btn-primary conv-mark-tried-btn">&#10004; Mark as Tried</button></div></div>';
    document.body.appendChild(overlay);
    var closeBtn = overlay.querySelector('.conv-modal-close-btn');
    closeBtn.addEventListener('click', function () { overlay.parentNode.removeChild(overlay); });
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) { overlay.parentNode.removeChild(overlay); }
    });
    var triedBtn = overlay.querySelector('.conv-mark-tried-btn');
    triedBtn.addEventListener('click', function () {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      state.isProcessing = true;
      state.awaitingChoice = true;
      state.selectedSolution = solutionId;
      qsa('.conv-solution-card').forEach(function (c) { c.classList.remove('selected'); });
      var selected = qs('[data-sol="' + solutionId + '"]');
      if (selected) selected.classList.add('selected');
      removeChoices();
      showTyping(function () {
        askResolutionFeedback();
      });
    });
  }

  function askResolutionFeedback() {
    state.flow = 'awaiting_feedback_resolve';
    state.isProcessing = true;
    disableInput();
    addMessage('ai', 'Please follow the steps above.');
    setTimeout(function () {
      addMessage('ai', 'Did this resolve your issue?');
      state.isProcessing = false;
      state.awaitingChoice = false;
      enableInput();
      addYesNo(function (resolved) {
        if (resolved) {
          handleResolved();
        } else {
          handleNotResolved();
        }
      });
    }, 3000);
  }

  function handleResolved() {
    state.issueResolved = true;
    addMessage('ai', 'That\'s great! I\'m happy your issue has been resolved.');
    state.flow = 'idle';
    state.isProcessing = false;
    addChoices(['Start New Conversation'], function () {
      resetConversation();
    });
  }

  function handleNotResolved() {
    state.isProcessing = true;
    disableInput();
    addMessage('ai', 'No problem. I\'ll create a support ticket using the information we\'ve already collected.');
    showTyping(function () {
      advanceStep(5);
      generateTicket();
    });
  }

  function generateTicket() {
    var now = new Date();
    var dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    var timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    var createdStr = dateStr + ' at ' + timeStr;
    var issue = state.formData.issue || 'VPN Connection Timeout';
    var dept = state.formData.department || 'Network & VPN';

    var ticketData = {
      issue: issue,
      department: dept,
      assignedTeam: 'Network Operations',
      eta: '< 30 minutes',
      status: 'Open',
      created: now.toISOString(),
      originalMessage: issue,
      aiDiagnosis: 'Network tunnel configuration mismatch — authentication handshake failing at gateway.',
      similarIssue: 'RSV-9812 — VPN connection timeout on remote gateway (98% match)',
      suggestedFix: 'Regenerate VPN certificate and reconfigure client',
      fixWorked: false,
      timeline: [
        { title: 'Ticket Created', status: 'completed', time: createdStr },
        { title: 'Assigned to Network Team', status: 'active', time: 'In progress' },
        { title: 'Engineer Reviewing', status: 'pending', time: '' },
        { title: 'Resolved', status: 'pending', time: '' }
      ]
    };

    var saveTicket = function (data) {
      var safeData = JSON.parse(JSON.stringify(data));
      if (!safeData.id) safeData.id = 'RSV-' + Date.now().toString(36).toUpperCase();
      if (window.MyTickets && window.MyTickets.addTicket) {
        return window.MyTickets.addTicket(safeData);
      }
      try {
        var existing = JSON.parse(localStorage.getItem('resolveone_tickets') || '[]');
        existing.push(safeData);
        localStorage.setItem('resolveone_tickets', JSON.stringify(existing));
        return Promise.resolve(safeData);
      } catch (e) {
        return Promise.resolve(safeData);
      }
    };

    saveTicket(ticketData).then(function (savedTicket) {
      var ticketId = savedTicket.id;
      showTyping(function () {
        try {
          var successMsg = 'Your support ticket has been created successfully.<br><strong>Ticket ID: ' + ticketId + '</strong>.<br>I\'ve added it to your My Tickets list below.';
          addMessage('ai', successMsg);

          savedTicket.timeline = savedTicket.timeline || ticketData.timeline;
          savedTicket.assignedTeam = savedTicket.assignedTeam || ticketData.assignedTeam;
          savedTicket.eta = savedTicket.eta || ticketData.eta;
          addTicketCard(savedTicket);
          advanceStep(6);
          state.flow = 'idle';
          state.isProcessing = false;
        } catch (e) {}

        setTimeout(function () {
          try {
            var section = document.getElementById('my-tickets-section');
            if (section) {
              section.scrollIntoView({ behavior: 'smooth', block: 'start' });
              var row = section.querySelector('[data-ticket-id="' + ticketId + '"]');
              if (row) {
                row.classList.add('mt-row-highlighted');
                var badge = document.createElement('span');
                badge.textContent = 'New';
                badge.style.cssText = 'display:inline-flex;align-items:center;padding:1px 6px;border-radius:100px;font-size:0.5625rem;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;background:var(--color-primary);color:#fff;margin-left:6px;vertical-align:middle;';
                var idSpan = row.querySelector('.mt-id-text');
                if (idSpan) idSpan.parentNode.appendChild(badge);
              }
            }
            if (window.MyTickets && window.MyTickets.openDrawer) {
              setTimeout(function () {
                try {
                  window.MyTickets.openDrawer(ticketId);
                } catch (e) {}
              }, 400);
            }
          } catch (e) {}
          enableInput();
          showSuggested();
        }, 300);
      });
    });
  }

  function addTicketCard(ticketData) {
    var html = '<div class="conv-ticket-card">';
    html += '<div class="conv-ticket-top">';
    html += '<div class="conv-ticket-id"><span class="conv-ticket-id-label">Ticket</span><span class="conv-ticket-id-value mono">' + ticketData.id + '</span></div>';
    html += '<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:100px;font-size:0.6875rem;font-weight:600;background:rgba(31, 122, 140,0.1);color:var(--color-primary);">' + ticketData.status + '</span>';
    html += '</div>';
    html += '<div class="conv-ticket-divider"></div>';
    html += '<div class="conv-ticket-body">';
    html += '<div class="conv-ticket-field"><span class="conv-ticket-field-label">Issue</span><span class="conv-ticket-field-value">' + ticketData.issue + '</span></div>';
    html += '<div class="conv-ticket-field"><span class="conv-ticket-field-label">Department</span><span class="conv-ticket-field-value">' + ticketData.department + '</span></div>';
    html += '<div class="conv-ticket-row">';
    html += '<div class="conv-ticket-field"><span class="conv-ticket-field-label">Assigned Team</span><span class="conv-ticket-field-value">' + ticketData.assignedTeam + '</span></div>';
    html += '<div class="conv-ticket-field"><span class="conv-ticket-field-label">Est. Response</span><span class="conv-ticket-field-value">' + ticketData.eta + '</span></div>';
    html += '</div>';
    html += '<div class="conv-ticket-field"><span class="conv-ticket-field-label">Created</span><span class="conv-ticket-field-value">' + formatConvDate(ticketData.created) + '</span></div>';
    html += '</div>';
    if (ticketData.timeline && ticketData.timeline.length > 0) {
      html += '<div class="conv-ticket-divider"></div>';
      html += '<div style="padding-top:4px;">';
      html += '<div style="font-size:0.625rem;font-weight:600;color:var(--color-text);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:14px;">Status Timeline</div>';
      for (var i = 0; i < ticketData.timeline.length; i++) {
        var step = ticketData.timeline[i];
        var dotBg = step.status === 'completed' ? 'var(--color-success)' : step.status === 'active' ? 'var(--color-primary)' : 'var(--color-border)';
        var dotSize = '8px';
        var dotInner = '';
        if (step.status === 'completed') {
          dotInner = '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
          dotSize = '18px';
        } else if (step.status === 'active') {
          dotInner = '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>';
          dotSize = '18px';
        }
        html += '<div style="display:flex;align-items:flex-start;gap:10px;">';
        html += '<div style="width:' + dotSize + ';height:' + dotSize + ';border-radius:50%;background:' + dotBg + ';flex-shrink:0;display:flex;align-items:center;justify-content:center;margin-top:2px;">' + dotInner + '</div>';
        html += '<div style="flex:1;padding-bottom:' + (i < ticketData.timeline.length - 1 ? '16px' : '0') + ';">';
        html += '<div style="font-size:0.8125rem;font-weight:500;color:var(--color-heading);">' + step.title + '</div>';
        if (step.time) html += '<div style="font-size:0.6875rem;color:var(--color-text);margin-top:2px;">' + step.time + '</div>';
        html += '</div></div>';
        if (i < ticketData.timeline.length - 1) {
          html += '<div style="width:1px;height:20px;background:var(--color-border);margin-left:9px;margin-top:-4px;margin-bottom:4px;"></div>';
        }
      }
      html += '</div>';
    }
    html += '</div>';

    addCustomMessage('ai', html, 'html');
  }

  function formatConvDate(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var hours = d.getHours();
    var minutes = d.getMinutes();
    var ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear() + ' at ' + hours + ':' + (minutes < 10 ? '0' : '') + minutes + ' ' + ampm;
  }

  function showStatusSequence(statuses, callback) {
    var container = document.createElement('div');
    container.className = 'conv-status';
    container.setAttribute('data-status-container', '');
    els.messages.appendChild(container);
    scrollBottom();

    var idx = 0;
    function showNext() {
      if (idx >= statuses.length) {
        setTimeout(function () {
          container.style.opacity = '0';
          setTimeout(function () {
            if (container.parentNode) container.parentNode.removeChild(container);
          }, 300);
          if (callback) callback();
        }, 400);
        return;
      }
      var s = statuses[idx];
      var row = document.createElement('div');
      row.className = 'conv-status-row';
      var icon = s.icon === 'loading'
        ? '<div class="conv-status-icon loading"></div>'
        : '<div class="conv-status-icon done"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>';
      row.innerHTML = icon + '<span class="conv-status-text">' + s.text + '</span>';
      container.appendChild(row);
      scrollBottom();
      idx++;
      setTimeout(showNext, 700);
    }
    showNext();
  }

  function showTyping(callback) {
    var typing = document.createElement('div');
    typing.className = 'conv-message ai conv-typing';
    typing.innerHTML = '<div class="conv-message-avatar"><i data-lucide="bot" size="14"></i></div><div class="conv-message-content"><div class="conv-message-bubble"><span></span><span></span><span></span></div></div>';
    els.messages.appendChild(typing);
    scrollBottom();
    recreateLucide();

    var delay = 800 + Math.random() * 600;
    setTimeout(function () {
      if (typing.parentNode) typing.parentNode.removeChild(typing);
      if (callback) callback();
    }, delay);
  }

  function addMessage(role, text) {
    var div = document.createElement('div');
    div.className = 'conv-message ' + role;

    var avatar = document.createElement('div');
    avatar.className = 'conv-message-avatar';
    if (role === 'ai') {
      avatar.innerHTML = '<i data-lucide="bot" size="14"></i>';
    } else {
      avatar.textContent = sessionInitials() || '';
    }

    var contentDiv = document.createElement('div');
    contentDiv.className = 'conv-message-content';

    var bubble = document.createElement('div');
    bubble.className = 'conv-message-bubble';
    bubble.innerHTML = text.replace(/\n/g, '<br>');

    var time = document.createElement('div');
    time.className = 'conv-message-time';
    time.textContent = getTimestamp();

    contentDiv.appendChild(bubble);
    contentDiv.appendChild(time);

    if (role === 'ai') {
      div.appendChild(avatar);
      div.appendChild(contentDiv);
    } else {
      div.appendChild(contentDiv);
      div.appendChild(avatar);
    }

    els.messages.appendChild(div);
    scrollBottom();
    recreateLucide();
  }

  function addCustomMessage(role, html, type) {
    var div = document.createElement('div');
    div.className = 'conv-message ' + role;

    var avatar = document.createElement('div');
    avatar.className = 'conv-message-avatar';
    if (role === 'ai') avatar.innerHTML = '<i data-lucide="bot" size="14"></i>';

    var contentDiv = document.createElement('div');
    contentDiv.className = 'conv-message-content';

    var bubble = document.createElement('div');
    bubble.className = 'conv-message-bubble';
    bubble.innerHTML = html;

    var time = document.createElement('div');
    time.className = 'conv-message-time';
    time.textContent = getTimestamp();

    contentDiv.appendChild(bubble);
    contentDiv.appendChild(time);

    if (role === 'ai') {
      div.appendChild(avatar);
      div.appendChild(contentDiv);
    } else {
      div.appendChild(contentDiv);
      div.appendChild(avatar);
    }

    els.messages.appendChild(div);
    scrollBottom();
    recreateLucide();
  }

  function addChoices(options, callback) {
    state.awaitingChoice = true;
    var container = document.createElement('div');
    container.className = 'conv-choices';
    container.setAttribute('data-choices', '');

    options.forEach(function (opt) {
      var btn = document.createElement('button');
      btn.className = 'conv-choice-btn';
      btn.textContent = opt;
      btn.addEventListener('click', function () {
        if (callback) {
          callback(opt);
        } else {
          handleChoiceSelect(opt);
        }
        removeChoices();
      });
      container.appendChild(btn);
    });

    els.messages.appendChild(container);
    scrollBottom();
  }

  function handleChoiceSelect(value) {
    state.awaitingChoice = false;
    state.isProcessing = true;
    addMessage('user', value);
    processFlow(value);
  }

  function removeChoices() {
    var existing = qs('[data-choices]');
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
    state.awaitingChoice = false;
  }

  function addYesNo(callback) {
    var container = document.createElement('div');
    container.className = 'conv-yesno';
    container.setAttribute('data-choices', '');

    var yesBtn = document.createElement('button');
    yesBtn.className = 'conv-yesno-btn yes';
    yesBtn.textContent = '\u2714 Yes';
    yesBtn.addEventListener('click', function () {
      addMessage('user', '\u2714 Yes');
      removeChoices();
      if (callback) callback(true);
    });

    var noBtn = document.createElement('button');
    noBtn.className = 'conv-yesno-btn no';
    noBtn.textContent = '\u2716 No, Create Ticket';
    noBtn.addEventListener('click', function () {
      addMessage('user', '\u2716 No, Create Ticket');
      removeChoices();
      if (callback) callback(false);
    });

    container.appendChild(yesBtn);
    container.appendChild(noBtn);
    els.messages.appendChild(container);
    scrollBottom();
  }

  function addSimilarCard(id, match, title, dept, time, desc) {
    var card = document.createElement('div');
    card.className = 'conv-similar-card';
    card.innerHTML = '';
    card.innerHTML += '<div class="conv-similar-top"><span class="conv-similar-id">' + id + '</span><span class="conv-similar-match">' + match + '</span></div>';
    card.innerHTML += '<div class="conv-similar-title">' + title + '</div>';
    card.innerHTML += '<div class="conv-similar-meta"><span>' + dept + '</span><span>Resolved in ' + time + '</span></div>';
    card.innerHTML += '<div class="conv-similar-desc">' + desc + '</div>';
    els.messages.appendChild(card);
    scrollBottom();
  }

  function addSolutionCard(opts) {
    var id = opts.id;
    var card = document.createElement('div');
    card.className = 'conv-solution-card' + (opts.recommended ? ' recommended' : '');
    card.setAttribute('data-sol', id);

    var header = document.createElement('div');
    header.className = 'conv-solution-header';
    header.style.cursor = 'default';
    header.style.pointerEvents = 'none';

    var titleRow = document.createElement('div');
    titleRow.className = 'conv-solution-title-row';
    if (opts.recommended) {
      var badge = document.createElement('span');
      badge.className = 'conv-solution-badge-rec';
      badge.textContent = 'Recommended';
      titleRow.appendChild(badge);
    }
    var titleSpan = document.createElement('span');
    titleSpan.className = 'conv-solution-title';
    titleSpan.textContent = opts.title;
    titleRow.appendChild(titleSpan);
    header.appendChild(titleRow);
    card.appendChild(header);

    var statsDiv = document.createElement('div');
    statsDiv.className = 'conv-solution-stats';
    statsDiv.style.padding = '0 18px';
    var items = [
      { v: opts.success || '', l: 'Success' },
      { v: opts.difficulty || '', l: 'Difficulty' },
      { v: opts.time || '', l: 'Time' },
      { v: opts.confidence || '', l: 'Confidence' }
    ];
    for (var si = 0; si < items.length; si++) {
      var st = document.createElement('div');
      st.className = 'conv-solution-stat';
      var sv = document.createElement('span');
      sv.className = 'conv-solution-stat-value';
      sv.textContent = items[si].v;
      var sl = document.createElement('span');
      sl.className = 'conv-solution-stat-label';
      sl.textContent = items[si].l;
      st.appendChild(sv);
      st.appendChild(sl);
      statsDiv.appendChild(st);
    }
    card.appendChild(statsDiv);

    var btn = document.createElement('button');
    btn.className = 'conv-solution-select';
    btn.textContent = 'Try This Solution';
    btn.style.margin = '0 18px 14px';
    btn.style.width = 'calc(100% - 36px)';
    btn.addEventListener('click', function () {
      onSolutionSelect(id);
    });
    card.appendChild(btn);

    els.messages.appendChild(card);
    scrollBottom();
  }

  function advanceStep(step) {
    if (step > state.currentStep) {
      state.currentStep = step;
      for (var i = 1; i < step; i++) {
        state.steps[i] = { status: 'completed' };
      }
      state.steps[step] = { status: 'active' };
    }
    updateStepUI(step);
    updateProgressLines();
  }

  function updateStepUI(step) {
    els.progressItems.forEach(function (item) {
      var s = parseInt(item.getAttribute('data-step'), 10);
      item.classList.remove('active', 'completed');
      if (s < step) item.classList.add('completed');
      else if (s === step) item.classList.add('active');
    });
  }

  function updateProgressLines() {
    els.progressLines.forEach(function (line) {
      var s = parseInt(line.getAttribute('data-step'), 10);
      line.classList.toggle('completed', s < state.currentStep);
    });
  }

  function triggerFileUpload() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,.pdf';
    input.multiple = true;
    input.style.display = 'none';
    document.body.appendChild(input);
    input.addEventListener('change', function () {
      if (input.files.length > 0) {
        addMessage('user', '[Attached: ' + input.files[0].name + ']');
        addMessage('ai', 'Thanks! I received your file. Let me process it along with your issue.');
      }
      document.body.removeChild(input);
    });
    input.click();
  }

  function handleVoice() {
    var btn = els.voiceBtn;
    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="pulse-icon"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>';
    btn.style.background = 'rgba(31, 122, 140, 0.1)';
    disableInput();
    setTimeout(function () {
      btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>';
      btn.style.background = '';
      enableInput();
      els.input.value = 'VPN connection timeout issue on remote gateway';
      els.input.focus();
    }, 2000);
  }

  function disableInput() {
    if (els.input) els.input.disabled = true;
    if (els.sendBtn) els.sendBtn.disabled = true;
  }

  function enableInput() {
    if (els.input) els.input.disabled = false;
    if (els.sendBtn) els.sendBtn.disabled = false;
    if (els.input) els.input.focus();
  }

  function hideSuggested() {
    if (els.suggested) els.suggested.style.display = 'none';
  }

  function showSuggested() {
    if (els.suggested) els.suggested.style.display = 'flex';
  }

  function resetConversation() {
    if (els.messages) els.messages.innerHTML = '';
    state.flow = 'idle';
    state.currentStep = 1;
    state.selectedSolution = null;
    state.issueResolved = false;
    state.awaitingChoice = false;
    state.isProcessing = false;
    state.formData = {};
    state.clarificationCount = 0;

    for (var i = 2; i <= 6; i++) {
      state.steps[i] = { status: 'pending' };
    }

    els.progressItems.forEach(function (item) {
      item.classList.remove('active', 'completed');
    });
    qs('[data-step="1"]').classList.add('active');

    els.progressLines.forEach(function (l) { l.classList.remove('completed'); });

    enableInput();
    showSuggested();

    var firstName = getFirstName();
    var greeting = firstName
      ? 'Hi ' + firstName + '! \uD83D\uDC4B I\'m <strong>ResolveOne AI</strong>, your intelligent IT support assistant. Tell me what problem you\'re facing, and I\'ll help diagnose, find solutions, and resolve it — step by step.'
      : 'Hi there! \uD83D\uDC4B I\'m <strong>ResolveOne AI</strong>, your intelligent IT support assistant. Tell me what problem you\'re facing, and I\'ll help diagnose, find solutions, and resolve it — step by step.';
    addMessage('ai', greeting);

    scrollBottom();
  }

  function scrollBottom() {
    if (els.scrollArea) {
      var parent = els.scrollArea.closest('.conversation-area');
      if (parent) {
        parent.scrollTop = parent.scrollHeight;
      }
    }
  }

  function getTimestamp() {
    var d = new Date();
    var h = d.getHours();
    var m = d.getMinutes();
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }

  function recreateLucide() {
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  }

  window.AIAssistant = {
    init: init,
    resetConversation: resetConversation
  };
})();
