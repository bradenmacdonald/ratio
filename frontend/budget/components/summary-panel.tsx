import {Budget, CurrencyFormatter, PDate} from 'prophecy-engine';
import * as React from 'react';
import {connect, DispatchProp} from 'react-redux';

import {RootStore} from '../app';

import {SummaryItem} from './summary-item';

interface OwnProps {
}
interface Props extends OwnProps, DispatchProp<RootStore> {
    budget: Budget;
    budgetLoading: boolean;
    budgetValid: boolean;
    currentDate: PDate;
}

class _SummaryPanel extends React.PureComponent<Props> {
    constructor(props) {
        super(props);
    }
    public render() {
        let summaryDetails =  null;
        if (this.props.budgetValid) {
            const currencyFormatter = new CurrencyFormatter(this.props.budget.currency);
            const currentDay = (+this.props.currentDate) - (+this.props.budget.startDate) + 1;
            const numDaysInBudget = (+this.props.budget.endDate) - (+this.props.budget.startDate) + 1;

            const finalBudgetsByCategory = this.props.budget.categoryBudgetsOnDate(this.props.budget.endDate);
            let budgetNetResult = 0;
            this.props.budget.categories.filter(c => c.currencyCode === this.props.budget.currencyCode).forEach(c => {
                budgetNetResult += finalBudgetsByCategory.get(c.id);
            });

            summaryDetails = [
                <section key="s1">
                    <SummaryItem label="Current Date" value={`Day ${currentDay} of ${numDaysInBudget}`} />
                    <SummaryItem label={`Budget Net Result (${this.props.budget.currencyCode})`} value={currencyFormatter.formatAmount(budgetNetResult)} />
                </section>,

                <section key="s2">
                    {this.props.budget.accounts.valueSeq().map(account =>
                        <SummaryItem key={account.id} label={account.name} value={
                            currencyFormatter.formatAmount(this.props.budget.accountBalances[account.id], account.currency)
                        } />
                    )}
                </section>,

                /*<section key="s3">
                    <SummaryItem label="Activities &amp; Dining" value="$34.00" />
                </section>,*/
            ];
        } else if (this.props.budgetLoading) {
            summaryDetails = "Loading...";
        }

        return (
            // Note: a role="region" or role="tabpanel" and appropriate label for this element
            // will be supplied by the parent element - either a .cell or a tab panel
            <div className="budget-summary">
                { summaryDetails }
            </div>
        );
    }
}

export const SummaryPanel = connect((state: RootStore, ownProps: OwnProps) => {
    return {
        budget: state.budgetView.budget,
        budgetLoading: state.budgetView.budgetLoading,
        budgetValid: state.budgetView.budgetValid,
        currentDate: state.budgetView.currentDate,
    };
})(_SummaryPanel);
