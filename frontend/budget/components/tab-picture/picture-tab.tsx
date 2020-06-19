import * as React from 'react';


/**
 * Financial Picture tab for a specific budget
 */
export class PictureTab extends React.PureComponent {
    public render() {

        return (
            <div>
                <div className="grid">
                    <div className="cell">
                        <h1>Financial Picture</h1>
                        <p>Various useful graphs and analyses of your spending, budget, etc. will be here.</p>
                    </div>
                </div>
            </div>
        );
    }
}
