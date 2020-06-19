import { createBrowserHistory } from 'history';
import JsonRpcClient, {createBackoff} from 'jsonrpc-websocket-client';
import * as Prophecy from 'prophecy-engine';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { Router } from 'react-router';
import { Route, Switch } from 'react-router-dom';
import { applyMiddleware, combineReducers, createStore } from 'redux';
import { default as thunk } from 'redux-thunk';

// UI Components:
import {BudgetList} from './components/budget-list';
import {BudgetView} from './components/budget-view';
import {Header} from './components/header';
import {ModalMessagesComponent} from './components/modal-messages';

// Redux actions/state:
import {fatalError, setBudget} from './actions';
import {BudgetListState, reducer as budgetListReducer} from './reducers/budget-list';
import {BudgetViewState, reducer as budgetViewReducer} from './reducers/budget-view';
import {ModalMessagesState, reducer as modalMessagesReducer} from './reducers/modal-messages';

// Load global config data and initial app data:
// tslint:disable-next-line:no-namespace
declare global {
    interface Window { configPublic: any; appData: any; }
}
window.configPublic = JSON.parse(document.getElementById('configPublic').innerHTML);
window.appData = JSON.parse(document.getElementById('appData').innerHTML);

// Initialize websocket connection to the server:
const rpcClient = new JsonRpcClient(`wss://${window.location.host}/budget-rpc`);
let rpcClientGetterPromise = new Promise<any>((resolve) => {
    rpcClient.open(createBackoff()).then(() => {
        // RPC client is now available.
        resolve(rpcClient);
    });
});
const getRpcClient = () => rpcClientGetterPromise;

class NotFound extends React.Component {
    public render() {
        return <div><p>Not Found</p></div>;
    }
}

// tslint:disable-next-line:max-classes-per-file
class App extends React.Component {
    public render() {
        return <div id="app" className="budget-layout">
            <Header />
            <Switch>
                <Route exact path="/budget" component={ BudgetList } />
                <Route path='/budget/:budgetId' component={ BudgetView } />
                <Route component={NotFound} />
            </Switch>
            <ModalMessagesComponent />
        </div>;
    }
}

const sendEventToServerMiddleware = _store => next => action => {
    console.log('Action: ' + action.type, action);

    if (action.type.startsWith(Prophecy.actions.PROPHECY_ACTION_PREFIX) && !action.isRemoteAction) {
        getRpcClient().then(openRpcClient => openRpcClient.call("update_budget", {action}).then(result => {
            console.log(" -> Saved with changeId ", result.changeId);
        })).catch(error => {
            store.dispatch(
                fatalError("Unable to save changes", "One or more of your changes could not be saved. Please refresh the page and try again.")
            );
        });
    }

    return next(action);
};

export interface RootStore {
    budgetList: BudgetListState;
    budgetView: BudgetViewState;
    messages: ModalMessagesState;
}
export const store = createStore(
    combineReducers<RootStore>({
        budgetList: budgetListReducer,
        budgetView: budgetViewReducer,
        messages: modalMessagesReducer,
    }),
    applyMiddleware(thunk.withExtraArgument(getRpcClient), sendEventToServerMiddleware),
);

const history = createBrowserHistory();

function onLocationChange(location) {
    const pathData = location.pathname.match(/^\/budget\/(\d+).*/);
    const currentBudget = store.getState().budgetView.budget;
    if (pathData) {
        const budgetId = parseInt(pathData[1], 10);
        if (!currentBudget || currentBudget.id !== budgetId) {
            // The budget ID in the URL has changed. Load the new budget.
            store.dispatch(setBudget(budgetId));
        }
    } else {
        if (currentBudget) {
            store.dispatch(setBudget(null));
        }
    }
}

const handleNotification = notification => {
    const currentBudget = store.getState().budgetView.budget;
    if (notification.method === "budget_action") {
        const action = notification.params.action;
        action.isRemoteAction = true; // This user did not originate this action, so don't send it back to the server
        action.skipUndo = true; // Don't add this action to the local undo/redo queue
        if (action.budgetId === currentBudget.id) {
            store.dispatch(action);
        } else {
            console.log("Ignoring budget_action notification for inactive budget.");
        }
    } else {
        console.log('notification received', notification);
    }
};
const reconnectWebsocket = () => {
    console.log("RPC websocket client has been disconnected. Attempting to re-establish connection.");
    rpcClientGetterPromise = new Promise(resolve => {
        resolve(rpcClient);
        rpcClient.open(createBackoff()).then(() => {
            console.log("Re-connected successfully");
            // subscribe or re-subscribe to the current budget whenever the connection goes offline and then online again.
            const currentBudget = store.getState().budgetView.budget;
            if (currentBudget) {
                // For some reason, this RPC call will often fail to send (and block
                // receiving any further notifications) unless we add a small delay here.
                setTimeout(() => {
                    rpcClient.call("watch_budget", {budgetId: currentBudget.id}).then(() => {}, err => {
                        console.error("Unable to re-subscribe to budget", err);
                    });
                }, 100);
            }
        });
    });
};
rpcClient.on('notification', handleNotification);
rpcClient.on('closed', reconnectWebsocket);

history.listen(onLocationChange);
onLocationChange(history.location);

const appHolderElement = document.getElementById('meta');

ReactDOM.render((
    <Provider store={ store }>
        <Router history={ history }>
            <Route path='/budget' component={ App } />
        </Router>
    </Provider>
), appHolderElement);
