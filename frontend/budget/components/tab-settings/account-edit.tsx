import * as React from 'react';
import {connect, DispatchProp} from 'react-redux';

import {Account, AccountValues, actions as prophecyActions, Currency, SUPPORTED_CURRENCIES} from 'prophecy-engine';

import {RootStore} from '../../app';

import {AmountField} from '../widgets/amount-field';
import {ButtonWithPopup} from '../widgets/button-with-popup';
import {DragSortedListChildProps} from '../widgets/drag-sorted-list';
import {TextField} from '../widgets/text-field';

interface OwnProps extends DragSortedListChildProps {
    accountId?: number;
}
interface Props extends OwnProps, DispatchProp<RootStore> {
    account: Account|undefined;
    budgetId: number;
    defaultCurrency: Currency;
}

/**
 * Widget for editing an account. Is a <tr> so must be in a table.
 */
class _AccountEditWidget extends React.PureComponent<Props> {
    constructor(props: Props) {
        super(props);
        // Bind events to this:
        this.handleNameChange = this.handleNameChange.bind(this);
        this.handleCurrencyChange = this.handleCurrencyChange.bind(this);
        this.handleInitialBalanceChange = this.handleInitialBalanceChange.bind(this);
        this.handleDeleteButton = this.handleDeleteButton.bind(this);
    }

    /** Dispatch a redux action to change an account's properties */
    private modifyAccount(data: AccountValues) {
        this.props.dispatch({
            type: prophecyActions.UPDATE_ACCOUNT,
            id: this.props.accountId,
            budgetId: this.props.budgetId,
            data,
        });
    }

    /** Handle event for a change to this account's name field */
    private handleNameChange(newName) {
        this.modifyAccount({name: newName});
    }

    /** Handle DOM event for a change to this account's currency field */
    private handleCurrencyChange(event: React.ChangeEvent<HTMLSelectElement>) {
        const currencyCode = event.target.value;
        if (currencyCode !== this.props.account.currencyCode) {
            this.modifyAccount({currencyCode});
        }
    }

    /** Handle event sent by our AmountField when the initialBalance value has been edited */
    private handleInitialBalanceChange(newAmount: number) {
        this.modifyAccount({initialBalance: newAmount});
    }

    /** Handle the Delete button */
    private handleDeleteButton() {
        this.props.dispatch({
            type: prophecyActions.DELETE_ACCOUNT,
            id: this.props.accountId,
            budgetId: this.props.budgetId,
        });
    }

    public render() {
        const account = this.props.account;

        return (
            <tr {...this.props.draggable} className={[...this.props.draggableClass].join(' ')}>
                <td>
                    <TextField attrs={{"aria-label": "Account Name"}} value={account.name} onValueChange={this.handleNameChange} />
                </td>
                <td>
                    <AmountField
                        amount={account.initialBalance}
                        currency={account.currency}
                        attrs={{"aria-label": "Initial Balance"}}
                        onAmountChange={this.handleInitialBalanceChange}
                    />
                </td>
                <td>
                    <select aria-label="Account Currency" className="ifc ifc-p" onChange={this.handleCurrencyChange} value={account.currency.code}>
                        {Object.keys(SUPPORTED_CURRENCIES).map(k => SUPPORTED_CURRENCIES[k]).map(c =>
                            <option key={c.code} value={c.code}>{c.name} ({c.symbols[0]})</option>
                        )}
                    </select>
                </td>
                <td className="if-action-buttons">
                    <div className="inline-drag-sort-handle" {...this.props.dragHandleFor(this)}>
                        <span className="fa fa-bars" aria-hidden="true"></span>
                        <span className="sr">Drag to re-order</span>
                    </div>
                    <ButtonWithPopup toggleButton={
                        <button className="ifc ifc-p ifc-small" title="Actions">
                            <span aria-hidden="true">⋯</span> <span className="sr">More Actions</span>
                        </button>
                    }>
                        <li>
                            <button className="ifc" onClick={this.handleDeleteButton}>
                                <span className="fa fa-trash" aria-hidden="true"></span> Delete
                            </button>
                        </li>
                    </ButtonWithPopup>
                </td>
            </tr>
        );
    }
}

export const AccountEditWidget = connect((state: RootStore, ownProps: OwnProps) => ({
    account: state.budgetView.budget.accounts.get(ownProps.accountId),
    budgetId: state.budgetView.budget.id,
    defaultCurrency: state.budgetView.budget.currency,
}))(_AccountEditWidget);
