import axios from 'axios';

import {getEnvironment} from '../src';

void (async () => {
  const {ETHERSCAN_API_KEY} = getEnvironment();

  try {

    // check fn
    const {data} = await axios({
      url: `https://api.etherscan.io/api?module=account&action=balance&address=0x6975be450864c02b4613023c2152ee0743572325&tag=latest&apikey=${
        ETHERSCAN_API_KEY
      }`,
      method: 'get',
    });

    console.log(JSON.stringify(data));

  } catch (e) {
    console.error(e);
  }
})();
