import {Category, CategoryRule, CategoryRulePeriod, CurrencyFormatter, PDate} from 'prophecy-engine';
import * as React from 'react';

import {ButtonWithPopup} from '../widgets/button-with-popup';

const STAR_ICON_CLASSES = {
    0: 'fa-star-o',
    1: 'fa-star',
    2: 'fa-exclamation-circle',
};

interface Props {
    category: Category;
    categoryBalance: number;
    categoryBudgetToDate: number;
    categoryBudgetTotal: number;
    currentDate: PDate;
    onEdit: (categoryId: number) => void;
    onDelete: (categoryId: number) => void;
    onDuplicate: (categoryId: number) => void;
}

/**
 * A row in the table on the budget tab, representing a category
 */
export class CategoryRow extends React.PureComponent<Props> {
    constructor(props) {
        super(props);
        this.handleEditButton = this.handleEditButton.bind(this);
        this.handleDeleteButton = this.handleDeleteButton.bind(this);
        this.handleDuplicateButton = this.handleDuplicateButton.bind(this);
    }

    /** Handle the 'Edit category' button on each category's row. */
    private handleEditButton() {
        this.props.onEdit(this.props.category.id);
    }

    /** Handle the 'Delete category' button on each category's row. */
    private handleDeleteButton() {
        this.props.onDelete(this.props.category.id);
    }

    /** Handle the 'Duplicate' button on each category's row. */
    private handleDuplicateButton() {
        this.props.onDuplicate(this.props.category.id);
    }

    public render() {
        const cat = this.props.category;
        const starIndex = cat.metadata.get('star', 0);
        const starIconClass = STAR_ICON_CLASSES[starIndex in STAR_ICON_CLASSES ? starIndex : 0];
        const currencyFormatter = new CurrencyFormatter(cat.currency);
        const isIncome = cat.metadata.get("isIncome", false);

        // By how many dollars should the budget be short/over before we highlight it in red/green?
        const statusThreshold = Math.abs(this.props.categoryBudgetToDate * 0.01);  // 1%

        const leftToSpend = this.props.categoryBalance - this.props.categoryBudgetToDate;

        const spentToDateString = currencyFormatter.formatAmount(this.props.categoryBalance);
        const budgetedToDatestring = currencyFormatter.formatAmount(this.props.categoryBudgetToDate);
        const statusDetail = `${spentToDateString} vs ${budgetedToDatestring} budgeted to date)`;

        let rulesSummary = "Complex budget";
        if (cat.isAutomatic) {
            const totalBudgetAmountString = currencyFormatter.formatAmount(this.props.categoryBudgetTotal);
            rulesSummary = `Flexible budget (${totalBudgetAmountString})`;
        } else {
            const activeRules: CategoryRule[] = cat.rules.valueSeq().filter((rule) =>
                (rule.startDate === null || rule.startDate <= this.props.currentDate) &&
                (rule.endDate === null || rule.endDate >= this.props.currentDate)
            ).toJS();
            if (activeRules.length === 1) {
                const activeRule = activeRules[0];
                const amountStr = currencyFormatter.formatAmount(activeRule.amount);
                if (activeRule.repeatN === 1) {
                    rulesSummary = (
                        activeRule.period === CategoryRulePeriod.Month ? `${amountStr} per month` :
                        activeRule.period === CategoryRulePeriod.Week ? `${amountStr} per week` :
                        activeRule.period === CategoryRulePeriod.Day ? `${amountStr} per day` :
                        activeRule.period === CategoryRulePeriod.Year ? `${amountStr} per year` :
                        `${amountStr} this budget`
                    );
                } else {
                    rulesSummary = (
                        activeRule.period === CategoryRulePeriod.Month ? `${amountStr} every ${activeRule.repeatN} months` :
                        activeRule.period === CategoryRulePeriod.Week ? `${amountStr} every ${activeRule.repeatN} weeks` :
                        activeRule.period === CategoryRulePeriod.Day ? `${amountStr} every ${activeRule.repeatN} days` :
                        activeRule.period === CategoryRulePeriod.Year ? `${amountStr} every ${activeRule.repeatN} years` :
                        `${amountStr} this budget`
                    );
                }
            }
        }

        return (<tr key={cat.id}>
            <td>{cat.name}</td>
            <td>
                {
                    leftToSpend > +statusThreshold ? <span className="acct-status-under" title={statusDetail}>{currencyFormatter.formatAmount(leftToSpend)} {isIncome ? "extra" : "under budget"}</span> :
                    leftToSpend < -statusThreshold ? <span className="acct-status-over" title={statusDetail}>{currencyFormatter.formatAmount(-leftToSpend)} {isIncome ? "short" : "over budget"}</span> :
                    <span className="acct-status-neutral" title={statusDetail}>budget is on track</span>
                }
            </td>
            <td>
                {rulesSummary}
            </td>
            <td className="if-action-buttons">
                <button className="ifc ifc-p ifc-small" onClick={this.handleEditButton} title="Edit">
                    <span className="fa fa-pencil-square-o" aria-hidden="true"></span> <span className="sr">Edit Category</span>
                </button>
                {/*<button className="ifc ifc-p ifc-small cat-star-button">
                    <span className={`fa ${starIconClass}`} aria-hidden="true"></span><span className="sr">{starIndex ? "Change star" : "Add Star"}</span>
                </button>*/}
                <ButtonWithPopup toggleButton={
                    <button className="ifc ifc-p ifc-small" title="Actions"><span aria-hidden="true">⋯</span> <span className="sr">More Actions</span></button>
                }>
                    <li><button className="ifc" onClick={this.handleDuplicateButton}><span className="fa fa-copy" aria-hidden="true"></span> Duplicate</button></li>
                    <li><button className="ifc" onClick={this.handleDeleteButton}><span className="fa fa-trash" aria-hidden="true"></span> Delete</button></li>
                </ButtonWithPopup>
            </td>
            <td>{cat.notes}</td>
        </tr>);
    }
}
