import mysql from "mysql2/promise";
import fs from "fs";

// Define your MySQL connection parameters
const config = {
  host: "hostname",
  user: "root",
  password: "password",
  database: "databaseName",
};

// Function to fetch table schema
async function getTableSchema(connection: mysql.Connection, tableName: string) {
  //@ts-ignore
  const [rows] = await connection.query(`DESCRIBE ${tableName}`);
  return rows as Array<{
    Field: string;
    Type: string;
    Null: string;
    Key: string;
    Default: any;
    Extra: string;
  }>;
}

// Function to convert MySQL data types to TypeScript types
function mapMySQLTypeToTS(mySQLType: string): string {
  if (mySQLType.startsWith("tinyint(1)")) return "boolean"; // Map TINYINT(1) to boolean
  if (
    mySQLType.startsWith("int") ||
    mySQLType.startsWith("bigint") ||
    mySQLType.startsWith("tinyint") ||
    mySQLType.startsWith("smallint")
  )
    return "number";
  if (
    mySQLType.startsWith("varchar") ||
    mySQLType.startsWith("text") ||
    mySQLType.startsWith("longtext")
  )
    return "string";
  if (
    mySQLType.startsWith("date") ||
    mySQLType.startsWith("datetime") ||
    mySQLType.startsWith("timestamp")
  )
    return "Date";
  if (
    mySQLType.startsWith("decimal") ||
    mySQLType.startsWith("float") ||
    mySQLType.startsWith("double")
  )
    return "number";
  if (mySQLType.startsWith("json")) return "Record<string, any>"; // Map JSON to Record<string, any>
  if (mySQLType.startsWith("longblob")) return "Buffer"; // Map LONGBLOB to Buffer
  return "any";
}

// Function to generate TypeScript type definition from table schema
function generateTypeDefinition(
  tableName: string,
  schema: Array<{ Field: string; Type: string }>
): string {
  let typeDefinition = `interface ${tableName} {\n`;
  schema.forEach((column) => {
    const tsType = mapMySQLTypeToTS(column.Type);
    typeDefinition += `  ${column.Field}: ${tsType};\n`;
  });
  typeDefinition += "}\n";
  return typeDefinition;
}

// Main function to create type definitions file
async function generateTypes() {
  const connection = await mysql.createConnection(config);
  //@ts-ignore
  const [tables] = await connection.query("SHOW TABLES");
  const tableNames = (tables as Array<{ Tables_in_database_name: string }>).map(
    //@ts-ignore
    (row) => row[`Tables_in_${config.database}`]
  );

  let typesFileContent = "";

  for (const tableName of tableNames) {
    if (!tableName.includes("view")) {
      const schema = await getTableSchema(connection, tableName);
      typesFileContent += generateTypeDefinition(tableName, schema);
    }
  }

  fs.writeFileSync("types.d.ts", typesFileContent);
  console.log(
    "TypeScript definitions have been generated and saved to types.d.ts"
  );

  await connection.end();
}

generateTypes().catch(console.error);
