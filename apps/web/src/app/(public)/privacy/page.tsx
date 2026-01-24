"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Minus, Shield, Lock, Eye, FileText, Globe, Cookie, Database, Users, Scale, Mail, CalendarCheck } from "lucide-react";

const privacySections = [
  {
    id: "information-collect",
    icon: Database,
    title: "1. Information We Collect",
    content: `We collect information that you voluntarily provide when using StewardTrack, including:

**Information You Provide:**
• **Account Information:** Name, email address, password, and phone number when you register for an account.
• **Organization Information:** Church or organization name, address, contact details, and administrative settings.
• **Member Data:** Information about church members that your organization enters into the system, including names, contact information, family relationships, and membership details.
• **Financial Information:** Donation records, contribution history, and financial reports that your organization manages through the Service.
• **Payment Transaction Data:** For online donations and event registration payments, we collect transaction records including payment amount, date, payment method type (e.g., e-wallet, card, bank transfer), and transaction status. **Important:** We do NOT store donor/registrant payment credentials such as credit card numbers, CVV codes, or e-wallet PINs. All sensitive payment data from payers is processed and stored securely by our payment gateway provider, Xendit.
• **Organization Disbursement Information:** For Organizations that receive payments through our platform, we collect and store bank account details necessary for fund disbursement. This sensitive financial information is encrypted using industry-standard encryption methods and stored with strict access controls. This data is not accessible in plain text, even by our development team, and is used solely for the purpose of transferring collected funds to the Organization.
• **Event Registration Data:** When individuals register for events through StewardTrack's public registration pages, we collect personal information on behalf of the hosting Organization, including name, email address, phone number, and any custom fields configured by the Organization. This data is collected and processed by StewardTrack as a data processor, with the Organization acting as the data controller.
• **Communication Data:** Messages, notes, and communications sent through the Service.

**Information Collected Automatically:**
• **Device Information:** Browser type, operating system, device type, and unique device identifiers.
• **Usage Data:** Pages visited, features used, time spent on the Service, and interaction patterns.
• **Log Data:** IP address, access times, and referring URLs.
• **Cookies:** Session cookies for authentication and preferences.`
  },
  {
    id: "legal-basis",
    icon: Scale,
    title: "2. Legal Basis for Processing (GDPR)",
    content: `For users in the European Economic Area (EEA), United Kingdom, and Switzerland, we process your personal data based on the following legal grounds:

• **Contract Performance:** Processing necessary to provide the Service you have requested and fulfill our contractual obligations.
• **Legitimate Interests:** Processing for our legitimate business interests, such as improving our Service, fraud prevention, and security, where these interests are not overridden by your rights.
• **Consent:** Where you have given explicit consent for specific processing activities, such as marketing communications.
• **Legal Obligation:** Processing necessary to comply with applicable laws and regulations.`
  },
  {
    id: "how-we-use",
    icon: Eye,
    title: "3. How We Use Your Information",
    content: `We use the information we collect to:

• Provide, maintain, and improve the StewardTrack Service.
• Process transactions and send related information.
• Send administrative messages, updates, and security alerts.
• Respond to your comments, questions, and support requests.
• Monitor and analyze usage patterns to enhance user experience.
• Detect, prevent, and address technical issues and security threats.
• Comply with legal obligations and enforce our terms of service.
• Personalize your experience and provide tailored content.
• Send promotional communications (with your consent where required).`
  },
  {
    id: "data-sharing",
    icon: Users,
    title: "4. How We Share Your Information",
    content: `We do not sell, trade, or rent your personal information to third parties. We may share information in the following circumstances:

• **Service Providers:** With third-party vendors who perform services on our behalf (e.g., hosting, payment processing, email delivery), subject to confidentiality agreements and data processing agreements.
• **Payment Gateway (Xendit):** When you make a payment (donation or event registration), your payment information is transmitted directly to Xendit for processing. We share only the necessary transaction details with Xendit to complete the payment. Xendit processes payments in accordance with their Privacy Policy (https://www.xendit.co/en-ph/privacy-policy/) and PCI-DSS compliance requirements.
• **Legal Requirements:** When required by law, court order, or governmental authority.
• **Business Transfers:** In connection with a merger, acquisition, or sale of assets, with appropriate notice to affected users.
• **With Your Consent:** When you have explicitly authorized the disclosure.
• **Aggregated Data:** We may share aggregated, anonymized data that cannot identify you for research or marketing purposes.`
  },
  {
    id: "multi-tenant",
    icon: Shield,
    title: "5. Multi-Tenant Data Isolation",
    content: `StewardTrack operates as a multi-tenant platform, meaning multiple organizations share the same infrastructure while maintaining complete data isolation. Each organization's data is:

• Logically separated using row-level security policies.
• Accessible only to authorized users within that organization.
• Protected by role-based access controls (RBAC).
• Never shared with or visible to other organizations.
• Subject to tenant-specific encryption keys where applicable.`
  },
  {
    id: "registrant-privacy",
    icon: CalendarCheck,
    title: "6. Event Registrant Privacy",
    content: `This section applies specifically to individuals who register for events through StewardTrack's public registration pages (referred to as "Registrants").

**6.1 Data Controller and Processor Relationship**
• **Organization as Data Controller:** The church or organization hosting the event ("Organization") is the data controller responsible for determining the purposes and means of processing your personal data.
• **StewardTrack as Data Processor:** StewardTrack processes your personal data on behalf of the Organization in accordance with their instructions and this Privacy Policy.

**6.2 Information Collected During Registration**
When you register for an event, the following information may be collected:
• **Required Information:** Full name, email address, and phone number.
• **Custom Fields:** Additional information as configured by the Organization (e.g., address, emergency contact, dietary requirements, ministry preferences).
• **Payment Information:** If the event requires payment, transaction details are processed as described in this policy. Sensitive payment credentials are not stored by StewardTrack.

**6.3 How Your Registration Data is Used**
Your personal information is used to:
• Process and confirm your event registration.
• Communicate event details, updates, and reminders.
• Manage event attendance and capacity.
• Generate attendance reports for the Organization.
• Process payment transactions (if applicable).
• Contact you regarding the event or related activities.

**6.4 Data Sharing**
• Your registration data is shared only with the Organization hosting the event.
• Your data is not sold, rented, or shared with unaffiliated third parties for marketing purposes.
• Payment data is shared with our payment processor (Xendit) solely to process transactions.

**6.5 Data Retention**
• Registration data is retained by the Organization through StewardTrack for as long as necessary to fulfill the event purposes and any subsequent record-keeping requirements.
• Organizations may retain your data for future event communications unless you opt out.

**6.6 Your Rights as a Registrant**
You have the right to:
• **Access:** Request a copy of the personal data held about you.
• **Correction:** Request correction of inaccurate or incomplete data.
• **Deletion:** Request deletion of your personal data, subject to any legal retention requirements.
• **Opt-Out:** Unsubscribe from future communications from the Organization.

To exercise these rights, please contact the Organization directly. If you are unable to reach the Organization, you may contact StewardTrack at privacy@cortanatechsolutions.com for assistance.

**6.7 Consent**
By submitting your registration, you:
• Consent to the collection and processing of your personal information as described in this policy.
• Acknowledge that the Organization is the data controller for your registration data.
• Agree to the Terms of Service and this Privacy Policy.`
  },
  {
    id: "cookies",
    icon: Cookie,
    title: "7. Cookies and Tracking Technologies",
    content: `We use cookies and similar tracking technologies to enhance your experience, analyze usage, and provide personalized content.

**Types of Cookies We Use:**

**Essential Cookies (Required)**
These cookies are necessary for the Service to function and cannot be disabled. They include authentication tokens, session management, and security features.
• Session cookies for login state
• CSRF protection tokens
• Load balancing cookies

**Functional Cookies**
These cookies remember your preferences and settings to provide enhanced functionality.
• Language and locale preferences
• Theme settings (light/dark mode)
• Dashboard layout preferences

**Analytics Cookies**
These cookies help us understand how users interact with the Service to improve performance.
• Page view tracking
• Feature usage analytics
• Performance monitoring

**Third-Party Cookies**
We may use third-party services that set their own cookies for analytics and functionality:
• Supabase: Authentication and session management
• Payment Processors: Secure payment processing and fraud detection
• Analytics Providers: Usage analytics and performance monitoring

**Managing Cookie Preferences**
You can control cookies through your browser settings. Most browsers allow you to view and delete existing cookies, block all cookies or specific types, set preferences for specific websites, and receive notifications when cookies are set.

**Note:** Blocking essential cookies may prevent you from using certain features of the Service or logging in altogether.

**Do Not Track Signals**
Some browsers offer a "Do Not Track" (DNT) feature. While there is no industry standard for DNT compliance, we respect browser privacy settings where technically feasible.`
  },
  {
    id: "data-security",
    icon: Lock,
    title: "8. Data Security",
    content: `We implement industry-standard security measures to protect your information, including:

• Encryption of data in transit using TLS 1.3.
• Encryption of sensitive data at rest using AES-256.
• **Enhanced protection for financial data:** Organization bank account details for disbursement are encrypted with additional security layers. This data is not accessible in plain text, even by authorized personnel or developers.
• Secure authentication mechanisms including multi-factor authentication.
• Regular security assessments and penetration testing.
• Access controls limiting employee access to personal data.
• Regular security training for all staff with data access.
• Incident response procedures and breach notification protocols.
• **Payment data isolation:** We do not store donor or registrant payment credentials. All payment processing is handled by our PCI-DSS compliant payment gateway, Xendit.

While we strive to protect your information, no method of transmission over the Internet or electronic storage is 100% secure. We cannot guarantee absolute security.`
  },
  {
    id: "data-retention",
    icon: Database,
    title: "9. Data Retention",
    content: `We retain your information for as long as your account is active or as needed to provide you with the Service. Specific retention periods include:

• **Account Data:** Retained while account is active plus 30 days after deletion request.
• **Transaction Records:** Retained for 7 years for tax and legal compliance.
• **Usage Logs:** Retained for 90 days for security and debugging purposes.
• **Backup Data:** Retained for 30 days in encrypted backup systems.

Upon termination of your account, we will delete or anonymize your personal data within a reasonable timeframe, unless retention is required by law.`
  },
  {
    id: "gdpr-rights",
    icon: Globe,
    title: "10. Your Rights Under GDPR (EEA Users)",
    content: `If you are located in the European Economic Area (EEA), United Kingdom, or Switzerland, you have the following rights under the General Data Protection Regulation (GDPR):

• **Right of Access:** Request a copy of all personal data we hold about you.
• **Right to Rectification:** Request correction of inaccurate or incomplete data.
• **Right to Erasure ("Right to be Forgotten"):** Request deletion of your personal data, subject to legal retention requirements.
• **Right to Restriction:** Request that we limit how we use your data.
• **Right to Data Portability:** Receive your data in a structured, machine-readable format.
• **Right to Object:** Object to processing based on legitimate interests or for direct marketing.
• **Right to Withdraw Consent:** Withdraw consent at any time where processing is based on consent.
• **Right to Lodge a Complaint:** File a complaint with your local data protection authority.

To exercise these rights, please contact us at privacy@cortanatechsolutions.com. We will respond to your request within 30 days.

**Data Protection Officer**
For GDPR-related inquiries, you may contact our Data Protection Officer at dpo@cortanatechsolutions.com.`
  },
  {
    id: "ccpa-rights",
    icon: Scale,
    title: "11. Your Rights Under CCPA (California Residents)",
    content: `If you are a California resident, you have the following rights under the California Consumer Privacy Act (CCPA) and California Privacy Rights Act (CPRA):

• **Right to Know:** Request disclosure of the categories and specific pieces of personal information we have collected about you.
• **Right to Delete:** Request deletion of your personal information, subject to certain exceptions.
• **Right to Correct:** Request correction of inaccurate personal information.
• **Right to Opt-Out of Sale:** We do not sell your personal information. However, you have the right to opt-out of any future sales.
• **Right to Limit Use of Sensitive Personal Information:** Request that we limit how we use sensitive personal information.
• **Right to Non-Discrimination:** You will not receive discriminatory treatment for exercising your privacy rights.

**Categories of Information Collected**
In the past 12 months, we have collected the following categories of personal information:
• Identifiers (name, email, phone number)
• Account credentials
• Commercial information (subscription history)
• Internet activity (usage data, log data)
• Geolocation data (IP-based location)
• Professional information (organization details)

**How to Exercise Your Rights**
To submit a request, please contact us at privacy@cortanatechsolutions.com or call us at our toll-free number. We will verify your identity before processing your request. You may designate an authorized agent to submit requests on your behalf.

**Shine the Light (California Civil Code § 1798.83)**
California residents may request information about our disclosure of personal information to third parties for direct marketing purposes. We do not share personal information with third parties for their direct marketing purposes.`
  },
  {
    id: "dpa",
    icon: FileText,
    title: "12. Data Processing Agreement (DPA)",
    content: `For organizations that require a Data Processing Agreement to comply with GDPR or other data protection regulations, we offer a comprehensive DPA that covers:

• **Processing Details:** Subject matter, duration, nature, and purpose of processing.
• **Data Categories:** Types of personal data and categories of data subjects.
• **Controller/Processor Obligations:** Respective responsibilities under applicable law.
• **Sub-processors:** List of approved sub-processors and change notification procedures.
• **Security Measures:** Technical and organizational measures to protect personal data.
• **Data Subject Rights:** Assistance with data subject requests.
• **Breach Notification:** Timelines and procedures for data breach notification.
• **Audit Rights:** Customer audit and inspection rights.
• **Data Return/Deletion:** Procedures at termination of services.
• **International Transfers:** Standard Contractual Clauses (SCCs) for transfers outside EEA.

To request a Data Processing Agreement, please contact us at legal@cortanatechsolutions.com.

**Sub-Processors**
We use the following categories of sub-processors to provide our Service:

| Category | Purpose | Location |
|----------|---------|----------|
| Cloud Infrastructure | Hosting and data storage | USA/EU |
| Database Provider | Data management and authentication | USA/EU |
| Payment Processor | Payment processing | USA/EU |
| Email Provider | Transactional emails | USA/EU |`
  },
  {
    id: "third-party",
    icon: Globe,
    title: "13. Third-Party Services",
    content: `StewardTrack integrates with third-party services to provide functionality. These services have their own privacy policies, and we encourage you to review them:

• **Supabase:** Authentication and database services
• **Xendit (Payment Gateway):** Xendit is our payment gateway provider for processing online donations and event registration payments. When you make a payment through StewardTrack, your payment information is transmitted directly to Xendit's secure servers. We do not store sensitive payment credentials (credit card numbers, CVV, bank account details). Xendit is PCI-DSS compliant and maintains strict security standards. Please review Xendit's Privacy Policy (https://www.xendit.co/en-ph/privacy-policy/) and Terms and Conditions (https://www.xendit.co/en-ph/terms-and-conditions/) for details on how they handle your payment data.
• **Email Services:** For transactional and notification emails
• **Analytics Services:** For usage analytics and performance monitoring`
  },
  {
    id: "children",
    icon: Users,
    title: "14. Children's Privacy",
    content: `StewardTrack is not intended for use by individuals under the age of 16 (or 13 in the United States). We do not knowingly collect personal information from children. If you become aware that a child has provided us with personal information, please contact us so we can take appropriate action to delete the information.`
  },
  {
    id: "international",
    icon: Globe,
    title: "15. International Data Transfers",
    content: `Your information may be transferred to and processed in countries other than your country of residence. When we transfer data internationally, we ensure appropriate safeguards are in place:

• **Standard Contractual Clauses:** EU-approved contractual terms for data transfers.
• **Adequacy Decisions:** Transfers to countries with adequate data protection.
• **Data Processing Agreements:** Binding commitments with all data processors.
• **Encryption:** Data encrypted in transit and at rest.`
  },
  {
    id: "changes",
    icon: FileText,
    title: "16. Changes to This Privacy Policy",
    content: `We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page, updating the "Last updated" date, and where required by law, sending you an email notification. Your continued use of the Service after such changes constitutes acceptance of the updated policy.`
  },
  {
    id: "contact",
    icon: Mail,
    title: "17. Contact Us",
    content: `If you have questions or concerns about this Privacy Policy, please contact us at:

**Cortanatech Solutions, Inc.**

• General Privacy Inquiries: privacy@cortanatechsolutions.com
• Data Protection Officer (GDPR): dpo@cortanatechsolutions.com
• Legal/DPA Requests: legal@cortanatechsolutions.com
• Website: stewardtrack.com`
  }
];

// Helper function to parse markdown-style bold text
function formatContent(content: string) {
  // Split content into lines
  const lines = content.split('\n');

  return lines.map((line, lineIndex) => {
    // Check if line is a table row
    if (line.startsWith('|') && line.endsWith('|')) {
      return null; // Skip table rows, we'll handle tables separately
    }

    // Handle bullet points - remove the bullet and process the rest
    const isBullet = line.startsWith('• ');
    const lineContent = isBullet ? line.slice(2) : line;

    // Parse bold text (**text**)
    const parts = lineContent.split(/(\*\*[^*]+\*\*)/g);

    const formattedParts = parts.map((part, partIndex) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        // Bold text
        const boldText = part.slice(2, -2);
        return <strong key={partIndex} className="font-semibold text-gray-800">{boldText}</strong>;
      }
      return part;
    });

    // Check if this is a bullet point
    if (isBullet) {
      return (
        <div key={lineIndex} className="flex gap-2 mt-2">
          <span className="text-[#179a65] flex-shrink-0">•</span>
          <span className="flex-1">{formattedParts}</span>
        </div>
      );
    }

    // Empty line creates spacing
    if (line.trim() === '') {
      return <div key={lineIndex} className="h-4" />;
    }

    // Regular line
    return <div key={lineIndex} className="mt-2 first:mt-0">{formattedParts}</div>;
  });
}

function AccordionItem({ section, isOpen, onClick, index }: {
  section: typeof privacySections[0];
  isOpen: boolean;
  onClick: () => void;
  index: number;
}) {
  const Icon = section.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      className="border border-gray-200 rounded-2xl overflow-hidden bg-white hover:border-green-200 transition-colors shadow-sm"
    >
      <button
        onClick={onClick}
        className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none group"
      >
        <div className="flex items-center gap-4">
          <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-300 ${isOpen ? 'bg-[#179a65] text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-green-50 group-hover:text-[#179a65]'}`}>
            <Icon size={20} />
          </div>
          <span className="text-lg font-semibold text-gray-800 group-hover:text-[#179a65] transition-colors">
            {section.title}
          </span>
        </div>
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-300 ${isOpen ? 'bg-[#179a65] text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-green-50'}`}>
          {isOpen ? <Minus size={16} /> : <Plus size={16} />}
        </div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="px-6 pb-6 text-gray-600 leading-relaxed">
              {formatContent(section.content)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function PrivacyPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const lastUpdated = "January 24, 2026";

  return (
    <div className="relative min-h-screen">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-[#179a65] via-green-600 to-[#0F766E] pt-32 pb-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(255,255,255,0.08),transparent_40%)]" />

        <div className="relative z-10 container mx-auto px-4 max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl mb-6">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Privacy Policy
            </h1>
            <p className="text-lg text-white/80 mb-2">
              Your privacy is important to us. Learn how we collect, use, and protect your information.
            </p>
            <p className="text-sm text-white/60">
              Last updated: {lastUpdated}
            </p>
          </motion.div>
        </div>
      </div>

      {/* Introduction */}
      <div className="bg-white py-12 border-b border-gray-100">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="prose prose-gray max-w-none"
          >
            <p className="text-gray-600 leading-relaxed">
              Cortanatech Solutions, Inc. (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates the StewardTrack
              church management platform (the &quot;Service&quot;). This Privacy Policy explains how we collect, use, disclose,
              and safeguard your information when you use our Service.
            </p>
            <p className="text-gray-600 leading-relaxed mt-4">
              By accessing or using StewardTrack, you agree to the terms of this Privacy Policy. If you do not agree
              with the terms of this Privacy Policy, please do not access or use the Service.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Accordion Sections */}
      <div className="bg-gray-50 py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="space-y-4">
            {privacySections.map((section, index) => (
              <AccordionItem
                key={section.id}
                section={section}
                index={index}
                isOpen={openIndex === index}
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="bg-white py-12 border-t border-gray-100">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <Link className="text-gray-600 hover:text-[#179a65] transition-colors" href="/">
              Return home
            </Link>
            <span className="text-gray-300">|</span>
            <Link className="text-gray-600 hover:text-[#179a65] transition-colors" href="/terms">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
