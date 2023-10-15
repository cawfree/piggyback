import BigNumber from 'bignumber.js';

BigNumber.config({DECIMAL_PLACES: 18});

export * from './@types';
export * from './app';
export * from './art';
export * from './config';
export * from './constants';
export * from './contracts';
export * from './environment';
export * from './logger';

import {getEnvironment} from './environment';

void getEnvironment() /* catch_misconfiguration */;
