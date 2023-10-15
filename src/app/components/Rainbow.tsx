import * as React from 'react';
import {Color} from 'ink';

const RAINBOW = ['red', 'redBright', 'yellow', 'yellowBright', 'green', 'greenBright', 'blue', 'blueBright'];

export const Rainbow = React.memo(
  function Rainbow({children}: React.PropsWithChildren): JSX.Element {
    const arr = React.Children.toArray(children);
    return (
      <React.Fragment
        children={arr.map((children, i) => (
          <Color
            key={String(i)}
            {...{[`${RAINBOW[i % RAINBOW.length]}`]: true}}
            // @ts-ignore
            children={children}
          />
        ))}
      />
    );
  }
);
