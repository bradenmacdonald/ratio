import {
    actions as ProphecyActions,
    Budget,
    Currency,
    CurrencyFormatter,
    PDate,
    Transaction,
    TransactionDetail,
    TransactionValues,
} from 'prophecy-engine';
import * as React from 'react';
import {connect, DispatchProp} from 'react-redux';

import {RootStore} from '../../app';

import {updateDraftTransaction} from '../../actions';
import {AmountField} from '../widgets/amount-field';
import {ButtonWithPopup} from '../widgets/button-with-popup';
import {DateField} from '../widgets/date-field';
import {TextField} from '../widgets/text-field';
import {CategorySelectorWidget, SPLIT_VALUE, TRANSFER_VALUE, UNSPLIT_VALUE} from './category-selector-widget';
import {DetailRowWidget} from './detail-row-widget';

const STAR_ICON_CLASSES = {
    0: 'fa-star-o',
    1: 'fa-star',
    2: 'fa-exclamation-circle',
};

interface OwnProps {
    transactionId?: number;
}
interface Props extends OwnProps, DispatchProp<RootStore> {
    accounts: Budget['accounts'];
    accountBalance: number|undefined;
    budgetId: number;
    defaultCurrency: Currency;
    nextTransactionId: number;
    transaction: Transaction;
}
interface State {
    categorySelectFocused: boolean;
}

/**
 * Widget for editing a transaction. Is a <tr> so must be in a table.
 */
class _TransactionEditWidget extends React.PureComponent<Props, State> {
    constructor(props) {
        super(props);
        this.state = {
            categorySelectFocused: false,
        };
        // Bind events to this:
        this.handleDateChange = this.handleDateChange.bind(this);
        this.handleWhoChange = this.handleWhoChange.bind(this);
        this.handleAmountChange = this.handleAmountChange.bind(this);
        this.handleSplitAmountChange = this.handleSplitAmountChange.bind(this);
        this.handleDescriptionChange = this.handleDescriptionChange.bind(this);
        this.handleCategorySelected = this.handleCategorySelected.bind(this);
        this.handleAccountChange = this.handleAccountChange.bind(this);
        this.handleStarClick = this.handleStarClick.bind(this);
        this.markAsPending = this.markAsPending.bind(this);
        this.markAsConfirmed = this.markAsConfirmed.bind(this);
        this.handleDeleteButton = this.handleDeleteButton.bind(this);
        this.handleDuplicateButton = this.handleDuplicateButton.bind(this);
        this.handleSaveButton = this.handleSaveButton.bind(this);
        this.handleSavePendingButton = this.handleSavePendingButton.bind(this);
    }

    /** Dispatch a redux action to change this transaction's properties */
    private modifyTransaction(data: TransactionValues) {
        if (this.props.transactionId) {
            // This is an existing transaction in the budget
            this.props.dispatch({
                type: ProphecyActions.UPDATE_TRANSACTION,
                id: this.props.transactionId,
                budgetId: this.props.budgetId,
                data,
            });
        } else {
            // We are editing the draft transaction temporarily stored in the budgetView state
            this.props.dispatch(updateDraftTransaction(data));
        }
    }

    /** Handle event for a change to this transactions's date */
    private handleDateChange(newDate: PDate) {
        this.modifyTransaction({date: newDate});
    }

    /** Handle event for a change to this transactions's "who" field */
    private handleWhoChange(newWho: string) {
        this.modifyTransaction({who: newWho});
    }

    /**
     * Handle a change to this transaction's total amount.
     *
     * If it's not a split transaction, we set the 'amount' value of detail[0] to this new amount.
     * If it's a split transaction, this must be the total amount, so we set the last
     * split detail's amount to whatever is required to make this the total.
     */
    private handleAmountChange(newTotalAmount: number) {
        // Add up the 'amount' values of each detail entry except the final one.
        // This will be 0 for non-split transactions since they have only the final entry.
        const existingSplitAmounts = this.props.transaction.detail.pop().reduce((sum, d) => sum + d.amount, 0);
        // Determine what we must set the final detail entry's 'amount' value to in order to make the total equal newTotalAmount:
        const newLastDetailEntryAmount = newTotalAmount - existingSplitAmounts;
        // Apply that change:
        this.modifyTransaction({
            detail: this.props.transaction.detail.setIn([-1, 'amount'], newLastDetailEntryAmount).toJS(),
        });
    }

    /** Handle a change to the partial amount of this split transaction, preserving the total amount */
    private handleSplitAmountChange(detailIndex: number, newSplitAmount: number) {
        let newDetail = this.props.transaction.detail.setIn([detailIndex, 'amount'], newSplitAmount);
        if (detailIndex !== newDetail.size - 1) {
            // Determine what we must set the final detail entry's 'amount' value to in order to make the total amount unchanged:
            const totalAmount = this.props.transaction.amount;
            // Add up the 'amount' values of each detail entry except the final one.
            const existingSplitAmounts = newDetail.pop().reduce((sum, d) => sum + d.amount, 0);
            const newLastDetailEntryAmount = totalAmount - existingSplitAmounts;
            newDetail = newDetail.setIn([-1, 'amount'], newLastDetailEntryAmount);
        }
        // Apply that change:
        this.modifyTransaction({
            detail: newDetail.toJS(),
        });
    }

    /**
     * Handle a change to one of this transaction's description fields.
     */
    private handleDescriptionChange(detailIndex: number, newDescription: string) {
        this.modifyTransaction({
            detail: this.props.transaction.detail.setIn([detailIndex, 'description'], newDescription).toJS(),
        });
    }

    /**
     * Handle a new selection from the 'category' dropdown of one of the detail entries of this transaction
     */
    private handleCategorySelected(detailIndex: number, newValue: string) {
        if (newValue === TRANSFER_VALUE) {
            this.modifyTransaction({
                isTransfer: true,
                // Ensure there is only one detail entry, and it has a null category ID:
                detail: [this.props.transaction.detail.first().set('categoryId', null).toJS()],
            });
            // All of the following have 'isTransfer: false' in case the transaction currently is a transfer.
            // For any selection other than TRANSFER_VALUE it cannot be left marked as a transfer, so we must change it.
        } else if (newValue === SPLIT_VALUE) {
            this.modifyTransaction({
                isTransfer: false,
                detail: this.props.transaction.detail.push(new TransactionDetail()).toJS(),
            });
        } else if (newValue === UNSPLIT_VALUE) {
            this.modifyTransaction({
                isTransfer: false,
                detail: this.props.transaction.detail.delete(detailIndex).toJS(),
            });
        } else {
            // This is an actual category, or null
            const newCategoryId = newValue === '' ? null : +newValue;
            this.modifyTransaction({
                isTransfer: false,
                detail: this.props.transaction.detail.setIn([detailIndex, 'categoryId'], newCategoryId),
            });
        }
    }

    /** Handle event for a change to this transaction's account field. */
    private handleAccountChange(event: React.ChangeEvent<HTMLSelectElement>) {
        const accountId = event.target.value ? +event.target.value : null;
        this.modifyTransaction({accountId});
    }

    /** Change the star/highlight on this transaction */
    private handleStarClick() {
        const txn = this.props.transaction;
        const starIndex = (txn.metadata.get('star', 0) + 1) % Object.keys(STAR_ICON_CLASSES).length;
        this.modifyTransaction({
            metadata: txn.metadata.merge({star: starIndex}).toJS(),
        });
    }

    /** Mark this transaction as pending (existing transaction only) */
    private markAsPending() {
        this.modifyTransaction({pending: true});
    }

    /** Mark this transaction as not pending (existing transaction only) */
    private markAsConfirmed() {
        this.modifyTransaction({pending: false});
    }

    /** Handle delete button (existing transaction only) */
    private handleDeleteButton() {
        this.props.dispatch({
            type: ProphecyActions.DELETE_TRANSACTION,
            id: this.props.transactionId,
            budgetId: this.props.budgetId,
        });
    }

    /** Handle duplicate button (creates a copy of an existing transaction) */
    private handleDuplicateButton() {
        const data = this.props.transaction.toJS();
        delete data.id;
        this.props.dispatch({
            type: ProphecyActions.UPDATE_TRANSACTION,
            id: this.props.nextTransactionId,
            budgetId: this.props.budgetId,
            data,
        });
    }

    /** Handle save button (new transaction only) */
    private handleSaveButton() {
        this.createNewTransaction({pending: false});
    }

    /** Handle "save as pending" button (new transaction only) */
    private handleSavePendingButton() {
        this.createNewTransaction({pending: true});
    }

    /** Save the user's input as a new transaction (new transaction only) */
    private createNewTransaction({pending}) {
        const data = this.props.transaction.set('pending', pending).toJS();
        delete data.id;
        this.props.dispatch({
            type: ProphecyActions.UPDATE_TRANSACTION,
            id: this.props.nextTransactionId,
            budgetId: this.props.budgetId,
            data,
        });
        // Reset any fields that are likely to be different in subsequent transactions:
        this.props.dispatch(updateDraftTransaction({
            who: "",
            detail: [{}],
        }));
    }

    public render() {
        const txn = this.props.transaction;
        const isAdding = txn.id === null;
        const account = txn.accountId !== null ? this.props.accounts.get(txn.accountId) : null;
        let accountBalanceString = "";
        if (this.props.accountBalance) {
            const cf = new CurrencyFormatter(account.currency);
            accountBalanceString = '(' + cf.formatAmount(this.props.accountBalance) + ')';
        }
        const currency = account ? account.currency : this.props.defaultCurrency;
        // Transactions can be highlighted/starred (0 for default/no star, 1 for a yellow star, 2 for a red exclamation pt)
        const starIndex = txn.metadata.get('star', 0);
        const starIconClass = STAR_ICON_CLASSES[starIndex in STAR_ICON_CLASSES ? starIndex : 0];

        return (
            <tr className={`txn txn-star-${starIndex}` + (isAdding ? ' add-transaction' : '')}>
                <td>
                    <DateField attrs={{'aria-label': "Date"}} dateValue={txn.date} onValueChange={this.handleDateChange} />
                </td>
                <td>
                    <TextField attrs={{'aria-label': "Who", placeholder: isAdding ? "Who" : '', list: 'txn-tab-datalist-who'}} value={txn.who} onValueChange={this.handleWhoChange} />
                </td>
                <td>
                    <AmountField attrs={{'aria-label': "Amount"}} amount={txn.amount} currency={account ? account.currency : this.props.defaultCurrency} onAmountChange={this.handleAmountChange} />
                </td>
                <td>
                    {txn.detail.map((d, i) =>
                        <DetailRowWidget
                            key={i}
                            detailIndex={i}
                            currency={currency}
                            isAdding={isAdding}
                            isSplit={txn.isSplit}
                            amount={d.amount}
                            description={d.description}
                            onSplitAmountChange={this.handleSplitAmountChange}
                            onDescriptionChange={this.handleDescriptionChange}
                        />
                    )}
                </td>
                <td>
                    {txn.detail.map((d, i) =>
                        <CategorySelectorWidget
                            key={i}
                            categoryId={d.categoryId}
                            detailIndex={i}
                            detailSize={txn.detail.size}
                            onCategorySelected={this.handleCategorySelected}
                            isTransfer={txn.isTransfer}
                        />
                    )}
                </td>
                <td>
                    <select aria-label="Account" className="ifc ifc-p" onChange={this.handleAccountChange} value={txn.accountId || ""}>
                        <option value="" aria-label="No Account Selected">(Choose account)</option>
                        {this.props.accounts.valueSeq().map(accountChoice =>
                            <option key={accountChoice.id} value={accountChoice.id}>{accountChoice.name} {accountChoice.id === txn.accountId && accountBalanceString}</option>
                        )}
                    </select>
                </td>
                {
                    isAdding ?
                        <td className="if-action-buttons">
                            <button onClick={this.handleSaveButton} className="ifc ifc-p ifc-small add-button-default" title="Save as confirmed">
                                <span aria-hidden="true">&nbsp;✓&nbsp;</span> <span className="sr">Save</span>
                            </button>&nbsp;or&nbsp;
                            <button onClick={this.handleSavePendingButton} className="ifc ifc-p ifc-small" title="Add as pending">
                                <span className="fa fa-angle-up" aria-hidden="true"></span> <span className="sr">Add as pending</span>
                            </button>
                        </td>
                    :
                        <td className="if-action-buttons">
                            <ButtonWithPopup toggleButton={
                                <button className="ifc ifc-p ifc-small" title="Actions"><span aria-hidden="true">⋯</span> <span className="sr">Transaction Actions</span></button>
                            }>
                                {txn.pending ? null : <li><button className="ifc" onClick={this.markAsPending}>Move to pending</button></li>}
                                <li><button className="ifc" onClick={this.handleDuplicateButton}>Duplicate</button></li>
                                {/*<li><button className="ifc">Repeat...</button></li>*/}
                                <li><button className="ifc" onClick={this.handleDeleteButton}>Delete</button></li>
                            </ButtonWithPopup>
                            <button className="ifc ifc-p ifc-small txn-star-button" onClick={this.handleStarClick}>
                                <span className={`fa ${starIconClass}`} aria-hidden="true"></span><span className="sr">{starIndex ? "Change star" : "Add Star"}</span>
                            </button>
                            {txn.pending ? <button className="ifc ifc-p ifc-small" title="Confirm" onClick={this.markAsConfirmed}>✓ <span className="sr">Confirm</span></button> : null}
                        </td>
                }
            </tr>
        );
    }
}

export const TransactionEditWidget = connect((state: RootStore, ownProps: OwnProps) => {
    const transaction = ownProps.transactionId ?
        state.budgetView.budget.transactions.get(ownProps.transactionId) // Editing an existing transaction
        : state.budgetView.draftTransaction; // Creating a new transaction
    return {
        accounts: state.budgetView.budget.accounts,
        accountBalance: (
            (transaction.id && transaction.accountId) ?
                state.budgetView.budget.accountBalanceAsOfTransaction(transaction.id, transaction.accountId)
                : undefined
        ),
        transaction,
        budgetId: state.budgetView.budget.id,
        defaultCurrency: state.budgetView.budget.currency,
        nextTransactionId: state.budgetView.generateNewIdFor('transactions'),
    };
})(_TransactionEditWidget);
