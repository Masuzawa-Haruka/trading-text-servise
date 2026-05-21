#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const PRISMA_SCHEMA = path.join(ROOT, 'backend/prisma/schema.prisma');
const SUPABASE_SCHEMA = path.join(ROOT, 'docs/supabase_schema.sql');

const prisma = fs.readFileSync(PRISMA_SCHEMA, 'utf8');
const sql = fs.readFileSync(SUPABASE_SCHEMA, 'utf8');

const prismaSchema = parsePrismaSchema(prisma);
const sqlSchema = parseSqlSchema(sql);
const errors = [];

compareEnums(prismaSchema.enums, sqlSchema.enums, errors);
compareModels(prismaSchema, sqlSchema, errors);

if (errors.length > 0) {
  console.error('Schema sync check failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log('Schema sync check passed.');
console.log(`Checked ${prismaSchema.enums.size} enums and ${prismaSchema.models.length} mapped tables.`);

function parsePrismaSchema(source) {
  const enums = new Map();
  const models = [];

  for (const match of source.matchAll(/\benum\s+(\w+)\s*\{([\s\S]*?)\n\}/g)) {
    const [, name, body] = match;
    const values = body
      .split('\n')
      .map((line) => stripInlineComment(line).trim())
      .filter((line) => line && !line.startsWith('@'))
      .map((line) => line.split(/\s+/)[0])
      .filter(Boolean);
    enums.set(name, values);
  }

  const modelNames = new Set();
  for (const match of source.matchAll(/\bmodel\s+(\w+)\s*\{/g)) {
    modelNames.add(match[1]);
  }

  for (const match of source.matchAll(/\bmodel\s+(\w+)\s*\{([\s\S]*?)\n\}/g)) {
    const [, name, body] = match;
    const mapMatch = body.match(/@@map\("([^"]+)"\)/);
    const tableName = mapMatch ? mapMatch[1] : lowerCamelToSnake(name);
    const fields = [];

    for (const rawLine of body.split('\n')) {
      const line = stripInlineComment(rawLine).trim();
      if (!line || line.startsWith('@')) {
        continue;
      }

      const fieldMatch = line.match(/^(\w+)\s+([A-Za-z]\w*(?:\[\])?\??)\s*(.*)$/);
      if (!fieldMatch) {
        continue;
      }

      const [, fieldName, rawType, attributes] = fieldMatch;
      const isList = rawType.endsWith('[]');
      const type = rawType.replace(/\?|\[\]/g, '');
      const isRelationObject = modelNames.has(type) && !attributes.includes('@db.');
      if (isList || isRelationObject) {
        continue;
      }

      fields.push({
        name: fieldName,
        type,
        nullable: rawType.endsWith('?'),
        dbType: parseDbType(attributes),
        defaultValue: parsePrismaDefault(attributes),
        isEnum: enums.has(type),
      });
    }

    models.push({ name, tableName, fields });
  }

  return { enums, models };
}

function parseSqlSchema(source) {
  const enums = new Map();
  const tables = new Map();

  for (const match of source.matchAll(/CREATE\s+TYPE\s+(?:"([^"]+)"|([A-Za-z_]\w*))\s+AS\s+ENUM\s*\(([^;]+)\);/gi)) {
    const name = match[1] ?? match[2];
    const values = [...match[3].matchAll(/'([^']+)'/g)].map((valueMatch) => valueMatch[1]);
    enums.set(name, values);
  }

  for (const match of source.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"([^"]+)"|([A-Za-z_]\w*))\s*\(([\s\S]*?)\n\);/gi)) {
    const tableName = match[1] ?? match[2];
    const body = match[3];
    const columns = new Map();

    for (const definition of splitSqlDefinitions(body)) {
      const line = definition.trim().replace(/,$/, '');
      if (!line || /^(CONSTRAINT|PRIMARY|FOREIGN|UNIQUE|CHECK)\b/i.test(line)) {
        continue;
      }

      const columnMatch = line.match(/^"?(?<name>[A-Za-z_]\w*)"?\s+(?<type>"[^"]+"|[A-Za-z_][\w()]*)\s*(?<rest>.*)$/i);
      if (!columnMatch?.groups) {
        continue;
      }

      const rest = columnMatch.groups.rest.trim();
      columns.set(columnMatch.groups.name, {
        type: normalizeSqlType(columnMatch.groups.type),
        nullable: !/\bNOT\s+NULL\b/i.test(rest) && !/\bPRIMARY\s+KEY\b/i.test(rest),
        defaultValue: parseSqlDefault(rest),
      });
    }

    tables.set(tableName, { columns });
  }

  return { enums, tables };
}

function compareEnums(prismaEnums, sqlEnums, targetErrors) {
  for (const [name, values] of prismaEnums) {
    const sqlValues = sqlEnums.get(name);
    if (!sqlValues) {
      targetErrors.push(`docs/supabase_schema.sql is missing enum ${name}`);
      continue;
    }
    if (values.join(',') !== sqlValues.join(',')) {
      targetErrors.push(`enum ${name} differs: Prisma [${values.join(', ')}], SQL [${sqlValues.join(', ')}]`);
    }
  }
}

function compareModels(prismaSchema, sqlSchema, targetErrors) {
  for (const model of prismaSchema.models) {
    const table = sqlSchema.tables.get(model.tableName);
    if (!table) {
      targetErrors.push(`docs/supabase_schema.sql is missing table ${model.tableName} for model ${model.name}`);
      continue;
    }

    for (const field of model.fields) {
      const column = table.columns.get(field.name);
      if (!column) {
        targetErrors.push(`table ${model.tableName} is missing column ${field.name} for model ${model.name}`);
        continue;
      }

      const expectedType = expectedSqlType(field);
      if (!matchesSqlType(column.type, expectedType)) {
        targetErrors.push(
          `table ${model.tableName}.${field.name} type differs: Prisma expects ${expectedType}, SQL has ${column.type}`,
        );
      }

      if (field.isEnum && field.defaultValue && column.defaultValue !== field.defaultValue) {
        targetErrors.push(
          `table ${model.tableName}.${field.name} default differs: Prisma ${field.defaultValue}, SQL ${column.defaultValue ?? 'none'}`,
        );
      }
    }
  }
}

function expectedSqlType(field) {
  if (field.isEnum) {
    return field.type;
  }
  if (field.dbType === 'Uuid') {
    return 'UUID';
  }

  switch (field.type) {
    case 'String':
      return 'STRING';
    case 'Int':
      return 'INT';
    case 'Boolean':
      return 'BOOLEAN';
    case 'DateTime':
      return 'DATETIME';
    default:
      return field.type;
  }
}

function matchesSqlType(actual, expected) {
  if (actual === expected) {
    return true;
  }
  if (expected === 'STRING') {
    return actual === 'VARCHAR' || actual === 'TEXT';
  }
  if (expected === 'INT') {
    return actual === 'INT' || actual === 'INTEGER';
  }
  if (expected === 'DATETIME') {
    return actual === 'TIMESTAMPTZ' || actual === 'TIMESTAMP';
  }
  return false;
}

function splitSqlDefinitions(body) {
  const definitions = [];
  let current = '';
  let depth = 0;
  let inString = false;

  for (let index = 0; index < body.length; index += 1) {
    const char = body[index];
    const next = body[index + 1];

    if (char === "'" && next === "'") {
      current += char + next;
      index += 1;
      continue;
    }
    if (char === "'") {
      inString = !inString;
    } else if (!inString && char === '(') {
      depth += 1;
    } else if (!inString && char === ')') {
      depth -= 1;
    }

    if (!inString && depth === 0 && char === ',') {
      definitions.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    definitions.push(current);
  }

  return definitions;
}

function normalizeSqlType(type) {
  return type.replace(/^"|"$/g, '').replace(/\(.+\)$/, '').toUpperCase() === type.replace(/\(.+\)$/, '')
    ? type.replace(/^"|"$/g, '').replace(/\(.+\)$/, '').toUpperCase()
    : type.replace(/^"|"$/g, '').replace(/\(.+\)$/, '');
}

function parseDbType(attributes) {
  const match = attributes.match(/@db\.(\w+)/);
  return match ? match[1] : undefined;
}

function parsePrismaDefault(attributes) {
  const match = attributes.match(/@default\(([^)]+)\)/);
  return match ? normalizeDefault(match[1]) : undefined;
}

function parseSqlDefault(rest) {
  const match = rest.match(/\bDEFAULT\s+((?:'[^']*')|[A-Za-z_][\w()]*|true|false|\d+)/i);
  return match ? normalizeDefault(match[1]) : undefined;
}

function normalizeDefault(value) {
  return value.trim().replace(/^'|'$/g, '').replace(/::.+$/, '').toLowerCase();
}

function stripInlineComment(line) {
  return line.replace(/\/\/.*$/, '');
}

function lowerCamelToSnake(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}
