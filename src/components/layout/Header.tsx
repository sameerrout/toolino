'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Menu, X } from 'lucide-react';
import { Logo } from './Logo';
import { CATEGORY_META, CATEGORY_ORDER } from '@/data/categories';
import { getToolsByCategory } from '@/data/toolRegistry';
import { toolPath } from '@/lib/tools';

/**
 * Toolnova Header Navigation.
 *
 * Official Toolnova clean white navbar with blue-600 accents,
 * clear typography, category dropdown, and mobile navigation drawer.
 */
export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toolsDropdownOpen, setToolsDropdownOpen] = useState(false);
  const [user, setUser] = useState<{ email: string; name: string; isManager: boolean; picture?: string } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch current user authentication status
  useEffect(() => {
    fetch('/api/auth/me/')
      .then((res) => res.json())
      .then((data) => {
        if (data?.authenticated && data?.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      })
      .catch(() => setUser(null));
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout/', { method: 'POST' });
      setUser(null);
      window.location.href = '/';
    } catch {
      window.location.reload();
    }
  };

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setToolsDropdownOpen(false);
  }, [pathname]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setToolsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200/80 shadow-xs">
      <div className="w-full px-4 sm:px-6 py-3 flex justify-between items-center max-w-7xl mx-auto">
        {/* Logo */}
        <Link href="/" className="flex items-center cursor-pointer group">
          <Logo />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6 text-slate-600 font-medium text-sm">
          <Link
            href="/"
            className={`transition ${pathname === '/' ? 'text-blue-600 font-semibold' : 'hover:text-blue-600'}`}
          >
            Home
          </Link>

          {/* Tools Mega-Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setToolsDropdownOpen((prev) => !prev)}
              className="flex items-center gap-1 hover:text-blue-600 transition cursor-pointer font-medium"
              aria-expanded={toolsDropdownOpen}
            >
              <span>All Tools</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${
                  toolsDropdownOpen ? 'rotate-180 text-blue-600' : 'text-slate-400'
                }`}
              />
            </button>

            {toolsDropdownOpen && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-[48rem] rounded-2xl border border-slate-200 bg-white p-5 shadow-xl grid grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-2 duration-150 z-50">
                {CATEGORY_ORDER.map((slug) => {
                  const meta = CATEGORY_META[slug];
                  const tools = getToolsByCategory(slug);
                  return (
                    <div key={slug} className="space-y-2">
                      <Link
                        href={`/tools/${slug}/`}
                        onClick={() => setToolsDropdownOpen(false)}
                        className="text-xs font-bold uppercase tracking-wider text-blue-600 hover:text-blue-700"
                      >
                        {meta.navLabel}
                      </Link>
                      <ul className="space-y-1">
                        {tools.slice(0, 6).map((tool) => (
                          <li key={tool.slug}>
                            <Link
                              href={toolPath(tool.slug)}
                              onClick={() => setToolsDropdownOpen(false)}
                              className="block py-1 text-xs text-slate-600 hover:text-blue-600 hover:translate-x-0.5 transition-all truncate"
                            >
                              {tool.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Link
            href="/tools/create-zip/"
            className={`transition ${pathname.includes('create-zip') ? 'text-blue-600 font-semibold' : 'hover:text-blue-600'}`}
          >
            ZIP Converter
          </Link>

          <Link
            href="/blog/"
            className={`transition ${pathname.startsWith('/blog') ? 'text-blue-600 font-semibold' : 'hover:text-blue-600'}`}
          >
            Guides
          </Link>

          <Link
            href="/about/"
            className={`transition ${pathname === '/about/' ? 'text-blue-600 font-semibold' : 'hover:text-blue-600'}`}
          >
            About
          </Link>
        </nav>

        {/* Right Action / Auth Controls */}
        <div className="hidden lg:flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              {user.isManager && (
                <Link
                  href="/manager/"
                  className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 text-xs font-semibold border border-amber-200 transition shadow-2xs"
                >
                  Manager
                </Link>
              )}
              <span className="text-xs font-medium text-slate-700 truncate max-w-[140px]">
                {user.name}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="text-xs font-medium text-slate-500 hover:text-red-600 transition"
              >
                Log Out
              </button>
            </div>
          ) : (
            <>
              <Link
                href="/signup/"
                className="text-xs font-semibold text-slate-700 hover:text-blue-600 transition px-2 py-1.5"
              >
                Sign Up
              </Link>
              <Link
                href="/signin/"
                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition text-xs font-semibold shadow-xs"
              >
                Sign In
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu trigger */}
        <div className="flex md:hidden items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="p-2 text-slate-600 hover:text-slate-900 rounded-lg border border-slate-200"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white px-6 py-4 space-y-3 shadow-md animate-in fade-in duration-150">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium text-slate-700 hover:text-blue-600 py-1"
          >
            Home
          </Link>
          <Link
            href="/tools/"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium text-slate-700 hover:text-blue-600 py-1"
          >
            All Tools
          </Link>
          <Link
            href="/tools/create-zip/"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium text-slate-700 hover:text-blue-600 py-1"
          >
            ZIP Converter
          </Link>
          <Link
            href="/blog/"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium text-slate-700 hover:text-blue-600 py-1"
          >
            Guides
          </Link>
          <Link
            href="/about/"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium text-slate-700 hover:text-blue-600 py-1"
          >
            About Us
          </Link>
          <Link
            href="/contact/"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium text-slate-700 hover:text-blue-600 py-1"
          >
            Contact
          </Link>

          {/* Auth options in mobile drawer */}
          {user ? (
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="text-xs text-slate-500 font-medium px-1">
                Signed in as <strong className="text-slate-800">{user.email}</strong>
              </div>
              {user.isManager && (
                <Link
                  href="/manager/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-sm font-semibold text-amber-700 hover:text-amber-800 py-1"
                >
                  Manager
                </Link>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="block text-sm font-medium text-red-600 hover:text-red-700 py-1"
              >
                Log Out
              </button>
            </div>
          ) : (
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <Link
                href="/signup/"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-sm font-medium text-slate-700 hover:text-blue-600 py-1"
              >
                Sign Up
              </Link>
              <Link
                href="/signin/"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-sm font-semibold text-blue-600 hover:text-blue-700 py-1"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
