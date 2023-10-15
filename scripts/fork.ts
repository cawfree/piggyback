import * as child_process from 'child_process';

import {getEnvironment} from '../src';

void (async () => {
  const {ETH_FORK_URL} = getEnvironment();

  child_process.execSync(`anvil --fork-url "${
    ETH_FORK_URL
  }" --accounts 15 --balance 100000`, {stdio: 'inherit'});

})();