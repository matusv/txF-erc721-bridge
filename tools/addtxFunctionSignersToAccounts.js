const { Transaction, Server, Networks, Keypair, BASE_FEE, TransactionBuilder, Operation } = require('stellar-sdk');

const HORIZON_URL = 'https://horizon-testnet.stellar.org'
const STELLAR_NETWORK = 'TESTNET'

const masterKeypair = Keypair.fromSecret("");
const signerKeypair = Keypair.fromSecret("");

const keypairs = [masterKeypair];
const signers = [signerKeypair.publicKey()];

const server = new Server(HORIZON_URL);

(async function(){

    const account = await server.loadAccount(masterKeypair.publicKey());

    let transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: Networks[STELLAR_NETWORK]
    });

    for (const keypair of keypairs) {
        for (const signer of signers) {

            // transaction.addOperation(Operation.beginSponsoringFutureReserves({
            //     source: feeKeypair.publicKey(),
            //     sponsoredId: keypair.publicKey()
            // }));

            transaction.addOperation(Operation.setOptions({
                source: keypair.publicKey(),
                signer: {
                    ed25519PublicKey: signer,
                    weight: 1
                },
                lowThreshold: signers.length,
                medThreshold: signers.length,
                highThreshold: signers.length,
                masterWeight: signers.length
            }));

            // transaction.addOperation(Operation.endSponsoringFutureReserves({
            //     source: keypair.publicKey()
            // }));
        }
    }

    transaction = transaction.setTimeout(0).build();

    //transaction.sign(feeKeypair)

    for (const keypair of keypairs) {
        transaction.sign(keypair);
    }

    try {
      const txResult = await server.submitTransaction(transaction);
      //console.log(JSON.stringify(txResult, null, 2));
      console.log('Success! View the transaction at: ');
      console.log(txResult._links.transaction.href);
    } catch (e) {
      console.log('An error has occured:');
      console.log(e.response.data);
      console.log(e.response.data.extras.result_codes);
    }

})();
