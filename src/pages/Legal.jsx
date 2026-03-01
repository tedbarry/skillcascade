import { useParams, Link } from 'react-router-dom'

const LEGAL_PAGES = {
  privacy: {
    title: 'Privacy Policy',
    lastUpdated: 'February 2026',
    sections: [
      {
        heading: 'Overview',
        content: 'SkillCascade ("we", "us", "our") is committed to protecting the privacy and security of your personal information and the protected health information (PHI) of your clients. This Privacy Policy describes how we collect, use, disclose, and safeguard information when you use our web application and services.',
      },
      {
        heading: 'Information We Collect',
        content: 'We collect information you provide directly: account registration details (name, email, organization), assessment data you enter for your clients, and usage preferences. We also collect technical data automatically: browser type, device information, IP address (anonymized), and aggregate usage analytics. We do NOT collect: social security numbers, insurance information, billing codes, or session notes beyond what you explicitly enter into our AI assistants.',
      },
      {
        heading: 'How We Use Your Information',
        content: 'We use your information to: provide and maintain our assessment and clinical intelligence services, authenticate your identity, save and sync your assessment data, generate clinical reports and AI-assisted content, improve our services through anonymized and aggregated analytics, and communicate service updates. We never sell your data to third parties.',
      },
      {
        heading: 'Protected Health Information (PHI)',
        content: 'Client assessment data constitutes PHI under HIPAA. All PHI is encrypted in transit (TLS 1.2+) and at rest (AES-256). PHI is stored in Supabase infrastructure with SOC 2 Type II certification. Access to PHI is restricted to authenticated users within the same organization. We maintain audit logs of all PHI access. AI-generated content is processed through secure, HIPAA-compliant channels and is not used to train AI models.',
      },
      {
        heading: 'Data Retention',
        content: 'We retain your account data and assessment records for as long as your account is active. Upon account deletion, we permanently remove all personal data and PHI within 30 days. Anonymized, aggregated analytics data may be retained indefinitely. Audit logs are retained for a minimum of 6 years per HIPAA requirements.',
      },
      {
        heading: 'Third-Party Services',
        content: 'We use the following third-party services: Supabase (database and authentication), Stripe (payment processing — Stripe never receives PHI), and AI language model providers (for AI assistant features — governed by separate BAA). These providers are bound by their own privacy policies and, where applicable, Business Associate Agreements.',
      },
      {
        heading: 'Your Rights',
        content: 'You have the right to: access your personal data and PHI, request correction of inaccurate data, request deletion of your account and all associated data, receive a copy of your data in a portable format (CSV/JSON export), and opt out of non-essential communications. To exercise these rights, contact us at privacy@skillcascade.com.',
      },
      {
        heading: 'Children\'s Privacy',
        content: 'Our services are designed for use by licensed clinicians and parents/caregivers. We do not knowingly collect information directly from children under 13. All client data is entered by authorized adults.',
      },
      {
        heading: 'Changes to This Policy',
        content: 'We may update this policy periodically. We will notify registered users of material changes via email at least 30 days before they take effect. Continued use of our services after changes constitutes acceptance.',
      },
      {
        heading: 'Contact',
        content: 'For privacy-related inquiries: privacy@skillcascade.com. For HIPAA-related concerns: compliance@skillcascade.com.',
      },
    ],
  },
  terms: {
    title: 'Terms of Service',
    lastUpdated: 'February 2026',
    sections: [
      {
        heading: 'Acceptance of Terms',
        content: 'By accessing or using SkillCascade ("the Service"), you agree to be bound by these Terms of Service. If you are using the Service on behalf of an organization, you represent that you have authority to bind that organization to these terms.',
      },
      {
        heading: 'Description of Service',
        content: 'SkillCascade is a developmental-functional assessment tool for ABA therapy professionals. The Service provides: skill assessment across 9 developmental domains (300+ skills), clinical intelligence and visualization tools, AI-assisted clinical writing, report generation, and data import/export capabilities.',
      },
      {
        heading: 'Account Registration',
        content: 'You must register for an account to use the Service. You are responsible for maintaining the confidentiality of your login credentials and for all activities under your account. You must notify us immediately of any unauthorized use. You must provide accurate, current information during registration.',
      },
      {
        heading: 'Acceptable Use',
        content: 'You agree to use the Service only for lawful purposes related to clinical assessment and treatment planning. You will not: attempt to gain unauthorized access to other users\' data, reverse-engineer or decompile any part of the Service, use the Service to store information unrelated to clinical assessment, share login credentials with unauthorized individuals, or use automated scripts to access the Service.',
      },
      {
        heading: 'Data Ownership',
        content: 'You retain full ownership of all assessment data, client records, and content you create using the Service. We claim no ownership over your data. You grant us a limited license to process your data solely for the purpose of providing the Service. AI-generated content (goals, BIPs, reports) belongs to you once generated.',
      },
      {
        heading: 'Subscription and Billing',
        content: 'The Service is offered on a subscription basis. Pricing is as displayed on our pricing page at the time of purchase. Subscriptions auto-renew unless cancelled. You may cancel at any time; cancellation takes effect at the end of the current billing period. Refunds are available within 14 days of initial purchase if you are unsatisfied. Price changes will be communicated 30 days in advance.',
      },
      {
        heading: 'Service Availability',
        content: 'We strive for 99.9% uptime but do not guarantee uninterrupted service. We may perform scheduled maintenance with advance notice. We are not liable for service interruptions caused by circumstances beyond our control.',
      },
      {
        heading: 'Clinical Disclaimer',
        content: 'SkillCascade is a clinical support tool, NOT a diagnostic instrument. All assessments, recommendations, and AI-generated content should be reviewed by qualified professionals before use in treatment planning. The Service does not replace professional clinical judgment. AI assistant outputs are suggestions only and must be clinically validated.',
      },
      {
        heading: 'Limitation of Liability',
        content: 'To the maximum extent permitted by law, SkillCascade shall not be liable for indirect, incidental, special, or consequential damages arising from use of the Service. Our total liability shall not exceed the amount you paid for the Service in the 12 months preceding the claim.',
      },
      {
        heading: 'Termination',
        content: 'We may terminate or suspend your account for violation of these terms. Upon termination, you may request an export of your data within 30 days. After 30 days, data will be permanently deleted.',
      },
      {
        heading: 'Governing Law',
        content: 'These terms are governed by the laws of the United States. Any disputes shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association.',
      },
      {
        heading: 'Contact',
        content: 'For questions about these terms: legal@skillcascade.com.',
      },
    ],
  },
  hipaa: {
    title: 'HIPAA Compliance',
    lastUpdated: 'February 2026',
    sections: [
      {
        heading: 'Our Commitment',
        content: 'SkillCascade is designed to comply with the Health Insurance Portability and Accountability Act (HIPAA) Privacy Rule, Security Rule, and Breach Notification Rule. We serve as a Business Associate to covered entities using our platform.',
      },
      {
        heading: 'Administrative Safeguards',
        content: 'We maintain: a designated Privacy Officer and Security Officer, workforce training on HIPAA compliance, documented policies and procedures for PHI handling, regular risk assessments and gap analyses, incident response and breach notification procedures, and Business Associate Agreements with all subcontractors who access PHI.',
      },
      {
        heading: 'Technical Safeguards',
        content: 'Our technical controls include: encryption of PHI in transit (TLS 1.2+) and at rest (AES-256), unique user identification and authentication, automatic session timeout after 30 minutes of inactivity, audit logging of all PHI access and modifications, role-based access controls, and secure API authentication for all data endpoints.',
      },
      {
        heading: 'Physical Safeguards',
        content: 'Our infrastructure is hosted on cloud providers with SOC 2 Type II certification, physical access controls, environmental monitoring, and redundant data storage. We do not maintain on-premises servers.',
      },
      {
        heading: 'Minimum Necessary Standard',
        content: 'We collect and process only the minimum PHI necessary to provide our assessment and clinical intelligence services. Our AI features process assessment data in context but do not store conversation history beyond the active session.',
      },
      {
        heading: 'Breach Notification',
        content: 'In the event of a breach involving unsecured PHI, we will: notify affected covered entities within 60 days of discovery, cooperate with breach investigation and mitigation, provide information necessary for covered entities to fulfill their notification obligations, and document all breach-related activities.',
      },
      {
        heading: 'Patient Rights',
        content: 'We support covered entities in fulfilling patient rights under HIPAA including: access to their PHI (via data export), amendment of inaccurate PHI, accounting of disclosures, and restrictions on certain uses.',
      },
      {
        heading: 'Contact',
        content: 'HIPAA compliance inquiries: compliance@skillcascade.com.',
      },
    ],
  },
  baa: {
    title: 'Business Associate Agreement',
    lastUpdated: 'February 2026',
    sections: [
      {
        heading: 'Overview',
        content: 'This Business Associate Agreement ("BAA") is entered into between you ("Covered Entity") and SkillCascade ("Business Associate") pursuant to HIPAA regulations at 45 CFR Part 160 and Part 164. This BAA is automatically incorporated into your SkillCascade subscription agreement.',
      },
      {
        heading: 'Definitions',
        content: 'Terms used in this BAA have the same meaning as defined in 45 CFR 160.103. "Protected Health Information" (PHI) means individually identifiable health information received, created, maintained, or transmitted by Business Associate on behalf of Covered Entity through the SkillCascade platform.',
      },
      {
        heading: 'Obligations of Business Associate',
        content: 'Business Associate agrees to: use or disclose PHI only as permitted by this BAA or as required by law, implement appropriate administrative, physical, and technical safeguards, report any security incident or breach of unsecured PHI, ensure that subcontractors agree to the same restrictions, make PHI available to Covered Entity as required for patient rights, return or destroy all PHI upon termination (subject to legal retention requirements), and maintain documentation of compliance activities for 6 years.',
      },
      {
        heading: 'Permitted Uses and Disclosures',
        content: 'Business Associate may use PHI to: provide the SkillCascade assessment and clinical intelligence services, perform quality assurance and service improvement (using de-identified data only), and comply with legal requirements. Business Associate will not use PHI for marketing, fundraising, or sale.',
      },
      {
        heading: 'Subcontractors',
        content: 'Business Associate uses the following subcontractors who may access PHI: Supabase (database hosting and authentication) and AI model providers (for AI assistant features). Each subcontractor is bound by a BAA or equivalent contractual protections.',
      },
      {
        heading: 'Term and Termination',
        content: 'This BAA is effective upon account creation and remains in effect for the duration of the subscription. Either party may terminate for material breach with 30 days written notice and opportunity to cure. Upon termination, Business Associate will return or destroy all PHI within 30 days.',
      },
      {
        heading: 'How to Execute',
        content: 'By subscribing to SkillCascade, you accept this BAA. For organizations requiring a custom or countersigned BAA, contact legal@skillcascade.com.',
      },
    ],
  },
  security: {
    title: 'Security Policy',
    lastUpdated: 'February 2026',
    sections: [
      {
        heading: 'Security Overview',
        content: 'SkillCascade employs multiple layers of security to protect your data and your clients\' protected health information. Our security practices are designed to meet or exceed HIPAA Security Rule requirements.',
      },
      {
        heading: 'Data Encryption',
        content: 'All data in transit is encrypted using TLS 1.2 or higher. All data at rest is encrypted using AES-256 encryption. Database backups are encrypted. API keys and secrets are stored in environment variables, never in source code.',
      },
      {
        heading: 'Authentication and Access',
        content: 'We enforce: email-verified account creation, minimum 8-character passwords, automatic session timeout after 30 minutes of inactivity (HIPAA requirement), role-based access controls (clinician vs. parent roles), and organization-scoped data isolation (users can only access data within their organization).',
      },
      {
        heading: 'Infrastructure',
        content: 'Our application is hosted on: Supabase (PostgreSQL database with Row-Level Security), Vercel/Netlify (static site hosting with edge CDN), and Stripe (PCI DSS Level 1 compliant payment processing). All infrastructure providers maintain SOC 2 Type II or equivalent certifications.',
      },
      {
        heading: 'Audit Logging',
        content: 'We maintain comprehensive audit logs including: user login and logout events, assessment data access and modifications, data export activities, and administrative actions. Audit logs are retained for a minimum of 6 years.',
      },
      {
        heading: 'Incident Response',
        content: 'We maintain a documented incident response plan that includes: immediate containment and investigation, notification to affected users within 60 days (per HIPAA), root cause analysis and remediation, and post-incident review and process improvement.',
      },
      {
        heading: 'Vulnerability Management',
        content: 'We practice: regular dependency updates and security patching, automated vulnerability scanning in our CI/CD pipeline, secure coding practices (OWASP Top 10 mitigation), and responsible disclosure — if you discover a vulnerability, please report it to security@skillcascade.com.',
      },
      {
        heading: 'Contact',
        content: 'Security concerns: security@skillcascade.com. Vulnerability reports: security@skillcascade.com.',
      },
    ],
  },
}

export default function Legal() {
  const { page } = useParams()
  const legal = LEGAL_PAGES[page]

  if (!legal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-warm-50">
        <div className="text-center px-6">
          <h1 className="text-4xl font-bold text-warm-300 font-display">404</h1>
          <p className="mt-2 text-warm-600">Legal page not found.</p>
          <Link to="/" className="inline-block mt-4 text-sage-600 hover:text-sage-700 text-sm font-medium">
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-warm-50">
      {/* Header */}
      <div className="bg-white border-b border-warm-200">
        <div className="max-w-3xl mx-auto px-6 py-6">
          <Link to="/" className="text-lg font-bold text-warm-800 font-display">
            Skill<span className="text-sage-500">Cascade</span>
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-warm-900 font-display mb-2">
          {legal.title}
        </h1>
        <p className="text-sm text-warm-500 mb-10">
          Last updated: {legal.lastUpdated}
        </p>

        <div className="space-y-8">
          {legal.sections.map((section, i) => (
            <div key={i}>
              <h2 className="text-lg font-semibold text-warm-800 mb-2">
                {i + 1}. {section.heading}
              </h2>
              <p className="text-sm text-warm-600 leading-relaxed">
                {section.content}
              </p>
            </div>
          ))}
        </div>

        {/* Back link */}
        <div className="mt-12 pt-8 border-t border-warm-200">
          <Link to="/" className="text-sm text-sage-600 hover:text-sage-700 font-medium">
            &larr; Back to SkillCascade
          </Link>
        </div>
      </div>
    </div>
  )
}
