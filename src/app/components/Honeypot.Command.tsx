import * as React from 'react';
import {Color} from 'ink';
import TextInput from 'ink-text-input';
import {parse} from 'expression-eval';

import {logger} from '../../logger';

import {useHoneypotCommandHandler} from '../hooks';

export const HoneypotCommand = React.memo(
  function HoneypotCommand({
    onRequestRefreshApprovals,
  }: {
    readonly onRequestRefreshApprovals: () => Promise<void>;
  }): JSX.Element {
    const [value, onChange] = React.useState<string>('');

    const {onHandleExpression} = useHoneypotCommandHandler({
      onRequestRefreshApprovals,
    });

    const onSubmit = React.useCallback(
      async (nextValue: string) => {
        onChange('');

        try {
          const ast = parse(nextValue);
          await onHandleExpression(ast);
        } catch (e) {
          logger.error(e);
        }
      },
      [onChange, onHandleExpression]
    );

    return (
      // @ts-ignore
      <Color greenBright>
        <TextInput value={value} onChange={onChange} onSubmit={onSubmit} />
      </Color>
    );
  },
);
