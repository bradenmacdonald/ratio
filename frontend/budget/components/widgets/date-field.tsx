import * as React from 'react';

import {PDate} from 'prophecy-engine';

/*// Feature detection for native date widget in the browser
const browserImplementsDateWidget = (() => {
    const testElement = document.createElement('input');
    testElement.setAttribute('type', 'date');
    // If the browser implements a date widget, it should implement date sanitization as well:
    const invalidValue = 'dilavni';
    testElement.setAttribute('value', invalidValue);
    return (testElement.type === 'date') && (testElement.value !== invalidValue);
})();*/

/** Given either a PDate or null, return a YYYY-MM-DD string */
function dateToString(dateOrNull) {
    return dateOrNull !== null ? dateOrNull.toString() : "";
}

export interface Props {
    attrs?: any;
    dateValue?: PDate;
    onValueChange?: (newValue: PDate|null) => void;
}

export interface State {
    currentStringValue: string;
}

/**
 * Widget for editing a date.
 */
export class DateField extends React.PureComponent<Props, State> {

    public static defaultProps: Partial<Props> = {
        attrs: {},
        dateValue: null,
        onValueChange: (newValue: PDate) => {},
    };

    constructor(props: Props) {
        super(props);
        // State:
        this.state = {
            currentStringValue: dateToString(this.props.dateValue),
        };
        // Bind events to this:
        this.handleBlur = this.handleBlur.bind(this);
        this.handleChange = this.handleChange.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
    }

    /** When props changes, we need to re-compute the 'currentStringValue' part of the state */
    public componentWillReceiveProps(nextProps) {
        this.setState({
            currentStringValue: dateToString(nextProps.dateValue),
        });
    }

    private handleChange(event: React.ChangeEvent<HTMLInputElement>) {
        if (event.currentTarget.value.match(/[^0-9\-]/) !== null) {
            event.preventDefault();
            return;
        }
        // Note that we allow incomplete/invalid date strings like "2016-"
        // while the user is typing out a date.
        this.setState({
            currentStringValue: event.currentTarget.value,
        });
    }

    private handleBlur(event: React.FocusEvent<HTMLInputElement>) {
        const inputElement = event.currentTarget;
        if (inputElement.validity && inputElement.validity.badInput) { // The 'inputElement.validity && ' part is only requried until jsdom gets support: https://github.com/tmpvar/jsdom/issues/544
            // An invalid date was entered, e.g. Feb 31 or missing the year.
            // Reset to previous state.
            this.setState({currentStringValue: ''});
            inputElement.value = ''; // We have to manually set this value on the DOM element, since the browser reports the value as '' already and React won't change it.
        }

        if (this.state.currentStringValue === '') {
            // Date has been set to null/blank:
            if (this.props.dateValue !== null) {
                this.props.onValueChange(null);
            }
        } else {
            // Try to parse the value as a date:
            try {
                const newDate = PDate.fromString(this.state.currentStringValue);
                if (+newDate !== +this.props.dateValue) {
                    this.props.onValueChange(newDate);
                }
            } catch (e) {
                console.error(e);
                // Don't save the new value.
            }
        }
        // Note that onValueChange should update this component's props, or the edit will be reverted.
        this.setState({currentStringValue: dateToString(this.props.dateValue)});
    }

    /** Special handling of ESC and ENTER */
    private handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
        if (event.key === 'Escape') {
            const inputElement = event.currentTarget;
            this.setState(
                {currentStringValue: dateToString(this.props.dateValue)},
                () => inputElement.blur()
            );
        } else if (event.key === 'Enter') {
            // Accept the changes, if any:
            event.currentTarget.blur();
        }
    }

    public render() {
        return (
            <input
                className="ifc ifc-p"
                type="date"
                value={this.state.currentStringValue}
                onChange={this.handleChange}
                onBlur={this.handleBlur}
                onKeyDown={this.handleKeyDown}
                {...this.props.attrs}
            />
        );
    }
}
