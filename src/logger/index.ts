import * as fs from 'fs';

import winston, {Logger} from 'winston';
import {FileTransportOptions} from 'winston/lib/winston/transports';

const getAutoDeletingFileTransport = ({filename, ...extras}: FileTransportOptions) => {
  filename && fs.existsSync(filename) && fs.unlinkSync(filename);
  return new winston.transports.File({...extras, filename});
};

export const logger: Logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({stack: true}),
    winston.format.json(),
  ),
  defaultMeta: {},
  transports: [
    getAutoDeletingFileTransport({
      filename: 'error.log',
      level: 'error',
    }),
    getAutoDeletingFileTransport({
      filename: 'combined.log',
    }),
  ],
});