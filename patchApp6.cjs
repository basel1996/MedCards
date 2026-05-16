const fs = require('fs');
let code = fs.readFileSync('./src/App.tsx', 'utf-8');

// Use exact string replacement without regex to bypass any special string matching
const originalString = \`             {/* FRONT OF CARD */}
            onClick={() => !isFlipped && setIsFlipped(true)}
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 25, mass: 1 }}
            style={{ transformStyle: 'preserve-3d' }}
         >
             {/* FRONT OF CARD */}\`;

const replacementString = \`             {/* FRONT OF CARD */}\`;

// replace first occurrence
code = code.replace(originalString, replacementString);
fs.writeFileSync('./src/App.tsx', code);
