import dotenv from 'dotenv';
import path from 'path';
import { Account, Aptos, AptosConfig, Ed25519PrivateKey, Network } from "@aptos-labs/ts-sdk";
import cron from 'node-cron';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const WARLORD_ADDRESS = '0x49d6ee12c97980e14836874fa9cf58ad1c42b2aa4c4cdd96a556aa66d04c8e98';

const BASE_URL = 'https://api.openweathermap.org/';
const LOCATION = 'Tokyo';

enum WeatherConditionEnum {
    CLEAR = "0",
    CLOUDS = "1",
    SNOW = "2",
    RAIN = "3",
    DRIZZLE = "4",
    THUNDERSTORM = "5",
}

function requireEnv(name: string): string {
    const value = process.env[name];
    if (value === undefined) {
      throw new Error(`Environment variable ${name} is not defined`);
    }
    return value;
  }

async function call_tick() {
  // Setup the client
  const config = new AptosConfig({ network: Network.TESTNET });
  const aptos = new Aptos(config);

  // get the keeper's account
  const keeperPk = requireEnv('KEEPER_PK');
  const privateKey = new Ed25519PrivateKey(keeperPk);
  const keeper  = Account.fromPrivateKey({ privateKey });
  console.log(`Keeper's address is: ${keeper.accountAddress}`);
 
  // build the transaction
  const txn = await aptos.transaction.build.simple({
    sender: keeper.accountAddress,
    data: {
      // All transactions on Aptos are implemented via smart contracts.
      function: `${WARLORD_ADDRESS}::warlords::tick_tock`,
      functionArguments: [],
    },
  });
 
  // Both signs and submits the transaction with the keeper's account
  console.log("signing and submitting transaction ...");
  const committedTxn = await aptos.signAndSubmitTransaction({
    signer: keeper,
    transaction: txn,
  });

  // Waits for Aptos to verify and execute the transaction
  console.log("waiting for transaction to be executed ...");
  const executedTransaction = await aptos.waitForTransaction({
    transactionHash: committedTxn.hash,
  });

  console.log("Transaction hash:", executedTransaction.hash);
}

async function getWeatherData() {
    const api_key = requireEnv('OPENWEATHER_API_KEY');
    const response = await fetch(`${BASE_URL}data/2.5/weather?q=${LOCATION}&appid=${api_key}`);
    const data = await response.json();
    const condition = data["weather"][0]["main"];
    console.log(`Weather condition in ${LOCATION}: ${condition}`);
    return condition;
}
  
function weatherConditionToNumber(condition: string): string {
    switch (condition.toUpperCase()) {
      case 'CLEAR':
        return WeatherConditionEnum.CLEAR;
      case 'CLOUDS':
        return WeatherConditionEnum.CLOUDS;
      case 'SNOW':
        return WeatherConditionEnum.SNOW;
      case 'RAIN':
        return WeatherConditionEnum.RAIN;
      case 'DRIZZLE':
        return WeatherConditionEnum.DRIZZLE;
      case 'THUNDERSTORM':
        return WeatherConditionEnum.THUNDERSTORM;
      default:
        console.warn(`Unknown weather condition: ${condition}. Defaulting to CLEAR.`);
        return WeatherConditionEnum.CLEAR;
    }
}
  
async function callWeatherChange(weatherCondition: string) {
    // Setup the client
    const config = new AptosConfig({ network: Network.TESTNET });
    const aptos = new Aptos(config);
  
  
    // get the weatherman's account
    const weatherman_pk = requireEnv('WEATHERMAN_PK');
    const privateKey = new Ed25519PrivateKey(weatherman_pk);
    const weatherman  = Account.fromPrivateKey({ privateKey });
    console.log(`weatherman's address is: ${weatherman.accountAddress}`);
    
  
    // build the transaction
    const txn = await aptos.transaction.build.simple({
      sender: weatherman.accountAddress,
      data: {
        // All transactions on Aptos are implemented via smart contracts.
        function: `${WARLORD_ADDRESS}::warlords::set_weather`,
        functionArguments: [weatherCondition],
      },
    });
   
    // Both signs and submits
    console.log("signing and submitting transaction ...");
    const committedTxn = await aptos.signAndSubmitTransaction({
      signer: weatherman,
      transaction: txn,
    });
  
    // Waits for Aptos to verify and execute the transaction
    console.log("waiting for transaction to be executed ...");
    const executedTransaction = await aptos.waitForTransaction({
      transactionHash: committedTxn.hash,
    });
  
    console.log("Transaction hash:", executedTransaction.hash);
}
  
async function fetchAndPostWeatherData() {
    try {
      const condition = await getWeatherData();
      const conditionNumber = weatherConditionToNumber(condition);
      try {
        await callWeatherChange(conditionNumber);
      } catch (error) {
        console.error("Error posting data:", error);
      }
    } catch (error) {
      console.error("Error getting data:", error);
    }
}

//call tick every 1 hour
cron.schedule('0 */1 * * *', () => {
    call_tick();
});


// call set weather every 6 hours
cron.schedule('0 */6 * * *', () => {
    fetchAndPostWeatherData();
});
