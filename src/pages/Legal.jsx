import { useParams, Link } from 'react-router-dom'

const LEGAL_PAGES = {
  privacy: {
    title: 'Privacy Policy',
    lastUpdated: 'February 2026',
    sections: [
      {
        heading: 'Overview',
        content: 'SkillCascade ("we", "us", "our") is committed to protecting the privacy and security of your personal information and the sensitive clinical data of your clients. This Privacy Policy describes how we collect, use, disclose, and safeguard information when you use our web application and services.',
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
        heading: 'Client Assessment Data',
        content: 'Client assessment data is treated as sensitive health information. All such data is encrypted in transit (TLS 1.2+) and at rest (AES-256). Data is stored in Supabase infrastructure with SOC 2 Type II certification. Access is restricted to authenticated users within the same organization. We maintain audit logs of data access. AI-generated content is processed through secure channels and is not used to train AI models.',
      },
      {
        heading: 'Data Retention',
        content: 'We retain your account data and assessment records for as long as your account is active. Upon account deletion, we permanently remove all personal data within 30 days. Anonymized, aggregated analytics data may be retained indefinitely. Audit logs are retained in accordance with our data retention policies.',
      },
      {
        heading: 'Third-Party Services',
        content: 'We use the following third-party services: Supabase (database and authentication), Stripe (payment processing — Stripe never receives client health data), and AI language model providers (for AI assistant features). These providers are bound by their own privacy policies and contractual data protection obligations.',
      },
      {
        heading: 'Your Rights',
        content: 'You have the right to: access your personal data, request correction of inaccurate data, request deletion of your account and all associated data, receive a copy of your data in a portable format (CSV/JSON export), and opt out of non-essential communications. To exercise these rights, contact us at privacy@skillcascade.com.',
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
        content: 'For privacy-related inquiries: privacy@skillcascade.com. For security-related concerns: security@skillcascade.com.',
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
        content: 'SkillCascade is a developmental-functional assessment tool for ABA therapy professionals. The Service provides: skill assessment across 9 developmental domains (260+ skills), clinical intelligence and visualization tools, AI-assisted clinical writing, report generation, and data import/export capabilities.',
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
    title: 'Security Practices',
    lastUpdated: 'March 2026',
    sections: [
      {
        heading: 'Our Commitment',
        content: 'SkillCascade is committed to protecting the security and confidentiality of your data and your clients\' information. We implement industry-standard security controls and are actively working toward full HIPAA compliance as part of our security roadmap.',
      },
      {
        heading: 'What Is Currently Implemented',
        content: 'The following security measures are in place today: encryption of all data in transit (TLS 1.2+) and at rest (AES-256), unique user identification and authentication, automatic session timeout after 30 minutes of inactivity, audit logging of data access and modifications, role-based access controls, Row-Level Security (RLS) for organization-scoped data isolation, and secure API authentication for all data endpoints.',
      },
      {
        heading: 'Infrastructure Security',
        content: 'Our infrastructure is hosted on cloud providers with SOC 2 Type II certification, physical access controls, environmental monitoring, and redundant data storage. We do not maintain on-premises servers.',
      },
      {
        heading: 'Data Minimization',
        content: 'We collect and process only the data needed to provide assessment, scheduling, reporting, and clinical intelligence services. AI features process client context in-session, and certain AI workspaces may save conversation history inside your organization so teams can revisit prior clinical drafts and analyses.',
      },
      {
        heading: 'Incident Response',
        content: 'In the event of a data breach, we will: notify affected users promptly, cooperate with investigation and mitigation, provide information necessary for affected parties to take protective action, and document all breach-related activities.',
      },
      {
        heading: 'Security Roadmap',
        content: 'We are continuing to harden HIPAA-aligned workflows across the platform. Current roadmap items include broader BAA-backed infrastructure coverage, designated Privacy and Security Officers, documented HIPAA policies and procedures, regular third-party security audits, and workforce HIPAA training. Contact us for details on current coverage and rollout status.',
      },
      {
        heading: 'Your Data Rights',
        content: 'You can: access all your data at any time, export your data in portable formats (CSV/JSON), request correction of inaccurate data, and request deletion of your account and all associated data.',
      },
      {
        heading: 'Contact',
        content: 'Security inquiries: security@skillcascade.com.',
      },
    ],
  },
  baa: {
    title: 'Data Protection Agreement',
    lastUpdated: 'March 2026',
    sections: [
      {
        heading: 'Overview',
        content: 'This Data Protection Agreement describes how SkillCascade handles and protects the data you entrust to our platform, including client assessment data and personally identifiable information.',
      },
      {
        heading: 'Our Obligations',
        content: 'SkillCascade agrees to: use your data only for the purpose of providing our assessment and clinical intelligence services, implement appropriate technical and organizational safeguards, report any security incident or data breach promptly, ensure that subcontractors maintain equivalent data protection standards, make your data available for export upon request, and delete all data upon account termination within 30 days.',
      },
      {
        heading: 'Permitted Uses',
        content: 'SkillCascade may use your data to: provide assessment and clinical intelligence services, perform quality assurance and service improvement (using de-identified data only), and comply with legal requirements. We will not use your data for marketing, advertising, or sale to third parties.',
      },
      {
        heading: 'Subcontractors',
        content: 'SkillCascade uses infrastructure subcontractors that may process your data, including Supabase (authentication and data services), Cloudflare (edge delivery and API routing), AWS services such as Bedrock and managed storage, and Stripe (payments). Each subcontractor is expected to maintain contractual data protection obligations appropriate to its role.',
      },
      {
        heading: 'Term and Termination',
        content: 'This agreement is effective upon account creation and remains in effect for the duration of your subscription. Upon termination, SkillCascade will delete all your data within 30 days unless a longer retention period is required by law.',
      },
      {
        heading: 'HIPAA Business Associate Agreements',
        content: 'SkillCascade uses AWS HIPAA-eligible services for key AI and managed-storage workflows under AWS\'s BAA framework. Broader HIPAA availability may still depend on your organization\'s onboarding path, configuration, and required agreements across the full stack. If your organization requires a signed BAA or implementation review, contact us at legal@skillcascade.com for current availability and scope.',
      },
    ],
  },
  security: {
    title: 'Security Policy',
    lastUpdated: 'February 2026',
    sections: [
      {
        heading: 'Security Overview',
        content: 'SkillCascade employs multiple layers of security to protect your data and your clients\' sensitive information. Our security practices are designed to meet industry standards for healthcare data protection.',
      },
      {
        heading: 'Data Encryption',
        content: 'All data in transit is encrypted using TLS 1.2 or higher. All data at rest is encrypted using AES-256 encryption. Database backups are encrypted. API keys and secrets are stored in environment variables, never in source code.',
      },
      {
        heading: 'Authentication and Access',
        content: 'We enforce: email-verified account creation, minimum 8-character passwords, automatic session timeout after 30 minutes of inactivity, role-based access controls (clinician vs. parent roles), and organization-scoped data isolation (users can only access data within their organization).',
      },
      {
        heading: 'Infrastructure',
        content: 'Our application currently uses a mixed cloud stack that includes Supabase (authentication and data services), Cloudflare (frontend delivery and edge/API routing), AWS services for key AI and managed storage workflows, and Stripe (PCI DSS Level 1 compliant payment processing). We select infrastructure providers based on security controls, operational reliability, and the compliance posture required for each workflow.',
      },
      {
        heading: 'Audit Logging',
        content: 'We maintain audit logs including: user login and logout events, assessment data access and modifications, data export activities, and administrative actions. Audit logs are retained in accordance with our data retention policies.',
      },
      {
        heading: 'Incident Response',
        content: 'We maintain a documented incident response plan that includes: immediate containment and investigation, prompt notification to affected users, root cause analysis and remediation, and post-incident review and process improvement.',
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
