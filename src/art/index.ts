import axios from 'axios';
import {parse} from 'node-html-parser';

export const randomAsciiArt = async ({
  maxLineLength = 100,
}: {
  readonly maxLineLength: number;
}): Promise<string> => {
  const {data} = await axios({
    url: 'https://textart.sh/topic/random',
    method: 'get',
  });

  const nodes = parse(data).querySelectorAll('pre.text');
  
  if (!nodes.length) throw new Error('Failed to find nodes!');

  const childNodes = nodes
    .flatMap(({childNodes}) => childNodes)
    .map(({rawText}) => rawText);

  const maxLineLengths = childNodes.map(
    (e) => Math.max(...e.split('\n').map(({length}) => length)),
  );

  const validLineLengths = maxLineLengths.filter(e => e <= maxLineLength);

  if (!validLineLengths.length)
    throw new Error('Did not receive any valid text lengths.');

  const randomLineLength = validLineLengths[
    Math.floor(Math.random() * validLineLengths.length)
  ];

  if (typeof randomLineLength !== 'number')
    throw new Error(`Expected number randomLineLength, encountered "${
      String(randomLineLength)
    }".`);

  const maybeArt = childNodes[maxLineLengths.indexOf(randomLineLength)];

  if (typeof maybeArt !== 'string' || !maybeArt.length)
    throw new Error(`Expected string, encountered "${String(maybeArt)}".`);

  return maybeArt;
};

export const toMultilineSolidityComment = (str: string) => str
  .split('\n')
  .map(e => {
    if (e.trim().length === 0) return e;

    return `// ${e}`;
  })
  .join('\n');

export const randomContractArt = async ({
  maxLineLength = 90,
}: {
  readonly maxLineLength?: number;
} = {}) => toMultilineSolidityComment(
  await randomAsciiArt({maxLineLength})
);
