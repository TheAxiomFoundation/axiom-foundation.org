import * as styles from '../styles/about.css'
import Header from '../components/Header'
import { CheckIcon } from '../components/Icons'

export default function AboutPage() {
  return (
    <div className={styles.page}>
      <div className={styles.bgGrid} />
      <Header variant="landing" />

      <div className={styles.container}>
        <header className={styles.pageHeader}>
          <h1 className={styles.title}>About Rule Axiom</h1>
          <p className={styles.subtitle}>
            Open infrastructure for encoded law. We build machine-readable encodings of statutes, regulations,
            and policy rules to serve as ground truth for AI systems.
          </p>
        </header>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Our mission</h2>
          <p className={styles.sectionText}>
            Rule Axiom builds open infrastructure for encoded law. Our mission is to make legal rules
            machine-readable, verifiable, and accessible to everyone. We're a fiscally sponsored project
            of the <a href="https://psl-foundation.org" target="_blank" rel="noopener noreferrer">PSL Foundation</a>.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>What we do</h2>
          <div className={styles.grid}>
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Axiom</h3>
              <p className={styles.cardText}>
                Archive of legal source documents — 53 USC titles, 570+ IRS guidance documents, and 48 states.
                The foundation for all encoding work.
              </p>
            </div>

            <div className={styles.card}>
              <h3 className={styles.cardTitle}>RuleSpec</h3>
              <p className={styles.cardText}>
                RuleSpec DSL for encoding statutes with citations, temporal versioning, and tests.
                Purpose-built for legal encoding.
              </p>
            </div>

            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Encoder</h3>
              <p className={styles.cardText}>
                AI-powered encoding pipeline with 3-tier validation. Automated statute encoding with
                CI testing, oracle validation, and LLM review.
              </p>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Team</h2>
          <div className={styles.founder}>
            <img
              src="https://maxghenis.com/images/headshot.png"
              alt="Max Ghenis"
              className={styles.founderPhoto}
            />
            <div className={styles.founderInfo}>
              <p className={styles.sectionText}>
                Rule Axiom is led by{' '}
                <a href="https://maxghenis.com" target="_blank" rel="noopener noreferrer">Max Ghenis</a>,
                who also founded PolicyEngine. We're an open-source community project and welcome contributors
                from all backgrounds — developers, policy experts, legal researchers, and anyone passionate
                about making rules more transparent and accessible.
              </p>
              <div className={styles.linkBox}>
                <CheckIcon className={styles.checkIcon} />
                <span>
                  Join us on{' '}
                  <a href="https://github.com/TheAxiomFoundation" className={styles.link}>
                    github.com/TheAxiomFoundation
                  </a>
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Contact</h2>
          <p className={styles.sectionText}>
            Have questions or want to get involved? We'd love to hear from you.
          </p>
          <div className={styles.contactBox}>
            <a href="mailto:hello@axiom-foundation.org" className={styles.contactLink}>
              hello@axiom-foundation.org
            </a>
          </div>
        </section>
      </div>
    </div>
  )
}
