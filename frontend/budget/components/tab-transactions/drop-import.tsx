import {Budget, Currency} from 'prophecy-engine';
import * as React from 'react';
import * as Modal from 'react-modal';
import {connect, DispatchProp} from 'react-redux';

import {finishTransactionImport, showMessage} from '../../actions';
import {RootStore} from '../../app';
import {DropToUploadWrapper} from '../widgets/drop-to-upload-wrapper';
import {ImportedTransaction, parseOfxToTransactions} from './parse-ofx';

Modal.setAppElement('#app');

const EXTERNAL_ACCOUNT_ID = 'externalAccountId'; // Key used in setting Prophecy.Account metadata to associate a Prophecy.Account with the account ID found in the bank's OFX statement file.


interface OwnProps {
    transactionId?: number;
}
interface Props extends OwnProps, DispatchProp<RootStore> {
    accounts: Budget['accounts'];
}
interface State {
    showImportDialog: boolean;
    accountIdSelected: number|null;
    /** The currency that was specified in the file */
    statementCurrency: Currency|null;
    statementExternalAccountId: string|null;
    statementTransactions: ImportedTransaction[];
}


/**
 * Wraps the transaction list and provides drag-and-drop importing of OFX or QFX files.
 *
 * Displays a friendly message when the user drags a file above the transaction list,
 * then once the user drops the file, this will open a modal and do the import.
 */
class _DropToImportTarget extends React.PureComponent<Props, State> {
    constructor(props) {
        super(props);
        this.state = {
            // For the import modal dialog, once users drop a file over the transaction list:
            showImportDialog: false,
            accountIdSelected: null,
            statementCurrency: null, // The currency that was specified in the file
            statementExternalAccountId: null,
            statementTransactions: [],
        };
        // Bind events to this:
        this.handleDrop = this.handleDrop.bind(this);
        this.cancelImport = this.cancelImport.bind(this);
        this.handleTargetAccountChange = this.handleTargetAccountChange.bind(this);
        this.finishImport = this.finishImport.bind(this);
    }

    /** Handle a file being dropped onto the transaction list - start the import process. */
    private handleDrop(files: FileList) {
        const file = files[0];
        const ext = file.name.toLowerCase().substr(file.name.length - 3);
        if (ext === "ofx" || ext === "qfx") {
            // start the import process...
            const reader = new FileReader();
            reader.onload = loadEvent => {
                const ofxString = (loadEvent.target as any).result; // TODO: remove 'as any' once https://github.com/Microsoft/TypeScript/issues/4163 is fixed
                parseOfxToTransactions(ofxString).then(ofxTransactionData => {
                    this.beginOfxImport(ofxTransactionData);
                }).catch(err => {
                    this.props.dispatch(showMessage(
                        <div>
                            <p>Ratio was unable to load transactions from this file.</p>
                            <p>Details: {err.message}</p>
                        </div>
                    ));
                });
            };
            reader.readAsText(file);
        } else {
            this.props.dispatch(showMessage("Only .ofx and .qfx files are supported."));
        }
    }

    /** Given parsed OFX data, show the UI with options and finish the import. */
    private beginOfxImport({transactions, uniqueAccountId, currency}) {
        if (transactions.length === 0) {
            this.props.dispatch(showMessage("There are no transactions in that file."));
            return;
        }

        const statementExternalAccountId = String(uniqueAccountId);
        const matchedAccount = this.props.accounts.valueSeq().filter(
            acc => acc.metadata.get(EXTERNAL_ACCOUNT_ID) === statementExternalAccountId && acc.currencyCode === currency.code
        ).first();

        this.setState({
            showImportDialog: true,
            accountIdSelected: matchedAccount ? matchedAccount.id : null,
            statementCurrency: currency, // The currency that was specified in the file
            statementExternalAccountId,
            statementTransactions: transactions,
        });
    }

    /** Close the import dialog and cancel the import */
    private cancelImport() {
        this.setState({
            showImportDialog: false,
            statementTransactions: [],
        });
    }

    private handleTargetAccountChange(event) {
        this.setState({
            accountIdSelected: event.target.value ? parseInt(event.target.value, 10) : null,
        });
    }

    /** Call the action creator to actually do the import. */
    private finishImport() {
        this.props.dispatch(finishTransactionImport(
            this.state.accountIdSelected,
            this.state.statementExternalAccountId,
            this.state.statementCurrency,
            this.state.statementTransactions
        ));
        this.cancelImport(); // Close the import dialog.
    }

    public render() {
        return (
            <DropToUploadWrapper dropMessage={
                <div>
                    <span className="fa fa-5x fa-cloud-download" aria-hidden="true"></span><br/>
                    <h2>Import transactions</h2>
                    <p>Drop an <strong>OFX</strong> or <strong>QFX</strong> file here to import transactions from your bank.</p>
                </div>
            } onFileDrop={this.handleDrop} keyShortcut='i'>

                {this.props.children}

                {this.state.showImportDialog ?
                    <Modal
                        isOpen={true}
                        className='influx-modal import-options'
                        overlayClassName='influx-modal-overlay'
                        contentLabel="Message"
                        onRequestClose={this.cancelImport}
                    >
                        <h1>Import Transactions</h1>
                        <div className="if-responsive-form">
                            <div className="if-field">
                                <label htmlFor="if-txn-import-account">Account</label>
                                <select className="ifc ifc-p" id="if-txn-import-account" value={this.state.accountIdSelected || ''} onChange={this.handleTargetAccountChange}>
                                    <option value="">Select account</option>
                                    {this.props.accounts.valueSeq().filter(account => account.currencyCode === this.state.statementCurrency.code).map(account =>
                                        <option value={account.id} key={account.id}>{account.name}</option>
                                    )}
                                </select>
                                <p>Select which account to import the transactions to (the account must be a {this.state.statementCurrency.name} account). Any transactions that have already been imported will be ignored.</p>
                            </div>
                        </div>
                        <div className="modal-action-bar">
                            <button className="ifc ifc-small ifc-default" onClick={this.finishImport} disabled={!this.state.accountIdSelected}><span className="fa fa-cloud-download" aria-hidden="true"></span> Import</button>
                            <button className="ifc ifc-small" onClick={this.cancelImport}>Cancel</button>
                        </div>
                    </Modal>
                :
                    null
                }
            </DropToUploadWrapper>
        );
    }
}

export const DropToImportTarget = connect((state: RootStore, ownProps: OwnProps) => {
    return {
        accounts: state.budgetView.budget.accounts,
    };
})(_DropToImportTarget);
