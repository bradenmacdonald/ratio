import * as React from 'react';
import {connect, DispatchProp} from 'react-redux';

import {
    actions as prophecyActions,
    Budget,
    Category,
    CategoryRule,
    CategoryRulePeriod,
    Currency,
    Immutable,
    PDate,
    SUPPORTED_CURRENCIES,
} from 'prophecy-engine';

import {RootStore} from '../../app';

import {TextField} from '../widgets/text-field';
import {CategoryRuleWidget} from './category-edit-rule';

interface OwnProps {
    categoryId: number;
    onRequestClose: () => void;
}
interface Props extends OwnProps, DispatchProp<RootStore> {
    budget: Budget;
    category: Category;
    budgetLoading: boolean;
    defaultCurrency: Currency;
    safeIdPrefix: number;
}
interface State {
    category: Category;
}

/**
 * Widget for editing a category.
 */
class _CategoryEditWidget extends React.PureComponent<Props, State> {

    public static defaultProps: Partial<Props> = {
        onRequestClose: () => {},
    };

    constructor(props) {
        super(props);
        // Set the state:
        this.state = {
            category: this.props.category,
        };
        // Bind events to this:
        this.handleAddRule = this.handleAddRule.bind(this);
        this.handleRemoveRule = this.handleRemoveRule.bind(this);
        this.handleCurrencyChange = this.handleCurrencyChange.bind(this);
        this.handleGroupIdChange = this.handleGroupIdChange.bind(this);
        this.handleNameChange = this.handleNameChange.bind(this);
        this.handleNotesChange = this.handleNotesChange.bind(this);
        this.handleSave = this.handleSave.bind(this);
        this.setAutomatic = this.setAutomatic.bind(this);
        this.setToRuleBasedExpense = this.setToRuleBased.bind(this, false);
        this.setToRuleBasedIncome = this.setToRuleBased.bind(this, true);

        this.handleRuleAmountChange = this.handleRuleAmountChange.bind(this);
        this.handleRuleRepeatNChange = this.handleRuleRepeatNChange.bind(this);
        this.handleRuleRepeatPeriodChange = this.handleRuleRepeatPeriodChange.bind(this);
        this.handleRuleToggleRepeat = this.handleRuleToggleRepeat.bind(this);
        this.handleRuleEndDateChange = this.handleRuleEndDateChange.bind(this);
        this.handleRuleStartDateChange = this.handleRuleStartDateChange.bind(this);
        this.handleRuleToggleEndDate = this.handleRuleToggleEndDate.bind(this);
        this.handleRuleToggleStartDate = this.handleRuleToggleStartDate.bind(this);
    }

    public componentWillReceiveProps(nextProps) {
        if ((nextProps.categoryId !== this.props.categoryId) || (nextProps.category && !this.props.category)) {
            // The category has changed; discard all local changes, if any.
            this.setState({category: nextProps.category});
        } else if (nextProps.category && !Immutable.is(nextProps.category, this.props.category)) {
            // The category has changed, probably by another user.
            // We want to update any fields that were changed, but keep any other fields
            // untouched (they may be modified here). e.g. if another user stars a category,
            // we should update the metadata now but preserve any ongoing changes this user
            // is working on.
            const newCategory = nextProps.category;
            const changes = {};
            for (const [key, newValue] of newCategory.entries()) {
                if (!Immutable.is(this.props.category.get(key), newValue)) {
                    // This key (e.g. name, metadata, or whatever) has changed, so force an update:
                    changes[key] = newValue;
                }
            }
            this.setState({category: this.state.category.merge(changes)});
        }
    }

    /** Accept the changes and create/update the category. */
    private handleSave() {
        let categoryId = this.props.categoryId;
        if (categoryId === undefined) {
            // We are creating a new category
            categoryId = this.props.safeIdPrefix;
            while (this.props.budget.categories.has(categoryId)) {
                categoryId++;
            }
        }
        const data = this.state.category.toJS();
        delete data.id;
        this.props.dispatch({
            type: prophecyActions.UPDATE_CATEGORY,
            id: categoryId,
            budgetId: this.props.budget.id,
            data,
        });
        this.props.onRequestClose();
    }

    private handleNameChange(newName) {
        this.setState({category: this.state.category.set('name', newName)});
    }

    private handleGroupIdChange(event) {
        const newGroupId = parseInt(event.target.value, 10);
        this.setState({category: this.state.category.set('groupId', newGroupId)});
    }

    private handleCurrencyChange(event) {
        const newCurrencyCode = event.target.value;
        this.setState({category: this.state.category.set('currencyCode', newCurrencyCode)});
    }

    private handleNotesChange(newNotes) {
        this.setState({category: this.state.category.set('notes', newNotes)});
    }

    private handleAddRule() {
        this.setState({category: this.state.category.set('rules', this.state.category.rules.push(
            new CategoryRule()
        ))});
    }

    private handleRemoveRule() {
        this.setState({category: this.state.category.set('rules', this.state.category.rules.pop())});
    }

    /** Make this category an automatic/flexible category (set rules to NULL and not a list) */
    private setAutomatic() {
        this.setState({category: this.state.category.set('rules', null)});
    }

    private setToRuleBased(isIncome) {
        // Change the type of this category to either
        // "Fixed Income Budget" (has a list of rules and metadata.isIncome is true) or
        // "Fixed Expense Budget" (has a list of rules and metadata.isIncome is false)
        // It may previously have been the other one of the above, or "Flexible" (no list of rules)
        let newCategory = this.state.category.setIn(['metadata', 'isIncome'], isIncome);
        if (newCategory.rules === null) {
            newCategory = newCategory.set('rules', Immutable.List([new CategoryRule()]));
        } else {
            // Changing from income to expense.
            // Invert all the amounts (expenses are negative behind the scenes
            // but we show both income and expenses as positive in this UI.)
            newCategory = newCategory.set('rules', newCategory.rules.map(rule =>
                rule.set('amount', rule.amount * -1)
            ).toList()); // TODO: remove .toList() if allowed in future Immutable.js versions
        }
        this.setState({category: newCategory});
    }
    private setToRuleBasedExpense: () => void;
    private setToRuleBasedIncome: () => void;

    // Editing individual CategoryRules:
    private handleRuleAmountChange(ruleIndex, newAmount) {
        const isIncome = this.state.category.metadata.get("isIncome", false);
        newAmount *= (isIncome ? 1 : -1);
        this.setState({category: this.state.category.setIn(['rules', ruleIndex, 'amount'], newAmount)});
    }
    private handleRuleToggleRepeat(ruleIndex, repeat) {
        this.setState({category: this.state.category.setIn(['rules', ruleIndex, 'period'], repeat ? CategoryRulePeriod.Week : null )});
    }
    private handleRuleRepeatNChange(ruleIndex, newRepeatN) {
        if (newRepeatN < 1) {
            newRepeatN = 1;
        }
        this.setState({category: this.state.category.setIn(['rules', ruleIndex, 'repeatN'], newRepeatN)});
    }
    private handleRuleRepeatPeriodChange(ruleIndex, newPeriod) {
        this.setState({category: this.state.category.setIn(['rules', ruleIndex, 'period'], newPeriod)});
    }
    private handleRuleToggleStartDate(ruleIndex, useStartDate) {
        if (useStartDate) {
            this.setState({category: this.state.category.setIn(['rules', ruleIndex, 'startDate'], this.props.budget.startDate)});
        } else {
            this.setState({
                category:
                    this.state.category
                    .setIn(['rules', ruleIndex, 'startDate'], null)
                    .setIn(['rules', ruleIndex, 'endDate'], null),
            });
        }
    }
    private handleRuleStartDateChange(ruleIndex, newStartDate) {
        this.setState({category: this.state.category.setIn(['rules', ruleIndex, 'startDate'], newStartDate)});
    }
    private handleRuleToggleEndDate(ruleIndex, useEndDate) {
        this.setState({category: this.state.category.setIn(['rules', ruleIndex, 'endDate'],
            useEndDate ? this.props.budget.endDate : null
        )});
    }
    private handleRuleEndDateChange(ruleIndex, newEndDate) {
        this.setState({category: this.state.category.setIn(['rules', ruleIndex, 'endDate'], newEndDate)});
    }

    public render() {
        if (this.props.budgetLoading) {
            // With a direct URL like '/budget/1/budget/category/3/edit', this popup may be displayed
            // before the budget has finished loading.
            return <div>Loading...</div>;
        }

        const category = this.state.category;
        if (this.props.categoryId && !category) {
            return <div>Category does not exist or has been deleted</div>;
        }
        const validation = category.validateForBudget(this.props.budget);

        const isIncome = category.metadata.get("isIncome", false);

        return (
            <div className="category-editor">
                <h1>{category.id ? `Edit Category: ${category.name}` : "New Category"}</h1>
                <div className="if-responsive-form">
                    <div className="if-field">
                        <label htmlFor="if-cat-name"><span className="sr">Category</span> Name</label>
                        <TextField attrs={{id: "if-cat-name"}} value={category.name} onValueChange={this.handleNameChange} />
                    </div>
                    <div className="if-field">
                        <label htmlFor="if-cat-group"><span className="sr">Category</span> Group</label>
                        <select id="if-cat-group" className="ifc ifc-p" onChange={this.handleGroupIdChange} value={category.groupId}>
                            {this.props.budget.categoryGroups.valueSeq().map(group =>
                                <option key={group.id} value={group.id}>{group.name}</option>
                            )}
                        </select>
                    </div>
                    <div className="if-field">
                        <label><span className="sr">Category</span> Mode</label>
                        <ul className="ifc-radio-group">
                            <li>
                                <input id="if-cat-mode-expense" type="radio" name="category-mode" checked={!category.isAutomatic && !isIncome} onChange={this.setToRuleBasedExpense} />
                                <label htmlFor="if-cat-mode-expense">Fixed Expense Budget</label>
                            </li>
                            <li>
                                <input id="if-cat-mode-income" type="radio" name="category-mode" checked={!category.isAutomatic && isIncome} onChange={this.setToRuleBasedIncome} />
                                <label htmlFor="if-cat-mode-income">Fixed Income Budget</label>
                            </li>
                            <li>
                                <input id="if-cat-mode-flex" type="radio" name="category-mode" checked={category.isAutomatic} onChange={this.setAutomatic} />
                                <label htmlFor="if-cat-mode-flex">Flexible</label>
                            </li>
                        </ul>
                    </div>
                    {category.isAutomatic ?
                        <div className="if-field">
                            <label>Flexible Category Budget</label>
                            <p>
                                <span className="fa fa-info-circle" aria-hidden="true"></span> This category's budget will be determined based on actual and pending transactions. This is useful for things like paycheques that vary based on hours worked or vacation time. Set the budget on the transactions tab by entering in a pending transaction for each anticipated transaction, and assigning it to this category.
                            </p>
                        </div>
                    :
                        <div className="if-field">
                            <label><span className="sr">Category</span> Budget Rules</label>
                            <ul className="category-rule-list">
                            {category.rules.map((rule, ruleIndex) => (
                                <CategoryRuleWidget
                                    key={ruleIndex}
                                    currency={category.currency}
                                    rule={rule}
                                    ruleIndex={ruleIndex}
                                    isIncome={isIncome}
                                    onRuleAmountChange={this.handleRuleAmountChange}
                                    onRuleRepeatNChange={this.handleRuleRepeatNChange}
                                    onRuleRepeatPeriodChange={this.handleRuleRepeatPeriodChange}
                                    onRuleToggleRepeat={this.handleRuleToggleRepeat}
                                    onRuleEndDateChange={this.handleRuleEndDateChange}
                                    onRuleStartDateChange={this.handleRuleStartDateChange}
                                    onRuleToggleEndDate={this.handleRuleToggleEndDate}
                                    onRuleToggleStartDate={this.handleRuleToggleStartDate}
                                />
                            ))}
                            </ul>
                            <button className="ifc ifc-small" onClick={this.handleAddRule}><span className="fa fa-plus-circle" aria-hidden="true"></span> Add a rule</button>
                            {category.rules.count() > 1 ?
                                <button className="ifc ifc-small" onClick={this.handleRemoveRule}><span className="fa fa-minus-circle" aria-hidden="true"></span> Fewer rules</button>
                                : null
                            }
                        </div>
                    }
                    <div className="if-field">
                        <label htmlFor="if-cat-currency"><span className="sr">Category</span> Currency</label>
                        <select id="if-cat-currency" className="ifc ifc-p" onChange={this.handleCurrencyChange} value={category.currency.code}>
                            {Object.keys(SUPPORTED_CURRENCIES).map(k => SUPPORTED_CURRENCIES[k]).map(c =>
                                <option key={c.code} value={c.code}>{c.name} ({c.symbols[0]})</option>
                            )}
                        </select>
                    </div>
                    <div className="if-field">
                        <label htmlFor="if-cat-notes"><span className="sr">Category</span> Notes</label>
                        <TextField attrs={{id: "if-cat-notes"}} value={category.notes} onValueChange={this.handleNotesChange} />
                    </div>
                </div>
                <div className="modal-action-bar">
                    <button className="ifc ifc-small ifc-default" onClick={this.handleSave} disabled={validation.errors.length > 0}><span className="fa fa-check-circle-o" aria-hidden="true"></span> Save</button>
                    <button className="ifc ifc-small" onClick={this.props.onRequestClose}>Cancel</button>
                </div>
            </div>
        );
    }
}

export const CategoryEditWidget = connect((state: RootStore, ownProps: OwnProps) => {
    const defaultCurrency = state.budgetView.budget.currency;
    const createNewCategory = () => {
        // Flesh out the default category template with some pieces
        // that can only be computed once the budget is available.
        if (!state.budgetView.budgetValid) {
            return new Category(); // The budget hasn't loaded yet...
        }
        return new Category({
            currencyCode: defaultCurrency.code,
            groupId: state.budgetView.budget.categoryGroups.keySeq().last(),
            rules: Immutable.List.of(
                new CategoryRule({period: CategoryRulePeriod.Month})
            ),
        });
    };
    const category = ownProps.categoryId ?
        state.budgetView.budget.categories.get(ownProps.categoryId) // Editing an existing category
        : createNewCategory(); // Creating a new category
    return {
        budget: state.budgetView.budget,
        category,
        budgetLoading: state.budgetView.budgetLoading,
        defaultCurrency,
        safeIdPrefix: state.budgetView.safeIdPrefix,
    };
})(_CategoryEditWidget);
