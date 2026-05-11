const fs = require('fs');
let schema = fs.readFileSync('prisma/schema.prisma', 'utf-8');

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

fs.writeFileSync('prisma/schema.prisma', schema);
