import * as styles from '../styles/privacy.css'
import Header from '../components/Header'

export default function PrivacyPage() {
  return (
    <div className={styles.page}>
      <div className={styles.gridOverlay} />
      <Header />

      <div className={styles.container}>
        <header className={styles.pageHeader}>
          <h1 className={styles.title}>Privacy policy</h1>
          <p className={styles.lastUpdated}>Last updated: February 2026</p>
        </header>

        <div className={styles.content}>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Information we collect</h2>
            <p className={styles.text}>
              We collect minimal data. Our website uses Vercel Analytics for anonymous usage statistics.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>How we use information</h2>
            <p className={styles.text}>
              To improve our tools and understand how they're used.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Third-party services</h2>
            <p className={styles.text}>
              Vercel (hosting), GitHub (code hosting), Supabase (database for experiment tracking)
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Open source</h2>
            <p className={styles.text}>
              All our code is open source at{' '}
              <a href="https://github.com/TheAxiomFoundation" target="_blank" rel="noopener noreferrer">
                github.com/TheAxiomFoundation
              </a>
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Contact</h2>
            <p className={styles.text}>
              For privacy questions, email{' '}
              <a href="mailto:hello@ruleatlas.org">hello@ruleatlas.org</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
