import * as React from 'react';

interface Props {
    value: number;
    attrs: any;
    onChange: (newValue: number) => void;
    extraClassNames: string;
}
interface State {
    /** The current value, which is always either a number or an empty string */
    newValue: number|'';
}

/**
 * Widget for editing a numeric amount.
 * Maintains an internal state and allows the user to press escape to cancel changes.
 */
export class NumberField extends React.PureComponent<Props, State> {
    private inputElement: HTMLInputElement;

    public static defaultProps: Partial<Props> = {
        value: 0,
        attrs: {},
        onChange: (newValue) => {},
        extraClassNames: '',
    };

    constructor(props: Props) {
        super(props);
        // State:
        this.state = {newValue: this.props.value};
        // Bind events to this:
        this.handleFocus = this.handleFocus.bind(this);
        this.handleBlur = this.handleBlur.bind(this);
        this.handleChange = this.handleChange.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
    }

    public componentWillReceiveProps(nextProps: Props) {
        this.setState({newValue: nextProps.value});
    }

    private handleFocus(event: React.FocusEvent<HTMLInputElement>) {
        // When the user clicks on or tabs into a number field, select the entire number.
        try {
            this.inputElement.select();
        } catch (err) {}
    }

    private handleChange(event: React.ChangeEvent<HTMLInputElement>) {
        if (event.target.value === '') {
            this.setState({newValue: ''});
        } else {
            this.setState({newValue: parseFloat(event.target.value)});
        }
    }

    private handleBlur(event: React.FocusEvent<HTMLInputElement>) {
        const newValue: number = typeof this.state.newValue === 'number' ? this.state.newValue : 0;
        if (this.state.newValue !== this.props.value) {
            this.props.onChange(newValue);
        }
        // Note that onChange should update this component's props, or the edit will be reverted.
        this.setState({newValue});
    }

    /** Special handling of ESC and ENTER */
    private handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
        if (event.key === 'Escape') {
            // Reset to the original value in our props before blurring:
            this.setState({newValue: this.props.value}, () => {
                this.inputElement.blur();
            });
            event.stopPropagation();
        } else if (event.key === 'Enter') {
            // Accept the changes, if any:
            this.inputElement.blur();
            event.stopPropagation();
        }
    }

    public render() {
        return (
            <input
                className={`ifc ifc-p ${this.props.extraClassNames}`}
                type="number"
                value={this.state.newValue}
                onChange={this.handleChange}
                onFocus={this.handleFocus}
                onBlur={this.handleBlur}
                onKeyDown={this.handleKeyDown}
                ref={el => { this.inputElement = el; }}
                {...this.props.attrs}
            />
        );
    }
}
