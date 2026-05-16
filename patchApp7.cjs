const fs = require("fs");
let code = fs.readFileSync("./src/App.tsx", "utf-8");
let lines = code.split("\n");
lines.splice(989, 6);
fs.writeFileSync("./src/App.tsx", lines.join("\n"));
