import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HeroSection() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <section className={styles.hero}>
      <div className={styles.heroBackground}>
        <div className={styles.heroContent}>
          <div className={styles.logoContainer}>
            <img 
              src="/assets/images/symindx-logo.png" 
              alt="SYMindX Logo" 
              className={styles.heroLogo}
            />
          </div>
          
          <Heading as="h1" className={styles.heroTitle}>
            SYMindX
          </Heading>
          
          <p className={styles.heroTagline}>
            The Next-Generation Modular AI Agent Framework
          </p>
          
          <p className={styles.heroDescription}>
            Build intelligent agents with consciousness, emotion, and personality. 
            Deploy anywhere, extend everything, scale infinitely.
          </p>
          
          <div className={styles.heroButtons}>
            <Link
              className={clsx("button", styles.primaryButton)}
              to="/docs/getting-started/quick-start">
              <span className={styles.buttonIcon}>🚀</span>
              Get Started
            </Link>
            <Link
              className={clsx("button", styles.secondaryButton)}
              to="/docs/introduction">
              <span className={styles.buttonIcon}>📖</span>
              Documentation
            </Link>
            <Link
              className={clsx("button", styles.tertiaryButton)}
              href="https://github.com/symbaiex/symindx">
              <span className={styles.buttonIcon}>⭐</span>
              GitHub
            </Link>
          </div>

          <div className={styles.quickDemo}>
            <div className={styles.terminalWindow}>
              <div className={styles.terminalHeader}>
                <div className={styles.terminalButtons}>
                  <span className={styles.terminalButton + ' ' + styles.red}></span>
                  <span className={styles.terminalButton + ' ' + styles.yellow}></span>
                  <span className={styles.terminalButton + ' ' + styles.green}></span>
                </div>
                <span className={styles.terminalTitle}>Terminal</span>
              </div>
              <div className={styles.terminalBody}>
                <pre className={styles.terminalCode}>
                  <code>
{`$ npm create symindx-agent my-agent
✨ Creating your AI agent...

$ cd my-agent && npm start
🤖 Agent online and ready!
🧠 Cognition module loaded
💭 Memory provider connected  
😊 Emotion stack initialized

Ready to chat at http://localhost:3000`}
                  </code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.heroDecoration}></div>
    </section>
  );
}

function FeaturesSection() {
  const features = [
    {
      icon: '🧠',
      title: 'Cognitive Intelligence',
      description: 'Advanced planning, reasoning, and decision-making with HTN planners and reactive systems.',
      highlight: 'AI-Powered'
    },
    {
      icon: '💭',
      title: 'Emotional Awareness',
      description: 'Dynamic emotion modeling that influences behavior and creates more human-like interactions.',
      highlight: 'Empathetic'
    },
    {
      icon: '🔮',
      title: 'Persistent Memory',
      description: 'Long-term and short-term memory systems with multiple storage backends and intelligent retrieval.',
      highlight: 'Remembers'
    },
    {
      icon: '⚡',
      title: 'Lightning Fast',
      description: 'Built for performance with async processing, efficient resource management, and real-time streaming.',
      highlight: 'High Performance'
    },
    {
      icon: '🔧',
      title: 'Fully Modular',
      description: 'Mix and match components. Swap out modules, add extensions, customize everything to your needs.',
      highlight: 'Extensible'
    },
    {
      icon: '🌐',
      title: 'Multi-Platform',
      description: 'Deploy to Discord, Slack, Twitter, custom APIs, or build your own interfaces with our SDK.',
      highlight: 'Universal'
    }
  ];

  return (
    <section className={styles.features}>
      <div className="container">
        <div className={styles.sectionHeader}>
          <Heading as="h2" className={styles.sectionTitle}>
            Why Developers Choose SYMindX
          </Heading>
          <p className={styles.sectionSubtitle}>
            The most advanced AI agent framework with built-in intelligence modules
          </p>
        </div>
        
        <div className={styles.featuresGrid}>
          {features.map((feature, idx) => (
            <div key={idx} className={styles.featureCard}>
              <div className={styles.featureHeader}>
                <div className={styles.featureIcon}>{feature.icon}</div>
                <span className={styles.featureHighlight}>{feature.highlight}</span>
              </div>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
              <p className={styles.featureDescription}>{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function UseCasesSection() {
  const useCases = [
    {
      icon: '🎮',
      title: 'Gaming & Automation',
      description: 'Intelligent game bots with adaptive strategies',
      examples: ['RuneScape automation', 'Strategy game AI', 'Game economy optimization'],
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: '💼',
      title: 'Business Intelligence',
      description: 'Enterprise automation with smart decision-making',
      examples: ['Customer support agents', 'Data analysis bots', 'Workflow automation'],
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: '🚀',
      title: 'Social & Community',
      description: 'Engaging conversational agents for platforms',
      examples: ['Discord moderators', 'Slack assistants', 'Social media managers'],
      color: 'from-green-500 to-emerald-500'
    }
  ];

  return (
    <section className={styles.useCases}>
      <div className="container">
        <div className={styles.sectionHeader}>
          <Heading as="h2" className={styles.sectionTitle}>
            Build Anything You Can Imagine
          </Heading>
          <p className={styles.sectionSubtitle}>
            From simple chatbots to complex autonomous systems
          </p>
        </div>
        
        <div className={styles.useCasesGrid}>
          {useCases.map((useCase, idx) => (
            <div key={idx} className={styles.useCaseCard}>
              <div className={styles.useCaseHeader}>
                <div className={styles.useCaseIcon}>{useCase.icon}</div>
                <h3 className={styles.useCaseTitle}>{useCase.title}</h3>
              </div>
              <p className={styles.useCaseDescription}>{useCase.description}</p>
              <div className={styles.useCaseExamples}>
                {useCase.examples.map((example, exIdx) => (
                  <span key={exIdx} className={styles.exampleTag}>
                    {example}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CodeExampleSection() {
  return (
    <section className={styles.codeExample}>
      <div className="container">
        <div className={styles.codeExampleContent}>
          <div className={styles.codeExampleText}>
            <Heading as="h2" className={styles.codeExampleTitle}>
              From Zero to Agent in Minutes
            </Heading>
            <p className={styles.codeExampleDescription}>
              Define your agent's personality, capabilities, and behavior with simple JSON configuration. 
              No complex setup, no boilerplate code.
            </p>
            <div className={styles.codeFeatures}>
              <div className={styles.codeFeature}>
                <span className={styles.codeFeatureIcon}>⚙️</span>
                <span>Declarative Configuration</span>
              </div>
              <div className={styles.codeFeature}>
                <span className={styles.codeFeatureIcon}>🔥</span>
                <span>Hot Reload Development</span>
              </div>
              <div className={styles.codeFeature}>
                <span className={styles.codeFeatureIcon}>📦</span>
                <span>TypeScript Support</span>
              </div>
            </div>
          </div>
          
          <div className={styles.codeWindow}>
            <div className={styles.codeWindowHeader}>
              <div className={styles.codeWindowButtons}>
                <span className={styles.codeWindowButton + ' ' + styles.red}></span>
                <span className={styles.codeWindowButton + ' ' + styles.yellow}></span>
                <span className={styles.codeWindowButton + ' ' + styles.green}></span>
              </div>
              <span className={styles.codeWindowTitle}>agent.config.json</span>
            </div>
            <div className={styles.codeWindowBody}>
              <pre className={styles.codeBlock}>
                <code>
{`{
  "id": "my-agent",
  "core": {
    "name": "Claude",
    "personality": "helpful and creative",
    "tone": "friendly but professional"
  },
  "psyche": {
    "traits": ["curious", "empathetic", "analytical"],
    "emotional_range": "dynamic",
    "memory_retention": "high"
  },
  "capabilities": {
    "cognition": "htn-planner",
    "memory": "supabase", 
    "emotion": "advanced-stack"
  },
  "extensions": [
    "discord-integration",
    "web-search",
    "code-analysis"
  ]
}`}
                </code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}



function CTASection() {
  return (
    <section className={styles.cta}>
      <div className="container">
        <div className={styles.ctaContent}>
          <div className={styles.ctaText}>
            <Heading as="h2" className={styles.ctaTitle}>
              Ready to Build the Future?
            </Heading>
            <p className={styles.ctaDescription}>
              Join thousands of developers creating intelligent agents with SYMindX. 
              Start building today and see what's possible.
            </p>
          </div>
          
          <div className={styles.ctaButtons}>
            <Link
              className={clsx("button", styles.ctaPrimaryButton)}
              to="/docs/getting-started/quick-start">
              Start Building Now
            </Link>
            <Link
              className={clsx("button", styles.ctaSecondaryButton)}
              href="https://discord.gg/symindx">
              Join Community
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home(): JSX.Element {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title} - The Future of AI Agents`}
      description="Build intelligent AI agents with consciousness, emotion, and personality. The most advanced modular agent framework for developers.">
      <main className={styles.main}>
        <HeroSection />
        <FeaturesSection />
        <UseCasesSection />
        <CodeExampleSection />
        <CTASection />
      </main>
    </Layout>
  );
}