import * as React from 'react';

interface Props  {
    value: string;
    attrs: any;
    onValueChange: (newValue: string) => void;
}
interface State {
    newValue: string;
}

/**
 * Widget for editing a line of text.
 *
 * Generally, this will track changes within its own internal 'newValue' state,
 * and only "apply" the changes if the user clicks off the field or presses ENTER.
 */
export class TextField extends React.PureComponent<Props, State> {

    public static defaultProps: Partial<Props> = {
        value: "",
        attrs: {},
        onValueChange: (newValue: string) => {},
    };

    constructor(props: Props) {
        super(props);
        // State:
        this.state = {
            newValue: this.props.value,
        };
        // Bind events to this:
        this.handleBlur = this.handleBlur.bind(this);
        this.handleChange = this.handleChange.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
    }

    /** When props changes, we need to re-compute the 'newValue' part of the state */
    public componentWillReceiveProps(nextProps) {
        this.setState({
            newValue: nextProps.value,
        });
    }

    private handleChange(event: React.ChangeEvent<HTMLInputElement>) {
        this.setState({
            newValue: event.target.value,
        });
    }

    private handleBlur(event: React.FocusEvent<HTMLInputElement>) {
        if (this.state.newValue !== this.props.value) {
            this.props.onValueChange(this.state.newValue);
        }
        // Note that onValueChange should update this component's props, or the edit will be reverted.
        this.setState({newValue: this.props.value});
    }

    /** Special handling of ESC and ENTER */
    private handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
        const inputElement = event.currentTarget;
        if (event.key === 'Escape') {
            this.setState({newValue: this.props.value}, () => inputElement.blur());
            event.stopPropagation();
        } else if (event.key === 'Enter') {
            // Accept the changes, if any:
            inputElement.blur();
            event.stopPropagation();
        }
    }

    public render() {
        return (
            <input
                className="ifc ifc-p"
                type="text"
                value={this.state.newValue}
                onChange={this.handleChange}
                onBlur={this.handleBlur}
                onKeyDown={this.handleKeyDown}
                {...this.props.attrs}
            />
        );
    }
}
