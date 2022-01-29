const { NodeVM } = require('vm2');
const fs = require('fs');
const { Keypair, Networks, Transaction, TransactionBuilder, Operation, Server } = require('stellar-sdk');

const HORIZON_URL = 'https://horizon-testnet.stellar.org'
const STELLAR_NETWORK = 'TESTNET'
const server = new Server(HORIZON_URL);

const keypair = Keypair.fromSecret("");

console.log("keypair")
console.log("public:", keypair.publicKey())
console.log("secret:", keypair.secret())

(async () => {
    for (let i = 0; i < 1; i++) {
        try {
            const vm = new NodeVM({
                console: 'redirect',
                eval: false,
                wasm: false,
                strict: true,
                sandbox: {
                    HORIZON_URL,
                    STELLAR_NETWORK,
                },
                require: {
                    builtin: ['util', 'stream'],
                    external: {
                        modules: ['bignumber.js', 'node-fetch', 'stellar-sdk', 'lodash']
                    },
                    context: 'host',
                }
            });

            vm.on('console.log', (data) => {
                console.log(`<txF> ${data}`);
            });

            const txFunctionCode = fs.readFileSync('./dist/txF-erc721-bridge.js', 'utf8')

            let ticketTxHash = null;
            try {
                let txXdr = await run(vm, txFunctionCode)
                txHash = await submitXDR(txXdr);
            } catch (e) {
                console.log(e);
            }

        } catch(err) {
            console.error(err)
        }
    }
})();

async function run(vm, txFunctionCode){
    return await vm.run(txFunctionCode, 'vm.js')({
        //key: value
    })
};

async function submitXDR(xdr) {

    let tx = new Transaction(xdr, Networks.TESTNET);

    //tx.sign(keypair);

    try {
        const txResult = await server.submitTransaction(tx);
        //console.log(JSON.stringify(txResult, null, 2));
        console.log('Success!');
        console.log('tx id:', txResult.id);

        return txResult.hash;
    } catch (e) {
        console.log('An error has occured:');
        //console.log(e.response.data);
        console.log(e.response.data.extras.result_codes);
    }
}

function getFee() {
    return server
    .feeStats()
    .then((feeStats) => feeStats?.fee_charged?.max || 100000)
    .catch(() => 100000)
};
