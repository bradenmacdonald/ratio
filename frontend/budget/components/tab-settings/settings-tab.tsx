import * as React from 'react';
import {connect, DispatchProp} from 'react-redux';

import {actions as prophecyActions, Budget, PDate, SUPPORTED_CURRENCIES} from 'prophecy-engine';

import {RootStore} from '../../app';

import {DateField} from '../widgets/date-field';
import {DragSortedList} from '../widgets/drag-sorted-list';
import {TextField} from '../widgets/text-field';
import {AccountEditWidget} from './account-edit';

interface OwnProps {
}
interface Props extends OwnProps, DispatchProp<RootStore> {
    budget: Budget;
    safeIdPrefix: number;
}
interface State {
}

/**
 * Settings Tab View for a specific budget
 *
 * Allows the user to change the budget's options
 */
class _SettingsTab extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        // Bind event handlers:
        this.handleAccountDragSort = this.handleAccountDragSort.bind(this);
        this.handleCurrencyChange = this.handleCurrencyChange.bind(this);
        this.handleStartDateChange = this.handleDateChange.bind(this, 'startDate');
        this.handleEndDateChange = this.handleDateChange.bind(this, 'endDate');
        this.handleNameChange = this.handleNameChange.bind(this);
        this.handleAddAccountButton = this.handleAddAccountButton.bind(this);
        this.handleExportBudget = this.handleExportBudget.bind(this);
    }

    private handleDateChange(dateType: 'startDate'|'endDate', newDate: PDate) {
        this.props.dispatch({
            type: prophecyActions.SET_DATE,
            [dateType]: newDate instanceof PDate ? +newDate : null,
            budgetId: this.props.budget.id,
        });
    }
    private handleStartDateChange: (newDate: PDate) => void;
    private handleEndDateChange: (newDate: PDate) => void;

    private handleNameChange(name: string) {
        this.props.dispatch({
            type: prophecyActions.SET_NAME,
            name,
            budgetId: this.props.budget.id,
        });
    }

    private handleAccountDragSort(accountProps: any, newIndex: number) {
        this.props.dispatch({
            type: prophecyActions.UPDATE_ACCOUNT,
            id: accountProps.accountId,
            index: newIndex,
            budgetId: this.props.budget.id,
        });
    }

    private handleAddAccountButton() {
        let newAccountId = this.props.safeIdPrefix;
        while (this.props.budget.accounts.has(newAccountId)) {
            newAccountId++;
        }
        this.props.dispatch({
            type: prophecyActions.UPDATE_ACCOUNT,
            budgetId: this.props.budget.id,
            id: newAccountId,
            data: {name: "New Account", currencyCode: this.props.budget.currency.code},
        });
    }

    private handleCurrencyChange(event: React.ChangeEvent<HTMLSelectElement>) {
        const currencyCode = event.target.options[event.target.selectedIndex].value;
        this.props.dispatch({
            type: prophecyActions.SET_CURRENCY,
            currencyCode,
            budgetId: this.props.budget.id,
        });
    }

    /** Download a copy of this budget as JSON */
    private handleExportBudget() {
        const dateStr = PDate.today().toString();
        const filename = `${this.props.budget.name} ${dateStr}.json`;
        const blob = new Blob([JSON.stringify(this.props.budget, null, '    ')], {type: 'application/json'});
        if (window.navigator.msSaveOrOpenBlob) {
            window.navigator.msSaveBlob(blob, filename);
        } else {
            const link = window.document.createElement('a');
            const url = window.URL.createObjectURL(blob);
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        }
    }

    public render() {
        // For drag sorting:
        const placeholder = <tr key="placeholder" className="drag-sort-placeholder"><td colSpan={4}></td></tr>;

        return (
            <div>
                <div className="grid">
                    <div className="cell">
                        <h1>Settings</h1>
                        <table className="gridify-table-below-sm">
                            <tbody>
                                <tr>
                                    <td><label htmlFor="changeNameField">Name</label></td>
                                    <td><TextField attrs={{id: "changeNameField"}} value={this.props.budget.name} onValueChange={this.handleNameChange} /></td>
                                </tr>
                                <tr>
                                    <td><label htmlFor="startDate">Start Date</label></td>
                                    <td><DateField attrs={{id: "startDate"}} dateValue={this.props.budget.startDate} onValueChange={this.handleStartDateChange} /></td>
                                </tr>
                                <tr>
                                    <td><label htmlFor="endDate">End Date</label></td>
                                    <td><DateField attrs={{id: "endDate"}} dateValue={this.props.budget.endDate} onValueChange={this.handleEndDateChange} /></td>
                                </tr>
                                <tr>
                                    <td><label htmlFor="currencySel">Budget Currency</label></td>
                                    <td>
                                        <select id="currencySel" onChange={this.handleCurrencyChange} value={this.props.budget.currency.code} className="ifc ifc-p">
                                            {Object.keys(SUPPORTED_CURRENCIES).map(k => SUPPORTED_CURRENCIES[k]).map(c =>
                                                <option key={c.code} value={c.code}>{c.name} ({c.symbols[0]})</option>
                                            )}
                                        </select>
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        <h2>Accounts</h2>

                        <table>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Initial Balance</th>
                                    <th>Currency</th>
                                    <th><span className="sr">Actions</span></th>
                                </tr>
                            </thead>
                            <DragSortedList wrapperElementType="tbody" placeholder={placeholder} onChangeItemPosition={this.handleAccountDragSort}>
                                {this.props.budget.accounts.valueSeq().map(account =>
                                    <AccountEditWidget key={account.id} accountId={account.id} />
                                )}
                            </DragSortedList>
                        </table>
                        <br />
                        <button className="ifc" onClick={this.handleAddAccountButton}>
                            <span className="fa fa-plus-circle" aria-hidden="true"></span> Add Account
                        </button>

                        <h2>Data Export</h2>

                        <button className="ifc" onClick={this.handleExportBudget}>
                            <span className="fa fa-download" aria-hidden="true"></span> Download Budget (Prophecy JSON file)
                        </button>

                    </div>
                </div>
            </div>
        );
    }
}

export const SettingsTab = connect((state: RootStore, ownProps: OwnProps) => ({
    budget: state.budgetView.budget,
    safeIdPrefix: state.budgetView.safeIdPrefix,
}))(_SettingsTab);
