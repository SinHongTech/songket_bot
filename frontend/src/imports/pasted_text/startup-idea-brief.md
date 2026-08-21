STARTUP IDEA BRIEF
Project Information
Project / Startup Name: Songket(សង្កេត)
Team: 06 Date: 18/08/2026
1. One-Line Idea
Our team is developing a Telegram security chatbot with a Mini App that can detect malicious files and links in Telegram groups, channels and
personal chats. The Telegram Mini App can provide user with a more detailed interface for viewing scan results, thread information, scan
history and other security-related features.
How does Chat bot telegram do:
+ Group or channel: When a member sends a file or link in a Telegram group or channels our chatbot automatically scans and analyzes
it.
• If the file or link is safe, no warning is displayed.
• It the file contains a virus or malware, the chatbot sends an alert to the group informing members that the file is dangerous.
• If a member repeatedly sends malicious files or links the chatbot can automatically remove or restrict that member from the
group according to the group's moderation rules.
+ Personal Chat: Users can also use the chatbot privately.
The user simply forwards a file or link to the chatbot, and the chatbot scans it for potential security threads. It then provides a result
indicating whether the file or link is safe, suspicious, or dangerous, together with relevant information about the detected thread.
2. Problem
What specific problem are you solving? Who experiences it, and why is it important?
We are solving the problem of users receiving malicious or unsafe links and files from people they trust, especially in Telegram group chats. This
can lead to scams, data leaks, or stolen information. It is important because our solution checks files and links before users open them, helping
keep Telegram groups and their members safer.
3. Target Customer / User
Primary user/customer:
• Professional worker using telegram as platform to discussion their business
• Schools/universities using Telegram communities
Secondary user/customer (optional):
• Elders age using telegram
• Individual Telegram users who frequently receive files/links
4. Current Alternatives
How do people solve this problem today?
Existing solution / method What it provides What is missing?
Antivirus software Scans files for malware Users must download or manually scan files
Komnot Detect Scans file and link in telegram after user
forward
Missing checking group like they did not
scan file before file pass in group
5. Proposed Solution
How does your startup solve the problem? Explain in simple language.
We solve this problem by make bot that can protect link/ file that unsafe before it sent in group and also provide convince UX/UI for user easy
to use.
How it works:
Group protection: Telegram Group → Songket Bot → File/Link Detection → Threat Scanner → Risk Analysis → Warning/Moderation → Mini
App Dashboard
Personal scan: User → Songket Bot/Mini App → Upload/Forward → Threat Scanner → Risk Analysis → Result
6. Core Features
List the 3–5 most important features. Focus on the MVP.
Feature Purpose
Threat detection For secure members in the group before clicking the link or file
Alert & Ban System For prevent this user more activity in this group that can make the
high risk.
Daily & Monthly Reporting A date-picker filter allows group admins to generate and view
structured Daily or Monthly security summaries for their
community.
New Member Conversation Summary (Additional feature) The LLM generates a bulleted, context-safe summary of recent topics
discussed, ensuring any flagged safety incidents are highlighted so
the new user is aware of recent threats.
Image Analysis (Additional feature) It returns a clear, immediate status tag inside the chat or Mini App
interface: ✅ Safe or Warning (Malicious).
7. Unique Value Proposition
For teams, students and businesses who use Telegram for work, study, and communication and face risks from scams, phishing link and
malicious files, our Telegram security chatbot provides real-time threat detection directly inside group and personal chats. Unlike traditional
security tools that require user to leave Telegram and check content manually, our solution automatically scans shared links and files, alerts
users immediately, and helps administrators protect their communicatees from repeated malicious activity.
8. Differentiation
Why should users choose your solution instead of existing alternatives?
• Interactive Telegram Mini App Dashboard
• Deep scan of files and images natively
• Summarizes missed chat history for new members
• Visual Daily/Monthly data visualizations
9. Business Model
Who pays? Organizations and community administrators managing active Telegram groups.
How do they pay? Monthly or yearly subscription based on the number of protected Telegram groups or members.
Why would they pay? To automatically monitor shared files and suspicious content, reduce administrators' manual security work, and protect
community members from digital threats.
10. MVP Scope
Must Have:
• Telegram Mini App for users to upload/check files, links, and images.
• Telegram Bot scans the content for unsafe or malicious threats.
• Full organization-wide security dashboard and analytics.
Not Included in MVP:
• Multi-platform support (WhatsApp, Messenger, Discord, etc.).
• Large-scale enterprise deployment and administration.
11. Validation Plan
What do you want to validate? How will you test it? Success indicator
The bot's ability to accurately detect
malicious payloads in files and images.
• Deploy a bare-minimum script connecting
the Telegram Bot API to the VirusTotal and
OpenAI/Llama APIs.
• Upload standard, safe files alongside
industry-standard harmless test viruses (like
the EICAR test file) to check threat engine
triggers.
• 100% detection of the EICAR test file.
System response speed (latency) inside a live
group environment.
• Feed the LLM various lengths of group chat
logs (50, 100, and 200 messages) to test
summary accuracy.
• Total processing time (File Upload → Scan
→ Bot Action) takes under 3 seconds.
• AI chat summaries accurately capture core
topics without leaking user data or inventing
fake details (hallucinations).
The clarity of the Daily/Monthly visual
analytics graphs.
• Conduct unmoderated or moderated
usability tests with 5 to 10 community
managers or group admins.
• Task them with finding a specific blocked
user history, generating a monthly report,
and unbanning a user via the Mini App
• Minimum 80% completion rate of tasks
without the user asking for instructions or
getting confused.
• A System Usability Scale (SUS) score of 75
or higher from user feedback interviews.
interface.
If users value, the visual reports and AI
onboarding features enough to keep the bot
active long-term.
• Integrate privacy-compliant click tracking
(using tools like PostHog or Mixpanel) inside
the Mini App dashboard to track how often
admins open it.
• Admins open the Mini App dashboard at
least 3 times per week to check security logs
or review AI summaries.
12. Key Risks & Assumptions
Risk / Assumption Why it matters How will you validate it?
False Positive Safe content could be blocked. Test with known safe files/links and review
results.
Detection Limitations Some malicious content may not be detected. Test against multiple known suspicious
samples.
User acceptance Users may dislike automated blocking. Collect feedback from test-group members.
13. Success Criteria
How will you know the prototype is successful?
Successful Prototype: The chatbot accurately and quickly detects dangerous links and files, is easy and useful for Telegram users, helps protect
them from scams and malware, improves digital safety awareness, and can support MPTC’s efforts to promote safer digital communication
and cybersecurity in Cambodia.
What is the biggest unanswered question about your startup right now?
• Can Songket reliably detect malicious or suspicious files and links with acceptable false-positive rates and response time?
• Will Telegram group administrators trust and adopt an automated security bot to monitor and moderate their communities?
Keep the brief clear and evidence-based. Do not add features simply to make the idea sound bigger.