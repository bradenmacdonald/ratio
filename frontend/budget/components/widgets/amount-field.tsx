import * as React from 'react';
import {connect, DispatchProp} from 'react-redux';

import {Currency, CurrencyFormatter, SUPPORTED_CURRENCIES} from 'prophecy-engine';
import {RootStore} from '../../app';

interface OwnProps {
    amount?: number;
    attrs?: any;
    currency?: Currency;
    onAmountChange?: (newAmount: number) => void;
}
interface Props extends OwnProps, DispatchProp<RootStore> {
    defaultCurrency: Currency;
}
interface State {
    inputType: string;
    /**
     * newAmount: While the user is making changes, this stores the new amount;
     * this is only relevant while this component is focused.
     */
    newAmount: number|null;
    value: string;
    /** True when user initially focuses on this */
    newlyFocused: boolean;
}

/**
 * Widget for editing a monetary amount.
 */
class _AmountField extends React.PureComponent<Props, State> {
    private inputElement: HTMLInputElement;

    public static defaultProps = {
        amount: 0,
        attrs: {},
        currency: SUPPORTED_CURRENCIES.USD,
        onAmountChange: (newAmount) => {},
    };

    constructor(props: Props) {
        super(props);
        // State:
        this.state = {
            inputType: "text",
            newAmount: null, // newAmount is only relevant while this component is focused.
            value: this.getAmountFormatted(),
            newlyFocused: false, // True when user initially focuses on this
        };
        // Bind events to this:
        this.handleFocus = this.handleFocus.bind(this);
        this.handleBlur = this.handleBlur.bind(this);
        this.handleChange = this.handleChange.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleMouseDown = this.handleMouseDown.bind(this);
    }

    /** When props changes, we need to re-compute the 'value' part of the state */
    public componentWillReceiveProps(nextProps) {
        this.setState({
            value: this.getAmountFormatted(nextProps),
        });
    }

    /**
     * Given an integer amount (like "100" to represent $1), format it appropriately
     * the "value" field of an HTML5 <input type="number">. i.e. Always use "." as
     * a decimal separator, and do not use a thousands separator.
     *
     * It is also important to always include the decimal values even if they are
     * zero, otherwise the number "moves" when the user focuses on this field as
     * it changes from e.g. "123.00" to "123".
     */
    private formatAmountForNumberInputValue(amount: number): string {
        return (amount * Math.pow(10, -this.props.currency.decimals)).toFixed(this.props.currency.decimals);
    }

    private getAmountFormatted(props: Props = this.props): string {
        const currencyFormatter = new CurrencyFormatter(props.defaultCurrency);
        return currencyFormatter.formatAmount(props.amount, props.currency);
    }

    private handleFocus(event: React.FocusEvent<HTMLInputElement>) {
        const isFirefox = (navigator.userAgent.indexOf("Firefox") > 0);
        this.setState({
            newAmount: this.props.amount,
            value: this.props.amount === 0 ? '' : this.formatAmountForNumberInputValue(this.props.amount),
            inputType: !isFirefox ? "number" : "text", // Can't use "number" on Firefox due to https://bugzilla.mozilla.org/show_bug.cgi?id=981248
            newlyFocused: true,
        });
    }

    private handleChange(event: React.ChangeEvent<HTMLInputElement>) {
        const newAmount = Math.round(+(event.target.value) * Math.pow(10, this.props.currency.decimals));
        if (Number.isNaN(newAmount)) {
            return; // Reject the input, e.g. in Firefox when entering a letter into the field
        }
        this.setState({
            newAmount,
            value: event.target.value,
        });
    }

    private handleBlur(event: React.FocusEvent<HTMLInputElement>) {
        if (this.state.newAmount !== this.props.amount) {
            this.props.onAmountChange(this.state.newAmount);
        }
        // Note that onAmountChange should update this component's props, or the edit will be reverted.
        this.setState({
            newAmount: null,
            value: this.getAmountFormatted(),
            inputType: "text",
        });
    }

    /** Special handling of ESC and ENTER */
    private handleKeyDown(event) {
        if (event.key === 'Escape') {
            // Reset to the original value in our props before blurring:
            this.setState({newAmount: this.props.amount}, () => {
                this.inputElement.blur();
            });
            event.stopPropagation();
        } else if (event.key === 'Enter') {
            // Accept the changes, if any:
            this.inputElement.blur();
            event.stopPropagation();
        }
    }

    /**
     * Override mouseDown when this.inputElement is not yet focused to make the experience consistent.
     * Without this fix, the feature that selects the entire number upon focus does not work consistently
     * when users click (sometimes the motion of the cursor or the timing of the click event changes the
     * selected range.)
     */
    private handleMouseDown(event: React.MouseEvent<HTMLInputElement>) {
        if (event.target !== document.activeElement) {
            event.preventDefault();
            event.currentTarget.focus();
        }
    }

    public render() {
        const signClass = (
            (this.state.newAmount || this.props.amount) > 0 ? 'ifc-amount-positive' :
            (this.state.newAmount || this.props.amount) < 0 ? 'ifc-amount-negative' :
            'ifc-amount-zero'
        );
        return (
            <input
                className={`ifc ifc-p ifc-amount ${signClass}`}
                type={this.state.inputType}
                value={this.state.value}
                onChange={this.handleChange}
                onFocus={this.handleFocus}
                onBlur={this.handleBlur}
                onKeyDown={this.handleKeyDown}
                onMouseDown={this.handleMouseDown}
                step={Math.pow(10, -this.props.currency.decimals)}
                ref={el => { this.inputElement = el; }}
                {...this.props.attrs}
            />
        );
    }

    public componentDidUpdate(_prevProps, _prevState) {
        if (this.state.newlyFocused) {
            // When the user clicks on or tabs into an amount field, select the entire number.
            try {
                this.inputElement.select();
            } catch (err) {}
            this.setState({newlyFocused: false});
        }
    }
}

export const AmountField = connect((state: RootStore, ownProps: OwnProps) => ({
    defaultCurrency: state.budgetView.budget.currency,
}))(_AmountField);
