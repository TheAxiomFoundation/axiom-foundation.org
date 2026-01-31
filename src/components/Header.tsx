import { Link, useLocation } from 'react-router-dom'
import * as styles from './Header.css'
import { GitHubIcon } from './Icons'

interface HeaderProps {
  variant?: 'landing' | 'lab'
}

export default function Header({ variant = 'landing' }: HeaderProps) {
  const location = useLocation()
  const isLab = location.pathname === '/lab'

  // On lab page, use Link for internal navigation; on landing, use anchor links
  const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => {
    const isActive = href === '/lab' && isLab

    if (href.startsWith('/')) {
      return (
        <Link to={href} className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}>
          {children}
        </Link>
      )
    }

    // For anchor links on lab page, link back to landing page with hash
    if (variant === 'lab' && href.startsWith('#')) {
      return (
        <Link to={`/${href}`} className={styles.navLink}>
          {children}
        </Link>
      )
    }

    return (
      <a href={href} className={styles.navLink}>
        {children}
      </a>
    )
  }

  return (
    <header className={styles.header}>
      <div className={styles.headerContent}>
        <Link to="/" className={styles.logo}>
          <img src="/logos/rules-foundation.svg" alt="Rules Foundation" className={styles.logoImage} />
        </Link>
        <nav className={styles.nav}>
          <NavLink href="#about">About</NavLink>
          <NavLink href="#format">.rac</NavLink>
          <NavLink href="#autorac">AutoRAC</NavLink>
          <NavLink href="/lab">Lab</NavLink>
          <NavLink href="#spec">Spec</NavLink>
          <a href="https://github.com/rules-foundation" className={styles.navLink} target="_blank" rel="noopener noreferrer">
            <GitHubIcon className={styles.icon} />
          </a>
        </nav>
      </div>
    </header>
  )
}
