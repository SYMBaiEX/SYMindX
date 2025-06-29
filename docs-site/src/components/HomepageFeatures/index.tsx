import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  emoji: string;
  description: JSX.Element;
  link?: string;
};

const FeatureList: FeatureItem[] = [
  {
    title: '🧩 Modular Architecture',
    emoji: '🧩',
    description: (
      <>
        Composable memory, emotion, and cognition systems that can be mixed and matched.
        Build agents with SQLite or Supabase memory, RuneScape-style emotions, and HTN planning.
      </>
    ),
    link: '/docs/architecture/overview'
  },
  {
    title: '🎭 Emotional Intelligence',
    emoji: '🎭',
    description: (
      <>
        Dynamic emotion system inspired by RuneScape. Agents experience emotions like excitement,
        frustration, and focus that influence their behavior and responses.
      </>
    ),
    link: '/docs/modules/emotion/overview'
  },
  {
    title: '🧠 Advanced Memory',
    emoji: '🧠',
    description: (
      <>
        RAG-powered memory with vector search capabilities. Agents remember conversations,
        learn from interactions, and make context-aware decisions.
      </>
    ),
    link: '/docs/modules/memory/overview'
  },
  {
    title: '🔌 Rich Extensions',
    emoji: '🔌',
    description: (
      <>
        Built-in integrations for Slack, Discord, Twitter, RuneLite, and more.
        Easy plugin system for building custom extensions.
      </>
    ),
    link: '/docs/extensions/overview'
  },
  {
    title: '⚡ High Performance',
    emoji: '⚡',
    description: (
      <>
        Built with TypeScript, Bun, and modern web technologies. Event-driven architecture
        ensures real-time responsiveness and scalability.
      </>
    ),
    link: '/docs/architecture/overview'
  },
  {
    title: '🌐 Multi-Platform',
    emoji: '🌐',
    description: (
      <>
        Deploy agents across games, social media, chat platforms, and web applications.
        Unified API for consistent behavior everywhere.
      </>
    ),
    link: '/docs/deployment/overview'
  },
];

function Feature({title, emoji, description, link}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="feature-card">
        <div className="text-center">
          <span className="feature-icon">{emoji}</span>
          <Heading as="h3" className="feature-title">{title}</Heading>
        </div>
        <div className="feature-description">
          <p>{description}</p>
          {link && (
            <a href={link} className="button button--primary button--sm">
              Learn More →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): JSX.Element {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}