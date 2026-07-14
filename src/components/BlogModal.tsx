/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion } from "motion/react";
import { X, Calendar, Clock, Tag, BookOpen } from "lucide-react";
import { BlogPost } from "../types";

interface BlogModalProps {
  post: BlogPost | null;
  onClose: () => void;
  lang?: "EN" | "ES";
}

export default function BlogModal({ post, onClose, lang = "EN" }: BlogModalProps) {
  if (!post) return null;

  const isEs = lang === "ES";

  const categoryTranslated = isEs
    ? (post.category === "Pedagogy" ? "Pedagogía" : post.category === "Vocabulary" ? "Vocabulario" : post.category === "Mindset" ? "Mentalidad" : post.category)
    : post.category;

  const readTimeTranslated = isEs
    ? post.readTime.replace("min read", "min de lectura")
    : post.readTime;

  return (
    <div
      id={`blog-modal-${post.id}`}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10"
    >
      {/* Blurred Back Drop overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.8 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 bg-slate-900 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Main Modal container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 30 }}
        transition={{ type: "spring", damping: 25, stiffness: 350 }}
        className="relative bg-white rounded-3xl w-full max-w-3xl max-h-[85vh] overflow-y-auto shadow-2xl border border-gray-100 flex flex-col leading-normal z-10"
      >
        {/* Absolute header actions */}
        <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">
              <Tag size={12} className="mr-1" />
              {categoryTranslated}
            </span>
            <span className="text-gray-400 text-xs flex items-center">
              <Clock size={12} className="mr-1" />
              {readTimeTranslated}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 px-2.5 rounded-full bg-gray-100 text-gray-500 hover:text-orange-600 hover:bg-gray-200 transition cursor-pointer"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 sm:p-8 space-y-6">
          <h2 className="font-sans font-extrabold text-2xl sm:text-3xl text-slate-900 leading-tight">
            {post.title}
          </h2>

          {/* Hero poster image of the blog */}
          <div className="relative rounded-2xl overflow-hidden aspect-video shadow-sm border border-gray-100">
            <img
              src={post.imageUrl}
              alt={post.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>

          <p className="text-slate-600 font-medium text-base leading-relaxed italic border-l-4 border-orange-500 pl-4 py-1">
            "{post.excerpt}"
          </p>

          <div className="prose prose-slate max-w-none text-slate-700 space-y-4">
            {/* Simple high fidelity markdown elements parser */}
            {post.contentMarkdown.split("\n\n").map((paragraph, index) => {
              if (paragraph.startsWith("### ")) {
                return (
                  <h3 key={index} className="text-xl font-bold font-sans text-slate-800 pt-3">
                    {paragraph.replace("### ", "")}
                  </h3>
                );
              }
              if (paragraph.startsWith("#### ")) {
                return (
                  <h4 key={index} className="text-base font-bold font-sans text-orange-600 pt-2">
                    {paragraph.replace("#### ", "")}
                  </h4>
                );
              }
              if (paragraph.startsWith("* ")) {
                return (
                  <ul key={index} className="list-disc list-inside space-y-1.5 pl-2">
                    {paragraph.split("\n").map((line, lIdx) => (
                      <li key={lIdx} className="text-sm leading-relaxed text-slate-700">
                        {line.replace("* ", "")}
                      </li>
                    ))}
                  </ul>
                );
              }
              return (
                <p key={index} className="text-sm sm:text-base leading-relaxed text-slate-600">
                  {paragraph}
                </p>
              );
            })}
          </div>
        </div>

        {/* Modal footer CTA */}
        <div className="p-6 bg-slate-50 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold font-sans">
              SER
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 leading-none">Iniciativa Ser o Estar</p>
              <p className="text-[10px] text-slate-500">
                {isEs ? "Consejos oficiales de la academia" : "Official learning academy tips"}
              </p>
            </div>
          </div>
          <a
            href="https://wa.me/23272057646?text=Hola!%20I'm%20writing%20after%20reading%20your%20amazing%20blog%20post"
            target="_blank"
            rel="noreferrer"
            className="px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs tracking-wider uppercase transition text-center shadow-md shadow-emerald-600/10"
          >
            {isEs ? "Conversar en WhatsApp" : "Discuss on WhatsApp"}
          </a>
        </div>
      </motion.div>
    </div>
  );
}
