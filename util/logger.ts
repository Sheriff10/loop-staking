import winston from "winston";

// Define custom colors for levels
winston.addColors({
  info: "green",
  warn: "yellow",
  error: "red",
  debug: "blue", // Set debug color
});

// Create the logger with the desired level
const logger = winston.createLogger({
  level: "debug", // Set the minimum log level to debug
  format: winston.format.combine(
    winston.format.colorize({ all: true }), // Apply color to both level and message
    winston.format.timestamp(),
    winston.format.printf(({ level, message, timestamp }) => {
      return `${message}`;
    })
  ),
  transports: [new winston.transports.Console()],
});

export default function log(
  message: any,
  opts?: { isError?: boolean; debug?: boolean; newLine?: true }
) {
  const isError = opts?.isError;
  const debug = opts?.debug;
  const newLine = opts?.newLine;

  // Custom serializer for BigInt
  const formattedMessage =
    typeof message === "object"
      ? JSON.stringify(
          message,
          (key, value) =>
            typeof value === "bigint" ? value.toString() : value,
          2
        )
      : message;

  if (newLine) {
    return logger.error(`\n\n`);
  }
  if (isError) {
    return logger.error(`    ✘ ${formattedMessage}`);
  }
  if (debug) {
    return logger.debug(`    ℹ ${formattedMessage}`); // Log debug messages with proper level
  } else {
    logger.info(`    ✔ ${formattedMessage}`);
  }
}
