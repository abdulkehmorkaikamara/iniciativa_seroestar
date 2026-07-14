/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Course {
  id: string;
  level: string; // e.g., "Level A1"
  title: string; // e.g., "Beginner"
  objectives: string[];
  vocabulary: string[];
  grammar: string[];
  conversation: string[];
  syllabusUrl: string;
}

export interface Testimonial {
  id: string;
  name: string;
  location: string;
  rating: number;
  text: string;
  avatarUrl: string;
  imageUrl?: string;
  imageFit?: "cover" | "contain";
}

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  imageUrl: string;
  readTime: string;
  category: string;
  contentMarkdown: string;
}

export interface Feature {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface MethodologyStep {
  stepNumber: number;
  title: string;
  subtitle: string;
  description: string;
  iconName: string;
}
