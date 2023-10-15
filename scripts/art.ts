
import {randomContractArt} from '../src';

void (async () => {
  try {
    console.log(await randomContractArt());
  } catch (e) {
    console.error(e);
  }
})();
