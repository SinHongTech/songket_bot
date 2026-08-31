import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";

interface PrivacyTermsProps {
  isKm: boolean;
  bodyFont: string;
}

const en = {
  back: "Back to Home",
  privacyTitle: "Privacy Policy",
  privacyIntro: "Songket (\"we\", \"our\", or \"us\") operates the Songket bot and mini-app. This Privacy Policy explains how we collect, use, and protect your information when you use our service.",
  sections: [
    {
      heading: "1. Information We Collect",
      content: "When you use Songket, we may collect:\n• Telegram user ID and username\n• Group IDs and names where the bot is installed\n• Message content scanned for threats (links, files)\n• Scan results and threat detection logs\n• Usage data and analytics",
    },
    {
      heading: "2. How We Use Your Information",
      content: "We use the collected information to:\n• Detect and block malicious content in real time\n• Provide scan history and threat reports\n• Improve our threat detection algorithms\n• Send notifications about detected threats\n• Provide customer support",
    },
    {
      heading: "3. Data Storage & Security",
      content: "• All data is stored securely using industry-standard encryption\n• We do not sell or share your personal data with third parties\n• Scan data is retained according to your subscription plan\n• We implement appropriate security measures to protect against unauthorized access",
    },
    {
      heading: "4. Data Sharing",
      content: "We do not sell, trade, or otherwise transfer your personally identifiable information to outside parties. This does not include trusted third parties who assist us in operating our service, so long as those parties agree to keep this information confidential.",
    },
    {
      heading: "5. Your Rights",
      content: "You have the right to:\n• Access your personal data\n• Request deletion of your data\n• Opt out of non-essential data collection\n• Request a copy of your data",
    },
    {
      heading: "6. Changes to This Policy",
      content: "We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page with an updated effective date.",
    },
    {
      heading: "7. Contact Us",
      content: "If you have any questions about this Privacy Policy, please contact us at team@songket.app",
    },
  ],
  termsTitle: "Terms & Conditions",
  termsIntro: "By using the Songket bot and mini-app, you agree to the following terms and conditions.",
  terms: [
    {
      heading: "1. Acceptance of Terms",
      content: "By accessing or using Songket, you agree to be bound by these Terms & Conditions. If you do not agree, please do not use our service.",
    },
    {
      heading: "2. Service Description",
      content: "Songket provides automated threat detection for Telegram groups and channels. Our bot scans messages, links, and files for potential security threats including malware, phishing, and suspicious content.",
    },
    {
      heading: "3. User Responsibilities",
      content: "• You must have proper authorization to add the bot to a group\n• You are responsible for the groups you monitor\n• You agree not to misuse the service for any unlawful purpose\n• You agree to keep your account credentials secure",
    },
    {
      heading: "4. Subscription & Payment",
      content: "• Free tier is available with limited features\n• Paid plans offer additional groups, scans, and features\n• Payments are processed securely through our payment partners\n• Refund policies are outlined in your subscription agreement",
    },
    {
      heading: "5. Limitation of Liability",
      content: "Songket is provided \"as is\" without warranties of any kind. We are not liable for any damages arising from the use of our service. While we strive to detect all threats, we cannot guarantee 100% detection rate.",
    },
    {
      heading: "6. Intellectual Property",
      content: "All content, trademarks, and intellectual property related to Songket are owned by us. You may not reproduce, distribute, or create derivative works without our written permission.",
    },
    {
      heading: "7. Termination",
      content: "We reserve the right to terminate or suspend your access to our service at any time, without prior notice, for conduct that we believe violates these Terms or is harmful to other users or the service.",
    },
    {
      heading: "8. Governing Law",
      content: "These Terms shall be governed by and construed in accordance with the laws of the Kingdom of Cambodia.",
    },
  ],
  contactEmail: "For any questions, contact us at",
};

const km = {
  back: "ត្រលប់ទៅទំព័រដើម",
  privacyTitle: "គោលនយោបាយឯកជន",
  privacyIntro: "Songket (\"យើង\" ឬ \"ក្រុមការងារ\") ដំណើរការ bot Songket និង mini-app។ គោលនយោបាយឯកជននេះពន្យល់ពីរបៀបដែលយើងប្រមូល ប្រើប្រាស់ និងការពារព័ត៌មានរបស់អ្នកនៅពេលអ្នកប្រើប្រាស់សេវាកម្មរបស់យើង។",
  sections: [
    {
      heading: "១. ព័ត៌មានដែលយើងប្រមូល",
      content: "នៅពេលអ្នកប្រើប្រាស់ Songket យើងអាចប្រមូល៖\n• ID អ្នកប្រើប្រាស់ Telegram និងឈ្មោះអ្នកប្រើប្រាស់\n• ID ក្រុម និងឈ្មោះក្រុមដែល bot ត្រូវបានដំឡើង\n• មាតិកាសារដែលត្រូវបានស្កែនសម្រាប់គំរាមកំហែង (តំណ ឯកសារ)\n• លទ្ធផលស្កែន និងកំណត់ត្រាការរកឃើញគំរាមកំហែង\n• ទិន្នន័យការប្រើប្រាស់ និងការវិភាគ",
    },
    {
      heading: "២. របៀបដែលយើងប្រើប្រាស់ព័ត៌មានរបស់អ្នក",
      content: "យើងប្រើប្រាស់ព័ត៌មានដែលប្រមូលបានដើម្បី៖\n• រកឃើញ និងរារាំងមាតិកាគ្រោះថ្នាក់ជាក់ស្តែង\n• ផ្តល់ប្រវត្តិស្កែន និងរបាយការណ៍គំរាមកំហែង\n• កែលម្អក្បួនដោះស្រាយគំរាមកំហែងរបស់យើង\n• ផ្ញើការជូនដំណឹងអំពីគំរាមកំហែងដែលបានរកឃើញ\n• ផ្តល់ការគាំទ្រអតិថិជន",
    },
    {
      heading: "៣. ការរក្សាទុក និងសុវត្ថិភាពទិន្នន័យ",
      content: "• ទិន្នន័យទាំងអស់ត្រូវបានរក្សាទុកដោយសុវត្ថិភាពដោយប្រើការអ៊ិនគ្រីបតាមស្តង់ដារឧស្សាហកម្ម\n• យើងមិនលក់ ឬចែករំលែកទិន្នន័យផ្ទាល់ខ្លួនរបស់អ្នកជាមួយភាគីទីបីឡើយ\n• ទិន្នន័យស្កែនត្រូវបានរក្សាទុកតាមផែនការសមាជិកភាពរបស់អ្នក\n• យើងអនុវត្តវិធានសុវត្ថិភាពសមស្របដើម្បីការពារការចូលដោយគ្មានការអនុញ្ញាត",
    },
    {
      heading: "៤. ការចែករំលែកទិន្នន័យ",
      content: "យើងមិនលក់ ជួញដូរ ឬផ្ទេរព័ត៌មានសម្គាល់ផ្ទាល់ខ្លួនរបស់អ្នកទៅកាន់ភាគីខាងក្រៅឡើយ។ នេះមិនរាប់បញ្ចូលភាគីទីបីដែលអាចជឿទុកចិត្តបានដែលជួយយើងក្នុងការដំណើរការសេវាកម្មរបស់យើងឡើយ។",
    },
    {
      heading: "៥. សិទ្ធិរបស់អ្នក",
      content: "អ្នកមានសិទ្ធិ៖\n• ចូលប្រើទិន្នន័យផ្ទាល់ខ្លួនរបស់អ្នក\n• ស្នើសុំលុបទិន្នន័យរបស់អ្នក\n• មិនចូលរួមក្នុងការប្រមូលទិន្នន័យដែលមិនចាំបាច់\n• ស្នើសុំច្បាប់នៃទិន្នន័យរបស់អ្នក",
    },
    {
      heading: "៦. ការផ្លាស់ប្តូរគោលនយោបាយនេះ",
      content: "យើងអាចធ្វើបច្ចុប្បន្នភាពគោលនយោបាយឯកជននេះពីមួយពេលទៅមួយពេល។ យើងនឹងជូនដំណឹងអ្នកអំពីការផ្លាស់ប្តូរណាមួយដោយបង្ហោះគោលនយោបាយថ្មីនៅលើទំព័រនេះ។",
    },
    {
      heading: "៧. ទំនាក់ទំនងយើង",
      content: "ប្រសិនបើអ្នកមានសំណួរណាមួយអំពីគោលនយោបាយឯកជននេះ សូមទំនាក់ទំនងយើងនៅ team@songket.app",
    },
  ],
  termsTitle: "លក្ខខណ្ឌនៃការប្រើប្រាស់",
  termsIntro: "ដោយប្រើប្រាស់ bot Songket និង mini-app អ្នកឯកភាពទៅនឹងលក្ខខណ្ឌ និងเงื่อนไขដូចខាងក្រោម។",
  terms: [
    {
      heading: "១. ការឯកភាពនៃលក្ខខណ្ឌ",
      content: "ដោយចូលប្រើ ឬប្រើប្រាស់ Songket អ្នកឯកភាពទទួលយកលក្ខខណ្ឌនៃការប្រើប្រាស់នេះ។ ប្រសិនបើអ្នកមិនឯកភាព សូមកុំប្រើប្រាស់សេវាកម្មរបស់យើង។",
    },
    {
      heading: "២. ការពិពណ៌នាសេវាកម្ម",
      content: "Songket ផ្តល់សេវាការរកឃើញគំរាមកំហែងស្វ័យប្រវត្តិសម្រាប់ក្រុម និងឆានែល Telegram។ bot របស់យើងស្កែនសារ តំណ និងឯកសារសម្រាប់គំរាមកំហែងសុវត្ថិភាពដែលអាចកើតមាន។",
    },
    {
      heading: "៣. ទំនួលខុសត្រូវរបស់អ្នកប្រើប្រាស់",
      content: "• អ្នកត្រូវមានការអនុញ្ញាតសមស្របដើម្បីបន្ថែម bot ទៅក្រុម\n• អ្នកទទួលខុសត្រូវចំពោះក្រុមដែលអ្នកត្រួតពិនិត្យ\n• អ្នកឯកភាពមិនប្រើប្រាស់សេវាកម្មសម្រាប់គោលបំណងខុសច្បាប់\n• អ្នកឯកភាពរក្សាទុកព័ត៌មានសម្គាល់គណនីរបស់អ្នកដោយសុវត្ថិភាព",
    },
    {
      heading: "៤. ការជាវសមាជិកភាព និងការបង់ប្រាក់",
      content: "• កម្រិតឥតគិតថ្លៃមានជាមួយលក្ខណៈពិសេសកំណត់\n• ផែនការបង់ប្រាក់ផ្តល់ក្រុម ស្កែន និងលក្ខណៈពិសេសបន្ថែម\n• ការបង់ប្រាក់ត្រូវបានដំណើរការដោយសុវត្ថិភាព\n• គោលនយោបាយសងប្រាក់វិញត្រូវបានពន្យល់ក្នុងកិច្ចព្រមព្រៀងសមាជិកភាពរបស់អ្នក",
    },
    {
      heading: "៥. កំណត់ទំនួលខុសត្រូវ",
      content: "Songket ត្រូវបានផ្តល់ \"ដូចដែលវាមាន\" ដោយគ្មានការធានាណាមួយឡើយ។ យើងមិនទទួលខុសត្រូវចំពោះការខូចខាតណាមួយដែលកើតចេញពីការប្រើប្រាស់សេវាកម្មរបស់យើងឡើយ។",
    },
    {
      heading: "៦. សិទ្ធិកម្មវិធី",
      content: "មាតិកា សម្គាល់ពាណិជ្ជកម្ម និងសិទ្ធិកម្មវិធីទាក់ទងនឹង Songket ជាកម្មសិទ្ធិរបស់យើង។ អ្នកមិនអាចចម្លង ចែករំលែក ឬបង្កើតការងារដែលចេញមកឡើយ។",
    },
    {
      heading: "៧. ការបញ្ចប់",
      content: "យើងរក្សាសិទ្ធិក្នុងការបញ្ចប់ ឬផ្អាកការចូលប្រើប្រាស់សេវាកម្មរបស់អ្នកនៅពេលណាមួយ។",
    },
    {
      heading: "៨. ច្បាប់គ្រប់គ្រង",
      content: "លក្ខខណ្ឌនេះត្រូវបានគ្រប់គ្រងដោយច្បាប់នៃព្រះរាជាណាចក្រកម្ពុជា។",
    },
  ],
  contactEmail: "សម្រាប់សំណួរណាមួយ សូមទំនាក់ទំនងយើងនៅ",
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
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", fontFamily: bodyFont }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 20px 60px" }}>
        <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--gold)", fontSize: 13, fontWeight: 600, textDecoration: "none", marginBottom: 32 }}>
          <ArrowLeft size={16} /> {t.back}
        </a>

        {/* Privacy Policy */}
        <section id="privacy" style={{ marginBottom: 48 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--gold)", marginBottom: 12 }}>{t.privacyTitle}</h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.8, marginBottom: 24 }}>{t.privacyIntro}</p>
          {t.sections.map((s, i) => (
            <div key={i} style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>{s.heading}</h2>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.8, whiteSpace: "pre-line" }}>{s.content}</p>
            </div>
          ))}
        </section>

        <div style={{ height: 1, background: "var(--border)", marginBottom: 48 }} />

        {/* Terms & Conditions */}
        <section id="terms">
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--gold)", marginBottom: 12 }}>{t.termsTitle}</h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.8, marginBottom: 24 }}>{t.termsIntro}</p>
          {t.terms.map((s, i) => (
            <div key={i} style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>{s.heading}</h2>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.8, whiteSpace: "pre-line" }}>{s.content}</p>
            </div>
          ))}
        </section>

        <div style={{ marginTop: 40, padding: "16px 20px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, textAlign: "center" }}>
          <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>{t.contactEmail} <a href="mailto:team@songket.app" style={{ color: "var(--gold)", textDecoration: "none" }}>team@songket.app</a></p>
        </div>
      </div>
    </div>
  );
}
