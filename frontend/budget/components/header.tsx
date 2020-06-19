import * as React from 'react';
import {connect, DispatchProp} from 'react-redux';
import {Link} from 'react-router-dom';

import {RootStore} from '../app';

interface OwnProps {
}
interface Props extends OwnProps, DispatchProp<RootStore> {
    budgetName: string;
}

/**
 * Responsive header at the top of the budget app
 *
 * Displays the name of the current budget (if any) and has links like "Settings" and "Logout"
 */
class _Header extends React.PureComponent<Props> {
    constructor(props: Props) {
        super(props);
    }
    public render() {

        return (
            <header className="appHeader">
                <div className="influx-logo-link">
                    <Link to={`/budget`}>
                        <img src={`${window.configPublic.resUrl}/i/ratio-logo-white.svg`} alt="" />
                        <span className="sr">Ratio</span>
                    </Link>
                </div>
                <div className="budget-title" role="heading">{this.props.budgetName}</div>
                <div className="nav-holder">
                    <nav>
                        <a href="/"><span className="fa fa-user" aria-hidden="true"></span> {window.appData.user.name}</a>
                        <a href="/logout"><span className="fa fa-sign-out" aria-hidden="true"></span> Logout</a>
                    </nav>
                </div>
            </header>
        );
    }
}

export const Header = connect((state: RootStore, ownProps: OwnProps) => {
    const budgetName = (
        state.budgetView.budget ? state.budgetView.budget.name :
        state.budgetView.budgetLoading ? "Loading..." :
        "" // Show no title on the "All Budgets" page / list of budgets
    );
    return {
        budgetName,
    };
})(_Header);
