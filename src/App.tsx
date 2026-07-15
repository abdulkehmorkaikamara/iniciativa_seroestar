/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Brain,
  Users,
  TrendingUp,
  ArrowRight,
  BookOpen,
  Globe,
  Music,
  Briefcase,
  Phone,
  ArrowUpRight,
  Star,
  MessageSquare,
  Send,
  CheckCircle,
  Calendar,
  MapPin,
  HelpCircle,
  X,
  FileText,
  Check,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Award,
  BookMarked,
  GraduationCap,
  Building2,
  Handshake
} from "lucide-react";

import { Course, Testimonial, BlogPost } from "./types";
import { COURSES, METHODOLOGY_STEPS, FEATURES, BLOG_POSTS, TESTIMONIALS } from "./data";
import { TRANSLATIONS } from "./translations";
import Header from "./components/Header";
import Logo from "./components/Logo";
const BlogModal = React.lazy(() => import("./components/BlogModal"));
const SyllabusModal = React.lazy(() => import("./components/SyllabusModal"));
const StudentDashboard = React.lazy(() => import("./components/portals/StudentDashboard"));
const TeacherDashboard = React.lazy(() => import("./components/portals/TeacherDashboard"));
const AdminDashboard = React.lazy(() => import("./components/portals/AdminDashboard"));
const PortalGate = React.lazy(() => import("./components/portals/PortalGate"));

const HERO_SLIDES_EN = [
  {
    image: "/src/assets/images/spanish_classroom_hero_1782078041463.jpg",
    title: "MASTER SPANISH FROM ZERO.",
    badge: "Ser (Why) vs Estar (How)",
    description: "Interactive online & in-person lessons designed to build confidence in communication with professional Spanish educators. Adult cognitive metaphors designed specifically for English speakers."
  },
  {
    image: "/src/assets/images/spain_travel_guide_1782078073592.jpg",
    title: "DISCOVER THE SPANISH WORLD.",
    badge: "Cultural Infusion",
    description: "Connect deeply with the culture, master emotional communication, and experience the richness of native Spanish."
  },
  {
    image: "/src/assets/images/ser_estar_mistakes_1782078058079.jpg",
    title: "CONQUER GRAMMAR PITFALLS.",
    badge: "Cognitive Pedagogy",
    description: "Unravel confusing grammar rules with ease. Understand the subtle, logical difference between state transformations and core identity descriptors."
  },
  {
    image: "/src/assets/images/bilingual_brain_workout_1782078086117.jpg",
    title: "BILINGUAL MIND WORKOUT.",
    badge: "Neuroplastic Fitness",
    description: "Forget dry textbooks. Our methodology keeps your mind active through dynamic conversational drills, sensory aids, and personalized feedback."
  },
  {
    image: "/src/assets/images/graduation_celebration_1783328370899.jpg",
    title: "CELEBRATE YOUR MILESTONES.",
    badge: "Active Graduation Cohort",
    description: "Join a supportive community of adult learners who celebrate every breakthrough together. Experience the joy of real fluency with our structured, social methodology."
  }
];

const HERO_SLIDES_ES = [
  {
    image: "/src/assets/images/spanish_classroom_hero_1782078041463.jpg",
    title: "DOMINA EL ESPAÑOL DESDE CERO.",
    badge: "Ser (Por qué) vs Estar (Cómo)",
    description: "Lecciones interactivas en línea y presenciales diseñadas para generar confianza en la comunicación con educadores profesionales de español. Metáforas cognitivas para adultos diseñadas específicamente para angloparlantes."
  },
  {
    image: "/src/assets/images/spain_travel_guide_1782078073592.jpg",
    title: "DESCUBRE EL MUNDO HISPANO.",
    badge: "Infusión Cultural",
    description: "Conéctate profundamente con la cultura, domina la comunicación emocional y experimenta la riqueza del español nativo."
  },
  {
    image: "/src/assets/images/ser_estar_mistakes_1782078058079.jpg",
    title: "CONQUISTA LOS ERRORES GRAMATICALES.",
    badge: "Pedagogía Cognitiva",
    description: "Resuelve las confusas reglas gramaticales con facilidad. Comprende la sutil diferencia lógica entre las transformaciones de estado y los descriptores de identidad central."
  },
  {
    image: "/src/assets/images/bilingual_brain_workout_1782078086117.jpg",
    title: "ENTRENAMIENTO MENTAL BILINGÜE.",
    badge: "Acondicionamiento Neuroplástico",
    description: "Olvídate de los libros de texto aburridos. Nuestra metodología mantiene tu mente activa mediante prácticas de conversación dinámicas, ayudas sensoriales y retroalimentación personalizada."
  },
  {
    image: "/src/assets/images/graduation_celebration_1783328370899.jpg",
    title: "CELEBRA TUS LOGROS.",
    badge: "Cohorte de Graduación Activa",
    description: "Únete a una comunidad de apoyo de estudiantes adultos que celebran cada logro juntos. Experimenta la alegría de la fluidez real con nuestra metodología estructurada y social."
  }
];

const getLocalizedCourse = (course: any, lang: "EN" | "ES") => {
  if (lang === "EN") return course;

  const translationsMap: Record<string, any> = {
    a1: {
      title: "Principiante",
      objectives: [
        "Sin necesidad de conocimientos previos",
        "Construir estructuras básicas de oraciones",
        "Dominar los sonidos y ritmos esenciales"
      ],
      vocabulary: [
        "Saludos y presentaciones",
        "Comida, familia y pasatiempos",
        "Tiempo, colores y objetos cotidianos"
      ],
      grammar: [
        "Verbos regulares en tiempo presente",
        "Bases de Ser y Estar (Parte I)",
        "Reglas de género y concordancia"
      ],
      conversation: [
        "Presentarse con total facilidad",
        "Pedir comida en cafés locales",
        "Preguntar por direcciones básicas"
      ]
    },
    a2: {
      title: "Elemental",
      objectives: [
        "Desenvolverse en conversaciones cotidianas",
        "Comprender el habla estándar",
        "Describir rutinas y eventos"
      ],
      vocabulary: [
        "Hábitos diarios y rutinas",
        "Tiempo, clima y ropa",
        "Viajes, hoteles y aeropuertos"
      ],
      grammar: [
        "Introducción a los tiempos pasados",
        "Sistemas de verbos reflexivos",
        "Pronombres directos e indirectos"
      ],
      conversation: [
        "Narrar experiencias del pasado",
        "Realizar compras en tiendas",
        "Hablar de planes futuros sencillos"
      ]
    },
    b1: {
      title: "Intermedio",
      objectives: [
        "Hablar con fluidez y facilidad",
        "Manejar situaciones inesperadas",
        "Expresar opiniones con matices"
      ],
      vocabulary: [
        "Temas abstractos y emociones",
        "Carreras, currículums y comercio",
        "Actualidad y medios de comunicación"
      ],
      grammar: [
        "Introducción al modo subjuntivo",
        "Hipótesis y condicional",
        "Uso avanzado de Ser vs Estar"
      ],
      conversation: [
        "Debatir sobre temas de interés",
        "Explicar tramas de películas o libros",
        "Redactar correspondencia formal"
      ]
    }
  };

  const trans = translationsMap[course.id];
  if (!trans) return course;

  return {
    ...course,
    title: trans.title,
    objectives: trans.objectives,
    vocabulary: trans.vocabulary,
    grammar: trans.grammar,
    conversation: trans.conversation
  };
};

const getLocalizedTestimonial = (testimonial: Testimonial, lang: "EN" | "ES"): Testimonial => {
  if (lang === "EN") return testimonial;

  const translations: Record<string, Partial<Testimonial>> = {
    "graduation-success": {
      name: "Promoción Graduada",
      location: "Sierra Leona",
      text: "Por fin terminé mi curso de español. 💃 Recomiendo totalmente Iniciativa Ser o Estar a los estudiantes adultos que buscan avances reales en gramática cognitiva y fluidez al hablar."
    },
    sarah: {
      location: "Chicago, EE. UU.",
      text: "¡Por fin entendí el misterio del verbo ser! Probé tres aplicaciones y libros diferentes antes de inscribirme. En solo dos semanas, los tableros visuales interactivos de «Ser vs. Estar» me ayudaron a comprender cómo explicar mis sentimientos y mi profesión. Los grupos pequeños son muy acogedores y totalmente seguros para principiantes."
    },
    marcus: {
      location: "Londres, Reino Unido",
      text: "La dinámica de clase es excepcional. A diferencia de las plataformas de cursos en línea, Iniciativa Ser o Estar ofrece interacción con hablantes nativos adaptada a los angloparlantes. Los instructores anticipan exactamente los errores que solemos cometer. Reservé la clase de prueba y me encantó."
    },
    elena: {
      location: "Austin, EE. UU.",
      text: "Pasé de trabarme con palabras básicas a conversar cómodamente con el camarero de mi cafetería local. La metodología visual funciona perfectamente para quienes aprendemos de forma práctica o visual. Sin duda, ha sido la mejor inversión en mi aprendizaje del español."
    }
  };

  return { ...testimonial, ...translations[testimonial.id] };
};

const getLocalizedBlogPost = (post: BlogPost, lang: "EN" | "ES"): BlogPost => {
  if (lang === "EN") return post;

  const translations: Record<string, Partial<BlogPost>> = {
    "face-to-face-spanish-when-needed": {
      title: "Aprendizaje flexible de español: primero en línea y presencial cuando sea necesario",
      excerpt: "Nuestras clases están diseñadas para el aprendizaje moderno en línea, pero también ofrecemos sesiones presenciales para grupos pequeños y necesidades especiales.",
      category: "Modelo de aprendizaje",
      readTime: "4 min de lectura",
      contentMarkdown: `### Aprendizaje flexible de español: primero en línea y presencial cuando sea necesario

En Iniciativa Ser o Estar creemos que el aprendizaje debe adaptarse al estudiante. Nuestro modelo principal es en línea, estructurado y accesible, aunque algunos momentos requieren presencia humana en la misma sala.

Por eso ofrecemos sesiones presenciales cuando surge la necesidad. Son especialmente útiles para practicar la pronunciación, ganar confianza, conversar, repasar en grupo, preparar exámenes y atender a quienes se benefician de una interacción directa.

#### Por qué sigue siendo importante el apoyo presencial
El aprendizaje en línea aporta flexibilidad, constancia y acceso. La modalidad presencial añade corrección inmediata, conversación natural, lenguaje corporal, energía de grupo y confianza para hablar en tiempo real.

Nuestras sesiones presenciales son prácticas y específicas. Trabajamos con los retos reales del estudiante: la inseguridad al hablar, la confusión gramatical, las dificultades auditivas y el miedo a equivocarse.

#### Un modelo combinado para estudiantes comprometidos
* Las clases en línea aportan estructura y continuidad.
* Las sesiones presenciales ofrecen corrección profunda y atención personal.
* Los grupos pequeños crean un entorno seguro para conversar.
* Los estudiantes reciben comentarios prácticos que pueden aplicar inmediatamente.

En línea o en persona, nuestra misión es la misma: ayudarte a comprender el español, hablar con confianza y usarlo en la vida real.`
    },
    "spanish-diplomacy-sierra-leone": {
      title: "La diplomacia del español llega a Sierra Leona",
      excerpt: "La Embajada de España en Guinea destacó la octava visita oficial del embajador Carrascal a Sierra Leona, vinculada al Día de la Independencia y al Día Mundial del Español.",
      category: "Noticias culturales",
      readTime: "3 min de lectura",
      contentMarkdown: `### La diplomacia del español llega a Sierra Leona

La Embajada de España en Guinea informó de la octava visita oficial del embajador Carrascal a Sierra Leona. La visita coincidió con los actos del Día de la Independencia del país y apoyó iniciativas relacionadas con el Día Mundial del Español.

#### Nota original en español
El embajador de España, Carrascal, realizó su octava visita oficial a Sierra Leona para asistir a los actos celebrados en el marco del Día de la Independencia y promover iniciativas con motivo del Día Mundial del Español.

Para los estudiantes de Sierra Leona, estos momentos demuestran que el español no es solo una asignatura: también es un puente para el intercambio cultural, la diplomacia, los viajes, la educación y las oportunidades profesionales.

En Iniciativa Ser o Estar lo vemos como una señal clara de que el aprendizaje del español en África Occidental es cada vez más visible, práctico y conectado con oportunidades reales.`
    },
    "spanish-gains-ground-africa": {
      title: "El español gana terreno en África",
      excerpt: "En aulas y universidades africanas crece el interés por el español como vía hacia la cultura, los estudios, la diplomacia y las oportunidades internacionales.",
      category: "Acceso lingüístico",
      readTime: "4 min de lectura",
      contentMarkdown: `### El español gana terreno en África

El español está ganando terreno en África. Cada vez más estudiantes lo ven como un idioma de viajes, cultura, cooperación internacional, educación, negocios y diplomacia.

En universidades y aulas comunitarias, el español ofrece una nueva vía hacia las conversaciones globales. Conecta África con España, América Latina y millones de hispanohablantes.

#### Por qué es importante para los estudiantes
* Crea más oportunidades de estudio y becas.
* Favorece carreras en turismo, diplomacia, traducción, educación y negocios internacionales.
* Permite participar en una red cultural y profesional más amplia.

Para los estudiantes de Sierra Leona, este crecimiento significa mayor acceso a profesores, recursos, intercambios y actividades culturales.`
    },
    "ser-estar-mistakes": {
      title: "Los 5 errores más comunes al usar Ser y Estar",
      excerpt: "¿Por qué «Estoy aburrido» es tan diferente de «Soy aburrido»? Descubre cinco errores frecuentes y aprende a evitarlos.",
      category: "Trucos de gramática",
      readTime: "4 min de lectura",
      contentMarkdown: `### Los 5 errores más comunes y cómo evitarlos

Uno de los primeros grandes retos para un angloparlante es comprender la diferencia entre **SER** y **ESTAR**.

#### 1. Confundir «Soy aburrido» con «Estoy aburrido»
* **Soy aburrido** describe un rasgo de la persona.
* **Estoy aburrido** expresa un estado emocional temporal.

#### 2. Usar el verbo incorrecto para ubicaciones
La ubicación de una ciudad o edificio siempre se expresa con **ESTAR**. Lo correcto es: **Madrid está en España**.

#### 3. Definir la profesión con «Estar»
La profesión se considera parte de la identidad. Lo correcto es: **Soy profesor**, sin artículo.

#### 4. Expresar el estado de salud
Para hablar de condiciones físicas o bienestar se usa **ESTAR**: **Hoy estoy enfermo**.

#### 5. Cualidades frente a estados
**SER** expresa características esenciales; **ESTAR**, estados, resultados o cambios temporales: **La sopa está fría** frente a **El hielo es frío**.`
    },
    "travel-rescue": {
      title: "Cómo desenvolverte en tu primer viaje: vocabulario esencial",
      excerpt: "Domina frases fundamentales para pedir comida, encontrar transporte y relacionarte con la gente local en España o América Latina.",
      category: "Preparación para viajar",
      readTime: "6 min de lectura",
      contentMarkdown: `### Cómo desenvolverte en tu primer viaje a un país hispanohablante

Viajar hablando el idioma local es una experiencia completamente distinta. Aquí tienes una guía rápida para comenzar.

#### Transporte y direcciones
* **¿Dónde está la estación de tren o de autobuses?**
* **Un billete para [destino], por favor.**
* **¿Puede ayudarme, por favor?**

#### Disfrutar de la gastronomía local
* **Una mesa para dos, por favor.**
* **¿Qué nos recomienda?**
* **La cuenta, por favor.**
* **¡Está delicioso!**

#### Frases breves para conectar
* **¡Mucho gusto!**
* **Disculpe, mi español es un poco básico.**
* **¿Cómo se dice «sunrise» en español?**`
    },
    "brain-health": {
      title: "Por qué aprender español es un excelente ejercicio cerebral",
      excerpt: "Hablar un segundo idioma modifica la estructura física del cerebro. Descubre la ciencia de la plasticidad cognitiva y el bilingüismo adulto.",
      category: "Ciencia",
      readTime: "5 min de lectura",
      contentMarkdown: `### Por qué aprender español es un ejercicio cognitivo de primer nivel

Aprender un segundo idioma es una de las actividades mentales más complejas que puede realizar un adulto y activa varias regiones cerebrales a la vez.

#### 1. Aumento de la densidad de materia gris
Al practicar sonidos, conjugaciones y vocabulario, el cerebro crea nuevas rutas. Los estudios muestran una mayor densidad de materia gris en áreas relacionadas con el vocabulario y el procesamiento visual.

#### 2. Flexibilidad cognitiva avanzada
Las personas bilingües cambian constantemente su foco de atención. Esto fortalece el control ejecutivo y favorece:
* La capacidad de realizar varias tareas.
* La memoria de trabajo espacial.
* La concentración en entornos con distracciones.

#### 3. Retraso del deterioro neurodegenerativo
Las personas bilingües pueden mostrar síntomas de deterioro cognitivo entre **4 y 5 años más tarde** que las monolingües. El bilingüismo crea una reserva cognitiva que actúa como protección.`
    }
  };

  return { ...post, ...translations[post.id] };
};

export default function App() {
  // Portals & Role-Based Core State
  const [currentPortal, setCurrentPortal] = useState<"student" | "teacher" | "admin" | null>(() =>
    new URLSearchParams(window.location.search).has("reset_token") ? "student" : null
  );
  const [registeredStudent, setRegisteredStudent] = useState<any | null>(null);
  const [studentSession, setStudentSession] = useState<any | null>(null);
  const [teacherSession, setTeacherSession] = useState<any | null>(null);
  const [adminSession, setAdminSession] = useState<any | null>(null);
  const [customBlogPosts, setCustomBlogPosts] = useState<BlogPost[]>(BLOG_POSTS);
  const [imageOverrides, setImageOverrides] = useState<Record<string, string>>({});

  // Slideshow State
  const [currentHeroSlide, setCurrentHeroSlide] = useState(0);

  // Navigation & Drawer States
  const [courseLang, setCourseLang] = useState<"EN" | "ES">("EN");
  const [courseActiveTab, setCourseActiveTab] = useState<Record<string, "objectives" | "vocabulary" | "grammar" | "speaking">>({
    a1: "objectives",
    a2: "objectives",
    b1: "objectives"
  });
  const [activeView, setActiveView] = useState<"home" | "courses" | "methodology" | "about" | "blog" | "contact">("home");

  const handleNavigate = (sectionId: string) => {
    if (sectionId === "home") {
      setActiveView("home");
    } else if (sectionId === "courses") {
      setActiveView("courses");
    } else if (sectionId === "methodology") {
      setActiveView("methodology");
    } else if (sectionId === "about") {
      setActiveView("about");
    } else if (sectionId === "blog") {
      setActiveView("blog");
    } else if (sectionId === "contact") {
      setActiveView("contact");
    } else {
      setActiveView("home");
      setTimeout(() => {
        scrollToSection(sectionId);
      }, 100);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Modals & Action States
  const [activeBlog, setActiveBlog] = useState<BlogPost | null>(null);
  const [activeSyllabus, setActiveSyllabus] = useState<Course | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);

  // Dynamic testimonial pool (predefined + user submitted!)
  const [testimonialList, setTestimonialList] = useState<Testimonial[]>(TESTIMONIALS);
  
  // Feedback form inputs
  const [feedbackName, setFeedbackName] = useState("");
  const [feedbackTitle, setFeedbackTitle] = useState("");
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  // Booking Form State
  const [bookName, setBookName] = useState("");
  const [bookEmail, setBookEmail] = useState("");
  const [bookLevel, setBookLevel] = useState("Beginner A1");
  const [bookTime, setBookTime] = useState("");
  const [bookSuccess, setBookSuccess] = useState(false);

  // Enhanced Chatbot State
  const t = TRANSLATIONS[courseLang];
  const heroSlides = courseLang === "EN" ? HERO_SLIDES_EN : HERO_SLIDES_ES;
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [showWhatsAppEscalation, setShowWhatsAppEscalation] = useState(false);
  const [chatAnswers, setChatAnswers] = useState<Array<{ sender: "bot" | "user"; text: string }>>([]);

  useEffect(() => {
    setChatAnswers([
      {
        sender: "bot",
        text: courseLang === "EN" 
          ? "¡Hola! I'm your Iniciativa Ser o Estar virtual guide. Ask me any question below about our academy!"
          : "¡Hola! Soy tu guía virtual de Iniciativa Ser o Estar. ¡Hazme cualquier pregunta abajo sobre nuestra academia!"
      }
    ]);
    setShowWhatsAppEscalation(false);
  }, [courseLang]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatAnswers, chatLoading, showWhatsAppEscalation, chatOpen]);

  const chatbotFAQ = [
    {
      q: courseLang === "EN" ? "Are lessons online or physical?" : "¿Las lecciones son online o presenciales?",
      a: courseLang === "EN" 
        ? "Both! We host live, interactive online sessions via high-definition Zoom feeds, as well as cozy face-to-face physical classes in comfortable small groups (maximum 6 student peers) at our academy hubs."
        : "¡Ambas! Ofrecemos sesiones interactivas en línea en vivo a través de Zoom, así como clases presenciales en grupos pequeños y cómodos (máximo 6 estudiantes) en nuestras sedes."
    },
    {
      q: courseLang === "EN" ? "Is the trial class fully free?" : "¿La clase de prueba es totalmente gratis?",
      a: courseLang === "EN" 
        ? "Yes! Your first trial lesson is a 100% free, 30-minute diagnostic session. Our senior tutor evaluates your learning traps and outlines an individual roadmap with zero commitment."
        : "¡Sí! Tu primera lección de prueba es una sesión de diagnóstico de 30 minutos 100% gratuita. Nuestro tutor evalúa tus dificultades de aprendizaje y diseña una ruta personalizada sin compromiso."
    },
    {
      q: courseLang === "EN" ? "What makes Iniciativa Ser o Estar unique?" : "¿Qué hace único a Iniciativa Ser o Estar?",
      a: courseLang === "EN" 
        ? "Traditional schools force endless grammar matrices. We focus on 'Cognitive Metaphors' specifically de-coded for English speakers, helping you map Spanish verb forms to your natural thought patterns."
        : "Las escuelas tradicionales imponen matrices gramaticales interminables. Nos enfocamos en 'Metáforas Cognitivas' descodificadas específicamente para angloparlantes, ayudándote a adaptar los verbos en español a tus patrones de pensamiento naturales."
    },
    {
      q: courseLang === "EN" ? "When do groups meet?" : "¿Cuándo se reúnen los grupos?",
      a: courseLang === "EN" 
        ? "To fit busy schedules, we have early morning, evening, and weekend slots available. Courses launch every single month, so you can start immediately!"
        : "Para adaptarnos a los horarios ocupados, tenemos turnos por la mañana, por la tarde y los fines de semana. ¡Los cursos comienzan cada mes, así que puedes empezar de inmediato!"
    }
  ];

  const handleFAQClick = (question: string, answer: string) => {
    setChatAnswers((prev) => [
      ...prev,
      { sender: "user", text: question },
      { sender: "bot", text: answer }
    ]);
    setShowWhatsAppEscalation(true);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = chatInput.trim();
    if (!query) return;

    setChatAnswers((prev) => [...prev, { sender: "user", text: query }]);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: query }),
      });
      if (res.ok) {
        const data = await res.json();
        setChatAnswers((prev) => [...prev, { sender: "bot", text: data.text }]);
      } else {
        throw new Error("Chatbot API endpoint failed");
      }
    } catch (err) {
      // Intelligent fallback search within FAQs and website info
      const lowerQuery = query.toLowerCase();
      let bestAnswer = courseLang === "EN"
        ? "I'm happy to help! For specialized classes, schedules, and learning how to seamlessly master Ser vs Estar, we have beautiful programs. Let me check our details for you."
        : "¡Con gusto te ayudo! Para clases especializadas, horarios y aprender a dominar Ser vs Estar a la perfección, tenemos excelentes programas. Déjame revisar los detalles por ti.";
      
      let matched = false;
      for (const faq of chatbotFAQ) {
        const keyWords = faq.q.toLowerCase().replace(/[?,!¿¡]/g, "").split(" ");
        // If there's keyword overlap, use the FAQ answer
        if (keyWords.some(word => word.length > 3 && lowerQuery.includes(word))) {
          bestAnswer = faq.a;
          matched = true;
          break;
        }
      }

      if (!matched) {
        if (lowerQuery.includes("price") || lowerQuery.includes("cost") || lowerQuery.includes("free") || lowerQuery.includes("pay") || lowerQuery.includes("precio") || lowerQuery.includes("costo") || lowerQuery.includes("gratis") || lowerQuery.includes("pagar")) {
          bestAnswer = courseLang === "EN"
            ? "Our introductory diagnostic and trial session is 100% free with no commitment! For our premium small group courses, please connect with our support desk for custom pricing options."
            : "¡Nuestra sesión introductoria de diagnóstico y prueba es 100% gratuita y sin compromiso! Para nuestros cursos premium en grupos pequeños, comunícate con soporte para ver opciones de precios personalizados.";
        } else if (lowerQuery.includes("level") || lowerQuery.includes("course") || lowerQuery.includes("class") || lowerQuery.includes("learn") || lowerQuery.includes("nivel") || lowerQuery.includes("curso") || lowerQuery.includes("clase") || lowerQuery.includes("aprender")) {
          bestAnswer = courseLang === "EN"
            ? "We offer beautifully organized intensive group classes for A1 Beginner, A2 Elementary, and B1 Intermediate levels, all capped at 6 students to ensure rich participation!"
            : "¡Ofrecemos clases intensivas en grupos organizados para niveles A1 Principiante, A2 Elemental y B1 Intermedio, todas limitadas a 6 estudiantes para asegurar una participación activa!";
        } else if (lowerQuery.includes("location") || lowerQuery.includes("address") || lowerQuery.includes("where") || lowerQuery.includes("spain") || lowerQuery.includes("madrid") || lowerQuery.includes("colombia") || lowerQuery.includes("dirección") || lowerQuery.includes("dónde") || lowerQuery.includes("ubicación")) {
          bestAnswer = courseLang === "EN"
            ? "We have active physical presence and academy hubs in Madrid (España), Medellín (Colombia), Freetown (Sierra Leone), and Virginia (USA), alongside our global high-definition Zoom classrooms."
            : "Contamos con presencia física activa y sedes en Madrid (España), Medellín (Colombia), Freetown (Sierra Leona) y Virginia (EE. UU.), junto con nuestras aulas globales por Zoom de alta definición.";
        }
      }

      setChatAnswers((prev) => [...prev, { sender: "bot", text: bestAnswer }]);
    } finally {
      setChatLoading(false);
      setShowWhatsAppEscalation(true);
    }
  };

  // Safe navigation function utilizing native smooth scrolling
  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Close modals on Esc keypress
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveBlog(null);
        setActiveSyllabus(null);
        setBookingModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Background Slideshow Auto-Rotation Timer
  useEffect(() => {
    if (currentPortal !== null) return;
    const interval = setInterval(() => {
      setCurrentHeroSlide((prev) => (prev + 1) % heroSlides.length);
    }, 6000); // 6 seconds for delightful and readable experience
    return () => clearInterval(interval);
  }, [currentPortal]);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const res = await fetch("/api/me", { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        if (data.role === "student") {
          setStudentSession({
            fullName: data.full_name,
            email: data.email,
            role: data.role,
            studentIdCode: data.student_id_code,
            phoneNumber: data.phone_number || "",
            courseLevel: data.course_level || "A1",
            classGroup: data.class_group || "Morning Group",
            learningMode: data.learning_mode || "Online"
          });
        } else if (data.role === "teacher") {
          setTeacherSession({
            fullName: data.full_name,
            displayName: data.display_name || data.full_name,
            email: data.email,
            role: data.role,
            teacherId: data.teacher_id_code,
            assignedLevels: data.assigned_levels || ["A1"]
          });
        } else if (data.role === "admin") {
          setAdminSession({
            fullName: data.full_name,
            email: data.email,
            role: data.role
          });
        }
      } catch (err) {
        console.warn("Unable to restore session:", err);
      }
    };
    restoreSession();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST", credentials: "include" });
    } catch (err) {
      console.warn("Logout request failed:", err);
    }
    setStudentSession(null);
    setTeacherSession(null);
    setAdminSession(null);
    setCurrentPortal(null);
  };

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackName || !feedbackText) return;

    const newFeedback: Testimonial = {
      id: `custom-${Date.now()}`,
      name: feedbackName,
      location: feedbackTitle || "Verified Student",
      rating: feedbackRating,
      text: feedbackText,
      avatarUrl: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 900000)}?auto=format&fit=crop&q=80&w=150&h=150`
    };

    setTestimonialList((prev) => [newFeedback, ...prev]);
    setFeedbackSuccess(true);
    setTimeout(() => {
      setFeedbackSuccess(false);
      setFeedbackName("");
      setFeedbackTitle("");
      setFeedbackRating(5);
      setFeedbackText("");
    }, 4000);
  };

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookName || !bookEmail) return;

    const whatsappMessage = courseLang === "EN"
      ? `Hello, my name is ${bookName}. I would like to request a free Spanish learning slot. Email: ${bookEmail}. Level: ${bookLevel}. Preferred time: ${bookTime}.`
      : `Hola, me llamo ${bookName}. Me gustaría solicitar una plaza gratuita para aprender español. Correo: ${bookEmail}. Nivel: ${bookLevel}. Horario preferido: ${bookTime}.`;
    window.open(
      `https://wa.me/23272057646?text=${encodeURIComponent(whatsappMessage)}`,
      "_blank",
      "noopener,noreferrer",
    );
    setBookSuccess(true);
    setTimeout(() => {
      setBookSuccess(false);
      setBookingModalOpen(false);
      setBookName("");
      setBookEmail("");
      setBookTime("");
    }, 2000);
    return;

    const studentCode = `SER-${Math.floor(Math.random() * 900) + 100}`;
    const levelCode = bookLevel === "Beginner A1" ? "A1" : bookLevel === "Elementary A2" ? "A2" : "B1";
    const newStudentProfile = {
      fullName: bookName,
      studentIdCode: studentCode,
      email: bookEmail,
      phoneNumber: "+34 611 223 344",
      courseLevel: levelCode,
      classGroup: "Morning Group",
      learningMode: "Online",
      authMethod: "Password"
    };

    // Save student to portal_students database so they can log back in later
    const registeredUsers = JSON.parse(localStorage.getItem("portal_students") || "[]");
    const exists = registeredUsers.some((u: any) => u.email.toLowerCase() === bookEmail.toLowerCase());
    if (!exists) {
      registeredUsers.push({
        ...newStudentProfile,
        password: "seroestar123" // Set a default friendly password
      });
      localStorage.setItem("portal_students", JSON.stringify(registeredUsers));
    }

    // Set A1 Welcome Letter inside Student Portal Mailbox
    if (levelCode === "A1") {
      const welcomeMail = {
        id: "welcome-letter-mail",
        instructor: "Iniciativa Ser o Estar",
        subject: "Official Welcome Letter - Group 1 Intensive A1 Spanish Course",
        text: `Dear Group 1 Participant,

On behalf of Iniciativa Ser o Estar (ISoE), it is our pleasure to officially welcome you to the intensive A1 Spanish course. This program is tailored for beginners who are passionate about starting their journey toward Spanish fluency.

Student ID: ${studentCode}

Classes are online, and will be held on:
Course dates: 19 May to 27 June 2026 (six weeks of intensive learning)

Time | Day | Hours by Session | Session
19:00-20:00 | Tuesday | 1 | Grammar-Lab
19:00-20:00 | Thursday | 1 | Vocabulary & Conversation
10:00-11:00 | Saturday | 1 | Listening Practice. Review
11:00-12:00 | Saturday | 1 | Final Project Coaching. (Week 3-6)

WORKING PLAN OVERVIEW:
• Grammar Lab: Focused sessions on essential Spanish grammar topics.
• Vocabulary & Conversation: Practical vocabulary building and interactive speaking exercises.
• Listening Practice: Activities to improve comprehension and pronunciation.
• Progress Assessments: Periodic evaluations to track progress and address learning gaps.
• Coaching on participant final project design and rehearsals.
• Max 16 participants per session.
• One recovery class available every two weeks.

CERTIFICATION PROCESS:
For this six-week A1 Spanish Intensive Course, a certificate of participation will be awarded by the Embassy of Spain in Guinea and Sierra Leone, in partnership with the Honorary Consulate of Spain in Freetown.

Requirements: Attendance is the main criterion.
If your attendance is below 85%, you may continue with the course by paying a registration fee of 250 leones. This fee is reimbursable if you attend at least 80% of the course.

A minimum of 80% attendance is required for certification.

If your attendance is below 80%, the registration fee is not reimbursable. You may continue attending the remaining classes and you will receive all course materials; however, a certificate of participation will not be issued in this case.

OFFICIAL REGISTRATION:
If you are still interested in improving your Spanish skills through this course, kindly confirm your acceptance of this letter via email or WhatsApp.

Once you have confirmed, you will receive:
- Participant Card
- Detailed Working Plan
- Schedule with specific dates and activities.
- Address and access to interactive classroom in Freetown. Available for those who consider it an ideal option to have access to steady power supply and internet. This option also provides the opportunity to interact one on one with other participants.

We look forward to supporting your learning journey and ensuring your experience is both enjoyable and productive.

¡Nos vemos pronto!
Saludos del Equipo de Iniciativa Ser o Estar

Contact: +232 72 057646 | seroestar@icloud.com
May 2026`,
        date: "2026-05-19",
        status: "DELIVERED"
      };
      localStorage.setItem(`emails_${studentCode}`, JSON.stringify([welcomeMail]));

      // Trigger the backend API to send Gmail welcome letter
      fetch("/api/send-welcome", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email: bookEmail, fullName: bookName, studentIdCode: studentCode })
      })
      .then(res => res.json())
      .then(data => console.log("Welcome email status (Booking):", data))
      .catch(err => console.error("Error triggering welcome email (Booking):", err));
    }

    setRegisteredStudent(newStudentProfile);
    setBookSuccess(true);
    
    // Dual Language Welcome Log Trigger
    const welcomeLog = `
--- DUAL LANGUAGE REGISTRATION BROADCAST ---
To: ${bookEmail}
Subject: Welcome to Iniciativa Ser o Estar! / ¡Bienvenido/a a Iniciativa Ser o Estar!

English:
Welcome ${bookName}! Your registration at Iniciativa Ser o Estar is confirmed. Your Student ID code is ${studentCode}. Enjoy your dashboard!

Spanish:
¡Bienvenido/a ${bookName}! Su registro en Iniciativa Ser o Estar ha sido confirmado. Su código de estudiante es ${studentCode}. ¡Disfrute de su panel!
--------------------------------------------
`;
    console.log(welcomeLog);

    setTimeout(() => {
      setBookSuccess(false);
      setBookingModalOpen(false);
      setBookName("");
      setBookEmail("");
      setBookTime("");
      setStudentSession(newStudentProfile); // Set the active student session!
      setCurrentPortal("student"); // Redirect immediately to Student Portal!
    }, 2000);
  };

  // Teacher shares notes logic
  const handleAddSharedNote = (note: any) => {
    console.log("Teacher shared note metadata received:", note);
  };

  // Teacher uploads recordings logic
  const handleAddRecording = (rec: any) => {
    console.log("Teacher shared recording media record:", rec);
  };

  // Admin Blog manager
  const handleAddBlogPost = (post: BlogPost) => {
    setCustomBlogPosts([post, ...customBlogPosts]);
  };

  const handleDeleteBlogPost = (id: string) => {
    setCustomBlogPosts(customBlogPosts.filter(p => p.id !== id));
  };

  // Admin Image overrides
  const handleUpdateImage = (imgUpdate: any) => {
    setImageOverrides(prev => ({
      ...prev,
      [imgUpdate.slot]: imgUpdate.fileData
    }));
  };

  return (
    <React.Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center text-sm font-bold text-slate-600">Loading Iniciativa Ser o Estar…</div>}>
    <div className="min-h-screen bg-white text-slate-800 antialiased font-sans flex flex-col selection:bg-orange-500 selection:text-white">
      
      {/* Main Container */}
      <div className="flex-1 flex flex-col min-h-screen">
        
        {/* 1. Header/Navigation Bar */}
        <Header
          onNavigate={handleNavigate}
          currentCourseLang={courseLang}
          onCourseLangToggle={(l) => {
            setCourseLang(l);
            handleNavigate("courses");
          }}
          onActivatePortal={(portal) => {
            setCurrentPortal(portal);
            if (portal) {
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          }}
          currentPortal={currentPortal}
          onRegisterFree={() => setBookingModalOpen(true)}
          activeView={activeView}
        />

        <AnimatePresence mode="wait">
          {currentPortal === "student" && (
            <motion.div
              key="student-portal"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 flex flex-col"
            >
              {!studentSession ? (
                <PortalGate
                  role="student"
                  onBack={() => setCurrentPortal(null)}
                  onSuccess={(profile) => {
                    setStudentSession(profile);
                    setRegisteredStudent(profile);
                  }}
                  lang={courseLang}
                />
              ) : (
                <StudentDashboard
                  onExit={() => {
                    handleLogout();
                  }}
                  registeredStudent={studentSession}
                  onOpenChatbot={() => setChatOpen(true)}
                  lang={courseLang}
                />
              )}
            </motion.div>
          )}

          {currentPortal === "teacher" && (
            <motion.div
              key="teacher-portal"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 flex flex-col"
            >
              {!teacherSession ? (
                <PortalGate
                  role="teacher"
                  onBack={() => setCurrentPortal(null)}
                  onSuccess={(profile) => setTeacherSession(profile)}
                  lang={courseLang}
                />
              ) : (
                <TeacherDashboard
                  onExit={() => {
                    handleLogout();
                  }}
                  teacherProfile={teacherSession}
                  onAddSharedNote={handleAddSharedNote}
                  onAddRecording={handleAddRecording}
                  lang={courseLang}
                />
              )}
            </motion.div>
          )}

          {currentPortal === "admin" && (
            <motion.div
              key="admin-portal"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 flex flex-col"
            >
              {!adminSession ? (
                <PortalGate
                  role="admin"
                  onBack={() => setCurrentPortal(null)}
                  onSuccess={(profile) => setAdminSession(profile)}
                  lang={courseLang}
                />
              ) : (
                <AdminDashboard
                  onExit={() => {
                    handleLogout();
                  }}
                  adminProfile={adminSession}
                  blogPosts={customBlogPosts}
                  onAddBlogPost={handleAddBlogPost}
                  onDeleteBlogPost={handleDeleteBlogPost}
                  onUpdateImage={handleUpdateImage}
                  customUploadedImages={[]}
                  lang={courseLang}
                />
              )}
            </motion.div>
          )}

          {currentPortal === null && (
            <motion.div
              key="public-landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
            {/* 3. Hero Section with Picture Slideshow Animation */}
            {activeView === "home" && (
              <>
            <header id="home" className="relative m-4 sm:m-6 lg:m-8 rounded-3xl overflow-hidden min-h-[75vh] flex items-center bg-slate-900 shadow-xl border-4 border-white">
              {/* Backlit generated slideshow images wrap */}
              <div className="absolute inset-0 z-0 overflow-hidden">
                <AnimatePresence mode="popLayout">
                  <motion.img
                    key={currentHeroSlide}
                    src={imageOverrides["Hero Banner"] && currentHeroSlide === 0 ? imageOverrides["Hero Banner"] : heroSlides[currentHeroSlide].image}
                    alt={heroSlides[currentHeroSlide].title}
                    initial={{ opacity: 0, scale: 1.08, filter: "blur(4px)" }}
                    animate={{ opacity: 0.38, scale: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 w-full h-full object-cover object-center"
                  />
                </AnimatePresence>
                {/* Visual Backdrop Overlay Gradients */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/65 to-transparent z-10" />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/40 to-transparent z-10" />
              </div>

              <div className="relative z-10 max-w-5xl mx-auto px-6 sm:px-10 lg:px-12 py-16 md:py-24 w-full">
                
                {/* Left Side Content column (Fades & shifts on slide changes) */}
                <div className="max-w-2xl space-y-8 text-left">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentHeroSlide}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 16 }}
                      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                      className="space-y-8"
                    >
                      {/* Introductory Badge */}
                      <div className="inline-flex items-center space-x-2 bg-slate-950/80 border border-orange-500/35 px-4 py-1.5 rounded-full text-xs font-bold text-orange-400 tracking-wider uppercase leading-none shadow-lg backdrop-blur-md">
                        <Sparkles size={11} className="text-orange-500 animate-pulse" />
                        <span>{heroSlides[currentHeroSlide].badge}</span>
                      </div>

                      {/* Headline and Narrative */}
                      <div className="space-y-4">
                        <h1 className="font-sans font-black text-4xl sm:text-5xl md:text-6xl text-white tracking-tight leading-none uppercase">
                          {heroSlides[currentHeroSlide].title.split(" ").map((word, index, arr) => {
                            const isHighlighted = 
                              word === "ZERO." || word === "WORLD." || word === "PITFALLS." || word === "WORKOUT." ||
                              word === "CERO." || word === "HISPANO." || word === "GRAMATICALES." || word === "BILINGÜE." ||
                              index === arr.length - 1;
                            if (isHighlighted) {
                              return <span key={index} className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-400 block sm:inline">{word} </span>;
                            }
                            return <span key={index}>{word} </span>;
                          })}
                        </h1>
                        <p className="text-slate-200 text-sm sm:text-base leading-relaxed max-w-xl font-medium">
                          {heroSlides[currentHeroSlide].description}
                        </p>
                      </div>
                    </motion.div>
                  </AnimatePresence>

                  {/* Core Action Buttons (Persistent, doesn't need to fade with images so UX is solid and clickable!) */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                    <button
                      id="hero-book-free-trial-btn"
                      onClick={() => setBookingModalOpen(true)}
                      className="px-8 py-3.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white rounded-xl font-bold text-sm tracking-wider uppercase transition shadow-lg shadow-orange-950/30 text-center cursor-pointer hover:scale-[1.025]"
                    >
                      {t.heroTrialBtn}
                    </button>
                    <button
                      id="hero-scroll-courses-btn"
                      onClick={() => handleNavigate("courses")}
                      className="px-6 py-3.5 bg-slate-900/60 backdrop-blur-sm border border-slate-700 hover:border-white text-slate-300 hover:text-white rounded-xl font-bold text-xs tracking-wider uppercase transition text-center hover:scale-[1.02] cursor-pointer"
                    >
                      {t.heroCoursesBtn}
                    </button>
                  </div>
                </div>

              </div>
            </header>

        {/* 4. Hero Feature Cards Overlay */}
        <section id="hero-features" className="relative -mt-10 z-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature card 1 */}
            <div className="bg-white rounded-2xl p-6 sm:p-7 shadow-sm border border-slate-100 flex items-start space-x-4 hover:shadow-md transition duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition duration-200">
                <Brain size={24} />
              </div>
              <div className="space-y-1 text-left">
                <h4 className="font-sans font-bold text-slate-900 text-sm">{t.heroFeatureEdu}</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {t.heroFeatureEduDesc}
                </p>
              </div>
            </div>

            {/* Feature card 2 */}
            <div className="bg-white rounded-2xl p-6 sm:p-7 shadow-sm border border-slate-100 flex items-start space-x-4 hover:shadow-md transition duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition duration-200">
                <Users size={24} />
              </div>
              <div className="space-y-1 text-left">
                <h4 className="font-sans font-bold text-slate-900 text-sm">{t.heroFeatureGroup}</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {t.heroFeatureGroupDesc}
                </p>
              </div>
            </div>

            {/* Feature card 3 */}
            <div className="bg-white rounded-2xl p-6 sm:p-7 shadow-sm border border-slate-100 flex items-start space-x-4 hover:shadow-md transition duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition duration-200">
                <TrendingUp size={24} />
              </div>
              <div className="space-y-1 text-left">
                <h4 className="font-sans font-bold text-slate-900 text-sm">{t.heroFeatureResults}</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {t.heroFeatureResultsDesc}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 7. Why Learn Spanish With Us Section */}
        <section id="why-us" className="py-20 bg-slate-50/50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <div className="text-xs font-bold text-orange-600 uppercase tracking-widest">{t.whyIntro}</div>
              <h2 className="font-sans font-extrabold text-3xl sm:text-4xl text-slate-950 tracking-tight leading-tight uppercase">
                {t.whyTitle}
              </h2>
              <div className="h-1.5 w-16 bg-orange-500 mx-auto rounded-full" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {/* Card 1: Connect globally */}
              <motion.div
                whileHover={{ scale: 1.025, y: -4 }}
                transition={{ type: "spring", stiffness: 350, damping: 22 }}
                className="bg-white rounded-3xl p-6.5 sm:p-8 border border-gray-100 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shadow-inner">
                    <Globe size={28} />
                  </div>
                  <h3 className="font-sans font-bold text-lg text-slate-900 group-hover:text-orange-600 transition">{courseLang === "EN" ? "Connect globally" : "Conéctate globalmente"}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {courseLang === "EN"
                      ? "Learn Spanish to communicate with people across countries and cultures. Access deeper friendships and express sentiments natively across 21 Spanish-speaking countries."
                      : "Aprende español para comunicarte con personas de distintos países y culturas. Crea amistades más profundas y expresa tus sentimientos con naturalidad en 21 países hispanohablantes."}
                  </p>
                </div>
              </motion.div>

              {/* Card 2: Discover culture */}
              <motion.div
                whileHover={{ scale: 1.025, y: -4 }}
                transition={{ type: "spring", stiffness: 350, damping: 22 }}
                className="bg-white rounded-3xl p-6.5 sm:p-8 border border-gray-100 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center shadow-inner">
                    <Music size={28} />
                  </div>
                  <h3 className="font-sans font-bold text-lg text-slate-900 group-hover:text-teal-600 transition">{courseLang === "EN" ? "Discover culture" : "Descubre la cultura"}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {courseLang === "EN"
                      ? "Understand Spanish music lyrics, regional food ingredients, literature masterpieces, colorful local festivals, and long-standing historical traditions without translation filters."
                      : "Comprende letras de música en español, ingredientes de la gastronomía regional, obras maestras de la literatura, coloridas fiestas locales y antiguas tradiciones históricas sin depender de traducciones."}
                  </p>
                </div>
              </motion.div>

              {/* Card 3: Improve career */}
              <motion.div
                whileHover={{ scale: 1.025, y: -4 }}
                transition={{ type: "spring", stiffness: 350, damping: 22 }}
                className="bg-white rounded-3xl p-6.5 sm:p-8 border border-gray-100 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
                    <Briefcase size={28} />
                  </div>
                  <h3 className="font-sans font-bold text-lg text-slate-900 group-hover:text-blue-600 transition">{courseLang === "EN" ? "Improve career" : "Impulsa tu carrera"}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {courseLang === "EN"
                      ? "Spanish is the second most spoken language in professional global trade. Unlock unique carrier pathways and double your networking potential in the Western Hemisphere."
                      : "El español es el segundo idioma más hablado en el comercio profesional mundial. Accede a nuevas oportunidades laborales y amplía considerablemente tu red de contactos en el hemisferio occidental."}
                  </p>
                </div>
              </motion.div>

              {/* Card 4: Enhance your mind */}
              <motion.div
                whileHover={{ scale: 1.025, y: -4 }}
                transition={{ type: "spring", stiffness: 350, damping: 22 }}
                className="bg-white rounded-3xl p-6.5 sm:p-8 border border-gray-100 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-inner">
                    <Brain size={28} />
                  </div>
                  <h3 className="font-sans font-bold text-lg text-slate-900 group-hover:text-amber-600 transition">{courseLang === "EN" ? "Enhance your mind" : "Potencia tu mente"}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {courseLang === "EN"
                      ? "Adult bilingualism optimizes memory span, focus precision, and cognitive flexibility. Learning with us will keep your brain young and active for much longer."
                      : "El bilingüismo en la edad adulta mejora la memoria, la capacidad de concentración y la flexibilidad cognitiva. Aprender con nosotros mantendrá tu mente joven y activa durante mucho más tiempo."}
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Simplified Programs Teaser for quick homepage access */}
        <section className="py-12 bg-white border-t border-gray-100">
          <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
            <h3 className="font-sans font-black text-xl sm:text-2xl text-slate-900 tracking-tight leading-none uppercase">
              {courseLang === "EN" ? "ACADEMY COURSE MODULES & DIRECT SYLLABUS" : "MÓDULOS DE CURSO Y PLAN DE ESTUDIOS DE LA ACADEMIA"}
            </h3>
            <p className="text-slate-600 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
              {courseLang === "EN"
                ? "We offer personalized, small-group cohorts matching native Spanish verb subtleties directly into native English mental frameworks. Select a level below to explore the complete interactive syllabus:"
                : "Ofrecemos grupos pequeños y personalizados que relacionan los matices de los verbos españoles con las estructuras mentales de los angloparlantes. Selecciona un nivel para explorar el plan de estudios interactivo completo:"}
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <button 
                onClick={() => handleNavigate("courses")}
                className="p-5 rounded-2xl bg-teal-50/60 border border-teal-100 text-center hover:shadow-md transition cursor-pointer group"
              >
                <div className="text-xs font-mono font-bold text-teal-800 uppercase mb-1">{courseLang === "EN" ? "A1 Beginner" : "A1 Principiante"}</div>
                <h4 className="font-sans font-bold text-slate-900 text-sm group-hover:text-teal-600 transition">{courseLang === "EN" ? "Basics & Conjugations" : "Fundamentos y conjugaciones"}</h4>
                <div className="text-xs text-slate-500 mt-2 flex items-center justify-center gap-1">
                  <span>{courseLang === "EN" ? "Explore Schedules" : "Explorar horarios"}</span> <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </button>
              
              <button 
                onClick={() => handleNavigate("courses")}
                className="p-5 rounded-2xl bg-orange-50/60 border border-orange-100 text-center hover:shadow-md transition cursor-pointer group"
              >
                <div className="text-xs font-mono font-bold text-orange-850 uppercase mb-1">{courseLang === "EN" ? "A2 Elementary" : "A2 Elemental"}</div>
                <h4 className="font-sans font-bold text-slate-900 text-sm group-hover:text-orange-600 transition">{courseLang === "EN" ? "Daily Routines & Past Tenses" : "Rutinas diarias y tiempos pasados"}</h4>
                <div className="text-xs text-slate-500 mt-2 flex items-center justify-center gap-1">
                  <span>{courseLang === "EN" ? "Explore Schedules" : "Explorar horarios"}</span> <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </button>
              
              <button 
                onClick={() => handleNavigate("courses")}
                className="p-5 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-center hover:shadow-md transition cursor-pointer group"
              >
                <div className="text-xs font-mono font-bold text-indigo-850 uppercase mb-1">{courseLang === "EN" ? "B1 Intermediate" : "B1 Intermedio"}</div>
                <h4 className="font-sans font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition">{courseLang === "EN" ? "Subjunctives & Debates" : "Subjuntivo y debates"}</h4>
                <div className="text-xs text-slate-500 mt-2 flex items-center justify-center gap-1">
                  <span>{courseLang === "EN" ? "Explore Schedules" : "Explorar horarios"}</span> <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </button>
            </div>
            
            <div className="pt-4">
              <button
                onClick={() => handleNavigate("courses")}
                className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-md"
              >
                {courseLang === "EN" ? "View Detailed Syllabus & Course Options" : "Ver el plan de estudios y las opciones de curso"}
              </button>
            </div>
          </div>
        </section>

        {/* Community & Graduation Success Highlight */}
        <section className="py-16 bg-slate-50 border-t border-gray-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-3xl overflow-hidden shadow-md border border-slate-200/60 grid grid-cols-1 md:grid-cols-12 gap-0">
              <div className="md:col-span-7 relative aspect-[3/2] md:aspect-auto md:min-h-[430px] overflow-hidden bg-orange-50">
                <img
                  src="/src/assets/images/vibrant_community_warm_studio.png"
                  alt={courseLang === "EN" ? "Iniciativa Ser o Estar students and instructors celebrating graduation" : "Estudiantes e instructores de Iniciativa Ser o Estar celebrando la graduación"}
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/20 via-transparent to-orange-950/5 pointer-events-none" />
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 rounded-full bg-[#ff5a1f] text-white font-mono text-[10px] uppercase tracking-wider font-bold shadow-sm">
                    {courseLang === "EN" ? "Live Graduation" : "Graduación en Vivo"}
                  </span>
                </div>
              </div>
              <div className="md:col-span-5 p-8 sm:p-10 flex flex-col justify-center space-y-5 text-left">
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">
                    {courseLang === "EN" ? "Our Vibrant Community" : "Nuestra Comunidad Vibrante"}
                  </div>
                  <h3 className="font-sans font-black text-2xl sm:text-3xl text-slate-900 tracking-tight leading-tight uppercase">
                    {courseLang === "EN" ? "CELEBRATING SUCCESS TOGETHER" : "CELEBRANDO EL ÉXITO JUNTOS"}
                  </h3>
                  <div className="h-1 w-12 bg-orange-500 rounded-full" />
                </div>
                <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                  {courseLang === "EN" 
                    ? "Our students aren't just names on a screen—they are a community of dedicated adult learners. We celebrate each certificate completion milestone together, marking genuine speech transitions and cognitive grammar breakthroughs."
                    : "Nuestros estudiantes no son solo nombres en una pantalla; son una comunidad de estudiantes adultos dedicados. Celebramos juntos cada hito de entrega de certificados, marcando transiciones reales en el habla y avances en gramática cognitiva."}
                </p>
              </div>
            </div>
          </div>
        </section>
        </>
        )}

        {/* 5. Methodology Section */}
        {activeView === "methodology" && (
        <section id="methodology" className="relative m-4 sm:m-6 lg:m-8 rounded-3xl overflow-hidden bg-teal-950 text-white p-8 sm:p-12 shadow-xl border border-teal-900">
          <div className="absolute inset-0 bg-radial-gradient from-teal-900/35 to-transparent pointer-events-none" />
          <div className="max-w-6xl mx-auto space-y-12 relative z-10">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <div className="text-xs font-bold text-orange-400 uppercase tracking-widest">
                {courseLang === "EN" ? "Our Blueprint" : "Nuestro Plan de Trabajo"}
              </div>
              <h2 className="font-sans font-black text-3xl sm:text-4xl text-white tracking-tight leading-tight uppercase">
                {courseLang === "EN" ? "OUR METHODOLOGY" : "NUESTRA METODOLOGÍA"}
              </h2>
              <div className="h-1.5 w-16 bg-orange-500 mx-auto rounded-full" />
              <p className="text-xs sm:text-sm text-teal-100/90 leading-relaxed max-w-lg mx-auto font-sans">
                {courseLang === "EN"
                  ? "No dry textbooks or endless memorization loops. We guide your progress chronologically using contextual speech steps."
                  : "Sin libros de texto aburridos ni memorización sin fin. Guiamos tu progreso cronológicamente usando pasos de conversación contextuales."}
              </p>
            </div>
 
            {/* Horizontal flow line of steps with active connectors */}
            <div className="relative">
              {/* Connective background line */}
              <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-teal-900/60 -translate-y-1/2 hidden lg:block" />
 
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 relative">
                {METHODOLOGY_STEPS.map((step, index) => {
                  const stepTrans = t.methSteps?.[step.stepNumber as 1|2|3|4|5|6] || step;
                  return (
                    <div
                      key={step.stepNumber}
                      className="bg-teal-900/40 hover:bg-teal-900/80 rounded-2xl p-5 border border-teal-800/40 hover:border-orange-500/40 shadow-inner transition-all duration-300 relative flex flex-col items-center text-center group"
                    >
                      {/* Numeric step top marker */}
                      <div className="absolute top-3 left-3 w-5 h-5 rounded-full bg-teal-950/80 text-teal-300 text-[10px] font-mono font-bold flex items-center justify-center">
                        {step.stepNumber}
                      </div>
 
                      {/* Icon Container */}
                      <div className="w-12 h-12 rounded-xl bg-teal-950 text-teal-400 flex items-center justify-center mb-4 shrink-0 shadow-sm group-hover:bg-orange-500 group-hover:text-white transition-all duration-300">
                        {step.iconName === "Eye" && <Globe size={22} />}
                        {step.iconName === "Repeat" && <CheckCircle size={22} />}
                        {step.iconName === "User" && <Users size={22} />}
                        {step.iconName === "Globe" && <BookMarked size={22} />}
                        {step.iconName === "TrendingUp" && <TrendingUp size={22} />}
                        {step.iconName === "MessageCircle" && <MessageSquare size={22} />}
                      </div>
 
                      {/* Heading */}
                      <h4 className="font-sans font-bold text-white text-sm leading-tight mb-1 group-hover:text-orange-400 transition">
                        {stepTrans.title}
                      </h4>
                      <p className="font-mono text-[9px] uppercase tracking-wider text-teal-400 font-semibold mb-2">
                        {stepTrans.subtitle}
                      </p>
                      <p className="text-teal-200/70 text-xs leading-relaxed font-sans">
                        {stepTrans.description}
                      </p>
 
                      {/* Horizontal arrow helper */}
                      {index < 5 && (
                        <div className="hidden lg:block absolute -right-3.5 top-1/2 -translate-y-1/2 z-20 text-teal-700/60 group-hover:text-orange-400 transition">
                          <ChevronRight size={16} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
        )}

        {/* 6. Courses Section */}
        {activeView === "courses" && (
        <section id="courses" className="py-20 bg-slate-50/60 border-t border-gray-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <div className="text-xs font-bold text-orange-600 uppercase tracking-widest">
                {courseLang === "EN" ? "Our Syllabus" : "Nuestro Plan de Estudios"}
              </div>
              <h2 className="font-sans font-extrabold text-3xl sm:text-4xl text-slate-950 tracking-tight leading-tight uppercase">
                {courseLang === "EN" ? "OUR COURSES" : "NUESTROS CURSOS"}
              </h2>
              <div className="h-1.5 w-16 bg-orange-500 mx-auto rounded-full" />
              <div className="flex justify-center pt-2">
                <div className="inline-flex items-center space-x-1.5 bg-white border border-gray-200 rounded-full p-1 shadow-sm">
                  <span className="text-xs font-semibold text-slate-500 px-3 py-1">
                    {courseLang === "EN" ? "View Focus Syllabus in:" : "Ver el Plan de Estudios en:"}
                  </span>
                  <button
                    onClick={() => setCourseLang("EN")}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                      courseLang === "EN" ? "bg-orange-600 text-white shadow-xs" : "text-gray-500 hover:text-slate-800"
                    }`}
                  >
                    English (EN)
                  </button>
                  <button
                    onClick={() => setCourseLang("ES")}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                      courseLang === "ES" ? "bg-orange-600 text-white shadow-xs" : "text-gray-500 hover:text-slate-800"
                    }`}
                  >
                    Español (ES)
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {COURSES.map((rawCourse) => {
                const course = getLocalizedCourse(rawCourse, courseLang);
                const badgeColorClass =
                  course.id === "a1"
                    ? "bg-teal-100 text-teal-800"
                    : course.id === "a2"
                    ? "bg-orange-100 text-orange-850"
                    : "bg-indigo-100 text-indigo-850";
                
                const cardBorderColor = 
                  course.id === "a1"
                    ? "hover:border-teal-500/20"
                    : course.id === "a2"
                    ? "hover:border-orange-500/20"
                    : "hover:border-indigo-500/20";

                const bannerBgClass =
                  course.id === "a1"
                    ? "bg-teal-950"
                    : course.id === "a2"
                    ? "bg-slate-900"
                    : "bg-indigo-950";

                const courseSubtitle =
                  courseLang === "EN"
                    ? "Designed for Beginners"
                    : course.id === "a1"
                    ? "Da tus primeros pasos."
                    : course.id === "a2"
                    ? "Fortalece tu comunicación diaria"
                    : "Exprésate con fluidez";

                return (
                  <motion.div
                    key={course.id}
                    whileHover={{ scale: 1.025, y: -6 }}
                    transition={{ type: "spring", stiffness: 350, damping: 20 }}
                    className={`bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between group ${cardBorderColor}`}
                  >
                    {/* Course card banner header */}
                    <div className={`${bannerBgClass} p-6 text-white relative overflow-hidden shrink-0`}>
                      <div className="absolute -top-10 -right-10 w-28 h-28 bg-white/5 rounded-full blur-xl animate-pulse" />
                      <div className={`inline-flex px-2.5 py-0.5 rounded-full font-sans text-[10px] font-black tracking-wider uppercase mb-2 ${badgeColorClass}`}>
                        {course.level}
                      </div>
                      <h3 className="font-sans font-black text-2xl tracking-tight leading-none uppercase text-white">
                        {course.title}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-1 uppercase tracking-wide">
                        {courseSubtitle}
                      </p>
                    </div>

                    {/* Course Outline Dynamic Tabs Navigation */}
                    <div className="px-6 pt-6 shrink-0">
                      {/* Desktop View Tabs (lg and above) */}
                      <div className="hidden lg:grid grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200/60">
                        {(["objectives", "vocabulary", "grammar", "speaking"] as const).map((tab) => {
                          const tabLabels = {
                            objectives: courseLang === "EN" ? "Objectives" : "Objetivos",
                            vocabulary: courseLang === "EN" ? "Vocabulary" : "Vocabulario",
                            grammar: courseLang === "EN" ? "Grammar" : "Gramática",
                            speaking: courseLang === "EN" ? "Practical" : "Práctica",
                          };
                          const active = (courseActiveTab[course.id] || "objectives") === tab;
                          return (
                            <button
                              key={tab}
                              onClick={() => setCourseActiveTab(prev => ({ ...prev, [course.id]: tab }))}
                              className={`min-w-0 whitespace-nowrap py-2 px-1 text-[8.5px] xl:text-[9px] font-sans font-black uppercase tracking-normal rounded-xl transition-all duration-200 cursor-pointer text-center ${
                                active
                                  ? "bg-white text-orange-600 shadow-xs"
                                  : "text-slate-500 hover:text-slate-850"
                              }`}
                            >
                              {tabLabels[tab]}
                            </button>
                          );
                        })}
                      </div>

                      {/* Mobile & Tablet Dropdown Select (below lg) */}
                      <div className="lg:hidden relative">
                        <select
                          value={courseActiveTab[course.id] || "objectives"}
                          onChange={(e) => setCourseActiveTab(prev => ({ ...prev, [course.id]: e.target.value as any }))}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-sans font-bold uppercase tracking-wider text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                        >
                          <option value="objectives">
                            {courseLang === "EN" ? "Objectives" : "Objetivos"}
                          </option>
                          <option value="vocabulary">
                            {courseLang === "EN" ? "Vocabulary" : "Vocabulario"}
                          </option>
                          <option value="grammar">
                            {courseLang === "EN" ? "Core Grammar" : "Gramática"}
                          </option>
                          <option value="speaking">
                            {courseLang === "EN" ? "Practical Speaking" : "Práctica"}
                          </option>
                        </select>
                      </div>
                    </div>

                    {/* Course outline checklists */}
                    <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={courseActiveTab[course.id] || "objectives"}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.15 }}
                          className="min-h-[145px]"
                        >
                          {/* Objectives Tab Content */}
                          {(courseActiveTab[course.id] || "objectives") === "objectives" && (
                            <div className="space-y-3 animate-in fade-in duration-200">
                              <span className="text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider">
                                {courseLang === "EN" ? "Objectives" : "Objetivos"}
                              </span>
                              <div className="space-y-2">
                                {course.objectives.map((obj: string, i: number) => (
                                  <div key={i} className="flex items-start text-xs text-slate-600">
                                    <CheckCircle size={14} className="text-emerald-500 mr-2 shrink-0 mt-0.5" />
                                    <span>{obj}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Vocabulary Tab Content */}
                          {(courseActiveTab[course.id] || "objectives") === "vocabulary" && (
                            <div className="space-y-3 animate-in fade-in duration-200">
                              <span className="text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider">
                                {courseLang === "EN" ? "Vocabulary focal points" : "Puntos clave de vocabulario"}
                              </span>
                              <div className="space-y-1.5">
                                {course.vocabulary.map((vocab: string, i: number) => (
                                  <p key={i} className="text-xs text-slate-700 pl-3 border-l-2 border-orange-500 py-0.5 leading-normal">
                                    {vocab}
                                  </p>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Grammar Tab Content */}
                          {(courseActiveTab[course.id] || "objectives") === "grammar" && (
                            <div className="space-y-3 animate-in fade-in duration-200">
                              <span className="text-[10px] font-mono uppercase font-bold text-slate-500 tracking-wider">
                                {courseLang === "EN" ? "Core Grammar Systems" : "Sistemas de gramática clave"}
                              </span>
                              <div className="space-y-2">
                                {course.grammar.map((gram: string, i: number) => (
                                  <div key={i} className="flex items-start text-xs text-slate-600 font-medium bg-slate-50 p-2.5 rounded-xl">
                                    <Award size={13} className="text-orange-500 mr-2 mt-0.5 shrink-0" />
                                    <span>{gram}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Everyday Conversation focus Tab Content */}
                          {(courseActiveTab[course.id] || "objectives") === "speaking" && (
                            <div className="space-y-3 animate-in fade-in duration-200">
                              <span className="text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider">
                                {courseLang === "EN" ? "Practical speaking scenario" : "Escenario práctico de conversación"}
                              </span>
                              <div className="space-y-2">
                                {course.conversation.map((conv: string, i: number) => (
                                  <p key={i} className="text-xs text-slate-600 flex items-center">
                                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mr-2 shrink-0" />
                                    {conv}
                                  </p>
                                ))}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    {/* Button triggers */}
                    <div className="p-6 bg-slate-50 border-t border-gray-100 space-y-2.5 shrink-0">
                      <button
                        onClick={() => setActiveSyllabus(course)}
                        className="w-full py-2.5 px-4 bg-white border border-gray-300 hover:border-orange-500 text-slate-800 hover:text-orange-600 rounded-xl text-xs font-bold font-sans tracking-wide uppercase transition flex items-center justify-center space-x-1 px-3 shadow-xs"
                      >
                        <FileText size={13} className="mr-1 shadow-xs" />
                        <span>{courseLang === "EN" ? "View Syllabus PDF" : "Ver PDF de Estudios"}</span>
                      </button>

                      <a
                        href={`https://wa.me/23272057646?text=Hola!%20I'm%20writing%20to%20request%20more%20details%20about%20the%20${course.level}%20${course.title}%20course.`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold font-sans tracking-wide uppercase transition flex items-center justify-center space-x-1 hover:shadow-md"
                      >
                        <Phone size={13} className="mr-1" />
                        <span>{courseLang === "EN" ? "Request Info on WhatsApp" : "Solicitar info en WhatsApp"}</span>
                      </a>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
        )}

        {/* 8. Student Voice / Testimonial Section & Feedback Form */}
        {activeView === "home" && (
        <section id="testimonials" className="py-20 bg-[#F8FAFC] border-t border-slate-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <div className="text-xs font-bold text-teal-600 uppercase tracking-widest">{courseLang === "EN" ? "Community feedback" : "Opiniones de la comunidad"}</div>
              <h2 className="font-sans font-black text-3xl sm:text-4xl text-slate-900 tracking-tight leading-tight uppercase">
                {courseLang === "EN" ? "STUDENT VOICE" : "LA VOZ DEL ESTUDIANTE"}
              </h2>
              <div className="h-1.5 w-16 bg-teal-500 mx-auto rounded-full" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
              {/* Testimonials list - dynamic local cache */}
              <div className="lg:col-span-7 space-y-6">
                <h4 className="text-sm font-bold uppercase text-slate-400 tracking-wider flex items-center">
                  <Star size={14} className="fill-current text-orange-500 mr-2" />
                  {courseLang === "EN" ? "What Our Beginners Say" : "Lo que dicen nuestros principiantes"}
                </h4>
                <div className="space-y-6">
                  {testimonialList.map((testimonial) => {
                    const test = getLocalizedTestimonial(testimonial, courseLang);
                    return (
                    <div
                      key={test.id}
                      className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/60 relative group shadow-sm hover:shadow-md transition-all duration-200"
                    >
                      <div className="absolute top-6 right-6 flex text-orange-400">
                        {[...Array(test.rating)].map((_, i) => (
                          <Star key={i} size={14} className="fill-current" />
                        ))}
                      </div>

                      <div className="flex space-x-4 items-center mb-4">
                        <img
                          src={test.avatarUrl}
                          alt={test.name}
                          referrerPolicy="no-referrer"
                          className="w-11 h-11 rounded-full object-cover border-2 border-orange-100 shadow-xs"
                        />
                        <div>
                          <h4 className="font-sans font-bold text-slate-900 text-sm leading-none">{test.name}</h4>
                          <span className="text-[11px] text-slate-400 leading-none">{test.location}</span>
                        </div>
                      </div>

                      <p className="text-slate-600 text-sm italic font-sans leading-relaxed">
                        "{test.text}"
                      </p>

                      {test.imageUrl && (
                        <div className={`mt-4 rounded-2xl overflow-hidden border border-slate-100 shadow-xs relative group-hover:scale-[1.01] transition-transform duration-200 ${
                          test.imageFit === "contain" ? "max-h-[560px] bg-black" : "max-h-[360px]"
                        }`}>
                          <img
                            src={test.imageUrl}
                            alt={courseLang === "EN" ? `${test.name} graduation milestone` : `Hito de graduación de ${test.name}`}
                            referrerPolicy="no-referrer"
                            className={`w-full h-full ${test.imageFit === "contain" ? "object-contain" : "object-cover"}`}
                          />
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              </div>

              {/* Small interactive feedback submit form */}
              <div className="lg:col-span-5 bg-indigo-950 text-white rounded-3xl p-6 sm:p-8 space-y-6 border border-indigo-905 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl pointer-events-none" />
                <div className="space-y-1.5">
                  <h3 className="font-sans font-bold text-lg text-white">{courseLang === "EN" ? "Share Your Initiative Voice" : "Comparte tu experiencia"}</h3>
                  <p className="text-xs text-indigo-200/80 leading-normal">
                    {courseLang === "EN"
                      ? "Are you studying with us or finished a trial lesson? Add your rating and comment directly below."
                      : "¿Estudias con nosotros o ya terminaste una clase de prueba? Añade tu valoración y comentario a continuación."}
                  </p>
                </div>

                {feedbackSuccess ? (
                  <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-6 text-center space-y-3.5 py-8 animate-in fade-in">
                    <div className="mx-auto w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                      <CheckCircle size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">¡Muchas Gracias!</h4>
                      <p className="text-xs text-slate-400 mt-1">{courseLang === "EN" ? "Your review is published, and is live in the public display feed." : "Tu reseña ha sido publicada y ya aparece en la sección pública."}</p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Name input */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-300">{courseLang === "EN" ? "Name" : "Nombre"}</label>
                        <input
                          type="text"
                          required
                          value={feedbackName}
                          onChange={(e) => setFeedbackName(e.target.value)}
                          placeholder={courseLang === "EN" ? "e.g. Sarah J." : "p. ej., Sarah J."}
                          className="w-full px-3 py-2 bg-indigo-900/40 border border-indigo-800 rounded-lg text-xs text-white placeholder-indigo-400 focus:outline-hidden focus:border-orange-500"
                        />
                      </div>

                      {/* Title input */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-300">{courseLang === "EN" ? "Profession / City" : "Profesión / Ciudad"}</label>
                        <input
                          type="text"
                          value={feedbackTitle}
                          onChange={(e) => setFeedbackTitle(e.target.value)}
                          placeholder={courseLang === "EN" ? "e.g. Chicago, USA" : "p. ej., Madrid, España"}
                          className="w-full px-3 py-2 bg-indigo-900/40 border border-indigo-800 rounded-lg text-xs text-white placeholder-indigo-400 focus:outline-hidden focus:border-orange-500"
                        />
                      </div>
                    </div>

                    {/* Star Rating selector */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-300 block">{courseLang === "EN" ? "Rating score" : "Puntuación"}</span>
                      <div className="flex space-x-1.5 p-1 bg-indigo-900/40 border border-indigo-850 rounded-xl justify-center">
                        {[1, 2, 3, 4, 5].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setFeedbackRating(num)}
                            className="p-1 hover:scale-110 transition shrink-0"
                            title={courseLang === "EN" ? `Rate ${num}` : `Valorar con ${num}`}
                          >
                            <Star
                              size={20}
                              className={`transition-colors ${
                                num <= feedbackRating ? "fill-current text-orange-400" : "text-indigo-700"
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Review text */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-300">{courseLang === "EN" ? "Your Experience" : "Tu experiencia"}</label>
                      <textarea
                        required
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        placeholder={courseLang === "EN" ? "Explain how Iniciativa Ser o Estar changed your learning paradigm..." : "Cuéntanos cómo Iniciativa Ser o Estar transformó tu forma de aprender..."}
                        rows={3}
                        className="w-full px-3 py-2.5 bg-indigo-900/40 border border-indigo-800 rounded-lg text-xs text-white placeholder-indigo-400 focus:outline-hidden focus:border-orange-500 leading-relaxed"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 px-4 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white rounded-xl text-xs font-bold font-sans tracking-wide uppercase transition shadow-md shadow-orange-950/20 flex items-center justify-center space-x-1.5"
                    >
                      <span>{courseLang === "EN" ? "Submit Feedback" : "Enviar opinión"}</span>
                      <Send size={11} />
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>
        )}

        {/* 9. Blog Section */}
        {activeView === "blog" && (
        <section id="blog" className="py-20 bg-[#F8FAFC] border-t border-slate-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <div className="text-xs font-bold text-orange-600 uppercase tracking-widest">{courseLang === "EN" ? "Self study matrix" : "Guía de autoestudio"}</div>
              <h2 className="font-sans font-black text-3xl sm:text-4xl text-slate-900 tracking-tight leading-tight uppercase">
                {courseLang === "EN" ? "FROM OUR BLOG: Spanish Tips & Culture" : "NUESTRO BLOG: CONSEJOS DE ESPAÑOL Y CULTURA"}
              </h2>
              <div className="h-1.5 w-16 bg-orange-500 mx-auto rounded-full" />
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-normal">
                {courseLang === "EN"
                  ? "Unlock actionable language tips, culture de-coders, and memory helpers published by our language specialists."
                  : "Descubre consejos prácticos de idiomas, claves culturales y recursos de memoria publicados por nuestros especialistas."}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {customBlogPosts.map((sourcePost) => {
                const post = getLocalizedBlogPost(sourcePost, courseLang);
                return (
                  <div
                    key={post.id}
                    className="bg-white rounded-3xl border border-slate-200/60 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between group h-full"
                  >
                    {/* Blog header thumbnail */}
                    <div className="relative aspect-4/3 overflow-hidden shrink-0 bg-slate-100">
                      <img
                        src={post.imageUrl}
                        alt={post.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute top-4 left-4">
                        <span className="px-2.5 py-1 rounded-md bg-slate-900/80 backdrop-blur-md text-white font-mono text-[9px] uppercase tracking-wider font-semibold">
                          {post.category}
                        </span>
                      </div>
                    </div>

                    {/* Blog Info */}
                    <div className="p-6 flex-1 space-y-3.5 flex flex-col justify-between">
                      <div className="space-y-2">
                        <span className="text-[10px] text-slate-400 font-mono flex items-center">
                          <BookOpen size={11} className="mr-1" />
                          {post.readTime}
                        </span>
                        <h3 className="font-sans font-black text-slate-900 text-lg leading-tight group-hover:text-orange-600 transition">
                          {post.title}
                        </h3>
                        <p className="text-slate-500 text-xs sm:text-sm leading-relaxed line-clamp-3">
                          {post.excerpt}
                        </p>
                      </div>

                      <button
                        onClick={() => setActiveBlog(post)}
                        className="inline-flex items-center text-xs font-bold font-sans text-orange-600 hover:text-orange-500 tracking-wide uppercase group-hover:translate-x-1.5 transition-transform duration-200 mt-2"
                      >
                        <span>{courseLang === "EN" ? "Read More" : "Leer más"}</span>
                        <ArrowRight size={13} className="ml-1 shrink-0" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
        )}

        {/* About Us section specifically linked in navigation list */}
        {activeView === "about" && (
        <section id="about" className="py-20 bg-white border-t border-slate-200">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <div className="text-xs font-bold text-teal-600 uppercase tracking-widest">
                {courseLang === "EN" ? "Our story" : "Nuestra historia"}
              </div>
              <h2 className="font-sans font-black text-3xl sm:text-4xl text-slate-900 tracking-tight leading-tight uppercase">
                {courseLang === "EN" ? "ABOUT US" : "SOBRE NOSOTROS"}
              </h2>
              <div className="h-1.5 w-16 bg-teal-500 mx-auto rounded-full" />
            </div>

            {/* Custom Brand Presentation Card */}
            <div className="flex justify-center pb-4">
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="bg-[#F6F1E8] rounded-[32px] p-10 max-w-sm w-full text-center border border-[#EBE3D5] shadow-xl flex flex-col items-center justify-center space-y-2 relative overflow-hidden"
              >
                {/* Subtle vintage texture card look */}
                <div className="absolute inset-0 bg-radial-gradient from-transparent to-[#efe7da]/30 pointer-events-none" />
                <Logo size={150} showText={true} />
              </motion.div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
              <div className="space-y-5">
                <h3 className="font-sans font-bold text-xl text-slate-900">
                  {courseLang === "EN" ? "Where Cognitive Mastery Meets Spanish Soul" : "Donde el dominio cognitivo se encuentra con el alma española"}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {courseLang === "EN" ? (
                    <>Founded in 2021 by a cooperative of native linguists and adult education psychologists, <strong>Iniciativa Ser o Estar</strong> was created to eliminate the common frustration of learning a language. We discovered that traditional classroom workflows fail English speakers because they teach rote-memory conjugation lists rather than conceptual linguistic anchors.</>
                  ) : (
                    <>Fundada en 2021 por una cooperativa de lingüistas nativos y psicólogos de educación para adultos, <strong>Iniciativa Ser o Estar</strong> fue creada para eliminar la frustración común de aprender un idioma. Descubrimos que los métodos tradicionales de aula fallan a los angloparlantes porque enseñan listas de conjugación memorizadas por repetición en lugar de anclas lingüísticas conceptuales.</>
                  )}
                </p>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {courseLang === "EN" ? (
                    <>Our customized courses are built entirely upon cognitive metaphors. That means we don't just teach you what words mean; we teach your brain how to interpret situations visually so that choosing between <strong>SER</strong> and <strong>ESTAR</strong> becomes absolute second nature.</>
                  ) : (
                    <>Nuestros cursos personalizados se construyen completamente sobre metáforas cognitivas. Eso significa que no solo te enseñamos lo que significan las palabras; enseñamos a tu cerebro a interpretar situaciones visualmente para que elegir entre <strong>SER</strong> y <strong>ESTAR</strong> se convierta en una segunda naturaleza absoluta.</>
                  )}
                </p>
                <div className="flex items-center space-x-6 pt-2">
                  <div>
                    <h4 className="font-sans font-extrabold text-2xl text-teal-600">16 Max</h4>
                    <span className="text-xs text-slate-400">
                      {courseLang === "EN" ? "Students Per Group" : "Estudiantes por Grupo"}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-sans font-extrabold text-2xl text-teal-600">100%</h4>
                    <span className="text-xs text-slate-400">
                      {courseLang === "EN" ? "Bilingual Tutors" : "Tutores Bilingües"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-gray-100 p-8 bg-slate-50 relative overflow-hidden space-y-6">
                <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full blur-2xl" />
                <h4 className="font-sans font-bold text-slate-900 border-b border-gray-200 pb-3">
                  {courseLang === "EN" ? "Our Academy Values" : "Valores de Nuestra Academia"}
                </h4>
                
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <span className="p-1 rounded-lg bg-teal-100 text-teal-600 text-xs font-mono font-bold">1</span>
                    <div>
                      <h5 className="font-sans font-bold text-slate-800 text-sm">
                        {courseLang === "EN" ? "Mistakes are Data" : "Los Errores son Datos"}
                      </h5>
                      <p className="text-xs text-slate-500">
                        {courseLang === "EN"
                          ? "We cultivate a warm, judgment-free ecosystem where errors are leveraged as steps to master complex speaking triggers."
                          : "Cultivamos un ecosistema cálido y libre de juicios donde los errores se aprovechan como pasos para dominar disparadores de conversación complejos."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <span className="p-1 rounded-lg bg-teal-100 text-teal-600 text-xs font-mono font-bold">2</span>
                    <div>
                      <h5 className="font-sans font-bold text-slate-800 text-sm">
                        {courseLang === "EN" ? "Strict Small Group Caps" : "Límites Estrictos de Grupos Pequeños"}
                      </h5>
                      <p className="text-xs text-slate-500">
                        {courseLang === "EN"
                          ? "No lecturing to masses of silent boxes. If you pay for conversation classes, you have a physical slot to speak during every single minute of interaction."
                          : "Nada de dar conferencias a masas de recuadros silenciosos. Si pagas por clases de conversación, tienes un espacio real para hablar durante cada minuto de interacción."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <span className="p-1 rounded-lg bg-teal-100 text-teal-600 text-xs font-mono font-bold">3</span>
                    <div>
                      <h5 className="font-sans font-bold text-slate-800 text-sm">
                        {courseLang === "EN" ? "Cultural Humility" : "Humildad Cultural"}
                      </h5>
                      <p className="text-xs text-slate-500">
                        {courseLang === "EN"
                          ? "We explore regional culinary art, colloquial accents, and local proverbs as active pillars of functional grammar."
                          : "Exploramos el arte culinario regional, los acentos coloquiales y los proverbios locales como pilares activos de la gramática funcional."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Meet Our Instructors Sub-Section */}
            <div className="pt-20 border-t border-slate-100 space-y-10">
              <div className="text-center max-w-2xl mx-auto space-y-3">
                <div className="text-xs font-bold text-orange-600 uppercase tracking-widest flex items-center justify-center gap-1.5">
                  <GraduationCap size={15} />
                  <span>
                    {courseLang === "EN" ? "Academic Excellence" : "Excelencia Académica"}
                  </span>
                </div>
                <h3 className="font-sans font-black text-2xl sm:text-3xl text-slate-900 tracking-tight leading-tight uppercase">
                  {courseLang === "EN" ? "MEET OUR INSTRUCTOR TEAM" : "CONOCE A NUESTRO EQUIPO DE INSTRUCTORES"}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
                  {courseLang === "EN"
                    ? "Learn from qualified native speakers and bilingual educators who specialize in neural learning patterns and English-Spanish cognitive transfers."
                    : "Aprende de hablantes nativos calificados y educadores bilingües que se especializan en patrones de aprendizaje neuronal y transferencias cognitivas de inglés a español."}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
                {/* Instructor 1 */}
                <motion.div
                  whileHover={{ scale: 1.025, y: -4 }}
                  transition={{ type: "spring", stiffness: 350, damping: 22 }}
                  className="bg-white rounded-3xl border border-slate-100 shadow-md hover:shadow-xl transition-all duration-300 p-6 space-y-5 flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    {/* Stylized Avatar header with lettermark */}
                    <div className="flex items-center space-x-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center font-black text-xl shadow-md shrink-0">
                        XV
                      </div>
                      <div>
                        <h4 className="font-sans font-black text-slate-900 text-base leading-tight">
                          Xiomara Villamizar
                        </h4>
                        <p className="text-xs text-orange-600 font-semibold text-left">
                          {courseLang === "EN" ? "Director of Cognitive Pedagogy" : "Director de Pedagogía Cognitiva"}
                        </p>
                      </div>
                    </div>
                    <div className="h-0.5 bg-slate-50 w-full" />
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed text-left">
                      {courseLang === "EN"
                        ? "Xiomara supports A1 and A2 learners with structured grammar guidance, pronunciation correction, and practical classroom routines drawn from the tutor template schedule."
                        : "Xiomara acompaña a estudiantes A1 y A2 con guía gramatical estructurada, corrección de pronunciación y rutinas prácticas tomadas del horario de la plantilla de tutores."}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-slate-50/80 mt-auto flex flex-col space-y-1.5 text-left">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      {courseLang === "EN" ? "Expertise / Background:" : "Especialidad / Trayectoria:"}
                    </span>
                    <span className="text-xs text-slate-700 font-medium">
                      {courseLang === "EN" ? "MA in Cognitive Linguistics (Madrid), DELE Examiner." : "Máster en Lingüística Cognitiva (Madrid), Examinador DELE."}
                    </span>
                  </div>
                </motion.div>

                {/* Instructor 2 */}
                <motion.div
                  whileHover={{ scale: 1.025, y: -4 }}
                  transition={{ type: "spring", stiffness: 350, damping: 22 }}
                  className="bg-white rounded-3xl border border-slate-100 shadow-md hover:shadow-xl transition-all duration-300 p-6 space-y-5 flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-500 text-white flex items-center justify-center font-black text-xl shadow-md shrink-0">
                        IF
                      </div>
                      <div>
                        <h4 className="font-sans font-black text-slate-900 text-base leading-tight">
                          Ivoneth Frias
                        </h4>
                        <p className="text-xs text-teal-600 font-semibold text-left">
                          {courseLang === "EN" ? "Lead Conversational Mentor" : "Mentora Principal de Conversación"}
                        </p>
                      </div>
                    </div>
                    <div className="h-0.5 bg-slate-50 w-full" />
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed text-left">
                      {courseLang === "EN"
                        ? "Ivoneth helps coordinate group delivery, live practice, and revision sessions so students receive steady support online and face-to-face when needed."
                        : "Ivoneth ayuda a coordinar la enseñanza grupal, la práctica en vivo y las sesiones de repaso para que los estudiantes reciban apoyo constante en línea y presencial cuando sea necesario."}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-slate-50/80 mt-auto flex flex-col space-y-1.5 text-left">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      {courseLang === "EN" ? "Expertise / Background:" : "Especialidad / Trayectoria:"}
                    </span>
                    <span className="text-xs text-slate-700 font-medium">
                      {courseLang === "EN" ? "Bilingual Acquisition Coach, Instituto Cervantes Associate." : "Entrenadora de Adquisición Bilingüe, Asociada del Instituto Cervantes."}
                    </span>
                  </div>
                </motion.div>

                {/* Instructor 3 */}
                <motion.div
                  whileHover={{ scale: 1.025, y: -4 }}
                  transition={{ type: "spring", stiffness: 350, damping: 22 }}
                  className="bg-white rounded-3xl border border-slate-100 shadow-md hover:shadow-xl transition-all duration-300 p-6 space-y-5 flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-500 text-white flex items-center justify-center font-black text-xl shadow-md shrink-0">
                        GU
                      </div>
                      <div>
                        <h4 className="font-sans font-black text-slate-900 text-base leading-tight text-left">
                          Guerly
                        </h4>
                        <p className="text-xs text-blue-600 font-semibold text-left">
                          {courseLang === "EN" ? "Romance Pedagogy Specialist" : "Especialista en Pedagogía Romance"}
                        </p>
                      </div>
                    </div>
                    <div className="h-0.5 bg-slate-50 w-full" />
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed text-left">
                      {courseLang === "EN"
                        ? "Guerly works with beginner and elementary groups on core Spanish structures, weekly practice plans, and follow-up activities that keep learners moving."
                        : "Guerly trabaja con grupos principiantes y elementales en estructuras básicas del español, planes de práctica semanales y actividades de seguimiento que mantienen el avance."}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-slate-50/80 mt-auto flex flex-col space-y-1.5 text-left">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      {courseLang === "EN" ? "Expertise / Background:" : "Especialidad / Trayectoria:"}
                    </span>
                    <span className="text-xs text-slate-700 font-medium">
                      {courseLang === "EN" ? "MA in Romance Philology from UNIMAK, Local Coordinator." : "Máster en Filología Románica por UNIMAK, Coordinador Local."}
                    </span>
                  </div>
                </motion.div>

                {/* Instructor 4 */}
                <motion.div
                  whileHover={{ scale: 1.025, y: -4 }}
                  transition={{ type: "spring", stiffness: 350, damping: 22 }}
                  className="bg-white rounded-3xl border border-slate-100 shadow-md hover:shadow-xl transition-all duration-300 p-6 space-y-5 flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-sky-500 text-white flex items-center justify-center font-black text-xl shadow-md shrink-0">
                        LA
                      </div>
                      <div>
                        <h4 className="font-sans font-black text-slate-900 text-base leading-tight text-left">
                          Lashika
                        </h4>
                        <p className="text-xs text-cyan-700 font-semibold text-left">
                          {courseLang === "EN" ? "Live Practice Facilitator" : "Facilitadora de Práctica en Vivo"}
                        </p>
                      </div>
                    </div>
                    <div className="h-0.5 bg-slate-50 w-full" />
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed text-left">
                      {courseLang === "EN"
                        ? "Lashika supports oral practice, revision classes, and extra sessions so learners can recover missed concepts and build speaking confidence."
                        : "Lashika apoya la práctica oral, las clases de repaso y las sesiones extra para que los estudiantes recuperen conceptos y ganen confianza al hablar."}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-slate-50/80 mt-auto flex flex-col space-y-1.5 text-left">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      {courseLang === "EN" ? "Expertise / Background:" : "Especialidad / Trayectoria:"}
                    </span>
                    <span className="text-xs text-slate-700 font-medium">
                      {courseLang === "EN" ? "Conversation drills, recovery sessions, and student support." : "Práctica conversacional, sesiones de recuperación y apoyo estudiantil."}
                    </span>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Our Partners Sub-Section */}
            <div className="pt-20 border-t border-slate-100 space-y-10">
              <div className="text-center max-w-2xl mx-auto space-y-3">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center justify-center gap-1.5">
                  <Handshake size={15} />
                  <span>
                    {courseLang === "EN" ? "Strategic Alliances" : "Alianzas Estratégicas"}
                  </span>
                </div>
                <h3 className="font-sans font-black text-2xl sm:text-3xl text-slate-900 tracking-tight leading-tight uppercase">
                  {courseLang === "EN" ? "OUR ESTEEMED PARTNERS" : "NUESTROS PRESTIGIOSOS SOCIOS"}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
                  {courseLang === "EN"
                    ? "We are proud to collaborate with prestigious organizations to foster mutual cultural awareness and expand high-efficacy language education across Sierra Leone."
                    : "Nos enorgullece colaborar con organizaciones de gran prestigio para fomentar la conciencia cultural mutua y expandir la educación lingüística de alta eficacia."}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Partner 1 */}
                <motion.div
                  whileHover={{ scale: 1.015 }}
                  className="bg-slate-50 rounded-3xl border border-slate-100 p-6 flex flex-col space-y-4 text-left"
                >
                  <div className="flex items-center space-x-3.5">
                    <div className="w-11 h-11 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 shadow-sm border border-orange-200">
                      <Building2 size={20} />
                    </div>
                    <div>
                      <h4 className="font-sans font-black text-slate-900 text-sm tracking-tight leading-none">
                        {courseLang === "EN" ? "Spanish Embassy" : "Embajada de España"}
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">{courseLang === "EN" ? "Sierra Leone Cooperation" : "Cooperación con Sierra Leona"}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed text-left">
                    {courseLang === "EN"
                      ? "Official cultural partnership platform. We collaborate on national DELE examiner training guidelines and participate in embassy-supported linguistic seminars and cultural dialogue events in Freetown."
                      : "Plataforma oficial de colaboración cultural. Cooperamos en las directrices nacionales para la formación de examinadores DELE y participamos en seminarios lingüísticos y encuentros de diálogo cultural respaldados por la embajada en Freetown."}
                  </p>
                </motion.div>

                {/* Partner 2 */}
                <motion.div
                  whileHover={{ scale: 1.015 }}
                  className="bg-slate-50 rounded-3xl border border-slate-100 p-6 flex flex-col space-y-4 text-left"
                >
                  <div className="flex items-center space-x-3.5">
                    <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 shadow-sm border border-teal-100">
                      <Building2 size={20} />
                    </div>
                    <div>
                      <h4 className="font-sans font-black text-slate-900 text-sm tracking-tight leading-none">
                        {courseLang === "EN" ? "Government of Sierra Leone" : "Gobierno de Sierra Leona"}
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">{courseLang === "EN" ? "Education & Culture Divisions" : "Divisiones de Educación y Cultura"}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed text-left">
                    {courseLang === "EN"
                      ? "Collaborating with educational authorities and national ministries to promote multilingualism as a pillar of professional development, facilitating modern linguistic methodologies for secondary programs."
                      : "Colaboramos con autoridades educativas y ministerios nacionales para promover el multilingüismo como pilar del desarrollo profesional e impulsar metodologías lingüísticas modernas en los programas de secundaria."}
                  </p>
                </motion.div>

                {/* Partner 3 */}
                <motion.div
                  whileHover={{ scale: 1.015 }}
                  className="bg-slate-50 rounded-3xl border border-slate-100 p-6 flex flex-col space-y-4 text-left"
                >
                  <div className="flex items-center space-x-3.5">
                    <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-sm border border-blue-100">
                      <GraduationCap size={20} />
                    </div>
                    <div>
                      <h4 className="font-sans font-black text-slate-900 text-sm tracking-tight leading-none">
                        UNIMAK
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">{courseLang === "EN" ? "University of Makeni Alliance" : "Alianza con la Universidad de Makeni"}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed text-left">
                    {courseLang === "EN"
                      ? "Active academic alignment with the University of Makeni. Our partnership supports joint Romance linguistics studies, teacher placement networks, student exchanges, and dual-credit training courses."
                      : "Mantenemos una colaboración académica activa con la Universidad de Makeni. Nuestra alianza apoya estudios conjuntos de lingüística románica, redes de prácticas docentes, intercambios estudiantiles y cursos formativos con créditos compartidos."}
                  </p>
                </motion.div>
              </div>
            </div>
          </div>
        </section>
        )}

        {/* 11. Final CTA Section & Contact Info */}
        {activeView === "contact" && (
        <section id="contact" className="py-20 bg-[#F8FAFC]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-10">
            <div className="space-y-3 max-w-xl mx-auto">
              <span className="text-xs font-bold text-orange-600 uppercase tracking-widest block">{courseLang === "EN" ? "Get started" : "Comienza ahora"}</span>
              <h2 className="font-sans font-black text-3xl sm:text-4xl text-slate-900 tracking-tight leading-none uppercase">
                {courseLang === "EN" ? "READY TO MASTER SPANISH WITH INICIATIVA SER o ESTAR?" : "¿LISTO PARA DOMINAR EL ESPAÑOL CON INICIATIVA SER o ESTAR?"}
              </h2>
              <div className="h-1.5 w-16 bg-orange-500 mx-auto rounded-full" />
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed pt-1">
                {courseLang === "EN"
                  ? "Have specific queries about group placements, evening availability, or custom materials? Connect with a native tutor instantly via instant chat."
                  : "¿Tienes preguntas sobre la asignación de grupos, los horarios nocturnos o los materiales personalizados? Comunícate al instante con un tutor nativo."}
              </p>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-sm max-w-xl mx-auto border border-slate-200/60 flex flex-col items-center space-y-5">
              <a
                href="https://wa.me/23272057646?text=Hola!%20I'm%20writing%20to%20ask%20about%20specialized%20classes%20for%20English%20speakers."
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center py-3.5 px-8 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl font-bold font-sans text-sm tracking-wide transition shadow-lg shadow-emerald-600/10 group cursor-pointer"
              >
                <Phone size={16} className="mr-2 fill-current animate-bounce group-hover:scale-105" />
                <span>{courseLang === "EN" ? "Chat via WhatsApp" : "Chatear por WhatsApp"}</span>
              </a>
              <p className="text-xs text-slate-500">
                <strong>WhatsApp:</strong> {courseLang === "EN" ? "Ask about specialized classes for English speakers" : "Pregunta por las clases especializadas para angloparlantes"}
              </p>

              <div className="w-full grid grid-cols-2 gap-4 pt-6 border-t border-gray-100 text-xs text-slate-500">
                <div className="text-left space-y-1">
                  <span className="font-bold text-slate-800">{courseLang === "EN" ? "Academy Hubs:" : "Sedes de la academia:"}</span>
                  <p>
                    Madrid, España &bull; Medellín, Colombia<br />
                    Freetown, {courseLang === "EN" ? "Sierra Leone" : "Sierra Leona"} &bull; Virginia, {courseLang === "EN" ? "USA" : "EE. UU."}<br />
                    CDMX, {courseLang === "EN" ? "Mexico" : "México"}
                  </p>
                </div>
                <div className="text-left space-y-1">
                  <span className="font-bold text-slate-800">{courseLang === "EN" ? "Support Hours:" : "Horario de atención:"}</span>
                  <p>{courseLang === "EN" ? "Mon - Fri" : "Lun - Vie"}: 8:00 - 20:00 UTC<br />{courseLang === "EN" ? "Sat" : "Sáb"}: 9:00 - 15:00 UTC</p>
                </div>
              </div>
            </div>
          </div>
        </section>
        )}

        {/* Global Footer (The Dark Navy Sidebar / Global Footer combination) */}
        <footer className="bg-slate-950 text-slate-400 text-xs py-12 border-t border-slate-900 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex flex-col items-center md:items-start text-center md:text-left">
              <span className="font-sans font-black text-white tracking-tight uppercase text-sm">
                INICIATIVA SER <span className="text-orange-500 font-extrabold">o</span> ESTAR
              </span>
              <div className="flex items-center space-x-2 mt-1 flex-wrap gap-1">
                <span className="text-[10px] tracking-widest text-slate-500 uppercase leading-none">
                  {t.footerDesc}
                </span>
                <button
                  onClick={() => setCurrentPortal("admin")}
                  className="text-slate-800 hover:text-orange-500/40 transition flex items-center bg-[#070b13] hover:bg-slate-900 border border-slate-900 rounded-sm px-1.5 py-0.5 text-[8px] font-mono leading-none select-none cursor-pointer"
                  title={courseLang === "EN" ? "Developer Access Gateway" : "Acceso para desarrolladores"}
                >
                  <span>{t.footerStaffAccess}</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-700 mt-3">
                &copy; {new Date().getFullYear()} Iniciativa Ser o Estar. {courseLang === "EN" ? "All rights reserved. Licensed developer workspaces active." : "Todos los derechos reservados. Espacios de desarrollo autorizados activos."}
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-[11px] font-medium font-sans">
              <button onClick={() => handleNavigate("home")} className="hover:text-white transition">{courseLang === "EN" ? "Home" : "Inicio"}</button>
              <button onClick={() => handleNavigate("home")} className="hover:text-white transition">{courseLang === "EN" ? "What Sets Us Apart?" : "¿Qué nos diferencia?"}</button>
              <button onClick={() => handleNavigate("courses")} className="hover:text-white transition">{courseLang === "EN" ? "Our Courses" : "Nuestros cursos"} [EN | ES]</button>
              <button onClick={() => handleNavigate("methodology")} className="hover:text-white transition">{courseLang === "EN" ? "Methodology" : "Metodología"}</button>
              <button onClick={() => handleNavigate("about")} className="hover:text-white transition">{courseLang === "EN" ? "About Us" : "Sobre nosotros"}</button>
              <button onClick={() => handleNavigate("contact")} className="hover:text-white transition">{courseLang === "EN" ? "Contact" : "Contacto"}</button>
              <a href="/privacy.html" className="hover:text-white transition">{courseLang === "EN" ? "Privacy" : "Privacidad"}</a>
              <a href="/terms.html" className="hover:text-white transition">{courseLang === "EN" ? "Terms" : "Términos"}</a>
            </div>
          </div>
        </footer>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* 12. Floating Buttons */}
      
      {/* Floating WhatsApp/Contact Button Visible on Mobile Only (Right side) */}
      <a
        id="floating-mobile-whatsapp-btn"
        href="https://wa.me/23272057646?text=Hola!%20Interested%20in%20Ser%20o%20Estar."
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-6 left-6 z-30 lg:hidden p-3 rounded-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-xl shadow-emerald-600/30 transition hover:scale-105"
        title="Chat via WhatsApp"
      >
        <Phone size={24} className="fill-current" />
      </a>

      {/* Floating Blue Chat Button at the Bottom-Right Corner (Toggles interactive Virtual Bot) */}
      <div className="fixed bottom-6 right-6 z-30 flex flex-col items-end">
        <AnimatePresence>
          {chatOpen && (
            <motion.div
              id="floating-virtual-chatbot-container"
              initial={{ opacity: 0, scale: 0.8, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 30 }}
              transition={{ type: "spring", damping: 25, stiffness: 380 }}
              className="mb-3.5 bg-slate-900 border border-slate-800 rounded-3xl w-72 sm:w-80 shadow-2xl overflow-hidden flex flex-col text-slate-200 text-left"
            >
              {/* Bot Header */}
              <div className="bg-slate-950 p-4 border-b border-slate-800 flex justify-between items-center">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-full bg-orange-600/20 text-orange-400 flex items-center justify-center font-bold text-xs ring-1 ring-orange-500/20">
                    S|E
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white font-sans leading-none">
                      {courseLang === "EN" ? "Iniciativa Ser o Estar Helpbot" : "Asistente Iniciativa Ser o Estar"}
                    </p>
                    <p className="text-[10px] text-emerald-400 mt-1 flex items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-ping" />
                      {courseLang === "EN" ? "Interactive assistant" : "Asistente interactivo"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setChatOpen(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                  aria-label="Close chatbot"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Chatbot thread logs */}
              <div className="p-4 space-y-3 max-h-56 overflow-y-auto leading-relaxed text-xs">
                {chatAnswers.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col space-y-0.5 max-w-[85%] ${
                      msg.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"
                    }`}
                  >
                    <p
                      className={`p-3 rounded-2xl ${
                        msg.sender === "user" ? "bg-orange-600 text-white rounded-tr-xs" : "bg-slate-850 border border-slate-800 text-slate-200 rounded-tl-xs"
                      }`}
                    >
                      {msg.text}
                    </p>
                  </div>
                ))}

                {chatLoading && (
                  <div className="mr-auto items-start max-w-[85%] flex flex-col space-y-0.5">
                    <div className="p-3 rounded-2xl bg-slate-850 border border-slate-800 text-slate-400 rounded-tl-xs flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                )}

                {showWhatsAppEscalation && (
                  <div className="p-3.5 bg-emerald-950/40 border border-emerald-800/80 rounded-2xl flex flex-col space-y-2 mt-2 items-center text-center">
                    <p className="text-[10.5px] text-emerald-300 font-medium leading-normal">
                      {courseLang === "EN" ? "Still need help? Chat with a real person on WhatsApp." : "¿Aún necesitas ayuda? Chatea con una persona real por WhatsApp."}
                    </p>
                    <a
                      href={courseLang === "EN" 
                        ? "https://wa.me/23272057646?text=Hola!%20I%20need%20additional%20help%20with%20Ser%20o%20Estar%20classes."
                        : "https://wa.me/23272057646?text=Hola!%20Necesito%20ayuda%20adicional%20con%2520las%2520clases%2520de%2520Ser%2520o%2520Estar."}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-lg font-bold text-[9px] tracking-wider uppercase transition cursor-pointer shadow-md"
                    >
                      <Phone size={10} className="mr-1.5 fill-current" />
                      <span>{courseLang === "EN" ? "Connect to WhatsApp" : "Conectar a WhatsApp"}</span>
                    </a>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Chat Input Field Form */}
              <form onSubmit={handleSendMessage} className="p-3 bg-slate-950 border-t border-slate-850 flex items-center space-x-1.5 shrink-0">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={courseLang === "EN" ? "Ask a question..." : "Haz una pregunta..."}
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs placeholder-slate-500 text-white focus:outline-hidden focus:border-orange-500 font-sans"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || chatLoading}
                  className="p-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white disabled:opacity-45 disabled:pointer-events-none transition cursor-pointer"
                >
                  <Send size={12} />
                </button>
              </form>

              {/* FAQ suggestions */}
              <div className="p-3 bg-slate-950/80 border-t border-slate-800/80 space-y-1.5 shrink-0">
                <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest pl-1">
                  {courseLang === "EN" ? "Quick Select FAQs:" : "Preguntas frecuentes rápidas:"}
                </span>
                <div className="flex flex-col space-y-1 text-left">
                  {chatbotFAQ.map((faq, i) => (
                    <button
                      key={i}
                      onClick={() => handleFAQClick(faq.q, faq.a)}
                      className="w-full text-left p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-orange-500/50 hover:bg-slate-850 text-[10px] text-slate-300 hover:text-white transition cursor-pointer"
                    >
                      {faq.q}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          id="floating-blue-guide-chat-btn"
          onClick={() => setChatOpen(!chatOpen)}
          className="p-4 rounded-full bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white shadow-xl shadow-sky-600/30 transition hover:scale-105 shrink-0 cursor-pointer"
          title={courseLang === "EN" ? "Interactive Help" : "Ayuda interactiva"}
        >
          {chatOpen ? <X size={24} /> : <MessageSquare size={24} />}
        </button>
      </div>

      {/* RENDER MODAL: Blog Reader page */}
      <AnimatePresence>
        {activeBlog && (
          <BlogModal post={activeBlog} onClose={() => setActiveBlog(null)} lang={courseLang} />
        )}
      </AnimatePresence>

      {/* RENDER MODAL: Syllabus PDF detail matrix */}
      <AnimatePresence>
        {activeSyllabus && (
          <SyllabusModal course={activeSyllabus} onClose={() => setActiveSyllabus(null)} lang={courseLang} />
        )}
      </AnimatePresence>

      {/* RENDER MODAL: Booking Trial Class */}
      <AnimatePresence>
        {bookingModalOpen && (
          <div id="booking-trial-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.85 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 bg-slate-900 backdrop-blur-sm"
              onClick={() => setBookingModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 25 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 25 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative bg-white rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl border border-gray-100 flex flex-col z-10 text-slate-800"
            >
              <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-4 shrink-0">
                <h3 className="font-sans font-bold text-slate-900 text-lg flex items-center">
                  <Calendar size={18} className="text-orange-600 mr-2" />
                  {courseLang === "EN" ? "Book Your Free Trial Class" : "Reserva tu clase de prueba gratis"}
                </h3>
                <button
                  onClick={() => setBookingModalOpen(false)}
                  className="p-1 px-2.5 rounded-full bg-gray-150 text-gray-400 hover:text-orange-600 hover:bg-gray-200 transition cursor-pointer"
                  aria-label="Close booking modal"
                >
                  <X size={16} />
                </button>
              </div>

              {bookSuccess ? (
              <div className="text-center space-y-4 py-8">
                <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <CheckCircle size={28} />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">
                    {courseLang === "EN" ? "Trial Class Secured!" : "¡Clase de prueba asegurada!"}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {courseLang === "EN"
                      ? "Your WhatsApp request is ready. Send it to our academy team to confirm your preferred class slot."
                      : "Tu solicitud de WhatsApp está lista. Envíala a nuestro equipo para confirmar tu horario de clase preferido."}
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleBookingSubmit} className="space-y-4 text-left">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                    {courseLang === "EN" ? "Your Full Name" : "Tu nombre completo"}
                  </label>
                  <input
                    type="text"
                    required
                    value={bookName}
                    onChange={(e) => setBookName(e.target.value)}
                    placeholder={courseLang === "EN" ? "e.g. Eleanor Vance" : "ej. Eleanor Vance"}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-gray-400 focus:outline-hidden focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                    {courseLang === "EN" ? "Your Email Address" : "Tu correo electrónico"}
                  </label>
                  <input
                    type="email"
                    required
                    value={bookEmail}
                    onChange={(e) => setBookEmail(e.target.value)}
                    placeholder={courseLang === "EN" ? "e.g. eleanor@vance.com" : "ej. eleanor@vance.com"}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-gray-400 focus:outline-hidden focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                    {courseLang === "EN" ? "Target Proficiency" : "Competencia objetivo"}
                  </label>
                  <select
                    value={bookLevel}
                    onChange={(e) => setBookLevel(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-orange-500"
                  >
                    <option value="Beginner A1">
                      {courseLang === "EN" ? "Beginner (Level A1 - Zero Spanish)" : "Principiante (Nivel A1 - Español desde Cero)"}
                    </option>
                    <option value="Elementary A2">
                      {courseLang === "EN" ? "Elementary (Level A2 - Basic Phrases)" : "Elemental (Nivel A2 - Frases Básicas)"}
                    </option>
                    <option value="Intermediate B1">
                      {courseLang === "EN" ? "Intermediate (Level B1 - Conversational)" : "Intermedio (Nivel B1 - Conversacional)"}
                    </option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                    {courseLang === "EN" ? "Preferable Slot Time" : "Horario de preferencia"}
                  </label>
                  <input
                    type="text"
                    value={bookTime}
                    required
                    onChange={(e) => setBookTime(e.target.value)}
                    placeholder={courseLang === "EN" ? "e.g. Tuesdays evenings or Saturdays am" : "ej. Martes por la tarde o Sábados por la mañana"}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-gray-400 focus:outline-hidden focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 px-4 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold font-sans tracking-wide uppercase rounded-xl transition shadow-xl shadow-orange-600/10 flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <span>{courseLang === "EN" ? "Request My Free Slot" : "Solicitar mi clase gratis"}</span>
                  <ArrowRight size={13} />
                </button>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    </div>
    </React.Suspense>
  );
}
