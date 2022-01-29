import { TransactionBuilder, Server, Networks, Operation, Asset, Memo } from 'stellar-sdk'
import BigNumber from 'bignumber.js';

const bridgePK = STELLAR_NETWORK === 'PUBLIC'
    ? 'public secret'
    : 'testnet secret'

const server = new Server(HORIZON_URL);
const NFT_AMOUNT = '0.0000001';

export default async (body) => {
    const { action } = body;

    console.log(`action: ${action}`);

    switch(action) {

        case 'lock':
            return lock(body);

        case 'issue':
            return issue(body);

        case 'unlock':
            return unlock(body);

        default:
            throw {message: 'Invalid action.'}
    }
}

async function lock(body) {
    //source sends NFT to bridgeAccount
    //ethPK is stored in memo
    //brideAccount is controllable only by turrets

    const { source, assetCode, assetIssuerPK, receiverEthPK } = body;

    const bridgeAccount = await server.loadAccount(bridgePK);
    const fee = await getFee();
    const nftAsset = new Asset(assetCode, assetIssuerPK);

    if (!(await isNFT(nftAsset))) {
        throw {message: 'Asset is not an NFT.'}
    }

    let tx = new TransactionBuilder(bridgeAccount, {
        fee,
        networkPassphrase: Networks[STELLAR_NETWORK]
    });

    tx.addOperation(Operation.changeTrust({
        asset: nftAsset,
        limit: NFT_AMOUNT,
        source: bridgePK
    }));

    tx.addOperation(Operation.payment({
        source: source,
        destination: bridgePK,
        asset: nftAsset,
        amount: NFT_AMOUNT
    }));

    tx.addOperation(Operation.changeTrust({
        asset: nftAsset,
        limit: '0',
        source: source
    }));

    tx.addMemo(Memo.Text(receiverEthPK));

    return tx.setTimeout(0).build().toXDR('base64');
}

async function issue(body) {
    //check lockTxHash if asset is locked
    //issue erc721 on Ethereum

    const { lockTxHash } = body;

    if (!(await isNftLocked(lockTxHash))) {
        throw {message: 'NFT is not locked.'}
    }

    const { assetCode, assetIssuerPK, receiverEthPK } = await getNftData(lockTxHash);

    let issueErc721EthTxHash;

    try {
        issueErc721EthTxHash = await issueErc721(assetCode, assetIssuerPK, ethPK);
    } catch (e) {
        throw {message: 'Error while issuing ERC721.'}
    }

    //This doesn't even need to be submitted.
    let tx = new TransactionBuilder(bridgeAccount, {
        fee,
        networkPassphrase: Networks[STELLAR_NETWORK]
    });

    tx.addMemo(Memo.Text(issueErc721EthTxHash));

    return tx.setTimeout(0).build().toXDR('base64');
}

async function unlock(body) {
    //check lockErc721EthTxHash if asset is locked on Ethereum.
    //lockErc721EthTxHash should contain stellar receiver PK
    //unlock asset and send

    const { lockErc721EthTxHash } = body;

    //These 2 calls to Eth should get refactored into 1.
    if (! (await isErc721Locked(lockErc721EthTxHash))) {
        throw {message: 'ERC721 is not locked.'}
    }

    const { assetCode, assetIssuerPK, receiverStellarPK } = await getErc721Data(lockErc721EthTxHash);

    const nftAsset = new Asset(assetCode, assetIssuerPK);

    let tx = new TransactionBuilder(bridgeAccount, {
        fee,
        networkPassphrase: Networks[STELLAR_NETWORK]
    });

    tx.addOperation(Operation.changeTrust({
        asset: nftAsset,
        limit: NFT_AMOUNT,
        source: receiverStellarPK
    }));

    tx.addOperation(Operation.payment({
        source: bridgePK,
        destination: receiverStellarPK,
        asset: nftAsset,
        amount: NFT_AMOUNT
    }));

    tx.addOperation(Operation.changeTrust({
        asset: nftAsset,
        limit: '0',
        source: bridgePK
    }));

    return tx.setTimeout(0).build().toXDR('base64');
}

async function isNFT(asset) {
    //TODO
    return true;
}

async function isNftLocked(lockTxHash) {
    //TODO
    return true;
}

async function issueErc721(assetCode, assetIssuerPK, ethPK) {
    //TODO
    return "ETH-TX-HASH";
}

async function getNftData(lockTxHash) {
    //TODO
    return {
        assetCode: "assetCode",
        assetIssuerPK: "assetIssuerPK",
        receiverEthPK: "receiverEthPK"
    }
}

// async function isErc721Issued() {
//     //TODO
//     return true;
// }

async function isErc721Locked(ethTxHash) {
    //TODO
    return true;
}

async function getErc721Data() {
    //TODO
    return {
        assetCode: "assetCode",
        assetIssuerPK: "assetIssuerPK",
        receiverStellarPK: "receiverStellarPK"
    }
}

function getFee() {
    return server
    .feeStats()
    .then((feeStats) => feeStats?.fee_charged?.max || 100000)
    .catch(() => 100000)
};
