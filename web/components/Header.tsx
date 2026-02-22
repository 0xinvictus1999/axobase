'use client';

import Link from 'next/link';
import { useI18n, LanguageSwitcher } from './I18nProvider';

/**
 * Main navigation header with language switcher
 */
export function Header() {
  const { t } = useI18n();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur border-b border-slate-800">
      {/* Testnet Banner */}
      <div className="bg-yellow-500/90 text-black text-center py-1 text-xs font-bold">
        ⚠️ {t('common.testnet')} - Base Sepolia
      </div>
      
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-lg" />
            <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              FeralLobster
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-slate-300 hover:text-white transition-colors">
              {t('nav.home')}
            </Link>
            <Link href="/observatory" className="text-slate-300 hover:text-white transition-colors">
              {t('nav.observatory')}
            </Link>
            <Link href="/release" className="text-slate-300 hover:text-white transition-colors">
              {t('nav.release')}
            </Link>
            <a 
              href="https://github.com/0xinvictus1999/FeralLobster"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-300 hover:text-white transition-colors"
            >
              {t('nav.github')}
            </a>
          </nav>

          {/* Language Switcher */}
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
