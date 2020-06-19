import {Location} from 'history';
import * as React from 'react';
import {connect, DispatchProp} from 'react-redux';
import {match, NavLink, Route, RouteComponentProps, Switch} from 'react-router-dom';

import {RootStore} from '../app';
import {SummaryPanel} from './summary-panel';
import {BudgetTab} from './tab-budget/budget-tab';
import {NotesTab} from './tab-notes/notes-tab';
import {PictureTab} from './tab-picture/picture-tab';
import {SettingsTab} from './tab-settings/settings-tab';
import {TransactionsTab} from './tab-transactions/transactions-tab';

interface OwnProps {
}
interface Props extends OwnProps, DispatchProp<RootStore>, RouteComponentProps<{budgetId: string}> {
    undoActions: RootStore['budgetView']['undoActions'];
    redoActions: RootStore['budgetView']['redoActions'];
    budgetValid: boolean;
    budgetError: boolean;
    budgetErrorTitle: string;
    budgetErrorExplanation: string;
}

/**
 * Main view of a specific budget
 *
 * Has a summary panel and several tabbed views of detailed budget data.
 */
class _BudgetView extends React.PureComponent<Props> {

    constructor(props: Props) {
        super(props);
        this.handleResize = this.handleResize.bind(this);
        this.handleKeydown = this.handleKeydown.bind(this);
        this.isBudgetTabActive = this.isBudgetTabActive.bind(this);
    }

    public componentDidMount() {
        window.addEventListener('resize', this.handleResize);
        window.addEventListener('keydown', this.handleKeydown);
    }

    public componentWillUnmount() {
        window.removeEventListener('resize', this.handleResize);
        window.removeEventListener('keydown', this.handleKeydown);
    }

    /**
     * Handle the responsive SummaryPanel which is either always present on the left (desktop)
     * or is a tab with its own navigation URL.
     */
    private handleResize(event: UIEvent) {
        if (this.activeTab === 'summary') {
            // Check if the active Summary tab has suddenly been hidden by making the window bigger:
            const summaryElement = document.getElementById('budget-tab-summary');
            if (summaryElement && summaryElement.offsetParent === null) {
                // The tab is now hidden, but is still the active tab. Navigate to the default tab instead.
                this.replaceUrlWithDefaultTab();
            }
        }
    }

    /**
     * Handle global hotkeys
     */
    private handleKeydown(event: KeyboardEvent) {
        if ((event.ctrlKey || event.metaKey) && (event.key ? event.key.toLowerCase() === 'z' : event.charCode === 'z'.charCodeAt(0))) {
            event.preventDefault();
            if (event.shiftKey) {
                // Try redo:
                if (!this.props.redoActions.isEmpty()) {
                    this.props.dispatch(this.props.redoActions.last());
                } else {
                    console.log("Nothing to redo!");
                }
            } else {
                // Try undo:
                if (!this.props.undoActions.isEmpty()) {
                    this.props.dispatch(this.props.undoActions.last());
                } else {
                    console.log("Nothing to undo!");
                }
            }
        }
    }


    /** Get an ID of the currently active tab - used for the aria-labelledby attribute */
    get activeTab(): string {
        for (const id of ['summary', 'transactions', 'picture', 'notes', 'settings']) {
            if (this.props.location.pathname === `${this.props.match.url}/${id}`) {
                return id;
            }
        }
        return 'budget';
    }

    /**
     * Replace the current URL (which is invalid) with the normalized URL of
     * the budget tab.
     */
    private replaceUrlWithDefaultTab() {
        this.props.history.replace(`/budget/${this.props.match.params.budgetId}`);
    }

    /**
     * Special logic for determining when the 'Budget' tab is active
     * Since it's URL is just '/budget/:id', it should be active for sub-URLs
     * on the 'Budget' tab like '/budget/:id/categories/:catId' but not for other
     * tabs like '/budget/:id/settings'
     */
    private isBudgetTabActive(thisMatch: match<{}>, location: Location): boolean {
        // match will be non-null if this was an exact match.
        return Boolean(thisMatch) || location.pathname.startsWith(this.props.match.url + '/category');
    }

    public render() {

        if (this.props.budgetError) {
            return (
                <div id="budget-view" className="budget-view-error">
                    <div id="summary-panel" role="region">
                    </div>
                    <div className="grid" id="budget-tabview">
                        <div className="cell">
                            <h1><span className="fa fa-exclamation-triangle fa-5" aria-hidden="true"></span> {this.props.budgetErrorTitle}</h1>
                            <p>{this.props.budgetErrorExplanation}</p>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div id="budget-view">
                <div id="summary-panel" role="region" aria-label="Summary">
                    <SummaryPanel/>
                </div>
                <div className="tabview flip-md" id="budget-tabview">
                    <div role="tablist">
                        <NavLink to={`${this.props.match.url}/summary`} role="tab" id="budget-tab-summary" activeClassName="active-tab">
                            <span className={`tab-icon fa fa-info-circle`} aria-hidden="true"></span> Summary
                        </NavLink>
                        <NavLink exact to={`${this.props.match.url}`} isActive={this.isBudgetTabActive} role="tab" id="budget-tab-budget" activeClassName="active-tab">
                            <span className={`tab-icon fa fa-tasks`} aria-hidden="true"></span> Budget
                        </NavLink>
                        <NavLink exact to={`${this.props.match.url}/transactions`} role="tab" id="budget-tab-transactions" activeClassName="active-tab">
                            <span className={`tab-icon fa fa-bars`} aria-hidden="true"></span> Transactions
                        </NavLink>
                        <NavLink exact to={`${this.props.match.url}/picture`} role="tab" id="budget-tab-picture" activeClassName="active-tab">
                            <span className={`tab-icon fa fa-line-chart`} aria-hidden="true"></span> Financial Picture
                        </NavLink>
                        <NavLink exact to={`${this.props.match.url}/notes`} role="tab" id="budget-tab-notes" activeClassName="active-tab">
                            <span className={`tab-icon fa fa-pencil-square-o`} aria-hidden="true"></span> Notes
                        </NavLink>
                        <NavLink exact to={`${this.props.match.url}/settings`} role="tab" id="budget-tab-settings" activeClassName="active-tab">
                            <span className={`tab-icon fa fa-cog`} aria-hidden="true"></span> Settings
                        </NavLink>
                    </div>
                    <div role="tabpanel" aria-labelledby={`budget-tab-${this.activeTab}`}>
                        {this.props.budgetValid ?
                            <Switch>
                                <Route exact path={`${this.props.match.url}/summary`} component={SummaryPanel} />
                                <Route exact path={`${this.props.match.url}/transactions`} component={TransactionsTab} />
                                <Route exact path={`${this.props.match.url}/picture`} component={PictureTab} />
                                <Route exact path={`${this.props.match.url}/notes`} component={NotesTab} />
                                <Route exact path={`${this.props.match.url}/settings`} component={SettingsTab} />
                                <Route component={ BudgetTab } />
                            </Switch>
                        : null}
                    </div>
                </div>
            </div>
        );
    }
}

export const BudgetView = connect((state: RootStore, ownProps: OwnProps) => ({
    undoActions: state.budgetView.undoActions,
    redoActions: state.budgetView.redoActions,
    budgetValid: state.budgetView.budgetValid,
    budgetError: state.budgetView.budgetError,
    budgetErrorTitle: state.budgetView.budgetErrorTitle,
    budgetErrorExplanation: state.budgetView.budgetErrorExplanation,
}))(_BudgetView);
