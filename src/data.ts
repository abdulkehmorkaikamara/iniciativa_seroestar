/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Course, Testimonial, BlogPost, Feature, MethodologyStep } from "./types";

export const COURSES: Course[] = [
  {
    id: "a1",
    level: "Level A1",
    title: "Beginner",
    objectives: [
      "No prior knowledge needed",
      "Construct basic sentence structures",
      "Master essential sounds & rhythms"
    ],
    vocabulary: [
      "Greetings & introductions",
      "Food, family, & hobbies",
      "Time, colors, & daily items"
    ],
    grammar: [
      "Present tense regular verbs",
      "Ser & Estar basis (Part I)",
      "Gender & agreement rules"
    ],
    conversation: [
      "Introduce yourself with ease",
      "Order food at local cafes",
      "Ask for basic directions"
    ],
    syllabusUrl: "#syllabus-a1"
  },
  {
    id: "a2",
    level: "Level A2",
    title: "Elementary",
    objectives: [
      "Navigate daily conversations",
      "Comprehend standard speech",
      "Describe routines & events"
    ],
    vocabulary: [
      "Daily habits & routines",
      "Weather, climate, & clothing",
      "Travel, hotels, & airports"
    ],
    grammar: [
      "Past tenses introduction",
      "Reflexive verb systems",
      "Direct & indirect pronouns"
    ],
    conversation: [
      "Narrate past experiences",
      "Complete store purchases",
      "Discuss simple future plans"
    ],
    syllabusUrl: "#syllabus-a2"
  },
  {
    id: "b1",
    level: "Level B1",
    title: "Intermediate",
    objectives: [
      "Speak fluently with ease",
      "Handle unexpected situations",
      "Express nuanced opinions"
    ],
    vocabulary: [
      "Abstract topics & emotions",
      "Careers, resumes, & commerce",
      "Current affairs & media"
    ],
    grammar: [
      "Subjunctive mood intro",
      "Hypotheses & conditional",
      "Advanced Ser vs Estar"
    ],
    conversation: [
      "Debate interesting topics",
      "Explain movie/book plots",
      "Write formal correspondences"
    ],
    syllabusUrl: "#syllabus-b1"
  }
];

export const METHODOLOGY_STEPS: MethodologyStep[] = [
  {
    stepNumber: 1,
    title: "Visual Tools",
    subtitle: "Interactive Props",
    description: "Break complex concepts (like Ser vs Estar) into intuitive, sensory visual aids rather than dry worksheets.",
    iconName: "Eye"
  },
  {
    stepNumber: 2,
    title: "Collaborative Didactics",
    subtitle: "Small-Group Methodology",
    description: "Learning in groups of up to 6 students. Our didactics center on collaborative tasks.",
    iconName: "Repeat"
  },
  {
    stepNumber: 3,
    title: "Personalized Content",
    subtitle: "Custom Path",
    description: "Curriculum responds dynamically to your English-equivalent speech patterns to target specific pronunciation traps.",
    iconName: "User"
  },
  {
    stepNumber: 4,
    title: "Cultural Communication",
    subtitle: "Real Immersion",
    description: "Learn colloquial metaphors, regional idioms, and authentic social customs from different spanish speaking countries.",
    iconName: "Globe"
  },
  {
    stepNumber: 5,
    title: "Feedback & Tracking",
    subtitle: "Continuous Progress",
    description: "Micro-evaluations measure listening capture and speech speed, mapping growth transparently with tutor supported exams.",
    iconName: "TrendingUp"
  },
  {
    stepNumber: 6,
    title: "Live Online Classes",
    subtitle: "Free flow",
    description: "Live online classes in a dynamic environment, with real-time interaction and active speaking drills.",
    iconName: "MessageCircle"
  }
];

export const FEATURES: Feature[] = [
  {
    id: "connect",
    title: "Connect globally",
    description: "Learn Spanish to communicate with people across countries and cultures, opening doors to 20+ Spanish-speaking nations.",
    icon: "Globe"
  },
  {
    id: "culture",
    title: "Discover culture",
    description: "Decode vibrant Spanish lyrics, understand culinary traditions, savor fine literature, and dive into beautiful festivals.",
    icon: "Music"
  },
  {
    id: "career",
    title: "Improve career",
    description: "Unlock international business opportunities and make a massive difference in multicultural communities.",
    icon: "Briefcase"
  },
  {
    id: "mind",
    title: "Enhance your mind",
    description: "Adult bilingualism optimizes memory span, focus precision, and cognitive flexibility. Learning with us will keep your brain young and active for much longer.",
    icon: "Brain"
  }
];

export const BLOG_POSTS: BlogPost[] = [
  {
    id: "face-to-face-spanish-when-needed",
    title: "Flexible Spanish Learning: Online First, Face-to-Face When Needed",
    excerpt: "Our classes are built for modern online learning, but when learners need closer guidance, we can also deliver focused face-to-face Spanish sessions for small groups and special learning needs.",
    imageUrl: "/src/assets/images/blog_face_to_face_ambassador_warm_studio.png",
    readTime: "4 min read",
    category: "Learning Model",
    contentMarkdown: `### Flexible Spanish Learning: Online First, Face-to-Face When Needed

At Iniciativa Ser o Estar, we believe language learning should adapt to the learner, not the other way around. Our core model is online, structured, and accessible, but we also understand that some learning moments require human presence in the same room.

That is why we can deliver face-to-face Spanish sessions when the need arises. These sessions are especially useful for pronunciation coaching, confidence building, oral practice, group revision, exam preparation, and learners who benefit from direct classroom interaction.

#### Why in-person support still matters
Online learning gives students flexibility, consistency, and access. Face-to-face learning adds another layer: immediate correction, natural conversation, body language, group energy, and the confidence that comes from speaking Spanish in real time.

Our in-person sessions are designed to be practical and focused. We do not simply repeat textbook explanations. We work with the learner's real challenges: speaking hesitation, grammar confusion, listening gaps, and the common fear of making mistakes.

#### A blended model for serious learners
* Online classes provide structure and continuity.
* Face-to-face sessions provide deeper correction and personal attention.
* Small groups create a safe space for real conversation.
* Learners receive practical feedback they can apply immediately.

Whether online or in person, our mission remains the same: to help students understand Spanish clearly, speak with confidence, and use the language in real life. When a learner needs closer support, we are ready to meet that need.`
  },
  {
    id: "spanish-diplomacy-sierra-leone",
    title: "Spanish Language Diplomacy Reaches Sierra Leone",
    excerpt: "The Embassy of Spain in Guinea highlighted Ambassador Carrascal's eighth official visit to Sierra Leone, connecting Independence Day events with World Spanish Language Day initiatives.",
    imageUrl: "/src/assets/images/blog_spanish_embassy_sierra_leone.png",
    readTime: "3 min read",
    category: "Culture News",
    contentMarkdown: `### Spanish Language Diplomacy Reaches Sierra Leone

The Embassy of Spain in Guinea shared that Ambassador Carrascal made his eighth official visit to Sierra Leone. The visit took place around the country's Independence Day events and also supported initiatives connected to World Spanish Language Day.

#### English translation of the original Spanish note
The Spanish Ambassador, Carrascal, has made his eighth official visit to Sierra Leone to attend the events held in the framework of the country's Independence Day and to promote initiatives on the occasion of World Spanish Language Day.

For learners in Sierra Leone, moments like this matter. They show that Spanish is not only a classroom subject; it is also a bridge for cultural exchange, diplomacy, travel, education, and future professional opportunities.

At Iniciativa Ser o Estar, we see this as a clear sign that Spanish learning in West Africa is becoming more visible, more practical, and more connected to real-world opportunity.`
  },
  {
    id: "spanish-gains-ground-africa",
    title: "Spanish Gains Ground in Africa",
    excerpt: "Across African classrooms and universities, interest in Spanish is growing as students connect the language with culture, study pathways, diplomacy, and international opportunity.",
    imageUrl: "/src/assets/images/blog_spanish_gains_ground_africa.png",
    readTime: "4 min read",
    category: "Language Access",
    contentMarkdown: `### Spanish Gains Ground in Africa

Spanish is gaining ground across Africa, and the momentum is easy to understand. Students are increasingly seeing Spanish as a language of travel, culture, international cooperation, education, business, and diplomacy.

In university halls and community classrooms, Spanish offers learners a new route into global conversations. It connects Africa with Spain, Latin America, and millions of Spanish speakers around the world.

#### Why this matters for learners
* Spanish creates more study and scholarship opportunities.
* It supports careers in tourism, diplomacy, translation, education, and international business.
* It helps African students participate in a wider cultural and professional network.

For Sierra Leonean learners, this growth is especially exciting. A stronger Spanish-learning movement means more access to teachers, resources, exchange programs, and cultural events.`
  },
  {
    id: "ser-estar-mistakes",
    title: "The 5 most common mistakes when using Ser & Estar",
    excerpt: "Why is 'Estoy aburrido' completely different from 'Soy aburrido'? Discover the subtle nuances of being Spanish and how avoiding these 5 simple traps will make you sound instantly native.",
    imageUrl: "/src/assets/images/ser_estar_mistakes_1782078058079.jpg",
    readTime: "4 min read",
    category: "Grammar Hacks",
    contentMarkdown: `### The 5 Most Common Mistakes and How to Avoid Them

Learning Spanish as an English speaker is an adventure. However, one of the first major hurdles you'll face is understanding the difference between the two verbs that translate to the English "to be": **SER** and **ESTAR**.

#### 1. Confusing "Soy aburrido" with "Estoy aburrido"
*   **Soy aburrido** means *"I am boring"* (it is a permanent trait).
*   **Estoy aburrido** means *"I am bored"* (it is a temporary emotional state).
*   *Tip:* If you want friends, always say **"Estoy aburrido"** when looking for something to do!

#### 2. Using the Wrong Verb for Geographical Locations
*   Even if a city or building has been standing for 2,000 years, its location is always expressed with **ESTAR**.
*   *Incorrect:* Madrid es en España. 
*   *Correct:* **Madrid está en España.**

#### 3. Defining Profession with "Estar"
*   In Spanish, your profession is considered part of your identity (even if you change careers).
*   *Incorrect:* Estoy un profesor.
*   *Correct:* **Soy profesor** (Note that we also omit the 'un'!).

#### 4. Expressing Health
*   When speaking about physical conditions or wellness, use **ESTAR**.
*   *Incorrect:* Yo soy enfermo hoy.
*   *Correct:* **Yo estoy enfermo hoy.** *(I am sick today)*

#### 5. Description of Qualities vs. Conditions
*   **SER** is for essential, inherent characteristics.
*   **ESTAR** represents conditions, results, or temporary changes.
*   *Example:* **La sopa está fría** *(The soup has gone cold)* vs. **El hielo es frío** *(Ice is naturally cold)*.`
  },
  {
    id: "travel-rescue",
    title: "How to survive your first trip: Essential Vocabulary",
    excerpt: "Nervous about your first conversation in Spain or Latin America? Master these critical phrases for ordering tapas, finding transport, and making friendly local connections.",
    imageUrl: "/src/assets/images/spain_travel_guide_1782078073592.jpg",
    readTime: "6 min read",
    category: "Travel Prep",
    contentMarkdown: `### How to Survive Your First Trip to a Spanish-Speaking Country

Traveling is beautiful, but traveling while speaking the native language is a completely different, life-changing experience. Here is your ultimate quick-start survival guide.

#### Essential Transit & Direction Commands
When you arrive, these phrases will guide you safely:
*   **¿Dónde está la estación de tren / de autobuses?** *(Where is the train / bus station?)*
*   **Un billete para [Destino], por favor.** *(A ticket to [Destination], please.)*
*   **¿Puede ayudarme, por favor?** *(Can you help me, please?)*

#### Savoring the Local Culinary Scene
Food is the heart of culture. Here's how to order:
*   **Una mesa para dos, por favor.** *(A table for two, please.)*
*   **¿Qué nos recomienda?** *(What do you recommend to us?)*
*   **La cuenta, por favor.** *(The bill, please.)*
*   **¡Está delicioso!** *(It is delicious!)*

#### Micro-Phrases for Instant Warmth
Spanish speakers are notoriously warm. Reciprocate with these friendly starters:
*   **¡Mucho gusto!** *(Nice to meet you!)*
*   **Disculpe, mi español es un poco básico.** *(Excuse me, my Spanish is a bit basic.)*
*   **¿Cómo se dice "sunrise" en español?** *(How do you say "sunrise" in Spanish?)*`
  },
  {
    id: "brain-health",
    title: "Why learning Spanish is a premier brain workout",
    excerpt: "Did you know that speaking a second language alters your physical brain structure? Explore the fascinating science behind cognitive plasticity and bilingualism in adult learners.",
    imageUrl: "/src/assets/images/bilingual_brain_workout_1782078086117.jpg",
    readTime: "5 min read",
    category: "Science",
    contentMarkdown: `### Why Learning Spanish is an Elite Cognitive Workout

Neurologists agree: learning a second language is one of the most complex mental activities an adult can engage in. It activates multiple regions of the brain simultaneously.

#### 1. Gray Matter Density Expansion
When practicing new sounds, conjugations, and vocabulary, your brain grows new pathways. Studies show bilingual individuals have significantly higher gray matter density in fields responsible for vocabulary storage and visual processing.

#### 2. Advanced Cognitive Flexibility
Bilingual individuals constantly switch attention back and forth. This acts as resistance training for the executive control branch of the prefrontal cortex, leading to:
*   Stronger multitasking capabilities
*   Improved spatial working memory
*   Better focus in hyper-distracting environments

#### 3. Delaying Neurodegenerative Decline
Statistically, bilingual individuals show symptoms of Alzheimer’s and cognitive decline up to **4 to 5 years later** than monolinguals with the exact same level of physical brain tissue changes. It creates a "cognitive reserve" that acts as a buffer.`
  }
];

export const TESTIMONIALS: Testimonial[] = [
  {
    id: "graduation-success",
    name: "Graduated Cohort",
    location: "Sierra Leone",
    rating: 5,
    text: "I finally completed my Spanish course.. 💃 Highly recommend Iniciativa Ser o Estar for adult learners seeking cognitive grammar breakthroughs and real speech fluency!",
    avatarUrl: "/src/assets/images/graduated_cohort_sierra_leone_original.jpeg",
    imageUrl: "/src/assets/images/graduated_cohort_sierra_leone_original.jpeg",
    imageFit: "contain"
  },
  {
    id: "sarah",
    name: "Sarah J.",
    location: "Chicago, USA",
    rating: 5,
    text: "Finally understood the mystery of Being! I tried three different apps and books before joining. In just two weeks, the interactive 'Ser vs Estar' visual boards completely de-coded how to explain my feelings versus my profession. The small groups are incredibly cozy and absolutely safe for beginners.",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150&h=150"
  },
  {
    id: "marcus",
    name: "Marcus K.",
    location: "London, UK",
    rating: 5,
    text: "The classroom dynamic here is exceptional. Unlike online course factories, 'Iniciativa Ser o Estar' provides native interaction tailored for native English speakers. The instructors anticipate the exact errors we make. I booked the trial class and was hooked!",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150&h=150"
  },
  {
    id: "elena",
    name: "Elena G.",
    location: "Austin, USA",
    rating: 5,
    text: "I went from stuttering basic words to conversing comfortably with the local barista. The visual methodology works perfectly if you are a hands-on or visual learner. Easily the best investment in my Spanish journey!",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150&h=150"
  }
];
