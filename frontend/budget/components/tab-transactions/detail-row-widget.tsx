import {Currency} from 'prophecy-engine';
import * as React from 'react';

import {AmountField} from '../widgets/amount-field';
import {TextField} from '../widgets/text-field';

interface Props {
    amount: number;
    currency: Currency;
    description: string;
    detailIndex: number;
    isAdding: boolean;
    isSplit: boolean;
    onSplitAmountChange: (detailIndex: number, newAmount: number) => void;
    onDescriptionChange: (detailIndex: number, newDescription: string) => void;
}

/**
 * Widget for editing a single TransactionDetail entry (a split transaction has multiple
 * TransactionDetails, but most transactions have just one).
 */
export class DetailRowWidget extends React.PureComponent<Props> {
    constructor(props) {
        super(props);
        this.handleSplitAmountChange = this.handleSplitAmountChange.bind(this);
        this.handleDescriptionChange = this.handleDescriptionChange.bind(this);
    }

    private handleSplitAmountChange(newAmount) {
        this.props.onSplitAmountChange(this.props.detailIndex, newAmount);
    }

    private handleDescriptionChange(newDescription) {
        this.props.onDescriptionChange(this.props.detailIndex, newDescription);
    }

    public render() {
        return (
            <div className='txn-detail-row'>
                {this.props.isSplit ?
                    <AmountField attrs={{'aria-label': "Partial Amount"}} amount={this.props.amount} onAmountChange={this.handleSplitAmountChange} currency={this.props.currency} />
                :
                    null
                }
                <TextField attrs={{'aria-label': "Description", placeholder: this.props.isAdding ? "What" : ''}} value={this.props.description} onValueChange={this.handleDescriptionChange} />
            </div>
        );
    }
}
