import {parse as parseOFX} from 'ofx-js';
import {Currency, PDate, SUPPORTED_CURRENCIES} from 'prophecy-engine';

export interface ImportedTransaction {
    date: PDate;
    amount: number;
    /** A unique ID for this transaction */
    tid: string;
    description: string;
}

export interface ParseResult {
    uniqueAccountId: string;
    currency: Currency;
    transactions: ImportedTransaction[];
}

/**
 * Given a string with OFX (Open Financial Exchange) data, parse it into usable
 * transaction and account data.
 * @param {string} ofxDataString The OFX data to parse.
 * @returns {Promse} A promise that will resolve to {uniqueAccountId, currency, transactions}.
 */
export function parseOfxToTransactions(ofxDataString: string): Promise<ParseResult> {
    return new Promise((resolve, reject) => {
        // First parse the raw string data into structured OFX data:
        parseOFX(ofxDataString).then((ofxData: any) => {
            try {
                const result = extractOfxTransactions(ofxData);
                resolve(result);
            } catch (e) {
                reject(e);
            }
        }).catch(err => {
            console.error(err);
            reject(new Error("Unable to parse the file. It may not be a valid OFX or QFX file."));
        });
    });
}

/**
 * Given structured OFX data as parsed by ofx-js, extract the actual list
 * of transaction data in a format compatible with Prophecy.
 * @param {object} ofxData The structured OFX data to use
 */
function extractOfxTransactions(ofxData: any): ParseResult {
    // The OFX spec used for this was http://www.ofx.net/downloads/OFX%202.2.pdf

    // The FI tag holds an ORG that defines the namespace and then an FID (ID) unique within that namespace, identifying the financial instiution:
    const FI = ofxData.OFX.SIGNONMSGSRSV1.SONRS.FI;
    if (!FI.ORG || !FI.FID) {
        throw new Error("Could not determine financial institution ID.");
    }
    const uniqueFID = `${FI.ORG}>${FI.FID}`; // A string that uniquely identifies this financial institution

    let statementResponse;
    let accountId;
    if (ofxData.OFX.BANKMSGSRSV1) {
        // This is a bank transaction list
        statementResponse = ofxData.OFX.BANKMSGSRSV1.STMTTRNRS.STMTRS;
        accountId = statementResponse.BANKACCTFROM.ACCTID;
    } else if (ofxData.OFX.CREDITCARDMSGSRSV1) {
        // This is a credit card transaction list
        statementResponse = ofxData.OFX.CREDITCARDMSGSRSV1.CCSTMTTRNRS.CCSTMTRS;
        accountId = statementResponse.CCACCTFROM.ACCTID;
    } else {
        throw new Error("Expected a BANKMSGSRSV1 (Bank Message Set Response) or CREDITCARDMSGSRSV1 (Credit Card Message Set Response).");
    }
    const uniqueAccountId = `${uniqueFID}>${accountId}`;
    const currencyCode = statementResponse.CURDEF && statementResponse.CURDEF.toUpperCase();
    const currency = SUPPORTED_CURRENCIES[currencyCode];
    if (currency === undefined) {
        throw new Error(`Unknown or unsupported currency (${currencyCode}).`);
    }

    // Now iterate over the transaction list:
    let transactionStatement = statementResponse.BANKTRANLIST.STMTTRN;
    if (Array.isArray(transactionStatement)) {
        // This is what we want - a list of transactions.
    } else if (typeof transactionStatement === 'object') {
        // There was only one transaction - wrap it in an array for consistency:
        transactionStatement = [transactionStatement];
    } else if (typeof transactionStatement === 'undefined') {
        // There were no transactions at all.
        transactionStatement = [];
    }

    const transactions: ImportedTransaction[] = [];
    for (const txn of transactionStatement) {
        // Parse the date. Prefer "date the user initiated the transaction" over "date posted", though only the latter is guaranteed
        const fullDateTimeString: string = txn.DTUSER || txn.DTPOSTED;
        const dateString = fullDateTimeString.substr(0, 4) + '-' + fullDateTimeString.substr(4, 2) + '-' + fullDateTimeString.substr(6, 2);
        const date = PDate.fromString(dateString);
        // Parse the amount
        const amount = Math.round(parseFloat(txn.TRNAMT) * Math.pow(10, currency.decimals));
        transactions.push({
            date,
            amount,
            tid: txn.FITID, // A string uniquely identifying this transaction (but only unique to this particular financial institution and account)
            description: txn.NAME || txn.PAYEE.NAME,
        });
    }
    return {
        uniqueAccountId,
        currency,
        transactions,
    };
}
