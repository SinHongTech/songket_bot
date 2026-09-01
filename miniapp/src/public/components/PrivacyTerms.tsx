import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";

interface PrivacyTermsProps {
  isKm: boolean;
  bodyFont: string;
}

const en = {
  back: "Back to Home",

privacyTitle: "Privacy Policy",

privacyEffectiveDate: "Effective Date: August 2026",

privacyIntro:
  "Songket respects your privacy and is committed to protecting information processed through our Telegram security service. This Privacy Policy explains what information Songket collects, how we use it, how we protect it, and the choices available to users. Songket applies reasonable security safeguards consistent with applicable Cambodian electronic-commerce and consumer-protection requirements, including Article 32 of Cambodia's Law on Electronic Commerce.",

sections: [
  {
    heading: "1. Information We Collect",
    content:
      "Songket may process the following information when you use our service:\n\n" +
      "• Telegram Metadata: Telegram User IDs, Group IDs, message timestamps, usernames where provided by Telegram, and technical routing information required for the Bot to operate.\n" +
      "• Security Inspection Data: URLs, domain names, file names, file hashes such as SHA-256 or MD5, and files or other content submitted to or processed by Songket for security scanning.\n" +
      "• Scan Results: Malware detection results, threat classifications, scan timestamps, and related security information.\n" +
      "• Payment Information: Transaction references, payment amounts, payment status, and subscription information. Songket does not intentionally store complete bank-account or payment-card credentials unless explicitly required and lawfully permitted for a particular payment process.",
  },

  {
    heading: "2. How We Use Your Information",
    content:
      "Songket uses collected information only as reasonably necessary to operate and improve the service, including to:\n\n" +
      "• Detect and respond to potentially malicious links, files, and other security threats.\n" +
      "• Provide scan results, security reports, and scan history.\n" +
      "• Maintain and improve threat-detection systems.\n" +
      "• Send security alerts and service notifications.\n" +
      "• Process subscriptions and provide customer support.\n" +
      "• Detect abuse, protect the security of the Songket platform, and comply with applicable legal obligations.",
  },

  {
    heading: "3. Data Storage and Security",
    content:
      "Songket uses reasonable technical and organizational safeguards designed to protect information against unauthorized access, loss, use, modification, leakage, or disclosure.\n\n" +
      "• Data may be stored using third-party infrastructure providers that Songket uses to operate its service.\n" +
      "• We limit access to information to people and systems that reasonably need it to operate or support the service.\n" +
      "• Scan and operational data may be retained for a period appropriate to the applicable subscription plan, security requirements, and legitimate operational needs.\n" +
      "• No security system can guarantee absolute security, but Songket takes reasonable measures to protect the information it processes.",
  },

  {
    heading: "4. Data Sharing and Third-Party Services",
    content:
      "Songket does not sell personal information for advertising purposes.\n\n" +
      "Songket may share or transmit limited information to trusted service providers when reasonably necessary to operate the service. Examples may include hosting providers, payment providers, threat-intelligence or malware-scanning services, and infrastructure providers.\n\n" +
      "Such providers may process information only as necessary to provide their services to Songket or as otherwise permitted by applicable law.",
  },

  {
    heading: "5. Security Scanning and Third-Party Threat Intelligence",
    content:
      "To provide malware and security detection, Songket may submit certain technical security information, such as URLs, domain information, file hashes, or submitted files, to third-party security and threat-intelligence services.\n\n" +
      "The information submitted depends on the type of security scan being performed and the third-party service used. Customers should avoid submitting confidential or highly sensitive files unless they are authorized to do so.",
  },

  {
    heading: "6. Your Rights and Requests",
    content:
      "Subject to applicable law and legitimate operational or legal requirements, users may contact Songket to:\n\n" +
      "• Ask what categories of information Songket processes in connection with their account or group.\n" +
      "• Request correction of inaccurate information where reasonably possible.\n" +
      "• Request deletion of certain personal or group operational information after cancellation, subject to legal, security, fraud-prevention, and legitimate business requirements.\n" +
      "• Ask questions about how their information is processed.\n\n" +
      "Requests can be submitted through the Songket support contact listed below.",
  },

  {
    heading: "7. Data Retention",
    content:
      "Songket retains information only for as long as reasonably necessary for the purposes described in this Privacy Policy, including providing security services, maintaining scan history, preventing abuse, resolving disputes, maintaining business records, and complying with applicable legal obligations.\n\n" +
      "Specific retention periods may vary depending on the type of information and the customer's subscription plan.",
  },

  {
    heading: "8. Changes to This Policy",
    content:
      "Songket may update this Privacy Policy from time to time. When material changes are made, we will publish the updated policy with a new effective date. Continued use of the service after an updated policy becomes effective constitutes use subject to the updated policy, to the extent permitted by applicable law.",
  },

  {
    heading: "9. Contact Us",
    content:
      "If you have questions, concerns, or requests regarding this Privacy Policy or the information processed by Songket, please contact us at team@songket.app.",
  },
],


   refundTitle: "Refund and Cancellation Policy",

refundEffectiveDate: "Effective Date: August 2026",

refundIntro:
  "This Refund and Cancellation Policy explains the cancellation and refund terms applicable to Songket Group Security subscriptions.",

refundSections: [
  {
    heading: "1. Subscription Model and Billing",
    content:
      "Songket Group Security operates on a pre-paid recurring subscription basis. Subscription charges are processed in USD or Khmer Riel (KHR) through supported payment channels.",
  },
  {
    heading: "2. 7-Day Cooling-Off Period",
    content:
      "Where the Songket subscription qualifies as a distance sale or other transaction covered by applicable Cambodian consumer-protection rules, customers may have a statutory right to withdraw from the contract within seven (7) calendar days.\n\n" +
      "• The cooling-off period for qualifying distance sales of services generally begins from the date the service contract is entered into.\n" +
      "• Customers may exercise the right of withdrawal by providing written notice to Songket.\n" +
      "• Where the service has already been used, Songket may deduct applicable charges for the service actually used, to the extent permitted by applicable law.\n" +
      "• Where a statutory cooling-off refund applies, Songket will process the refund within the period required by applicable law.",
  },
  {
    heading: "3. Cancellation After the Cooling-Off Period",
    content:
      "Customers may request cancellation of a recurring subscription at any time. Unless otherwise required by applicable law, cancellation will normally take effect at the end of the current paid billing period.\n\n" +
      "Cancelling a subscription does not automatically create a right to a refund for unused time remaining in the current billing period.",
  },
  {
    heading: "4. Refunds for Billing or Service Errors",
    content:
      "Customers may request a full or partial refund where:\n\n" +
      "• A duplicate charge was caused by a Songket billing or system error.\n" +
      "• A customer was charged for a subscription that Songket did not successfully activate because of a Songket-side error.\n" +
      "• Songket materially failed to provide the core subscription service for a prolonged period due solely to a Songket-side system failure.\n" +
      "• A refund is otherwise required by applicable law.",
  },
  {
    heading: "5. Unauthorized or Fraudulent Transactions",
    content:
      "If you believe that a payment was unauthorized or fraudulent, contact Songket as soon as possible and also notify the relevant bank, payment service provider, or payment platform where appropriate.\n\n" +
      "Songket may request reasonable information necessary to investigate the transaction.",
  },
  {
    heading: "6. Situations Generally Not Eligible for Refund",
    content:
      "Except where required by applicable law, refunds will generally not be provided where:\n\n" +
      "• The customer voluntarily removes, kicks, bans, or restricts Songket from a protected Telegram group.\n" +
      "• The service cannot operate because the customer has removed required Telegram administrative permissions.\n" +
      "• The customer experiences a Telegram platform outage, API limitation, or account restriction outside Songket's reasonable control.\n" +
      "• The customer is dissatisfied with normal limitations of automated cybersecurity detection, including false positives or previously unknown threats.\n" +
      "• The subscription has been suspended or terminated because of a material violation of Songket's Terms of Service.",
  },
  {
    heading: "7. How to Request a Refund or Cancellation",
    content:
      "To submit a refund or cancellation request:\n\n" +
      "1. Contact Songket through the official support channel or team@songket.app.\n" +
      "2. Provide your Telegram Group ID, transaction reference or KHQR/Bakong transaction information, and proof of payment where available.\n" +
      "3. Clearly state whether you are requesting cancellation, statutory cooling-off withdrawal, or another type of refund.",
  },
  {
    heading: "8. Refund Payment Method",
    content:
      "Where a refund is approved, Songket will normally return the funds through the original payment method where reasonably possible.",
  },
  {
    heading: "9. Consumer Rights",
    content:
      "Nothing in this policy is intended to exclude, restrict, or waive any mandatory consumer right or legal remedy that applies to the customer under Cambodian law.",
  },
],

slaTitle: "Service Level Agreement (SLA)",

slaEffectiveDate: "Effective Date: August 2026",

slaIntro:
  "This Service Level Agreement describes Songket's service-performance commitments for eligible paid group-security subscriptions. The performance targets in this SLA are service targets established by Songket and are not statutory requirements under Cambodian law.",

slaSections: [
  {
    heading: "1. Service Commitment (Uptime Target)",
    content:
      "Songket commits to maintaining a monthly System Availability target of 99.0% for active, paid group security instances.",
  },
  {
    heading: "2. Performance Benchmarks",
    content:
      "• Support Initial Response: <6 hours — Business-hours response to critical false-positive or outage tickets.\n" +
      "• Malicious Action Execution: <1.5 seconds — Automated message deletion or warning trigger upon confirmed detection.\n" +
      "• File / Binary Inspection: <8.0 seconds — Time to compute the file hash and scan files up to 50 MB.",
  },
  {
    heading: "3. Scheduled Maintenance",
    content:
      "Routine software upgrades, signature database updates, and server patches will be scheduled during off-peak hours (UTC+7 / Cambodia Time). Maintenance lasting longer than 15 minutes will be announced through the official Songket Telegram announcement channel at least 24 hours in advance where reasonably possible.",
  },
  {
    heading: "4. SLA Exclusions",
    content:
      "Downtime and performance degradation are excluded from SLA calculations if caused by:\n\n" +
      "• Upstream Telegram API outages, rate-limiting, or infrastructure failures.\n" +
      "• Unscheduled outages or delays affecting third-party threat-intelligence or scanning services.\n" +
      "• Customer-side misconfiguration, including removal of required administrative permissions.\n" +
      "• Force majeure events, including regional telecommunications failures, national internet restrictions, or severe power-grid failures.",
  },
  {
    heading: "5. Service Credits & Remedies",
    content:
      "If Songket's verified monthly uptime falls below 99.0% during an active subscription month, eligible customers may claim a service credit applied as a subscription extension.\n\n" +
      "• 97.0% – 98.9% uptime: 3 days added to the current billing cycle.\n" +
      "• 95.0% – 96.9% uptime: 7 days added to the current billing cycle.\n" +
      "• Below 95.0% uptime: 14 days added to the current billing cycle.\n\n" +
      "Service credits are non-transferable, have no cash value, and are intended as the service remedy for qualifying uptime failures, subject to applicable law.",
  },
],

termsTitle: "Terms & Conditions",

termsIntro:
  "By using the Songket bot, mini-app, or related services, you acknowledge that you have read, understood, and agree to be bound by these Terms & Conditions.",

terms: [
  {
    heading: "1. Acceptance of Terms",
    content:
      "By inviting, adding, installing, or interacting with Songket through Telegram, including within groups, channels, or private messages, you agree to these Terms & Conditions.\n\n" +
      "If you do not agree to these Terms, you must immediately stop using Songket and, where applicable, remove Songket from any Telegram group or chat that you control.\n\n" +
      "If you add Songket to a Telegram group on behalf of an organization, community, school, business, or other entity, you represent that you have the authority to do so and to accept these Terms on its behalf.",
  },

  {
    heading: "2. Description of Services",
    content:
      "Songket provides automated cybersecurity and content-filtering services through the Telegram platform.\n\n" +
      "Group Security: For subscribed groups, Songket may scan incoming files, documents, and hyperlinks; identify potentially malicious or suspicious content; detect known malware and phishing links; automatically flag or delete content identified as malicious or unsafe; and provide security notifications to group administrators.\n\n" +
      "Direct Inspection: Users may forward individual files or links to Songket for an automated security assessment. The result is an automated assessment and should not be considered an absolute determination that a file or link is safe or malicious.\n\n" +
      "Available features may depend on the subscription plan, Telegram permissions, technical limitations, and third-party security services.",
  },

  {
    heading: "3. Telegram Permissions and Group Administration",
    content:
      "To provide Group Security features, Songket may require administrator permissions within a Telegram group, including permissions such as Delete Messages and Restrict Users.\n\n" +
      "The group owner or administrator is responsible for ensuring that they have the legal and organizational authority to install and authorize Songket to operate within the group.\n\n" +
      "By granting Songket administrative permissions, you acknowledge that Songket may automatically perform actions permitted by those permissions when its security systems identify potentially harmful content or behavior.\n\n" +
      "Songket does not guarantee that every automated action will be correct, appropriate, or successful.",
  },

  {
    heading: "4. Automated Security Detection",
    content:
      "Songket uses automated security technologies and may rely on a combination of:\n\n" +
      "• Heuristic analysis\n" +
      "• Malware and antivirus detection\n" +
      "• File signatures and hashes\n" +
      "• Threat intelligence\n" +
      "• Reputation databases\n" +
      "• Link and domain analysis\n" +
      "• Artificial intelligence or machine-learning systems\n" +
      "• Third-party security services\n\n" +
      "Security technologies are continuously evolving. Songket may update, modify, replace, or discontinue detection methods and security providers where reasonably necessary to maintain or improve the service.",
  },

  {
    heading: "5. Security Limitations and Disclaimer of Warranty",
    content:
      "No cybersecurity product can guarantee detection or prevention of every threat.\n\n" +
      "Songket may fail to detect certain threats, including previously unknown malware, zero-day vulnerabilities, highly sophisticated or modified malware, new phishing campaigns, social-engineering attacks, encrypted or obfuscated malicious content, and threats that cannot be identified by the security technologies available to Songket.\n\n" +
      "Songket does not guarantee that all malicious files, links, accounts, or messages will be detected or prevented.\n\n" +
      "Songket may also produce false positives, where legitimate content is identified as potentially malicious, or false negatives, where malicious content is not detected.\n\n" +
      "Users and administrators should exercise their own judgment and use appropriate additional security measures.",
  },

  {
    heading: "6. Files, Links, and Third-Party Services",
    content:
      "Songket may process submitted files, links, metadata, or other content to perform security analysis.\n\n" +
      "Certain security functions may rely on third-party services, security databases, APIs, hosting providers, or other infrastructure.\n\n" +
      "Songket does not guarantee the availability, accuracy, security, or performance of third-party services and is not responsible for failures caused by third-party providers, Telegram, network interruptions, or circumstances outside our reasonable control.\n\n" +
      "Where applicable, third-party services may also be subject to their own terms and policies.",
  },

  {
    heading: "7. Fees, Subscriptions, and Payments",
    content:
      "Certain Songket features may require a paid subscription.\n\n" +
      "• Premium features require an active subscription purchased through payment methods made available by Songket.\n" +
      "• Subscription plans, pricing, scan limits, group limits, features, and billing periods may vary.\n" +
      "• Where automatic renewal is enabled, subscriptions may automatically renew at the end of each billing period unless cancelled before the renewal date.\n" +
      "• Users are responsible for managing and cancelling their subscriptions where applicable.",
  },

  {
    heading: "8. Refunds and Cancellations",
    content:
      "Unless otherwise stated by Songket, subscription payments are generally non-refundable once the applicable service period has commenced, subject to any mandatory rights available to consumers under applicable Cambodian law.\n\n" +
      "Customers may request cancellation of a recurring subscription at any time. Unless otherwise required by law, cancellation will normally take effect at the end of the current paid billing period.\n\n" +
      "Cancelling a subscription does not automatically create a right to a refund for unused time remaining in the current billing period.\n\n" +
      "Refunds may be available for duplicate charges, Songket-side billing errors, certain service failures, unauthorized transactions, or other circumstances where a refund is required by applicable law.",
  },

  {
    heading: "9. Acceptable Use",
    content:
      "You agree to use Songket only for lawful and legitimate purposes.\n\n" +
      "You must not:\n\n" +
      "• Reverse engineer, decompile, or disassemble Songket.\n" +
      "• Attempt to extract Songket's source code, proprietary algorithms, or threat signatures.\n" +
      "• Deliberately overload, flood, disrupt, or attack Songket's infrastructure.\n" +
      "• Conduct denial-of-service (DDoS) attacks against Songket.\n" +
      "• Abuse scanning resources or intentionally exceed applicable service limits.\n" +
      "• Use Songket to develop, improve, test, or deploy malware for malicious purposes.\n" +
      "• Use Songket to facilitate fraud, cyberattacks, unauthorized access, or other unlawful activities.\n" +
      "• Attempt to bypass subscription, authentication, rate-limit, or security controls.",
  },

  {
    heading: "10. Suspension and Termination",
    content:
      "Songket reserves the right to suspend, restrict, or terminate access to the service where reasonably necessary, including if:\n\n" +
      "• You violate these Terms.\n" +
      "• You engage in abusive or fraudulent behavior.\n" +
      "• You attempt to compromise or abuse Songket's infrastructure.\n" +
      "• A payment is fraudulent, reversed, or otherwise invalid.\n" +
      "• Your use creates a security or operational risk.\n" +
      "• Continued access would violate applicable law.\n" +
      "• Suspension is necessary to protect Songket or its users.\n\n" +
      "Where reasonably practicable, Songket may provide notice or an explanation for suspension or termination.",
  },

  {
    heading: "11. Service Availability",
    content:
      "Songket is provided on an \"as available\" and \"as is\" basis to the extent permitted by applicable law.\n\n" +
      "Songket does not guarantee that the service will be continuously available, operate without errors, detect every security threat, successfully process every file or link, remain compatible with every Telegram feature or update, or remain unchanged indefinitely.\n\n" +
      "Temporary interruptions may occur due to maintenance, software updates, security incidents, Telegram changes, third-party service outages, infrastructure failures, or other circumstances beyond our reasonable control.",
  },

  {
    heading: "12. Limitation of Liability",
    content:
      "To the maximum extent permitted by applicable Cambodian law, Songket, its developers, operators, affiliates, and service providers shall not be liable for indirect, incidental, special, consequential, or punitive damages arising from or related to your use of the service.\n\n" +
      "This may include, where legally permitted, loss of data, loss of business, financial losses, losses resulting from phishing or malware, losses caused by false positives or false negatives, group disruption, account compromise, service interruption, or unauthorized access resulting from circumstances outside Songket's reasonable control.\n\n" +
      "To the maximum extent permitted by applicable law, Songket's aggregate liability shall not exceed the total amount actually paid by the affected Customer to Songket during the three (3) months immediately preceding the event giving rise to the claim.\n\n" +
      "Nothing in these Terms is intended to exclude or limit liability that cannot legally be excluded or limited under applicable law.",
  },

  {
    heading: "13. User Responsibility",
    content:
      "Songket is a security-assistance tool and should not be treated as the sole security measure for a group, organization, business, or individual.\n\n" +
      "Users and administrators remain responsible for:\n\n" +
      "• Protecting their Telegram accounts.\n" +
      "• Using appropriate security practices.\n" +
      "• Reviewing suspicious messages and content.\n" +
      "• Maintaining backups where appropriate.\n" +
      "• Managing group permissions responsibly.\n" +
      "• Taking appropriate action when Songket identifies a potential threat.\n\n" +
      "Administrators are responsible for determining whether Songket is appropriate for their particular group or organization.",
  },

  {
    heading: "14. Intellectual Property",
    content:
      "All rights, title, and interest in Songket, including its software, design, branding, logos, detection systems, algorithms, interfaces, and related materials, remain the property of Songket or its respective licensors.\n\n" +
      "Except where expressly permitted, these Terms do not grant you any ownership rights in Songket or its intellectual property.",
  },

  {
    heading: "15. Changes to the Service and Terms",
    content:
      "Songket may modify, improve, suspend, or discontinue features of the service from time to time.\n\n" +
      "We may also update these Terms when necessary to reflect changes in the service, technology, business practices, or applicable law.\n\n" +
      "The updated version will indicate the applicable Last Updated date. Continued use of Songket after an updated version becomes effective constitutes acceptance of the revised Terms, to the extent permitted by applicable law.",
  },

  {
    heading: "16. Governing Law and Dispute Resolution",
    content:
      "These Terms shall be governed by and construed in accordance with the laws of the Kingdom of Cambodia.\n\n" +
      "Any dispute arising out of or relating to these Terms or the use of Songket shall first be addressed through good-faith discussions between the parties.\n\n" +
      "If the dispute cannot be resolved amicably, it shall be submitted to the competent courts of Phnom Penh, Cambodia, subject to applicable Cambodian law.",
  },

  {
    heading: "17. Severability",
    content:
      "If any provision of these Terms is determined to be invalid, unlawful, or unenforceable, that provision shall be interpreted or modified to the minimum extent necessary to make it enforceable, where legally permitted.\n\n" +
      "The remaining provisions shall continue in full force and effect.",
  },

  {
    heading: "18. Entire Agreement",
    content:
      "These Terms constitute the agreement between you and Songket concerning your use of the service and supersede prior agreements or understandings concerning the same subject matter, except where Songket expressly states otherwise.",
  },

  {
    heading: "19. Contact",
    content:
      "If you have questions, concerns, or requests regarding these Terms or Songket's services, please contact the Songket team at team@songket.app.",
  },
  ],

  contactEmail: "For any questions or requests, please contact us at",
};



const km = {
  back: "ត្រឡប់ទៅទំព័រដើម",

  privacyTitle: "គោលការណ៍ឯកជនភាព",

  privacyEffectiveDate: "កាលបរិច្ឆេទចូលជាធរមាន៖ ខែសីហា ឆ្នាំ ២០២៦",

  privacyIntro:
    "Songket គោរពភាពឯកជនរបស់អ្នក និងប្តេជ្ញាការពារព័ត៌មានដែលត្រូវបានដំណើរការតាមរយៈសេវាសុវត្ថិភាព Telegram របស់យើង។ គោលការណ៍ឯកជនភាពនេះពន្យល់អំពីព័ត៌មានដែល Songket ប្រមូល របៀបដែលយើងប្រើប្រាស់ និងការពារព័ត៌មានទាំងនោះ ព្រមទាំងជម្រើសដែលមានសម្រាប់អ្នកប្រើប្រាស់។ Songket អនុវត្តវិធានការសុវត្ថិភាពសមស្រប ស្របតាមតម្រូវការដែលអាចអនុវត្តបានក្រោមច្បាប់កម្ពុជាពាក់ព័ន្ធនឹងពាណិជ្ជកម្មអេឡិចត្រូនិក និងការការពារអ្នកប្រើប្រាស់ រួមទាំងមាត្រា ៣២ នៃច្បាប់ស្តីពីពាណិជ្ជកម្មអេឡិចត្រូនិករបស់កម្ពុជា។",

  sections: [
    {
      heading: "១. ព័ត៌មានដែលយើងប្រមូល",
      content:
        "Songket អាចដំណើរការព័ត៌មានខាងក្រោម នៅពេលអ្នកប្រើប្រាស់សេវាកម្មរបស់យើង៖\n\n" +
        "• ទិន្នន័យ Telegram៖ ID អ្នកប្រើប្រាស់ Telegram, ID ក្រុម, ពេលវេលាផ្ញើសារ, ឈ្មោះអ្នកប្រើប្រាស់ដែល Telegram ផ្តល់ឱ្យ និងព័ត៌មានបច្ចេកទេសដែលចាំបាច់សម្រាប់ដំណើរការ Bot។\n" +
        "• ទិន្នន័យសម្រាប់ការត្រួតពិនិត្យសុវត្ថិភាព៖ URL, ឈ្មោះដែន, ឈ្មោះឯកសារ, File Hash ដូចជា SHA-256 ឬ MD5 និងឯកសារ ឬមាតិកាផ្សេងៗដែលបានផ្ញើមក ឬដំណើរការដោយ Songket សម្រាប់ការស្កែនសុវត្ថិភាព។\n" +
        "• លទ្ធផលស្កែន៖ លទ្ធផលរកឃើញមេរោគ ការចាត់ថ្នាក់ការគំរាមកំហែង ពេលវេលាស្កែន និងព័ត៌មានសុវត្ថិភាពពាក់ព័ន្ធ។\n" +
        "• ព័ត៌មានការទូទាត់៖ លេខយោងប្រតិបត្តិការ ចំនួនទឹកប្រាក់ ស្ថានភាពការទូទាត់ និងព័ត៌មានសមាជិកភាព។ Songket មិនរក្សាទុកព័ត៌មានគណនីធនាគារ ឬព័ត៌មានកាតទូទាត់ពេញលេញដោយចេតនាទេ លុះត្រាតែចាំបាច់ និងត្រូវបានអនុញ្ញាតដោយច្បាប់សម្រាប់ដំណើរការទូទាត់ជាក់លាក់។",
    },

    {
      heading: "២. របៀបដែលយើងប្រើប្រាស់ព័ត៌មានរបស់អ្នក",
      content:
        "Songket ប្រើប្រាស់ព័ត៌មានដែលប្រមូលបានតែក្នុងកម្រិតចាំបាច់សមស្រប ដើម្បីដំណើរការ និងកែលម្អសេវាកម្ម រួមមាន៖\n\n" +
        "• រកឃើញ និងឆ្លើយតបចំពោះតំណ ឯកសារ និងការគំរាមកំហែងសុវត្ថិភាពដែលអាចមានគ្រោះថ្នាក់។\n" +
        "• ផ្តល់លទ្ធផលស្កែន របាយការណ៍សុវត្ថិភាព និងប្រវត្តិស្កែន។\n" +
        "• ថែទាំ និងកែលម្អប្រព័ន្ធរកឃើញការគំរាមកំហែង។\n" +
        "• ផ្ញើការជូនដំណឹងអំពីសុវត្ថិភាព និងសេវាកម្ម។\n" +
        "• ដំណើរការសមាជិកភាព និងផ្តល់ការគាំទ្រអតិថិជន។\n" +
        "• រកឃើញការប្រើប្រាស់ខុស ការពារសុវត្ថិភាពប្រព័ន្ធ Songket និងអនុវត្តតាមកាតព្វកិច្ចផ្លូវច្បាប់ដែលអាចអនុវត្តបាន។",
    },

    {
      heading: "៣. ការរក្សាទុក និងសុវត្ថិភាពទិន្នន័យ",
      content:
        "Songket ប្រើប្រាស់វិធានការបច្ចេកទេស និងការគ្រប់គ្រងសមស្រប ដើម្បីការពារព័ត៌មានពីការចូលប្រើដោយគ្មានការអនុញ្ញាត ការបាត់បង់ ការប្រើប្រាស់ ការកែប្រែ ការលេចធ្លាយ ឬការបង្ហាញដោយគ្មានការអនុញ្ញាត។\n\n" +
        "• ទិន្នន័យអាចត្រូវបានរក្សាទុកតាមរយៈអ្នកផ្តល់សេវាហេដ្ឋារចនាសម្ព័ន្ធភាគីទីបីដែល Songket ប្រើប្រាស់សម្រាប់ដំណើរការសេវាកម្ម។\n" +
        "• យើងកំណត់ការចូលប្រើព័ត៌មានសម្រាប់តែបុគ្គល និងប្រព័ន្ធដែលត្រូវការព័ត៌មាននោះសម្រាប់ដំណើរការ ឬគាំទ្រសេវាកម្ម។\n" +
        "• ទិន្នន័យស្កែន និងទិន្នន័យប្រតិបត្តិការអាចត្រូវបានរក្សាទុកក្នុងរយៈពេលសមស្របទៅតាមផែនការសមាជិកភាព តម្រូវការសុវត្ថិភាព និងតម្រូវការប្រតិបត្តិការស្របច្បាប់។\n" +
        "• មិនមានប្រព័ន្ធសុវត្ថិភាពណាមួយអាចធានាសុវត្ថិភាពបាន ១០០% ឡើយ ប៉ុន្តែ Songket អនុវត្តវិធានការសមស្របដើម្បីការពារព័ត៌មានដែលខ្លួនដំណើរការ។",
    },

    {
      heading: "៤. ការចែករំលែកទិន្នន័យ និងសេវាកម្មភាគីទីបី",
      content:
        "Songket មិនលក់ព័ត៌មានផ្ទាល់ខ្លួនសម្រាប់គោលបំណងផ្សាយពាណិជ្ជកម្មឡើយ។\n\n" +
        "Songket អាចចែករំលែក ឬបញ្ជូនព័ត៌មានដែលមានកម្រិតទៅកាន់អ្នកផ្តល់សេវាដែលគួរឱ្យទុកចិត្ត នៅពេលចាំបាច់សម្រាប់ដំណើរការសេវាកម្ម។ ឧទាហរណ៍រួមមាន អ្នកផ្តល់សេវា Hosting អ្នកផ្តល់សេវាទូទាត់ប្រាក់ សេវាព័ត៌មានអំពីការគំរាមកំហែង ឬស្កែនមេរោគ និងអ្នកផ្តល់ហេដ្ឋារចនាសម្ព័ន្ធ។\n\n" +
        "អ្នកផ្តល់សេវាទាំងនេះអាចដំណើរការព័ត៌មានតែក្នុងកម្រិតចាំបាច់ ដើម្បីផ្តល់សេវាដល់ Songket ឬតាមដែលច្បាប់អនុញ្ញាត។",
    },

    {
      heading: "៥. ការស្កែនសុវត្ថិភាព និងព័ត៌មានអំពីការគំរាមកំហែងពីភាគីទីបី",
      content:
        "ដើម្បីផ្តល់សេវារកឃើញមេរោគ និងការគំរាមកំហែងសុវត្ថិភាព Songket អាចបញ្ជូនព័ត៌មានបច្ចេកទេសមួយចំនួន ដូចជា URL ព័ត៌មានអំពីដែន File Hash ឬឯកសារដែលបានផ្ញើ ទៅកាន់សេវាសុវត្ថិភាព និងព័ត៌មានអំពីការគំរាមកំហែងរបស់ភាគីទីបី។\n\n" +
        "ព័ត៌មានដែលត្រូវបានបញ្ជូនអាស្រ័យលើប្រភេទស្កែន និងសេវាភាគីទីបីដែលត្រូវបានប្រើប្រាស់។ អតិថិជនគួរជៀសវាងការផ្ញើឯកសារសម្ងាត់ ឬព័ត៌មានរសើបខ្លាំង លុះត្រាតែពួកគេមានសិទ្ធិធ្វើដូច្នេះ។",
    },

    {
      heading: "៦. សិទ្ធិ និងសំណើរបស់អ្នក",
      content:
        "អាស្រ័យលើច្បាប់ដែលអាចអនុវត្តបាន និងតម្រូវការប្រតិបត្តិការ ឬផ្លូវច្បាប់ស្របច្បាប់ អ្នកប្រើប្រាស់អាចទាក់ទង Songket ដើម្បី៖\n\n" +
        "• សួរអំពីប្រភេទព័ត៌មានដែល Songket ដំណើរការពាក់ព័ន្ធនឹងគណនី ឬក្រុមរបស់ពួកគេ។\n" +
        "• ស្នើសុំកែតម្រូវព័ត៌មានដែលមិនត្រឹមត្រូវ នៅពេលអាចធ្វើទៅបាន។\n" +
        "• ស្នើសុំលុបព័ត៌មានផ្ទាល់ខ្លួន ឬព័ត៌មានប្រតិបត្តិការរបស់ក្រុមមួយចំនួន បន្ទាប់ពីការលុបសមាជិកភាព ដោយអាស្រ័យលើតម្រូវការផ្លូវច្បាប់ សុវត្ថិភាព ការការពារការក្លែងបន្លំ និងតម្រូវការអាជីវកម្មស្របច្បាប់។\n" +
        "• សួរអំពីរបៀបដែលព័ត៌មានរបស់ពួកគេត្រូវបានដំណើរការ។\n\n" +
        "សំណើអាចដាក់តាមរយៈព័ត៌មានទំនាក់ទំនងគាំទ្រ Songket ដែលមាននៅខាងក្រោម។",
    },

    {
      heading: "៧. រយៈពេលរក្សាទុកទិន្នន័យ",
      content:
        "Songket រក្សាទុកព័ត៌មានតែក្នុងរយៈពេលដែលចាំបាច់សមស្របសម្រាប់គោលបំណងដែលបានពិពណ៌នានៅក្នុងគោលការណ៍ឯកជនភាពនេះ រួមមានការផ្តល់សេវាសុវត្ថិភាព ការរក្សាប្រវត្តិស្កែន ការការពារការប្រើប្រាស់ខុស ការដោះស្រាយវិវាទ ការរក្សាកំណត់ត្រាអាជីវកម្ម និងការអនុវត្តតាមកាតព្វកិច្ចផ្លូវច្បាប់។\n\n" +
        "រយៈពេលរក្សាទុកជាក់លាក់អាចខុសគ្នា អាស្រ័យលើប្រភេទព័ត៌មាន និងផែនការសមាជិកភាពរបស់អតិថិជន។",
    },

    {
      heading: "៨. ការផ្លាស់ប្តូរគោលការណ៍នេះ",
      content:
        "Songket អាចធ្វើបច្ចុប្បន្នភាពគោលការណ៍ឯកជនភាពនេះពីពេលមួយទៅពេលមួយ។ នៅពេលមានការផ្លាស់ប្តូរសំខាន់ៗ យើងនឹងបង្ហោះគោលការណ៍ដែលបានធ្វើបច្ចុប្បន្នភាព និងកាលបរិច្ឆេទចូលជាធរមានថ្មី។ ការបន្តប្រើប្រាស់សេវាកម្មបន្ទាប់ពីគោលការណ៍ថ្មីចូលជាធរមាន មានន័យថាអ្នកយល់ព្រមគោរពតាមគោលការណ៍ថ្មី តាមដែលច្បាប់អនុញ្ញាត។",
    },

    {
      heading: "៩. ទំនាក់ទំនង",
      content:
        "ប្រសិនបើអ្នកមានសំណួរ កង្វល់ ឬសំណើពាក់ព័ន្ធនឹងគោលការណ៍ឯកជនភាពនេះ ឬព័ត៌មានដែល Songket ដំណើរការ សូមទាក់ទងមកយើងតាមរយៈ team@songket.app។",
    },
  ],

  refundTitle: "គោលការណ៍សងប្រាក់វិញ និងការបោះបង់",

  refundEffectiveDate: "កាលបរិច្ឆេទចូលជាធរមាន៖ ខែសីហា ឆ្នាំ ២០២៦",

  refundIntro:
    "គោលការណ៍សងប្រាក់វិញ និងការបោះបង់នេះពន្យល់អំពីលក្ខខណ្ឌនៃការបោះបង់ និងការសងប្រាក់វិញដែលអនុវត្តចំពោះសមាជិកភាពសុវត្ថិភាពក្រុម Songket។",

  refundSections: [
    {
      heading: "១. ម៉ូដែលសមាជិកភាព និងការទូទាត់ប្រាក់",
      content:
        "Songket Group Security ដំណើរការតាមរយៈសមាជិកភាពបង់ប្រាក់ជាមុន និងបន្តជាថ្មី។ ការទូទាត់សមាជិកភាពត្រូវបានដំណើរការជា USD ឬប្រាក់រៀលខ្មែរ (KHR) តាមរយៈវិធីសាស្ត្រទូទាត់ដែល Songket គាំទ្រ។",
    },

    {
      heading: "២. រយៈពេល ៧ ថ្ងៃសម្រាប់ការដកខ្លួន",
      content:
        "នៅពេលសមាជិកភាព Songket មានលក្ខណៈជាការលក់ពីចម្ងាយ ឬប្រតិបត្តិការដែលស្ថិតក្រោមច្បាប់ការពារអ្នកប្រើប្រាស់កម្ពុជា អតិថិជនអាចមានសិទ្ធិតាមច្បាប់ក្នុងការដកខ្លួនពីកិច្ចសន្យា ក្នុងរយៈពេលប្រាំពីរ (៧) ថ្ងៃតាមប្រតិទិន។\n\n" +
        "• រយៈពេល ៧ ថ្ងៃសម្រាប់ការលក់សេវាពីចម្ងាយដែលមានលក្ខណៈសម្បត្តិគ្រប់គ្រាន់ ជាទូទៅចាប់ផ្តើមពីថ្ងៃដែលកិច្ចសន្យាសេវាកម្មត្រូវបានបង្កើត។\n" +
        "• អតិថិជនអាចប្រើសិទ្ធិដកខ្លួនដោយផ្តល់សេចក្តីជូនដំណឹងជាលាយលក្ខណ៍អក្សរទៅ Songket។\n" +
        "• ប្រសិនបើសេវាកម្មត្រូវបានប្រើប្រាស់រួច Songket អាចកាត់ថ្លៃសេវាដែលបានប្រើប្រាស់ជាក់ស្តែង តាមដែលច្បាប់អនុញ្ញាត។\n" +
        "• ប្រសិនបើការសងប្រាក់វិញត្រូវបានអនុវត្តតាមច្បាប់ Songket នឹងដំណើរការសងប្រាក់វិញក្នុងរយៈពេលដែលច្បាប់តម្រូវ។",
    },

    {
      heading: "៣. ការបោះបង់បន្ទាប់ពីរយៈពេល ៧ ថ្ងៃ",
      content:
        "អតិថិជនអាចស្នើសុំបោះបង់សមាជិកភាពដែលបន្តជាថ្មីបានគ្រប់ពេល។ លើកលែងតែច្បាប់តម្រូវផ្សេងពីនេះ ការបោះបង់ជាទូទៅនឹងចូលជាធរមាននៅចុងបញ្ចប់នៃរយៈពេលបង់ប្រាក់បច្ចុប្បន្ន។\n\n" +
        "ការបោះបង់សមាជិកភាពមិនមានន័យថាអតិថិជនមានសិទ្ធិទទួលបានប្រាក់សងវិញសម្រាប់រយៈពេលដែលនៅសល់ និងមិនទាន់ប្រើប្រាស់ក្នុងវគ្គបង់ប្រាក់បច្ចុប្បន្នឡើយ។",
    },

    {
      heading: "៤. ការសងប្រាក់វិញសម្រាប់កំហុសការទូទាត់ ឬសេវាកម្ម",
      content:
        "អតិថិជនអាចស្នើសុំការសងប្រាក់វិញពេញចំនួន ឬមួយផ្នែក នៅពេល៖\n\n" +
        "• ការគិតប្រាក់ស្ទួនបណ្តាលមកពីកំហុសប្រព័ន្ធ ឬការទូទាត់របស់ Songket។\n" +
        "• អតិថិជនត្រូវបានគិតថ្លៃសមាជិកភាព ប៉ុន្តែ Songket មិនបានបើកដំណើរការសេវាកម្មដោយជោគជ័យ ដោយសារកំហុសពី Songket។\n" +
        "• Songket មិនអាចផ្តល់សេវាកម្មសមាជិកភាពសំខាន់បានក្នុងរយៈពេលយូរ ដោយសារកំហុសប្រព័ន្ធរបស់ Songket។\n" +
        "• ការសងប្រាក់វិញត្រូវបានតម្រូវដោយច្បាប់ដែលអាចអនុវត្តបាន។",
    },

    {
      heading: "៥. ប្រតិបត្តិការដែលគ្មានការអនុញ្ញាត ឬក្លែងបន្លំ",
      content:
        "ប្រសិនបើអ្នកជឿថាការទូទាត់មួយមិនមានការអនុញ្ញាត ឬជាការក្លែងបន្លំ សូមទាក់ទង Songket ឱ្យបានឆាប់តាមដែលអាចធ្វើទៅបាន ហើយជូនដំណឹងទៅធនាគារ អ្នកផ្តល់សេវាទូទាត់ ឬវេទិកាទូទាត់ដែលពាក់ព័ន្ធផងដែរ។\n\n" +
        "Songket អាចស្នើសុំព័ត៌មានសមស្របដែលចាំបាច់សម្រាប់ស៊ើបអង្កេតប្រតិបត្តិការនោះ។",
    },

    {
      heading: "៦. ស្ថានភាពដែលជាទូទៅមិនមានសិទ្ធិសងប្រាក់វិញ",
      content:
        "លើកលែងតែច្បាប់តម្រូវ ការសងប្រាក់វិញជាទូទៅមិនត្រូវបានផ្តល់នៅពេល៖\n\n" +
        "• អតិថិជនដក Songket ចេញពីក្រុម Telegram ដោយស្ម័គ្រចិត្ត។\n" +
        "• សេវាកម្មមិនអាចដំណើរការបាន ដោយសារអតិថិជនបានដកសិទ្ធិ Admin របស់ Telegram ដែលចាំបាច់។\n" +
        "• អតិថិជនជួបប្រទះការផ្អាក Telegram ការកំណត់ API ឬការរឹតបន្តឹងគណនី ដែលស្ថិតក្រៅការគ្រប់គ្រងសមហេតុផលរបស់ Songket។\n" +
        "• អតិថិជនមិនពេញចិត្តនឹងដែនកំណត់ធម្មតារបស់ប្រព័ន្ធស្វ័យប្រវត្តិសម្រាប់រកឃើញការគំរាមកំហែង ដូចជា False Positive ឬការគំរាមកំហែងដែលមិនទាន់ត្រូវបានរកឃើញ។\n" +
        "• សមាជិកភាពត្រូវបានផ្អាក ឬបញ្ចប់ដោយសារការរំលោភលក្ខខណ្ឌសេវាកម្ម Songket។",
    },

    {
      heading: "៧. របៀបស្នើសុំសងប្រាក់វិញ ឬបោះបង់សមាជិកភាព",
      content:
        "ដើម្បីដាក់សំណើសងប្រាក់វិញ ឬបោះបង់សមាជិកភាព៖\n\n" +
        "១. ទាក់ទង Songket តាមរយៈឆានែលគាំទ្រផ្លូវការ ឬ team@songket.app។\n" +
        "២. ផ្តល់ ID ក្រុម Telegram លេខយោងប្រតិបត្តិការ ឬព័ត៌មានប្រតិបត្តិការ KHQR/Bakong និងភស្តុតាងនៃការទូទាត់ ប្រសិនបើមាន។\n" +
        "៣. បញ្ជាក់ឱ្យច្បាស់ថា អ្នកកំពុងស្នើសុំការបោះបង់ ការដកខ្លួនតាមសិទ្ធិច្បាប់ ឬការសងប្រាក់វិញប្រភេទផ្សេងទៀត។",
    },

    {
      heading: "៨. វិធីសាស្ត្រសងប្រាក់វិញ",
      content:
        "នៅពេលការសងប្រាក់វិញត្រូវបានអនុម័ត Songket នឹងត្រឡប់ប្រាក់ទៅតាមវិធីសាស្ត្រទូទាត់ដើម ប្រសិនបើអាចធ្វើទៅបាន។",
    },

    {
      heading: "៩. សិទ្ធិអ្នកប្រើប្រាស់",
      content:
        "គ្មានចំណុចណាមួយនៅក្នុងគោលការណ៍នេះមានបំណងដកហូត កំណត់ ឬលះបង់សិទ្ធិអ្នកប្រើប្រាស់ ឬសំណងតាមច្បាប់ដែលចាំបាច់ និងអនុវត្តចំពោះអតិថិជនក្រោមច្បាប់កម្ពុជាឡើយ។",
    },
  ],

  slaTitle: "កិច្ចព្រមព្រៀងកម្រិតសេវាកម្ម (SLA)",

  slaEffectiveDate: "កាលបរិច្ឆេទចូលជាធរមាន៖ ខែសីហា ឆ្នាំ ២០២៦",

  slaIntro:
    "កិច្ចព្រមព្រៀងកម្រិតសេវាកម្មនេះពិពណ៌នាអំពីការប្តេជ្ញាចិត្តផ្នែកប្រសិទ្ធភាពសេវាកម្មរបស់ Songket សម្រាប់សមាជិកភាពសុវត្ថិភាពក្រុមដែលបានបង់ប្រាក់ និងមានសិទ្ធិ។ គោលដៅប្រសិទ្ធភាពនៅក្នុង SLA នេះ គឺជាគោលដៅសេវាកម្មដែលកំណត់ដោយ Songket ហើយមិនមែនជាតម្រូវការតាមច្បាប់កម្ពុជាឡើយ។",

  slaSections: [
    {
      heading: "១. ការប្តេជ្ញាសេវាកម្ម (គោលដៅ Uptime)",
      content:
        "Songket ប្តេជ្ញារក្សាគោលដៅភាពអាចប្រើប្រាស់បាននៃប្រព័ន្ធប្រចាំខែ ៩៩.០% សម្រាប់សេវាសុវត្ថិភាពក្រុមដែលបានបង់ប្រាក់ និងកំពុងដំណើរការ។",
    },

    {
      heading: "២. ស្តង់ដារប្រសិទ្ធភាព",
      content:
        "• ការឆ្លើយតបដំបូងពី Support៖ <៦ ម៉ោង — ការឆ្លើយតបក្នុងម៉ោងធ្វើការសម្រាប់បញ្ហា False Positive សំខាន់ៗ ឬបញ្ហាសេវាកម្មផ្អាក។\n" +
        "• ការអនុវត្តសកម្មភាពលើការគំរាមកំហែង៖ <១.៥ វិនាទី — ការលុបសារដោយស្វ័យប្រវត្តិ ឬការជូនដំណឹង បន្ទាប់ពីរកឃើញការគំរាមកំហែងដែលបានបញ្ជាក់។\n" +
        "• ការត្រួតពិនិត្យឯកសារ/Binary៖ <៨.០ វិនាទី — ពេលវេលាសម្រាប់គណនា File Hash និងស្កែនឯកសារដែលមានទំហំរហូតដល់ ៥០ MB។",
    },

    {
      heading: "៣. ការថែទាំដែលបានគ្រោងទុក",
      content:
        "ការអាប់ដេតកម្មវិធី ការអាប់ដេតមូលដ្ឋានទិន្នន័យ Signature និង Server Patch នឹងត្រូវបានគ្រោងទុកក្នុងម៉ោងមិនសូវមានការប្រើប្រាស់ (UTC+7 / ម៉ោងកម្ពុជា)។ ការថែទាំដែលមានរយៈពេលលើសពី ១៥ នាទី នឹងត្រូវបានប្រកាសតាមឆានែល Telegram ផ្លូវការរបស់ Songket យ៉ាងហោចណាស់ ២៤ ម៉ោងជាមុន ប្រសិនបើអាចធ្វើទៅបាន។",
    },

    {
      heading: "៤. ការលើកលែងពី SLA",
      content:
        "ពេលវេលាដែលសេវាកម្មផ្អាក និងការថយចុះប្រសិទ្ធភាព នឹងមិនត្រូវបានរាប់បញ្ចូលក្នុងការគណនា SLA ប្រសិនបើបណ្តាលមកពី៖\n\n" +
        "• ការផ្អាក Telegram API ការកំណត់ល្បឿន ឬបញ្ហាហេដ្ឋារចនាសម្ព័ន្ធពីភាគីខាងក្រៅ។\n" +
        "• ការផ្អាក ឬការពន្យារពេលដែលប៉ះពាល់ដល់សេវាស្កែន ឬព័ត៌មានអំពីការគំរាមកំហែងពីភាគីទីបី។\n" +
        "• ការកំណត់រចនាសម្ព័ន្ធខុសពីអតិថិជន រួមទាំងការដកសិទ្ធិ Admin ដែលចាំបាច់។\n" +
        "• ព្រឹត្តិការណ៍ដែលមិនអាចគ្រប់គ្រងបាន រួមមានបញ្ហាទូរគមនាគមន៍ក្នុងតំបន់ ការរឹតបន្តឹងអ៊ីនធឺណិតជាតិ ឬការបរាជ័យបណ្តាញអគ្គិសនីធ្ងន់ធ្ងរ។",
    },

    {
      heading: "៥. ឥណទានសេវាកម្ម និងសំណង",
      content:
        "ប្រសិនបើ Uptime ប្រចាំខែដែលបានបញ្ជាក់របស់ Songket ធ្លាក់ចុះក្រោម ៩៩.០% ក្នុងអំឡុងខែសមាជិកភាពដែលកំពុងដំណើរការ អតិថិជនដែលមានសិទ្ធិអាចស្នើសុំឥណទានសេវាកម្ម ដែលនឹងត្រូវផ្តល់ជាការបន្ថែមរយៈពេលសមាជិកភាព។\n\n" +
        "• Uptime ៩៧.០% – ៩៨.៩%៖ បន្ថែម ៣ ថ្ងៃទៅវគ្គបង់ប្រាក់បច្ចុប្បន្ន។\n" +
        "• Uptime ៩៥.០% – ៩៦.៩%៖ បន្ថែម ៧ ថ្ងៃទៅវគ្គបង់ប្រាក់បច្ចុប្បន្ន។\n" +
        "• Uptime ក្រោម ៩៥.០%៖ បន្ថែម ១៤ ថ្ងៃទៅវគ្គបង់ប្រាក់បច្ចុប្បន្ន។\n\n" +
        "ឥណទានសេវាកម្មមិនអាចផ្ទេរទៅអ្នកដទៃបាន មិនអាចប្តូរជាសាច់ប្រាក់បាន និងមានគោលបំណងជាសំណងសេវាកម្មសម្រាប់បញ្ហា Uptime ដែលមានលក្ខណៈសម្បត្តិគ្រប់គ្រាន់ តាមដែលច្បាប់អនុញ្ញាត។",
    },
  ],

  termsTitle: "លក្ខខណ្ឌ និងការកំណត់",

  termsIntro:
    "ដោយប្រើប្រាស់ Bot Songket, Mini App ឬសេវាកម្មដែលពាក់ព័ន្ធ អ្នកទទួលស្គាល់ថា អ្នកបានអាន យល់ និងយល់ព្រមគោរពតាមលក្ខខណ្ឌ និងការកំណត់ទាំងនេះ។",

  terms: [
    {
      heading: "១. ការយល់ព្រមលើលក្ខខណ្ឌ",
      content:
        "ដោយអញ្ជើញ បន្ថែម ដំឡើង ឬប្រើប្រាស់ Songket តាមរយៈ Telegram រួមទាំងក្នុងក្រុម ឆានែល ឬសារផ្ទាល់ខ្លួន អ្នកយល់ព្រមគោរពតាមលក្ខខណ្ឌទាំងនេះ។\n\n" +
        "ប្រសិនបើអ្នកមិនយល់ព្រមនឹងលក្ខខណ្ឌទាំងនេះទេ អ្នកត្រូវបញ្ឈប់ការប្រើប្រាស់ Songket ភ្លាមៗ ហើយប្រសិនបើអាចអនុវត្តបាន ត្រូវដក Songket ចេញពីក្រុម Telegram ឬ Chat ដែលអ្នកគ្រប់គ្រង។\n\n" +
        "ប្រសិនបើអ្នកបន្ថែម Songket ទៅក្រុម Telegram ក្នុងនាមអង្គការ សហគមន៍ សាលារៀន អាជីវកម្ម ឬអង្គភាពផ្សេងទៀត អ្នកបញ្ជាក់ថា អ្នកមានសិទ្ធិអនុញ្ញាតឱ្យ Songket ដំណើរការ និងមានសិទ្ធិយល់ព្រមលើលក្ខខណ្ឌទាំងនេះក្នុងនាមអង្គភាពនោះ។",
    },

    {
      heading: "២. ការពិពណ៌នាអំពីសេវាកម្ម",
      content:
        "Songket ផ្តល់សេវាសុវត្ថិភាពតាមអ៊ីនធឺណិត និងការត្រួតពិនិត្យមាតិកាដោយស្វ័យប្រវត្តិតាមរយៈវេទិកា Telegram។\n\n" +
        "សុវត្ថិភាពក្រុម៖ សម្រាប់ក្រុមដែលបានជាវសេវាកម្ម Songket អាចស្កែនឯកសារ ឯកសារផ្សេងៗ និងតំណភ្ជាប់ដែលចូលមក រកឃើញមាតិកាដែលអាចមានគ្រោះថ្នាក់ ឬគួរឱ្យសង្ស័យ រកឃើញមេរោគ និងតំណ Phishing ដែលស្គាល់ ហើយអាចសម្គាល់ ឬលុបមាតិកាដែលត្រូវបានរកឃើញថាមានគ្រោះថ្នាក់ ព្រមទាំងផ្តល់ការជូនដំណឹងសុវត្ថិភាពដល់ Admin ក្រុម។\n\n" +
        "ការត្រួតពិនិត្យដោយផ្ទាល់៖ អ្នកប្រើប្រាស់អាច Forward ឯកសារ ឬតំណនីមួយៗទៅ Songket ដើម្បីធ្វើការវាយតម្លៃសុវត្ថិភាពដោយស្វ័យប្រវត្តិ។ លទ្ធផលគឺជាការវាយតម្លៃដោយស្វ័យប្រវត្តិ ហើយមិនគួរត្រូវបានចាត់ទុកថាជាការបញ្ជាក់ ១០០% ថាឯកសារ ឬតំណនោះមានសុវត្ថិភាព ឬមានមេរោគឡើយ។\n\n" +
        "លក្ខណៈពិសេសដែលអាចប្រើបាន អាចអាស្រ័យលើផែនការសមាជិកភាព សិទ្ធិ Telegram ដែនកំណត់បច្ចេកទេស និងសេវាសុវត្ថិភាពរបស់ភាគីទីបី។",
    },

    {
      heading: "៣. សិទ្ធិ Telegram និងការគ្រប់គ្រងក្រុម",
      content:
        "ដើម្បីផ្តល់មុខងារសុវត្ថិភាពក្រុម Songket អាចត្រូវការសិទ្ធិ Admin នៅក្នុងក្រុម Telegram រួមមានសិទ្ធិដូចជា Delete Messages និង Restrict Users។\n\n" +
        "ម្ចាស់ក្រុម ឬ Admin មានទំនួលខុសត្រូវក្នុងការធានាថា ពួកគេមានសិទ្ធិតាមច្បាប់ និងសិទ្ធិពីអង្គភាព ដើម្បីដំឡើង និងអនុញ្ញាតឱ្យ Songket ដំណើរការនៅក្នុងក្រុម។\n\n" +
        "ដោយផ្តល់សិទ្ធិ Admin ដល់ Songket អ្នកទទួលស្គាល់ថា Songket អាចអនុវត្តសកម្មភាពដោយស្វ័យប្រវត្តិ ដែលស្ថិតក្នុងសិទ្ធិដែលបានផ្តល់ នៅពេលប្រព័ន្ធសុវត្ថិភាពរបស់ខ្លួនរកឃើញមាតិកា ឬអាកប្បកិរិយាដែលអាចមានគ្រោះថ្នាក់។\n\n" +
        "Songket មិនធានាថាសកម្មភាពស្វ័យប្រវត្តិគ្រប់យ៉ាងនឹងត្រឹមត្រូវ សមស្រប ឬអាចអនុវត្តបានដោយជោគជ័យឡើយ។",
    },

    {
      heading: "៤. ការរកឃើញការគំរាមកំហែងដោយស្វ័យប្រវត្តិ",
      content:
        "Songket ប្រើបច្ចេកវិទ្យាសុវត្ថិភាពស្វ័យប្រវត្តិ និងអាចពឹងផ្អែកលើ៖\n\n" +
        "• ការវិភាគតាម Heuristic\n" +
        "• ការរកឃើញមេរោគ និង Antivirus\n" +
        "• File Signatures និង Hashes\n" +
        "• ព័ត៌មានអំពីការគំរាមកំហែង\n" +
        "• មូលដ្ឋានទិន្នន័យ Reputation\n" +
        "• ការវិភាគ Link និង Domain\n" +
        "• ប្រព័ន្ធ Artificial Intelligence ឬ Machine Learning\n" +
        "• សេវាសុវត្ថិភាពរបស់ភាគីទីបី\n\n" +
        "បច្ចេកវិទ្យាសុវត្ថិភាពត្រូវបានអភិវឌ្ឍជាបន្តបន្ទាប់។ Songket អាចធ្វើបច្ចុប្បន្នភាព កែប្រែ ជំនួស ឬបញ្ឈប់វិធីសាស្ត្ររកឃើញ និងអ្នកផ្តល់សេវាសុវត្ថិភាព នៅពេលចាំបាច់ ដើម្បីរក្សា ឬកែលម្អសេវាកម្ម។",
    },

    {
      heading: "៥. ដែនកំណត់សុវត្ថិភាព និងការមិនធានា",
      content:
        "គ្មានផលិតផលសុវត្ថិភាពតាមអ៊ីនធឺណិតណាមួយអាចធានាការរកឃើញ ឬការពារការគំរាមកំហែងគ្រប់ប្រភេទបានឡើយ។\n\n" +
        "Songket អាចមិនអាចរកឃើញការគំរាមកំហែងមួយចំនួន រួមមាន Malware ដែលមិនទាន់ស្គាល់ Vulnerability ប្រភេទ Zero-Day Malware ដែលមានភាពស្មុគស្មាញ ឬត្រូវបានកែប្រែ Campaign Phishing ថ្មីៗ ការវាយប្រហារតាម Social Engineering មាតិកាដែលបានអ៊ិនគ្រីប ឬលាក់កូដ និងការគំរាមកំហែងដែលមិនអាចកំណត់បានដោយបច្ចេកវិទ្យាសុវត្ថិភាពដែល Songket មាន។\n\n" +
        "Songket មិនធានាថាឯកសារ តំណ គណនី ឬសារដែលមានគ្រោះថ្នាក់ទាំងអស់នឹងត្រូវបានរកឃើញ ឬទប់ស្កាត់ឡើយ។\n\n" +
        "Songket ក៏អាចបង្កើត False Positive ដែលមាតិកាស្របច្បាប់ត្រូវបានចាត់ទុកថាអាចមានគ្រោះថ្នាក់ ឬ False Negative ដែលមាតិកាមានគ្រោះថ្នាក់មិនត្រូវបានរកឃើញ។\n\n" +
        "អ្នកប្រើប្រាស់ និង Admin គួរប្រើការវិនិច្ឆ័យរបស់ខ្លួន និងអនុវត្តវិធានការសុវត្ថិភាពបន្ថែមតាមភាពសមស្រប។",
    },

    {
      heading: "៦. ឯកសារ តំណ និងសេវាកម្មភាគីទីបី",
      content:
        "Songket អាចដំណើរការឯកសារ តំណ Metadata ឬមាតិកាផ្សេងៗដែលបានផ្ញើ ដើម្បីធ្វើការវិភាគសុវត្ថិភាព។\n\n" +
        "មុខងារសុវត្ថិភាពមួយចំនួនអាចពឹងផ្អែកលើសេវាភាគីទីបី មូលដ្ឋានទិន្នន័យសុវត្ថិភាព API អ្នកផ្តល់សេវា Hosting ឬហេដ្ឋារចនាសម្ព័ន្ធផ្សេងៗ។\n\n" +
        "Songket មិនធានាអំពីភាពអាចប្រើប្រាស់បាន ភាពត្រឹមត្រូវ សុវត្ថិភាព ឬប្រសិទ្ធភាពរបស់សេវាភាគីទីបីឡើយ ហើយមិនទទួលខុសត្រូវចំពោះបញ្ហាដែលបណ្តាលមកពីអ្នកផ្តល់សេវាភាគីទីបី Telegram បញ្ហាបណ្តាញ ឬកាលៈទេសៈដែលស្ថិតក្រៅការគ្រប់គ្រងសមហេតុផលរបស់យើង។\n\n" +
        "នៅពេលអាចអនុវត្តបាន សេវាភាគីទីបីក៏អាចស្ថិតក្រោមលក្ខខណ្ឌ និងគោលការណ៍ផ្ទាល់ខ្លួនរបស់ពួកគេផងដែរ។",
    },

    {
      heading: "៧. ថ្លៃសេវា សមាជិកភាព និងការទូទាត់",
      content:
        "មុខងារ Songket មួយចំនួនអាចតម្រូវឱ្យមានសមាជិកភាពបង់ប្រាក់។\n\n" +
        "• មុខងារ Premium ត្រូវការសមាជិកភាពសកម្មដែលបានទិញតាមវិធីសាស្ត្រទូទាត់ដែល Songket ផ្តល់ជូន។\n" +
        "• ផែនការសមាជិកភាព តម្លៃ ចំនួនស្កែន ចំនួនក្រុម មុខងារ និងរយៈពេលទូទាត់អាចខុសគ្នា។\n" +
        "• ប្រសិនបើបានបើកការបន្តស្វ័យប្រវត្តិ សមាជិកភាពអាចបន្តដោយស្វ័យប្រវត្តិនៅចុងបញ្ចប់នៃវគ្គបង់ប្រាក់ លុះត្រាតែបានបោះបង់មុនថ្ងៃបន្ត។\n" +
        "• អ្នកប្រើប្រាស់មានទំនួលខុសត្រូវក្នុងការគ្រប់គ្រង និងបោះបង់សមាជិកភាពរបស់ខ្លួន នៅពេលអាចអនុវត្តបាន។",
    },

    {
      heading: "៨. ការសងប្រាក់វិញ និងការបោះបង់",
      content:
        "លើកលែងតែ Songket បានបញ្ជាក់ផ្សេងពីនេះ ការទូទាត់សមាជិកភាពជាទូទៅមិនអាចសងប្រាក់វិញបានទេ បន្ទាប់ពីរយៈពេលសេវាកម្មបានចាប់ផ្តើម ដោយអាស្រ័យលើសិទ្ធិចាំបាច់របស់អ្នកប្រើប្រាស់ដែលមានក្រោមច្បាប់កម្ពុជា។\n\n" +
        "អតិថិជនអាចស្នើសុំបោះបង់សមាជិកភាពដែលបន្តជាថ្មីបានគ្រប់ពេល។ លើកលែងតែច្បាប់តម្រូវ ការបោះបង់ជាទូទៅនឹងចូលជាធរមាននៅចុងបញ្ចប់នៃវគ្គបង់ប្រាក់បច្ចុប្បន្ន។\n\n" +
        "ការបោះបង់សមាជិកភាពមិនមានន័យថាអ្នកមានសិទ្ធិសងប្រាក់វិញសម្រាប់រយៈពេលដែលនៅសល់ និងមិនទាន់ប្រើប្រាស់ឡើយ។\n\n" +
        "ការសងប្រាក់វិញអាចមានសម្រាប់ការគិតប្រាក់ស្ទួន កំហុសការទូទាត់ពី Songket បញ្ហាសេវាកម្មជាក់លាក់ ប្រតិបត្តិការដែលគ្មានការអនុញ្ញាត ឬករណីផ្សេងទៀតដែលច្បាប់តម្រូវ។",
    },

    {
      heading: "៩. ការប្រើប្រាស់ដែលអាចទទួលយកបាន",
      content:
        "អ្នកយល់ព្រមប្រើប្រាស់ Songket សម្រាប់គោលបំណងស្របច្បាប់ និងស្របគោលបំណងតែប៉ុណ្ណោះ។\n\n" +
        "អ្នកមិនត្រូវ៖\n\n" +
        "• Reverse Engineer, Decompile ឬ Disassemble Songket។\n" +
        "• ព្យាយាមទាញយក Source Code, Algorithm ដែលជាកម្មសិទ្ធិ ឬ Threat Signature របស់ Songket។\n" +
        "• បង្កើតការផ្ទុកលើសកម្រិត Flood រំខាន ឬវាយប្រហារលើហេដ្ឋារចនាសម្ព័ន្ធ Songket ដោយចេតនា។\n" +
        "• ធ្វើការវាយប្រហារ Denial-of-Service (DDoS) លើ Songket។\n" +
        "• ប្រើប្រាស់ធនធានស្កែនខុសគោលបំណង ឬចេតនាលើសពីដែនកំណត់សេវាកម្មដែលបានកំណត់។\n" +
        "• ប្រើ Songket ដើម្បីបង្កើត កែលម្អ សាកល្បង ឬដាក់ឱ្យប្រើប្រាស់ Malware សម្រាប់គោលបំណងព្យាបាទ។\n" +
        "• ប្រើ Songket ដើម្បីជួយសម្រួលដល់ការក្លែងបន្លំ ការវាយប្រហារតាមអ៊ីនធឺណិត ការចូលប្រើដោយគ្មានការអនុញ្ញាត ឬសកម្មភាពខុសច្បាប់ផ្សេងៗ។\n" +
        "• ព្យាយាមជៀសវាង ឬបំបែកប្រព័ន្ធ Subscription Authentication Rate Limit ឬ Security Controls។",
    },

    {
      heading: "១០. ការផ្អាក និងការបញ្ចប់សេវាកម្ម",
      content:
        "Songket រក្សាសិទ្ធិក្នុងការផ្អាក កំណត់ ឬបញ្ចប់ការចូលប្រើសេវាកម្ម នៅពេលចាំបាច់ រួមមាន៖\n\n" +
        "• អ្នករំលោភលក្ខខណ្ឌទាំងនេះ។\n" +
        "• អ្នកប្រព្រឹត្តអំពើរំខាន ឬក្លែងបន្លំ។\n" +
        "• អ្នកព្យាយាមបំផ្លាញ ឬប្រើប្រាស់ហេដ្ឋារចនាសម្ព័ន្ធ Songket ខុសគោលបំណង។\n" +
        "• ការទូទាត់មានការក្លែងបន្លំ ត្រូវបានបដិសេធ ឬមិនត្រឹមត្រូវ។\n" +
        "• ការប្រើប្រាស់របស់អ្នកបង្កើតហានិភ័យសុវត្ថិភាព ឬប្រតិបត្តិការ។\n" +
        "• ការបន្តផ្តល់សេវាអាចរំលោភច្បាប់ដែលអាចអនុវត្តបាន។\n" +
        "• ការផ្អាកចាំបាច់ដើម្បីការពារ Songket ឬអ្នកប្រើប្រាស់របស់ខ្លួន។\n\n" +
        "នៅពេលអាចធ្វើទៅបាន Songket អាចផ្តល់ការជូនដំណឹង ឬការពន្យល់អំពីការផ្អាក ឬបញ្ចប់សេវាកម្ម។",
    },

    {
      heading: "១១. ភាពអាចប្រើប្រាស់បាននៃសេវាកម្ម",
      content:
        "Songket ត្រូវបានផ្តល់ជូនតាមមូលដ្ឋាន \"តាមដែលមាន\" និង \"តាមស្ថានភាពបច្ចុប្បន្ន\" ក្នុងកម្រិតដែលច្បាប់អនុញ្ញាត។\n\n" +
        "Songket មិនធានាថាសេវាកម្មនឹងអាចប្រើប្រាស់បានជាបន្តបន្ទាប់ ដំណើរការដោយគ្មានកំហុស រកឃើញការគំរាមកំហែងគ្រប់ប្រភេទ ដំណើរការឯកសារ ឬតំណគ្រប់យ៉ាងបានដោយជោគជ័យ ឆបគ្នាជាមួយមុខងារ ឬការអាប់ដេត Telegram គ្រប់ប្រភេទ ឬនៅដដែលជារៀងរហូតឡើយ។\n\n" +
        "ការរំខានបណ្តោះអាសន្នអាចកើតឡើងដោយសារការថែទាំ ការអាប់ដេតកម្មវិធី ហេតុការណ៍សុវត្ថិភាព ការផ្លាស់ប្តូររបស់ Telegram ការផ្អាកសេវាភាគីទីបី បញ្ហាហេដ្ឋារចនាសម្ព័ន្ធ ឬកាលៈទេសៈផ្សេងទៀតដែលស្ថិតក្រៅការគ្រប់គ្រងសមហេតុផលរបស់យើង។",
    },

    {
      heading: "១២. ការកំណត់ទំនួលខុសត្រូវ",
      content:
        "ក្នុងកម្រិតអតិបរមាដែលច្បាប់កម្ពុជាអនុញ្ញាត Songket អ្នកអភិវឌ្ឍ ប្រតិបត្តិករ អង្គភាពពាក់ព័ន្ធ និងអ្នកផ្តល់សេវារបស់ខ្លួន មិនទទួលខុសត្រូវចំពោះការខូចខាតដោយប្រយោល ការខូចខាតដោយចៃដន្យ ការខូចខាតពិសេស ការខូចខាតជាផលវិបាក ឬការខូចខាតជាការដាក់ទណ្ឌកម្ម ដែលកើតចេញពី ឬពាក់ព័ន្ធនឹងការប្រើប្រាស់សេវាកម្មឡើយ។\n\n" +
        "នេះអាចរួមមាន ក្នុងកម្រិតដែលច្បាប់អនុញ្ញាត ការបាត់បង់ទិន្នន័យ ការបាត់បង់អាជីវកម្ម ការខាតបង់ផ្នែកហិរញ្ញវត្ថុ ការខាតបង់ដោយសារ Phishing ឬ Malware ការខាតបង់ដោយសារ False Positive ឬ False Negative ការរំខានក្រុម ការបាត់បង់ការគ្រប់គ្រងគណនី ការរំខានសេវាកម្ម ឬការចូលប្រើដោយគ្មានការអនុញ្ញាតដែលកើតចេញពីកាលៈទេសៈក្រៅការគ្រប់គ្រងសមហេតុផលរបស់ Songket។\n\n" +
        "ក្នុងកម្រិតអតិបរមាដែលច្បាប់អនុញ្ញាត ទំនួលខុសត្រូវសរុបរបស់ Songket មិនត្រូវលើសពីចំនួនប្រាក់សរុបដែលអតិថិជនដែលរងផលប៉ះពាល់បានបង់ទៅ Songket ក្នុងរយៈពេលបី (៣) ខែភ្លាមៗមុនព្រឹត្តិការណ៍ដែលបណ្តាលឱ្យមានការទាមទារនោះឡើយ។\n\n" +
        "គ្មានចំណុចណាមួយក្នុងលក្ខខណ្ឌនេះមានបំណងដក ឬកំណត់ទំនួលខុសត្រូវដែលច្បាប់មិនអនុញ្ញាតឱ្យដក ឬកំណត់ឡើយ។",
    },

    {
      heading: "១៣. ទំនួលខុសត្រូវរបស់អ្នកប្រើប្រាស់",
      content:
        "Songket គឺជាឧបករណ៍ជំនួយផ្នែកសុវត្ថិភាព ហើយមិនគួរត្រូវបានចាត់ទុកថាជាវិធានការសុវត្ថិភាពតែមួយគត់សម្រាប់ក្រុម អង្គការ អាជីវកម្ម ឬបុគ្គលឡើយ។\n\n" +
        "អ្នកប្រើប្រាស់ និង Admin នៅតែមានទំនួលខុសត្រូវក្នុងការ៖\n\n" +
        "• ការពារគណនី Telegram របស់ខ្លួន។\n" +
        "• អនុវត្តវិធីសាស្ត្រសុវត្ថិភាពសមស្រប។\n" +
        "• ពិនិត្យសារនិងមាតិកាដែលគួរឱ្យសង្ស័យ។\n" +
        "• រក្សាទុក Backup នៅពេលសមស្រប។\n" +
        "• គ្រប់គ្រងសិទ្ធិក្រុមដោយមានការទទួលខុសត្រូវ។\n" +
        "• ចាត់វិធានការសមស្របនៅពេល Songket រកឃើញការគំរាមកំហែងដែលអាចកើតមាន។\n\n" +
        "Admin មានទំនួលខុសត្រូវក្នុងការកំណត់ថាតើ Songket សមស្របសម្រាប់ក្រុម ឬអង្គភាពរបស់ខ្លួនឬអត់។",
    },

    {
      heading: "១៤. កម្មសិទ្ធិបញ្ញា",
      content:
        "សិទ្ធិ កម្មសិទ្ធិ និងផលប្រយោជន៍ទាំងអស់នៅក្នុង Songket រួមមាន Software Design Branding Logo ប្រព័ន្ធរកឃើញ Algorithm Interface និងសម្ភារៈពាក់ព័ន្ធ គឺជាកម្មសិទ្ធិរបស់ Songket ឬអ្នកផ្តល់អាជ្ញាប័ណ្ណរបស់ខ្លួន។\n\n" +
        "លើកលែងតែមានការអនុញ្ញាតយ៉ាងច្បាស់ លក្ខខណ្ឌទាំងនេះមិនផ្តល់សិទ្ធិកម្មសិទ្ធិណាមួយដល់អ្នកលើ Songket ឬកម្មសិទ្ធិបញ្ញារបស់ខ្លួនឡើយ។",
    },

    {
      heading: "១៥. ការផ្លាស់ប្តូរសេវាកម្ម និងលក្ខខណ្ឌ",
      content:
        "Songket អាចកែប្រែ កែលម្អ ផ្អាក ឬបញ្ឈប់មុខងាររបស់សេវាកម្មពីពេលមួយទៅពេលមួយ។\n\n" +
        "យើងក៏អាចធ្វើបច្ចុប្បន្នភាពលក្ខខណ្ឌទាំងនេះ នៅពេលចាំបាច់ ដើម្បីឆ្លុះបញ្ចាំងពីការផ្លាស់ប្តូរនៃសេវាកម្ម បច្ចេកវិទ្យា ការអនុវត្តអាជីវកម្ម ឬច្បាប់ដែលអាចអនុវត្តបាន។\n\n" +
        "កំណែដែលបានធ្វើបច្ចុប្បន្នភាពនឹងបង្ហាញកាលបរិច្ឆេទ Last Updated ដែលអាចអនុវត្តបាន។ ការបន្តប្រើប្រាស់ Songket បន្ទាប់ពីកំណែថ្មីចូលជាធរមាន មានន័យថាអ្នកយល់ព្រមទទួលយកលក្ខខណ្ឌដែលបានកែប្រែ តាមដែលច្បាប់អនុញ្ញាត។",
    },

    {
      heading: "១៦. ច្បាប់គ្រប់គ្រង និងការដោះស្រាយវិវាទ",
      content:
        "លក្ខខណ្ឌទាំងនេះត្រូវបានគ្រប់គ្រង និងបកស្រាយស្របតាមច្បាប់នៃព្រះរាជាណាចក្រកម្ពុជា។\n\n" +
        "វិវាទណាមួយដែលកើតចេញពី ឬពាក់ព័ន្ធនឹងលក្ខខណ្ឌទាំងនេះ ឬការប្រើប្រាស់ Songket ត្រូវដោះស្រាយជាមុនតាមរយៈការពិភាក្សាដោយសុចរិតរវាងភាគីទាំងពីរ។\n\n" +
        "ប្រសិនបើវិវាទមិនអាចដោះស្រាយដោយមិត្តភាពបាន វានឹងត្រូវបញ្ជូនទៅតុលាការដែលមានសមត្ថកិច្ចនៅរាជធានីភ្នំពេញ ប្រទេសកម្ពុជា ស្របតាមច្បាប់កម្ពុជាដែលអាចអនុវត្តបាន។",
    },

    {
      heading: "១៧. ការបែងចែកសុពលភាព",
      content:
        "ប្រសិនបើចំណុចណាមួយនៃលក្ខខណ្ឌទាំងនេះត្រូវបានកំណត់ថាមិនមានសុពលភាព ខុសច្បាប់ ឬមិនអាចអនុវត្តបាន ចំណុចនោះនឹងត្រូវបកស្រាយ ឬកែប្រែក្នុងកម្រិតតិចបំផុតដែលចាំបាច់ ដើម្បីឱ្យអាចអនុវត្តបាន ប្រសិនបើច្បាប់អនុញ្ញាត។\n\n" +
        "ចំណុចផ្សេងទៀតដែលនៅសល់នឹងបន្តមានសុពលភាពពេញលេញ។",
    },

    {
      heading: "១៨. កិច្ចព្រមព្រៀងទាំងមូល",
      content:
        "លក្ខខណ្ឌទាំងនេះបង្កើតជាកិច្ចព្រមព្រៀងរវាងអ្នក និង Songket ទាក់ទងនឹងការប្រើប្រាស់សេវាកម្ម ហើយជំនួសកិច្ចព្រមព្រៀង ឬការយល់ព្រមពីមុនទាំងអស់ដែលពាក់ព័ន្ធនឹងប្រធានបទដូចគ្នា លើកលែងតែ Songket បានបញ្ជាក់យ៉ាងច្បាស់ផ្សេងពីនេះ។",
    },

    {
      heading: "១៩. ទំនាក់ទំនង",
      content:
        "ប្រសិនបើអ្នកមានសំណួរ កង្វល់ ឬសំណើពាក់ព័ន្ធនឹងលក្ខខណ្ឌទាំងនេះ ឬសេវាកម្ម Songket សូមទាក់ទងក្រុមការងារ Songket តាមរយៈ team@songket.app។",
    },
  ],

  contactEmail: "សម្រាប់សំណួរ ឬការស្នើសុំណាមួយ សូមទាក់ទងមកយើងតាមរយៈ",
};


export default function PrivacyTerms({ isKm, bodyFont }: PrivacyTermsProps) {
  const t = isKm ? km : en;

  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      setTimeout(() => {
        const el = document.querySelector(hash);
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, []);



return (
  <div
    style={{
      minHeight: "100vh",
      background: "var(--bg)",
      color: "var(--text)",
      fontFamily: bodyFont,
    }}
  >
    <div
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "24px 20px 60px",
      }}
    >
      {/* Back */}
      <a
        href="/"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          color: "var(--gold)",
          fontSize: 13,
          fontWeight: 600,
          textDecoration: "none",
          marginBottom: 32,
        }}
      >
        <ArrowLeft size={16} /> {t.back}
      </a>

      {/* ================= PRIVACY POLICY ================= */}
      <section id="privacy" style={{ marginBottom: 48 }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: "var(--gold)",
            marginBottom: 12,
          }}
        >
          {t.privacyTitle}
        </h1>

        <p
          style={{
            fontSize: 14,
            color: "var(--text-secondary)",
            lineHeight: 1.8,
            marginBottom: 24,
          }}
        >
          {t.privacyIntro}
        </p>

        {t.sections.map((s, i) => (
          <div key={i} style={{ marginBottom: 20 }}>
            <h2
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "var(--text)",
                marginBottom: 8,
              }}
            >
              {s.heading}
            </h2>

            <p
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                lineHeight: 1.8,
                whiteSpace: "pre-line",
              }}
            >
              {s.content}
            </p>
          </div>
        ))}
      </section>

      <div
        style={{
          height: 1,
          background: "var(--border)",
          marginBottom: 48,
        }}
      />

      {/* ================= REFUND & CANCELLATION ================= */}
      <section id="refund" style={{ marginBottom: 48 }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: "var(--gold)",
            marginBottom: 12,
          }}
        >
          {t.refundTitle}
        </h1>

        <p
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            marginBottom: 20,
          }}
        >
          {t.refundEffectiveDate}
        </p>

        <p
          style={{
            fontSize: 14,
            color: "var(--text-secondary)",
            lineHeight: 1.8,
            marginBottom: 24,
          }}
        >
          {t.refundIntro}
        </p>

        {t.refundSections.map((s, i) => (
          <div key={i} style={{ marginBottom: 20 }}>
            <h2
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "var(--text)",
                marginBottom: 8,
              }}
            >
              {s.heading}
            </h2>

            <p
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                lineHeight: 1.8,
                whiteSpace: "pre-line",
              }}
            >
              {s.content}
            </p>
          </div>
        ))}
      </section>

      <div
        style={{
          height: 1,
          background: "var(--border)",
          marginBottom: 48,
        }}
      />

      {/* ================= SLA ================= */}
      <section id="sla" style={{ marginBottom: 48 }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: "var(--gold)",
            marginBottom: 12,
          }}
        >
          {t.slaTitle}
        </h1>

        <p
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            marginBottom: 20,
          }}
        >
          {t.slaEffectiveDate}
        </p>

        <p
          style={{
            fontSize: 14,
            color: "var(--text-secondary)",
            lineHeight: 1.8,
            marginBottom: 24,
          }}
        >
          {t.slaIntro}
        </p>

        {t.slaSections.map((s, i) => (
          <div key={i} style={{ marginBottom: 20 }}>
            <h2
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "var(--text)",
                marginBottom: 8,
              }}
            >
              {s.heading}
            </h2>

            <p
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                lineHeight: 1.8,
                whiteSpace: "pre-line",
              }}
            >
              {s.content}
            </p>
          </div>
        ))}
      </section>
      {/* ================= TERMS & CONDITIONS ================= */}
      <section id="terms" style={{ marginBottom: 48 }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: "var(--gold)",
            marginBottom: 12,
          }}
        >
          {t.termsTitle}
        </h1>

        <p
          style={{
            fontSize: 14,
            color: "var(--text-secondary)",
            lineHeight: 1.8,
            marginBottom: 24,
          }}
        >
          {t.termsIntro}
        </p>

        {t.terms.map((s, i) => (
          <div key={i} style={{ marginBottom: 20 }}>
            <h2
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "var(--text)",
                marginBottom: 8,
              }}
            >
              {s.heading}
            </h2>

            <p
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                lineHeight: 1.8,
                whiteSpace: "pre-line",
              }}
            >
              {s.content}
            </p>
          </div>
        ))}
      </section>

      <div
        style={{
          height: 1,
          background: "var(--border)",
          marginBottom: 48,
        }}
      />


      {/* ================= CONTACT ================= */}
      <div
        style={{
          marginTop: 40,
          padding: "16px 20px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
          }}
        >
          {t.contactEmail}{" "}
          <a
            href="mailto:team@songket.app"
            style={{
              color: "var(--gold)",
              textDecoration: "none",
            }}
          >
            team@songket.app
          </a>
        </p>
      </div>
    </div>
  </div>
);



}
