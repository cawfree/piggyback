import * as React from 'react';
import {Text} from 'ink';

import {
  getMaybeError,
  getMaybeLoadingReason,
  getMaybeResult,
} from '../@types';
import {useHoneypotPairContext} from '../contexts';

import {HoneypotPairLiquidityReady} from './Honeypot.Pair.LiquidityReady';

export const AppHoneypotPair = React.memo(
  function AppHoneypotPair(): JSX.Element {
    const context = useHoneypotPairContext();

    const maybeResult = getMaybeResult(context);
    const maybeLoadingReason = getMaybeLoadingReason(context);
    const maybeError = getMaybeError(context);

    // @ts-ignore
    if (maybeError) return <Text children="Failed to initialize pair." />;

    // @ts-ignore
    if (maybeLoadingReason) return <Text children={maybeLoadingReason} />;

    if (!maybeResult)
      throw new Error(`Expected maybeResult, encountered "${
        String(maybeResult)
      }".`);

    return <HoneypotPairLiquidityReady {...maybeResult} />;
  }
);
