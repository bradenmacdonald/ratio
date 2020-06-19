import * as React from 'react';
import { connect } from 'react-redux';

import {Category, CategoryRule, CategoryRulePeriod, Currency, PDate} from 'prophecy-engine';

import {AmountField} from '../widgets/amount-field';
import {DateField} from '../widgets/date-field';
import {NumberField} from '../widgets/number-field';

export interface Props {
    currency: Currency;
    rule: CategoryRule;
    ruleIndex: number;
    isIncome: boolean;
    // Event handlers:
    onRuleAmountChange: (ruleIndex: number, newAmount: number) => void;
    onRuleRepeatNChange: (ruleIndex: number, newValue: number) => void;
    onRuleRepeatPeriodChange: (ruleIndex: number, newValue: number) => void;
    onRuleToggleRepeat: (ruleIndex: number, newValue: boolean) => void;
    onRuleEndDateChange: (ruleIndex: number, newDate: PDate) => void;
    onRuleStartDateChange: (ruleIndex: number, newDate: PDate) => void;
    onRuleToggleEndDate: (ruleIndex: number, newValue: boolean) => void;
    onRuleToggleStartDate: (ruleIndex: number, newValue: boolean) => void;
}

/**
 * A "rule" in the Category editor UI.
 *
 * A rule is an amount, a date range, and a repetition patter, like "$100 per week from Jan 1 through Dec 31".
 */
export class CategoryRuleWidget extends React.PureComponent<Props> {
    constructor(props) {
        super(props);

        this.handleRuleAmountChange = this.handleRuleAmountChange.bind(this);
        this.handleRuleRepeatNChange = this.handleRuleRepeatNChange.bind(this);
        this.handleRuleRepeatPeriodChange = this.handleRuleRepeatPeriodChange.bind(this);
        this.handleRuleToggleRepeat = this.handleRuleToggleRepeat.bind(this);

        this.handleRuleEndDateChange = this.handleRuleEndDateChange.bind(this);
        this.handleRuleStartDateChange = this.handleRuleStartDateChange.bind(this);
        this.handleRuleToggleEndDate = this.handleRuleToggleEndDate.bind(this);
        this.handleRuleToggleStartDate = this.handleRuleToggleStartDate.bind(this);
    }

    private handleRuleAmountChange(newAmount: number) { this.props.onRuleAmountChange(this.props.ruleIndex, newAmount); }
    private handleRuleRepeatNChange(newValue: number) { this.props.onRuleRepeatNChange(this.props.ruleIndex, Math.trunc(newValue)); }
    private handleRuleRepeatPeriodChange(event: React.ChangeEvent<HTMLSelectElement>) { this.props.onRuleRepeatPeriodChange(this.props.ruleIndex, parseInt(event.target.value, 10)); }
    private handleRuleToggleRepeat(event: React.ChangeEvent<HTMLInputElement>) { this.props.onRuleToggleRepeat(this.props.ruleIndex, event.target.checked); }

    private handleRuleEndDateChange(newDate: PDate) { this.props.onRuleEndDateChange(this.props.ruleIndex, newDate); }
    private handleRuleStartDateChange(newDate: PDate) { this.props.onRuleStartDateChange(this.props.ruleIndex, newDate); }
    private handleRuleToggleEndDate(event: React.ChangeEvent<HTMLInputElement>) { this.props.onRuleToggleEndDate(this.props.ruleIndex, event.target.checked); }
    private handleRuleToggleStartDate(event: React.ChangeEvent<HTMLInputElement>) { this.props.onRuleToggleStartDate(this.props.ruleIndex, event.target.checked); }

    public render() {
        const rule = this.props.rule;
        return (
            <li>
                Budget of <AmountField amount={rule.amount * (this.props.isIncome ? 1 : -1)} currency={this.props.currency} attrs={{"aria-label": "Amount"}} onAmountChange={this.handleRuleAmountChange} /><br />

                <label>
                    <input type="checkbox" checked={rule.period !== null} onChange={this.handleRuleToggleRepeat}  />
                    Repeating&nbsp;
                </label>
                every
                <NumberField extraClassNames="cat-rule-repeat-n" value={rule.repeatN} onChange={this.handleRuleRepeatNChange} attrs={{step: 1,  min: 1, disabled: (rule.period === null)}} />
                <select className="ifc ifc-p cat-rule-period" onChange={this.handleRuleRepeatPeriodChange} value={rule.period !== null ? rule.period : CategoryRulePeriod.Week} disabled={rule.period === null}>
                    <option value={CategoryRulePeriod.Day}>{rule.repeatN === 1 ? 'Day' : 'Days'}</option>
                    <option value={CategoryRulePeriod.Week}>{rule.repeatN === 1 ? 'Week' : 'Weeks'}</option>
                    <option value={CategoryRulePeriod.Month}>{rule.repeatN === 1 ? 'Month' : 'Months'}</option>
                    <option value={CategoryRulePeriod.Year}>{rule.repeatN === 1 ? 'Year' : 'Years'}</option>
                </select>
                <br />
                <label>
                    <input type="checkbox" checked={rule.startDate !== null} onChange={this.handleRuleToggleStartDate}  />
                    Starting&nbsp;
                </label>
                <DateField attrs={{"aria-label": "Starting Date"}} dateValue={rule.startDate} onValueChange={this.handleRuleStartDateChange} />
                <br />
                <label>
                    <input type="checkbox" checked={rule.endDate !== null} disabled={rule.startDate === null} onChange={this.handleRuleToggleEndDate}  />
                    Ending&nbsp;
                </label>
                <DateField attrs={{"aria-label": "End Date", disabled: (rule.startDate === null)}} dateValue={rule.endDate} onValueChange={this.handleRuleEndDateChange} />
            </li>
        );
    }
}
