const fs = require('fs');

let code = fs.readFileSync('./src/App.tsx', 'utf-8');
code = code.replace(
  /             style=\{\{ transformStyle: 'preserve-3d' \}\}\n          >\n              \{\/\* FRONT OF CARD \*\/\}\n            onClick=\{\(\) => !isFlipped && setIsFlipped\(true\)\}\n            animate=\{\{ rotateY: isFlipped \? 180 : 0 \}\}\n            transition=\{\{ type: "spring", stiffness: 200, damping: 25, mass: 1 \}\}\n            style=\{\{ transformStyle: 'preserve-3d' \}\}\n         >\n             \{\/\* FRONT OF CARD \*\/\}/g,
  \`             style={{ transformStyle: 'preserve-3d' }}
          >
              {/* FRONT OF CARD */}\`
);
fs.writeFileSync('./src/App.tsx', code);
