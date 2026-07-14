import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, "components", "Header.tsx");
const content = fs.readFileSync(filePath, "utf8");

// We can analyze opening and closing tags in order using a simple stack
const tokenMatcher = /<([a-zA-Z1-9]+)(?:\s+[^>]*?)?>|<\/([a-zA-Z1-9]+)>/g;
const lines = content.split(/\r?\n/);
const stack = [];

lines.forEach((line, lineIdx) => {
  let match;
  // Let's strip out comments
  let cleanLine = line.replace(/\{\/\*.*?\*\/\}/g, "");
  // Simple check
  while ((match = tokenMatcher.exec(cleanLine)) !== null) {
    if (match[1]) {
      const tag = match[1];
      // Skip self-closing tags
      if (line.includes(`<${tag}`) && (line.includes(`/>`) || line.includes(`input`) || line.includes(`img`) || line.includes(`br`))) {
         // rough guess for self-closing or standard void tags
         continue;
      }
      if (tag === "input" || tag === "img" || tag === "span" && line.includes("/>")) continue;
      stack.push({ tag, lineNum: lineIdx + 1 });
    } else if (match[2]) {
      const tag = match[2];
      if (stack.length === 0) {
        console.log(`Error: Extra closing tag </${tag}> on line ${lineIdx + 1}`);
      } else {
        const top = stack.pop();
        if (top.tag !== tag) {
          console.log(`Mismatch on line ${lineIdx + 1}: Expected </${top.tag}> (opened on line ${top.lineNum}) but got </${tag}>`);
        }
      }
    }
  }
});

console.log("Nesting balance check complete.");
console.log("Remaining unclosed tags in stack:", stack);
