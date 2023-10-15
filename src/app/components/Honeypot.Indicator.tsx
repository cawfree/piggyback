import * as React from 'react';
import {Box, Color, Text} from 'ink';

import {getMaybeResult} from '../@types';
import {useHoneypotContext} from '../contexts';

export const HoneypotIndicator = React.memo(
  function HoneypotIndicator(): JSX.Element {
    const {
      resumable: {honeypotContractAddress},
      honeypotContractState,
    } = useHoneypotContext();

    const maybeResult = getMaybeResult(honeypotContractState);

    if (!maybeResult) throw new Error(`Expected result, encountered ${typeof maybeResult}.`);

    return (
      // @ts-ignore
      <Box flexDirection="column">
        {/* @ts-ignore */}
        <Color bold>
          {/* @ts-ignore */}
          <Text children="Honeypot Deployment:" />
        </Color>
        {/* @ts-ignore */}
        <Color bold>
          {/* @ts-ignore */}
          <Text children={honeypotContractAddress} />
        </Color>
      </Box>
    );
  }
);
