(function () {
  'use strict';

  var articles = [
    { id: 'kb-001', category: 'Network & Connectivity', icon: 'globe', title: 'VPN not connecting after Windows Update', summary: 'Troubleshoot and resolve VPN connectivity failures triggered by Windows 11 cumulative updates.', problem: 'After installing Windows 11 cumulative update KB5037853, the company VPN client fails to establish a connection. The client attempts to connect but times out after 30 seconds. Other internet services work normally.', symptoms: 'VPN client shows "Connecting..." for 30 seconds before failing with "Error 812: The connection was prevented because of a policy configured on your RAS/VPN server."\\n\\n- Other websites and services function correctly\\n- The issue began immediately after a Windows Update restart\\n- Affects both AnyConnect and native Windows VPN clients', rootCause: 'Windows 11 cumulative updates occasionally modify the WFP (Windows Filtering Platform) security rules and can reset or corrupt VPN adapter configurations. Update KB5037853 introduced changes to IPsec and IKEv2 handling that conflict with corporate VPN policy settings.', steps: ['Open Windows Settings → Update & Security → View Update History → Uninstall update KB5037853', 'Restart your computer', 'Open VPN settings and verify the connection entry still exists. If missing, re-import from IT portal.', 'Attempt to connect. If successful, pause Windows updates for 7 days.', 'Run "ipconfig /flushdns" and "netsh int ip reset" in Command Prompt as Administrator', 'If the issue persists, reinstall the VPN client from the Software Center'], related: ['kb-003', 'kb-012', 'kb-032'], readingTime: '12 min', views: '12.4K', updated: '2 days ago', popular: true },
    { id: 'kb-002', category: 'Network & Connectivity', icon: 'globe', title: 'Slow Wi-Fi in office — troubleshooting guide', summary: 'Diagnose and fix slow wireless network performance in the corporate office environment.', problem: 'Users in Building B, floors 3-5 are experiencing significantly slower Wi-Fi speeds (1-5 Mbps) compared to the usual 50-100 Mbps. The issue started around 10 AM and persists throughout the day.', symptoms: '- Download speeds drop below 5 Mbps during peak hours\\n- Video calls frequently disconnect or freeze\\n- Web pages take 10+ seconds to load\\n- Signal strength shows 3-4 bars but throughput is poor\\n- Issue is localized to specific office zones', rootCause: 'Channel congestion due to overlapping access point channels in the 2.4 GHz spectrum. The building has 14 access points on floors 3-5, and 8 of them are operating on overlapping channels 1, 6, and 11, causing co-channel interference. Additionally, the 5 GHz band radio power was accidentally reduced during a firmware update.', steps: ['Check your signal strength — if below -70 dBm, move closer to an access point', 'Toggle Wi-Fi off and on to force reconnection to the least congested access point', 'Switch to the 5 GHz band if your device supports it (look for network SSID ending in "-5G")', 'If on a laptop, ensure "Power Saving Mode" is disabled for Wi-Fi in advanced adapter settings', 'For persistent issues, use the wired Ethernet connection at your desk', 'Report the problem to IT with your exact location for AP channel rebalancing'], related: ['kb-009', 'kb-025'], readingTime: '8 min', views: '8.7K', updated: '5 days ago', popular: true },
    { id: 'kb-003', category: 'Network & Connectivity', icon: 'globe', title: 'VPN Error 691 — Access denied fix', summary: 'Resolve VPN authentication error 691 caused by incorrect credentials or RADIUS misconfiguration.', problem: 'When attempting to connect to the corporate VPN, users receive "Error 691: Access denied because username or password is invalid on the domain." This occurs even when the correct credentials are entered.', symptoms: '- VPN connection fails immediately with Error 691\\n- User has confirmed their password works on other systems\\n- The error appears before any connection negotiation completes\\n- Event ID 20273 is logged on the VPN server', rootCause: 'Error 691 is typically caused by: (1) Expired or recently changed domain password not synced to the RADIUS server, (2) User account locked due to multiple failed attempts, (3) NPS policy mismatch — user is not a member of the required VPN access group, (4) Authentication protocol mismatch between client and server.', steps: ['Verify your domain password is correct by logging into a company workstation or OWA', 'If password was recently changed, lock and unlock your workstation to sync credentials', 'Ensure your account is unlocked — try logging into the VPN with different credentials to test', 'In VPN client settings, verify "Microsoft: Secured password (EAP-MSCHAP v2)" is selected as authentication method', 'Clear stored VPN credentials: Control Panel → Credential Manager → Windows Credentials → remove any VPN entries', 'If still failing, contact IT Support to verify RADIUS group membership'], related: ['kb-001', 'kb-032', 'kb-012'], readingTime: '6 min', views: '7.2K', updated: '1 week ago', popular: false },
    { id: 'kb-004', category: 'Network & Connectivity', icon: 'globe', title: 'VPN timeout after 30 seconds', summary: 'Fix VPN connection timeouts caused by MTU issues, firewall rules, or DNS misconfiguration.', problem: 'VPN connection attempt proceeds to "Verifying username and password" but then times out after 30-60 seconds with "Error 628: The connection was closed by the remote computer."', symptoms: '- VPN connects partially then drops after exactly 30 seconds\\n- Error 628 or "Connection terminated by remote server"\\n- Works on some networks but not others (e.g., home vs. coffee shop)\\n- VPN reconnection attempts all fail similarly', rootCause: 'MTU (Maximum Transmission Unit) mismatch between the VPN tunnel and the local network adapter. Many public Wi-Fi networks and some home routers use an MTU of 1400 or lower, while the VPN client expects 1500. This causes packet fragmentation and silent dropping.', steps: ['Open VPN client advanced settings and reduce MTU to 1400, then 1300 to test', 'Run "ping 8.8.8.8 -f -l 1472" — if "Packet needs to be fragmented" appears, reduce until it passes. That value + 28 is your optimal MTU.', 'Check if firewall software (especially third-party AV) is blocking IKE/UDP ports 500 and 4500', 'Add VPN server as trusted application in your firewall settings', 'Flush DNS: run "ipconfig /flushdns" and "netsh winsock reset" in Admin CMD', 'As last resort, use the SSL VPN fallback option in the client settings'], related: ['kb-001', 'kb-003', 'kb-031'], readingTime: '7 min', views: '5.8K', updated: '3 days ago', popular: false },
    { id: 'kb-005', category: 'Email & Collaboration', icon: 'mail', title: 'Outlook keeps asking for password', summary: 'Fix the persistent Outlook password prompt loop caused by Modern Authentication or cached credentials.', problem: 'Microsoft 365 Outlook (Windows/Mac) continuously prompts for password every few minutes. Entering the correct password works temporarily but the prompt returns within minutes to hours.', symptoms: '- Outlook shows "Need Password" banner at the top every 10-15 minutes\\n- Connection status shows "Disconnected" then "Trying to connect..." repeatedly\\n- Email sending/receiving stops working intermittently\\n- Calendar and search functionality may also fail\\n- Works fine in Outlook Web Access (OWA)', rootCause: 'Modern Authentication (OAuth 2.0) token refresh failure. Common causes: (1) Corrupted Windows credentials in Credential Manager, (2) Organizational Conditional Access policy blocking the device, (3) Office activation issues, (4) Legacy authentication being blocked after Microsoft disabling Basic Auth.', steps: ['Open Control Panel → Credential Manager → Windows Credentials → remove all entries under "Windows Live ID" and "MicrosoftOffice"', 'Close and reopen Outlook — it should prompt for password once', 'If still prompting, run "Control Panel → Mail → Email Accounts → Repair"', 'Clear Office activation: run "Control Panel → Programs → Microsoft 365 → Change → Quick Repair"', 'Check for Office updates: File → Office Account → Update Options → Update Now', 'As a workaround, use Outlook Web Access (OWA) at outlook.office.com while IT investigates Conditional Access policies'], related: ['kb-008', 'kb-023', 'kb-041'], readingTime: '10 min', views: '15.3K', updated: '1 day ago', popular: true },
    { id: 'kb-006', category: 'Email & Collaboration', icon: 'mail', title: 'Teams microphone not working', summary: 'Diagnose and fix Microsoft Teams microphone issues in meetings, including permissions and driver problems.', problem: 'In Microsoft Teams meetings, other participants cannot hear the user. The microphone icon shows muted by system, or the Teams audio settings show no device detected.', symptoms: '- Microphone icon shows as muted or crossed out in Teams\\n- "No microphone detected" message in Teams audio settings\\n- Microphone works in other applications (Voice Recorder, Zoom)\\n- Issue started after a Teams update or Windows update\\n- Works on Teams web version but not desktop app', rootCause: 'Teams desktop app uses exclusive audio control and can conflict with: (1) Windows privacy settings blocking microphone access, (2) Outdated or corrupted audio drivers, (3) Teams cached application data, (4) Multiple audio devices causing default device confusion, (5) Teams "Device Settings" overriding system defaults.', steps: ['Check Windows privacy: Settings → Privacy & Security → Microphone → allow apps to access your microphone → ensure Teams is enabled', 'In Teams: Settings → Devices → under Microphone, select the correct device. Speak to see if the blue test bar moves.', 'Run Teams audio test: Settings → Devices → "Make a test call" — follow the prompts', 'Clear Teams cache: close Teams completely → navigate to "%appdata%\\Microsoft\\Teams" → delete contents of Cache, Code Cache, and tmp folders → restart Teams', 'Update audio drivers from Device Manager → Sound, video and game controllers → update driver', 'If persistent, use Teams web version (teams.microsoft.com) as temporary workaround'], related: ['kb-008', 'kb-023', 'kb-041'], readingTime: '8 min', views: '11.2K', updated: '3 days ago', popular: true },
    { id: 'kb-007', category: 'Email & Collaboration', icon: 'mail', title: 'Outlook email sync stuck or not syncing', summary: 'Fix Outlook send/receive issues, stuck emails in Outbox, and mailbox synchronization failures.', problem: 'Outlook stops sending or receiving emails. The send/receive progress bar appears but never completes, or emails remain stuck in the Outbox indefinitely.', symptoms: '- Send/Receive progress shows "Not Responding" or stuck at a specific step\\n- Emails stuck in Outbox with "Sending..." status\\n- New emails not appearing in Inbox\\n- Outlook status bar shows "Disconnected" or "Trying to connect..."\\n- Other Office 365 services (Teams, SharePoint) work fine', rootCause: 'Causes ranked by frequency: (1) Large attachment or corrupted email stuck in Outbox/Sent Items, (2) Outlook data file (.OST) size exceeds 50 GB limit or is corrupted, (3) Mailbox in "Exclude Online Archive" state, (4) Add-in conflict with Outlook, (5) Network proxy blocking MAPI over HTTP connection.', steps: ['Go to Send/Receive tab → Work Offline. Then click "Update Folder" to check sync status.', 'Manually move stuck emails from Outbox to Drafts folder, then delete them', 'Close Outlook. Navigate to "C:\\Users\\[username]\\AppData\\Local\\Microsoft\\Outlook" and rename .OST file to .OLD. Restart Outlook to rebuild.', 'Run Outlook in Safe Mode: "outlook.exe /safe" from Run (Win+R). If sync works, disable add-ins: File → Options → Add-ins → Go → uncheck all', 'If using Cached Exchange Mode, reduce the mail sync slider to 1 month: File → Account Settings → Account → Change → drag slider to 1 month', 'Repair Office: Control Panel → Programs → Microsoft 365 → Change → Online Repair'], related: ['kb-005', 'kb-023', 'kb-008'], readingTime: '9 min', views: '9.8K', updated: '4 days ago', popular: false },
    { id: 'kb-008', category: 'Email & Collaboration', icon: 'mail', title: 'Teams not loading or crashing on startup', summary: 'Resolve Microsoft Teams desktop app crashes, white screen, and startup failures.', problem: 'Microsoft Teams desktop application displays a white screen, freezes on the loading splash, or crashes immediately after launching.', symptoms: '- White or gray screen after Teams launches\\n- Loading spinner spins indefinitely\\n- Teams crashes with "Teams stopped working" error\\n- Teams loads in web browser but not desktop app\\n- Other Microsoft 365 apps function normally', rootCause: 'Most common cause is corrupted Teams cache — Teams stores large amounts of cached data (images, chat history, meeting files) that can become corrupted. Secondary causes: (1) GPU rendering conflicts, (2) Outdated Teams version, (3) Conflicting background applications like screen readers or recording software.', steps: ['Clear Teams cache: close Teams → run "%appdata%\\Microsoft\\Teams" in File Explorer → delete Cache, Code Cache, tmp, GPUcache, and Local Storage folders → restart Teams', 'Disable GPU hardware acceleration: right-click Teams in system tray (bottom right) → hold Ctrl while clicking "Check for updates" → Settings → General → uncheck "Disable GPU hardware acceleration" and restart', 'Repair Teams: Control Panel → Programs → Microsoft Teams → Modify → Repair', 'Switch to Teams web app at teams.microsoft.com — if it works, the desktop app needs full reinstall', 'Uninstall Teams completely and reinstall from the Microsoft 365 portal'], related: ['kb-006', 'kb-023', 'kb-041'], readingTime: '6 min', views: '6.5K', updated: '1 week ago', popular: false },
    { id: 'kb-009', category: 'Network & Connectivity', icon: 'globe', title: 'Cannot access shared network drive', summary: 'Troubleshoot mapped network drive access denied, "network path not found", and disconnection issues.', problem: 'Mapped network drives (e.g., Z:\\, S:\\) show red X or "Cannot access" error. Users may see "Access denied", "Network path not found", or "An unexpected network error occurred".', symptoms: '- Network drive shows as disconnected in File Explorer\\n- "\\server\\share is not accessible. You might not have permission to use this resource"\\n- Drives work after reboot but disconnect after a few hours\\n- Other network resources (internet, email) work fine\\n- Issue affects only specific drives or shares', rootCause: 'Common causes: (1) User permissions expired or group membership changed — requires re-authentication, (2) DNS resolution failure for the file server, (3) TCP/IP NetBIOS Helper service not running, (4) Drive mapping was created with "Reconnect at sign-in" but user credentials changed, (5) File server is at capacity or offline.', steps: ['Open Command Prompt and run "net use Z: /delete" then "net use Z: \\\\server\\share /persistent:yes"', 'If access denied, run "net use Z: \\\\server\\share /user:DOMAIN\\username *" (enter password when prompted)', 'Check DNS: "ping server" — if it fails, use "nslookup server" to verify DNS resolution', 'Ensure "TCP/IP NetBIOS Helper" service is running: services.msc → find the service → start/restart it', 'Map the drive using IP address instead of server name: "net use Z: \\\\192.168.x.x\\share"', 'Add the mapped drive as a startup script or use Group Policy for persistent mapping'], related: ['kb-031', 'kb-030', 'kb-025'], readingTime: '7 min', views: '10.1K', updated: '6 days ago', popular: false },
    { id: 'kb-010', category: 'Account & Access', icon: 'user-check', title: 'Password reset — self-service guide', summary: 'Complete walkthrough for resetting your corporate account password via self-service portal.', problem: 'Your corporate account password has expired or you have forgotten it. You need to reset it to regain access to email, VPN, and other enterprise systems.', symptoms: '- Login prompt shows "Your password has expired and must be changed"\\n- "Incorrect username or password" on multiple systems despite correct entry\\n- Account locked after too many failed attempts\\n- Unable to access email on mobile after password change', rootCause: 'Corporate password policies require password changes every 90 days. Users may also trigger lockouts by entering old passwords or failing sync between on-premises Active Directory and cloud Azure AD.', steps: ['Visit the self-service password reset portal at https://password.company.com', 'Enter your username and complete multi-factor authentication via phone or authenticator app', 'Create a new password meeting requirements: 12+ characters, uppercase, lowercase, number, special character', 'Log in to a company workstation with the new password — this triggers domain sync', 'Update password on all mobile devices: iOS Settings → Passwords & Accounts, Android Settings → Accounts → Company email', 'If using VPN, update stored credentials in the VPN client settings'], notes: 'Password changes are synced to Azure AD within 5 minutes. If the new password does not work after 15 minutes, contact the IT Service Desk.', warning: 'Never share your password with anyone. IT will never ask for your password via phone, email, or in person.', related: ['kb-035', 'kb-014', 'kb-016'], readingTime: '5 min', views: '18.7K', updated: '2 days ago', popular: true },
    { id: 'kb-011', category: 'Account & Access', icon: 'user-check', title: 'MFA authentication failed — troubleshooting', summary: 'Resolve multi-factor authentication failures for corporate systems, including authenticator app issues.', problem: 'Multi-factor authentication (MFA) prompt fails to appear on your registered device, or the code entered is rejected. You cannot complete login to corporate systems.', symptoms: '- MFA push notification does not arrive on phone\\n- "Invalid code" error when entering authenticator app code\\n- SMS verification code not received\\n- MFA prompt appears but selecting "Approve" does nothing\\n- Works on some apps but not others', rootCause: 'MFA failures are typically caused by: (1) Phone clock not synchronized — time drift causes TOTP codes to be rejected, (2) Authenticator app not updated or cache corrupted, (3) Device registration expired or revoked, (4) Network proxy blocking the MFA service endpoint, (5) Conditional Access policy requiring a different authentication method.', steps: ['Verify your phone date/time is set to automatic: Settings → Date & Time → Automatic', 'Open the Microsoft Authenticator app and ensure it shows your account with the rotating code', 'Close and reopen the authenticator app, or force-stop and restart it', 'If push notifications fail, switch to "Verification code" mode and type the code manually', 'Try the "I cannot use my Microsoft Authenticator app" option and use SMS or alternative method', 'If all MFA methods fail, contact IT Support to re-register your device'], related: ['kb-035', 'kb-010', 'kb-014'], readingTime: '7 min', views: '9.4K', updated: '4 days ago', popular: false },
    { id: 'kb-012', category: 'Network & Connectivity', icon: 'globe', title: 'VPN client installation and configuration', summary: 'Step-by-step guide to install, configure, and connect to the corporate VPN for remote work.', problem: 'You need to install or reconfigure the company VPN client on a new or company-managed device to access internal resources from outside the office.', symptoms: '- VPN client is not installed on the device\\n- Existing VPN configuration is missing or corrupted\\n- "The network connection does not exist" error when connecting\\n- VPN option not available in network settings\\n- Certificate errors during connection', rootCause: 'VPN client may need manual installation on non-managed devices, or the configuration profile may not have been pushed correctly. For BYOD devices, manual setup is required with the correct connection parameters.', steps: ['Download the VPN client (AnyConnect / company VPN) from the Software Center or IT portal', 'Install the client with default options — administrator privileges may be required', 'Open the VPN client and click "Add New Connection" or import the configuration file provided by IT', 'Enter the VPN server address: vpn.company.com (provided by IT)', 'Select "IKEv2" or "SSL VPN" as connection type based on your region', 'Save the connection and click "Connect" — authenticate with your domain credentials and MFA'], related: ['kb-001', 'kb-003', 'kb-004'], readingTime: '8 min', views: '6.3K', updated: '2 weeks ago', popular: false },
    { id: 'kb-013', category: 'Hardware', icon: 'monitor', title: 'Laptop battery draining fast — optimization guide', summary: 'Identify causes and solutions for rapid laptop battery drain, including software and hardware adjustments.', problem: 'Company laptop battery drains significantly faster than normal, lasting 1-2 hours instead of the expected 6-8 hours. The battery percentage drops rapidly even during light tasks.', symptoms: '- Battery life reduced from 6-8 hours to 1-3 hours\\n- Laptop feels warm to the touch on the bottom\\n- Task Manager shows high CPU usage even when idle\\n- Battery report shows higher discharge rate than normal\\n- Issue persists after reboot', rootCause: 'Common causes include: (1) Background processes like Windows Search indexing, antivirus scans, or Teams running with high resource usage, (2) Battery calibration drift, (3) Newly installed software running background services, (4) Display brightness set to maximum, (5) Battery age degradation after 12+ months of use.', steps: ['Open Task Manager (Ctrl+Shift+Esc) → sort by CPU usage — identify and close non-essential high-usage processes', 'Generate a battery report: Open PowerShell as Admin → run "powercfg /batteryreport" → open the HTML report at C:\\Users\\[user]\\battery-report.html', 'Lower screen brightness to 50% and enable "Battery Saver" mode from system tray', 'Close Microsoft Teams and other apps not in use — Teams is a known battery drainer', 'Update power plan: Control Panel → Power Options → select "Power Saver" plan', 'If discharge rate exceeds 30,000 mW on a 50,000 mWh battery, request a battery replacement from IT'], related: ['kb-029', 'kb-026'], readingTime: '6 min', views: '7.8K', updated: '5 days ago', popular: false },
    { id: 'kb-014', category: 'Account & Access', icon: 'user-check', title: 'Account locked after multiple failed login attempts', summary: 'Unlock your corporate account after repeated failed password attempts and prevent future lockouts.', problem: 'Your account has been locked due to multiple incorrect password attempts. You cannot log into any corporate system — email, VPN, or workstation.', symptoms: '- "Account locked" or "Account disabled" message on login\\n- Access denied on all corporate systems simultaneously\\n- MFA prompts do not appear (account is disabled)\\n- You may have received a security alert email about failed login attempts', rootCause: 'Active Directory lockout threshold (usually 5-10 failed attempts within 15 minutes) triggered. This can happen when: (1) A mobile device or application has stored an old password, (2) A scheduled task or service is using old credentials, (3) Someone is attempting to access your account, (4) CAPS LOCK was on, or keyboard layout differs from expected.', steps: ['Wait 15 minutes — most lockouts auto-expire after 15 minutes', 'Check mobile devices: go to Settings → Passwords & Accounts → remove corporate email → re-add with correct password', 'Check stored VPN credentials: Control Panel → Credential Manager → Windows Credentials → update stored domain passwords', 'If auto-unlock does not work, contact IT Support to manually unlock your account', 'Once unlocked, reset your password via the self-service portal for security', 'Review "Sign-in activity" in Azure AD My Sign-ins to verify no unauthorized access attempts'], related: ['kb-010', 'kb-011', 'kb-035'], readingTime: '5 min', views: '14.2K', updated: '3 days ago', popular: true },
    { id: 'kb-015', category: 'Printer', icon: 'printer', title: 'Printer offline or not responding', summary: 'Fix corporate network printers showing "Offline" status, paper jam errors, and print queue stuck issues.', problem: 'A network printer appears as "Offline" in Windows, or print jobs remain stuck in the queue with "Error - Printing" status. The printer may have paper jammed or be out of toner.', symptoms: '- Printer shows "Offline" in Devices & Printers\\n- Print jobs stuck in queue with error status\\n- "Printer not responding" message when trying to print\\n- Paper jam error even after clearing visible jams\\n- Printer screen shows error code', rootCause: 'Network printer issues are usually: (1) Printer in power-save mode — needs wake-up via physical button, (2) Print spooler service hung, (3) Network connectivity lost between PC and printer, (4) Paper jam with hidden sheets in the duplex unit, (5) Printer IP address changed via DHCP renewal.', steps: ['Check the printer physical display for error messages and clear any paper jams shown', 'Press the printer power button to wake it up — wait 30 seconds', 'Open Devices & Printers → right-click the printer → "See what\'s printing" → Printer menu → "Cancel All Documents"', 'Open Services (services.msc) → find "Print Spooler" → right-click → Restart', 'Ping the printer\'s IP address (found on printer display or label). If ping fails, printer is disconnected from network', 'Remove and re-add the printer: Devices & Printers → Remove Device → Add Printer → "The printer that I want isn\'t listed" → Add by TCP/IP address'], related: ['kb-027', 'kb-029'], readingTime: '8 min', views: '13.6K', updated: '2 days ago', popular: true },
    { id: 'kb-016', category: 'Account & Access', icon: 'user-check', title: 'Cannot access email on mobile device', summary: 'Resolve issues adding or syncing corporate email on iOS and Android phones and tablets.', problem: 'Corporate email cannot be added to a mobile device, or existing email sync has stopped working on the phone.', symptoms: '- "Cannot connect to server" when adding email on iPhone/Android\\n- Email sync stopped working after password change\\n- "Invalid credentials" error on mobile email app\\n- Exchange ActiveSync not working\\n- Calendar and contacts not syncing to phone', rootCause: 'Mobile email issues are most commonly caused by: (1) Password changed on desktop but not updated on mobile, (2) Device no longer compliant with MDM policies, (3) Exchange ActiveSync disabled on the mailbox, (4) App password required for legacy authentication, (5) Microsoft 365 Conditional Access blocking the device.', steps: ['Open mobile email app → remove the corporate account → re-add it with current password and MFA', 'Install the Microsoft Outlook mobile app from App Store / Play Store — it handles Modern Authentication better', 'Try "outlook.office.com" in mobile browser — if works, it\'s an app configuration issue', 'If using iOS native mail: Settings → Mail → Accounts → corporate email → toggle "Mail" off/on, or delete/re-add', 'If using Samsung Email or Android native: clear app cache from Settings → Apps → Email → Storage → Clear Cache', 'Check Company Portal / Intune — if device is non-compliant, follow prompts to re-enroll'], related: ['kb-005', 'kb-010', 'kb-035'], readingTime: '7 min', views: '11.5K', updated: '1 day ago', popular: true },
    { id: 'kb-017', category: 'ERP / SAP', icon: 'database', title: 'SAP Login Error 691 — invalid credentials', summary: 'Troubleshoot SAP GUI login failures with error codes related to authentication and SSO.', problem: 'SAP GUI displays "Error 691" or "Authentication failed" when attempting to log in. The error appears immediately after entering credentials, even though they work on other systems.', symptoms: '- SAP GUI shows "Error 691: Invalid name or password"\\n- SSO (Single Sign-On) login fails silently\\n- SAP Logon pad shows "Service Unavailable" for some systems\\n- Works from one machine but not another\\n- Error appears after SAP system copy or refresh', rootCause: 'SAP Error 691 typically results from: (1) User master record locked in SAP after multiple failed attempts, (2) Password expired in SAP but not in Active Directory (separate password policy), (3) SSO Kerberos token mismatch — workstation joined to different AD domain than SAP expects, (4) SAP application server does not trust the authenticating domain.', steps: ['Verify your SAP username — it may differ from your Windows username. Check with your SAP team.', 'If SSO fails, use "SAP Logon → Properties" and check "Use secure login" — try unchecking it', 'For SAP GUI: right-click the system entry → Properties → Advanced → set application server and instance number', 'Clear SAP Logon cache: %APPDATA%\\SAP\\Common → delete SAPLogon.xml and SecureLoginStorage files', 'If password reset is needed, use the SAP password reset portal or contact your SAP Basis team', 'Ensure your workstation is on the corporate domain and can reach the SAP message server'], related: ['kb-018', 'kb-019', 'kb-034'], readingTime: '7 min', views: '5.2K', updated: '1 week ago', popular: false },
    { id: 'kb-018', category: 'ERP / SAP', icon: 'database', title: 'SAP GUI crashes or freezes on launch', summary: 'Fix SAP GUI application crashes, freezes, and display rendering issues on Windows.', problem: 'SAP GUI crashes immediately after launch, freezes when opening a transaction, or displays garbled text and missing UI elements.', symptoms: '- SAP GUI closes immediately with no error message\\n- Application freezes when entering transaction code\\n- Text fields or buttons not rendering correctly\\n- "SAP GUI has stopped working" error dialog\\n- Multiple SAP GUI sessions cause system slowdown', rootCause: 'SAP GUI issues are usually related to: (1) Corrupted SAP GUI local installation or missing patches, (2) Java version mismatch for SAP GUI for Java, (3) Conflicting SAP GUI add-ins or third-party SAP tools, (4) Windows Display Scaling > 100% causing rendering issues, (5) Insufficient user profile disk space for SAP GUI temp files.', steps: ['Open SAP Logon → right-click system → Properties → optimize network settings → set "Low Speed Connection" to off', 'Clear SAP GUI cache: run "%USERPROFILE%\\AppData\\Local\\SAP" → delete SAPGUI folder contents', 'Open SAP GUI → click the Settings wheel icon → Visualization → disable "Optimized Column Tree" and "Optimized Grid Control"', 'Set Windows Display Scaling to 100%: Settings → System → Display → Scale = 100%', 'Repair SAP GUI: Control Panel → Programs → SAP GUI for Windows → Change → Modify/Repair', 'Update SAP GUI to the latest patch from the SAP Support Portal via your Basis team'], related: ['kb-017', 'kb-019', 'kb-034'], readingTime: '6 min', views: '4.8K', updated: '2 weeks ago', popular: false },
    { id: 'kb-019', category: 'ERP / SAP', icon: 'database', title: 'SAP transaction SM37 job not running', summary: 'Diagnose and fix scheduled background jobs in SAP that fail to start or complete successfully.', problem: 'A scheduled background job in SAP (transaction SM37) did not start at the scheduled time, or started but ended with an error status.', symptoms: '- Job status shows "Cancelled" or "Finished with errors" in SM37\\n- Job did not start at scheduled time\\n- "Job started" log entry exists but no completion entry\\n- Output spool for the job is empty or contains error messages\\n- Job dependencies not met', rootCause: 'Background job failures are typically caused by: (1) Printer/spool issues — job outputs to a printer that is offline, (2) Dependent job or predecessor job failed, (3) Batch process availability — no background work processes available, (4) Authorization issue — the user who scheduled the job no longer has required authorizations, (5) Data volume exceeded available memory in the work process.', steps: ['Log into SAP and run transaction SM37', 'Enter the job name and date range, then click Execute', 'Select the failed job run and click "Job log" to see the exact error message', 'Save the job log as a screenshot or text file for the SAP Basis team', 'If error indicates a print/spool problem, run SP01 to check output status', 'Reschedule the job: select the job definition → click "Start job" → set a new start time'], related: ['kb-017', 'kb-018', 'kb-034'], readingTime: '5 min', views: '3.6K', updated: '3 weeks ago', popular: false },
    { id: 'kb-020', category: 'Cloud & SaaS', icon: 'cloud', title: 'OneDrive sync stuck or not syncing', summary: 'Resolve OneDrive file synchronization issues, stuck sync status, and conflict errors on Windows/Mac.', problem: 'OneDrive shows "Sync is paused", "Processing changes" indefinitely, or files have green check marks but are not up to date across devices.', symptoms: '- OneDrive icon shows "Sync paused" or "Processing 0KB of X" for hours\\n- Files have green check marks but other devices show older versions\\n- "The file is locked" or "Changes haven\'t synced yet" errors\\n- OneDrive icon shows "Sign in needed" despite being signed in\\n- High CPU usage from OneDrive process', rootCause: 'OneDrive sync issues are most often caused by: (1) Maximum file path length exceeded (files > 255 characters), (2) File name contains unsupported characters, (3) File open in another program, (4) OneDrive app needs reset, (5) Files or folder names exceed 400 characters total, (6) Network proxy or firewall blocking sync endpoints.', steps: ['Right-click OneDrive in system tray → Pause syncing → wait 30 seconds → Resume syncing', 'Check for problematic files: click OneDrive icon → "View sync problems" → resolve file name conflicts', 'Reset OneDrive: Win+R → type "%localappdata%\\Microsoft\\OneDrive\\onedrive.exe /reset" → wait 2 minutes → restart OneDrive', 'Check file names and paths: ensure no file exceeds 255 characters total path length', 'Unlink and relink: OneDrive Settings → Account → "Unlink this PC" → set up again', 'Update OneDrive: Settings → About → version info. Download latest from Microsoft if outdated'], related: ['kb-023', 'kb-032', 'kb-041'], readingTime: '8 min', views: '12.9K', updated: '3 days ago', popular: true },
    { id: 'kb-021', category: 'Cloud & SaaS', icon: 'cloud', title: 'Microsoft 365 license not showing — activation guide', summary: 'Fix Microsoft 365 / Office activation errors, "Unlicensed Product" banners, and license assignment issues.', problem: 'Microsoft 365 applications (Word, Excel, PowerPoint) show "Unlicensed Product" in the title bar or "Product Activation Failed" errors when launching.', symptoms: '- "Unlicensed Product" displayed in Office app title bar\\n- "Your subscription has expired" error despite active license\\n- Office apps launch in reduced functionality mode\\n- Activation wizard fails at sign-in step\\n- Some Office apps work while others show unlicensed', rootCause: 'Activation issues are typically caused by: (1) License assigned in M365 Admin Center but not synced to the user\'s device, (2) Conflicting previous Office installation (MSI vs C2R), (3) Activation token corrupted, (4) User not signed in with corporate account in Office, (5) Network connectivity to Microsoft licensing servers blocked.', steps: ['Open any Office app → File → Account → check the "User Information" section — ensure it shows your corporate email', 'Sign out (Sign-out all accounts) and sign back in with your corporate credentials', 'Run the Microsoft Activation Troubleshooter: Settings → Update & Security → Troubleshoot → Additional troubleshooter → Microsoft Office Activation', 'Check license assignment: open browser → go to portal.office.com → My Account → Subscriptions — verify Office 365 E3/E5 is listed', 'Repair Office: Control Panel → Programs → Microsoft 365 → Change → Quick Repair (or Online Repair if needed)', 'If still failing, clear the Activation token: close Office → run "%ProgramFiles%\\Microsoft Office 16\\ClientX64\\SCRUBBING.EXE /ALL" in Admin CMD → restart and re-activate'], related: ['kb-005', 'kb-020', 'kb-023'], readingTime: '7 min', views: '8.3K', updated: '5 days ago', popular: false },
    { id: 'kb-022', category: 'Security & Access', icon: 'shield', title: 'Website blocked — "This site is not safe" corporate proxy warning', summary: 'Learn why legitimate websites are blocked by the corporate proxy and how to request access reviews.', problem: 'A website required for work is blocked by the corporate web proxy with a "This site has been blocked" or "Unsafe website" warning. The site is legitimate business software.', symptoms: '- Browser shows "This site is blocked by corporate policy"\\n- "Certificate Warning — This site is not trusted" on internal sites\\n- Proxy authentication prompt appears repeatedly\\n- Site works from home network but not from office\\n- Only specific pages of a site are blocked', rootCause: 'Corporate web proxy and filtering tools (Zscaler, Bluecoat, or similar) categorize websites by content. Legitimate business sites may be miscategorized as "Newly Registered", "Uncategorized", or "Potentially Harmful". Certificate warnings occur when internal sites use self-signed certificates not trusted by the corporate root CA.', steps: ['Click the "Request Access" or "Report Misclassification" link on the block page', 'Copy the full URL that is blocked and note the block category (e.g., "Security Risk", "Uncategorized")', 'Send an email to IT Security with the URL, category, and business justification for access', 'For certificate errors on internal sites, contact the application owner to have the certificate installed in the corporate trusted root store', 'While waiting for review, use a different browser or Incognito mode may bypass client-side filters temporarily', 'For urgent access, request a temporary proxy bypass (duration and scope limited by IT policy)'], related: ['kb-011', 'kb-035', 'kb-014'], readingTime: '5 min', views: '5.1K', updated: '1 week ago', popular: false },
    { id: 'kb-023', category: 'Cloud & SaaS', icon: 'cloud', title: 'Microsoft Teams file upload stuck or failing', summary: 'Fix Microsoft Teams file upload failures, "Upload blocked" errors, and file sharing problems.', problem: 'Files cannot be uploaded to Microsoft Teams chats, channels, or meetings. The upload progress bar stops at 0% or fails with "Upload blocked" error.', symptoms: '- File upload progress bar stuck at 0% or 50%\\n- "Upload blocked — this file type is not supported" error\\n- Files upload to one chat but not another\\n- Drag-and-drop not working in Teams\\n- Teams says "File not found" immediately after upload', rootCause: 'Teams file upload issues stem from: (1) File type blocked by SharePoint admin policy, (2) File exceeds the 250 MB per-file upload limit, (3) Teams cache corruption affecting the upload pipeline, (4) Destination SharePoint site quota exceeded, (5) Filename contains characters not allowed in SharePoint ( # % & * : < > ? / \\ | ~ ).', steps: ['Check file size — ensure it is under 250 MB. Compress large files before uploading.', 'Rename the file to remove special characters: # % & * : < > ? / \\ | ~', 'Try a different upload method: click the paperclip icon instead of drag-and-drop', 'Clear Teams cache: close Teams → "%appdata%\\Microsoft\\Teams" → delete Cache, Code Cache, tmp → restart', 'Upload the file to OneDrive first, then share the link in Teams chat', 'As a workaround, send the file via email while IT investigates SharePoint quotas'], related: ['kb-008', 'kb-006', 'kb-020'], readingTime: '6 min', views: '7.4K', updated: '4 days ago', popular: false },
    { id: 'kb-024', category: 'Windows & OS', icon: 'monitor', title: 'Windows Blue Screen (BSOD) after update', summary: 'Diagnose and fix Windows blue screen errors that occur after installing system updates.', problem: 'Windows 11 displays a blue screen error (Stop Code: SYSTEM_SERVICE_EXCEPTION, PAGE_FAULT_IN_NONPAGED_AREA, or CRITICAL_PROCESS_DIED) after a recent Windows Update.', symptoms: '- Blue screen appears during boot or shortly after login\\n- Stop code references driver or system service\\n- PC restarts and may boot into "Recovery" mode\\n- Issue started after specific Windows Update KBxxxxxx\\n- Safe Mode may or may not work', rootCause: 'BSOD after updates are usually caused by: (1) Incompatible or outdated third-party drivers, particularly GPU, network, or storage drivers, (2) Corrupted update installation, (3) Antivirus/filter drivers conflicting with new Windows kernel changes, (4) Insufficient disk space prevented update from completing correctly, (5) BIOS/firmware incompatibility with the update.', steps: ['Boot into Windows Recovery: restart PC → press F11 or Shift+Restart during boot → Troubleshoot → Advanced → Startup Settings → Restart → F4 for Safe Mode', 'If Safe Mode works, uninstall the problematic update: Settings → Windows Update → Update History → Uninstall Updates → select the latest KB update → Uninstall', 'Run SFC and DISM: Open Command Prompt as Admin → "sfc /scannow" → then "dism /online /cleanup-image /restorehealth"', 'Update all drivers: Device Manager → right-click devices → Update driver. Focus on GPU and network adapters.', 'Check disk space: ensure C: drive has at least 20 GB free space', 'If all else fails, use System Restore: Recovery → Open System Restore → restore to a point before the update'], related: ['kb-033', 'kb-029', 'kb-026'], readingTime: '10 min', views: '16.8K', updated: '2 days ago', popular: true },
    { id: 'kb-025', category: 'Network & Connectivity', icon: 'globe', title: 'Wi-Fi keeps disconnecting randomly', summary: 'Fix intermittent Wi-Fi disconnections on corporate laptops and desktops with wireless adapters.', problem: 'Wi-Fi connection drops randomly every 10-30 minutes. The network icon shows "Connected" but internet access is lost, and the Wi-Fi reconnects after a few seconds.', symptoms: '- "No internet, secured" message while connected to Wi-Fi\\n- Network disconnects and reconnects automatically\\n- Wired (Ethernet) connection works fine\\n- Issue affects multiple access points\\n- USB Wi-Fi adapter works more reliably than built-in', rootCause: 'Random disconnections are most often caused by: (1) Power management turning off the Wi-Fi adapter to save power, (2) Driver conflict with Windows power-saving states, (3) 2.4 GHz band interference from wireless peripherals or microwaves, (4) Wi-Fi adapter overheating, (5) Router APs with too many connected clients.', steps: ['Right-click Start → Device Manager → Network adapters → Wi-Fi adapter → Properties → Power Management → uncheck "Allow the computer to turn off this device to save power"', 'Control Panel → Power Options → Change plan settings → Change advanced power settings → Wireless Adapter Settings → Power Saving Mode → set to "Maximum Performance"', 'Update Wi-Fi adapter driver from the laptop manufacturer\'s website', 'Run network reset: Settings → Network & Internet → Advanced network settings → Network reset → Reset now', 'Switch to 5 GHz Wi-Fi band if available (SSID ending in "-5G")', 'If on a docking station, try using the laptop\'s built-in Wi-Fi directly'], related: ['kb-002', 'kb-009', 'kb-030'], readingTime: '7 min', views: '6.9K', updated: '6 days ago', popular: false },
    { id: 'kb-026', category: 'Windows & OS', icon: 'monitor', title: 'Windows Update stuck at "Getting things ready"', summary: 'Resolve Windows Update that hangs during installation at various percentages or stuck on restart.', problem: 'Windows Update installation hangs at a specific percentage (e.g., 25%, 35%, 95%) or shows "Getting Windows ready. Don\'t turn off your computer" for hours.', symptoms: '- Update stuck at X% for over 30 minutes\\n- "Getting Windows ready" screen persists\\n- PC is unresponsive but power LED is on\\n- Multiple update attempts fail at the same point\\n- Previous updates installed successfully', rootCause: 'Stuck Windows Updates are usually caused by: (1) Windows Update component store corruption, (2) Third-party antivirus locking update files, (3) Insufficient disk space in C:\\Windows\\SoftwareDistribution, (4) Conflicting background services, (5) Update file download was corrupted.', steps: ['Press and hold the power button for 10 seconds to force shutdown. Boot again and let it retry — sometimes this resolves the stuck state.', 'If it continues to stick, boot into Safe Mode (F11 → Troubleshoot → Advanced → Startup Settings → Restart → F4)', 'In Safe Mode, stop WU services: Open Admin CMD → "net stop wuauserv & net stop bits & net stop cryptsvc"', 'Rename the cache folder: "ren C:\\Windows\\SoftwareDistribution SoftwareDistribution.old" and "ren C:\\Windows\\System32\\catroot2 catroot2.old"', 'Restart services: "net start wuauserv & net start bits & net start cryptsvc"', 'Run Windows Update Troubleshooter: Settings → System → Troubleshoot → Other trouble-shooters → Windows Update → Run'], related: ['kb-024', 'kb-033', 'kb-029'], readingTime: '8 min', views: '11.3K', updated: '3 days ago', popular: false },
    { id: 'kb-027', category: 'Printer', icon: 'printer', title: 'Print job stuck in queue — clearing guide', summary: 'Clear hung print jobs and fix the Windows print spooler when print jobs remain in queue permanently.', problem: 'A print job appears stuck in the print queue and cannot be canceled. New print jobs also get stuck behind the failed job.', symptoms: '- Document shows "Printing" or "Error - Printing" but never prints\\n- Cannot delete or cancel the stuck job\\n- "Delete" option is greyed out\\n- New print jobs also get stuck\\n- Restarting the printer does not clear the queue', rootCause: 'The Windows Print Spooler service has a failed job that is locking the spool file. This happens when: (1) The printer ran out of paper mid-job and the spooler did not recover, (2) A corrupted print driver caused the spooler to hang, (3) The user who submitted the job disconnected from the network, (4) The print file format was corrupted during spooling.', steps: ['Open Services (services.msc) → find "Print Spooler" → right-click → Stop', 'Open File Explorer and navigate to "C:\\Windows\\System32\\spool\\PRINTERS" — delete all files in this folder', 'Go back to Services → right-click "Print Spooler" → Start', 'Try printing a test page: Printers & Scanners → select printer → "Print a test page"', 'If the issue persists, use PowerShell as Admin: "Get-PrintJob -PrinterName "Printer Name" | Remove-PrintJob"', 'Restart the computer to ensure the spooler starts cleanly'], related: ['kb-015', 'kb-029'], readingTime: '6 min', views: '9.7K', updated: '4 days ago', popular: false },
    { id: 'kb-028', category: 'Software / Applications', icon: 'package', title: 'Application not responding — force quit and recover', summary: 'Force close frozen applications and recover unsaved work using Windows built-in tools.', problem: 'A business application (ERP client, CRM, or office tool) has stopped responding. The window shows "(Not Responding)" in the title bar and cannot be closed normally.', symptoms: '- Application window shows "Not Responding"\\n- Clicking the X button does nothing or shows "Waiting for program"\\n- Mouse cursor shows loading spinner\\n- Task Manager shows "Not Responding" status\\n- Other applications work fine', rootCause: 'Applications freeze due to: (1) Waiting for a network resource that timed out without proper error handling, (2) Memory leak causing the app to exhaust available RAM, (3) Infinite loop in application logic, (4) File handle deadlock with another process, (5) UI thread blocked by a long-running operation.', steps: ['Press Ctrl+Alt+Delete → Task Manager → find the frozen app → right-click → "End Task"', 'If Task Manager is also not responding, use Alt+F4 to attempt to close the active window', 'For unrecoverable freezes: press and hold the power button for 10 seconds to force shutdown', 'When the app restarts, check if there is an "AutoRecovery" pane (Office apps) that recovered your work', 'Clear the application cache: check %APPDATA%\\[AppName] for cache folders to delete', 'If the app freezes consistently, report to IT with details of the exact action that triggered the freeze'], related: ['kb-018', 'kb-029', 'kb-033'], readingTime: '5 min', views: '6.2K', updated: '1 week ago', popular: false },
    { id: 'kb-029', category: 'Windows & OS', icon: 'monitor', title: 'Windows slow boot — startup optimization', summary: 'Improve Windows boot time by identifying and disabling unnecessary startup programs and services.', problem: 'Windows takes 5+ minutes to boot to the desktop. After login, the desktop is slow to respond and applications take time to become usable.', symptoms: '- "Welcome" or "Please wait" screen appears for 3+ minutes\\n- Desktop icons load slowly after login\\n- Startup applications take 30+ seconds to appear\\n- Task Manager shows 100% disk usage at startup\\n- PC speeds up after 5 minutes of use', rootCause: 'Slow boot is cumulative: (1) Too many startup applications — each adds 2-10 seconds to login, (2) Windows Fast Boot feature conflicting with drivers, (3) Full antivirus scan at startup, (4) Old or failing HDD (non-SSD), (5) Startup repair transitions pending from improper shutdown, (6) Group Policy scripts running at login.', steps: ['Open Task Manager (Ctrl+Shift+Esc) → Startup tab → sort by "Startup impact" → disable all high-impact apps that are not essential (Teams, Skype, Adobe updaters)', 'Run "msconfig" → Services tab → check "Hide all Microsoft services" → disable any third-party services that are not business-critical', 'Check disk health: Open CMD as Admin → "wmic diskdrive get status" — if "Bad", request SSD replacement', 'Disable Fast Boot: Control Panel → Power Options → Choose what the power buttons do → Change settings that are currently unavailable → uncheck "Turn on fast startup" → Save', 'Run "powercfg -h off" in Admin CMD to disable hibernation (frees disk space and removes hibernation overhead)', 'Enable only essential startup programs from the Software Center, disable all auto-start from non-IT apps'], related: ['kb-013', 'kb-024', 'kb-033'], readingTime: '7 min', views: '10.4K', updated: '2 days ago', popular: true },
    { id: 'kb-030', category: 'Network & Connectivity', icon: 'globe', title: 'Internet slow on one computer only', summary: 'Diagnose and fix network performance issues that affect only a single workstation on the network.', problem: 'One specific computer has very slow internet speeds while other devices on the same network work normally. Speed tests show 1-5 Mbps vs. expected 100+ Mbps.', symptoms: '- Speed test shows <5 Mbps on this computer, >100 Mbps on others\\n- Web pages time out or load very slowly\\n- Internal network resources (file shares, intranet) work fine\\n- Issue persists across different Wi-Fi networks\\n- VPN makes the issue worse', rootCause: 'Single-workstation slowdown is almost never a network infrastructure issue. Causes include: (1) Background Windows Update downloading in the background, (2) Third-party antivirus performing real-time HTTPS scanning — decrypting and re-encrypting every packet, (3) Malware or adware consuming bandwidth, (4) Ethernet cable damaged, (5) DNS configuration pointing to slow or unresponsive servers.', steps: ['Open Task Manager → Performance → click "Open Resource Monitor" → Network tab → sort by "Total (B/sec)" — identify any process using bandwidth', 'Check for Windows Updates: Settings → Windows Update → if a download is in progress, pause updates', 'Temporarily disable third-party antivirus HTTPS scanning: open the AV → Settings → scan options → disable "SSL/TLS inspection" or "HTTPS scanning"', 'Run a malware scan: Windows Security → Virus & threat protection → Scan options → Microsoft Defender Offline Scan', 'Check DNS: Settings → Network → change DNS to 8.8.8.8 and 1.1.1.1 temporarily to test', 'Test with a wired Ethernet connection — if speeds are normal, replace the Wi-Fi adapter'], related: ['kb-002', 'kb-025', 'kb-013'], readingTime: '8 min', views: '7.6K', updated: '5 days ago', popular: false },
    { id: 'kb-031', category: 'Network & Connectivity', icon: 'globe', title: 'DNS resolution failure — "Server not found"', summary: 'Fix DNS resolution errors where websites cannot be found despite having internet connectivity.', problem: 'Websites return "DNS_PROBE_FINISHED_NXDOMAIN" or "Server not found" in the browser. Other network functions like ping to IP addresses work, but domain names do not resolve.', symptoms: '- "DNS_PROBE_FINISHED_NXDOMAIN" in Chrome\\n- "Server not found" in Firefox / Edge\\n- Ping to IP addresses works, ping to domain names fails\\n- Some websites work while others do not\\n- nslookup returns "Non-existent domain" for corporate sites', rootCause: 'DNS failures are usually: (1) DNS cache corrupted with outdated entries, (2) Computer pointing to a DNS server that is unreachable or not responding, (3) Corporate VPN DNS suffix not configured correctly, (4) IPv6 DNS resolution failing while IPv4 works, (5) Hosts file has incorrect manual entries for the domain.', steps: ['Run "ipconfig /flushdns" in Command Prompt as Administrator', 'Run "ipconfig /registerdns" and "ipconfig /renew" in Admin CMD', 'Check DNS servers: "ipconfig /all" — verify DNS server IPs. If using 8.8.8.8 at work, change to corporate DNS', 'Reset Winsock: "netsh winsock reset" in Admin CMD, then restart', 'Check the hosts file at: C:\\Windows\\System32\\drivers\\etc\\hosts — remove any lines related to the failing domain', 'If on VPN, ensure "Use default gateway on remote network" is enabled in IPv4 advanced settings of the VPN adapter'], related: ['kb-004', 'kb-009', 'kb-030'], readingTime: '6 min', views: '8.4K', updated: '3 days ago', popular: false },
    { id: 'kb-032', category: 'Windows & OS', icon: 'monitor', title: 'Windows activation error — "We can\'t activate Windows"', summary: 'Fix Windows activation failures after hardware changes, Windows updates, or corporate license issues.', problem: 'Windows displays "We can\'t activate Windows on this device" or "Windows is not activated" in Settings, usually after a hardware change or major Windows Update.', symptoms: '- "Windows is not activated" watermark in bottom-right corner\\n- "Activate Windows" message in Settings\\n- "We can\'t reactivate Windows on this device" error\\n- Activation failed with error code 0xC004F074 or 0x803F7001\\n- Personalization settings are locked', rootCause: 'Windows activation fails because: (1) Corporate KMS activation — device lost connectivity to the KMS server for >180 days, (2) Hardware change (motherboard replacement) — Windows license tied to hardware hash changed, (3) Windows upgrade from Windows 10 to 11 on ineligible hardware, (4) Product key mismatch — device was reimaged with wrong edition, (5) BIOS-based activation token (SLIC table) corrupted.', steps: ['Run "slmgr /dli" in Admin CMD to check current license state — note the description and partial product key', 'If using KMS: run "slmgr /skms kms.company.com:1688" then "slmgr /ato"', 'If error 0xC004F074, check system time: ensure date/time is correct and time zone matches the KMS server', 'Run "slmgr /ipk XXXXX-XXXXX-XXXXX-XXXXX-XXXXX" (generic KMS key for your Windows edition) then "slmgr /ato"', 'For hardware changes, use the Activation Troubleshooter: Settings → Activation → Troubleshoot → "I changed hardware on this device recently" → sign in → select device', 'If still failing, contact IT to reset the Windows activation count or provide a MAK key'], related: ['kb-024', 'kb-033', 'kb-026'], readingTime: '7 min', views: '5.9K', updated: '1 week ago', popular: false },
    { id: 'kb-033', category: 'Windows & OS', icon: 'monitor', title: 'Disk space running out — cleanup guide', summary: 'Free up disk space on your corporate laptop without deleting work files or business applications.', problem: 'The C: drive is nearly full (less than 5 GB free space). Windows warns "Low disk space" and applications may start to behave unexpectedly.', symptoms: '- "Low disk space" notification from system tray\\n- Windows Update fails with 0x80070070 error (insufficient space)\\n- Applications crash or cannot save files\\n- PC becomes slow and unresponsive\\n- Cannot install new software', rootCause: 'Disk space is consumed by: (1) Windows temporary files and previous Windows installations (Windows.old) taking 20-40 GB, (2) User profile cache — browser cache, Teams cache, OneDrive files-on-demand local copies, (3) Windows Update cache (SoftwareDistribution folder), (4) Hibernation file (hiberfil.sys) taking 6-12 GB, (5) Recycle Bin not emptied, (6) Large log files from applications.', steps: ['Run Disk Cleanup: Win+R → "cleanmgr" → select C: drive → click "Clean up system files" → select EVERYTHING, especially "Windows Update Cleanup", "Delivery Optimization Files", and "Previous Windows Installations"', 'Run "powercfg -h off" in Admin CMD to delete the hibernation file (saves 6-12 GB)', 'Clear user caches: run "%temp%" → delete ALL contents (skip files in use), then run "temp" and "prefetch" and delete all', 'Move OneDrive files to "Files on-demand" only: right-click OneDrive in system tray → Settings → Accounts → "Save space and download files as you use them"', 'Use Settings → System → Storage → Storage Sense → turn it on and configure auto-cleanup monthly', 'Request IT to expand your C: drive or provide a laptop with larger SSD if storage is persistently insufficient'], related: ['kb-024', 'kb-026', 'kb-029'], readingTime: '8 min', views: '15.1K', updated: '2 days ago', popular: true },
    { id: 'kb-034', category: 'ERP / SAP', icon: 'database', title: 'SAP report output — spool and print configuration', summary: 'Guide to configuring SAP spool output for printing, emailing, or saving SAP reports.', problem: 'SAP report output (from transactions like ZHR_REPORT or ZFI_GL) cannot be printed or saved. The spool request is created but the output device shows "In process" indefinitely.', symptoms: '- "Create output request" dialog does not appear\\n- Spool request is "In process" for hours\\n- "No output device configured for user" error\\n- Output goes to wrong printer\\n- Spool requests disappear without printing', rootCause: 'SAP spool issues are typically caused by: (1) User\'s default output device is set to a printer that is offline, (2) Output device in SAP is not configured for the user\'s location, (3) Spool authorization (S_SPO_ACT) is missing or incorrect, (4) Front-end printing not configured in SAP GUI, (5) PDF output format not installed on the SAP application server.', steps: ['In SAP GUI, run transaction SPAD (Spool Administration)', 'Click "Output devices" → find your default device — ensure the device status is "Active"', 'If the device is offline, note the device name and contact SAP Basis support', 'For front-end printing: SAP GUI → Options → Scripting and Printing → Front-end printing → configure your default printer', 'To save as PDF: run the report → in the output options, select "LOCAL FILE" as output device, choose PDF format', 'Check your spool authorization: run SU53 to see if authorization object S_SPO_ACT is missing'], related: ['kb-017', 'kb-018', 'kb-019'], readingTime: '6 min', views: '3.9K', updated: '2 weeks ago', popular: false },
    { id: 'kb-035', category: 'Account & Access', icon: 'user-check', title: 'Self-service group membership management', summary: 'Guide to requesting and managing Active Directory group memberships for access to corporate resources.', problem: 'You need access to a shared folder, application, or distribution group but do not have the necessary Active Directory group membership.', symptoms: '- "Access denied" when opening a shared folder\\n- Cannot access a specific application or portal\\n- Not receiving emails from a distribution group\\n- New employee needs access to department resources\\n- Changed role requires different group memberships', rootCause: 'Access to corporate resources is managed through Active Directory security groups. New employees, role changes, and department transfers require updating group memberships that are typically granted based on job function.', steps: ['Identify the exact resource you need access to and the specific AD group name (ask your manager or team lead if unsure)', 'Visit the Access Request portal at https://access.company.com', 'Search for the group name or resource in the catalog', 'Submit an access request with your manager as the approver', 'Your manager will receive an email to approve/deny the request', 'Once approved, group membership takes effect within 15-60 minutes. Log out and log back in to refresh your Kerberos token.'], related: ['kb-010', 'kb-014', 'kb-016'], readingTime: '5 min', views: '8.8K', updated: '1 week ago', popular: false },
    { id: 'kb-036', category: 'Hardware', icon: 'monitor', title: 'External monitor not detected — docking station guide', summary: 'Fix issues with external monitors not being detected when connected through a docking station or directly.', problem: 'An external monitor connected to a corporate laptop via HDMI, DisplayPort, or USB-C docking station shows "No signal" or is not detected by Windows.', symptoms: '- "No signal" message on external monitor\\n- Windows Settings → Display → "Detect" finds no second display\\n- Monitor works when connected to another laptop\\n- USB devices on docking station work, but display does not\\n- Display works after multiple reconnections', rootCause: 'External monitor detection fails most commonly because: (1) Docking station firmware/driver outdated — especially Dell WD19 and Lenovo ThinkPad USB-C docks, (2) USB-C/Thunderbolt cable does not support DisplayPort Alt Mode, (3) The specific USB-C port on the laptop does not support video output, (4) Graphics driver crashed or outdated, (5) Monitor input source set incorrectly, (6) Docking station power delivery insufficient — dock needs 130W+ for full functionality.', steps: ['Press Win+P → select "Extend" or "Duplicate" — if "Extend" is greyed out, the monitor is not detected', 'Check the hardware: ensure the monitor is powered on and the correct input source (HDMI 1, DP, USB-C) is selected via the monitor\'s on-screen menu', 'Update docking station firmware: download Dell Command Update / Lenovo Dock Manager and run firmware update', 'Update graphics driver: Device Manager → Display adapters → right-click Intel/NVIDIA/AMD → Update driver', 'Disconnect everything → power cycle: unplug dock from wall power and laptop → wait 30 seconds → reconnect dock power → reconnect laptop → reconnect monitor', 'If using USB-C, try a different USB-C port on the laptop (some are data-only, some support video)'], related: ['kb-026', 'kb-029', 'kb-013'], readingTime: '7 min', views: '7.1K', updated: '4 days ago', popular: false },
    { id: 'kb-037', category: 'Software / Applications', icon: 'package', title: 'Application installation failed — error codes guide', summary: 'Common software installation error codes and their fixes for enterprise application deployment.', problem: 'An enterprise application fails to install through Software Center, Company Portal, or manual installer with an error code.', symptoms: '- Installation fails with error code 1603, 2755, or 1935\\n- "Another installation is in progress" error\\n- "Administrator rights required" on company-managed laptop\\n- Installer starts but rolls back at 50-80%\\n- Application installs but crashes on launch', rootCause: 'Installation failures are usually caused by: (1) Windows Installer service conflict — another MSI installation is already running, (2) Insufficient disk space in Temp directory, (3) Corrupted installer download — retry download, (4) Missing prerequisites — .NET Framework, Visual C++ Redistributable, or DirectX, (5) Group Policy blocks installation of unapproved software, (6) Antivirus quarantining installer components.', steps: ['Note the exact error code displayed during installation failure', 'Restart the computer — this clears any pending Windows Installer transactions', 'Retry installation from Software Center / Company Portal — ensure the computer is not disconnected from the network', 'Error 1603: run "msiexec /unregister" and "msiexec /regserver" in Admin CMD, then retry', 'Clear Temp: run "%temp%" → delete all files → retry installation', 'If the app is not in Software Center, request IT to publish it or provide installer with silent switches'], related: ['kb-028', 'kb-033', 'kb-029'], readingTime: '6 min', views: '5.5K', updated: '5 days ago', popular: false },
    { id: 'kb-038', category: 'Security & Access', icon: 'shield', title: 'Phishing email — how to report and stay safe', summary: 'Identify and report suspicious or phishing emails received in the corporate email system.', problem: 'You received an email that appears suspicious — it asks for credentials, contains unexpected attachments, or has a sense of urgency about account issues.', symptoms: '- Email from a known contact but with unusual language or request\\n- "Urgent: Verify your account" or "Password expired — click here"\\n- Sender address does not match the company domain exactly\\n- Poor grammar, generic greeting like "Dear User"\\n- Unexpected attachment (.zip, .docm, .js, .scr)\\n- Link URL does not match the displayed text when hovered', rootCause: 'Phishing emails are social engineering attacks designed to steal credentials or deploy malware. Attackers spoof legitimate senders or compromise real accounts to send malicious messages. Corporate email filters block 99% of phishing, but sophisticated targeted attacks (spear phishing) can bypass automated filters.', steps: ['DO NOT click any links, open attachments, or reply to the email', 'In Outlook, select the email → click "Report" button in the ribbon → "Report Phishing" (this sends it to IT Security for analysis)', 'If the "Report Phishing" button is missing, forward the email as an attachment to phishing@company.com — do not forward inline', 'If you clicked a link or entered credentials, immediately change your password at https://password.company.com and contact IT Security', 'If you opened a suspicious attachment, disconnect from the network (disable Wi-Fi) and call IT Security immediately', 'Remember: legitimate companies never ask for your password via email'], related: ['kb-010', 'kb-011', 'kb-014'], readingTime: '5 min', views: '12.3K', updated: '3 days ago', popular: true },
    { id: 'kb-039', category: 'Software / Applications', icon: 'package', title: 'Browser keeps crashing or freezing', summary: 'Troubleshoot browser crashes, freezes, and excessive memory usage in Chrome, Edge, or Firefox.', problem: 'The web browser (Chrome/Edge/Firefox) crashes frequently, tabs freeze, or the entire browser becomes unresponsive after a few minutes of use.', symptoms: '- "Aw, Snap!" error in Chrome\\n- "Page unresponsive" dialog when switching tabs\\n- Browser takes 30+ seconds to open\\n- Memory usage exceeds 4 GB in Task Manager\\n- Specific websites always crash the browser\\n- GPU-related crashes when watching video', rootCause: 'Browser crashes are typically caused by: (1) Too many extensions installed — each runs in its own process and can conflict, (2) Corrupted browser profile — cache, cookies, or local storage corrupted, (3) Hardware acceleration conflicting with GPU driver, (4) Malware/browser hijacker installed via a deceptive download, (5) Incompatibility between browser version and corporate web proxy/SSL inspection, (6) Memory leak from an open tab (Google Docs, heavy JS apps).', steps: ['Check Task Manager → sort by Memory — identify the browser process with highest usage', 'Clear browser cache: Settings → Privacy and security → Clear browsing data → "All time" → check Cookies, Cache → Clear', 'Disable extensions: go to chrome://extensions → toggle off all extensions → restart browser. Re-enable one by one to find the culprit.', 'Disable hardware acceleration: Settings → System → "Use hardware acceleration when available" → toggle off → restart browser', 'Create a new browser profile: chrome://settings → "People" → "Add" → create new profile without syncing', 'Reset browser settings: Settings → Advanced → "Reset and clean up" → "Restore settings to their original defaults"'], related: ['kb-028', 'kb-030', 'kb-022'], readingTime: '7 min', views: '9.3K', updated: '4 days ago', popular: false },
    { id: 'kb-040', category: 'Hardware', icon: 'monitor', title: 'Laptop fan loud and overheating', summary: 'Identify causes of laptop overheating, loud fan noise, and thermal throttling on corporate laptops.', problem: 'Laptop fans are running loudly (audible across the room) and the laptop chassis feels hot to the touch, particularly near the hinge or keyboard area.', symptoms: '- Fan noise is constant, even when the laptop is idle\\n- Laptop bottom near the CPU/GPU area is hot\\n- Performance drops during video calls — known as thermal throttling\\n- Laptop shuts down unexpectedly when hot\\n- "Thermal event" logged in Windows System Event Viewer', rootCause: 'Overheating is caused by: (1) Dust accumulation in cooling vents and fan — blocks airflow, (2) CPU/GPU running at high utilization due to background processes, (3) Running laptop on soft surfaces (bed, pillow, lap) blocking bottom vents, (4) Thermal paste between CPU and heatsink has degraded after 2+ years, (5) Fan bearing failure — buzzing or grinding noise indicates mechanical failure, (6) BIOS power management settings not optimized.', steps: ['Place the laptop on a hard, flat surface (desk, table) — never on a bed, pillow, or lap when experiencing overheating', 'Check Task Manager → CPU tab → sort by usage — close any application using >20% CPU for no reason', 'Monitor temperatures: download HWMonitor (approve via IT) — CPU should idle below 50°C, max 90°C under load', 'Clean the vents: use compressed air to blow out dust from the side and bottom vents of the laptop while it is powered off', 'Update BIOS: check the laptop manufacturer\'s support site for the latest BIOS update that may improve fan curves', 'If cleaning does not help and temperatures remain high, request a hardware inspection — thermal paste may need reapplication or fan replacement'], related: ['kb-013', 'kb-029', 'kb-036'], readingTime: '6 min', views: '6.8K', updated: '1 week ago', popular: false },
    { id: 'kb-041', category: 'Cloud & SaaS', icon: 'cloud', title: 'OneDrive file conflict errors — resolving guide', summary: 'Fix OneDrive file conflict errors and understand how to resolve version conflicts across devices.', problem: 'OneDrive reports file conflict errors — files get "(Company Laptop)" or "(User\'s conflicted copy)" appended to names. Multiple versions of the same file exist.', symptoms: '- "Conflicted copy" files appearing in OneDrive folders\\n- "Two versions saved — resolve conflict" notification\\n- Changes made on one device not appearing on another\\n- File shows "Changes haven\'t synced" in File Explorer\\n- Co-authoring in Office Online shows merge conflicts', rootCause: 'File conflicts occur when: (1) File opened and saved on two devices before OneDrive synced the first change, (2) File was modified offline on multiple devices, then both came online simultaneously, (3) File was edited in two different Office apps at the same time, (4) OneDrive sync was paused, changes made, then sync resumed, (5) Network latency causes sync delay on large files >10 MB.', steps: ['Open the conflicted copy and the original file (e.g., "Report.docx" and "Report (Laptop-ABC).docx")', 'Compare the two versions manually, or use the "Compare" feature in Word: Review → Compare → Combine revisions from multiple authors', 'Merge any unique changes from the conflicted copy into the original file', 'Delete the conflicted copy once changes are merged', 'To prevent future conflicts: save files and wait 5 seconds for the OneDrive check mark before closing', 'For real-time co-authoring, use "File → Save As → Save to OneDrive" and share the link instead of sending attachments'], related: ['kb-020', 'kb-023', 'kb-021'], readingTime: '6 min', views: '4.8K', updated: '6 days ago', popular: false },
    { id: 'kb-042', category: 'Software / Applications', icon: 'package', title: 'Java-based application not launching', summary: 'Fix enterprise Java applications that fail to launch due to Java version conflicts or security settings.', problem: 'A corporate Java-based application (internal portal, ERP client, or reporting tool) fails to launch, shows "Application Blocked by Security Settings", or crashes on startup.', symptoms: '- "Your security settings have blocked an application from running"\\n- "Java platform SE binary has stopped working"\\n- Application launches but shows empty white screen\\n- "Could not find the main class" error\\n- Works in Internet Explorer but not modern browsers', rootCause: 'Java Web Start / Applet issues are caused by: (1) Java security settings — default security level blocks unsigned or self-signed applications, (2) Java version mismatch — application requires Java 8 but system has Java 11 or later, (3) Exception site list does not include the application URL, (4) Multiple Java versions installed causing conflicts with PATH and CLASSPATH, (5) Modern browsers (Chrome, Edge) no longer support NPAPI plugins required for Java applets.', steps: ['Open Windows Control Panel → Java (32-bit) → Security tab → ensure the application URL is in the "Exception Site List"', 'Set Security Level to "High" (not "Very High") in the same Security tab', 'If the application requires Java 8, uninstall Java 11+ and install Java 8 Update 361 from the Software Center', 'Delete the Java deployment cache: Control Panel → Java → General → Settings → Delete Files → select all → OK', 'Run the application from Internet Explorer 11 mode in Edge: Settings → Default browser → "Allow sites to be reloaded in Internet Explorer mode" → reload the page', 'For ongoing use, ask IT to migrate the application to a modern web framework that does not depend on Java browser plugins'], related: ['kb-018', 'kb-028', 'kb-037'], readingTime: '8 min', views: '4.2K', updated: '2 weeks ago', popular: false },
    { id: 'kb-043', category: 'Account & Access', icon: 'user-check', title: 'Guest or visitor Wi-Fi access setup', summary: 'Instructions for guests, visitors, and contractors to access the corporate guest Wi-Fi network.', problem: 'A visitor, contractor, or guest needs internet access in the office but does not have a corporate account for Wi-Fi authentication.', symptoms: '- Guest cannot connect to "Corporate-WiFi" SSID — requires domain credentials\\n- "Guest-WiFi" network is visible but connection fails\\n- Guest portal page does not load after connecting\\n- Voucher or access code is not working\\n- Guest was provided credentials but they expired', rootCause: 'Guest Wi-Fi requires either: (1) A temporary voucher code generated by the sponsoring employee, (2) A guest access account created through the IT portal, (3) Acceptance Terms on the captive portal page, (4) Time-limited access (typically 24 hours to 7 days).', steps: ['As the sponsoring employee, go to the Guest Access Portal at https://guest.company.com and create a new guest account', 'Enter the guest\'s name, email, company, and expected duration of access', 'Provide the generated credentials or QR code to the guest', 'Guest connects to "Guest-WiFi" SSID and opens a browser → the captive portal will appear', 'Guest enters the provided credentials on the portal page', 'When the session expires, repeat the process for extended access'], related: ['kb-010', 'kb-014', 'kb-016'], readingTime: '4 min', views: '3.1K', updated: '3 weeks ago', popular: false },
    { id: 'kb-044', category: 'Security & Access', icon: 'shield', title: 'USB device blocked by corporate policy', summary: 'Understand corporate USB policy, request device exceptions, and use approved file transfer methods.', problem: 'A USB flash drive, external hard drive, or other USB storage device is not recognized or shows "This device has been blocked by your system administrator" when connected.', symptoms: '- "This device has been blocked — contact your system administrator"\\n- USB drive letter does not appear in File Explorer\\n- Device Manager shows the USB device with a yellow exclamation\\n- USB mouse/keyboard work, but USB storage does not\\n- "Removable storage access denied" group policy error', rootCause: 'Corporate security policies block USB mass storage devices to prevent data leakage and malware introduction. BitLocker Group Policy and Device Installation Restrictions are enforced by the IT Security team. Some managed laptops also have hardware-level blocking through BIOS settings.', steps: ['Do NOT attempt to disable security software or modify Group Policy — this will trigger a security alert', 'Check if the USB drive is BitLocker-encrypted — corporate devices can read BitLocker-protected USB drives', 'Use approved file transfer methods instead: (1) Company SharePoint/OneDrive, (2) Secure file transfer portal at https://files.company.com, (3) Email with attachment (max 25 MB)', 'If the USB drive is needed for a business-justified reason, submit a USB device exception request through IT portal', 'The approved exception will provision access via BitLocker-to-Go or managed USB solution (e.g., Endpoint Protector)', 'Always scan any external media through the corporate antivirus before use'], related: ['kb-022', 'kb-035', 'kb-038'], readingTime: '4 min', views: '4.5K', updated: '2 weeks ago', popular: false },
    { id: 'kb-045', category: 'Windows & OS', icon: 'monitor', title: 'File Explorer crashing or not responding', summary: 'Fix Windows File Explorer crashes, freezes, and slow folder navigation issues.', problem: 'File Explorer crashes when opening certain folders, freezes during file operations, or takes a long time to display folder contents.', symptoms: '- File Explorer restarts automatically (taskbar disappears and reappears)\\n- "Windows Explorer has stopped working" error\\n- Opening a specific folder always causes a crash\\n- Thumbnails not loading for image/video files\\n- Right-click context menu takes 10+ seconds to appear', rootCause: 'File Explorer crashes are typically caused by: (1) Corrupted thumbnail cache — re-reading corrupted thumbnail data on every folder open, (2) Faulty shell extension context menu handler from a third-party application (e.g., 7-Zip, Dropbox, WinRAR, Adobe), (3) Network drive that is unreachable but configured to reconnect — Explorer hangs waiting for the timeout, (4) Corrupted Quick Access list, (5) Corrupted Windows Search index for the folder location.', steps: ['Clear File Explorer history: Open File Explorer → View → Options → General → Privacy → Clear File Explorer history', 'Clear thumbnail cache: Run "cleanmgr" → select C: drive → check "Thumbnails" → OK → Delete Files', 'Disable problematic shell extensions: download ShellExView → sort by Type → disable all non-Microsoft Context Menu extensions → restart Explorer (restart may be needed)', 'Remove stale network drive connections: File Explorer → right-click mapped drives → Disconnect → re-add only active shares', 'Clear Quick Access: right-click "Quick Access" in File Explorer navigation pane → Options → General → Privacy → uncheck both options → Clear', 'Run SFC scan: "sfc /scannow" in Admin CMD to repair corrupted system files'], related: ['kb-024', 'kb-033', 'kb-028'], readingTime: '7 min', views: '8.1K', updated: '3 days ago', popular: false },
    { id: 'kb-046', category: 'Hardware', icon: 'monitor', title: 'Keyboard or trackpad not working on laptop', summary: 'Diagnose and fix built-in keyboard and trackpad issues on corporate laptops.', problem: 'The built-in laptop keyboard or trackpad has stopped working partially or completely. Some keys may work while others do not, or the entire input device is unresponsive.', symptoms: '- Certain keys (e.g., letters, numbers, function keys) do not respond\\n- Trackpad cursor does not move\\n- External USB keyboard/mouse work fine\\n- Keyboard backlight is on but keys do not register\\n- Device Manager shows "Windows has stopped this device because it has reported problems (Code 43)"', rootCause: 'Keyboard/trackpad failures are most often: (1) Driver corruption after Windows Update, (2) Physical debris under keys preventing contact, (3) Trackpad accidentally disabled via function key (Fn+F6 or similar), (4) Static discharge affecting the internal ribbon cable, (5) Spilled liquid on keyboard causing key switch failure, (6) BIOS setting disabled the internal input device.', steps: ['Check if the trackpad is disabled: press Fn+F6, Fn+F9, or the function key with the trackpad icon (varies by manufacturer)', 'Restart the laptop — this often resolves driver-related input failures', 'Update chipset drivers from the laptop manufacturer\'s support site', 'For stuck keys, use compressed air to blow debris from under the non-responsive key', 'Check Device Manager → Human Interface Devices → ensure "HID Keyboard Device" and "I2C HID Device" are present and working', 'If the external keyboard works, the internal keyboard may have a loose ribbon cable or hardware failure — request IT repair'], related: ['kb-036', 'kb-040', 'kb-013'], readingTime: '5 min', views: '4.3K', updated: '2 weeks ago', popular: false },
    { id: 'kb-047', category: 'Software / Applications', icon: 'package', title: 'Company VPN client not launching — app repair', summary: 'Fix the corporate VPN client application when it fails to launch, shows blank window, or crashes.', problem: 'The corporate VPN client application (AnyConnect, GlobalProtect, or custom) fails to start, shows a blank window, or crashes immediately after launching.', symptoms: '- VPN client icon appears in system tray but the window is blank\\n- "The application failed to initialize properly (0xc0000005)" error\\n- VPN client does not appear in system tray after installation\\n- "Service is not responding" error when opening VPN client\\n- VPN client works after reinstall but fails again after reboot', rootCause: 'VPN client application failures are caused by: (1) Corrupted VPN client installation — missing or damaged DLL files, (2) Conflicting network filter drivers from other software (antivirus, firewall, other VPN clients), (3) Windows Filtering Platform (WFP) conflicts, (4) Service account permissions changed, (5) .NET Framework version mismatch for VPN clients built on .NET, (6) Certificate store corruption affecting VPN client certificate authentication.', steps: ['Restart the computer — this restarts all VPN services', 'Repair the VPN client: Control Panel → Programs → [VPN Client] → right-click → Change → Repair', 'If the VPN service is not running: services.msc → find the VPN service (e.g., "Cisco AnyConnect Secure Mobility Agent") → right-click → Start → set Startup Type to "Automatic"', 'Uninstall any other VPN clients or network filter drivers to prevent conflicts', 'Run the vendor\'s cleanup tool if available: download from IT portal → removes all traces of the previous installation', 'Reinstall the VPN client from Software Center after complete cleanup and a reboot'], related: ['kb-001', 'kb-012', 'kb-004'], readingTime: '7 min', views: '4.0K', updated: '10 days ago', popular: false },
    { id: 'kb-048', category: 'Cloud & SaaS', icon: 'cloud', title: 'SharePoint document library not loading', summary: 'Resolve SharePoint Online document library loading issues, "Something went wrong" errors, and sync problems.', problem: 'A SharePoint document library shows "Loading..." indefinitely, displays "Something went wrong" error, or returns "Access Denied" for a previously accessible site.', symptoms: '- SharePoint page shows "Loading..." spinner but never loads\\n- "Sorry, something went wrong" with correlation ID\\n- "Access Denied" or "You need permission" error\\n- Docs open in browser but not in desktop Office apps\\n- SharePoint works for other sites but not this one', rootCause: 'SharePoint loading issues are usually caused by: (1) Browser cache with corrupted authentication tokens — clear browser cookies, (2) User license issue — SharePoint Online license not assigned or expired, (3) Site collection storage quota exceeded — site admin needs to free up space, (4) Large library with >5,000 items reaching list view threshold, (5) SharePoint Designer workflow stuck and blocking the site, (6) Conditional Access policy blocking the device or location.', steps: ['Open SharePoint in an InPrivate/Incognito browser window — if it works, clear browser cache/cookies', 'Copy the full error correlation ID (from "Something went wrong" page) and send it to IT for backend log analysis', 'Check if the site is in "Read-only" mode due to storage quota — contact site owner to check site settings', 'Use the "Open with Explorer" or "Sync" button instead of the web interface if the library has many items', 'Try the SharePoint mobile app as alternative access method', 'If "Access Denied", request site permission through the "Access requests" link or contact site owner'], related: ['kb-020', 'kb-023', 'kb-041'], readingTime: '6 min', views: '5.7K', updated: '5 days ago', popular: false },
    { id: 'kb-049', category: 'Email & Collaboration', icon: 'mail', title: 'Calendar sharing permissions not working', summary: 'Fix Outlook calendar sharing where delegate access, shared calendars, or availability view permissions fail.', problem: 'An Outlook shared calendar shows "Unable to open this item" or "You do not have sufficient permission". Calendar sharing that previously worked has stopped.', symptoms: '- Shared calendar shows "You do not have permission to view this calendar"\\n- Calendar appears but shows "No appointments" for others\\n- Delegate cannot create or modify meetings on behalf of the manager\\n- Outlook calendar sharing invitation fails to send\\n- Calendar works in OWA but not in Outlook desktop', rootCause: 'Calendar sharing failures are caused by: (1) Exchange mailbox permissions corrupted — sharing invites may have expired or auto-accept failed, (2) Outlook cached mode — local copy of the shared calendar is outdated, (3) Exchange Web Services (EWS) disabled — modern Outlook relies on EWS for calendar sharing, (4) Organizational sharing policy restricts external calendar access, (5) Delegate permissions removed when the mailbox was migrated to a new Exchange server.', steps: ['Remove and re-add the shared calendar: right-click the shared calendar → "Delete Calendar" → Calendar icon → "Open calendar" → "From Address Book" → select the person', 'In Outlook, go to File → Account Settings → Account Settings → double-click the Exchange account → More Settings → Advanced → toggle "Download Shared Folders" off and back on', 'Ask the calendar owner to re-send the sharing invitation: Calendar → Share → "Share Calendar" → re-add permissions → Send', 'Clear Outlook cached data for shared calendars: close Outlook → rename "%localappdata%\\Microsoft\\Outlook\\Shared Calendar" folder → restart Outlook', 'Test in Outlook Web App (OWA) — if calendar works in browser, the issue is with Outlook\'s cached mode', 'For delegate issues: File → Account Settings → Delegate Access → Remove and re-add the delegate with required permissions'], related: ['kb-005', 'kb-007', 'kb-016'], readingTime: '8 min', views: '5.3K', updated: '1 week ago', popular: false },
    { id: 'kb-050', category: 'Security & Access', icon: 'shield', title: 'Certificate error — "This connection is not private"', summary: 'Fix browser certificate warnings for internal corporate websites and understand when to proceed safely.', problem: 'A corporate intranet site or internal application shows "Your connection is not private" or "NET::ERR_CERT_AUTHORITY_INVALID" in the browser.', symptoms: '- "Your connection is not private" warning page\\n- "NET::ERR_CERT_AUTHORITY_INVALID" in Chrome\\n- "This site is not secure" warning\\n- "Certificate expired" error for internal tools\\n- Works on some computers but not others', rootCause: 'Certificate errors on internal sites occur because: (1) The site uses an internal CA (Certificate Authority) certificate that is not trusted by your computer — the enterprise root CA certificate is missing from the Trusted Root store, (2) The certificate has expired, (3) The site URL does not match the certificate\'s Subject Name/SAN, (4) Your computer is not joined to the domain and thus did not receive the enterprise root CA via Group Policy, (5) Time/date on your computer is incorrect.', steps: ['Click "Advanced" on the warning page → see the exact error. The best action depends on the error type.', 'If the error is "ERR_CERT_AUTHORITY_INVALID" for an internal company site, click "Proceed to [site] (unsafe)" — this is safe for internal sites with private certificates', 'Install the corporate root CA certificate: visit https://certs.company.com and download the "Enterprise Root CA" certificate → open it → Install Certificate → "Local Machine" → "Place in Trusted Root Certification Authorities"', 'Ensure your computer date and time are correct: right-click clock → "Adjust date/time" → toggle "Set time automatically" on and sync now', 'If the certificate is expired, contact the application owner to request renewal', 'If the error persists, contact IT to verify that your computer received the latest Group Policy certificate updates'], related: ['kb-022', 'kb-038', 'kb-032'], readingTime: '5 min', views: '6.7K', updated: '6 days ago', popular: false }
  ];

  var categories = [
    { id: 'network', name: 'Network & Connectivity', icon: 'globe', keywords: ['vpn', 'network', 'wifi', 'wi-fi', 'dns', 'internet', 'connectivity', 'ip', 'router', 'tcp'] },
    { id: 'email', name: 'Email & Collaboration', icon: 'mail', keywords: ['outlook', 'email', 'teams', 'calendar', 'sync', 'exchange', 'mail', 'microsoft 365', 'sharepoint'] },
    { id: 'hardware', name: 'Hardware', icon: 'monitor', keywords: ['laptop', 'monitor', 'keyboard', 'trackpad', 'mouse', 'battery', 'fan', 'overheating', 'docking', 'usb'] },
    { id: 'account', name: 'Account & Access', icon: 'user-check', keywords: ['password', 'mfa', 'account', 'login', 'lock', 'access', 'group', 'permission', 'guest'] },
    { id: 'printer', name: 'Printer', icon: 'printer', keywords: ['printer', 'print', 'spooler', 'paper jam', 'toner', 'scanner'] },
    { id: 'software', name: 'Software / Applications', icon: 'package', keywords: ['software', 'application', 'install', 'crash', 'freeze', 'java', 'browser', 'chrome', 'edge'] },
    { id: 'erp', name: 'ERP / SAP', icon: 'database', keywords: ['sap', 'erp', 'spool', 'transaction', 'job', 'background'] },
    { id: 'cloud', name: 'Cloud & SaaS', icon: 'cloud', keywords: ['onedrive', 'sharepoint', 'teams', 'microsoft 365', 'office', 'cloud', 'saas', 'license', 'activation'] },
    { id: 'security', name: 'Security & Access', icon: 'shield', keywords: ['security', 'phishing', 'blocked', 'certificate', 'proxy', 'mfa', 'usb', 'access'] },
    { id: 'windows', name: 'Windows & OS', icon: 'monitor', keywords: ['windows', 'bsod', 'update', 'boot', 'disk space', 'file explorer', 'activation', 'slow'] }
  ];

  var els = {};
  var currentCategory = null;
  var currentArticleId = null;
  var searchQuery = '';
  var searchTimeout = null;
  var searchExecuted = false;
  var highlightedIndex = -1;

  function qs(s, c) { return (c || document).querySelector(s); }
  function qsa(s, c) { return (c || document).querySelectorAll(s); }

  function getSlug(title) {
    return title.toLowerCase()
      .replace(/[—–\-']/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function getArticleBySlug(slug) {
    for (var i = 0; i < articles.length; i++) {
      if (getSlug(articles[i].title) === slug) return articles[i];
    }
    return null;
  }

  function navigate(hash, replace) {
    var target = hash ? '#' + hash : window.location.pathname.replace(/\?.*$/, '');
    if (replace) {
      history.replaceState(null, '', target);
    } else {
      history.pushState(null, '', target);
    }
  }

  function init() {
    cacheEls();
    bindEvents();
    renderCategories();
    renderFeatured();
    renderRecent();
    renderPopularSearches();
    checkUrl(true);
    recreateLucide();
  }

  function cacheEls() {
    els.searchInput = qs('[data-kb-search]');
    els.autocomplete = qs('[data-kb-autocomplete]');
    els.categoriesGrid = qs('[data-kb-categories]');
    els.featuredGrid = qs('[data-kb-featured]');
    els.recentList = qs('[data-kb-recent]');
    els.popularSearches = qs('[data-kb-popular]');
    els.articlesSection = qs('[data-kb-articles]');
    els.emptyState = qs('[data-kb-empty]');
    els.searchResults = qs('[data-kb-search-results]');
    els.resultsHeading = qs('[data-kb-results-heading]');
    els.resultsCount = qs('[data-kb-results-count]');
    els.resultsBody = qs('[data-kb-results-body]');
    els.kbContent = qs('[data-kb-page-content]');
    els.articleViewer = qs('[data-kb-article]');
    els.articleContent = qs('[data-kb-article-content]');
    els.articleBreadcrumb = qs('[data-kb-article-breadcrumb]');
    els.articleBack = qs('[data-kb-article-back]');
    els.categoryTitle = qs('[data-kb-category-title]');
    els.pageContainer = qs('[data-kb-page]');
    els.kbHeader = qs('[data-kb-header]');
    els.kbHeroSearch = qs('[data-kb-hero-search]');
  }

  function getCategoryKeywords(catName) {
    for (var i = 0; i < categories.length; i++) {
      if (categories[i].name === catName) return categories[i].keywords.join(' ');
    }
    return '';
  }

  function getMatchingCategories(q) {
    return categories.filter(function (c) {
      var haystack = (c.name + ' ' + c.keywords.join(' ')).toLowerCase();
      return haystack.indexOf(q) !== -1;
    });
  }

  function getMatchingArticles(q) {
    var matchedCats = getMatchingCategories(q).map(function (c) { return c.name; });
    var hasCatMatch = matchedCats.length > 0;

    return articles.filter(function (a) {
      var qLower = q;

      if (hasCatMatch) {
        if (matchedCats.indexOf(a.category) === -1) return false;
        var haystack = (a.title + ' ' + a.summary + ' ' + a.problem + ' ' + a.symptoms + ' ' + a.category).toLowerCase();
        return haystack.indexOf(qLower) !== -1;
      }

      var haystack = (a.title + ' ' + a.summary + ' ' + a.problem + ' ' + a.symptoms + ' ' + a.category).toLowerCase();
      return haystack.indexOf(qLower) !== -1;
    });
  }

  function showSuggestions(q) {
    if (!els.autocomplete) return;
    if (!q || q.length === 0) {
      els.autocomplete.style.display = 'none';
      return;
    }
    var matching = getMatchingCategories(q).slice(0, 6);
    if (matching.length === 0) {
      els.autocomplete.style.display = 'none';
      return;
    }
    var html = '';
    matching.forEach(function (cat) {
      var count = getCategoryArticles(cat.name).length;
      var re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
      var displayName = cat.name.replace(re, '<mark>$1</mark>');
      html += '<div class="kb-autocomplete-item" data-category="' + cat.id + '">' +
        '<div class="kb-autocomplete-item-icon">' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-' + cat.icon + '"/></svg>' +
        '</div>' +
        '<div class="kb-autocomplete-item-text">' +
          '<div class="kb-autocomplete-item-name">' + displayName + '</div>' +
          '<div class="kb-autocomplete-item-count">' + count + ' article' + (count !== 1 ? 's' : '') + '</div>' +
        '</div>' +
      '</div>';
    });
    els.autocomplete.innerHTML = html;
    els.autocomplete.style.display = 'block';
    highlightedIndex = -1;
    var searchInner = qs('.kb-hero-search-inner');
    if (searchInner) searchInner.classList.add('autocomplete-open');
    els.autocomplete.querySelectorAll('[data-category]').forEach(function (el) {
      el.addEventListener('click', function () {
        var catId = el.getAttribute('data-category');
        closeAutocomplete();
        openCategory(catId);
      });
      el.addEventListener('mouseenter', function () {
        var items = els.autocomplete.querySelectorAll('[data-category]');
        items.forEach(function (item) { item.classList.remove('highlighted'); });
        el.classList.add('highlighted');
        highlightedIndex = Array.prototype.indexOf.call(items, el);
      });
    });
  }

  function closeAutocomplete() {
    if (els.autocomplete) els.autocomplete.style.display = 'none';
    var searchInner = qs('.kb-hero-search-inner');
    if (searchInner) searchInner.classList.remove('autocomplete-open');
    highlightedIndex = -1;
  }

  function moveHighlight(dir) {
    if (!els.autocomplete || els.autocomplete.style.display === 'none') return;
    var items = els.autocomplete.querySelectorAll('[data-category]');
    if (items.length === 0) return;
    if (highlightedIndex >= 0 && items[highlightedIndex]) {
      items[highlightedIndex].classList.remove('highlighted');
    }
    highlightedIndex += dir;
    if (highlightedIndex < 0) highlightedIndex = items.length - 1;
    if (highlightedIndex >= items.length) highlightedIndex = 0;
    items[highlightedIndex].classList.add('highlighted');
    items[highlightedIndex].scrollIntoView({ block: 'nearest' });
  }

  function renderSearchResults(articlesList, query) {
    if (!els.searchResults || !els.resultsBody) return;
    var grouped = {};
    articlesList.forEach(function (a) {
      if (!grouped[a.category]) grouped[a.category] = { icon: a.icon, articles: [] };
      grouped[a.category].articles.push(a);
    });
    var catOrder = Object.keys(grouped).sort();
    var total = articlesList.length;
    if (els.resultsCount) {
      els.resultsCount.textContent = 'Showing ' + total + ' result' + (total !== 1 ? 's' : '') + ' for "' + escapeHtml(query) + '"';
    }
    var html = '';
    catOrder.forEach(function (catName) {
      var g = grouped[catName];
      var catObj = null;
      for (var i = 0; i < categories.length; i++) {
        if (categories[i].name === catName) { catObj = categories[i]; break; }
      }
      var catId = catObj ? catObj.id : '';
      html += '<div class="kb-search-group">' +
        '<div class="kb-search-group-header">' +
          '<div class="kb-search-group-left">' +
            '<div class="kb-search-group-icon">' +
              '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-' + g.icon + '"/></svg>' +
            '</div>' +
            '<div class="kb-search-group-info">' +
              '<div class="kb-search-group-name">' + escapeHtml(catName) + '</div>' +
              '<div class="kb-search-group-label">Category &bull; ' + g.articles.length + ' article' + (g.articles.length !== 1 ? 's' : '') + '</div>' +
            '</div>' +
          '</div>' +
          '<button class="kb-search-group-link" data-category-link="' + catId + '">Open Category <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></button>' +
        '</div>';
      g.articles.forEach(function (art) {
        html += '<div class="kb-article-result-card" data-article-id="' + art.id + '">' +
          '<div class="kb-article-result-card-icon">' +
            '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>' +
          '</div>' +
          '<div class="kb-article-result-card-body">' +
            '<div class="kb-article-result-card-title">' + escapeHtml(art.title) + '</div>' +
            '<p class="kb-article-result-card-desc">' + escapeHtml(art.summary) + '</p>' +
            '<div class="kb-article-result-card-meta">' +
              '<span><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ' + art.readingTime + ' read</span>' +
              '<span><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> Updated ' + art.updated + '</span>' +
            '</div>' +
            '<div class="kb-article-result-card-cta">View Article <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></div>' +
          '</div>' +
        '</div>';
      });
      html += '</div>';
    });
    if (els.resultsBody) {
      els.resultsBody.innerHTML = html;
    }
  }

  function showSearchView(q) {
    if (!els.searchResults) return;
    if (els.resultsHeading) els.resultsHeading.textContent = 'Search Results';
    var matching = getMatchingArticles(q);
    if (matching.length === 0) {
      if (els.resultsBody) {
        els.resultsBody.innerHTML = '<div class="kb-no-results">' +
          '<div class="kb-empty-icon"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg></div>' +
          '<h3 class="kb-empty-title">No results found</h3>' +
          '<p class="kb-empty-desc">We couldn\'t find anything matching <strong>"' + escapeHtml(q) + '"</strong>.</p>' +
          '<div class="kb-empty-suggestions"><p class="kb-empty-sug-title">Suggestions:</p><ul class="kb-empty-sug-list"><li>Check spelling</li><li>Try broader keywords</li><li>Browse all categories</li></ul></div>' +
        '</div>';
      }
      if (els.resultsCount) els.resultsCount.textContent = 'No results for "' + escapeHtml(q) + '"';
    } else {
      renderSearchResults(matching, q);
    }
  }

  function switchToSearchView() {
    if (els.kbContent) els.kbContent.style.display = 'none';
    if (els.articleViewer) els.articleViewer.style.display = 'none';
    if (els.kbHeader) els.kbHeader.style.display = '';
    if (els.kbHeroSearch) els.kbHeroSearch.style.display = '';
    if (els.searchResults) {
      els.searchResults.style.display = '';
      els.searchResults.style.opacity = '0';
      if (els.resultsHeading) els.resultsHeading.textContent = 'Search Results';
      if (els.resultsBody) els.resultsBody.innerHTML = '';
      if (els.resultsCount) els.resultsCount.textContent = '';
      requestAnimationFrame(function () {
        if (els.searchResults) els.searchResults.style.opacity = '1';
      });
    }
  }

  function restoreDefaultView() {
    searchExecuted = false;
    currentCategory = null;
    currentArticleId = null;
    closeAutocomplete();
    if (els.searchResults) {
      els.searchResults.style.display = 'none';
      if (els.resultsBody) els.resultsBody.innerHTML = '';
      if (els.resultsCount) els.resultsCount.textContent = '';
      if (els.resultsHeading) els.resultsHeading.textContent = 'Search Results';
    }
    if (els.kbContent) els.kbContent.style.display = '';
    if (els.articleViewer) els.articleViewer.style.display = 'none';
    if (els.kbHeader) els.kbHeader.style.display = '';
    if (els.kbHeroSearch) els.kbHeroSearch.style.display = '';
    var sections = [els.categoriesGrid, els.featuredGrid, els.recentList, els.popularSearches ? els.popularSearches.closest('[data-kb-popular-section]') : null];
    sections.forEach(function (s) {
      if (s) { s.style.display = ''; }
    });
    if (els.articlesSection) els.articlesSection.style.display = 'none';
    if (els.emptyState) els.emptyState.style.display = 'none';
    if (els.categoryTitle) els.categoryTitle.textContent = 'Categories';
    renderFeatured();
    renderRecent();
  }

  function onSearchInput(e) {
    searchQuery = e.target.value.trim().toLowerCase();
    if (searchQuery.length > 0) {
      searchExecuted = false;
      if (els.kbContent) els.kbContent.style.display = 'none';
      if (els.searchResults) els.searchResults.style.display = 'none';
      if (els.articleViewer) els.articleViewer.style.display = 'none';
      showSuggestions(searchQuery);
    } else {
      closeAutocomplete();
      currentCategory = null;
      searchExecuted = false;
      restoreDefaultView();
    }
  }

  function executeSearch() {
    if (searchTimeout) clearTimeout(searchTimeout);
    closeAutocomplete();
    if (els.searchInput) {
      searchQuery = els.searchInput.value.trim().toLowerCase();
    }
    if (searchQuery.length > 0) {
      currentCategory = null;
      searchExecuted = true;
      switchToSearchView();
      showSearchView(searchQuery);
      if (els.searchInput) els.searchInput.focus();
      updateUrl();
    }
  }

  function bindEvents() {
    if (els.searchInput) {
      els.searchInput.addEventListener('input', function (e) {
        onSearchInput(e);
      });
      els.searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          moveHighlight(1);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          moveHighlight(-1);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (highlightedIndex >= 0 && els.autocomplete && els.autocomplete.style.display !== 'none') {
            var items = els.autocomplete.querySelectorAll('[data-category]');
            if (items[highlightedIndex]) {
              var catId = items[highlightedIndex].getAttribute('data-category');
              closeAutocomplete();
              openCategory(catId);
            }
          } else {
            executeSearch();
          }
        } else if (e.key === 'Tab') {
          if (highlightedIndex >= 0 && els.autocomplete && els.autocomplete.style.display !== 'none') {
            e.preventDefault();
            var items = els.autocomplete.querySelectorAll('[data-category]');
            if (items[highlightedIndex]) {
              var catId = items[highlightedIndex].getAttribute('data-category');
              closeAutocomplete();
              openCategory(catId);
            }
          }
        } else if (e.key === 'Escape') {
          if (els.autocomplete && els.autocomplete.style.display !== 'none') {
            e.preventDefault();
            closeAutocomplete();
          }
          if (els.searchInput) els.searchInput.blur();
        }
      });
    }

    if (els.articleBack) {
      els.articleBack.addEventListener('click', function (e) {
        e.preventDefault();
        history.back();
      });
    }

    document.addEventListener('click', function (e) {
      var artifactLink = e.target.closest('[data-kb-breadcrumb="kb"]');
      if (artifactLink) {
        e.preventDefault();
        closeAutocomplete();
        restoreDefaultView();
        updateUrl();
        return;
      }
      var catCrumb = e.target.closest('[data-kb-breadcrumb="cat"]');
      if (catCrumb) {
        e.preventDefault();
        var catId = catCrumb.getAttribute('data-cat-id');
        if (catId) {
          closeAutocomplete();
          openCategory(catId);
        }
        return;
      }
      var card = e.target.closest('[data-article-id]');
      if (card) {
        e.preventDefault();
        var id = card.getAttribute('data-article-id');
        closeAutocomplete();
        openArticle(id);
        return;
      }
      var catCard = e.target.closest('[data-category]');
      if (catCard) {
        e.preventDefault();
        var catId = catCard.getAttribute('data-category');
        openCategory(catId);
        return;
      }
      var catLink = e.target.closest('[data-category-link]');
      if (catLink) {
        e.preventDefault();
        var clId = catLink.getAttribute('data-category-link');
        if (clId) {
          closeAutocomplete();
          openCategory(clId);
        }
        return;
      }
      if (els.autocomplete && !e.target.closest('[data-kb-autocomplete]') && !e.target.closest('[data-kb-search]')) {
        closeAutocomplete();
        if (els.searchInput && els.searchInput.value.trim().length > 0) {
          executeSearch();
        } else {
          restoreDefaultView();
        }
      }
    });

    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (els.searchInput) els.searchInput.focus();
      }
    });

    window.addEventListener('popstate', function () {
      checkUrl(true);
    });
  }

  function checkUrl(noPush) {
    var hash = window.location.hash;
    var path = window.location.pathname;
    var search = window.location.search;

    var suffix = path;
    if (path.indexOf(pageBase) === 0) {
      suffix = path.substring(pageBase.length).replace(/^\//, '');
    }

    if (hash && hash.indexOf('#article-') === 0) {
      var id = hash.replace('#article-', '');
      openArticle(id, true);
      return;
    }
    if (hash && hash.indexOf('#category-') === 0) {
      var catId = hash.replace('#category-', '');
      openCategory(catId, true);
      return;
    }
    if (hash && hash.indexOf('#search-') === 0) {
      var q = decodeURIComponent(hash.replace('#search-', ''));
      if (els.searchInput) els.searchInput.value = q;
      searchQuery = q.trim().toLowerCase();
      if (searchQuery.length > 0) {
        searchExecuted = true;
        switchToSearchView();
        showSearchView(searchQuery);
        if (!noPush) updateUrl();
      }
      return;
    }

    var pathMatch = suffix.match(/^article\/([^\/]+)/);
    if (pathMatch) {
      var articleId = pathMatch[1];
      openArticle(articleId, true);
      return;
    }
    var catMatch = suffix.match(/^category\/([^\/]+)/);
    if (catMatch) {
      var catId2 = catMatch[1];
      openCategory(catId2, true);
      return;
    }
    if (search) {
      var params = new URLSearchParams(search);
      var q2 = params.get('q');
      if (q2) {
        if (els.searchInput) els.searchInput.value = q2;
        searchQuery = q2.trim().toLowerCase();
        if (searchQuery.length > 0) {
          searchExecuted = true;
          switchToSearchView();
          showSearchView(searchQuery);
          if (!noPush) updateUrl();
        }
        return;
      }
    }

    if (currentCategory || currentArticleId || searchExecuted) {
      restoreDefaultView();
    }
  }

  function updateUrl() {
    if (currentArticleId) {
      navigate('article-' + currentArticleId);
    } else if (currentCategory) {
      navigate('category-' + currentCategory);
    } else if (searchExecuted && searchQuery) {
      navigate('search-' + encodeURIComponent(searchQuery));
    } else {
      navigate('');
    }
  }

  function getCategoryArticles(catName) {
    return articles.filter(function (a) { return a.category === catName; });
  }

  function getArticleById(id) {
    for (var i = 0; i < articles.length; i++) {
      if (articles[i].id === id) return articles[i];
    }
    return null;
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str || ''));
    return div.innerHTML;
  }

  function renderCategories() {
    if (!els.categoriesGrid) return;
    var html = '';
    categories.forEach(function (cat) {
      var count = getCategoryArticles(cat.name).length;
      html += '<div class="kb-category-card" data-category="' + cat.id + '">' +
        '<div class="kb-category-icon">' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-' + cat.icon + '"/></svg>' +
        '</div>' +
        '<div class="kb-category-info">' +
          '<div class="kb-category-name">' + escapeHtml(cat.name) + '</div>' +
          '<div class="kb-category-count">' + count + ' article' + (count !== 1 ? 's' : '') + '</div>' +
        '</div>' +
      '</div>';
    });
    els.categoriesGrid.innerHTML = html;
  }

  function openCategory(catId, noPush) {
    currentCategory = catId;
    searchQuery = '';
    searchExecuted = false;
    closeAutocomplete();

    var cat = null;
    for (var i = 0; i < categories.length; i++) {
      if (categories[i].id === catId) { cat = categories[i]; break; }
    }
    if (!cat) return;

    if (els.kbContent) els.kbContent.style.display = 'none';
    if (els.articleViewer) els.articleViewer.style.display = 'none';
    if (els.kbHeader) els.kbHeader.style.display = '';
    if (els.kbHeroSearch) els.kbHeroSearch.style.display = '';

    var catArticles = getCategoryArticles(cat.name);

    if (els.resultsHeading) els.resultsHeading.textContent = cat.name;
    if (els.resultsCount) els.resultsCount.textContent = '';

    var html = '<div class="kb-article-breadcrumb">' +
      '<a href="/index.html">Home</a>' +
      '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>' +
      '<span data-kb-breadcrumb="kb" class="kb-breadcrumb-link">Knowledge Base</span>' +
      '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>' +
      '<span class="kb-article-breadcrumb-current">' + escapeHtml(cat.name) + '</span>' +
    '</div>';
    if (catArticles.length === 0) {
      html = '<div class="kb-no-results">' +
        '<div class="kb-empty-icon"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>' +
        '<h3 class="kb-empty-title">No articles in this category</h3>' +
        '<p class="kb-empty-desc">Check back later for new articles or try searching for your issue.</p></div>';
    } else {
      catArticles.forEach(function (art) {
        html += '<div class="kb-article-result-card" data-article-id="' + art.id + '">' +
          '<div class="kb-article-result-card-icon">' +
            '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>' +
          '</div>' +
          '<div class="kb-article-result-card-body">' +
            '<div class="kb-article-result-card-title">' + escapeHtml(art.title) + '</div>' +
            '<p class="kb-article-result-card-desc">' + escapeHtml(art.summary) + '</p>' +
            '<div class="kb-article-result-card-meta">' +
              '<span><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ' + art.readingTime + ' read</span>' +
              '<span><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> Updated ' + art.updated + '</span>' +
            '</div>' +
            '<div class="kb-article-result-card-cta">View Article <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></div>' +
          '</div>' +
        '</div>';
      });
    }

    if (els.resultsBody) els.resultsBody.innerHTML = html;
    if (els.searchResults) {
      els.searchResults.style.display = '';
      els.searchResults.style.opacity = '0';
      requestAnimationFrame(function () {
        if (els.searchResults) els.searchResults.style.opacity = '1';
      });
    }

    if (!noPush) updateUrl();
  }

  function renderArticleList(articleList) {
    if (els.kbContent) els.kbContent.style.display = '';
    if (els.emptyState) els.emptyState.style.display = 'none';
    if (els.featuredGrid) els.featuredGrid.style.display = 'none';
    if (els.recentList) els.recentList.style.display = 'none';
    if (els.searchResults) els.searchResults.style.display = 'none';
    if (!els.articlesSection) return;
    els.articlesSection.style.display = 'block';

    var html = '';
    articleList.forEach(function (a) {
      var badge = '';
      if (a.popular) badge = '<span class="kb-article-badge">Most Viewed</span>';
      if (a.views && parseInt(a.views) > 10000 && !badge) badge = '<span class="kb-article-badge">Popular</span>';
      html += '<div class="kb-article-card" data-article-id="' + a.id + '">' +
        '<div class="kb-article-card-top">' +
          '<h3 class="kb-article-card-title">' + escapeHtml(a.title) + '</h3>' +
          badge +
        '</div>' +
        '<p class="kb-article-card-summary">' + escapeHtml(a.summary) + '</p>' +
        '<div class="kb-article-card-meta">' +
          '<span><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> ' + a.readingTime + '</span>' +
          '<span>' + a.updated + '</span>' +
        '</div>' +
      '</div>';
    });
    els.articlesSection.innerHTML = html;

    recreateLucide();
  }

  function renderFeatured() {
    if (!els.featuredGrid) return;
    var featured = articles.filter(function (a) { return a.popular; }).slice(0, 4);

    if (searchQuery) {
      els.featuredGrid.style.display = 'none';
      return;
    }
    els.featuredGrid.style.display = '';

    var html = '';
    featured.forEach(function (a) {
      html += '<div class="kb-featured-card" data-article-id="' + a.id + '">' +
        '<div class="kb-featured-card-badge">' + (parseInt(a.views) > 10000 ? 'Most Viewed' : 'Popular') + '</div>' +
        '<h3 class="kb-featured-card-title">' + escapeHtml(a.title) + '</h3>' +
        '<div class="kb-featured-card-meta">' +
          '<span>' + a.readingTime + '</span>' +
          '<span>' + a.updated + '</span>' +
        '</div>' +
        '<span class="kb-featured-card-arrow"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></span>' +
      '</div>';
    });
    els.featuredGrid.innerHTML = html;
  }

  function renderRecent() {
    if (!els.recentList) return;
    if (searchQuery) { els.recentList.style.display = 'none'; return; }
    els.recentList.style.display = '';

    var recent = articles.slice().sort(function (a, b) {
      var aDays = parseInt(a.updated.match(/\d+/)) || 99;
      var bDays = parseInt(b.updated.match(/\d+/)) || 99;
      return aDays - bDays;
    }).slice(0, 6);

    var html = '';
    recent.forEach(function (a) {
      html += '<div class="kb-recent-item" data-article-id="' + a.id + '">' +
        '<div class="kb-recent-item-title">' + escapeHtml(a.title) + '</div>' +
        '<div class="kb-recent-item-meta">' +
          '<span>' + a.category + '</span>' +
          '<span>' + a.updated + '</span>' +
        '</div>' +
      '</div>';
    });
    els.recentList.innerHTML = html;
  }

  function renderPopularSearches() {
    if (!els.popularSearches) return;
    var terms = ['VPN', 'Outlook', 'SAP', 'Password Reset', 'Printer', 'Windows Update', 'Office 365', 'Teams'];
    var html = '';
    terms.forEach(function (term) {
      html += '<span class="kb-popular-chip">' + term + '</span>';
    });
    els.popularSearches.innerHTML = html;

    els.popularSearches.querySelectorAll('.kb-popular-chip').forEach(function (el) {
      el.addEventListener('click', function () {
        var term = el.textContent;
        if (els.searchInput) {
          els.searchInput.value = term;
          openSearch(term);
        }
      });
    });
  }

  function getCategoryByName(name) {
    for (var i = 0; i < categories.length; i++) {
      if (categories[i].name === name) return categories[i];
    }
    return null;
  }

  function getAdjacentArticles(article, dir) {
    var catArticles = articles.filter(function (a) { return a.category === article.category; });
    catArticles.sort(function (a, b) { return a.id.localeCompare(b.id); });
    var idx = catArticles.indexOf(article);
    if (dir === 'prev' && idx > 0) return catArticles[idx - 1];
    if (dir === 'next' && idx < catArticles.length - 1) return catArticles[idx + 1];
    return null;
  }

  function openArticle(id, noPush) {
    var article = getArticleById(id);
    if (!article) return;
    currentArticleId = id;

    if (els.kbContent) els.kbContent.style.display = 'none';
    if (els.searchResults) els.searchResults.style.display = 'none';
    if (els.categoryTitle) els.categoryTitle.style.display = 'none';
    if (els.kbHeader) els.kbHeader.style.display = 'none';
    if (els.kbHeroSearch) els.kbHeroSearch.style.display = 'none';

    if (els.articleViewer) els.articleViewer.style.display = 'block';

    var cat = getCategoryByName(article.category);
    var breadcrumbHtml =
      '<div class="kb-article-breadcrumb">' +
        '<a href="/index.html">Home</a>' +
        '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>' +
        '<span data-kb-breadcrumb="kb" class="kb-breadcrumb-link">Knowledge Base</span>' +
        (cat ? '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>' +
          '<span data-kb-breadcrumb="cat" data-cat-id="' + cat.id + '" class="kb-breadcrumb-link">' + escapeHtml(cat.name) + '</span>' : '') +
        '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>' +
        '<span class="kb-article-breadcrumb-current">' + escapeHtml(article.title) + '</span>' +
      '</div>';

    var stepsHtml = '';
    if (article.steps && article.steps.length > 0) {
      stepsHtml = '<ol class="kb-article-steps">';
      article.steps.forEach(function (step) {
        stepsHtml += '<li>' + escapeHtml(step) + '</li>';
      });
      stepsHtml += '</ol>';
    }

    var symptomsHtml = article.symptoms ? '<div class="kb-article-section"><h4 class="kb-article-h4">Symptoms</h4><p class="kb-article-text">' + escapeHtml(article.symptoms).replace(/\\n/g, '<br>') + '</p></div>' : '';
    var rootCauseHtml = article.rootCause ? '<div class="kb-article-section"><h4 class="kb-article-h4">Root Cause</h4><p class="kb-article-text">' + escapeHtml(article.rootCause) + '</p></div>' : '';

    var notesHtml = article.notes ? '<div class="kb-article-note"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg><div class="kb-article-note-text"><strong>Note:</strong> ' + escapeHtml(article.notes) + '</div></div>' : '';
    var warningHtml = article.warning ? '<div class="kb-article-warning"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg><div class="kb-article-warning-text"><strong>Warning:</strong> ' + escapeHtml(article.warning) + '</div></div>' : '';

    var relatedHtml = '';
    if (article.related && article.related.length > 0) {
      relatedHtml = '<div class="kb-article-section"><h4 class="kb-article-h4">Related Articles</h4><div class="kb-article-related">';
      article.related.forEach(function (relId) {
        var rel = getArticleById(relId);
        if (rel) {
          relatedHtml += '<div class="kb-related-card" data-article-id="' + rel.id + '"><span class="kb-related-card-title">' + escapeHtml(rel.title) + '</span><span class="kb-related-card-meta">' + rel.readingTime + '</span></div>';
        }
      });
      relatedHtml += '</div></div>';
    }

    var prevArticle = getAdjacentArticles(article, 'prev');
    var nextArticle = getAdjacentArticles(article, 'next');
    var navHtml = '';
    if (prevArticle || nextArticle) {
      navHtml = '<div class="kb-article-nav">';
      if (prevArticle) {
        navHtml += '<div class="kb-article-nav-card" data-article-id="' + prevArticle.id + '">' +
          '<span class="kb-article-nav-label"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg> Previous</span>' +
          '<span class="kb-article-nav-title">' + escapeHtml(prevArticle.title) + '</span>' +
        '</div>';
      } else {
        navHtml += '<div class="kb-article-nav-card kb-article-nav-card-empty"></div>';
      }
      if (nextArticle) {
        navHtml += '<div class="kb-article-nav-card kb-article-nav-card-next" data-article-id="' + nextArticle.id + '">' +
          '<span class="kb-article-nav-label">Next <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></span>' +
          '<span class="kb-article-nav-title">' + escapeHtml(nextArticle.title) + '</span>' +
        '</div>';
      } else {
        navHtml += '<div class="kb-article-nav-card kb-article-nav-card-empty"></div>';
      }
      navHtml += '</div>';
    }

    var contentHtml =
      breadcrumbHtml +
      '<div class="kb-article-header">' +
        '<h1 class="kb-article-title">' + escapeHtml(article.title) + '</h1>' +
        '<div class="kb-article-meta-row">' +
          '<span class="kb-article-meta-item"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg> Updated ' + article.updated + '</span>' +
          '<span class="kb-article-meta-item"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> ' + article.readingTime + '</span>' +
          '<span class="kb-article-meta-item"><span class="kb-article-cat-badge">' + escapeHtml(article.category) + '</span></span>' +
        '</div>' +
      '</div>' +
      '<div class="kb-article-body">' +
        notesHtml +
        warningHtml +
        '<div class="kb-article-section"><h4 class="kb-article-h4">Problem</h4><p class="kb-article-text">' + escapeHtml(article.problem) + '</p></div>' +
        symptomsHtml +
        rootCauseHtml +
        '<div class="kb-article-section"><h4 class="kb-article-h4">Step-by-Step Fix</h4>' + stepsHtml + '</div>' +
        relatedHtml +
      '</div>' +
      navHtml +
      '<div class="kb-article-footer">' +
        '<div class="kb-article-footer-text">Still not solved?</div>' +
        '<div class="kb-article-footer-actions">' +
          '<a href="ai-assistant.html" class="kb-btn-primary"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><path d="M14 2h6a2 2 0 0 1 2 2v6"/><path d="M10 18H4a2 2 0 0 1-2-2v-6"/></svg> Open AI Assistant</a>' +
          '<a href="ai-assistant.html" class="kb-btn-secondary"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> Raise Support Ticket</a>' +
        '</div>' +
        '<div class="kb-admin-actions" style="margin-top:16px;padding-top:16px;border-top:1px solid var(--color-border);display:none;" data-kb-admin-actions>' +
          '<button class="kb-btn-secondary" data-kb-edit-article style="margin-right:8px;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg> Edit Article</button>' +
          '<button class="kb-btn-secondary" data-kb-delete-article style="color:var(--color-error);"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> Delete</button>' +
        '</div>' +
      '</div>';

    if (els.articleContent) {
      els.articleContent.innerHTML = contentHtml;
    }

    var session = null;
    try { var raw = localStorage.getItem('resolveone_session'); if (raw) session = JSON.parse(raw); } catch (e) {}
    if (session && session.role === 'admin') {
      var adminActions = els.articleContent.querySelector('[data-kb-admin-actions]');
      if (adminActions) adminActions.style.display = '';
      var editBtn = els.articleContent.querySelector('[data-kb-edit-article]');
      var deleteBtn = els.articleContent.querySelector('[data-kb-delete-article]');
      if (editBtn) {
        editBtn.addEventListener('click', function () {
          if (window.AdminKB) { window.AdminKB.openManager(); }
        });
      }
      if (deleteBtn) {
        deleteBtn.addEventListener('click', function () {
          if (confirm('Delete this article?')) {
            fetch('/api/kb/' + article.id, {
              method: 'DELETE',
              headers: { 'X-User-Role': 'admin' },
            }).then(function (r) {
              if (r.ok) closeArticle();
            }).catch(function () {});
          }
        });
      }
    }

    if (els.articleViewer) {
      els.articleViewer.scrollTop = 0;
    }

    requestAnimationFrame(function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    if (!noPush) updateUrl();
    recreateLucide();
  }

  function closeArticle() {
    currentArticleId = null;

    var savedScrollY = window.scrollY;

    if (els.articleViewer) els.articleViewer.style.display = 'none';
    if (els.categoryTitle) els.categoryTitle.style.display = '';
    if (els.kbHeader) els.kbHeader.style.display = '';
    if (els.kbHeroSearch) els.kbHeroSearch.style.display = '';

    if (searchQuery) {
      if (els.kbContent) els.kbContent.style.display = 'none';
      switchToSearchView();
      showSearchView(searchQuery);
    } else if (currentCategory) {
      openCategory(currentCategory);
    } else {
      if (els.kbContent) els.kbContent.style.display = '';
      if (els.categoriesGrid) els.categoriesGrid.style.display = '';
      if (els.featuredGrid) els.featuredGrid.style.display = '';
      if (els.recentList) els.recentList.style.display = '';
      if (els.searchResults) els.searchResults.style.display = 'none';
      if (els.popularSearches) {
        var section = els.popularSearches.closest('[data-kb-popular-section]');
        if (section) section.style.display = '';
      }
    }

    requestAnimationFrame(function () {
      window.scrollTo(0, savedScrollY);
    });

    updateUrl();
  }

  function recreateLucide() {
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  }

  function openSearch(query) {
    if (els.searchInput) {
      els.searchInput.value = query;
      searchQuery = query.toLowerCase();
      currentCategory = null;
      searchExecuted = true;
      closeAutocomplete();
      switchToSearchView();
      showSearchView(searchQuery);
      updateUrl();
    }
  }

  function triggerSearch() {
    executeSearch();
  }

  window.KnowledgeBase = {
    init: init,
    openArticle: openArticle,
    openSearch: openSearch,
    executeSearch: executeSearch,
    openCategory: openCategory
  };
})();
