"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Minus, FileText, Shield, CreditCard, Ban, Database, Lightbulb, Globe, Server, AlertTriangle, Scale, XCircle, Gavel, Settings, RefreshCw, Mail, Heart, CalendarCheck } from "lucide-react";

const termsSections = [
  {
    id: "definitions",
    icon: FileText,
    title: "1. Definitions",
    content: `• **"Account"** means a unique account created for you to access the Service.
• **"Organization"** means the church, religious institution, or nonprofit entity that subscribes to the Service.
• **"User"** means any individual who accesses or uses the Service through an Organization's account.
• **"Content"** means any data, text, information, or materials uploaded, submitted, or stored through the Service.
• **"Subscription"** means the paid plan under which an Organization accesses the Service.`
  },
  {
    id: "account",
    icon: Shield,
    title: "2. Account Registration and Security",
    content: `**2.1 Account Creation**
To use the Service, you must create an account by providing accurate and complete information. You agree to update your information promptly if it changes. You must be at least 18 years old to create an account.

**2.2 Account Security**
You are responsible for:
• Maintaining the confidentiality of your login credentials.
• All activities that occur under your account.
• Notifying us immediately of any unauthorized access or security breach.
• Ensuring that Users within your Organization comply with these Terms.

**2.3 Account Termination**
We reserve the right to suspend or terminate your account if you violate these Terms, fail to pay applicable fees, or engage in conduct that we determine is harmful to other users or the Service.`
  },
  {
    id: "subscriptions",
    icon: CreditCard,
    title: "3. Subscriptions and Payments",
    content: `**3.1 Subscription Plans**
StewardTrack offers various subscription tiers (Essential, Professional, Enterprise, Premium) with different features and pricing. The specific features available to your Organization depend on your selected subscription plan.

**3.2 Payment Terms**
• Subscription fees are billed in advance on a monthly or annual basis.
• All fees are non-refundable except as expressly stated in these Terms.
• You authorize us to charge your payment method for all applicable fees.
• Failure to pay may result in suspension or termination of your account.

**3.3 Price Changes**
We may modify our pricing with at least 30 days' notice. Price changes will take effect at the start of your next billing cycle. Continued use of the Service after price changes constitutes acceptance of the new pricing.

**3.4 Free Trials**
We may offer free trials at our discretion. At the end of a trial period, your account will automatically convert to a paid subscription unless you cancel before the trial ends.`
  },
  {
    id: "donations",
    icon: Heart,
    title: "4. Online Donations",
    content: `**4.1 Donation Processing**
StewardTrack enables Organizations to accept online donations from their members and supporters through integrated payment processing. By using the donation features, both Organizations and donors agree to the following terms.

**4.2 Payment Processing**
• Online donations are processed through Xendit, our third-party payment gateway provider. Xendit is a licensed payment service provider that handles all payment transactions securely.
• Donations may be made via e-wallets (GCash, Maya, GrabPay, ShopeePay), credit/debit cards (Visa, Mastercard, JCB), or bank transfer.
• Organizations are responsible for providing accurate banking and payment information for fund disbursement.
• Donors must ensure they have authorization to use the payment method selected.
• **Donor Payment Security:** StewardTrack does not store donor payment information such as credit card numbers, CVV codes, or e-wallet credentials. All donor payment data is securely processed and stored by Xendit in compliance with PCI-DSS standards.
• **Organization Disbursement Details:** For fund disbursement purposes, Organizations provide their bank account details. This information is stored with industry-standard encryption and is accessible only through secure, audited processes. Even our development team cannot access this sensitive data in plain text.
• By using our payment features, you also agree to Xendit's Terms and Conditions (https://www.xendit.co/en-ph/terms-and-conditions/) and Privacy Policy (https://www.xendit.co/en-ph/privacy-policy/).

**4.3 Processing Fees**
• All online donations are subject to processing fees charged by Xendit and a platform fee charged by StewardTrack.
• Processing fees vary by payment method and are displayed to donors before completing the transaction.
• **Fee Structure:** Fees include Xendit payment processing fees and StewardTrack platform fees, both calculated as a percentage of the donation amount.
• **Fee Changes:** Processing fees are subject to change without prior notice due to changes in payment processor rates or platform operating costs. Updated fees will be displayed at the time of transaction.

**4.4 Donation Refunds**
• Donation refunds are at the sole discretion of the receiving Organization.
• To request a donation refund, donors must contact the Organization directly.
• Processing fees may not be refundable even if the donation is refunded.
• StewardTrack is not responsible for disputes between donors and Organizations regarding donations.

**4.5 Tax Receipts**
• Organizations are responsible for issuing appropriate tax receipts or acknowledgments to donors.
• StewardTrack provides tools to generate donation reports but does not guarantee compliance with local tax regulations.
• Donors should consult with tax professionals regarding the deductibility of their donations.`
  },
  {
    id: "event-registration",
    icon: CalendarCheck,
    title: "5. Event Registration Payments",
    content: `**5.1 Event Registration**
Organizations may use StewardTrack to manage event registrations with optional payment collection for registration fees, tickets, or related costs.

**5.2 Registration Fee Processing**
• Event registration payments are processed through Xendit, our third-party payment gateway provider.
• Payment methods include e-wallets (GCash, Maya, GrabPay, ShopeePay), credit/debit cards (Visa, Mastercard, JCB), and bank transfers.
• Registrants must complete payment within the specified time window to secure their registration.
• Unpaid registrations may be automatically cancelled or moved to a waitlist.
• **Data Security:** StewardTrack does not store sensitive payment information. All payment credentials are securely handled by Xendit.
• By completing a registration payment, you agree to Xendit's Terms and Conditions (https://www.xendit.co/en-ph/terms-and-conditions/) and Privacy Policy (https://www.xendit.co/en-ph/privacy-policy/).

**5.3 Processing Fees for Event Registrations**
• All event registration payments are subject to processing fees charged by Xendit and a platform fee charged by StewardTrack.
• Fees are calculated based on the payment method selected and the registration amount.
• **Fee Disclosure:** The total amount including all fees will be displayed to registrants before payment confirmation.
• **Fee Changes:** Processing fees are subject to change without prior notice. The fees in effect at the time of registration will apply to that transaction.

**5.4 Early Bird Pricing**
• Organizations may offer early bird pricing for event registrations.
• Early bird rates are valid only during the specified early registration period.
• Once the early bird deadline passes, standard registration fees apply automatically.

**5.5 Refund Policy for Event Registrations**
• Refund policies for event registrations are determined by each Organization.
• Registrants should review the Organization's refund policy before completing payment.
• Processing fees are generally non-refundable even if the registration fee is refunded.
• StewardTrack is not liable for refund disputes between registrants and Organizations.

**5.6 Event Cancellation**
• If an Organization cancels an event, the Organization is responsible for communicating with registrants and processing refunds.
• StewardTrack will assist with processing refunds but is not responsible for refund delays or disputes.

**5.7 Registrant Data Collection and Privacy**
• When you register for an event through StewardTrack, the Organization collects personal information such as your name, email address, phone number, and any additional information required by the Organization's registration form.
• **Data Controller:** The Organization hosting the event is the data controller for the personal information you provide during registration. StewardTrack acts as a data processor on behalf of the Organization.
• **Purpose of Collection:** Your personal information is collected to process your registration, communicate event details, and manage attendance. The Organization may also use this information in accordance with their own privacy practices.
• **Data Retention:** Your registration data is retained by the Organization through StewardTrack for as long as necessary to fulfill the purposes for which it was collected, or as required by applicable law.
• **Your Rights:** For questions about how your registration data is used, or to exercise your data privacy rights (access, correction, deletion), please contact the Organization directly.
• **Consent:** By completing an event registration, you consent to the collection and processing of your personal information by the Organization and acknowledge that you have read and agree to these Terms of Service and our Privacy Policy.`
  },
  {
    id: "refunds",
    icon: RefreshCw,
    title: "6. Subscription Refund and Cancellation Policy",
    content: `**4.1 Cancellation**
You may cancel your subscription at any time through your account settings or by contacting our support team. Cancellation will take effect at the end of your current billing period.

**4.2 Refund Eligibility**
• **Annual Subscriptions:** If you cancel within 30 days of your initial purchase or annual renewal, you may request a prorated refund for the unused portion of your subscription.
• **Monthly Subscriptions:** Monthly subscriptions are non-refundable. You will retain access until the end of your current billing period.
• **Free Trial Conversions:** If you cancel within 7 days of your free trial converting to a paid subscription, you may request a full refund.

**4.3 Refund Exceptions**
Refunds will NOT be provided in the following circumstances:
• Violation of these Terms of Service resulting in account termination.
• Failure to cancel before an automatic renewal.
• Partial month usage after the 30-day window for annual plans.
• Dissatisfaction with features clearly described in the subscription plan.

**4.4 How to Request a Refund**
To request a refund, please contact our support team at support@cortanatechsolutions.com with your account email and reason for the refund request. Refunds are processed within 5-10 business days to your original payment method.

**4.5 Service Credits**
In lieu of refunds, we may offer service credits at our discretion for service outages or technical issues that significantly impact your use of the Service.

**4.6 Downgrade Policy**
If you downgrade your subscription plan, the change will take effect at the start of your next billing cycle. No prorated refunds are provided for downgrades mid-cycle.`
  },
  {
    id: "acceptable-use",
    icon: Ban,
    title: "7. Acceptable Use Policy",
    content: `You agree not to use the Service to:
• Violate any applicable laws, regulations, or third-party rights.
• Upload or transmit malicious code, viruses, or harmful content.
• Attempt to gain unauthorized access to the Service or other users' accounts.
• Interfere with or disrupt the integrity or performance of the Service.
• Collect or harvest information about other users without consent.
• Use the Service for any fraudulent, deceptive, or illegal purpose.
• Resell, sublicense, or redistribute the Service without authorization.
• Reverse engineer, decompile, or attempt to extract the source code of the Service.

We reserve the right to investigate violations and take appropriate action, including suspending or terminating accounts and reporting illegal activities to law enforcement.`
  },
  {
    id: "content",
    icon: Database,
    title: "8. Content and Data",
    content: `**6.1 Your Content**
You retain ownership of all Content you upload to the Service. By uploading Content, you grant us a limited license to store, process, and display your Content solely to provide the Service to you.

**6.2 Content Responsibility**
You are solely responsible for the accuracy, legality, and appropriateness of all Content you upload. You represent that you have all necessary rights and permissions to use and share any Content you upload, including personal data of church members.

**6.3 Data Protection**
If you upload personal data of individuals (such as church members), you are responsible for ensuring compliance with applicable data protection laws, including obtaining necessary consents and providing required notices to those individuals.

**6.4 Data Export**
You may export your Content at any time through the Service's data export features. We recommend regularly backing up your important data.`
  },
  {
    id: "intellectual-property",
    icon: Lightbulb,
    title: "9. Intellectual Property",
    content: `**7.1 Our Rights**
The Service, including its design, features, code, documentation, and all related intellectual property, is owned by Cortanatech Solutions, Inc. and protected by copyright, trademark, and other intellectual property laws. Nothing in these Terms grants you any right, title, or interest in the Service except the limited right to use it as described herein.

**7.2 Trademarks**
"StewardTrack," "Cortanatech Solutions," and related logos and marks are trademarks of Cortanatech Solutions, Inc. You may not use our trademarks without prior written permission.

**7.3 Feedback**
If you provide feedback, suggestions, or ideas about the Service, you grant us a perpetual, royalty-free license to use such feedback for any purpose without obligation to you.`
  },
  {
    id: "third-party",
    icon: Globe,
    title: "10. Third-Party Services",
    content: `The Service may integrate with or provide links to third-party services, applications, or websites. These third-party services are not under our control, and we are not responsible for their content, privacy practices, or terms. Your use of third-party services is at your own risk and subject to their respective terms and policies.`
  },
  {
    id: "availability",
    icon: Server,
    title: "11. Service Availability and Support",
    content: `**9.1 Availability**
We strive to maintain high availability of the Service but do not guarantee uninterrupted access. The Service may be temporarily unavailable due to maintenance, updates, or circumstances beyond our control.

**9.2 Service Level Agreement (SLA)**
• **Uptime Target:** We target 99.9% uptime for our Service.
• **Scheduled Maintenance:** We will provide at least 24 hours' notice for scheduled maintenance.
• **Emergency Maintenance:** In urgent situations, we may perform maintenance without prior notice.

**9.3 Modifications**
We reserve the right to modify, update, or discontinue any feature or aspect of the Service at any time. We will provide reasonable notice of material changes that may affect your use of the Service.

**9.4 Support**
Support availability and response times vary by subscription plan:
• **Essential:** Email support (48-hour response time)
• **Professional:** Email and chat support (24-hour response time)
• **Enterprise:** Priority support with dedicated account manager
• **Premium:** 24/7 support with phone access`
  },
  {
    id: "warranties",
    icon: AlertTriangle,
    title: "12. Disclaimer of Warranties",
    content: `**IMPORTANT NOTICE**

THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.

WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, SECURE, OR FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS. WE DO NOT WARRANT THE ACCURACY, COMPLETENESS, OR RELIABILITY OF ANY CONTENT OBTAINED THROUGH THE SERVICE.`
  },
  {
    id: "liability",
    icon: Scale,
    title: "13. Limitation of Liability",
    content: `TO THE MAXIMUM EXTENT PERMITTED BY LAW, CORTANATECH SOLUTIONS, INC. AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, USE, OR GOODWILL, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE.

OUR TOTAL LIABILITY FOR ANY CLAIMS ARISING FROM OR RELATED TO THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.`
  },
  {
    id: "indemnification",
    icon: Shield,
    title: "14. Indemnification",
    content: `You agree to indemnify, defend, and hold harmless Cortanatech Solutions, Inc. and its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses (including reasonable attorneys' fees) arising out of or related to:

• Your use of the Service.
• Your violation of these Terms.
• Your violation of any third-party rights.
• Content you upload or share through the Service.`
  },
  {
    id: "termination",
    icon: XCircle,
    title: "15. Termination",
    content: `**13.1 Termination by You**
You may terminate your account at any time by contacting us or using the account cancellation feature in the Service. Termination does not entitle you to a refund of any prepaid fees except as stated in our Refund Policy.

**13.2 Termination by Us**
We may terminate or suspend your access to the Service immediately, without prior notice, if you breach these Terms or if we reasonably believe such action is necessary to protect the Service, our users, or ourselves.

**13.3 Effect of Termination**
Upon termination, your right to use the Service will cease immediately. We may delete your Content after a reasonable period (30 days) following termination. Provisions that by their nature should survive termination will survive, including ownership, warranty disclaimers, indemnification, and limitations of liability.

**13.4 Data Retrieval**
You may request a copy of your data within 30 days of termination. After this period, we reserve the right to delete all your Content.`
  },
  {
    id: "disputes",
    icon: Gavel,
    title: "16. Dispute Resolution",
    content: `**14.1 Informal Resolution**
Before initiating any formal dispute resolution, you agree to first contact us and attempt to resolve the dispute informally for at least 30 days.

**14.2 Arbitration**
Any dispute arising from these Terms or the Service that cannot be resolved informally shall be resolved by binding arbitration in accordance with the rules of the American Arbitration Association. The arbitration shall take place in the jurisdiction where Cortanatech Solutions, Inc. is headquartered.

**14.3 Class Action Waiver**
You agree that any dispute resolution proceedings will be conducted only on an individual basis and not in a class, consolidated, or representative action.

**14.4 Small Claims Court**
Notwithstanding the above, either party may bring an individual action in small claims court for disputes within the court's jurisdictional limits.`
  },
  {
    id: "general",
    icon: Settings,
    title: "17. General Provisions",
    content: `**15.1 Governing Law**
These Terms shall be governed by and construed in accordance with the laws of the jurisdiction where Cortanatech Solutions, Inc. is incorporated, without regard to its conflict of law provisions.

**15.2 Entire Agreement**
These Terms, together with our Privacy Policy and any subscription agreements, constitute the entire agreement between you and Cortanatech Solutions, Inc. regarding the Service.

**15.3 Severability**
If any provision of these Terms is found to be unenforceable, the remaining provisions will continue in full force and effect.

**15.4 Waiver**
Our failure to enforce any right or provision of these Terms will not constitute a waiver of such right or provision.

**15.5 Assignment**
You may not assign or transfer these Terms without our prior written consent. We may assign these Terms without restriction.

**15.6 Force Majeure**
We shall not be liable for any failure or delay in performance due to circumstances beyond our reasonable control, including but not limited to natural disasters, acts of war, terrorism, labor disputes, or internet service provider failures.`
  },
  {
    id: "changes",
    icon: RefreshCw,
    title: "18. Changes to These Terms",
    content: `We may revise these Terms at any time by posting the updated terms on the Service. We will notify you of material changes by email or through the Service at least 30 days before they take effect. Your continued use of the Service after such changes constitutes acceptance of the revised Terms. We encourage you to review these Terms periodically.

If you do not agree to the revised Terms, you must stop using the Service before the changes take effect.`
  },
  {
    id: "contact",
    icon: Mail,
    title: "19. Contact Us",
    content: `If you have questions about these Terms of Service, please contact us at:

**Cortanatech Solutions, Inc.**

• Legal Inquiries: legal@cortanatechsolutions.com
• Support: support@cortanatechsolutions.com
• Website: stewardtrack.com`
  }
];

// Helper function to parse markdown-style bold text
function formatContent(content: string) {
  // Split content into lines
  const lines = content.split('\n');

  return lines.map((line, lineIndex) => {
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
  section: typeof termsSections[0];
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

export default function TermsPage() {
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
              <FileText className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Terms of Service
            </h1>
            <p className="text-lg text-white/80 mb-2">
              Please read these terms carefully before using StewardTrack.
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
              Welcome to StewardTrack. These Terms of Service (&quot;Terms&quot;) govern your access to and use of
              the StewardTrack church management platform (the &quot;Service&quot;) provided by Cortanatech Solutions, Inc.
              (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;).
            </p>
            <p className="text-gray-600 leading-relaxed mt-4">
              By accessing or using the Service, you agree to be bound by these Terms. If you do not agree
              to these Terms, you may not access or use the Service. If you are using the Service on behalf
              of an organization, you represent that you have the authority to bind that organization to these Terms.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Accordion Sections */}
      <div className="bg-gray-50 py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="space-y-4">
            {termsSections.map((section, index) => (
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
            <Link className="text-gray-600 hover:text-[#179a65] transition-colors" href="/privacy">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
