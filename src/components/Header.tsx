/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { 
  Search, 
  ChevronDown, 
  HelpCircle, 
  Menu, 
  X, 
  GraduationCap, 
  Settings, 
  ShieldAlert, 
  Compass, 
  BookOpen, 
  Layers, 
  Lightbulb, 
  MessageSquare,
  Globe,
  Briefcase
} from "lucide-react";
import { TRANSLATIONS } from "../translations";
import Logo from "./Logo";

interface HeaderProps {
  onNavigate: (sectionId: string) => void;
  onCourseLangToggle: (lang: "EN" | "ES") => void;
  currentCourseLang: "EN" | "ES";
  onActivatePortal: (portal: "student" | "teacher" | "admin" | null) => void;
  currentPortal: "student" | "teacher" | "admin" | null;
  onRegisterFree?: () => void;
  activeView?: string;
}

interface SearchItem {
  title: string;
  category: "Course" | "Methodology" | "Resource" | "School" | "Blog";
  description: string;
  targetId: string;
  type: "scroll" | "portal" | "register";
}

const getSearchDatabase = (lang: "EN" | "ES"): SearchItem[] => [
  {
    title: lang === "EN" ? "Beginner A1 Spanish" : "Español Principiante A1",
    category: "Course",
    description: lang === "EN" 
      ? "Learn foundational grammar, Ser & Estar fundamentals, and simple conversations." 
      : "Aprende gramática fundamental, fundamentos de Ser y Estar y conversaciones simples.",
    targetId: "courses",
    type: "scroll"
  },
  {
    title: lang === "EN" ? "Elementary A2 Spanish" : "Español Elemental A2",
    category: "Course",
    description: lang === "EN"
      ? "Expand vocabulary, discuss daily routines, and master past verb tenses."
      : "Amplía tu vocabulario, habla sobre rutinas diarias y domina los verbos en pasado.",
    targetId: "courses",
    type: "scroll"
  },
  {
    title: lang === "EN" ? "Intermediate B1 Spanish" : "Español Intermedio B1",
    category: "Course",
    description: lang === "EN"
      ? "Achieve self-sufficiency, master subjunctive moods, and flow in debates."
      : "Logra autosuficiencia, domina el modo subjuntivo y exprésate con fluidez en debates.",
    targetId: "courses",
    type: "scroll"
  },
  {
    title: lang === "EN" ? "Cognitive Metaphors Methodology" : "Metodología de Metáforas Cognitivas",
    category: "Methodology",
    description: lang === "EN"
      ? "Why we don't memorize grammar rules and instead use mental associations."
      : "Por qué no memorizamos reglas de gramática y preferimos usar la asociación mental.",
    targetId: "methodology",
    type: "scroll"
  },
  {
    title: lang === "EN" ? "Common Ser vs Estar Mistakes & Rules" : "Errores Comunes y Reglas de Ser y Estar",
    category: "Blog",
    description: lang === "EN"
      ? "Read our comprehensive guide to mastering the two Spanish 'to-be' verbs."
      : "Lee nuestra guía detallada para dominar los dos verbos equivalentes a 'to-be' en español.",
    targetId: "blog",
    type: "scroll"
  },
  {
    title: lang === "EN" ? "Spanish for Business & Professionals" : "Español para Empresas y Profesionales",
    category: "Course",
    description: lang === "EN"
      ? "Intensive training tailored for career communication, companies & corporate levels."
      : "Entrenamiento intensivo diseñado para la comunicación profesional y ejecutiva.",
    targetId: "courses",
    type: "scroll"
  },
  {
    title: lang === "EN" ? "Student Portal & Workspace" : "Portal del Estudiante y Espacio de Trabajo",
    category: "Resource",
    description: lang === "EN"
      ? "Access your class recordings, shared lesson notes, and mock tests."
      : "Accede a tus grabaciones de clases, notas de lecciones y exámenes de prueba.",
    targetId: "student",
    type: "portal"
  },
  {
    title: lang === "EN" ? "Teacher Dashboard Workspace" : "Espacio del Profesor",
    category: "Resource",
    description: lang === "EN"
      ? "Portal for instructors to manage files, upload recordings, and grade."
      : "Portal para instructores para gestionar archivos, subir grabaciones y calificar.",
    targetId: "teacher",
    type: "portal"
  },
  {
    title: lang === "EN" ? "Academy Hub & Contact Forms" : "Centro Académico y Formularios de Contacto",
    category: "School",
    description: lang === "EN"
      ? "Get in touch regarding physical classrooms in Spain, schedules, or pricing."
      : "Ponte en contacto para clases presenciales en España, horarios o precios.",
    targetId: "contact",
    type: "scroll"
  },
  {
    title: lang === "EN" ? "Free trial 30-minute evaluation" : "Prueba gratis: Evaluación de 30 minutos",
    category: "Resource",
    description: lang === "EN"
      ? "Book a diagnostic session with a senior tutor to analyze your Spanish skills."
      : "Reserva una sesión de diagnóstico gratuito con un tutor senior para evaluar tus habilidades.",
    targetId: "register-free",
    type: "register"
  }
];

export default function Header({
  onNavigate,
  onCourseLangToggle,
  currentCourseLang,
  onActivatePortal,
  currentPortal,
  onRegisterFree,
  activeView
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Interactive Custom Dropdowns
  const [moreOpen, setMoreOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  
  // Live Search States
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);

  const moreMenuRef = useRef<HTMLDivElement>(null);
  const signInMenuRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter Search Action
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    if (!value.trim()) {
      setSearchResults([]);
      return;
    }

    const filtered = getSearchDatabase(currentCourseLang).filter(item => 
      item.title.toLowerCase().includes(value.toLowerCase()) ||
      item.category.toLowerCase().includes(value.toLowerCase()) ||
      item.description.toLowerCase().includes(value.toLowerCase())
    );
    setSearchResults(filtered);
  };

  // Select Search result item
  const handleSearchResultClick = (item: SearchItem) => {
    setSearchQuery("");
    setSearchResults([]);
    setSearchFocused(false);
    setSearchExpanded(false);
    
    if (item.type === "scroll") {
      onActivatePortal(null);
      onNavigate(item.targetId);
    } else if (item.type === "portal") {
      onActivatePortal(item.targetId as "student" | "teacher" | "admin");
    } else if (item.type === "register") {
      if (onRegisterFree) onRegisterFree();
    }
  };

  // Close dropdowns on outside mouse click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setMoreOpen(false);
      }
      if (signInMenuRef.current && !signInMenuRef.current.contains(event.target as Node)) {
        setSignInOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setSearchFocused(false);
        if (!searchQuery.trim()) {
          setSearchExpanded(false);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchQuery]);

  const handleLinkClick = (sectionId: string) => {
    onActivatePortal(null); // Back to public view
    onNavigate(sectionId);
    setMobileMenuOpen(false);
    setMoreOpen(false);
    setSearchExpanded(false);
    setSearchFocused(false);
  };

  const t = TRANSLATIONS[currentCourseLang];

  return (
    <header className="navbar">
      <div className="navbar-inner">
        
        {/* Left: Brand Logo & Title */}
        <button
          id="brand-logo-btn"
          onClick={() => handleLinkClick("home")}
          className="brand group focus:outline-none text-left cursor-pointer"
          aria-label="Iniciativa Ser o Estar Home"
        >
          <Logo size={46} showText={false} className="group-hover:scale-105 transition-transform duration-300" />
          <div className="flex flex-col leading-[1.05]">
            <span className="text-[13px] md:text-[15px] font-[800] tracking-[0.08em] text-[#0b132b] uppercase font-display">
              Iniciativa
            </span>
            <span className="text-[17px] md:text-[19px] font-[800] text-[#0b132b] font-display">
              Ser o Estar
            </span>
          </div>
        </button>

        {/* Center: Desktop Persistent Navigation Links */}
        <nav className="nav-links">
          <button
            onClick={() => handleLinkClick("courses")}
            className={`relative group transition-colors duration-250 cursor-pointer select-none whitespace-nowrap py-1 ${
              activeView === "courses" ? "text-[#ff5a1f]" : "text-[#26324a] hover:text-[#ff5a1f]"
            }`}
          >
            {currentCourseLang === "EN" ? "Courses" : "Cursos"}
            <span className={`absolute bottom-[-5px] left-0 h-[3px] bg-[#ff5a1f] rounded-full transition-all duration-250 ${
              activeView === "courses" ? "w-full" : "w-0 group-hover:w-full"
            }`} />
          </button>
          
          <button
            onClick={() => handleLinkClick("methodology")}
            className={`relative group transition-colors duration-250 cursor-pointer select-none whitespace-nowrap py-1 ${
              activeView === "methodology" ? "text-[#ff5a1f]" : "text-[#26324a] hover:text-[#ff5a1f]"
            }`}
          >
            {currentCourseLang === "EN" ? "Methodology" : "Metodología"}
            <span className={`absolute bottom-[-5px] left-0 h-[3px] bg-[#ff5a1f] rounded-full transition-all duration-250 ${
              activeView === "methodology" ? "w-full" : "w-0 group-hover:w-full"
            }`} />
          </button>

          <div className="relative" ref={moreMenuRef}>
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              className={`relative group transition-colors duration-250 cursor-pointer select-none whitespace-nowrap py-1 inline-flex items-center gap-1.5 ${
                ["blog", "about", "contact"].includes(activeView || "") || moreOpen ? "text-[#ff5a1f]" : "text-[#26324a] hover:text-[#ff5a1f]"
              }`}
              aria-expanded={moreOpen}
              aria-haspopup="menu"
            >
              {currentCourseLang === "EN" ? "More" : "Más"}
              <ChevronDown size={15} className={`transition-transform ${moreOpen ? "rotate-180" : ""}`} />
              <span className={`absolute bottom-[-5px] left-0 h-[3px] bg-[#ff5a1f] rounded-full transition-all duration-250 ${
                ["blog", "about", "contact"].includes(activeView || "") || moreOpen ? "w-full" : "w-0 group-hover:w-full"
              }`} />
            </button>

            {moreOpen && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-4 w-56 bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-900/12 p-2 z-[1200]" role="menu">
                {[
                  { id: "blog", label: currentCourseLang === "EN" ? "Blog" : "Blog", desc: currentCourseLang === "EN" ? "Language insights" : "Ideas de idioma" },
                  { id: "about", label: currentCourseLang === "EN" ? "About Us" : "Sobre Nosotros", desc: currentCourseLang === "EN" ? "Our story" : "Nuestra historia" },
                  { id: "contact", label: currentCourseLang === "EN" ? "Contact" : "Contacto", desc: currentCourseLang === "EN" ? "Ask a question" : "Haz una pregunta" }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleLinkClick(item.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl transition cursor-pointer ${
                      activeView === item.id ? "bg-orange-50 text-orange-700" : "hover:bg-slate-50 text-slate-800"
                    }`}
                    role="menuitem"
                  >
                    <span className="block text-sm font-black">{item.label}</span>
                    <span className="block text-[10px] text-slate-500 font-medium mt-0.5">{item.desc}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Right Actions: Search, Lang switcher, Sign-in, Register */}
        <div className="nav-actions">
          {/* Search Box */}
          <div className={`search-box-container ${searchExpanded ? "expanded" : ""}`} ref={searchContainerRef}>
            <div className="relative flex items-center h-full">
              <button
                type="button"
                onClick={() => {
                  setSearchExpanded(true);
                  setSearchFocused(true);
                  window.setTimeout(() => searchInputRef.current?.focus(), 0);
                }}
                className="search-icon-button"
                aria-label={currentCourseLang === "EN" ? "Open search" : "Abrir búsqueda"}
              >
                <Search size={18} />
              </button>

              {searchExpanded && (
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onFocus={() => setSearchFocused(true)}
                  placeholder={currentCourseLang === "EN" ? "Search..." : "Buscar..."}
                  id="navbar-interactive-search"
                  className="search-box"
                  aria-label="Search courses or articles"
                />
              )}

              {searchExpanded && searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSearchResults([]);
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-[12px] text-[#7b879d] hover:text-[#26324a] focus:outline-none cursor-pointer"
                  aria-label="Clear search query"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Live Search Floating Results Container */}
            {searchFocused && (searchQuery.trim().length > 0 || searchResults.length > 0) && (
              <div className="absolute top-[54px] right-0 w-[320px] max-h-96 overflow-y-auto bg-white rounded-xl shadow-2xl border border-slate-150 z-50 py-1.5 divide-y divide-slate-100">
                {searchResults.length > 0 ? (
                  searchResults.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => handleSearchResultClick(item)}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 transition flex flex-col cursor-pointer"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-800">{item.title}</span>
                        <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {item.category === "Course" && currentCourseLang === "ES" ? "Curso" : item.category}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 mt-1 leading-normal">
                        {item.description}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-5 text-center text-slate-500 text-xs">
                    {t.searchNoMatches} <span className="font-bold">"{searchQuery}"</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Language Switcher */}
          <div className="language-switch">
            <button
              onClick={() => onCourseLangToggle("EN")}
              className={`cursor-pointer ${currentCourseLang === "EN" ? "active" : ""}`}
            >
              EN
            </button>
            <button
              onClick={() => onCourseLangToggle("ES")}
              className={`cursor-pointer ${currentCourseLang === "ES" ? "active" : ""}`}
            >
              ES
            </button>
          </div>

          {/* Sign In Dropdown */}
          <div className="relative shrink-0" ref={signInMenuRef}>
            <button
              onClick={() => setSignInOpen(!signInOpen)}
              className={`sign-in ${signInOpen ? "text-[#ff5a1f]" : ""}`}
              aria-expanded={signInOpen}
              aria-haspopup="menu"
            >
              {t.navSignIn}
            </button>

            {signInOpen && (
              <div className="absolute right-0 top-full mt-3 w-[320px] bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-900/12 p-3 z-[1200]" role="menu">
                <div className="px-3 py-2 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {currentCourseLang === "EN" ? "Sign In Workspace" : "Espacio de Acceso"}
                </div>
                
                <button
                  onClick={() => {
                    onActivatePortal("student");
                    setSignInOpen(false);
                  }}
                  className="w-full text-left px-3 py-3 hover:bg-teal-50 rounded-xl transition flex items-center space-x-3 mt-2 cursor-pointer"
                  role="menuitem"
                >
                  <div className="bg-teal-50 text-teal-600 p-2 rounded-lg">
                    <GraduationCap size={17} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{t.navStudent}</p>
                    <p className="text-[11px] text-slate-500">{currentCourseLang === "EN" ? "Review class notes, lessons, and live classes" : "Repasar notas, lecciones y clases en vivo"}</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    onActivatePortal("teacher");
                    setSignInOpen(false);
                  }}
                  className="w-full text-left px-3 py-3 hover:bg-slate-50 rounded-xl transition flex items-center space-x-3 mt-1 cursor-pointer"
                  role="menuitem"
                >
                  <div className="bg-slate-100 text-slate-700 p-2 rounded-lg">
                    <Settings size={17} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{t.navTeacher}</p>
                    <p className="text-[11px] text-slate-500">{currentCourseLang === "EN" ? "Start live classes and manage content" : "Iniciar clases en vivo y gestionar contenido"}</p>
                  </div>
                </button>

                {currentPortal && (
                  <button
                    onClick={() => {
                      onActivatePortal(null);
                      setSignInOpen(false);
                    }}
                    className="w-full mt-2 py-1.5 hover:bg-slate-100 rounded text-center text-xs font-bold text-red-500 transition border border-dashed border-red-200 cursor-pointer"
                  >
                    {t.navLogOutActive}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Register Button */}
          <button
            onClick={onRegisterFree}
            className="register-btn"
          >
            {t.navRegister}
          </button>
        </div>

        {/* Mobile menu toggler button */}
        <div className="hidden lg:hidden menu-toggle items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-11 h-11 bg-[#0b132b] text-white flex items-center justify-center rounded-[12px] cursor-pointer hover:bg-[#121c3b] active:scale-95 transition-all"
            aria-label="Toggle navigation drawer"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

      </div>

      {/* Mobile Menu Dropdown Panel */}
      {mobileMenuOpen && (
        <div className="absolute top-[92px] left-0 right-0 bg-white border-b border-slate-200 shadow-xl py-6 px-4 space-y-6 lg:hidden z-50">
          
          {/* Mobile Search */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder={currentCourseLang === "EN" ? "Search courses..." : "Buscar cursos..."}
              className="w-full bg-[#f7f9fc] border border-slate-200 pl-4 pr-10 py-3 rounded-xl text-sm select-text outline-none focus:border-[#ff5a1f]"
            />
            <Search className="absolute right-3.5 top-3.5 text-[#7b879d]" size={16} />

            {/* Mobile search list */}
            {searchQuery.trim().length > 0 && (
              <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white rounded-xl shadow-lg border border-slate-200 z-50 divide-y divide-slate-100">
                {searchResults.map((item, id) => (
                  <button
                    key={id}
                    onClick={() => {
                      handleSearchResultClick(item);
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 transition text-xs block cursor-pointer"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800">{item.title}</span>
                      <span className="text-[9px] px-1 bg-slate-100 rounded text-slate-500 font-mono uppercase">{item.category}</span>
                    </div>
                  </button>
                ))}
                {searchResults.length === 0 && (
                  <div className="px-4 py-3 text-center text-slate-500 text-xs">
                    No courses found matching "{searchQuery}".
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile Links */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold text-[#7b879d] uppercase tracking-widest px-2">
              {currentCourseLang === "EN" ? "Academy Sections" : "Secciones Académicas"}
            </span>
            
            <button 
              onClick={() => handleLinkClick("courses")} 
              className={`w-full text-left px-4 py-3 text-sm font-bold rounded-xl transition-colors cursor-pointer ${
                activeView === "courses" ? "text-[#ff5a1f] bg-[#ff5a1f]/5" : "text-[#26324a] hover:bg-slate-50"
              }`}
            >
              🎓 {currentCourseLang === "EN" ? "Courses" : "Cursos"}
            </button>

            <button 
              onClick={() => handleLinkClick("methodology")} 
              className={`w-full text-left px-4 py-3 text-sm font-bold rounded-xl transition-colors cursor-pointer ${
                activeView === "methodology" ? "text-[#ff5a1f] bg-[#ff5a1f]/5" : "text-[#26324a] hover:bg-slate-50"
              }`}
            >
              🧠 {currentCourseLang === "EN" ? "Methodology" : "Metodología"}
            </button>

            <button 
              onClick={() => handleLinkClick("blog")} 
              className={`w-full text-left px-4 py-3 text-sm font-bold rounded-xl transition-colors cursor-pointer ${
                activeView === "blog" ? "text-[#ff5a1f] bg-[#ff5a1f]/5" : "text-[#26324a] hover:bg-slate-50"
              }`}
            >
              📰 {currentCourseLang === "EN" ? "Blog" : "Blog"}
            </button>

            <button 
              onClick={() => handleLinkClick("about")} 
              className={`w-full text-left px-4 py-3 text-sm font-bold rounded-xl transition-colors cursor-pointer ${
                activeView === "about" ? "text-[#ff5a1f] bg-[#ff5a1f]/5" : "text-[#26324a] hover:bg-slate-50"
              }`}
            >
              ℹ️ {currentCourseLang === "EN" ? "About Us" : "Sobre Nosotros"}
            </button>

            <button 
              onClick={() => handleLinkClick("contact")} 
              className={`w-full text-left px-4 py-3 text-sm font-bold rounded-xl transition-colors cursor-pointer ${
                activeView === "contact" ? "text-[#ff5a1f] bg-[#ff5a1f]/5" : "text-[#26324a] hover:bg-slate-50"
              }`}
            >
              📞 {currentCourseLang === "EN" ? "Contact" : "Contacto"}
            </button>
          </div>

          {/* Mobile Portals / Log In */}
          <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
            <span className="text-[10px] font-bold text-[#7b879d] uppercase tracking-widest px-2">
              {currentCourseLang === "EN" ? "Access Portal Workspaces" : "Acceder a Portales"}
            </span>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  onActivatePortal("student");
                  setMobileMenuOpen(false);
                }}
                className={`py-3 px-2 text-xs font-bold text-center rounded-xl transition cursor-pointer ${
                  currentPortal === "student" ? "bg-teal-600 text-white" : "bg-[#f7f9fc] text-slate-700 border border-slate-100"
                }`}
              >
                🎓 {t.navStudent}
              </button>
              <button
                onClick={() => {
                  onActivatePortal("teacher");
                  setMobileMenuOpen(false);
                }}
                className={`py-3 px-2 text-xs font-bold text-center rounded-xl transition cursor-pointer ${
                  currentPortal === "teacher" ? "bg-[#0b132b] text-white" : "bg-[#f7f9fc] text-slate-700 border border-[#e6eaf2]"
                }`}
              >
                🏫 {t.navTeacher}
              </button>
            </div>
          </div>

          {/* Mobile Action Actions */}
          <div className="pt-4 border-t border-slate-100 flex flex-col gap-4">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                if (onRegisterFree) onRegisterFree();
              }}
              className="w-full bg-[#ff5a1f] hover:bg-[#e64a12] text-white text-center py-3.5 rounded-full font-bold text-sm tracking-wide shadow-lg cursor-pointer"
            >
              {t.navRegister}
            </button>

            <div className="flex justify-between items-center px-2 py-1 text-[#7b879d] text-xs font-bold">
              <span>{currentCourseLang === "EN" ? "Preferred Language:" : "Idioma Preferido:"}</span>
              <div className="flex gap-3">
                <button 
                  onClick={() => onCourseLangToggle("EN")} 
                  className={`cursor-pointer ${currentCourseLang === "EN" ? "text-[#ff5a1f]" : "hover:text-[#26324a]"}`}
                >
                  English
                </button>
                <span>|</span>
                <button 
                  onClick={() => onCourseLangToggle("ES")} 
                  className={`cursor-pointer ${currentCourseLang === "ES" ? "text-[#ff5a1f]" : "hover:text-[#26324a]"}`}
                >
                  Español
                </button>
              </div>
            </div>
          </div>

        </div>
      )}

    </header>
  );
}
