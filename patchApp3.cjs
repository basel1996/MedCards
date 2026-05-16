const fs = require('fs');

let code = fs.readFileSync('./src/App.tsx', 'utf-8');

// Add import for useSpacedRepetition
code = code.replace(
  /import \{ SyncManager \} from '\.\/lib\/syncManager';/,
  "import { SyncManager } from './lib/syncManager';\nimport { useSpacedRepetition } from './hooks/useSpacedRepetition';"
);

// Modify StudyFlashcard component
code = code.replace(
  /function StudyFlashcard\(\{ isMobile \}: \{ isMobile: boolean \}\) \{\n  const \{ flashcards, setIsCreateModalOpen, setIsGenerateModalOpen \} = useLayout\(\);\n  const \[isFlipped, setIsFlipped\] = useState\(false\);/,
  `function StudyFlashcard({ isMobile }: { isMobile: boolean }) {
  const { flashcards, setFlashcards, setIsCreateModalOpen, setIsGenerateModalOpen } = useLayout();
  const { dueCards, processReview } = useSpacedRepetition(flashcards, setFlashcards);
  const [isFlipped, setIsFlipped] = useState(false);`
);

code = code.replace(
  /if \(flashcards\.length === 0\) \{/,
  "if (dueCards.length === 0) {"
);

code = code.replace(
  /const flashcardData = flashcards\[0\];/,
  "const flashcardData = dueCards[0];"
);

// Wrap main card in AnimatePresence
code = code.replace(
  /    <div className=\{cn\("w-full h-full flex flex-col items-center", isMobile \? "max-w-full pt-4" : "max-w-2xl justify-center"\)\}>\n      <div className="w-full \[perspective:1000px\] flex-1 min-h-\[300px\]">\n         <motion\.div\n            className=\{cn\("relative w-full h-full preserve-3d cursor-pointer"\)\}/,
  `    <div className={cn("w-full h-full flex flex-col items-center", isMobile ? "max-w-full pt-4" : "max-w-2xl justify-center")}>
      <div className="w-full [perspective:1000px] flex-1 min-h-[300px] relative">
       <AnimatePresence mode="popLayout">
         <motion.div
            key={flashcardData.id}
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1, rotateY: isFlipped ? 180 : 0 }}
            exit={{ x: -300, opacity: 0 }}
            className={cn("absolute inset-0 w-full h-full preserve-3d cursor-pointer")}
            onClick={() => !isFlipped && setIsFlipped(true)}
            transition={{ type: "spring", stiffness: 200, damping: 25, mass: 1 }}
            style={{ transformStyle: 'preserve-3d' }}
         >
             {/* FRONT OF CARD */}`
);

// Close Animate Presence
code = code.replace(
  /            <\/div>\n         <\/motion\.div>\n      <\/div>\n\n       \{\/\* RATING CONTROLS \*\/\}/,
  `            </div>
         </motion.div>
       </AnimatePresence>
      </div>

       {/* RATING CONTROLS */}`
);

// Remove the animate line that is now grouped into the main framer motion parameters
code = code.replace(
  /            className=\{cn\("absolute inset-0 w-full h-full preserve-3d cursor-pointer"\)\}\n            onClick=\{\(\) => !isFlipped && setIsFlipped\(true\)\}\n            animate=\{\{ rotateY: isFlipped \? 180 : 0 \}\}\n            transition=\{\{ type: "spring", stiffness: 200, damping: 25, mass: 1 \}\}/,
  `            className={cn("absolute inset-0 w-full h-full preserve-3d cursor-pointer")}
            onClick={() => !isFlipped && setIsFlipped(true)}
            transition={{ type: "spring", stiffness: 200, damping: 25, mass: 1 }}`
);


// Rating logic updates
// Mapping buttons to values: Again: 0, Hard: 3, Good: 4, Easy: 5
code = code.replace(
  /              \{\[\n                \{ label: 'Again', color: 'bg-rose-500\/10 text-rose-500 hover:bg-rose-500\/20 md:border-rose-500\/20' \},\n                \{ label: 'Hard', color: 'bg-amber-500\/10 text-amber-500 hover:bg-amber-500\/20 md:border-amber-500\/20' \},\n                \{ label: 'Good', color: 'bg-blue-500\/10 text-blue-500 hover:bg-blue-500\/20 md:border-blue-500\/20' \},\n                \{ label: 'Easy', color: 'bg-teal-500\/10 text-teal-400 hover:bg-teal-500\/20 md:border-teal-500\/20' \},\n              \]\.map\(\(btn, i\) => \(\n                <button\n                  key=\{btn\.label\}\n                  onClick=\{\(\) => setIsFlipped\(false\)\}/,
  `              {[
                { label: 'Again', quality: 0, color: 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 md:border-rose-500/20' },
                { label: 'Hard', quality: 3, color: 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 md:border-amber-500/20' },
                { label: 'Good', quality: 4, color: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 md:border-blue-500/20' },
                { label: 'Easy', quality: 5, color: 'bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 md:border-teal-500/20' },
              ].map((btn, i) => (
                <button
                  key={btn.label}
                  onClick={() => {
                     setIsFlipped(false);
                     if (flashcardData.id) {
                       processReview(flashcardData.id, btn.quality);
                     }
                  }}`
);

fs.writeFileSync('./src/App.tsx', code);
