import {expect} from 'chai';
import 'mocha';
import * as Prophecy from 'prophecy-engine';
const D = Prophecy.PDate.parseTemplateLiteral;

import {parseOfxToTransactions} from './parse-ofx';

describe("parseOfxToTransactions", () => {

    const creditCardStatement = (`
        <?xml version="1.0" encoding="utf-8" ?>
        <?OFX OFXHEADER="200" VERSION="202" SECURITY="NONE" OLDFILEUID="NONE" NEWFILEUID="NONE"?>
        <OFX>
            <SIGNONMSGSRSV1><SONRS><STATUS><CODE>0</CODE><SEVERITY>INFO</SEVERITY></STATUS><DTSERVER>20170403041143.079</DTSERVER><LANGUAGE>ENG</LANGUAGE><DTPROFUP>20170403041143.079</DTPROFUP><FI><ORG>TEST1</ORG><FID>1001</FID></FI><INTU.BID>0</INTU.BID></SONRS></SIGNONMSGSRSV1>
            <CREDITCARDMSGSRSV1>
                <CCSTMTTRNRS>
                    <TRNUID>0</TRNUID>
                    <STATUS><CODE>0</CODE><SEVERITY>INFO</SEVERITY></STATUS>
                    <CCSTMTRS>
                        <CURDEF>CAD</CURDEF><CCACCTFROM><ACCTID>4567</ACCTID></CCACCTFROM>
                        <BANKTRANLIST>
                            <DTSTART>20170304050000.000</DTSTART><DTEND>20170402040000.000</DTEND>
                            <STMTTRN>
                                <TRNTYPE>DEBIT</TRNTYPE>
                                <DTPOSTED>20170331040000.000</DTPOSTED>
                                <DTUSER>20170330040000.000</DTUSER>
                                <TRNAMT>-12.35</TRNAMT>
                                <FITID>201703311765432</FITID>
                                <NAME>Tribbles R Us</NAME>
                                <CCACCTTO><ACCTID>4567</ACCTID></CCACCTTO>
                                <MEMO>Tribbles R Us</MEMO>
                            </STMTTRN>
                            <STMTTRN>
                                <TRNTYPE>DEBIT</TRNTYPE>
                                <DTPOSTED>20170328040000.000</DTPOSTED>
                                <DTUSER>20170327040000.000</DTUSER>
                                <TRNAMT>-17.99</TRNAMT>
                                <FITID>201703281654321</FITID>
                                <NAME>Float Rounding Center</NAME>
                                <CCACCTTO><ACCTID>4567</ACCTID></CCACCTTO>
                                <MEMO>Float Rounding Center</MEMO>
                            </STMTTRN>
                        </BANKTRANLIST>
                        <LEDGERBAL><BALAMT>-1234.56</BALAMT><DTASOF>20170403041143.079</DTASOF></LEDGERBAL>
                        <AVAILBAL><BALAMT>2345.67</BALAMT><DTASOF>20170403041143.079</DTASOF></AVAILBAL>
                    </CCSTMTRS>
                </CCSTMTTRNRS>
            </CREDITCARDMSGSRSV1>
        </OFX>
    `);

    const bankStatement = (`
OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX><SIGNONMSGSRSV1><SONRS><STATUS><CODE>0<SEVERITY>INFO<MESSAGE>Authentication Successful.</STATUS><DTSERVER>20170403001000.437[-4:EDT]<LANGUAGE>ENG<FI><ORG>TesterBank<FID>1234</FI><INTU.BID>1234</SONRS></SIGNONMSGSRSV1><BANKMSGSRSV1>
<STMTTRNRS><TRNUID>0<STATUS><CODE>0<SEVERITY>INFO</STATUS><STMTRS><CURDEF>CAD<BANKACCTFROM><BANKID>0012<ACCTID>4000123456<ACCTTYPE>SAVINGS</BANKACCTFROM><BANKTRANLIST><DTSTART>20170328200000.000[-4:EDT]<DTEND>20170402201000.679[-4:EDT]
    <STMTTRN><TRNTYPE>OTHER<DTPOSTED>20170329120000.000<TRNAMT>-321.05<FITID>1234<NAME>EFT Withdrawal to Other Bank<MEMO>To Other Bank</STMTTRN>
</BANKTRANLIST><LEDGERBAL><BALAMT>12345.67<DTASOF>20170403001000.275[-4:EDT]</LEDGERBAL><AVAILBAL><BALAMT>12345.67<DTASOF>20170403001000.275[-4:EDT]</AVAILBAL></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>
    `);

    it("can parse a QFX/OFX credit card statement with two transactions", () => {
        return parseOfxToTransactions(creditCardStatement).then(({uniqueAccountId, currency, transactions}) => {
            expect(currency.code).to.equal('CAD');
            expect(uniqueAccountId).to.equal('TEST1>1001>4567');
            expect(transactions).to.have.length(2);
            expect(transactions[0]).to.deep.equal({
                amount: -1235,
                date: D`2017-03-30`, // We use DTUSER, "the date the user initiated the transaction", not the posted date.
                tid: '201703311765432',
                description: 'Tribbles R Us',
            });
            expect(transactions[1]).to.deep.equal({
                amount: -1799, // In a previous version this mis-rounded to 17.98; make sure it's 17.99
                date: D`2017-03-27`,
                tid: '201703281654321',
                description: 'Float Rounding Center',
            });
        });
    });

    it("can parse a QFX/OFX bank statement with one transaction", () => {
        return parseOfxToTransactions(bankStatement).then(({uniqueAccountId, currency, transactions}) => {
            expect(currency.code).to.equal('CAD');
            expect(uniqueAccountId).to.equal('TesterBank>1234>4000123456');
            expect(transactions).to.have.length(1);
            expect(transactions[0]).to.deep.equal({
                amount: -32105,
                date: D`2017-03-29`,
                tid: '1234',
                description: 'EFT Withdrawal to Other Bank',
            });
        });
    });
});
