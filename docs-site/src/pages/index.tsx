import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/getting-started/quick-start">
            🚀 Quick Start - 5min ⏱️
          </Link>
          <Link
            className="button button--outline button--secondary button--lg margin-left--md"
            to="/docs/introduction">
            📚 Documentation
          </Link>
        </div>
        
        <div className={styles.demoSection}>
          <div className={styles.codeExample}>
            <h3>Get Started in Seconds</h3>
            <pre className={styles.codeBlock}>
              <code>{`# Clone and install
git clone https://github.com/symindx/symindx.git
cd symindx && bun install

# Configure your first agent
cp config/runtime.example.json config/runtime.json

# Start building!
bun dev`}</code>
            </pre>
          </div>
        </div>
      </div>
    </header>
  );
}

function QuickStartSection() {
  return (
    <section className={styles.quickStart}>
      <div className="container">
        <div className="row">
          <div className="col col--6">
            <h2>🤖 Create Your First Agent</h2>
            <p>
              Build intelligent agents with personality, memory, and emotional intelligence 
              in just a few lines of configuration.
            </p>
            <pre className={styles.configExample}>
              <code>{`{
  "id": "my-agent",
  "core": {
    "name": "Assistant",
    "tone": "helpful and curious"
  },
  "psyche": {
    "traits": ["creative", "empathetic"],
    "defaults": {
      "memory": "sqlite",
      "emotion": "rune-emotion-stack",
      "cognition": "htn-planner"
    }
  },
  "modules": {
    "extensions": ["slack", "twitter"]
  }
}`}</code>
            </pre>
          </div>
          <div className="col col--6">
            <h2>⚡ Interact in Real-Time</h2>
            <p>
              Send messages, watch thoughts, monitor emotions, and see your agent 
              come to life through the web interface or API.
            </p>
            <div className={styles.apiExample}>
              <div className={styles.apiMethod}>POST</div>
              <code>/api/agents/my-agent/message</code>
              <pre className={styles.apiResponse}>
                <code>{`{
  "response": "Hello! I'm excited to help you today. What would you like to explore?",
  "emotion": {
    "current": "excited",
    "intensity": 0.8
  },
  "memories_formed": 1
}`}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function UseCasesSection() {
  const useCases = [
    {
      icon: '🎮',
      title: 'Gaming Automation',
      description: 'Intelligent game bots with personality and adaptive strategies',
      examples: ['RuneScape automation', 'Strategy game AI', 'Social gaming characters']
    },
    {
      icon: '💬',
      title: 'Chat & Social',
      description: 'Engaging conversational agents for communities and support',
      examples: ['Discord moderators', 'Slack assistants', 'Twitter personalities']
    },
    {
      icon: '🏢',
      title: 'Enterprise',
      description: 'Business automation with intelligent decision-making',
      examples: ['Customer support', 'Data analysis', 'Workflow automation']
    }
  ];

  return (
    <section className={styles.useCases}>
      <div className="container">
        <h2 className="text-center margin-bottom--lg">
          🌟 What Can You Build?
        </h2>
        <div className="row">
          {useCases.map((useCase, idx) => (
            <div key={idx} className="col col--4">
              <div className={styles.useCaseCard}>
                <div className={styles.useCaseIcon}>{useCase.icon}</div>
                <h3>{useCase.title}</h3>
                <p>{useCase.description}</p>
                <ul>
                  {useCase.examples.map((example, exIdx) => (
                    <li key={exIdx}>{example}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CommunitySection() {
  return (
    <section className={styles.community}>
      <div className="container">
        <div className="row">
          <div className="col col--8 col--offset-2 text-center">
            <h2>🤝 Join the SYMindX Community</h2>
            <p>
              Connect with developers building the future of AI agents. 
              Share ideas, get help, and contribute to the ecosystem.
            </p>
            <div className={styles.communityLinks}>
              <Link
                className="button button--primary button--lg margin--sm"
                href="https://discord.gg/symindx">
                💬 Discord Community
              </Link>
              <Link
                className="button button--outline button--primary button--lg margin--sm"
                href="https://github.com/symindx/symindx">
                ⭐ GitHub Repository
              </Link>
              <Link
                className="button button--outline button--primary button--lg margin--sm"
                href="https://twitter.com/symindx_ai">
                🐦 Follow Updates
              </Link>
            </div>
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
      title={`${siteConfig.title} - Modular AI Agent Framework`}
      description="Build intelligent, emotionally reactive AI agents that operate autonomously across games, web platforms, and social media with SYMindX.">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
        <QuickStartSection />
        <UseCasesSection />
        <CommunitySection />
      </main>
    </Layout>
  );
}