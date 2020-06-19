import * as React from 'react';

let lastUsedSummaryId = 0;

interface Props {
    label: string;
    value: string;
}

export class SummaryItem extends React.PureComponent<Props> {
    private uniqueId: number;
    constructor(props) {
        super(props);
    }
    public componentWillMount() {
        this.uniqueId = ++lastUsedSummaryId;
    }
    public render() {
        return (
            <div className="summary-item">
                <span className="summary-label" id={`bsi-${this.uniqueId}`}>{this.props.label}</span>
                <span className="summary-value" aria-labelledby={`bsi-${this.uniqueId}`}>{this.props.value}</span>
            </div>
        );
    }
}
