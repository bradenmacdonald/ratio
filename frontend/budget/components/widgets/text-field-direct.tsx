import * as React from 'react';

interface Props {
    value: string;
    attrs: React.InputHTMLAttributes<HTMLInputElement>;
    onValueChange: (newValue: string) => void;
}

/**
 * Widget for editing a line of text.
 *
 * Unlike TextField, this widget applies changes immediately as each
 * letter is typed out by the user.
 */
export class DirectTextField extends React.PureComponent<Props> {

    public static defaultProps: Partial<Props> = {
        value: "",
        attrs: {},
        onValueChange: (newValue) => {},
    };

    constructor(props) {
        super(props);
        // Bind events to this:
        this.handleChange = this.handleChange.bind(this);
    }

    private handleChange(event) {
        // Note that onValueChange should update this component's props, or the edit will be reverted.
        this.props.onValueChange(event.target.value);
    }

    public render() {
        return (
            <input
                className="ifc ifc-p"
                type="text"
                value={this.props.value}
                onChange={this.handleChange}
                {...this.props.attrs}
            />
        );
    }
}
