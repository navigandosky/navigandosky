import { Outlet, Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { Menu, X, Globe } from "lucide-react";
import { useLanguage } from "../hooks/useLanguage";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_5ab32c84-76f1-4a2b-a9a5-9ab0c1424cd8/artifacts/70h8z9e6_Logo%20firma%20Spoke2%20completo.png";

const translations = {
  it: {
    exhibitions: "Le Mostre",
    costumes: "Archivio Costumi",
    project: "Il Progetto"
  },
  en: {
    exhibitions: "Exhibitions",
    costumes: "Costumes Archive",
    project: "The Project"
  },
  fr: {
    exhibitions: "Expositions",
    costumes: "Archives Costumes",
    project: "Le Projet"
  },
  de: {
    exhibitions: "Ausstellungen",
    costumes: "Kostümarchiv",
    project: "Das Projekt"
  }
};

const languages = [
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" }
];

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { language, setLanguage } = useLanguage();
  const location = useLocation();
  const t = translations[language];

  const navLinks = [
    { to: "/exhibitions", label: t.exhibitions },
    { to: "/costumes", label: t.costumes },
    { to: "/project", label: t.project }
  ];

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-[#E5E0D8]">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3" data-testid="home-link">
              <span className="font-serif text-2xl font-semibold text-[#2A2A2A]">
                Spoke Galaveras
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  data-testid={`nav-${link.to.replace("/", "")}`}
                  className={`font-sans text-sm tracking-wide transition-colors duration-200 ${
                    isActive(link.to)
                      ? "text-[#C5A059] font-medium"
                      : "text-[#666058] hover:text-[#C5A059]"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Right side - Language + Mobile Menu */}
            <div className="flex items-center gap-4">
              {/* Language Selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex items-center gap-2 text-[#666058] hover:text-[#C5A059]"
                    data-testid="language-selector"
                  >
                    <Globe className="w-4 h-4" />
                    <span className="uppercase font-mono text-xs">{language}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white border-[#E5E0D8]">
                  {languages.map((lang) => (
                    <DropdownMenuItem
                      key={lang.code}
                      onClick={() => setLanguage(lang.code)}
                      className={`cursor-pointer ${language === lang.code ? "bg-[#F2F0EB]" : ""}`}
                      data-testid={`lang-${lang.code}`}
                    >
                      <span className="mr-2">{lang.flag}</span>
                      {lang.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile Menu Toggle */}
              <button
                className="md:hidden p-2 text-[#2A2A2A]"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                data-testid="mobile-menu-toggle"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-[#E5E0D8] bg-white">
            <div className="px-6 py-4 space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block py-2 font-sans text-base ${
                    isActive(link.to)
                      ? "text-[#C5A059] font-medium"
                      : "text-[#666058]"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-[#1A1918] text-[#F9F8F6] py-16">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div>
              <h3 className="font-serif text-xl mb-4">Spoke Galaveras</h3>
              <p className="font-sans text-sm text-[#F9F8F6]/70 leading-relaxed">
                Digital Twin delle mostre e archivio costumi tradizionali sardi.
                Un viaggio virtuale nell'arte del ricamo.
              </p>
            </div>
            <div>
              <h3 className="font-serif text-xl mb-4">Navigazione</h3>
              <ul className="space-y-2">
                {navLinks.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="font-sans text-sm text-[#F9F8F6]/70 hover:text-[#C5A059] transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-serif text-xl mb-4">Admin</h3>
              <Link
                to="/admin"
                className="font-sans text-sm text-[#F9F8F6]/70 hover:text-[#C5A059] transition-colors"
                data-testid="admin-link"
              >
                Pannello Amministrazione
              </Link>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-[#F9F8F6]/10 text-center">
            <p className="font-sans text-xs text-[#F9F8F6]/50">
              © {new Date().getFullYear()} Spoke Galaveras. Tutti i diritti riservati.
            </p>
          </div>
        </div>
      </footer>

      {/* Fixed Logo */}
      <div className="logo-fixed">
        <img 
          src={LOGO_URL} 
          alt="Spoke Logo" 
          className="h-12 w-auto"
        />
      </div>

      {/* Trivor Copyright */}
      <div className="fixed bottom-4 left-4 z-40">
        <p className="font-sans text-xs text-[#666058]/70">
          Realizzato da Trivor srl ©
        </p>
      </div>
    </div>
  );
}
