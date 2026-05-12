const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf-8');

// Add @@schema("public") to all models
schema = schema.replace(/model\s+\w+\s+\{([^}]+)\}/g, (match, content) => {
  if (content.includes('@@schema')) return match;
  return match.replace(/}$/, '  @@schema("public")\n}');
});

// Add @@schema("public") to all enums
schema = schema.replace(/enum\s+\w+\s+\{([^}]+)\}/g, (match, content) => {
  if (content.includes('@@schema')) return match;
  return match.replace(/}$/, '  @@schema("public")\n}');
});

fs.writeFileSync(schemaPath, schema);
