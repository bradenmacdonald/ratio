import {Budget} from 'prophecy-engine';
import * as React from 'react';
import {connect, DispatchProp} from 'react-redux';

import {addTransaction} from '../../actions';
import {RootStore} from '../../app';
import {DropToImportTarget} from './drop-import';
import {TransactionEditWidget} from './transaction-edit';

interface OwnProps {
}
interface Props extends OwnProps, DispatchProp<RootStore> {
    transactions: Budget['transactions'];
    isAddingTransaction: boolean;
}


/**
 * Transactions Tab View for a specific budget
 *
 * Displays income/expense/transfer transactions for each account.
 */
class _TransactionsTab extends React.PureComponent<Props> {
    constructor(props: Props) {
        super(props);
        // Bind events to this:
        this.handleAddButton = this.handleAddButton.bind(this);
    }

    /** Handle add button */
    private handleAddButton() {
        this.props.dispatch(addTransaction());
    }

    public render() {
        const transactions = this.props.transactions;
        const pendingTransactions = transactions.valueSeq().filter(txn => txn.pending);
        return (
            <DropToImportTarget>
                <div className="grid no-padding" id="budget-tab-transactions-content">
                    <div className="cell">
                        <table>
                            <thead>
                                <tr>
                                    <th id="txn-header-date">Date</th>
                                    <th>Who</th>
                                    <th id="txn-header-amount">Amount</th>
                                    <th>What</th>
                                    <th id="txn-header-category">Category</th>
                                    <th>Account</th>
                                    <th id="txn-header-actions"><span className="sr">Actions</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Pending Transactions */}
                                {pendingTransactions.filter(txn => txn.date !== null).reverse().map(txn => {
                                    return <TransactionEditWidget key={txn.id} transactionId={txn.id} />;
                                })}
                                {pendingTransactions.filter(txn => txn.date === null).map(txn => {
                                    return <TransactionEditWidget key={txn.id} transactionId={txn.id} />;
                                })}
                                {
                                    pendingTransactions.first() !== undefined ?
                                        <tr className="add-row-label"><td colSpan={7}>Pending Transactions</td></tr>
                                    :
                                        <tr className="add-row-label no-arrows"><td colSpan={7}>No pending transactions.</td></tr>
                                }
                                {/* Add new transaction */}
                                {
                                    this.props.isAddingTransaction ? <TransactionEditWidget/> :
                                    <tr className="add-transaction-button-row">
                                        <td colSpan={7}>
                                            <button className="ifc" onClick={this.handleAddButton}>
                                                <span className="fa fa-plus-circle" aria-hidden="true"></span>&nbsp;
                                                Add a new transaction
                                            </button>
                                        </td>
                                    </tr>
                                }
                                {/* Confirmed Transactions */}
                                <tr className="add-row-label down-arrows"><td colSpan={7}>Confirmed Transactions</td></tr>
                                {transactions.valueSeq().filter(txn => !txn.pending).reverse().map(txn => {
                                    return <TransactionEditWidget key={txn.id} transactionId={txn.id} />;
                                })}
                            </tbody>
                        </table>

                        {/* Data lists for autocomplete dropdowns */}
                        <datalist id="txn-tab-datalist-who">
                            {this.props.transactions.valueSeq().map(txn => txn.who).filter(who => who !== '').toOrderedSet().sort().valueSeq().map(who =>
                                <option value={who} key={who} />
                            )}
                        </datalist>
                    </div>
                </div>
            </DropToImportTarget>
        );
    }
}

export const TransactionsTab = connect((state: RootStore, ownProps: OwnProps) => {
    return {
        transactions: state.budgetView.budget.transactions,
        isAddingTransaction: state.budgetView.draftTransaction !== null,
    };
})(_TransactionsTab);
